"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

    if (roomData.error) {
      setError(roomData.error);
      setLoading(false);
      return;
    }

    if (roomData.status !== "LOBBY") {
      setError("This room is not accepting new students");
      setLoading(false);
      return;
    }

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
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join a Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Room Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., A3F7K2"
                required
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                maxLength={50}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join Quiz"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}