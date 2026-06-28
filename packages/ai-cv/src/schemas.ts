import { z } from "zod";

export const jobForMatchingSchema = z.object({
  id: z.string(),
  title: z.string(),
  organizationName: z.string(),
  description: z.string(),
  requirements: z.string().nullable(),
  skills: z.array(z.string()),
  location: z.string(),
  workType: z.string(),
  jobType: z.string(),
  experienceLevel: z.string(),
});

export const candidateCvAnalysisInputSchema = z.object({
  resumeText: z.string().min(50),
  profile: z.object({
    headline: z.string().nullable(),
    summary: z.string().nullable(),
    skills: z.array(z.string()),
    experience: z.unknown(),
    education: z.unknown(),
  }),
  jobs: z.array(jobForMatchingSchema).max(30),
});

export const applicationFitScoreInputSchema = z.object({
  resumeText: z.string().min(50),
  coverLetter: z.string().nullable(),
  profile: z.object({
    headline: z.string().nullable(),
    summary: z.string().nullable(),
    skills: z.array(z.string()),
    experience: z.unknown(),
    education: z.unknown(),
  }),
  job: jobForMatchingSchema,
});

export const candidateJobMatchSchema = z
  .object({
    jobId: z.string(),
    matchScore: z.number().int().min(0).max(100),
    reasons: z.array(z.string()).max(5),
    missingSkills: z.array(z.string()).max(10),
  })
  .strict();

export const candidateCvAnalysisResultSchema = z
  .object({
    overallScore: z.number().int().min(0).max(100),
    summary: z.string().min(1),
    strengths: z.array(z.string()).max(10),
    weaknesses: z.array(z.string()).max(10),
    suggestions: z.array(z.string()).max(12),
    extractedSkills: z.array(z.string()).max(50),
    recommendedMatches: z.array(candidateJobMatchSchema).max(20),
  })
  .strict();

export const applicationFitScoreResultSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    recommendation: z.enum(["STRONG_FIT", "POTENTIAL_FIT", "WEAK_FIT"]),
    summary: z.string().min(1),
    matchedSkills: z.array(z.string()).max(30),
    missingSkills: z.array(z.string()).max(30),
    risks: z.array(z.string()).max(10),
    reasoning: z.string().min(1),
  })
  .strict();

export type CandidateCvAnalysisInput = z.infer<typeof candidateCvAnalysisInputSchema>;
export type ApplicationFitScoreInput = z.infer<typeof applicationFitScoreInputSchema>;
export type CandidateCvAnalysisResult = z.infer<typeof candidateCvAnalysisResultSchema>;
export type ApplicationFitScoreResult = z.infer<typeof applicationFitScoreResultSchema>;
