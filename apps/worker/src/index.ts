import "dotenv/config";

import { createAiCvProvider } from "@07nghiep/ai-cv/provider";
import prisma from "@07nghiep/db";
import { env } from "@07nghiep/env/server";
import {
  AI_APPLICATION_FIT_QUEUE,
  AI_CV_QUEUE,
  AI_REPAIR_QUEUE,
  analyzeCandidateCvPayloadSchema,
  closeQueueConnections,
  getQueueConnection,
  repairPendingAiJobsPayloadSchema,
  scoreApplicationFitPayloadSchema,
} from "@07nghiep/queue";
import { Worker } from "bullmq";

import { handleAnalyzeCandidateCv } from "./jobs/analyze-candidate-cv";
import { repairPendingAiJobs } from "./jobs/repair-pending-ai-jobs";
import { handleScoreApplicationFit } from "./jobs/score-application-fit";

function isFinalAttempt(job: { attemptsMade: number; opts: { attempts?: number } }) {
  const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
  return job.attemptsMade + 1 >= attempts;
}

function createWorkers() {
  const provider = createAiCvProvider();
  const connection = getQueueConnection();
  const concurrency = env.AI_WORKER_CONCURRENCY;

  return [
    new Worker(
      AI_CV_QUEUE,
      async (job) => {
        const payload = analyzeCandidateCvPayloadSchema.parse(job.data);
        await handleAnalyzeCandidateCv(
          prisma as unknown as Parameters<typeof handleAnalyzeCandidateCv>[0],
          provider,
          payload.analysisId,
          { finalAttempt: isFinalAttempt(job) },
        );
      },
      { connection, concurrency },
    ),
    new Worker(
      AI_APPLICATION_FIT_QUEUE,
      async (job) => {
        const payload = scoreApplicationFitPayloadSchema.parse(job.data);
        await handleScoreApplicationFit(
          prisma as unknown as Parameters<typeof handleScoreApplicationFit>[0],
          provider,
          payload.applicationAiScoreId,
          { finalAttempt: isFinalAttempt(job) },
        );
      },
      { connection, concurrency },
    ),
    new Worker(
      AI_REPAIR_QUEUE,
      async (job) => {
        const payload = repairPendingAiJobsPayloadSchema.parse(job.data);
        await repairPendingAiJobs(
          prisma as Parameters<typeof repairPendingAiJobs>[0],
          new Date(payload.requestedAt),
        );
      },
      { connection, concurrency: 1 },
    ),
  ];
}

async function closeWorkers(workers: Worker[]) {
  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueueConnections();
  await prisma.$disconnect();
}

async function shutdown(signal: NodeJS.Signals, workers: Worker[]) {
  console.log(`[worker] Received ${signal}; shutting down.`);
  await closeWorkers(workers);
}

async function main() {
  const workers = createWorkers();

  for (const worker of workers) {
    worker.on("failed", (job, error) => {
      console.error(`[worker] ${worker.name} job ${job?.id ?? "unknown"} failed`, error);
    });
    worker.on("error", (error) => {
      console.error(`[worker] ${worker.name} worker error`, error);
    });
  }

  try {
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));
  } catch (error) {
    console.error("[worker] Failed to start AI CV workers", error);
    await closeWorkers(workers);
    process.exit(1);
  }

  console.log(`[worker] AI CV workers started with concurrency ${env.AI_WORKER_CONCURRENCY}`);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      shutdown(signal, workers)
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          console.error("[worker] Shutdown failed", error);
          process.exit(1);
        });
    });
  }
}

main().catch(async (error: unknown) => {
  console.error("[worker] Unhandled startup failure", error);
  await closeQueueConnections();
  await prisma.$disconnect();
  process.exit(1);
});
