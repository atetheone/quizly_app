"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { ThemeSelector } from "@/components/quiz/ThemeSelector";

type Level = "EASY" | "MEDIUM" | "HARD";
const LEVELS: Level[] = ["EASY", "MEDIUM", "HARD"];

// Structural tokens ("Question:", "(correct)", "(select all that apply)") stay
// English in every locale so parseQuizText is language-agnostic — only the
// question/option content is localized.
const EXAMPLE_TEXT: Record<string, string> = {
  en: `Question: What is the powerhouse of the cell?
A) Ribosome
B) Mitochondria (correct)
C) Nucleus
D) Cell Wall

Question: Which of these are mammals? (select all that apply)
A) Whale (correct)
B) Shark
C) Bat (correct)
D) Frog

Question: Photosynthesis takes place in…
A) Mitochondria
B) Chloroplasts (correct)
C) Ribosomes`,
  fr: `Question: Quelle est la centrale énergétique de la cellule ?
A) Ribosome
B) Mitochondrie (correct)
C) Noyau
D) Paroi cellulaire

Question: Lesquels de ces animaux sont des mammifères ? (select all that apply)
A) Baleine (correct)
B) Requin
C) Chauve-souris (correct)
D) Grenouille

Question: La photosynthèse a lieu dans…
A) Mitochondries
B) Chloroplastes (correct)
C) Ribosomes`,
};

type ErrorPayload = {
  error?: string;
  params?: Record<string, string | number | Date>;
};

