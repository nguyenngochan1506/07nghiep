import { randomInt } from "node:crypto";
import type { BillingPlanCode, Prisma } from "@07nghiep/db";
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
  amountVnd: number;
  status: PaymentStatusValue;
  paymentLinkId: string | null;
  plan: BillingPlanRecord;
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
    findUnique(args: {
      where: { orderCode: bigint };
      include: { plan: true };
    }): Promise<PaymentWithPlan | null>;
    update(args: {
      where: { id: string };
      data: {
        status?: PaymentStatusValue;
        paidAt?: Date;
        providerPayload?: Prisma.InputJsonValue;
        paymentLinkId?: string | null;
      };
    }): Promise<unknown>;
  };
  subscription: {
    findFirst(args: {
      where: { userId: string; planId: string; status: "ACTIVE" };
      orderBy: { currentPeriodEnd: "desc" };
      select: { currentPeriodEnd: true };
    }): Promise<{ currentPeriodEnd: Date } | null>;
    create(args: {
      data: {
        userId: string;
        planId: string;
        status: "ACTIVE";
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        aiCvQuotaLimit: number | null;
        aiCvQuotaUsed: number;
      };
    }): Promise<unknown>;
  };
  user: {
    update(args: { where: { id: string }; data: { role: "EMPLOYER" } }): Promise<unknown>;
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
  $transaction<T>(callback: (tx: BillingTransaction) => Promise<T>): Promise<T>;
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

  const result = await prisma.$transaction<PayosWebhookResult>(async (tx) => {
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
        aiCvQuotaLimit: currentPayment.plan.code === "CANDIDATE_PLUS_MONTHLY" ? 3 : null,
        aiCvQuotaUsed: 0,
      },
    });

    if (currentPayment.plan.code === "EMPLOYER_MONTHLY") {
      await tx.user.update({
        where: { id: currentPayment.userId },
        data: { role: "EMPLOYER" },
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
