import type { PrismaClient } from "@07nghiep/db";

export async function refundCandidateCvQuota(prisma: PrismaClient, analysisId: string) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claim = await tx.candidateCvAnalysis.updateMany({
      where: {
        id: analysisId,
        quotaReservedAt: { not: null },
        quotaRefundedAt: null,
      },
      data: { quotaRefundedAt: new Date() },
    });

    if (claim.count !== 1) {
      return;
    }

    const analysis = await tx.candidateCvAnalysis.findUnique({
      where: { id: analysisId },
      select: { userId: true },
    });

    if (!analysis) {
      return;
    }

    const subscription = await tx.subscription.findFirst({
      where: {
        userId: analysis.userId,
        status: "ACTIVE",
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
        aiCvQuotaUsed: { gt: 0 },
        plan: { code: "CANDIDATE_PLUS_MONTHLY" },
      },
      orderBy: { currentPeriodEnd: "desc" },
      select: { id: true },
    });

    if (subscription) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { aiCvQuotaUsed: { decrement: 1 } },
      });
    }
  });
}
