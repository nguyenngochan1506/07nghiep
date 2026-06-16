import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/api";

const userSelect = {
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { avatarUrl: true } },
  },
} as const;

const messageSelect = {
  id: true,
  content: true,
  senderId: true,
  read: true,
  createdAt: true,
} as const;

export const conversationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const role = ctx.role as string;

    const where =
      role === "EMPLOYER" || role === "ADMIN" ? { employerId: userId } : { candidateId: userId };

    const conversations = await ctx.prisma.conversation.findMany({
      where,
      include: {
        employer: userSelect,
        candidate: userSelect,
        job: {
          select: { id: true, title: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: messageSelect,
        },
        _count: {
          select: {
            messages: {
              where: {
                read: false,
                senderId: { not: userId },
              },
            },
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    return conversations.map((c) => ({
      id: c.id,
      jobId: c.jobId,
      job: c.job,
      employer: c.employer,
      candidate: c.candidate,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    }));
  }),

  getApplicants: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { search, page, limit } = input;

      const organization = await ctx.prisma.organization.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!organization) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must have an organization to view applicants.",
        });
      }

      const where: any = {
        job: { organizationId: organization.id },
        ...(search
          ? {
              candidate: {
                name: { contains: search, mode: "insensitive" },
              },
            }
          : {}),
      };

      const allApplications = await ctx.prisma.application.findMany({
        where,
        select: {
          id: true,
          status: true,
          appliedAt: true,
          candidateId: true,
          jobId: true,
          candidate: userSelect,
          job: {
            select: { id: true, title: true },
          },
        },
        orderBy: { appliedAt: "desc" },
      });

      const seen = new Map<string, (typeof allApplications)[0]>();
      for (const app of allApplications) {
        if (!seen.has(app.candidateId)) {
          seen.set(app.candidateId, app);
        }
      }
      const uniqueApplicants = Array.from(seen.values());
      const total = uniqueApplicants.length;
      const paged = uniqueApplicants.slice((page - 1) * limit, page * limit);

      const candidateIds = paged.map((a) => a.candidateId);

      const existingConversations = await ctx.prisma.conversation.findMany({
        where: {
          employerId: userId,
          candidateId: { in: candidateIds },
        },
        select: {
          id: true,
          candidateId: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: messageSelect,
          },
          _count: {
            select: {
              messages: {
                where: {
                  read: false,
                  senderId: { not: userId },
                },
              },
            },
          },
        },
      });

      const convMap = new Map(existingConversations.map((c) => [c.candidateId, c]));

      const applicants = paged.map((a) => {
        const conv = convMap.get(a.candidateId);
        return {
          id: a.candidateId,
          candidate: a.candidate,
          job: a.job,
          applicationId: a.id,
          applicationStatus: a.status,
          appliedAt: a.appliedAt,
          conversationId: conv?.id ?? null,
          lastMessage: conv?.messages[0] ?? null,
          unreadCount: conv?._count.messages ?? 0,
        };
      });

      return {
        items: applicants,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const conversation = await ctx.prisma.conversation.findUnique({
      where: { id: input.id },
      include: {
        employer: userSelect,
        candidate: userSelect,
        job: {
          select: { id: true, title: true },
        },
      },
    });

    if (!conversation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (conversation.employerId !== userId && conversation.candidateId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this conversation",
      });
    }

    return conversation;
  }),

  start: protectedProcedure
    .input(
      z.object({
        candidateId: z.string(),
        jobId: z.string().optional(),
        initialMessage: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.role as string;

      let employerId: string;
      let candidateId: string;

      if (role === "EMPLOYER" || role === "ADMIN") {
        employerId = userId;
        candidateId = input.candidateId;
      } else {
        employerId = input.candidateId;
        candidateId = userId;
      }

      if (input.jobId) {
        const job = await ctx.prisma.job.findUnique({
          where: { id: input.jobId },
          select: { id: true, organizationId: true },
        });

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Job not found",
          });
        }

        const organization = await ctx.prisma.organization.findUnique({
          where: { id: job.organizationId },
          select: { userId: true },
        });

        if (organization) {
          employerId = organization.userId;
        }
      }

      const existing = await ctx.prisma.conversation.findFirst({
        where: {
          employerId,
          candidateId,
          jobId: input.jobId ?? null,
        },
      });

      if (existing) {
        if (input.initialMessage) {
          const message = await ctx.prisma.message.create({
            data: {
              conversationId: existing.id,
              senderId: userId,
              content: input.initialMessage,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  profile: { select: { avatarUrl: true } },
                },
              },
            },
          });

          await ctx.prisma.conversation.update({
            where: { id: existing.id },
            data: { lastMessageAt: new Date() },
          });

          const { messageEvents } = await import("../lib/messaging/events");
          messageEvents.emit(`message:${existing.id}`, {
            ...message,
            createdAt: message.createdAt.toISOString(),
          });

          await notifyOtherParty(
            ctx,
            existing.employerId,
            existing.candidateId,
            userId,
            input.initialMessage,
            existing.id,
          );
        }

        return existing;
      }

      const conversation = await ctx.prisma.conversation.create({
        data: {
          employerId,
          candidateId,
          jobId: input.jobId ?? null,
          ...(input.initialMessage
            ? {
                messages: {
                  create: {
                    senderId: userId,
                    content: input.initialMessage,
                  },
                },
              }
            : {}),
        },
        include: {
          employer: userSelect,
          candidate: userSelect,
          job: {
            select: { id: true, title: true },
          },
        },
      });

      if (input.initialMessage) {
        const msg = await ctx.prisma.message.findFirst({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
                profile: { select: { avatarUrl: true } },
              },
            },
          },
        });

        if (msg) {
          const { messageEvents } = await import("../lib/messaging/events");
          messageEvents.emit(`message:${conversation.id}`, {
            ...msg,
            createdAt: msg.createdAt.toISOString(),
          });
        }

        await notifyOtherParty(
          ctx,
          employerId,
          candidateId,
          userId,
          input.initialMessage,
          conversation.id,
        );
      }

      return conversation;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.id },
        select: { id: true, employerId: true, candidateId: true },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.employerId !== userId && conversation.candidateId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const updated = await ctx.prisma.message.updateMany({
        where: {
          conversationId: input.id,
          senderId: { not: userId },
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });

      return { markedCount: updated.count };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const role = ctx.role as string;

    const where =
      role === "EMPLOYER" || role === "ADMIN" ? { employerId: userId } : { candidateId: userId };

    const conversations = await ctx.prisma.conversation.findMany({
      where,
      select: { id: true },
    });

    if (conversations.length === 0) return 0;

    return ctx.prisma.message.count({
      where: {
        conversationId: {
          in: conversations.map((c) => c.id),
        },
        senderId: { not: userId },
        read: false,
      },
    });
  }),
});

async function notifyOtherParty(
  ctx: any,
  employerId: string,
  candidateId: string,
  senderId: string,
  content: string,
  conversationId: string,
) {
  const targetUserId = senderId === employerId ? candidateId : employerId;
  const sender = await ctx.prisma.user.findUnique({
    where: { id: senderId },
    select: { name: true },
  });

  const { createNotification } = await import("../lib/notifications/service");
  await createNotification({
    userId: targetUserId,
    type: "MESSAGE",
    title: "Tin nhắn mới",
    body: `${sender?.name || "Ai đó"}: ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`,
    data: {
      conversationId,
      senderId,
    },
  });
}
