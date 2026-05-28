"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { QLogo } from "@/components/q-ui";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setError(t("invalidCredentials"));
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--q-bg)" }}>
      {/* indigo side */}
      <div
        className="q-auth-side"
        style={{
          flex: "0 0 40%", background: "var(--q-indigo)", color: "#fff",
          display: "flex", flexDirection: "column", padding: 32,
          justifyContent: "space-between", position: "relative", overflow: "hidden",
        }}
      >
        <QLogo size={28} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.12 }} className="q-dot-grid" />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 40,
              color: "#fff", letterSpacing: "-0.025em", lineHeight: 1.05,
            }}
          >
            {t("welcomeBack")}
            <br />
            {t("teacherSuffix")}
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
            {t("tagline")}
          </div>
          <div
            className="q-card"
            style={{
              background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.2)",
              color: "#fff", padding: 14, marginTop: 16, boxShadow: "none",
            }}
          >
            <div className="q-eyebrow" style={{ color: "var(--q-yellow)" }}>★ ★ ★ ★ ★</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 6, lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
              &quot;{t("testimonialQuote")}&quot; {t("testimonialAuthor")}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", position: "relative", fontFamily: "var(--q-sans)" }}>
          {t("noStudentSignup")}
        </div>
      </div>

      {/* form side */}
      <div
        className="q-auth-form"
        style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "40px 48px", gap: 20,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 32, letterSpacing: "-0.02em" }}>
            {t("loginTitle")}
          </div>
          <div style={{ fontSize: 14, color: "var(--q-ink-3)", marginTop: 4, fontFamily: "var(--q-sans)" }}>
            {t("loginSubtitle")}
          </div>
        </div>

        <button
          type="button"
          className="q-btn"
          style={{ padding: 12 }}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <svg width="16" height="16" viewBox="0 0 18 18">
            <path fill="#4285f4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.79 2.72v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.62z"/>
            <path fill="#34a853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#fbbc05" d="M3.95 10.7c-.18-.54-.28-1.12-.28-1.7s.1-1.16.28-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.34z"/>
            <path fill="#ea4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96L3.95 7.3C4.66 5.16 6.65 3.58 9 3.58z"/>
          </svg>
          {t("continueWithGoogle")}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
          <span className="q-eyebrow">{t("dividerOrEmail")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div
              style={{
                background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)",
                borderRadius: "var(--q-r-sm)", padding: "10px 14px",
                fontSize: 14, color: "var(--q-ink)", fontFamily: "var(--q-sans)",
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="q-eyebrow">{t("emailLabel")}</span>
            <input
              className="q-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="q-eyebrow">{t("passwordLabel")}</span>
            <input
              className="q-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              required
            />
          </div>
          <button type="submit" className="q-btn q-btn-primary q-btn-lg" disabled={loading}>
            {loading ? t("signInLoading") : t("signInButton")}
          </button>
        </form>

        <div style={{ fontSize: 14, color: "var(--q-ink-3)", textAlign: "center", fontFamily: "var(--q-sans)" }}>
          {t("noAccount")}{" "}
          <Link href="/auth/signup" style={{ color: "var(--q-ink)", fontWeight: 600, textDecoration: "underline" }}>
            {t("createOne")}
          </Link>
        </div>
      </div>
    </div>
  );
}
