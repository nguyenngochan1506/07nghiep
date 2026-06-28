import { describe, expect, it, vi, beforeEach } from "vitest";

import { cvAnalysisRouter } from "./cvAnalysis";
import { enqueueCandidateAnalysisSafely } from "../lib/ai-cv/enqueue";
import { reserveCandidateCvQuota } from "../lib/ai-cv/quota";

vi.mock("../lib/ai-cv/enqueue", () => ({
  enqueueCandidateAnalysisSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai-cv/quota", () => ({
  reserveCandidateCvQuota: vi.fn().mockResolvedValue("sub_1"),
}));

function createCandidateCtx(prisma: unknown) {
  return {
    session: { user: { id: "user_1" } },
    user: { id: "user_1" },
    role: "CANDIDATE",
    prisma,
  } as never;
}

describe("cvAnalysisRouter", () => {
  beforeEach(() => {
    vi.mocked(enqueueCandidateAnalysisSafely).mockClear();
    vi.mocked(reserveCandidateCvQuota).mockClear();
  });

  it("rejects analysis creation when profile has no resume", async () => {
    const caller = cvAnalysisRouter.createCaller(
      createCandidateCtx({
        profile: {
          findUnique: vi.fn().mockResolvedValue({ id: "profile_1", resumeUrl: null }),
        },
      }),
    );

    await expect(caller.createFromCurrentResume()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(reserveCandidateCvQuota).not.toHaveBeenCalled();
    expect(enqueueCandidateAnalysisSafely).not.toHaveBeenCalled();
  });

  it("creates a pending analysis from the current resume and enqueues it", async () => {
    const analysis = {
      id: "analysis_1",
      userId: "user_1",
      resumeUrl: "https://example.com/resume.pdf",
      status: "PENDING",
    };
    const prisma = {
      profile: {
        findUnique: vi.fn().mockResolvedValue({ resumeUrl: "https://example.com/resume.pdf" }),
      },
      candidateCvAnalysis: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(analysis),
      },
    };
    const caller = cvAnalysisRouter.createCaller(createCandidateCtx(prisma));

    await expect(caller.createFromCurrentResume()).resolves.toEqual(analysis);
    expect(reserveCandidateCvQuota).toHaveBeenCalledWith(prisma, "user_1");
    expect(prisma.candidateCvAnalysis.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        resumeUrl: "https://example.com/resume.pdf",
        resumeTextHash: "",
        status: "PENDING",
        extractedSkills: [],
        quotaReservedAt: expect.any(Date),
      },
    });
    expect(enqueueCandidateAnalysisSafely).toHaveBeenCalledWith(prisma, "analysis_1");
  });

  it("returns an active analysis without reserving more quota", async () => {
    const activeAnalysis = {
      id: "analysis_1",
      userId: "user_1",
      resumeUrl: "https://example.com/resume.pdf",
      status: "PROCESSING",
    };
    const prisma = {
      profile: {
        findUnique: vi.fn().mockResolvedValue({ resumeUrl: "https://example.com/resume.pdf" }),
      },
      candidateCvAnalysis: {
        findFirst: vi.fn().mockResolvedValue(activeAnalysis),
        create: vi.fn(),
      },
    };
    const caller = cvAnalysisRouter.createCaller(createCandidateCtx(prisma));

    await expect(caller.createFromCurrentResume()).resolves.toEqual(activeAnalysis);
    expect(prisma.candidateCvAnalysis.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { createdAt: "desc" },
    });
    expect(reserveCandidateCvQuota).not.toHaveBeenCalled();
    expect(prisma.candidateCvAnalysis.create).not.toHaveBeenCalled();
    expect(enqueueCandidateAnalysisSafely).not.toHaveBeenCalled();
  });

  it("returns the latest analysis for the current user", async () => {
    const latest = { id: "analysis_1", userId: "user_1", status: "COMPLETED" };
    const caller = cvAnalysisRouter.createCaller(
      createCandidateCtx({
        candidateCvAnalysis: {
          findFirst: vi.fn().mockResolvedValue(latest),
        },
      }),
    );

    await expect(caller.myLatest()).resolves.toEqual(latest);
  });
});
