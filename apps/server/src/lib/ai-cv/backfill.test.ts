import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfillEmployerApplicationFitScores } from "./backfill";
import { enqueueApplicationFitSafely } from "./enqueue";

vi.mock("./enqueue", () => ({
  enqueueApplicationFitSafely: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("backfillEmployerApplicationFitScores", () => {
  it("creates and enqueues AI fit scores for existing employer applications without scores", async () => {
    const prisma = {
      application: {
        findMany: vi.fn().mockResolvedValue([{ id: "application_1" }, { id: "application_2" }]),
      },
      applicationAiScore: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: "score_1" })
          .mockResolvedValueOnce({ id: "score_2" }),
        update: vi.fn(),
      },
    };

    const result = await backfillEmployerApplicationFitScores(prisma as never, "employer_1");

    expect(result).toEqual({ created: 2 });
    expect(prisma.application.findMany).toHaveBeenCalledWith({
      where: {
        job: {
          organization: {
            userId: "employer_1",
          },
        },
        aiScore: null,
      },
      select: { id: true },
    });
    expect(prisma.applicationAiScore.create).toHaveBeenCalledWith({
      data: {
        applicationId: "application_1",
        status: "PENDING",
        matchedSkills: [],
        missingSkills: [],
      },
      select: { id: true },
    });
    expect(enqueueApplicationFitSafely).toHaveBeenNthCalledWith(1, prisma, "score_1");
    expect(enqueueApplicationFitSafely).toHaveBeenNthCalledWith(2, prisma, "score_2");
  });
});
