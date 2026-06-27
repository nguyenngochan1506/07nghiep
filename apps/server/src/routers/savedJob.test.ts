import { describe, expect, it, vi } from "vitest";
import { savedJobRouter } from "./savedJob";

function createCtx() {
  const prisma = {
    job: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    savedJob: {
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  return {
    ctx: {
      session: { user: { id: "candidate-1", role: "CANDIDATE" } },
      user: { id: "candidate-1", role: "CANDIDATE" },
      role: "CANDIDATE",
      prisma,
    } as never,
    prisma,
  };
}

describe("savedJobRouter", () => {
  it("saves an open job when not already saved", async () => {
    const { ctx, prisma } = createCtx();
    prisma.job.findFirst.mockResolvedValue({ id: "job-1" });
    prisma.savedJob.findUnique.mockResolvedValue(null);
    prisma.savedJob.create.mockResolvedValue({
      id: "saved-1",
      userId: "candidate-1",
      jobId: "job-1",
    });

    const result = await savedJobRouter.createCaller(ctx).toggle({ jobId: "job-1" });

    expect(result).toEqual({ saved: true });
    expect(prisma.savedJob.create).toHaveBeenCalledWith({
      data: { userId: "candidate-1", jobId: "job-1" },
    });
  });

  it("unsaves an already saved job", async () => {
    const { ctx, prisma } = createCtx();
    prisma.job.findFirst.mockResolvedValue({ id: "job-1" });
    prisma.savedJob.findUnique.mockResolvedValue({
      id: "saved-1",
      userId: "candidate-1",
      jobId: "job-1",
    });
    prisma.savedJob.delete.mockResolvedValue({ id: "saved-1" });

    const result = await savedJobRouter.createCaller(ctx).toggle({ jobId: "job-1" });

    expect(result).toEqual({ saved: false });
    expect(prisma.savedJob.delete).toHaveBeenCalledWith({ where: { id: "saved-1" } });
  });

  it("syncs only open local saved jobs that are missing in the database", async () => {
    const { ctx, prisma } = createCtx();
    prisma.job.findMany.mockResolvedValue([{ id: "job-1" }, { id: "job-2" }]);
    prisma.savedJob.findMany.mockResolvedValue([{ jobId: "job-1" }]);
    prisma.savedJob.createMany.mockResolvedValue({ count: 1 });

    const result = await savedJobRouter
      .createCaller(ctx)
      .syncLocal({ jobIds: ["job-1", "job-2", "job-2", "closed-job"] });

    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["job-1", "job-2", "closed-job"] },
        status: "OPEN",
      },
      select: { id: true },
    });
    expect(prisma.savedJob.findMany).toHaveBeenCalledWith({
      where: {
        userId: "candidate-1",
        jobId: { in: ["job-1", "job-2"] },
      },
      select: { jobId: true },
    });
    expect(prisma.savedJob.createMany).toHaveBeenCalledWith({
      data: [{ userId: "candidate-1", jobId: "job-2" }],
      skipDuplicates: true,
    });
    expect(result).toEqual({ syncedJobIds: ["job-2"], skippedJobIds: ["closed-job"] });
  });
});
