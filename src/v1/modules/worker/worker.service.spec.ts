import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { JobExecutorService } from './services/job-executor.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { PipelineRunStatus, JobStatus } from '@prisma/client';

import { DockerRunnerService } from './services/docker-runner.service';

describe('Worker Module', () => {
  let stateMachine: StateMachineService;
  let jobExecutor: JobExecutorService;

  const mockPrisma = {
    pipelineJob: {
      update: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockDockerRunner = {
    runStep: jest.fn().mockResolvedValue({ exitCode: 0 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateMachineService,
        JobExecutorService,
        { provide: DockerRunnerService, useValue: mockDockerRunner },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    stateMachine = module.get<StateMachineService>(StateMachineService);
    jobExecutor = module.get<JobExecutorService>(JobExecutorService);
  });

  it('StateMachineService should be defined', () => {
    expect(stateMachine).toBeDefined();
  });

  it('JobExecutorService should be defined', () => {
    expect(jobExecutor).toBeDefined();
  });

  describe('StateMachineService — PipelineRun transitions', () => {
    it('should allow QUEUED → RUNNING', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(PipelineRunStatus.QUEUED, PipelineRunStatus.RUNNING),
      ).not.toThrow();
    });

    it('should allow QUEUED → CANCELLED', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(
          PipelineRunStatus.QUEUED,
          PipelineRunStatus.CANCELLED,
        ),
      ).not.toThrow();
    });

    it('should allow RUNNING → SUCCESS', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(PipelineRunStatus.RUNNING, PipelineRunStatus.SUCCESS),
      ).not.toThrow();
    });

    it('should allow RUNNING → FAILED', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(PipelineRunStatus.RUNNING, PipelineRunStatus.FAILED),
      ).not.toThrow();
    });

    it('should reject SUCCESS → RUNNING (terminal state)', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(PipelineRunStatus.SUCCESS, PipelineRunStatus.RUNNING),
      ).toThrow(BadRequestException);
    });

    it('should reject FAILED → SUCCESS (terminal state)', () => {
      expect(() =>
        stateMachine.assertValidRunTransition(PipelineRunStatus.FAILED, PipelineRunStatus.SUCCESS),
      ).toThrow(BadRequestException);
    });

    it('should correctly identify terminal run statuses', () => {
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.SUCCESS)).toBe(true);
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.FAILED)).toBe(true);
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.CANCELLED)).toBe(true);
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.TIMEOUT)).toBe(true);
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.QUEUED)).toBe(false);
      expect(stateMachine.isTerminalRunStatus(PipelineRunStatus.RUNNING)).toBe(false);
    });
  });

  describe('StateMachineService — PipelineJob transitions', () => {
    it('should allow QUEUED → RUNNING', () => {
      expect(() =>
        stateMachine.assertValidJobTransition(JobStatus.QUEUED, JobStatus.RUNNING),
      ).not.toThrow();
    });

    it('should allow QUEUED → SKIPPED', () => {
      expect(() =>
        stateMachine.assertValidJobTransition(JobStatus.QUEUED, JobStatus.SKIPPED),
      ).not.toThrow();
    });

    it('should allow RUNNING → FAILED', () => {
      expect(() =>
        stateMachine.assertValidJobTransition(JobStatus.RUNNING, JobStatus.FAILED),
      ).not.toThrow();
    });

    it('should reject SUCCESS → RUNNING (terminal state)', () => {
      expect(() =>
        stateMachine.assertValidJobTransition(JobStatus.SUCCESS, JobStatus.RUNNING),
      ).toThrow(BadRequestException);
    });

    it('should reject FAILED → SUCCESS (terminal state)', () => {
      expect(() =>
        stateMachine.assertValidJobTransition(JobStatus.FAILED, JobStatus.SUCCESS),
      ).toThrow(BadRequestException);
    });

    it('should correctly identify terminal job statuses', () => {
      expect(stateMachine.isTerminalJobStatus(JobStatus.SUCCESS)).toBe(true);
      expect(stateMachine.isTerminalJobStatus(JobStatus.FAILED)).toBe(true);
      expect(stateMachine.isTerminalJobStatus(JobStatus.SKIPPED)).toBe(true);
      expect(stateMachine.isTerminalJobStatus(JobStatus.CANCELLED)).toBe(true);
      expect(stateMachine.isTerminalJobStatus(JobStatus.QUEUED)).toBe(false);
      expect(stateMachine.isTerminalJobStatus(JobStatus.RUNNING)).toBe(false);
    });
  });

  describe('JobExecutorService.executeJob()', () => {
    const mockJob = {
      id: 'job_123',
      pipelineRunId: 'run_123',
      name: 'Build Source & Assets',
      stage: 'build',
      status: JobStatus.QUEUED,
      startedAt: null,
      finishedAt: null,
      durationSeconds: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should transition QUEUED → RUNNING → SUCCESS and publish events', async () => {
      mockPrisma.pipelineJob.update
        .mockResolvedValueOnce({ ...mockJob, status: JobStatus.RUNNING, startedAt: new Date() })
        .mockResolvedValueOnce({
          ...mockJob,
          status: JobStatus.SUCCESS,
          finishedAt: new Date(),
          durationSeconds: 1,
        });

      const result = await jobExecutor.executeJob(
        mockJob as never,
        'https://github.com/acme-corp/backend-api.git',
      );

      expect(result.status).toBe(JobStatus.SUCCESS);
      expect(mockPrisma.pipelineJob.update).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pipeline.job_started.v1' }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pipeline.job_completed.v1' }),
      );
    });
  });
});
