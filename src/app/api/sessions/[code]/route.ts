import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
      include: { quiz: { select: { title: true, timeLimit: true } } },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      code: sessionRoom.code,
      status: sessionRoom.status,
      quizTitle: sessionRoom.quiz.title,
      timeLimit: sessionRoom.quiz.timeLimit,
      mode: sessionRoom.mode,
      hostName: sessionRoom.hostName ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}