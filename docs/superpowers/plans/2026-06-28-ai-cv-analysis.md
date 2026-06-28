# AI CV Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Candidate Plus CV analysis/job matching and paid-employer application fit scoring with BullMQ, Redis, a separate worker app, and an Anthropic-backed provider interface.

**Architecture:** Server routes own auth, subscription checks, DB record creation, and enqueue attempts. `apps/worker` consumes BullMQ jobs, calls `packages/ai-cv`, updates Prisma records, and repairs stuck pending jobs. Candidate-facing analysis and employer-facing fit scoring are stored separately and never exposed across product boundaries.

**Tech Stack:** TypeScript, Prisma 7, Hono/tRPC, React/Vite/TanStack Router, BullMQ, Redis, Anthropic SDK, Zod, Vitest, Turborepo, pnpm.

---

## File Structure

Create or modify these files:

- Create `packages/db/prisma/migrations/20260628090000_ai_cv_analysis/migration.sql`: SQL migration for AI enums and tables.
- Modify `packages/db/prisma/schema/schema.prisma`: Prisma enums, relations, `CandidateCvAnalysis`, and `ApplicationAiScore`.
- Modify `packages/db/prisma/schema/auth.prisma`: add `User.candidateCvAnalyses` relation.
- Modify `packages/db/docker-compose.yml`: add Redis service for local queue runtime.
- Modify `packages/env/src/server.ts`: add Redis and AI env variables.
- Create `packages/queue/package.json`: workspace package for BullMQ helpers.
- Create `packages/queue/tsconfig.json`: package TypeScript config.
- Create `packages/queue/src/index.ts`: queue names, Zod payload schemas, Redis/BullMQ factories, enqueue helpers.
- Create `packages/queue/src/index.test.ts`: queue payload and option tests.
- Create `packages/ai-cv/package.json`: workspace package for provider abstraction.
- Create `packages/ai-cv/tsconfig.json`: package TypeScript config.
- Create `packages/ai-cv/src/schemas.ts`: input/result Zod schemas and exported types.
- Create `packages/ai-cv/src/prompts.ts`: prompt builders.
- Create `packages/ai-cv/src/provider.ts`: provider interface and factory.
- Create `packages/ai-cv/src/providers/anthropic.ts`: Anthropic API implementation.
- Create `packages/ai-cv/src/index.ts`: exports.
- Create `packages/ai-cv/src/schemas.test.ts`: result validation tests.
- Create `apps/worker/package.json`: separate worker app.
- Create `apps/worker/tsconfig.json`: worker TypeScript config.
- Create `apps/worker/src/index.ts`: worker process entry.
- Create `apps/worker/src/jobs/analyze-candidate-cv.ts`: candidate analysis job handler.
- Create `apps/worker/src/jobs/score-application-fit.ts`: employer fit score job handler.
- Create `apps/worker/src/jobs/repair-pending-ai-jobs.ts`: repair job handler.
- Create `apps/worker/src/lib/resume-text.ts`: resume text fetching and extraction.
- Create `apps/worker/src/lib/quota.ts`: quota refund helper.
- Create `apps/worker/src/jobs/*.test.ts`: worker handler tests with mocked provider and Prisma.
- Modify `apps/server/package.json`: add `@07nghiep/queue` and `@07nghiep/ai-cv` dependencies.
- Create `apps/server/src/lib/ai-cv/quota.ts`: Candidate Plus quota reserve/refund helpers.
- Create `apps/server/src/lib/ai-cv/enqueue.ts`: safe enqueue wrapper that leaves records pending on Redis failure.
- Create `apps/server/src/routers/cvAnalysis.ts`: Candidate Plus analysis API.
- Create `apps/server/src/routers/cvAnalysis.test.ts`: router tests.
- Modify `apps/server/src/routers/index.ts`: register `cvAnalysis`.
- Modify `apps/server/src/routers/applications.ts`: create employer fit score record on apply.
- Modify `apps/server/src/routers/application.ts`: include AI scores and add retry API.
- Modify `apps/server/src/routers/application.test.ts`: application scoring tests.
- Create `apps/candidate/src/routes/cv-analysis.tsx`: Candidate Plus AI CV screen.
- Modify `apps/candidate/src/components/header.tsx`: add candidate AI CV navigation item.
- Modify `apps/employer/src/routes/applications/index.tsx`: show AI status/score badge in list.
- Modify `apps/employer/src/routes/applications/$applicationId.tsx`: show AI Fit Score card and retry action.
- Modify `package.json`: add root scripts for worker development.

## Task 1: Database Models And Redis Local Service

**Files:**
- Modify: `packages/db/prisma/schema/schema.prisma`
- Modify: `packages/db/prisma/schema/auth.prisma`
- Create: `packages/db/prisma/migrations/20260628090000_ai_cv_analysis/migration.sql`
- Modify: `packages/db/docker-compose.yml`

- [ ] **Step 1: Add Prisma enums and relations**

In `packages/db/prisma/schema/schema.prisma`, add these enums after `BusinessApplicationStatus`:

```prisma
enum AiJobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum ApplicationFitRecommendation {
  STRONG_FIT
  POTENTIAL_FIT
  WEAK_FIT
}
```

Add this relation to the existing `Application` model in `packages/db/prisma/schema/schema.prisma`:

```prisma
model Application {
  // keep existing fields
  aiScore ApplicationAiScore?
}
```

Add this relation to the existing `User` model in `packages/db/prisma/schema/auth.prisma` under custom relations:

```prisma
model User {
  // keep existing fields from auth.prisma
  candidateCvAnalyses CandidateCvAnalysis[]
}
```

- [ ] **Step 2: Add candidate and employer AI models**

Append these models near other custom models in `packages/db/prisma/schema/schema.prisma`:

```prisma
model CandidateCvAnalysis {
  id                 String      @id @default(cuid())
  userId             String
  resumeUrl          String
  resumeTextHash     String
  status             AiJobStatus @default(PENDING)
  queueJobId         String?
  overallScore       Int?
  summary            String?     @db.Text
  strengths          Json?
  weaknesses         Json?
  suggestions        Json?
  extractedSkills    String[]
  recommendedMatches Json?
  errorMessage       String?     @db.Text
  quotaReservedAt    DateTime?
  quotaRefundedAt    DateTime?
  startedAt          DateTime?
  completedAt        DateTime?
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status, createdAt])
  @@index([resumeTextHash])
}

model ApplicationAiScore {
  id             String                    @id @default(cuid())
  applicationId  String                    @unique
  status         AiJobStatus               @default(PENDING)
  queueJobId     String?
  score          Int?
  recommendation ApplicationFitRecommendation?
  summary        String?                   @db.Text
  matchedSkills  String[]
  missingSkills  String[]
  risks          Json?
  reasoning      String?                   @db.Text
  errorMessage   String?                   @db.Text
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
}
```

- [ ] **Step 3: Create SQL migration**

Create `packages/db/prisma/migrations/20260628090000_ai_cv_analysis/migration.sql`:

