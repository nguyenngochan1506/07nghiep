import { createContext } from "./lib/api/context";
import { appRouter } from "./routers";
import { auth } from "@07nghiep/auth";
import { env } from "@07nghiep/env/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import { notificationEvents } from "./lib/notifications/events";
import { messageEvents } from "./lib/messaging/events";

const SEED_USERS = [
  {
    email: "candidate_user@gmail.com",
    password: "candidate_user",
    name: "Candidate User",
    role: "CANDIDATE" as const,
  },
  {
    email: "employer_user@gmail.com",
    password: "employer_user",
    name: "Employer User",
    role: "EMPLOYER" as const,
  },
  {
    email: "admin_user@gmail.com",
    password: "admin_user",
    name: "Admin User",
    role: "ADMIN" as const,
  },
];

async function seedUsers() {
  const { createPrismaClient } = await import("@07nghiep/db");
  const prisma = createPrismaClient();

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

    // Create user + account via Better Auth API (handles password hashing correctly)
    const res = await fetch(`${env.BETTER_AUTH_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        name: user.name,
        confirmPassword: user.password,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      const msg = typeof data.message === "string" ? data.message : JSON.stringify(data);
      // USER_ALREADY_EXISTS is ok — race condition between parallel checks
      if (msg.includes("already") || msg.includes("exists") || msg.includes("CONFLICT")) {
        console.log(`  [SKIP]    ${user.email} (already exists)`);
      } else {
        console.error(`  [ERROR]   ${user.email}: ${msg}`);
      }
      continue;
    }

    // Update role to the correct one
    await prisma.user.update({
      where: { email: user.email },
      data: { role: user.role, emailVerified: true },
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
      if (allowedOrigins.includes(origin)) return origin;
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

app.get("/api/notifications/sse", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = session.user.id;

  return streamSSE(c, async (stream) => {
    const handler = (payload: unknown) => {
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: "notification",
      });
    };

    notificationEvents.on(`notification:${userId}`, handler);

    c.req.raw.signal.addEventListener("abort", () => {
      notificationEvents.off(`notification:${userId}`, handler);
    });

    // Keep connection alive with a ping every 30 seconds
    while (true) {
      await stream.sleep(30000);
      try {
        await stream.writeSSE({ data: "ping", event: "ping" });
      } catch (_e) {
        // Connection closed
        break;
      }
    }
  });
});

app.get("/api/messages/sse", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const conversationId = c.req.query("conversation");
  if (!conversationId) {
    return c.json({ error: "Missing conversation param" }, 400);
  }

  return streamSSE(c, async (stream) => {
    const handler = (payload: unknown) => {
      stream.writeSSE({
        data: JSON.stringify(payload),
        event: "message",
      });
    };

    messageEvents.on(`message:${conversationId}`, handler);

    c.req.raw.signal.addEventListener("abort", () => {
      messageEvents.off(`message:${conversationId}`, handler);
    });

    while (true) {
      await stream.sleep(30000);
      try {
        await stream.writeSSE({ data: "ping", event: "ping" });
      } catch {
        break;
      }
    }
  });
});

app.get("/", (c) => c.text("OK"));

async function main() {
  const { serve } = await import("@hono/node-server");

  serve({ fetch: app.fetch, port: env.SERVER_PORT });
  console.log(`Server running on http://localhost:${env.SERVER_PORT}`);

  if (env.SEED_DEMO_USERS) {
    // Give the server a moment to start listening before calling its auth API.
    await new Promise((r) => setTimeout(r, 100));

    console.log("Seeding demo users...");
    await seedUsers();
  }
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
