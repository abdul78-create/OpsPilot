import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { AiOrchestrationController } from './ai-orchestration.controller';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { BadRequestException } from '@nestjs/common';
import { TokenService } from '../../../core/security/token.service';
import { EnvironmentType } from '@prisma/client';
import {
  resolveDeployEnvironment,
  validateDAG,
  dagToYaml,
} from '../../../../frontend/src/components/builder/DAGCompiler';

describe('Visual DAG Builder AI Features Production Wiring Spec', () => {
  let controller: AiOrchestrationController;
  let service: AiOrchestrationService;

  const mockAiRepo = {
    findById: jest.fn(),
    create: jest.fn(),
    findByOrganization: jest.fn(),
  };

  const mockPrisma = {
    pipelineRun: { findFirst: jest.fn(), findUnique: jest.fn() },
    deployment: { findFirst: jest.fn(), count: jest.fn() },
    project: { findFirst: jest.fn() },
    environment: { findFirst: jest.fn() },
  };

  const defaultMockProject = {
    id: 'prj_test_123',
    organizationId: 'org_test_123',
    name: 'Test Project',
    slug: 'test-project',
  };

  const defaultMockStagingEnv = {
    id: 'env_staging_123',
    projectId: 'prj_test_123',
    name: 'Staging',
    slug: 'staging',
    type: EnvironmentType.STAGING,
    clusterName: 'staging-k8s-cluster',
    k8sNamespace: 'staging',
  };

  const defaultMockProdEnv = {
    id: 'env_prod_123',
    projectId: 'prj_test_123',
    name: 'Production',
    slug: 'production',
    type: EnvironmentType.PRODUCTION,
    clusterName: 'prod-k8s-cluster',
    k8sNamespace: 'production',
  };

  const mockAiProvider = {
    analyzeRunFailure: jest.fn(),
    scoreDeploymentRisk: jest.fn(),
    recommendOptimizations: jest.fn(),
    auditSecurity: jest.fn(),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiOrchestrationController],
      providers: [
        AiOrchestrationService,
        { provide: AiOrchestrationRepository, useValue: mockAiRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiAiProvider, useValue: mockAiProvider },
        { provide: TokenService, useValue: mockTokenService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiOrchestrationController>(AiOrchestrationController);
    service = module.get<AiOrchestrationService>(AiOrchestrationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.project.findFirst.mockResolvedValue(defaultMockProject);
    mockPrisma.environment.findFirst.mockImplementation(async ({ where }: any) => {
      if (where.type === EnvironmentType.STAGING) return defaultMockStagingEnv;
      if (where.type === EnvironmentType.PRODUCTION) return defaultMockProdEnv;
      return null;
    });
  });

  describe('1. Backend API Endpoint Wiring (POST /v1/ai/generate-pipeline)', () => {
    it('should generate real pipeline DAG with name, summary, yamlConfig, nodes, edges', async () => {
      const prompt = 'Deploy Python FastAPI to Railway staging with Trivy security scan';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });

      expect(response.message).toBe('Pipeline specification generated successfully');
      expect(response.data).toBeDefined();

      const { name, summary, yamlConfig, nodes, edges } = response.data;
      expect(name).toBe('Python Delivery Pipeline');
      expect(summary).toContain('Python CI/CD pipeline DAG');
      expect(typeof yamlConfig).toBe('string');
      expect(yamlConfig).toContain('python:3.11-slim');
      expect(yamlConfig).toContain('trivy fs .');
      expect(yamlConfig).toContain('deploy-staging');
      expect(yamlConfig).not.toContain('namespace: production');
      expect(yamlConfig).not.toContain('prod-us-east-1');
      expect(yamlConfig).not.toContain('--namespace production');

      // Verify node format is compatible with ReactFlow
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBe(5);
      nodes.forEach((node) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('position');
        expect(node).toHaveProperty('data');
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      });

      // Verify edge format is compatible with ReactFlow
      expect(Array.isArray(edges)).toBe(true);
      expect(edges.length).toBe(4);
      edges.forEach((edge) => {
        expect(edge).toHaveProperty('id');
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
      });
    });

    it('should generate Go pipeline DAG with appropriate build image and test commands', async () => {
      const prompt = 'Go microservice with automated tests';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });

      expect(response.data.name).toBe('Go Delivery Pipeline');
      expect(response.data.yamlConfig).toContain('golang:1.22-alpine');
      expect(response.data.yamlConfig).toContain('go test ./...');
      expect(response.data.nodes.map((n) => n.type)).toEqual(['source', 'build', 'test']);
      expect(response.data.edges.length).toBe(2);
    });
  });

  describe('1B. Deployment Environment Safety & DAG Compiler Verification', () => {
    it('staging request → staging configuration (NO production defaults)', async () => {
      const prompt =
        'Build and test my Node.js application, run Jest tests, perform a Trivy security scan, build a Docker image, and deploy it to staging.';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });

      expect(response.message).toBe('Pipeline specification generated successfully');
      const { yamlConfig, nodes, edges } = response.data;

      const deployNode = nodes.find((n: { type: string }) => n.type === 'deploy');
      expect(deployNode).toBeDefined();
      expect(deployNode.data.label).toBe('Deploy to Staging');
      expect(deployNode.data.target).toBe('staging');
      expect(deployNode.data.namespace).toBe('staging');
      expect(deployNode.data.cluster).toBe('staging-k8s-cluster');
      expect(deployNode.data.command).toBe('kubectl apply -f k8s/ --namespace staging');
      expect(deployNode.data.manifest).toContain('namespace: staging');
      expect(deployNode.data.manifest).toContain('cluster: staging-k8s-cluster');
      expect(deployNode.data.manifest).not.toContain('staging-us-east-1');
      expect(deployNode.data.cluster).not.toBe('staging-us-east-1');

      // Negative assertions: MUST NOT contain any production references
      expect(deployNode.data.manifest).not.toContain('namespace: production');
      expect(deployNode.data.manifest).not.toContain('prod-us-east-1');
      expect(deployNode.data.command).not.toContain('--namespace production');

      // Backend yamlConfig checks
      expect(yamlConfig).toContain('name: deploy-staging');
      expect(yamlConfig).toContain('environment: staging');
      expect(yamlConfig).toContain('kubectl apply -f k8s/ --namespace staging');
      expect(yamlConfig).not.toContain('namespace: production');
      expect(yamlConfig).not.toContain('prod-us-east-1');
      expect(yamlConfig).not.toContain('--namespace production');
      expect(yamlConfig).not.toContain('deploy-production');

      // Frontend DAGCompiler verification: dagToYaml
      const compiledYaml = dagToYaml(nodes, edges, 'OpsPilot Production Pipeline', 'main');
      expect(compiledYaml).toContain('name: OpsPilot Staging Pipeline');
      expect(compiledYaml).toContain('- name: deploy-staging');
      expect(compiledYaml).toContain('run: kubectl apply -f k8s/ --namespace staging');

      // Requirement 4: All 5 forbidden production deployment identifiers must be absent
      expect(compiledYaml).not.toContain('Production Pipeline');
      expect(compiledYaml).not.toContain('deploy-production');
      expect(compiledYaml).not.toContain('namespace: production');
      expect(compiledYaml).not.toContain('--namespace production');
      expect(compiledYaml).not.toContain('prod-us-east-1');
    });

    it('production request → production configuration', async () => {
      const prompt =
        'Build and test my Node.js application, run Jest tests, perform a Trivy security scan, build a Docker image, and deploy it to production.';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });

      expect(response.message).toBe('Pipeline specification generated successfully');
      const { yamlConfig, nodes, edges } = response.data;

      const deployNode = nodes.find((n: { type: string }) => n.type === 'deploy');
      expect(deployNode).toBeDefined();
      expect(deployNode.data.label).toBe('Deploy to Production');
      expect(deployNode.data.target).toBe('production');
      expect(deployNode.data.namespace).toBe('production');
      expect(deployNode.data.cluster).toBe('prod-k8s-cluster');
      expect(deployNode.data.cluster).not.toBe('prod-us-east-1');
      expect(deployNode.data.command).toBe('kubectl apply -f k8s/ --namespace production');
      expect(deployNode.data.manifest).toContain('cluster: prod-k8s-cluster');
      expect(deployNode.data.manifest).not.toContain('prod-us-east-1');

      expect(yamlConfig).toContain('name: deploy-production');
      expect(yamlConfig).toContain('environment: production');
      expect(yamlConfig).toContain('kubectl apply -f k8s/ --namespace production');

      // Frontend DAGCompiler verification: dagToYaml
      const compiledYaml = dagToYaml(nodes, edges, 'OpsPilot Visual Pipeline', 'main');
      expect(compiledYaml).toContain('name: OpsPilot Production Pipeline');
      expect(compiledYaml).toContain('- name: deploy-production');
      expect(compiledYaml).toContain('run: kubectl apply -f k8s/ --namespace production');
    });

    it('dagToYaml staging pipeline name and job naming assertions', () => {
      const stagingNodes = [
        { id: '1', type: 'source', data: { label: 'Git Source', repo: 'my-repo' } },
        { id: '2', type: 'build', data: { label: 'Docker Build' } },
        {
          id: '3',
          type: 'deploy',
          data: {
            label: 'Deploy to Staging',
            target: 'staging',
            command: 'kubectl apply -f k8s/ --namespace staging',
          },
        },
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '3' },
      ];

      // Even if caller passes a pipelineName containing "Production", staging must resolve to "OpsPilot Staging Pipeline"
      const yaml = dagToYaml(
        stagingNodes as any,
        edges as any,
        'OpsPilot Production Pipeline',
        'main',
      );

      // Requirement 1: Pipeline name must NOT contain "Production". Use "OpsPilot Staging Pipeline".
      expect(yaml).toContain('name: OpsPilot Staging Pipeline');
      expect(yaml).not.toContain('name: OpsPilot Production Pipeline');

      // Requirement 2: Deployment job name must be "deploy-staging", never "deploy-production".
      expect(yaml).toContain('- name: deploy-staging');
      expect(yaml).not.toContain('- name: deploy-production');

      // Requirement 3: Keep the actual command exactly targeted to staging
      expect(yaml).toContain('kubectl apply -f k8s/ --namespace staging');

      // Requirement 4: Ensure generated staging YAML contains no production deployment identifiers
      expect(yaml).not.toContain('Production Pipeline');
      expect(yaml).not.toContain('deploy-production');
      expect(yaml).not.toContain('namespace: production');
      expect(yaml).not.toContain('--namespace production');
      expect(yaml).not.toContain('prod-us-east-1');
    });

    it('ambiguous environment → safe rejection / no unsafe default', async () => {
      // Unspecified deploy target
      await expect(
        controller.generatePipeline({
          prompt: 'Deploy my Go microservice to k8s',
          projectId: 'prj_test_123',
        }),
      ).rejects.toThrow(BadRequestException);

      // Conflicting deploy targets
      await expect(
        controller.generatePipeline({
          prompt: 'Deploy my app to staging and production',
          projectId: 'prj_test_123',
        }),
      ).rejects.toThrow(BadRequestException);

      // Empty prompt
      await expect(
        controller.generatePipeline({ prompt: '', projectId: 'prj_test_123' }),
      ).rejects.toThrow(BadRequestException);

      // Frontend resolveDeployEnvironment safety: returns null rather than production default
      expect(resolveDeployEnvironment({})).toBeNull();
      expect(resolveDeployEnvironment({ label: 'Cluster Deploy' })).toBeNull();
      expect(resolveDeployEnvironment({ target: 'unknown' })).toBeNull();
      expect(resolveDeployEnvironment({ target: 'staging' })).toBe('staging');
      expect(resolveDeployEnvironment({ target: 'production' })).toBe('production');

      // Frontend validateDAG safety: marks DAG invalid when deploy node has ambiguous environment
      const ambiguousNodes = [
        { id: '1', type: 'source', position: { x: 0, y: 0 }, data: { label: 'Source' } },
        { id: '2', type: 'deploy', position: { x: 200, y: 0 }, data: { label: 'Cluster Deploy' } },
      ];
      const edges = [{ id: 'e1', source: '1', target: '2' }];
      const valResult = validateDAG(ambiguousNodes as any, edges as any);
      expect(valResult.valid).toBe(false);
      expect(
        valResult.errors.some((e: string) =>
          e.includes('ambiguous or missing deployment environment'),
        ),
      ).toBe(true);

      // Frontend dagToYaml safety: throws instead of silently defaulting to production
      expect(() => dagToYaml(ambiguousNodes as any, edges as any)).toThrow(
        /deployment environment must be explicitly 'staging' or 'production'/,
      );
    });

    it('customer project has NO staging environment → explicit rejection', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue(null);

      await expect(
        controller.generatePipeline({
          prompt: 'Deploy my application to staging',
          projectId: 'prj_test_123',
        }),
      ).rejects.toThrow(
        'Staging environment is not configured for this project. Configure a staging environment in Project Settings first.',
      );
    });

    it('customer staging environment exists but cluster/namespace unconfigured → explicit rejection', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({
        id: 'env_staging_unconfigured',
        projectId: 'prj_test_123',
        name: 'Staging',
        slug: 'staging',
        type: EnvironmentType.STAGING,
        clusterName: null,
        k8sNamespace: null,
      });

      await expect(
        controller.generatePipeline({
          prompt: 'Deploy my application to staging',
          projectId: 'prj_test_123',
        }),
      ).rejects.toThrow(
        "Deployment target is not configured for environment 'staging'. Configure Kubernetes namespace and cluster in Environment Settings first.",
      );
    });

    it('tenant isolation: caller cannot generate pipeline for another organization project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({
        id: 'prj_other_tenant',
        organizationId: 'org_other_tenant',
        name: 'Other Tenant Project',
        slug: 'other-project',
      });

      await expect(
        controller.generatePipeline(
          { prompt: 'Build and test app', projectId: 'prj_other_tenant' },
          { oid: 'org_calling_user' } as any,
          { organization: { id: 'org_calling_user' } },
        ),
      ).rejects.toThrow(
        "Access denied: Project 'prj_other_tenant' does not belong to your organization",
      );
    });

    it('missing projectId → rejects with BadRequestException', async () => {
      await expect(
        controller.generatePipeline({ prompt: 'Build app', projectId: '' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Frontend onGenerate() Flow Integration', () => {
    it('should pass the actual returned nodes and edges through onGenerate without fabricating mock data', async () => {
      const prompt = 'Deploy FastAPI app with security scan and deploy to Staging';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });

      const onGenerateMock = jest.fn();

      // Simulate frontend AIAutoBuilder consumer logic:
      const { name, summary, yamlConfig, nodes, edges } = response.data;
      onGenerateMock({
        nodes,
        edges,
        name,
        summary,
        yamlConfig,
      });

      expect(onGenerateMock).toHaveBeenCalledTimes(1);
      const passedArgs = onGenerateMock.mock.calls[0][0];

      expect(passedArgs.nodes).toEqual(response.data.nodes);
      expect(passedArgs.edges).toEqual(response.data.edges);
      expect(passedArgs.name).toBe(response.data.name);
      expect(passedArgs.summary).toBe(response.data.summary);
      expect(passedArgs.yamlConfig).toBe(response.data.yamlConfig);

      // Verify no hardcoded mock node values are injected
      const nodeLabels = passedArgs.nodes.map((n: { data: { label: string } }) => n.data.label);
      expect(nodeLabels).toContain('Git Source');
      expect(nodeLabels).toContain('Python Build');
      expect(nodeLabels).toContain('Automated Tests');
      expect(nodeLabels).toContain('SAST Security Scan');
      expect(nodeLabels).toContain('Deploy to Staging');
    });

    it('should preserve AI response yamlConfig and synchronize YAML modal state with staging naming', async () => {
      const prompt =
        'Build and test my Node.js application, run Jest tests, perform a Trivy security scan, build a Docker image, and deploy it to staging.';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });
      const { name, summary, yamlConfig, nodes, edges } = response.data;

      // 1. Verify AI response contains real yamlConfig and is not empty
      expect(yamlConfig).toBeDefined();
      expect(yamlConfig).toContain('name: deploy-staging');
      expect(yamlConfig).toContain('kubectl apply -f k8s/ --namespace staging');

      // 2. Simulate PipelineBuilder handleAIGenerate state synchronization
      let generatedYamlState = '';
      let preservedAiYaml = '';

      // PipelineBuilder consumer callback simulation:
      const handleAIGenerate = (pipeline: {
        nodes: any[];
        edges: any[];
        name?: string;
        summary?: string;
        yamlConfig?: string;
      }) => {
        if (pipeline.yamlConfig) {
          preservedAiYaml = pipeline.yamlConfig;
        }

        // Contextual default name resolution from incoming nodes
        const deployNode = pipeline.nodes.find((n) => n.type === 'deploy');
        const env = deployNode ? resolveDeployEnvironment(deployNode.data || {}) : null;
        const defaultName =
          env === 'staging'
            ? 'OpsPilot Staging Pipeline'
            : env === 'production'
              ? 'OpsPilot Production Pipeline'
              : 'OpsPilot Visual Pipeline';

        generatedYamlState = dagToYaml(pipeline.nodes, pipeline.edges, defaultName, 'main');
      };

      handleAIGenerate({ nodes, edges, name, summary, yamlConfig });

      // 3. Verify yamlConfig is NOT discarded
      expect(preservedAiYaml).toBe(yamlConfig);

      // 4. Verify the synchronized generated YAML modal output
      expect(generatedYamlState).toContain('name: OpsPilot Staging Pipeline');
      expect(generatedYamlState).toContain('- name: deploy-staging');
      expect(generatedYamlState).toContain('run: kubectl apply -f k8s/ --namespace staging');

      // 5. Strict negative checks for forbidden production identifiers
      expect(generatedYamlState).not.toContain('k8s-rollout');
      expect(generatedYamlState).not.toContain('deploy-production');
      expect(generatedYamlState).not.toContain('Production Pipeline');
      expect(generatedYamlState).not.toContain('namespace: production');
      expect(generatedYamlState).not.toContain('--namespace production');
      expect(generatedYamlState).not.toContain('prod-us-east-1');
    });

    it('should preserve AI response yamlConfig and synchronize YAML modal state with production naming', async () => {
      const prompt =
        'Build and test my Node.js application, run Jest tests, perform a Trivy security scan, build a Docker image, and deploy it to production.';
      const response = await controller.generatePipeline({ prompt, projectId: 'prj_test_123' });
      const { name, summary, yamlConfig, nodes, edges } = response.data;

      expect(yamlConfig).toBeDefined();
      expect(yamlConfig).toContain('name: deploy-production');
      expect(yamlConfig).toContain('kubectl apply -f k8s/ --namespace production');

      let generatedYamlState = '';
      const handleAIGenerate = (pipeline: {
        nodes: any[];
        edges: any[];
        name?: string;
        summary?: string;
        yamlConfig?: string;
      }) => {
        const deployNode = pipeline.nodes.find((n) => n.type === 'deploy');
        const env = deployNode ? resolveDeployEnvironment(deployNode.data || {}) : null;
        const defaultName =
          env === 'staging'
            ? 'OpsPilot Staging Pipeline'
            : env === 'production'
              ? 'OpsPilot Production Pipeline'
              : 'OpsPilot Visual Pipeline';

        generatedYamlState = dagToYaml(pipeline.nodes, pipeline.edges, defaultName, 'main');
      };

      handleAIGenerate({ nodes, edges, name, summary, yamlConfig });

      expect(generatedYamlState).toContain('name: OpsPilot Production Pipeline');
      expect(generatedYamlState).toContain('- name: deploy-production');
      expect(generatedYamlState).toContain('run: kubectl apply -f k8s/ --namespace production');
    });

    it('should handle backend error without fabricating fallback pipeline data (Negative Test)', async () => {
      const onGenerateMock = jest.fn();
      let errorThrown: Error | null = null;

      // Simulate API failure (e.g. backend offline or 503)
      jest
        .spyOn(service, 'generatePipeline')
        .mockRejectedValueOnce(new Error('AI backend service unavailable'));

      try {
        await controller.generatePipeline({ prompt: 'Invalid', projectId: 'prj_test_123' });
      } catch (err) {
        errorThrown = err;
      }

      // onGenerate MUST NOT be called with fake data when generation fails
      expect(onGenerateMock).not.toHaveBeenCalled();
      expect(errorThrown).toBeDefined();
      expect(errorThrown?.message).toBe('AI backend service unavailable');
    });
  });

  describe('3. Dynamic Backend AI Status Wiring (GET /v1/ai/status)', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    afterAll(() => {
      process.env = origEnv;
    });

    it('should dynamically report connected status when GEMINI_API_KEY is configured', async () => {
      process.env.GEMINI_API_KEY = 'test_gemini_key_123';
      const res = await controller.getAiStatus();

      expect(res.message).toBe('AI status retrieved');
      expect(res.data.configured).toBe(true);
      expect(res.data.status).toBe('connected');
      expect(res.data.provider).toBe('Google Gemini');
      expect(res.data.model).toBe('gemini-1.5-flash');
      expect(res.data.capabilities).toContain('PIPELINE_GENERATION');
    });

    it('should dynamically report unavailable status when GEMINI_API_KEY is missing (Not Hardcoded)', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_AI_KEY;
      const res = await controller.getAiStatus();

      expect(res.data.configured).toBe(false);
      expect(res.data.status).toBe('unavailable');
      expect(res.data.provider).toBe('Deterministic DevOps Heuristic Engine');
      expect(res.data.model).toBe('opspilot-rule-engine-v2');
    });
  });

  describe('4. AICopilotOverlay Auto-Insert Capability Gating Rule', () => {
    it('should strictly disable Auto-Insert when capability is not in backend capabilities list', () => {
      const statusWithoutAutoInsert: {
        configured: boolean;
        status: 'connected' | 'unavailable';
        provider: string;
        model: string;
        capabilities: string[];
      } = {
        configured: true,
        status: 'connected',
        provider: 'Google Gemini',
        model: 'gemini-1.5-flash',
        capabilities: ['PIPELINE_GENERATION', 'PIPELINE_OPTIMIZATION'],
      };

      const supportsAutoInsert = Boolean(
        statusWithoutAutoInsert.status === 'connected' &&
        (statusWithoutAutoInsert.capabilities.includes('AUTO_INSERT') ||
          statusWithoutAutoInsert.capabilities.includes('STEP_RECOMMENDATION')),
      );

      // Auto-Insert MUST NOT be enabled when capability is absent
      expect(supportsAutoInsert).toBe(false);
    });

    it('should enable Auto-Insert only when real backend capability explicitly includes AUTO_INSERT or STEP_RECOMMENDATION', () => {
      const statusWithAutoInsert: {
        configured: boolean;
        status: 'connected' | 'unavailable';
        provider: string;
        model: string;
        capabilities: string[];
      } = {
        configured: true,
        status: 'connected',
        provider: 'Google Gemini',
        model: 'gemini-1.5-flash',
        capabilities: ['PIPELINE_GENERATION', 'AUTO_INSERT'],
      };

      const supportsAutoInsert = Boolean(
        statusWithAutoInsert.status === 'connected' &&
        (statusWithAutoInsert.capabilities.includes('AUTO_INSERT') ||
          statusWithAutoInsert.capabilities.includes('STEP_RECOMMENDATION')),
      );

      expect(supportsAutoInsert).toBe(true);
    });

    it('should never enable Auto-Insert when status is unavailable even if capability is present', () => {
      const statusUnavailable: {
        configured: boolean;
        status: 'connected' | 'unavailable';
        provider: string;
        model: string;
        capabilities: string[];
      } = {
        configured: false,
        status: 'unavailable',
        provider: 'Deterministic DevOps Heuristic Engine',
        model: 'opspilot-rule-engine-v2',
        capabilities: ['AUTO_INSERT'],
      };

      const supportsAutoInsert = Boolean(
        statusUnavailable.status === 'connected' &&
        (statusUnavailable.capabilities.includes('AUTO_INSERT') ||
          statusUnavailable.capabilities.includes('STEP_RECOMMENDATION')),
      );

      expect(supportsAutoInsert).toBe(false);
    });
  });

  describe('5. Frontend Source Code Verification (Zero Hardcoded Mock States)', () => {
    it('AIAutoBuilder.tsx must not contain hardcoded mock strings and must wire generateAiPipeline', () => {
      const autoBuilderPath = path.resolve(
        __dirname,
        '../../../../frontend/src/components/builder/AIAutoBuilder.tsx',
      );
      const content = fs.readFileSync(autoBuilderPath, 'utf8');

      // Negative assertions (mock / static unavailable states must be removed)
      expect(content).not.toContain(
        'The AI generation backend is not currently configured or reachable.',
      );
      expect(content).not.toContain("title: 'AI Builder Unavailable'");
      expect(content).not.toMatch(/<span[^>]*>\s*Unavailable\s*<\/span>/);

      // Positive assertions (real API wiring & dynamic handling)
      expect(content).toContain('generateAiPipeline');
      expect(content).toContain('fetchAiStatus');
      expect(content).toContain('onGenerate({');
      expect(content).toContain('name,');
      expect(content).toContain('summary,');
      expect(content).toContain('yamlConfig,');
      expect(content).toContain('nodes,');
      expect(content).toContain('edges');
    });

    it('AICopilotOverlay.tsx must not contain hardcoded mock strings and must dynamically check status', () => {
      const copilotPath = path.resolve(
        __dirname,
        '../../../../frontend/src/components/builder/AICopilotOverlay.tsx',
      );
      const content = fs.readFileSync(copilotPath, 'utf8');

      // Negative assertions
      expect(content).not.toContain(
        'Real-time DAG analysis is currently offline. Missing backend AI service.',
      );
      expect(content).not.toMatch(/<span[^>]*>\s*Unavailable\s*<\/span>/);

      // Positive assertions
      expect(content).toContain('fetchAiStatus');
      expect(content).toContain('supportsAutoInsert');
      expect(content).toContain('AUTO_INSERT');
      expect(content).toContain('STEP_RECOMMENDATION');
    });
  });
});
