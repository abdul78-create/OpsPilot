import { Injectable, Logger } from '@nestjs/common';
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
} from '@prisma/client';

// ─────────────────────────────────────────────────────────
//  DEMO CONSTANTS — no real credentials, display-only URLs
// ─────────────────────────────────────────────────────────
export const DEMO_ORG_SLUG = 'demo-org-opspilot-internal';
export const DEMO_USER_EMAIL = 'demo@opspilot.demo';
export const DEMO_USER_NAME = 'Demo Operator';
export const DEMO_ORG_NAME = 'OpsPilot Demo Organization';
export const DEMO_PROJECT_NAME = 'Demo E-Commerce Platform';
export const DEMO_PROJECT_SLUG = 'demo-ecommerce-platform';
export const DEMO_REPO_URL = 'https://github.com/example/demo-ecommerce-app';
export const DEMO_ENV_SLUG = 'demo-staging';
export const DEMO_PIPELINE_SLUG = 'demo-cicd-pipeline';

/** Demo pipeline YAML — deterministic, safe, no real infra */
export const DEMO_PIPELINE_YAML = `
name: Demo CI/CD Pipeline
mode: demo
stages:
  - name: git-source
    jobs:
      - name: checkout-source
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Loading bundled demo application source."
          - echo "DEMO MODE: Demo source workspace prepared."
  - name: dependency-installation
    jobs:
      - name: install-dependencies
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Installing declared demo dependencies."
          - echo "DEMO MODE: Dependency installation completed."
  - name: application-build
    jobs:
      - name: build-application
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running simulated application build."
          - echo "DEMO MODE: Build completed successfully."
  - name: automated-tests
    jobs:
      - name: test-suite
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running bundled demo test suite."
          - echo "DEMO MODE: 24 tests passed."
  - name: security-scan
    jobs:
      - name: security-audit
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Running simulated security analysis."
          - echo "DEMO MODE: No blocking HIGH or CRITICAL findings in demo scan."
  - name: package-artifact
    jobs:
      - name: create-artifact
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Creating demo artifact."
          - echo "DEMO MODE: Artifact created successfully."
  - name: deploy-demo-staging
    jobs:
      - name: deploy-staging
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Deploying to simulated demo-staging environment."
          - echo "DEMO MODE: No external infrastructure was contacted."
  - name: health-check
    jobs:
      - name: verify-staging
        image: node:20-alpine
        steps:
          - echo "DEMO MODE: Simulated health endpoint returned HTTP 200."
          - echo "DEMO MODE: Deployment complete."
`.trim();

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
   * Idempotently create or retrieve the entire demo tenant.
   * Safe to call multiple times — never duplicates.
   */
  async ensureDemoContext(): Promise<DemoContext> {
    // ── Demo Org ──────────────────────────────────────────────────────
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

    // ── Demo User ─────────────────────────────────────────────────────
    let user = await this.prisma.user.findFirst({
      where: { email: DEMO_USER_EMAIL, deletedAt: null },
    });

    if (!user) {
      this.logger.log('[DEMO] Creating demo user...');
      // Demo password is managed only by the backend; never exposed in frontend
      const demoPasswordRaw = process.env.DEMO_PASSWORD || 'DemoOpsPilot#2026!';
      const passwordHash = await this.hashService.hashPassword(demoPasswordRaw);
      user = await this.prisma.user.create({
        data: {
          email: DEMO_USER_EMAIL,
          name: DEMO_USER_NAME,
          passwordHash,
          isVerified: true, // Pre-verified so demo login skips email flow
        },
      });
    }

    // ── Demo Org Membership ───────────────────────────────────────────
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

    // ── Demo Project ──────────────────────────────────────────────────
    let project = await this.prisma.project.findFirst({
      where: { organizationId: org.id, slug: DEMO_PROJECT_SLUG, deletedAt: null },
    });

    if (!project) {
      this.logger.log('[DEMO] Creating demo project...');
      project = await this.prisma.project.create({
        data: {
          organizationId: org.id,
          name: DEMO_PROJECT_NAME,
          slug: DEMO_PROJECT_SLUG,
          description:
            'Sample application used to demonstrate the OpsPilot CI/CD workflow. DEMO MODE — Simulated Demo Environment.',
          status: ProjectStatus.ACTIVE,
        },
      });
    }

    // ── Demo Repository Connection (display-only, never cloned) ───────
    const existingRepo = await this.prisma.repositoryConnection.findFirst({
      where: { projectId: project.id, deletedAt: null },
    });

    if (!existingRepo) {
      this.logger.log('[DEMO] Creating demo repository connection...');
      await this.prisma.repositoryConnection.create({
        data: {
          projectId: project.id,
          // Display-only URL — never cloned or accessed in real mode
          repositoryUrl: DEMO_REPO_URL,
          defaultBranch: 'main',
          isVerified: false,
        },
      });
    }

    // ── Demo Environment ──────────────────────────────────────────────
    let environment = await this.prisma.environment.findFirst({
      where: { projectId: project.id, slug: DEMO_ENV_SLUG, deletedAt: null },
    });

    if (!environment) {
      this.logger.log('[DEMO] Creating demo environment...');
      environment = await this.prisma.environment.create({
        data: {
          projectId: project.id,
          name: 'demo-staging',
          slug: DEMO_ENV_SLUG,
          type: EnvironmentType.STAGING,
          deploymentTargetType: DeploymentTargetType.DOCKER,
          clusterName: 'demo-cluster',
          clusterRegion: 'demo-region',
          k8sNamespace: 'demo-staging',
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
        },
      });
    }

    // ── Demo Pipeline ─────────────────────────────────────────────────
    let pipeline = await this.prisma.pipelineDefinition.findFirst({
      where: { projectId: project.id, slug: DEMO_PIPELINE_SLUG, deletedAt: null },
    });

    let pipelineVersionId: string;

    if (!pipeline) {
      this.logger.log('[DEMO] Creating demo pipeline...');
      const { createHash } = await import('crypto');
      const checksum = createHash('sha256').update(DEMO_PIPELINE_YAML).digest('hex');

      pipeline = await this.prisma.pipelineDefinition.create({
        data: {
          projectId: project.id,
          name: 'Demo CI/CD Pipeline',
          slug: DEMO_PIPELINE_SLUG,
          description: 'DEMO MODE: Isolated demonstration pipeline. Simulated Demo Environment.',
          triggerType: TriggerType.MANUAL,
          triggerBranch: 'main',
          isActive: true,
          currentVersionNumber: 1,
        },
      });

      const version = await this.prisma.pipelineVersion.create({
        data: {
          pipelineDefinitionId: pipeline.id,
          versionNumber: 1,
          yamlConfig: DEMO_PIPELINE_YAML,
          checksum,
          changeSummary: 'Initial demo pipeline version — DEMO MODE',
        },
      });
      pipelineVersionId = version.id;
    } else {
      const latestVersion = await this.prisma.pipelineVersion.findFirst({
        where: { pipelineDefinitionId: pipeline.id },
        orderBy: { versionNumber: 'desc' },
      });
      pipelineVersionId = latestVersion!.id;
    }

    this.logger.log('[DEMO] Demo context ready.');

    return {
      userId: user.id,
      orgId: org.id,
      projectId: project.id,
      pipelineId: pipeline.id,
      pipelineVersionId,
      environmentId: environment.id,
    };
  }
}
