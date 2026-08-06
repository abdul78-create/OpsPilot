/**
 * OpsPilot API Client v3 — Production NestJS Backend Interface
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/v1' : 'http://localhost:3000/v1');

export const DEFAULT_ORG_ID = '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913';
export const DEFAULT_PROJECT_ID = '138ae2ae-2d30-4536-8789-267c5901f05c';
export const DEFAULT_PIPELINE_ID = '923a1e6e-3f99-4e6e-8d04-4531a3c6e8a1';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  description?: string;
  status: string;
  createdAt: string;
}

export interface PipelineDefinition {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description?: string;
  triggerType: string;
  triggerBranch?: string;
  isActive: boolean;
  currentVersionNumber: number;
  repositoryUrl?: string;
  branch?: string;
  status?: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'QUEUED' | 'CANCELLED';
  lastRunAt?: string;
  successRate?: number;
  totalRuns?: number;
}

export type Pipeline = PipelineDefinition;

export interface PipelineRun {
  id: string;
  pipelineDefinitionId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  triggerType: string;
  triggeredBy?: string;
  commitSha?: string;
  branch?: string;
  startedAt?: string;
  finishedAt?: string;
  queuedAt?: string;
  durationSeconds?: number;
  createdAt: string;
  pipelineName?: string;
  repositoryUrl?: string;
  jobs?: PipelineJob[];
}

export interface PipelineJob {
  id: string;
  name: string;
  stageName?: string;
  stage?: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
  startedAt?: string;
  finishedAt?: string;
  durationSeconds?: number;
  stdout?: string;
}

export interface Deployment {
  id: string;
  environment: string;
  status: string;
  version: string;
  imageTag: string;
  deployedAt: string;
  health: string;
  url?: string;
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

export interface LogEntry {
  id?: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  jobId?: string;
}

export interface Artifact {
  id: string;
  name: string;
  pipelineRunId: string;
  size: number;
  sha256: string;
  mimeType: string;
  createdAt: string;
  downloadUrl: string;
}

export interface Secret {
  id: string;
  key: string;
  description?: string;
  createdAt: string;
}

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

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: getHeaders((options.headers as Record<string, string>) ?? {}),
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('opspilot_token');
    }
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      msg = errJson.message || errJson.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('opspilot_token');
}

export function getUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('opspilot_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function checkHealth() {
  return apiFetch<{ data: { status: string; info: Record<string, { status: string }> } }>(
    '/health',
  );
}

export async function checkBackendHealth() {
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
  return apiFetch<{ data: Organization }>('/organizations/current');
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(orgId: string = DEFAULT_ORG_ID) {
  return apiFetch<{ data: Project[] }>(`/organizations/${orgId}/projects`);
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function listPipelines(projectId: string = DEFAULT_PROJECT_ID) {
  return apiFetch<{ data: PipelineDefinition[] }>(`/projects/${projectId}/pipelines`);
}

export async function getPipeline(projectId: string, pipelineId: string) {
  return apiFetch<{ data: PipelineDefinition }>(`/projects/${projectId}/pipelines/${pipelineId}`);
}

export async function triggerPipeline(pipelineId: string, branch?: string, commitSha?: string) {
  const body: Record<string, string> = { branch: branch ?? 'main' };
  if (commitSha) body.commitSha = commitSha;
  return apiFetch<{ data: PipelineRun }>(`/pipelines/${pipelineId}/runs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Pipeline Runs ────────────────────────────────────────────────────────────

export async function listRunsForPipeline(pipelineId: string, limit = 50) {
  return apiFetch<{ data: PipelineRun[] }>(`/pipelines/${pipelineId}/runs?limit=${limit}`);
}

export async function listAllRuns(
  projectId: string = DEFAULT_PROJECT_ID,
  limit = 50,
): Promise<PipelineRun[]> {
  try {
    const pipelines = await listPipelines(projectId);
    const allRuns: PipelineRun[] = [];
    await Promise.all(
      (pipelines.data ?? []).map(async (p) => {
        try {
          const runs = await listRunsForPipeline(p.id, limit);
          (runs.data ?? []).forEach((r) => allRuns.push({ ...r, pipelineName: p.name }));
        } catch {
          /* skip */
        }
      }),
    );
    return allRuns.sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  } catch {
    return [];
  }
}

export async function getPipelineRun(runId: string) {
  return apiFetch<{ data: PipelineRun }>(`/runs/${runId}`);
}

export async function cancelRun(runId: string) {
  return apiFetch(`/runs/${runId}/cancel`, { method: 'POST' });
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export async function fetchRunLogs(runId: string): Promise<LogEntry[]> {
  try {
    const json = await apiFetch<{ data: LogEntry[] }>(`/pipeline-runs/${runId}/logs`);
    return json.data ?? [];
  } catch {
    return [];
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
  return apiFetch<{ data: SystemHealth }>('/metrics/system-health');
}

export async function fetchPrometheusMetrics(): Promise<string> {
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

export interface AiAnalysisReport {
  id: string;
  type: 'RUN_RCA' | 'DEPLOYMENT_RISK' | 'LOG_ANALYSIS' | 'SECURITY_AUDIT';
  targetId: string;
  summary: string;
  rootCause?: string | null;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export async function analyzeRun(runId: string) {
  return apiFetch<{ message: string; data: AiAnalysisReport }>(`/ai/analyze-run/${runId}`, {
    method: 'POST',
  });
}

export async function listAiReports(orgId: string = DEFAULT_ORG_ID, type?: string) {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiFetch<{ message: string; data: AiAnalysisReport[] }>(
    `/organizations/${orgId}/ai-reports${query}`,
  );
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export async function listArtifacts(runId?: string) {
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
  return apiFetch<{ data: Deployment[] }>('/deployments');
}

export async function getDeployment(deploymentId: string) {
  return apiFetch<{ data: Deployment }>(`/deployments/${deploymentId}`);
}

export async function rollbackDeployment(deploymentId: string) {
  return apiFetch(`/deployments/${deploymentId}/rollback`, { method: 'POST' });
}

// ─── Secrets ──────────────────────────────────────────────────────────────────

export async function listSecrets() {
  return apiFetch<{ data: Secret[] }>('/secrets');
}

export async function createSecret(key: string, value: string, description?: string) {
  return apiFetch<{ data: Secret }>('/secrets', {
    method: 'POST',
    body: JSON.stringify({ key, value, description }),
  });
}

export async function deleteSecret(secretId: string) {
  return apiFetch(`/secrets/${secretId}`, { method: 'DELETE' });
}
