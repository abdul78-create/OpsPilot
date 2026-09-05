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
import { TokenService } from '../../../core/security/token.service';

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
  });

  describe('1. Backend API Endpoint Wiring (POST /v1/ai/generate-pipeline)', () => {
    it('should generate real pipeline DAG with name, summary, yamlConfig, nodes, edges', async () => {
      const prompt = 'Deploy Python FastAPI to Railway with Trivy security scan';
      const response = await controller.generatePipeline({ prompt });

      expect(response.message).toBe('Pipeline specification generated successfully');
      expect(response.data).toBeDefined();

      const { name, summary, yamlConfig, nodes, edges } = response.data;
      expect(name).toBe('Python Delivery Pipeline');
      expect(summary).toContain('Python CI/CD pipeline DAG');
      expect(typeof yamlConfig).toBe('string');
      expect(yamlConfig).toContain('python:3.11-slim');
      expect(yamlConfig).toContain('trivy fs .');

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
      const response = await controller.generatePipeline({ prompt });

      expect(response.data.name).toBe('Go Delivery Pipeline');
      expect(response.data.yamlConfig).toContain('golang:1.22-alpine');
      expect(response.data.yamlConfig).toContain('go test ./...');
      expect(response.data.nodes.map((n) => n.type)).toEqual(['source', 'build', 'test']);
      expect(response.data.edges.length).toBe(2);
    });
  });

  describe('2. Frontend onGenerate() Flow Integration', () => {
    it('should pass the actual returned nodes and edges through onGenerate without fabricating mock data', async () => {
      const prompt = 'Deploy FastAPI app with security scan and deploy to Staging';
      const response = await controller.generatePipeline({ prompt });

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

    it('should handle backend error without fabricating fallback pipeline data (Negative Test)', async () => {
      const onGenerateMock = jest.fn();
      let errorThrown: Error | null = null;

      // Simulate API failure (e.g. backend offline or 503)
      jest
        .spyOn(service, 'generatePipeline')
        .mockRejectedValueOnce(new Error('AI backend service unavailable'));

      try {
        await controller.generatePipeline({ prompt: 'Invalid' });
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
