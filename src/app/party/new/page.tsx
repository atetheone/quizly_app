"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QLogo } from "@/components/q-ui";
import { ThemeSelector } from "@/components/quiz/ThemeSelector";

const DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"] as const;
type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export default function PartyNewPage() {
  const router = useRouter();
  const t = useTranslations("party");
  const tImport = useTranslations("import");

  const [hostName, setHostName] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(10);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/party/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostName: hostName.trim(),
        topic: topic.trim(),
        count,
        timeLimit,
        language,
        spread: { kind: "single", level: difficulty },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || t("generationFailed"));
      setLoading(false);
      return;
    }

    sessionStorage.setItem(`party_host_token_${data.code}`, data.hostToken);
    sessionStorage.setItem(`party_host_name_${data.code}`, hostName.trim());
    router.push(`/party/${data.code}/host`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid var(--q-line-2)" }}>
        <a href="/party" style={{ textDecoration: "none" }}>
          <QLogo size={30} />
        </a>
      </nav>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ marginBottom: 28 }}>
            <span className="q-eyebrow">Party Mode</span>
            <h1 style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(28px, 6vw, 42px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "8px 0 0" }}>
              {t("createRoomTitle")}
            </h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Host name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="q-eyebrow">{t("yourName")}</label>
              <input
                className="q-input"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder={t("yourNamePlaceholder")}
                maxLength={50}
                required
                style={{ fontSize: 16, padding: "12px 14px" }}
              />
            </div>

            {/* Topic */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="q-eyebrow">{t("topicLabel")}</label>
              <ThemeSelector value={topic} onChange={setTopic} />
            </div>

            {/* Questions + Time limit */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="q-eyebrow">{t("questionsLabel")}</label>
                <select
                  className="q-input"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  style={{ fontSize: 15, padding: "12px 14px" }}
                >
                  {[5, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="q-eyebrow">{t("timeLimitLabel")}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    className="q-input"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    style={{ flex: 1, fontSize: 15, padding: "12px 14px" }}
                  >
                    {[5, 8, 10, 15, 20, 30].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-mono)", whiteSpace: "nowrap" }}>{t("timeLimitUnit")}</span>
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="q-eyebrow">{t("difficultyLabel")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={`q-btn q-btn-sm${difficulty === level ? " q-btn-primary" : ""}`}
                    style={{ flex: 1 }}
                  >
                    {tImport(`level${level}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="q-eyebrow">Language</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["en", "fr"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`q-btn q-btn-sm${language === lang ? " q-btn-primary" : ""}`}
                    style={{ flex: 1 }}
                  >
                    {lang === "en" ? "English" : "Français"}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div role="alert" style={{ background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)", borderRadius: "var(--q-r-sm)", padding: "10px 14px", fontSize: 14, fontFamily: "var(--q-sans)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="q-btn q-btn-primary q-btn-lg"
              disabled={loading || !hostName.trim() || !topic.trim()}
              style={{ width: "100%" }}
            >
              {loading ? t("creating") : t("createRoom")}
            </button>

            {loading && (
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)", margin: 0 }}>
                AI is generating {count} questions on <em>{topic}</em>…
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
