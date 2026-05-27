-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('CLASSROOM', 'PARTY');

-- AlterTable
ALTER TABLE "quizzes" ALTER COLUMN "teacherId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "forcedEndAt" TIMESTAMP(3),
                        ADD COLUMN "hostName" TEXT,
                        ADD COLUMN "hostToken" TEXT,
                        ADD COLUMN "mode" "SessionMode" NOT NULL DEFAULT 'CLASSROOM',
                        ADD COLUMN "partyConfig" JSONB,
                        ADD COLUMN "questionsReady" BOOLEAN NOT NULL DEFAULT false,
                        ALTER COLUMN "teacherId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_hostToken_key" ON "sessions"("hostToken");
