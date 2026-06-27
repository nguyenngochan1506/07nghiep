import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  employerOrAdminProcedure,
  jobCreateSchema,
  jobListQuerySchema,
  jobUpdateSchema,
  publicProcedure,
  router,
} from "../lib/api";

export const jobRouter = router({
  // ── Employer: Get my jobs ─────────────────────────────────────────────────
  getMyJobs: employerOrAdminProcedure
    .input(jobListQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page, pageSize, status, search } = input;
      const skip = (page - 1) * pageSize;

      // Get the employer's organization
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bạn chưa có tổ chức. Vui lòng tạo tổ chức trước.",
        });
      }

      const where = {
        organizationId: org.id,
        ...(status ? { status } : {}),
        ...(search
          ? {
              title: { contains: search, mode: "insensitive" as const },
            }
          : {}),
      };

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: pageSize,
          include: {
            skills: true,
            _count: { select: { applications: true } },
          },
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs: jobs.map((j) => ({
          ...j,
          applicationsCount: j._count.applications,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      } as {
        jobs: any[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      };
    }),

  // ── Employer: Get stats ───────────────────────────────────────────────────
  getMyStats: employerOrAdminProcedure.query(async ({ ctx }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { userId: ctx.user!.id },
      select: { id: true },
    });

    if (!org) {
      return {
        totalJobs: 0,
        openJobs: 0,
        draftJobs: 0,
        closedJobs: 0,
        totalApplications: 0,
        totalViews: 0,
      };
    }

    const [statusCounts, totals] = await Promise.all([
      ctx.prisma.job.groupBy({
        by: ["status"],
        where: { organizationId: org.id },
        _count: { id: true },
      }),
      ctx.prisma.job.aggregate({
        where: { organizationId: org.id },
        _sum: { applicationsCount: true, views: true },
        _count: { id: true },
      }),
    ]);

    const byStatus = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count.id])
    );

    return {
      totalJobs: totals._count.id,
      openJobs: byStatus["OPEN"] ?? 0,
      draftJobs: byStatus["DRAFT"] ?? 0,
      closedJobs: byStatus["CLOSED"] ?? 0,
      totalApplications: totals._sum.applicationsCount ?? 0,
      totalViews: totals._sum.views ?? 0,
    };
  }),

  // ── Employer: Get single job for editing ─────────────────────────────────
  getById: employerOrAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });
      }

      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, organizationId: org.id },
        include: { skills: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });
      }

      return {
        ...job,
        skills: job.skills.map((s) => s.skill),
      } as {
        id: string;
        title: string;
        description: string;
        requirements: string | null;
        benefits: string | null;
        salaryMin: any;
        salaryMax: any;
        salaryType: any;
        salaryNegotiable: boolean;
        location: string;
        workType: any;
        jobType: any;
        experienceLevel: any;
        status: any;
        publishedAt: Date | null;
        expiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        skills: string[];
      };
    }),

  // ── Employer: Create job ──────────────────────────────────────────────────
  create: employerOrAdminProcedure
    .input(jobCreateSchema.extend({ status: z.enum(["DRAFT", "OPEN"]).default("DRAFT") }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true, name: true },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bạn chưa có tổ chức. Vui lòng tạo tổ chức trước.",
        });
      }

      const { skills, salaryMin, salaryMax, status, ...rest } = input;

      const needsModeration = status === "OPEN";
      const finalStatus = needsModeration ? "PENDING_APPROVAL" : status;

      const job = await ctx.prisma.job.create({
        data: {
          ...rest,
          status: finalStatus,
          salaryMin: salaryMin !== undefined ? salaryMin : null,
          salaryMax: salaryMax !== undefined ? salaryMax : null,
          organizationId: org.id,
          publishedAt: null,
          skills: {
            create: skills.map((skill: string) => ({ skill })),
          },
        },
        include: { skills: true },
      });

      if (needsModeration) {
        const admins = await ctx.prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        });

        await Promise.all(
          admins.map((admin) =>
            ctx.prisma.notification.create({
              data: {
                userId: admin.id,
                type: "SYSTEM",
                title: "Tin tuyển dụng mới cần kiểm duyệt",
                body: `Tin tuyển dụng "${job.title}" từ ${org.name} cần được kiểm duyệt.`,
                data: { jobId: job.id, organizationId: org.id },
              },
            })
          )
        );
      }

      return job;
    }),

  // ── Employer: Update job ──────────────────────────────────────────────────
  update: employerOrAdminProcedure.input(jobUpdateSchema).mutation(async ({ ctx, input }) => {
    const org = await ctx.prisma.organization.findUnique({
      where: { userId: ctx.user!.id },
      select: { id: true },
    });

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });
    }

    const existing = await ctx.prisma.job.findFirst({
      where: { id: input.id, organizationId: org.id },
    });

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });
    }

    const { id, skills, salaryMin, salaryMax, ...rest } = input;

    const updateData: Parameters<typeof ctx.prisma.job.update>[0]["data"] = {
      ...rest,
      ...(salaryMin !== undefined ? { salaryMin } : {}),
      ...(salaryMax !== undefined ? { salaryMax } : {}),
    };

    if (skills !== undefined) {
      // Replace all skills
      await ctx.prisma.jobSkill.deleteMany({ where: { jobId: id } });
      updateData.skills = {
        create: skills.map((skill: string) => ({ skill })),
      };
    }

    return ctx.prisma.job.update({
      where: { id },
      data: updateData,
      include: { skills: true },
    });
  }),

  // ── Employer: Publish job ─────────────────────────────────────────────────
  publish: employerOrAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true, name: true },
      });

      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });

      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, organizationId: org.id },
      });

      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

      if (!["DRAFT", "CLOSED"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Chỉ có thể đăng tin ở trạng thái Nháp hoặc Đã đóng" });
      }

      const updatedJob = await ctx.prisma.job.update({
        where: { id: input.id },
        data: {
          status: "PENDING_APPROVAL",
          publishedAt: null,
        },
      });

      const admins = await ctx.prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          ctx.prisma.notification.create({
            data: {
              userId: admin.id,
              type: "SYSTEM",
              title: "Tin tuyển dụng mới cần kiểm duyệt",
              body: `Tin tuyển dụng "${job.title}" từ ${org.name} đã được gửi lại để kiểm duyệt.`,
              data: { jobId: input.id, organizationId: org.id },
            },
          })
        )
      );

      return updatedJob;
    }),

  // ── Employer: Close job ───────────────────────────────────────────────────
  close: employerOrAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });

      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, organizationId: org.id },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: "CLOSED" },
      });
    }),

  // ── Employer: Delete (Archive) job ───────────────────────────────────────
  delete: employerOrAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });

      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, organizationId: org.id },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

      return ctx.prisma.job.update({
        where: { id: input.id },
        data: { status: "ARCHIVED" },
      });
    }),

  // ── Employer: Clone job ───────────────────────────────────────────────────
  clone: employerOrAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Tổ chức không tồn tại" });

      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, organizationId: org.id },
        include: { skills: true },
      });
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

      const {
        id: _id,
        createdAt: _ca,
        updatedAt: _ua,
        publishedAt: _pa,
        views: _v,
        applicationsCount: _ac,
        skills,
        ...jobData
      } = job;

      return ctx.prisma.job.create({
        data: {
          ...jobData,
          title: `[Bản sao] ${job.title}`,
          status: "DRAFT",
          publishedAt: null,
          skills: {
            create: skills.map((s) => ({ skill: s.skill })),
          },
        },
        include: { skills: true },
      });
    }),

  // ── Public: List open jobs ────────────────────────────────────────────────
  getPublicList: publicProcedure
    .input(
      z.object({
        keyword: z.string().optional(),
        location: z.string().optional(),
        workType: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { status: "OPEN" };

      if (input.keyword) {
        where.OR = [
          { title: { contains: input.keyword, mode: "insensitive" } },
          {
            organization: {
              name: { contains: input.keyword, mode: "insensitive" },
            },
          },
        ];
      }

      if (input.location) {
        where.location = { contains: input.location, mode: "insensitive" };
      }

      if (input.workType) {
        where.workType = input.workType;
      }

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
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
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs: jobs.map((job) => ({
          ...job,
          skills: job.skills.map((s) => s.skill),
        })),
        total,
      };
    }),

  // ── Public: Get job details ───────────────────────────────────────────────
  getPublicById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.id, status: "OPEN" },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              industry: true,
              companySize: true,
              location: true,
              verified: true,
            },
          },
          skills: true,
        },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });
      }

      // Increment views
      await ctx.prisma.job.update({
        where: { id: input.id },
        data: { views: { increment: 1 } },
      });

      return {
        ...job,
        skills: job.skills.map((s) => s.skill),
      };
    }),

  // ── Employer: Get moderation feedback for a job ──────────────────────────
  getModerationFeedback: employerOrAdminProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { userId: ctx.user!.id },
        select: { id: true },
      });

      if (!org) {
        return null;
      }

      // Verify job belongs to this employer
      const job = await ctx.prisma.job.findFirst({
        where: { id: input.jobId, organizationId: org.id },
      });

      if (!job) {
        return null;
      }

      // Get latest moderation history for this job
      const history = await ctx.prisma.moderationHistory.findFirst({
        where: { jobId: input.jobId },
        orderBy: { createdAt: "desc" },
        include: {
          moderator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return history;
    }),
});
