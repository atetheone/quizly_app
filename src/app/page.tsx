import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { QLogo, QAvatar } from "@/components/q-ui";

const students = ["Aria", "Jamal", "Linh", "Sara"];

export default async function HomePage() {
  const t = await getTranslations("landing");
  const tp = await getTranslations("party");

  return (
    <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 40px", borderBottom: "1px solid var(--q-line-2)",
        }}
      >
        <QLogo size={30} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/party" style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", textDecoration: "none" }}>{tp("navPlay")}</Link>
          <span style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", cursor: "pointer" }}>{t("navForTeachers")}</span>
          <Link href="/auth/login" className="q-btn q-btn-sm">{t("navLogin")}</Link>
          <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-sm">{t("navGetStarted")}</Link>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {/* Hero — dual entry */}
        <div style={{ padding: "56px 64px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="q-chip q-chip-yellow" style={{ fontWeight: 600 }}>
              <span className="q-dot q-dot-live" /> {t("badgeRealTime")}
            </span>
            <span className="q-eyebrow">{t("badgeVersion")}</span>
          </div>

          <h1
            style={{
              fontFamily: "var(--q-display)", fontWeight: 700,
              fontSize: "clamp(48px, 6vw, 78px)", letterSpacing: "-0.03em",
              lineHeight: 0.95, margin: 0, color: "var(--q-ink)", maxWidth: 700,
            }}
          >
            {t("headlineLine1")}{" "}
            <em style={{ fontStyle: "italic", color: "var(--q-coral)" }}>{t("headlineEmphasis")}</em>
            <br />
            {t("headlineLine2")}
          </h1>

          {/* Two-panel CTA */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* Teacher panel */}
            <div
              className="q-card"
              style={{
                flex: "1 1 300px", padding: 28,
                display: "flex", flexDirection: "column", gap: 12,
                borderLeft: "4px solid var(--q-indigo)",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
                  {tp("teacherPanelTitle")}
                </div>
                <p style={{ fontSize: 14, color: "var(--q-ink-2)", margin: "6px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
                  {tp("teacherPanelDesc")}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                <div style={{ display: "flex" }}>
                  {students.map((n, i) => (
                    <div key={i} style={{ marginLeft: i ? -8 : 0, border: "2px solid var(--q-bg)", borderRadius: "50%" }}>
                      <QAvatar name={n} size={24} />
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
                  {t("socialProofCount", { count: 12000 })} {t("socialProofSuffix")}
                </span>
              </div>
              <Link href="/auth/signup" className="q-btn q-btn-primary" style={{ textAlign: "center", textDecoration: "none" }}>
                {tp("teacherCta")}
              </Link>
            </div>

            {/* Party panel */}
            <div
              className="q-card"
              style={{
                flex: "1 1 300px", padding: 28,
                display: "flex", flexDirection: "column", gap: 12,
                borderLeft: "4px solid var(--q-coral)",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>
                  {tp("friendsPanelTitle")}
                </div>
                <p style={{ fontSize: 14, color: "var(--q-ink-2)", margin: "6px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
                  {tp("friendsPanelDesc")}
                </p>
              </div>
              <div style={{ fontSize: 12, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)", marginTop: 4 }}>
                No account needed · AI generates questions · everyone plays fair
              </div>
              <Link href="/party/new" className="q-btn q-btn-coral" style={{ textAlign: "center", textDecoration: "none" }}>
                {tp("friendsCta")}
              </Link>
            </div>
          </div>

          {/* Join CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{tp("haveCode")}</span>
            <Link href="/join" className="q-btn q-btn-sm">
              {tp("joinCta")}
            </Link>
          </div>
        </div>

        {/* How it works — two tracks */}
        <div style={{ padding: "0 64px 56px" }}>
          <div style={{ marginBottom: 24 }}>
            <span className="q-eyebrow">How it works</span>
          </div>

          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            {/* Classroom track */}
            <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "var(--q-indigo)", marginBottom: 4 }}>
                {tp("classroomStepsLabel")}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(["step1", "step2", "step3"] as const).map((s, i) => (
                  <div key={s} className="q-card" style={{ flex: "1 1 140px", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="q-display" style={{ fontSize: 36, color: i === 0 ? "var(--q-ink)" : i === 1 ? "var(--q-coral)" : "var(--q-indigo)" }}>
                      0{i + 1}
                    </div>
                    <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{t(`${s}Title`)}</div>
                    <div style={{ fontSize: 13, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{t(`${s}Description`)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Party track */}
            <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", color: "var(--q-coral)", marginBottom: 4 }}>
                {tp("partyStepsLabel")}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(["partyStep1", "partyStep2", "partyStep3"] as const).map((s, i) => (
                  <div key={s} className="q-card" style={{ flex: "1 1 140px", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="q-display" style={{ fontSize: 36, color: "var(--q-coral)", opacity: 0.5 + i * 0.25 }}>
                      0{i + 1}
                    </div>
                    <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{tp(`${s}Title`)}</div>
                    <div style={{ fontSize: 13, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{tp(`${s}Description`)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
