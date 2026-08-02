# 🚀 OpsPilot — Autonomous AI DevOps & CI/CD Infrastructure Engine

[![Build Status](https://img.shields.io/badge/build-passing-emerald?style=for-the-badge&logo=docker)](https://github.com/opspilot/opspilot)
[![Engine](https://img.shields.io/badge/nest.js-10.x-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com)
[![Frontend](https://img.shields.io/badge/next.js-16.2.12-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![Database](https://img.shields.io/badge/postgresql-16-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Queue](https://img.shields.io/badge/redis-7.x-DC382D?style=for-the-badge&logo=redis)](https://redis.io)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

**OpsPilot** is a commercial-grade, multi-tenant autonomous DevOps & CI/CD platform designed to automate code builds, integration testing, containerization, live deployment rollouts, and real-time observability.

---

## 🌟 Core Features

- **⚡ Isolated Docker Build Engine**: Automatically clones repositories, provisions ephemeral workspaces, and executes containerized build & test stages (`node:20` / custom images).
- **🔒 Production Webhook Verifier**: Strict HMAC-SHA256 signature verification (`X-Hub-Signature-256`) and Redis-backed idempotency protection (`SET EX NX 86400`) against duplicate webhook deliveries.
- **🔄 Automated Live Container Rollouts**: Auto-provisions target containers (`opspilot_app_target`) post-build, with HTTP 200 health check verification.
- **📜 Live Log Persistence & SSE Streaming**: Real-time log tailing via Server-Sent Events (`EventSource`) with full stdout/stderr storage in PostgreSQL.
- **📊 Real-time Observability**: Built-in Prometheus telemetry scraper (`/v1/metrics/prometheus`) and System Health API (`/v1/metrics/system-health`).
- **🛡️ Tenant Isolation & Security**: Multi-tenant organization isolation (`x-organization-id`), JWT authentication, workspace path traversal protection, and secret redaction in logs.
- **💻 Modern Next.js 16 UI**: 216 prerendered static pages with dynamic Nginx UUID routing for run timelines, observability dashboards, team RBAC settings, and secrets management.

---

## 🏗 Architecture Overview

```text
                                ┌─────────────────────────┐
                                │     GitHub Webhook      │
                                └────────────┬────────────┘
                                             │ HMAC SHA-256 Signature
                                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   OpsPilot Nginx Reverse Proxy (Port 80)                │
└────────────┬──────────────────────────────────────────────┬────────────┘
             │                                              │
             ▼ /v1/*                                        ▼ / (Static)
┌───────────────────────────┐                  ┌───────────────────────────┐
│     NestJS API Engine     │                  │  Next.js 16 UI Shell      │
│        (Port 3000)        │                  │     (216 Static Pages)    │
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

### Step 1 — Clone & Launch Stack

```bash
git clone https://github.com/opspilot/opspilot.git
cd opspilot

# Build & launch all 5 containers
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

## 📚 Documentation Index

- [Architecture Deep-Dive](docs/ARCHITECTURE.md) — System architecture, module structure, and database schema
- [API Reference](docs/API_DOCUMENTATION.md) — Complete REST API endpoints documentation
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) — Production deployment instructions for Render, Docker, and Kubernetes
- [Developer Guide](docs/DEVELOPER_GUIDE.md) — Local development, unit testing, and coding standards
- [Release Checklist](docs/RELEASE_CHECKLIST.md) — Verified production checklist & runtime evidence matrix

---

## 🔒 Security & SAIF Compliance

- **HMAC Signatures**: Webhook requests without valid `X-Hub-Signature-256` headers are strictly rejected (`HTTP 401`).
- **Secret Redactor**: Environment keys and bearer tokens are automatically redacted from stdout logs.
- **Path Traversal Guard**: Ephemeral workspace directories are strictly validated to prevent directory escape attacks.
- **State Reconciliation**: Startup scan reconciles orphaned `RUNNING` jobs following worker process crashes.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
