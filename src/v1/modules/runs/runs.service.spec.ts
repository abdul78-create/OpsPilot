import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { RunsService } from './runs.service';
import { RunsRepository } from './runs.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { TriggerEngineService } from './services/trigger-engine.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { PipelineRunStatus, TriggerType } from '@prisma/client';

describe('RunsService', () => {
  let service: RunsService;

  const mockRunsRepository = {
    findPipelineRuns: jest.fn(),
    findRunDetails: jest.fn(),
    createJob: jest.fn(),
    updateJob: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    pipelineDefinition: {
      findFirst: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn(),
    },
  };

  const mockTx = {
    pipelineRun: {
      create: jest.fn(),
    },
    pipelineJob: {
      create: jest.fn(),
    },
  };

  const mockTransactionManager = {
    execute: jest.fn(async (callback) => callback(mockTx)),
  };

  const mockTriggerEngine = {
    normalizeTriggerRequest: jest.fn().mockReturnValue({
      pipelineDefinitionId: 'pipe_123',
      pipelineVersionId: 'ver_123',
      triggerType: TriggerType.MANUAL,
      triggeredBy: 'usr_123',
      commitSha: 'head',
      branch: 'main',
    }),
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunsService,
        { provide: RunsRepository, useValue: mockRunsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTransactionManager },
        { provide: TriggerEngineService, useValue: mockTriggerEngine },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        {
          provide: getQueueToken(PIPELINE_RUN_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<RunsService>(RunsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerRun with YAML configurations', () => {
    it('should create exactly 4 PipelineJob records corresponding to a 4-stage Builder YAML', async () => {
      const fourStageYaml = `
version: "1.0"
stages:
  - name: git-source
    jobs:
      - name: git-source
        steps:
          - run: git clone repository .
  - name: node-js-build
    jobs:
      - name: node-js-build
        steps:
          - run: npm ci && npm run build
  - name: automated-tests
    jobs:
      - name: automated-tests
        steps:
          - run: npm test
  - name: sast-security-scan
    jobs:
      - name: sast-security-scan
        steps:
          - run: trivy fs --severity HIGH,CRITICAL .
`;

      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: '4-Stage CI Pipeline',
        projectId: 'proj_123',
        isActive: true,
        triggerBranch: 'main',
        versions: [{ id: 'ver_123', versionNumber: 1, yamlConfig: fourStageYaml }],
      });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        repositoryUrl: 'https://github.com/custom-org/real-repo',
      });

      const mockRunRecord = {
        id: 'run_real_4_stages',
        pipelineDefinitionId: 'pipe_123',
        pipelineVersionId: 'ver_123',
        status: PipelineRunStatus.QUEUED,
        triggerType: TriggerType.MANUAL,
        triggeredBy: 'usr_123',
        branch: 'main',
        queuedAt: new Date(),
      };
      mockTx.pipelineRun.create.mockResolvedValue(mockRunRecord);
      mockTx.pipelineJob.create.mockImplementation(({ data }) => ({
        id: `job_${data.name}`,
        pipelineRunId: 'run_real_4_stages',
        name: data.name,
        stage: data.stage,
        status: data.status,
      }));

      const result = await service.triggerRun('pipe_123', 'usr_123', { branch: 'main' });

      expect(result.id).toBe('run_real_4_stages');
      expect(result.jobs).toHaveLength(4);
      expect(mockTx.pipelineJob.create).toHaveBeenCalledTimes(4);

      const createdJobNames = mockTx.pipelineJob.create.mock.calls.map((c) => c[0].data.name);
      expect(createdJobNames).toEqual([
        'git-source',
        'node-js-build',
        'automated-tests',
        'sast-security-scan',
      ]);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'execute-pipeline-run',
        expect.objectContaining({
          pipelineRunId: 'run_real_4_stages',
          repoUrl: 'https://github.com/custom-org/real-repo',
        }),
      );
    });

    it('should support YAML with jobs map syntax and create matching jobs', async () => {
      const jobsMapYaml = `
version: "1.0"
jobs:
  lint:
    stage: lint
    steps:
      - run: npm run lint
  compile:
    stage: build
    steps:
      - run: npm run compile
`;

      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Jobs Map Pipeline',
        projectId: 'proj_123',
        isActive: true,
        triggerBranch: 'main',
        versions: [{ id: 'ver_123', versionNumber: 1, yamlConfig: jobsMapYaml }],
      });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);

      mockTx.pipelineRun.create.mockResolvedValue({
        id: 'run_jobs_map',
        status: PipelineRunStatus.QUEUED,
      });
      mockTx.pipelineJob.create.mockImplementation(({ data }) => ({
        id: `job_${data.name}`,
        ...data,
      }));

      const result = await service.triggerRun('pipe_123', 'usr_123', {});
      expect(result.jobs).toHaveLength(2);
      expect(mockTx.pipelineJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'lint', stage: 'lint' }),
        }),
      );
      expect(mockTx.pipelineJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'compile', stage: 'build' }),
        }),
      );
    });

    it('should throw BadRequestException if YAML has no executable stages or jobs', async () => {
      const emptyYaml = `
version: "1.0"
metadata:
  author: OpsPilot
`;

      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Empty Pipeline',
        projectId: 'proj_123',
        isActive: true,
        triggerBranch: 'main',
        versions: [{ id: 'ver_123', versionNumber: 1, yamlConfig: emptyYaml }],
      });

      await expect(service.triggerRun('pipe_123', 'usr_123', {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.triggerRun('pipe_123', 'usr_123', {})).rejects.toThrow(
        'Pipeline configuration does not define any executable stages or jobs.',
      );
    });

    it('should throw BadRequestException if YAML syntax is invalid', async () => {
      const invalidYaml = `
version: "1.0"
stages: [unclosed bracket
`;

      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue({
        id: 'pipe_123',
        name: 'Invalid YAML Pipeline',
        projectId: 'proj_123',
        isActive: true,
        triggerBranch: 'main',
        versions: [{ id: 'ver_123', versionNumber: 1, yamlConfig: invalidYaml }],
      });

      await expect(service.triggerRun('pipe_123', 'usr_123', {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.triggerRun('pipe_123', 'usr_123', {})).rejects.toThrow(
        /Failed to parse pipeline YAML for execution/,
      );
    });
  });
});
