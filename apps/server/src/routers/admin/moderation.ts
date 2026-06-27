import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { adminProcedure, protectedProcedure, router } from "../../lib/api";
import {
  ContentType,
  JobStatus,
  ModerationAction,
  NotificationType,
  type Prisma,
  ReportStatus,
  ReportType,
  type PrismaClient,
} from "@07nghiep/db";

// Input schemas
const listPendingJobsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

const approveJobSchema = z.object({
  jobId: z.string(),
});

const rejectJobSchema = z.object({
  jobId: z.string(),
  reason: z.string().min(1).max(2000),
});

const requestChangesSchema = z.object({
  jobId: z.string(),
  feedback: z.string().min(1).max(2000),
});

const listReportsSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  type: z.nativeEnum(ReportType).optional(),
  status: z.nativeEnum(ReportStatus).optional(),
  contentType: z.nativeEnum(ContentType).optional(),
});

const getReportSchema = z.object({
  id: z.string(),
});

const resolveReportSchema = z.object({
  id: z.string(),
  action: z.nativeEnum(ModerationAction),
  notes: z.string().max(2000).optional(),
});

const createReportSchema = z.object({
  contentType: z.nativeEnum(ContentType),
  contentId: z.string(),
  reportType: z.nativeEnum(ReportType),
  description: z.string().max(2000).optional(),
});

