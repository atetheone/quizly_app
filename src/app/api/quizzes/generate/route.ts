import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { quizGenerateSchema } from "@/lib/validations";
import { parseQuizText } from "@/lib/utils-quiz";
import {
  generateQuizText,
  QuizGenerationError,
} from "@/lib/quiz-generator";

const MAX_ATTEMPTS = 3; // initial try + 2 retries on self-check failure

/**
 * Generates quiz text from a topic + difficulty and returns it for the
 * teacher to review/edit. Does NOT persist — the existing
 * /api/quizzes/import route handles parsing + persistence after review.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = quizGenerateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let lastReason = "";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const rawText = await generateQuizText(result.data);

      // Self-check: only valid text (parseable, 2-6 options, >=1 correct,
      // <=20 questions) reaches the client — same guards as the import route.
      const parsed = parseQuizText(rawText);
      if (!parsed) {
        lastReason = "format";
        continue;
      }
      if (parsed.questions.length > 20) {
        lastReason = "too many questions";
        continue;
      }
      const badOptions = parsed.questions.some(
        (q) => q.answerOptions.length < 2 || q.answerOptions.length > 6
      );
      const missingCorrect = parsed.questions.some(
        (q) => !q.answerOptions.some((a) => a.isCorrect)
      );
      if (badOptions || missingCorrect) {
        lastReason = badOptions ? "option count" : "missing correct answer";
        continue;
      }

      return NextResponse.json(
        { rawText, parsedCount: parsed.questions.length },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: `AI could not produce a valid quiz (${lastReason}). Try again or rephrase the topic.`,
      },
      { status: 502 }
    );
  } catch (err) {
    if (err instanceof QuizGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
