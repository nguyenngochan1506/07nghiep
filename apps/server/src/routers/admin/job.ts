import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, router } from "../../lib/api";

export const adminJobRouter = router({
  listPending: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = { status: "PENDING_APPROVAL" as const };

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: input.pageSize,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            skills: true,
          },
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs: jobs.map((job) => ({
          ...job,
          skills: job.skills.map((skill) => skill.skill),
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  approve: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        select: { id: true, publishedAt: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });
      }

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: {
          status: "OPEN",
          publishedAt: job.publishedAt ?? new Date(),
        },
      });
    }),

  reject: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.id },
        select: { id: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });
      }

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: {
          status: "DRAFT",
          publishedAt: null,
        },
      });
    }),
});
