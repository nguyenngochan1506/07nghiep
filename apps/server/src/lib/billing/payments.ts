import { randomInt } from "node:crypto";
import type { BillingPlanCode, Prisma } from "@07nghiep/db";
import { BILLING_PLAN_AI_CV_QUOTA } from "./plans";
import { createPayosCheckout, verifyPayosWebhookSignature } from "./payos";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAYOS_TIMESTAMP_DIGITS = 10;
const PAYOS_RANDOM_DIGITS = 5;
const PAYOS_TIMESTAMP_MODULO = 10 ** PAYOS_TIMESTAMP_DIGITS;
const PAYOS_RANDOM_MODULO = 10 ** PAYOS_RANDOM_DIGITS;

type BillingPlanRecord = {
  id: string;
  code: BillingPlanCode;
  name: string;
  priceVnd: number;
  durationDays: number;
  active: boolean;
};

type PaymentStatusValue = "PENDING" | "PAID" | "CANCELLED" | "FAILED" | "REVIEW_REQUIRED";

type PaymentWithPlan = {
  id: string;
  userId: string;
  planId: string;
  businessApplicationId: string | null;
  amountVnd: number;
  status: PaymentStatusValue;
  paymentLinkId: string | null;
  plan: BillingPlanRecord;
};

type BusinessApplicationRecord = {
  id: string;
  userId: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  companySize: "STARTUP" | "SMALL" | "MEDIUM" | "LARGE" | "ENTERPRISE" | null;
  foundedYear: number | null;
  location: string | null;
  logoUrl: string | null;
  description: string | null;
  taxCode: string | null;
  legalRepresentative: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  legalDocumentUrls: string[];
};

type PaymentCreateResult = {
  id: string;
  checkoutUrl: string;
  orderCode: bigint;
  status: PaymentStatusValue;
  [key: string]: unknown;
};

type BillingTransaction = {
  payment: {
    findUnique(args: any): Promise<PaymentWithPlan | null>;
    update(args: any): Promise<unknown>;
  };
  subscription: {
    findFirst(args: any): Promise<{ currentPeriodEnd: Date } | null>;
    create(args: any): Promise<unknown>;
  };
  user: {
    update(args: any): Promise<unknown>;
  };
  businessApplication: {
    findUnique(args: any): Promise<BusinessApplicationRecord | null>;
  };
  organization: {
    upsert(args: any): Promise<unknown>;
  };
};

type BillingPrisma = {
  billingPlan: {
    findFirst(args: { where: { code: BillingPlanCode; active: true } }): Promise<BillingPlanRecord | null>;
  };
  payment: {
    findUnique(args: {
      where: { orderCode: bigint };
      include: { plan: true };
    }): Promise<PaymentWithPlan | null>;
    create(args: {
      data: {
        userId: string;
        planId: string;
        businessApplicationId?: string;
        provider: "PAYOS";
        orderCode: bigint;
        paymentLinkId: string;
        checkoutUrl: string;
        amountVnd: number;
        status: "PENDING";
        providerPayload: Prisma.InputJsonValue;
      };
    }): Promise<PaymentCreateResult>;
  };
  $transaction: any;
};

export type CreateCheckoutPaymentInput = {
  prisma: BillingPrisma;
  userId: string;
  planCode: BillingPlanCode;
  businessApplicationId?: string;
  returnUrl: string;
  cancelUrl: string;
};

