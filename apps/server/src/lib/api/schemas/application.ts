import { z } from "zod";
import { ApplicationStatus } from "@07nghiep/db";

export const applicationListSchema = z.object({
  jobId: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export type ApplicationListInput = z.infer<typeof applicationListSchema>;

export const applicationUpdateStatusSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(ApplicationStatus),
});

export type ApplicationUpdateStatusInput = z.infer<typeof applicationUpdateStatusSchema>;

export const applicationUpdateNotesSchema = z.object({
  id: z.string(),
  notes: z.string(),
});

export type ApplicationUpdateNotesInput = z.infer<typeof applicationUpdateNotesSchema>;

export const applicationBulkUpdateStatusSchema = z.object({
  ids: z.array(z.string()).min(1),
  status: z.nativeEnum(ApplicationStatus),
});

export type ApplicationBulkUpdateStatusInput = z.infer<typeof applicationBulkUpdateStatusSchema>;
