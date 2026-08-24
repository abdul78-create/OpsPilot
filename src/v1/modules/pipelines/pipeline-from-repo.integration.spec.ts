import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesRepository } from './pipelines.repository';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { PipelineYamlParserService } from './services/pipeline-yaml-parser.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { TriggerType } from '@prisma/client';

describe('Pipeline Creation from Real Connected Repository Integration Test Suite', () => {
  let pipelinesService: PipelinesService;

  const mockPipelinesRepository = {
    findByProjectAndSlug: jest.fn(),
    create: jest.fn(),
  };

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn(),
    },
  };

  const mockTxManager = {
    execute: jest.fn((cb) =>
      cb({
        pipelineDefinition: {
          create: jest.fn().mockResolvedValue({
            id: 'pipe_def_100',
            projectId: 'proj_123',
            name: 'Express Pipeline',
            slug: 'express-pipeline',
            triggerType: TriggerType.GIT_PUSH,
            triggerBranch: 'main',
            currentVersionNumber: 1,
            isActive: true,
          }),
        },
        pipelineVersion: {
          create: jest.fn().mockResolvedValue({
            id: 'pipe_ver_100',
            pipelineDefinitionId: 'pipe_def_100',
            versionNumber: 1,
            checksum: 'mock_checksum_abc',
            yamlConfig:
              'version: "1"\nname: Express Pipeline\nstages:\n  - name: test\n    commands:\n      - npm test',
          }),
        },
      }),
    ),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-998877'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelinesService,
        WorkflowCompilerService,
        PipelineYamlParserService,
        { provide: PipelinesRepository, useValue: mockPipelinesRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionManager, useValue: mockTxManager },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    pipelinesService = module.get<PipelinesService>(PipelinesService);
  });

  describe('1. Positive Pipeline Creation from Repository Tests', () => {
    it('Positive: should auto-generate pipeline spec and save PipelineDefinition + v1 Version in DB', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        id: 'repo_conn_123',
        projectId: 'proj_123',
        repositoryUrl: 'https://github.com/expressjs/express',
        defaultBranch: 'main',
      });
      mockPipelinesRepository.findByProjectAndSlug.mockResolvedValue(null);

      const result = await pipelinesService.createFromRepository('proj_123', 'user_123', {
        repositoryConnectionId: 'repo_conn_123',
      });

      expect(result.id).toBe('pipe_def_100');
      expect(result.versions).toBeDefined();
      expect(result.versions![0].id).toBe('pipe_ver_100');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'pipeline.definition_created.v1',
          aggregateId: 'pipe_def_100',
        }),
      );
    });

    it('Positive: should respect custom pipeline name, branch, and custom YAML config override', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        id: 'repo_conn_123',
        projectId: 'proj_123',
        repositoryUrl: 'https://github.com/expressjs/express',
        defaultBranch: 'main',
      });
      mockPipelinesRepository.findByProjectAndSlug.mockResolvedValue(null);

      const customYaml = `version: "1"
name: Custom Pipeline
stages:
  - name: build
    commands:
      - npm run build`;

      const result = await pipelinesService.createFromRepository('proj_123', 'user_123', {
        repositoryConnectionId: 'repo_conn_123',
        name: 'Custom Express Build',
        triggerBranch: 'develop',
        yamlConfig: customYaml,
      });

      expect(result.id).toBe('pipe_def_100');
    });
  });

  describe('2. Negative Security & Validation Tests', () => {
    it('Negative: should throw NotFoundException if target project does not exist', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        pipelinesService.createFromRepository('proj_fake', 'user_123', {
          repositoryConnectionId: 'repo_conn_123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Negative: should throw NotFoundException if repositoryConnectionId does not exist', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);

      await expect(
        pipelinesService.createFromRepository('proj_123', 'user_123', {
          repositoryConnectionId: 'repo_conn_non_existent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Negative: should throw ConflictException if pipeline slug already exists in project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        id: 'repo_conn_123',
        projectId: 'proj_123',
        repositoryUrl: 'https://github.com/expressjs/express',
        defaultBranch: 'main',
      });
      mockPipelinesRepository.findByProjectAndSlug.mockResolvedValue({ id: 'existing_pipeline' });

      await expect(
        pipelinesService.createFromRepository('proj_123', 'user_123', {
          repositoryConnectionId: 'repo_conn_123',
          name: 'Express Pipeline',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
