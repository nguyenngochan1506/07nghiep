import z from "zod";

const experienceItemSchema = z.object({
  title: z.string().trim().optional(),
  company: z.string().trim().optional(),
  location: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

const educationItemSchema = z.object({
  degree: z.string().trim().optional(),
  school: z.string().trim().optional(),
  location: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  gpa: z.string().trim().optional(),
});

export const profileSchema = z.object({
  avatarUrl: z.string().trim().optional(),
  resumeUrl: z.string().trim().optional(),
  headline: z.string().trim().optional(),
  fullName: z.string().trim().min(2, "Ho va ten toi thieu 2 ky tu"),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  aboutMe: z.string().trim().optional(),
  skills: z.array(z.string().trim()),
  experience: z.array(experienceItemSchema),
  education: z.array(educationItemSchema),
  portfolio: z.object({
    linkedin: z.string().trim().optional(),
    github: z.string().trim().optional(),
    website: z.string().trim().optional(),
  }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
