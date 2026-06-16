import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  employerOrAdminProcedure,
  organizationCreateSchema,
  organizationUpdateSchema,
  publicProcedure,
  router,
} from "../lib/api";

export const organizationRouter = router({
  getMyOrganization: employerOrAdminProcedure.query(async ({ ctx }) => {
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

  create: employerOrAdminProcedure
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

  update: employerOrAdminProcedure
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

  // ── Public: List organizations ─────────────────────────────────────────────
  getPublicList: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        industry: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};

      if (input.keyword) {
        where.name = { contains: input.keyword, mode: "insensitive" };
      }

      if (input.industry) {
        where.industry = { contains: input.industry, mode: "insensitive" };
      }

      const [orgs, total] = await Promise.all([
        ctx.prisma.organization.findMany({
          where,
          include: {
            _count: {
              select: {
                jobs: {
                  where: { status: "OPEN" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.organization.count({ where }),
      ]);

      return {
        organizations: orgs.map((org) => ({
          ...org,
          openJobsCount: org._count.jobs,
        })),
        total,
      };
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

  requestVerification: employerOrAdminProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    return ctx.prisma.organization.update({
      where: { userId: ctx.user.id },
      data: {
        verified: false,
        verificationStatus: "PENDING",
        verificationNote: null,
      },
    });
  }),
});
