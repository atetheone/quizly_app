import { z } from "zod";

export const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  type: z.enum(["SINGLE", "MULTIPLE"]),
  order: z.number().int().min(1),
  answerOptions: z
    .array(
      z.object({
        text: z.string().min(1, "Answer text is required"),
        isCorrect: z.boolean(),
      })
    )
    .min(2, "At least 2 answer options required")
    .max(6, "Maximum 6 answer options allowed"),
});

export const quizCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  timeLimit: z.number().int().min(1, "Time limit must be at least 1 minute").max(120, "Time limit max 120 minutes"),
  questions: z
    .array(questionSchema)
    .min(1, "At least 1 question required")
    .max(20, "Maximum 20 questions allowed"),
});

export const joinRoomSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

// Messages on the generate/import path are i18n keys (resolved client-side via
// the `validation` namespace). Other schemas keep literals until their
// consuming page is localized in a later PR.
export const quizImportSchema = z.object({
  title: z
    .string()
    .min(1, "validation.titleRequired")
    .max(200, "validation.titleTooLong"),
  timeLimit: z.number().int().min(1).max(120),
  rawText: z.string().min(1, "validation.quizTextRequired"),
});

export const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);

export const localeEnum = z.enum(["en", "fr"]);

export const quizGenerateSchema = z
  .object({
    topic: z
      .string()
      .min(1, "validation.topicRequired")
      .max(200, "validation.topicTooLong"),
    count: z
      .number()
      .int()
      .min(1, "validation.minQuestions")
      .max(20, "validation.maxQuestions"),
    language: localeEnum.default("en"),
    spread: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("single"), level: difficultyEnum }),
      z.object({
        kind: z.literal("mix"),
        easy: z.number().int().min(0),
        medium: z.number().int().min(0),
        hard: z.number().int().min(0),
      }),
    ]),
  })
  .refine(
    (d) =>
      d.spread.kind !== "mix" ||
      d.spread.easy + d.spread.medium + d.spread.hard === d.count,
    { message: "validation.difficultySum", path: ["spread"] }
  );

export type QuizGenerateInput = z.infer<typeof quizGenerateSchema>;

export const partyCreateSchema = quizGenerateSchema.and(
  z.object({
    hostName: z.string().min(1, "Name is required").max(50, "Name too long"),
    timeLimit: z
      .number()
      .int()
      .min(1, "Time limit must be at least 1 minute")
      .max(120, "Time limit max 120 minutes"),
  })
);

export type PartyCreateInput = z.infer<typeof partyCreateSchema>;