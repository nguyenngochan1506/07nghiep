import { verifyPassword } from "better-auth/crypto";
import { describe, expect, it, vi } from "vitest";
import { adminUserRouter } from "./user";

function createCtx(overrides?: {
  user?: { id: string; emailVerified?: boolean } | null;
  credentialAccount?: { id: string } | null;
}) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(overrides?.user ?? { id: "user-1" }),
    },
    account: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          Object.hasOwn(overrides ?? {}, "credentialAccount")
            ? overrides?.credentialAccount
            : { id: "account-1" },
        ),
      update: vi.fn().mockResolvedValue({ id: "account-1" }),
      create: vi.fn().mockResolvedValue({ id: "account-1" }),
    },
    session: {
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    verification: {
      create: vi.fn(),
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

describe("adminUserRouter", () => {
  it("sets a new credential password and revokes existing sessions", async () => {
    const { ctx, prisma } = createCtx();

    const result = await adminUserRouter.createCaller(ctx).resetPassword({
      userId: "user-1",
      password: "FreshPass123!",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.account.update).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { password: expect.any(String) },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.verification.create).not.toHaveBeenCalled();

    const updatePayload = prisma.account.update.mock.calls[0]?.[0];
    if (!updatePayload) {
      throw new Error("Expected credential account password update");
    }
    const savedPassword = updatePayload.data.password;
    expect(savedPassword).not.toBe("FreshPass123!");
    await expect(verifyPassword({ hash: savedPassword, password: "FreshPass123!" })).resolves.toBe(
      true,
    );
  });

  it("creates a credential account when the user only has social login", async () => {
    const { ctx, prisma } = createCtx({ credentialAccount: null });

    await adminUserRouter.createCaller(ctx).resetPassword({
      userId: "user-1",
      password: "FreshPass123!",
    });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        userId: "user-1",
        accountId: "user-1",
        providerId: "credential",
        password: expect.any(String),
      },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
