import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsService } from './services/metrics.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';

describe('MetricsController Prometheus Operational Metrics Export Integration Test', () => {
  let controller: MetricsController;

  const mockPrisma = {
    organization: { count: jest.fn().mockResolvedValue(1) },
    project: { count: jest.fn().mockResolvedValue(2) },
    environment: { count: jest.fn().mockResolvedValue(3) },
    pipelineDefinition: { count: jest.fn().mockResolvedValue(4) },
    pipelineRun: { count: jest.fn().mockResolvedValue(10) },
    deployment: { count: jest.fn().mockResolvedValue(8) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MetricsController>(MetricsController);
    jest.clearAllMocks();
  });

  it('should export platform CI/CD metrics in standard Prometheus Exposition text format (version 0.0.4)', async () => {
    const res = await controller.getPrometheusMetrics();

    expect(res).toContain('# HELP opspilot_uptime_seconds Total backend process uptime in seconds');
    expect(res).toContain('# TYPE opspilot_uptime_seconds counter');
    expect(res).toContain('opspilot_organizations_total 1');
    expect(res).toContain('opspilot_projects_total 2');
    expect(res).toContain('opspilot_environments_total 3');
    expect(res).toContain('opspilot_pipeline_runs_total 10');
    expect(res).toContain('opspilot_deployments_total 8');
    expect(res).toContain('opspilot_process_memory_rss_bytes');
    expect(res).toContain('opspilot_system_cpu_count');
  });
});
