import { Test, TestingModule } from '@nestjs/testing';
import {
  CanarySloEngineService,
  CanaryConfig,
  MetricSample,
} from './services/canary-slo-engine.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { DeploymentStatus } from '@prisma/client';

describe('Canary Progressive Rollout & Prometheus SLO Auto-Rollback Matrix', () => {
  let canaryService: CanarySloEngineService;

  const mockPrisma = {
    deployment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(true),
  };

  const sampleConfig: CanaryConfig = {
    deploymentId: 'dep_canary_test_001',
    environmentId: 'env_prod_001',
    organizationId: 'org_acme_corp',
    stages: [5, 25, 50, 100],
    errorRateThresholdPct: 2.0,
    latencyP95ThresholdMs: 500,
    consecutiveBreachesRequired: 2,
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanarySloEngineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    canaryService = module.get<CanarySloEngineService>(CanarySloEngineService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Healthy Canary Progressive Promotion (5% → 25% → 50% → 100%)', () => {
    it('should promote traffic across progressive canary stages when metrics are within SLO', async () => {
      const healthySample: MetricSample = {
        errorRatePct: 0.1,
        latencyP95Ms: 120,
        isAvailable: true,
      };

      // Stage 1: 5% -> 25%
      const step1 = await canaryService.evaluateCanarySample(sampleConfig, healthySample, 5);
      expect(step1.decision).toBe('PROMOTE');
      expect(step1.currentTrafficPct).toBe(25);
      expect(step1.isSloHealthy).toBe(true);

      // Stage 2: 25% -> 50%
      const step2 = await canaryService.evaluateCanarySample(sampleConfig, healthySample, 25);
      expect(step2.decision).toBe('PROMOTE');
      expect(step2.currentTrafficPct).toBe(50);

      // Stage 3: 50% -> 100%
      const step3 = await canaryService.evaluateCanarySample(sampleConfig, healthySample, 50);
      expect(step3.decision).toBe('PROMOTE');
      expect(step3.currentTrafficPct).toBe(100);

      // Stage 4: 100% -> COMPLETED
      const step4 = await canaryService.evaluateCanarySample(sampleConfig, healthySample, 100);
      expect(step4.decision).toBe('COMPLETED');
      expect(step4.currentTrafficPct).toBe(100);
    });
  });

  describe('2. Error Rate Breach & Sustained Anti-Flapping Filter', () => {
    it('should NOT rollback on a single transient spike (Anti-Flapping Filter)', async () => {
      const transientSpike: MetricSample = {
        errorRatePct: 4.5, // > 2.0% threshold
        latencyP95Ms: 150,
        isAvailable: true,
      };

      const result = await canaryService.evaluateCanarySample(sampleConfig, transientSpike, 25);
      expect(result.decision).toBe('HOLD');
      expect(result.currentTrafficPct).toBe(25);
      expect(result.breachCount).toBe(1);
      expect(mockPrisma.deployment.update).not.toHaveBeenCalled();
    });

    it('should trigger automated rollback when error rate breach is sustained across consecutive samples', async () => {
      const sustainedBreach: MetricSample = {
        errorRatePct: 3.8, // > 2.0% threshold
        latencyP95Ms: 160,
        isAvailable: true,
      };

      mockPrisma.deployment.findUnique.mockResolvedValueOnce({
        id: sampleConfig.deploymentId,
        environmentId: sampleConfig.environmentId,
        releaseVersion: 'v2.1.0-canary',
      });

      mockPrisma.deployment.findFirst.mockResolvedValueOnce({
        id: 'dep_prev_stable_000',
        releaseVersion: 'v2.0.9-stable',
        status: DeploymentStatus.SUCCESS,
      });

      // Sample 2: Second consecutive breach -> triggers auto-rollback
      const result = await canaryService.evaluateCanarySample(sampleConfig, sustainedBreach, 25);
      expect(result.decision).toBe('ROLLBACK');
      expect(result.currentTrafficPct).toBe(0);
      expect(result.reason).toContain('Sustained SLO breach');

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleConfig.deploymentId },
          data: expect.objectContaining({
            status: DeploymentStatus.ROLLED_BACK,
          }),
        }),
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'deployment.rolled_back.v1',
        }),
      );
    });
  });

  describe('3. Latency SLO Breach Rollback', () => {
    it('should trigger rollback when p95 latency exceeds threshold over sustained window', async () => {
      const latencyBreachConfig: CanaryConfig = {
        ...sampleConfig,
        deploymentId: 'dep_latency_test_002',
        consecutiveBreachesRequired: 1, // Single evaluation for latency test
      };

      const highLatencySample: MetricSample = {
        errorRatePct: 0.2,
        latencyP95Ms: 850, // > 500ms threshold
        isAvailable: true,
      };

      mockPrisma.deployment.findUnique.mockResolvedValueOnce({
        id: latencyBreachConfig.deploymentId,
        environmentId: latencyBreachConfig.environmentId,
      });

      const result = await canaryService.evaluateCanarySample(
        latencyBreachConfig,
        highLatencySample,
        50,
      );
      expect(result.decision).toBe('ROLLBACK');
      expect(result.reason).toContain('p95 Latency 850ms exceeded SLO threshold 500ms');
    });
  });

  describe('4. Prometheus Telemetry Blackout & Safe Fallback', () => {
    it('should hold traffic safely without rolling back when telemetry is temporarily unavailable', async () => {
      const unavailableSample: MetricSample = {
        errorRatePct: 0,
        latencyP95Ms: 0,
        isAvailable: false,
      };

      const result = await canaryService.evaluateCanarySample(sampleConfig, unavailableSample, 25);
      expect(result.decision).toBe('HOLD');
      expect(result.currentTrafficPct).toBe(25);
      expect(result.reason).toContain('Safe Fallback');
    });
  });

  describe('5. Dynamic Nginx Upstream Traffic-Splitting Config Generation', () => {
    it('should generate split_clients Nginx config for partial canary traffic (e.g. 25% / 75%)', () => {
      const config = canaryService.generateNginxCanaryConfig(25);
      expect(config).toContain('25% opspilot_app_canary:8080');
      expect(config).toContain('*   opspilot_app_stable:8080');
      expect(config).toContain('split_clients');
    });

    it('should generate 100% stable config on rollback or 0% traffic', () => {
      const config = canaryService.generateNginxCanaryConfig(0);
      expect(config).toContain('100% Stable (Canary Disabled / Rolled Back)');
      expect(config).toContain('server opspilot_app_stable:8080');
    });

    it('should generate 100% canary config on full promotion', () => {
      const config = canaryService.generateNginxCanaryConfig(100);
      expect(config).toContain('100% Canary (Promoted to Full Release)');
      expect(config).toContain('server opspilot_app_canary:8080');
    });
  });
});
