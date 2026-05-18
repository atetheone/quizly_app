import "server-only";
import OpenAI from "openai";
import type { QuizGenerateInput } from "@/lib/validations";

/**
 * AI quiz generation, isolated behind a single module.
 *
 * Provider: OpenRouter free tier, reached through the OpenAI-compatible
 * client. Swapping models (or providers) is confined to this file — the
 * route only consumes `generateQuizText`.
 */

const MODEL =
  process.env.QUIZ_GEN_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

export class QuizGenerationError extends Error {}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new QuizGenerationError(
      "AI generation is not configured. Set OPENROUTER_API_KEY (free at openrouter.ai)."
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You generate multiple-choice quiz questions as PLAIN TEXT in a strict format. Output ONLY the questions — no preamble, no commentary, no markdown code fences.

FORMAT (exactly this, one blank line between questions):
Question: <question text>
A) <option>
B) <option> (correct)
C) <option>
D) <option>

RULES:
- Each question has between 2 and 6 options, labelled A), B), C)… in order.
- Single-answer question: mark EXACTLY ONE option with " (correct)" at the end of its line.
- Multiple-answer question: append " (select all that apply)" to the "Question:" line AND mark EVERY correct option with " (correct)". Use these sparingly.
- The literal token is "(correct)" — never translate or restyle it.
- Never put "(correct)" anywhere except at the end of an option line.
- Produce the EXACT number of questions requested. No more, no less.
- Vary the position of the correct option across questions.

DIFFICULTY CALIBRATION:
- EASY: direct recall of one well-known fact; obvious wrong distractors.
- MEDIUM: requires understanding/applying a concept or combining two facts; plausible distractors.
- HARD: multi-step reasoning, fine distinctions, or less commonly known specifics; subtle distractors.`;

function buildUserPrompt(input: QuizGenerateInput): string {
  const { topic, count, spread } = input;
  if (spread.kind === "single") {
    return `Topic: ${topic}
Generate exactly ${count} question(s), ALL at ${spread.level} difficulty.`;
  }
  const parts: string[] = [];
  if (spread.easy > 0) parts.push(`${spread.easy} EASY`);
  if (spread.medium > 0) parts.push(`${spread.medium} MEDIUM`);
  if (spread.hard > 0) parts.push(`${spread.hard} HARD`);
  return `Topic: ${topic}
Generate exactly ${count} question(s) with this difficulty mix: ${parts.join(
    ", "
  )}.
Interleave the difficulties rather than grouping them.`;
}

/** Strips markdown fences free models sometimes wrap output in. */
export function stripFences(text: string): string {
  return text
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?\s*```\s*$/, "")
    .trim();
}

export async function generateQuizText(
  input: QuizGenerateInput
): Promise<string> {
  let completion;
  try {
    completion = await getClient().chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      throw new QuizGenerationError(
        "AI rate limit reached on the free tier. Try again in a moment."
      );
    }
    if (status === 401 || status === 403) {
      throw new QuizGenerationError(
        "AI generation rejected the API key. Check OPENROUTER_API_KEY."
      );
    }
    throw new QuizGenerationError(
      "AI generation is temporarily unavailable. Try again shortly."
    );
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw || !raw.trim()) {
    throw new QuizGenerationError("AI returned an empty response.");
  }
  return stripFences(raw);
}
