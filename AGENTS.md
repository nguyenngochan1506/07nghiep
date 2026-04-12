# 07nghiep - Job Board System

A modern monorepo job board application built with TypeScript, featuring three frontend applications (Admin, Candidate, Employer) and a unified backend server.

## Project Overview

This is a job searching platform with role-based access:

| App | Role | Purpose |
|-----|------|---------|
| `apps/admin` | Administrator | Platform management and oversight |
| `apps/candidate` | Job Seeker | Browse jobs, submit applications, manage profile |
| `apps/employer` | Company | Post jobs, review applications, manage hiring |
| `apps/server` | API Server | REST/trpc API, authentication, business logic |

## Project Structure

```
07nghiep/
├── apps/
│   ├── admin/           # Admin dashboard (React + Vite)
│   ├── candidate/       # Candidate portal (React + Vite)
│   ├── employer/        # Employer portal (React + Vite)
│   └── server/          # Backend API (Hono + tRPC)
├── packages/
│   ├── api/             # tRPC router definitions
│   ├── auth/            # Better Auth configuration
│   ├── config/          # TypeScript & ESLint configs
│   ├── db/              # Prisma schema & database utilities
│   ├── env/             # Environment variable validation
│   └── ui/              # Shared shadcn/ui components
├── turbo.json           # Turborepo build configuration
├── package.json         # Workspace root
└── pnpm-workspace.yaml  # pnpm workspace config
```

## Tech Stack & Skills

When working on this project, use the corresponding skill files for guidance:

| Technology | Skill File | When to Use |
|------------|------------|-------------|
| **TanStack Router** | `.agents/skills/tanstack-router/SKILL.md` | File-based routing, type-safe navigation, route loaders, TanStack Query integration |
| **Turborepo** | `.agents/skills/turborepo/SKILL.md` | Build pipelines, caching, task orchestration, monorepo structure |
| **Hono** | `.agents/skills/hono/SKILL.md` | Server routing, middleware, validation, streaming |
| **tRPC** | `.agents/skills/hono/SKILL.md` (Section: Hono Client/RPC) | Type-safe API client, router setup |
| **shadcn/ui** | `.agents/skills/shadcn/SKILL.md` | Component usage, forms, composition, styling |
| **TailwindCSS v4** | `.agents/skills/shadcn/rules/styling.md` | Class conventions, semantic colors, responsive design |
| **Better Auth** | `.agents/skills/better-auth-best-practices/SKILL.md` | Authentication setup, sessions, OAuth providers |
| **Prisma** | `.agents/skills/prisma-postgres/SKILL.md` | Schema design, migrations, queries |
| **Email/Password Auth** | `.agents/skills/email-and-password-best-practices/SKILL.md` | Registration, password reset, email verification |
| **Organization** | `.agents/skills/organization-best-practices/SKILL.md` | Multi-tenant setup, roles, permissions |
| **Two-Factor Auth** | `.agents/skills/two-factor-authentication-best-practices/SKILL.md` | TOTP, backup codes, trusted devices |
| **UI/UX** | `.agents/skills/ui-ux-pro-max/SKILL.md` | Design patterns, accessibility, best practices |

## Apps & Packages

### Apps (Entry Points)

#### `apps/admin`
- **Purpose**: Administrative dashboard for platform management
- **Framework**: React + Vite + TanStack Router
- **Dependencies**: `@07nghiep/api`, `@07nghiep/auth`, `@07nghiep/ui`
- **Dev Command**: `pnpm dev:admin`

#### `apps/candidate`
- **Purpose**: Job seeker portal for finding and applying to jobs
- **Framework**: React + Vite + TanStack Router
- **Dependencies**: `@07nghiep/api`, `@07nghiep/auth`, `@07nghiep/ui`
- **Dev Command**: `pnpm dev:candidate`

#### `apps/employer`
- **Purpose**: Employer portal for posting jobs and managing applications
- **Framework**: React + Vite + TanStack Router
- **Dependencies**: `@07nghiep/api`, `@07nghiep/auth`, `@07nghiep/ui`
- **Dev Command**: `pnpm dev:employer`

#### `apps/server`
- **Purpose**: Backend API server
- **Framework**: Hono + tRPC
- **Dependencies**: `@07nghiep/api`, `@07nghiep/auth`, `@07nghiep/db`
- **Dev Command**: `pnpm dev:server`
- **Build**: `tsdown` for production

### Packages (Shared Libraries)

#### `packages/api`
- **Purpose**: tRPC router definitions shared between server and clients
- **Exports**: API procedures and types
- **Dependencies**: `@07nghiep/auth`, `@07nghiep/db`

#### `packages/auth`
- **Purpose**: Better Auth configuration
- **Exports**: Auth instance, client helper, session utilities
- **Dependencies**: `@07nghiep/db`, `@07nghiep/env`

#### `packages/db`
- **Purpose**: Prisma ORM schema and database utilities
- **Exports**: Prisma client, schema types
- **Dependencies**: `@07nghiep/env`
- **Database**: PostgreSQL with Prisma adapter

#### `packages/ui`
- **Purpose**: Shared shadcn/ui components
- **Exports**: Button, Card, Dialog, Form, etc.
- **Style**: TailwindCSS v4 + shadcn primitives

#### `packages/env`
- **Purpose**: Zod-based environment variable validation
- **Exports**: Validated env object for type-safe access

#### `packages/config`
- **Purpose**: Shared TypeScript and ESLint configuration
- **Usage**: All packages extend from this

## Available Scripts

