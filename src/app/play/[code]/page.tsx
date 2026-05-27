"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Pusher from "pusher-js";
import { isPusherConfigured } from "@/lib/use-pusher";
import { QLogo, QAvatar } from "@/components/q-ui";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type AnswerOption = { id: string; text: string };
type Question = { id: string; text: string; type: "SINGLE" | "MULTIPLE"; order: number; answerOptions: AnswerOption[] };
type Phase = "lobby" | "countdown" | "active" | "waiting" | "results";

const OPTION_COLORS = ["var(--q-coral-soft)", "var(--q-yellow-soft)", "var(--q-indigo-soft)", "var(--q-green-soft)"];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmt(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; }

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;
  const t = useTranslations("play");
  const tCommon = useTranslations("common");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{ quizTitle: string; timeLimit: number; mode?: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState<{
    score: number; total: number; percentage: number;
    rank: number; totalParticipants: number;
    top3: { name: string; score: number; total: number; percentage: number }[];
    questions: { id: string; text: string; type: string; isCorrect: boolean; answerOptions: { id: string; text: string; isCorrect: boolean; isSelected: boolean }[] }[];
  } | null>(null);
  const [lobbyStudents, setLobbyStudents] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const submitPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const answersRef = useRef<Record<string, string[]>>({});
  const studentIdRef = useRef("");
  const questionsRef = useRef<Question[]>([]);

  useEffect(() => {
    const sid = sessionStorage.getItem("studentId");
    const sname = sessionStorage.getItem("studentName");
    if (!sid || !sname) { window.location.href = `/join/${code}`; return; }
    studentIdRef.current = sid;
    setStudentId(sid);
    setStudentName(sname);
    fetch(`/api/sessions/${code}`).then((r) => r.json()).then((data) => {
      if (data.error) return;
      setSessionInfo({ quizTitle: data.quizTitle, timeLimit: data.timeLimit, mode: data.mode });
      if (data.status === "ACTIVE") { setPhase("active"); fetchQuiz(); startTimer(); }
    });
  }, [code]);

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setPhase("waiting");
    const stored = sessionStorage.getItem(`quizly_answers_${code}`);
    const finalAnswers: Record<string, string[]> = stored ? JSON.parse(stored) : answersRef.current;
    const payload = Object.entries(finalAnswers).flatMap(([qId, optIds]) => optIds.map((answerOptionId) => ({ questionId: qId, answerOptionId })));
    fetch(`/api/sessions/${code}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentIdRef.current, questionsAnswered: Object.keys(finalAnswers).length, totalQuestions: questionsRef.current.length }),
    }).catch(() => {});
    const res = await fetch(`/api/sessions/${code}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentIdRef.current, answers: payload }),
    });
    if (res.ok) {
      sessionStorage.removeItem(`quizly_answers_${code}`);
    }
  }, [code]);

  const fetchResults = useCallback(async () => {
    const res = await fetch(`/api/sessions/${code}/student-results?studentId=${studentIdRef.current}`);
    if (res.ok) {
      setResults(await res.json());
      setPhase("results");
    }
  }, [code]);

  useEffect(() => {
    if (!isPusherConfigured) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
    const channel = pusher.subscribe(`room-${code}`);
    channel.bind("student-joined", (d: { name: string }) => { setLobbyStudents((p) => [...p, d.name]); });
    channel.bind("quiz-started", () => {
      setCountdown(3);
      setPhase("countdown");
      let c = 3;
      const iv = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) { clearInterval(iv); setPhase("active"); fetchQuiz(); startTimer(); }
      }, 1000);
    });
    channel.bind("quiz-ended", async () => {
      if (!submittedRef.current) {
        submitPromiseRef.current = handleSubmit();
      }
      await submitPromiseRef.current;
      await fetchResults();
    });
    return () => { pusher.unsubscribe(`room-${code}`); pusher.disconnect(); };
  }, [code, fetchResults, handleSubmit]);

  // Poll for results while waiting — fallback for when quiz-ended Pusher event is missed
  useEffect(() => {
    if (phase !== "waiting") return;
    fetchResults();
    const iv = setInterval(fetchResults, 3000);
    return () => clearInterval(iv);
  }, [phase, fetchResults]);

  async function fetchQuiz() {
    const res = await fetch(`/api/sessions/${code}/quiz`);
    if (res.ok) {
      const data = await res.json();
      questionsRef.current = data.questions;
      setQuestions(data.questions);
      const endTime = new Date(data.startedAt).getTime() + data.timeLimit * 60 * 1000;
      setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
    }
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (timeLeft === 0 && phase === "active" && !submittedRef.current) {
      submitPromiseRef.current = handleSubmit();
    }
  }, [timeLeft, phase, handleSubmit]);

  function handleAnswer(qId: string, optId: string, type: "SINGLE" | "MULTIPLE") {
    const prev = answersRef.current;
    const next =
      type === "SINGLE"
        ? { ...prev, [qId]: [optId] }
        : (() => {
            const cur = prev[qId] || [];
            return { ...prev, [qId]: cur.includes(optId) ? cur.filter((id) => id !== optId) : [...cur, optId] };
          })();
    answersRef.current = next;
    sessionStorage.setItem(`quizly_answers_${code}`, JSON.stringify(next));
    setAnswers(next);
    const answered = Object.keys(next).length;
    fetch(`/api/sessions/${code}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: studentIdRef.current, questionsAnswered: answered, totalQuestions: questionsRef.current.length }),
    }).catch(() => {});
  }

  // ─── Lobby ───
  if (phase === "lobby") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "var(--q-indigo)", color: "#fff", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{code}</span>
            <span className="q-chip q-chip-yellow" style={{ fontSize: 11, color: "var(--q-ink)" }}>{t("waitingBadge")}</span>
          </div>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 28, color: "#fff", letterSpacing: "-0.025em" }}>
            {sessionInfo?.quizTitle ?? t("loading")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <QAvatar name={studentName} size={36} />
            <div>
              <span className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>{t("youBadge")}</span>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 18, color: "#fff" }}>{studentName}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="q-eyebrow">{t("inTheLobby")}</span>
            <span aria-live="polite" style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>{tCommon("hereCount", { count: lobbyStudents.length + 1 })}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[studentName, ...lobbyStudents].map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, background: "var(--q-bg-2)", borderRadius: 10 }}>
                <QAvatar name={n} size={24} />
                <span style={{ fontSize: 14, fontWeight: 500, fontFamily: "var(--q-sans)" }}>{n}</span>
                {i === 0 && <span className="q-chip q-chip-yellow" style={{ fontSize: 10, marginLeft: "auto" }}>{t("youBadge")}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 20, borderTop: "1px solid var(--q-line-2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--q-ink-3)", opacity: 0.3 + i * 0.2, animation: `pulse ${1 + i * 0.3}s infinite` }} />
            ))}
          </div>
          <span style={{ fontSize: 14, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
            {sessionInfo?.mode === "PARTY" ? t("waitingForHost") : t("waitingForTeacher")}
          </span>
        </div>
      </div>
    );
  }

  // ─── Countdown ───
  if (phase === "countdown") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--q-yellow)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", padding: 20 }}>
        <span className="q-eyebrow">{t("getReady")}</span>
        <div style={{ position: "relative", width: "min(240px, 65vw)", height: "min(240px, 65vw)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.3 }} className="q-spike" />
          <div aria-live="assertive" aria-atomic="true" style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "min(200px, 54vw)", lineHeight: 1, color: "var(--q-ink)", position: "relative" }}>
            {countdown > 0 ? countdown : "!"}
          </div>
        </div>
        <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 24, letterSpacing: "-0.02em" }}>
          {sessionInfo?.quizTitle}
        </div>
        <div style={{ fontSize: 15, color: "var(--q-ink-2)", fontFamily: "var(--q-sans)" }}>
          {t("quizInfo", { count: questions.length, minutes: sessionInfo?.timeLimit ?? 0 })}
        </div>
      </div>
    );
  }

  // ─── Active ───
  if (phase === "active" && questions.length > 0) {
    const q = questions[currentQ];
    const selectedOpts = answers[q.id] || [];
    const answeredCount = Object.keys(answers).length;

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--q-bg)" }}>
        {/* sticky header */}
        <div style={{ position: "sticky", top: 0, background: "var(--q-bg)", borderBottom: "1px solid var(--q-line-2)", padding: 16, display: "flex", flexDirection: "column", gap: 10, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>
              {t("questionLabel", { current: currentQ + 1, total: questions.length })}
            </span>
            {timeLeft !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span aria-hidden="true" style={{ fontSize: 14 }}>⏱</span>
                <span
                  aria-label={tCommon("timer", { minutes: Math.floor(timeLeft / 60), seconds: (timeLeft % 60).toString().padStart(2, "0") })}
                  style={{ fontFamily: "var(--q-mono)", fontSize: 16, fontWeight: 600, color: timeLeft < 60 ? "var(--q-coral)" : "var(--q-ink)" }}
                >
                  {fmt(timeLeft)}
                </span>
              </div>
            )}
          </div>
          <div className="q-bar q-bar-thin">
            <span className="q-bar-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, background: "var(--q-indigo)" }} />
          </div>
          {/* question nav dots */}
          <div role="group" aria-label="Question navigation" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {questions.map((_, i) => {
              const answered = !!answers[questions[i].id];
              const current = i === currentQ;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Question ${i + 1}${answered ? ", answered" : ""}${current ? " (current)" : ""}`}
                  aria-current={current ? "true" : undefined}
                  onClick={() => setCurrentQ(i)}
                  style={{
                    width: 24, height: 24, borderRadius: 5, cursor: "pointer",
                    border: "1.5px solid " + (current ? "var(--q-ink)" : "var(--q-line-2)"),
                    background: answered ? "var(--q-ink)" : current ? "var(--q-yellow)" : "var(--q-bg)",
                    color: answered ? "var(--q-bg)" : "var(--q-ink)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--q-mono)", fontWeight: 600, fontSize: 11,
                    padding: 0,
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
          {q.type === "MULTIPLE" && (
            <span className="q-chip q-chip-yellow" style={{ alignSelf: "flex-start", fontSize: 11 }}>{t("selectAllThatApply")}</span>
          )}
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {q.text}
          </div>

          <div
            role={q.type === "SINGLE" ? "radiogroup" : "group"}
            aria-label="Answer options"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {q.answerOptions.map((opt, oi) => {
              const selected = selectedOpts.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role={q.type === "SINGLE" ? "radio" : "checkbox"}
                  aria-checked={selected}
                  onClick={() => handleAnswer(q.id, opt.id, q.type)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 14,
                    background: selected ? "var(--q-ink)" : "var(--q-bg)",
                    color: selected ? "var(--q-bg)" : "var(--q-ink)",
                    border: "1.5px solid " + (selected ? "var(--q-line)" : "var(--q-line-2)"),
                    borderRadius: 14, cursor: "pointer",
                    boxShadow: selected ? "var(--q-stamp-soft)" : "none",
                    transition: "background 0.1s, box-shadow 0.1s",
                    width: "100%", textAlign: "left",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: OPTION_COLORS[oi] ?? "var(--q-bg-3)",
                      border: "1.5px solid var(--q-line)", color: "var(--q-ink)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 16,
                    }}
                  >
                    {LETTERS[oi]}
                  </div>
                  <span style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 17, flex: 1 }}>{opt.text}</span>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: selected ? "var(--q-yellow)" : "transparent",
                      border: "1.5px solid " + (selected ? "var(--q-ink)" : "var(--q-line-2)"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, color: "var(--q-ink)", fontSize: 14,
                    }}
                  >
                    {selected ? "✓" : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* footer */}
        <div style={{ position: "sticky", bottom: 0, background: "var(--q-bg)", borderTop: "1px solid var(--q-line-2)", padding: 16, display: "flex", gap: 8 }}>
          <button className="q-btn q-btn-sm" disabled={currentQ === 0} onClick={() => setCurrentQ((p) => p - 1)}>←</button>
          {currentQ < questions.length - 1 ? (
            <button className="q-btn q-btn-primary" style={{ flex: 1 }} onClick={() => setCurrentQ((p) => p + 1)}>
              {t("next")} →
            </button>
          ) : (
            <button className="q-btn q-btn-primary" style={{ flex: 1 }} onClick={() => { submitPromiseRef.current = handleSubmit(); }} disabled={submitted}>
              {answeredCount < questions.length ? t("submitPartiallyAnswered", { answered: answeredCount, total: questions.length }) : t("submitQuiz")}
            </button>
          )}
          {currentQ < questions.length - 1 && (
            <button className="q-btn q-btn-coral q-btn-sm" onClick={() => { submitPromiseRef.current = handleSubmit(); }} disabled={submitted}>
              {t("submit")}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Waiting ───
  if (phase === "waiting") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--q-bg-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24, textAlign: "center" }}>
        <div aria-hidden="true" style={{ fontSize: 56 }}>🎉</div>
        <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 36, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
          {t("niceWork", { name: studentName })}
        </div>
        <div className="q-card" style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "var(--q-bg)" }}>
          <span className="q-eyebrow">{t("resultsUnlockWhenTimerEnds")}</span>
        </div>
        <p style={{ fontSize: 15, color: "var(--q-ink-2)", maxWidth: 280, margin: 0, lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
          {t("answersAreIn")}
        </p>
      </div>
    );
  }

  // ─── Results ───
  if (phase === "results" && results) {
    const feedbackKey = results.percentage >= 80 ? "scoreFeedbackExcellent" : results.percentage >= 60 ? "scoreFeedbackWellDone" : "scoreFeedbackKeepGoing";
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--q-bg)" }}>
        {/* score header */}
        <div style={{ background: "var(--q-yellow)", padding: "28px 24px 20px", position: "relative", overflow: "hidden", textAlign: "center", borderBottom: "1.5px solid var(--q-line)" }}>
          <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, opacity: 0.25 }} className="q-spike" />
          <span className="q-eyebrow" style={{ position: "relative" }}>{t("yourScore")}</span>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(52px, 16vw, 80px)", lineHeight: 1, position: "relative" }}>
            {results.score}<span style={{ fontSize: 36, color: "var(--q-ink-3)" }}>/{results.total}</span>
          </div>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 20, position: "relative" }}>
            {t(feedbackKey, { percentage: results.percentage })}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10, position: "relative" }}>
            <span className="q-chip" style={{ background: "var(--q-bg)", fontSize: 11 }}>
              {t("correctCount", { score: results.score, total: results.total })}
            </span>
            <span className="q-chip" style={{ background: "var(--q-bg)", fontSize: 11 }}>
              {t("rankOf", { rank: results.rank, total: results.totalParticipants })}
            </span>
          </div>
        </div>

        {/* leaderboard */}
        {results.top3.length > 0 && (
          <div style={{ padding: "16px 20px 0" }}>
            <span className="q-eyebrow" style={{ display: "block", marginBottom: 8 }}>{t("leaderboard")}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {results.top3.map((s, i) => {
                const isMe = s.name === studentName && i + 1 === results.rank;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: isMe ? "var(--q-ink)" : "var(--q-bg-2)",
                      color: isMe ? "var(--q-bg)" : "var(--q-ink)",
                      borderRadius: 10, border: "1.5px solid " + (isMe ? "var(--q-ink)" : "var(--q-line-2)"),
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{medals[i]}</span>
                    <span style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 15, flex: 1 }}>{s.name}{isMe ? ` ${t("you")}` : ""}</span>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 13 }}>{s.score}/{s.total}</span>
                  </div>
                );
              })}
              {results.rank > 3 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--q-ink)", color: "var(--q-bg)", borderRadius: 10, border: "1.5px solid var(--q-ink)" }}>
                  <span style={{ fontFamily: "var(--q-mono)", fontSize: 14, flexShrink: 0 }}>#{results.rank}</span>
                  <span style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 15, flex: 1 }}>{studentName} {t("you")}</span>
                  <span style={{ fontFamily: "var(--q-mono)", fontSize: 13 }}>{results.score}/{results.total}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* answer review */}
        <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="q-eyebrow">{t("answerReview")}</span>
            <div aria-label={`${results.questions.filter(q => q.isCorrect).length} correct, ${results.questions.filter(q => !q.isCorrect).length} wrong`} style={{ display: "flex", gap: 3 }}>
              {results.questions.map((q, i) => (
                <span key={i} aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 3, background: q.isCorrect ? "var(--q-green)" : "var(--q-coral)" }} />
              ))}
            </div>
          </div>

          {results.questions.map((q, qi) => (
            <div
              key={q.id}
              className="q-card"
              style={{
                padding: 14,
                background: q.isCorrect ? "var(--q-green-soft)" : "var(--q-coral-soft)",
                borderColor: q.isCorrect ? "var(--q-green)" : "var(--q-coral)",
                display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  className="q-chip"
                  style={{
                    background: q.isCorrect ? "var(--q-green)" : "var(--q-coral)",
                    color: "#fff", fontSize: 11, borderColor: "var(--q-ink)",
                  }}
                >
                  {q.isCorrect ? t("correctBadge") : t("wrongBadge")}
                </span>
                <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, color: "var(--q-ink-3)" }}>Q{qi + 1}</span>
                {q.type === "MULTIPLE" && <span className="q-chip" style={{ fontSize: 10, background: "var(--q-bg)" }}>{t("multiple")}</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, fontFamily: "var(--q-sans)" }}>{q.text}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {q.answerOptions.map((opt) => (
                  <span
                    key={opt.id}
                    className="q-chip"
                    style={{
                      background: opt.isCorrect && opt.isSelected ? "var(--q-green-soft)"
                        : opt.isCorrect ? "var(--q-green-soft)"
                        : opt.isSelected ? "var(--q-bg)"
                        : "transparent",
                      borderColor: opt.isCorrect ? "var(--q-green)" : opt.isSelected ? "var(--q-coral)" : "var(--q-line-2)",
                      textDecoration: opt.isSelected && !opt.isCorrect ? "line-through" : "none",
                      fontSize: 12,
                    }}
                  >
                    {opt.text}
                    {opt.isCorrect ? " ✓" : ""}
                    {opt.isSelected && !opt.isCorrect ? " ✗" : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--q-line-2)", display: "flex", justifyContent: "center" }}>
          <button className="q-btn" onClick={() => window.location.href = "/"}>{t("done")}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>{t("loading")}</div>
    </div>
  );
}
