import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../lib/api";

const businessApplicationInput = z.object({
  companyName: z.string().trim().min(2).max(120),
  website: z.string().trim().url().optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  description: z.string().trim().min(20).max(2000),
});

export const businessApplicationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessApplication.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, checkoutUrl: true, amountVnd: true },
        },
      },
    });
  }),

  create: protectedProcedure.input(businessApplicationInput).mutation(async ({ ctx, input }) => {
    const activeOrPending = await ctx.prisma.businessApplication.findFirst({
      where: {
        userId: ctx.session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (activeOrPending) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Bạn đã có yêu cầu doanh nghiệp đang xử lý.",
      });
    }

    return ctx.prisma.businessApplication.create({
      data: {
        userId: ctx.session.user.id,
        companyName: input.companyName,
        website: input.website || null,
        industry: input.industry || null,
        location: input.location || null,
        description: input.description,
      },
    });
  }),
});
