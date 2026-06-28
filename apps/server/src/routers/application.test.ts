import { beforeEach, describe, expect, it, vi } from "vitest";

import { applicationRouter } from "./application";
import { applicationsRouter } from "./applications";
import { enqueueApplicationFitSafely } from "../lib/ai-cv/enqueue";
import { hasActiveEmployerPackage } from "../lib/ai-cv/quota";

vi.mock("../lib/ai-cv/enqueue", () => ({
  enqueueApplicationFitSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/ai-cv/quota", () => ({
  hasActiveEmployerPackage: vi.fn().mockResolvedValue(true),
}));

vi.mock("../lib/notifications/service", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

function createCandidateCtx(prisma: unknown) {
  return {
    session: { user: { id: "candidate_1" } },
    user: { id: "candidate_1" },
    role: "CANDIDATE",
    prisma,
  } as never;
}

function createEmployerCtx(prisma: unknown) {
  return {
    session: { user: { id: "employer_1" } },
    user: { id: "employer_1" },
    role: "EMPLOYER",
    prisma,
  } as never;
}

describe("applicationsRouter AI scoring", () => {
  beforeEach(() => {
    vi.mocked(enqueueApplicationFitSafely).mockClear();
    vi.mocked(hasActiveEmployerPackage).mockClear();
  });

  it("creates application and pending AI score for paid employer", async () => {
    const createApplication = vi.fn().mockResolvedValue({
      id: "app_1",
      jobId: "job_1",
      candidateId: "candidate_1",
      job: { title: "Backend Developer", organization: { userId: "employer_1", name: "Acme" } },
      candidate: { name: "Candidate" },
    });
    const createScore = vi.fn().mockResolvedValue({ id: "score_1" });
    const prisma = {
      job: {
        findUnique: vi.fn().mockResolvedValue({ id: "job_1", status: "OPEN" }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: createApplication,
      },
      profile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          headline: "Backend Developer",
          summary: "Build APIs",
          skills: ["TypeScript"],
          resumeUrl: "https://example.com/resume.pdf",
        }),
      },
      applicationAiScore: {
        create: createScore,
      },
      applicationHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    await expect(
      applicationsRouter
        .createCaller(createCandidateCtx(prisma))
        .applyJob({ jobId: "job_1", coverLetter: "I am interested." }),
    ).resolves.toMatchObject({ id: "app_1" });

    expect(hasActiveEmployerPackage).toHaveBeenCalledWith(prisma, "employer_1");
    expect(createScore).toHaveBeenCalledWith({
      data: {
        applicationId: "app_1",
        status: "PENDING",
        matchedSkills: [],
        missingSkills: [],
      },
    });
    expect(enqueueApplicationFitSafely).toHaveBeenCalledWith(prisma, "score_1");
  });

  it("does not create an AI score when the employer package is inactive", async () => {
    vi.mocked(hasActiveEmployerPackage).mockResolvedValueOnce(false);
    const prisma = {
      job: {
        findUnique: vi.fn().mockResolvedValue({ id: "job_1", status: "OPEN" }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "app_1",
          jobId: "job_1",
          candidateId: "candidate_1",
          job: {
            title: "Backend Developer",
            organization: { userId: "employer_1", name: "Acme" },
          },
          candidate: { name: "Candidate" },
        }),
      },
      profile: {
        findUnique: vi.fn().mockResolvedValue({
          id: "profile_1",
          headline: "Backend Developer",
          summary: "Build APIs",
          skills: ["TypeScript"],
          resumeUrl: "https://example.com/resume.pdf",
        }),
      },
      applicationAiScore: {
        create: vi.fn(),
      },
      applicationHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    await applicationsRouter
      .createCaller(createCandidateCtx(prisma))
      .applyJob({ jobId: "job_1", coverLetter: "I am interested." });

    expect(prisma.applicationAiScore.create).not.toHaveBeenCalled();
    expect(enqueueApplicationFitSafely).not.toHaveBeenCalled();
  });
});

describe("applicationRouter AI scoring", () => {
  beforeEach(() => {
    vi.mocked(enqueueApplicationFitSafely).mockClear();
  });

  it("retries a failed AI score for an owned application", async () => {
    const updatedScore = { id: "score_1", status: "PENDING" };
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({ id: "sub_1" }),
      },
      application: {
        findUnique: vi.fn().mockResolvedValue({
          id: "app_1",
          job: { organization: { userId: "employer_1" } },
          aiScore: { id: "score_1", status: "FAILED" },
        }),
      },
      applicationAiScore: {
        update: vi.fn().mockResolvedValue(updatedScore),
        create: vi.fn(),
      },
    };

    await expect(
      applicationRouter
        .createCaller(createEmployerCtx(prisma))
        .retryAiScore({ applicationId: "app_1" }),
    ).resolves.toEqual(updatedScore);

    expect(prisma.applicationAiScore.update).toHaveBeenCalledWith({
      where: { id: "score_1" },
      data: {
        status: "PENDING",
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        matchedSkills: [],
        missingSkills: [],
      },
    });
    expect(enqueueApplicationFitSafely).toHaveBeenCalledWith(prisma, "score_1");
  });
});
