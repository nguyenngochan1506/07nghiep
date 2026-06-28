# AI CV Analysis And Application Fit Scoring Design

Date: 2026-06-28
Status: Approved design, pending implementation plan

## Context

07nghiep already has candidate profiles, resume upload, applications, jobs, employer subscriptions, Candidate Plus billing, and AI CV quota fields on subscriptions. The new feature should reuse those surfaces instead of rebuilding profile or upload flows.

The product direction is:

- Candidate Plus includes CV scoring, CV improvement suggestions, suitable job recommendations, and match scores per recommended job.
- Employer package includes automatic fit scoring for each candidate application against the applied job.
- Candidate-facing CV analysis and employer-facing fit scores are separate products with separate billing boundaries.
- Claude should be used through the native Anthropic API/provider layer, not through Claude Code SDK in runtime.
- AI jobs should run through a real queue using BullMQ and Redis.
- Worker processing should be separated into `apps/worker`.

## Goals

1. Let Candidate Plus users analyze their uploaded CV, receive a 0-100 score, get concrete improvement suggestions, and see recommended jobs with match scores.
2. Automatically score candidate applications for paid employers after a candidate applies.
3. Keep candidate application submission fast and reliable even if Redis, worker, or the AI provider is temporarily unavailable.
4. Store AI results in structured database records so the UI can render stable states and retry failed jobs.
5. Keep AI provider usage behind a replaceable interface so Anthropic can be swapped or supplemented later.

## Non-Goals

- No Claude Code SDK integration in production runtime.
- No free-form AI chat in the first version.
- No realtime WebSocket or SSE progress updates for AI jobs in the MVP.
- No vector database in the first version.
- No employer access to the candidate's Candidate Plus analysis.
- No candidate access to employer internal application fit scores.

## Architecture

Add three reusable boundaries:

```txt
apps/server
  - owns tRPC APIs, auth, billing checks, application creation
  - creates database records for AI work
  - enqueues BullMQ jobs

apps/worker
  - consumes BullMQ jobs
  - extracts resume text
  - calls the AI CV provider
  - updates Prisma records
  - runs repair jobs for stuck pending work

packages/ai-cv
  - provider interface
  - Anthropic provider implementation
  - prompt builders
  - structured output schemas
  - result normalization helpers

packages/queue
  - BullMQ queue names
  - job payload schemas
  - Redis connection factory
  - enqueue helpers
```

The server and worker both use `@07nghiep/db`. The worker depends on `packages/ai-cv`, `packages/queue`, and `@07nghiep/storage` for resume retrieval.

## AI Provider

Use a provider interface rather than calling Anthropic directly from routers or workers:

```ts
interface AiCvProvider {
  analyzeCandidateCv(input: CandidateCvAnalysisInput): Promise<CandidateCvAnalysisResult>;
  scoreApplicationFit(input: ApplicationFitScoreInput): Promise<ApplicationFitScoreResult>;
}
```

The first implementation is `AnthropicCvProvider`. It should call the native Anthropic API and request structured JSON output. If the provider returns malformed data, the worker validates with Zod and marks the job failed after retry exhaustion.

Tool use is allowed only through backend-owned functions, for example `getJobDetails`, `searchOpenJobsBySkills`, or `getCandidateProfile`. The model should never receive unrestricted database or filesystem access.

## Data Model

Add enums:

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

