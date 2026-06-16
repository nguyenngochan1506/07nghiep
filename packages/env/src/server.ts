import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const urlList = z.string().transform((val) => val.split(",").map((s) => s.trim()));

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().min(1),
    CORS_ORIGIN: urlList,
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    SEED_DEMO_USERS: z.coerce.boolean().default(false),
    SESSION_EXPIRY_DAYS: z.coerce.number().default(7),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
