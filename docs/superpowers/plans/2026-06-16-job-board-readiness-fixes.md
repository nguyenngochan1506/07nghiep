# Job Board Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the current correctness and readiness gaps in the 07nghiep job board: role hierarchy guards, synced Prisma migrations, persistent saved jobs, working apply-time resume upload, real admin approval flows, safer server startup, and a repeatable verification pipeline.

**Architecture:** Keep the existing monorepo and tRPC router shape. Add small focused routers instead of enlarging existing files, keep database state canonical in Prisma, and wire frontend routes through TanStack Query mutations/invalidations instead of local-only state. Preserve current UI primitives from `packages/ui`.

**Tech Stack:** TypeScript, Hono, tRPC, Prisma 7, PostgreSQL, Better Auth, React, Vite, TanStack Router, TanStack Query, shadcn/ui, Vitest.

---

## File Structure

- Modify `apps/server/src/lib/api/index.ts`
  - Make role guards hierarchical: admin inherits employer and candidate privileges, employer inherits candidate privileges.
- Create `apps/server/src/lib/api/index.test.ts`
  - Unit-test role guard behavior without database access.
- Modify `apps/server/package.json`
  - Add `test` script and Vitest dependency.
- Create `apps/server/vitest.config.ts`
  - Node test config for server-side router tests.
- Modify `package.json`
  - Add root `test` script.
- Modify `turbo.json`
  - Add `test` task.
- Modify `packages/db/prisma/schema/schema.prisma`
  - Add approval-state fields if needed for organization and job approval.
- Create Prisma migration under `packages/db/prisma/migrations/<timestamp>_readiness_fixes/migration.sql`
  - Sync enum/table drift and approval fields.
- Create `apps/server/src/routers/savedJob.ts`
  - Candidate saved-job API.
- Modify `apps/server/src/routers/index.ts`
  - Register `savedJob` and new admin approval routers.
- Create `apps/server/src/routers/savedJob.test.ts`
  - Router tests with mocked Prisma methods.
- Modify `apps/candidate/src/routes/__root.tsx`
  - Remove local saved-job state.
- Modify `apps/candidate/src/routes/jobs.index.tsx`
  - Use saved-job API state and mutation.
- Modify `apps/candidate/src/routes/jobs.$jobId.tsx`
  - Use saved-job API state and mutation.
- Modify `apps/candidate/src/routes/saved-jobs.tsx`
  - Query persisted saved jobs.
- Modify `apps/candidate/src/components/jobs/ApplyJobModal.tsx`
  - Upload PDF resume via presigned URL before applying.
- Create `apps/server/src/routers/admin/organization.ts`
  - Admin organization verification workflow.
- Create `apps/server/src/routers/admin/job.ts`
  - Admin job approval workflow.
- Modify `apps/server/src/routers/organization.ts`
  - Make `requestVerification` create a pending state.
- Modify `apps/server/src/routers/job.ts`
  - Route publish requests through `PENDING_APPROVAL` when approval is required.
- Create frontend admin routes:
  - `apps/admin/src/routes/admin/organizations/index.tsx`
  - `apps/admin/src/routes/admin/jobs/index.tsx`
- Modify `apps/admin/src/components/sidebar.tsx`
  - Add organization and job approval navigation.
- Modify `apps/server/src/index.ts`
  - Use configurable port and gate demo seed behind an env flag.
- Modify `packages/env/src/server.ts`
  - Add `SERVER_PORT` and `SEED_DEMO_USERS`.
- Modify `apps/server/.env.example`
  - Document `SEED_DEMO_USERS`.
- Modify `docs/API_SPEC.md`
  - Update planned/current status for saved jobs, approvals, notifications, and messaging.

---

## Task 1: Add Test Harness

**Files:**
- Modify: `package.json`
- Modify: `turbo.json`
- Modify: `apps/server/package.json`
- Create: `apps/server/vitest.config.ts`

- [ ] **Step 1: Install server test dependency**

Run:

```bash
pnpm --filter @07nghiep/server add -D vitest
```

Expected: `apps/server/package.json` contains `vitest` in `devDependencies`, and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Add root test script**

In `package.json`, add:

```json
"test": "turbo test"
```

Expected scripts block includes:

```json
{
  "dev": "turbo dev",
  "build": "turbo build",
  "check-types": "turbo check-types",
  "test": "turbo test"
}
```

