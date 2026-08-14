import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RunsService } from './runs.service';
import { RunsRepository } from './runs.repository';
import { TriggerEngineService } from './services/trigger-engine.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { getQueueToken } from '@nestjs/bullmq';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { PipelineRunStatus, TriggerType, JobStatus } from '@prisma/client';

describe('Pipeline Run Execution Integration Test Suite', () => {
  let runsService: RunsService;

  const mockRunsRepository = {
    findPipelineRuns: jest.fn(),
    findRunDetails: jest.fn(),
    create: jest.fn(),
  };

  const mockPrisma = {
    pipelineDefinition: {
      findFirst: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn(),
    },
  };

  const mockTxManager = {
    execute: jest.fn((cb) =>
      cb({
        pipelineRun: {
          create: jest.fn().mockResolvedValue({
            id: 'run_exec_100',
            pipelineDefinitionId: 'pipe_123',
            pipelineVersionId: 'ver_123',
            status: PipelineRunStatus.QUEUED,
            triggerType: TriggerType.MANUAL,
            triggeredBy: 'user_123',
            branch: 'main',
            queuedAt: new Date(),
          }),
        },
        pipelineJob: {
          create: jest.fn().mockResolvedValue({
            id: 'job_100',
            pipelineRunId: 'run_exec_100',
            name: 'Build',
            stage: 'build',
            status: JobStatus.QUEUED,
          }),
        },
      }),
    ),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-run-123'),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job_bull_123' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunsService,
        TriggerEngineService,
        { provide: RunsRepository, useValue: mockRunsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTxManager },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: getQueueToken(PIPELINE_RUN_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    runsService = module.get<RunsService>(RunsService);
  });

  describe('1. Positive Pipeline Run Trigger & Enqueueing Tests', () => {
    it('Positive: should trigger a new pipeline run, create queued jobs, and enqueue to BullMQ', async () => {
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Express Build Pipeline',
        projectId: 'proj_123',
        isActive: true,
        triggerBranch: 'main',
        versions: [{ id: 'ver_123', versionNumber: 1 }],
      });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        repositoryUrl: 'https://github.com/expressjs/express',
      });

      const result = await runsService.triggerRun('pipe_123', 'user_123', {
        branch: 'main',
        triggerType: TriggerType.MANUAL,
      });

      expect(result.id).toBe('run_exec_100');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-pipeline-run',
        expect.objectContaining({
          pipelineRunId: 'run_exec_100',
          repoUrl: 'https://github.com/expressjs/express',
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'pipeline.run_queued.v1',
          aggregateId: 'run_exec_100',
        }),
      );
    });
  });

  describe('2. Negative Security & Boundary Tests', () => {
    it('Negative: should throw NotFoundException if PipelineDefinition does not exist', async () => {
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue(null);

      await expect(runsService.triggerRun('pipe_non_existent', 'user_123', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Negative: should throw BadRequestException if PipelineDefinition is inactive', async () => {
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Disabled Pipeline',
        isActive: false,
        versions: [{ id: 'ver_123' }],
      });

      await expect(runsService.triggerRun('pipe_123', 'user_123', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Negative: should throw NotFoundException if PipelineDefinition has no versions', async () => {
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Empty Pipeline',
        isActive: true,
        versions: [],
      });

      await expect(runsService.triggerRun('pipe_123', 'user_123', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
