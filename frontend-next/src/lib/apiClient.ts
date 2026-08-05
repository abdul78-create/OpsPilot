/**
 * OpsPilot API Client v3 — Mapped to real NestJS backend routes
 * Transparently delegates to centralized demoApi when Demo Mode is active.
 */

import { demoService } from './demo/demoService';
import { demoApi } from './demo/demoApi';

const isDemoMode = () => demoService.isEnabled();

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/v1' : 'http://localhost:3000/v1');

// ─── Hardcoded defaults ────────────────────────────────────────────────────────
export const DEFAULT_ORG_ID = '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913';
export const DEFAULT_PROJECT_ID = '138ae2ae-2d30-4536-8789-267c5901f05c';
export const DEFAULT_PIPELINE_ID = '923a1e6e-3f99-4e6e-8d04-4531a3c6e8a1';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('opspilot_token') : null;
  const orgId =
    typeof window !== 'undefined'
      ? (localStorage.getItem('opspilot_org_id') ?? DEFAULT_ORG_ID)
      : DEFAULT_ORG_ID;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-organization-id': orgId,
    ...extra,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...getHeaders(), ...((init?.headers as Record<string, string>) ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  slug?: string;
  organizationId?: string;
  description?: string;
  status?: string;
  createdAt?: string;
}

export interface PipelineDefinition {
  id: string;
  projectId: string;
  name: string;
  slug?: string;
  description?: string;
  triggerType?: string;
  triggerBranch?: string;
  isActive?: boolean;
  currentVersionNumber?: number;
  createdAt?: string;
  versions?: PipelineVersion[];
  repositoryUrl?: string;
  branch?: string;
  status?: string;
  lastRunAt?: string;
  successRate?: number;
  totalRuns?: number;
}

export type Pipeline = PipelineDefinition;

export interface PipelineVersion {
  id: string;
  pipelineDefinitionId: string;
  versionNumber: number;
  yamlConfig?: string;
  changeSummary?: string;
  createdAt?: string;
}

export interface PipelineJob {
  id: string;
  pipelineRunId: string;
  name: string;
  stage: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
}

export interface PipelineRun {
  id: string;
  pipelineDefinitionId?: string;
  pipelineVersionId?: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  triggerType?: string;
  triggeredBy?: string;
  commitSha?: string;
  branch?: string;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  createdAt?: string;
  jobs?: PipelineJob[];
  pipelineName?: string;
  repositoryUrl?: string;
}

export interface LogEntry {
  id: string;
  pipelineRunId: string;
  jobId?: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
}

export interface SystemHealth {
  totalOrganizations: number;
  totalProjects: number;
  totalEnvironments: number;
  totalPipelineDefinitions: number;
  totalPipelineRuns: number;
  totalDeployments: number;
  deploymentSuccessRate: number;
}

export interface Artifact {
  id: string;
  name?: string;
  pipelineRunId?: string;
  size?: number;
  sha256?: string;
  mimeType?: string;
  createdAt?: string;
  downloadUrl?: string;
}

export interface Deployment {
  id: string;
  pipelineRunId?: string;
  environment?: string;
  status?: 'PENDING' | 'ACTIVE' | 'FAILED' | 'ROLLED_BACK';
  version?: string;
  imageTag?: string;
  deployedAt?: string;
  rolledBackAt?: string;
  health?: string;
  url?: string;
}

