import { describe, expect, it, vi } from "vitest";
import { adminOrganizationRouter } from "./organization";

function createCtx() {
  const prisma = {
    organization: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "org-1",
          name: "Mekong Labs",
          verificationStatus: "VERIFIED",
          _count: { jobs: 3 },
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
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

describe("adminOrganizationRouter", () => {
  it("lists organizations with status, search, pagination, and jobs count", async () => {
    const { ctx, prisma } = createCtx();

    const result = await adminOrganizationRouter.createCaller(ctx).list({
      status: "VERIFIED",
      search: "mekong",
      page: 2,
      pageSize: 20,
    });

    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: "desc" },
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          verificationStatus: "VERIFIED",
          OR: expect.arrayContaining([
            { name: { contains: "mekong", mode: "insensitive" } },
            { website: { contains: "mekong", mode: "insensitive" } },
            { industry: { contains: "mekong", mode: "insensitive" } },
            { location: { contains: "mekong", mode: "insensitive" } },
          ]),
        }),
      }),
    );
    expect(result.organizations).toEqual([
      expect.objectContaining({
        id: "org-1",
        name: "Mekong Labs",
        jobsCount: 3,
      }),
    ]);
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });
});
