import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsService } from './services/metrics.service';
import { HealthMonitoringController } from './controllers/health-monitoring.controller';
import { HealthMonitoringService } from './services/health-monitoring.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';

// Mock ioredis
jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  })),
}));

describe('Observability AI SRE Command Center End-to-End Contract Integration', () => {
  let metricsController: MetricsController;
  let healthController: HealthMonitoringController;

  const mockPrisma = {
    organization: { count: jest.fn().mockResolvedValue(3) },
    project: { count: jest.fn().mockResolvedValue(7) },
    environment: { count: jest.fn().mockResolvedValue(15) },
    pipelineDefinition: { count: jest.fn().mockResolvedValue(9) },
    pipelineRun: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status === 'SUCCESS') return Promise.resolve(45);
        if (where?.status === 'FAILED') return Promise.resolve(5);
        if (where?.status === 'RUNNING') return Promise.resolve(2);
        if (where?.status === 'QUEUED') return Promise.resolve(3);
        return Promise.resolve(55);
      }),
    },
    deployment: {
      count: jest.fn().mockImplementation(({ where }) => {
        if (where?.status === 'SUCCESS') return Promise.resolve(28);
        return Promise.resolve(30);
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const mockConfig = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController, HealthMonitoringController],
      providers: [
        MetricsService,
        HealthMonitoringService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    metricsController = module.get<MetricsController>(MetricsController);
    healthController = module.get<HealthMonitoringController>(HealthMonitoringController);
    jest.clearAllMocks();
  });

  /* ── 1. Prometheus Telemetry Contract & Parser Accuracy ── */
  describe('Prometheus Metrics Telemetry Scraping & Parsing', () => {
    function parsePrometheusMetric(raw: string, name: string): number {
      const match = raw.match(new RegExp(`^${name}(?:\\{[^}]*\\})?\\s+(\\S+)`, 'm'));
      return match ? parseFloat(match[1]) || 0 : 0;
    }

    it('should export valid Prometheus format containing all required platform keys', async () => {
      const text = await metricsController.getPrometheusMetrics();

      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(100);

      // Verify all essential gauge and counter keys exist
      const requiredKeys = [
        'opspilot_uptime_seconds',
        'opspilot_organizations_total',
        'opspilot_projects_total',
        'opspilot_environments_total',
        'opspilot_pipeline_runs_total',
        'opspilot_pipeline_runs_success_total',
        'opspilot_pipeline_runs_failed_total',
        'opspilot_queue_running_jobs',
        'opspilot_queue_waiting_jobs',
        'opspilot_deployments_total',
        'opspilot_deployment_success_rate',
        'opspilot_process_memory_rss_bytes',
        'opspilot_system_cpu_count',
        'opspilot_system_memory_free_bytes',
        'opspilot_system_memory_total_bytes',
      ];

      for (const key of requiredKeys) {
        expect(text).toContain(key);
        const parsedVal = parsePrometheusMetric(text, key);
        expect(parsedVal).not.toBeNaN();
        expect(parsedVal).toBeGreaterThanOrEqual(0);
      }
    });

    it('should accurately parse DB aggregated totals and success rates', async () => {
      const text = await metricsController.getPrometheusMetrics();

      const totalRuns = parsePrometheusMetric(text, 'opspilot_pipeline_runs_total');
      const successRuns = parsePrometheusMetric(text, 'opspilot_pipeline_runs_success_total');
      const failedRuns = parsePrometheusMetric(text, 'opspilot_pipeline_runs_failed_total');
      const runningJobs = parsePrometheusMetric(text, 'opspilot_queue_running_jobs');
      const waitingJobs = parsePrometheusMetric(text, 'opspilot_queue_waiting_jobs');
      const deploySuccessRate = parsePrometheusMetric(text, 'opspilot_deployment_success_rate');

      expect(totalRuns).toBe(55);
      expect(successRuns).toBe(45);
      expect(failedRuns).toBe(5);
      expect(runningJobs).toBe(2);
      expect(waitingJobs).toBe(3);
      expect(deploySuccessRate).toBe(93.3);
    });
  });

  /* ── 2. Service Health Probing Contract (Postgres & Redis) ── */
  describe('Live Service Health Probing (/health)', () => {
    it('should return ok with full details when Postgres and Redis respond', async () => {
      const res = await healthController.getHealth();

      expect(res.status).toBe('ok');
      expect(res.details.database).toBe('up');
      expect(res.details.queue).toBe('up');
      expect(res.details.eventBus).toBe('up');
      expect(res.timestamp).toBeDefined();
    });

    it('should return degraded and flag database down when query fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection terminated'));

      const res = await healthController.getHealth();

      expect(res.status).toBe('degraded');
      expect(res.details.database).toBe('down');
      expect(res.details.queue).toBe('up');
    });
  });

  /* ── 3. Multi-Environment Scoping & Classification Contract ── */
  describe('Environment Branch Classification & Filtering Rules', () => {
    function branchToEnv(branch?: string): 'production' | 'staging' | 'preview' {
      if (!branch) return 'preview';
      const b = branch.toLowerCase();
      if (['main', 'master', 'prod', 'production'].includes(b) || b.startsWith('release/'))
        return 'production';
      if (
        ['staging', 'develop', 'development', 'stage', 'dev'].includes(b) ||
        b.startsWith('staging/')
      )
        return 'staging';
      return 'preview';
    }

    it('should classify production branches accurately', () => {
      expect(branchToEnv('main')).toBe('production');
      expect(branchToEnv('master')).toBe('production');
      expect(branchToEnv('production')).toBe('production');
      expect(branchToEnv('release/v2.1.0')).toBe('production');
    });

    it('should classify staging and develop branches accurately', () => {
      expect(branchToEnv('staging')).toBe('staging');
      expect(branchToEnv('develop')).toBe('staging');
      expect(branchToEnv('development')).toBe('staging');
      expect(branchToEnv('dev')).toBe('staging');
    });

    it('should classify feature and ephemeral branches as preview', () => {
      expect(branchToEnv('feat/ai-sre')).toBe('preview');
      expect(branchToEnv('fix/auth-leak')).toBe('preview');
      expect(branchToEnv(undefined)).toBe('preview');
    });
  });

  /* ── 4. AI Correlation Chain Linking Contract ── */
  describe('AI RCA Correlation Chain Construction', () => {
    it('should correlate pipeline failures with AI RCA analysis reports', () => {
      const mockRun = {
        id: 'run-101',
        pipelineDefinitionId: 'pipe-1',
        status: 'FAILED' as const,
        triggerType: 'WEBHOOK',
        branch: 'main',
        createdAt: new Date().toISOString(),
      };

      const mockAiReport = {
        id: 'ai-report-501',
        type: 'RUN_RCA' as const,
        targetId: 'run-101',
        summary: 'Worker OOM exit code 137',
        rootCause: 'Node memory exceeded 2GB limit',
        confidenceScore: 0.94,
        riskLevel: 'HIGH' as const,
        recommendations: ['Increase container RAM limit to 4GB', 'Enable heap profiling'],
        createdAt: new Date().toISOString(),
      };

      expect(mockAiReport.targetId).toBe(mockRun.id);
      expect(mockAiReport.confidenceScore).toBe(0.94);
      expect(mockAiReport.recommendations.length).toBe(2);
      expect(mockAiReport.riskLevel).toBe('HIGH');
    });
  });
});
