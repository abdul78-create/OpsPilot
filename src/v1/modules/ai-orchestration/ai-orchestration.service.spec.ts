import { Test, TestingModule } from '@nestjs/testing';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';
import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AiAnalysisType, AiRiskLevel, JobStatus } from '@prisma/client';

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

  describe('findById()', () => {
    it('should throw NotFoundException if report not found', async () => {
      mockAiRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent_rep')).rejects.toThrow(
        "AI Analysis Report 'nonexistent_rep' not found",
      );
    });
  });
});
