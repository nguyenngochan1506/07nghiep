import { verifyPassword } from "better-auth/crypto";
import { describe, expect, it, vi } from "vitest";
import { adminUserRouter } from "./user";

function createCtx(overrides?: {
  user?: { id: string; emailVerified?: boolean } | null;
  credentialAccount?: { id: string } | null;
  subscription?: {
    id: string;
    userId: string;
    planId: string;
    plan: { code: "CANDIDATE_PLUS_MONTHLY" | "CANDIDATE_AI_CV_CREDITS" | "EMPLOYER_MONTHLY" };
  } | null;
  activeEmployerSubscription?: { id: string } | null;
}) {
  const subscription = Object.hasOwn(overrides ?? {}, "subscription")
    ? overrides?.subscription
    : {
        id: "subscription-1",
        userId: "user-1",
        planId: "plan-plus",
        plan: { code: "CANDIDATE_PLUS_MONTHLY" as const },
      };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(overrides?.user ?? { id: "user-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    billingPlan: {
      findUnique: vi.fn().mockResolvedValue({ id: "plan-plus" }),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(subscription),
      update: vi.fn().mockImplementation(async ({ data }) => ({ id: "subscription-1", ...data })),
      findFirst: vi
        .fn()
        .mockResolvedValue(
          Object.hasOwn(overrides ?? {}, "activeEmployerSubscription")
            ? overrides?.activeEmployerSubscription
            : null,
        ),
    },
    account: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          Object.hasOwn(overrides ?? {}, "credentialAccount")
            ? overrides?.credentialAccount
            : { id: "account-1" },
        ),
      update: vi.fn().mockResolvedValue({ id: "account-1" }),
      create: vi.fn().mockResolvedValue({ id: "account-1" }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    verification: {
      create: vi.fn(),
    },
  };

  return {
    ctx: {
      session: { user: { id: "admin-1", role: "ADMIN" } },
      user: { id: "admin-1", role: "ADMIN" },
      role: "ADMIN",
      prisma,
    } as never,
    prisma,
  };
}

describe("adminUserRouter", () => {
  it("sets a new credential password and revokes existing sessions", async () => {
    const { ctx, prisma } = createCtx();

    const result = await adminUserRouter.createCaller(ctx).resetPassword({
      userId: "user-1",
      password: "FreshPass123!",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { password: expect.any(String) },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.verification.create).not.toHaveBeenCalled();

    const updatePayload = prisma.account.update.mock.calls[0]?.[0];
    if (!updatePayload) {
      throw new Error("Expected credential account password update");
    }
    const savedPassword = updatePayload.data.password;
    expect(savedPassword).not.toBe("FreshPass123!");
    await expect(verifyPassword({ hash: savedPassword, password: "FreshPass123!" })).resolves.toBe(
      true,
    );
  });

  it("creates a credential account when the user only has social login", async () => {
    const { ctx, prisma } = createCtx({ credentialAccount: null });

    await adminUserRouter.createCaller(ctx).resetPassword({
      userId: "user-1",
      password: "FreshPass123!",
    });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        userId: "user-1",
        accountId: "user-1",
        providerId: "credential",
        password: expect.any(String),
      },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("cancels a user subscription and ends the current period immediately", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T08:00:00.000Z"));
    const { ctx, prisma } = createCtx();

    const result = await adminUserRouter.createCaller(ctx).cancelSubscription({
      userId: "user-1",
      subscriptionId: "subscription-1",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      include: { plan: { select: { code: true } } },
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: {
        status: "CANCELLED",
        currentPeriodEnd: new Date("2026-06-29T08:00:00.000Z"),
      },
    });

    vi.useRealTimers();
  });

  it("updates a user subscription plan, period, status and AI CV quota", async () => {
    const { ctx, prisma } = createCtx();
    const currentPeriodStart = new Date("2026-07-01T00:00:00.000Z");
    const currentPeriodEnd = new Date("2026-08-01T00:00:00.000Z");

    const result = await adminUserRouter.createCaller(ctx).updateSubscription({
      userId: "user-1",
      subscriptionId: "subscription-1",
      planId: "plan-plus",
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      aiCvQuotaLimit: 10,
      aiCvQuotaUsed: 2,
    });

    expect(result).toEqual({ success: true });
    expect(prisma.billingPlan.findUnique).toHaveBeenCalledWith({
      where: { id: "plan-plus" },
      select: { id: true, code: true },
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "subscription-1" },
      data: {
        planId: "plan-plus",
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
        aiCvQuotaLimit: 10,
        aiCvQuotaUsed: 2,
      },
    });
  });

  it("downgrades an employer after cancelling their last active employer subscription", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T08:00:00.000Z"));
    const { ctx, prisma } = createCtx({
      subscription: {
        id: "subscription-1",
        userId: "user-1",
        planId: "plan-employer",
        plan: { code: "EMPLOYER_MONTHLY" },
      },
      activeEmployerSubscription: null,
    });

    await adminUserRouter.createCaller(ctx).cancelSubscription({
      userId: "user-1",
      subscriptionId: "subscription-1",
    });

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "ACTIVE",
        currentPeriodStart: { lte: new Date("2026-06-29T08:00:00.000Z") },
        currentPeriodEnd: { gt: new Date("2026-06-29T08:00:00.000Z") },
        plan: { code: "EMPLOYER_MONTHLY" },
      },
      select: { id: true },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", role: "EMPLOYER" },
      data: { role: "CANDIDATE" },
    });

    vi.useRealTimers();
  });
});
