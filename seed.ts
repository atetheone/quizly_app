import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "quizly",
  user: "quizly",
  password: "quizly_dev",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("teacher123", 12);

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@quizly.com" },
    update: {},
    create: {
      email: "teacher@quizly.com",
      name: "Ms. Johnson",
      password: hashedPassword,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: "General Knowledge Quiz",
      timeLimit: 10,
      teacherId: teacher.id,
      questions: {
        create: [
          {
            text: "What is the capital of France?",
            type: "SINGLE",
            order: 1,
            answerOptions: {
              create: [
                { text: "London", isCorrect: false },
                { text: "Berlin", isCorrect: false },
                { text: "Paris", isCorrect: true },
                { text: "Madrid", isCorrect: false },
              ],
            },
          },
          {
            text: "Which planet is known as the Red Planet?",
            type: "SINGLE",
            order: 2,
            answerOptions: {
              create: [
                { text: "Venus", isCorrect: false },
                { text: "Mars", isCorrect: true },
                { text: "Jupiter", isCorrect: false },
                { text: "Saturn", isCorrect: false },
              ],
            },
          },
          {
            text: "What is the largest ocean on Earth?",
            type: "SINGLE",
            order: 3,
            answerOptions: {
              create: [
                { text: "Atlantic Ocean", isCorrect: false },
                { text: "Indian Ocean", isCorrect: false },
                { text: "Arctic Ocean", isCorrect: false },
                { text: "Pacific Ocean", isCorrect: true },
              ],
            },
          },
          {
            text: "Which of the following are programming languages?",
            type: "MULTIPLE",
            order: 4,
            answerOptions: {
              create: [
                { text: "Python", isCorrect: true },
                { text: "HTML", isCorrect: false },
                { text: "Rust", isCorrect: true },
                { text: "CSS", isCorrect: false },
              ],
            },
          },
          {
            text: "What is the chemical symbol for water?",
            type: "SINGLE",
            order: 5,
            answerOptions: {
              create: [
                { text: "CO2", isCorrect: false },
                { text: "H2O", isCorrect: true },
                { text: "O2", isCorrect: false },
                { text: "NaCl", isCorrect: false },
              ],
            },
          },
          {
            text: "Which countries are in South America?",
            type: "MULTIPLE",
            order: 6,
            answerOptions: {
              create: [
                { text: "Brazil", isCorrect: true },
                { text: "Mexico", isCorrect: false },
                { text: "Argentina", isCorrect: true },
                { text: "Colombia", isCorrect: true },
              ],
            },
          },
          {
            text: "Who wrote 'Romeo and Juliet'?",
            type: "SINGLE",
            order: 7,
            answerOptions: {
              create: [
                { text: "Charles Dickens", isCorrect: false },
                { text: "William Shakespeare", isCorrect: true },
                { text: "Jane Austen", isCorrect: false },
                { text: "Mark Twain", isCorrect: false },
              ],
            },
          },
          {
            text: "What is the speed of light approximately?",
            type: "SINGLE",
            order: 8,
            answerOptions: {
              create: [
                { text: "300,000 km/s", isCorrect: true },
                { text: "150,000 km/s", isCorrect: false },
                { text: "1,000,000 km/s", isCorrect: false },
                { text: "30,000 km/s", isCorrect: false },
              ],
            },
          },
          {
            text: "Which of these are renewable energy sources?",
            type: "MULTIPLE",
            order: 9,
            answerOptions: {
              create: [
                { text: "Solar", isCorrect: true },
                { text: "Coal", isCorrect: false },
                { text: "Wind", isCorrect: true },
                { text: "Natural Gas", isCorrect: false },
              ],
            },
          },
          {
            text: "What is the smallest prime number?",
            type: "SINGLE",
            order: 10,
            answerOptions: {
              create: [
                { text: "0", isCorrect: false },
                { text: "1", isCorrect: false },
                { text: "2", isCorrect: true },
                { text: "3", isCorrect: false },
              ],
            },
          },
        ],
      },
    },
    include: {
      questions: { include: { answerOptions: true } },
    },
  });

  console.log("Seeded database:");
  console.log(`  Teacher: ${teacher.email} (password: teacher123)`);
  console.log(`  Quiz: "${quiz.title}" (ID: ${quiz.id})`);
  console.log(`  Questions: ${quiz.questions.length}`);
  console.log(`  Time limit: ${quiz.timeLimit} minutes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });