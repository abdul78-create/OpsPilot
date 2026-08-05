import {
  DEMO_SYSTEM_HEALTH,
  DEMO_PIPELINES,
  DEMO_RUNS,
  DEMO_DEPLOYMENTS,
  DEMO_AI_REPORTS,
  DEMO_ARTIFACTS,
  DEMO_SECRETS,
  DEMO_ORGANIZATION,
  DEMO_PROJECTS,
  DEMO_LOGS,
} from './demoData';
import {
  PipelineRun,
  PipelineDefinition,
  SystemHealth,
  Deployment,
  Organization,
  Project,
  LogEntry,
  Artifact,
  Secret,
} from '../apiClient';

/**
 * Centralized Demo API Service — Mirrors all backend API signatures.
 * Called transparently by apiClient.ts when Demo Mode is active.
 */
export const demoApi = {
  async getCurrentOrganization(): Promise<{ data: Organization }> {
    return { data: DEMO_ORGANIZATION };
  },

  async listProjects(_orgId?: string): Promise<{ data: Project[] }> {
    return { data: DEMO_PROJECTS };
  },

  async listPipelines(_projectId?: string): Promise<{ data: PipelineDefinition[] }> {
    return { data: DEMO_PIPELINES };
  },

  async getPipeline(_projectId: string, pipelineId: string): Promise<{ data: PipelineDefinition }> {
    const found = DEMO_PIPELINES.find((p) => p.id === pipelineId) ?? DEMO_PIPELINES[0];
    return { data: found };
  },

  async triggerPipeline(pipelineId: string, branch = 'main'): Promise<{ data: PipelineRun }> {
    const pipeline = DEMO_PIPELINES.find((p) => p.id === pipelineId) ?? DEMO_PIPELINES[0];
    const newRun: PipelineRun = {
      id: `run_demo_${Date.now().toString().slice(-6)}`,
      pipelineDefinitionId: pipelineId,
      status: 'RUNNING',
      triggerType: 'MANUAL',
      triggeredBy: 'Sarah Chen (Demo)',
      commitSha: Math.random().toString(16).slice(2, 10),
      branch,
      startedAt: new Date().toISOString(),
      queuedAt: new Date().toISOString(),
      durationSeconds: 12,
      createdAt: new Date().toISOString(),
      pipelineName: pipeline.name,
      repositoryUrl: pipeline.repositoryUrl,
    };
    DEMO_RUNS.unshift(newRun);
    return { data: newRun };
  },

  async listRunsForPipeline(pipelineId: string): Promise<{ data: PipelineRun[] }> {
    const filtered = DEMO_RUNS.filter((r) => r.pipelineDefinitionId === pipelineId);
    return { data: filtered.length > 0 ? filtered : DEMO_RUNS };
  },

  async listAllRuns(_projectId?: string): Promise<PipelineRun[]> {
    return DEMO_RUNS;
  },

  async getPipelineRun(runId: string): Promise<{ data: PipelineRun }> {
    const found = DEMO_RUNS.find((r) => r.id === runId) ?? DEMO_RUNS[0];
    return { data: found };
  },

  async cancelRun(runId: string): Promise<{ success: boolean; message: string }> {
    const found = DEMO_RUNS.find((r) => r.id === runId);
    if (found) found.status = 'CANCELLED';
    return { success: true, message: `Run ${runId} cancelled` };
  },

  async fetchRunLogs(runId: string): Promise<LogEntry[]> {
    const logs = DEMO_LOGS.filter((l) => l.pipelineRunId === runId);
    if (logs.length > 0) return logs;
    return [
      {
        id: 'l1',
        pipelineRunId: runId,
        level: 'INFO',
        message: 'Initializing build container opspilot-runner:v2...',
        timestamp: new Date(Date.now() - 30000).toISOString(),
      },
      {
        id: 'l2',
        pipelineRunId: runId,
        level: 'INFO',
        message: 'Cloning repository main branch...',
        timestamp: new Date(Date.now() - 25000).toISOString(),
      },
      {
        id: 'l3',
        pipelineRunId: runId,
        level: 'INFO',
        message: 'Executing pnpm install --frozen-lockfile',
        timestamp: new Date(Date.now() - 20000).toISOString(),
      },
      {
        id: 'l4',
        pipelineRunId: runId,
        level: 'INFO',
        message: 'Build completed successfully. 0 TypeScript errors.',
        timestamp: new Date(Date.now() - 10000).toISOString(),
      },
    ];
  },

  async fetchSystemHealth(): Promise<{ data: SystemHealth }> {
    return { data: DEMO_SYSTEM_HEALTH };
  },

  async listDeployments(): Promise<{ data: Deployment[] }> {
    return { data: DEMO_DEPLOYMENTS };
  },

  async getDeployment(deploymentId: string): Promise<{ data: Deployment }> {
    const found = DEMO_DEPLOYMENTS.find((d) => d.id === deploymentId) ?? DEMO_DEPLOYMENTS[0];
    return { data: found };
  },

  async rollbackDeployment(deploymentId: string): Promise<{ success: boolean; message: string }> {
    const found = DEMO_DEPLOYMENTS.find((d) => d.id === deploymentId);
    if (found) {
      found.status = 'ROLLED_BACK';
      found.rolledBackAt = new Date().toISOString();
    }
    return { success: true, message: `Rollback completed for ${deploymentId}` };
  },

  async listAiReports(_orgId?: string): Promise<{ data: unknown[] }> {
    return { data: DEMO_AI_REPORTS };
  },

  async analyzeRun(runId: string): Promise<{ success: boolean; data: unknown }> {
    return { success: true, data: DEMO_AI_REPORTS[0] };
  },

  async listArtifacts(runId?: string): Promise<{ data: Artifact[] }> {
    if (runId) {
      const filtered = DEMO_ARTIFACTS.filter((a) => a.pipelineRunId === runId);
      return { data: filtered.length > 0 ? filtered : DEMO_ARTIFACTS };
    }
    return { data: DEMO_ARTIFACTS };
  },

  async listSecrets(): Promise<{ data: Secret[] }> {
    return { data: DEMO_SECRETS };
  },

  async createSecret(
    key: string,
    _value: string,
    description?: string,
  ): Promise<{ success: boolean; data: Secret }> {
    const newSecret: Secret = {
      id: `sec_demo_${Date.now()}`,
      key,
      description: description ?? 'User created secret',
      createdAt: new Date().toISOString(),
    };
    DEMO_SECRETS.unshift(newSecret);
    return { success: true, data: newSecret };
  },

  async deleteSecret(secretId: string): Promise<{ success: boolean; message: string }> {
    const idx = DEMO_SECRETS.findIndex((s) => s.id === secretId);
    if (idx !== -1) DEMO_SECRETS.splice(idx, 1);
    return { success: true, message: `Secret ${secretId} deleted` };
  },
};
