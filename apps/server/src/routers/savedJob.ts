import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { candidateProcedure, router } from "../lib/api";

const jobIdSchema = z.object({ jobId: z.string().min(1) });

export const savedJobRouter = router({
  toggle: candidateProcedure.input(jobIdSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.user!.id;

    const job = await ctx.prisma.job.findFirst({
      where: { id: input.jobId, status: "OPEN" },
      select: { id: true },
    });

    if (!job) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy tin tuyển dụng đang mở",
      });
    }

    const existing = await ctx.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId: input.jobId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await ctx.prisma.savedJob.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await ctx.prisma.savedJob.create({
      data: {
        userId,
        jobId: input.jobId,
      },
    });

    return { saved: true };
  }),

  isSaved: candidateProcedure.input(jobIdSchema).query(async ({ ctx, input }) => {
    const item = await ctx.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId: ctx.user!.id,
          jobId: input.jobId,
        },
      },
      select: { id: true },
    });

    return { saved: Boolean(item) };
  }),

  list: candidateProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          pageSize: z.number().int().min(1).max(50).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const skip = (page - 1) * pageSize;
      const where = { userId: ctx.user!.id };

      const [items, total] = await Promise.all([
        ctx.prisma.savedJob.findMany({
          where,
          orderBy: { savedAt: "desc" },
          skip,
          take: pageSize,
          include: {
            job: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    verified: true,
                  },
                },
                skills: true,
              },
            },
          },
        }),
        ctx.prisma.savedJob.count({ where }),
      ]);

      return {
        jobs: items.map((item) => ({
          ...item.job,
          savedAt: item.savedAt,
          isSaved: true,
          skills: item.job.skills.map((skill) => skill.skill),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});
