import type { BillingPlanCode } from "@07nghiep/db";

export const BILLING_PLAN_CODES = {
  candidatePlusMonthly: "CANDIDATE_PLUS_MONTHLY",
  employerMonthly: "EMPLOYER_MONTHLY",
} as const satisfies Record<string, BillingPlanCode>;

export const DEFAULT_BILLING_PLANS = [
  {
    code: BILLING_PLAN_CODES.candidatePlusMonthly,
    name: "Candidate Plus Monthly",
    priceVnd: 49000,
    durationDays: 30,
  },
  {
    code: BILLING_PLAN_CODES.employerMonthly,
    name: "Employer Monthly",
    priceVnd: 299000,
    durationDays: 30,
  },
] as const;
