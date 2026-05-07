import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/utils-quiz";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await request.json();
    if (!quizId) {
      return NextResponse.json({ error: "Quiz ID required" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz || quiz.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let code = generateRoomCode();
    let exists = await prisma.sessionRoom.findUnique({ where: { code } });
    while (exists) {
      code = generateRoomCode();
      exists = await prisma.sessionRoom.findUnique({ where: { code } });
    }

    const sessionRoom = await prisma.sessionRoom.create({
      data: {
        code,
        quizId: quiz.id,
        teacherId: session.user.id,
        status: "LOBBY",
      },
    });

    return NextResponse.json(sessionRoom, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}