/**
 * OpsPilot API Client v3 — Production NestJS Backend Interface
 */

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL !== '/v1') {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/v1';
    }
    return 'https://opspilot-backend-gd60.onrender.com/v1';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://opspilot-backend-gd60.onrender.com/v1';
}

export function getOAuthBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_OAUTH_API_URL) return process.env.NEXT_PUBLIC_OAUTH_API_URL;
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith('http')) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'http://localhost:3000/v1';
  }
  return 'https://opspilot-backend-gd60.onrender.com/v1';
}

export const API_BASE = getApiBaseUrl();

export function getActiveOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('opspilot_org_id');
}

export function setActiveOrgId(orgId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opspilot_org_id', orgId);
  }
}

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('opspilot_project_id');
}

export function setActiveProjectId(projectId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opspilot_project_id', projectId);
  }
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  isVerified?: boolean;
  createdAt?: string;
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
  environments?: { id: string; name: string }[];
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

function extractStatusString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'status' in val) {
    return String((val as { status: unknown }).status);
  }
  return 'unknown';
}

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('opspilot_token') : null;
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('opspilot_org_id') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }
  return headers;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    ...options,
    headers: getHeaders((options.headers as Record<string, string>) ?? {}),
  });

  if (res.status === 401 && (endpoint.includes('/auth/me') || endpoint.includes('/auth/refresh'))) {
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
  return apiFetch<{ data?: any; status?: string; info?: any; details?: any }>('/health');
}

export async function checkBackendHealth() {
  try {
    const r = await checkHealth();
    const info = r?.data?.info || r?.info || r?.data?.details || r?.details;
    const dbStatus = extractStatusString(info?.database);
    return { isOnline: true, dbStatus: dbStatus === 'up' ? 'Up' : dbStatus };
  } catch {
    return { isOnline: false, dbStatus: 'disconnected' };
  }
}

/**
 * Fetches live service health from backend.
 * Safely extracts string statuses to avoid [object Object] rendering.
 */
export interface ServiceHealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  details: {
    database: string;
    eventBus: string;
    queue: string;
  };
}

export async function fetchServiceHealth(): Promise<ServiceHealthStatus> {
  try {
    const raw = await apiFetch<any>('/health');
    const status = raw?.status === 'ok' ? 'ok' : raw?.status === 'degraded' ? 'degraded' : 'down';
    const rawDetails = raw?.details || raw?.data?.details || raw?.info || raw?.data?.info || {};
    return {
      status,
      timestamp: raw?.timestamp || new Date().toISOString(),
      details: {
        database: extractStatusString(rawDetails?.database),
        eventBus: extractStatusString(rawDetails?.eventBus ?? 'up'),
        queue: extractStatusString(rawDetails?.queue ?? (status === 'ok' ? 'up' : 'unknown')),
      },
    };
  } catch {
    return {
      status: 'down',
      timestamp: new Date().toISOString(),
      details: { database: 'down', eventBus: 'down', queue: 'down' },
    };
  }
}

// ─── Organizations ────────────────────────────────────────────────────────────

export async function listOrganizations() {
  return apiFetch<{ data: Organization[] }>('/organizations');
}

export async function createOrganization(name: string, slug: string) {
  return apiFetch<{ data: Organization }>('/organizations', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  });
}

export async function getCurrentOrganization(): Promise<{ data: Organization }> {
  const res = await apiFetch<any>('/organizations/current');
  const org = res?.data?.data || res?.data;
  return { data: org };
}

// ─── Billing & Subscriptions ──────────────────────────────────────────────────

export interface SubscriptionUsageData {
  organizationId: string;
  plan: {
    name: string;
    price: string;
    maxBuildMinutes: number;
    maxDeployments: number;
    maxArtifactStorageMB: number;
    maxTeamSeats: number;
    aiRcaEnabled: boolean;
  };
  usage: {
    buildMinutes: number;
    buildMinutesLimit: number;
    buildMinutesPercent: number;
    deployments: number;
    deploymentsLimit: number;
    deploymentsPercent: number;
    artifactStorageMB: number;
    artifactStorageLimitMB: number;
    artifactStoragePercent: number;
    teamSeats: number;
    teamSeatsLimit: number;
    teamSeatsPercent: number;
  };
}

export interface InvoiceItem {
  id: string;
  amount: string;
  status: string;
  date: string;
  pdfUrl?: string;
  plan?: string;
}

export async function fetchSubscriptionAndUsage(orgId?: string) {
  const targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) return null;
  return apiFetch<{ data: SubscriptionUsageData }>(`/organizations/${targetOrgId}/billing/subscription`);
}

export async function fetchInvoices(orgId?: string) {
  const targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) return { data: [] as InvoiceItem[] };
  return apiFetch<{ data: InvoiceItem[] }>(`/organizations/${targetOrgId}/billing/invoices`);
}

