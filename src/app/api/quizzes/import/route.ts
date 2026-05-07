import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quizImportSchema } from "@/lib/validations";
import { parseQuizText } from "@/lib/utils-quiz";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = quizImportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, timeLimit, rawText } = result.data;
    const parsed = parseQuizText(rawText);

    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse quiz text. Check format." },
        { status: 400 }
      );
    }

    if (parsed.questions.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 questions allowed" },
        { status: 400 }
      );
    }

    for (const q of parsed.questions) {
      if (q.answerOptions.length < 2 || q.answerOptions.length > 6) {
        return NextResponse.json(
          { error: `Question "${q.text}" must have 2-6 answer options` },
          { status: 400 }
        );
      }
      if (!q.answerOptions.some((a) => a.isCorrect)) {
        return NextResponse.json(
          { error: `Question "${q.text}" must have at least 1 correct answer` },
          { status: 400 }
        );
      }
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        timeLimit,
        teacherId: session.user.id,
        questions: {
          create: parsed.questions.map((q) => ({
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