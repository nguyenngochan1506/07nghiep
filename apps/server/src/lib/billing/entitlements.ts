import type { BillingPlanCode, SubscriptionStatus } from "@07nghiep/db";
import { BILLING_PLAN_CODES } from "./plans";

export type EntitlementSubscription = {
  plan: { code: BillingPlanCode };
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  aiCvQuotaLimit: number | null;
  aiCvQuotaUsed: number;
};

export type BillingEntitlements = {
  candidatePlus: boolean;
  employer: boolean;
  aiCvRemaining: number;
};

function isActive(subscription: EntitlementSubscription, now: Date) {
  return (
    subscription.status === "ACTIVE" &&
    subscription.currentPeriodStart <= now &&
    now < subscription.currentPeriodEnd
  );
}

function getRemainingQuota(subscription: EntitlementSubscription) {
  const limit = Math.max(subscription.aiCvQuotaLimit ?? 0, 0);
  const used = Math.max(subscription.aiCvQuotaUsed, 0);

  return Math.max(limit - used, 0);
}

export function getActiveEntitlements(
  subscriptions: EntitlementSubscription[],
  now = new Date(),
): BillingEntitlements {
  const activeSubscriptions = subscriptions.filter((subscription) => isActive(subscription, now));
  const plusSubscriptions = activeSubscriptions.filter(
    (subscription) => subscription.plan.code === BILLING_PLAN_CODES.candidatePlusMonthly,
  );
  const employer = activeSubscriptions.some(
    (subscription) => subscription.plan.code === BILLING_PLAN_CODES.employerMonthly,
  );

  const aiCvRemaining = plusSubscriptions.reduce(
    (total, subscription) => total + getRemainingQuota(subscription),
    0,
  );

  return {
    candidatePlus: plusSubscriptions.length > 0,
    employer,
    aiCvRemaining,
  };
}

export function canUseAiCv(entitlements: BillingEntitlements) {
  return entitlements.candidatePlus && entitlements.aiCvRemaining > 0;
}
