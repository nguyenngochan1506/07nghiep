import type { PrismaClient } from "@07nghiep/db";
import { TRPCError } from "@trpc/server";

import { BILLING_PLAN_AI_CV_QUOTA_CODES, BILLING_PLAN_CODES } from "../billing/plans";

function getQuotaError() {
  return new TRPCError({
    code: "FORBIDDEN",
    message: "AI CV quota has been used for this billing period.",
  });
}

export async function reserveCandidateCvQuota(prisma: PrismaClient, userId: string) {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
      aiCvQuotaLimit: { gt: 0 },
      plan: { code: { in: BILLING_PLAN_AI_CV_QUOTA_CODES } },
    },
    orderBy: { currentPeriodEnd: "asc" },
    select: {
      id: true,
      aiCvQuotaLimit: true,
      aiCvQuotaUsed: true,
    },
  });
  const subscription = subscriptions.find((item) => {
    const limit = Math.max(item.aiCvQuotaLimit ?? 0, 0);
    const used = Math.max(item.aiCvQuotaUsed, 0);

    return limit - used > 0;
  });

  if (!subscription) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Candidate Plus is required to analyze CVs.",
    });
  }

  const limit = Math.max(subscription.aiCvQuotaLimit ?? 0, 0);
  const used = Math.max(subscription.aiCvQuotaUsed, 0);
  if (limit - used <= 0) {
    throw getQuotaError();
  }

  const reservation = await prisma.subscription.updateMany({
    where: {
      id: subscription.id,
      aiCvQuotaUsed: { lt: limit },
    },
    data: { aiCvQuotaUsed: { increment: 1 } },
  });

  if (reservation.count !== 1) {
    throw getQuotaError();
  }

  return subscription.id;
}

export async function hasActiveEmployerPackage(prisma: PrismaClient, userId: string) {
  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
      plan: { code: BILLING_PLAN_CODES.employerMonthly },
    },
    select: { id: true },
  });

  return Boolean(subscription);
}