```sql
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ApplicationFitRecommendation" AS ENUM ('STRONG_FIT', 'POTENTIAL_FIT', 'WEAK_FIT');

CREATE TABLE "CandidateCvAnalysis" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resumeUrl" TEXT NOT NULL,
  "resumeTextHash" TEXT NOT NULL,
  "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
  "queueJobId" TEXT,
  "overallScore" INTEGER,
  "summary" TEXT,
  "strengths" JSONB,
  "weaknesses" JSONB,
  "suggestions" JSONB,
  "extractedSkills" TEXT[],
  "recommendedMatches" JSONB,
  "errorMessage" TEXT,
  "quotaReservedAt" TIMESTAMP(3),
  "quotaRefundedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CandidateCvAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApplicationAiScore" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
  "queueJobId" TEXT,
  "score" INTEGER,
  "recommendation" "ApplicationFitRecommendation",
  "summary" TEXT,
  "matchedSkills" TEXT[],
  "missingSkills" TEXT[],
  "risks" JSONB,
  "reasoning" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicationAiScore_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateCvAnalysis_userId_status_createdAt_idx" ON "CandidateCvAnalysis"("userId", "status", "createdAt");
CREATE INDEX "CandidateCvAnalysis_resumeTextHash_idx" ON "CandidateCvAnalysis"("resumeTextHash");
CREATE UNIQUE INDEX "ApplicationAiScore_applicationId_key" ON "ApplicationAiScore"("applicationId");
CREATE INDEX "ApplicationAiScore_status_createdAt_idx" ON "ApplicationAiScore"("status", "createdAt");

ALTER TABLE "CandidateCvAnalysis"
  ADD CONSTRAINT "CandidateCvAnalysis_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationAiScore"
  ADD CONSTRAINT "ApplicationAiScore_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Add Redis to local Docker Compose**

Modify `packages/db/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:17.9-alpine
    container_name: 07nghiep-postgres
    environment:
      POSTGRES_DB: 07nghiep
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"
    volumes:
      - 07nghiep_postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7.4-alpine
    container_name: 07nghiep-redis
    ports:
      - "6379:6379"
    volumes:
      - 07nghiep_redis_data:/data
    command: ["redis-server", "--appendonly", "yes"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  07nghiep_postgres_data:
  07nghiep_redis_data:
```

- [ ] **Step 5: Validate Prisma generation**

Run:

```bash
pnpm db:generate
```

Expected: Prisma client generation completes without schema errors.

- [ ] **Step 6: Commit database foundation**

```bash
git add packages/db/prisma/schema packages/db/prisma/migrations/20260628090000_ai_cv_analysis packages/db/docker-compose.yml
git commit -m "feat(db): add ai cv analysis models"
```

## Task 2: Environment And Queue Package

**Files:**
- Modify: `packages/env/src/server.ts`
- Create: `packages/queue/package.json`
- Create: `packages/queue/tsconfig.json`
- Create: `packages/queue/src/index.ts`
- Create: `packages/queue/src/index.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add environment variables**

Modify `packages/env/src/server.ts` and add these keys inside `server`:

```ts
REDIS_URL: z.string().url().default("redis://localhost:6379"),
AI_PROVIDER: z.enum(["anthropic"]).default("anthropic"),
ANTHROPIC_API_KEY: z.string().min(1).optional(),
ANTHROPIC_MODEL: z.string().min(1).default("claude-3-5-sonnet-latest"),
AI_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
AI_JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
AI_JOB_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(120_000),
```

- [ ] **Step 2: Create queue package manifest**

Create `packages/queue/package.json`:

```json
{
  "name": "@07nghiep/queue",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "check-types": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "@07nghiep/env": "workspace:*",
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@07nghiep/config": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 3: Create queue tsconfig**

Create `packages/queue/tsconfig.json`:

```json
{
  "extends": "@07nghiep/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Implement queue helpers**

Create `packages/queue/src/index.ts`:

```ts
import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";
import { env } from "@07nghiep/env/server";

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

let sharedConnection: IORedis | null = null;

export function getQueueConnection() {
  if (!sharedConnection) {
    sharedConnection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  return sharedConnection;
}

export function getAiJobOptions(jobId: string): JobsOptions {
  return {
    jobId,
    attempts: env.AI_JOB_MAX_ATTEMPTS,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: {
      age: 60 * 60 * 24 * 7,
      count: 1_000,
    },
    removeOnFail: {
      age: 60 * 60 * 24 * 14,
    },
  };
}

export function createAiCvQueue() {
  return new Queue<AnalyzeCandidateCvPayload>(AI_CV_QUEUE, {
    connection: getQueueConnection(),
  });
}

export function createApplicationFitQueue() {
  return new Queue<ScoreApplicationFitPayload>(AI_APPLICATION_FIT_QUEUE, {
    connection: getQueueConnection(),
  });
}

export function createAiRepairQueue() {
  return new Queue<RepairPendingAiJobsPayload>(AI_REPAIR_QUEUE, {
    connection: getQueueConnection(),
  });
}

export async function enqueueCandidateCvAnalysis(payload: AnalyzeCandidateCvPayload) {
  const input = analyzeCandidateCvPayloadSchema.parse(payload);
  const queue = createAiCvQueue();
  return queue.add("analyze-candidate-cv", input, getAiJobOptions(`candidate-cv:${input.analysisId}`));
}

export async function enqueueApplicationFitScore(payload: ScoreApplicationFitPayload) {
  const input = scoreApplicationFitPayloadSchema.parse(payload);
  const queue = createApplicationFitQueue();
  return queue.add(
    "score-application-fit",
    input,
    getAiJobOptions(`application-fit:${input.applicationAiScoreId}`),
  );
}

export async function enqueuePendingAiRepair(payload: RepairPendingAiJobsPayload) {
  const input = repairPendingAiJobsPayloadSchema.parse(payload);
  const queue = createAiRepairQueue();
  return queue.add("repair-pending-ai-jobs", input, getAiJobOptions(`ai-repair:${input.requestedAt}`));
}
```

- [ ] **Step 5: Add queue tests**

Create `packages/queue/src/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  analyzeCandidateCvPayloadSchema,
  getAiJobOptions,
  scoreApplicationFitPayloadSchema,
} from "./index";

describe("queue payload schemas", () => {
  it("accepts candidate analysis payloads", () => {
    expect(analyzeCandidateCvPayloadSchema.parse({ analysisId: "analysis_1" })).toEqual({
      analysisId: "analysis_1",
    });
  });

  it("rejects empty candidate analysis ids", () => {
    expect(() => analyzeCandidateCvPayloadSchema.parse({ analysisId: "" })).toThrow();
  });

  it("accepts application fit payloads", () => {
    expect(scoreApplicationFitPayloadSchema.parse({ applicationAiScoreId: "score_1" })).toEqual({
      applicationAiScoreId: "score_1",
    });
  });

  it("builds stable BullMQ options", () => {
    expect(getAiJobOptions("candidate-cv:abc")).toMatchObject({
      jobId: "candidate-cv:abc",
      attempts: expect.any(Number),
      backoff: { type: "exponential", delay: 5000 },
    });
  });
});
```

- [ ] **Step 6: Add root scripts**

Modify root `package.json` scripts:

```json
"dev:worker": "turbo -F @07nghiep/worker dev",
"worker:start": "turbo -F @07nghiep/worker start"
```

- [ ] **Step 7: Run queue tests**

Run:

```bash
pnpm --filter @07nghiep/queue test
pnpm --filter @07nghiep/queue check-types
```

Expected: both commands pass.

- [ ] **Step 8: Commit queue foundation**

```bash
git add packages/env/src/server.ts packages/queue package.json
git commit -m "feat(queue): add bullmq queue helpers"
```

## Task 3: AI CV Provider Package

**Files:**
- Create: `packages/ai-cv/package.json`
- Create: `packages/ai-cv/tsconfig.json`
- Create: `packages/ai-cv/src/schemas.ts`
- Create: `packages/ai-cv/src/prompts.ts`
- Create: `packages/ai-cv/src/provider.ts`
- Create: `packages/ai-cv/src/providers/anthropic.ts`
- Create: `packages/ai-cv/src/index.ts`
- Create: `packages/ai-cv/src/schemas.test.ts`

- [ ] **Step 1: Add package manifest**

Create `packages/ai-cv/package.json`:

```json
{
  "name": "@07nghiep/ai-cv",
  "type": "module",
  "exports": {
    ".": {
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "check-types": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "@07nghiep/env": "workspace:*",
    "@anthropic-ai/sdk": "^0.36.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@07nghiep/config": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Add tsconfig**

Create `packages/ai-cv/tsconfig.json`:

```json
{
  "extends": "@07nghiep/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Add schemas**

Create `packages/ai-cv/src/schemas.ts`:

```ts
import { z } from "zod";

export const jobForMatchingSchema = z.object({
  id: z.string(),
  title: z.string(),
  organizationName: z.string(),
  description: z.string(),
  requirements: z.string().nullable(),
  skills: z.array(z.string()),
  location: z.string(),
  workType: z.string(),
  jobType: z.string(),
  experienceLevel: z.string(),
});

export const candidateCvAnalysisInputSchema = z.object({
  resumeText: z.string().min(50),
  profile: z.object({
    headline: z.string().nullable(),
    summary: z.string().nullable(),
    skills: z.array(z.string()),
    experience: z.unknown(),
    education: z.unknown(),
  }),
  jobs: z.array(jobForMatchingSchema).max(30),
});

export const applicationFitScoreInputSchema = z.object({
  resumeText: z.string().min(50),
  coverLetter: z.string().nullable(),
  profile: z.object({
    headline: z.string().nullable(),
    summary: z.string().nullable(),
    skills: z.array(z.string()),
    experience: z.unknown(),
    education: z.unknown(),
  }),
  job: jobForMatchingSchema,
});

export const candidateJobMatchSchema = z.object({
  jobId: z.string(),
  matchScore: z.number().int().min(0).max(100),
  reasons: z.array(z.string()).max(5),
  missingSkills: z.array(z.string()).max(10),
});

export const candidateCvAnalysisResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).max(10),
  weaknesses: z.array(z.string()).max(10),
  suggestions: z.array(z.string()).max(12),
  extractedSkills: z.array(z.string()).max(50),
  recommendedMatches: z.array(candidateJobMatchSchema).max(20),
});

export const applicationFitScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["STRONG_FIT", "POTENTIAL_FIT", "WEAK_FIT"]),
  summary: z.string().min(1),
  matchedSkills: z.array(z.string()).max(30),
  missingSkills: z.array(z.string()).max(30),
  risks: z.array(z.string()).max(10),
  reasoning: z.string().min(1),
});

export type CandidateCvAnalysisInput = z.infer<typeof candidateCvAnalysisInputSchema>;
export type ApplicationFitScoreInput = z.infer<typeof applicationFitScoreInputSchema>;
export type CandidateCvAnalysisResult = z.infer<typeof candidateCvAnalysisResultSchema>;
export type ApplicationFitScoreResult = z.infer<typeof applicationFitScoreResultSchema>;
```

- [ ] **Step 4: Add prompt builders**

Create `packages/ai-cv/src/prompts.ts`:

```ts
import type { ApplicationFitScoreInput, CandidateCvAnalysisInput } from "./schemas";

export function buildCandidateCvAnalysisPrompt(input: CandidateCvAnalysisInput) {
  return [
    "You are an experienced Vietnamese tech recruiter.",
    "Analyze the candidate CV and return only valid JSON matching the requested schema.",
    "Score the CV quality for job search readiness from 0 to 100.",
    "Suggest concrete CV improvements and rank the provided jobs by fit.",
    "",
    "Candidate profile:",
    JSON.stringify(input.profile, null, 2),
    "",
    "Resume text:",
    input.resumeText,
    "",
    "Open jobs to rank:",
    JSON.stringify(input.jobs, null, 2),
  ].join("\n");
}

export function buildApplicationFitScorePrompt(input: ApplicationFitScoreInput) {
  return [
    "You are an experienced hiring reviewer.",
    "Score how well this candidate fits the applied job. Return only valid JSON matching the requested schema.",
    "Use the job requirements as the primary standard. Do not infer protected personal attributes.",
    "",
    "Job:",
    JSON.stringify(input.job, null, 2),
    "",
    "Candidate profile:",
    JSON.stringify(input.profile, null, 2),
    "",
    "Cover letter:",
    input.coverLetter ?? "",
    "",
    "Resume text:",
    input.resumeText,
  ].join("\n");
}
```

- [ ] **Step 5: Add provider interface and factory**

Create `packages/ai-cv/src/provider.ts`:

```ts
import { env } from "@07nghiep/env/server";
import type {
  ApplicationFitScoreInput,
  ApplicationFitScoreResult,
  CandidateCvAnalysisInput,
  CandidateCvAnalysisResult,
} from "./schemas";
import { AnthropicCvProvider } from "./providers/anthropic";

export interface AiCvProvider {
  analyzeCandidateCv(input: CandidateCvAnalysisInput): Promise<CandidateCvAnalysisResult>;
  scoreApplicationFit(input: ApplicationFitScoreInput): Promise<ApplicationFitScoreResult>;
}

export function createAiCvProvider(): AiCvProvider {
  if (env.AI_PROVIDER === "anthropic") {
    return new AnthropicCvProvider();
  }

  throw new Error(`Unsupported AI provider: ${env.AI_PROVIDER}`);
}
```

- [ ] **Step 6: Add Anthropic provider**

Create `packages/ai-cv/src/providers/anthropic.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@07nghiep/env/server";
import {
  applicationFitScoreResultSchema,
  candidateCvAnalysisResultSchema,
  type ApplicationFitScoreInput,
  type ApplicationFitScoreResult,
  type CandidateCvAnalysisInput,
  type CandidateCvAnalysisResult,
} from "../schemas";
import type { AiCvProvider } from "../provider";
import { buildApplicationFitScorePrompt, buildCandidateCvAnalysisPrompt } from "../prompts";

function extractJsonText(content: Anthropic.Messages.Message["content"]) {
  const text = content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Anthropic response did not contain a JSON object");
  }

  return text.slice(firstBrace, lastBrace + 1);
}

export class AnthropicCvProvider implements AiCvProvider {
  private readonly client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for AnthropicCvProvider");
    }

    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async analyzeCandidateCv(input: CandidateCvAnalysisInput): Promise<CandidateCvAnalysisResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [{ role: "user", content: buildCandidateCvAnalysisPrompt(input) }],
    });

    return candidateCvAnalysisResultSchema.parse(JSON.parse(extractJsonText(response.content)));
  }

  async scoreApplicationFit(input: ApplicationFitScoreInput): Promise<ApplicationFitScoreResult> {
    const response = await this.client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 3072,
      temperature: 0.1,
      messages: [{ role: "user", content: buildApplicationFitScorePrompt(input) }],
    });

    return applicationFitScoreResultSchema.parse(JSON.parse(extractJsonText(response.content)));
  }
}
```

- [ ] **Step 7: Add exports**

Create `packages/ai-cv/src/index.ts`:

```ts
export * from "./schemas";
export * from "./prompts";
export * from "./provider";
```

- [ ] **Step 8: Add schema tests**

Create `packages/ai-cv/src/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applicationFitScoreResultSchema,
  candidateCvAnalysisResultSchema,
} from "./schemas";

describe("ai cv schemas", () => {
  it("accepts valid candidate analysis results", () => {
    expect(
      candidateCvAnalysisResultSchema.parse({
        overallScore: 82,
        summary: "Strong backend profile with room to clarify achievements.",
        strengths: ["TypeScript", "PostgreSQL"],
        weaknesses: ["Missing quantified impact"],
        suggestions: ["Add metrics to recent projects"],
        extractedSkills: ["TypeScript", "Prisma"],
        recommendedMatches: [
          {
            jobId: "job_1",
            matchScore: 88,
            reasons: ["Matches TypeScript requirement"],
            missingSkills: ["Redis"],
          },
        ],
      }),
    ).toMatchObject({ overallScore: 82 });
  });

  it("rejects scores outside 0-100", () => {
    expect(() =>
      applicationFitScoreResultSchema.parse({
        score: 101,
        recommendation: "STRONG_FIT",
        summary: "Invalid score",
        matchedSkills: [],
        missingSkills: [],
        risks: [],
        reasoning: "Invalid score should fail",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 9: Run provider package tests**

Run:

```bash
pnpm --filter @07nghiep/ai-cv test
pnpm --filter @07nghiep/ai-cv check-types
```

Expected: schema tests and typecheck pass without making network calls.

- [ ] **Step 10: Commit AI provider package**

```bash
git add packages/ai-cv
git commit -m "feat(ai-cv): add provider abstraction"
```

## Task 4: Worker App And Resume Text Extraction

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/src/lib/resume-text.ts`
- Create: `apps/worker/src/lib/quota.ts`
- Create: `apps/worker/src/jobs/analyze-candidate-cv.ts`
- Create: `apps/worker/src/jobs/score-application-fit.ts`
- Create: `apps/worker/src/jobs/repair-pending-ai-jobs.ts`
- Create: `apps/worker/src/jobs/analyze-candidate-cv.test.ts`
- Create: `apps/worker/src/jobs/score-application-fit.test.ts`
- Create: `apps/worker/src/jobs/repair-pending-ai-jobs.test.ts`

- [ ] **Step 1: Create worker package manifest**

Create `apps/worker/package.json`:

```json
{
  "name": "@07nghiep/worker",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "check-types": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "@07nghiep/ai-cv": "workspace:*",
    "@07nghiep/db": "workspace:*",
    "@07nghiep/env": "workspace:*",
    "@07nghiep/queue": "workspace:*",
    "@07nghiep/storage": "workspace:*",
    "bullmq": "^5.0.0",
    "dotenv": "catalog:",
    "pdf-parse": "^1.1.1",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@07nghiep/config": "workspace:*",
    "@types/node": "catalog:",
    "@types/pdf-parse": "^1.1.5",
    "tsx": "^4.19.2",
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Create worker tsconfig**

Create `apps/worker/tsconfig.json`:

```json
{
  "extends": "@07nghiep/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Implement resume text extraction**

Create `apps/worker/src/lib/resume-text.ts`:

```ts
import { createHash } from "node:crypto";
import pdfParse from "pdf-parse";

export type ResumeTextResult = {
  text: string;
  hash: string;
};

export async function extractPdfTextFromUrl(resumeUrl: string): Promise<ResumeTextResult> {
  const response = await fetch(resumeUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch resume PDF: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("application/pdf") && !resumeUrl.endsWith(".pdf")) {
    throw new Error(`Resume URL did not return a PDF: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const parsed = await pdfParse(buffer);
  const text = parsed.text.replace(/\s+/g, " ").trim();
  if (text.length < 50) {
    throw new Error("Resume PDF did not contain enough readable text");
  }

  return {
    text,
    hash: createHash("sha256").update(text).digest("hex"),
  };
}
```

- [ ] **Step 4: Implement quota refund helper**

Create `apps/worker/src/lib/quota.ts`:

```ts
import type { PrismaClient } from "@07nghiep/db";

export async function refundCandidateCvQuota(prisma: PrismaClient, analysisId: string) {
  const analysis = await prisma.candidateCvAnalysis.findUnique({
    where: { id: analysisId },
    select: {
      id: true,
      userId: true,
      quotaReservedAt: true,
      quotaRefundedAt: true,
    },
  });

  if (!analysis?.quotaReservedAt || analysis.quotaRefundedAt) {
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: analysis.userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: new Date() },
      currentPeriodEnd: { gt: new Date() },
      plan: { code: "CANDIDATE_PLUS_MONTHLY" },
      aiCvQuotaUsed: { gt: 0 },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: { id: true, aiCvQuotaUsed: true },
  });

  await prisma.$transaction([
    ...(subscription
      ? [
          prisma.subscription.update({
            where: { id: subscription.id },
            data: { aiCvQuotaUsed: Math.max(subscription.aiCvQuotaUsed - 1, 0) },
          }),
        ]
      : []),
    prisma.candidateCvAnalysis.update({
      where: { id: analysis.id },
      data: { quotaRefundedAt: new Date() },
    }),
  ]);
}
```

- [ ] **Step 5: Implement candidate analysis handler**

Create `apps/worker/src/jobs/analyze-candidate-cv.ts`:

```ts
import type { PrismaClient } from "@07nghiep/db";
import type { AiCvProvider } from "@07nghiep/ai-cv";
import { extractPdfTextFromUrl } from "../lib/resume-text";
import { refundCandidateCvQuota } from "../lib/quota";

export async function handleAnalyzeCandidateCv(
  prisma: PrismaClient,
  provider: AiCvProvider,
  analysisId: string,
) {
  const analysis = await prisma.candidateCvAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      user: {
        include: { profile: true },
      },
    },
  });

  if (!analysis || analysis.status === "COMPLETED") return;

  await prisma.candidateCvAnalysis.update({
    where: { id: analysis.id },
    data: { status: "PROCESSING", startedAt: new Date(), errorMessage: null },
  });

  try {
    const resume = await extractPdfTextFromUrl(analysis.resumeUrl);
    const jobs = await prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: { publishedAt: "desc" },
      take: 30,
      include: { organization: true, skills: true },
    });

    const result = await provider.analyzeCandidateCv({
      resumeText: resume.text,
      profile: {
        headline: analysis.user.profile?.headline ?? null,
        summary: analysis.user.profile?.summary ?? null,
        skills: analysis.user.profile?.skills ?? [],
        experience: analysis.user.profile?.experience ?? null,
        education: analysis.user.profile?.education ?? null,
      },
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        organizationName: job.organization.name,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills.map((skill) => skill.skill),
        location: job.location,
        workType: job.workType,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
      })),
    });

    await prisma.candidateCvAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "COMPLETED",
        resumeTextHash: resume.hash,
        overallScore: result.overallScore,
        summary: result.summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        suggestions: result.suggestions,
        extractedSkills: result.extractedSkills,
        recommendedMatches: result.recommendedMatches,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await refundCandidateCvQuota(prisma, analysis.id);
    await prisma.candidateCvAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown AI CV analysis error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
