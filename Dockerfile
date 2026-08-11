# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run prisma:generate
RUN npm run build

# ── Stage 2: Production runner ────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install git, openssl, ca-certificates, curl, and docker.io
RUN apt-get update && apt-get install -y git openssl ca-certificates curl docker.io && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/prisma      ./prisma
COPY --from=builder /app/package.json ./package.json

# Entrypoint script: run migrations then start the server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER root

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
