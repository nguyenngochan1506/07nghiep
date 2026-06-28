import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleAnalyzeCandidateCv } from "./analyze-candidate-cv";

vi.mock("../lib/resume-text", () => ({
  extractPdfTextFromUrl: vi.fn(),
}));

vi.mock("../lib/quota", () => ({
  refundCandidateCvQuota: vi.fn(),
}));

const { extractPdfTextFromUrl } = await import("../lib/resume-text");
const { refundCandidateCvQuota } = await import("../lib/quota");

function createPrismaMock() {
  return {
    candidateCvAnalysis: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
    },
  };
}

describe("handleAnalyzeCandidateCv", () => {
  beforeEach(() => {
    vi.mocked(extractPdfTextFromUrl).mockReset();
    vi.mocked(refundCandidateCvQuota).mockReset();
  });

  it("marks a candidate analysis completed with provider result and resume hash", async () => {
    const prisma = createPrismaMock();
    const provider = {
      analyzeCandidateCv: vi.fn().mockResolvedValue({
        overallScore: 84,
        summary: "Strong backend candidate",
        strengths: ["TypeScript"],
        weaknesses: ["System design"],
        suggestions: ["Add measurable outcomes"],
        extractedSkills: ["TypeScript", "PostgreSQL"],
        recommendedMatches: [
          {
            jobId: "job_1",
            matchScore: 91,
            reasons: ["Relevant stack"],
            missingSkills: ["Redis"],
          },
        ],
      }),
      scoreApplicationFit: vi.fn(),
    };

    prisma.candidateCvAnalysis.findUnique.mockResolvedValue({
      id: "analysis_1",
      status: "PENDING",
      resumeUrl: "https://cdn.example.com/resume.pdf",
      user: {
        profile: {
          headline: "Backend Engineer",
          summary: "Builds APIs",
          skills: ["TypeScript"],
          experience: [{ title: "Engineer" }],
          education: [{ school: "NLU" }],
        },
      },
    });
    prisma.job.findMany.mockResolvedValue([
      {
        id: "job_1",
        title: "Backend Developer",
        organization: { name: "Acme" },
        description: "Build APIs",
        requirements: "TypeScript",
        skills: [{ skill: "TypeScript" }],
        location: "Ho Chi Minh City",
        workType: "REMOTE",
        jobType: "FULL_TIME",
        experienceLevel: "MID",
      },
    ]);
    vi.mocked(extractPdfTextFromUrl).mockResolvedValue({
      text: "Readable resume text with enough details about TypeScript, APIs, PostgreSQL, and product work.",
      hash: "resume_hash",
    });

    await handleAnalyzeCandidateCv(prisma, provider, "analysis_1");

    expect(provider.analyzeCandidateCv).toHaveBeenCalledWith({
      resumeText: expect.stringContaining("Readable resume text"),
      profile: {
        headline: "Backend Engineer",
        summary: "Builds APIs",
        skills: ["TypeScript"],
        experience: [{ title: "Engineer" }],
        education: [{ school: "NLU" }],
      },
      jobs: [
        {
          id: "job_1",
          title: "Backend Developer",
          organizationName: "Acme",
          description: "Build APIs",
          requirements: "TypeScript",
          skills: ["TypeScript"],
          location: "Ho Chi Minh City",
          workType: "REMOTE",
          jobType: "FULL_TIME",
          experienceLevel: "MID",
        },
      ],
    });
    expect(prisma.candidateCvAnalysis.update).toHaveBeenLastCalledWith({
      where: { id: "analysis_1" },
      data: expect.objectContaining({
        status: "COMPLETED",
        resumeTextHash: "resume_hash",
        overallScore: 84,
        summary: "Strong backend candidate",
        strengths: ["TypeScript"],
        weaknesses: ["System design"],
        suggestions: ["Add measurable outcomes"],
        extractedSkills: ["TypeScript", "PostgreSQL"],
        recommendedMatches: [
          {
            jobId: "job_1",
            matchScore: 91,
            reasons: ["Relevant stack"],
            missingSkills: ["Redis"],
          },
        ],
        errorMessage: null,
        completedAt: expect.any(Date),
      }),
    });
  });

  it("refunds quota and marks failed when provider analysis fails", async () => {
    const prisma = createPrismaMock();
    const provider = {
      analyzeCandidateCv: vi.fn().mockRejectedValue(new Error("provider unavailable")),
      scoreApplicationFit: vi.fn(),
    };

    prisma.candidateCvAnalysis.findUnique.mockResolvedValue({
      id: "analysis_1",
      status: "PENDING",
      resumeUrl: "https://cdn.example.com/resume.pdf",
      user: { profile: null },
    });
    prisma.job.findMany.mockResolvedValue([]);
    vi.mocked(extractPdfTextFromUrl).mockResolvedValue({
      text: "Readable resume text with enough details about TypeScript, APIs, PostgreSQL, and product work.",
      hash: "resume_hash",
    });

    await expect(
      handleAnalyzeCandidateCv(prisma, provider, "analysis_1", { finalAttempt: true }),
    ).rejects.toThrow("provider unavailable");

    expect(refundCandidateCvQuota).toHaveBeenCalledWith(prisma, "analysis_1");
    expect(prisma.candidateCvAnalysis.update).toHaveBeenLastCalledWith({
      where: { id: "analysis_1" },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "provider unavailable",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("keeps non-final provider failures retryable without refunding quota", async () => {
    const prisma = createPrismaMock();
    const provider = {
      analyzeCandidateCv: vi.fn().mockRejectedValue(new Error("provider unavailable")),
      scoreApplicationFit: vi.fn(),
    };

    prisma.candidateCvAnalysis.findUnique.mockResolvedValue({
      id: "analysis_1",
      status: "PENDING",
      resumeUrl: "https://cdn.example.com/resume.pdf",
      user: { profile: null },
    });
    prisma.job.findMany.mockResolvedValue([]);
    vi.mocked(extractPdfTextFromUrl).mockResolvedValue({
      text: "Readable resume text with enough details about TypeScript, APIs, PostgreSQL, and product work.",
      hash: "resume_hash",
    });

    await expect(
      handleAnalyzeCandidateCv(prisma, provider, "analysis_1", { finalAttempt: false }),
    ).rejects.toThrow("provider unavailable");

    expect(refundCandidateCvQuota).not.toHaveBeenCalled();
    expect(prisma.candidateCvAnalysis.update).toHaveBeenLastCalledWith({
      where: { id: "analysis_1" },
      data: expect.objectContaining({
        status: "PROCESSING",
        errorMessage: "provider unavailable",
      }),
    });
  });
});
