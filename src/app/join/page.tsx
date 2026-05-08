"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QLogo } from "@/components/q-ui";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const roomCode = code.toUpperCase().trim();
    const roomRes = await fetch(`/api/sessions/${roomCode}`);
    const roomData = await roomRes.json();
    if (roomData.error) { setError(roomData.error); setLoading(false); return; }
    if (roomData.status !== "LOBBY") { setError("This room is not accepting new students"); setLoading(false); return; }
    const joinRes = await fetch(`/api/sessions/${roomCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const joinData = await joinRes.json();
    if (joinRes.ok) {
      sessionStorage.setItem("studentId", joinData.studentId);
      sessionStorage.setItem("studentName", joinData.name);
      sessionStorage.setItem("sessionCode", joinData.sessionCode);
      router.push(`/play/${roomCode}`);
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
          <span className="q-eyebrow">Step 1 of 2</span>
          <h1 style={{ fontFamily: "var(--q-display)", fontWeight: 700, fontSize: "clamp(26px, 8vw, 40px)", letterSpacing: "-0.025em", lineHeight: 1.05, margin: "8px 0 0" }}>
            What&apos;s the<br />code?
          </h1>
          <p style={{ fontSize: 15, color: "var(--q-ink-2)", margin: "8px 0 0", lineHeight: 1.5, fontFamily: "var(--q-sans)" }}>
            Your teacher will project it on the board.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <input
            className="q-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="A3F7K2"
            maxLength={6}
            required
            style={{ fontFamily: "var(--q-mono)", fontSize: "clamp(20px, 7vw, 32px)", letterSpacing: "0.15em", textAlign: "center", textTransform: "uppercase", padding: "16px 14px" }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="q-eyebrow">Your name</span>
            <input
              className="q-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={50}
              required
              style={{ fontSize: 17, padding: "14px 16px" }}
            />
          </div>

          {error && (
            <div style={{ background: "var(--q-coral-soft)", border: "1.5px solid var(--q-coral)", borderRadius: "var(--q-r-sm)", padding: "10px 14px", fontSize: 14, fontFamily: "var(--q-sans)" }}>
              {error}
            </div>
          )}

          <button type="submit" className="q-btn q-btn-primary q-btn-lg" disabled={loading || code.length !== 6 || !name.trim()} style={{ width: "100%" }}>
            {loading ? "Joining…" : "Join quiz →"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
            <span className="q-eyebrow">or</span>
            <div style={{ flex: 1, height: 1, background: "var(--q-line-2)" }} />
          </div>
          <button type="button" className="q-btn" style={{ width: "100%" }}>📷 Scan QR code</button>
        </form>
      </div>
    </div>
  );
}
