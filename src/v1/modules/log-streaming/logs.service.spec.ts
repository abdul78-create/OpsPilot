import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { LogsRepository } from './logs.repository';
import { LogStreamingService } from '../../../core/log-streaming/log-streaming.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { LogLevel } from '@prisma/client';
import { of } from 'rxjs';

describe('LogsService', () => {
  let service: LogsService;

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

  const mockLog = {
    id: 'log_123',
    pipelineRunId: 'run_123',
    jobId: 'job_123',
    level: LogLevel.INFO,
    message: 'Job started',
    timestamp: new Date(),
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

    service = module.get<LogsService>(LogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAndEmit()', () => {
    it('should persist log entry and emit streaming event', async () => {
      mockLogsRepository.appendLog.mockResolvedValue(mockLog);

      const result = await service.logAndEmit('run_123', LogLevel.INFO, 'Job started', 'job_123');

      expect(result).toEqual(mockLog);
      expect(mockLogsRepository.appendLog).toHaveBeenCalledWith(
        'run_123',
        LogLevel.INFO,
        'Job started',
        'job_123',
      );
      expect(mockLogStreamingService.emit).toHaveBeenCalledWith({
        runId: 'run_123',
        jobId: 'job_123',
        level: LogLevel.INFO,
        message: 'Job started',
        timestamp: mockLog.timestamp,
      });
    });
  });

  describe('getHistoricalLogs()', () => {
    it('should throw NotFoundException when pipeline run is not found', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue(null);

      await expect(service.getHistoricalLogs('nonexistent_run')).rejects.toThrow(
        "Pipeline Run 'nonexistent_run' not found",
      );
    });

    it('should return historical logs for valid run', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({ id: 'run_123' });
      mockLogsRepository.findByRun.mockResolvedValue([mockLog]);

      const result = await service.getHistoricalLogs('run_123');

      expect(result).toEqual([mockLog]);
      expect(mockLogsRepository.findByRun).toHaveBeenCalledWith('run_123');
    });
  });

  describe('streamLogs()', () => {
    it('should delegate streaming subscription to LogStreamingService', () => {
      mockLogStreamingService.streamForRun.mockReturnValue(of());

      service.streamLogs('run_123');

      expect(mockLogStreamingService.streamForRun).toHaveBeenCalledWith('run_123');
    });
  });
});
