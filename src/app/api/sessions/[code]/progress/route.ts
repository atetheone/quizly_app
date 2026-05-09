import { NextRequest, NextResponse } from "next/server";
import { pusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { studentId, questionsAnswered, totalQuestions } = await request.json();

    if (!studentId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    try {
      await pusher.trigger(
        PUSHER_CHANNELS.teacher(code),
        PUSHER_EVENTS.STUDENT_PROGRESS,
        { studentId, questionsAnswered, totalQuestions }
      );
    } catch (pusherErr) {
      console.error("Pusher trigger failed (non-fatal):", pusherErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Progress update failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
