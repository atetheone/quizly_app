import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const original = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { answerOptions: { orderBy: { id: "asc" } } },
        },
      },
    });

    if (!original || original.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const copy = await prisma.quiz.create({
      data: {
        title: `Copy of ${original.title}`,
        timeLimit: original.timeLimit,
        teacherId: session.user.id,
        questions: {
          create: original.questions.map((q) => ({
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
      include: { questions: { include: { answerOptions: true } } },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