- [ ] **Step 3: Add Turbo test task**

In `turbo.json`, add a test pipeline entry:

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

If `turbo.json` already has a `tasks` object, merge only this `test` entry.

- [ ] **Step 4: Add server test script**

In `apps/server/package.json`, add:

```json
"test": "vitest run"
```

- [ ] **Step 5: Create Vitest config**

Create `apps/server/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: Run empty test suite**

Run:

```bash
pnpm --filter @07nghiep/server test
```

Expected: Vitest runs successfully or reports no test files. If it fails from config resolution, fix the config before continuing.

- [ ] **Step 7: Commit**

```bash
git add package.json turbo.json apps/server/package.json apps/server/vitest.config.ts pnpm-lock.yaml
git commit -m "test: add server vitest harness"
```

---

## Task 2: Implement Role Hierarchy Guards

**Files:**
- Modify: `apps/server/src/lib/api/index.ts`
- Create: `apps/server/src/lib/api/index.test.ts`

- [ ] **Step 1: Write failing role-hierarchy tests**

Create `apps/server/src/lib/api/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adminProcedure, candidateProcedure, employerProcedure, router } from "./index";

const testRouter = router({
  candidateOnly: candidateProcedure.query(() => "ok"),
  employerOnly: employerProcedure.query(() => "ok"),
  adminOnly: adminProcedure.query(() => "ok"),
});

function ctxWithRole(role: "CANDIDATE" | "EMPLOYER" | "ADMIN") {
  return {
    session: {
      user: {
        id: `${role.toLowerCase()}-user`,
        role,
      },
    },
    user: {
      id: `${role.toLowerCase()}-user`,
      role,
    },
    role,
    prisma: {},
  } as never;
}

describe("candidateProcedure", () => {
  it("allows candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).candidateOnly()).resolves.toBe("ok");
  });

  it("allows employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).candidateOnly()).resolves.toBe("ok");
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).candidateOnly()).resolves.toBe("ok");
  });
});

describe("employerProcedure", () => {
  it("rejects candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).employerOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).employerOnly()).resolves.toBe("ok");
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).employerOnly()).resolves.toBe("ok");
  });
});

