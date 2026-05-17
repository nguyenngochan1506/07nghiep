import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  generatePresignedUploadUrl,
  isStorageConfigured,
  type UploadType,
} from "@07nghiep/storage";
import { profileUpdateSchema } from "../lib/api/schemas";
import { candidateProcedure, publicProcedure, router } from "../lib/api";

const VALID_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VALID_RESUME_TYPES = ["application/pdf"];

function validateUpload(type: UploadType, contentType: string): void {
  const allowed =
    type === "avatar" ? VALID_AVATAR_TYPES : VALID_RESUME_TYPES;
  if (!allowed.includes(contentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid file type for ${type}. Allowed: ${allowed.join(", ")}`,
    });
  }
}

export const profileRouter = router({
  getMyProfile: candidateProcedure.query(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    return ctx.prisma.profile.upsert({
      where: { userId: ctx.user.id },
      update: {},
      create: { userId: ctx.user.id, skills: [] },
    });
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
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File storage is not configured",
        });
      }

      validateUpload("resume", input.contentType);

      const result = await generatePresignedUploadUrl(
        "resume",
        ctx.user.id,
        input.filename,
        input.contentType
      );

      return result;
    }),

  deleteResume: candidateProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

    const profile = await ctx.prisma.profile.upsert({
      where: { userId: ctx.user.id },
      update: {
        resumeUrl: null,
      },
      create: {
        userId: ctx.user.id,
        resumeUrl: null,
        skills: [],
      },
    });

    return profile;
  }),

  uploadAvatar: candidateProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });

      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File storage is not configured",
        });
      }

      validateUpload("avatar", input.contentType);

      const result = await generatePresignedUploadUrl(
        "avatar",
        ctx.user.id,
        input.filename,
        input.contentType
      );

      return result;
    }),
});
