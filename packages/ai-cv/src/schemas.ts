import { z } from "zod";

type JsonRecord = Record<string, unknown>;
type ArrayAlias = readonly [alias: string, target: string];

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeArrayAliases(value: unknown, aliases: readonly ArrayAlias[]) {
  if (!isJsonRecord(value)) {
    return value;
  }

  let normalized: JsonRecord | undefined;

  for (const [alias, target] of aliases) {
    if (!(alias in value) || !Array.isArray(value[alias])) {
      continue;
    }

    normalized ??= { ...value };
    if (!(target in normalized)) {
      normalized[target] = normalized[alias];
    }
    delete normalized[alias];
  }

  return normalized ?? value;
}

export const jobForMatchingSchema = z.object({
  id: z.string(),
  title: z.string(),
  organizationName: z.string(),
  description: z.string(),
  requirements: z.string().nullable(),
  benefits: z.string().nullable(),
  skills: z.array(z.string()),
  location: z.string(),
  workType: z.string(),
  jobType: z.string(),
  experienceLevel: z.string(),
  industry: z.string().nullable(),
  salaryMin: z.string().nullable(),
  salaryMax: z.string().nullable(),
  salaryCurrency: z.string().nullable(),
  salaryUnit: z.string().nullable(),
  salaryNegotiable: z.boolean(),
  experienceMonths: z.number().int().nullable(),
  applicantLocation: z.string().nullable(),
  sourceSite: z.string().nullable(),
});

const candidateProfileForAiSchema = z.object({
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  skills: z.array(z.string()),
  experience: z.unknown(),
  education: z.unknown(),
  location: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
});

export const candidateCvAnalysisInputSchema = z.object({
  resumeText: z.string().min(50),
  profile: candidateProfileForAiSchema,
  jobs: z.array(jobForMatchingSchema).max(30),
});

export const applicationFitScoreInputSchema = z.object({
  resumeText: z.string().min(50),
  coverLetter: z.string().nullable(),
  answers: z.unknown().nullable(),
  profile: candidateProfileForAiSchema,
  job: jobForMatchingSchema,
});

const candidateJobMatchArrayAliases = [
  ["reason", "reasons"],
  ["missingSkill", "missingSkills"],
] as const satisfies readonly ArrayAlias[];

export const candidateJobMatchSchema = z.preprocess(
  (value) => normalizeArrayAliases(value, candidateJobMatchArrayAliases),
  z
    .object({
      jobId: z.string(),
      matchScore: z.number().int().min(0).max(100),
      reasons: z.array(z.string()).max(5),
      missingSkills: z.array(z.string()).max(10),
    })
    .strict(),
);

const candidateCvAnalysisArrayAliases = [
  ["strength", "strengths"],
  ["weakness", "weaknesses"],
  ["suggestion", "suggestions"],
  ["extractedSkill", "extractedSkills"],
] as const satisfies readonly ArrayAlias[];

export const candidateCvAnalysisResultSchema = z.preprocess(
  (value) => normalizeArrayAliases(value, candidateCvAnalysisArrayAliases),
  z
    .object({
      overallScore: z.number().int().min(0).max(100),
      summary: z.string().min(1),
      strengths: z.array(z.string()).max(10),
      weaknesses: z.array(z.string()).max(10),
      suggestions: z.array(z.string()).max(12),
      extractedSkills: z.array(z.string()).max(50),
      recommendedMatches: z.array(candidateJobMatchSchema).max(20),
    })
    .strict(),
);

function normalizeApplicationRecommendation(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

const applicationFitScoreArrayAliases = [
  ["matchedSkill", "matchedSkills"],
  ["missingSkill", "missingSkills"],
  ["risk", "risks"],
] as const satisfies readonly ArrayAlias[];

export const applicationFitScoreResultSchema = z.preprocess(
  (value) => normalizeArrayAliases(value, applicationFitScoreArrayAliases),
  z
    .object({
      score: z.number().int().min(0).max(100),
      recommendation: z.preprocess(
        normalizeApplicationRecommendation,
        z.enum(["STRONG_FIT", "POTENTIAL_FIT", "WEAK_FIT"]),
      ),
      summary: z.string().min(1),
      matchedSkills: z.array(z.string()).max(30),
      missingSkills: z.array(z.string()).max(30),
      risks: z.array(z.string()).max(10),
      reasoning: z.string().min(1),
    })
    .strict(),
);

export type CandidateCvAnalysisInput = z.infer<typeof candidateCvAnalysisInputSchema>;
export type ApplicationFitScoreInput = z.infer<typeof applicationFitScoreInputSchema>;
export type CandidateCvAnalysisResult = z.infer<typeof candidateCvAnalysisResultSchema>;
export type ApplicationFitScoreResult = z.infer<typeof applicationFitScoreResultSchema>;
