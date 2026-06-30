# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS builder

WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:password@localhost:5432/07nghiep

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/candidate/package.json apps/candidate/package.json
COPY apps/employer/package.json apps/employer/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/ai-cv/package.json packages/ai-cv/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/prisma.config.ts packages/db/prisma.config.ts
COPY packages/db/prisma packages/db/prisma

RUN pnpm install --frozen-lockfile

COPY . .

ARG APP_FILTER=@07nghiep/server
ARG APP_NAME=server
RUN pnpm --filter ${APP_FILTER} build \
  && pnpm deploy --legacy --filter ${APP_FILTER} --prod /out-migrate \
  && pnpm deploy --legacy --filter ${APP_FILTER} --prod --no-optional /out \
  && cp -R apps/${APP_NAME}/dist /out-migrate/dist \
  && cp -R apps/${APP_NAME}/dist /out/dist \
  && PRISMA_DIR="$(find /out-migrate/node_modules/.pnpm -maxdepth 1 -type d -name 'prisma@*' | head -1)" \
  && if [ -n "${PRISMA_DIR}" ]; then ln -s ".pnpm/$(basename "${PRISMA_DIR}")/node_modules/prisma" /out-migrate/node_modules/prisma; fi

RUN cp -a /out /out-runtime \
  && rm -f /out-runtime/node_modules/prisma \
  && rm -f /out-runtime/node_modules/.pnpm/@prisma+client@*/node_modules/prisma \
  && rm -f /out-runtime/node_modules/.pnpm/@prisma+client@*/node_modules/typescript \
  && find /out-runtime/node_modules/.pnpm -maxdepth 1 -type d \( \
    -name "prisma@*" -o \
    -name "@prisma+dev@*" -o \
    -name "@prisma+studio-core@*" -o \
    -name "@electric-sql+pglite-tools@*" -o \
    -name "@electric-sql+pglite@*" -o \
    -name "@tanstack+react-start@*" -o \
    -name "@tanstack+react-start-rsc@*" -o \
    -name "@tanstack+router-plugin@*" -o \
    -name "@tanstack+start-plugin-core@*" -o \
    -name "@rolldown+*" -o \
    -name "@rollup+*" -o \
    -name "@esbuild+*" -o \
    -name "lightningcss*" -o \
    -name "msw@*" -o \
    -name "prettier@*" -o \
    -name "rollup@*" -o \
    -name "vite@*" -o \
    -name "vitest@*" -o \
    -name "typescript@*" \
  \) -exec rm -rf {} + \
  && find /out-runtime/node_modules -type f \( \
    -name "*.map" -o \
    -name "*.d.ts" -o \
    -name "*.d.mts" \
  \) -delete \
  && find /out-runtime/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/runtime -type f \( \
    -name "*cockroachdb*" -o \
    -name "*mysql*" -o \
    -name "*sqlite*" -o \
    -name "*sqlserver*" \
  \) -delete

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /out-runtime /app

ARG APP_NAME=server
ENV APP_NAME=${APP_NAME}

USER node

CMD ["node", "dist/index.mjs"]

FROM node:24-alpine AS migrate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /out-migrate /app

CMD ["node", "dist/index.mjs"]

FROM runner AS default
