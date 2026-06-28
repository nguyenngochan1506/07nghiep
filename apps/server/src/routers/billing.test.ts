import { describe, expect, it, vi } from "vitest";

import { billingRouter } from "./billing";

function createCtx(prisma: unknown) {
  return {
    session: null,
    user: null,
    role: undefined,
    prisma,
  } as never;
}

describe("billingRouter", () => {
  it("lists active billing plans for pricing pages", async () => {
    const plans = [
      {
        code: "CANDIDATE_PLUS_MONTHLY",
        name: "Candidate Plus Monthly",
        priceVnd: 79000,
        durationDays: 30,
      },
      {
        code: "EMPLOYER_MONTHLY",
        name: "Employer Monthly",
        priceVnd: 299000,
        durationDays: 30,
      },
    ];
    const prisma = {
      billingPlan: {
        findMany: vi.fn().mockResolvedValue(plans),
      },
    };

    const result = await billingRouter.createCaller(createCtx(prisma)).plans();

    expect(result).toEqual(plans);
    expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { code: true, name: true, priceVnd: true, durationDays: true },
      orderBy: { code: "asc" },
    });
  });
});
