import { beforeEach, describe, expect, it, vi } from "vitest";

import { repairPendingAiJobs } from "./repair-pending-ai-jobs";

vi.mock("@07nghiep/queue", () => ({
  enqueueApplicationFitScoreRepair: vi.fn(),
  enqueueCandidateCvAnalysisRepair: vi.fn(),
}));

const { enqueueApplicationFitScoreRepair, enqueueCandidateCvAnalysisRepair } = await import(
  "@07nghiep/queue"
);

describe("repairPendingAiJobs", () => {
  beforeEach(() => {
    vi.mocked(enqueueApplicationFitScoreRepair).mockReset();
    vi.mocked(enqueueCandidateCvAnalysisRepair).mockReset();
  });

  it("enqueues stale pending records and updates queue job IDs", async () => {
    const prisma = {
      candidateCvAnalysis: {
        findMany: vi.fn().mockResolvedValue([{ id: "analysis_1" }]),
        update: vi.fn(),
      },
      applicationAiScore: {
        findMany: vi.fn().mockResolvedValue([{ id: "score_1" }]),
        update: vi.fn(),
      },
    };
    vi.mocked(enqueueCandidateCvAnalysisRepair).mockResolvedValue({
      id: "candidate-job-1",
    } as never);
    vi.mocked(enqueueApplicationFitScoreRepair).mockResolvedValue({ id: "fit-job-1" } as never);

    const result = await repairPendingAiJobs(prisma, new Date("2026-06-28T10:10:00.000Z"));

    expect(result).toEqual({ candidateCvAnalyses: 1, applicationFitScores: 1 });
    expect(prisma.candidateCvAnalysis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PENDING",
          createdAt: { lt: new Date("2026-06-28T10:05:00.000Z") },
        },
        take: 50,
      }),
    );
    expect(enqueueCandidateCvAnalysisRepair).toHaveBeenCalledWith(
      { analysisId: "analysis_1" },
      { repairRunId: "2026-06-28T10:10:00.000Z" },
    );
    expect(enqueueApplicationFitScoreRepair).toHaveBeenCalledWith(
      { applicationAiScoreId: "score_1" },
      { repairRunId: "2026-06-28T10:10:00.000Z" },
    );
    expect(prisma.candidateCvAnalysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: { queueJobId: "candidate-job-1" },
    });
    expect(prisma.applicationAiScore.update).toHaveBeenCalledWith({
      where: { id: "score_1" },
      data: { queueJobId: "fit-job-1" },
    });
  });
});
