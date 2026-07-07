# Production image for apps/api (NestJS), built from the repo root:
#   docker build -f apps/api/Dockerfile .
#
# Multi-stage build:
#   1. pruner  - turbo prune computes the minimal monorepo subset apps/api
#                actually needs (its own source + any workspace deps it
#                declares, e.g. packages/shared once it's wired in).
#   2. builder - installs deps for that subset, generates the Prisma
#                client, compiles the app, then `pnpm deploy --prod`
#                produces a flat, production-only, self-contained package.
#   3. runner  - copies just that self-contained package into a clean
#                base image and runs it.
#
# Database migrations are intentionally NOT run here. Configure
# `npx prisma migrate deploy` as Render's Pre-Deploy Command instead,
# so it runs against the built image right before traffic switches over.

FROM node:22-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo prune api --docker

FROM base AS builder

# turbo.json isn't part of the pruned output, but `turbo run build` needs it.
COPY turbo.json turbo.json

# Install deps for the pruned workspace first (cached while lockfile/package.json
# are unchanged). --ignore-scripts because apps/api's postinstall runs
# `prisma generate`, which needs prisma/schema.prisma - not copied yet at this point.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --ignore-scripts

# Now bring in the real source (including prisma/schema.prisma) and build.
COPY --from=pruner /app/out/full/ .

RUN pnpm --filter api exec prisma generate
RUN pnpm exec turbo run build --filter=api

# Self-contained, production-only output: resolved node_modules with just
# `dependencies` (no devDependencies, no other workspace apps).
#
# --legacy: by default (pnpm v10+) `pnpm deploy` only works for workspaces
# with "inject-workspace-packages=true" set (needed for its newer
# hardlink/symlink-based deploy mode); without that setting it fails with
# ERR_PNPM_DEPLOY_NONINJECTED_WORKSPACE. --legacy falls back to the older
# implementation (a plain --prod install into the target dir), which needs
# no extra workspace config and works regardless of whether shared workspace
# deps get injected later.
#
# --ignore-scripts: `pnpm deploy` reinstalls from scratch in the target dir,
# which would re-run apps/api's `postinstall` (prisma generate) a second
# time. In this musl/arm64 image that second, implicit run has been
# observed to silently produce a client with no query-engine binary
# (client "did not initialize" at runtime) - so scripts are skipped here
# and `prisma generate` is run once more, explicitly, right after.
RUN pnpm --ignore-scripts --filter api deploy --prod --legacy /app/deploy
RUN cd /app/deploy && /app/deploy/node_modules/.bin/prisma generate

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/deploy .

USER node

# Documentation only - Render ignores EXPOSE and detects the port the
# process actually binds via the PORT env var it injects (see main.ts).
EXPOSE 3000

CMD ["node", "dist/main.js"]
