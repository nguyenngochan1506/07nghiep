import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { candidateProcedure, router } from "../lib/api";

const jobIdSchema = z.object({ jobId: z.string().min(1) });
const syncLocalSchema = z.object({
  jobIds: z.array(z.string().min(1)).max(200),
});

function getSessionUserId(ctx: { session: { user: { id: string } } | null }): string {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  return ctx.session.user.id;
}

export const savedJobRouter = router({
  toggle: candidateProcedure.input(jobIdSchema).mutation(async ({ ctx, input }) => {
    const userId = getSessionUserId(ctx);

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

  syncLocal: candidateProcedure.input(syncLocalSchema).mutation(async ({ ctx, input }) => {
    const userId = getSessionUserId(ctx);
    const requestedJobIds = Array.from(
      new Set(input.jobIds.map((id) => id.trim()).filter(Boolean)),
    );

    if (requestedJobIds.length === 0) {
      return { syncedJobIds: [], skippedJobIds: [] };
    }

    const openJobs = await ctx.prisma.job.findMany({
      where: {
        id: { in: requestedJobIds },
        status: "OPEN",
      },
      select: { id: true },
    });
    const openJobIds = openJobs.map((job) => job.id);

    if (openJobIds.length === 0) {
      return { syncedJobIds: [], skippedJobIds: requestedJobIds };
    }

    const existingSavedJobs = await ctx.prisma.savedJob.findMany({
      where: {
        userId,
        jobId: { in: openJobIds },
      },
      select: { jobId: true },
    });
    const existingSavedIds = new Set(existingSavedJobs.map((item) => item.jobId));
    const missingJobIds = openJobIds.filter((jobId) => !existingSavedIds.has(jobId));

    if (missingJobIds.length > 0) {
      await ctx.prisma.savedJob.createMany({
        data: missingJobIds.map((jobId) => ({ userId, jobId })),
        skipDuplicates: true,
      });
    }

    return {
      syncedJobIds: missingJobIds,
      skippedJobIds: requestedJobIds.filter((jobId) => !openJobIds.includes(jobId)),
    };
  }),

  isSaved: candidateProcedure.input(jobIdSchema).query(async ({ ctx, input }) => {
    const userId = getSessionUserId(ctx);

    const item = await ctx.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
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
      const where = { userId: getSessionUserId(ctx) };

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
