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
  && pnpm deploy --legacy --filter ${APP_FILTER} --prod /out \
  && cp -R apps/${APP_NAME}/dist /out/dist \
  && PRISMA_DIR="$(find /out/node_modules/.pnpm -maxdepth 1 -type d -name 'prisma@*' | head -1)" \
  && if [ -n "${PRISMA_DIR}" ]; then ln -s ".pnpm/$(basename "${PRISMA_DIR}")/node_modules/prisma" /out/node_modules/prisma; fi

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /out /app

ARG APP_NAME=server
ENV APP_NAME=${APP_NAME}

CMD ["node", "dist/index.mjs"]
