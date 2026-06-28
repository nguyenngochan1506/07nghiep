import type { BillingPlanCode, PrismaClient } from "@07nghiep/db";

const AI_CV_QUOTA_PLAN_CODES: BillingPlanCode[] = [
  "CANDIDATE_PLUS_MONTHLY",
  "CANDIDATE_AI_CV_CREDITS",
];

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
      select: { userId: true, quotaSubscriptionId: true },
    });

    if (!analysis) {
      return;
    }

    if (analysis.quotaSubscriptionId) {
      await tx.subscription.updateMany({
        where: { id: analysis.quotaSubscriptionId, aiCvQuotaUsed: { gt: 0 } },
        data: { aiCvQuotaUsed: { decrement: 1 } },
      });
      return;
    }

    const subscription = await tx.subscription.findFirst({
      where: {
        userId: analysis.userId,
        status: "ACTIVE",
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
        aiCvQuotaUsed: { gt: 0 },
        plan: { code: { in: AI_CV_QUOTA_PLAN_CODES } },
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
