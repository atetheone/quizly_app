import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const students = await prisma.student.findMany({
      where: { sessionId: sessionRoom.id },
      select: {
        id: true,
        name: true,
        joinedAt: true,
        submittedAt: true,
        _count: { select: { answers: true } },
      },
    });

    const totalQuestions = await prisma.question.count({
      where: { quizId: sessionRoom.quizId },
    });

    return NextResponse.json(
      students.map((s) => ({
        id: s.id,
        name: s.name,
        joinedAt: s.joinedAt,
        submittedAt: s.submittedAt,
        questionsAnswered: s._count.answers / (totalQuestions || 1),
        totalQuestions,
        hasSubmitted: s.submittedAt !== null,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}