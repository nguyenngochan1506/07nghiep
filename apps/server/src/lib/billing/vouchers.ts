import { TRPCError } from "@trpc/server";

export type VoucherDiscountTypeValue = "PERCENT" | "FIXED_AMOUNT";

type VoucherRecord = {
  id: string;
  code: string;
  discountType: VoucherDiscountTypeValue;
  discountValue: number;
  maxDiscountVnd: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  active: boolean;
  plans: { planId: string }[];
  _count: { redemptions: number };
};

export type VoucherPrisma = {
  voucher: {
    findUnique(args: {
      where: { code: string };
      include: {
        plans: { select: { planId: true } };
        _count: { select: { redemptions: true } };
      };
    }): Promise<VoucherRecord | null>;
  };
  voucherRedemption: {
    count(args: { where: { voucherId: string; userId: string } }): Promise<number>;
  };
};

export function normalizeVoucherCode(code: string) {
  return code.trim().toUpperCase();
}

export function calculateVoucherDiscount({
  originalAmountVnd,
  discountType,
  discountValue,
  maxDiscountVnd,
}: {
  originalAmountVnd: number;
  discountType: VoucherDiscountTypeValue;
  discountValue: number;
  maxDiscountVnd: number | null;
}) {
  const rawDiscount =
    discountType === "PERCENT"
      ? Math.floor((originalAmountVnd * discountValue) / 100)
      : discountValue;
  const cappedByMax = maxDiscountVnd === null ? rawDiscount : Math.min(rawDiscount, maxDiscountVnd);
  const discountAmountVnd = Math.max(0, Math.min(cappedByMax, originalAmountVnd));

  return {
    originalAmountVnd,
    discountAmountVnd,
    finalAmountVnd: originalAmountVnd - discountAmountVnd,
  };
}

function rejectVoucher(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function validateVoucherWindow(voucher: VoucherRecord, now: Date) {
  if (!voucher.active) {
    rejectVoucher("Mã voucher đã bị tạm dừng.");
  }

  if (voucher.startsAt && voucher.startsAt > now) {
    rejectVoucher("Mã voucher chưa đến thời gian sử dụng.");
  }

  if (voucher.expiresAt && voucher.expiresAt < now) {
    rejectVoucher("Mã voucher đã hết hạn.");
  }
}

export async function resolveVoucherForCheckout({
  prisma,
  userId,
  planId,
  originalAmountVnd,
  voucherCode,
  now = new Date(),
}: {
  prisma: VoucherPrisma;
  userId: string;
  planId: string;
  originalAmountVnd: number;
  voucherCode: string;
  now?: Date;
}) {
  const code = normalizeVoucherCode(voucherCode);

  if (!code) {
    rejectVoucher("Vui lòng nhập mã voucher.");
  }

  const voucher = await prisma.voucher.findUnique({
    where: { code },
    include: {
      plans: { select: { planId: true } },
      _count: { select: { redemptions: true } },
    },
  });

  if (!voucher) {
    rejectVoucher("Không tìm thấy mã voucher.");
  }

  validateVoucherWindow(voucher, now);

  if (!voucher.plans.some((plan) => plan.planId === planId)) {
    rejectVoucher("Mã voucher không áp dụng cho gói này.");
  }

  if (voucher.usageLimit !== null && voucher._count.redemptions >= voucher.usageLimit) {
    rejectVoucher("Mã voucher đã hết lượt sử dụng.");
  }

  if (voucher.perUserLimit !== null) {
    const userRedemptionCount = await prisma.voucherRedemption.count({
      where: { voucherId: voucher.id, userId },
    });

    if (userRedemptionCount >= voucher.perUserLimit) {
      rejectVoucher("Bạn đã dùng mã voucher này quá số lần cho phép.");
    }
  }

  const discount = calculateVoucherDiscount({
    originalAmountVnd,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountVnd: voucher.maxDiscountVnd,
  });

  return {
    voucherId: voucher.id,
    code: voucher.code,
    ...discount,
  };
}