export default function ImportQuizPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();

  /** Translate an API error payload via its message key + optional params. */
  function tError(d: ErrorPayload, fallbackKey: string) {
    return d?.error ? t(d.error, d.params) : t(fallbackKey);
  }

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [rawText, setRawText] = useState(
    () => EXAMPLE_TEXT[locale] ?? EXAMPLE_TEXT.en
  );
  const [loading, setLoading] = useState(false);

  // ── AI generation panel ──
  const [genOpen, setGenOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("generate") === "1"
  );
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState<Level>("MEDIUM");
  const [mixMode, setMixMode] = useState(false);
  const [mix, setMix] = useState({ easy: 3, medium: 5, hard: 2 });
  const [generating, setGenerating] = useState(false);

  const mixTotal = mix.easy + mix.medium + mix.hard;
  const genDisabled =
    generating ||
    !topic.trim() ||
    count < 1 ||
    count > 20 ||
    (mixMode && mixTotal !== count);

  async function handleGenerate() {
    setGenerating(true);
    const spread = mixMode
      ? ({ kind: "mix", ...mix } as const)
      : ({ kind: "single", level } as const);
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          spread,
          language: locale,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setRawText(d.rawText);
        if (!title) {
          setTitle(
            t("import.generatedTitle", {
              topic: topic.trim(),
              mode: mixMode
                ? t("import.modeMixed")
                : t(`import.level${level}`),
            })
          );
        }
        toast.success(t("import.toastGenerated", { count: d.parsedCount }));
      } else {
        toast.error(tError(d, "errors.genFailed"));
      }
    } catch {
      toast.error(t("errors.genFailedNetwork"));
    }
    setGenerating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/quizzes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, timeLimit, rawText }),
    });
    if (res.ok) {
      toast.success(t("import.toastImported"));
      router.push("/dashboard");
    } else {
      const d = await res.json();
      toast.error(tError(d, "errors.importFailed"));
      setLoading(false);
    }
  }

  const parsedCount = (rawText.match(/^Question:/gm) || []).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--q-bg)", overflow: "hidden" }}>
      {/* topbar */}
      <div className="q-import-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" className="q-btn q-btn-ghost q-btn-sm">← {t("import.dashboard")}</Link>
          <span style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>{t("import.pageTitle")}</span>
          {parsedCount > 0 && (
            <span className="q-chip q-chip-green" style={{ fontSize: 11 }}>✓ {t("import.parsedBadge", { count: parsedCount })}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard" className="q-btn q-btn-sm">{t("common.cancel")}</Link>
          <button className="q-btn q-btn-primary q-btn-sm" onClick={handleSubmit} disabled={loading || !title}>
            {loading ? t("import.importing") : `${t("import.continueToEditor")} →`}
          </button>
        </div>
      </div>

      {/* meta strip */}
      <div className="q-import-meta" style={{ display: "flex", gap: 16, padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)", alignItems: "flex-end", background: "var(--q-bg-2)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, maxWidth: 360 }}>
          <span className="q-eyebrow">{t("import.quizTitle")}</span>
          <input
            className="q-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("import.quizTitlePlaceholder")}
            required
            style={{ background: "var(--q-bg)" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="q-eyebrow">{t("import.timeLimit")}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              className="q-input"
              type="number" min={1} max={120} value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              style={{ width: 64, background: "var(--q-bg)" }}
            />
            <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("import.minutesShort")}</span>
          </div>
        </div>
      </div>

      {/* AI generation panel */}
      <div style={{ borderBottom: "1px solid var(--q-line-2)", background: "var(--q-bg)" }}>
        <button
          type="button"
          onClick={() => setGenOpen((o) => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "10px 20px", background: "transparent", border: "none",
            cursor: "pointer", fontFamily: "var(--q-sans)", fontSize: 13,
            color: "var(--q-ink-2)", textAlign: "left",
          }}
        >
          <span style={{ fontSize: 14 }}>✨</span>
          <span style={{ fontWeight: 600 }}>{t("import.generateWithAI")}</span>
          <span style={{ color: "var(--q-ink-4)" }}>
            {t("import.generateTagline")}
          </span>
          <span style={{ marginLeft: "auto", color: "var(--q-ink-4)" }}>
            {genOpen ? "▲" : "▼"}
          </span>
        </button>

        {genOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "4px 20px 16px", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 240 }}>
              <span className="q-eyebrow">{t("import.topic")}</span>
              <ThemeSelector value={topic} onChange={setTopic} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="q-eyebrow">{t("import.questions")}</span>
              <input
                className="q-input"
                type="number" min={1} max={20} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ width: 72 }}
              />
            </div>

            {!mixMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="q-eyebrow">{t("import.difficulty")}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className="q-chip"
                      style={{
                        cursor: "pointer",
                        background: level === l ? "var(--q-ink)" : "var(--q-bg-2)",
                        color: level === l ? "var(--q-bg)" : "var(--q-ink-2)",
                        fontWeight: level === l ? 600 : 400,
                      }}
                    >
                      {t(`import.level${l}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="q-eyebrow">
                  {t("import.mix")}{" "}
                  <span style={{ color: mixTotal === count ? "var(--q-green)" : "var(--q-coral)" }}>
                    ({mixTotal}/{count})
                  </span>
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["easy", "medium", "hard"] as const).map((k) => (
                    <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <input
                        className="q-input"
                        type="number" min={0} max={20} value={mix[k]}
                        onChange={(e) => setMix((m) => ({ ...m, [k]: Number(e.target.value) }))}
                        style={{ width: 56 }}
                      />
                      <span style={{ fontSize: 10, color: "var(--q-ink-4)", fontFamily: "var(--q-sans)" }}>
                        {t(`import.level${k.toUpperCase()}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--q-sans)", color: "var(--q-ink-3)", cursor: "pointer", paddingBottom: 6 }}>
              <input type="checkbox" checked={mixMode} onChange={(e) => setMixMode(e.target.checked)} />
              {t("import.customMix")}
            </label>

            <button
              type="button"
              className="q-btn q-btn-primary"
              onClick={handleGenerate}
              disabled={genDisabled}
            >
              {generating ? t("import.generating") : `✨ ${t("import.generate")}`}
            </button>
          </div>
        )}
      </div>

      <div className="q-import-split" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* text editor */}
        <div style={{ flex: 1, borderRight: "1px solid var(--q-line-2)", background: "var(--q-bg-2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--q-line-2)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="q-chip" style={{ background: "var(--q-ink)", color: "var(--q-bg)", fontSize: 11 }}>{t("import.tabPaste")}</span>
              <span className="q-chip" style={{ fontSize: 11 }}>{t("import.tabSample")}</span>
            </div>
            <span className="q-eyebrow">{t("import.formatHint")}</span>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            style={{
              flex: 1, border: "none", outline: "none", resize: "none",
              fontFamily: "var(--q-mono)", fontSize: 13, lineHeight: 1.7,
              padding: "16px 24px", background: "transparent", color: "var(--q-ink-2)",
            }}
          />
        </div>

        {/* live preview */}
        <div style={{ flex: 1, padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="q-eyebrow">{t("import.livePreview")}</span>
          {parsedCount === 0 ? (
            <div style={{ color: "var(--q-ink-4)", fontSize: 14, fontFamily: "var(--q-sans)", marginTop: 8 }}>
              {t("import.emptyPreview")}
            </div>
          ) : (
            rawText.split(/\n\n+/).map((block, i) => {
              const lines = block.trim().split("\n");
              const qLine = lines.find((l) => l.startsWith("Question:"));
              if (!qLine) return null;
              const qText = qLine.replace("Question:", "").replace("(select all that apply)", "").trim();
              const isMultiple = block.includes("select all that apply");
              const opts = lines.filter((l) => /^[A-Z]\)/.test(l));
              return (
                <div key={i} className="q-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>Q{i + 1}</span>
                    <span className="q-chip" style={{ fontSize: 11, background: isMultiple ? "var(--q-yellow)" : "var(--q-bg)" }}>
                      {isMultiple ? t("import.typeMultiple") : t("import.typeSingle")}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16, fontFamily: "var(--q-sans)", overflowWrap: "anywhere", minWidth: 0 }}>{qText}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                    {opts.map((o, j) => {
                      const correct = o.includes("(correct)");
                      const text = o.replace(/^[A-Z]\)\s*/, "").replace("(correct)", "").trim();
                      return (
                        <span key={j} className="q-chip" style={{ background: correct ? "var(--q-green-soft)" : "var(--q-bg-2)", borderColor: correct ? "var(--q-green)" : "var(--q-line-2)", fontWeight: correct ? 600 : 400, whiteSpace: "normal", overflowWrap: "anywhere", alignItems: "flex-start", maxWidth: "100%", borderRadius: 8 }}>
                          <b>{o[0]}.</b> {text} {correct && "✓"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
