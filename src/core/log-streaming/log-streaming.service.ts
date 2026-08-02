import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, filter, map } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { LOG_EVENT, LOG_STREAM_COMPLETE } from './log-streaming.constants';
import { LogLevel } from '@prisma/client';

export interface LogEntry {
  runId: string;
  jobId?: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
}

@Injectable()
export class LogStreamingService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit(entry: LogEntry): void {
    this.eventEmitter.emit(LOG_EVENT, entry);
  }

  complete(runId: string): void {
    this.eventEmitter.emit(LOG_STREAM_COMPLETE, { runId });
  }

  streamForRun(runId: string): Observable<MessageEvent> {
    const logStream$ = fromEvent<LogEntry>(this.eventEmitter, LOG_EVENT).pipe(
      filter((entry) => entry.runId === runId),
      map((entry): MessageEvent => ({
        data: {
          jobId: entry.jobId ?? null,
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
        },
        type: 'log',
        id: `${runId}-${entry.timestamp.getTime()}`,
      })),
    );

    return logStream$;
  }
}
