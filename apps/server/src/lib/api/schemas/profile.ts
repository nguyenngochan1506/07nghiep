import { z } from "zod";

export const profileUpdateSchema = z.object({
  headline: z.string().max(200).optional(),
  summary: z.string().max(2000).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        company: z.string().min(1).max(100),
        location: z.string().max(100).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM"),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}$/, "Format: YYYY-MM")
          .optional(),
        current: z.boolean().default(false),
        description: z.string().max(1000).optional(),
      }),
    )
    .max(20)
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string().min(1).max(100),
        school: z.string().min(1).max(100),
        location: z.string().max(100).optional(),
        startYear: z.number().int().min(1950).max(2030),
        endYear: z.number().int().min(1950).max(2030).optional(),
        gpa: z.string().max(20).nullable().optional(),
      }),
    )
    .max(10)
    .optional(),
  location: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  portfolioUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  resumeUrl: z.string().url().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const experienceSchema = profileUpdateSchema.shape.experience;
export const educationSchema = profileUpdateSchema.shape.education;
