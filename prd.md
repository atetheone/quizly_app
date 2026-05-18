# Quizly — Product Requirements Document

## 1. Overview

Quizly is a real-time quiz platform where teachers create quizzes, launch live sessions via room codes, and students join to answer questions. The platform provides live progress monitoring for teachers and automatic grading with result delivery to students.

## 2. Target Users

- **Teachers**: Create quizzes, manage sessions, monitor progress, review results. Must authenticate.
- **Students**: Join quizzes via room code/link/QR, answer questions, receive scores. No account required — name-only entry.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Pusher |
| Auth | NextAuth.js — Credentials + Google OAuth (teachers only) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

## 4. Data Model

### 4.1 User (Teacher)

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | String | Unique, required |
| name | String | Required |
| password | String | Hashed (bcrypt), nullable for Google-only users |
| image | String | Optional avatar |
| provider | Enum | `credentials`, `google` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 4.2 Quiz

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| title | String | Required, max 200 chars |
| teacherId | UUID | FK → User |
| timeLimit | Int | Duration in minutes |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### 4.3 Question

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| quizId | UUID | FK → Quiz |
| text | String | Required |
| type | Enum | `single`, `multiple` |
| order | Int | Display order (1-based) |

### 4.4 Answer Option

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| questionId | UUID | FK → Question |
| text | String | Required |
| isCorrect | Boolean | |

### 4.5 Session (Room)

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| code | String | 6-char unique code, auto-generated |
| quizId | UUID | FK → Quiz |
| teacherId | UUID | FK → User |
| status | Enum | `lobby`, `active`, `ended` |
| startedAt | DateTime | Nullable |
| endedAt | DateTime | Nullable |
| createdAt | DateTime | |

### 4.6 Student (Session Participant)

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| sessionId | UUID | FK → Session |
| name | String | Display name, no account |
| joinedAt | DateTime | |
| submittedAt | DateTime | Nullable |

### 4.7 Student Answer

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| studentId | UUID | FK → Student |
| questionId | UUID | FK → Question |
| answerOptionId | UUID | FK → Answer Option |
| selectedAt | DateTime | |

### Constraints

- Max 20 questions per quiz
- Min 2, max 6 answer options per question
- At least 1 correct answer per question
- For `single` type questions: exactly 1 correct answer
- For `multiple` type questions: at least 1 correct answer
- Room codes: 6 alphanumeric characters, case-insensitive, auto-generated
- A quiz can have multiple sessions (reusable template)
- A session cannot be joined after its status changes to `active`

## 5. Authentication

### 5.1 Teacher Auth (V1)

- **Credentials provider**: Email + password signup/login
- **Google OAuth**: "Sign in with Google" option
- **No email verification** in V1
- **No password reset** in V1 — teachers can fall back to Google OAuth
- Session managed by NextAuth.js

### 5.2 Student Identity

- Name-only, no account, no password
- Students enter their name when joining a room
- Names are scoped to a session (not global)

## 6. Features

### 6.1 Teacher — Quiz Management

#### Create Quiz (Web Form)

- Multi-step form to add questions one-by-one
- For each question: enter question text, select type (`single` or `multiple`), add 2-6 answer options, mark correct answer(s)
- Set a time limit (in minutes) for the quiz
- Save as draft or publish

#### Create Quiz (Structured Text Import)

- Teacher can type or paste questions in a simple structured text format:

```
Question: What is the powerhouse of the cell?
A) Ribosome
B) Mitochondria (correct)
C) Nucleus
D) Cell Wall

Question: Which of these are mammals? (select all that apply)
A) Whale (correct)
B) Shark
C) Bat (correct)
D) Frog
```

- The `(correct)` marker denotes correct answers
- `select all that apply` in the question text signals a `multiple` type question
- Server parses and validates the input

#### Edit Quiz

- Teacher can modify question text, answer options, correct answers, and quiz title
- Teacher can add/remove questions
- Teacher can change time limit

#### Delete Quiz

- Teacher can delete a quiz from their dashboard
- Confirmation dialog required

