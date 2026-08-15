# OPSPILOT DEVELOPER & CONTRIBUTOR GUIDE
Version 1.0.0 · Last Updated: August 2026

---

## 1. Local Development Setup

### System Requirements
- Node.js 20.x LTS or higher
- npm 10.x+
- Docker Engine & Docker Compose

### Step 1 — Install Root & Sub-project Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2 — Start Infrastructure Dependencies (Database & Cache)

```bash
# Launch local PostgreSQL (5432) and Redis (6379)
docker compose up -d postgres redis
```

### Step 3 — Run Database Migrations & Prisma Seed

```bash
npx prisma db push
npx prisma db seed
```

### Step 4 — Launch Development Servers

```bash
# Terminal 1 — NestJS Backend API Engine (Port 3000)
npm run start:dev

# Terminal 2 — Next.js Frontend Dev Server (Port 3001)
npm --prefix frontend run dev
```

---

## 2. Running Automated Tests & Verification

### Unit & Service Integration Tests

```bash
# Run NestJS unit and integration test suite
npm run test

# Run specific test file
npx jest src/v1/modules/webhooks/controllers/webhooks.controller.spec.ts
```

### Security & Positive/Negative Test Suite

```bash
# Test HMAC security verification (positive + negative)
npx jest src/v1/modules/webhooks/services/hmac-verifier.service.spec.ts

# Test OpenTelemetry tracing propagation
npx jest src/core/context/opentelemetry-tracing.integration.spec.ts
```

### Build Verification Command

```bash
# Test frontend static export & TypeScript compilation
npm --prefix frontend run build
```

---

## 3. Database Schema Modification Guidelines

When adding or updating Prisma schema models:

1. Edit `prisma/schema.prisma`
2. Run database push:
   ```bash
   npx prisma db push
   ```
3. Generate updated Prisma Client types:
   ```bash
   npx prisma generate
   ```

---

## 4. Engineering Standards & Code Style

- **Strict Evidence Levels**: Never claim a feature is complete without runtime evidence (exit codes, database records, HTTP 200 responses).
- **Security First**: Every authentication, authorization, or encryption feature must include both positive and negative automated tests.
- **Recovery Rule**: Workers and state machine services must implement crash reconciliation for orphaned jobs.
- **Path Traversal Protection**: Any file operations touching workspaces must resolve and validate absolute target paths.
