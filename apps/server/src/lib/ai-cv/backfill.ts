import type { Prisma } from "@07nghiep/db";
import { enqueueApplicationFitSafely } from "./enqueue";

export type BackfillPrisma = {
  application: {
    findMany(args: Prisma.ApplicationFindManyArgs): Promise<{ id: string }[]>;
  };
  applicationAiScore: {
    create(args: Prisma.ApplicationAiScoreCreateArgs): Promise<{ id: string }>;
    update(args: Prisma.ApplicationAiScoreUpdateArgs): Promise<unknown>;
  };
};

export async function backfillEmployerApplicationFitScores(
  prisma: BackfillPrisma,
  employerUserId: string,
) {
  const applications = await prisma.application.findMany({
    where: {
      job: {
        organization: {
          userId: employerUserId,
        },
      },
      aiScore: null,
    },
    select: { id: true },
  });

  let created = 0;

  for (const application of applications) {
    try {
      const score = await prisma.applicationAiScore.create({
        data: {
          applicationId: application.id,
          status: "PENDING",
          matchedSkills: [],
          missingSkills: [],
        },
        select: { id: true },
      });

      created += 1;
      await enqueueApplicationFitSafely(prisma, score.id);
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  return { created };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Pick<Prisma.PrismaClientKnownRequestError, "code">).code === "P2002"
  );
}
