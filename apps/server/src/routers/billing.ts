import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../lib/api";
import { BILLING_CHECKOUT_URLS } from "../lib/billing/checkout-urls";
import { getActiveEntitlements } from "../lib/billing/entitlements";
import { BILLING_PLAN_CODES } from "../lib/billing/plans";
import { createCheckoutPayment } from "../lib/billing/payments";

export const billingRouter = router({
  plans: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.billingPlan.findMany({
      where: { active: true },
      select: { code: true, name: true, priceVnd: true, durationDays: true },
      orderBy: { code: "asc" },
    });
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const subscriptions = await ctx.prisma.subscription.findMany({
      where: { userId: ctx.session.user.id },
      include: { plan: { select: { code: true, name: true, priceVnd: true } } },
      orderBy: { currentPeriodEnd: "desc" },
    });

    return {
      entitlements: getActiveEntitlements(subscriptions),
      subscriptions,
    };
  }),

  createCandidatePlusCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const payment = await createCheckoutPayment({
      prisma: ctx.prisma,
      userId: ctx.session.user.id,
      planCode: BILLING_PLAN_CODES.candidatePlusMonthly,
      returnUrl: BILLING_CHECKOUT_URLS.candidateBillingReturn,
      cancelUrl: BILLING_CHECKOUT_URLS.candidateBillingReturn,
    });

    return {
      paymentId: payment.id,
      checkoutUrl: payment.checkoutUrl,
      orderCode: String(payment.orderCode),
    };
  }),

  createCandidateAiCvCreditsCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const subscriptions = await ctx.prisma.subscription.findMany({
      where: { userId: ctx.session.user.id },
      include: { plan: { select: { code: true } } },
    });
    const entitlements = getActiveEntitlements(subscriptions);

    if (!entitlements.candidatePlus) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cần Candidate Plus trước khi mua thêm lượt AI CV.",
      });
    }

    const payment = await createCheckoutPayment({
      prisma: ctx.prisma,
      userId: ctx.session.user.id,
      planCode: BILLING_PLAN_CODES.candidateAiCvCredits,
      returnUrl: BILLING_CHECKOUT_URLS.candidateCvAnalysis,
      cancelUrl: BILLING_CHECKOUT_URLS.candidateCvAnalysis,
    });

    return {
      paymentId: payment.id,
      checkoutUrl: payment.checkoutUrl,
      orderCode: String(payment.orderCode),
    };
  }),

  createEmployerCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.role !== "EMPLOYER" && ctx.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Vui lòng gửi yêu cầu doanh nghiệp để admin duyệt trước.",
      });
    }

    const payment = await createCheckoutPayment({
      prisma: ctx.prisma,
      userId: ctx.session.user.id,
      planCode: BILLING_PLAN_CODES.employerMonthly,
      returnUrl: BILLING_CHECKOUT_URLS.employerBilling,
      cancelUrl: BILLING_CHECKOUT_URLS.employerBilling,
    });

    return {
      paymentId: payment.id,
      checkoutUrl: payment.checkoutUrl,
      orderCode: String(payment.orderCode),
    };
  }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ paymentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.prisma.payment.findUnique({
        where: { id: input.paymentId },
        select: { id: true, userId: true, status: true, orderCode: true, updatedAt: true },
      });

      if (!payment || payment.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy giao dịch" });
      }

      return { ...payment, orderCode: String(payment.orderCode) };
    }),
});
