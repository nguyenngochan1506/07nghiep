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
import { errorWorker, logWorker } from "./lib/log";

function isFinalAttempt(job: { attemptsMade: number; opts: { attempts?: number } }) {
  const attempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
  return job.attemptsMade + 1 >= attempts;
}

function createWorkers() {
  const provider = createAiCvProvider();
  const connection = getQueueConnection();
  const concurrency = env.AI_WORKER_CONCURRENCY;

  logWorker("creating AI CV workers", {
    provider: env.AI_PROVIDER,
    model: env.ANTHROPIC_MODEL,
    concurrency,
  });

  return [
    new Worker(
      AI_CV_QUEUE,
      async (job) => {
        const payload = analyzeCandidateCvPayloadSchema.parse(job.data);
        logWorker("candidate CV job received", {
          queue: AI_CV_QUEUE,
          jobId: job.id,
          analysisId: payload.analysisId,
          attempt: job.attemptsMade + 1,
          finalAttempt: isFinalAttempt(job),
        });
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
        logWorker("application fit job received", {
          queue: AI_APPLICATION_FIT_QUEUE,
          jobId: job.id,
          applicationAiScoreId: payload.applicationAiScoreId,
          attempt: job.attemptsMade + 1,
          finalAttempt: isFinalAttempt(job),
        });
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
        logWorker("repair job received", {
          queue: AI_REPAIR_QUEUE,
          jobId: job.id,
          requestedAt: payload.requestedAt,
        });
        await repairPendingAiJobs(prisma, new Date(payload.requestedAt));
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
  logWorker("received shutdown signal", { signal });
  await closeWorkers(workers);
}

async function main() {
  const workers = createWorkers();

  for (const worker of workers) {
    worker.on("active", (job) => {
      logWorker("job active", {
        queue: worker.name,
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });
    });
    worker.on("completed", (job) => {
      logWorker("job completed", {
        queue: worker.name,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
      });
    });
    worker.on("failed", (job, error) => {
      errorWorker("job failed", error, {
        queue: worker.name,
        jobId: job?.id ?? "unknown",
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts.attempts,
      });
    });
    worker.on("error", (error) => {
      errorWorker("worker error", error, { queue: worker.name });
    });
  }

  try {
    await Promise.all(workers.map((worker) => worker.waitUntilReady()));
  } catch (error) {
    errorWorker("failed to start AI CV workers", error);
    await closeWorkers(workers);
    process.exit(1);
  }

  logWorker("AI CV workers started", { concurrency: env.AI_WORKER_CONCURRENCY });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      shutdown(signal, workers)
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          errorWorker("shutdown failed", error);
          process.exit(1);
        });
    });
  }
}

main().catch(async (error: unknown) => {
  errorWorker("unhandled startup failure", error);
  await closeQueueConnections();
  await prisma.$disconnect();
  process.exit(1);
});
