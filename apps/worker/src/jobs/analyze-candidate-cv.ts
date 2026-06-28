import type { AiCvProvider } from "@07nghiep/ai-cv/provider";
import type { Prisma, PrismaClient } from "@07nghiep/db";

import { refundCandidateCvQuota } from "../lib/quota";
import { errorWorker, logWorker, warnWorker } from "../lib/log";
import { extractPdfTextFromUrl } from "../lib/resume-text";

type WorkerPrisma = {
  candidateCvAnalysis: {
    findUnique(
      args: Prisma.CandidateCvAnalysisFindUniqueArgs,
    ): Promise<CandidateAnalysisRecord | null>;
    update(args: Prisma.CandidateCvAnalysisUpdateArgs): Promise<unknown>;
  };
  job: {
    findMany(args: Prisma.JobFindManyArgs): Promise<JobForProvider[]>;
  };
};

type CandidateAnalysisRecord = Prisma.CandidateCvAnalysisGetPayload<{
  include: { user: { include: { profile: true } } };
}>;

type JobForProvider = Prisma.JobGetPayload<{
  include: {
    organization: { select: { name: true } };
    skills: { select: { skill: true } };
  };
}>;

export type AiJobHandlerOptions = {
  finalAttempt?: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown AI CV analysis error.";
}

export async function handleAnalyzeCandidateCv(
  prisma: WorkerPrisma,
  provider: AiCvProvider,
  analysisId: string,
  options: AiJobHandlerOptions = {},
) {
  const startedAt = Date.now();
  logWorker("candidate CV analysis lookup started", { analysisId });

  const analysis = await prisma.candidateCvAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  if (!analysis) {
    warnWorker("candidate CV analysis skipped because record is missing", { analysisId });
    return;
  }

  if (analysis.status === "COMPLETED") {
    logWorker("candidate CV analysis skipped because it is already completed", { analysisId });
    return;
  }

  logWorker("candidate CV analysis marked processing", {
    analysisId,
    previousStatus: analysis.status,
  });
  await prisma.candidateCvAnalysis.update({
    where: { id: analysisId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      errorMessage: null,
      completedAt: null,
    },
  });

  try {
    logWorker("candidate CV resume extraction started", { analysisId });
    const resume = await extractPdfTextFromUrl(analysis.resumeUrl);
    logWorker("candidate CV resume extraction completed", {
      analysisId,
      textLength: resume.text.length,
    });

    logWorker("candidate CV open jobs lookup started", { analysisId, limit: 30 });
    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        organization: { select: { name: true } },
        skills: { select: { skill: true } },
      },
    });
    logWorker("candidate CV open jobs lookup completed", { analysisId, jobsCount: jobs.length });

    logWorker("candidate CV AI analysis started", {
      analysisId,
      jobsCount: jobs.length,
    });
    const result = await provider.analyzeCandidateCv({
      resumeText: resume.text,
      profile: {
        headline: analysis.user.profile?.headline ?? null,
        summary: analysis.user.profile?.summary ?? null,
        skills: analysis.user.profile?.skills ?? [],
        experience: analysis.user.profile?.experience ?? null,
        education: analysis.user.profile?.education ?? null,
      },
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        organizationName: job.organization.name,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills.map(({ skill }) => skill),
        location: job.location,
        workType: job.workType,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
      })),
    });
    logWorker("candidate CV AI analysis completed", {
      analysisId,
      overallScore: result.overallScore,
      recommendedMatchesCount: result.recommendedMatches.length,
    });

    await prisma.candidateCvAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETED",
        resumeTextHash: resume.hash,
        overallScore: result.overallScore,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        suggestions: result.suggestions,
        extractedSkills: result.extractedSkills,
        recommendedMatches: result.recommendedMatches,
        errorMessage: null,
        completedAt: new Date(),
      },
    });
    logWorker("candidate CV analysis persisted", {
      analysisId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (!options.finalAttempt) {
      errorWorker("candidate CV analysis attempt failed; BullMQ will retry", error, {
        analysisId,
      });
      await prisma.candidateCvAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "PROCESSING",
          errorMessage: getErrorMessage(error),
        },
      });
      throw error;
    }

    errorWorker("candidate CV analysis final attempt failed; refunding quota", error, {
      analysisId,
    });
    await refundCandidateCvQuota(prisma as unknown as PrismaClient, analysisId);
    await prisma.candidateCvAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
        completedAt: new Date(),
      },
    });
    logWorker("candidate CV analysis marked failed", {
      analysisId,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
