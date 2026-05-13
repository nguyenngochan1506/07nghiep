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

      return { success: true, count: input.ids.length };
    }),
});
