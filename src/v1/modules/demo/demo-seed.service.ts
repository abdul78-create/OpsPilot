import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import {
  OrgStatus,
  OrgRole,
  ProjectStatus,
  TriggerType,
  EnvironmentType,
  DeploymentTargetType,
  EnvironmentConnectionStatus,
  MemberStatus,
  PipelineRunStatus,
  JobStatus,
  LogLevel,
  DeploymentStatus,
  IncidentSeverity,
  IncidentStatus,
} from '@prisma/client';

// ─────────────────────────────────────────────────────────
//  DEMO CONSTANTS
// ─────────────────────────────────────────────────────────
export const DEMO_ORG_SLUG = 'demo-org-opspilot-internal';
export const DEMO_USER_EMAIL = 'demo@opspilot.demo';
export const DEMO_USER_NAME = 'Demo Operator';
export const DEMO_ORG_NAME = 'OpsPilot Demo Organization';
export const DEMO_PROJECT_SLUG = 'demo-ecommerce-platform';
export const DEMO_REPO_URL = 'https://github.com/example/demo-ecommerce-platform';
export const DEMO_ENV_SLUG = 'demo-staging';
export const DEMO_PIPELINE_SLUG = 'demo-cicd-pipeline';

/** 3 Mandatory Demo Projects */
export interface DemoProjectDef {
  name: string;
  slug: string;
  description: string;
  repoUrl: string;
  pipelineName: string;
  pipelineSlug: string;
  stagingEnvSlug: string;
  prodEnvSlug: string;
  yamlConfig: string;
}

export const DEMO_PROJECTS: DemoProjectDef[] = [
  {
    name: 'Demo E-Commerce Platform',
    slug: 'demo-ecommerce-platform',
    description:
      'High-throughput cloud retail platform with automated canary stages, checkout services, and resilient cache layers. DEMO MODE — Simulated Demo Environment.',
    repoUrl: 'https://github.com/example/demo-ecommerce-platform',
    pipelineName: 'Demo E-Commerce CI/CD',
    pipelineSlug: 'demo-cicd-pipeline',
    stagingEnvSlug: 'demo-staging',
    prodEnvSlug: 'demo-production',
    yamlConfig: `
name: Demo E-Commerce CI/CD
mode: demo
stages:
  - name: git-source
    jobs:
      - name: checkout-source
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Loading bundled demo application source."
  - name: dependency-installation
    jobs:
      - name: install-dependencies
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Installing declared demo dependencies."
  - name: application-build
    jobs:
      - name: build-application
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running simulated application build."
  - name: automated-tests
    jobs:
      - name: test-suite
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running bundled demo test suite."
  - name: security-scan
    jobs:
      - name: security-audit
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running simulated security analysis."
  - name: package-artifact
    jobs:
      - name: create-artifact
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Creating demo artifact."
  - name: deploy-staging
    jobs:
      - name: deploy-staging
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Deploying to simulated demo-staging environment."
`.trim(),
  },
  {
    name: 'Demo Banking API',
    slug: 'demo-banking-api',
    description:
      'Ultra-low latency financial transactions and ledger API with strict compliance, audit trails, and automated security scans. DEMO MODE — Simulated Demo Environment.',
    repoUrl: 'https://github.com/example/demo-banking-api',
    pipelineName: 'Demo Banking API CI/CD',
    pipelineSlug: 'banking-api-pipeline',
    stagingEnvSlug: 'banking-staging',
    prodEnvSlug: 'banking-production',
    yamlConfig: `
name: Demo Banking API CI/CD
mode: demo
stages:
  - name: git-source
    jobs:
      - name: checkout-source
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Loading banking core ledger source."
  - name: dependency-installation
    jobs:
      - name: install-dependencies
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Verifying Go module checksums."
  - name: application-build
    jobs:
      - name: build-application
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Compiling high-frequency ledger binary."
  - name: automated-tests
    jobs:
      - name: test-suite
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Running PCI-DSS compliance and financial test suite."
  - name: security-scan
    jobs:
      - name: security-audit
        image: aquasec/trivy:latest
        steps:
          - echo "DEMO MODE: Running Govulncheck and container audit."
  - name: package-artifact
    jobs:
      - name: create-artifact
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Packaging signed banking binary artifact."
  - name: deploy-staging
    jobs:
      - name: deploy-staging
        image: golang:1.22-alpine
        steps:
          - echo "DEMO MODE: Deploying to isolated banking-staging environment."
`.trim(),
  },
  {
    name: 'Demo AI Analytics Service',
    slug: 'demo-ai-analytics-service',
    description:
      'Distributed machine learning inference pipeline for real-time telemetry anomaly detection and predictive scaling. DEMO MODE — Simulated Demo Environment.',
    repoUrl: 'https://github.com/example/demo-ai-analytics-service',
    pipelineName: 'Demo AI Analytics CI/CD',
    pipelineSlug: 'ai-analytics-pipeline',
    stagingEnvSlug: 'ai-analytics-staging',
    prodEnvSlug: 'ai-analytics-production',
    yamlConfig: `
name: Demo AI Analytics CI/CD
mode: demo
stages:
  - name: git-source
    jobs:
      - name: checkout-source
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Loading model weights and inference source."
  - name: dependency-installation
    jobs:
      - name: install-dependencies
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Installing PyTorch and ONNX runtime."
  - name: application-build
    jobs:
      - name: build-application
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Quantizing model weights and generating inference engine."
  - name: automated-tests
    jobs:
      - name: test-suite
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Validating inference tensor accuracy and latency benchmarks."
  - name: security-scan
    jobs:
      - name: security-audit
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Auditing ML dependencies and pickled model files."
  - name: package-artifact
    jobs:
      - name: create-artifact
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Packaging optimized ONNX model artifact."
  - name: deploy-staging
    jobs:
      - name: deploy-staging
        image: python:3.11-slim
        steps:
          - echo "DEMO MODE: Deploying to AI analytics staging inference cluster."
`.trim(),
  },
];

export interface DemoContext {
  userId: string;
  orgId: string;
  projectId: string;
  pipelineId: string;
  pipelineVersionId: string;
  environmentId: string;
}

@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  /**
   * Idempotently creates or verifies the 3 complete demo projects with all relationships.
   */
  async ensureDemoContext(): Promise<DemoContext> {
    // ── 1. Demo Organization ──────────────────────────────────────────
    let org = await this.prisma.organization.findFirst({
      where: { slug: DEMO_ORG_SLUG, deletedAt: null },
    });

    if (!org) {
      this.logger.log('[DEMO] Creating demo organization...');
      org = await this.prisma.organization.create({
        data: {
          name: DEMO_ORG_NAME,
          slug: DEMO_ORG_SLUG,
          status: OrgStatus.ACTIVE,
        },
      });
    }

    // ── 2. Demo User ──────────────────────────────────────────────────
    let user = await this.prisma.user.findFirst({
      where: { email: DEMO_USER_EMAIL, deletedAt: null },
    });

    if (!user) {
      this.logger.log('[DEMO] Creating demo user...');
      const demoPasswordRaw = process.env.DEMO_PASSWORD || 'DemoOpsPilot#2026!';
      const passwordHash = await this.hashService.hashPassword(demoPasswordRaw);
      user = await this.prisma.user.create({
        data: {
          email: DEMO_USER_EMAIL,
          name: DEMO_USER_NAME,
          passwordHash,
          isVerified: true,
        },
      });
    }

    // ── 3. Demo Org Membership ────────────────────────────────────────
    const existingMembership = await this.prisma.member.findFirst({
      where: { organizationId: org.id, userId: user.id, deletedAt: null },
    });

    if (!existingMembership) {
      await this.prisma.member.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: OrgRole.OWNER,
          status: MemberStatus.ACTIVE,
        },
      });
    }

    // ── 4. Prune Stale Projects in Demo Org (Strictly keep 3 projects) ─
    const allowedSlugs = DEMO_PROJECTS.map((p) => p.slug);
    const staleProjects = await this.prisma.project.findMany({
      where: {
        organizationId: org.id,
        slug: { notIn: allowedSlugs },
      },
    });

    for (const stale of staleProjects) {
      this.logger.log(`[DEMO] Pruning non-demo project '${stale.slug}' (${stale.id})...`);
      try {
        await this.prisma.deployment.deleteMany({
          where: { environment: { projectId: stale.id } },
        });
        await this.prisma.artifact.deleteMany({
          where: { pipelineRun: { pipelineDefinition: { projectId: stale.id } } },
        });
        await this.prisma.pipelineRunLog.deleteMany({
          where: { pipelineRun: { pipelineDefinition: { projectId: stale.id } } },
        });
        await this.prisma.pipelineJob.deleteMany({
          where: { pipelineRun: { pipelineDefinition: { projectId: stale.id } } },
        });
        await this.prisma.pipelineRun.deleteMany({
          where: { pipelineDefinition: { projectId: stale.id } },
        });
        await this.prisma.pipelineVersion.deleteMany({
          where: { pipelineDefinition: { projectId: stale.id } },
        });
        await this.prisma.pipelineDefinition.deleteMany({
          where: { projectId: stale.id },
        });
        await this.prisma.secret.deleteMany({
          where: { environment: { projectId: stale.id } },
        });
        await this.prisma.environment.deleteMany({
          where: { projectId: stale.id },
        });
        await this.prisma.repositoryConnection.deleteMany({
          where: { projectId: stale.id },
        });
        await this.prisma.project.delete({
          where: { id: stale.id },
        });
      } catch (err) {
        this.logger.warn(`[DEMO] Failed to prune project ${stale.id}: ${(err as Error).message}`);
      }
    }

    // Ensure artifact storage directory exists
    const artifactDir = path.join(os.tmpdir(), 'opspilot_artifacts');
    if (!fs.existsSync(artifactDir)) {
      fs.mkdirSync(artifactDir, { recursive: true });
    }

    // ── 5. Seed Each of the 3 Demo Projects ────────────────────────────
    let firstProjectId = '';
    let firstPipelineId = '';
    let firstPipelineVersionId = '';
    let firstEnvironmentId = '';

    for (let i = 0; i < DEMO_PROJECTS.length; i++) {
      const pDef = DEMO_PROJECTS[i];

      // A. Project
      let project = await this.prisma.project.findFirst({
        where: { organizationId: org.id, slug: pDef.slug, deletedAt: null },
      });

      if (!project) {
        project = await this.prisma.project.create({
          data: {
            organizationId: org.id,
            name: pDef.name,
            slug: pDef.slug,
            description: pDef.description,
            status: ProjectStatus.ACTIVE,
          },
        });
      }

      if (i === 0) firstProjectId = project.id;

      // B. Repository Connection
      let repo = await this.prisma.repositoryConnection.findFirst({
        where: { projectId: project.id, deletedAt: null },
      });
      if (!repo) {
        repo = await this.prisma.repositoryConnection.create({
          data: {
            projectId: project.id,
            repositoryUrl: pDef.repoUrl,
            defaultBranch: 'main',
            isVerified: false,
          },
        });
      }

      // C. Environments (Staging + Production)
      let stagingEnv = await this.prisma.environment.findFirst({
        where: { projectId: project.id, slug: pDef.stagingEnvSlug, deletedAt: null },
      });
      if (!stagingEnv) {
        stagingEnv = await this.prisma.environment.create({
          data: {
            projectId: project.id,
            name: pDef.stagingEnvSlug,
            slug: pDef.stagingEnvSlug,
            type: EnvironmentType.STAGING,
            deploymentTargetType: DeploymentTargetType.DOCKER,
            clusterName: 'demo-cluster',
            clusterRegion: 'us-east-1',
            k8sNamespace: `${pDef.stagingEnvSlug}-ns`,
            connectionStatus: EnvironmentConnectionStatus.CONNECTED,
          },
        });
      }

      let prodEnv = await this.prisma.environment.findFirst({
        where: { projectId: project.id, slug: pDef.prodEnvSlug, deletedAt: null },
      });
      if (!prodEnv) {
        prodEnv = await this.prisma.environment.create({
          data: {
            projectId: project.id,
            name: pDef.prodEnvSlug,
            slug: pDef.prodEnvSlug,
            type: EnvironmentType.PRODUCTION,
            deploymentTargetType: DeploymentTargetType.DOCKER,
            clusterName: 'demo-prod-cluster',
            clusterRegion: 'us-east-1',
            k8sNamespace: `${pDef.prodEnvSlug}-ns`,
            connectionStatus: EnvironmentConnectionStatus.CONNECTED,
          },
        });
      }

      if (i === 0) firstEnvironmentId = stagingEnv.id;

      // D. Secrets for Staging Environment
      const sampleSecrets = [
        { key: 'DATABASE_URL', val: 'postgresql://demo_operator:secret@demo-postgres:5432/db' },
        { key: 'CACHE_REDIS_URL', val: 'redis://demo-redis:6379' },
        { key: 'API_SECRET_KEY', val: 'demo-auth-secret-key-2026' },
      ];
      for (const sec of sampleSecrets) {
        const existingSecret = await this.prisma.secret.findFirst({
          where: { environmentId: stagingEnv.id, key: sec.key, deletedAt: null },
        });
        if (!existingSecret) {
          const iv = crypto.randomBytes(12);
          const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            crypto
              .createHash('sha256')
              .update('opspilot-ai-default-master-encryption-key-32bytes')
              .digest(),
            iv,
          );
          const enc = Buffer.concat([cipher.update(sec.val, 'utf8'), cipher.final()]);
          const tag = cipher.getAuthTag();
          await this.prisma.secret.create({
            data: {
              environmentId: stagingEnv.id,
              key: sec.key,
              encryptedValue: enc.toString('hex'),
              iv: iv.toString('hex'),
              authTag: tag.toString('hex'),
              algorithm: 'aes-256-gcm',
              keyVersion: 1,
            },
          });
        }
      }

      // E. Pipeline Definition & Version (Strictly 1 pipeline per project)
      const stalePipelines = await this.prisma.pipelineDefinition.findMany({
        where: { projectId: project.id, slug: { not: pDef.pipelineSlug } },
      });
      for (const staleP of stalePipelines) {
        await this.prisma.deployment.deleteMany({
          where: { pipelineRun: { pipelineDefinitionId: staleP.id } },
        });
        await this.prisma.artifact.deleteMany({
          where: { pipelineRun: { pipelineDefinitionId: staleP.id } },
        });
        await this.prisma.pipelineRunLog.deleteMany({
          where: { pipelineRun: { pipelineDefinitionId: staleP.id } },
        });
        await this.prisma.pipelineJob.deleteMany({
          where: { pipelineRun: { pipelineDefinitionId: staleP.id } },
        });
        await this.prisma.pipelineRun.deleteMany({
          where: { pipelineDefinitionId: staleP.id },
        });
        await this.prisma.pipelineVersion.deleteMany({
          where: { pipelineDefinitionId: staleP.id },
        });
        await this.prisma.pipelineDefinition.delete({
          where: { id: staleP.id },
        });
      }

      let pipeline = await this.prisma.pipelineDefinition.findFirst({
        where: { projectId: project.id, slug: pDef.pipelineSlug, deletedAt: null },
      });

      let versionId = '';
      if (!pipeline) {
        const checksum = crypto.createHash('sha256').update(pDef.yamlConfig).digest('hex');
        pipeline = await this.prisma.pipelineDefinition.create({
          data: {
            projectId: project.id,
            name: pDef.pipelineName,
            slug: pDef.pipelineSlug,
            description: `DEMO MODE: ${pDef.name} continuous integration & deployment pipeline.`,
            triggerType: TriggerType.MANUAL,
            triggerBranch: 'main',
            isActive: true,
            currentVersionNumber: 1,
          },
        });

        const v = await this.prisma.pipelineVersion.create({
          data: {
            pipelineDefinitionId: pipeline.id,
            versionNumber: 1,
            yamlConfig: pDef.yamlConfig,
            checksum,
            changeSummary: 'Initial release pipeline definition — DEMO MODE',
          },
        });
        versionId = v.id;
      } else {
        const v = await this.prisma.pipelineVersion.findFirst({
          where: { pipelineDefinitionId: pipeline.id },
          orderBy: { versionNumber: 'desc' },
        });
        versionId = v?.id || '';
      }

      if (i === 0) {
        firstPipelineId = pipeline.id;
        firstPipelineVersionId = versionId;
      }

      // F. Historical Runs (Ensure at least 3 runs: 2 SUCCESS, 1 FAILED)
      const existingRunsCount = await this.prisma.pipelineRun.count({
        where: { pipelineDefinitionId: pipeline.id, deletedAt: null },
      });

      if (existingRunsCount < 3) {
        this.logger.log(`[DEMO] Seeding historical runs for project '${pDef.name}'...`);

        // Run 1: SUCCESS (Staging Deployment)
        await this.createHistoricalRun({
          pipelineId: pipeline.id,
          versionId,
          status: PipelineRunStatus.SUCCESS,
          branch: 'main',
          commitSha: `a${i}f${i}02c`,
          durationSeconds: 42 + i * 5,
          timeOffsetHours: 3,
          userId: user.id,
          stagingEnvId: stagingEnv.id,
          artifactDir,
          projectName: pDef.slug,
          runIndex: 1,
        });

        // Run 2: FAILED (Feature Branch / Test failure)
        await this.createHistoricalRun({
          pipelineId: pipeline.id,
          versionId,
          status: PipelineRunStatus.FAILED,
          branch: 'feat/experimental-cache',
          commitSha: `b${i}c${i}901`,
          durationSeconds: 18 + i * 2,
          timeOffsetHours: 2,
          userId: user.id,
          stagingEnvId: stagingEnv.id,
          artifactDir,
          projectName: pDef.slug,
          runIndex: 2,
        });

        // Run 3: SUCCESS (Production Deployment)
        await this.createHistoricalRun({
          pipelineId: pipeline.id,
          versionId,
          status: PipelineRunStatus.SUCCESS,
          branch: 'main',
          commitSha: `c${i}e${i}590`,
          durationSeconds: 38 + i * 4,
          timeOffsetHours: 1,
          userId: user.id,
          stagingEnvId: prodEnv.id,
          artifactDir,
          projectName: pDef.slug,
          runIndex: 3,
        });
      }
    }

    // ── 6. Seed Demo Incident for Observability ────────────────────────
    const existingIncident = await this.prisma.incident.findFirst({
      where: { organizationId: org.id },
    });
    if (!existingIncident) {
      await this.prisma.incident.create({
        data: {
          organizationId: org.id,
          projectId: firstProjectId,
          environmentId: firstEnvironmentId,
          title: 'Simulated Latency Spike on /api/v1/checkout',
          description:
            'DEMO MODE: Synthetic 120ms p99 latency anomaly detected and automatically resolved by Redis cache scaling.',
          severity: IncidentSeverity.MEDIUM,
          status: IncidentStatus.RESOLVED,
          service: 'checkout-service',
          rootCause: 'Episodic cache thrashing under simulated peak concurrent load.',
          impactSummary: '3.2% of sample requests experienced >100ms latency for 4 minutes.',
          mitigationAction: 'Auto-scaled cache connection pool from 20 to 50 connections.',
          aiInvestigated: true,
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      });
    }

    this.logger.log('[DEMO] Complete 3-project demo context verified.');

    return {
      userId: user.id,
      orgId: org.id,
      projectId: firstProjectId,
      pipelineId: firstPipelineId,
      pipelineVersionId: firstPipelineVersionId,
      environmentId: firstEnvironmentId,
    };
  }

  /**
   * Creates a deterministic historical run complete with jobs, logs, physical artifact, and deployment.
   */
  private async createHistoricalRun(params: {
    pipelineId: string;
    versionId: string;
    status: PipelineRunStatus;
    branch: string;
    commitSha: string;
    durationSeconds: number;
    timeOffsetHours: number;
    userId: string;
    stagingEnvId: string;
    artifactDir: string;
    projectName: string;
    runIndex: number;
  }): Promise<void> {
    const startedAt = new Date(Date.now() - params.timeOffsetHours * 3600 * 1000);
    const finishedAt = new Date(startedAt.getTime() + params.durationSeconds * 1000);

    const run = await this.prisma.pipelineRun.create({
      data: {
        pipelineDefinitionId: params.pipelineId,
        pipelineVersionId: params.versionId,
        status: params.status,
        triggerType: TriggerType.MANUAL,
        triggeredBy: 'demo-operator',
        branch: params.branch,
        commitSha: params.commitSha,
        queuedAt: new Date(startedAt.getTime() - 2000),
        startedAt,
        finishedAt,
        durationSeconds: params.durationSeconds,
      },
    });

    const isSuccess = params.status === PipelineRunStatus.SUCCESS;

    // Jobs
    const stages = [
      { name: 'checkout-source', stage: 'git-source', dur: 4 },
      { name: 'install-dependencies', stage: 'dependencies', dur: 8 },
      { name: 'build-application', stage: 'build', dur: 12 },
      { name: 'test-suite', stage: 'test', dur: 10, fail: !isSuccess },
      ...(isSuccess
        ? [
            { name: 'security-audit', stage: 'security', dur: 6 },
            { name: 'create-artifact', stage: 'package', dur: 5 },
            { name: 'deploy-staging', stage: 'deploy', dur: 7 },
          ]
        : []),
    ];

    for (const st of stages) {
      const jobStatus = st.fail ? JobStatus.FAILED : JobStatus.SUCCESS;
      const job = await this.prisma.pipelineJob.create({
        data: {
          pipelineRunId: run.id,
          name: st.name,
          stage: st.stage,
          status: jobStatus,
          startedAt,
          finishedAt,
          durationSeconds: st.dur,
        },
      });

      // Logs for job
      await this.prisma.pipelineRunLog.create({
        data: {
          pipelineRunId: run.id,
          jobId: job.id,
          level: LogLevel.INFO,
          message: `DEMO MODE: Executing job '${st.name}' in stage '${st.stage}'.`,
          timestamp: startedAt,
        },
      });

      if (st.fail) {
        await this.prisma.pipelineRunLog.create({
          data: {
            pipelineRunId: run.id,
            jobId: job.id,
            level: LogLevel.ERROR,
            message: `DEMO MODE: Simulated test failure in '${st.name}' — 1 assertion failed (Expected HTTP 200, got 500).`,
            timestamp: finishedAt,
          },
        });
      } else {
        await this.prisma.pipelineRunLog.create({
          data: {
            pipelineRunId: run.id,
            jobId: job.id,
            level: LogLevel.INFO,
            message: `DEMO MODE: Job '${st.name}' completed successfully in ${st.dur}s.`,
            timestamp: finishedAt,
          },
        });
      }
    }

    // If successful, create a real physical artifact archive and deployment record
    if (isSuccess) {
      const artifactFileName = `${params.projectName}-bundle-r${params.runIndex}-${run.id.slice(0, 8)}.tar.gz`;
      const archivePath = path.join(params.artifactDir, artifactFileName);

      const content = Buffer.from(
        `OpsPilot Verified Demo Artifact\nProject: ${params.projectName}\nRunId: ${run.id}\nBuilt: ${finishedAt.toISOString()}\nStatus: SUCCESS\n`,
      );
      const gzipped = zlib.gzipSync(content);
      fs.writeFileSync(archivePath, gzipped);

      const checksum = crypto.createHash('sha256').update(gzipped).digest('hex');
      const sizeBytes = BigInt(gzipped.length);

      const artifact = await this.prisma.artifact.create({
        data: {
          pipelineRunId: run.id,
          name: `${params.projectName}-bundle`,
          version: `v1.0.${params.runIndex}`,
          checksum,
          storageLocation: archivePath,
          sizeBytes,
          status: 'AVAILABLE',
        },
      });

      // Deployment
      await this.prisma.deployment.create({
        data: {
          environmentId: params.stagingEnvId,
          pipelineRunId: run.id,
          artifactId: artifact.id,
          status: DeploymentStatus.SUCCESS,
          releaseVersion: `v1.0.${params.runIndex}`,
          deployedByUserId: params.userId,
          startedAt,
          finishedAt,
          durationSeconds: 15,
        },
      });
    }
  }
}
