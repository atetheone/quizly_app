# Quizly — Claude Project Configuration

## Project Overview

Quizly is a real-time quiz platform for teachers and students. Teachers create quizzes, launch live sessions via room codes, and students join to answer questions. Built with Next.js (App Router), PostgreSQL + Prisma, Pusher (real-time), NextAuth.js (teacher auth), and Tailwind CSS + shadcn/ui.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (Credentials + Google OAuth, teachers only)
- **Real-time**: Pusher
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    (auth)/               # Auth pages group
    (dashboard)/          # Teacher dashboard pages group
    api/                  # API routes
      auth/               # NextAuth handlers
      quizzes/            # Quiz CRUD
      sessions/           # Session management
      pusher/             # Pusher auth
  components/             # React components
    ui/                   # shadcn/ui components
    quiz/                 # Quiz-related components
    session/              # Session/live components
    student/              # Student-facing components
  lib/                    # Utility functions
    auth.ts               # NextAuth config
    pusher.ts             # Pusher config
    prisma.ts             # Prisma client singleton
    grading.ts            # Scoring logic
  prisma/
    schema.prisma         # Database schema
    migrations/           # Prisma migrations
```

## Key Architecture Decisions

1. **Students are name-only, no auth** — Students join rooms by entering a display name. No accounts, no passwords.
2. **Teachers authenticate** — NextAuth.js with Credentials + Google OAuth. No email verification or password reset in V1.
3. **Quizzes are reusable templates** — A quiz can be used to start multiple sessions. Each session is independent.
4. **Student-paced within a timed session** — All questions visible to students, they answer at their own speed, but there's a quiz-level timer set by the teacher.
5. **Results shown after timer expires** — Students see their scores only after the quiz timer ends, not immediately after submitting. This prevents answer sharing.
6. **Auto-submit on timer expiry** — Whatever the student has answered is submitted. Unanswered questions are marked incorrect.
7. **All-or-nothing scoring** — For multiple-answer questions, full points only if exactly the correct set is selected.
8. **Room codes are 6 alphanumeric characters** — Auto-generated, case-insensitive.
9. **Late joiners locked out** — Once a session status changes to `active`, no new students can join.
10. **3-second pre-quiz countdown** — Separate from the main timer; students get full quiz time after countdown.

## Data Model Summary

- **User** (teacher): id, email, name, password (hashed), image, provider, timestamps
- **Quiz**: id, title, teacherId, timeLimit (minutes), timestamps
- **Question**: id, quizId, text, type (single/multiple), order
- **AnswerOption**: id, questionId, text, isCorrect
- **Session**: id, code (6-char), quizId, teacherId, status (lobby/active/ended), startedAt, endedAt
- **Student**: id, sessionId, name, joinedAt, submittedAt
- **StudentAnswer**: id, studentId, questionId, answerOptionId, selectedAt

## Constraints

- Max 20 questions per quiz
- Min 2, max 6 answer options per question
- At least 1 correct answer per question
- Single-type questions: exactly 1 correct answer
- Multiple-type questions: at least 1 correct answer

## Pusher Channels

- `room-{code}`: `student-joined`, `quiz-started`, `quiz-ended` (all participants)
- `teacher-{code}`: `student-progress`, `student-submitted` (teacher only)

## Environment Variables

```
DATABASE_URL=         # PostgreSQL connection string
NEXTAUTH_SECRET=      # NextAuth.js secret
NEXTAUTH_URL=         # App URL
GOOGLE_CLIENT_ID=     # Google OAuth
GOOGLE_CLIENT_SECRET= # Google OAuth
PUSHER_APP_ID=        # Pusher
PUSHER_KEY=           # Pusher
PUSHER_SECRET=        # Pusher
PUSHER_CLUSTER=       # Pusher cluster
NEXT_PUBLIC_PUSHER_KEY=     # Pusher (client)
NEXT_PUBLIC_PUSHER_CLUSTER= # Pusher (client)
OPENROUTER_API_KEY=   # OpenRouter free tier — AI quiz generation
QUIZ_GEN_MODEL=       # Optional model override (default: free model)
```

## Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Run ESLint
npm run typecheck     # Run TypeScript type checking
npx prisma migrate dev   # Run database migrations
npx prisma studio        # Open Prisma database browser
npx prisma generate      # Regenerate Prisma client
```

## Adding a Feature

The conventional flow for a new feature in this codebase (as established by the
AI quiz generation and session-history features):

1. **Issue first** — every feature starts as a GitHub issue created from the
   planned scope (see `prd.md`), labeled `enhancement`
   (`gh issue create`). The implementing PR closes it on merge
   (`Closes #N`). One issue per feature.
2. **Branch** — `feat/<kebab-name>` off `main` (e.g. `feat/ai-quiz-generation`).
3. **Validation first** — add/extend a Zod schema in `src/lib/validations.ts`
   for any new input shape. API routes validate against these, never trust raw
   request bodies.
4. **Domain logic** — put non-trivial logic in a focused module under
   `src/lib/` (e.g. `quiz-generator.ts`, `grading.ts`). Keep it framework- and
   request-agnostic so it stays unit-testable.
5. **API route** — add `src/app/api/<area>/<name>/route.ts`. Auth-gate teacher
   actions via the NextAuth session; return typed JSON; surface validation
   errors as 400s. New persisted fields require a Prisma schema change +
   `npx prisma migrate dev` (migrations are committed).
6. **UI** — add components under `src/components/<area>/` and wire pages under
   `src/app/`. Reuse existing shadcn/ui primitives; respect the architecture
   decisions above (e.g. results gated until timer expiry, students name-only).
7. **Respect constraints & scope** — honor the limits in *Constraints* and do
   not build anything listed in *V1 Out of Scope* without a decision to expand
   scope.
8. **Commits** — atomic, [Conventional Commits](https://www.conventionalcommits.org)
   (`feat:`, `fix:`, `docs:`, `chore:`), one logical change each. Mirror the
   scaffold order above (dep/env → schema → module → route → UI → fixes).
9. **Gates before PR** — `npm run lint`, `npm run typecheck`, and
   `npm run build` must pass. Update `progress.md` (phase checklist + status
   log) and any affected docs/env examples.
10. **PR → `main`** — open a PR that closes the issue; merge keeps history (no
    squash). After merge, delete the merged branch and prune stale remotes.

> Next.js here may diverge from training data — see `AGENTS.md`; consult
> `node_modules/next/dist/docs/` before writing framework code.

## V1 Out of Scope

- Student accounts/authentication
- Teacher password reset / email verification
- Question-level time limits
- Partial credit scoring
- Per-question explanations
- Answer distribution analytics
- Per-student detailed answer views for teachers
- CSV/PDF result exports
- Late joiner support
- Image-based questions
- Quiz categories
- Quiz sharing between teachers
- Dark mode