### Development
```bash
pnpm dev              # Start all apps
pnpm dev:admin        # Admin dashboard only
pnpm dev:candidate    # Candidate portal only
pnpm dev:employer     # Employer portal only
pnpm dev:server       # API server only
```

### Build & Type Check
```bash
pnpm build           # Build all apps
pnpm check-types     # Type check all packages
```

### Database (via Prisma)
```bash
pnpm db:start         # Start PostgreSQL with Docker
pnpm db:stop          # Stop PostgreSQL
pnpm db:down          # Remove PostgreSQL container
pnpm db:push          # Push schema changes (dev)
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
pnpm db:watch         # Watch mode for migrations
```

## Database

### Schema
- **Location**: `packages/db/prisma/schema.prisma`
- **ORM**: Prisma v7
- **Adapter**: `@prisma/adapter-pg` with native `pg` driver
- **Migration**: Docker-based PostgreSQL setup

### Environment Variables (required in `packages/db/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/07nghiep
```

## Authentication

### Setup
- **Library**: Better Auth
- **Configuration**: `packages/auth/src/index.ts`
- **Database**: Uses Prisma adapter with `session` table

### Environment Variables (required)
```
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000
```

### Auth Client Usage
```typescript
import { authClient } from "@07nghiep/auth/client";
import { useSession, signIn, signUp, signOut } from "better-auth/react";

// In components
const { data: session } = useSession();

// Sign in
await signIn.email({
  email: "user@example.com",
  password: "password"
});
```

## Development Workflow

### Adding a New Shared Component

1. Add to `packages/ui`:
```bash
cd packages/ui
npx shadcn@latest add button card
```

2. Export from `packages/ui/src/index.ts`

3. Import in apps:
```typescript
import { Button, Card } from "@07nghiep/ui/components";
```

### Adding a New API Endpoint

1. Define router in `packages/api/src/`:
```typescript
// packages/api/src/jobs.ts
export const jobsRouter = router({
  list: procedure.query(async () => { ... }),
  get: procedure.input(z.object({ id: z.string() })).query(async ({ input }) => { ... }),
});
```

2. Merge into main router in `packages/api/src/index.ts`

3. Call from clients:
```typescript
const jobs = await apiClient.jobs.list.useQuery();
```

### Adding a Database Model

1. Update `packages/db/prisma/schema.prisma`

2. Push changes:
```bash
pnpm db:push
```

3. Generate client:
```bash
pnpm db:generate
```

## Environment Setup

Each app/package may have its own `.env` file:

```
apps/admin/.env          # Admin-specific vars
apps/candidate/.env      # Candidate-specific vars
apps/employer/.env       # Employer-specific vars
apps/server/.env         # API server vars
packages/db/.env         # Database connection
packages/auth/.env       # Auth secrets
```

## Architecture Notes

### API Communication
- All frontend apps communicate with `apps/server` via tRPC
- Client is generated from shared `packages/api` types
- Auth headers are automatically forwarded

### Package Dependencies
```
apps/* → @07nghiep/api, @07nghiep/auth, @07nghiep/ui
packages/api → @07nghiep/auth, @07nghiep/db
packages/auth → @07nghiep/db, @07nghiep/env
packages/db → @07nghiep/env
```

### Build Order (Turborepo)
1. `packages/config` (no dependencies)
2. `packages/env`, `packages/db`, `packages/ui` (depend on config)
3. `packages/auth`, `packages/api` (depend on above)
4. `apps/server` (depends on api, auth, db)
5. `apps/*` (depend on api, auth, ui)

## Design System

### Color System
Uses oklch color space for consistent light/dark mode.

**Brand Colors:**
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `oklch(0.55 0.15 235)` | `oklch(0.70 0.12 235)` | Main brand blue (#0369A1) |
| `--secondary` | `oklch(0.95 0.02 200)` | `oklch(0.25 0.02 200)` | Secondary elements |
| `--accent` | `oklch(0.95 0.03 145)` | `oklch(0.30 0.03 145)` | Accent/CTA green |
| `--success` | `oklch(0.65 0.15 145)` | `oklch(0.70 0.12 145)` | Success state (#22C55E) |
| `--warning` | `oklch(0.75 0.15 85)` | `oklch(0.75 0.12 85)` | Warning state (#F59E0B) |
| `--destructive` | `oklch(0.58 0.22 27)` | `oklch(0.70 0.19 22)` | Error/Delete |

**Rules:**
- **No gradients** - Solid colors only
- **Contrast ratio >= 4.5:1** for text readability
- Use `--success` instead of hardcoded green
- Use `--warning` instead of hardcoded amber/orange

### Border Radius
Consistent border-radius throughout:
| Size | Value | Usage |
|------|-------|-------|
| `--radius-sm` | 0.375rem (6px) | Badges, small elements |
| `--radius-md` | 0.5rem (8px) | Buttons, inputs |
| `--radius-lg` | 0.625rem (10px) | Default (shadcn) |
| `--radius-xl` | 0.75rem (12px) | Cards, larger elements |
| `--radius-2xl` | 1rem (16px) | Modal, large containers |

**Current:** `--radius: 0.75rem` (global setting)

### Box Shadow
Subtle shadows for elevation:
```css
--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
```

### Typography
- Font: Inter Variable (via `@font-sans`)
- Consistent scale throughout

### Components Styling
- Cards: `rounded-xl` (12px) with `shadow-sm`
- Buttons: `rounded-md` (8px)
- Inputs: `rounded-md` (8px)
- Badges: `rounded-sm` (6px)
- Pill buttons: `rounded-full`
