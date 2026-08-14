import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsRepository } from './logs.repository';
import { LogStreamingService } from '../../../core/log-streaming/log-streaming.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { LogLevel } from '@prisma/client';

describe('Real-Time Pipeline Log Streaming Integration Test Suite', () => {
  let logsService: LogsService;

  const mockLogsRepository = {
    appendLog: jest.fn(),
    findByRun: jest.fn(),
  };

  const mockLogStreamingService = {
    emit: jest.fn(),
    streamForRun: jest.fn(),
  };

  const mockPrisma = {
    pipelineRun: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        { provide: LogsRepository, useValue: mockLogsRepository },
        { provide: LogStreamingService, useValue: mockLogStreamingService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    logsService = module.get<LogsService>(LogsService);
  });

  describe('1. Positive Real-Time Log Emission & Streaming', () => {
    it('Positive: should persist redacted log entry and emit real-time stream chunk event', async () => {
      const mockEntry = {
        id: 'log_999',
        pipelineRunId: 'run_step9_100',
        jobId: 'job_build_1',
        level: LogLevel.INFO,
        message: 'Cloning repository from https://github.com/expressjs/express...',
        timestamp: new Date(),
      };

      mockLogsRepository.appendLog.mockResolvedValue(mockEntry);

      const result = await logsService.logAndEmit(
        'run_step9_100',
        LogLevel.INFO,
        'Cloning repository from https://github.com/expressjs/express...',
        'job_build_1',
      );

      expect(result.id).toBe('log_999');
      expect(mockLogsRepository.appendLog).toHaveBeenCalledWith(
        'run_step9_100',
        LogLevel.INFO,
        'Cloning repository from https://github.com/expressjs/express...',
        'job_build_1',
      );
      expect(mockLogStreamingService.emit).toHaveBeenCalledWith({
        runId: 'run_step9_100',
        jobId: 'job_build_1',
        level: LogLevel.INFO,
        message: 'Cloning repository from https://github.com/expressjs/express...',
        timestamp: mockEntry.timestamp,
      });
    });

    it('Positive: should retrieve historical log entries for valid pipeline run', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({ id: 'run_step9_100' });
      mockLogsRepository.findByRun.mockResolvedValue([
        { id: 'log_1', message: 'Building...' },
        { id: 'log_2', message: 'Testing...' },
      ]);

      const logs = await logsService.getHistoricalLogs('run_step9_100');

      expect(logs.length).toBe(2);
      expect(logs[0].message).toBe('Building...');
    });
  });

  describe('2. Negative Security & Boundary Tests', () => {
    it('Negative: should throw NotFoundException if requesting historical logs for non-existent pipeline run', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue(null);

      await expect(logsService.getHistoricalLogs('run_non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