```

- [ ] **Step 6: Implement application fit handler**

Create `apps/worker/src/jobs/score-application-fit.ts`:

```ts
import type { PrismaClient } from "@07nghiep/db";
import type { AiCvProvider } from "@07nghiep/ai-cv";
import { extractPdfTextFromUrl } from "../lib/resume-text";

export async function handleScoreApplicationFit(
  prisma: PrismaClient,
  provider: AiCvProvider,
  applicationAiScoreId: string,
) {
  const scoreRecord = await prisma.applicationAiScore.findUnique({
    where: { id: applicationAiScoreId },
    include: {
      application: {
        include: {
          candidate: { include: { profile: true } },
          job: { include: { organization: true, skills: true } },
        },
      },
    },
  });

  if (!scoreRecord || scoreRecord.status === "COMPLETED") return;

  const resumeUrl = scoreRecord.application.resumeUrl ?? scoreRecord.application.candidate.profile?.resumeUrl;
  if (!resumeUrl) {
    await prisma.applicationAiScore.update({
      where: { id: scoreRecord.id },
      data: {
        status: "FAILED",
        errorMessage: "Application has no resume URL",
        completedAt: new Date(),
      },
    });
    return;
  }

  await prisma.applicationAiScore.update({
    where: { id: scoreRecord.id },
    data: { status: "PROCESSING", startedAt: new Date(), errorMessage: null },
  });

  try {
    const resume = await extractPdfTextFromUrl(resumeUrl);
    const { application } = scoreRecord;
    const { job } = application;
    const result = await provider.scoreApplicationFit({
      resumeText: resume.text,
      coverLetter: application.coverLetter,
      profile: {
        headline: application.candidate.profile?.headline ?? null,
        summary: application.candidate.profile?.summary ?? null,
        skills: application.candidate.profile?.skills ?? [],
        experience: application.candidate.profile?.experience ?? null,
        education: application.candidate.profile?.education ?? null,
      },
      job: {
        id: job.id,
        title: job.title,
        organizationName: job.organization.name,
        description: job.description,
        requirements: job.requirements,
        skills: job.skills.map((skill) => skill.skill),
        location: job.location,
        workType: job.workType,
        jobType: job.jobType,
        experienceLevel: job.experienceLevel,
      },
    });

    await prisma.applicationAiScore.update({
      where: { id: scoreRecord.id },
      data: {
        status: "COMPLETED",
        score: result.score,
        recommendation: result.recommendation,
        summary: result.summary,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        risks: result.risks,
        reasoning: result.reasoning,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.applicationAiScore.update({
      where: { id: scoreRecord.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown application fit scoring error",
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
```

- [ ] **Step 7: Implement repair handler**

Create `apps/worker/src/jobs/repair-pending-ai-jobs.ts`:

```ts
import type { PrismaClient } from "@07nghiep/db";
import {
  enqueueApplicationFitScore,
  enqueueCandidateCvAnalysis,
} from "@07nghiep/queue";

const STALE_PENDING_MINUTES = 5;

export async function repairPendingAiJobs(prisma: PrismaClient, now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_PENDING_MINUTES * 60_000);

  const [candidateAnalyses, applicationScores] = await Promise.all([
    prisma.candidateCvAnalysis.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleBefore },
      },
      select: { id: true },
      take: 50,
    }),
    prisma.applicationAiScore.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: staleBefore },
      },
      select: { id: true },
      take: 50,
    }),
  ]);

  for (const analysis of candidateAnalyses) {
    const job = await enqueueCandidateCvAnalysis({ analysisId: analysis.id });
    await prisma.candidateCvAnalysis.update({
      where: { id: analysis.id },
      data: { queueJobId: String(job.id) },
    });
  }

  for (const score of applicationScores) {
    const job = await enqueueApplicationFitScore({ applicationAiScoreId: score.id });
    await prisma.applicationAiScore.update({
      where: { id: score.id },
      data: { queueJobId: String(job.id) },
    });
  }

  return {
    candidateAnalyses: candidateAnalyses.length,
    applicationScores: applicationScores.length,
  };
}
```

- [ ] **Step 8: Implement worker entry**

Create `apps/worker/src/index.ts`:

```ts
import "dotenv/config";
import { Worker } from "bullmq";
import prisma from "@07nghiep/db";
import { createAiCvProvider } from "@07nghiep/ai-cv";
import {
  AI_APPLICATION_FIT_QUEUE,
  AI_CV_QUEUE,
  AI_REPAIR_QUEUE,
  getQueueConnection,
  analyzeCandidateCvPayloadSchema,
  repairPendingAiJobsPayloadSchema,
  scoreApplicationFitPayloadSchema,
} from "@07nghiep/queue";
import { env } from "@07nghiep/env/server";
import { handleAnalyzeCandidateCv } from "./jobs/analyze-candidate-cv";
import { handleScoreApplicationFit } from "./jobs/score-application-fit";
import { repairPendingAiJobs } from "./jobs/repair-pending-ai-jobs";

