import { beforeEach, describe, expect, it, vi } from "vitest";

import { billingRouter } from "./billing";
import { createCheckoutPayment } from "../lib/billing/payments";

vi.mock("../lib/billing/payments", () => ({
  createCheckoutPayment: vi.fn(),
}));

const mockedCreateCheckoutPayment = vi.mocked(createCheckoutPayment);

function createCtx(prisma: unknown) {
  return {
    session: null,
    user: null,
    role: undefined,
    prisma,
  } as never;
}

function createAuthedCtx(prisma: unknown, role: "CANDIDATE" | "EMPLOYER" = "CANDIDATE") {
  return {
    session: { user: { id: "user_1" } },
    user: { id: "user_1" },
    role,
    prisma,
  } as never;
}

describe("billingRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active billing plans for pricing pages", async () => {
    const plans = [
      {
        code: "CANDIDATE_PLUS_MONTHLY",
        name: "Candidate Plus Monthly",
        priceVnd: 79000,
        durationDays: 30,
      },
      {
        code: "EMPLOYER_MONTHLY",
        name: "Employer Monthly",
        priceVnd: 299000,
        durationDays: 30,
      },
      {
        code: "CANDIDATE_AI_CV_CREDITS",
        name: "AI CV Credits",
        priceVnd: 19000,
        durationDays: 30,
      },
    ];
    const prisma = {
      billingPlan: {
        findMany: vi.fn().mockResolvedValue(plans),
      },
    };

    const result = await billingRouter.createCaller(createCtx(prisma)).plans();

    expect(result).toEqual(plans);
    expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { code: true, name: true, priceVnd: true, durationDays: true },
      orderBy: { code: "asc" },
    });
  });

  it("creates a Candidate Plus checkout that returns to the candidate app", async () => {
    mockedCreateCheckoutPayment.mockResolvedValue({
      id: "payment_plus",
      checkoutUrl: "https://pay.payos.vn/checkout/plus",
      orderCode: 123456789012345n,
      status: "PENDING",
    });

    const result = await billingRouter.createCaller(createAuthedCtx({})).createCandidatePlusCheckout();

    expect(mockedCreateCheckoutPayment).toHaveBeenCalledWith({
      prisma: {},
      userId: "user_1",
      planCode: "CANDIDATE_PLUS_MONTHLY",
      returnUrl: "http://localhost:3003/billing/return",
      cancelUrl: "http://localhost:3003/billing/return",
    });
    expect(result.checkoutUrl).toBe("https://pay.payos.vn/checkout/plus");
  });

  it("creates a checkout for Candidate AI CV credit add-ons", async () => {
    const prisma = {
      subscription: {
        findMany: vi.fn().mockResolvedValue([
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 3,
          },
        ]),
      },
    };
    mockedCreateCheckoutPayment.mockResolvedValue({
      id: "payment_credits",
      checkoutUrl: "https://pay.payos.vn/checkout/credits",
      orderCode: 123456789012345n,
      status: "PENDING",
    });

    const result = await billingRouter
      .createCaller(createAuthedCtx(prisma))
      .createCandidateAiCvCreditsCheckout();

    expect(prisma.subscription.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      include: { plan: { select: { code: true } } },
    });
    expect(mockedCreateCheckoutPayment).toHaveBeenCalledWith({
      prisma,
      userId: "user_1",
      planCode: "CANDIDATE_AI_CV_CREDITS",
      returnUrl: "http://localhost:3003/cv-analysis",
      cancelUrl: "http://localhost:3003/cv-analysis",
    });
    expect(result).toEqual({
      paymentId: "payment_credits",
      checkoutUrl: "https://pay.payos.vn/checkout/credits",
      orderCode: "123456789012345",
    });
  });

  it("creates an employer checkout that returns to the employer app", async () => {
    mockedCreateCheckoutPayment.mockResolvedValue({
      id: "payment_employer",
      checkoutUrl: "https://pay.payos.vn/checkout/employer",
      orderCode: 123456789012345n,
      status: "PENDING",
    });

    const result = await billingRouter
      .createCaller(createAuthedCtx({}, "EMPLOYER"))
      .createEmployerCheckout();

    expect(mockedCreateCheckoutPayment).toHaveBeenCalledWith({
      prisma: {},
      userId: "user_1",
      planCode: "EMPLOYER_MONTHLY",
      returnUrl: "http://localhost:3002/billing",
      cancelUrl: "http://localhost:3002/billing",
    });
    expect(result.checkoutUrl).toBe("https://pay.payos.vn/checkout/employer");
  });
});
