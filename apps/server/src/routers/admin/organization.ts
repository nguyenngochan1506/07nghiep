import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../../lib/api";

const verificationStatusSchema = z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]);

export const adminOrganizationRouter = router({
  listVerificationRequests: adminProcedure
    .input(
      z.object({
        status: verificationStatusSchema.optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = input.status ? { verificationStatus: input.status } : {};

      const [organizations, total] = await Promise.all([
        ctx.prisma.organization.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: input.pageSize,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                jobs: true,
              },
            },
          },
        }),
        ctx.prisma.organization.count({ where }),
      ]);

      return {
        organizations: organizations.map((organization) => ({
          ...organization,
          jobsCount: organization._count.jobs,
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  approve: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const organization = await ctx.prisma.organization.findUnique({
      where: { id: input.id },
      select: { id: true },
    });

    if (!organization) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tổ chức" });
    }

    return ctx.prisma.organization.update({
      where: { id: input.id },
      data: {
        verified: true,
        verificationStatus: "VERIFIED",
        verificationNote: null,
      },
    });
  }),

  reject: adminProcedure
    .input(z.object({ id: z.string().min(1), note: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (!organization) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tổ chức" });
      }

      return ctx.prisma.organization.update({
        where: { id: input.id },
        data: {
          verified: false,
          verificationStatus: "REJECTED",
          verificationNote: input.note,
        },
      });
    }),
});
