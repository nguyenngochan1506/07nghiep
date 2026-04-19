import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

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
      user: ctx.user,
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

export const candidateProcedure = protectedProcedure.use(createRoleGuard(["CANDIDATE"]));

export const employerProcedure = protectedProcedure.use(createRoleGuard(["EMPLOYER"]));

export const adminProcedure = protectedProcedure.use(createRoleGuard(["ADMIN"]));

export const employerOrAdminProcedure = protectedProcedure.use(createRoleGuard(["EMPLOYER", "ADMIN"]));

export const candidateOrAdminProcedure = protectedProcedure.use(createRoleGuard(["CANDIDATE", "ADMIN"]));
