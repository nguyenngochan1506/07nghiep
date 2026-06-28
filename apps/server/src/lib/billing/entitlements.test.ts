import { describe, expect, it } from "vitest";
import { canUseAiCv, getActiveEntitlements } from "./entitlements";

const now = new Date("2026-06-27T10:00:00.000Z");

describe("billing entitlements", () => {
  it("treats missing subscriptions as Free candidate", () => {
    expect(getActiveEntitlements([], now)).toEqual({
      candidatePlus: false,
      employer: false,
      aiCvRemaining: 0,
    });
  });

  it("enables Candidate Plus while active and unexpired", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 1,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: true, employer: false, aiCvRemaining: 2 });
  });

  it("ignores expired Candidate Plus subscriptions", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 0,
          },
        ],
        now,
      ).candidatePlus,
    ).toBe(false);
  });

  it("detects active employer entitlement separately from role", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "EMPLOYER_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: null,
            aiCvQuotaUsed: 0,
          },
        ],
        now,
      ).employer,
    ).toBe(true);
  });

  it("ignores subscriptions before their current period starts", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-28T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-28T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 0,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: false, employer: false, aiCvRemaining: 0 });
  });

  it("treats the exact current period start as active", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: new Date("2026-07-27T10:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 1,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: true, employer: false, aiCvRemaining: 2 });
  });

  it("treats the exact current period end as inactive", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-05-27T10:00:00.000Z"),
            currentPeriodEnd: now,
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 0,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: false, employer: false, aiCvRemaining: 0 });
  });

  it("sums remaining quota across multiple active Candidate Plus subscriptions", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 1,
          },
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-10T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-10T00:00:00.000Z"),
            aiCvQuotaLimit: 5,
            aiCvQuotaUsed: 2,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: true, employer: false, aiCvRemaining: 5 });
  });

  it("sums remaining quota from active Candidate Plus and AI CV credit add-ons", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: 3,
          },
          {
            plan: { code: "CANDIDATE_AI_CV_CREDITS" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-20T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-20T00:00:00.000Z"),
            aiCvQuotaLimit: 5,
            aiCvQuotaUsed: 1,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: true, employer: false, aiCvRemaining: 4 });
  });

  it("clamps invalid quota values before computing remaining quota", () => {
    expect(
      getActiveEntitlements(
        [
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 3,
            aiCvQuotaUsed: -1,
          },
          {
            plan: { code: "CANDIDATE_PLUS_MONTHLY" },
            status: "ACTIVE",
            currentPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
            aiCvQuotaLimit: 2,
            aiCvQuotaUsed: 5,
          },
        ],
        now,
      ),
    ).toEqual({ candidatePlus: true, employer: false, aiCvRemaining: 3 });
  });

  it("limits future AI CV use to remaining Plus quota", () => {
    expect(canUseAiCv({ candidatePlus: true, employer: false, aiCvRemaining: 1 })).toBe(true);
    expect(canUseAiCv({ candidatePlus: true, employer: false, aiCvRemaining: 0 })).toBe(false);
    expect(canUseAiCv({ candidatePlus: false, employer: false, aiCvRemaining: 1 })).toBe(false);
  });
});
