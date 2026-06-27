import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export type { Context } from "./context";

export {
  profileUpdateSchema,
  organizationCreateSchema,
  organizationUpdateSchema,
  jobCreateSchema,
  jobUpdateSchema,
  jobListQuerySchema,
} from "./schemas";
export type {
  ProfileUpdateInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
  JobCreateInput,
  JobUpdateInput,
  JobListQuery,
} from "./schemas";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
      role: ctx.role,
    },
  });
});

type UserRole = "CANDIDATE" | "EMPLOYER" | "ADMIN";

function createRoleGuard(allowedRoles: UserRole[]) {
  return t.middleware(({ ctx, next }) => {
    const userRole = ctx.role as UserRole | undefined;

    if (!userRole) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${userRole}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        role: userRole,
      },
    });
  });
}

export const candidateProcedure = protectedProcedure.use(
  createRoleGuard(["CANDIDATE", "EMPLOYER", "ADMIN"]),
);

export const employerProcedure = protectedProcedure.use(createRoleGuard(["EMPLOYER", "ADMIN"]));

export const adminProcedure = protectedProcedure.use(createRoleGuard(["ADMIN"]));

export const employerOrAdminProcedure = protectedProcedure.use(
  createRoleGuard(["EMPLOYER", "ADMIN"]),
);

export async function hasActiveEmployerSubscription(ctx: Context) {
  if (!ctx.session?.user?.id) return false;

  const subscription = await ctx.prisma.subscription.findFirst({
    where: {
      userId: ctx.session.user.id,
      status: "ACTIVE",
      currentPeriodStart: { lte: new Date() },
      currentPeriodEnd: { gt: new Date() },
      plan: { code: "EMPLOYER_MONTHLY" },
    },
    select: { id: true },
  });

  return Boolean(subscription);
}

export async function requireActiveEmployerSubscription(ctx: Context) {
  if (ctx.role === "ADMIN") return;

  if (!(await hasActiveEmployerSubscription(ctx))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Gói nhà tuyển dụng đã hết hạn hoặc chưa được kích hoạt.",
    });
  }
}

export const paidEmployerProcedure = employerProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  await requireActiveEmployerSubscription(ctx);

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.session.user,
      role: ctx.role,
    },
  });
});
