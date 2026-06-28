-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApplicationFitRecommendation" AS ENUM ('STRONG_FIT', 'POTENTIAL_FIT', 'WEAK_FIT');

-- CreateTable
CREATE TABLE "CandidateCvAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeUrl" TEXT NOT NULL,
    "resumeTextHash" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "queueJobId" TEXT,
    "overallScore" INTEGER,
    "summary" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "suggestions" JSONB,
    "extractedSkills" TEXT[],
    "recommendedMatches" JSONB,
    "errorMessage" TEXT,
    "quotaReservedAt" TIMESTAMP(3),
    "quotaRefundedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateCvAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAiScore" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "queueJobId" TEXT,
    "score" INTEGER,
    "recommendation" "ApplicationFitRecommendation",
    "summary" TEXT,
    "matchedSkills" TEXT[],
    "missingSkills" TEXT[],
    "risks" JSONB,
    "reasoning" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationAiScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateCvAnalysis_userId_status_createdAt_idx" ON "CandidateCvAnalysis"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateCvAnalysis_resumeTextHash_idx" ON "CandidateCvAnalysis"("resumeTextHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationAiScore_applicationId_key" ON "ApplicationAiScore"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationAiScore_status_createdAt_idx" ON "ApplicationAiScore"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CandidateCvAnalysis" ADD CONSTRAINT "CandidateCvAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAiScore" ADD CONSTRAINT "ApplicationAiScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
