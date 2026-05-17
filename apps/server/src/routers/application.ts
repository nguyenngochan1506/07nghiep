import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/api";
import {
  applicationBulkUpdateStatusSchema,
  applicationListSchema,
  applicationUpdateNotesSchema,
  applicationUpdateStatusSchema,
} from "../lib/api/schemas";

export const applicationRouter = router({
  list: protectedProcedure
    .input(applicationListSchema)
    .query(async ({ ctx, input }) => {
      const { jobId, status, search, page, limit } = input;
      const skip = (page - 1) * limit;

      // Ensure user has an organization
      const organization = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must have an organization to view applications.",
        });
      }

      const where = {
        job: {
          organizationId: organization.id,
          ...(jobId ? { id: jobId } : {}),
        },
        ...(status ? { status } : {}),
        ...(search
          ? {
              candidate: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        ctx.prisma.application.findMany({
          where,
          include: {
            job: {
              select: {
                id: true,
                title: true,
              },
            },
            candidate: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            appliedAt: "desc",
          },
          skip,
          take: limit,
        }),
        ctx.prisma.application.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findUnique({
        where: { id: input.id },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
          candidate: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              profile: true,
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Ensure user owns the organization this job belongs to
      if (application.job.organization.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this application.",
        });
      }

      return application;
    }),

  updateStatus: protectedProcedure
    .input(applicationUpdateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // First verify access
      const application = await ctx.prisma.application.findUnique({
        where: { id: input.id },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.job.organization.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this application.",
        });
      }

      const updated = await ctx.prisma.application.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          candidate: true,
          job: {
            select: {
              title: true,
              organization: {
                select: { name: true },
              },
            },
          },
        },
      });

      // Record history
      await ctx.prisma.applicationHistory.create({
        data: {
          applicationId: input.id,
          fromStatus: application.status,
          toStatus: input.status,
          changedById: ctx.session.user.id,
        },
      });

      // Notify candidate
      const statusLabels: Record<string, string> = {
        VIEWED: "đã xem hồ sơ",
        SHORTLISTED: "đã đưa hồ sơ của bạn vào danh sách tiềm năng",
        INTERVIEWING: "mời bạn phỏng vấn",
        OFFERED: "gửi lời mời làm việc (Offer)",
        REJECTED: "đã từ chối hồ sơ",
      };

      const { createNotification } = await import("../lib/notifications/service");
      await createNotification({
        userId: application.candidateId,
        type: "APPLICATION_STATUS",
        title: "Cập nhật trạng thái ứng tuyển",
        body: `Nhà tuyển dụng ${updated.job.organization.name} ${
          statusLabels[input.status] || "đã cập nhật trạng thái ứng tuyển của bạn"
        } cho vị trí "${updated.job.title}"`,
        data: {
          applicationId: input.id,
          status: input.status,
        },
      });

      return updated;
    }),

  updateNotes: protectedProcedure
    .input(applicationUpdateNotesSchema)
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findUnique({
        where: { id: input.id },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (application.job.organization.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this application.",
        });
      }

      const updated = await ctx.prisma.application.update({
        where: { id: input.id },
        data: { notes: input.notes },
      });

      return updated;
    }),

  bulkUpdateStatus: protectedProcedure
    .input(applicationBulkUpdateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must have an organization to perform this action.",
        });
      }

      // Verify all applications belong to jobs in this organization
      const applications = await ctx.prisma.application.findMany({
        where: {
          id: { in: input.ids },
          job: {
            organizationId: organization.id,
          },
        },
      });

      if (applications.length !== input.ids.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to all selected applications.",
        });
      }

      await ctx.prisma.application.updateMany({
        where: { id: { in: input.ids } },
        data: { status: input.status },
      });

      // Record history + notify for each application
      const statusLabels: Record<string, string> = {
        VIEWED: "đã xem hồ sơ",
        SHORTLISTED: "đã đưa hồ sơ của bạn vào danh sách tiềm năng",
        INTERVIEWING: "mời bạn phỏng vấn",
        OFFERED: "gửi lời mời làm việc (Offer)",
        REJECTED: "đã từ chối hồ sơ",
      };

      const { createNotification } = await import("../lib/notifications/service");

      for (const app of applications) {
        await ctx.prisma.applicationHistory.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: input.status,
            changedById: ctx.session.user.id,
          },
        });

        await createNotification({
          userId: app.candidateId,
          type: "APPLICATION_STATUS",
          title: "Cập nhật trạng thái ứng tuyển",
          body: `Nhà tuyển dụng ${organization.name} ${
            statusLabels[input.status] || "đã cập nhật trạng thái ứng tuyển của bạn"
          }`,
          data: {
            applicationId: app.id,
            status: input.status,
          },
        });
      }

      return { success: true, count: input.ids.length };
    }),
});
