import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/07nghiep";
  process.env.BETTER_AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";
});

vi.mock("../lib/resume-text", () => ({
  extractResumeTextFromUrl: vi.fn(),
}));

import { handleScoreApplicationFit } from "./score-application-fit";
import { extractResumeTextFromUrl } from "../lib/resume-text";

describe("handleScoreApplicationFit", () => {
  it("marks an application fit score completed with answers and rich context", async () => {
    vi.mocked(extractResumeTextFromUrl).mockResolvedValue({
      text: "Readable resume text with enough details about TypeScript, APIs, PostgreSQL, and product work.",
      hash: "resume_hash",
    });
    const prisma = {
      applicationAiScore: {
        findUnique: vi.fn().mockResolvedValue({
          id: "score_1",
          status: "PENDING",
          applicationId: "application_1",
          application: {
            id: "application_1",
            jobId: "job_1",
            resumeUrl: "https://cdn.example.com/resume.docx",
            coverLetter: "I have led backend delivery for similar products.",
            answers: [{ question: "Notice period", answer: "Immediately" }],
            candidate: {
              profile: {
                resumeUrl: "https://cdn.example.com/profile-resume.pdf",
                headline: "Backend Engineer",
                summary: "Builds APIs",
                skills: ["TypeScript"],
                experience: [{ title: "Engineer" }],
                education: [{ school: "NLU" }],
                location: "Ho Chi Minh",
                portfolioUrl: "https://portfolio.example.com",
              },
            },
            job: {
              id: "job_1",
              title: "Backend Developer",
              organization: { name: "Acme" },
              description: "Build APIs",
              requirements: "TypeScript",
              benefits: "Remote",
              skills: [{ skill: "TypeScript" }],
              location: "Ho Chi Minh City",
              workType: "REMOTE",
              jobType: "FULL_TIME",
              experienceLevel: "MID",
              industry: "Software",
              salaryMin: null,
              salaryMax: null,
              salaryCurrency: "USD",
              salaryUnit: "MONTH",
              salaryNegotiable: false,
              experienceMonths: 24,
              applicantLocation: "Vietnam",
              sourceSite: "internal",
            },
          },
        }),
        update: vi.fn(),
      },
    };
    const provider = {
      analyzeCandidateCv: vi.fn(),
      scoreApplicationFit: vi.fn().mockResolvedValue({
        score: 86,
        recommendation: "STRONG_FIT",
        summary: "Strong backend fit",
        matchedSkills: ["TypeScript"],
        missingSkills: ["Redis"],
        risks: ["Needs architecture interview"],
        reasoning: "Relevant backend experience and immediate availability.",
      }),
    };

    await handleScoreApplicationFit(prisma, provider, "score_1");

    expect(extractResumeTextFromUrl).toHaveBeenCalledWith("https://cdn.example.com/resume.docx");
    expect(provider.scoreApplicationFit).toHaveBeenCalledWith({
      resumeText: expect.stringContaining("Readable resume text"),
      coverLetter: "I have led backend delivery for similar products.",
      answers: [{ question: "Notice period", answer: "Immediately" }],
      profile: {
        headline: "Backend Engineer",
        summary: "Builds APIs",
        skills: ["TypeScript"],
        experience: [{ title: "Engineer" }],
        education: [{ school: "NLU" }],
        location: "Ho Chi Minh",
        portfolioUrl: "https://portfolio.example.com",
      },
      job: {
        id: "job_1",
        title: "Backend Developer",
        organizationName: "Acme",
        description: "Build APIs",
        requirements: "TypeScript",
        benefits: "Remote",
        skills: ["TypeScript"],
        location: "Ho Chi Minh City",
        workType: "REMOTE",
        jobType: "FULL_TIME",
        experienceLevel: "MID",
        industry: "Software",
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: "USD",
        salaryUnit: "MONTH",
        salaryNegotiable: false,
        experienceMonths: 24,
        applicantLocation: "Vietnam",
        sourceSite: "internal",
      },
    });
    expect(prisma.applicationAiScore.update).toHaveBeenLastCalledWith({
      where: { id: "score_1" },
      data: expect.objectContaining({
        status: "COMPLETED",
        score: 86,
        recommendation: "STRONG_FIT",
        summary: "Strong backend fit",
        matchedSkills: ["TypeScript"],
        missingSkills: ["Redis"],
        risks: ["Needs architecture interview"],
        reasoning: "Relevant backend experience and immediate availability.",
        errorMessage: null,
        completedAt: expect.any(Date),
      }),
    });
  });

  it("marks missing-resume application scores failed without calling provider", async () => {
    vi.mocked(extractResumeTextFromUrl).mockReset();
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
