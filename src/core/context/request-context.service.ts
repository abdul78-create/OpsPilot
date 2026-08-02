import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContextStore } from './request-context.interface';

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

  run(store: RequestContextStore, callback: () => void): void {
    this.asyncLocalStorage.run(store, callback);
  }

  getStore(): RequestContextStore | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getRequestId(): string | undefined {
    return this.getStore()?.requestId;
  }

  getCorrelationId(): string | undefined {
    return this.getStore()?.correlationId;
  }

  getTraceId(): string | undefined {
    return this.getStore()?.traceId;
  }

  getSpanId(): string | undefined {
    return this.getStore()?.spanId;
  }

  getTraceparent(): string | undefined {
    return this.getStore()?.traceparent;
  }

  getTenantId(): string | undefined {
    return this.getStore()?.tenantId;
  }

  getUserId(): string | undefined {
    return this.getStore()?.userId;
  }

  getUserAgent(): string | undefined {
    return this.getStore()?.userAgent;
  }

  getDurationMs(): number {
    const startTime = this.getStore()?.requestStartTime;
    return startTime ? Date.now() - startTime : 0;
  }
}
