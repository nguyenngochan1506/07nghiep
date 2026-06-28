import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import { hasActiveEmployerPackage, reserveCandidateCvQuota } from "./quota";

describe("reserveCandidateCvQuota", () => {
  it("increments the active AI CV quota subscription that expires first", async () => {
    const subscription = {
      id: "sub_1",
      aiCvQuotaLimit: 3,
      aiCvQuotaUsed: 1,
    };
    const prisma = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([subscription]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).resolves.toEqual("sub_1");
    expect(prisma.subscription.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user_1",
        status: "ACTIVE",
        currentPeriodStart: { lte: expect.any(Date) },
        currentPeriodEnd: { gt: expect.any(Date) },
        aiCvQuotaLimit: { gt: 0 },
        plan: { code: { in: ["CANDIDATE_PLUS_MONTHLY", "CANDIDATE_AI_CV_CREDITS"] } },
      },
      orderBy: { currentPeriodEnd: "asc" },
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
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).rejects.toBeInstanceOf(
      TRPCError,
    );
  });

  it("rejects users with exhausted Candidate Plus quota", async () => {
    const prisma = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub_1",
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 3,
          },
        ]),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("uses AI CV credit add-on quota when Plus quota is exhausted", async () => {
    const subscription = {
      id: "credit_sub_1",
      aiCvQuotaLimit: 5,
      aiCvQuotaUsed: 2,
    };
    const prisma = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([subscription]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).resolves.toEqual(
      "credit_sub_1",
    );
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: "credit_sub_1",
        aiCvQuotaUsed: { lt: 5 },
      },
      data: { aiCvQuotaUsed: { increment: 1 } },
    });
  });

  it("rejects quota if a concurrent reservation already consumed it", async () => {
    const prisma = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "sub_1",
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 2,
          },
        ]),
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
