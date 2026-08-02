import { Injectable, NotFoundException } from '@nestjs/common';
import { LogsRepository } from './logs.repository';
import { LogStreamingService } from '../../../core/log-streaming/log-streaming.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { LogRedactorUtility } from '../../../core/logging/log-redactor.utility';
import { PipelineRunLog, LogLevel } from '@prisma/client';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class LogsService {
  constructor(
    private readonly logsRepository: LogsRepository,
    private readonly logStreamingService: LogStreamingService,
    private readonly prisma: PrismaService,
  ) {}

  async logAndEmit(
    pipelineRunId: string,
    level: LogLevel,
    message: string,
    jobId?: string,
  ): Promise<PipelineRunLog> {
    const redactedMessage = LogRedactorUtility.redactString(message);
    const logEntry = await this.logsRepository.appendLog(pipelineRunId, level, redactedMessage, jobId);

    this.logStreamingService.emit({
      runId: pipelineRunId,
      jobId,
      level,
      message: redactedMessage,
      timestamp: logEntry.timestamp,
    });

    return logEntry;
  }

  async getHistoricalLogs(pipelineRunId: string): Promise<PipelineRunLog[]> {
    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, deletedAt: null },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${pipelineRunId}' not found`);
    }

    return this.logsRepository.findByRun(pipelineRunId);
  }

  streamLogs(pipelineRunId: string): Observable<MessageEvent> {
    return this.logStreamingService.streamForRun(pipelineRunId);
  }
}
