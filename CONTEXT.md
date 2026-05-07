# Quizly

A real-time quiz platform where teachers run live quiz sessions and students join by room code to answer questions.

## Language

**Quiz**:
A reusable question template created and owned by a Teacher. Locked from edits once any Session referencing it reaches ACTIVE status.
_Avoid_: Test, exam, assessment

**Session**:
A single run of a Quiz, covering its full lifecycle: LOBBY → ACTIVE → ENDED. The Session record persists after it ends to serve results.
_Avoid_: Room (for the full record), game, instance

**Room**:
The live join point within a Session — the 6-character code, QR code, and lobby where Students gather before the quiz starts. Exists during LOBBY and ACTIVE phases; ceases when the Session ends.
_Avoid_: Session (when referring specifically to the join-point)

**Student**:
A session-scoped participation record created when someone enters a name and joins a Session. Not a persistent identity — the same person joining two Sessions produces two unrelated Student records.
_Avoid_: User, participant, player

**Teacher**:
An authenticated user who creates Quizzes and runs Sessions. The only role that requires an account.
_Avoid_: User (when the teacher role is meant)

**Answer Option**:
One of 2–6 choices attached to a Question. Marked correct or incorrect. For SINGLE questions exactly one is correct; for MULTIPLE at least one is correct.
_Avoid_: Choice, option

## Relationships

- A **Teacher** owns many **Quizzes**
- A **Quiz** can be run as many **Sessions** — but is locked from edits once any Session references it
- A **Session** has one **Room** (its join-point) during LOBBY and ACTIVE phases
- A **Session** has many **Students**
- A **Student** submits many **StudentAnswers**, one per **Question** (or none, if unanswered at auto-submit)
- A **Question** has 2–6 **Answer Options**

## Constraints

- **Auto-submit is client-side only (V1):** When the timer expires or a `quiz-ended` event arrives, the student's browser fires the submit. If the browser is closed or offline, no submission occurs and the student scores 0. Server-side enforcement of submission at session end is deferred to V2.

## Flagged ambiguities

- `SessionRoom` (Prisma model name) conflates **Session** and **Room** — canonical term is **Session**; the model should be renamed
- "session" in NextAuth context refers to an auth session (`AuthSession`), not a quiz Session — these are unrelated concepts sharing a word