describe("adminProcedure", () => {
  it("rejects candidates", async () => {
    await expect(testRouter.createCaller(ctxWithRole("CANDIDATE")).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects employers", async () => {
    await expect(testRouter.createCaller(ctxWithRole("EMPLOYER")).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows admins", async () => {
    await expect(testRouter.createCaller(ctxWithRole("ADMIN")).adminOnly()).resolves.toBe("ok");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm --filter @07nghiep/server test -- src/lib/api/index.test.ts
```

Expected: at least the `employerProcedure allows admins` test fails if the guard is not hierarchical.

- [ ] **Step 3: Implement role hierarchy guards**

Change `apps/server/src/lib/api/index.ts`:

```ts
export const candidateProcedure = protectedProcedure.use(createRoleGuard(["CANDIDATE", "EMPLOYER", "ADMIN"]));
export const employerProcedure = protectedProcedure.use(createRoleGuard(["EMPLOYER", "ADMIN"]));
export const adminProcedure = protectedProcedure.use(createRoleGuard(["ADMIN"]));
```

Keep `employerOrAdminProcedure` unchanged or make it equivalent to `employerProcedure` if duplication is cleaned up.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @07nghiep/server test -- src/lib/api/index.test.ts
```

Expected: all role-guard tests pass.

- [ ] **Step 5: Audit candidate routes for unintended admin/employer reliance**

Run:

```bash
rg -n "candidateProcedure" apps/server/src/routers
```

Expected candidate-level routers include profile, candidate application, and saved jobs after Task 4. With hierarchy, employer and admin may use these candidate-level features too.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/lib/api/index.ts apps/server/src/lib/api/index.test.ts
git commit -m "fix: apply role hierarchy guards"
```

---

## Task 3: Sync Prisma Schema and Migration History

**Files:**
- Modify: `packages/db/prisma/schema/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_readiness_fixes/migration.sql`

- [ ] **Step 1: Inspect current drift**

Run:

```bash
rg -n "INTERVIEW|INTERVIEWING|INTERVIEW_INVITATION|ApplicationHistory|NotificationPreference|model Interview|enum InterviewStatus" packages/db/prisma/schema packages/db/prisma/migrations
```

Expected current evidence:
- Existing migration contains `ApplicationStatus.INTERVIEW`.
- Current schema contains `ApplicationStatus.INTERVIEWING`.
- Current schema contains `INTERVIEW_INVITATION`, `ApplicationHistory`, `NotificationPreference`, and `Interview`.

- [ ] **Step 2: Generate migration**

Ensure `packages/db/.env` or shell env has `DATABASE_URL`, then run:

```bash
pnpm db:start
pnpm db:migrate --name readiness_fixes
```

Expected: Prisma creates a new migration directory under `packages/db/prisma/migrations`.

- [ ] **Step 3: Inspect migration SQL**

Open the generated SQL and verify it includes the equivalent of:

```sql
ALTER TYPE "ApplicationStatus" RENAME VALUE 'INTERVIEW' TO 'INTERVIEWING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERVIEW_INVITATION';

CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "ApplicationHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "note" TEXT,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Interview" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "location" TEXT,
  "meetingLink" TEXT,
  "notes" TEXT,
  "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
```

Also verify indexes and foreign keys exist for:

```sql
CREATE INDEX "ApplicationHistory_applicationId_createdAt_idx" ON "ApplicationHistory"("applicationId", "createdAt");
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");
CREATE UNIQUE INDEX "NotificationPreference_userId_type_key" ON "NotificationPreference"("userId", "type");
ALTER TABLE "ApplicationHistory" ADD CONSTRAINT "ApplicationHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
pnpm db:generate
```

Expected: generated client includes `Interview`, `InterviewStatus`, and `INTERVIEW_INVITATION`.

- [ ] **Step 5: Run migration status**

```bash
pnpm --filter @07nghiep/db prisma migrate status
```

Expected: database schema is up to date.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema/schema.prisma packages/db/prisma/migrations packages/db/prisma/generated
git commit -m "fix: sync prisma schema and migrations"
```

---

## Task 4: Persist Saved Jobs

**Files:**
- Create: `apps/server/src/routers/savedJob.ts`
- Create: `apps/server/src/routers/savedJob.test.ts`
- Modify: `apps/server/src/routers/index.ts`
- Modify: `apps/candidate/src/routes/__root.tsx`
- Modify: `apps/candidate/src/routes/jobs.index.tsx`
- Modify: `apps/candidate/src/routes/jobs.$jobId.tsx`
- Modify: `apps/candidate/src/routes/saved-jobs.tsx`
- Modify: `docs/API_SPEC.md`

- [ ] **Step 1: Write saved-job router tests**

Create `apps/server/src/routers/savedJob.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { savedJobRouter } from "./savedJob";

function createCtx(overrides: Record<string, unknown> = {}) {
  const prisma = {
    job: {
      findFirst: vi.fn(),
    },
    savedJob: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  return {
    ctx: {
      session: { user: { id: "candidate-1", role: "CANDIDATE" } },
      user: { id: "candidate-1", role: "CANDIDATE" },
      role: "CANDIDATE",
      prisma,
      ...overrides,
    } as never,
    prisma,
  };
}

describe("savedJobRouter", () => {
  it("saves an open job when not already saved", async () => {
    const { ctx, prisma } = createCtx();
    prisma.job.findFirst.mockResolvedValue({ id: "job-1" });
    prisma.savedJob.findUnique.mockResolvedValue(null);
    prisma.savedJob.create.mockResolvedValue({ id: "saved-1", userId: "candidate-1", jobId: "job-1" });

    const result = await savedJobRouter.createCaller(ctx).toggle({ jobId: "job-1" });

    expect(result).toEqual({ saved: true });
    expect(prisma.savedJob.create).toHaveBeenCalledWith({
      data: { userId: "candidate-1", jobId: "job-1" },
    });
  });

  it("unsaves an already saved job", async () => {
    const { ctx, prisma } = createCtx();
    prisma.job.findFirst.mockResolvedValue({ id: "job-1" });
    prisma.savedJob.findUnique.mockResolvedValue({ id: "saved-1", userId: "candidate-1", jobId: "job-1" });
    prisma.savedJob.delete.mockResolvedValue({ id: "saved-1" });

    const result = await savedJobRouter.createCaller(ctx).toggle({ jobId: "job-1" });

    expect(result).toEqual({ saved: false });
    expect(prisma.savedJob.delete).toHaveBeenCalledWith({ where: { id: "saved-1" } });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm --filter @07nghiep/server test -- src/routers/savedJob.test.ts
```

Expected: fails because `apps/server/src/routers/savedJob.ts` does not exist.

- [ ] **Step 3: Create saved-job router**

Create `apps/server/src/routers/savedJob.ts`:

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { candidateProcedure, router } from "../lib/api";

const jobIdSchema = z.object({ jobId: z.string().min(1) });

export const savedJobRouter = router({
  toggle: candidateProcedure.input(jobIdSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    const job = await ctx.prisma.job.findFirst({
      where: { id: input.jobId, status: "OPEN" },
      select: { id: true },
    });

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng đang mở" });
    }

    const existing = await ctx.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId: input.jobId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await ctx.prisma.savedJob.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await ctx.prisma.savedJob.create({
      data: {
        userId,
        jobId: input.jobId,
      },
    });

    return { saved: true };
  }),

  isSaved: candidateProcedure.input(jobIdSchema).query(async ({ ctx, input }) => {
    const item = await ctx.prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId: ctx.session.user.id,
          jobId: input.jobId,
        },
      },
      select: { id: true },
    });

    return { saved: Boolean(item) };
  }),

  list: candidateProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;
      const skip = (page - 1) * pageSize;
      const where = { userId: ctx.session.user.id };

      const [items, total] = await Promise.all([
        ctx.prisma.savedJob.findMany({
          where,
          orderBy: { savedAt: "desc" },
          skip,
          take: pageSize,
          include: {
            job: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    verified: true,
                  },
                },
                skills: true,
              },
            },
          },
        }),
        ctx.prisma.savedJob.count({ where }),
      ]);

      return {
        jobs: items.map((item) => ({
          ...item.job,
          savedAt: item.savedAt,
          isSaved: true,
          skills: item.job.skills.map((skill) => skill.skill),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),
});
```

- [ ] **Step 4: Register router**

In `apps/server/src/routers/index.ts`, add:

```ts
import { savedJobRouter } from "./savedJob";
```

and in `appRouter`:

```ts
savedJob: savedJobRouter,
```

- [ ] **Step 5: Run saved-job tests**

```bash
pnpm --filter @07nghiep/server test -- src/routers/savedJob.test.ts
```

Expected: tests pass.

- [ ] **Step 6: Replace candidate local saved state**

In `apps/candidate/src/routes/__root.tsx`, remove:

```ts
const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
const toggleSave = (id: string) => { ... };
```

Keep only public job list data in the root. Do not expose `toggleSave` from root context.

- [ ] **Step 7: Wire job list page to saved-job API**

In `apps/candidate/src/routes/jobs.index.tsx`, query saved jobs when the user is authenticated and compute saved ids from API data:

```ts
const savedJobsQuery = useQuery(trpc.savedJob.list.queryOptions({ pageSize: 50 }));
const toggleSavedJob = useMutation(trpc.savedJob.toggle.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: trpc.savedJob.list.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.job.getPublicList.queryKey() });
  },
}));
```

Pass this handler into `JobCardItem`:

```ts
onSave={(jobId) => toggleSavedJob.mutate({ jobId })}
```

- [ ] **Step 8: Wire job detail page to saved-job API**

In `apps/candidate/src/routes/jobs.$jobId.tsx`, replace root-context save state with:

```ts
const savedQuery = useQuery(trpc.savedJob.isSaved.queryOptions({ jobId }));
const toggleSavedJob = useMutation(trpc.savedJob.toggle.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: trpc.savedJob.isSaved.queryOptions({ jobId }).queryKey });
    queryClient.invalidateQueries({ queryKey: trpc.savedJob.list.queryKey() });
  },
}));
```

Use `savedQuery.data?.saved` for UI state.

- [ ] **Step 9: Wire saved-jobs page to API**

In `apps/candidate/src/routes/saved-jobs.tsx`, replace context filtering with:

```ts
const { data, isLoading } = useQuery(trpc.savedJob.list.queryOptions({ page: 1, pageSize: 20 }));
const toggleSavedJob = useMutation(trpc.savedJob.toggle.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: trpc.savedJob.list.queryKey() });
  },
}));
const savedJobs = data?.jobs ?? [];
```

Use existing `JobCardItem` and pass:

```tsx
onSave={(jobId) => toggleSavedJob.mutate({ jobId })}
```

- [ ] **Step 10: Update API docs**

In `docs/API_SPEC.md`, replace the Saved Jobs planned section with:

```md
## 7. Saved Jobs

