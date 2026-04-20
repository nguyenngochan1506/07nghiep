import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  employerProcedure,
  organizationCreateSchema,
  organizationUpdateSchema,
  publicProcedure,
  router,
} from "../lib/api";

export const organizationRouter = router({
  getMyOrganization: employerProcedure.query(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    const org = await ctx.prisma.organization.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    return org;
  }),

  create: employerProcedure
    .input(organizationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      const existing = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user.id },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization already exists for this user",
        });
      }

      return ctx.prisma.organization.create({
        data: {
          userId: ctx.user.id,
          ...input,
        },
      });
    }),

  update: employerProcedure
    .input(organizationUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user.id },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return ctx.prisma.organization.update({
        where: { userId: ctx.user.id },
        data: input,
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              jobs: {
                where: { status: "OPEN" },
              },
            },
          },
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      }

      return {
        ...org,
        openJobsCount: org._count.jobs,
      };
    }),

  getJobs: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        status: z.enum(["OPEN", "CLOSED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, organizationId, status } = input;
      const skip = (page - 1) * pageSize;

      const where = {
        organizationId,
        ...(status ? { status: status as "OPEN" | "CLOSED" } : {}),
      };

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip,
          take: pageSize,
          select: {
            id: true,
            title: true,
            location: true,
            workType: true,
            jobType: true,
            salaryMin: true,
            salaryMax: true,
            salaryType: true,
            salaryNegotiable: true,
            status: true,
            publishedAt: true,
            expiresAt: true,
            applicationsCount: true,
            createdAt: true,
          },
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  requestVerification: employerProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    return ctx.prisma.organization.update({
      where: { userId: ctx.user.id },
      data: { verified: false },
    });
  }),
});
