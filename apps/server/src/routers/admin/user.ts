import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { adminProcedure, router } from "../../lib/api";
import { type Prisma, UserRole } from "@07nghiep/db";

const ACTIVITY_TYPES = ["LOGIN", "PROFILE_UPDATED", "APPLICATION_SUBMITTED", "JOB_POSTED"] as const;

type TimelineItem = {
  type: (typeof ACTIVITY_TYPES)[number];
  label: string;
  occurredAt: Date;
};

function getJsonString(value: Prisma.JsonValue | null, key: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const property = value[key];
  return typeof property === "string" ? property : null;
}

const userListSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(200).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const updateStatusSchema = z.object({
  userIds: z.array(z.string()).min(1),
  action: z.enum(["suspend", "activate"]),
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole),
});

const getDetailSchema = z.object({ id: z.string() });

const addAdminNoteSchema = z.object({
  userId: z.string(),
  content: z.string().trim().min(1).max(2000),
});

const resetPasswordSchema = z.object({
  userId: z.string(),
  password: z.string().min(8).max(256),
});

const deleteUserSchema = z.object({ userId: z.string() });

const subscriptionStatusSchema = z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]);

const cancelSubscriptionSchema = z.object({
  userId: z.string().min(1),
  subscriptionId: z.string().min(1),
});

const updateSubscriptionSchema = z
  .object({
    userId: z.string().min(1),
    subscriptionId: z.string().min(1),
    planId: z.string().min(1),
    status: subscriptionStatusSchema,
    currentPeriodStart: z.coerce.date(),
    currentPeriodEnd: z.coerce.date(),
    aiCvQuotaLimit: z.number().int().min(0).nullable(),
    aiCvQuotaUsed: z.number().int().min(0),
  })
  .superRefine((value, ctx) => {
    if (value.currentPeriodStart >= value.currentPeriodEnd) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPeriodEnd"],
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    }

    if (value.aiCvQuotaLimit !== null && value.aiCvQuotaUsed > value.aiCvQuotaLimit) {
      ctx.addIssue({
        code: "custom",
        path: ["aiCvQuotaUsed"],
        message: "Số lượt đã dùng không được vượt quá giới hạn.",
      });
    }
  });

async function syncEmployerRoleAfterSubscriptionChange({
  prisma,
  userId,
  now = new Date(),
}: {
  prisma: {
    subscription: {
      findFirst(args: any): Promise<{ id: string } | null>;
    };
    user: {
      updateMany(args: any): Promise<unknown>;
    };
  };
  userId: string;
  now?: Date;
}) {
  const activeEmployerSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: now },
      currentPeriodEnd: { gt: now },
      plan: { code: "EMPLOYER_MONTHLY" },
    },
    select: { id: true },
  });

  if (activeEmployerSubscription) {
    return;
  }

  await prisma.user.updateMany({
    where: { id: userId, role: "EMPLOYER" },
    data: { role: "CANDIDATE" },
  });
}

function isSubscriptionActiveNow({
  status,
  currentPeriodStart,
  currentPeriodEnd,
  now = new Date(),
}: {
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}) {
  return status === "ACTIVE" && currentPeriodStart <= now && now < currentPeriodEnd;
}