const provider = createAiCvProvider();
const connection = getQueueConnection();

new Worker(
  AI_CV_QUEUE,
  async (job) => {
    const payload = analyzeCandidateCvPayloadSchema.parse(job.data);
    await handleAnalyzeCandidateCv(prisma, provider, payload.analysisId);
  },
  { connection, concurrency: env.AI_WORKER_CONCURRENCY },
);

new Worker(
  AI_APPLICATION_FIT_QUEUE,
  async (job) => {
    const payload = scoreApplicationFitPayloadSchema.parse(job.data);
    await handleScoreApplicationFit(prisma, provider, payload.applicationAiScoreId);
  },
  { connection, concurrency: env.AI_WORKER_CONCURRENCY },
);

new Worker(
  AI_REPAIR_QUEUE,
  async (job) => {
    repairPendingAiJobsPayloadSchema.parse(job.data);
    await repairPendingAiJobs(prisma);
  },
  { connection, concurrency: 1 },
);

console.log("07nghiep AI worker started");
```

- [ ] **Step 9: Add worker handler tests**

Create minimal tests using mocked Prisma/provider. Example for `apps/worker/src/jobs/score-application-fit.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { handleScoreApplicationFit } from "./score-application-fit";

describe("handleScoreApplicationFit", () => {
  it("marks missing resume scores as failed", async () => {
    const update = vi.fn();
    const prisma = {
      applicationAiScore: {
        findUnique: vi.fn().mockResolvedValue({
          id: "score_1",
          status: "PENDING",
          application: {
            resumeUrl: null,
            coverLetter: null,
            candidate: { profile: null },
            job: {
              id: "job_1",
              title: "Backend Developer",
              description: "Build APIs",
              requirements: null,
              location: "Remote",
              workType: "REMOTE",
              jobType: "FULLTIME",
              experienceLevel: "JUNIOR",
              organization: { name: "Acme" },
              skills: [],
            },
          },
        }),
        update,
      },
    };

    await handleScoreApplicationFit(prisma as never, { scoreApplicationFit: vi.fn() } as never, "score_1");

    expect(update).toHaveBeenCalledWith({
      where: { id: "score_1" },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Application has no resume URL",
      }),
    });
  });
});
```

- [ ] **Step 10: Run worker tests and typecheck**

Run:

```bash
pnpm --filter @07nghiep/worker test
pnpm --filter @07nghiep/worker check-types
```

Expected: worker tests and typecheck pass.

- [ ] **Step 11: Commit worker foundation**

```bash
git add apps/worker
git commit -m "feat(worker): add ai cv job processors"
```

## Task 5: Server AI CV Helpers

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/lib/ai-cv/quota.ts`
- Create: `apps/server/src/lib/ai-cv/enqueue.ts`
- Create: `apps/server/src/lib/ai-cv/quota.test.ts`

