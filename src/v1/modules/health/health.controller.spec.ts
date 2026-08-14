import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../../core/database/prisma.service';

describe('HealthController Probe Verification', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn().mockImplementation((checks: Array<() => any>) => {
      checks.forEach((fn) => fn());
      return Promise.resolve({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      });
    }),
  };

  const mockPrismaIndicator = {
    pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: PrismaHealthIndicator, useValue: mockPrismaIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return liveness status ok', () => {
    const res = controller.liveness();
    expect(res.status).toBe('ok');
    expect(res.timestamp).toBeDefined();
  });

  it('should execute readiness probe and return database status', async () => {
    const res = await controller.readiness();
    expect(res.status).toBe('ok');
    expect(mockHealthCheckService.check).toHaveBeenCalled();
  });
});
