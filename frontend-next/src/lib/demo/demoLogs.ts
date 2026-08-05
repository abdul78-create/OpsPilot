import { LogEntry } from '../apiClient';

export const REALISTIC_DEMO_LOG_LINES = [
  'Initializing OpsPilot runner v2.4.0 on isolated Docker node (node-us-east-1a)...',
  'Workspace mount point: /opspilot-workspaces/run_demo_101',
  'Cloning repository github.com/opspilot-org/stockflow-api (branch: main, commit: #e4f92a189c)...',
  'Repository cloned successfully (0.42s).',
  'Executing stage [1/4] Environment Audit & Dependencies...',
  'Node.js v20.12.2 LTS detected. pnpm v9.1.0 active.',
  'Restoring pnpm store cache from SHA-256 (34.2 MB)...',
  'Packages installed cleanly. 0 vulnerabilities found.',
  'Executing stage [2/4] Unit & Integration Tests...',
  'PASS src/modules/auth/auth.service.spec.ts (1.2s)',
  'PASS src/modules/inventory/stock.service.spec.ts (2.4s)',
  'PASS src/modules/orders/orders.controller.spec.ts (1.8s)',
  '✓ 428 unit tests passed (100% coverage threshold met).',
  'Executing stage [3/4] Docker Image Construction...',
  'Building Docker image opspilot-org/stockflow-backend:v2.4.0...',
  'STEP 1/8: FROM node:20-alpine AS builder',
  'STEP 2/8: WORKDIR /app',
  'STEP 3/8: COPY package.json pnpm-lock.yaml ./',
  'STEP 4/8: RUN pnpm install --frozen-lockfile',
  'STEP 5/8: COPY . .',
  'STEP 6/8: RUN pnpm run build',
  'STEP 7/8: EXPOSE 3000',
  'STEP 8/8: CMD ["node", "dist/main.js"]',
  'Image opspilot-org/stockflow-backend:v2.4.0 built successfully (14.2s).',
  'Pushing image layers to Docker Registry (registry.opspilot.internal:5000)...',
  'Layer sha256:8f3a9d... Pushed [3.2 MB]',
  'Layer sha256:1b2c4e... Pushed [18.4 MB]',
  'Executing stage [4/4] Zero-Downtime Rolling Deployment...',
  'Connecting to Kubernetes Cluster prod-singapore-cluster...',
  'Applying Deployment manifest: stockflow-backend.yaml',
  'Waiting for rollout status: 3 of 3 updated replicas are available...',
  'Health check GET https://stockflow.opspilot.app/health returned HTTP 200 OK (12ms).',
  '✓ Pipeline execution #run_demo_101 finished successfully in 26.1s. Status: SUCCESS',
];

export function getDemoLogs(runId: string): LogEntry[] {
  const baseTime = Date.now() - 60000;
  return REALISTIC_DEMO_LOG_LINES.map((msg, i) => ({
    id: `log_demo_${runId}_${i}`,
    pipelineRunId: runId,
    level:
      msg.includes('FAIL') || msg.includes('ERROR')
        ? 'ERROR'
        : msg.includes('WARN')
          ? 'WARN'
          : 'INFO',
    message: msg,
    timestamp: new Date(baseTime + i * 800).toISOString(),
  }));
}
