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
    const sessionRoom = await prisma.sessionRoom.findUnique({ where: { code } });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    if (sessionRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (sessionRoom.status !== "ENDED") {
      return NextResponse.json({ error: "Quiz not yet ended" }, { status: 400 });
    }

    const totalStudents = await prisma.student.count({ where: { sessionId: sessionRoom.id } });

    const quiz = await prisma.quiz.findUnique({
      where: { id: sessionRoom.quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { answerOptions: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // For each answer option, count how many students selected it
    const selectionCounts = await prisma.studentAnswer.groupBy({
      by: ["answerOptionId"],
      where: { student: { sessionId: sessionRoom.id } },
      _count: { answerOptionId: true },
    });
    const countByOption = new Map(
      selectionCounts.map((r) => [r.answerOptionId, r._count.answerOptionId])
    );

    // Count correct submissions per question
    const questionBreakdowns = quiz.questions.map((q) => {
      const correctOptionIds = q.answerOptions.filter((o) => o.isCorrect).map((o) => o.id);

      // A student answered correctly if all and only correct options were selected.
      // We approximate this via: students who selected ALL correct options minus those
      // who also selected any incorrect option. For simplicity we surface per-option
      // counts and compute a correctRate from it server-side.
      //
      // For SINGLE questions: correctRate = selections of the correct option / totalStudents
      // For MULTIPLE questions: use the minimum selection count across correct options
      // as a lower bound (all-or-nothing grading means partial selectors score 0).
      const options = q.answerOptions.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        selectionCount: countByOption.get(o.id) ?? 0,
        selectionPct:
          totalStudents > 0
            ? Math.round(((countByOption.get(o.id) ?? 0) / totalStudents) * 100)
            : 0,
      }));

      const correctSelections =
        correctOptionIds.length === 0
          ? 0
          : Math.min(...correctOptionIds.map((id) => countByOption.get(id) ?? 0));
      const correctRate =
        totalStudents > 0 ? Math.round((correctSelections / totalStudents) * 100) : 0;

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        order: q.order,
        correctRate,
        options,
      };
    });

    // Sort hardest first (lowest correctRate)
    questionBreakdowns.sort((a, b) => a.correctRate - b.correctRate);

    return NextResponse.json({ totalStudents, questions: questionBreakdowns });
  } catch (err) {
    console.error("Breakdown failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
