import type { ApplicationStatus as PrismaApplicationStatus } from "@07nghiep/db";

export type ApplicationStatus = PrismaApplicationStatus;

export const ApplicationStatus = {
  PENDING: "PENDING",
  VIEWED: "VIEWED",
  SHORTLISTED: "SHORTLISTED",
  INTERVIEW: "INTERVIEW",
  OFFERED: "OFFERED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const;