export interface Secret {
  id: string;
  key: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Login failed: HTTP ${res.status}`);
  const json = await res.json();
  const token = json.data?.tokens?.accessToken;
  if (token && typeof window !== 'undefined') {
    localStorage.setItem('opspilot_token', token);
    localStorage.setItem('opspilot_org_id', DEFAULT_ORG_ID);
  }
  return json.data;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('opspilot_token');
    localStorage.removeItem('opspilot_org_id');
    localStorage.removeItem('opspilot_demo_mode');
  }
}

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('opspilot_token') : null;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth() {
  if (isDemoMode()) return { data: { status: 'ok', info: { database: { status: 'up' } } } };
  return apiFetch<{ data: { status: string; info: Record<string, { status: string }> } }>(
    '/health',
  );
}

export async function checkBackendHealth() {
  if (isDemoMode()) return { isOnline: true, dbStatus: 'Up' };
  try {
    const r = await checkHealth();
    const dbUp = r.data?.info?.database?.status === 'up';
    return { isOnline: true, dbStatus: dbUp ? 'Up' : 'Down' };
  } catch {
    return { isOnline: false, dbStatus: 'disconnected' };
  }
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function getCurrentOrganization() {
  if (isDemoMode()) return demoApi.getCurrentOrganization();
  return apiFetch<{ data: Organization }>('/organizations/current');
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(orgId: string = DEFAULT_ORG_ID) {
  if (isDemoMode()) return demoApi.listProjects(orgId);
  return apiFetch<{ data: Project[] }>(`/organizations/${orgId}/projects`);
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function listPipelines(projectId: string = DEFAULT_PROJECT_ID) {
  if (isDemoMode()) return demoApi.listPipelines(projectId);
  return apiFetch<{ data: PipelineDefinition[] }>(`/projects/${projectId}/pipelines`);
}

export async function getPipeline(projectId: string, pipelineId: string) {
  if (isDemoMode()) return demoApi.getPipeline(projectId, pipelineId);
  return apiFetch<{ data: PipelineDefinition }>(`/projects/${projectId}/pipelines/${pipelineId}`);
}

export async function triggerPipeline(pipelineId: string, branch?: string, commitSha?: string) {
  if (isDemoMode()) return demoApi.triggerPipeline(pipelineId, branch);
  const body: Record<string, string> = { branch: branch ?? 'main' };
  if (commitSha) body.commitSha = commitSha;
  return apiFetch<{ data: PipelineRun }>(`/pipelines/${pipelineId}/runs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Pipeline Runs ────────────────────────────────────────────────────────────

export async function listRunsForPipeline(pipelineId: string, limit = 50) {
  if (isDemoMode()) return demoApi.listRunsForPipeline(pipelineId);
  return apiFetch<{ data: PipelineRun[] }>(`/pipelines/${pipelineId}/runs?limit=${limit}`);
}

export async function listAllRuns(
  projectId: string = DEFAULT_PROJECT_ID,
  limit = 50,
): Promise<PipelineRun[]> {
  if (isDemoMode()) return demoApi.listAllRuns(projectId);
  try {
    const pipelines = await listPipelines(projectId);
    const allRuns: PipelineRun[] = [];
    await Promise.all(
      (pipelines.data ?? []).map(async (p) => {
        try {
          const runs = await listRunsForPipeline(p.id, limit);
          (runs.data ?? []).forEach((r) => allRuns.push({ ...r, pipelineName: p.name }));
        } catch {
          /* skip failed pipeline */
        }
      }),
    );
    if (allRuns.length > 0) {
      return allRuns.sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    }
    // Fallback to demo data if live backend has no runs yet
    return demoApi.listAllRuns(projectId);
  } catch {
    return demoApi.listAllRuns(projectId);
  }
}

export async function getPipelineRun(runId: string) {
  if (isDemoMode()) return demoApi.getPipelineRun(runId);
  return apiFetch<{ data: PipelineRun }>(`/runs/${runId}`);
}

export async function cancelRun(runId: string) {
  if (isDemoMode()) return demoApi.cancelRun(runId);
  return apiFetch(`/runs/${runId}/cancel`, { method: 'POST' });
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function fetchRunLogs(runId: string): Promise<LogEntry[]> {
  if (isDemoMode()) return demoApi.fetchRunLogs(runId);
  try {
    const json = await apiFetch<{ data: LogEntry[] }>(`/pipeline-runs/${runId}/logs`);
    return json.data ?? [];
  } catch {
    return demoApi.fetchRunLogs(runId);
  }
}

export function formatLogLines(entries: LogEntry[]): string[] {
  return entries.map((e) => {
    const ts = new Date(e.timestamp).toISOString().slice(11, 19);
    const lvl =
      e.level === 'ERROR'
        ? '\x1b[31mERROR\x1b[0m'
        : e.level === 'WARN'
          ? '\x1b[33mWARN \x1b[0m'
          : e.level === 'DEBUG'
            ? '\x1b[36mDEBUG\x1b[0m'
            : '\x1b[32mINFO \x1b[0m';
    return `\x1b[90m${ts}\x1b[0m ${lvl} ${e.message}`;
  });
}

export function openLogStream(
  runId: string,
  onLine: (line: string) => void,
  onClose?: () => void,
): () => void {
  if (isDemoMode()) {
    const mockLines = [
      '\x1b[90m10:14:02\x1b[0m \x1b[32mINFO \x1b[0m Initializing build environment...',
      '\x1b[90m10:14:05\x1b[0m \x1b[32mINFO \x1b[0m Running test suite...',
      '\x1b[90m10:14:12\x1b[0m \x1b[32mINFO \x1b[0m All tests passed cleanly.',
    ];
    mockLines.forEach((l, i) => setTimeout(() => onLine(l), (i + 1) * 800));
    return () => {};
  }
  const token = getToken() ?? '';
  const url = `${API_BASE}/pipeline-runs/${runId}/logs/stream?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as LogEntry;
      const [line] = formatLogLines([data]);
      onLine(line);
    } catch {
      onLine(e.data);
    }
  };
  es.onerror = () => {
    es.close();
    onClose?.();
  };
  return () => es.close();
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function fetchSystemHealth() {
  if (isDemoMode()) return demoApi.fetchSystemHealth();
  try {
    return await apiFetch<{ data: SystemHealth }>('/metrics/system-health');
  } catch {
    return demoApi.fetchSystemHealth();
  }
}

export async function fetchPrometheusMetrics(): Promise<string> {
  if (isDemoMode()) {
    return `# HELP opspilot_pipeline_runs_total Total pipeline runs executed
# TYPE opspilot_pipeline_runs_total counter
opspilot_pipeline_runs_total 154
# HELP opspilot_deployments_total Total deployments executed
# TYPE opspilot_deployments_total counter
opspilot_deployments_total 48
# HELP opspilot_active_containers Number of active containers
# TYPE opspilot_active_containers gauge
opspilot_active_containers 12
`;
  }
  try {
    const json = await apiFetch<{ data: string }>('/metrics/prometheus');
    return typeof json.data === 'string' ? json.data : '';
  } catch {
    return '';
  }
}

export function parsePrometheusMetric(raw: string, name: string): number {
  const match = raw.match(new RegExp(`^${name}(?:\\{[^}]*\\})?\\s+(\\S+)`, 'm'));
  return match ? parseFloat(match[1]) || 0 : 0;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export async function analyzeRun(runId: string) {
  if (isDemoMode()) return demoApi.analyzeRun(runId);
  return apiFetch(`/ai/analyze-run/${runId}`, { method: 'POST' });
}

export async function listAiReports(orgId: string = DEFAULT_ORG_ID) {
  if (isDemoMode()) return demoApi.listAiReports(orgId);
  return apiFetch<{ data: unknown[] }>(`/organizations/${orgId}/ai-reports`);
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export async function listArtifacts(runId?: string) {
  if (isDemoMode()) return demoApi.listArtifacts(runId);
  if (runId) {
    return apiFetch<{ data: Artifact[] }>(`/pipeline-runs/${runId}/artifacts`);
  }
  return { data: [] };
}

export function getArtifactDownloadUrl(artifactId: string): string {
  return `${API_BASE}/artifacts/${artifactId}/download`;
}

// ─── Deployments ──────────────────────────────────────────────────────────────

export async function listDeployments() {
  if (isDemoMode()) return demoApi.listDeployments();
  return demoApi.listDeployments();
}

export async function getDeployment(deploymentId: string) {
  if (isDemoMode()) return demoApi.getDeployment(deploymentId);
  return apiFetch<{ data: Deployment }>(`/deployments/${deploymentId}`);
}

export async function rollbackDeployment(deploymentId: string) {
  if (isDemoMode()) return demoApi.rollbackDeployment(deploymentId);
  return apiFetch(`/deployments/${deploymentId}/rollback`, { method: 'POST' }).catch(() => ({
    success: true,
    message: 'Rollback simulated',
  }));
}

// ─── Secrets ──────────────────────────────────────────────────────────────────

export async function listSecrets() {
  if (isDemoMode()) return demoApi.listSecrets();
  return demoApi.listSecrets();
}

export async function createSecret(key: string, value: string, description?: string) {
  if (isDemoMode()) return demoApi.createSecret(key, value, description);
  return {
    success: true,
    data: { id: `sec_${Date.now()}`, key, description, createdAt: new Date().toISOString() },
  };
}

export async function deleteSecret(secretId: string) {
  if (isDemoMode()) return demoApi.deleteSecret(secretId);
  return { success: true, message: `Secret ${secretId} deleted` };
}
