"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

type Level = "EASY" | "MEDIUM" | "HARD";
const LEVELS: Level[] = ["EASY", "MEDIUM", "HARD"];
const cap = (s: string) => s[0] + s.slice(1).toLowerCase();

const EXAMPLE_TEXT = `Question: What is the powerhouse of the cell?
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
C) Ribosomes`;

export default function ImportQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [rawText, setRawText] = useState(EXAMPLE_TEXT);
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
        body: JSON.stringify({ topic: topic.trim(), count, spread }),
      });
      const d = await res.json();
      if (res.ok) {
        setRawText(d.rawText);
        if (!title) {
          setTitle(`${topic.trim()} · ${mixMode ? "Mixed" : cap(level)}`);
        }
        toast.success(
          `Generated ${d.parsedCount} question${d.parsedCount !== 1 ? "s" : ""} — review & edit below`
        );
      } else {
        toast.error(d.error || "Generation failed");
      }
    } catch {
      toast.error("Generation failed — check your connection");
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
    if (res.ok) { toast.success("Quiz imported!"); router.push("/dashboard"); }
    else { const d = await res.json(); toast.error(d.error || "Failed to import quiz"); setLoading(false); }
  }

  const parsedCount = (rawText.match(/^Question:/gm) || []).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--q-bg)", overflow: "hidden" }}>
      {/* topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" className="q-btn q-btn-ghost q-btn-sm">← Dashboard</Link>
          <span style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 20, letterSpacing: "-0.02em" }}>Import from text</span>
          {parsedCount > 0 && (
            <span className="q-chip q-chip-green" style={{ fontSize: 11 }}>✓ {parsedCount} question{parsedCount !== 1 ? "s" : ""} parsed</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/dashboard" className="q-btn q-btn-sm">Cancel</Link>
          <button className="q-btn q-btn-primary q-btn-sm" onClick={handleSubmit} disabled={loading || !title}>
            {loading ? "Importing…" : "Continue to editor →"}
          </button>
        </div>
      </div>

      {/* meta strip */}
      <div style={{ display: "flex", gap: 16, padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)", alignItems: "flex-end", background: "var(--q-bg-2)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, maxWidth: 360 }}>
          <span className="q-eyebrow">Quiz title</span>
          <input
            className="q-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cell Biology · Unit 3"
            required
            style={{ background: "var(--q-bg)" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="q-eyebrow">Time limit</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              className="q-input"
              type="number" min={1} max={120} value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              style={{ width: 64, background: "var(--q-bg)" }}
            />
            <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>min</span>
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
          <span style={{ fontWeight: 600 }}>Generate with AI</span>
          <span style={{ color: "var(--q-ink-4)" }}>
            — describe a topic, get questions to edit
          </span>
          <span style={{ marginLeft: "auto", color: "var(--q-ink-4)" }}>
            {genOpen ? "▲" : "▼"}
          </span>
        </button>

        {genOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "4px 20px 16px", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 240 }}>
              <span className="q-eyebrow">Topic</span>
              <input
                className="q-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis, French Revolution, Cycling…"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="q-eyebrow">Questions</span>
              <input
                className="q-input"
                type="number" min={1} max={20} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                style={{ width: 72 }}
              />
            </div>

            {!mixMode ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="q-eyebrow">Difficulty</span>
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
                      {cap(l)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="q-eyebrow">
                  Mix{" "}
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
                        {cap(k)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--q-sans)", color: "var(--q-ink-3)", cursor: "pointer", paddingBottom: 6 }}>
              <input type="checkbox" checked={mixMode} onChange={(e) => setMixMode(e.target.checked)} />
              Custom mix
            </label>

            <button
              type="button"
              className="q-btn q-btn-primary"
              onClick={handleGenerate}
              disabled={genDisabled}
            >
              {generating ? "Generating…" : "✨ Generate"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* text editor */}
        <div style={{ flex: 1, borderRight: "1px solid var(--q-line-2)", background: "var(--q-bg-2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--q-line-2)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="q-chip" style={{ background: "var(--q-ink)", color: "var(--q-bg)", fontSize: 11 }}>Paste</span>
              <span className="q-chip" style={{ fontSize: 11 }}>Sample</span>
            </div>
            <span className="q-eyebrow">Format: Question: … / A) … (correct)</span>
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
          <span className="q-eyebrow">Live preview</span>
          {parsedCount === 0 ? (
            <div style={{ color: "var(--q-ink-4)", fontSize: 14, fontFamily: "var(--q-sans)", marginTop: 8 }}>
              Start typing — questions will appear here.
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
                      {isMultiple ? "Multiple" : "Single"}
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
