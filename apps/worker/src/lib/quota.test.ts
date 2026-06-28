import { describe, expect, it, vi } from "vitest";

import { refundCandidateCvQuota } from "./quota";

describe("refundCandidateCvQuota", () => {
  it("decrements the reserved quota subscription once", async () => {
    const tx = {
      candidateCvAnalysis: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi
          .fn()
          .mockResolvedValue({ userId: "user_1", quotaSubscriptionId: "credit_sub_1" }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ id: "sub_1" }),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await refundCandidateCvQuota(prisma as never, "analysis_1");

    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: { id: "credit_sub_1", aiCvQuotaUsed: { gt: 0 } },
      data: { aiCvQuotaUsed: { decrement: 1 } },
    });
    expect(tx.subscription.findFirst).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });

  it("falls back to the current active AI CV quota subscription for legacy analyses", async () => {
    const tx = {
      candidateCvAnalysis: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ userId: "user_1", quotaSubscriptionId: null }),
      },
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ id: "sub_1" }),
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await refundCandidateCvQuota(prisma as never, "analysis_1");

    expect(tx.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        status: "ACTIVE",
        currentPeriodStart: { lte: expect.any(Date) },
        currentPeriodEnd: { gt: expect.any(Date) },
        aiCvQuotaUsed: { gt: 0 },
        plan: { code: { in: ["CANDIDATE_PLUS_MONTHLY", "CANDIDATE_AI_CV_CREDITS"] } },
      },
      orderBy: { currentPeriodEnd: "desc" },
      select: { id: true },
    });
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: { aiCvQuotaUsed: { decrement: 1 } },
    });
  });

  it("does not decrement quota when refund was already claimed", async () => {
    const tx = {
      candidateCvAnalysis: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      subscription: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback) => callback(tx)),
    };

    await refundCandidateCvQuota(prisma as never, "analysis_1");

    expect(tx.candidateCvAnalysis.updateMany).toHaveBeenCalledWith({
      where: {
        id: "analysis_1",
        quotaReservedAt: { not: null },
        quotaRefundedAt: null,
      },
      data: { quotaRefundedAt: expect.any(Date) },
    });
    expect(tx.subscription.findFirst).not.toHaveBeenCalled();
    expect(tx.subscription.update).not.toHaveBeenCalled();
  });
});