Status: Implemented.

- `savedJob.toggle` - save or unsave an open job.
- `savedJob.list` - list the authenticated candidate's saved jobs.
- `savedJob.isSaved` - check saved state for one job.
```

- [ ] **Step 11: Verify**

```bash
pnpm --filter @07nghiep/server test -- src/routers/savedJob.test.ts
pnpm check-types
```

Expected: saved-job tests pass and type check passes.

- [ ] **Step 12: Commit**

```bash
git add apps/server/src/routers/savedJob.ts apps/server/src/routers/savedJob.test.ts apps/server/src/routers/index.ts apps/candidate/src/routes docs/API_SPEC.md
git commit -m "feat: persist saved jobs"
```

---

## Task 5: Make Apply-Time Resume Upload Work

**Files:**
- Modify: `apps/candidate/src/components/jobs/ApplyJobModal.tsx`

- [ ] **Step 1: Confirm storage contract**

Current storage only accepts PDF resumes. Keep apply-time upload PDF-only in this task.

Expected UI file input:

```tsx
<input
  type="file"
  accept="application/pdf,.pdf"
  onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
/>
```

- [ ] **Step 2: Replace upload error branch**

In `ApplyJobModal.tsx`, replace the `values.resumeChoice === "upload"` branch with:

```ts
let finalResume: string | undefined;