#### Quiz List Dashboard

- After login, teacher sees a list of their quizzes
- Each quiz shows: title, question count, time limit
- Actions: Start Session, Edit, Delete
- "Create New Quiz" button prominently displayed

### 6.2 Teacher — Live Session

#### Start Session

1. Teacher clicks "Start Session" on a quiz
2. System generates a unique 6-character room code
3. Teacher's screen displays:
   - Large room code
   - Shareable link (`quizly.app/join/{code}`)
   - QR code (scannable)
4. Session enters `lobby` status

#### Lobby / Waiting Room

- Teacher sees a live list of students who have joined
- Student names appear in real-time as they join
- Teacher waits for desired students to join
- Teacher clicks "Start Quiz" when ready

#### Quiz Active

- 3-second countdown displayed to all students (3... 2... 1... Go!)
- Countdown is separate from the quiz timer — students get full time
- After countdown, quiz timer starts (duration set by teacher during quiz creation)
- Teacher live dashboard shows:
  - List of students with progress: name + questions answered count (e.g., "Alice — 8/15")
  - Which students have submitted
  - Remaining time on the quiz timer

#### End Session

- Session ends when:
  - Timer expires (auto-end), OR
  - All students have submitted (auto-end)
- Late joiners are locked out once session is `active`
- Early-finishing students see a "Waiting for quiz to end" screen

#### Post-Session Report

- After session ends, teacher sees:
  - Average score across all students
  - Highest and lowest score
  - Table: student name, score (e.g., "7/10"), percentage (e.g., "70%")

### 6.3 Student — Quiz Flow

#### Join

- Student navigates to `/join`
- Enters room code + display name
  - OR clicks a shareable link `quizly.app/join/{code}` (auto-fills the code)
  - OR scans QR code (navigates to the link)
- Student enters lobby, sees: quiz title, their name, other students in lobby
- Waiting for teacher to start

#### Quiz Active

- After 3-second countdown, all questions are visible
- Students answer at their own pace (student-paced)
- For `single` type questions: radio buttons (pick one)
- For `multiple` type questions: checkboxes (pick one or more)
- Timer countdown visible on screen
- Student can navigate between questions freely
- Student clicks "Submit" when done

#### Auto-submit

- If timer expires before student submits, all current answers are auto-submitted
- Unanswered questions are marked incorrect

#### Results

- Results are shown to students **only after the quiz timer expires** (not after individual submission)
- Students who finish early see "Waiting for quiz to end" screen
- After timer expires, students see:
  - Their score (e.g., "7/10 correct — 70%")
  - Answer review: each question with the student's answer vs. the correct answer highlighted
- No per-question explanations in V1 (future: teacher-provided explanations)

### 6.4 Grading

- **Single-answer questions**: 1 point if correct, 0 if wrong
- **Multiple-answer questions**: All-or-nothing — full points if all correct answers are selected (and no incorrect ones), 0 points otherwise
- Total score = sum of points across questions
- Percentage = (total score / number of questions) × 100

## 7. Real-time Architecture (Pusher)

### 7.1 Channels

| Channel | Subscribers | Purpose |
|---|---|---|
| `room-{code}` | Teacher + all students in session | General room events |
| `teacher-{code}` | Teacher only | Teacher-specific updates |

### 7.2 Events

| Channel | Event | Payload | Triggered When |
|---|---|---|---|
| `room-{code}` | `student-joined` | `{ studentId, name }` | Student joins lobby |
| `room-{code}` | `quiz-started` | `{ countdown: 3 }` | Teacher clicks Start Quiz |
| `room-{code}` | `quiz-ended` | `{}` | Timer expires or all submitted |
| `teacher-{code}` | `student-progress` | `{ studentId, name, answered, total }` | Student answers a question |
| `teacher-{code}` | `student-submitted` | `{ studentId, name }` | Student submits quiz |

### 7.3 Presence

- Use Pusher Presence channels for `room-{code}` to track who's connected
- Enable disconnect/reconnect handling for brief network issues

## 8. API Routes

