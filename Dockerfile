# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN apk add --no-cache python3 make g++ openssl
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --production --legacy-peer-deps

# ── Stage 2: Production runner ────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install git (workspace cloning), openssl (Prisma), and docker-cli (containerized runner)
RUN apk add --no-cache git openssl docker-cli

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist        ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma      ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Entrypoint script: run migrations then start the server
COPY --chown=nestjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
