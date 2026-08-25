# OpsPilot Production Cloud Deployment Blueprint: Render (Release Candidate)

> **Document Classification**: Production Deployment Architecture & Operations Runbook  
> **Target Cloud Platform**: [Render.com](https://render.com)  
> **Status**: Deployment-Ready / Release Candidate (Level 6 Verified)  
> **Security Protocol**: All production credentials, private keys, database passwords, and API keys are strictly parameterized as placeholders (`<PLACEHOLDER>`).

---

## 1. Executive Summary & Target Architecture

OpsPilot is engineered as a cloud-native, multi-tenant autonomous DevOps & AI SRE platform. This blueprint defines the exact, reproducible deployment of OpsPilot to Render cloud infrastructure.

```
                              ┌──────────────────────────────────────────────────────────┐
                              │                    GITHUB ECOSYSTEM                      │
                              │  • Push Events  • Webhooks (HMAC-SHA256)  • GitHub App   │
                              └────────────────────────────┬─────────────────────────────┘
                                                           │
                                           Public HTTPS Webhooks & API Traffic
                                                           │
                                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                  RENDER CLOUD RUNTIME                                                  │
│                                                                                                                        │
│   ┌───────────────────────────────────┐               ┌────────────────────────────────────────────────────────────┐   │
│   │       FRONTEND (Static Site)      │               │                  BACKEND API (Web Service)                 │   │
│   │   • Next.js 16 + React 19         │               │   • NestJS 10 REST API + Swagger                           │   │
│   │   • Monaco Editor & ReactFlow     │               │   • SSE Real-Time Log Streaming (/v1/runs/:id/logs/stream) │   │
│   │   • Static Export (`out/`)        │               │   • Webhook HMAC Router (/v1/webhooks/github)              │   │
│   │   • Global CDN                    │               │   • AI SRE RCA & Fix Engine                                │   │
│   └─────────────────┬─────────────────┘               └─────────────────────────────┬──────────────────────────────┘   │
│                     │                                                               │                                  │
│                     │ Client HTTPS Requests                                         │ Prisma ORM (Pool: 50)            │
│                     └───────────────────────────────────────────────┐               │                                  │
│                                                                     ▼               ▼                                  │
│   ┌───────────────────────────────────┐               ┌────────────────────────────────────────────────────────────┐   │
│   │       RENDER REDIS INSTANCE       │◄──────────────┤                RENDER POSTGRESQL 16 DATABASE               │   │
│   │   • Redis 7 / Upstash (TLS)       │  BullMQ Queue │   • Multi-Tenant Schema (Orgs, Projects, Runs, Jobs)       │   │
│   │   • BullMQ Queue Buffer           │  Idempotency  │   • Row-Level Organization & Project Scoping               │   │
│   │   • Distributed Lock (`SET EX NX`)│               │   • Automated Prisma Migrations (`prisma migrate deploy`)  │   │
│   └─────────────────▲─────────────────┘               └─────────────────────────────▲──────────────────────────────┘   │
│                     │                                                               │                                  │
│                     │ BullMQ `PIPELINE_RUN_QUEUE` Worker Connection                 │ Prisma Status Updates            │
│                     └───────────────────────────────────────────────┐               │                                  │
│                                                                     ▼               ▼                                  │
│                                                       ┌────────────────────────────────────────────────────────────┐   │
│                                                       │             WORKER SERVICE (Background Worker)             │   │
│                                                       │   • Pipeline Run Processor (Parallel DAG Matrix)           │   │
│                                                       │   • Multi-Tenant Workspace Manager                         │   │
│                                                       │   • Process Runner (`RUNNER_DRIVER=process`)               │   │
│                                                       │   • Crash Recovery & Lease Startup Reconciliation          │   │
│                                                       └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Render Services Specification

To run OpsPilot on Render, create the following **5 interconnected services**:

| # | Service Name | Render Service Type | Source Directory | Runtime / Environment | Plan Recommendation |
|---|--------------|---------------------|------------------|-----------------------|---------------------|
| 1 | `opspilot-db` | **PostgreSQL** | N/A | PostgreSQL 16 | Starter / Standard ($7+/mo) |
| 2 | `opspilot-redis` | **Redis** | N/A | Redis 7.2 (or Upstash Redis) | Starter ($7+/mo) |
| 3 | `opspilot-backend` | **Web Service** | `/` (Root) | Docker | Starter / Standard ($7+/mo) |
| 4 | `opspilot-worker` | **Background Worker**| `/` (Root) | Docker | Starter / Standard ($7+/mo) |
| 5 | `opspilot-frontend`| **Static Site** | `frontend` | Static Site (Node 20) | Free |

---

## 3. Detailed Service Configuration Matrix

### 3.1. Database: `opspilot-db` (Render PostgreSQL)
- **Database Name**: `opspilot_production`
- **User**: `opspilot_admin`
- **PostgreSQL Version**: `16`
- **Connection String**: Render automatically generates internal connection string:
  `postgres://<DB_USER>:<DB_PASSWORD>@<DB_HOST>/<DB_NAME>`

### 3.2. Redis: `opspilot-redis` (Render Redis or Upstash)
- **Max Memory Policy**: `noeviction` (required for BullMQ queue durability)
- **Connection String**:
  `rediss://<REDIS_USER>:<REDIS_PASSWORD>@<REDIS_HOST>:<REDIS_PORT>`

### 3.3. Backend API: `opspilot-backend` (Web Service)
- **Environment**: `Docker`
- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `.` (Workspace Root)
- **Health Check Path**: `/v1/health`
- **Auto-Deploy**: `Yes`
- **Port**: Handled automatically via `$PORT` (Render binds to port 10000)
- **Pre-Deploy / Startup Command**: Handled by [docker-entrypoint.sh](file:///c:/Users/Abdul/Desktop/Ai%20Devops/docker-entrypoint.sh) which runs `npx prisma migrate deploy` followed by `node dist/main`.

### 3.4. Background Worker: `opspilot-worker` (Background Worker)
- **Environment**: `Docker`
- **Dockerfile Path**: `./Dockerfile`
- **Docker Context**: `.` (Workspace Root)
- **Start Command Override**: `node dist/main`
- **Execution Driver**: `RUNNER_DRIVER=process` (executes repository builds natively in container workspace without requiring root Docker socket).

### 3.5. Frontend: `opspilot-frontend` (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm ci --legacy-peer-deps && npm run build`
- **Publish Directory**: `out`
- **Routing Rules**:
  - `/*` → `/index.html` (for SPA client-side routing)

---

## 4. Environment Variables & Secrets Reference

> [!CAUTION]
> **Zero-Trust Security Rule**: Never commit plaintext credentials to Git. Enter these values directly into the Render Dashboard under **Environment Variables**.

### 4.1. Backend Web Service (`opspilot-backend`)

| Variable Name | Required | Default / Format | Description |
|---------------|----------|------------------|-------------|
| `NODE_ENV` | **YES** | `production` | Production environment flag |
| `PORT` | **YES** | `10000` (Render-assigned) | HTTP listening port |
| `DATABASE_URL` | **YES** | `postgres://<USER>:<PASS>@<HOST>/<DB>?sslmode=require` | PostgreSQL connection pool URL |
| `REDIS_URL` | **YES** | `rediss://<USER>:<PASS>@<HOST>:<PORT>` | Redis connection string for BullMQ & cache |
| `JWT_SECRET` | **YES** | `<MIN_32_CHAR_RANDOM_SECRET>` | HMAC-SHA256 secret for authentication tokens |
| `JWT_EXPIRATION` | **YES** | `7d` | Access token lifespan |
| `ENCRYPTION_KEY` | **YES** | `<64_HEX_CHARACTERS_32_BYTES>` | AES-256-GCM master key for customer secrets |
| `GITHUB_APP_ID` | OPTIONAL | `<GITHUB_APP_ID>` | GitHub App ID for live repository integrations |
| `GITHUB_APP_PRIVATE_KEY`| OPTIONAL| `<PEM_FORMAT_PRIVATE_KEY>` | GitHub App RSA Private Key |
| `GITHUB_WEBHOOK_SECRET` | **YES** | `<WEBHOOK_SECRET>` | HMAC-SHA256 webhook validation secret |
| `GEMINI_API_KEY` | OPTIONAL | `<GEMINI_AI_API_KEY>` | Google Gemini API key for automated RCA & AI fixes |
| `ENABLE_SWAGGER` | OPTIONAL | `true` | Exposes OpenAPI documentation at `/docs` |
| `CORS_ORIGIN` | **YES** | `https://opspilot-frontend.onrender.com` | Allowed frontend origins (or `*`) |

### 4.2. Worker Service (`opspilot-worker`)

| Variable Name | Required | Value | Description |
|---------------|----------|-------|-------------|
| `NODE_ENV` | **YES** | `production` | Production environment flag |
| `DATABASE_URL` | **YES** | `<DATABASE_URL>` | Shared PostgreSQL database URL |
| `REDIS_URL` | **YES** | `<REDIS_URL>` | Shared Redis BullMQ broker URL |
| `ENCRYPTION_KEY` | **YES** | `<ENCRYPTION_KEY>` | Master secret decryption key |
| `RUNNER_DRIVER` | **YES** | `process` | Native workspace process execution |
| `RUNNER_MEMORY_LIMIT`| OPTIONAL | `2g` | Memory allocation clamp per job |
| `RUNNER_CPU_LIMIT` | OPTIONAL | `2.0` | CPU allocation clamp per job |
| `RUNNER_PIDS_LIMIT`| OPTIONAL | `200` | Process fork limit per job |

### 4.3. Frontend Static Site (`opspilot-frontend`)

| Variable Name | Required | Value | Description |
|---------------|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | **YES** | `https://<BACKEND_SERVICE_NAME>.onrender.com/v1` | Public URL of the Backend API |

---

## 5. Deployment Step-by-Step Runbook

### Phase 1: Provision Managed Data Stores
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **PostgreSQL**:
   - Name: `opspilot-db`
   - Database: `opspilot_production`
   - User: `opspilot_admin`
   - Region: `Oregon (US West)` (or your preferred region; keep all services in the same region).
   - Click **Create Database**.
   - Copy the **Internal Database URL**.
3. Click **New +** → **Redis**:
   - Name: `opspilot-redis`
   - Maxmemory Policy: `noeviction`
   - Click **Create Redis**.
   - Copy the **Internal Redis URL**.

### Phase 2: Deploy Backend Web Service
1. Click **New +** → **Web Service** → Connect your GitHub repository (`abdul78-create/OpsPilot`).
2. Configure settings:
   - **Name**: `opspilot-backend`
   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Context Directory**: `.`
   - **Health Check Path**: `/v1/health`
3. Add Environment Variables (from Section 4.1):
   - `DATABASE_URL` = `<Internal Database URL from Phase 1>`
   - `REDIS_URL` = `<Internal Redis URL from Phase 1>`
   - `JWT_SECRET` = Generate with `openssl rand -hex 32`
   - `ENCRYPTION_KEY` = Generate with `openssl rand -hex 32`
   - `GITHUB_WEBHOOK_SECRET` = Generate with `openssl rand -hex 24`
   - `NODE_ENV` = `production`
4. Click **Create Web Service**.
5. Observe deployment logs:
   - Verifies `npx prisma migrate deploy` completes cleanly.
   - Verifies NestJS bootstrap logs `Nest application successfully started`.
   - Copy the assigned backend public URL: `https://opspilot-backend.onrender.com`.

### Phase 3: Deploy Background Worker
1. Click **New +** → **Background Worker** → Connect your GitHub repository.
2. Configure settings:
   - **Name**: `opspilot-worker`
   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Start Command**: `node dist/main`
3. Add Environment Variables (from Section 4.2):
   - `DATABASE_URL` = `<Internal Database URL>`
   - `REDIS_URL` = `<Internal Redis URL>`
   - `ENCRYPTION_KEY` = `<Same Encryption Key as Backend>`
   - `RUNNER_DRIVER` = `process`
   - `NODE_ENV` = `production`
4. Click **Create Background Worker**.

### Phase 4: Deploy Frontend Static Site
1. Click **New +** → **Static Site** → Connect your GitHub repository.
2. Configure settings:
   - **Name**: `opspilot-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci --legacy-peer-deps && npm run build`
   - **Publish Directory**: `out`
3. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://opspilot-backend.onrender.com/v1`
4. Click **Create Static Site**.
5. Copy the assigned frontend public URL: `https://opspilot-frontend.onrender.com`.

### Phase 5: Connect GitHub Webhooks
1. In your GitHub repository settings, navigate to **Webhooks** → **Add webhook**:
   - **Payload URL**: `https://opspilot-backend.onrender.com/v1/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: `<GITHUB_WEBHOOK_SECRET>` (configured in Phase 2)
   - **Events**: Select `Just the push event` (or `Send me everything`)
   - **Active**: Checked
2. Click **Add webhook**.

---

## 6. Post-Deployment Verification Checklist

Execute these 5 live smoke tests once Render services report green:

### Test 1: Public Health Probe
```bash
curl -i https://opspilot-backend.onrender.com/v1/health
```
**Expected Response**: `HTTP/1.1 200 OK`, `{"status":"ok","info":{"database":{"status":"up"},"redis":{"status":"up"}}}`

### Test 2: Prometheus Telemetry Scrape
```bash
curl -i https://opspilot-backend.onrender.com/v1/metrics/prometheus
```
**Expected Response**: `HTTP/1.1 200 OK`, Prometheus metrics format including `opspilot_builds_total` and `opspilot_http_requests_total`.

### Test 3: OpenAPI Swagger UI
Navigate in browser to: `https://opspilot-backend.onrender.com/docs`
**Expected Response**: Interactive Swagger documentation rendered with all v1 endpoints.

### Test 4: Frontend UI Navigation
Navigate in browser to: `https://opspilot-frontend.onrender.com`
**Expected Response**: Dashboard loaded, connecting cleanly to `/v1` backend without CORS errors.

### Test 5: Live GitHub Push Webhook
Push a commit to your linked repository or click **Redeliver** on GitHub webhook settings.
**Expected Response**: Webhook delivery status `200 OK`, execution visible in OpsPilot runs dashboard.

---

## 7. Rollback & Disaster Recovery Procedures

### 7.1. Instant Service Rollback (Render UI)
1. Go to `opspilot-backend` (or `opspilot-frontend`) in the Render Dashboard.
2. Navigate to the **Deploys** tab.
3. Locate the last known good deployment.
4. Click the three dots `...` → **Rollback to this deploy**.

### 7.2. Database Point-in-Time Recovery
1. Go to `opspilot-db` in the Render Dashboard.
2. Select **Backups** tab.
3. Select the target snapshot and click **Restore**.

---

## 8. Capability & Infrastructure Scope Summary

| Platform Capability | Native on Render | Implementation Details |
|---------------------|------------------|------------------------|
| **Multi-Tenant REST API** | **YES** | Deployed as Render Web Service |
| **PostgreSQL 16 Database** | **YES** | Managed Render PostgreSQL |
| **Redis 7.2 / BullMQ** | **YES** | Managed Render Redis / Upstash |
| **Next.js 16 Web Dashboard** | **YES** | Render Static Site with global CDN |
| **GitHub Webhook Ingestion** | **YES** | Public HTTPS endpoint with HMAC validation |
| **SSE Log Streaming** | **YES** | Supported natively over Render HTTPS |
| **Prometheus & Observability** | **YES** | Scraped via `/v1/metrics/prometheus` |
| **AI SRE RCA & Remediation** | **YES** | In-process via Google Gemini API |
| **Repository Process Runner** | **YES** | `RUNNER_DRIVER=process` in Worker container |
| **Raw Docker-in-Docker Daemon** | External / Hybrid | Standard Render containers run in unprivileged cgroups. Standard builds (npm, tsc, python, tests) execute via process runner; pipelines requiring nested Docker container image builds utilize external Docker host or remote builder. |

---

*OpsPilot Engineering Team — Commercial SaaS Release Candidate*
