import {
  enqueueApplicationFitScoreRepair,
  enqueueCandidateCvAnalysisRepair,
} from "@07nghiep/queue";
import type { Prisma, PrismaClient } from "@07nghiep/db";

const repairRecordSelect = { id: true } satisfies Prisma.CandidateCvAnalysisSelect;
const applicationScoreRepairSelect = { id: true } satisfies Prisma.ApplicationAiScoreSelect;

type WorkerPrisma = Pick<PrismaClient, "applicationAiScore" | "candidateCvAnalysis">;

const STALE_PENDING_MS = 5 * 60 * 1000;
const REPAIR_BATCH_SIZE = 50;

export async function repairPendingAiJobs(prisma: WorkerPrisma, now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_PENDING_MS);
  const repairRunId = now.toISOString();
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

  for (const analysis of candidateAnalyses) {
    const job = await enqueueCandidateCvAnalysisRepair(
      { analysisId: analysis.id },
      { repairRunId },
    );
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
    await prisma.applicationAiScore.update({
      where: { id: score.id },
      data: { queueJobId: job.id ?? `application-fit-score-${score.id}` },
    });
  }

  return {
    candidateCvAnalyses: candidateAnalyses.length,
    applicationFitScores: applicationScores.length,
  };
}
