"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { QLogo } from "@/components/q-ui";

export default function JoinPage() {
  const router = useRouter();
  const t = useTranslations("join");
  const tErr = useTranslations("errors");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const roomCode = code.toUpperCase().trim();
    const roomRes = await fetch(`/api/sessions/${roomCode}`);
    const roomData = await roomRes.json();
    if (roomData.error) { setError(roomData.error); setLoading(false); return; }
    if (roomData.status !== "LOBBY") { setError(tErr("roomClosed")); setLoading(false); return; }
    const joinRes = await fetch(`/api/sessions/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const joinData = await joinRes.json();
    if (joinRes.ok) {
      sessionStorage.setItem("studentId", joinData.studentId);
      sessionStorage.setItem("studentName", joinData.name);
      sessionStorage.setItem("sessionCode", joinData.sessionCode);
      router.push(`/play/${roomCode}`);
    } else {
      setError(joinData.error || t("failedToJoin"));
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 28, padding: 8 }}>
        <QLogo size={26} />

        <div>
          <span className="q-eyebrow">{t("stepIndicator", { current: 1, total: 2 })}</span>
          <h1 style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(26px, 8vw, 40px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "8px 0 0" }}>
            {t("headline")}
          </h1>
          <p style={{ fontSize: 15, color: "var(--q-ink-2)", margin: "8px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
            {t("subtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="room-code" className="q-eyebrow">{t("roomCodeLabel")}</label>
            <input
              id="room-code"
              className="q-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder={t("roomCodePlaceholder")}
              maxLength={6}
              required
              autoComplete="off"
              inputMode="text"
              style={{ fontFamily: "var(--q-mono)", fontSize: "clamp(20px, 7vw, 32px)", letterSpacing: "0.15em", textAlign: "center", textTransform: "uppercase", padding: "16px 14px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label htmlFor="student-name" className="q-eyebrow">{t("yourNameLabel")}</label>
            <input
              id="student-name"
              className="q-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("yourNamePlaceholder")}
              maxLength={50}
              required
              style={{ fontSize: 17, padding: "14px 16px" }}
            />
          </div>

          {error && (
            <div role="alert" style={{ background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)", borderRadius: "var(--q-r-sm)", padding: "10px 14px", fontSize: 14, fontFamily: "var(--q-sans)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="q-btn q-btn-primary q-btn-lg" disabled={loading || code.length !== 6 || !name.trim()} style={{ width: "100%" }}>
            {loading ? t("joining") : `${t("joinQuiz")} →`}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
            <span className="q-eyebrow" aria-hidden="true">{t("dividerOr")}</span>
            <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
          </div>
          <button type="button" className="q-btn" style={{ width: "100%" }}>
            <span aria-hidden="true">📷</span> {t("scanQR")}
          </button>
        </form>
      </div>
    </div>
  );
}
