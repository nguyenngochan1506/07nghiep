import { initTRPC, TRPCError } from "@trpc/server";

export const t = initTRPC.context<{ session: any }>().create();

export type UserRole = "CANDIDATE" | "EMPLOYER" | "ADMIN";

export function roleGuard(allowedRoles: UserRole[]) {
  return t.middleware(({ ctx, next }) => {
    const user = ctx.session?.user as { role?: UserRole } | undefined;

    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const userRole = user.role ?? "CANDIDATE";

    if (!allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${userRole}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.session.user,
        role: userRole,
      },
    });
  });
}

export function createRoleProcedure(roles: UserRole[]) {
  return t.procedure.use(roleGuard(roles));
}
