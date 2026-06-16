import { describe, expect, it } from "vitest";
import { adminProcedure, candidateProcedure, employerProcedure, router } from "./index";

const testRouter = router({
  candidateOnly: candidateProcedure.query(() => "ok"),
  employerOnly: employerProcedure.query(() => "ok"),
  adminOnly: adminProcedure.query(() => "ok"),
});

function ctxWithRole(role: "CANDIDATE" | "EMPLOYER" | "ADMIN") {
  return {
    session: {
      user: {
        id: `${role.toLowerCase()}-user`,
        role,
      },
    },
    user: {
      id: `${role.toLowerCase()}-user`,
      role,
    },
    role,
    prisma: {},
  } as never;
}

describe("candidateProcedure", () => {
  it("allows candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).candidateOnly()).resolves.toBe("ok");
  });

  it("allows employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).candidateOnly()).resolves.toBe("ok");
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).candidateOnly()).resolves.toBe("ok");
  });
});

describe("employerProcedure", () => {
  it("rejects candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).employerOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).employerOnly()).resolves.toBe("ok");
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).employerOnly()).resolves.toBe("ok");
  });
});

describe("adminProcedure", () => {
  it("rejects candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).adminOnly()).resolves.toBe("ok");
  });
});
