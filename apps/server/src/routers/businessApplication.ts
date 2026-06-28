import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { generatePresignedUploadUrl, isStorageConfigured } from "@07nghiep/storage";
import { protectedProcedure, router } from "../lib/api";

const companySizeSchema = z.enum(["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]);
const legalDocumentMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const logoMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const businessApplicationInput = z.object({
  companyName: z.string().trim().min(2).max(120),
  website: z.string().trim().url().optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional(),
  companySize: companySizeSchema.optional(),
  foundedYear: z.number().int().min(1800).max(2030).optional(),
  location: z.string().trim().max(120).optional(),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  description: z.string().trim().min(20).max(2000),
  taxCode: z.string().trim().min(5).max(40),
  legalRepresentative: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(160),
  contactPhone: z.string().trim().min(8).max(30),
  legalDocumentUrls: z.array(z.string().trim().url()).min(1).max(5),
});

export const businessApplicationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessApplication.findFirst({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, checkoutUrl: true, amountVnd: true },
        },
      },
    });
  }),

  create: protectedProcedure.input(businessApplicationInput).mutation(async ({ ctx, input }) => {
    const activeOrPending = await ctx.prisma.businessApplication.findFirst({
      where: {
        userId: ctx.session.user.id,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (activeOrPending) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Bạn đã có yêu cầu doanh nghiệp đang xử lý.",
      });
    }

    return ctx.prisma.businessApplication.create({
      data: {
        userId: ctx.session.user.id,
        companyName: input.companyName,
        website: input.website || null,
        industry: input.industry || null,
        companySize: input.companySize ?? null,
        foundedYear: input.foundedYear ?? null,
        location: input.location || null,
        logoUrl: input.logoUrl || null,
        description: input.description,
        taxCode: input.taxCode,
        legalRepresentative: input.legalRepresentative,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        legalDocumentUrls: input.legalDocumentUrls,
      },
    });
  }),

  uploadLegalDocument: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File storage is not configured",
        });
      }

      if (!legalDocumentMimeTypes.includes(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid file type for business document. Allowed: ${legalDocumentMimeTypes.join(", ")}`,
        });
      }

      return generatePresignedUploadUrl(
        "business-document",
        ctx.session.user.id,
        input.filename,
        input.contentType,
      );
    }),

  uploadLogo: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "File storage is not configured",
        });
      }

      if (!logoMimeTypes.includes(input.contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid file type for business logo. Allowed: ${logoMimeTypes.join(", ")}`,
        });
      }

      return generatePresignedUploadUrl(
        "business-logo",
        ctx.session.user.id,
        input.filename,
        input.contentType,
      );
    }),
});
