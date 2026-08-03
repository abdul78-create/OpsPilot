import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from './request-context.service';
import { APP_CONSTANTS } from '@shared/constants/app.constants';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const existingReqId = req.headers[APP_CONSTANTS.REQUEST_ID_HEADER];
    const requestId = Array.isArray(existingReqId)
      ? existingReqId[0]
      : existingReqId || randomUUID();

    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId = Array.isArray(correlationHeader)
      ? correlationHeader[0]
      : correlationHeader || requestId;

    const tenantIdHeader = req.headers['x-organization-id'] || req.headers['x-tenant-id'];
    const tenantId = Array.isArray(tenantIdHeader) ? tenantIdHeader[0] : tenantIdHeader;

    const userIdHeader = req.headers['x-user-id'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

    // Parse W3C OpenTelemetry traceparent: 00-traceid-spanid-flags
    const traceparentHeader = req.headers['traceparent'];
    const rawTraceparent = Array.isArray(traceparentHeader)
      ? traceparentHeader[0]
      : traceparentHeader;
    let traceId = randomUUID().replace(/-/g, '');
    let spanId = randomUUID().replace(/-/g, '').slice(0, 16);

    if (rawTraceparent && rawTraceparent.startsWith('00-')) {
      const parts = rawTraceparent.split('-');
      if (parts.length >= 4) {
        traceId = parts[1];
        spanId = parts[2];
      }
    }

    const traceparent = `00-${traceId}-${spanId}-01`;
    const tracestate = (req.headers['tracestate'] as string) || '';

    // Attach request ID, correlation ID, and W3C OpenTelemetry headers to response
    res.setHeader(APP_CONSTANTS.REQUEST_ID_HEADER, requestId);
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('traceparent', traceparent);
    if (tracestate) {
      res.setHeader('tracestate', tracestate);
    }

    this.requestContextService.run(
      {
        requestId,
        correlationId,
        traceId,
        spanId,
        traceparent,
        tracestate,
        tenantId,
        userId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        requestStartTime: Date.now(),
      },
      () => next(),
    );
  }
}
