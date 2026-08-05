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
import { demoService, DEMO_USER_PROFILE } from './demoService';

export { demoService };

export const DEMO_USER = DEMO_USER_PROFILE;

export const DEMO_ORGANIZATION: Organization = {
  id: 'org_demo_acme',
  name: 'Acme Cloud Platform',
  slug: 'acme-corp',
  status: 'ACTIVE',
  createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj_demo_stockflow',
    name: 'StockFlow SaaS Platform',
    slug: 'stockflow-saas',
    organizationId: 'org_demo_acme',
    description: 'Inventory management and automated order fulfillment platform',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'proj_demo_ai_engine',
    name: 'OpsPilot Intelligence Engine',
    slug: 'opspilot-ai',
    organizationId: 'org_demo_acme',
    description: 'Autonomous RCA root cause analyzer & real-time log ingestion',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

export const DEMO_SYSTEM_HEALTH: SystemHealth = {
  totalOrganizations: 3,
  totalProjects: 12,
  totalEnvironments: 4,
  totalPipelineDefinitions: 5,
  totalPipelineRuns: 154,
  totalDeployments: 48,
  deploymentSuccessRate: 98.4,
};

export const DEMO_PIPELINES: PipelineDefinition[] = [
  {
    id: 'pip_demo_1',
    projectId: 'proj_demo_stockflow',
    name: 'stockflow-backend',
    slug: 'stockflow-backend',
    description: 'NestJS REST & GraphQL core microservice API',
    triggerType: 'WEBHOOK',
    triggerBranch: 'main',
    isActive: true,
    currentVersionNumber: 28,
    repositoryUrl: 'https://github.com/opspilot-org/stockflow-api',
    branch: 'main',
    status: 'SUCCESS',
    lastRunAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    successRate: 98.2,
    totalRuns: 68,
  },
  {
    id: 'pip_demo_2',
    projectId: 'proj_demo_ai_engine',
    name: 'opspilot-ai-service',
    slug: 'opspilot-ai-service',
    description: 'FastAPI Python vector search & LLM RCA parser',
    triggerType: 'WEBHOOK',
    triggerBranch: 'main',
    isActive: true,
    currentVersionNumber: 14,
    repositoryUrl: 'https://github.com/opspilot-org/ai-analysis-service',
    branch: 'main',
    status: 'RUNNING',
    lastRunAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    successRate: 100,
    totalRuns: 34,
  },
  {
    id: 'pip_demo_3',
    projectId: 'proj_demo_stockflow',
    name: 'frontend-next',
    slug: 'frontend-next',
    description: 'Next.js 16 App Router UI with SSR & Static Export',
    triggerType: 'WEBHOOK',
    triggerBranch: 'main',
    isActive: true,
    currentVersionNumber: 42,
    repositoryUrl: 'https://github.com/opspilot-org/frontend-next',
    branch: 'main',
    status: 'SUCCESS',
    lastRunAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    successRate: 96.8,
    totalRuns: 45,
  },
  {
    id: 'pip_demo_4',
    projectId: 'proj_demo_stockflow',
    name: 'payments-worker',
    slug: 'payments-worker',
    description: 'Stripe webhook listener & billing event queue worker (Go)',
    triggerType: 'MANUAL',
    triggerBranch: 'feat/stripe-v3',
    isActive: true,
    currentVersionNumber: 9,
    repositoryUrl: 'https://github.com/opspilot-org/payments-worker',
    branch: 'feat/stripe-v3',
    status: 'FAILED',
    lastRunAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    successRate: 85.0,
    totalRuns: 16,
  },
  {
    id: 'pip_demo_5',
    projectId: 'proj_demo_stockflow',
    name: 'auth-gateway',
    slug: 'auth-gateway',
    description: 'OAuth2 / OpenID Connect JWT Authentication Proxy (Rust)',
    triggerType: 'WEBHOOK',
    triggerBranch: 'main',
    isActive: true,
    currentVersionNumber: 18,
    repositoryUrl: 'https://github.com/opspilot-org/auth-gateway',
    branch: 'main',
    status: 'SUCCESS',
    lastRunAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    successRate: 100,
    totalRuns: 22,
  },
];

export const DEMO_RUNS: PipelineRun[] = [
  {
    id: 'run_demo_101',
    pipelineDefinitionId: 'pip_demo_1',
    status: 'RUNNING',
    triggerType: 'WEBHOOK',
    triggeredBy: 'github-webhook',
    commitSha: 'e4f92a189c42b8e3',
    branch: 'main',
    startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    queuedAt: new Date(Date.now() - 2.5 * 60 * 1000).toISOString(),
    durationSeconds: 45,
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    pipelineName: 'stockflow-backend',
    repositoryUrl: 'https://github.com/opspilot-org/stockflow-api',
  },
  {
    id: 'run_demo_102',
    pipelineDefinitionId: 'pip_demo_2',
    status: 'SUCCESS',
    triggerType: 'WEBHOOK',
    triggeredBy: 'github-webhook',
    commitSha: '8b3c1d904e12f90a',
    branch: 'main',
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 14.5 * 60 * 1000).toISOString(),
    queuedAt: new Date(Date.now() - 15.2 * 60 * 1000).toISOString(),
    durationSeconds: 32,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    pipelineName: 'opspilot-ai-service',
    repositoryUrl: 'https://github.com/opspilot-org/ai-analysis-service',
  },
  {
    id: 'run_demo_103',
    pipelineDefinitionId: 'pip_demo_3',
    status: 'SUCCESS',
    triggerType: 'WEBHOOK',
    triggeredBy: 'github-webhook',
    commitSha: 'f371b45aa2918e77',
    branch: 'main',
    startedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 41.5 * 60 * 1000).toISOString(),
    queuedAt: new Date(Date.now() - 42.2 * 60 * 1000).toISOString(),
    durationSeconds: 28,
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    pipelineName: 'frontend-next',
    repositoryUrl: 'https://github.com/opspilot-org/frontend-next',
  },
  {
    id: 'run_demo_104',
    pipelineDefinitionId: 'pip_demo_4',
    status: 'FAILED',
    triggerType: 'MANUAL',
    triggeredBy: 'Sarah Chen',
    commitSha: 'a345242ff1082c31',
    branch: 'feat/stripe-v3',
    startedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 1.95 * 3600 * 1000).toISOString(),
    queuedAt: new Date(Date.now() - 2.01 * 3600 * 1000).toISOString(),
    durationSeconds: 18,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    pipelineName: 'payments-worker',
    repositoryUrl: 'https://github.com/opspilot-org/payments-worker',
  },
  {
    id: 'run_demo_105',
    pipelineDefinitionId: 'pip_demo_5',
    status: 'SUCCESS',
    triggerType: 'WEBHOOK',
    triggeredBy: 'github-webhook',
    commitSha: '7c9e01fb4a9018e4',
    branch: 'main',
    startedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    finishedAt: new Date(Date.now() - 4.9 * 3600 * 1000).toISOString(),
    queuedAt: new Date(Date.now() - 5.01 * 3600 * 1000).toISOString(),
    durationSeconds: 24,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    pipelineName: 'auth-gateway',
    repositoryUrl: 'https://github.com/opspilot-org/auth-gateway',
  },
];

