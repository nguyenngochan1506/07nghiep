import { z } from "zod";

// ── Enums (mirror Prisma enums) ──────────────────────────────────────────────

export const jobTypeEnum = z.enum(["FULLTIME", "PARTIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]);

export const workTypeEnum = z.enum(["REMOTE", "HYBRID", "ONSITE"]);

export const experienceLevelEnum = z.enum([
  "ENTRY",
  "JUNIOR",
  "MIDDLE",
  "SENIOR",
  "LEAD",
  "EXECUTIVE",
]);

export const salaryTypeEnum = z.enum(["HOURLY", "MONTHLY", "YEARLY"]);

export const jobStatusEnum = z.enum(["DRAFT", "PENDING_APPROVAL", "OPEN", "CLOSED", "ARCHIVED"]);

// ── Step Schemas ─────────────────────────────────────────────────────────────

/** Step 1: Basic Information */
export const jobStep1Schema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự").max(150),
  jobType: jobTypeEnum,
  workType: workTypeEnum,
  experienceLevel: experienceLevelEnum,
  location: z.string().min(2, "Địa điểm là bắt buộc").max(200),
});

/** Step 2: Job Details */
export const jobStep2Schema = z.object({
  description: z.string().min(50, "Mô tả phải có ít nhất 50 ký tự"),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  skills: z.array(z.string().min(1)).max(20).default([]),
});

/** Step 3: Salary & Conditions */
export const jobStep3Schema = z
  .object({
    salaryNegotiable: z.boolean().default(false),
    salaryType: salaryTypeEnum.optional(),
    salaryMin: z.number().positive().optional(),
    salaryMax: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      if (!data.salaryNegotiable && data.salaryMin !== undefined && data.salaryMax !== undefined) {
        return data.salaryMin <= data.salaryMax;
      }
      return true;
    },
    { message: "Lương tối thiểu phải nhỏ hơn hoặc bằng lương tối đa", path: ["salaryMax"] },
  );

/** Step 4: Additional Info */
export const jobStep4Schema = z.object({
  expiresAt: z.coerce.date().min(new Date(), "Ngày hết hạn phải trong tương lai").optional(),
});

// ── Full Create/Update Schemas ───────────────────────────────────────────────

export const jobCreateSchema = jobStep1Schema
  .merge(jobStep2Schema)
  .merge(jobStep3Schema)
  .merge(jobStep4Schema);

export const jobUpdateSchema = jobCreateSchema.partial().extend({
  id: z.string(),
});

// ── Filter / Query Schemas ───────────────────────────────────────────────────

export const jobListQuerySchema = z.object({
  status: jobStatusEnum.optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

// ── Types ────────────────────────────────────────────────────────────────────

export type JobStep1Input = z.infer<typeof jobStep1Schema>;
export type JobStep2Input = z.infer<typeof jobStep2Schema>;
export type JobStep3Input = z.infer<typeof jobStep3Schema>;
export type JobStep4Input = z.infer<typeof jobStep4Schema>;
export type JobCreateInput = z.infer<typeof jobCreateSchema>;
export type JobUpdateInput = z.infer<typeof jobUpdateSchema>;
export type JobListQuery = z.infer<typeof jobListQuerySchema>;
