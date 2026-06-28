import { env } from "@07nghiep/env/server";
import { type JobsOptions, Queue } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";

const ONE_DAY_SECONDS = 24 * 60 * 60;
const BULLMQ_JOB_ID_UNSAFE_CHARS = /[^A-Za-z0-9_-]/g;

export const AI_CV_QUEUE = "ai-cv";
export const AI_APPLICATION_FIT_QUEUE = "ai-application-fit";
export const AI_REPAIR_QUEUE = "ai-repair";

export const analyzeCandidateCvPayloadSchema = z.object({
  analysisId: z.string().min(1),
});

export const scoreApplicationFitPayloadSchema = z.object({
  applicationAiScoreId: z.string().min(1),
});

export const repairPendingAiJobsPayloadSchema = z.object({
  requestedAt: z.string().datetime(),
});

export type AnalyzeCandidateCvPayload = z.infer<typeof analyzeCandidateCvPayloadSchema>;
export type ScoreApplicationFitPayload = z.infer<typeof scoreApplicationFitPayloadSchema>;
export type RepairPendingAiJobsPayload = z.infer<typeof repairPendingAiJobsPayloadSchema>;

let queueConnection: IORedis | null = null;
let aiCvQueue: Queue<AnalyzeCandidateCvPayload> | null = null;
let applicationFitQueue: Queue<ScoreApplicationFitPayload> | null = null;
let aiRepairQueue: Queue<RepairPendingAiJobsPayload> | null = null;

function sanitizeJobIdPart(value: string): string {
  return value.replace(BULLMQ_JOB_ID_UNSAFE_CHARS, "_");
}

export function createAiJobId(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts.map(sanitizeJobIdPart)].join("-");
}

export function getQueueConnection(): IORedis {
  queueConnection ??= new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  return queueConnection;
}

export function getAiJobOptions(jobId: string): JobsOptions {
  if (jobId.includes(":")) {
    throw new Error("BullMQ jobId cannot contain ':'");
  }

  return {
    jobId,
    attempts: env.AI_JOB_MAX_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 7 * ONE_DAY_SECONDS,
      count: 1000,
    },
    removeOnFail: {
      age: 14 * ONE_DAY_SECONDS,
    },
  };
}

export function getAiRepairJobOptions(): JobsOptions {
  return {
    jobId: "pending-ai-repair",
    attempts: env.AI_JOB_MAX_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: {
      age: 14 * ONE_DAY_SECONDS,
    },
  };
}

export function createAiCvQueue() {
  aiCvQueue ??= new Queue<AnalyzeCandidateCvPayload>(AI_CV_QUEUE, {
    connection: getQueueConnection(),
  });

  return aiCvQueue;
}

export function createApplicationFitQueue() {
  applicationFitQueue ??= new Queue<ScoreApplicationFitPayload>(AI_APPLICATION_FIT_QUEUE, {
    connection: getQueueConnection(),
  });

  return applicationFitQueue;
}

export function createAiRepairQueue() {
  aiRepairQueue ??= new Queue<RepairPendingAiJobsPayload>(AI_REPAIR_QUEUE, {
    connection: getQueueConnection(),
  });

  return aiRepairQueue;
}

export async function closeQueueConnections(): Promise<void> {
  const queues = [aiCvQueue, applicationFitQueue, aiRepairQueue].filter((queue) => queue !== null);
  aiCvQueue = null;
  applicationFitQueue = null;
  aiRepairQueue = null;

  await Promise.all(queues.map((queue) => queue.close()));

  if (queueConnection) {
    const connection = queueConnection;
    queueConnection = null;

    try {
      await connection.quit();
    } catch {
      connection.disconnect();
    }
  }
}

export async function enqueueCandidateCvAnalysis(payload: AnalyzeCandidateCvPayload) {
  const parsedPayload = analyzeCandidateCvPayloadSchema.parse(payload);
  const queue = createAiCvQueue();

  return queue.add(
    "analyze-candidate-cv",
    parsedPayload,
    getAiJobOptions(createAiJobId("candidate-cv-analysis", parsedPayload.analysisId)),
  );
}

export async function enqueueCandidateCvAnalysisRepair(
  payload: AnalyzeCandidateCvPayload,
  options: { repairRunId: string },
) {
  const parsedPayload = analyzeCandidateCvPayloadSchema.parse(payload);
  const queue = createAiCvQueue();

  return queue.add(
    "analyze-candidate-cv",
    parsedPayload,
    getAiJobOptions(
      createAiJobId("candidate-cv-analysis-repair", parsedPayload.analysisId, options.repairRunId),
    ),
  );
}

export async function enqueueApplicationFitScore(payload: ScoreApplicationFitPayload) {
  const parsedPayload = scoreApplicationFitPayloadSchema.parse(payload);
  const queue = createApplicationFitQueue();

  return queue.add(
    "score-application-fit",
    parsedPayload,
    getAiJobOptions(createAiJobId("application-fit-score", parsedPayload.applicationAiScoreId)),
  );
}

export async function enqueueApplicationFitScoreRepair(
  payload: ScoreApplicationFitPayload,
  options: { repairRunId: string },
) {
  const parsedPayload = scoreApplicationFitPayloadSchema.parse(payload);
  const queue = createApplicationFitQueue();

  return queue.add(
    "score-application-fit",
    parsedPayload,
    getAiJobOptions(
      createAiJobId(
        "application-fit-score-repair",
        parsedPayload.applicationAiScoreId,
        options.repairRunId,
      ),
    ),
  );
}

export async function enqueuePendingAiRepair(payload: RepairPendingAiJobsPayload) {
  const parsedPayload = repairPendingAiJobsPayloadSchema.parse(payload);
  const queue = createAiRepairQueue();

  return queue.add("repair-pending-ai-jobs", parsedPayload, getAiRepairJobOptions());
}