Add `CandidateCvAnalysis` for Candidate Plus:

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
```

Add `ApplicationAiScore` for employer package:

```prisma
model ApplicationAiScore {
  id              String                    @id @default(cuid())
  applicationId   String                    @unique
  status          AiJobStatus               @default(PENDING)
  queueJobId      String?
  score           Int?
  recommendation  ApplicationFitRecommendation?
  summary         String?                   @db.Text
  matchedSkills   String[]
  missingSkills   String[]
  risks           Json?
  reasoning       String?                   @db.Text
  errorMessage    String?                   @db.Text
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime                  @default(now())
  updatedAt       DateTime                  @updatedAt

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
}
```

For the MVP, `recommendedMatches` can stay JSON. If the product later needs filtering, sorting, analytics, or historical comparison across recommended jobs, split it into a `CandidateJobMatch` table.

## Queue And Worker

Use BullMQ with Redis. Add Redis to the local Docker setup and expose env vars through `packages/env`.

Queues:

- `ai-cv`: candidate CV analysis jobs.
- `ai-application-fit`: employer application fit scoring jobs.
- `ai-repair`: recurring repair jobs for stuck pending records.

Jobs:

- `analyze-candidate-cv`
  - Payload: `{ analysisId: string }`
  - Loads `CandidateCvAnalysis`, profile, and resume.
  - Extracts resume text, hashes it, calls `AiCvProvider.analyzeCandidateCv`.
  - Writes score, summary, strengths, weaknesses, suggestions, extracted skills, and recommended matches.
  - Marks `COMPLETED` on success.
  - Refunds reserved quota and marks `FAILED` after final failure.

- `score-application-fit`
  - Payload: `{ applicationAiScoreId: string }`
  - Loads application, candidate profile, resume, job, organization, and job skills.
  - Calls `AiCvProvider.scoreApplicationFit`.
  - Writes score, recommendation, matched skills, missing skills, risks, and reasoning.
  - Marks `COMPLETED` on success.
  - Marks `FAILED` after final failure.

- `repair-pending-ai-jobs`
  - Finds stale `PENDING` records whose `queueJobId` is null or missing from Redis.
  - Re-enqueues them idempotently.
  - Does not duplicate already active jobs.

## Candidate Plus Flow

1. Candidate opens profile or `/cv-analysis`.
2. UI calls `billing.me` and `cvAnalysis.myLatest`.
3. If the candidate has no Plus plan, show upgrade CTA.
4. If the candidate has Plus but no uploaded resume, show upload CTA.
5. Candidate clicks "Analyze CV".
6. Server verifies Candidate Plus and remaining AI CV quota.
7. Server creates `CandidateCvAnalysis(PENDING)` and reserves one quota.
8. Server enqueues `analyze-candidate-cv`.
9. If enqueue fails, the analysis remains `PENDING`; repair will enqueue it later.
10. UI polls/refetches until the status is `COMPLETED` or `FAILED`.

Quota policy:

- Reserve one quota when analysis work is created.
- Keep quota consumed when the job completes.
- Refund quota if the final job status is `FAILED` because of system, extraction, queue, or provider failure.
- Do not consume quota if resume validation fails before job creation.

## Employer Application Scoring Flow

1. Candidate applies to a job.
2. Server creates the `Application` immediately.
3. Server checks whether the job's employer has an active employer package.
4. If active, server creates `ApplicationAiScore(PENDING)`.
5. Server enqueues `score-application-fit`.
6. If Redis enqueue fails, the application still succeeds and the score remains `PENDING`.
7. Repair job re-enqueues stuck pending scores.
8. Employer application list and detail screens show score status and completed score.

Application submission must not be rolled back because of AI queue or provider failure.

## API Surface

Add `cvAnalysis` tRPC router:

- `createFromCurrentResume`
  - Candidate only.
  - Requires Candidate Plus and remaining quota.
  - Requires `profile.resumeUrl`.
  - Creates analysis, reserves quota, enqueues job.
  - Returns the analysis record.

- `myLatest`
  - Candidate only.
  - Returns the latest analysis for the current user.

- `getRecommendedJobs`
  - Candidate only.
  - Returns status plus recommended job matches from the latest completed analysis.

Update existing application APIs:

- `application.get`
  - Include `applicationAiScore` for employer-owned application detail.

- `application.list`
  - Include score summary fields for employer scan and sorting.

- `application.retryAiScore`
  - Paid employer only.
  - Requires application ownership.
  - Allowed only for `FAILED` scores.
  - Recreates or re-enqueues score work.

## UI

Candidate:

- Add an "AI CV" section to profile or a dedicated `/cv-analysis` route.
- Show Plus upgrade CTA when the candidate is not subscribed.
- Show resume upload CTA when no resume exists.
- Show "Analyze CV" action for eligible candidates.
- Render status states: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.
- Completed view shows overall score, summary, strengths, weaknesses, suggestions, extracted skills, and recommended jobs with match scores.

Employer:

- Application list shows AI score badge/status when available.
- Application detail adds an "AI Fit Score" card.
- Completed view shows score, recommendation, summary, matched skills, missing skills, and risks.
- Failed view shows retry action when employer package is active.

## Security And Privacy

- Candidate analysis belongs only to the candidate.
- Employer fit score belongs to the employer organization that owns the job.
- Candidate-facing APIs must never expose employer fit scoring.
- Employer APIs must never expose Candidate Plus analysis.
- AI provider inputs should include only the minimum required profile, resume, application, and job data.
- Job ownership must be checked before retrying or viewing fit scores.
- Provider logs should avoid raw CV text where possible.

## Environment

Add server/worker env vars:

- `REDIS_URL`
- `AI_PROVIDER=anthropic`
- `ANTHROPIC_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `AI_WORKER_CONCURRENCY`
- `AI_JOB_MAX_ATTEMPTS`
- `AI_JOB_TIMEOUT_MS`

`ANTHROPIC_API_KEY` and Redis config are required for worker runtime. `ANTHROPIC_URL` is optional and should be passed as the Anthropic SDK base URL when present. The server can still start without the worker, but enqueue operations should return controlled pending states if Redis is unavailable.

## Testing

Unit tests:

- AI result schema validation.
- Prompt builder input shaping.
- Quota reserve and refund behavior.
- Queue payload schema validation.
- Entitlement checks for Candidate Plus and employer package.

Router tests:

- Candidate without Plus cannot create CV analysis.
- Candidate Plus with no quota cannot create CV analysis.
- Candidate Plus with resume creates pending analysis and reserves quota.
- Apply succeeds even when enqueue fails.
- Employer cannot view or retry scores for applications outside their organization.
- Employer retry is allowed only for failed scores and active employer package.

Worker tests:

- Successful candidate analysis marks `COMPLETED`.
- Final candidate analysis failure marks `FAILED` and refunds quota.
- Successful application scoring marks `COMPLETED`.
- Final application scoring failure marks `FAILED`.
- Repair job re-enqueues stale pending records without duplicating active jobs.

## Rollout

1. Add Prisma models and migrations.
2. Add `packages/queue` and Redis env.
3. Add `packages/ai-cv` with mocked provider tests.
4. Add `apps/worker` and worker scripts.
5. Add candidate analysis router and UI.
6. Add employer score creation on apply and employer UI.
7. Add repair job and retry actions.
8. Run `pnpm check-types`, server tests, worker tests, and a local smoke test with Redis.

## Acceptance Criteria

- Candidate Plus user with an uploaded resume can request CV analysis and see completed structured results.
- Candidate Plus quota is reserved on job creation and refunded on final system failure.
- Candidate job recommendations include match scores.
- Applying to a job remains successful even when Redis enqueue fails.
- Paid employers automatically receive pending AI fit scores for new applications.
- Worker completes application fit score records asynchronously.
- Employer list/detail surfaces show score status and completed score.
- Failed AI jobs can be retried or repaired without creating duplicate active jobs.