if (values.resumeChoice === "upload") {
  if (!uploadedFile) {
    toast.error("Vui lòng chọn tệp PDF để tải lên.");
    return;
  }

  if (uploadedFile.type !== "application/pdf") {
    toast.error("Hệ thống chỉ hỗ trợ CV định dạng PDF.");
    return;
  }

  const upload = await uploadResumeMutation.mutateAsync({
    filename: uploadedFile.name,
    contentType: uploadedFile.type,
  });

  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadedFile.type,
    },
    body: uploadedFile,
  });

  if (!uploadResponse.ok) {
    throw new Error("Không thể tải CV lên máy chủ lưu trữ.");
  }

  finalResume = upload.publicUrl;
} else {
  finalResume = values.resumeChoice === "profile" ? profileQuery.data?.resumeUrl ?? undefined : undefined;
}
```

Add the mutation before `onSubmit`:

```ts
const uploadResumeMutation = useMutation(trpc.profile.uploadResume.mutationOptions());
```

Update submit disabled state:

```tsx
<Button type="submit" disabled={isPending || uploadResumeMutation.isPending}>
  {isPending || uploadResumeMutation.isPending ? "Đang nộp..." : "Nộp đơn đăng ký"}
</Button>
```

- [ ] **Step 3: Verify apply payload**

Keep the final apply call:

```ts
await mutateAsync({
  jobId,
  coverLetter: values.coverLetter,
  resumeUrl: finalResume,
});
```

- [ ] **Step 4: Run type check**

```bash
pnpm check-types
```

Expected: no TypeScript errors.

- [ ] **Step 5: Manual smoke test**

Run:

```bash
pnpm db:start
pnpm dev:server
pnpm dev:candidate
```

Use a candidate account, open an `OPEN` job, choose `Tải lên hồ sơ xin việc mới`, select a PDF, submit. Expected: application is created with `resumeUrl` equal to the uploaded public URL.

- [ ] **Step 6: Commit**

```bash
git add apps/candidate/src/components/jobs/ApplyJobModal.tsx
git commit -m "feat: upload resume while applying"
```

---

## Task 6: Add Admin Approval Workflows

**Files:**
- Modify: `packages/db/prisma/schema/schema.prisma`
- Create: Prisma migration under `packages/db/prisma/migrations/<timestamp>_approval_workflows/migration.sql`
- Create: `apps/server/src/routers/admin/organization.ts`
- Create: `apps/server/src/routers/admin/job.ts`
- Modify: `apps/server/src/routers/index.ts`
- Modify: `apps/server/src/routers/organization.ts`
- Modify: `apps/server/src/routers/job.ts`
- Create: `apps/admin/src/routes/admin/organizations/index.tsx`
- Create: `apps/admin/src/routes/admin/jobs/index.tsx`
- Modify: `apps/admin/src/components/sidebar.tsx`

- [ ] **Step 1: Add organization verification status**

In `packages/db/prisma/schema/schema.prisma`, add:

```prisma
enum OrganizationVerificationStatus {
  UNVERIFIED
  PENDING
  VERIFIED
  REJECTED
}
```

Add fields to `Organization`:

```prisma
verificationStatus OrganizationVerificationStatus @default(UNVERIFIED)
verificationNote   String?
verified           Boolean @default(false)
```

If `verified` already exists, keep the existing field and add only `verificationStatus` and `verificationNote`.

- [ ] **Step 2: Generate approval migration**

Run:

```bash
pnpm db:migrate --name approval_workflows
pnpm db:generate
```

Expected migration adds enum and fields without removing existing organization data.

- [ ] **Step 3: Create admin organization router**

Create `apps/server/src/routers/admin/organization.ts`:

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../../lib/api";

export const adminOrganizationRouter = router({
  listVerificationRequests: adminProcedure
    .input(
      z.object({
        status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = input.status ? { verificationStatus: input.status } : {};

      const [organizations, total] = await Promise.all([
        ctx.prisma.organization.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: input.pageSize,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: {
                jobs: true,
              },
            },
          },
        }),
        ctx.prisma.organization.count({ where }),
      ]);

      return {
        organizations,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  approve: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const organization = await ctx.prisma.organization.findUnique({ where: { id: input.id } });
    if (!organization) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tổ chức" });

    return ctx.prisma.organization.update({
      where: { id: input.id },
      data: {
        verified: true,
        verificationStatus: "VERIFIED",
        verificationNote: null,
      },
    });
  }),

  reject: adminProcedure
    .input(z.object({ id: z.string().min(1), note: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findUnique({ where: { id: input.id } });
      if (!organization) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tổ chức" });

      return ctx.prisma.organization.update({
        where: { id: input.id },
        data: {
          verified: false,
          verificationStatus: "REJECTED",
          verificationNote: input.note,
        },
      });
    }),
});
```