export type PayosWebhookBody = {
  success?: boolean;
  signature?: string;
  data?: {
    orderCode?: number | string;
    amount?: number | string;
    code?: string;
    paymentLinkId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type PayosWebhookResult =
  | { ok: false; reason: "INVALID_PAYLOAD" }
  | { ok: false; reason: "INVALID_SIGNATURE" }
  | { ok: false; reason: "MISSING_ORDER_CODE" }
  | { ok: false; reason: "UNKNOWN_ORDER_CODE" }
  | { ok: true; paymentId: string; alreadyProcessed: true }
  | { ok: true; paymentId: string; status: "REVIEW_REQUIRED" | "FAILED" }
  | { ok: true; paymentId: string };

export function getNextBillingPeriod({
  now = new Date(),
  durationDays,
  currentPeriodEnd,
}: {
  now?: Date;
  durationDays: number;
  currentPeriodEnd: Date | null;
}) {
  const currentEndIsFuture = currentPeriodEnd ? currentPeriodEnd > now : false;
  const currentPeriodStart = currentEndIsFuture && currentPeriodEnd ? currentPeriodEnd : now;
  const currentPeriodEndNext = new Date(currentPeriodStart.getTime() + durationDays * DAY_MS);

  return {
    currentPeriodStart,
    currentPeriodEnd: currentPeriodEndNext,
  };
}

export function createPayosOrderCode(now = new Date()) {
  const timestampPart = (now.getTime() % PAYOS_TIMESTAMP_MODULO).toString().padStart(PAYOS_TIMESTAMP_DIGITS, "0");
  const randomPart = randomInt(0, PAYOS_RANDOM_MODULO).toString().padStart(PAYOS_RANDOM_DIGITS, "0");

  return Math.max(1, Number(`${timestampPart}${randomPart}`));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOrderCode(data: Record<string, unknown>) {
  const rawOrderCode = data.orderCode;

  if (typeof rawOrderCode === "number" && Number.isSafeInteger(rawOrderCode) && rawOrderCode > 0) {
    return BigInt(rawOrderCode);
  }

  if (typeof rawOrderCode === "string" && /^[1-9]\d*$/.test(rawOrderCode)) {
    return BigInt(rawOrderCode);
  }

  return null;
}

function getAmount(data: Record<string, unknown>) {
  const rawAmount = data.amount;

  if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
    return rawAmount;
  }

  if (typeof rawAmount === "string" && /^\d+$/.test(rawAmount)) {
    return Number(rawAmount);
  }

  return null;
}

function getPaymentLinkId(data: Record<string, unknown>, fallback: string | null) {
  return typeof data.paymentLinkId === "string" && data.paymentLinkId.length > 0 ? data.paymentLinkId : fallback;
}

function getAiCvQuotaLimit(planCode: BillingPlanCode) {
  return BILLING_PLAN_AI_CV_QUOTA[planCode] ?? null;
}

function getWebhookPayload(body: unknown) {
  if (!isRecord(body) || !isRecord(body.data) || typeof body.signature !== "string" || body.signature.length === 0) {
    return null;
  }

  return {
    body: body as PayosWebhookBody,
    data: body.data,
    signature: body.signature,
  };
}

function buildBusinessVerificationNote(application: BusinessApplicationRecord) {
  const parts = [
    application.taxCode ? `MST: ${application.taxCode}` : null,
    application.legalRepresentative ? `Đại diện: ${application.legalRepresentative}` : null,
    application.contactEmail ? `Email: ${application.contactEmail}` : null,
    application.contactPhone ? `SĐT: ${application.contactPhone}` : null,
    `Tài liệu pháp lý: ${application.legalDocumentUrls.length}`,
  ].filter(Boolean);

  return `Đã xác minh qua yêu cầu doanh nghiệp. ${parts.join(" | ")}`;
}

async function upsertVerifiedOrganizationFromBusinessApplication({
  tx,
  payment,
}: {
  tx: BillingTransaction;
  payment: PaymentWithPlan;
}) {
  if (!payment.businessApplicationId) {
    return;
  }

  const application = await tx.businessApplication.findUnique({
    where: { id: payment.businessApplicationId },
  });

  if (!application) {
    return;
  }

  const rawPayload = {
    businessApplicationId: application.id,
    taxCode: application.taxCode,
    legalRepresentative: application.legalRepresentative,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    legalDocumentUrls: application.legalDocumentUrls,
  } as Prisma.InputJsonObject;
  const organizationData = {
    name: application.companyName,
    description: application.description,
    website: application.website,
    industry: application.industry,
    companySize: application.companySize,
    foundedYear: application.foundedYear,
    location: application.location,
    logoUrl: application.logoUrl,
    verified: true,
    verificationStatus: "VERIFIED",
    verificationNote: buildBusinessVerificationNote(application),
    rawPayload,
  };

  await tx.organization.upsert({
    where: { userId: payment.userId },
    create: {
      userId: payment.userId,
      ...organizationData,
    },
    update: organizationData,
  });
}

export async function createCheckoutPayment({
  prisma,
  userId,
  planCode,
  businessApplicationId,
  returnUrl,
  cancelUrl,
}: CreateCheckoutPaymentInput) {
  const plan = await prisma.billingPlan.findFirst({
    where: { code: planCode, active: true },
  });

  if (!plan) {
    throw new Error(`Active billing plan not found: ${planCode}`);
  }

  const orderCode = createPayosOrderCode();
  const checkoutRequest = {
    orderCode,
    amount: plan.priceVnd,
    description: `07nghiep ${orderCode}`,
    returnUrl,
    cancelUrl,
    items: [
      {
        name: plan.name,
        quantity: 1,
        price: plan.priceVnd,
      },
    ],
  };
  const checkout = await createPayosCheckout(checkoutRequest);
  const providerPayload = {
    checkoutRequest,
    checkout,
  } as Prisma.InputJsonObject;

  return prisma.payment.create({
    data: {
      userId,
      planId: plan.id,
      ...(businessApplicationId ? { businessApplicationId } : {}),
      provider: "PAYOS",
      orderCode: BigInt(orderCode),
      paymentLinkId: checkout.paymentLinkId,
      checkoutUrl: checkout.checkoutUrl,
      amountVnd: plan.priceVnd,
      status: "PENDING",
      providerPayload,
    },
  });
}

export async function handlePayosWebhook({
  prisma,
  body,
}: {
  prisma: BillingPrisma;
  body: unknown;
}): Promise<PayosWebhookResult> {
  const payload = getWebhookPayload(body);

  if (!payload) {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  if (!verifyPayosWebhookSignature({ data: payload.data, signature: payload.signature })) {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }

  const orderCode = getOrderCode(payload.data);

  if (!orderCode) {
    return { ok: false, reason: "MISSING_ORDER_CODE" };
  }

  const payment = await prisma.payment.findUnique({
    where: { orderCode },
    include: { plan: true },
  });

  if (!payment) {
    return { ok: false, reason: "UNKNOWN_ORDER_CODE" };
  }

  if (payment.status === "PAID") {
    return { ok: true, paymentId: payment.id, alreadyProcessed: true };
  }

  const result: PayosWebhookResult = await prisma.$transaction(async (tx: BillingTransaction) => {
    const currentPayment = await tx.payment.findUnique({
      where: { orderCode },
      include: { plan: true },
    });

    if (!currentPayment) {
      return { ok: false, reason: "UNKNOWN_ORDER_CODE" };
    }

    if (currentPayment.status === "PAID") {
      return { ok: true, paymentId: currentPayment.id, alreadyProcessed: true };
    }

    const webhookAmount = getAmount(payload.data);
    const isSuccess = payload.body.success === true && payload.data.code === "00";
    const providerPayload = payload.body as Prisma.InputJsonObject;

    if (isSuccess && webhookAmount !== currentPayment.amountVnd) {
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: "REVIEW_REQUIRED",
          providerPayload,
        },
      });

      return { ok: true, paymentId: currentPayment.id, status: "REVIEW_REQUIRED" };
    }

    if (!isSuccess) {
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: "FAILED",
          providerPayload,
        },
      });

      return { ok: true, paymentId: currentPayment.id, status: "FAILED" };
    }

    const currentSubscription = await tx.subscription.findFirst({
      where: { userId: currentPayment.userId, planId: currentPayment.planId, status: "ACTIVE" },
      orderBy: { currentPeriodEnd: "desc" },
      select: { currentPeriodEnd: true },
    });
    const paidAt = new Date();
    const billingPeriod = getNextBillingPeriod({
      now: paidAt,
      durationDays: currentPayment.plan.durationDays,
      currentPeriodEnd: currentSubscription?.currentPeriodEnd ?? null,
    });

    await tx.payment.update({
      where: { id: currentPayment.id },
      data: {
        status: "PAID",
        paidAt,
        providerPayload,
        paymentLinkId: getPaymentLinkId(payload.data, currentPayment.paymentLinkId),
      },
    });

    await tx.subscription.create({
      data: {
        userId: currentPayment.userId,
        planId: currentPayment.planId,
        status: "ACTIVE",
        currentPeriodStart: billingPeriod.currentPeriodStart,
        currentPeriodEnd: billingPeriod.currentPeriodEnd,
        aiCvQuotaLimit: getAiCvQuotaLimit(currentPayment.plan.code),
        aiCvQuotaUsed: 0,
      },
    });

    if (currentPayment.plan.code === "EMPLOYER_MONTHLY") {
      await tx.user.update({
        where: { id: currentPayment.userId },
        data: { role: "EMPLOYER" },
      });
      await upsertVerifiedOrganizationFromBusinessApplication({
        tx,
        payment: currentPayment,
      });
    }

    return { ok: true, paymentId: currentPayment.id };
  });

  if (result.ok && !("alreadyProcessed" in result) && !("status" in result)) {
    const { createNotification } = await import("../notifications/service");
    const payment = await prisma.payment.findUnique({
      where: { orderCode },
      include: { plan: true },
    });

    if (payment) {
      await createNotification({
        userId: payment.userId,
        type: "SYSTEM",
        title: "Thanh toán thành công",
        body: `Gói ${payment.plan.name} đã được kích hoạt.`,
        data: {
          event: "subscription.activated",
          paymentId: payment.id,
          planCode: payment.plan.code,
        },
      });
    }
  }

  return result;
}
