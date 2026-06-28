import { env } from "@07nghiep/env/server";

const CANDIDATE_APP_ORIGIN = env.CANDIDATE_APP_URL ?? "http://localhost:3003";
const EMPLOYER_APP_ORIGIN = env.EMPLOYER_APP_URL ?? "http://localhost:3002";

export const BILLING_CHECKOUT_URLS = {
  candidateBillingReturn: `${CANDIDATE_APP_ORIGIN}/billing/return`,
  candidateCvAnalysis: `${CANDIDATE_APP_ORIGIN}/cv-analysis`,
  employerBilling: `${EMPLOYER_APP_ORIGIN}/billing`,
} as const;