- [ ] **Step 4: Make requestVerification meaningful**

In `apps/server/src/routers/organization.ts`, change `requestVerification` data:

```ts
data: {
  verified: false,
  verificationStatus: "PENDING",
  verificationNote: null,
},
```

- [ ] **Step 5: Create admin job router**

Create `apps/server/src/routers/admin/job.ts`:

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../../lib/api";

export const adminJobRouter = router({
  listPending: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const where = { status: "PENDING_APPROVAL" as const };

      const [jobs, total] = await Promise.all([
        ctx.prisma.job.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: input.pageSize,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
            skills: true,
          },
        }),
        ctx.prisma.job.count({ where }),
      ]);

      return {
        jobs: jobs.map((job) => ({
          ...job,
          skills: job.skills.map((skill) => skill.skill),
        })),
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  approve: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const job = await ctx.prisma.job.findUnique({ where: { id: input.id } });
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

    return ctx.prisma.job.update({
      where: { id: input.id },
      data: {
        status: "OPEN",
        publishedAt: job.publishedAt ?? new Date(),
      },
    });
  }),

  reject: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const job = await ctx.prisma.job.findUnique({ where: { id: input.id } });
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy tin tuyển dụng" });

    return ctx.prisma.job.update({
      where: { id: input.id },
      data: {
        status: "DRAFT",
        publishedAt: null,
      },
    });
  }),
});
```

- [ ] **Step 6: Register admin routers**

In `apps/server/src/routers/index.ts`, import:

```ts
import { adminOrganizationRouter } from "./admin/organization";
import { adminJobRouter } from "./admin/job";
```

Update `admin` router:

```ts
admin: router({
  users: adminUserRouter,
  organizations: adminOrganizationRouter,
  jobs: adminJobRouter,
}),
```

- [ ] **Step 7: Route employer publish through approval**

In `apps/server/src/routers/job.ts`, change create status input:

```ts
.input(jobCreateSchema.extend({ status: z.enum(["DRAFT", "PENDING_APPROVAL"]).default("DRAFT") }))
```

When a user submits a job for publishing, set:

```ts
status: input.status,
publishedAt: null,
```

Change `publish` mutation to:

```ts
data: { status: "PENDING_APPROVAL", publishedAt: null },
```

Keep admin `approve` responsible for changing the job to `OPEN`.

- [ ] **Step 8: Update employer UI labels**

In job creation and job table UI, map publish action to `PENDING_APPROVAL` with labels:

```ts
PENDING_APPROVAL: "Chờ duyệt"
```

The final submit button should read `Gửi duyệt` when creating a published job.

- [ ] **Step 9: Add admin organization page**

Create `apps/admin/src/routes/admin/organizations/index.tsx` with a table that calls:

```ts
trpc.admin.organizations.listVerificationRequests.queryOptions({ status: "PENDING", page: 1, pageSize: 20 })
```

For each row, render approve/reject buttons using:

```ts
trpc.admin.organizations.approve.mutationOptions()
trpc.admin.organizations.reject.mutationOptions()
```

On success, invalidate:

```ts
queryClient.invalidateQueries({ queryKey: trpc.admin.organizations.listVerificationRequests.queryKey() });
```

- [ ] **Step 10: Add admin jobs page**

Create `apps/admin/src/routes/admin/jobs/index.tsx` with a table that calls:

```ts
trpc.admin.jobs.listPending.queryOptions({ page: 1, pageSize: 20 })
```

Use approve/reject mutations:

```ts
trpc.admin.jobs.approve.mutationOptions()
trpc.admin.jobs.reject.mutationOptions()
```

- [ ] **Step 11: Add admin navigation**

In `apps/admin/src/components/sidebar.tsx`, add links:

```ts
{ title: "Duyệt công ty", url: "/admin/organizations" }
{ title: "Duyệt tin tuyển dụng", url: "/admin/jobs" }
```

Use the same item shape already used by the sidebar.

- [ ] **Step 12: Verify**

```bash
pnpm db:migrate
pnpm db:generate
pnpm check-types
```

Manual smoke:
- Employer creates organization and requests verification. Admin sees it pending and approves it.
- Employer submits job for approval. Candidate public job list does not show it while `PENDING_APPROVAL`.
- Admin approves job. Candidate public job list shows it as `OPEN`.

- [ ] **Step 13: Commit**

```bash
git add packages/db/prisma apps/server/src/routers apps/admin/src/routes apps/admin/src/components/sidebar.tsx
git commit -m "feat: add admin approval workflows"
```

---

## Task 7: Harden Server Startup and Environment

**Files:**
- Modify: `packages/env/src/server.ts`
- Modify: `apps/server/.env.example`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Add server env vars**

In `packages/env/src/server.ts`, add:

```ts
SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
SEED_DEMO_USERS: z.coerce.boolean().default(false),
```

- [ ] **Step 2: Document env vars**

In `apps/server/.env.example`, add:

```env
SERVER_PORT=3000
SEED_DEMO_USERS=false
```

- [ ] **Step 3: Use configurable port**

In `apps/server/src/index.ts`, change:

```ts
serve({ fetch: app.fetch, port: 3000 });
console.log(`Server running on http://localhost:3000`);
```

to:

```ts
serve({ fetch: app.fetch, port: env.SERVER_PORT });
console.log(`Server running on http://localhost:${env.SERVER_PORT}`);
```

- [ ] **Step 4: Gate demo seed**

Replace unconditional seed call:

```ts
console.log("Seeding users...");
await seedUsers();
```

with:

```ts
if (env.SEED_DEMO_USERS) {
  console.log("Seeding demo users...");
  await seedUsers();
}
```

- [ ] **Step 5: Use configured auth URL for seed fetch**

In `seedUsers`, replace:

```ts
fetch("http://localhost:3000/api/auth/sign-up/email", ...)
```

with:

```ts
fetch(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, ...)
```

- [ ] **Step 6: Verify**

```bash
pnpm check-types
```

Run server with default env:

```bash
pnpm dev:server
```

Expected: server starts and does not print `Seeding demo users...` unless `SEED_DEMO_USERS=true`.

- [ ] **Step 7: Commit**

```bash
git add packages/env/src/server.ts apps/server/.env.example apps/server/src/index.ts
git commit -m "fix: gate demo seed behind env flag"
```

---

## Task 8: Escape Notification Email Content

**Files:**
- Modify: `apps/server/src/lib/notifications/service.ts`
- Create: `apps/server/src/lib/notifications/service.test.ts`

- [ ] **Step 1: Extract HTML escape helper**

In `apps/server/src/lib/notifications/service.ts`, add:

```ts
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

