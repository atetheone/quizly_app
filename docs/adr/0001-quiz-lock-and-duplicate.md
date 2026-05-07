# Quiz is locked once a Session references it; duplicate to iterate

Once a Quiz has been used in any Session that has reached ACTIVE status, it is locked from edits. A Quiz with only LOBBY sessions is still editable — the lock triggers at the moment the teacher starts the quiz. This preserves result integrity — StudentAnswers reference Question and AnswerOption records by ID, so mutating them after a Session ran would corrupt historical results. Teachers who need to change a Quiz can duplicate it to create a fresh unlocked copy.

Snapshotting questions at session-start was the main alternative. We rejected it because it doubles the data model complexity (a snapshot layer alongside the live Quiz structure) with no V1 benefit. The lock + duplicate approach is simpler and keeps data relationships flat.
