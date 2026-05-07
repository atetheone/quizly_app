export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function parseQuizText(rawText: string): {
  questions: {
    text: string;
    type: "SINGLE" | "MULTIPLE";
    order: number;
    answerOptions: { text: string; isCorrect: boolean }[];
  }[];
} | null {
  const blocks = rawText
    .split(/(?=Question:)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) return null;

  const questions = blocks.map((block, index) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const questionLine = lines[0];
    const questionText = questionLine.replace(/^Question:\s*/i, "").trim();

    const isMultiple = /\(select all that apply\)/i.test(questionLine);
    const type: "SINGLE" | "MULTIPLE" = isMultiple ? "MULTIPLE" : "SINGLE";

    const answerOptions = lines.slice(1).map((line) => {
      const match = line.match(/^[A-Z]\)\s*(.+)$/i);
      if (!match) return null;
      const text = match[1].replace(/\s*\(correct\)\s*$/i, "").trim();
      const isCorrect = /\(correct\)/i.test(line);
      return { text, isCorrect };
    }).filter((o): o is { text: string; isCorrect: boolean } => o !== null);

    return { text: questionText, type, order: index + 1, answerOptions };
  });

  if (questions.some((q) => q.answerOptions.length < 2)) return null;
  if (questions.some((q) => !q.answerOptions.some((a) => a.isCorrect))) return null;

  return { questions };
}