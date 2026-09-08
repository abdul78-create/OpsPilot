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

## 🛠️ Technology Stack

### Languages

| Language | Where Used |
|---|---|
| **TypeScript** | Entire backend (`src/`) and frontend (`frontend/src/`) — primary language |
| **JavaScript** | 33+ E2E, chaos, load, and acceptance test scripts (`scripts/`) |
| **SQL** | Prisma migrations and database seed files |
| **YAML** | Pipeline definitions, Docker Compose, GitHub Actions CI |
| **Bash / Shell** | Startup, cloud bootstrap, and migration scripts |
| **Prisma SDL** | `prisma/schema.prisma` — ORM schema definition |

---

### Backend (`src/`)

#### Runtime & Framework
| Technology | Version / Notes |
|---|---|
| **Node.js** | v20 (runtime) |
| **NestJS** | v10 — modular backend framework (24 feature modules) |
| **Express** | Underlying HTTP adapter via `@nestjs/platform-express` |
| **TypeScript** | v5.3 |

#### Database & ORM
| Technology | Notes |
|---|---|
| **PostgreSQL** | v16 — primary relational database |
| **Prisma ORM** | v5.9 — schema, migrations, Prisma Client |

#### Queue & Caching
| Technology | Notes |
|---|---|
| **BullMQ** | v6 — distributed job queue for pipeline runs |
| **Redis** | v7 — BullMQ backend + idempotency cache |
| **ioredis** | Node.js Redis client |

#### Authentication & Security
| Technology | Notes |
|---|---|
| **Passport.js** | Auth middleware |
| **passport-jwt** | JWT Bearer strategy |
| **passport-google-oauth20** | Google OAuth 2.0 SSO |
| **passport-github2** | GitHub OAuth SSO |
| **@nestjs/jwt** | JWT signing and verification |
| **argon2** | Password hashing (native module — requires build toolchain) |
| **AES-256-GCM** | Secrets vault encryption (Node.js `crypto` built-in) |
| **HMAC-SHA256** | Webhook signature verification |
| **Helmet** | HTTP security headers |
| **@nestjs/throttler** | Rate limiting (100 req/min) |

#### AI / LLM Integration
| Technology | Notes |
|---|---|
| **Google Gemini API** | Primary AI provider for pipeline generation, RCA, risk scoring |
| **OpenAI API** | Optional secondary AI provider |
| **Rule-based AI** | Deterministic fallback when no LLM key is configured |

#### Logging & Observability
| Technology | Notes |
|---|---|
| **Pino** | Structured JSON logging |
| **nestjs-pino** | NestJS Pino integration |
| **Server-Sent Events (SSE)** | Real-time log streaming to frontend |
| **@nestjs/event-emitter** | Internal event bus |
| **@nestjs/terminus** | Health check endpoints |

#### API & Validation
| Technology | Notes |
|---|---|
| **@nestjs/swagger** | v7 — OpenAPI/Swagger docs (auto-generated) |
| **class-validator** | DTO validation |
| **class-transformer** | DTO serialization |
| **Joi** | Config schema validation |

#### Pipeline Runner
| Technology | Notes |
|---|---|
| **Docker** | Ephemeral container execution engine — each job runs in an isolated container |
| **kubectl** | Kubernetes deployment commands generated in pipeline YAML |
| **js-yaml** | Runtime YAML parsing in job executor |

#### Feature Modules
| Module | Responsibility |
|---|---|
| `ai-orchestration` | AI pipeline generation, RCA, risk scoring, security audit |
| `pipelines` | Pipeline definitions, YAML compiler, version management |
| `runs` | Pipeline run orchestration and state machine |
| `deployments` | Kubernetes deployment records and rollouts |
| `worker` | Docker job executor and pipeline runner |
| `repositories` | Git repo scanner (language & stack detection) |
| `environments` | Staging/Production environment management |
| `secrets` | AES-256 encrypted secret storage |
| `auth` | JWT + OAuth authentication flows |
| `organizations` / `users` | Multi-tenant RBAC |
| `billing` | Subscription management |
| `observability` / `slo` | Metrics, SLO tracking |
| `incidents` / `alerts` | Incident management |
| `audit-logs` | Full audit trail |
| `flaky-tests` | Flaky test detection and tracking |

---

### Frontend (`frontend/`)

#### Runtime & Framework
| Technology | Version / Notes |
|---|---|
| **React** | v19 |
| **Next.js** | v16.2 — App Router with 26+ route segments |
| **TypeScript** | v5 |

#### UI & Styling
| Technology | Notes |
|---|---|
| **Tailwind CSS** | v4 — utility-first styling |
| **CSS Custom Properties** | Design token system for dark mode and theming in `globals.css` |
| **class-variance-authority** | Variant-based component styling |
| **tailwind-merge** + **clsx** | Conditional class merging utilities |

#### Visual Pipeline Builder
| Technology | Notes |
|---|---|
| **@xyflow/react** | v12 — Interactive node-based DAG canvas (React Flow) |
| **DAGCompiler** | Custom TypeScript YAML compiler (`DAGCompiler.ts`) |
| **Monaco Editor** | `@monaco-editor/react` — in-browser code editor for YAML/Shell |
| **Custom Node Types** | Source, Build, Test, Security, Deploy, Health, Approval, Rollback, Notification |

#### Data Fetching & State
| Technology | Notes |
|---|---|
| **TanStack Query (React Query)** | v5 — server state management and caching |
| **Fetch API** | Native HTTP client in `apiClient.ts` |

#### Terminal & Visualization
| Technology | Notes |
|---|---|
| **xterm.js** | `@xterm/xterm` v6 — in-browser terminal with WebGL rendering |
| **@xterm/addon-fit** | Auto-resize addon |
| **Recharts** | v3 — Observability and metrics charts |

#### UX Components
| Technology | Notes |
|---|---|
| **cmdk** | Command palette (⌘K) |
| **react-resizable-panels** | Resizable layout panels |
| **lucide-react** | Icon library |
| **Nginx** | Static file serving in Docker |

---

### Infrastructure & DevOps

#### Containerization
| Technology | Notes |
|---|---|
| **Docker** | Multi-stage Dockerfiles for backend and frontend |
| **Docker Compose** | `docker-compose.yml` (dev) + `docker-compose.prod.yml` (prod) |
| **Nginx** | Reverse proxy + static frontend serving + TLS termination |

#### CI/CD & Code Quality
| Technology | Notes |
|---|---|
| **GitHub Actions** | Automated CI pipelines (`.github/`) |
| **Husky** | Pre-commit hooks |
| **lint-staged** | Lint on staged files only |
| **ESLint** | v8 (backend) / v9 (frontend) |
| **Prettier** | v3 — consistent code formatting |

#### Testing
| Technology | Notes |
|---|---|
| **Jest** | v29 — unit and integration tests |
| **ts-jest** | TypeScript Jest transformer |
| **Supertest** | HTTP integration testing |
| **Custom E2E scripts** | 33 Node.js scripts: golden-path, chaos, load, acceptance, DR |

#### Cloud & Deployment
| Technology | Notes |
|---|---|
| **Render** | Cloud hosting for live backend + frontend |
| **Kubernetes** | Deployment targets in generated pipeline YAML |
| **Let's Encrypt / Certbot** | TLS certificates for production |

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
