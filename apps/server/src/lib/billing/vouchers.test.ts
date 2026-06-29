import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import {
  calculateVoucherDiscount,
  normalizeVoucherCode,
  resolveVoucherForCheckout,
} from "./vouchers";

const now = new Date("2026-06-29T07:00:00.000Z");

function createVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: "voucher_1",
    code: "SUMMER30",
    discountType: "PERCENT",
    discountValue: 30,
    maxDiscountVnd: null,
    startsAt: new Date("2026-06-01T00:00:00.000Z"),
    expiresAt: new Date("2026-07-01T00:00:00.000Z"),
    usageLimit: null,
    perUserLimit: null,
    active: true,
    plans: [{ planId: "plan_plus" }],
    _count: { redemptions: 0 },
    ...overrides,
  };
}

function createPrisma(voucher: unknown, userRedemptionCount = 0) {
  return {
    voucher: {
      findUnique: vi.fn().mockResolvedValue(voucher),
    },
    voucherRedemption: {
      count: vi.fn().mockResolvedValue(userRedemptionCount),
    },
  };
}

describe("normalizeVoucherCode", () => {
  it("trims and uppercases voucher codes", () => {
    expect(normalizeVoucherCode("  summer30  ")).toBe("SUMMER30");
  });
});

describe("calculateVoucherDiscount", () => {
  it("allows discounts to cover the full plan price", () => {
    expect(
      calculateVoucherDiscount({
        originalAmountVnd: 49_000,
        discountType: "FIXED_AMOUNT",
        discountValue: 100_000,
        maxDiscountVnd: null,
      }),
    ).toEqual({
      originalAmountVnd: 49_000,
      discountAmountVnd: 49_000,
      finalAmountVnd: 0,
    });
  });

  it("caps percent discounts with maxDiscountVnd", () => {
    expect(
      calculateVoucherDiscount({
        originalAmountVnd: 299_000,
        discountType: "PERCENT",
        discountValue: 50,
        maxDiscountVnd: 40_000,
      }),
    ).toEqual({
      originalAmountVnd: 299_000,
      discountAmountVnd: 40_000,
      finalAmountVnd: 259_000,
    });
  });
});

describe("resolveVoucherForCheckout", () => {
  it("returns a discounted checkout snapshot for a valid voucher and plan", async () => {
    const prisma = createPrisma(
      createVoucher({ discountType: "FIXED_AMOUNT", discountValue: 10_000 }),
    );

    const result = await resolveVoucherForCheckout({
      prisma,
      userId: "user_1",
      planId: "plan_plus",
      originalAmountVnd: 49_000,
      voucherCode: " summer30 ",
      now,
    });

    expect(prisma.voucher.findUnique).toHaveBeenCalledWith({
      where: { code: "SUMMER30" },
      include: {
        plans: { select: { planId: true } },
        _count: { select: { redemptions: true } },
      },
    });
    expect(result).toEqual({
      voucherId: "voucher_1",
      code: "SUMMER30",
      originalAmountVnd: 49_000,
      discountAmountVnd: 10_000,
      finalAmountVnd: 39_000,
    });
  });

  it("rejects vouchers that do not apply to the selected plan", async () => {
    const prisma = createPrisma(createVoucher({ plans: [{ planId: "plan_employer" }] }));

    await expect(
      resolveVoucherForCheckout({
        prisma,
        userId: "user_1",
        planId: "plan_plus",
        originalAmountVnd: 49_000,
        voucherCode: "SUMMER30",
        now,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Mã voucher không áp dụng cho gói này.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects vouchers after the global usage limit is reached", async () => {
    const prisma = createPrisma(createVoucher({ usageLimit: 3, _count: { redemptions: 3 } }));

    await expect(
      resolveVoucherForCheckout({
        prisma,
        userId: "user_1",
        planId: "plan_plus",
        originalAmountVnd: 49_000,
        voucherCode: "SUMMER30",
        now,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Mã voucher đã hết lượt sử dụng.",
    } satisfies Partial<TRPCError>);
  });

  it("rejects vouchers after the per-user usage limit is reached", async () => {
    const prisma = createPrisma(createVoucher({ perUserLimit: 1 }), 1);

    await expect(
      resolveVoucherForCheckout({
        prisma,
        userId: "user_1",
        planId: "plan_plus",
        originalAmountVnd: 49_000,
        voucherCode: "SUMMER30",
        now,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Bạn đã dùng mã voucher này quá số lần cho phép.",
    } satisfies Partial<TRPCError>);
  });
});