export const DEMO_DEPLOYMENTS: Deployment[] = [
  {
    id: 'dep_demo_1',
    environment: 'production',
    status: 'ACTIVE',
    version: 'v2.4.0',
    imageTag: 'stockflow-backend:v2.4.0',
    deployedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    health: 'healthy',
    url: 'https://stockflow.opspilot.app',
  },
  {
    id: 'dep_demo_2',
    environment: 'production',
    status: 'ACTIVE',
    version: 'v3.1.2',
    imageTag: 'frontend-next:v3.1.2',
    deployedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    health: 'healthy',
    url: 'https://app.opspilot.io',
  },
  {
    id: 'dep_demo_3',
    environment: 'staging',
    status: 'ACTIVE',
    version: 'v2.5.0-rc2',
    imageTag: 'stockflow-backend:v2.5.0-rc2',
    deployedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    health: 'healthy',
    url: 'https://staging.stockflow.opspilot.app',
  },
];

export const DEMO_AI_REPORTS = [
  {
    id: 'rpt_demo_1',
    organizationId: 'org_demo_acme',
    projectId: 'proj_demo_stockflow',
    type: 'ROOT_CAUSE_ANALYSIS',
    targetId: 'run_demo_104',
    summary: 'Stripe Webhook Signature Verification Failure in Integration Stage',
    rootCause: 'Environment variable STRIPE_WEBHOOK_SECRET missing in test environment',
    confidenceScore: 0.94,
    riskLevel: 'HIGH',
    recommendations: [
      'Add STRIPE_WEBHOOK_SECRET to project secrets.',
      'Inject secret into integration stage runner.',
    ],
    createdAt: new Date(Date.now() - 1.9 * 3600 * 1000).toISOString(),
  },
];

export const DEMO_ARTIFACTS: Artifact[] = [
  {
    id: 'art_demo_1',
    name: 'stockflow-backend-v2.4.0.tar.gz',
    pipelineRunId: 'run_demo_102',
    size: 2458900,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    mimeType: 'application/gzip',
    createdAt: new Date(Date.now() - 14.5 * 60 * 1000).toISOString(),
    downloadUrl: '#',
  },
];

export const DEMO_SECRETS: Secret[] = [
  {
    id: 'sec_demo_1',
    key: 'DATABASE_URL',
    description: 'PostgreSQL Connection String',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'sec_demo_2',
    key: 'STRIPE_WEBHOOK_SECRET',
    description: 'Stripe Webhook Signature Secret',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

export function isDemoMode(): boolean {
  return demoService.isEnabled();
}

export function enableDemoMode(): void {
  demoService.enable();
}

export function disableDemoMode(): void {
  demoService.disable();
}
