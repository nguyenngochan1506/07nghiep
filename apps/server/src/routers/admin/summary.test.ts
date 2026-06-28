import { describe, expect, it, vi } from "vitest";
import { adminSummaryRouter } from "./summary";

function createCtx() {
  const prisma = {
    user: {
      groupBy: vi.fn().mockResolvedValue([
        { role: "CANDIDATE", _count: { id: 10 } },
        { role: "EMPLOYER", _count: { id: 4 } },
        { role: "ADMIN", _count: { id: 1 } },
      ]),
      count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3),
    },
    organization: {
      groupBy: vi.fn().mockResolvedValue([
        { verificationStatus: "PENDING", _count: { id: 2 } },
        { verificationStatus: "VERIFIED", _count: { id: 5 } },
      ]),
    },
    job: {
      groupBy: vi.fn().mockResolvedValue([
        { status: "OPEN", _count: { id: 7 } },
        { status: "PENDING_APPROVAL", _count: { id: 3 } },
        { status: "DRAFT", _count: { id: 2 } },
      ]),
      count: vi.fn().mockResolvedValue(4),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "job-1",
          title: "Senior Frontend Engineer",
          status: "PENDING_APPROVAL",
          updatedAt: new Date("2026-06-28T00:00:00.000Z"),
          organization: { name: "FumiTech" },
        },
      ]),
    },
    application: {
      groupBy: vi.fn().mockResolvedValue([
        { status: "PENDING", _count: { id: 8 } },
        { status: "INTERVIEWING", _count: { id: 3 } },
      ]),
      count: vi.fn().mockResolvedValue(6),
    },
    businessApplication: {
      groupBy: vi.fn().mockResolvedValue([
        { status: "PENDING", _count: { id: 2 } },
        { status: "APPROVED", _count: { id: 1 } },
      ]),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "business-1",
          companyName: "Mekong Labs",
          status: "PENDING",
          createdAt: new Date("2026-06-27T00:00:00.000Z"),
          user: { name: "Linh Tran", email: "linh@example.com" },
        },
      ]),
    },
    payment: {
      groupBy: vi.fn().mockResolvedValue([
        { status: "PENDING", _count: { id: 5 } },
        { status: "REVIEW_REQUIRED", _count: { id: 1 } },
      ]),
      aggregate: vi.fn().mockResolvedValue({
        _count: { id: 9 },
        _sum: { amountVnd: 3_600_000 },
      }),
    },
  };

  return {
    ctx: {
      session: { user: { id: "admin-1", role: "ADMIN" } },
      user: { id: "admin-1", role: "ADMIN" },
      role: "ADMIN",
      prisma,
    } as never,
    prisma,
  };
}

describe("adminSummaryRouter", () => {
  it("aggregates dashboard overview counts from role and status groups", async () => {
    const { ctx, prisma } = createCtx();

    const result = await adminSummaryRouter.createCaller(ctx).overview();

    expect(result.users).toEqual({
      total: 15,
      candidates: 10,
      employers: 4,
      admins: 1,
      suspended: 2,
      newLast7Days: 3,
    });
    expect(result.jobs).toMatchObject({
      total: 12,
      open: 7,
      pendingApproval: 3,
      draft: 2,
      newLast7Days: 4,
    });
    expect(result.applications).toMatchObject({
      total: 11,
      pending: 8,
      interviewing: 3,
      newLast7Days: 6,
    });
    expect(result.businessApplications.pending).toBe(2);
    expect(result.billing).toMatchObject({
      paidRevenueVnd: 3_600_000,
      paidPayments: 9,
      pendingPayments: 5,
      reviewRequired: 1,
    });
    expect(result.recent.jobs).toHaveLength(1);
    expect(prisma.user.count).toHaveBeenCalledTimes(2);
  });
});
