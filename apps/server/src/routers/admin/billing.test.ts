import { describe, expect, it, vi } from "vitest";

import { adminBillingRouter } from "./billing";

function createCtx(prisma: unknown) {
  return {
    session: { user: { id: "admin_1", role: "ADMIN" } },
    user: { id: "admin_1", role: "ADMIN" },
    role: "ADMIN",
    prisma,
  } as never;
}

describe("adminBillingRouter vouchers", () => {
  it("lists vouchers with applied plans and redemption count", async () => {
    const vouchers = [
      {
        id: "voucher_1",
        code: "SUMMER30",
        discountType: "PERCENT",
        discountValue: 30,
        plans: [
          { plan: { id: "plan_plus", name: "Candidate Plus", code: "CANDIDATE_PLUS_MONTHLY" } },
        ],
        _count: { redemptions: 2 },
      },
    ];
    const prisma = {
      voucher: {
        findMany: vi.fn().mockResolvedValue(vouchers),
      },
    };

    const result = await adminBillingRouter.createCaller(createCtx(prisma)).vouchers();

    expect(result).toEqual(vouchers);
    expect(prisma.voucher.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        plans: {
          include: {
            plan: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { redemptions: true } },
      },
    });
  });

  it("creates a voucher with selected billing plans", async () => {
    const prisma = {
      voucher: {
        create: vi.fn().mockResolvedValue({ id: "voucher_1", code: "SUMMER30" }),
      },
    };

    const result = await adminBillingRouter.createCaller(createCtx(prisma)).createVoucher({
      code: " summer30 ",
      description: "Summer campaign",
      discountType: "PERCENT",
      discountValue: 30,
      maxDiscountVnd: 20_000,
      startsAt: new Date("2026-06-01T00:00:00.000Z"),
      expiresAt: new Date("2026-07-01T00:00:00.000Z"),
      usageLimit: 100,
      perUserLimit: 1,
      planIds: ["plan_plus", "plan_employer"],
    });

    expect(result).toEqual({ id: "voucher_1", code: "SUMMER30" });
    expect(prisma.voucher.create).toHaveBeenCalledWith({
      data: {
        code: "SUMMER30",
        description: "Summer campaign",
        discountType: "PERCENT",
        discountValue: 30,
        maxDiscountVnd: 20_000,
        startsAt: new Date("2026-06-01T00:00:00.000Z"),
        expiresAt: new Date("2026-07-01T00:00:00.000Z"),
        usageLimit: 100,
        perUserLimit: 1,
        active: true,
        plans: {
          create: [{ planId: "plan_plus" }, { planId: "plan_employer" }],
        },
      },
      include: {
        plans: {
          include: {
            plan: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { redemptions: true } },
      },
    });
  });

  it("toggles voucher active status", async () => {
    const prisma = {
      voucher: {
        update: vi.fn().mockResolvedValue({ id: "voucher_1", active: false }),
      },
    };

    const result = await adminBillingRouter.createCaller(createCtx(prisma)).updateVoucherStatus({
      id: "voucher_1",
      active: false,
    });

    expect(result).toEqual({ id: "voucher_1", active: false });
    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: "voucher_1" },
      data: { active: false },
    });
  });

  it("updates voucher details and replaces applied plans", async () => {
    const updatedVoucher = {
      id: "voucher_1",
      code: "WINTER50",
      description: "Winter campaign",
      discountType: "PERCENT",
      discountValue: 50,
      maxDiscountVnd: null,
      startsAt: null,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      usageLimit: 50,
      perUserLimit: 1,
      active: true,
      plans: [
        { plan: { id: "plan_plus", code: "CANDIDATE_PLUS_MONTHLY", name: "Candidate Plus" } },
      ],
      _count: { redemptions: 0 },
    };
    const prisma = {
      voucher: {
        update: vi.fn().mockResolvedValue(updatedVoucher),
      },
    };

    const result = await adminBillingRouter.createCaller(createCtx(prisma)).updateVoucher({
      id: "voucher_1",
      code: " winter50 ",
      description: "Winter campaign",
      discountType: "PERCENT",
      discountValue: 50,
      maxDiscountVnd: null,
      startsAt: null,
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      usageLimit: 50,
      perUserLimit: 1,
      planIds: ["plan_plus", "plan_plus"],
    });

    expect(result).toEqual(updatedVoucher);
    expect(prisma.voucher.update).toHaveBeenCalledWith({
      where: { id: "voucher_1" },
      data: {
        code: "WINTER50",
        description: "Winter campaign",
        discountType: "PERCENT",
        discountValue: 50,
        maxDiscountVnd: null,
        startsAt: null,
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        usageLimit: 50,
        perUserLimit: 1,
        plans: {
          deleteMany: {},
          create: [{ planId: "plan_plus" }],
        },
      },
      include: {
        plans: {
          include: {
            plan: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { redemptions: true } },
      },
    });
  });
});