export const adminUserRouter = router({
  list: adminProcedure.input(userListSchema).query(async ({ ctx, input }) => {
    const { page, limit, search, role, status, sortBy, order } = input;

    const where: Prisma.UserWhereInput = {};

    if (role) where.role = role;

    if (search && search.trim() !== "") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "ACTIVE") {
      where.isSuspended = false;
    } else if (status === "SUSPENDED") {
      where.isSuspended = true;
    }

    // exclude soft-deleted users
    where.deletedAt = null;

    const total = await ctx.prisma.user.count({ where });

    const users = await ctx.prisma.user.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    const mapped = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      joined: u.createdAt,
      updatedAt: u.updatedAt,
      status: u.isSuspended ? "SUSPENDED" : "ACTIVE",
    }));

    return { data: mapped, total, totalPages, page, limit };
  }),

  updateStatus: adminProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const { userIds, action } = input;

    if (!userIds || userIds.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "userIds required" });
    }

    if (action === "suspend") {
      // Suspend: invalidate all sessions for these users so they cannot continue using the system.
      await ctx.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isSuspended: true },
      });
      await ctx.prisma.session.deleteMany({ where: { userId: { in: userIds } } });
      return { success: true, action: "suspend", count: userIds.length };
    }

    if (action === "activate") {
      await ctx.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { isSuspended: false },
      });

      return { success: true, action: "activate", count: userIds.length };
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown action" });
  }),

  updateRole: adminProcedure.input(updateRoleSchema).mutation(async ({ ctx, input }) => {
    const { userId, role } = input;

    const user = await ctx.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const prev = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const updated = await ctx.prisma.user.update({ where: { id: userId }, data: { role } });

    // Record role change as internal notification for history
    try {
      const adminId = ctx.session?.user.id ?? null;
      await ctx.prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "SYSTEM",
          title: "Thay đổi vai trò",
          body: `Role changed from ${prev?.role ?? "UNKNOWN"} to ${updated.role}`,
          data: {
            internal: true,
            previousRole: prev?.role ?? null,
            newRole: updated.role,
            adminId,
          },
        },
      });
    } catch (e) {
      console.error("Failed to record role change:", e);
    }

    return { success: true, user: { id: updated.id, role: updated.role } };
  }),

  // suggestions for autocomplete (name or email)
  suggestions: adminProcedure
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const q = input.q.trim();
      if (!q) return [] as { id: string; label: string; email?: string }[];

      const users = await ctx.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true },
      });

      return users.map((u) => ({ id: u.id, label: `${u.name} <${u.email}>`, email: u.email }));
    }),

  getDetail: adminProcedure.input(getDetailSchema).query(async ({ ctx, input }) => {
    const { id } = input;

    const user = await ctx.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        organization: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Activity snapshots
    const [
      applications,
      jobsPosted,
      messagesCount,
      lastSession,
      recentSessions,
      adminNotesRaw,
      subscriptions,
    ] = await Promise.all([
        ctx.prisma.application.findMany({
          where: { candidateId: id },
          orderBy: { appliedAt: "desc" },
          take: 10,
        }),
        ctx.prisma.job.findMany({
          where: { organization: { userId: id } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        ctx.prisma.message.count({ where: { senderId: id } }),
        ctx.prisma.session.findFirst({ where: { userId: id }, orderBy: { updatedAt: "desc" } }),
        ctx.prisma.session.findMany({
          where: { userId: id },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        ctx.prisma.notification.findMany({
          where: {
            userId: id,
            type: "SYSTEM",
            title: "ADMIN_NOTE",
            data: { path: ["internal"], equals: true },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        ctx.prisma.subscription.findMany({
          where: { userId: id },
          orderBy: { currentPeriodEnd: "desc" },
          include: {
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                priceVnd: true,
                durationDays: true,
                active: true,
              },
            },
          },
        }),
      ]);

    // fetch role change history
    const roleChangesRaw = await ctx.prisma.notification.findMany({
      where: { userId: id, type: "SYSTEM", title: "Thay đổi vai trò" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const timeline: TimelineItem[] = [
      ...recentSessions.map((s) => ({
        type: "LOGIN" as const,
        label: "Đăng nhập hệ thống",
        occurredAt: s.updatedAt,
      })),
      ...applications.map((a) => ({
        type: "APPLICATION_SUBMITTED" as const,
        label: "Nộp đơn ứng tuyển",
        occurredAt: a.appliedAt,
      })),
      ...jobsPosted.map((j) => ({
        type: "JOB_POSTED" as const,
        label: `Đăng tin tuyển dụng: ${j.title}`,
        occurredAt: j.createdAt,
      })),
      ...(user.profile
        ? [
            {
              type: "PROFILE_UPDATED" as const,
              label: "Cập nhật hồ sơ cá nhân",
              occurredAt: user.profile.updatedAt,
            },
          ]
        : []),
    ]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 50);

    const adminNotes = adminNotesRaw.map((n) => ({
      id: n.id,
      text: n.body,
      createdAt: n.createdAt,
      createdBy: (n.data as { adminId?: string } | null)?.adminId ?? null,
    }));

    const roleHistory = roleChangesRaw.map((n) => ({
      id: n.id,
      previousRole: getJsonString(n.data, "previousRole"),
      newRole: getJsonString(n.data, "newRole"),
      adminId: getJsonString(n.data, "adminId"),
      createdAt: n.createdAt,
      note: n.body,
    }));

    return {
      user,
      status: user.isSuspended ? "SUSPENDED" : "ACTIVE",
      activity: {
        recentApplications: applications,
        recentJobsPosted: jobsPosted,
        messagesCount,
        lastSession,
        timeline,
      },
      adminNotes,
      roleHistory,
      subscriptions,
    };
  }),

  cancelSubscription: adminProcedure
    .input(cancelSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: { plan: { select: { code: true } } },
      });

      if (!subscription || subscription.userId !== input.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy gói đăng ký" });
      }

      const now = new Date();
      await ctx.prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          status: "CANCELLED",
          currentPeriodEnd: now,
        },
      });

      if (subscription.plan.code === "EMPLOYER_MONTHLY") {
        await syncEmployerRoleAfterSubscriptionChange({
          prisma: ctx.prisma,
          userId: input.userId,
          now,
        });
      }

      return { success: true };
    }),

  updateSubscription: adminProcedure
    .input(updateSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const subscription = await ctx.prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: { plan: { select: { code: true } } },
      });

      if (!subscription || subscription.userId !== input.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy gói đăng ký" });
      }

      const plan = await ctx.prisma.billingPlan.findUnique({
        where: { id: input.planId },
        select: { id: true, code: true },
      });

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy gói thanh toán" });
      }

      await ctx.prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          planId: input.planId,
          status: input.status,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          aiCvQuotaLimit: input.aiCvQuotaLimit,
          aiCvQuotaUsed: input.aiCvQuotaUsed,
        },
      });

      const touchesEmployerPlan =
        subscription.plan.code === "EMPLOYER_MONTHLY" || plan.code === "EMPLOYER_MONTHLY";

      if (plan.code === "EMPLOYER_MONTHLY" && isSubscriptionActiveNow(input)) {
        await ctx.prisma.user.updateMany({
          where: { id: input.userId, role: "CANDIDATE" },
          data: { role: "EMPLOYER" },
        });
      }

      if (touchesEmployerPlan) {
        await syncEmployerRoleAfterSubscriptionChange({
          prisma: ctx.prisma,
          userId: input.userId,
        });
      }

      return { success: true };
    }),

  addAdminNote: adminProcedure.input(addAdminNoteSchema).mutation(async ({ ctx, input }) => {
    const { userId, content } = input;

    const user = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const session = ctx.session;
    if (!session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const adminId = session.user.id;

    const note = await ctx.prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: "SYSTEM",
        title: "ADMIN_NOTE",
        body: content,
        data: {
          internal: true,
          adminId,
        },
      },
    });

    return {
      success: true,
      note: {
        id: note.id,
        text: note.body,
        createdAt: note.createdAt,
      },
    };
  }),

  resetPassword: adminProcedure.input(resetPasswordSchema).mutation(async ({ ctx, input }) => {
    const { userId, password } = input;

    const user = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const passwordHash = await hashPassword(password);
    const credentialAccount = await ctx.prisma.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    });

    if (credentialAccount) {
      await ctx.prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: passwordHash },
      });
    } else {
      await ctx.prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          accountId: userId,
          providerId: "credential",
          password: passwordHash,
        },
      });
    }

    await ctx.prisma.session.deleteMany({ where: { userId } });

    return {
      success: true,
    };
  }),

  deleteUser: adminProcedure.input(deleteUserSchema).mutation(async ({ ctx, input }) => {
    const { userId } = input;

    const session = ctx.session;
    if (!session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const currentUserId = session.user.id;

    if (currentUserId === userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete your own account" });
    }

    const user = await ctx.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Soft-delete: set deletedAt timestamp
    await ctx.prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });

    try {
      await ctx.prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          type: "SYSTEM",
          title: "USER_DELETED",
          body: "User soft-deleted by admin",
          data: { internal: true, adminId: ctx.session?.user.id ?? null, soft: true },
        },
      });
    } catch (e) {
      console.error("Failed to record user delete notification:", e);
    }

    return { success: true };
  }),
});

export default adminUserRouter;
