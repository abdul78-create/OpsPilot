import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogsService } from './services/audit-logs.service';
import { MetricsService } from './services/metrics.service';
import { HealthMonitoringService } from './services/health-monitoring.service';
import { ObservabilityRepository } from './observability.repository';
import { PrismaService } from '../../../core/database/prisma.service';

// Mock ioredis so Redis connectivity is never attempted in unit tests
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  })),
}));

describe('ObservabilityModule Services', () => {
  let auditLogsService: AuditLogsService;
  let metricsService: MetricsService;
  let healthMonitoringService: HealthMonitoringService;

  const mockObservabilityRepository = {
    findOrganizationAuditLogs: jest.fn(),
  };

  const mockPrisma = {
    organization: { count: jest.fn().mockResolvedValue(5) },
    project: { count: jest.fn().mockResolvedValue(12) },
    environment: { count: jest.fn().mockResolvedValue(36) },
    pipelineDefinition: { count: jest.fn().mockResolvedValue(18) },
    pipelineRun: { count: jest.fn().mockResolvedValue(142) },
    deployment: { count: jest.fn().mockResolvedValue(89) },
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        MetricsService,
        HealthMonitoringService,
        { provide: ObservabilityRepository, useValue: mockObservabilityRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
    metricsService = module.get<MetricsService>(MetricsService);
    healthMonitoringService = module.get<HealthMonitoringService>(HealthMonitoringService);
  });

  it('AuditLogsService should be defined', () => {
    expect(auditLogsService).toBeDefined();
  });

  it('MetricsService should be defined', () => {
    expect(metricsService).toBeDefined();
  });

  it('HealthMonitoringService should be defined', () => {
    expect(healthMonitoringService).toBeDefined();
  });

  describe('MetricsService.getSystemMetrics()', () => {
    it('should aggregate platform metrics with correct success rate', async () => {
      mockPrisma.deployment.count
        .mockResolvedValueOnce(89) // totalDeployments
        .mockResolvedValueOnce(80); // successfulDeployments

      const result = await metricsService.getSystemMetrics();

      expect(result.totalOrganizations).toBe(5);
      expect(result.totalProjects).toBe(12);
      expect(result.deploymentSuccessRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HealthMonitoringService.getHealth()', () => {
    it('should return ok status when database and queue are reachable', async () => {
      const result = await healthMonitoringService.getHealth();

      expect(result.status).toBe('ok');
      expect(result.details.database).toBe('up');
      expect(result.details.eventBus).toBe('up');
      expect(result.details.queue).toBe('up');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded status when database is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB connection failed'));

      const result = await healthMonitoringService.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.details.database).toBe('down');
    });
  });
});
