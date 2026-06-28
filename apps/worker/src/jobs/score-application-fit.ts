import type { AiCvProvider } from "@07nghiep/ai-cv/provider";
import type { Prisma } from "@07nghiep/db";

import { extractPdfTextFromUrl } from "../lib/resume-text";

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

export async function handleScoreApplicationFit(
  prisma: WorkerPrisma,
  provider: AiCvProvider,
  applicationAiScoreId: string,
  options: AiJobHandlerOptions = {},
) {
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

  if (!score || score.status === "COMPLETED") {
    return;
  }

  const resumeUrl = score.application.resumeUrl ?? score.application.candidate.profile?.resumeUrl;

  if (!resumeUrl) {
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
    const resume = await extractPdfTextFromUrl(resumeUrl);
    const { application } = score;
    const result = await provider.scoreApplicationFit({
      resumeText: resume.text,
      coverLetter: application.coverLetter,
      profile: {
        headline: application.candidate.profile?.headline ?? null,
        summary: application.candidate.profile?.summary ?? null,
        skills: application.candidate.profile?.skills ?? [],
        experience: application.candidate.profile?.experience ?? null,
        education: application.candidate.profile?.education ?? null,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        organizationName: application.job.organization.name,
        description: application.job.description,
        requirements: application.job.requirements,
        skills: application.job.skills.map(({ skill }: SkillRecord) => skill),
        location: application.job.location,
        workType: application.job.workType,
        jobType: application.job.jobType,
        experienceLevel: application.job.experienceLevel,
      },
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
  } catch (error) {
    if (!options.finalAttempt) {
      await prisma.applicationAiScore.update({
        where: { id: applicationAiScoreId },
        data: {
          status: "PROCESSING",
          errorMessage: getErrorMessage(error),
        },
      });
      throw error;
    }

    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: {
        status: "FAILED",
        errorMessage: getErrorMessage(error),
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
