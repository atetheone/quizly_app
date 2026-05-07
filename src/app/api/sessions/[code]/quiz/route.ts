import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                answerOptions: {
                  orderBy: { id: "asc" },
                  select: { id: true, text: true },
                },
              },
            },
          },
        },
      },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.status !== "ACTIVE") {
      return NextResponse.json({ error: "Quiz not active" }, { status: 400 });
    }

    return NextResponse.json({
      timeLimit: sessionRoom.quiz.timeLimit,
      startedAt: sessionRoom.startedAt,
      questions: sessionRoom.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        order: q.order,
        answerOptions: q.answerOptions,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}