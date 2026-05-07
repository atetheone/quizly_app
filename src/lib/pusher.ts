import Pusher from "pusher";

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export const PUSHER_CHANNELS = {
  room: (code: string) => `room-${code}`,
  teacher: (code: string) => `teacher-${code}`,
};

export const PUSHER_EVENTS = {
  STUDENT_JOINED: "student-joined",
  QUIZ_STARTED: "quiz-started",
  QUIZ_ENDED: "quiz-ended",
  STUDENT_PROGRESS: "student-progress",
  STUDENT_SUBMITTED: "student-submitted",
} as const;