### 8.1 Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Teacher registration (email/password) |
| POST | `/api/auth/[...nextauth]` | NextAuth.js handler (login, Google OAuth) |

### 8.2 Quizzes

| Method | Route | Description |
|---|---|---|
| GET | `/api/quizzes` | List teacher's quizzes |
| POST | `/api/quizzes` | Create quiz (form data) |
| POST | `/api/quizzes/import` | Create quiz (structured text) |
| GET | `/api/quizzes/[id]` | Get quiz details |
| PUT | `/api/quizzes/[id]` | Update quiz |
| DELETE | `/api/quizzes/[id]` | Delete quiz |

### 8.3 Sessions

| Method | Route | Description |
|---|---|---|
| POST | `/api/sessions` | Create session (start room) — body: `{ quizId }` |
| GET | `/api/sessions/[code]` | Get session info (for students joining) |
| POST | `/api/sessions/[code]/start` | Teacher starts quiz (triggers countdown) |
| POST | `/api/sessions/[code]/end` | Teacher manually ends session |
| GET | `/api/sessions/[code]/results` | Get post-session report |

### 8.4 Students

| Method | Route | Description |
|---|---|---|
| POST | `/api/sessions/[code]/join` | Student joins room — body: `{ name }` |
| GET | `/api/sessions/[code]/quiz` | Get quiz questions (for student answering) |
| POST | `/api/sessions/[code]/submit` | Student submits answers |

### 8.5 Pusher Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/pusher/auth` | Authenticate Pusher channel subscriptions |

## 9. Pages & UI Structure

### 9.1 Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing page | Hero, CTA to sign up / join quiz |
| `/auth/signup` | Teacher signup | Email/password registration form |
| `/auth/login` | Teacher login | Email/password + Google OAuth |
| `/dashboard` | Teacher dashboard | Quiz list, create/edit/delete/start |
| `/quiz/new` | Create quiz (form) | Web form builder |
| `/quiz/import` | Create quiz (import) | Structured text input |
| `/quiz/[id]/edit` | Edit quiz | Pre-filled form |
| `/session/[code]` | Teacher session | Lobby → live dashboard → post-session report |
| `/join` | Student join | Enter room code + name |
| `/join/[code]` | Student join (prefilled) | Name entry, code prefilled |
| `/quiz/[code]/play` | Student quiz | Countdown → questions → waiting → results |

### 9.2 Design Principles

- Mobile-first responsive design (students likely on phones)
- shadcn/ui components throughout
- Teacher screens optimized for desktop (projected in classroom)
- Student screens optimized for mobile

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Page load time | < 2s on 3G |
| Real-time latency | < 500ms for Pusher events |
| Concurrent students per session | Up to 100 (V1) |
| Uptime target | Vercel default (99.9%) |
| Accessibility | WCAG 2.1 AA for student-facing pages |

## 11. Internationalization (EN + FR)

Quizly supports English and French. The implementation uses `next-intl` v4 with a cookie-based locale strategy — no URL prefix so that room links remain clean and shareable.

### 11.1 Locale Strategy

- **Cookie-based**: `NEXT_LOCALE` cookie stores the user's preference. `Accept-Language` header is used as a fallback on first visit.
- **No URL prefix**: Routes stay `/`, `/auth/login`, `/join`, `/session/{code}` regardless of locale.
- **Global language switcher**: Available in the nav / auth sidebar; toggles cookie and reloads.

### 11.2 Message Catalog Organization

Messages are organized by namespace in `messages/en.json` and `messages/fr.json`:

| Namespace | Content |
|---|---|
| `common` | App name, save/cancel/delete, language labels, generic count/plural rules |
| `validation` | Form validation errors (Zod messages) |
| `errors` | Server/API error strings |
| `import` | Import / generate quiz page |
| `landing` | Landing page hero, nav, demo card, steps |
| `auth` | Login / signup — shared left panel + form labels + page-specific CTAs |

Each namespace is translated in full — no half-French pages.

### 11.3 Pages to Localize

