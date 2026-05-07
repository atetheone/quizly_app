"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JoinWithCodePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Room Code:</p>
              <p className="text-3xl font-mono font-bold tracking-widest">{code}</p>
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" required maxLength={50} />
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