# 🚀 OpsPilot — Autonomous AI DevOps & CI/CD Infrastructure Engine

[![Build Status](https://img.shields.io/badge/build-passing-emerald?style=for-the-badge&logo=docker)](https://github.com/abdul78-create/OpsPilot)
[![Engine](https://img.shields.io/badge/nest.js-10.x-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com)
[![Frontend](https://img.shields.io/badge/next.js-16.2.12-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Database](https://img.shields.io/badge/postgresql-16-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Queue](https://img.shields.io/badge/redis-7.x-DC382D?style=for-the-badge&logo=redis)](https://redis.io)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

**OpsPilot** is a commercial-grade, multi-tenant autonomous DevOps & CI/CD platform designed to automate code builds, integration testing, containerization, visual DAG workflows, live deployment rollouts, and real-time observability.

---

## 🌟 Core Features

- **⚡ Interactive Visual DAG Pipeline Builder**: Node-based workflow canvas (`@xyflow/react`) with Kahn's algorithm cycle detection, drag-and-drop palette (Trigger, Build, Test, Security, Approval Gate, Deploy, Health Check, Rollback), and bidirectional DAG-to-YAML compiler.
- **📜 Hardware-Accelerated XTerm.js Terminal**: WebGL 60 FPS streaming terminal supporting 50,000-line scrollback, line numbers, and live Server-Sent Events (`/v1/runs/:id/logs/stream`).
- **⚡ Isolated Docker Build Engine**: Automatically clones repositories, provisions ephemeral workspaces, and executes containerized build & test stages (`node:20` / custom images).
- **🔒 Production Webhook Verifier**: Strict HMAC-SHA256 signature verification (`X-Hub-Signature-256`) and Redis-backed idempotency protection (`SET EX NX 86400`) against duplicate webhook deliveries.
- **🔄 Automated Live Container Rollouts**: Auto-provisions target containers (`opspilot_app_target`) post-build, with HTTP 200 health check verification and automatic rollback.
- **🛡️ Multi-Tenant RBAC & Vault**: Tenant isolation (`x-organization-id`), AES-256-GCM secret vault encryption, JWT authentication, and structured logging secret redaction.
- **📊 Real-time Observability**: Built-in Prometheus telemetry scraper (`/v1/metrics/prometheus`) and System Health API (`/v1/metrics/system-health`).
- **💻 Modern Next.js 16 UI**: 230 prerendered static pages with dynamic Nginx UUID routing for run timelines, observability dashboards, team RBAC settings, and secrets management.

---

## 🏗 Architecture Overview

```text
                                ┌─────────────────────────┐
                                │     GitHub Webhook      │
                                └────────────┬────────────┘
                                             │ HMAC SHA-256 Signature
                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│              OpsPilot Production Nginx TLS Reverse Proxy (Port 443)    │
└────────────┬──────────────────────────────────────────────┬────────────┘
             │                                              │
             ▼ /v1/*                                        ▼ / (Static)
┌───────────────────────────┐                  ┌───────────────────────────┐
│     NestJS API Engine     │                  │  Next.js 16 UI Dashboard  │
│        (Port 3000)        │                  │     (230 Static Pages)    │
└─────┬─────────────────┬───┘                  └───────────────────────────┘
      │                 │
      ▼                 ▼
┌───────────┐     ┌───────────┐
│ PostgreSQL│     │   Redis   │ ──► BullMQ Job Queue
│  DB (16)  │     │ Store (7) │
└───────────┘     └─────┬─────┘
                        │
                        ▼
            ┌───────────────────────┐
            │ Docker Worker Engine  │
            │  (Isolated Execution) │
            └───────────┬───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │ Live App Target (8080)│
            │  (HTTP 200 Verified)  │
            └───────────────────────┘
```

---

## 🚀 Quickstart via Docker Compose

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Docker Compose v2+)
- Node.js 20+

### Step 1 — Clone & Launch Stack

```bash
git clone https://github.com/abdul78-create/OpsPilot.git
cd OpsPilot

# Build & launch all containers
docker compose up --build -d
```

### Step 2 — Verify Stack Health

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected output:
```text
NAMES                 STATUS
opspilot_frontend     Up (healthy)
opspilot_backend      Up (healthy)
opspilot_app_target   Up (healthy)
opspilot_postgres     Up (healthy)
opspilot_redis        Up (healthy)
```

### Step 3 — Access Web Dashboard
Open **`http://localhost`** in your browser to access the complete developer platform.

---

## 🌐 Phase 16 — Production Cloud Deployment Runbook

To deploy OpsPilot into any production cloud VM (AWS EC2, DigitalOcean, GCP, Hetzner, Azure):

```bash
# 1. SSH into cloud server
ssh root@<YOUR_SERVER_IP>

# 2. Clone repository
git clone https://github.com/abdul78-create/OpsPilot.git
cd OpsPilot

# 3. Configure production secrets & domain
cp .env.production.example .env.production
# Edit .env.production with your strong secrets, DB password, and domain (opspilot.ai)

# 4. Launch the Production Stack (Ports 80 & 443 with TLS reverse proxy)
docker compose -f docker-compose.prod.yml up -d --build

# 5. Execute the Automated Single-Command Cloud Launch Runbook
node scripts/cloud-launch-runbook.js
```

---

## 🧪 Verification & Audit Commands

```bash
# Full Backend Jest Test Suite (160/160 tests)
npm run test

# Visual DAG Pipeline Builder Audit (5/5 tests)
node scripts/verify-dag-builder.js

# Real-Time SSE Log Streaming Audit
node scripts/verify-sse-stream-v2.js

# Production Cloud Deploy & TLS Audit (5/5 checks)
node scripts/verify-cloud-deploy.js

# High-Throughput Concurrency & Rate Limiter Audit
node scripts/stress-test-concurrency.js
```

---

## 📚 Documentation Index

- [Architecture Deep-Dive](docs/ARCHITECTURE.md) — System architecture, module structure, and database schema
- [API Reference](docs/API_DOCUMENTATION.md) — Complete REST API endpoints documentation
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) — Production deployment instructions for Docker, Kubernetes, and Cloud VMs
- [Developer Guide](docs/DEVELOPER_GUIDE.md) — Local development, unit testing, and coding standards
- [Release Checklist](docs/RELEASE_CHECKLIST.md) — Verified production checklist & runtime evidence matrix

---

## 🔒 Security & SAIF Compliance

- **HMAC Signatures**: Webhook requests without valid `X-Hub-Signature-256` headers are strictly rejected (`HTTP 401`).
- **AES-256-GCM Vault**: Master symmetric encryption for repository access tokens and environment credentials.
- **Rate-Limiting**: Active `ThrottlerGuard` enforcing 100 req/min limit to prevent abuse (`HTTP 429`).
- **Secret Redactor**: Sensitive tokens and private keys are automatically redacted from all stdout/stderr logs.
- **State Reconciliation**: Startup scan reconciles orphaned `RUNNING` jobs following worker process restarts.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
