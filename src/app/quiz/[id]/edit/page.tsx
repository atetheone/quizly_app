"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type AnswerOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type QuestionData = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE";
  order: number;
  answerOptions: AnswerOption[];
};

type QuizData = {
  id: string;
  title: string;
  timeLimit: number;
  questions: QuestionData[];
};

export default function EditQuizPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(15);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
    if (status !== "authenticated") return;

    fetch(`/api/quizzes/${id}`)
      .then((res) => res.json())
      .then((data: QuizData) => {
        setTitle(data.title);
        setTimeLimit(data.timeLimit);
        setQuestions(data.questions);
        setLoading(false);
      });
  }, [id, status, router]);

  function updateQuestionType(index: number, type: "SINGLE" | "MULTIPLE") {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        const resetOptions = q.answerOptions.map((o) => ({ ...o, isCorrect: false }));
        return { ...q, type, answerOptions: resetOptions };
      })
    );
  }

  function updateOptionText(qIndex: number, oIndex: number, text: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              answerOptions: q.answerOptions.map((o, j) => (j === oIndex ? { ...o, text } : o)),
            }
          : q
      )
    );
  }

  function toggleCorrect(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (q.type === "SINGLE") {
          return {
            ...q,
            answerOptions: q.answerOptions.map((o, j) => ({ ...o, isCorrect: j === oIndex })),
          };
        }
        return {
          ...q,
          answerOptions: q.answerOptions.map((o, j) =>
            j === oIndex ? { ...o, isCorrect: !o.isCorrect } : o
          ),
        };
      })
    );
  }

  function addOption(qIndex: number) {
    if (questions[qIndex].answerOptions.length >= 6) return;
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              answerOptions: [
                ...q.answerOptions,
                { id: `new-${Date.now()}`, text: "", isCorrect: false },
              ],
            }
          : q
      )
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    if (questions[qIndex].answerOptions.length <= 2) return;
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, answerOptions: q.answerOptions.filter((_, j) => j !== oIndex) }
          : q
      )
    );
  }

  function addQuestion() {
    if (questions.length >= 20) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        text: "",
        type: "SINGLE",
        order: prev.length + 1,
        answerOptions: [
          { id: `opt-${Date.now()}-1`, text: "", isCorrect: false },
          { id: `opt-${Date.now()}-2`, text: "", isCorrect: false },
        ],
      },
    ]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title,
      timeLimit,
      questions: questions.map((q, i) => ({
        text: q.text,
        type: q.type,
        order: i + 1,
        answerOptions: q.answerOptions.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      })),
    };

    const res = await fetch(`/api/quizzes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Quiz updated!");
      router.push("/dashboard");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update quiz");
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Quiz</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input id="timeLimit" type="number" min={1} max={120} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} required />
            </div>
          </CardContent>
        </Card>

        {questions.map((q, qi) => (
          <Card key={q.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {qi + 1}</CardTitle>
                {questions.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeQuestion(qi)}>
                    Remove
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Input value={q.text} onChange={(e) => setQuestions((prev) => prev.map((qq, i) => i === qi ? { ...qq, text: e.target.value } : qq))} required />
              </div>
              <div className="space-y-2">
                <Label>Answer Type</Label>
                <RadioGroup value={q.type} onValueChange={(v) => updateQuestionType(qi, v as "SINGLE" | "MULTIPLE")} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SINGLE" id={`type-single-${qi}`} />
                    <Label htmlFor={`type-single-${qi}`}>Pick One</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MULTIPLE" id={`type-multiple-${qi}`} />
                    <Label htmlFor={`type-multiple-${qi}`}>Pick Multiple</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Answer Options (mark correct ones)</Label>
                {q.answerOptions.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    {q.type === "SINGLE" ? (
                      <input type="radio" name={`correct-${qi}`} checked={opt.isCorrect} onChange={() => toggleCorrect(qi, oi)} className="h-4 w-4" />
                    ) : (
                      <Checkbox checked={opt.isCorrect} onCheckedChange={() => toggleCorrect(qi, oi)} />
                    )}
                    <Input value={opt.text} onChange={(e) => updateOptionText(qi, oi, e.target.value)} required className="flex-1" />
                    {q.answerOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(qi, oi)}>&times;</Button>
                    )}
                  </div>
                ))}
                {q.answerOptions.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => addOption(qi)}>Add Option</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {questions.length < 20 && (
          <Button type="button" variant="outline" onClick={addQuestion} className="w-full">+ Add Question</Button>
        )}

        <div className="flex justify-end gap-2">
          <Link href="/dashboard"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}