# 07nghiep

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **tRPC** - End-to-end type-safe APIs
- **Node.js** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Prisma.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply migrations and generate the Prisma client:

```bash
pnpm db:start
pnpm db:migrate
pnpm db:generate
```

Then run the services you need:

```bash
pnpm dev:server
pnpm dev:candidate
pnpm dev:employer
pnpm dev:admin
```

The API is running at [http://localhost:3000](http://localhost:3000).
The Vite apps run on their configured dev-server ports.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and the app-level `components.json` files.

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
pnpm dlx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@07nghiep/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from the target app, such as `apps/admin`, `apps/candidate`, or `apps/employer`.

## Project Structure

```
07nghiep/
├── apps/
│   ├── admin/           # Admin dashboard (React + Vite)
│   ├── candidate/       # Candidate portal (React + Vite)
│   ├── employer/        # Employer portal (React + Vite)
│   └── server/          # Backend API (Hono + tRPC)
├── packages/
│   ├── auth/            # Better Auth configuration
│   ├── config/          # TypeScript & ESLint configs
│   ├── db/              # Prisma schema & database utilities
│   ├── env/             # Environment variable validation
│   └── ui/              # Shared shadcn/ui components
├── turbo.json           # Turborepo build configuration
├── package.json         # Workspace root
└── pnpm-workspace.yaml  # pnpm workspace config
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:admin`: Start only the admin dashboard
- `pnpm run dev:candidate`: Start only the candidate portal
- `pnpm run dev:employer`: Start only the employer portal
- `pnpm run dev:server`: Start only the server
- `pnpm run test`: Run automated tests
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:start`: Start local PostgreSQL
- `pnpm run db:push`: Push schema changes to database in development
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI

## Verification

```bash
pnpm install
pnpm db:start
pnpm db:migrate
pnpm db:generate
pnpm test
pnpm check-types
pnpm build
```
