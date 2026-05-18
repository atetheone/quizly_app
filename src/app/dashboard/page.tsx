"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";
import { QLogo, QAvatar } from "@/components/q-ui";

type QuizListItem = {
  id: string;
  title: string;
  timeLimit: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  isLocked: boolean;
};

type PastSession = {
  code: string;
  quizTitle: string;
  endedAt: string;
  studentCount: number;
  average: number;
};

const EMOJIS = ["🧬","📜","➗","🇪🇸","⚗️","📖","🌍","🔬","📐","🎭","🏛️","🌱","💡","🎵","🔭"];
const COLORS = [
  "var(--q-yellow)", "var(--q-coral-soft)", "var(--q-green-soft)",
  "var(--q-indigo-soft)", "var(--q-yellow-soft)", "var(--q-bg-3)",
];

function quizColor(id: string) { return COLORS[id.charCodeAt(0) % COLORS.length]; }
function quizEmoji(title: string) { return EMOJIS[title.charCodeAt(0) % EMOJIS.length]; }

type NavTab = "quizzes" | "sessions";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const [tab, setTab] = useState<NavTab>("quizzes");
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [pastSessions, setPastSessions] = useState<PastSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const navItems: { i: string; tab: NavTab }[] = [
    { i: "▦", tab: "quizzes" },
    { i: "↻", tab: "sessions" },
  ];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then((data) => { setQuizzes(data); setLoading(false); });
  }, [status]);

  useEffect(() => {
    if (tab === "sessions" && pastSessions === null && status === "authenticated") {
      fetch("/api/sessions")
        .then((r) => r.json())
        .then(setPastSessions);
    }
  }, [tab, pastSessions, status]);

  async function handleDelete(quiz: QuizListItem) {
    const warning = quiz.isLocked
      ? t("deleteWarningLocked")
      : t("deleteWarning");
    if (!confirm(warning)) return;
    const res = await fetch(`/api/quizzes/${quiz.id}`, { method: "DELETE" });
    if (res.ok) {
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("toastDeleteFailed"));
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    const res = await fetch(`/api/quizzes/${id}/duplicate`, { method: "POST" });
    setDuplicating(null);
    if (res.ok) {
      const copy = await res.json();
      setQuizzes((prev) => [
        {
          id: copy.id,
          title: copy.title,
          timeLimit: copy.timeLimit,
          questionCount: copy.questions?.length ?? 0,
          createdAt: copy.createdAt,
          updatedAt: copy.updatedAt,
          isLocked: false,
        },
        ...prev,
      ]);
      toast.success(t("toastDuplicated"));
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("toastDuplicateFailed"));
    }
  }

  async function handleStartSession(quizId: string) {
    setStarting(quizId);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId }),
    });
    if (res.ok) {
      const s = await res.json();
      router.push(`/session/${s.code}`);
    } else {
      setStarting(null);
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || t("toastStartFailed"));
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--q-bg)" }}>
        <div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>{t("loading")}</div>
      </div>
    );
  }
  if (!session) return null;

  const firstName = session.user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";
  const today = new Date();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--q-bg)" }}>
      {/* Sidebar */}
      <aside
        className="q-sidebar"
        style={{
          width: 220, borderRight: "1px solid var(--q-line-2)",
          background: "var(--q-bg-2)", display: "flex", flexDirection: "column",
          padding: 20, gap: 16, flexShrink: 0,
        }}
      >
        <QLogo size={26} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {navItems.map((x) => (
            <button
              key={x.tab}
              onClick={() => setTab(x.tab)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                background: tab === x.tab ? "var(--q-ink)" : "transparent",
                color: tab === x.tab ? "var(--q-bg)" : "var(--q-ink-2)",
                fontWeight: tab === x.tab ? 600 : 500, fontSize: 14,
                fontFamily: "var(--q-sans)", cursor: "pointer",
                border: "none", textAlign: "left", width: "100%",
              }}
            >
              <span>{x.i}</span><span>{t(x.tab === "quizzes" ? "navQuizzes" : "navPastSessions")}</span>
            </button>
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
              {t("signOut")}
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", padding: 28, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span className="q-eyebrow">{format.dateTime(today, { weekday: "long", month: "long", day: "numeric" })}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.025em", marginTop: 4 }}>
              {t(greetingKey, { name: firstName })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/quiz/import?generate=1" className="q-btn q-btn-sm">{t("generate")}</Link>
            <Link href="/quiz/import" className="q-btn q-btn-sm">{t("importFromText")}</Link>
            <Link href="/quiz/new" className="q-btn q-btn-primary q-btn-sm">{t("newQuiz")}</Link>
          </div>
        </div>

        {tab === "sessions" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="q-eyebrow">{t("pastSessionsCount", { count: pastSessions?.length ?? 0 })}</span>
            </div>
            {pastSessions === null ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("pastSessionsLoading")}</div>
            ) : pastSessions.length === 0 ? (
              <div className="q-card" style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ fontSize: 48 }}>📋</div>
                <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 24 }}>{t("noPastSessions")}</div>
                <div style={{ color: "var(--q-ink-3)", fontSize: 15, fontFamily: "var(--q-sans)" }}>{t("noPastSessionsDescription")}</div>
              </div>
            ) : (
              <div className="q-card" style={{ overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", background: "var(--q-bg-2)", fontFamily: "var(--q-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--q-ink-3)", borderBottom: "1.5px solid var(--q-line)" }}>
                  <div>{t("tableQuiz")}</div><div>{t("tableDate")}</div><div>{t("tableStudents")}</div><div>{t("tableAvg")}</div>
                </div>
                {pastSessions.map((s) => (
                  <Link
                    key={s.code}
                    href={`/session/${s.code}`}
                    style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 16px", borderBottom: "1px solid var(--q-line-2)", alignItems: "center", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontFamily: "var(--q-sans)", fontWeight: 600, fontSize: 14 }}>{s.quizTitle}</div>
                    <div style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>
                      {format.dateTime(new Date(s.endedAt), { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontFamily: "var(--q-mono)", fontSize: 13 }}>{s.studentCount}</div>
                    <div>
                      <span
                        className="q-chip"
                        style={{
                          background: s.average >= 75 ? "var(--q-green-soft)" : s.average >= 50 ? "var(--q-yellow-soft)" : "var(--q-coral-soft)",
                          borderColor: s.average >= 75 ? "var(--q-green)" : s.average >= 50 ? "var(--q-yellow)" : "var(--q-coral)",
                          fontSize: 11, fontFamily: "var(--q-mono)",
                        }}
                      >
                        {s.average}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
        {/* header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="q-eyebrow">{t("yourQuizzesCount", { count: quizzes.length })}</span>
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
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 24 }}>{t("noQuizzesYet")}</div>
            <div style={{ color: "var(--q-ink-3)", fontSize: 15, fontFamily: "var(--q-sans)" }}>
              {t("noQuizzesDescription")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/quiz/import?generate=1" className="q-btn q-btn-lg">✨ {t("generate")}</Link>
              <Link href="/quiz/new" className="q-btn q-btn-primary q-btn-lg">{t("createQuiz")}</Link>
            </div>
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
                  {quiz.isLocked && (
                    <span
                      style={{
                        position: "absolute", top: 12, right: 12,
                        background: "var(--q-ink)", color: "var(--q-bg)",
                        fontSize: 10, fontFamily: "var(--q-sans)", fontWeight: 700,
                        padding: "2px 7px", borderRadius: 20, letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {t("lockedBadge")}
                    </span>
                  )}
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 18, letterSpacing: "-0.01em" }}>
                    {quiz.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="q-chip" style={{ fontSize: 11 }}>{t("questionCountShort", { count: quiz.questionCount })}</span>
                    <span className="q-chip" style={{ fontSize: 11 }}>{t("timeLimitShort", { minutes: quiz.timeLimit })}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
                    {t("updatedLabel", { date: format.dateTime(new Date(quiz.updatedAt), { dateStyle: "short" }) })}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button
                      className="q-btn q-btn-primary q-btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handleStartSession(quiz.id)}
                      disabled={starting === quiz.id}
                    >
                      {starting === quiz.id ? t("starting") : t("startSession")}
                    </button>
                    {quiz.isLocked ? (
                      <button
                        className="q-btn q-btn-sm"
                        onClick={() => handleDuplicate(quiz.id)}
                        disabled={duplicating === quiz.id}
                      >
                        {duplicating === quiz.id ? "…" : t("duplicate")}
                      </button>
                    ) : (
                      <>
                        <Link href={`/quiz/${quiz.id}/edit`} className="q-btn q-btn-sm">{t("edit")}</Link>
                        <button
                          className="q-btn q-btn-sm"
                          onClick={() => handleDuplicate(quiz.id)}
                          disabled={duplicating === quiz.id}
                        >
                          {duplicating === quiz.id ? "…" : t("duplicateShort")}
                        </button>
                      </>
                    )}
                    <button className="q-btn q-btn-sm" style={{ color: "var(--q-coral)", borderColor: "var(--q-coral)" }} onClick={() => handleDelete(quiz)}>
                      {t("deleteAction")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