| Page | Component Type | Translation Hook |
|---|---|---|
| `/` (landing) | Server (async) | `getTranslations('landing')` |
| `/auth/login` | Client | `useTranslations('auth')` |
| `/auth/signup` | Client | `useTranslations('auth')` |
| `/dashboard` | TBD | TBD |
| `/quiz/new`, `/quiz/[id]/edit` | TBD | TBD |
| `/quiz/import` | Client | `useTranslations('import')` ✅ |
| `/join`, `/join/[code]` | TBD | TBD |
| `/play/[code]` | TBD | TBD |
| `/session/[code]` | TBD | TBD |

### 11.4 Demo Data & Testimonials

Demo content on the landing page (preview card subject, student statuses, time left) and auth testimonials are translated via message keys so they render in the active locale. Example: `"Cell Biology"` → `"Biologie cellulaire"`, `"done"` → `"terminé"`.

### 11.5 PR Roadmap

| PR | Scope | Status |
|---|---|---|
| PR1 | i18n infra — `next-intl`, cookie locale, middleware, language switcher, base catalogs | ✅ Merged |
| PR2 | French quiz generation + import page fully localized | ✅ Merged |
| PR3 | Landing page + auth pages (login + signup) | ✅ Ready |
| PR4 | Dashboard + date/plural formatting | ⏳ Planned |
| PR5 | Quiz editor (`/quiz/new` + `/quiz/[id]/edit`) | ⏳ Planned |
| PR6 | Join pages (`/join` + `/join/[code]`) | ⏳ Planned |
| PR7 | Play page (`/play/[code]`) + timer/score formatting | ⏳ Planned |
| PR8 | Session page (`/session/[code]`) + final stray-string sweep | ⏳ Planned |

### 11.6 Out of Scope

- RTL languages (V1 is LTR only)
- Additional locales beyond EN + FR
- Dynamic locale switching without page reload
- Locale-specific routing / URL prefixes

## 12. V1 Scope — Excluded

These features are explicitly **out of scope** for V1:

- Student authentication / accounts
- Password reset for teachers
- Email verification for teachers
- Question-level time limits
- Partial credit scoring
- Per-question explanation fields
- Answer distribution analytics for teachers
- Per-student detailed answer views for teachers
- CSV/PDF export of results
- Late joiner support
- Photo/image-based questions
- Quiz categories / subjects
- Quiz sharing between teachers
- Dark mode

## 13. Future Considerations (V2+)

- Teacher authentication improvements (password reset, email verification)
- Student accounts for persistent history
- Partial credit scoring for multiple-answer questions
- Per-question explanation fields
- Answer distribution analytics
- CSV/PDF result exports
- Late joiner support
- Image-based questions
- Quiz categories and search
- Quiz sharing and collaboration between teachers
- Dark mode

---

# PRD — Leaderboard, Session Breakdown & Session History

## Problem Statement

After a quiz Session ends, Teachers receive a basic score table and Students see only their own score. There is no sense of ranking between Students, no insight into which Questions tripped up the class, and no way to revisit results from a Session that happened days ago. This makes Quizly useful only while the Room is still open — all actionable teaching signal is lost once the teacher navigates away.

## Solution

Three complementary features that close the post-session gap:

1. **Leaderboard** — Students see how they rank against classmates immediately after results are revealed; Teachers see a ranked podium in the report.
2. **Session Breakdown** — A per-Question tab in the Teacher's report shows answer-option distribution and highlights the most-missed Questions so the teacher knows what to re-teach.
3. **Session History** — The existing "Past sessions" sidebar entry in the dashboard is wired up, listing all ended Sessions with summary stats and a link back to the full report.

## User Stories

