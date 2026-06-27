import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/api";

export const notificationRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, unreadOnly } = input;
      const userId = ctx.session.user.id;

      const items = await ctx.prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { read: false } : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          read: true,
          createdAt: true,
        },
      });

      let nextCursor: typeof cursor | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification || notification.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return ctx.prisma.notification.update({
        where: { id: input.id },
        data: {
          read: true,
          readAt: new Date(),
        },
        select: { id: true },
      });
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.prisma.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findUnique({
        where: { id: input.id },
      });

      if (!notification || notification.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return ctx.prisma.notification.delete({
        where: { id: input.id },
      });
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notification.count({
      where: {
        userId: ctx.session.user.id,
        read: false,
      },
    });
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.notificationPreference.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  updatePreference: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "APPLICATION_RECEIVED",
          "APPLICATION_STATUS",
          "MESSAGE",
          "JOB_ALERT",
          "SYSTEM",
          "INTERVIEW_INVITATION",
        ]),
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { type, pushEnabled, emailEnabled } = input;
      const userId = ctx.session.user.id;

      return ctx.prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
        create: {
          userId,
          type,
          pushEnabled: pushEnabled ?? true,
          emailEnabled: emailEnabled ?? true,
        },
        update: {
          ...(pushEnabled !== undefined && { pushEnabled }),
          ...(emailEnabled !== undefined && { emailEnabled }),
        },
      });
    }),

  testEmit: protectedProcedure
    .input(z.object({ title: z.string(), body: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { createNotification } = await import("../lib/notifications/service");
      return createNotification({
        userId: ctx.session.user.id,
        type: "SYSTEM",
        title: input.title,
        body: input.body,
      });
    }),
});
