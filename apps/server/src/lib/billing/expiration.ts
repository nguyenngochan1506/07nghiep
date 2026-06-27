import type { PrismaClient } from "@07nghiep/db";

export async function expireSubscriptions({
  prisma,
  now = new Date(),
}: {
  prisma: PrismaClient;
  now?: Date;
}) {
  const expiredEmployerSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lte: now },
      plan: { code: "EMPLOYER_MONTHLY" },
    },
    select: { userId: true },
  });

  const expired = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  const employerUserIds = Array.from(new Set(expiredEmployerSubscriptions.map((subscription) => subscription.userId)));
  let downgradedEmployers = 0;

  for (const userId of employerUserIds) {
    const activeEmployerSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
        plan: { code: "EMPLOYER_MONTHLY" },
      },
      select: { id: true },
    });

    if (activeEmployerSubscription) {
      continue;
    }

    const user = await prisma.user.updateMany({
      where: { id: userId, role: "EMPLOYER" },
      data: { role: "CANDIDATE" },
    });
    downgradedEmployers += user.count;
  }

  return {
    expiredSubscriptions: expired.count,
    downgradedEmployers,
  };
}
