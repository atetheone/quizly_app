"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import QRCode from "qrcode";
import Pusher from "pusher-js";
import { isPusherConfigured } from "@/lib/use-pusher";
import { QAvatar, QLogo } from "@/components/q-ui";
import { toast } from "sonner";
import { useTranslations, useFormatter } from "next-intl";

type Student = {
  id: string;
  name: string;
  hasSubmitted: boolean;
  questionsAnswered: number;
  totalQuestions: number;
};
type SessionInfo = { code: string; status: string; quizTitle: string; timeLimit: number };
type Results = {
  quizTitle: string; totalQuestions: number;
  average: number; highest: number; lowest: number;
  students: { studentId: string; name: string; score: number; total: number; percentage: number; submittedAt: string | null }[];
};

function fmt(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; }

export default function SessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const t = useTranslations("session");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status !== "authenticated") return;
    fetch(`/api/sessions/${code}`).then((r) => r.json()).then((data) => {
      if (data.error) { router.push("/dashboard"); return; }
      setInfo(data);
      generateQR(data.code);
      if (data.status === "ACTIVE") fetchStudents();
    });
  }, [code, status, router]);

  useEffect(() => {
    if (!info || info.status === "ENDED" || !isPusherConfigured) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! });
    const ch = pusher.subscribe(`room-${code}`);
    ch.bind("student-joined", (d: { studentId: string; name: string }) => {
      setStudents((prev) => prev.some((s) => s.id === d.studentId) ? prev : [...prev, { id: d.studentId, name: d.name, hasSubmitted: false, questionsAnswered: 0, totalQuestions: 0 }]);
    });
    ch.bind("quiz-started", () => {
      setInfo((prev) => prev ? { ...prev, status: "ACTIVE" } : prev);
      fetchStudents();
      fetch(`/api/sessions/${code}`).then((r) => r.json()).then((d) => {
        if (d.startedAt) startTimer(new Date(d.startedAt).getTime() + d.timeLimit * 60000);
      });
    });
    ch.bind("quiz-ended", () => { setInfo((prev) => prev ? { ...prev, status: "ENDED" } : prev); setTimeLeft(null); });
    const tch = pusher.subscribe(`teacher-${code}`);
    tch.bind("student-submitted", (d: { studentId: string }) => {
      setStudents((prev) => prev.map((s) => s.id === d.studentId ? { ...s, hasSubmitted: true } : s));
    });
    tch.bind("student-progress", (d: { studentId: string; questionsAnswered: number; totalQuestions: number }) => {
      setStudents((prev) => prev.map((s) => s.id === d.studentId ? { ...s, questionsAnswered: d.questionsAnswered, totalQuestions: d.totalQuestions } : s));
    });
    return () => { pusher.unsubscribe(`room-${code}`); pusher.unsubscribe(`teacher-${code}`); pusher.disconnect(); };
  }, [code, info?.status]);

  async function fetchStudents() {
    const r = await fetch(`/api/sessions/${code}/students`);
    if (r.ok) setStudents(await r.json());
  }
  function generateQR(c: string) {
    const url = `${window.location.origin}/join/${c}`;
    QRCode.toDataURL(url, { width: 200 }, (err, url) => { if (!err) setQrCodeUrl(url); });
  }
  function startTimer(endTime: number) {
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(iv);
        fetch(`/api/sessions/${code}/end`, { method: "POST" }).catch(() => {});
      }
    }, 1000);
  }
  async function handleStart() {
    setStarting(true);
    const r = await fetch(`/api/sessions/${code}/start`, { method: "POST" });
    setStarting(false);
    if (r.ok) {
      const d = await r.json();
      setInfo((prev) => prev ? { ...prev, status: "ACTIVE" } : prev);
      startTimer(new Date(d.startedAt).getTime() + (info?.timeLimit ?? 15) * 60000);
      fetchStudents();
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || t("failedToStart"));
    }
  }
  async function handleEnd() {
    setEnding(true);
    const r = await fetch(`/api/sessions/${code}/end`, { method: "POST" });
    setEnding(false);
    if (r.ok) {
      setInfo((prev) => prev ? { ...prev, status: "ENDED" } : prev);
      setTimeLeft(null);
    } else {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error || t("failedToEnd"));
    }
  }

  if (!info) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--q-bg)" }}>
        <div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>{t("loading")}</div>
      </div>
    );
  }

  if (info.status === "LOBBY") return <LobbyView info={info} students={students} qrCodeUrl={qrCodeUrl} code={code} onStart={handleStart} starting={starting} />;
  if (info.status === "ACTIVE") return <LiveView info={info} students={students} timeLeft={timeLeft} code={code} onEnd={handleEnd} ending={ending} />;
  return <ReportView code={code} onBack={() => router.push("/dashboard")} />;
}