- [ ] **Step 2: Use escaped values in email HTML**

Before `sendEmail`, compute:

```ts
const safeTitle = escapeHtml(params.title);
const safeBody = escapeHtml(params.body);
```

Use `safeTitle` and `safeBody` inside the email HTML:

```ts
<h2 style="color: #0f172a; margin-top: 0;">${safeTitle}</h2>
<p style="color: #475569; font-size: 16px; line-height: 24px;">${safeBody}</p>
```

- [ ] **Step 3: Add helper test**

Create `apps/server/src/lib/notifications/service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { escapeHtml } from "./service";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });
});
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter @07nghiep/server test -- src/lib/notifications/service.test.ts
```

Expected: test passes.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/lib/notifications/service.ts apps/server/src/lib/notifications/service.test.ts
git commit -m "fix: escape notification email content"
```

---

## Task 9: Final Verification and Docs

**Files:**
- Modify: `docs/API_SPEC.md`
- Modify: `README.md`
- Modify: `BAO_CAO_HE_THONG.md`

- [ ] **Step 1: Update API docs**

In `docs/API_SPEC.md`, ensure these sections match current code:

```md
- Jobs: Implemented, with employer submit-for-approval and admin approval.
- Applications: Implemented.
- Saved Jobs: Implemented.
- Conversations: Implemented.
- Messages: Implemented.
- Notifications: Implemented.
- Interviews: Implemented.
```

- [ ] **Step 2: Update README setup**

In `README.md`, replace stale `apps/web` references with the actual apps:

```md
- Candidate: `pnpm dev:candidate`
- Employer: `pnpm dev:employer`
- Admin: `pnpm dev:admin`
- Server: `pnpm dev:server`
```

Add verification commands:

```bash
pnpm install
pnpm db:start
pnpm db:migrate
pnpm db:generate
pnpm test
pnpm check-types
pnpm build
```

- [ ] **Step 3: Update system report**

In `BAO_CAO_HE_THONG.md`, update:

```md
Admin dashboard: includes user management, organization verification, and job approval.
Saved jobs: persisted in database.
Interview: implemented.
Messaging: implemented via SSE.
```

- [ ] **Step 4: Run full verification**

Run:

```bash
pnpm install
pnpm db:start
pnpm db:migrate
pnpm db:generate
pnpm test
pnpm check-types
pnpm build
```

Expected:
- `pnpm test`: all Vitest tests pass.
- `pnpm check-types`: all package type checks pass.
- `pnpm build`: all apps and packages build.

- [ ] **Step 5: Manual end-to-end smoke**

Run:

```bash
SEED_DEMO_USERS=true pnpm dev:server
pnpm dev:admin
pnpm dev:employer
pnpm dev:candidate
```

Verify:
- Employer creates organization and requests verification.
- Admin approves organization.
- Employer submits job for approval.
- Candidate cannot see pending job.
- Admin approves job.
- Candidate sees job, saves job, reloads page, saved job remains.
- Candidate applies using profile resume.
- Candidate applies using newly uploaded PDF on another job.
- Employer sees application and schedules interview.
- Candidate receives interview notification and responds.
- Employer and candidate can exchange messages.

- [ ] **Step 6: Commit docs and verification changes**

```bash
git add docs/API_SPEC.md README.md BAO_CAO_HE_THONG.md
git commit -m "docs: update readiness status and setup"
```

---

## Out of Scope for This Batch

- OAuth providers: feature work, not required to close the current core-flow gaps.
- Two-factor auth: feature work, should be a separate security plan.
- Payment/subscription: product feature, requires business rules before implementation.
- Job matching alerts: feature work; `JOB_ALERT` preference can remain present without automatic matching.

## Self-Review

- Spec coverage: covers every gap identified in the audit: RBAC, saved jobs, apply upload, migration drift, admin approval, seed hardening, test pipeline, docs.
- Placeholder scan: passed without deferred-work markers.
- Type consistency: router names are `savedJob`, `admin.organizations`, and `admin.jobs`; frontend plan uses the same names.
