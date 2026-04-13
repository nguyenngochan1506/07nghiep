# GitHub Actions CI/CD - Enhanced Configuration

## Current CI Pipeline

The existing `ci.yml` workflow handles:
- Type checking
- Building all apps
- Artifact upload

## Enhanced CI with Quality Gates

Below is an enhanced version with additional quality checks.

```yaml
name: CI

on:
  push:
    branches: ["develop", "main"]
  pull_request:
    branches: ["develop", "main"]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  # ============================================
  # PHASE 1: Fast Checks (run in parallel)
  # ============================================
  
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm check-types

  # ============================================
  # PHASE 2: Build (only after typecheck passes)
  # ============================================
  
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [typecheck, lint]
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Upload admin artifact
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: admin-dist
          path: apps/admin/dist
          retention-days: 7

      - name: Upload candidate artifact
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: candidate-dist
          path: apps/candidate/dist
          retention-days: 7

      - name: Upload employer artifact
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: employer-dist
          path: apps/employer/dist
          retention-days: 7

      - name: Upload server artifact
        uses: actions/upload-artifact@v4
        if: success()
        with:
          name: server-dist
          path: apps/server/dist
          retention-days: 7

  # ============================================
  # PHASE 3: Database Checks (optional, for schema changes)
  # ============================================
  
  db-checks:
    name: Database Checks
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, 'schema') || contains(github.event.head_commit.message, 'db')
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma Client
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
        run: pnpm db:generate

      - name: Validate Schema
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
        run: pnpm db:push --skip-generate

  # ============================================
  # PHASE 4: Security Scan
  # ============================================
  
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: [typecheck]
    permissions:
      security-events: write
      contents: read
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

## Workflow for Feature Branches

For feature branches (not main/develop), we recommend a lighter CI:

```yaml
# .github/workflows/feature-ci.yml
name: Feature CI

on:
  pull_request:
    branches-ignore: ["main", "develop"]

jobs:
  quick-checks:
    name: Quick Checks
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v6

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

## Merge Queue (for main branch)

GitHub Merge Queue provides additional protection:

```yaml
# Add to ci.yml under main branch triggers
merge_group:
  branches: ["main"]
```

This creates a temporary branch with all pending PRs merged together before final merge.

---

## Notifications

Add these secrets for notifications:

| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK` | Slack channel notifications |
| `DISCORD_WEBHOOK` | Discord notifications |

## Cache Strategy

For faster CI runs, Turborepo caching:

```yaml
- name: Setup Turborepo
  uses: turborepo/github-actions@v5
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    team: ${{ vars.TURBO_TEAM }}
```
