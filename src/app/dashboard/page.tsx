"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { QLogo, QAvatar } from "@/components/q-ui";

type QuizListItem = {
  id: string;
  title: string;
  timeLimit: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

const EMOJIS = ["🧬","📜","➗","🇪🇸","⚗️","📖","🌍","🔬","📐","🎭","🏛️","🌱","💡","🎵","🔭"];
const COLORS = [
  "var(--q-yellow)", "var(--q-coral-soft)", "var(--q-green-soft)",
  "var(--q-indigo-soft)", "var(--q-yellow-soft)", "var(--q-bg-3)",
];

function quizColor(id: string) { return COLORS[id.charCodeAt(0) % COLORS.length]; }
function quizEmoji(title: string) { return EMOJIS[title.charCodeAt(0) % EMOJIS.length]; }

const navItems = [
  { i: "▦", t: "Quizzes", on: true },
  { i: "↻", t: "Past sessions" },
  { i: "★", t: "Templates" },
  { i: "⚙", t: "Settings" },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((data) => { setQuizzes(data); setLoading(false); });
  }, [status]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this quiz?")) return;
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    if (res.ok) setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  async function handleStartSession(quizId: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    });
    if (res.ok) {
      const s = await res.json();
      router.push(`/session/${s.code}`);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--q-bg)" }}>
        <div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>Loading…</div>
      </div>
    );
  }
  if (!session) return null;

  const firstName = session.user?.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--q-bg)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220, borderRight: "1px solid var(--q-line-2)",
          background: "var(--q-bg-2)", display: "flex", flexDirection: "column",
          padding: 20, gap: 16, flexShrink: 0,
        }}
      >
        <QLogo size={26} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {navItems.map((x, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: x.on ? "var(--q-ink)" : "transparent",
                color: x.on ? "var(--q-bg)" : "var(--q-ink-2)",
                fontWeight: x.on ? 600 : 500, fontSize: 14,
                fontFamily: "var(--q-sans)", cursor: "pointer",
              }}
            >
              <span>{x.i}</span><span>{x.t}</span>
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <QAvatar name={session.user?.name ?? "?"} size={32} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, fontFamily: "var(--q-sans)" }}>{session.user?.name}</div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontSize: 11, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="q-eyebrow">{today}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.025em", marginTop: 4 }}>
              Good morning, {firstName}.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/quiz/import" className="q-btn q-btn-sm">Import from text</Link>
            <Link href="/quiz/new" className="q-btn q-btn-primary q-btn-sm">＋ New quiz</Link>
          </div>
        </div>

        {/* header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="q-eyebrow">Your quizzes · {quizzes.length}</span>
        </div>

        {quizzes.length === 0 ? (
          <div
            className="q-card"
            style={{
              padding: 48, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 16, textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48 }}>📝</div>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 24 }}>No quizzes yet</div>
            <div style={{ color: "var(--q-ink-3)", fontSize: 15, fontFamily: "var(--q-sans)" }}>
              Create your first quiz and run a live session.
            </div>
            <Link href="/quiz/new" className="q-btn q-btn-primary q-btn-lg">＋ Create a quiz</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="q-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    background: quizColor(quiz.id), padding: "20px 16px 14px",
                    borderBottom: "1.5px solid var(--q-line)", position: "relative",
                  }}
                >
                  <div style={{ fontSize: 32 }}>{quizEmoji(quiz.title)}</div>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>
                    {quiz.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="q-chip" style={{ fontSize: 11 }}>{quiz.questionCount} Q</span>
                    <span className="q-chip" style={{ fontSize: 11 }}>⏱ {quiz.timeLimit}m</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
                    Updated {new Date(quiz.updatedAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button className="q-btn q-btn-primary q-btn-sm" style={{ flex: 1 }} onClick={() => handleStartSession(quiz.id)}>
                      ▶ Start session
                    </button>
                    <Link href={`/quiz/${quiz.id}/edit`} className="q-btn q-btn-sm">Edit</Link>
                    <button className="q-btn q-btn-sm" style={{ color: "var(--q-coral)", borderColor: "var(--q-coral)" }} onClick={() => handleDelete(quiz.id)}>
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
