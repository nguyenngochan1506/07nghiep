# CI Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub CI match the repo's actual quality commands: lint, typecheck, test, and build.

**Architecture:** Keep CI small and deterministic. Add separate fast jobs for lint, typecheck, and test, then run build only after those gates pass. Keep workflow-only changes isolated from app code.

**Tech Stack:** GitHub Actions, pnpm 10.33.0, Node 24, Turborepo, Biome, Vitest, Vite, tsdown.

---

## File Structure

- Modify `.github/workflows/ci.yml`: primary CI quality gate.
- Modify `.github/workflows/pr-label.yml`: avoid duplicate PR-label runs and unnecessary checkout.
- Modify `.github/BRANCH_PROTECTION.md`: make required checks match the actual workflow job names.
- Optionally modify `.github/CI_ENHANCED.md`: either mark it as historical/reference or align it with the implemented workflow.

---

### Task 1: Upgrade Main CI Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace CI trigger and shared permissions**

Update the top of `.github/workflows/ci.yml` to run on PRs and pushes to protected branches, and use minimal default permissions:

```yaml
name: CI

on:
  push:
    branches: ["main", "develop"]
  pull_request:
    branches: ["main", "develop"]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

- [ ] **Step 2: Pin pnpm setup in every job**

For each job, use:

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v6
  with:
    version: 10.33.0

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "24"
    cache: "pnpm"

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

Do not rely on `DATABASE_URL` for dependency install unless Prisma generation fails without it. If CI fails on Prisma postinstall later, add a non-secret local URL at workflow `env`:

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ci
```

- [ ] **Step 3: Add lint job**

Add this job before typecheck:

```yaml
lint:
  name: Lint
  runs-on: ubuntu-latest

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v6
      with:
        version: 10.33.0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "24"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Lint
      run: pnpm lint
```

- [ ] **Step 4: Keep typecheck job**

Keep the existing typecheck job, but pin pnpm version and remove install-time secret dependency:

```yaml
typecheck:
  name: Type Check
  runs-on: ubuntu-latest

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v6
      with:
        version: 10.33.0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "24"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Type check
      run: pnpm check-types
```

- [ ] **Step 5: Add test job**

Add a test gate using the existing root script:

```yaml
test:
  name: Test
  runs-on: ubuntu-latest

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v6
      with:
        version: 10.33.0

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: "24"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Test
      run: pnpm test
```

- [ ] **Step 6: Gate build on lint, typecheck, and test**

Change the build job dependency:

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test]
```

Keep artifact upload steps unchanged.

- [ ] **Step 7: Verify workflow syntax locally**

Run:

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
```

Expected: all commands exit 0. Existing Vite chunk-size warnings and tsdown Prisma runtime warnings may still appear.

- [ ] **Step 8: Commit CI gate change**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint and test gates"
```

---

### Task 2: Fix PR Label Workflow Duplication

**Files:**
- Modify: `.github/workflows/pr-label.yml`

- [ ] **Step 1: Use one PR event**

Replace the current trigger block:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]
  pull_request_target:
```

with:

```yaml
on:
  pull_request_target:
    types: [opened, synchronize, reopened, ready_for_review, converted_to_draft]
```

- [ ] **Step 2: Remove checkout**

Delete this step because the script only reads PR metadata:

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

- [ ] **Step 3: Keep permissions minimal**

Keep:

```yaml
permissions:
  contents: read
  pull-requests: write
```

- [ ] **Step 4: Commit workflow cleanup**

```bash
git add .github/workflows/pr-label.yml
git commit -m "ci: simplify pr label workflow"
```

---

### Task 3: Align Branch Protection Documentation

**Files:**
- Modify: `.github/BRANCH_PROTECTION.md`
- Modify: `.github/CI_ENHANCED.md`

- [ ] **Step 1: Update required checks in branch protection docs**

In `.github/BRANCH_PROTECTION.md`, list these required checks for both `main` and `develop`:

```text
Lint
Type Check
Test
Build
```

Remove references to a single `CI` check unless GitHub branch protection is configured to require the workflow-level aggregate instead of job-level checks.

- [ ] **Step 2: Update CI requirements section**

Set both protected branches to require:

```markdown
- `pnpm lint`
- `pnpm check-types`
- `pnpm test`
- `pnpm build`
```

- [ ] **Step 3: Mark enhanced CI doc as reference if not fully implemented**

At the top of `.github/CI_ENHANCED.md`, add:

```markdown
> Status: Reference proposal. The active workflow is `.github/workflows/ci.yml`.
```

Then ensure the described active checks match the new workflow.

- [ ] **Step 4: Commit docs alignment**

```bash
git add .github/BRANCH_PROTECTION.md .github/CI_ENHANCED.md
git commit -m "docs: align ci branch protection guidance"
```

---

### Task 4: Final Verification

**Files:**
- No additional edits unless verification reveals a problem.

- [ ] **Step 1: Run local quality gates**

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Inspect git history and status**

```bash
git status --short
git log --oneline -5
```

Expected: working tree clean after commits; latest commits are the CI changes from this plan.

- [ ] **Step 3: Report remaining warnings**

Mention any non-failing warnings still present:

```text
Vite chunk-size warnings for admin/candidate/employer.
tsdown unresolved @prisma/client-runtime-utils warnings from generated Prisma runtime.
```

No code change is required for those warnings in this plan.

---

## Self-Review

- Spec coverage: The plan covers missing lint/test gates, push triggers, pnpm pinning, PR label workflow duplication, and branch-protection doc drift.
- Scope control: It does not add deploy, Snyk, database service checks, or remote Turbo cache. Those can be separate follow-up tasks.
- Verification: The plan uses the same commands currently passing locally: `pnpm lint`, `pnpm check-types`, `pnpm test`, `pnpm build`, and `git diff --check`.
