import { Test, TestingModule } from '@nestjs/testing';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';
import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AiAnalysisType, AiRiskLevel, JobStatus, EnvironmentType } from '@prisma/client';

describe('AiOrchestrationService', () => {
  let service: AiOrchestrationService;

  const mockAiRepository = {
    create: jest.fn(),
    findByOrganization: jest.fn(),
    findById: jest.fn(),
  };

  const mockPrisma = {
    pipelineRun: {
      findFirst: jest.fn(),
    },
    deployment: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
    environment: {
      findFirst: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const mockAiProvider = {
    analyzeRunFailure: jest.fn(),
    scoreDeploymentRisk: jest.fn(),
    recommendOptimizations: jest.fn(),
    auditSecurity: jest.fn(),
  };

  const mockRunReport = {
    id: 'air_123',
    organizationId: 'org_123',
    projectId: 'prj_123',
    type: AiAnalysisType.RUN_RCA,
    targetId: 'run_123',
    summary: 'Automated Root Cause Analysis for Pipeline Run failure',
    rootCause: 'Job execution failed in stage(s): Build',
    confidenceScore: 0.85,
    riskLevel: AiRiskLevel.MEDIUM,
    recommendations: ['Review detailed step execution logs'],
    metadata: {},
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiOrchestrationService,
        { provide: AiOrchestrationRepository, useValue: mockAiRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiAiProvider, useValue: mockAiProvider },
      ],
    }).compile();

    service = module.get<AiOrchestrationService>(AiOrchestrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeRunFailure()', () => {
    it('should throw NotFoundException when pipeline run is missing', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue(null);

      await expect(service.analyzeRunFailure('nonexistent_run')).rejects.toThrow(
        "Pipeline Run 'nonexistent_run' not found",
      );
    });

    it('should analyze failed run and persist AiAnalysisReport when AI provider succeeds', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({
        id: 'run_123',
        branch: 'main',
        commitSha: 'sha123',
        pipelineDefinition: {
          name: 'Build & Test',
          project: { id: 'prj_123', organizationId: 'org_123' },
        },
        jobs: [
          {
            id: 'job_1',
            name: 'Build Source',
            stage: 'build',
            status: JobStatus.FAILED,
            logs: [{ level: 'ERROR', message: 'EACCES: permission denied', timestamp: new Date() }],
          },
        ],
      });

      mockAiProvider.analyzeRunFailure.mockResolvedValue({
        summary: 'Build failure due to permissions',
        rootCause: 'File system permission denied',
        confidenceScore: 0.95,
        riskLevel: AiRiskLevel.HIGH,
        recommendations: ['Check file permissions'],
      });

      mockAiRepository.create.mockResolvedValue(mockRunReport);

      const result = await service.analyzeRunFailure('run_123');

      expect(result).toEqual(mockRunReport);
      expect(mockAiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiAnalysisType.RUN_RCA,
          targetId: 'run_123',
        }),
      );
    });

    it('should strictly throw ServiceUnavailableException and NEVER fabricate fake RCA if AI provider is unconfigured or fails (Negative Integrity Test)', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({
        id: 'run_123',
        branch: 'main',
        commitSha: 'sha123',
        pipelineDefinition: {
          name: 'Build & Test',
          project: { id: 'prj_123', organizationId: 'org_123' },
        },
        jobs: [
          {
            id: 'job_1',
            name: 'Build Source',
            stage: 'build',
            status: JobStatus.FAILED,
            logs: [
              { level: 'ERROR', message: 'Process exited with code 1', timestamp: new Date() },
            ],
          },
        ],
      });

      mockAiProvider.analyzeRunFailure.mockRejectedValue(
        new ServiceUnavailableException(
          'AI Root Cause Analysis unavailable: AI provider is not configured. Configure GEMINI_API_KEY to enable automated RCA.',
        ),
      );

      await expect(service.analyzeRunFailure('run_123')).rejects.toThrow(
        ServiceUnavailableException,
      );

      // Verify that no fake/fabricated report was created in the database
      expect(mockAiRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('scoreDeploymentRisk()', () => {
    it('should throw NotFoundException when deployment is missing', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue(null);

      await expect(service.scoreDeploymentRisk('nonexistent_dep')).rejects.toThrow(
        "Deployment 'nonexistent_dep' not found",
      );
    });

    it('should score deployment risk and persist report', async () => {
      mockPrisma.deployment.findFirst.mockResolvedValue({
        id: 'dep_123',
        releaseVersion: 'v1.2.0',
        environment: {
          id: 'env_prod',
          name: 'Production',
          type: 'PRODUCTION',
          requiresApproval: true,
          minApprovers: 2,
          project: { id: 'prj_123', organizationId: 'org_123' },
        },
        approvals: [{ status: 'APPROVED' }],
      });

      mockPrisma.deployment.count
        .mockResolvedValueOnce(10) // totalRecent
        .mockResolvedValueOnce(3); // failedRecent

      mockAiProvider.scoreDeploymentRisk.mockResolvedValue({
        riskScore: 65,
        riskLevel: AiRiskLevel.CRITICAL,
        summary: 'Deployment Risk Score: 65/100',
        riskFactors: ['Target environment is PRODUCTION.'],
        recommendations: ['Follow standard deployment rollout procedures.'],
      });

      mockAiRepository.create.mockResolvedValue({
        ...mockRunReport,
        type: AiAnalysisType.DEPLOYMENT_RISK,
        targetId: 'dep_123',
        riskLevel: AiRiskLevel.CRITICAL,
      });

      const result = await service.scoreDeploymentRisk('dep_123');

      expect(result.type).toBe(AiAnalysisType.DEPLOYMENT_RISK);
      expect(mockAiRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AiAnalysisType.DEPLOYMENT_RISK,
          targetId: 'dep_123',
        }),
      );
    });
  });

  describe('handleRunFailedEvent()', () => {
    it('should automatically invoke analyzeRunFailure on failure event', async () => {
      jest.spyOn(service, 'analyzeRunFailure').mockResolvedValue(mockRunReport);

      await service.handleRunFailedEvent({ payload: { pipelineRunId: 'run_123' } });

      expect(service.analyzeRunFailure).toHaveBeenCalledWith('run_123');
    });
  });

  describe('getAiStatus()', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    afterAll(() => {
      process.env = origEnv;
    });

    it('should return connected status when GEMINI_API_KEY is present', async () => {
      process.env.GEMINI_API_KEY = 'test_key';
      const status = await service.getAiStatus();

      expect(status.configured).toBe(true);
      expect(status.status).toBe('connected');
      expect(status.provider).toBe('Google Gemini');
      expect(status.model).toBe('gemini-1.5-flash');
      expect(status.capabilities).toContain('PIPELINE_GENERATION');
    });

    it('should return unavailable status when GEMINI_API_KEY is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_KEY;
      const status = await service.getAiStatus();

      expect(status.configured).toBe(false);
      expect(status.status).toBe('unavailable');
      expect(status.provider).toBe('Deterministic DevOps Heuristic Engine');
      expect(status.model).toBe('opspilot-rule-engine-v2');
      expect(status.capabilities).toContain('PIPELINE_GENERATION');
    });
  });

  describe('generatePipeline()', () => {
    const mockTenantAProject = {
      id: 'prj_tenant_a',
      organizationId: 'org_tenant_a',
      name: 'Tenant A Service',
      slug: 'tenant-a-service',
    };

    const mockTenantBProject = {
      id: 'prj_tenant_b',
      organizationId: 'org_tenant_b',
      name: 'Tenant B Service',
      slug: 'tenant-b-service',
    };

    const mockTenantAStagingEnv = {
      id: 'env_staging_a',
      projectId: 'prj_tenant_a',
      name: 'Tenant A Staging',
      slug: 'staging',
      type: EnvironmentType.STAGING,
      clusterName: 'k8s-cluster-tenant-a-east',
      k8sNamespace: 'acme-staging-ns',
    };

    const mockTenantBStagingEnv = {
      id: 'env_staging_b',
      projectId: 'prj_tenant_b',
      name: 'Tenant B Staging',
      slug: 'staging',
      type: EnvironmentType.STAGING,
      clusterName: 'gke-cluster-tenant-b-west',
      k8sNamespace: 'tenant-b-staging-ns',
    };

    const mockTenantAProdEnv = {
      id: 'env_prod_a',
      projectId: 'prj_tenant_a',
      name: 'Tenant A Production',
      slug: 'production',
      type: EnvironmentType.PRODUCTION,
      clusterName: 'k8s-cluster-tenant-a-prod',
      k8sNamespace: 'acme-prod-ns',
    };

    const mockRepoConnA = {
      id: 'conn_a_1',
      projectId: 'prj_tenant_a',
      repositoryUrl: 'https://github.com/tenant-a/service.git',
      defaultBranch: 'main',
    };

    const mockRepoConnB = {
      id: 'conn_b_1',
      projectId: 'prj_tenant_b',
      repositoryUrl: 'https://github.com/tenant-b/service.git',
      defaultBranch: 'main',
    };

    beforeEach(() => {
      mockPrisma.repositoryConnection.findFirst.mockImplementation(async ({ where }: any) => {
        if (where?.projectId === 'prj_tenant_b') return mockRepoConnB;
        return mockRepoConnA;
      });
    });

    it('A. Tenant A + configured staging → uses Tenant A staging target', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
      mockPrisma.environment.findFirst.mockResolvedValue(mockTenantAStagingEnv);

      const prompt = 'Deploy FastAPI app to staging with Trivy security scan';
      const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

      expect(result.name).toBe('Python Delivery Pipeline');
      expect(result.yamlConfig).toContain('acme-staging-ns');
      expect(result.yamlConfig).not.toContain('staging-us-east-1');
      expect(result.yamlConfig).not.toContain('prod-us-east-1');

      const deployNode = result.nodes.find((n) => n.type === 'deploy');
      expect(deployNode).toBeDefined();
      expect(deployNode.data.cluster).toBe('k8s-cluster-tenant-a-east');
      expect(deployNode.data.namespace).toBe('acme-staging-ns');
      expect(deployNode.data.command).toBe('kubectl apply -f k8s/ --namespace acme-staging-ns');
    });

    it('B. Tenant B + configured staging → uses Tenant B staging target', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantBProject);
      mockPrisma.environment.findFirst.mockResolvedValue(mockTenantBStagingEnv);

      const prompt = 'Deploy Python to staging';
      const result = await service.generatePipeline(prompt, 'prj_tenant_b', 'org_tenant_b');

      expect(result.yamlConfig).toContain('tenant-b-staging-ns');
      expect(result.yamlConfig).not.toContain('staging-us-east-1');

      const deployNode = result.nodes.find((n) => n.type === 'deploy');
      expect(deployNode.data.cluster).toBe('gke-cluster-tenant-b-west');
      expect(deployNode.data.namespace).toBe('tenant-b-staging-ns');
      expect(deployNode.data.command).toBe('kubectl apply -f k8s/ --namespace tenant-b-staging-ns');
    });

    it('C. Tenant B cannot use Tenant A projectId (authorization isolation error)', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);

      await expect(
        service.generatePipeline('Deploy to staging', 'prj_tenant_a', 'org_tenant_b'),
      ).rejects.toThrow(
        "Access denied: Project 'prj_tenant_a' does not belong to your organization",
      );
    });

    it('D. No staging environment → explicit rejection', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
      mockPrisma.environment.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePipeline('Deploy to staging', 'prj_tenant_a', 'org_tenant_a'),
      ).rejects.toThrow(
        'Staging environment is not configured for this project. Configure a staging environment in Project Settings first.',
      );
    });

    it('E. Staging environment exists but target missing → explicit configuration error', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
      mockPrisma.environment.findFirst.mockResolvedValue({
        id: 'env_staging_unconfigured',
        projectId: 'prj_tenant_a',
        name: 'Staging',
        slug: 'staging',
        type: EnvironmentType.STAGING,
        clusterName: null,
        k8sNamespace: null,
      });

      await expect(
        service.generatePipeline('Deploy to staging', 'prj_tenant_a', 'org_tenant_a'),
      ).rejects.toThrow(
        "Deployment target is not configured for environment 'staging'. Configure Kubernetes namespace and cluster in Environment Settings first.",
      );
    });

    it('F. Production uses customer production target', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
      mockPrisma.environment.findFirst.mockResolvedValue(mockTenantAProdEnv);

      const prompt = 'Deploy FastAPI app to production';
      const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

      expect(result.yamlConfig).toContain('acme-prod-ns');
      expect(result.yamlConfig).not.toContain('prod-us-east-1');

      const deployNode = result.nodes.find((n) => n.type === 'deploy');
      expect(deployNode.data.cluster).toBe('k8s-cluster-tenant-a-prod');
      expect(deployNode.data.namespace).toBe('acme-prod-ns');
    });

    it('G & H. Neither staging-us-east-1 nor prod-us-east-1 are fabricated', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
      mockPrisma.environment.findFirst.mockResolvedValue(mockTenantAStagingEnv);

      const result = await service.generatePipeline(
        'Deploy to staging',
        'prj_tenant_a',
        'org_tenant_a',
      );
      expect(result.yamlConfig).not.toContain('staging-us-east-1');
      expect(result.yamlConfig).not.toContain('prod-us-east-1');
    });

    it('J. Existing non-deployment AI generation still works', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);

      const prompt = 'Build and test Go API microservice';
      const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

      expect(result.name).toBe('Go Delivery Pipeline');
      expect(result.yamlConfig).toContain('golang:1.22-alpine');
      expect(result.yamlConfig).toContain('go test ./...');
      expect(result.nodes.map((n) => n.type)).toEqual(['source', 'build', 'test']);
      expect(result.edges.length).toBe(2);
    });

    it('L. Ambiguous deployment request remains rejected', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);

      await expect(
        service.generatePipeline('Deploy my Go app', 'prj_tenant_a', 'org_tenant_a'),
      ).rejects.toThrow(
        'Target deployment environment is ambiguous or not specified. Please explicitly specify either "staging" or "production".',
      );
    });

    // ── REGRESSION MATRIX: CI-Only vs Explicit Deployment Generation ──
    describe('Regression Matrix: CI-Only vs Deployment Environment Resolution', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('A. CI-only prompt ("Build and test this repository") succeeds without any environment configured', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(null);

        const prompt = 'Build and test this repository';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(result).toBeDefined();
        expect(result.yamlConfig).toBeDefined();
        expect(mockPrisma.environment.findFirst).not.toHaveBeenCalled();
      });

      it('B. CI-only YAML and DAG contains no deployment stage', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(null);

        const prompt = 'Run tests and security scan';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(false);
        expect(result.yamlConfig).not.toContain('deploy');
        expect(result.yamlConfig).not.toContain('kubectl');
        expect(result.yamlConfig).not.toContain('bitnami');
        expect(result.yamlConfig).toContain('checkout-source');
        expect(result.yamlConfig).toContain('test-suite');
        expect(result.yamlConfig).toContain('security-audit');
      });

      it('C. "Build and deploy to staging" explicitly requires staging environment', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue({
          ...mockTenantAStagingEnv,
          connectionStatus: 'CONFIGURED',
        });

        const prompt = 'Build and deploy to staging';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).toHaveBeenCalledWith({
          where: { projectId: 'prj_tenant_a', type: EnvironmentType.STAGING, deletedAt: null },
        });
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(true);
        expect(result.yamlConfig).toContain('acme-staging-ns');
        expect(result.yamlConfig).toContain('deploy-staging');
      });

      it('D. "Deploy this to production" explicitly requires production environment', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue({
          ...mockTenantAProdEnv,
          connectionStatus: 'CONFIGURED',
        });

        const prompt = 'Deploy this to production';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).toHaveBeenCalledWith({
          where: { projectId: 'prj_tenant_a', type: EnvironmentType.PRODUCTION, deletedAt: null },
        });
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(true);
        expect(result.yamlConfig).toContain('acme-prod-ns');
        expect(result.yamlConfig).toContain('deploy-production');
      });

      it('E. "Build and deploy" without target environment is rejected as ambiguous', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);

        await expect(
          service.generatePipeline('Build and deploy', 'prj_tenant_a', 'org_tenant_a'),
        ).rejects.toThrow(
          'Target deployment environment is ambiguous or not specified. Please explicitly specify either "staging" or "production".',
        );
      });

      it('F. Unconfigured requested deployment target is strictly rejected', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue({
          id: 'env_staging_unconfigured',
          projectId: 'prj_tenant_a',
          name: 'Staging',
          slug: 'staging',
          type: EnvironmentType.STAGING,
          connectionStatus: 'NOT_CONFIGURED',
          clusterName: 'k8s-cluster',
          k8sNamespace: 'staging-ns',
        });

        await expect(
          service.generatePipeline('Build and deploy to staging', 'prj_tenant_a', 'org_tenant_a'),
        ).rejects.toThrow(
          'Staging deployment target is not configured for this project. Connect a deployment target in Environment Settings first.',
        );
      });

      it('G. No default staging or production environment is selected for CI-only request', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(mockTenantAProdEnv);

        const prompt = 'Analyze connected repository and generate a CI pipeline for our product';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).not.toHaveBeenCalled();
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(false);
        expect(result.yamlConfig).not.toContain('acme-prod-ns');
        expect(result.yamlConfig).not.toContain('staging');
        expect(result.yamlConfig).not.toContain('production');
        expect(result.yamlConfig).not.toContain('deploy-');
      });

      it('H. Explicit negative prompt ("This is a CI-only request. Do NOT deploy anything. Do not require staging or production") succeeds without querying environments', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(null);

        const prompt =
          'This is a CI-only request. Do NOT deploy anything. Do not require staging or production for this request.';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).not.toHaveBeenCalled();
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(false);
        expect(result.yamlConfig).not.toContain('deploy-');
        expect(result.yamlConfig).not.toContain('staging');
        expect(result.yamlConfig).not.toContain('production');
      });

      it('I. "Deploy to staging, do not deploy to production" resolves to staging without ambiguity', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue({
          ...mockTenantAStagingEnv,
          connectionStatus: 'CONFIGURED',
        });

        const prompt = 'Deploy to staging, do not deploy to production';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).toHaveBeenCalledWith({
          where: { projectId: 'prj_tenant_a', type: EnvironmentType.STAGING, deletedAt: null },
        });
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(true);
        expect(result.yamlConfig).toContain('deploy-staging');
        expect(result.yamlConfig).not.toContain('deploy-production');
      });

      it('J. "Deploy to production, do not deploy to staging" resolves to production without ambiguity', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue({
          ...mockTenantAProdEnv,
          connectionStatus: 'CONFIGURED',
        });

        const prompt = 'Deploy to production, do not deploy to staging';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(mockPrisma.environment.findFirst).toHaveBeenCalledWith({
          where: { projectId: 'prj_tenant_a', type: EnvironmentType.PRODUCTION, deletedAt: null },
        });
        expect(result.nodes.some((n) => n.type === 'deploy')).toBe(true);
        expect(result.yamlConfig).toContain('deploy-production');
        expect(result.yamlConfig).not.toContain('deploy-staging');
      });

      it('J2. Affirmative-First Deployment Intent Parser Suite (All CI-Only vs Deploy Scenarios)', async () => {
        const ciOnlyPrompts = [
          'Do not deploy',
          'Do NOT deploy to staging',
          'Do not deploy to production',
          'Do not deploy to staging or production',
          'Do not create a deployment',
          'Do not add a deployment',
          'Do not run deployment',
          'Do not include deployment',
          'without deployment',
          'without any deployment',
          'zero deployment stages',
          'no deployment',
          'omit deployment',
          'exclude deployment',
          'CI-only',
          'production-ready build',
          'production build',
          'production quality',
        ];

        for (const p of ciOnlyPrompts) {
          const intent = service.parseDeploymentIntent(p);
          expect(intent.hasAffirmativeDeploy).toBe(false);
          expect(intent.targetEnv).toBeNull();
          expect(intent.isAmbiguous).toBe(false);
        }

        // Affirmative staging
        expect(service.parseDeploymentIntent('Deploy to staging')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: 'staging',
          isAmbiguous: false,
        });
        expect(service.parseDeploymentIntent('Build and deploy to staging')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: 'staging',
          isAmbiguous: false,
        });

        // Affirmative production
        expect(service.parseDeploymentIntent('Deploy to production')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: 'production',
          isAmbiguous: false,
        });
        expect(service.parseDeploymentIntent('Build and deploy to production')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: 'production',
          isAmbiguous: false,
        });

        // Ambiguous rejection
        expect(service.parseDeploymentIntent('Build and deploy')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: null,
          isAmbiguous: true,
        });
        expect(service.parseDeploymentIntent('Deploy to Kubernetes')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: null,
          isAmbiguous: true,
        });
        expect(service.parseDeploymentIntent('Deploy to Render')).toEqual({
          hasAffirmativeDeploy: true,
          targetEnv: null,
          isAmbiguous: true,
        });
      });

      it('J3. CI-Only Generation Matrix: ZERO deployment stages, ZERO environment lookup for negative prompts', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockClear();

        const testPrompts = [
          'Do NOT deploy to staging',
          'zero deployment stages',
          'Do not create a deployment',
          'production-ready build with unit tests',
        ];

        for (const prompt of testPrompts) {
          const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');
          expect(mockPrisma.environment.findFirst).not.toHaveBeenCalled();
          expect(result.nodes.some((n) => n.type === 'deploy')).toBe(false);
          expect(result.yamlConfig).not.toContain('deploy-');
          expect(result.yamlConfig).not.toContain('kubectl');
        }
      });

      it('K. Repository with Prisma (prisma/schema.prisma) → includes npx prisma generate in buildCommand and YAML', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(null);
        mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
          id: 'conn_1',
          projectId: 'prj_tenant_a',
          repositoryUrl: 'https://github.com/customer/prisma-service',
          defaultBranch: 'main',
        });

        (service as any).repoScanner = {
          scanRepository: jest.fn().mockResolvedValue({
            language: 'node',
            framework: 'express',
            packageManager: 'npm',
            runtimeVersion: 'node:20-alpine',
            buildCommand: 'npm ci && npx prisma generate && npm run build',
            testCommand: 'npm test',
            detectedFiles: ['package.json', 'package-lock.json', 'prisma/schema.prisma'],
            capabilities: {
              docker: false,
              kubernetes: false,
              tests: true,
              monorepo: false,
              prisma: true,
            },
          }),
        };

        const prompt = 'Build and test this repository';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(result.yamlConfig).toContain('run: npm ci && npx prisma generate && npm run build');
        const buildNode = result.nodes.find((n) => n.type === 'build');
        expect(buildNode.data.command).toBe('npm ci && npx prisma generate && npm run build');
      });

      it('L. Repository without Prisma → strictly omits npx prisma generate from buildCommand and YAML', async () => {
        mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
        mockPrisma.environment.findFirst.mockResolvedValue(null);
        mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
          id: 'conn_2',
          projectId: 'prj_tenant_a',
          repositoryUrl: 'https://github.com/customer/standard-service',
          defaultBranch: 'main',
        });

        (service as any).repoScanner = {
          scanRepository: jest.fn().mockResolvedValue({
            language: 'node',
            framework: 'express',
            packageManager: 'npm',
            runtimeVersion: 'node:20-alpine',
            buildCommand: 'npm ci && npm run build',
            testCommand: 'npm test',
            detectedFiles: ['package.json', 'package-lock.json'],
            capabilities: {
              docker: false,
              kubernetes: false,
              tests: true,
              monorepo: false,
              prisma: false,
            },
          }),
        };

        const prompt = 'Build and test this repository';
        const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

        expect(result.yamlConfig).toContain('run: npm ci && npm run build');
        expect(result.yamlConfig).not.toContain('prisma generate');
        const buildNode = result.nodes.find((n) => n.type === 'build');
        expect(buildNode.data.command).toBe('npm ci && npm run build');
      });

      describe('14. Mandatory Regression Test Suite (A through G)', () => {
        it('A. Real repository produces exactly ONE checkout/source stage', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
            id: 'conn_opspilot',
            projectId: 'prj_tenant_a',
            repositoryUrl: 'https://github.com/abdul78-create/OpsPilot.git',
            defaultBranch: 'main',
          });
          (service as any).repoScanner = {
            scanRepository: jest.fn().mockResolvedValue({
              language: 'node',
              framework: 'express',
              packageManager: 'npm',
              runtimeVersion: 'node:20-alpine',
              buildCommand: 'npm ci && npx prisma generate && npm run build',
              testCommand: 'npm test -- --maxWorkers=2',
              detectedFiles: ['package.json', 'package-lock.json', 'prisma/schema.prisma'],
              capabilities: {
                docker: true,
                kubernetes: false,
                tests: true,
                monorepo: false,
                prisma: true,
              },
            }),
          };

          const result = await service.generatePipeline(
            'Build, test, and security scan this repository',
            'prj_tenant_a',
            'org_tenant_a',
          );

          // Verify exactly ONE source node
          const sourceNodes = result.nodes.filter((n) => n.type === 'source');
          expect(sourceNodes.length).toBe(1);
          expect(sourceNodes[0].data.repo).toBe('https://github.com/abdul78-create/OpsPilot.git');

          // Verify exactly ONE checkout-source stage in yamlConfig
          const checkoutMatches = result.yamlConfig.match(/checkout-source/g) || [];
          expect(checkoutMatches.length).toBe(1);
          expect(result.yamlConfig).toContain(
            'run: git clone https://github.com/abdul78-create/OpsPilot.git .',
          );
        });

        it('B. Placeholder "git clone repository ." is never emitted (Rejects when no real connection)', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);

          await expect(
            service.generatePipeline('CI-only request', 'prj_tenant_a', 'org_tenant_a'),
          ).rejects.toThrow("No Git repository connected to project 'Tenant A Service'");

          // Also test when repo URL is literal 'repository'
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
            id: 'conn_invalid',
            projectId: 'prj_tenant_a',
            repositoryUrl: 'repository',
            defaultBranch: 'main',
          });
          await expect(
            service.generatePipeline('CI-only request', 'prj_tenant_a', 'org_tenant_a'),
          ).rejects.toThrow("No Git repository connected to project 'Tenant A Service'");
        });

        it('C. Build stage is present', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(mockRepoConnA);

          const result = await service.generatePipeline(
            'Build and test repository',
            'prj_tenant_a',
            'org_tenant_a',
          );
          const buildNode = result.nodes.find((n) => n.type === 'build');
          expect(buildNode).toBeDefined();
          expect(result.yamlConfig).toContain('-build');
          expect(result.yamlConfig).toContain('docker-build');
        });

        it('D. Test stage is present when tests exist', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(mockRepoConnA);
          (service as any).repoScanner = {
            scanRepository: jest.fn().mockResolvedValue({
              language: 'node',
              framework: 'express',
              packageManager: 'npm',
              runtimeVersion: 'node:20-alpine',
              buildCommand: 'npm ci && npm run build',
              testCommand: 'npm test -- --maxWorkers=2',
              detectedFiles: ['package.json'],
              capabilities: {
                docker: false,
                kubernetes: false,
                tests: true,
                monorepo: false,
                prisma: false,
              },
            }),
          };

          const result = await service.generatePipeline(
            'CI pipeline with tests',
            'prj_tenant_a',
            'org_tenant_a',
          );
          const testNode = result.nodes.find((n) => n.type === 'test');
          expect(testNode).toBeDefined();
          expect(testNode.data.command).toBe('npm test -- --maxWorkers=2');
          expect(result.yamlConfig).toContain('run: npm test -- --maxWorkers=2');
        });

        it('E. Security stage is present when supported', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(mockRepoConnA);
          (service as any).repoScanner = {
            scanRepository: jest.fn().mockResolvedValue({
              language: 'node',
              framework: 'express',
              packageManager: 'npm',
              runtimeVersion: 'node:20-alpine',
              buildCommand: 'npm ci && npm run build',
              testCommand: 'npm test',
              detectedFiles: ['package.json', 'Dockerfile'],
              capabilities: {
                docker: true,
                kubernetes: false,
                tests: true,
                monorepo: false,
                prisma: false,
              },
            }),
          };

          const result = await service.generatePipeline(
            'CI-only request with security scan',
            'prj_tenant_a',
            'org_tenant_a',
          );
          const secNode = result.nodes.find((n) => n.type === 'security');
          expect(secNode).toBeDefined();
          expect(result.yamlConfig).toContain('sast-security-scan');
          expect(result.yamlConfig).toContain('trivy fs . --severity HIGH,CRITICAL');
        });

        it('F. CI-only pipeline has no deployment stage', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(mockRepoConnA);
          mockPrisma.environment.findFirst.mockResolvedValue(null);

          const prompt =
            'This is a CI-only request. Do NOT deploy anything. Do not require staging or production.';
          const result = await service.generatePipeline(prompt, 'prj_tenant_a', 'org_tenant_a');

          expect(result.nodes.some((n) => n.type === 'deploy')).toBe(false);
          expect(result.yamlConfig).not.toContain('deploy-');
          expect(result.yamlConfig).not.toContain('kubectl');
          expect(result.yamlConfig).not.toContain('environment:');
        });

        it('G. Prisma generate is preserved (npm ci && npx prisma generate && npm run build)', async () => {
          mockPrisma.project.findFirst.mockResolvedValue(mockTenantAProject);
          mockPrisma.repositoryConnection.findFirst.mockResolvedValue(mockRepoConnA);
          (service as any).repoScanner = {
            scanRepository: jest.fn().mockResolvedValue({
              language: 'node',
              framework: 'express',
              packageManager: 'npm',
              runtimeVersion: 'node:20-alpine',
              buildCommand: 'npm ci && npx prisma generate && npm run build',
              testCommand: 'npm test -- --maxWorkers=2',
              detectedFiles: ['package.json', 'prisma/schema.prisma'],
              capabilities: {
                docker: true,
                kubernetes: false,
                tests: true,
                monorepo: false,
                prisma: true,
              },
            }),
          };

          const result = await service.generatePipeline(
            'Generate CI pipeline for this repo',
            'prj_tenant_a',
            'org_tenant_a',
          );
          expect(result.yamlConfig).toContain(
            'run: npm ci && npx prisma generate && npm run build',
          );
          const buildNode = result.nodes.find((n) => n.type === 'build');
          expect(buildNode.data.command).toBe('npm ci && npx prisma generate && npm run build');
        });
      });
    });
  });

  describe('findById()', () => {
    it('should throw NotFoundException if report not found', async () => {
      mockAiRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent_rep')).rejects.toThrow(
        "AI Analysis Report 'nonexistent_rep' not found",
      );
    });
  });
});
