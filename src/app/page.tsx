import Link from "next/link";
import { QLogo, QAvatar } from "@/components/q-ui";

const students = ["Aria", "Jamal", "Linh", "Sara"];
const steps = [
  { n: "01", t: "Build a quiz", d: "Type questions, paste from a doc, or import in our simple format.", color: "var(--q-ink)" },
  { n: "02", t: "Share the code", d: "Project the 6-letter code. Students join — no account, no app.", color: "var(--q-coral)" },
  { n: "03", t: "Watch it happen", d: "Live progress for every student. Auto-graded the second time runs out.", color: "var(--q-indigo)" },
];
const roster = [
  { n: "Aria", p: 100, s: "done" },
  { n: "Jamal", p: 75, s: "Q9 of 12" },
  { n: "Linh", p: 58, s: "Q7 of 12" },
  { n: "Marcos", p: 33, s: "Q4 of 12" },
];

export default function HomePage() {
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
          <span style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", cursor: "pointer" }}>How it works</span>
          <span style={{ fontSize: 14, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)", cursor: "pointer" }}>For teachers</span>
          <Link href="/auth/login" className="q-btn q-btn-sm">Log in</Link>
          <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-sm">Get started →</Link>
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
                <span className="q-dot q-dot-live" /> Real-time
              </span>
              <span className="q-eyebrow">v1 · for teachers</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--q-display)", fontWeight: 700,
                fontSize: "clamp(52px, 7vw, 84px)", letterSpacing: "-0.03em",
                lineHeight: 0.95, margin: 0, color: "var(--q-ink)",
              }}
            >
              Quizzes that{" "}
              <em style={{ fontStyle: "italic", color: "var(--q-coral)" }}>actually</em>
              <br />
              wake the room up.
            </h1>
            <p style={{ fontSize: 17, maxWidth: 520, color: "var(--q-ink-2)", margin: 0, lineHeight: 1.55, fontFamily: "var(--q-sans)" }}>
              Build a quiz in two minutes. Drop a 6‑letter code on the board. Watch every answer
              roll in, live, while you wander the classroom.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="q-btn q-btn-primary q-btn-lg">
                Start teaching — it&apos;s free
              </Link>
              <Link href="/join" className="q-btn q-btn-lg">
                I have a code →
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
                <b>12,000+ classrooms</b> ran a Quizly today
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
                  <span className="q-eyebrow" style={{ color: "var(--q-coral)" }}>LIVE · Cell Biology</span>
                </div>
                <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>7:42 left</span>
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
                          background: s.s === "done" ? "var(--q-green)" : "var(--q-indigo)",
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, width: 56, textAlign: "right", color: "var(--q-ink-3)" }}>
                      {s.s}
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
              no logins
              <br />
              for kids
            </div>
          </div>
        </div>

        {/* 3-step strip */}
        <div style={{ display: "flex", gap: 16, padding: "0 64px 56px", flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div key={i} className="q-card" style={{ flex: "1 1 240px", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                className="q-display"
                style={{ fontSize: 48, color: s.color }}
              >
                {s.n}
              </div>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22, letterSpacing: "-0.01em" }}>{s.t}</div>
              <div style={{ fontSize: 14, color: "var(--q-ink-2)", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>{s.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