1. As a Student, I want to see my rank among all Students in the Session so that I know how I performed relative to my classmates.
2. As a Student, I want to see the top three Students on a leaderboard so that the quiz feels competitive and engaging.
3. As a Student, I want my own name highlighted on the leaderboard so that I can spot myself at a glance.
4. As a Student, I want to see how many Students participated in the Session so that I understand the context of my rank.
5. As a Teacher, I want a ranked leaderboard in the results report so that I can celebrate top performers in class.
6. As a Teacher, I want to see which Questions had the lowest correct-answer rate so that I know what topics to revisit.
7. As a Teacher, I want to see the exact number and percentage of Students who selected each Answer Option per Question so that I can identify common misconceptions.
8. As a Teacher, I want Questions sorted by difficulty (lowest correct rate first) so that the most problematic Questions surface immediately.
9. As a Teacher, I want a visual bar per Answer Option showing selection share so that I can read the distribution at a glance.
10. As a Teacher, I want to switch between the "Students" and "Questions" tabs in the results report so that I can explore both views of the same Session data.
11. As a Teacher, I want to see a list of all my past Sessions in the dashboard so that I can review results from Sessions that have already ended.
12. As a Teacher, I want each past Session entry to show the quiz title, date run, number of Students, and class average so that I can quickly identify the Session I want to revisit.
13. As a Teacher, I want to click a past Session and be taken to the full results report so that I have the same detail view I had immediately after the Session ended.
14. As a Teacher, I want past Sessions sorted newest-first so that my most recent class appears at the top.
15. As a Teacher, I want to see how many Sessions I have run in total so that I have a sense of my activity over time.

## Implementation Decisions

### Leaderboard

- The `student-results` API response is extended with two new fields: `rank` (1-based integer, dense ranking — ties share the lowest rank) and `totalParticipants`.
- The student results page gains a leaderboard section above the answer review. Top 3 Students are shown with podium styling; the calling Student's own entry is always visible and highlighted regardless of rank.
- The teacher's ReportView gains rank numbers (1st, 2nd, 3rd…) in the results table. Rank is assigned positionally from the already-sorted student list — no additional API call.
- No schema changes required.

### Session Breakdown

- New API endpoint: `GET /api/sessions/[code]/breakdown` (teacher-only). Returns an ordered array of Questions (hardest first by correct-answer rate), each with: id, text, type, order, correctRate (percentage), and an array of Answer Options each with: id, text, isCorrect, selectionCount, selectionPct.
- The teacher's ReportView adds a tab switcher ("Students" / "Questions"). The Questions tab renders the breakdown list.
- A Question with zero Student submissions shows 0% for all options.
- No schema changes required — all data derives from existing `StudentAnswer` records via `gradeQuiz`.

### Session History

- New `GET /api/sessions` handler on the existing sessions route (currently POST-only). Returns all ENDED Sessions owned by the authenticated Teacher, newest-first, with: code, quizTitle, endedAt, studentCount, average.
- The dashboard "Past sessions" sidebar item becomes a real navigation destination. Clicking it replaces the quiz grid with the sessions list. Each row links to `/session/[code]`, which already renders `ReportView` for ENDED Sessions.
- Empty state shown when no ended Sessions exist.
- No schema changes required.

### Shared

- `gradeQuiz` in `lib/grading.ts` is reused for all server-side grade derivation across new endpoints.
- All new/modified API endpoints enforce teacher-only auth via the existing `auth()` helper.

## Testing Decisions

- Tests assert on HTTP contract (status codes, response shape) and computed values (rank, selectionPct, average), not on internal implementation details.
- The `gradeQuiz` function is already pure — unit tests for edge cases (ties, zero submissions, all-wrong, all-correct) belong with it.
- The breakdown endpoint's aggregation logic should be covered by integration tests seeding known `StudentAnswer` records and asserting exact counts.
- Rank calculation (including tie-breaking) should be unit-tested independently of the HTTP layer.

## Out of Scope

- Real-time leaderboard updates during an active Session (leaderboard is post-quiz only).
- Per-student detailed answer views for Teachers (which specific option each student picked).
- Deleting or archiving past Sessions from the history view.
- Exporting results (CSV / PDF).
- Pagination of session history.
- Per-question time-spent analytics.

## Further Notes

- The leaderboard exposes Student names to other Students in the same Session, consistent with the existing lobby behaviour where all Student names are visible to all participants.
- The `SessionRoom` Prisma model name inconsistency (flagged in CONTEXT.md) is out of scope here and should be a separate refactor.