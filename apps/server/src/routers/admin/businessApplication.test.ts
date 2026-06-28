import { describe, expect, it, vi } from "vitest";

import { adminBusinessApplicationRouter } from "./businessApplication";

const paymentWithBigInt = {
  id: "payment_1",
  status: "PENDING",
  checkoutUrl: "https://pay.example.com/checkout",
  amountVnd: 2_000,
  createdAt: new Date("2026-06-28T10:00:00.000Z"),
  orderCode: 123456789012345n,
};

function applyPaymentSelect(args: { include?: { payments?: { select?: Record<string, boolean> } } }) {
  const select = args.include?.payments?.select;
  if (!select) return paymentWithBigInt;

  return Object.fromEntries(
    Object.entries(paymentWithBigInt).filter(([key]) => select[key]),
  );
}

function createAdminCtx() {
  return {
    session: { user: { id: "admin_1" } },
    user: { id: "admin_1" },
    role: "ADMIN",
    prisma: {
      businessApplication: {
        findMany: vi.fn().mockImplementation(async (args) => [
          {
            id: "business_application_1",
            companyName: "07Nghiep",
            status: "APPROVED",
            payments: [applyPaymentSelect(args)],
          },
        ]),
        findUnique: vi.fn().mockImplementation(async (args) => ({
          id: "business_application_1",
          companyName: "07Nghiep",
          status: "APPROVED",
          payments: [applyPaymentSelect(args)],
        })),
      },
    },
  } as never;
}

describe("adminBusinessApplicationRouter", () => {
  it("returns list payment fields that can be JSON serialized", async () => {
    const caller = adminBusinessApplicationRouter.createCaller(createAdminCtx());

    const result = await caller.list({ status: "APPROVED" });

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result[0]?.payments[0]).not.toHaveProperty("orderCode");
  });

  it("returns detail payment fields that can be JSON serialized", async () => {
    const caller = adminBusinessApplicationRouter.createCaller(createAdminCtx());

    const result = await caller.getById({ id: "business_application_1" });

    expect(() => JSON.stringify(result)).not.toThrow();
    expect(result.payments[0]).not.toHaveProperty("orderCode");
  });
});
