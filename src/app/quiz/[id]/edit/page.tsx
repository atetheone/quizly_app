"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type AnswerOption = { id: string; text: string; isCorrect: boolean };
type QuestionData = { id: string; text: string; type: "SINGLE" | "MULTIPLE"; order: number; answerOptions: AnswerOption[] };
type QuizData = { id: string; title: string; timeLimit: number; questions: QuestionData[] };

const OPTION_COLORS = ["var(--q-coral-soft)", "var(--q-yellow-soft)", "var(--q-indigo-soft)", "var(--q-green-soft)", "var(--q-bg-3)", "var(--q-yellow-soft)"];
const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function EditQuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("editor");
  const id = params.id as string;
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeQ, setActiveQ] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status !== "authenticated") return;
    fetch(`/api/quizzes/${id}`).then((r) => r.json()).then((data: QuizData) => {
      setTitle(data.title); setTimeLimit(data.timeLimit); setQuestions(data.questions); setLoading(false);
    });
  }, [id, status, router]);

  function updateQuestionType(index: number, type: "SINGLE" | "MULTIPLE") {
    setQuestions((prev) => prev.map((q, i) => i !== index ? q : { ...q, type, answerOptions: q.answerOptions.map((o) => ({ ...o, isCorrect: false })) }));
  }
  function updateOptionText(qIndex: number, oIndex: number, text: string) {
    setQuestions((prev) => prev.map((q, i) => i !== qIndex ? q : { ...q, answerOptions: q.answerOptions.map((o, j) => j === oIndex ? { ...o, text } : o) }));
  }
  function toggleCorrect(qIndex: number, oIndex: number) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qIndex) return q;
      if (q.type === "SINGLE") return { ...q, answerOptions: q.answerOptions.map((o, j) => ({ ...o, isCorrect: j === oIndex })) };
      return { ...q, answerOptions: q.answerOptions.map((o, j) => j === oIndex ? { ...o, isCorrect: !o.isCorrect } : o) };
    }));
  }
  function addOption(qIndex: number) {
    if (questions[qIndex].answerOptions.length >= 6) return;
    setQuestions((prev) => prev.map((q, i) => i !== qIndex ? q : { ...q, answerOptions: [...q.answerOptions, { id: `new-${Date.now()}`, text: "", isCorrect: false }] }));
  }
  function removeOption(qIndex: number, oIndex: number) {
    if (questions[qIndex].answerOptions.length <= 2) return;
    setQuestions((prev) => prev.map((q, i) => i !== qIndex ? q : { ...q, answerOptions: q.answerOptions.filter((_, j) => j !== oIndex) }));
  }
  function addQuestion() {
    if (questions.length >= 20) return;
    const ts = Date.now();
    setQuestions((prev) => [...prev, { id: `new-${ts}`, text: "", type: "SINGLE", order: prev.length + 1, answerOptions: [{ id: `opt-${ts}-1`, text: "", isCorrect: false }, { id: `opt-${ts}-2`, text: "", isCorrect: false }] }]);
    setActiveQ(questions.length);
  }
  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setActiveQ((prev) => Math.min(prev, questions.length - 2));
  }

  async function handleSubmit() {
    setSaving(true);
    const payload = { title, timeLimit, questions: questions.map((q, i) => ({ text: q.text, type: q.type, order: i + 1, answerOptions: q.answerOptions.map((a) => ({ text: a.text, isCorrect: a.isCorrect })) })) };
    const res = await fetch(`/api/quizzes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) { toast.success(t("quizUpdated")); router.push("/dashboard"); }
    else { const d = await res.json(); toast.error(d.error || t("updateFailed")); setSaving(false); }
  }

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--q-bg)" }}><div style={{ fontFamily: "var(--q-display)", fontSize: 24, color: "var(--q-ink-3)" }}>{t("loading")}</div></div>;
  }

  const q = questions[activeQ];
  if (!q) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--q-bg)", overflow: "hidden" }}>
      {/* topbar */}
      <div className="q-editor-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--q-line-2)" }}>
        <div className="q-editor-topbar-title-wrap" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard" className="q-btn q-btn-ghost q-btn-sm">← {t("backToDashboard")}</Link>
          <input
            className="q-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: 280, fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 16, border: "none", background: "transparent", outline: "none", padding: "4px 0" }}
          />
          <span className="q-chip q-chip-green" style={{ fontSize: 11 }}>{t("badgeEditing")}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="q-eyebrow">{t("timeLimitLabel")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="number" min={1} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} style={{ width: 52, border: "1.5px solid var(--q-line)", borderRadius: 6, padding: "3px 6px", fontFamily: "var(--q-mono)", fontSize: 13, background: "var(--q-bg)" }} />
              <span style={{ fontSize: 12, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("timeLimitUnit")}</span>
            </div>
          </div>
          <button className="q-btn q-btn-primary q-btn-sm" onClick={handleSubmit} disabled={saving}>{saving ? t("saving") : t("saveChanges")}</button>
        </div>
      </div>

      <div className="q-editor-layout" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* rail */}
        <div className="q-editor-rail" style={{ width: 280, borderRight: "1px solid var(--q-line-2)", background: "var(--q-bg-2)", display: "flex", flexDirection: "column", padding: 16, gap: 10, overflow: "auto", flexShrink: 0 }}>
          <span className="q-eyebrow">{t("questionsCount", { count: questions.length, max: 20 })}</span>
          {questions.map((q, i) => (
            <div key={q.id} className="q-editor-rail-item" onClick={() => setActiveQ(i)} style={{ display: "flex", gap: 8, padding: 12, borderRadius: 10, cursor: "pointer", background: i === activeQ ? "var(--q-ink)" : "var(--q-bg)", color: i === activeQ ? "var(--q-bg)" : "var(--q-ink)", border: "1.5px solid " + (i === activeQ ? "var(--q-line)" : "var(--q-line-2)"), alignItems: "flex-start" }}>
              <span style={{ opacity: 0.5, fontSize: 12, marginTop: 2 }}>≡</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "var(--q-mono)", fontSize: 11, opacity: 0.7 }}>Q{i + 1}</span>
                  <span className="q-chip" style={{ fontSize: 10, padding: "1px 8px", background: "transparent", borderColor: i === activeQ ? "rgba(255,255,255,0.3)" : "var(--q-line-2)", color: i === activeQ ? "var(--q-bg)" : "var(--q-ink-3)" }}>{t(q.type === "SINGLE" ? "typeSingle" : "typeMultiple")}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.text || t("untitled")}</div>
              </div>
              {questions.length > 1 && <button onClick={(e) => { e.stopPropagation(); removeQuestion(i); }} style={{ background: "none", border: "none", cursor: "pointer", color: i === activeQ ? "rgba(255,255,255,0.5)" : "var(--q-ink-4)", fontSize: 14, padding: "0 2px" }}>×</button>}
            </div>
          ))}
          {questions.length < 20 && <button className="q-btn q-btn-sm" style={{ alignSelf: "stretch", justifyContent: "center" }} onClick={addQuestion}>{t("addQuestion")}</button>}
        </div>

        {/* editor */}
        <div className="q-editor-main" style={{ flex: 1, padding: 36, overflow: "auto", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="q-eyebrow">{t("questionCountLabel", { current: activeQ + 1, total: questions.length })}</span>
              <div style={{ fontFamily: "var(--q-display)", fontWeight: 600, fontSize: 28, letterSpacing: "-0.02em", marginTop: 4 }}>{t("editingLabel")}</div>
            </div>
            <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--q-bg-2)", border: "1.5px solid var(--q-line)", borderRadius: 999 }}>
              {(["SINGLE", "MULTIPLE"] as const).map((type) => (
                <button key={type} className="q-btn q-btn-sm" style={{ background: q.type === type ? "var(--q-ink)" : "transparent", color: q.type === type ? "var(--q-bg)" : "var(--q-ink-2)", border: "none", boxShadow: "none" }} onClick={() => updateQuestionType(activeQ, type)}>
                  {type === "SINGLE" ? t("singleAnswer") : t("multipleAnswers")}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow">{t("questionLabel")}</span>
            <textarea className="q-input" value={q.text} onChange={(e) => setQuestions((prev) => prev.map((qq, i) => i === activeQ ? { ...qq, text: e.target.value } : qq))} placeholder={t("questionPlaceholder")} rows={2} style={{ fontSize: 22, fontFamily: "var(--q-display)", fontWeight: 600, resize: "vertical", letterSpacing: "-0.01em" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="q-eyebrow">{t("answerOptionsCount", { count: q.answerOptions.length, max: 6 })}</span>
              <span style={{ fontSize: 13, color: "var(--q-ink-3)", fontFamily: "var(--q-sans)" }}>{t("markCorrectHint")}</span>
            </div>
            {q.answerOptions.map((opt, oi) => (
              <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: OPTION_COLORS[oi] ?? "var(--q-bg-3)", border: "1.5px solid var(--q-line)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 18 }}>
                  {LETTERS[oi]}
                </div>
                <input className="q-input" style={{ flex: 1, fontSize: 16 }} value={opt.text} onChange={(e) => updateOptionText(activeQ, oi, e.target.value)} placeholder={t("optionPlaceholder", { letter: LETTERS[oi] })} />
                <button className="q-btn q-btn-sm" style={{ background: opt.isCorrect ? "var(--q-green)" : "var(--q-bg)", color: opt.isCorrect ? "#fff" : "var(--q-ink)", borderColor: opt.isCorrect ? "var(--q-ink)" : "var(--q-line-2)", minWidth: 120 }} onClick={() => toggleCorrect(activeQ, oi)}>
                  {opt.isCorrect ? t("correctLabel") : t("markCorrectLabel")}
                </button>
                {q.answerOptions.length > 2 && <button onClick={() => removeOption(activeQ, oi)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--q-ink-4)", fontSize: 18, padding: "0 4px" }}>×</button>}
              </div>
            ))}
            {q.answerOptions.length < 6 && <button className="q-btn q-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => addOption(activeQ)}>{t("addOption")}</button>}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "auto" }}>
            <button className="q-btn q-btn-sm" disabled={activeQ === 0} onClick={() => setActiveQ((p) => p - 1)}>← {t("previous")}</button>
            {activeQ < questions.length - 1
              ? <button className="q-btn q-btn-primary q-btn-sm" onClick={() => setActiveQ((p) => p + 1)}>{t("nextQuestion")} →</button>
              : <button className="q-btn q-btn-primary q-btn-sm" onClick={handleSubmit} disabled={saving}>{saving ? t("saving") : t("saveQuiz")}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
