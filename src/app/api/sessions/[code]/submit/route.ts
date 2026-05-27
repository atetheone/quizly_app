import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher, PUSHER_CHANNELS, PUSHER_EVENTS } from "@/lib/pusher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { studentId, answers } = await request.json();

    if (!studentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.status === "LOBBY") {
      return NextResponse.json({ error: "Quiz has not started" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student || student.sessionId !== sessionRoom.id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.submittedAt) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    const answerRecords = answers.map((a: { questionId: string; answerOptionId: string }) => ({
      studentId: student.id,
      questionId: a.questionId,
      answerOptionId: a.answerOptionId,
    }));

    await prisma.studentAnswer.createMany({ data: answerRecords });

    await prisma.student.update({
      where: { id: student.id },
      data: { submittedAt: new Date() },
    });

    try {
      await pusher.trigger(
        PUSHER_CHANNELS.teacher(code),
        PUSHER_EVENTS.STUDENT_SUBMITTED,
        { studentId: student.id, name: student.name }
      );
    } catch (pusherErr) {
      console.error("Pusher trigger failed (non-fatal):", pusherErr);
    }

    // Party mode: auto-end when all players submit or timer grace period has passed
    if (sessionRoom.mode === "PARTY" && sessionRoom.status === "ACTIVE") {
      const now = new Date();
      const timerExpired =
        sessionRoom.forcedEndAt !== null && now >= sessionRoom.forcedEndAt;

      let shouldEnd = timerExpired;
      if (!shouldEnd) {
        const [total, submitted] = await Promise.all([
          prisma.student.count({ where: { sessionId: sessionRoom.id } }),
          prisma.student.count({
            where: { sessionId: sessionRoom.id, submittedAt: { not: null } },
          }),
        ]);
        shouldEnd = submitted >= total;
      }

      if (shouldEnd) {
        await prisma.sessionRoom.update({
          where: { code },
          data: { status: "ENDED", endedAt: now },
        });
        try {
          await pusher.trigger(PUSHER_CHANNELS.room(code), PUSHER_EVENTS.QUIZ_ENDED, {});
        } catch (pusherErr) {
          console.error("Pusher trigger failed (non-fatal):", pusherErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Submit answer failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}