function LobbyView({ info, students, qrCodeUrl, code, onStart, starting }: { info: SessionInfo; students: Student[]; qrCodeUrl: string; code: string; onStart: () => void; starting: boolean }) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : `/join/${code}`;
  return (
    <div className="q-lobby-split" style={{ display: "flex", height: "100vh", background: "var(--q-bg)" }}>
      {/* projector half */}
      <div className="q-lobby-projector" style={{ flex: "1.4 1 0", background: "var(--q-ink)", color: "var(--q-bg)", display: "flex", flexDirection: "column", padding: 40, justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 340, height: 340, opacity: 0.12 }} className="q-spike" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--q-yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--q-display)", fontWeight: 800, fontSize: 18, color: "var(--q-ink)" }}>Q</div>
            <span style={{ fontWeight: 600, fontSize: 16, fontFamily: "var(--q-sans)" }}>{info.quizTitle}</span>
            <span className="q-chip q-chip-yellow" style={{ fontSize: 11, color: "var(--q-ink)" }}>{t("badgeLobby")}</span>
          </div>
          <span className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>{t("timeLimitUnit", { minutes: info.timeLimit })}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, position: "relative", textAlign: "center" }}>
          <div className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>
            {t("joinAt")} <span style={{ color: "var(--q-yellow)" }}>quizly.app/join</span>
          </div>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(80px, 14vw, 160px)", lineHeight: 0.9, letterSpacing: "0.04em" }}>
            <span style={{ background: "var(--q-yellow)", color: "var(--q-ink)", padding: "0 14px", borderRadius: 16, border: "3px solid var(--q-yellow)" }}>
              {code}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR" style={{ width: 100, height: 100, borderRadius: 10, border: "2px solid rgba(255,255,255,0.2)" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
              <span className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>{t("orScan")}</span>
              <span style={{ fontFamily: "var(--q-mono)", fontSize: 14 }}>{joinUrl}</span>
              <button
                className="q-btn q-btn-sm q-btn-yellow"
                onClick={() => navigator.clipboard?.writeText(joinUrl)}
                style={{ alignSelf: "flex-start" }}
              >
                📋 {t("copyLink")}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
          <div className="q-bar" style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }}>
            <span className="q-bar-fill" style={{ width: students.length > 0 ? "60%" : "0%", background: "var(--q-yellow)" }} />
          </div>
          <span style={{ fontFamily: "var(--q-mono)", fontSize: 13 }}>{t("studentsHereWaiting", { count: students.length })}</span>
        </div>
      </div>

      {/* roster */}
      <div style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span className="q-eyebrow">{t("inTheLobby")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 28, letterSpacing: "-0.02em", marginTop: 2 }}>
              {tCommon("studentCount", { count: students.length })}
            </div>
          </div>
          <button className="q-btn q-btn-coral q-btn-lg" onClick={onStart} disabled={students.length === 0 || starting}>
            {starting ? t("starting") : `▶ ${t("startQuiz")}`}
          </button>
        </div>

        {students.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👀</div>
              {t("waitingForStudents")}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, overflow: "auto", flex: 1 }}>
            {students.map((s, i) => (
              <div key={s.id} className="q-card" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "none" }}>
                <QAvatar name={s.name} size={32} />
                <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "var(--q-sans)" }}>{s.name}</span>
                <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, marginLeft: "auto", color: "var(--q-ink-3)" }}>{i < 4 ? t("joinedNow") : t("joinedMinAgo")}</span>
              </div>
            ))}
          </div>
        )}

        <div className="q-card" style={{ padding: 12, background: "var(--q-yellow-soft)", borderColor: "var(--q-yellow)" }}>
          <div style={{ fontSize: 14, fontFamily: "var(--q-sans)" }}>
            <b>{t("headsUp")}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveView({ info, students, timeLeft, code, onEnd, ending }: { info: SessionInfo; students: Student[]; timeLeft: number | null; code: string; onEnd: () => void; ending: boolean }) {
  const t = useTranslations("session");
  const total = info.timeLimit * 60;
  const answered = students.reduce((s, st) => s + st.questionsAnswered, 0);
  const maxAnswers = students.length * (students[0]?.totalQuestions || 1);
  const classPct = maxAnswers > 0 ? Math.round((answered / maxAnswers) * 100) : 0;
  const submittedCount = students.filter((s) => s.hasSubmitted).length;
  const activeCount = students.filter((s) => !s.hasSubmitted).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--q-bg)", overflow: "hidden" }}>
      {/* topbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="q-dot q-dot-live" />
            <span className="q-eyebrow" style={{ color: "var(--q-coral)" }}>{t("badgeLive")}</span>
          </div>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22 }}>{info.quizTitle}</div>
          <span style={{ fontFamily: "var(--q-mono)", fontSize: 12, color: "var(--q-ink-3)" }}>
            {t("codeLabel")} <b style={{ color: "var(--q-ink)" }}>{code}</b>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {timeLeft !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="q-eyebrow">{t("timeLeftLabel")}</span>
              <div
                style={{
                  fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 36,
                  background: timeLeft < 60 ? "var(--q-coral)" : "var(--q-yellow)",
                  padding: "2px 14px", borderRadius: 10,
                  border: "1.5px solid var(--q-line)", letterSpacing: "-0.02em",
                }}
              >
                {fmt(timeLeft)}
              </div>
            </div>
          )}
          <button className="q-btn q-btn-coral q-btn-sm" onClick={onEnd} disabled={ending}>
            {ending ? t("ending") : t("endNow")}
          </button>
        </div>
      </div>

      <div className="q-live-split" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* left rail: aggregate */}
        <div className="q-live-rail" style={{ width: 300, borderRight: "1px solid var(--q-line-2)", background: "var(--q-bg-2)", display: "flex", flexDirection: "column", padding: 20, gap: 16, overflow: "auto", flexShrink: 0 }}>
          <div className="q-card" style={{ background: "var(--q-ink)", color: "var(--q-bg)", borderColor: "var(--q-line)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="q-eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>{t("classProgress")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 56 }}>
              {classPct}<span style={{ fontSize: 24, color: "var(--q-yellow)" }}>%</span>
            </div>
            <div className="q-bar" style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }}>
              <span className="q-bar-fill" style={{ width: `${classPct}%`, background: "var(--q-yellow)" }} />
            </div>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "var(--q-sans)" }}>
              {t("answersIn", { answered, max: maxAnswers })}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div className="q-card" style={{ flex: 1, padding: 12, background: "var(--q-green-soft)", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 32 }}>{submittedCount}</div>
              <span className="q-eyebrow">{t("submitted")}</span>
            </div>
            <div className="q-card" style={{ flex: 1, padding: 12, background: "var(--q-yellow)", display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 32 }}>{activeCount}</div>
              <span className="q-eyebrow">{t("inProgress")}</span>
            </div>
          </div>
        </div>

        {/* student grid */}
        <div style={{ flex: 1, padding: 20, overflow: "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 28, letterSpacing: "-0.02em" }}>{t("studentsTitle")}</div>
              <span style={{ fontFamily: "var(--q-mono)", fontSize: 13, color: "var(--q-ink-3)" }}>{t("connectedCount", { count: students.length })}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, overflow: "auto", paddingBottom: 8 }}>
            {[...students].sort((a, b) => b.questionsAnswered - a.questionsAnswered).map((s) => {
              const done = s.hasSubmitted;
              const pct = s.totalQuestions > 0 ? (s.questionsAnswered / s.totalQuestions) * 100 : 0;
              const bar = done ? "var(--q-green)" : "var(--q-indigo)";
              const total = s.totalQuestions || 12;
              return (
                <div key={s.id} className="q-card" style={{ background: done ? "var(--q-green-soft)" : "var(--q-bg)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <QAvatar name={s.name} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 18 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>
                        {done ? t("statusSubmitted") : t("onQuestion", { n: s.questionsAnswered + 1 })}
                      </div>
                    </div>
                    <span className="q-chip" style={{ fontSize: 10, background: "var(--q-bg)" }}>
                      {done ? `✓ ${t("statusDone")}` : t("statusAnswering")}
                    </span>
                  </div>
                  <div className="q-bar q-bar-thin">
                    <span className="q-bar-fill" style={{ width: `${pct}%`, background: bar }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, color: "var(--q-ink-3)" }}>
                      {t("answeredCount", { answered: s.questionsAnswered, total })}
                    </span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {Array.from({ length: total }).map((_, k) => (
                        <span key={k} style={{ width: 8, height: 8, borderRadius: 2, background: k < s.questionsAnswered ? bar : "var(--q-bg-3)" }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type BreakdownQuestion = {
  id: string; text: string; type: string; order: number; correctRate: number;
  options: { id: string; text: string; isCorrect: boolean; selectionCount: number; selectionPct: number }[];
};
type Breakdown = { totalStudents: number; questions: BreakdownQuestion[] };

function ReportView({ code, onBack }: { code: string; onBack: () => void }) {
  const t = useTranslations("session");
  const format = useFormatter();
  const [results, setResults] = useState<Results | null>(null);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [tab, setTab] = useState<"students" | "questions">("students");

  useEffect(() => { fetch(`/api/sessions/${code}/results`).then((r) => r.json()).then(setResults); }, [code]);
  useEffect(() => {
    if (tab === "questions" && !breakdown) {
      fetch(`/api/sessions/${code}/breakdown`).then((r) => r.json()).then(setBreakdown);
    }
  }, [tab, breakdown, code]);

  if (!results) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>{t("loadingResults")}</div>
      </div>
    );
  }

  const sorted = [...results.students].sort((a, b) => b.percentage - a.percentage);
  const top = sorted.filter((s) => s.percentage === results.highest);
  const bottom = sorted.filter((s) => s.percentage === results.lowest);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--q-bg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid var(--q-line-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="q-chip q-chip-green" style={{ fontSize: 11 }}>✓ {t("badgeEnded")}</span>
          <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 22 }}>
            {t("resultsTitle", { title: results.quizTitle })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="q-btn q-btn-sm" onClick={onBack}>{t("backToDashboard")}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* hero stats */}
        <div className="q-report-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div className="q-card" style={{ padding: 20, background: "var(--q-yellow)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow">{t("classAverage")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 64 }}>{results.average}<span style={{ fontSize: 28 }}>%</span></div>
          </div>
          <div className="q-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow" style={{ color: "var(--q-green)" }}>↑ {t("highest")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 52 }}>{results.highest}%</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              {top.map((s) => <QAvatar key={s.studentId} name={s.name} size={24} />)}
              <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{top.map((s) => s.name).join(", ")}</span>
            </div>
          </div>
          <div className="q-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow" style={{ color: "var(--q-coral)" }}>↓ {t("lowest")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 52 }}>{results.lowest}%</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {bottom.slice(0, 2).map((s) => <QAvatar key={s.studentId} name={s.name} size={24} />)}
            </div>
          </div>
          <div className="q-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow">{t("submittedLabel")}</span>
            <div style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 52 }}>
              {results.students.length}/{results.students.length}
            </div>
            <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("participationRate", { pct: 100 })}</span>
          </div>
        </div>

        {/* tab switcher */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1.5px solid var(--q-line-2)", paddingBottom: 0 }}>
          {(["students", "questions"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                padding: "8px 16px", fontFamily: "var(--q-sans)", fontWeight: 600, fontSize: 14,
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === tabKey ? "2.5px solid var(--q-ink)" : "2.5px solid transparent",
                color: tab === tabKey ? "var(--q-ink)" : "var(--q-ink-3)",
                marginBottom: -1.5,
              }}
            >
              {t(tabKey === "students" ? "tabStudents" : "tabQuestions")}
            </button>
          ))}
        </div>

        {/* students tab */}
        {tab === "students" && (
          <div className="q-card q-report-table-wrap" style={{ overflow: "hidden" }}>
            <div className="q-report-table-inner">
            <div style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 2fr 1fr", padding: "12px 16px", background: "var(--q-bg-2)", fontFamily: "var(--q-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--q-ink-3)", borderBottom: "1.5px solid var(--q-line)" }}>
              <div>{t("tableRank")}</div><div>{t("tableStudent")}</div><div>{t("tableScore")}</div><div>{t("tablePercent")}</div><div>{t("tableTime")}</div>
            </div>
            {sorted.map((s, i) => {
              const rank = i === 0 ? 1 : sorted[i].percentage === sorted[i - 1].percentage ? sorted.findIndex(x => x.percentage === s.percentage) + 1 : i + 1;
              const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
              return (
              <div key={s.studentId} style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 2fr 1fr", padding: "12px 16px", borderBottom: "1px solid var(--q-line-2)", alignItems: "center", fontSize: 14 }}>
                <div style={{ fontFamily: "var(--q-mono)", fontSize: 13, color: "var(--q-ink-3)" }}>
                  {medals[rank] ?? rank}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <QAvatar name={s.name} size={28} />
                  <b style={{ fontFamily: "var(--q-sans)" }}>{s.name}</b>
                </div>
                <div style={{ fontFamily: "var(--q-mono)" }}>{s.score}/{s.total}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="q-bar q-bar-thin" style={{ width: 80 }}>
                    <span className="q-bar-fill" style={{ width: `${s.percentage}%`, background: s.percentage >= 75 ? "var(--q-green)" : s.percentage >= 50 ? "var(--q-yellow)" : "var(--q-coral)" }} />
                  </div>
                  <span style={{ fontFamily: "var(--q-mono)", fontSize: 12 }}>{s.percentage}%</span>
                </div>
                <div style={{ fontFamily: "var(--q-mono)", color: "var(--q-ink-3)", fontSize: 12 }}>
                  {s.submittedAt ? format.dateTime(new Date(s.submittedAt), { timeStyle: "short" }) : "—"}
                </div>
              </div>
              );
            })}
            </div>
          </div>
        )}

        {/* questions tab */}
        {tab === "questions" && (
          !breakdown ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("loadingBreakdown")}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {breakdown.questions.map((q, qi) => (
                <div key={q.id} className="q-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, color: "var(--q-ink-3)" }}>Q{qi + 1}</span>
                    <div style={{ flex: 1, fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 16 }}>{q.text}</div>
                    <span
                      className="q-chip"
                      style={{
                        background: q.correctRate >= 75 ? "var(--q-green-soft)" : q.correctRate >= 50 ? "var(--q-yellow-soft)" : "var(--q-coral-soft)",
                        borderColor: q.correctRate >= 75 ? "var(--q-green)" : q.correctRate >= 50 ? "var(--q-yellow)" : "var(--q-coral)",
                        fontSize: 11, fontFamily: "var(--q-mono)", flexShrink: 0,
                      }}
                    >
                      {t("correctRate", { pct: q.correctRate })}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {q.options.map((opt) => (
                      <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, background: opt.isCorrect ? "var(--q-green)" : "var(--q-line-2)", border: "1.5px solid " + (opt.isCorrect ? "var(--q-green)" : "var(--q-line)") }} />
                        <span style={{ fontSize: 13, fontFamily: "var(--q-sans)", flex: 1 }}>{opt.text}</span>
                        <div style={{ width: 120, display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="q-bar q-bar-thin" style={{ flex: 1 }}>
                            <span className="q-bar-fill" style={{ width: `${opt.selectionPct}%`, background: opt.isCorrect ? "var(--q-green)" : "var(--q-coral-soft)" }} />
                          </div>
                          <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, color: "var(--q-ink-3)", width: 32, textAlign: "right" }}>{opt.selectionPct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
