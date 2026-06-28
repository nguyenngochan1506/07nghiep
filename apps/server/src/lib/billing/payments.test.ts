import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfillEmployerApplicationFitScores } from "../ai-cv/backfill";
import { createPayosCheckout, verifyPayosWebhookSignature } from "./payos";
import { createCheckoutPayment, createPayosOrderCode, getNextBillingPeriod, handlePayosWebhook } from "./payments";

vi.mock("./payos", async () => {
  const actual = await vi.importActual<typeof import("./payos")>("./payos");

  return {
    ...actual,
    createPayosCheckout: vi.fn(),
    verifyPayosWebhookSignature: vi.fn(),
  };
});

vi.mock("../notifications/service", () => ({
  createNotification: vi.fn(),
  escapeHtml: (value: string) => value,
}));

vi.mock("../ai-cv/backfill", () => ({
  backfillEmployerApplicationFitScores: vi.fn().mockResolvedValue({ created: 0 }),
}));

const mockedCreatePayosCheckout = vi.mocked(createPayosCheckout);
const mockedVerifyPayosWebhookSignature = vi.mocked(verifyPayosWebhookSignature);
const mockedBackfillEmployerApplicationFitScores = vi.mocked(backfillEmployerApplicationFitScores);

const fixedNow = new Date("2026-06-27T10:00:00.000Z");

function createWebhookBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      orderCode: 123456789012345,
      amount: 299000,
      code: "00",
      paymentLinkId: "plink_123",
    },
    signature: "valid-signature",
    ...overrides,
  };
}

function createMockPrisma(paymentOverrides: Record<string, unknown> = {}) {
  const plan = {
    id: "plan_employer",
    code: "EMPLOYER_MONTHLY",
    name: "Employer Monthly",
    priceVnd: 299000,
    durationDays: 30,
    active: true,
  };
  const payment = {
    id: "payment_1",
    userId: "user_1",
    planId: plan.id,
    businessApplicationId: "business_application_1",
    status: "PENDING",
    amountVnd: 299000,
    orderCode: 123456789012345n,
    paymentLinkId: null,
    plan,
    ...paymentOverrides,
  };
  const tx = {
    payment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...payment, ...data })),
    },
    subscription: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "subscription_1", ...data })),
    },
    user: {
      update: vi.fn().mockResolvedValue({ id: payment.userId, role: "EMPLOYER" }),
    },
    businessApplication: {
      findUnique: vi.fn().mockResolvedValue({
        id: "business_application_1",
        userId: "user_1",
        companyName: "Betodemy",
        website: "https://betodemy.com",
        industry: "Education Technology",
        companySize: "SMALL",
        foundedYear: 2024,
        location: "Ho Chi Minh",
        logoUrl: "https://cdn.example.com/logo.png",
        description: "Online education platform",
        taxCode: "0312345678",
        legalRepresentative: "Nguyen Van A",
        contactEmail: "hr@betodemy.com",
        contactPhone: "0867435475",
        legalDocumentUrls: ["https://cdn.example.com/legal/business-license.pdf"],
      }),
    },
    organization: {
      upsert: vi.fn().mockResolvedValue({ id: "organization_1", userId: payment.userId }),
    },
  };
  const prisma = {
    billingPlan: {
      findFirst: vi.fn().mockResolvedValue(plan),
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue(payment),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: "payment_1", ...data })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...payment, ...data })),
    },
    subscription: {
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
    },
    applicationAiScore: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => callback(tx)),
    __tx: tx,
  };

  return { prisma, payment, plan, tx };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mockedVerifyPayosWebhookSignature.mockReturnValue(true);
});

describe("getNextBillingPeriod", () => {
  it("starts a new period now when no active period exists", () => {
    const now = new Date("2026-06-27T10:00:00.000Z");
    const period = getNextBillingPeriod({ now, durationDays: 30, currentPeriodEnd: null });

    expect(period.currentPeriodStart).toEqual(now);
    expect(period.currentPeriodEnd).toEqual(new Date("2026-07-27T10:00:00.000Z"));
  });

  it("extends from current period end for early renewal", () => {
    const now = new Date("2026-06-27T10:00:00.000Z");
    const period = getNextBillingPeriod({
      now,
      durationDays: 30,
      currentPeriodEnd: new Date("2026-07-10T00:00:00.000Z"),
    });

    expect(period.currentPeriodStart).toEqual(new Date("2026-07-10T00:00:00.000Z"));
    expect(period.currentPeriodEnd).toEqual(new Date("2026-08-09T00:00:00.000Z"));
  });
});

describe("createPayosOrderCode", () => {
  it("returns a positive integer with at most 15 digits", () => {
    const orderCode = createPayosOrderCode(new Date("2026-06-27T10:00:00.000Z"));

    expect(Number.isInteger(orderCode)).toBe(true);
    expect(orderCode).toBeGreaterThan(0);
    expect(orderCode.toString()).toHaveLength(15);
  });
});

