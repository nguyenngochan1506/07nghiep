import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { hasActiveEmployerPackage, reserveCandidateCvQuota } from "./quota";

describe("reserveCandidateCvQuota", () => {
  it("increments the newest active Candidate Plus subscription with remaining quota", async () => {
    const subscription = {
      id: "sub_1",
      aiCvQuotaLimit: 3,
      aiCvQuotaUsed: 1,
    };
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(subscription),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).resolves.toEqual("sub_1");
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        status: "ACTIVE",
        currentPeriodStart: { lte: expect.any(Date) },
        currentPeriodEnd: { gt: expect.any(Date) },
        plan: { code: "CANDIDATE_PLUS_MONTHLY" },
      },
      orderBy: { currentPeriodEnd: "desc" },
      select: {
        id: true,
        aiCvQuotaLimit: true,
        aiCvQuotaUsed: true,
      },
    });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: "sub_1",
        aiCvQuotaUsed: { lt: 3 },
      },
      data: { aiCvQuotaUsed: { increment: 1 } },
    });
  });

  it("rejects users without active Candidate Plus", async () => {
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it("rejects users with exhausted Candidate Plus quota", async () => {
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({
          id: "sub_1",
          aiCvQuotaLimit: 3,
          aiCvQuotaUsed: 3,
        }),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects quota if a concurrent reservation already consumed it", async () => {
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({
          id: "sub_1",
          aiCvQuotaLimit: 3,
          aiCvQuotaUsed: 2,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("hasActiveEmployerPackage", () => {
  it("returns true when the user has an active employer subscription", async () => {
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ id: "sub_1" }),
      },
    };

    await expect(hasActiveEmployerPackage(prisma as never, "user_1")).resolves.toBe(true);
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        status: "ACTIVE",
        currentPeriodStart: { lte: expect.any(Date) },
        currentPeriodEnd: { gt: expect.any(Date) },
        plan: { code: "EMPLOYER_MONTHLY" },
      },
      select: { id: true },
    });
  });
});
