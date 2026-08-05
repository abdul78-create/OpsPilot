import { DEMO_RUNS, DEMO_DEPLOYMENTS } from './demoData';
import { PipelineRun } from '../apiClient';

export interface SimulatedWebhookEvent {
  id: string;
  event: 'push' | 'pull_request' | 'workflow_dispatch';
  repo: string;
  sender: string;
  branch: string;
  commitSha: string;
  timestamp: string;
}

export const DEMO_WEBHOOK_EVENTS: SimulatedWebhookEvent[] = [
  {
    id: 'wh_evt_101',
    event: 'push',
    repo: 'opspilot-org/stockflow-api',
    sender: 'sarah-chen',
    branch: 'main',
    commitSha: 'e4f92a189c42b8e3',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'wh_evt_102',
    event: 'push',
    repo: 'opspilot-org/ai-analysis-service',
    sender: 'alex-rivera',
    branch: 'main',
    commitSha: '8b3c1d904e12f90a',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'wh_evt_103',
    event: 'pull_request',
    repo: 'opspilot-org/payments-worker',
    sender: 'sarah-chen',
    branch: 'feat/stripe-v3',
    commitSha: 'a345242ff1082c31',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

/**
 * Event simulation helper — advances RUNNING pipelines to SUCCESS over time,
 * and updates staging deployments.
 */
export function simulateLiveProgress(): void {
  if (typeof window === 'undefined') return;

  // Auto-advance RUNNING jobs to SUCCESS after 60s
  DEMO_RUNS.forEach((r) => {
    if (r.status === 'RUNNING') {
      const elapsed = Date.now() - new Date(r.startedAt ?? Date.now()).getTime();
      if (elapsed > 60000) {
        r.status = 'SUCCESS';
        r.finishedAt = new Date().toISOString();
        r.durationSeconds = Math.round(elapsed / 1000);
      }
    }
  });

  // Auto-promote QUEUED runs to RUNNING
  DEMO_RUNS.forEach((r) => {
    if (r.status === 'QUEUED') {
      r.status = 'RUNNING';
      r.startedAt = new Date().toISOString();
    }
  });
}