describe("createCheckoutPayment", () => {
  it("creates a pending payment from the active plan snapshot and payOS checkout", async () => {
    const { prisma, plan } = createMockPrisma();
    mockedCreatePayosCheckout.mockResolvedValue({
      checkoutUrl: "https://pay.payos.vn/checkout/123",
      paymentLinkId: "plink_123",
    });

    const payment = await createCheckoutPayment({
      prisma,
      userId: "user_1",
      planCode: "EMPLOYER_MONTHLY",
      businessApplicationId: "business_application_1",
      returnUrl: "https://example.com/return",
      cancelUrl: "https://example.com/cancel",
    });

    expect(prisma.billingPlan.findFirst).toHaveBeenCalledWith({
      where: { code: "EMPLOYER_MONTHLY", active: true },
    });
    expect(mockedCreatePayosCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: plan.priceVnd,
        cancelUrl: "https://example.com/cancel",
        returnUrl: "https://example.com/return",
      }),
    );
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amountVnd: plan.priceVnd,
        businessApplicationId: "business_application_1",
        checkoutUrl: "https://pay.payos.vn/checkout/123",
        orderCode: expect.any(BigInt),
        paymentLinkId: "plink_123",
        planId: plan.id,
        provider: "PAYOS",
        status: "PENDING",
        userId: "user_1",
      }),
    });
    expect(payment.status).toBe("PENDING");
  });
});

describe("handlePayosWebhook", () => {
  it("does not create a subscription for a duplicate paid webhook", async () => {
    const { prisma } = createMockPrisma({ status: "PAID" });

    const result = await handlePayosWebhook({ prisma, body: createWebhookBody() });

    expect(result).toEqual({ ok: true, paymentId: "payment_1", alreadyProcessed: true });
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { orderCode: 123456789012345n },
      include: { plan: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("marks amount mismatches as review required without creating a subscription", async () => {
    const { prisma, tx } = createMockPrisma({ amountVnd: 49000 });
    const body = createWebhookBody();

    const result = await handlePayosWebhook({ prisma, body });

    expect(result).toEqual({ ok: true, paymentId: "payment_1", status: "REVIEW_REQUIRED" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: "payment_1" },
      data: {
        status: "REVIEW_REQUIRED",
        providerPayload: body,
      },
    });
    expect(tx.subscription.create).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("creates an active subscription and updates the user role for an employer payment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const { prisma, tx, plan } = createMockPrisma();
    const body = createWebhookBody();

    const result = await handlePayosWebhook({ prisma, body });

    expect(result).toEqual({ ok: true, paymentId: "payment_1" });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: "payment_1" },
      data: {
        status: "PAID",
        paidAt: fixedNow,
        providerPayload: body,
        paymentLinkId: "plink_123",
      },
    });
    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: fixedNow,
        currentPeriodEnd: new Date("2026-07-27T10:00:00.000Z"),
        aiCvQuotaLimit: null,
        aiCvQuotaUsed: 0,
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { role: "EMPLOYER" },
    });
    expect(mockedBackfillEmployerApplicationFitScores).toHaveBeenCalledWith(prisma, "user_1");
  });

  it("creates a verified organization profile from the approved business application after employer payment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const { prisma, tx } = createMockPrisma();

    const result = await handlePayosWebhook({ prisma, body: createWebhookBody() });

    expect(result).toEqual({ ok: true, paymentId: "payment_1" });
    expect(tx.businessApplication.findUnique).toHaveBeenCalledWith({
      where: { id: "business_application_1" },
    });
    expect(tx.organization.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.objectContaining({
        userId: "user_1",
        name: "Betodemy",
        description: "Online education platform",
        website: "https://betodemy.com",
        industry: "Education Technology",
        companySize: "SMALL",
        foundedYear: 2024,
        location: "Ho Chi Minh",
        logoUrl: "https://cdn.example.com/logo.png",
        verified: true,
        verificationStatus: "VERIFIED",
        verificationNote: expect.stringContaining("0312345678"),
      }),
      update: expect.objectContaining({
        name: "Betodemy",
        verified: true,
        verificationStatus: "VERIFIED",
      }),
    });
  });

  it("creates a 5-use AI CV credit subscription for an add-on payment", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    const creditPlan = {
      id: "plan_ai_cv_credits",
      code: "CANDIDATE_AI_CV_CREDITS",
      name: "AI CV Credits",
      priceVnd: 19000,
      durationDays: 30,
      active: true,
    };
    const { prisma, tx } = createMockPrisma({
      planId: creditPlan.id,
      amountVnd: creditPlan.priceVnd,
      plan: creditPlan,
    });
    const body = createWebhookBody({
      data: {
        orderCode: 123456789012345,
        amount: 19000,
        code: "00",
        paymentLinkId: "plink_credits",
      },
    });

    const result = await handlePayosWebhook({ prisma, body });

    expect(result).toEqual({ ok: true, paymentId: "payment_1" });
    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        planId: creditPlan.id,
        status: "ACTIVE",
        currentPeriodStart: fixedNow,
        currentPeriodEnd: new Date("2026-07-27T10:00:00.000Z"),
        aiCvQuotaLimit: 5,
        aiCvQuotaUsed: 0,
      },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(mockedBackfillEmployerApplicationFitScores).not.toHaveBeenCalled();
  });
});
