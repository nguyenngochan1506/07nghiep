import { auth } from "@07nghiep/auth";
import prisma from "@07nghiep/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  const user = session?.user ?? null;
  const role = (user as any)?.role ?? null;

  return {
    session,
    user,
    role,
    prisma,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
