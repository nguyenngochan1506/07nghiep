import { beforeEach, describe, expect, it, vi } from "vitest";

const queueMock = vi.hoisted(() => ({
  add: vi.fn(),
  constructors: [] as Array<{ name: string; options: unknown; close: ReturnType<typeof vi.fn> }>,
  redisInstances: [] as Array<{
    url: string;
    options: unknown;
    quit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("ioredis", () => ({
  default: vi.fn(function Redis(
    this: {
      url: string;
      options: unknown;
      quit: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    },
    url: string,
    options: unknown,
  ) {
    this.url = url;
    this.options = options;
    this.quit = vi.fn().mockResolvedValue("OK");
    this.disconnect = vi.fn();
    queueMock.redisInstances.push(this);
  }),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(function Queue(
    this: {
      name: string;
      options: unknown;
      add: typeof queueMock.add;
      close: ReturnType<typeof vi.fn>;
    },
    name: string,
    options: unknown,
  ) {
    this.name = name;
    this.options = options;
    this.add = queueMock.add;
    this.close = vi.fn().mockResolvedValue(undefined);
    queueMock.constructors.push({ name, options, close: this.close });
  }),
}));

async function importQueueModule() {
  vi.resetModules();
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/07nghiep";
  process.env.BETTER_AUTH_SECRET = "abcdefghijklmnopqrstuvwxyz123456";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.AI_JOB_MAX_ATTEMPTS = "4";

  return import("./index");
}

describe("queue payload schemas", () => {
  it("parses candidate CV analysis payloads", async () => {
    const { analyzeCandidateCvPayloadSchema } = await importQueueModule();

    expect(analyzeCandidateCvPayloadSchema.parse({ analysisId: "analysis_123" })).toEqual({
      analysisId: "analysis_123",
    });
  });

  it("parses application fit score payloads", async () => {
    const { scoreApplicationFitPayloadSchema } = await importQueueModule();

    expect(scoreApplicationFitPayloadSchema.parse({ applicationAiScoreId: "score_123" })).toEqual({
      applicationAiScoreId: "score_123",
    });
  });

  it("parses repair payloads with ISO datetimes", async () => {
    const { repairPendingAiJobsPayloadSchema } = await importQueueModule();

    expect(
      repairPendingAiJobsPayloadSchema.parse({ requestedAt: "2026-06-28T10:00:00.000Z" }),
    ).toEqual({
      requestedAt: "2026-06-28T10:00:00.000Z",
    });
    expect(() => repairPendingAiJobsPayloadSchema.parse({ requestedAt: "2026-06-28" })).toThrow();
  });
});

describe("getAiJobOptions", () => {
  beforeEach(() => {
    queueMock.add.mockReset();
    queueMock.constructors = [];
    delete process.env.AI_JOB_MAX_ATTEMPTS;
    delete process.env.AI_JOB_TIMEOUT_MS;
  });

  it("builds stable BullMQ options from env", async () => {
    const { getAiJobOptions } = await importQueueModule();

    expect(getAiJobOptions("candidate-cv-analysis:analysis_123")).toEqual({
      jobId: "candidate-cv-analysis:analysis_123",
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        age: 7 * 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 14 * 24 * 60 * 60,
      },
    });
  });
});

describe("enqueue helpers", () => {
  beforeEach(() => {
    queueMock.add.mockReset();
    queueMock.add.mockResolvedValue({ id: "job_123" });
    queueMock.constructors = [];
    queueMock.redisInstances = [];
  });

  it("uses required queue names, job names, and stable job IDs", async () => {
    const { enqueueApplicationFitScore, enqueueCandidateCvAnalysis, enqueuePendingAiRepair } =
      await importQueueModule();

    await enqueueCandidateCvAnalysis({ analysisId: "analysis_123" });
    await enqueueApplicationFitScore({ applicationAiScoreId: "score_123" });
    await enqueuePendingAiRepair({ requestedAt: "2026-06-28T10:00:00.000Z" });

    expect(queueMock.constructors.map(({ name }) => name)).toEqual([
      "ai-cv",
      "ai-application-fit",
      "ai-repair",
    ]);
    expect(queueMock.add).toHaveBeenNthCalledWith(
      1,
      "analyze-candidate-cv",
      { analysisId: "analysis_123" },
      expect.objectContaining({ jobId: "candidate-cv-analysis:analysis_123" }),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      2,
      "score-application-fit",
      { applicationAiScoreId: "score_123" },
      expect.objectContaining({ jobId: "application-fit-score:score_123" }),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      3,
      "repair-pending-ai-jobs",
      { requestedAt: "2026-06-28T10:00:00.000Z" },
      expect.objectContaining({
        jobId: "pending-ai-repair",
        removeOnComplete: true,
      }),
    );
  });

  it("uses unique repair job IDs without changing normal deterministic IDs", async () => {
    const {
      enqueueApplicationFitScore,
      enqueueApplicationFitScoreRepair,
      enqueueCandidateCvAnalysis,
      enqueueCandidateCvAnalysisRepair,
    } = await importQueueModule();

    await enqueueCandidateCvAnalysis({ analysisId: "analysis_123" });
    await enqueueCandidateCvAnalysisRepair(
      { analysisId: "analysis_123" },
      { repairRunId: "2026-06-28T10:10:00.000Z" },
    );
    await enqueueApplicationFitScore({ applicationAiScoreId: "score_123" });
    await enqueueApplicationFitScoreRepair(
      { applicationAiScoreId: "score_123" },
      { repairRunId: "2026-06-28T10:10:00.000Z" },
    );

    expect(queueMock.add).toHaveBeenNthCalledWith(
      1,
      "analyze-candidate-cv",
      { analysisId: "analysis_123" },
      expect.objectContaining({ jobId: "candidate-cv-analysis:analysis_123" }),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      2,
      "analyze-candidate-cv",
      { analysisId: "analysis_123" },
      expect.objectContaining({
        jobId: "candidate-cv-analysis-repair:analysis_123:2026-06-28T10:10:00.000Z",
      }),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      3,
      "score-application-fit",
      { applicationAiScoreId: "score_123" },
      expect.objectContaining({ jobId: "application-fit-score:score_123" }),
    );
    expect(queueMock.add).toHaveBeenNthCalledWith(
      4,
      "score-application-fit",
      { applicationAiScoreId: "score_123" },
      expect.objectContaining({
        jobId: "application-fit-score-repair:score_123:2026-06-28T10:10:00.000Z",
      }),
    );
  });

  it("reuses queue instances between enqueue calls", async () => {
    const { enqueueCandidateCvAnalysis } = await importQueueModule();

    await enqueueCandidateCvAnalysis({ analysisId: "analysis_123" });
    await enqueueCandidateCvAnalysis({ analysisId: "analysis_456" });

    expect(queueMock.constructors.map(({ name }) => name)).toEqual(["ai-cv"]);
    expect(queueMock.redisInstances).toHaveLength(1);
  });

  it("closes created queues and the shared Redis connection on shutdown", async () => {
    const {
      closeQueueConnections,
      enqueueApplicationFitScore,
      enqueueCandidateCvAnalysis,
      enqueuePendingAiRepair,
    } = await importQueueModule();

    await enqueueCandidateCvAnalysis({ analysisId: "analysis_123" });
    await enqueueApplicationFitScore({ applicationAiScoreId: "score_123" });
    await enqueuePendingAiRepair({ requestedAt: "2026-06-28T10:00:00.000Z" });

    const createdQueues = [...queueMock.constructors];
    const [redisConnection] = queueMock.redisInstances;

    await closeQueueConnections();

    expect(createdQueues.map(({ close }) => close)).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(createdQueues.every(({ close }) => close.mock.calls.length === 1)).toBe(true);
    expect(redisConnection?.quit).toHaveBeenCalledTimes(1);
    expect(redisConnection?.disconnect).not.toHaveBeenCalled();

    await enqueueCandidateCvAnalysis({ analysisId: "analysis_456" });

    expect(queueMock.constructors.map(({ name }) => name)).toEqual([
      "ai-cv",
      "ai-application-fit",
      "ai-repair",
      "ai-cv",
    ]);
    expect(queueMock.redisInstances).toHaveLength(2);
  });
});
