import { createContext } from "./lib/api/context";
import { appRouter } from "./routers";
import { auth } from "@07nghiep/auth";
import { env } from "@07nghiep/env/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { scrypt, randomBytes } from "node:crypto";

// ============================================================
// Seed
// ============================================================
const SEED_USERS = [
  { email: "candidate_user@gmail.com", password: "candidate_user", name: "Candidate User", role: "CANDIDATE" as const },
  { email: "employer_user@gmail.com", password: "employer_user", name: "Employer User", role: "EMPLOYER" as const },
  { email: "admin_user@gmail.com", password: "admin_user", name: "Admin User", role: "ADMIN" as const },
];

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password, salt, 32, { N: 2 ** 14, r: 8, p: 1, maxmem: 128 * 2 ** 14 * 8 * 2 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(Buffer.concat([salt, derivedKey]).toString("base64"));
    });
  });
}

async function seedUsers() {
  const { createPrismaClient } = await import("@07nghiep/db");
  const prisma = createPrismaClient();
  const now = new Date();

  for (const user of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      if (existing.role !== user.role) {
        await prisma.user.update({ where: { id: existing.id }, data: { role: user.role } });
        console.log(`  [UPDATED] ${user.email} → role: ${user.role}`);
      } else {
        console.log(`  [SKIP]    ${user.email} (already exists)`);
      }
      continue;
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(user.password);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          name: user.name,
          email: user.email,
          emailVerified: true,
          role: user.role,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: user.email,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    console.log(`  [CREATED] ${user.email} (${user.role})`);
  }

  await prisma.$disconnect();
}

// ============================================================
// Server
// ============================================================
const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      const allowedOrigins = env.CORS_ORIGIN;
      if (allowedOrigins.includes(origin)) {
        return origin;
      }
      return allowedOrigins[0] ?? "*";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.all("/trpc/:path(*)", async (c) => {
  return fetchRequestHandler({
    endpoint: "/trpc",
    router: appRouter,
    req: c.req.raw,
    createContext: async () => createContext({ context: c }),
  });
});

app.get("/", (c) => c.text("OK"));

async function main() {
  console.log("Seeding users...");
  await seedUsers();

  const { serve } = await import("@hono/node-server");
  serve(
    { fetch: app.fetch, port: 3000 },
    (info) => console.log(`Server running on http://localhost:${info.port}`),
  );
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
