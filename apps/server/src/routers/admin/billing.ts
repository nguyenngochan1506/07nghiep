import { z } from "zod";

import { adminProcedure, router } from "../../lib/api";

export const adminBillingRouter = router({
  plans: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.billingPlan.findMany({ orderBy: { code: "asc" } });
  }),

  updatePlanPrice: adminProcedure
    .input(z.object({ id: z.string().min(1), priceVnd: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.billingPlan.update({
        where: { id: input.id },
        data: { priceVnd: input.priceVnd },
      });
    }),

  payments: adminProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "PAID", "CANCELLED", "FAILED", "REVIEW_REQUIRED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.status ? { status: input.status } : {};
      const skip = (input.page - 1) * input.pageSize;
      const [payments, total] = await Promise.all([
        ctx.prisma.payment.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            plan: true,
            businessApplication: true,
          },
        }),
        ctx.prisma.payment.count({ where }),
      ]);

      return {
        payments: payments.map((payment) => ({ ...payment, orderCode: String(payment.orderCode) })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),
});
