import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/api";

export const interviewRouter = router({
  // ── Get all interviews for current user ─────────────────────────────────────
  getMyInterviews: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.interview.findMany({
      where: {
        status: { notIn: ["CANCELLED"] },
        application: {
          OR: [
            { candidateId: ctx.session.user.id },
            {
              job: {
                organization: {
                  userId: ctx.session.user.id,
                },
              },
            },
          ],
        },
      },
      include: {
        application: {
          select: {
            id: true,
            candidateId: true,
            job: {
              select: {
                id: true,
                title: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                  },
                },
              },
            },
            candidate: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: {
                  select: {
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }),

  // ── List interviews for an application ─────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.interview.findMany({
        where: { applicationId: input.applicationId },
        orderBy: { scheduledAt: "asc" },
      });
    }),

  // ── Schedule a new interview ───────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        applicationId: z.string().min(1),
        scheduledAt: z.string().min(1),
        durationMinutes: z.number().min(15).max(480).default(60),
        location: z.string().max(500).optional(),
        meetingLink: z.string().url().optional().or(z.literal("")),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const application = await ctx.prisma.application.findUnique({
        where: { id: input.applicationId },
        include: {
          job: {
            include: { organization: true },
          },
          candidate: true,
        },
      });

      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      // Employer or admin can schedule
      const isEmployer = application.job.organization.userId === ctx.session.user.id;
      const isAdmin = (ctx.session.user as any)?.role === "ADMIN";
      if (!isEmployer && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const interview = await ctx.prisma.interview.create({
        data: {
          applicationId: input.applicationId,
          scheduledAt: new Date(input.scheduledAt),
          durationMinutes: input.durationMinutes,
          location: input.location || null,
          meetingLink: input.meetingLink || null,
          notes: input.notes || null,
        },
      });

      // Notify candidate
      const { createNotification } = await import("../lib/notifications/service");
      const dateStr = interview.scheduledAt.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = interview.scheduledAt.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await createNotification({
        userId: application.candidateId,
        type: "INTERVIEW_INVITATION" as any,
        title: "Lịch phỏng vấn mới",
        body: `Nhà tuyển dụng ${application.job.organization.name} đã lên lịch phỏng vấn cho vị trí "${application.job.title}" vào ${dateStr} lúc ${timeStr}. Vui lòng xác nhận lịch phỏng vấn.`,
        data: {
          interviewId: interview.id,
          applicationId: input.applicationId,
        },
      });

      return interview;
    }),

  // ── Update an interview ─────────────────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        scheduledAt: z.string().min(1).optional(),
        durationMinutes: z.number().min(15).max(480).optional(),
        location: z.string().max(500).optional().nullable(),
        meetingLink: z.string().url().optional().or(z.literal("")).nullable(),
        notes: z.string().max(2000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findUnique({
        where: { id: input.id },
        include: {
          application: {
            include: {
              job: { include: { organization: true } },
              candidate: true,
            },
          },
        },
      });

      if (!interview) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
      }

      const isEmployer = interview.application.job.organization.userId === ctx.session.user.id;
      const isAdmin = (ctx.session.user as any)?.role === "ADMIN";
      if (!isEmployer && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.scheduledAt) {
        updateData.scheduledAt = new Date(data.scheduledAt);
      }

      const updated = await ctx.prisma.interview.update({
        where: { id: input.id },
        data: updateData,
      });

      // Notify candidate of reschedule
      const { createNotification } = await import("../lib/notifications/service");
      const dateStr = updated.scheduledAt.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = updated.scheduledAt.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await createNotification({
        userId: interview.application.candidateId,
        type: "INTERVIEW_INVITATION" as any,
        title: "Cập nhật lịch phỏng vấn",
        body: `Nhà tuyển dụng ${interview.application.job.organization.name} đã cập nhật lịch phỏng vấn cho vị trí "${interview.application.job.title}": ${dateStr} lúc ${timeStr}.`,
        data: {
          interviewId: updated.id,
          applicationId: interview.applicationId,
        },
      });

      return updated;
    }),

  // ── Candidate: Confirm / Cancel ─────────────────────────────────────────────
  respond: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        action: z.enum(["CONFIRMED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findUnique({
        where: { id: input.id },
        include: {
          application: {
            include: {
              job: { include: { organization: true } },
              candidate: true,
            },
          },
        },
      });

      if (!interview) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
      }

      // Only the candidate can respond
      if (interview.application.candidateId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const updated = await ctx.prisma.interview.update({
        where: { id: input.id },
        data: { status: input.action },
      });

      // Notify employer
      const { createNotification } = await import("../lib/notifications/service");
      const candidateName = interview.application.candidate.name || "Ứng viên";
      const actionLabel = input.action === "CONFIRMED" ? "đã xác nhận" : "đã từ chối";
      const dateStr = interview.scheduledAt.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = interview.scheduledAt.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await createNotification({
        userId: interview.application.job.organization.userId,
        type: "INTERVIEW_INVITATION" as any,
        title: `Ứng viên ${actionLabel} lịch phỏng vấn`,
        body: `${candidateName} ${actionLabel} lịch phỏng vấn cho vị trí "${interview.application.job.title}" vào ${dateStr} lúc ${timeStr}.`,
        data: {
          interviewId: updated.id,
          applicationId: interview.applicationId,
        },
      });

      return updated;
    }),

  // ── Delete / Cancel interview ───────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const interview = await ctx.prisma.interview.findUnique({
        where: { id: input.id },
        include: {
          application: {
            include: {
              job: { include: { organization: true } },
            },
          },
        },
      });

      if (!interview) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" });
      }

      const isEmployer = interview.application.job.organization.userId === ctx.session.user.id;
      const isAdmin = (ctx.session.user as any)?.role === "ADMIN";
      if (!isEmployer && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return ctx.prisma.interview.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),
});