- [ ] **Step 1: Add server package dependencies**

Modify `apps/server/package.json` dependencies:

```json
"@07nghiep/ai-cv": "workspace:*",
"@07nghiep/queue": "workspace:*"
```

- [ ] **Step 2: Write quota helper test**

Create `apps/server/src/lib/ai-cv/quota.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { reserveCandidateCvQuota } from "./quota";

describe("reserveCandidateCvQuota", () => {
  it("increments the newest active Candidate Plus subscription with remaining quota", async () => {
    const update = vi.fn().mockResolvedValue({ id: "sub_1", aiCvQuotaUsed: 2 });
    const prisma = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue({
          id: "sub_1",
          aiCvQuotaLimit: 3,
          aiCvQuotaUsed: 1,
        }),
        update,
      },
    };

    await expect(reserveCandidateCvQuota(prisma as never, "user_1")).resolves.toEqual("sub_1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: { aiCvQuotaUsed: { increment: 1 } },
    });
  });
});
```

- [ ] **Step 3: Implement quota helpers**

Create `apps/server/src/lib/ai-cv/quota.ts`:

```ts
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@07nghiep/db";

export async function reserveCandidateCvQuota(prisma: PrismaClient, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: new Date() },
      currentPeriodEnd: { gt: new Date() },
      plan: { code: "CANDIDATE_PLUS_MONTHLY" },
    },
    orderBy: { currentPeriodEnd: "desc" },
    select: {
      id: true,
      aiCvQuotaLimit: true,
      aiCvQuotaUsed: true,
    },
  });

  if (!subscription) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Candidate Plus is required to analyze CVs.",
    });
  }

  const remaining = Math.max(subscription.aiCvQuotaLimit ?? 0, 0) - Math.max(subscription.aiCvQuotaUsed, 0);
  if (remaining <= 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "AI CV quota has been used for this billing period.",
    });
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { aiCvQuotaUsed: { increment: 1 } },
  });

  return subscription.id;
}

export async function hasActiveEmployerPackage(prisma: PrismaClient, userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: { lte: new Date() },
      currentPeriodEnd: { gt: new Date() },
      plan: { code: "EMPLOYER_MONTHLY" },
    },
    select: { id: true },
  });

  return Boolean(subscription);
}
```

