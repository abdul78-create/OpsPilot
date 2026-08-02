# OPSPILOT REST API DOCUMENTATION
Version 1.0.0 · Base URL: `/v1`

---

## Authentication & Headers

All authenticated endpoints require the following headers:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-organization-id: <ORGANIZATION_UUID>
Content-Type: application/json
```

---

## 1. Auth Module (`/v1/auth`)

### Register User
```http
POST /v1/auth/register
```
**Request Body**:
```json
{
  "email": "developer@company.com",
  "password": "SecurePassword123!",
  "name": "Alex Developer"
}
```

### Login
```http
POST /v1/auth/login
```
**Response**:
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOi..."
    },
    "user": {
      "id": "usr_123",
      "email": "developer@company.com"
    }
  }
}
```

---

## 2. Health & Metrics Module (`/v1`)

### Check System Health
```http
GET /v1/health
```
**Response**:
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } }
}
```

### System Health Counters (Authenticated)
```http
GET /v1/metrics/system-health
```
**Response**:
```json
{
  "success": true,
  "data": {
    "totalOrganizations": 1,
    "totalProjects": 1,
    "totalEnvironments": 1,
    "totalPipelineDefinitions": 3,
    "totalPipelineRuns": 23,
    "totalDeployments": 12,
    "deploymentSuccessRate": 83.3
  }
}
```

### Prometheus Scrape Stream
```http
GET /v1/metrics/prometheus
```
Returns Prometheus formatted text telemetry lines (`opspilot_uptime_seconds`, `opspilot_pipeline_runs_total`, etc.).

---

## 3. Pipelines & Runs Module

### List Project Pipelines
```http
GET /v1/projects/:projectId/pipelines
```

### Trigger Pipeline Execution
```http
POST /v1/pipelines/:pipelineId/runs
```
**Request Body**:
```json
{
  "branch": "main",
  "commitSha": "e6f8b1a9c3d"
}
```
**Response (`HTTP 201 Created`)**:
```json
{
  "success": true,
  "data": {
    "id": "ca31d836-103c-43c7-ba78-e54f6ee8c459",
    "status": "QUEUED",
    "jobs": [
      { "name": "Build Source & Assets", "stage": "build", "status": "QUEUED" }
    ]
  }
}
```

### Get Pipeline Run Details
```http
GET /v1/runs/:runId
```

### Cancel Pipeline Run
```http
POST /v1/runs/:runId/cancel
```

---

## 4. Log Streaming Module (`/v1/pipeline-runs`)

### Fetch Stored Logs
```http
GET /v1/pipeline-runs/:runId/logs
```

### Stream Live Logs (SSE EventSource)
```http
GET /v1/pipeline-runs/:runId/logs/stream?token=<JWT_TOKEN>
```
Returns text/event-stream data lines containing JSON formatted log entries.

---

## 5. Webhook Receiver Module (`/v1/webhooks`)

### GitHub Webhook Ingestion
```http
POST /v1/webhooks/github
```
**Required Headers**:
- `X-GitHub-Event: push`
- `X-GitHub-Delivery: <DELIVERY_UUID>`
- `X-Hub-Signature-256: sha256=<HMAC_HEX>`
