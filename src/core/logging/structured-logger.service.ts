import { Injectable, LoggerService } from '@nestjs/common';
import { RequestContextService } from '../context/request-context.service';
import { LogRedactorUtility } from './log-redactor.utility';

export interface StructuredLogPayload {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  constructor(private readonly requestContextService?: RequestContextService) {}

  private formatMessage(level: string, message: unknown, context?: string): string {
    const rawMessageStr = typeof message === 'object' ? JSON.stringify(message) : String(message);
    const redactedMessage = LogRedactorUtility.redactString(rawMessageStr);

    const store = this.requestContextService?.getStore();

    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      context: context || 'Application',
      message: redactedMessage,
      requestId: store?.requestId,
      correlationId: store?.correlationId,
      traceId: store?.traceId,
      spanId: store?.spanId,
      tenantId: store?.tenantId,
      userId: store?.userId,
      durationMs: store?.requestStartTime ? Date.now() - store.requestStartTime : undefined,
    };

    return JSON.stringify(payload);
  }

  log(message: unknown, context?: string): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  error(message: unknown, trace?: string, context?: string): void {
    const errMsg = trace ? `${message} · Trace: ${trace}` : message;
    console.error(this.formatMessage('ERROR', errMsg, context));
  }

  warn(message: unknown, context?: string): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  debug(message: unknown, context?: string): void {
    console.debug(this.formatMessage('DEBUG', message, context));
  }

  verbose(message: unknown, context?: string): void {
    console.log(this.formatMessage('VERBOSE', message, context));
  }
}
