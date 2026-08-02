export interface RequestContextStore {
  requestId: string;
  correlationId: string;
  traceId: string;
  spanId: string;
  traceparent: string;
  tracestate?: string;
  tenantId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestStartTime: number;
}
