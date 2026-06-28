import {
  enqueueApplicationFitScoreRepair,
  enqueueCandidateCvAnalysisRepair,
} from "@07nghiep/queue";
import type { Prisma, PrismaClient } from "@07nghiep/db";

import { logWorker } from "../lib/log";

const repairRecordSelect = { id: true } satisfies Prisma.CandidateCvAnalysisSelect;
const applicationScoreRepairSelect = { id: true } satisfies Prisma.ApplicationAiScoreSelect;

type WorkerPrisma = Pick<PrismaClient, "applicationAiScore" | "candidateCvAnalysis">;

const STALE_PENDING_MS = 5 * 60 * 1000;
const REPAIR_BATCH_SIZE = 50;

export async function repairPendingAiJobs(prisma: WorkerPrisma, now = new Date()) {
  const startedAt = Date.now();
  const staleBefore = new Date(now.getTime() - STALE_PENDING_MS);
  const repairRunId = now.toISOString();

  logWorker("AI repair scan started", {
    repairRunId,
    staleBefore: staleBefore.toISOString(),
    batchSize: REPAIR_BATCH_SIZE,
  });

  const [candidateAnalyses, applicationScores] = await Promise.all([
    prisma.candidateCvAnalysis.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleBefore },
      },
      orderBy: { createdAt: "asc" },
      take: REPAIR_BATCH_SIZE,
      select: repairRecordSelect,
    }),
    prisma.applicationAiScore.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleBefore },
      },
      orderBy: { createdAt: "asc" },
      take: REPAIR_BATCH_SIZE,
      select: applicationScoreRepairSelect,
    }),
  ]);

  logWorker("AI repair scan completed", {
    repairRunId,
    candidateCvAnalyses: candidateAnalyses.length,
    applicationFitScores: applicationScores.length,
  });

  for (const analysis of candidateAnalyses) {
    const job = await enqueueCandidateCvAnalysisRepair(
      { analysisId: analysis.id },
      { repairRunId },
    );
    logWorker("candidate CV analysis repair enqueued", {
      repairRunId,
      analysisId: analysis.id,
      jobId: job.id,
    });
    await prisma.candidateCvAnalysis.update({
      where: { id: analysis.id },
      data: { queueJobId: job.id ?? `candidate-cv-analysis-${analysis.id}` },
    });
  }

  for (const score of applicationScores) {
    const job = await enqueueApplicationFitScoreRepair(
      { applicationAiScoreId: score.id },
      { repairRunId },
    );
    logWorker("application fit score repair enqueued", {
      repairRunId,
      applicationAiScoreId: score.id,
      jobId: job.id,
    });
    await prisma.applicationAiScore.update({
      where: { id: score.id },
      data: { queueJobId: job.id ?? `application-fit-score-${score.id}` },
    });
  }

  logWorker("AI repair job completed", {
    repairRunId,
    candidateCvAnalyses: candidateAnalyses.length,
    applicationFitScores: applicationScores.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    candidateCvAnalyses: candidateAnalyses.length,
    applicationFitScores: applicationScores.length,
  };
}
