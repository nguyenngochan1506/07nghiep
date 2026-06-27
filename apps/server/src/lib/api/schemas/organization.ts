import { z } from "zod";

export const organizationCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  companySize: z.enum(["STARTUP", "SMALL", "MEDIUM", "LARGE", "ENTERPRISE"]).optional(),
  foundedYear: z.number().int().min(1800).max(2030).optional(),
  location: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
});

export const organizationUpdateSchema = organizationCreateSchema.partial();

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;
