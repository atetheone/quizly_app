import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { QLogo } from "@/components/q-ui";

export default async function PartyPage() {
  const t = await getTranslations("party");
  const tLanding = await getTranslations("landing");

  return (
    <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: "1px solid var(--q-line-2)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <QLogo size={30} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/auth/login" className="q-btn q-btn-sm">{tLanding("navLogin")}</Link>
          <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-sm">{tLanding("navGetStarted")}</Link>
        </div>
      </nav>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ textAlign: "center" }}>
            <div className="q-eyebrow" style={{ marginBottom: 8 }}>Quizly · Party Mode</div>
            <h1 style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(36px, 6vw, 60px)", letterSpacing: "-0.03em", lineHeight: 0.95, margin: 0 }}>
              {t("friendsPanelTitle")}
            </h1>
            <p style={{ fontSize: 16, color: "var(--q-ink-2)", marginTop: 12, lineHeight: 1.55, fontFamily: "var(--q-sans)", maxWidth: 480, margin: "12px auto 0" }}>
              {t("friendsPanelDesc")}
            </p>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* Create a room */}
            <div className="q-card" style={{ flex: "1 1 320px", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Create a room</div>
                <p style={{ fontSize: 14, color: "var(--q-ink-2)", margin: "6px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
                  Pick a topic, set the options, and AI generates fair questions for everyone.
                </p>
              </div>
              <Link href="/party/new" className="q-btn q-btn-primary q-btn-lg" style={{ textAlign: "center", textDecoration: "none" }}>
                {t("friendsCta")}
              </Link>
            </div>

            {/* Join a room */}
            <div className="q-card" style={{ flex: "1 1 320px", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>Join a room</div>
                <p style={{ fontSize: 14, color: "var(--q-ink-2)", margin: "6px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
                  Have a 6-letter code? Enter it here to join your friends.
                </p>
              </div>
              <Link href="/join" className="q-btn q-btn-lg" style={{ textAlign: "center", textDecoration: "none" }}>
                {t("joinCta")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