- [ ] **Step 4: Implement safe enqueue helpers**

Create `apps/server/src/lib/ai-cv/enqueue.ts`:

```ts
import type { PrismaClient } from "@07nghiep/db";
import {
  enqueueApplicationFitScore,
  enqueueCandidateCvAnalysis,
} from "@07nghiep/queue";

export async function enqueueCandidateAnalysisSafely(prisma: PrismaClient, analysisId: string) {
  try {
    const job = await enqueueCandidateCvAnalysis({ analysisId });
    await prisma.candidateCvAnalysis.update({
      where: { id: analysisId },
      data: { queueJobId: String(job.id) },
    });
  } catch (error) {
    console.error("Failed to enqueue candidate CV analysis", { analysisId, error });
  }
}

export async function enqueueApplicationFitSafely(prisma: PrismaClient, applicationAiScoreId: string) {
  try {
    const job = await enqueueApplicationFitScore({ applicationAiScoreId });
    await prisma.applicationAiScore.update({
      where: { id: applicationAiScoreId },
      data: { queueJobId: String(job.id) },
    });
  } catch (error) {
    console.error("Failed to enqueue application fit score", { applicationAiScoreId, error });
  }
}
```

- [ ] **Step 5: Run server helper tests**

Run:

```bash
pnpm --filter @07nghiep/server test -- src/lib/ai-cv/quota.test.ts
pnpm --filter @07nghiep/server check-types
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit server AI helpers**

```bash
git add apps/server/package.json apps/server/src/lib/ai-cv
git commit -m "feat(server): add ai cv billing helpers"
```

## Task 6: Candidate CV Analysis Router

**Files:**
- Create: `apps/server/src/routers/cvAnalysis.ts`
- Create: `apps/server/src/routers/cvAnalysis.test.ts`
- Modify: `apps/server/src/routers/index.ts`

- [ ] **Step 1: Write router test for no resume**

Create `apps/server/src/routers/cvAnalysis.test.ts` with this first case:

```ts
import { describe, expect, it, vi } from "vitest";
import { cvAnalysisRouter } from "./cvAnalysis";

