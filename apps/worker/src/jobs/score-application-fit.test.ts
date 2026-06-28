import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/07nghiep";
  process.env.BETTER_AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

import { handleScoreApplicationFit } from "./score-application-fit";

describe("handleScoreApplicationFit", () => {
  it("marks missing-resume application scores failed without calling provider", async () => {
    const prisma = {
      applicationAiScore: {
        findUnique: vi.fn().mockResolvedValue({
          id: "score_1",
          status: "PENDING",
          application: {
            resumeUrl: null,
            candidate: { profile: { resumeUrl: null } },
          },
        }),
        update: vi.fn(),
      },
    };
    const provider = {
      analyzeCandidateCv: vi.fn(),
      scoreApplicationFit: vi.fn(),
    };

    await handleScoreApplicationFit(prisma, provider, "score_1");

    expect(provider.scoreApplicationFit).not.toHaveBeenCalled();
    expect(prisma.applicationAiScore.update).toHaveBeenCalledWith({
      where: { id: "score_1" },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Application does not have a resume URL.",
        completedAt: expect.any(Date),
      }),
    });
  });
});
