# Job Crawler

Utilities for crawling public job postings from external job boards and importing them into the 07nghiep database.

## Structure

- `crawler/`: Python crawler that writes source records as JSONL.
- `crawler/sources/`: Source-specific crawlers for ITviec and TopDev.
- `importer/`: TypeScript importer that normalizes JSONL records and upserts employer accounts, organizations, jobs, and job skills.

## Ignored outputs

Crawler output and generated account manifests are written to `data/crawled-jobs/` by default. This directory is ignored because it can contain large crawl snapshots and generated employer passwords.

Python runtime artifacts such as `__pycache__/`, `*.pyc`, and local virtual environments are ignored as well.

## Prerequisites

- PostgreSQL is running and the Prisma migrations for crawler metadata have been applied.
- Server/auth environment variables are configured for `@07nghiep/server`, `@07nghiep/auth`, and `@07nghiep/db`.
- The Better Auth URL must be reachable because the importer creates employer user accounts through the auth API.
- `uv` is available for running the Python crawler with `requirements.txt`.

## Crawl jobs

Run all configured sources:

```bash
pnpm job:crawl
```

Useful crawler options:

```bash
pnpm job:crawl -- --source itviec --limit 20
pnpm job:crawl -- --source topdev --limit 20 --topdev-sitemap-pages 1
pnpm job:crawl -- --out-dir data/crawled-jobs
```

The crawler writes one JSONL file per source, for example:

```text
data/crawled-jobs/itviec.jsonl
data/crawled-jobs/topdev.jsonl
```

## Import jobs

Validate crawled records without writing to the database:

```bash
pnpm job:import -- --dry-run
```

Import all JSONL files from the default output directory:

```bash
pnpm job:import
```

Import a specific file or limit the number of records:

```bash
pnpm job:import -- --input data/crawled-jobs/itviec.jsonl --limit 10
```

The importer writes employer account manifests back to the output directory:

```text
data/crawled-jobs/employer-accounts.json
data/crawled-jobs/employer-accounts.csv
```

These files are ignored because they include generated local employer passwords.

## Import behavior

- Employer emails are deterministic: `crawler+<source>-<company>@07nghiep.local`.
- Existing generated passwords are reused from `employer-accounts.json` when present.
- Organizations are upserted by the generated employer user.
- Jobs are upserted by `sourceUrl`.
- Job skills are replaced on each import for the matching job.

## Verification

Run importer normalization tests:

```bash
pnpm exec vitest run scripts/job-crawler/importer/normalize.test.ts
```

Run a dry-run import after crawling:

```bash
pnpm job:import -- --dry-run
```