describe("cvAnalysisRouter", () => {
  it("rejects analysis creation when profile has no resume", async () => {
    const caller = cvAnalysisRouter.createCaller({
      session: { user: { id: "user_1" } },
      user: { id: "user_1" },
      role: "CANDIDATE",
      prisma: {
        profile: {
          findUnique: vi.fn().mockResolvedValue({ id: "profile_1", resumeUrl: null }),
        },
      },
    } as never);

    await expect(caller.createFromCurrentResume()).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
```

- [ ] **Step 2: Implement router**

Create `apps/server/src/routers/cvAnalysis.ts`:

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { candidateProcedure, router } from "../lib/api";
import { enqueueCandidateAnalysisSafely } from "../lib/ai-cv/enqueue";
import { reserveCandidateCvQuota } from "../lib/ai-cv/quota";

export const cvAnalysisRouter = router({
  createFromCurrentResume: candidateProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const profile = await ctx.prisma.profile.findUnique({
      where: { userId: ctx.user.id },
      select: { resumeUrl: true },
    });

    if (!profile?.resumeUrl) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Upload a resume before requesting CV analysis.",
      });
    }

    await reserveCandidateCvQuota(ctx.prisma, ctx.user.id);

    const analysis = await ctx.prisma.candidateCvAnalysis.create({
      data: {
        userId: ctx.user.id,
        resumeUrl: profile.resumeUrl,
        resumeTextHash: "",
        status: "PENDING",
        extractedSkills: [],
        quotaReservedAt: new Date(),
      },
    });

    await enqueueCandidateAnalysisSafely(ctx.prisma, analysis.id);

    return analysis;
  }),

  myLatest: candidateProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }

    return ctx.prisma.candidateCvAnalysis.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  getRecommendedJobs: candidateProcedure
    .input(z.object({ analysisId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
      }

      const analysis = input?.analysisId
        ? await ctx.prisma.candidateCvAnalysis.findFirst({
            where: { id: input.analysisId, userId: ctx.user.id },
          })
        : await ctx.prisma.candidateCvAnalysis.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { createdAt: "desc" },
          });

      if (!analysis || analysis.status !== "COMPLETED" || !analysis.recommendedMatches) {
        return { status: analysis?.status ?? "PENDING", jobs: [] };
      }

      const matches = Array.isArray(analysis.recommendedMatches)
        ? (analysis.recommendedMatches as Array<{ jobId: string; matchScore: number; reasons: string[]; missingSkills: string[] }>)
        : [];

      const jobs = await ctx.prisma.job.findMany({
        where: { id: { in: matches.map((match) => match.jobId) }, status: "OPEN" },
        include: { organization: true, skills: true },
      });

      return {
        status: analysis.status,
        jobs: matches
          .map((match) => ({
            match,
            job: jobs.find((job) => job.id === match.jobId) ?? null,
          }))
          .filter((item) => item.job),
      };
    }),
});
```

- [ ] **Step 3: Register router**

Modify `apps/server/src/routers/index.ts`:

```ts
import { cvAnalysisRouter } from "./cvAnalysis";

export const appRouter = router({
  // keep existing routers
  cvAnalysis: cvAnalysisRouter,
});
```

- [ ] **Step 4: Expand router tests**

Add tests to `apps/server/src/routers/cvAnalysis.test.ts`:

```ts
it("returns the latest analysis for the current user", async () => {
  const latest = { id: "analysis_1", userId: "user_1", status: "COMPLETED" };
  const caller = cvAnalysisRouter.createCaller({
    session: { user: { id: "user_1" } },
    user: { id: "user_1" },
    role: "CANDIDATE",
    prisma: {
      candidateCvAnalysis: {
        findFirst: vi.fn().mockResolvedValue(latest),
      },
    },
  } as never);

  await expect(caller.myLatest()).resolves.toEqual(latest);
});
```

- [ ] **Step 5: Run router tests**

Run:

```bash
pnpm --filter @07nghiep/server test -- src/routers/cvAnalysis.test.ts
pnpm --filter @07nghiep/server check-types
```

Expected: tests and typecheck pass.

- [ ] **Step 6: Commit candidate router**

```bash
git add apps/server/src/routers/cvAnalysis.ts apps/server/src/routers/cvAnalysis.test.ts apps/server/src/routers/index.ts
git commit -m "feat(server): add candidate cv analysis api"
```

## Task 7: Application Auto-Scoring And Employer Retry API

**Files:**
- Modify: `apps/server/src/routers/applications.ts`
- Modify: `apps/server/src/routers/application.ts`
- Create or modify: `apps/server/src/routers/application.test.ts`

- [ ] **Step 1: Add apply-job scoring test**

In `apps/server/src/routers/application.test.ts`, add a test that proves apply still succeeds when enqueue fails:

```ts
import { describe, expect, it, vi } from "vitest";
import { applicationsRouter } from "./applications";

vi.mock("../lib/ai-cv/enqueue", () => ({
  enqueueApplicationFitSafely: vi.fn().mockResolvedValue(undefined),
}));

describe("applicationsRouter AI scoring", () => {
  it("creates application and pending AI score for paid employer", async () => {
    const createApplication = vi.fn().mockResolvedValue({
      id: "app_1",
      jobId: "job_1",
      candidateId: "candidate_1",
      job: { title: "Backend Developer", organization: { userId: "employer_1", name: "Acme" } },
      candidate: { name: "Candidate" },
    });
    const createScore = vi.fn().mockResolvedValue({ id: "score_1" });

    const caller = applicationsRouter.createCaller({
      session: { user: { id: "candidate_1" } },
      user: { id: "candidate_1" },
      role: "CANDIDATE",
      prisma: {
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
        subscription: {
          findFirst: vi.fn().mockResolvedValue({ id: "sub_1" }),
        },
        applicationAiScore: {
          create: createScore,
        },
        applicationHistory: {
          create: vi.fn().mockResolvedValue({}),
        },
      },
    } as never);

    await expect(
      caller.applyJob({ jobId: "job_1", coverLetter: "I am interested." }),
    ).resolves.toMatchObject({ id: "app_1" });

    expect(createScore).toHaveBeenCalledWith({
      data: {
        applicationId: "app_1",
        status: "PENDING",
        matchedSkills: [],
        missingSkills: [],
      },
    });
  });
});
```

- [ ] **Step 2: Modify candidate apply flow**

In `apps/server/src/routers/applications.ts`, import helpers:

```ts
import { enqueueApplicationFitSafely } from "../lib/ai-cv/enqueue";
import { hasActiveEmployerPackage } from "../lib/ai-cv/quota";
```

After `ApplicationHistory` creation and before returning `created`, add:

```ts
const employerHasAiScoring = await hasActiveEmployerPackage(
  ctx.prisma,
  created.job.organization.userId,
);

if (employerHasAiScoring) {
  const score = await ctx.prisma.applicationAiScore.create({
    data: {
      applicationId: created.id,
      status: "PENDING",
      matchedSkills: [],
      missingSkills: [],
    },
  });
  await enqueueApplicationFitSafely(ctx.prisma, score.id);
}
```

- [ ] **Step 3: Include AI score in employer application reads**

Modify `apps/server/src/routers/application.ts` in `list` include:

```ts
aiScore: {
  select: {
    id: true,
    status: true,
    score: true,
    recommendation: true,
  },
},
```

Modify `get` include:

```ts
aiScore: true,
```

- [ ] **Step 4: Add retry API**

In `apps/server/src/routers/application.ts`, import `enqueueApplicationFitSafely` and add:

```ts
retryAiScore: paidEmployerProcedure
  .input(z.object({ applicationId: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const application = await ctx.prisma.application.findUnique({
      where: { id: input.applicationId },
      include: { job: { include: { organization: true } }, aiScore: true },
    });

    if (!application) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    }

    if (application.job.organization.userId !== ctx.session.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this application.",
      });
    }

    const score =
      application.aiScore?.status === "FAILED"
        ? await ctx.prisma.applicationAiScore.update({
            where: { id: application.aiScore.id },
            data: {
              status: "PENDING",
              errorMessage: null,
              startedAt: null,
              completedAt: null,
              matchedSkills: [],
              missingSkills: [],
            },
          })
        : await ctx.prisma.applicationAiScore.create({
            data: {
              applicationId: application.id,
              status: "PENDING",
              matchedSkills: [],
              missingSkills: [],
            },
          });

    await enqueueApplicationFitSafely(ctx.prisma, score.id);
    return score;
  }),
```

- [ ] **Step 5: Run application tests**

Run:

```bash
pnpm --filter @07nghiep/server test -- src/routers/application.test.ts
pnpm --filter @07nghiep/server check-types
```

Expected: application tests and typecheck pass.

- [ ] **Step 6: Commit application auto-scoring**

```bash
git add apps/server/src/routers/applications.ts apps/server/src/routers/application.ts apps/server/src/routers/application.test.ts
git commit -m "feat(server): enqueue application ai scores"
```

## Task 8: Candidate CV Analysis UI

**Files:**
- Create: `apps/candidate/src/routes/cv-analysis.tsx`
- Modify: `apps/candidate/src/components/header.tsx`

- [ ] **Step 1: Create candidate route**

Create `apps/candidate/src/routes/cv-analysis.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Progress } from "@07nghiep/ui/components/progress";
import { Brain, FileText, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/cv-analysis")({
  component: CvAnalysisPage,
});

function CvAnalysisPage() {
  const billingQuery = useQuery(trpc.billing.me.queryOptions());
  const profileQuery = useQuery(trpc.profile.getMyProfile.queryOptions());
  const analysisQuery = useQuery(trpc.cvAnalysis.myLatest.queryOptions(undefined, {
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 5000 : false;
    },
  }));
  const jobsQuery = useQuery(trpc.cvAnalysis.getRecommendedJobs.queryOptions(undefined, {
    enabled: analysisQuery.data?.status === "COMPLETED",
  }));

  const createAnalysis = useMutation({
    mutationFn: () => trpcClient.cvAnalysis.createFromCurrentResume.mutate(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Đã gửi CV vào hàng chờ phân tích");
    },
    onError: (error) => toast.error(error.message || "Không thể phân tích CV"),
  });

  const entitlements = billingQuery.data?.entitlements;
  const profile = profileQuery.data;
  const analysis = analysisQuery.data;
  const canAnalyze = Boolean(entitlements?.candidatePlus && entitlements.aiCvRemaining > 0 && profile?.resumeUrl);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-foreground">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">AI CV</h1>
          <p className="text-sm text-muted-foreground">
            Phân tích CV, gợi ý chỉnh sửa và tìm việc phù hợp với Candidate Plus.
          </p>
        </div>

        {!entitlements?.candidatePlus && (
          <Card>
            <CardHeader>
              <CardTitle>Candidate Plus required</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Nâng cấp Candidate Plus để dùng phân tích CV AI.</p>
              <Button asChild className="w-fit">
                <Link to="/billing">Xem gói Plus</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {entitlements?.candidatePlus && !profile?.resumeUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CV first</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Bạn cần upload CV PDF trước khi phân tích.</p>
              <Button asChild className="w-fit" variant="outline">
                <Link to="/profile/edit">Cập nhật hồ sơ</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5" />
              Phân tích hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">Quota còn lại: {entitlements?.aiCvRemaining ?? 0}</Badge>
              {analysis?.status && <Badge>{analysis.status}</Badge>}
            </div>

            <Button disabled={!canAnalyze || createAnalysis.isPending} onClick={() => createAnalysis.mutate()}>
              {createAnalysis.isPending ? <RefreshCw data-icon="inline-start" className="animate-spin" /> : <Sparkles data-icon="inline-start" />}
              Phân tích CV
            </Button>

            {(analysis?.status === "PENDING" || analysis?.status === "PROCESSING") && (
              <p className="text-sm text-muted-foreground">AI đang xử lý CV. Trang sẽ tự cập nhật.</p>
            )}

            {analysis?.status === "COMPLETED" && (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">Điểm CV tổng quan</p>
                  <Progress value={analysis.overallScore ?? 0} />
                  <p className="mt-2 text-2xl font-semibold">{analysis.overallScore ?? 0}/100</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{analysis.summary}</p>
              </div>
            )}

            {analysis?.status === "FAILED" && (
              <p className="text-sm text-destructive">Phân tích thất bại. Quota sẽ được hoàn nếu lỗi do hệ thống.</p>
            )}
          </CardContent>
        </Card>

        {analysis?.status === "COMPLETED" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Gợi ý chỉnh sửa</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(Array.isArray(analysis.suggestions) ? analysis.suggestions : []).map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Việc làm phù hợp</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(jobsQuery.data?.jobs ?? []).map((item) => (
                  <div key={item.job?.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.job?.title}</p>
                      <Badge>{item.match.matchScore}%</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.job?.organization.name}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add navigation item**

Modify `apps/candidate/src/components/header.tsx` and add a logged-in navigation entry:

```ts
{ to: "/cv-analysis", label: "AI CV" },
```

Place it near `"/jobs"` or `"/profile"` so Candidate Plus tools are discoverable.

- [ ] **Step 3: Regenerate route tree**

Run:

```bash
pnpm dev:candidate
```

Expected: TanStack Router generates `apps/candidate/src/routeTree.gen.ts` with `/cv-analysis`. Stop the dev process after generation.

- [ ] **Step 4: Typecheck candidate app**

Run:

```bash
pnpm --filter candidate check-types
```

Expected: candidate app typecheck passes.

- [ ] **Step 5: Commit candidate UI**

```bash
git add apps/candidate/src/routes/cv-analysis.tsx apps/candidate/src/components/header.tsx apps/candidate/src/routeTree.gen.ts
git commit -m "feat(candidate): add ai cv analysis page"
```

## Task 9: Employer AI Fit Score UI

**Files:**
- Modify: `apps/employer/src/routes/applications/index.tsx`
- Modify: `apps/employer/src/routes/applications/$applicationId.tsx`

- [ ] **Step 1: Extend local application types**

In `apps/employer/src/routes/applications/$applicationId.tsx`, extend `ApplicationDetail`:

```ts
type ApplicationAiScore = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  score: number | null;
  recommendation: "STRONG_FIT" | "POTENTIAL_FIT" | "WEAK_FIT" | null;
  summary: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  risks: unknown;
  reasoning: string | null;
  errorMessage: string | null;
};

type ApplicationDetail = {
  // keep existing fields
  aiScore: ApplicationAiScore | null;
};
```

- [ ] **Step 2: Add retry mutation**

In `ApplicationDetailPage`, add:

```ts
const retryAiScore = useMutation({
  mutationFn: () => trpcClient.application.retryAiScore.mutate({ applicationId }),
  onSuccess: () => {
    queryClient.invalidateQueries();
    toast.success("Đã gửi lại yêu cầu chấm điểm AI");
  },
  onError: (err) => toast.error(err.message || "Không thể retry AI score"),
});
```

- [ ] **Step 3: Add AI score card**

Add this card near the top of application detail, after the header section:

```tsx
<Card>
  <CardHeader>
    <CardTitle>AI Fit Score</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {!application.aiScore && (
      <p className="text-sm text-muted-foreground">Chưa có điểm AI cho hồ sơ này.</p>
    )}

    {application.aiScore?.status === "PENDING" && (
      <p className="text-sm text-muted-foreground">AI đang chờ chấm điểm hồ sơ.</p>
    )}

    {application.aiScore?.status === "PROCESSING" && (
      <p className="text-sm text-muted-foreground">AI đang phân tích CV với vị trí ứng tuyển.</p>
    )}

    {application.aiScore?.status === "COMPLETED" && (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold">{application.aiScore.score ?? 0}/100</span>
          {application.aiScore.recommendation && <Badge>{application.aiScore.recommendation}</Badge>}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{application.aiScore.summary}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Matched skills</p>
            <div className="flex flex-wrap gap-2">
              {application.aiScore.matchedSkills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Missing skills</p>
            <div className="flex flex-wrap gap-2">
              {application.aiScore.missingSkills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>)}
            </div>
          </div>
        </div>
      </div>
    )}

    {application.aiScore?.status === "FAILED" && (
      <div className="space-y-3">
        <p className="text-sm text-destructive">
          {application.aiScore.errorMessage || "AI chấm điểm thất bại."}
        </p>
        <Button variant="outline" onClick={() => retryAiScore.mutate()} disabled={retryAiScore.isPending}>
          Retry AI score
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

- [ ] **Step 4: Add list badge**

In `apps/employer/src/routes/applications/index.tsx`, extend the item type to include:

```ts
aiScore?: {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  score: number | null;
  recommendation: string | null;
} | null;
```

Render near candidate/job summary:

```tsx
{application.aiScore ? (
  <Badge variant={application.aiScore.status === "COMPLETED" ? "default" : "secondary"}>
    {application.aiScore.status === "COMPLETED"
      ? `AI ${application.aiScore.score ?? 0}/100`
      : `AI ${application.aiScore.status}`}
  </Badge>
) : (
  <Badge variant="outline">AI not scored</Badge>
)}
```

- [ ] **Step 5: Typecheck employer app**

Run:

```bash
pnpm --filter employer check-types
```

Expected: employer app typecheck passes.

- [ ] **Step 6: Commit employer UI**

```bash
git add 'apps/employer/src/routes/applications/$applicationId.tsx' apps/employer/src/routes/applications/index.tsx
git commit -m "feat(employer): show application ai fit scores"
```

## Task 10: Final Integration And Smoke Test

**Files:**
- Modify: `apps/server/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update server env example**

Add to `apps/server/.env.example`:

```env
REDIS_URL="redis://localhost:6379"
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-3-5-sonnet-latest"
AI_WORKER_CONCURRENCY="2"
AI_JOB_MAX_ATTEMPTS="3"
AI_JOB_TIMEOUT_MS="120000"
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile updates include BullMQ, ioredis, Anthropic SDK, pdf-parse, and workspace links.

- [ ] **Step 3: Start Postgres and Redis**

Run:

```bash
pnpm db:start
docker ps --filter name=07nghiep-postgres --filter name=07nghiep-redis
```

Expected: both `07nghiep-postgres` and `07nghiep-redis` are running.

- [ ] **Step 4: Apply database migration**

Run:

```bash
pnpm db:migrate
```

Expected: migration `20260628090000_ai_cv_analysis` applies successfully.

- [ ] **Step 5: Run full validation**

Run:

```bash
pnpm check-types
pnpm test
pnpm build
```

Expected: all commands pass.

- [ ] **Step 6: Local smoke test without real Anthropic call**

Temporarily set `ANTHROPIC_API_KEY` only in local shell if using a real call. For no-provider smoke, verify server can create pending records and that Redis failures do not break apply by stopping Redis:

```bash
docker stop 07nghiep-redis
pnpm dev:server
```

Expected: server starts. Applying to a job should still create an application if the rest of the stack is running. Restart Redis after this check:

```bash
docker start 07nghiep-redis
```

- [ ] **Step 7: Commit integration docs and lockfile**

```bash
git add apps/server/.env.example README.md pnpm-lock.yaml
git commit -m "chore: document ai cv runtime config"
```

- [ ] **Step 8: Final status**

Run:

```bash
git status --short
git log --oneline -10
```

Expected: worktree is clean. Recent commits show the task commits from this plan.

## Self-Review Checklist

- Spec coverage: Tasks cover DB models, Redis/BullMQ, `packages/queue`, `packages/ai-cv`, `apps/worker`, Candidate Plus API/UI, employer auto scoring/API/UI, repair jobs, quota reserve/refund, env config, and final validation.
- Placeholder scan: The plan contains no `TBD`, `TODO`, or open-ended "implement later" steps.
- Type consistency: Queue payload names, Prisma model names, router names, and status enum values are consistent across tasks.
- Execution safety: Candidate apply is never rolled back because enqueue fails; candidate quota is reserved on analysis creation and refunded by worker final failure path.
