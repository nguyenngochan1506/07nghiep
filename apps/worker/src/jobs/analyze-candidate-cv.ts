import type { AiCvProvider } from "@07nghiep/ai-cv/provider";
import type { Prisma, PrismaClient } from "@07nghiep/db";

import { refundCandidateCvQuota } from "../lib/quota";
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
  const analysis = await prisma.candidateCvAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  if (!analysis || analysis.status === "COMPLETED") {
    return;
  }

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
    const resume = await extractPdfTextFromUrl(analysis.resumeUrl);
    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 30,
      include: {
        organization: { select: { name: true } },
        skills: { select: { skill: true } },
      },
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
  } catch (error) {
    if (!options.finalAttempt) {
      await prisma.candidateCvAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "PROCESSING",
          errorMessage: getErrorMessage(error),
        },
      });
      throw error;
    }

    await refundCandidateCvQuota(prisma as unknown as PrismaClient, analysisId);
    await prisma.candidateCvAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