export async function createCheckout(plan: string, orgId?: string) {
  const targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) throw new Error('No active organization selected.');
  return apiFetch<{ data: { checkoutUrl: string; sessionId: string; plan: any } }>(
    `/organizations/${targetOrgId}/billing/checkout`,
    {
      method: 'POST',
      body: JSON.stringify({ plan }),
    },
  );
}

export async function ensureActiveOrgId(): Promise<string | null> {
  let orgId = getActiveOrgId();
  if (orgId) return orgId;
  try {
    const orgsRes = await listOrganizations();
    if (orgsRes.data && orgsRes.data.length > 0) {
      orgId = orgsRes.data[0].id;
      setActiveOrgId(orgId);
      return orgId;
    }
    const currentRes = await getCurrentOrganization().catch(() => null);
    if (currentRes?.data?.id) {
      orgId = currentRes.data.id;
      setActiveOrgId(orgId);
      return orgId;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function listProjects(orgId?: string) {
  let targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) {
    targetOrgId = await ensureActiveOrgId();
  }
  if (!targetOrgId) {
    return { data: [] as Project[] };
  }
  return apiFetch<{ data: Project[] }>(`/organizations/${targetOrgId}/projects`);
}

export async function createProject(
  name: string,
  slug: string,
  orgId?: string,
  description?: string,
) {
  let targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) {
    targetOrgId = await ensureActiveOrgId();
  }
  if (!targetOrgId) {
    try {
      const user = getUser();
      const orgName = user?.name ? `${user.name}'s Org` : 'Personal Organization';
      const orgSlug =
        (user?.email ? user.email.split('@')[0] : 'org') + '-' + Date.now().toString(36);
      const newOrg = await createOrganization(orgName, orgSlug);
      if (newOrg.data?.id) {
        targetOrgId = newOrg.data.id;
        setActiveOrgId(targetOrgId);
      }
    } catch {
      /* ignore */
    }
  }
  if (!targetOrgId) {
    throw new Error('No active organization context found.');
  }
  const body: Record<string, string> = { name, slug };
  if (description) body.description = description;
  return apiFetch<{ data: Project }>(`/organizations/${targetOrgId}/projects`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Pipelines ────────────────────────────────────────────────────────────────

export async function listPipelines(projectId?: string) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) {
    return { data: [] as PipelineDefinition[] };
  }
  return apiFetch<{ data: PipelineDefinition[] }>(`/projects/${targetProjectId}/pipelines`);
}

export async function createPipelineFromRepo(
  projectId: string,
  repositoryUrl: string,
  branch = 'main',
) {
  return apiFetch<{ data: PipelineDefinition }>(`/projects/${projectId}/pipelines/from-repo`, {
    method: 'POST',
    body: JSON.stringify({ repositoryUrl, branch }),
  });
}

export async function createPipelineDefinition(
  projectId: string,
  data: {
    name: string;
    yamlConfig: string;
    slug?: string;
    description?: string;
    triggerBranch?: string;
  },
) {
  return apiFetch<{ data: PipelineDefinition }>(`/projects/${projectId}/pipelines`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
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
  projectId?: string,
  limit = 50,
): Promise<PipelineRun[]> {
  try {
    const targetProjectId = projectId || getActiveProjectId();
    if (!targetProjectId) return [];
    const pipelines = await listPipelines(targetProjectId);
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
  type: 'RUN_RCA' | 'DEPLOYMENT_RISK' | 'LOG_ANALYSIS' | 'SECURITY_AUDIT' | 'PIPELINE_OPTIMIZATION';
  targetId: string;
  summary: string;
  rootCause?: string | null;
  confidenceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  status: 'connected' | 'unavailable';
  capabilities: string[];
}

export interface AiQueryResponse {
  summary: string;
  findings: string[];
  evidence: string[];
  recommendation: string;
  nextAction: string;
}

export interface GeneratedPipelineResult {
  name: string;
  summary: string;
  yamlConfig: string;
  nodes: any[];
  edges: any[];
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export async function fetchAiStatus() {
  return apiFetch<{ message: string; data: AiStatusResponse }>('/ai/status');
}

export async function analyzeRun(runId: string) {
  return apiFetch<{ message: string; data: AiAnalysisReport }>(`/ai/analyze-run/${runId}`, {
    method: 'POST',
  });
}

export async function scoreDeploymentRisk(deploymentId: string) {
  return apiFetch<{ message: string; data: AiAnalysisReport }>(`/ai/score-deployment/${deploymentId}`, {
    method: 'POST',
  });
}

export async function optimizePipeline(pipelineId: string) {
  return apiFetch<{ message: string; data: AiAnalysisReport }>(`/ai/optimize-pipeline/${pipelineId}`, {
    method: 'POST',
  });
}

export async function auditSecurity(targetId: string) {
  return apiFetch<{ message: string; data: AiAnalysisReport }>(`/ai/audit-security/${targetId}`, {
    method: 'POST',
  });
}

export async function queryAi(body: {
  workspace: string;
  projectId?: string;
  pipelineId?: string;
  runId?: string;
  deploymentId?: string;
  question: string;
}) {
  return apiFetch<{ message: string; data: AiQueryResponse }>('/ai/query', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function generateAiPipeline(prompt: string) {
  return apiFetch<{ message: string; data: GeneratedPipelineResult }>('/ai/generate-pipeline', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export async function applyAiFix(reportId: string) {
  return apiFetch<{ message: string; data: any }>(`/ai/apply-fix/${reportId}`, {
    method: 'POST',
  });
}

export async function listAiReports(orgId?: string, type?: string) {
  const targetOrgId = orgId || getActiveOrgId();
  if (!targetOrgId) {
    return { message: 'No active organization', data: [] as AiAnalysisReport[] };
  }
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiFetch<{ message: string; data: AiAnalysisReport[] }>(
    `/organizations/${targetOrgId}/ai-reports${query}`,
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

// ─── Repositories & GitHub Code Explorer ──────────────────────

export interface RepositoryConnection {
  id: string;
  projectId: string;
  provider: 'GITHUB' | 'GITLAB' | 'BITBUCKET';
  repositoryUrl: string;
  defaultBranch?: string;
  webhookId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubBranchInfo {
  name: string;
  commitSha: string;
  isProtected: boolean;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
}

export interface GitHubFileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  downloadUrl: string | null;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  size: number;
  encoding: string;
  content: string;
  language: string;
}

export async function listRepositories(projectId?: string) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) {
    return { data: [] as RepositoryConnection[] };
  }
  return apiFetch<{ data: RepositoryConnection[] }>(`/projects/${targetProjectId}/repositories`);
}

export async function connectRepository(
  projectId: string | undefined,
  dto: {
    provider: 'GITHUB' | 'GITLAB';
    repositoryUrl: string;
    defaultBranch?: string;
    accessToken?: string;
  },
) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) {
    throw new Error('No active project selected.');
  }
  return apiFetch<{ data: RepositoryConnection }>(`/projects/${targetProjectId}/repositories`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function fetchRepositoryBranches(
  projectId: string | undefined,
  repositoryId: string,
) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) return { data: [] as GitHubBranchInfo[] };
  return apiFetch<{ data: GitHubBranchInfo[] }>(
    `/projects/${targetProjectId}/repositories/${repositoryId}/branches`,
  );
}

export async function fetchRepositoryCommits(
  projectId: string | undefined,
  repositoryId: string,
) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) return { data: [] as GitHubCommitInfo[] };
  return apiFetch<{ data: GitHubCommitInfo[] }>(
    `/projects/${targetProjectId}/repositories/${repositoryId}/commits`,
  );
}

export async function fetchRepositoryTree(
  projectId: string | undefined,
  repositoryId: string,
  path: string = '',
  ref: string = 'main',
) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) return { data: [] as GitHubFileItem[] };
  const query = new URLSearchParams({ path, ref }).toString();
  return apiFetch<{ data: GitHubFileItem[] }>(
    `/projects/${targetProjectId}/repositories/${repositoryId}/tree?${query}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchRepositoryFile(
  projectId: string | undefined,
  repositoryId: string,
  path: string = 'package.json',
  ref: string = 'main',
) {
  const targetProjectId = projectId || getActiveProjectId();
  if (!targetProjectId) throw new Error('No active project selected.');
  const query = new URLSearchParams({ path, ref }).toString();
  return apiFetch<{ data: GitHubFileContent }>(
    `/projects/${targetProjectId}/repositories/${repositoryId}/file?${query}`,
    {
      method: 'GET',
    },
  );
}

// ─── Settings 2.0 Types & Methods ──────────────────────────────────────────

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isRevoked: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface UserSessionItem {
  id: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface NotificationChannelItem {
  id: string;
  organizationId: string;
  name: string;
  type: 'SLACK' | 'PAGERDUTY' | 'WEBHOOK' | 'EMAIL';
  webhookUrl?: string | null;
  integrationKey?: string | null;
  emailAddress?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AlertPolicyItem {
  id: string;
  organizationId: string;
  notificationChannelId: string;
  name: string;
  eventTypes: string[];
  minSeverity?: string | null;
  isActive: boolean;
  createdAt: string;
  notificationChannel?: NotificationChannelItem;
}

export interface AuditLogItem {
  id: string;
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  payload?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export async function fetchCurrentUser(): Promise<{ data: UserProfile }> {
  try {
    const meRes = await apiFetch<any>('/auth/me');
    const userPayload = meRes?.data?.user || meRes?.user;
    const userId = userPayload?.sub || userPayload?.id;

    if (userId) {
      const userRes = await apiFetch<any>(`/users/${userId}`).catch(() => null);
      const userData = userRes?.data?.data || userRes?.data;
      if (userData && userData.id) {
        return { data: userData };
      }
      return {
        data: {
          id: userId,
          email: userPayload.email,
          name: userPayload.name || userPayload.email.split('@')[0],
          role: userPayload.role || 'USER',
          isVerified: true,
        },
      };
    }
  } catch {
    // fallback
  }

  const stored = getUser();
  if (stored) {
    return { data: stored };
  }
  throw new Error('Not authenticated');
}

export async function updateUserProfile(userId: string, dto: { name?: string; email?: string; avatarUrl?: string }) {
  return apiFetch<{ data: UserProfile }>(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function updateOrganization(orgId: string, dto: { name?: string; slug?: string }) {
  return apiFetch<{ data: Organization }>(`/organizations/${orgId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteOrganization(orgId: string) {
  return apiFetch<void>(`/organizations/${orgId}`, {
    method: 'DELETE',
  });
}

function unwrapArray<T>(res: any): T[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

export async function listOrganizationMembers(orgId: string): Promise<{ data: OrganizationMember[] }> {
  const res = await apiFetch<any>(`/organizations/${orgId}/members`).catch(() => ({ data: [] }));
  return { data: unwrapArray<OrganizationMember>(res) };
}

export async function updateMemberRole(orgId: string, memberId: string, role: string) {
  return apiFetch<{ data: OrganizationMember }>(`/organizations/${orgId}/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(orgId: string, memberId: string) {
  return apiFetch<void>(`/organizations/${orgId}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function inviteMember(orgId: string, email: string, role: string) {
  return apiFetch<{ data: any }>(`/organizations/${orgId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function changeUserPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchUserSessions(): Promise<{ data: UserSessionItem[] }> {
  const res = await apiFetch<any>('/auth/sessions').catch(() => ({ data: [] }));
  return { data: unwrapArray<UserSessionItem>(res) };
}

export async function revokeUserSession(sessionId: string) {
  return apiFetch<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function revokeAllOtherSessions() {
  return apiFetch<{ message: string }>('/auth/sessions', {
    method: 'DELETE',
  });
}

export async function listApiKeys(orgId: string): Promise<{ data: ApiKeyItem[] }> {
  const res = await apiFetch<any>(`/organizations/${orgId}/api-keys`).catch(() => ({ data: [] }));
  return { data: unwrapArray<ApiKeyItem>(res) };
}

export async function createApiKey(orgId: string, name: string, scopes: string[] = ['pipeline:read', 'pipeline:trigger']) {
  return apiFetch<{ data: ApiKeyItem & { rawKey: string } }>(`/organizations/${orgId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ name, scopes }),
  });
}

export async function revokeApiKey(orgId: string, id: string) {
  return apiFetch<void>(`/organizations/${orgId}/api-keys/${id}`, {
    method: 'DELETE',
  });
}

export async function listNotificationChannels(orgId: string): Promise<{ data: NotificationChannelItem[] }> {
  const res = await apiFetch<any>(`/organizations/${orgId}/notification-channels`).catch(() => ({ data: [] }));
  return { data: unwrapArray<NotificationChannelItem>(res) };
}

export async function createNotificationChannel(orgId: string, dto: { name: string; type: string; webhookUrl?: string; emailAddress?: string; integrationKey?: string }) {
  return apiFetch<{ data: NotificationChannelItem }>(`/organizations/${orgId}/notification-channels`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function deleteNotificationChannel(orgId: string, id: string) {
  return apiFetch<void>(`/organizations/${orgId}/notification-channels/${id}`, {
    method: 'DELETE',
  });
}

export async function listAlertPolicies(orgId: string): Promise<{ data: AlertPolicyItem[] }> {
  const res = await apiFetch<any>(`/organizations/${orgId}/alert-policies`).catch(() => ({ data: [] }));
  return { data: unwrapArray<AlertPolicyItem>(res) };
}

export async function createAlertPolicy(orgId: string, dto: { notificationChannelId: string; name: string; eventTypes: string[]; minSeverity?: string }) {
  return apiFetch<{ data: AlertPolicyItem }>(`/organizations/${orgId}/alert-policies`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function fetchAuditLogs(orgId: string, limit: number = 20): Promise<{ data: AuditLogItem[] }> {
  const res = await apiFetch<any>(`/organizations/${orgId}/audit-logs?limit=${limit}`).catch(() => ({ data: [] }));
  return { data: unwrapArray<AuditLogItem>(res) };
}


