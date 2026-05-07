import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeQuiz } from "@/lib/grading";

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
    const sessionRoom = await prisma.sessionRoom.findUnique({
      where: { code },
    });

    if (!sessionRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (sessionRoom.teacherId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: sessionRoom.quizId },
      include: { questions: true },
    });

    const students = await prisma.student.findMany({
      where: { sessionId: sessionRoom.id },
      include: { answers: true },
    });

    const allAnswerOptions = await prisma.answerOption.findMany({
      where: { question: { quizId: sessionRoom.quizId } },
    });

    const results = students.map((student) => {
      const grading = gradeQuiz(
        quiz!.questions,
        allAnswerOptions,
        student.answers
      );
      return {
        studentId: student.id,
        name: student.name,
        score: grading.score,
        total: grading.total,
        percentage: grading.percentage,
        submittedAt: student.submittedAt,
      };
    });

    const scores = results.map((r) => r.percentage);
    const average =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;

    return NextResponse.json({
      quizTitle: quiz!.title,
      totalQuestions: quiz!.questions.length,
      average,
      highest,
      lowest,
      students: results,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}