const getModerationHistorySchema = z.object({
  jobId: z.string().optional(),
  moderatorId: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

type DbClient = PrismaClient;
type ReportContentRef = {
  contentType: ContentType;
  contentId: string;
};

const reportTypeLabels: Record<ReportType, string> = {
  INAPPROPRIATE_CONTENT: "Nội dung không phù hợp",
  SPAM: "Spam",
  SCAM_FRAUD: "Lừa đảo",
  DUPLICATE_POSTING: "Đăng trùng",
  OTHER: "Khác",
};

async function notifyUser(
  prisma: DbClient,
  userId: string,
  title: string,
  body: string,
  data?: Prisma.InputJsonValue
) {
  return prisma.notification.create({
    data: {
      userId,
      type: NotificationType.SYSTEM,
      title,
      body,
      data,
    },
  });
}

async function getContentOwnerId(prisma: DbClient, ref: ReportContentRef) {
  if (ref.contentType === ContentType.USER) {
    return ref.contentId;
  }

  if (ref.contentType === ContentType.JOB) {
    const job = await prisma.job.findUnique({
      where: { id: ref.contentId },
      select: { organization: { select: { userId: true } } },
    });

    return job?.organization.userId ?? null;
  }

  const message = await prisma.message.findUnique({
    where: { id: ref.contentId },
    select: { senderId: true },
  });

  return message?.senderId ?? null;
}

async function getReportContent(prisma: DbClient, ref: ReportContentRef, detail = false) {
  if (ref.contentType === ContentType.JOB) {
    if (detail) {
      return prisma.job.findUnique({
        where: { id: ref.contentId },
        include: {
          organization: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
    }

    return prisma.job.findUnique({
      where: { id: ref.contentId },
      select: {
        id: true,
        title: true,
        status: true,
        organization: {
          select: {
            name: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  if (ref.contentType === ContentType.USER) {
    return prisma.user.findUnique({
      where: { id: ref.contentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ...(detail ? { isSuspended: true, createdAt: true } : {}),
      },
    });
  }

  if (detail) {
    return prisma.message.findUnique({
      where: { id: ref.contentId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        conversation: {
          select: {
            id: true,
            job: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  return prisma.message.findUnique({
    where: { id: ref.contentId },
    select: {
      id: true,
      content: true,
      sender: { select: { name: true, email: true } },
    },
  });
}

async function getReportableContentTitle(prisma: DbClient, ref: ReportContentRef) {
  if (ref.contentType === ContentType.JOB) {
    const job = await prisma.job.findUnique({
      where: { id: ref.contentId },
      select: { title: true },
    });

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }

    return job.title || "Công việc";
  }

  if (ref.contentType === ContentType.USER) {
    const user = await prisma.user.findUnique({
      where: { id: ref.contentId },
      select: { name: true },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user.name || "Người dùng";
  }

  const message = await prisma.message.findUnique({
    where: { id: ref.contentId },
    select: { id: true },
  });

  if (!message) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
  }

  return "Tin nhắn";
}

export const moderationRouter = router({
  getJobForReview: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.prisma.job.findUnique({
        where: { id: input.jobId },
        include: {
          organization: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      return job;
    }),

  listPendingJobs: adminProcedure
    .input(listPendingJobsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;

      const where = { status: JobStatus.PENDING_APPROVAL };

      const total = await ctx.prisma.job.count({ where });

      const jobs = await ctx.prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: jobs,
        total,
        totalPages,
        page,
        limit,
      };
    }),

  approveJob: adminProcedure
    .input(approveJobSchema)
    .mutation(async ({ ctx, input }) => {
      const { jobId } = input;

      const job = await ctx.prisma.job.findUnique({
        where: { id: jobId },
        include: { organization: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status !== JobStatus.PENDING_APPROVAL) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job is not pending approval",
        });
      }

      const updatedJob = await ctx.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.OPEN,
          publishedAt: new Date(),
        },
      });

      await ctx.prisma.moderationHistory.create({
        data: {
          jobId,
          moderatorId: ctx.session!.user.id,
          action: ModerationAction.APPROVE,
        },
      });

      await notifyUser(
        ctx.prisma,
        job.organization.userId,
        "Tin tuyển dụng được phê duyệt",
        `Tin tuyển dụng "${job.title}" đã được phê duyệt và công khai.`,
        { jobId }
      );

      return { success: true, job: updatedJob };
    }),

  rejectJob: adminProcedure
    .input(rejectJobSchema)
    .mutation(async ({ ctx, input }) => {
      const { jobId, reason } = input;

      const job = await ctx.prisma.job.findUnique({
        where: { id: jobId },
        include: { organization: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status !== JobStatus.PENDING_APPROVAL) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job is not pending approval",
        });
      }

      const updatedJob = await ctx.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.DRAFT,
        },
      });

      await ctx.prisma.moderationHistory.create({
        data: {
          jobId,
          moderatorId: ctx.session!.user.id,
          action: ModerationAction.REJECT,
          reason,
        },
      });

      await notifyUser(
        ctx.prisma,
        job.organization.userId,
        "Tin tuyển dụng bị từ chối",
        `Tin tuyển dụng "${job.title}" không được phê duyệt. Lý do: ${reason}`,
        { jobId, reason }
      );

      return { success: true, job: updatedJob };
    }),

  requestChanges: adminProcedure
    .input(requestChangesSchema)
    .mutation(async ({ ctx, input }) => {
      const { jobId, feedback } = input;

      const job = await ctx.prisma.job.findUnique({
        where: { id: jobId },
        include: { organization: true },
      });

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status !== JobStatus.PENDING_APPROVAL) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Job is not pending approval",
        });
      }

      const updatedJob = await ctx.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.DRAFT,
        },
      });

      await ctx.prisma.moderationHistory.create({
        data: {
          jobId,
          moderatorId: ctx.session!.user.id,
          action: ModerationAction.REQUEST_CHANGES,
          feedback,
        },
      });

      await notifyUser(
        ctx.prisma,
        job.organization.userId,
        "Yêu cầu chỉnh sửa tin tuyển dụng",
        `Tin tuyển dụng "${job.title}" cần chỉnh sửa. Góp ý: ${feedback}`,
        { jobId, feedback }
      );

      return { success: true, job: updatedJob };
    }),

  listReports: adminProcedure
    .input(listReportsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, type, status, contentType } = input;

      const where: Prisma.ReportWhereInput = {};

      if (type) where.reportType = type;
      if (status) where.status = status;
      if (contentType) where.contentType = contentType;

      const total = await ctx.prisma.report.count({ where });

      const reports = await ctx.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          resolver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      const reportsWithContent = await Promise.all(
        reports.map(async (report) => ({
          ...report,
          content: await getReportContent(ctx.prisma, report),
        }))
      );

      return {
        data: reportsWithContent,
        total,
        totalPages,
        page,
        limit,
      };
    }),

  getReport: adminProcedure.input(getReportSchema).query(async ({ ctx, input }) => {
    const { id } = input;

    const report = await ctx.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        resolver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
    }

    return {
      ...report,
      content: await getReportContent(ctx.prisma, report, true),
    };
  }),

  resolveReport: adminProcedure
    .input(resolveReportSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, action, notes } = input;

      const report = await ctx.prisma.report.findUnique({
        where: { id },
        include: {
          reporter: true,
        },
      });

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      if (report.status !== ReportStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Report already resolved",
        });
      }

      const ref = {
        contentType: report.contentType,
        contentId: report.contentId,
      };
      const contentOwnerId = await getContentOwnerId(ctx.prisma, ref);

      if (action === ModerationAction.REMOVE_CONTENT) {
        if (report.contentType === ContentType.JOB) {
          await ctx.prisma.job.update({
            where: { id: report.contentId },
            data: { status: JobStatus.ARCHIVED },
          });

          const job = await ctx.prisma.job.findUnique({
            where: { id: report.contentId },
            select: { title: true },
          });

          if (contentOwnerId && job) {
            await notifyUser(
              ctx.prisma,
              contentOwnerId,
              "Tin tuyển dụng bị gỡ",
              `Tin tuyển dụng "${job.title}" đã bị gỡ bỏ do vi phạm chính sách.`,
              { jobId: report.contentId, reportId: id }
            );
          }
        } else if (report.contentType === ContentType.MESSAGE) {
          await ctx.prisma.message.delete({
            where: { id: report.contentId },
          });
        }
      } else if (action === ModerationAction.WARN_USER) {
        if (contentOwnerId) {
          await notifyUser(
            ctx.prisma,
            contentOwnerId,
            "Cảnh báo vi phạm",
            `Bạn đã nhận được cảnh báo do vi phạm chính sách của nền tảng. ${notes || ""}`,
            { reportId: id, warning: true }
          );
        }
      } else if (action === ModerationAction.BAN_USER) {
        if (contentOwnerId) {
          await ctx.prisma.user.update({
            where: { id: contentOwnerId },
            data: { isSuspended: true },
          });

          await ctx.prisma.session.deleteMany({
            where: { userId: contentOwnerId },
          });

          await notifyUser(
            ctx.prisma,
            contentOwnerId,
            "Tài khoản bị khóa",
            "Tài khoản của bạn đã bị khóa do vi phạm nghiêm trọng chính sách của nền tảng.",
            { reportId: id, banned: true }
          );
        }
      }

      const updatedReport = await ctx.prisma.report.update({
        where: { id },
        data: {
          status:
            action === ModerationAction.DISMISS_REPORT
              ? ReportStatus.DISMISSED
              : ReportStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: ctx.session!.user.id,
          resolution: notes || `Action taken: ${action}`,
        },
      });

      await notifyUser(
        ctx.prisma,
        report.reporterId,
        "Báo cáo đã được xử lý",
        action === ModerationAction.DISMISS_REPORT
          ? "Báo cáo của bạn đã được xem xét và bác bỏ."
          : "Báo cáo của bạn đã được xử lý. Cảm ơn bạn đã giúp cải thiện cộng đồng.",
        { reportId: id, action }
      );

      return { success: true, report: updatedReport };
    }),

  getModerationHistory: adminProcedure
    .input(getModerationHistorySchema)
    .query(async ({ ctx, input }) => {
      const { jobId, moderatorId, page, limit } = input;

      const where: Prisma.ModerationHistoryWhereInput = {};

      if (jobId) where.jobId = jobId;
      if (moderatorId) where.moderatorId = moderatorId;

      const total = await ctx.prisma.moderationHistory.count({ where });

      const history = await ctx.prisma.moderationHistory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          moderator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: history,
        total,
        totalPages,
        page,
        limit,
      };
    }),
});

export const reportRouter = router({
  create: protectedProcedure
    .input(createReportSchema)
    .mutation(async ({ ctx, input }) => {
      const { contentType, contentId, reportType, description } = input;
      const ref = { contentType, contentId };
      const contentTitle = await getReportableContentTitle(ctx.prisma, ref);
      const existingReport = await ctx.prisma.report.findFirst({
        where: {
          contentType,
          contentId,
          reporterId: ctx.session.user.id,
          status: ReportStatus.PENDING,
        },
      });

      if (existingReport) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already reported this content",
        });
      }

      const report = await ctx.prisma.report.create({
        data: {
          contentType,
          contentId,
          reporterId: ctx.session.user.id,
          reportType,
          description,
        },
      });

      const admins = await ctx.prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          notifyUser(
            ctx.prisma,
            admin.id,
            "Báo cáo vi phạm mới",
            `${reportTypeLabels[reportType]}: "${contentTitle}"`,
            { reportId: report.id, contentType, contentId }
          )
        )
      );

      return { success: true, report };
    }),
});

export default moderationRouter;
