import type { AiCvProvider } from "@07nghiep/ai-cv/provider";
import type { Prisma } from "@07nghiep/db";

import { errorWorker, logWorker, warnWorker } from "../lib/log";
import { extractResumeTextFromUrl } from "../lib/resume-text";

type WorkerPrisma = {
  applicationAiScore: {
    findUnique(
      args: Prisma.ApplicationAiScoreFindUniqueArgs,
    ): Promise<ApplicationAiScoreRecord | null>;
    update(args: Prisma.ApplicationAiScoreUpdateArgs): Promise<unknown>;
  };
};

type SkillRecord = { skill: string };

type ApplicationAiScoreRecord = Prisma.ApplicationAiScoreGetPayload<{
  include: {
    application: {
      include: {
        candidate: { include: { profile: true } };
        job: {
          include: {
            organization: { select: { name: true } };
            skills: { select: { skill: true } };
          };
        };
      };
    };
  };
}>;

export type AiJobHandlerOptions = {
  finalAttempt?: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown application fit scoring error.";
}

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value ? value.toString() : null;
}

export async function handleScoreApplicationFit(
  prisma: WorkerPrisma,
  provider: AiCvProvider,
  applicationAiScoreId: string,
  options: AiJobHandlerOptions = {},
) {
  const startedAt = Date.now();
  logWorker("application fit score lookup started", { applicationAiScoreId });

  const score = await prisma.applicationAiScore.findUnique({
    where: { id: applicationAiScoreId },
    include: {
      application: {
        include: {
          candidate: { include: { profile: true } },
          job: {
            include: {
              organization: { select: { name: true } },
              skills: { select: { skill: true } },
            },
          },
        },
      },
    },
  });

  if (!score) {
    warnWorker("application fit score skipped because record is missing", {
      applicationAiScoreId,
    });
    return;
  }

  if (score.status === "COMPLETED") {
    logWorker("application fit score skipped because it is already completed", {
      applicationAiScoreId,
    });
    return;
  }

  const resumeUrl = score.application.resumeUrl ?? score.application.candidate.profile?.resumeUrl;

  if (!resumeUrl) {
    warnWorker("application fit score failed because resume URL is missing", {
      applicationAiScoreId,
      applicationId: score.applicationId,
    });
    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: {
        status: "FAILED",
        errorMessage: "Application does not have a resume URL.",
        completedAt: new Date(),
      },
    });
    return;
  }

  logWorker("application fit score marked processing", {
    applicationAiScoreId,
    applicationId: score.applicationId,
    jobId: score.application.jobId,
    previousStatus: score.status,
  });
  await prisma.applicationAiScore.update({
    where: { id: applicationAiScoreId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      errorMessage: null,
      completedAt: null,
    },
  });

  try {
    logWorker("application fit resume extraction started", {
      applicationAiScoreId,
      applicationId: score.applicationId,
    });
    const resume = await extractResumeTextFromUrl(resumeUrl);
    logWorker("application fit resume extraction completed", {
      applicationAiScoreId,
      textLength: resume.text.length,
    });

    const { application } = score;
    logWorker("application fit AI scoring started", {
      applicationAiScoreId,
      applicationId: application.id,
      jobId: application.job.id,
    });
    const result = await provider.scoreApplicationFit({
      resumeText: resume.text,
      coverLetter: application.coverLetter,
      profile: {
        headline: application.candidate.profile?.headline ?? null,
        summary: application.candidate.profile?.summary ?? null,
        skills: application.candidate.profile?.skills ?? [],
        experience: application.candidate.profile?.experience ?? null,
        education: application.candidate.profile?.education ?? null,
        location: application.candidate.profile?.location ?? null,
        portfolioUrl: application.candidate.profile?.portfolioUrl ?? null,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        organizationName: application.job.organization.name,
        description: application.job.description,
        requirements: application.job.requirements,
        benefits: application.job.benefits,
        skills: application.job.skills.map(({ skill }: SkillRecord) => skill),
        location: application.job.location,
        workType: application.job.workType,
        jobType: application.job.jobType,
        experienceLevel: application.job.experienceLevel,
        industry: application.job.industry,
        salaryMin: decimalToString(application.job.salaryMin),
        salaryMax: decimalToString(application.job.salaryMax),
        salaryCurrency: application.job.salaryCurrency,
        salaryUnit: application.job.salaryUnit,
        salaryNegotiable: application.job.salaryNegotiable,
        experienceMonths: application.job.experienceMonths,
        applicantLocation: application.job.applicantLocation,
        sourceSite: application.job.sourceSite,
      },
    });
    logWorker("application fit AI scoring completed", {
      applicationAiScoreId,
      score: result.score,
      recommendation: result.recommendation,
    });

    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: {
        status: "COMPLETED",
        score: result.score,
        recommendation: result.recommendation,
        summary: result.summary,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        risks: result.risks,
        reasoning: result.reasoning,
        errorMessage: null,
        completedAt: new Date(),
      },
    });
    logWorker("application fit score persisted", {
      applicationAiScoreId,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    if (!options.finalAttempt) {
      errorWorker("application fit score attempt failed; BullMQ will retry", error, {
        applicationAiScoreId,
      });
      await prisma.applicationAiScore.update({
        where: { id: applicationAiScoreId },
        data: {
          status: "PROCESSING",
          errorMessage: getErrorMessage(error),
        },
      });
      throw error;
    }

    errorWorker("application fit score final attempt failed", error, {
      applicationAiScoreId,
    });
    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
        completedAt: new Date(),
      },
    });
    logWorker("application fit score marked failed", {
      applicationAiScoreId,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
