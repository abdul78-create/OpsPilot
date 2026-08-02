# OPSPILOT ARCHITECTURE DEEP-DIVE
Version 1.0.0 · Last Updated: August 2026

---

## 1. Executive System Overview

OpsPilot is engineered as a decoupled, multi-tenant CI/CD & DevOps automation platform. The architecture separates the control plane (API Engine & Event Bus), execution plane (BullMQ Worker & Docker Engine), and presentation plane (Next.js SSG + Nginx Proxy).

---

## 2. Core Subsystems

### A. Presentation Layer (Next.js 16 + Nginx)
- **Static Export**: 216 static pages generated via `output: 'export'` for zero-latency CDN delivery.
- **Dynamic Routing Fallback**: Nginx handles dynamic run URLs (`/runs/<uuid>` and `/runs/run_*`) via location regex fallback to `/runs/shell.html`.
- **API Proxy**: Nginx routes all `/v1/*` requests to the NestJS backend on port 3000.

### B. Control Plane (NestJS Engine)
- **`AuthModule`**: Passport JWT authentication & password hashing via `bcrypt`.
- **`OrganizationsModule`**: Tenant context extraction (`x-organization-id`) and RBAC membership management.
- **`PipelinesModule`**: Pipeline definition CRUD, versioning, and YAML checksum hashing.
- **`RunsModule`**: Execution state machine transitions (`QUEUED → RUNNING → SUCCESS / FAILED`).
- **`WebhooksModule`**: GitHub webhook receiver, HMAC-SHA256 signature verifier, and Redis delivery deduplication.

### C. Execution Plane (BullMQ + Docker Engine)
- **`WorkerModule`**: Distributed queue processing powered by Redis 7.
- **`WorkspaceManagerService`**: Ephemeral workspace creation in `/opspilot-workspaces/<runId>` with automatic post-run cleanup.
- **`JobExecutorService`**: Executes build & test commands inside isolated `node:20` containers with seccomp security profiles.
- **`DeploymentRunnerService`**: Launches live target containers (`opspilot_app_target`) and performs HTTP GET `/health` verification.

### D. Observability & Telemetry Subsystem
- **`LogsService`**: Stores stdout/stderr in PostgreSQL and broadcasts via SSE streams (`/v1/pipeline-runs/:id/logs/stream`).
- **`ObservabilityModule`**: Exposes Prometheus metrics scraper (`/v1/metrics/prometheus`) and System Health summary (`/v1/metrics/system-health`).

---

## 3. Data Flow Diagram

```text
 ┌───────────────┐     1. Webhook      ┌──────────────────┐
 │  GitHub API   │ ──────────────────► │ WebhooksModule   │
 └───────────────┘                     └────────┬─────────┘
                                                │ 2. Verify HMAC & Redis Idempotency
                                                ▼
                                       ┌──────────────────┐
                                       │  Prisma / Postgres│ (Create PipelineRun & Jobs)
                                       └────────┬─────────┘
                                                │ 3. Enqueue Job
                                                ▼
                                       ┌──────────────────┐
                                       │ Redis / BullMQ   │
                                       └────────┬─────────┘
                                                │ 4. Process Job
                                                ▼
                                       ┌──────────────────┐
                                       │ PipelineWorker   │
                                       └────────┬─────────┘
                                                │ 5. Execute Docker Step
                                                ▼
                                       ┌──────────────────┐
                                       │ Docker Engine    │ (node:20)
                                       └────────┬─────────┘
                                                │ 6. Auto-Deploy on SUCCESS
                                                ▼
                                       ┌──────────────────┐
                                       │ App Target (8080)│ (HTTP 200 OK Verified)
                                       └──────────────────┘
```

---

## 4. Database Schema (Prisma ERD Highlights)

- **`User`**: User identity, email, password hash, timestamp metadata.
- **`Organization`**: Tenant boundary, slug, status, billing metadata.
- **`OrganizationMember`**: Join model for User ↔ Organization with `Role` enum (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **`Project`**: Organization scoped repository container.
- **`PipelineDefinition`**: Pipeline metadata, version pointer, active status.
- **`PipelineVersion`**: Immutable YAML configuration snapshot and SHA256 checksum.
- **`PipelineRun`**: Execution record (`QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `CANCELLED`), commit SHA, branch, duration.
- **`PipelineJob`**: Individual execution step within a run stage (`source`, `build`, `test`, `deploy`).
- **`LogEntry`**: Telemetry log record indexed by `pipelineRunId` and `timestamp`.
- **`Deployment`**: Target environment rollout record with health status and target container ID.

---

## 5. Fault Tolerance & State Reconciliation

1. **Worker Crash Recovery**: On process startup, `PipelineRunProcessor.onApplicationBootstrap()` scans for orphaned runs in `RUNNING` status and transitions them to `FAILED` with cleanup of ephemeral workspace directories.
2. **Redis Degradation Fallback**: Idempotency service falls back to in-memory TTL maps if Redis connectivity degrades temporarily.
3. **Seccomp Isolation**: Docker containers are executed with `unconfined` seccomp profile within isolated volumes to prevent container breakout.
