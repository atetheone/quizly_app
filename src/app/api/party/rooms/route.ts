import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, parseQuizText } from "@/lib/utils-quiz";
import { generateQuizText, QuizGenerationError } from "@/lib/quiz-generator";
import { partyCreateSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = partyCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { hostName, timeLimit, ...genInput } = result.data;

    // Generate quiz with up to 3 attempts
    let rawText = "";
    let parsed: ReturnType<typeof parseQuizText> = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      rawText = await generateQuizText(genInput);
      parsed = parseQuizText(rawText);
      if (parsed && parsed.questions.length > 0) break;
      if (attempt === 3) {
        return NextResponse.json({ error: "errors.genInvalidQuiz" }, { status: 502 });
      }
    }

    if (!parsed || parsed.questions.length === 0) {
      return NextResponse.json({ error: "errors.genInvalidQuiz" }, { status: 502 });
    }

    // Generate unique room code
    let code = generateRoomCode();
    while (await prisma.sessionRoom.findUnique({ where: { code } })) {
      code = generateRoomCode();
    }

    const topic = genInput.topic;
    const quizTitle = topic.length > 60 ? topic.slice(0, 60) + "…" : topic;
    const hostToken = randomUUID();

    const sessionRoom = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: quizTitle,
          timeLimit,
          questions: {
            create: parsed!.questions.map((q) => ({
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
      });

      return tx.sessionRoom.create({
        data: {
          code,
          quizId: quiz.id,
          mode: "PARTY",
          hostToken,
          hostName,
          questionsReady: true,
          partyConfig: {
            topic: genInput.topic,
            count: genInput.count,
            language: genInput.language,
            spread: genInput.spread,
            timeLimit,
          },
          status: "LOBBY",
        },
      });
    });

    return NextResponse.json(
      { code: sessionRoom.code, hostToken, quizTitle },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof QuizGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Create party room failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
