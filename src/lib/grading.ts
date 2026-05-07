import { QuestionType } from "@/generated/prisma/enums";

export function gradeQuiz(
  questions: { id: string; type: QuestionType }[],
  answerOptions: { id: string; questionId: string; isCorrect: boolean }[],
  studentAnswers: { questionId: string; answerOptionId: string }[]
): { score: number; total: number; percentage: number; results: QuestionResult[] } {
  const total = questions.length;
  let score = 0;
  const results: QuestionResult[] = [];

  for (const question of questions) {
    const correctOptionIds = answerOptions
      .filter((o) => o.questionId === question.id && o.isCorrect)
      .map((o) => o.id)
      .sort();

    const selectedOptionIds = studentAnswers
      .filter((a) => a.questionId === question.id)
      .map((a) => a.answerOptionId)
      .sort();

    const isCorrect =
      correctOptionIds.length === selectedOptionIds.length &&
      correctOptionIds.every((id, i) => id === selectedOptionIds[i]);

    if (isCorrect) score++;

    results.push({
      questionId: question.id,
      isCorrect,
      selectedOptionIds,
      correctOptionIds,
    });
  }

  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    results,
  };
}

export type QuestionResult = {
  questionId: string;
  isCorrect: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
};