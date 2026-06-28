import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const urlList = z.string().transform((val) => val.split(",").map((s) => s.trim()));

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    CORS_ORIGIN: urlList,
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SEED_DEMO_USERS: z.coerce.boolean().default(false),
    CANDIDATE_APP_URL: z.string().url().optional(),
    EMPLOYER_APP_URL: z.string().url().optional(),
    PAYOS_CLIENT_ID: z.string().min(1).optional(),
    PAYOS_API_KEY: z.string().min(1).optional(),
    PAYOS_CHECKSUM_KEY: z.string().min(1).optional(),
    SESSION_EXPIRY_DAYS: z.coerce.number().default(7),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().optional(),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    AI_PROVIDER: z.enum(["anthropic"]).default("anthropic"),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_URL: z.string().url().optional(),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-3-5-sonnet-latest"),
    AI_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
    AI_JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    AI_JOB_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(120_000),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
