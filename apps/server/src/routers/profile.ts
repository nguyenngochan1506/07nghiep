import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { profileUpdateSchema } from "../lib/api/schemas";
import { candidateProcedure, publicProcedure, router } from "../lib/api";

export const profileRouter = router({
  getMyProfile: candidateProcedure.query(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    const profile = await ctx.prisma.profile.findUnique({
      where: { userId: ctx.user.id },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    }

    return profile;
  }),

  updateMyProfile: candidateProcedure
    .input(profileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      const profile = await ctx.prisma.profile.upsert({
        where: { userId: ctx.user.id },
        update: input,
        create: {
          userId: ctx.user.id,
          ...input,
        },
      });

      return profile;
    }),

  getPublicProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = await ctx.prisma.profile.findUnique({
        where: { userId: input.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      return profile;
    }),

  uploadResume: candidateProcedure
    .input(z.object({ filename: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      const signedUrl = `/uploads/resumes/${ctx.user.id}/${input.filename}`;
      return { url: signedUrl };
    }),
});
