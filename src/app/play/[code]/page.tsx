"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Pusher from "pusher-js";
import { isPusherConfigured } from "@/lib/use-pusher";

type AnswerOption = { id: string; text: string };
type Question = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE";
  order: number;
  answerOptions: AnswerOption[];
};

type Phase = "lobby" | "countdown" | "active" | "waiting" | "results";

export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;
  const [phase, setPhase] = useState<Phase>("lobby");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{ quizTitle: string; timeLimit: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [countdown, setCountdown] = useState(3);
  const [results, setResults] = useState<{
    score: number;
    total: number;
    percentage: number;
    questions: {
      id: string;
      text: string;
      type: string;
      isCorrect: boolean;
      answerOptions: { id: string; text: string; isCorrect: boolean; isSelected: boolean }[];
    }[];
  } | null>(null);
  const [students, setStudents] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sid = sessionStorage.getItem("studentId");
    const sname = sessionStorage.getItem("studentName");
    if (!sid || !sname) {
      window.location.href = `/join/${code}`;
      return;
    }
    setStudentId(sid);
    setStudentName(sname);

    fetch(`/api/sessions/${code}`).then((r) => r.json()).then((data) => {
      if (data.error) return;
      setSessionInfo({ quizTitle: data.quizTitle, timeLimit: data.timeLimit });
      if (data.status === "ACTIVE") {
        fetchQuiz();
      }
    });
  }, [code]);

  useEffect(() => {
    if (!isPusherConfigured) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`room-${code}`);

    channel.bind("student-joined", (data: { name: string }) => {
      setStudents((prev) => [...prev, data.name]);
    });

    channel.bind("quiz-started", () => {
      setCountdown(3);
      setPhase("countdown");
      let c = 3;
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) {
          clearInterval(interval);
          setPhase("active");
          fetchQuiz();
          startTimer();
        }
      }, 1000);
    });

    channel.bind("quiz-ended", () => {
      if (submitted) {
        fetchResults();
      } else {
        handleSubmit();
      }
      setPhase("results");
    });

    return () => {
      pusher.unsubscribe(`room-${code}`);
      pusher.disconnect();
    };
  }, [code, submitted]);

  async function fetchQuiz() {
    const res = await fetch(`/api/sessions/${code}/quiz`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions);
      const endTime = new Date(data.startedAt).getTime() + data.timeLimit * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!submitted) handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleAnswer(questionId: string, optionId: string, type: "SINGLE" | "MULTIPLE") {
    setAnswers((prev) => {
      if (type === "SINGLE") {
        return { ...prev, [questionId]: [optionId] };
      }
      const current = prev[questionId] || [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    setPhase("waiting");

    const payload = Object.entries(answers).flatMap(([questionId, optionIds]) =>
      optionIds.map((answerOptionId) => ({ questionId, answerOptionId }))
    );

    await fetch(`/api/sessions/${code}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, answers: payload }),
    });
  }, [answers, code, studentId, submitted]);

  async function fetchResults() {
    const res = await fetch(`/api/sessions/${code}/student-results?studentId=${studentId}`);
    if (res.ok) {
      const data = await res.json();
      setResults(data);
      setPhase("results");
    }
  }

  if (phase === "lobby") {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{sessionInfo?.quizTitle || "Waiting for teacher..."}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">You&apos;re in the lobby. Wait for the teacher to start the quiz.</p>
            <div className="text-lg font-medium">Welcome, {studentName}!</div>
            {students.length > 0 && (
              <div className="text-sm text-muted-foreground">{students.length} other student(s) in the lobby</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-9xl font-bold animate-pulse">{countdown > 0 ? countdown : "Go!"}</div>
        </div>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Submitted!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Waiting for the quiz to end. Results will appear here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "results" && results) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Your Results</h1>
          <div className="text-5xl font-bold mt-4">
            {results.percentage}%
          </div>
          <p className="text-muted-foreground mt-2">
            {results.score} out of {results.total} correct
          </p>
        </div>
        <div className="space-y-4">
          {results.questions.map((q, qi) => (
            <Card key={q.id} className={q.isCorrect ? "border-green-500" : "border-red-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {qi + 1}. {q.text}
                  <span className={`ml-2 text-sm ${q.isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {q.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {q.answerOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`px-3 py-2 rounded text-sm ${
                        opt.isCorrect && opt.isSelected
                          ? "bg-green-100 text-green-800"
                          : opt.isCorrect
                          ? "bg-green-50 text-green-700"
                          : opt.isSelected
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {opt.text}
                      {opt.isCorrect && " ✓"}
                      {opt.isSelected && !opt.isCorrect && " ✗"}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {timeLeft !== null && (
        <div className="text-center mb-6">
          <div className="text-3xl font-mono font-bold">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </div>
          <p className="text-sm text-muted-foreground">remaining</p>
        </div>
      )}
      <div className="space-y-6">
        {questions.map((q, qi) => (
          <Card key={q.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {qi + 1}. {q.text}
                {q.type === "MULTIPLE" && (
                  <span className="text-sm text-muted-foreground ml-2">(Select all that apply)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.type === "SINGLE" ? (
                <RadioGroup
                  value={answers[q.id]?.[0] || ""}
                  onValueChange={(val) => handleAnswer(q.id, val, "SINGLE")}
                  className="space-y-2"
                >
                  {q.answerOptions.map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                      <Label htmlFor={`${q.id}-${opt.id}`} className="flex-1 cursor-pointer">{opt.text}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {q.answerOptions.map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${q.id}-${opt.id}`}
                        checked={answers[q.id]?.includes(opt.id) || false}
                        onCheckedChange={() => handleAnswer(q.id, opt.id, "MULTIPLE")}
                      />
                      <Label htmlFor={`${q.id}-${opt.id}`} className="flex-1 cursor-pointer">{opt.text}</Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button size="lg" onClick={() => handleSubmit()} disabled={submitted}>
          {submitted ? "Submitted" : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}