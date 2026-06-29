import { z } from "zod";

import { adminProcedure, router } from "../../lib/api";
import { normalizeVoucherCode } from "../../lib/billing/vouchers";

const voucherInclude = {
  plans: {
    include: {
      plan: { select: { id: true, code: true, name: true } },
    },
  },
  _count: { select: { redemptions: true } },
} as const;

type AdminVoucherRow = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountVnd: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
  plans: { plan: { id: string; code: string; name: string } }[];
  _count: { redemptions: number };
};

function toAdminVoucherRow(voucher: any): AdminVoucherRow {
  return {
    id: voucher.id,
    code: voucher.code,
    description: voucher.description,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountVnd: voucher.maxDiscountVnd,
    startsAt: voucher.startsAt,
    expiresAt: voucher.expiresAt,
    usageLimit: voucher.usageLimit,
    perUserLimit: voucher.perUserLimit,
    active: voucher.active,
    plans: voucher.plans,
    _count: voucher._count,
  };
}

const nullablePositiveIntSchema = z.number().int().min(1).nullable().optional();

const createVoucherSchema = z
  .object({
    code: z.string().trim().min(2).max(64),
    description: z.string().trim().max(255).nullable().optional(),
    discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]),
    discountValue: z.number().int().min(1),
    maxDiscountVnd: nullablePositiveIntSchema,
    startsAt: z.coerce.date().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    usageLimit: nullablePositiveIntSchema,
    perUserLimit: nullablePositiveIntSchema,
    planIds: z.array(z.string().min(1)).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "PERCENT" && value.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Phần trăm giảm giá không được vượt quá 100.",
      });
    }

    if (value.startsAt && value.expiresAt && value.startsAt >= value.expiresAt) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Ngày hết hạn phải sau ngày bắt đầu.",
      });
    }
  });
const updateVoucherSchema = createVoucherSchema.extend({
  id: z.string().min(1),
});

export const adminBillingRouter = router({
  plans: adminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.billingPlan.findMany({ orderBy: { code: "asc" } });
  }),

  vouchers: adminProcedure.query(async ({ ctx }) => {
    const vouchers = await ctx.prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      include: voucherInclude,
    });

    return vouchers.map(toAdminVoucherRow);
  }),

  createVoucher: adminProcedure.input(createVoucherSchema).mutation(async ({ ctx, input }) => {
    const uniquePlanIds = Array.from(new Set(input.planIds));

    const voucher = await ctx.prisma.voucher.create({
      data: {
        code: normalizeVoucherCode(input.code),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscountVnd: input.maxDiscountVnd ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        active: true,
        plans: {
          create: uniquePlanIds.map((planId) => ({ planId })),
        },
      },
      include: voucherInclude,
    });

    return { id: voucher.id, code: voucher.code };
  }),

  updateVoucher: adminProcedure.input(updateVoucherSchema).mutation(async ({ ctx, input }) => {
    const uniquePlanIds = Array.from(new Set(input.planIds));

    const voucher = await ctx.prisma.voucher.update({
      where: { id: input.id },
      data: {
        code: normalizeVoucherCode(input.code),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxDiscountVnd: input.maxDiscountVnd ?? null,
        startsAt: input.startsAt ?? null,
        expiresAt: input.expiresAt ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? null,
        plans: {
          deleteMany: {},
          create: uniquePlanIds.map((planId) => ({ planId })),
        },
      },
      include: voucherInclude,
    });

    return toAdminVoucherRow(voucher);
  }),

  updateVoucherStatus: adminProcedure
    .input(z.object({ id: z.string().min(1), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.voucher.update({
        where: { id: input.id },
        data: { active: input.active },
      });
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
