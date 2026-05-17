import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../lib/api";

const senderSelect = {
  select: {
    id: true,
    name: true,
    image: true,
    profile: { select: { avatarUrl: true } },
  },
} as const;

export const messageRouter = router({
  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, employerId: true, candidateId: true },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (
        conversation.employerId !== userId &&
        conversation.candidateId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const message = await ctx.prisma.message.create({
        data: {
          conversationId: input.conversationId,
          senderId: userId,
          content: input.content,
        },
        include: {
          sender: senderSelect,
        },
      });

      await ctx.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: new Date() },
      });

      const { messageEvents } = await import("../lib/messaging/events");
      messageEvents.emit(`message:${input.conversationId}`, {
        ...message,
        createdAt: message.createdAt.toISOString(),
      });

      const targetUserId =
        conversation.employerId === userId
          ? conversation.candidateId
          : conversation.employerId;

      const { createNotification } = await import("../lib/notifications/service");
      await createNotification({
        userId: targetUserId,
        type: "MESSAGE",
        title: "Tin nhắn mới",
        body: `${message.sender.name || "Ai đó"}: ${input.content.slice(0, 100)}${input.content.length > 100 ? "..." : ""}`,
        data: {
          conversationId: input.conversationId,
          senderId: userId,
        },
      });

      return message;
    }),

  list: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { conversationId, cursor, limit } = input;

      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { employerId: true, candidateId: true },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (
        conversation.employerId !== userId &&
        conversation.candidateId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const messages = await ctx.prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          sender: senderSelect,
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: messages.reverse(),
        nextCursor,
      };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const conversation = await ctx.prisma.conversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, employerId: true, candidateId: true },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (
        conversation.employerId !== userId &&
        conversation.candidateId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this conversation",
        });
      }

      const updated = await ctx.prisma.message.updateMany({
        where: {
          conversationId: input.conversationId,
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
});
