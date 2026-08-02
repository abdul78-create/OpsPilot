import { Test, TestingModule } from '@nestjs/testing';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { RuleBasedAiProvider } from '../../../core/ai/providers/rule-based-ai.provider';
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

  const mockRuleBasedProvider = new RuleBasedAiProvider();

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
        { provide: RuleBasedAiProvider, useValue: mockRuleBasedProvider },
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

    it('should analyze failed run and persist AiAnalysisReport', async () => {
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
