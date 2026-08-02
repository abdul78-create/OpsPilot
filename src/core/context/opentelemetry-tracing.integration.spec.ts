import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';
import { Request, Response } from 'express';

describe('OpenTelemetry W3C Trace Context Propagation Integration Test', () => {
  let middleware: RequestContextMiddleware;
  let service: RequestContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextMiddleware, RequestContextService],
    }).compile();

    middleware = module.get<RequestContextMiddleware>(RequestContextMiddleware);
    service = module.get<RequestContextService>(RequestContextService);
  });

  it('should parse incoming W3C traceparent header and attach traceparent to response', () => {
    const incomingTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const req = {
      headers: {
        traceparent: incomingTraceparent,
      },
      ip: '127.0.0.1',
      socket: {},
      get: jest.fn().mockReturnValue('jest-agent'),
    } as unknown as Request;

    const setHeaderMap = new Map<string, string>();
    const res = {
      setHeader: jest.fn((key: string, val: string) => setHeaderMap.set(key, val)),
    } as unknown as Response;

    const next = jest.fn(() => {
      expect(service.getTraceId()).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(service.getSpanId()).toBe('00f067aa0ba902b7');
      expect(service.getTraceparent()).toBe(incomingTraceparent);
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(setHeaderMap.get('traceparent')).toBe(incomingTraceparent);
  });

  it('should auto-generate W3C traceparent header when missing from incoming request', () => {
    const req = {
      headers: {},
      ip: '127.0.0.1',
      socket: {},
      get: jest.fn().mockReturnValue('jest-agent'),
    } as unknown as Request;

    const setHeaderMap = new Map<string, string>();
    const res = {
      setHeader: jest.fn((key: string, val: string) => setHeaderMap.set(key, val)),
    } as unknown as Response;

    const next = jest.fn(() => {
      const traceparent = service.getTraceparent();
      expect(traceparent).toBeDefined();
      expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
    });

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(setHeaderMap.get('traceparent')).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
  });
});
