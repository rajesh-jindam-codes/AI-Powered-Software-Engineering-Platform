# =========================================================================
# Multi-stage Hardened Dockerfile for DevFlow Core API (NestJS Monolith)
# =========================================================================

# Stage 1: Base Alpine Image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat wget
ENV NODE_ENV=production

# Stage 2: Workspace Dependencies
FROM base AS deps
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/event-schemas/package.json ./packages/event-schemas/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
RUN npm ci

# Stage 3: Monorepo Build
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@devflow/shared-types
RUN npm run build --workspace=@devflow/event-schemas
RUN npm run build --workspace=@devflow/api
RUN npm prune --production

# Stage 4: Production Minimal Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Security: Non-root user
RUN addgroup --system --gid 1001 devflow && \
    adduser --system --uid 1001 --ingroup devflow devflow

# Copy production artifacts
COPY --from=builder --chown=devflow:devflow /app/node_modules ./node_modules
COPY --from=builder --chown=devflow:devflow /app/packages ./packages
COPY --from=builder --chown=devflow:devflow /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=devflow:devflow /app/apps/api/package.json ./apps/api/package.json

USER devflow
EXPOSE 4000

# Built-in Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "apps/api/dist/src/main.js"]
