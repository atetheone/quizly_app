import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { QLogo, QAvatar } from "@/components/q-ui";

const students = ["Aria", "Jamal", "Linh", "Sara"];
const roster: { n: string; p: number; done: boolean; current: number; total: number }[] = [
  { n: "Aria", p: 100, done: true, current: 12, total: 12 },
  { n: "Jamal", p: 75, done: false, current: 9, total: 12 },
  { n: "Linh", p: 58, done: false, current: 7, total: 12 },
  { n: "Marcos", p: 33, done: false, current: 4, total: 12 },
];

export default async function HomePage() {
  const t = await getTranslations("landing");

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
          <span style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", cursor: "pointer" }}>{t("navHowItWorks")}</span>
          <span style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", cursor: "pointer" }}>{t("navForTeachers")}</span>
          <Link href="/auth/login" className="q-btn q-btn-sm">{t("navLogin")}</Link>
          <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-sm">{t("navGetStarted")}</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 48,
            padding: "56px 64px 40px", flexWrap: "wrap",
          }}
        >
          {/* left */}
          <div style={{ flex: "1 1 460px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="q-chip q-chip-yellow" style={{ fontWeight: 600 }}>
                <span className="q-dot q-dot-live" /> {t("badgeRealTime")}
              </span>
              <span className="q-eyebrow">{t("badgeVersion")}</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--q-display)", fontWeight: 700,
                fontSize: "clamp(52px, 7vw, 84px)", letterSpacing: "-0.03em",
                lineHeight: 0.95, margin: 0, color: "var(--q-ink)",
              }}
            >
              {t("headlineLine1")}{" "}
              <em style={{ fontStyle: "italic", color: "var(--q-coral)" }}>{t("headlineEmphasis")}</em>
              <br />
              {t("headlineLine2")}
            </h1>
            <p style={{ fontSize: 17, maxWidth: 520, color: "var(--q-ink-2)", margin: 0, lineHeight: 1.55, fontFamily: "var(--q-sans)" }}>
              {t("description")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-lg">
                {t("ctaPrimary")}
              </Link>
              <Link href="/join" className="q-btn q-btn-lg">
                {t("ctaSecondary")}
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex" }}>
                {students.map((n, i) => (
                  <div key={i} style={{ marginLeft: i ? -10 : 0, border: "2px solid var(--q-bg)", borderRadius: "50%" }}>
                    <QAvatar name={n} size={28} />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)" }}>
                <b>{t("socialProofCount", { count: 12000 })}</b> {t("socialProofSuffix")}
              </span>
            </div>
          </div>

          {/* preview card */}
          <div style={{ flex: "1 1 360px", position: "relative", maxWidth: 460 }}>
            <div
              className="q-card"
              style={{
                padding: 18, transform: "rotate(1.2deg)",
                boxShadow: "var(--q-shadow-pop)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="q-dot q-dot-live" />
                  <span className="q-eyebrow" style={{ color: "var(--q-coral)" }}>{t("previewLive")} · {t("previewSubject")}</span>
                </div>
                <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>{t("previewTimeLeft", { m: 7, s: 42 })}</span>
              </div>
              <div
                style={{
                  fontFamily: "var(--q-display)", fontWeight: 700,
                  fontSize: 56, lineHeight: 1, marginBottom: 14, letterSpacing: "0.06em",
                }}
              >
                <span
                  style={{
                    background: "var(--q-yellow)", padding: "0 8px", borderRadius: 8,
                    border: "1.5px solid var(--q-line)",
                  }}
                >
                  BG7K2P
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roster.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <QAvatar name={s.n} size={28} />
                    <span style={{ fontWeight: 600, fontSize: 14, width: 70, fontFamily: "var(--q-sans)" }}>{s.n}</span>
                    <div className="q-bar" style={{ flex: 1 }}>
                      <span
                        className="q-bar-fill"
                        style={{
                          width: `${s.p}%`,
                          background: s.done ? "var(--q-green)" : "var(--q-indigo)",
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, width: 56, textAlign: "right", color: "var(--q-ink-3)" }}>
                      {s.done ? t("previewStatusDone") : t("previewStatusProgress", { current: s.current, total: s.total })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* sticker */}
            <div
              style={{
                position: "absolute", top: -22, right: -22,
                width: 110, height: 110, borderRadius: "50%",
                background: "var(--q-coral)", color: "#fff",
                border: "1.5px solid var(--q-line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: "rotate(-12deg)", boxShadow: "var(--q-stamp)",
                fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 18,
                lineHeight: 1.05, textAlign: "center",
              }}
            >
              {t("stickerLine1")}
              <br />
              {t("stickerLine2")}
            </div>
          </div>
        </div>

        {/* 3-step strip */}
        <div style={{ display: "flex", gap: 16, padding: "0 64px 56px", flexWrap: "wrap" }}>
          <div className="q-card" style={{ flex: "1 1 240px", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="q-display" style={{ fontSize: 48, color: "var(--q-ink)" }}>01</div>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em" }}>{t("step1Title")}</div>
            <div style={{ fontSize: 14, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{t("step1Description")}</div>
          </div>
          <div className="q-card" style={{ flex: "1 1 240px", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="q-display" style={{ fontSize: 48, color: "var(--q-coral)" }}>02</div>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em" }}>{t("step2Title")}</div>
            <div style={{ fontSize: 14, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{t("step2Description")}</div>
          </div>
          <div className="q-card" style={{ flex: "1 1 240px", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="q-display" style={{ fontSize: 48, color: "var(--q-indigo)" }}>03</div>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em" }}>{t("step3Title")}</div>
            <div style={{ fontSize: 14, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{t("step3Description")}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
