import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@07nghiep/env/server";

import { adminProcedure, router } from "../../lib/api";
import {
  sendBusinessApplicationApprovedEmail,
  sendBusinessApplicationRejectedEmail,
} from "../../lib/billing/email";
import { BILLING_PLAN_CODES } from "../../lib/billing/plans";
import { createCheckoutPayment } from "../../lib/billing/payments";

export const adminBusinessApplicationRouter = router({
  list: adminProcedure
    .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.businessApplication.findMany({
        where: input.status ? { status: input.status } : {},
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          payments: { orderBy: { createdAt: "desc" } },
          approvedPayment: true,
        },
      });
    }),

  approve: adminProcedure
    .input(z.object({ id: z.string().min(1), note: z.string().trim().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.businessApplication.findUnique({
        where: { id: input.id },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu" });
      }

      if (application.status === "APPROVED" && application.approvedPaymentId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Yêu cầu này đã được duyệt và đã có giao dịch thanh toán.",
        });
      }

      const reviewerId = ctx.session?.user.id;
      if (!reviewerId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const payment = await createCheckoutPayment({
        prisma: ctx.prisma,
        userId: application.userId,
        planCode: BILLING_PLAN_CODES.employerMonthly,
        businessApplicationId: application.id,
        returnUrl: env.PAYOS_RETURN_URL ?? "http://localhost:3003/billing",
        cancelUrl: env.PAYOS_CANCEL_URL ?? "http://localhost:3003/billing",
      });

      const updated = await ctx.prisma.businessApplication.update({
        where: { id: application.id },
        data: {
          status: "APPROVED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? null,
          approvedPaymentId: payment.id,
        },
      });

      await sendBusinessApplicationApprovedEmail({
        to: application.user.email,
        name: application.user.name,
        companyName: application.companyName,
        checkoutUrl: payment.checkoutUrl,
      });

      return updated;
    }),

  reject: adminProcedure
    .input(z.object({ id: z.string().min(1), note: z.string().trim().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.businessApplication.findUnique({
        where: { id: input.id },
        include: { user: { select: { email: true, name: true } } },
      });

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy yêu cầu" });
      }

      const reviewerId = ctx.session?.user.id;
      if (!reviewerId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const updated = await ctx.prisma.businessApplication.update({
        where: { id: application.id },
        data: {
          status: "REJECTED",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: input.note,
        },
      });

      await sendBusinessApplicationRejectedEmail({
        to: application.user.email,
        name: application.user.name,
        companyName: application.companyName,
        note: input.note,
      });

      return updated;
    }),
});
