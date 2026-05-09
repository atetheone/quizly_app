import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gradeQuiz } from "@/lib/grading";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const studentId = _request.nextUrl.searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.status !== "ENDED") {
      return NextResponse.json({ error: "Quiz not yet ended" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { answers: true },
    });

    if (!student || student.sessionId !== sessionRoom.id) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: sessionRoom.quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: { answerOptions: true },
        },
      },
    });

    const grading = gradeQuiz(quiz!.questions, quiz!.questions.flatMap((q) => q.answerOptions), student.answers);

    const questionResults = quiz!.questions.map((q) => {
      const correctOptionIds = q.answerOptions
        .filter((a) => a.isCorrect)
        .map((a) => a.id);
      const selectedOptionIds = student.answers
        .filter((a) => a.questionId === q.id)
        .map((a) => a.answerOptionId);
      const result = grading.results.find((r) => r.questionId === q.id);

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        answerOptions: q.answerOptions.map((a) => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect,
          isSelected: selectedOptionIds.includes(a.id),
        })),
        isCorrect: result?.isCorrect ?? false,
      };
    });

    // Compute rank across all students in this session (dense ranking)
    const allStudents = await prisma.student.findMany({
      where: { sessionId: sessionRoom.id },
      include: { answers: true },
    });
    const allAnswerOptions = quiz!.questions.flatMap((q) => q.answerOptions);
    const allScores = allStudents
      .map((s) => gradeQuiz(quiz!.questions, allAnswerOptions, s.answers).score)
      .sort((a, b) => b - a);
    const higherCount = allScores.filter((s) => s > grading.score).length;
    const rank = higherCount + 1;
    const top3 = allStudents
      .map((s) => {
        const g = gradeQuiz(quiz!.questions, allAnswerOptions, s.answers);
        return { name: s.name, score: g.score, total: g.total, percentage: g.percentage };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return NextResponse.json({
      score: grading.score,
      total: grading.total,
      percentage: grading.percentage,
      rank,
      totalParticipants: allStudents.length,
      top3,
      questions: questionResults,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}