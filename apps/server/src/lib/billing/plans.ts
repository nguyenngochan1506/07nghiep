import type { BillingPlanCode } from "@07nghiep/db";

export const BILLING_PLAN_CODES = {
  candidatePlusMonthly: "CANDIDATE_PLUS_MONTHLY",
  candidateAiCvCredits: "CANDIDATE_AI_CV_CREDITS",
  employerMonthly: "EMPLOYER_MONTHLY",
} as const satisfies Record<string, BillingPlanCode>;

export const BILLING_PLAN_AI_CV_QUOTA: Partial<Record<BillingPlanCode, number>> = {
  [BILLING_PLAN_CODES.candidatePlusMonthly]: 3,
  [BILLING_PLAN_CODES.candidateAiCvCredits]: 5,
};

export const BILLING_PLAN_AI_CV_QUOTA_CODES: BillingPlanCode[] = [
  BILLING_PLAN_CODES.candidatePlusMonthly,
  BILLING_PLAN_CODES.candidateAiCvCredits,
];

export const DEFAULT_BILLING_PLANS = [
  {
    code: BILLING_PLAN_CODES.candidatePlusMonthly,
    name: "Candidate Plus Monthly",
    priceVnd: 49000,
    durationDays: 30,
  },
  {
    code: BILLING_PLAN_CODES.candidateAiCvCredits,
    name: "AI CV Credits",
    priceVnd: 19000,
    durationDays: 30,
  },
  {
    code: BILLING_PLAN_CODES.employerMonthly,
    name: "Employer Monthly",
    priceVnd: 299000,
    durationDays: 30,
  },
] as const;
