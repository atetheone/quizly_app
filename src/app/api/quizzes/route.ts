import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quizCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { teacherId: session.user.id },
      include: {
        _count: { select: { questions: true } },
        sessions: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(
      quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        timeLimit: q.timeLimit,
        questionCount: q._count.questions,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        isLocked: q.sessions.some((s) => s.status === "ACTIVE" || s.status === "ENDED"),
      }))
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = quizCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, timeLimit, questions } = result.data;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        timeLimit,
        teacherId: session.user.id,
        questions: {
          create: questions.map((q) => ({
            text: q.text,
            type: q.type,
            order: q.order,
            answerOptions: {
              create: q.answerOptions.map((a) => ({
                text: a.text,
                isCorrect: a.isCorrect,
              })),
            },
          })),
        },
      },
      include: {
        questions: { include: { answerOptions: true } },
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}