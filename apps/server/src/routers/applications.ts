import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { enqueueApplicationFitSafely } from "../lib/ai-cv/enqueue";
import { hasActiveEmployerPackage } from "../lib/ai-cv/quota";
import { candidateProcedure, paidEmployerProcedure, router } from "../lib/api";

const applySchema = z.object({
  jobId: z.string().min(1),
  coverLetter: z.string().min(1).max(2000),
  resumeUrl: z.string().url().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

const listApplicationsSchema = z.object({
  status: z
    .enum(["PENDING", "VIEWED", "SHORTLISTED", "INTERVIEWING", "OFFERED", "REJECTED", "WITHDRAWN"])
    .optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(["newest", "oldest"]).optional().default("newest"),
});

const updateApplicationSchema = z.object({
  id: z.string().min(1),
  coverLetter: z.string().min(1).max(2000).optional(),
});

const withdrawSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const withdrawableStatuses = ["PENDING", "VIEWED"] as const;

export const applicationsRouter = router({
  applyJob: candidateProcedure.input(applySchema).mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const [job, existing] = await Promise.all([
      ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        select: { id: true, status: true },
      }),
      ctx.prisma.application.findUnique({
        where: {
          jobId_candidateId: {
            jobId: input.jobId,
            candidateId: ctx.user.id,
          },
        },
        select: { id: true },
      }),
    ]);

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }

    if (job.status !== "OPEN") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Position is closed" });
    }

    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "You already applied to this job" });
    }

    const profile = await ctx.prisma.profile.findUnique({
      where: { userId: ctx.user.id },
      select: { id: true, headline: true, summary: true, skills: true, resumeUrl: true },
    });

    const hasBasicProfile = Boolean(
      profile?.headline?.trim() && profile?.summary?.trim() && (profile.skills?.length ?? 0) > 0,
    );
    if (!hasBasicProfile) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Complete profile to apply" });
    }

    const finalResumeUrl = input.resumeUrl ?? profile?.resumeUrl ?? undefined;

    const created = await ctx.prisma.application.create({
      data: {
        jobId: input.jobId,
        candidateId: ctx.user.id,
        coverLetter: input.coverLetter,
        resumeUrl: finalResumeUrl,
        answers: input.answers ? (input.answers as object) : undefined,
        status: "PENDING",
      },
      include: {
        job: {
          include: {
            organization: {
              select: {
                userId: true,
                name: true,
              },
            },
          },
        },
        candidate: {
          select: {
            name: true,
          },
        },
      },
    });

    await ctx.prisma.applicationHistory.create({
      data: {
        applicationId: created.id,
        fromStatus: null,
        toStatus: "PENDING",
        changedById: ctx.user.id,
        note: "Application submitted",
      },
    });

    const employerHasAiScoring = await hasActiveEmployerPackage(
      ctx.prisma,
      created.job.organization.userId,
    );

    if (employerHasAiScoring) {
      const score = await ctx.prisma.applicationAiScore.create({
        data: {
          applicationId: created.id,
          status: "PENDING",
          matchedSkills: [],
          missingSkills: [],
        },
      });
      await enqueueApplicationFitSafely(ctx.prisma, score.id);
    }

    // Notify Employer
    const { createNotification } = await import("../lib/notifications/service");
    await createNotification({
      userId: created.job.organization.userId,
      type: "APPLICATION_RECEIVED",
      title: "Ứng tuyển mới",
      body: `${created.candidate.name || "Một ứng viên"} đã ứng tuyển vào vị trí "${created.job.title}"`,
      data: {
        applicationId: created.id,
        jobId: created.jobId,
      },
    });

    return created;
  }),

  // ── Employer: Update application status ───────────────────────────────────
  employerUpdateStatus: paidEmployerProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(["PENDING", "VIEWED", "SHORTLISTED", "INTERVIEWING", "OFFERED", "REJECTED"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, status, note } = input;

      const application = await ctx.prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
          candidate: true,
        },
      });

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      // Verify ownership
      if (application.job.organization.userId !== ctx.user?.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const updated = await ctx.prisma.application.update({
        where: { id },
        data: { status },
      });

      await ctx.prisma.applicationHistory.create({
        data: {
          applicationId: id,
          fromStatus: application.status,
          toStatus: status,
          changedById: ctx.user?.id,
          note,
        },
      });

      // Notify Candidate
      const { createNotification } = await import("../lib/notifications/service");
      const statusLabels: Record<string, string> = {
        VIEWED: "đã xem hồ sơ",
        SHORTLISTED: "đã đưa hồ sơ của bạn vào danh sách tiềm năng",
        INTERVIEWING: "mời bạn phỏng vấn",
        OFFERED: "gửi lời mời làm việc (Offer)",
        REJECTED: "đã từ chối hồ sơ",
      };

      await createNotification({
        userId: application.candidateId,
        type: "APPLICATION_STATUS",
        title: "Cập nhật trạng thái ứng tuyển",
        body: `Nhà tuyển dụng ${application.job.organization.name} ${
          statusLabels[status] || "đã cập nhật trạng thái ứng tuyển của bạn"
        } cho vị trí "${application.job.title}"`,
        data: {
          applicationId: id,
          status,
        },
      });

      return updated;
    }),

  list: candidateProcedure
    .input(listApplicationsSchema.optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const where = {
        candidateId: ctx.user.id,
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.search
          ? {
              job: {
                is: {
                  OR: [
                    { title: { contains: input.search } },
                    {
                      organization: {
                        is: {
                          name: { contains: input.search },
                        },
                      },
                    },
                  ],
                },
              },
            }
          : {}),
      };

      return ctx.prisma.application.findMany({
        where,
        include: {
          job: {
            include: {
              organization: true,
            },
          },
        },
        orderBy: {
          appliedAt: input?.sortBy === "oldest" ? "asc" : "desc",
        },
      });
    }),

  getById: candidateProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const application = await ctx.prisma.application.findFirst({
        where: {
          id: input.id,
          candidateId: ctx.user.id,
        },
        include: {
          job: {
            include: {
              organization: true,
            },
          },
          histories: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      return application;
    }),

  update: candidateProcedure.input(updateApplicationSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const application = await ctx.prisma.application.findFirst({
      where: {
        id: input.id,
        candidateId: ctx.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    }

    if (application.status !== "PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only pending applications can be edited",
      });
    }

    return ctx.prisma.application.update({
      where: { id: input.id },
      data: {
        ...(input.coverLetter ? { coverLetter: input.coverLetter } : {}),
      },
    });
  }),

  withdraw: candidateProcedure.input(withdrawSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const application = await ctx.prisma.application.findFirst({
      where: {
        id: input.id,
        candidateId: ctx.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!application) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    }

    if (
      !withdrawableStatuses.includes(application.status as (typeof withdrawableStatuses)[number])
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only PENDING or VIEWED applications can be withdrawn",
      });
    }

    const updated = await ctx.prisma.application.update({
      where: { id: input.id },
      data: {
        status: "WITHDRAWN",
      },
    });

    await ctx.prisma.applicationHistory.create({
      data: {
        applicationId: updated.id,
        fromStatus: application.status,
        toStatus: "WITHDRAWN",
        changedById: ctx.user.id,
        note: input.reason,
      },
    });

    return updated;
  }),
});
