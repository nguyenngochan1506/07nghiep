import type { Prisma, PrismaClient } from "@07nghiep/db";
import {
  enqueueApplicationFitScore,
  enqueueApplicationFitScoreRepair,
  enqueueCandidateCvAnalysis,
} from "@07nghiep/queue";

export async function enqueueCandidateAnalysisSafely(prisma: PrismaClient, analysisId: string) {
  try {
    const job = await enqueueCandidateCvAnalysis({ analysisId });
    await prisma.candidateCvAnalysis.update({
      where: { id: analysisId },
      data: { queueJobId: String(job.id) },
    });
  } catch (error) {
    console.error("Failed to enqueue candidate CV analysis", { analysisId, error });
  }
}

export async function enqueueApplicationFitSafely(
  prisma: {
    applicationAiScore: {
      update(args: Prisma.ApplicationAiScoreUpdateArgs): Promise<unknown>;
    };
  },
  applicationAiScoreId: string,
) {
  try {
    const job = await enqueueApplicationFitScore({ applicationAiScoreId });
    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: { queueJobId: String(job.id) },
    });
  } catch (error) {
    console.error("Failed to enqueue application fit score", { applicationAiScoreId, error });
  }
}

export async function enqueueApplicationFitRetrySafely(
  prisma: PrismaClient,
  applicationAiScoreId: string,
) {
  try {
    const job = await enqueueApplicationFitScoreRepair(
      { applicationAiScoreId },
      { repairRunId: new Date().toISOString() },
    );
    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: { queueJobId: String(job.id) },
    });
  } catch (error) {
    console.error("Failed to enqueue application fit score retry", {
      applicationAiScoreId,
      error,
    });
  }
}
