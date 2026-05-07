"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { QLogo } from "@/components/q-ui";

export default function JoinWithCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const [name, setName] = useState("");
  const [quizTitle, setQuizTitle] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${code}`).then((r) => r.json()).then((d) => {
      if (!d.error) setQuizTitle(d.quizTitle);
    });
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const joinRes = await fetch(`/api/sessions/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const joinData = await joinRes.json();
    if (joinRes.ok) {
      sessionStorage.setItem("studentId", joinData.studentId);
      sessionStorage.setItem("studentName", joinData.name);
      sessionStorage.setItem("sessionCode", joinData.sessionCode);
      router.push(`/play/${code}`);
    } else {
      setError(joinData.error || "Failed to join");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--q-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 28, padding: 8 }}>
        <QLogo size={26} />

        <div>
          <span className="q-eyebrow">Join quiz</span>
          <div
            style={{
              fontFamily: "var(--q-display)", fontWeight: 700, fontSize: 64,
              letterSpacing: "0.06em", lineHeight: 1, marginTop: 8,
            }}
          >
            <span style={{ background: "var(--q-yellow)", padding: "0 10px", borderRadius: 10, border: "1.5px solid var(--q-line)" }}>
              {code}
            </span>
          </div>
          {quizTitle && (
            <p style={{ fontSize: 16, color: "var(--q-ink-2)", margin: "10px 0 0", fontFamily: "var(--q-sans)", fontWeight: 500 }}>
              {quizTitle}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow">Your name</span>
            <input
              className="q-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              required
              autoFocus
              style={{ fontSize: 17, padding: "14px 16px" }}
            />
          </div>

          {error && (
            <div style={{ background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)", borderRadius: "var(--q-r-sm)", padding: "10px 14px", fontSize: 14, fontFamily: "var(--q-sans)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="q-btn q-btn-primary q-btn-lg" disabled={loading || !name.trim()} style={{ width: "100%" }}>
            {loading ? "Joining…" : `Join ${quizTitle ?? "quiz"} →`}
          </button>
        </form>
      </div>
    </div>
  );
}
