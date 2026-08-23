import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { DeploymentStatus } from '@prisma/client';

export interface CanaryConfig {
  deploymentId: string;
  environmentId: string;
  organizationId: string;
  stages?: number[]; // e.g. [5, 25, 50, 100]
  errorRateThresholdPct?: number; // e.g. 2.0 (2%)
  latencyP95ThresholdMs?: number; // e.g. 500 (500ms)
  consecutiveBreachesRequired?: number; // e.g. 2 (anti-flapping filter)
}

export interface MetricSample {
  errorRatePct: number;
  latencyP95Ms: number;
  isAvailable: boolean;
}

export interface SloEvaluationResult {
  currentTrafficPct: number;
  errorRatePct: number;
  latencyP95Ms: number;
  isSloHealthy: boolean;
  breachCount: number;
  decision: 'PROMOTE' | 'ROLLBACK' | 'HOLD' | 'COMPLETED';
  reason: string;
}

@Injectable()
export class CanarySloEngineService {
  private readonly logger = new Logger(CanarySloEngineService.name);

  // In-memory breach counter per deployment to prevent rollback on a single transient spike
  private breachCounters = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus?: EventBusService,
  ) {}

  /**
   * Evaluates a single canary metric sample against SLO thresholds.
   * Promotes traffic progressively (5% → 25% → 50% → 100%) or triggers auto-rollback.
   */
  async evaluateCanarySample(
    config: CanaryConfig,
    sample: MetricSample,
    currentTrafficPct: number,
  ): Promise<SloEvaluationResult> {
    const stages = config.stages || [5, 25, 50, 100];
    const maxErrorRate = config.errorRateThresholdPct ?? 2.0;
    const maxLatency = config.latencyP95ThresholdMs ?? 500;
    const minBreaches = config.consecutiveBreachesRequired ?? 2;

    // Handle Prometheus unavailability / telemetry blackout gracefully
    if (!sample.isAvailable) {
      this.logger.warn(
        `Prometheus telemetry unavailable for deployment '${config.deploymentId}'. Holding traffic at ${currentTrafficPct}%.`,
      );
      return {
        currentTrafficPct,
        errorRatePct: 0,
        latencyP95Ms: 0,
        isSloHealthy: false,
        breachCount: 0,
        decision: 'HOLD',
        reason: 'Telemetry metric collection temporarily unavailable (Safe Fallback)',
      };
    }

    const isErrorBreached = sample.errorRatePct > maxErrorRate;
    const isLatencyBreached = sample.latencyP95Ms > maxLatency;
    const isBreached = isErrorBreached || isLatencyBreached;

    let currentBreaches = this.breachCounters.get(config.deploymentId) || 0;

    if (isBreached) {
      currentBreaches += 1;
      this.breachCounters.set(config.deploymentId, currentBreaches);

      const breachReason = isErrorBreached
        ? `HTTP 5xx error rate ${sample.errorRatePct}% exceeded SLO threshold ${maxErrorRate}%`
        : `p95 Latency ${sample.latencyP95Ms}ms exceeded SLO threshold ${maxLatency}ms`;

      this.logger.warn(
        `⚠️ Canary SLO breach (${currentBreaches}/${minBreaches}) for deployment '${config.deploymentId}': ${breachReason}`,
      );

      // Check if breaches have persisted across evaluation window (Anti-flapping guard)
      if (currentBreaches >= minBreaches) {
        await this.executeAutoRollback(config.deploymentId, breachReason);
        return {
          currentTrafficPct: 0,
          errorRatePct: sample.errorRatePct,
          latencyP95Ms: sample.latencyP95Ms,
          isSloHealthy: false,
          breachCount: currentBreaches,
          decision: 'ROLLBACK',
          reason: `Sustained SLO breach: ${breachReason}`,
        };
      } else {
        return {
          currentTrafficPct,
          errorRatePct: sample.errorRatePct,
          latencyP95Ms: sample.latencyP95Ms,
          isSloHealthy: false,
          breachCount: currentBreaches,
          decision: 'HOLD',
          reason: `Transient SLO breach detected (${currentBreaches}/${minBreaches}). Holding traffic before rollback decision.`,
        };
      }
    }

    // Metric is healthy: reset consecutive breach counter
    this.breachCounters.set(config.deploymentId, 0);

    const currentIndex = stages.indexOf(currentTrafficPct);
    if (currentIndex === -1 || currentIndex >= stages.length - 1) {
      // 100% traffic reached successfully
      return {
        currentTrafficPct: 100,
        errorRatePct: sample.errorRatePct,
        latencyP95Ms: sample.latencyP95Ms,
        isSloHealthy: true,
        breachCount: 0,
        decision: 'COMPLETED',
        reason: 'Canary release reached 100% traffic with zero sustained SLO breaches',
      };
    }

    const nextTrafficPct = stages[currentIndex + 1];
    return {
      currentTrafficPct: nextTrafficPct,
      errorRatePct: sample.errorRatePct,
      latencyP95Ms: sample.latencyP95Ms,
      isSloHealthy: true,
      breachCount: 0,
      decision: 'PROMOTE',
      reason: `SLO healthy (Error: ${sample.errorRatePct}%, Latency: ${sample.latencyP95Ms}ms). Promoting traffic from ${currentTrafficPct}% to ${nextTrafficPct}%.`,
    };
  }

  /**
   * Executes automated rollback to the previous deployment version upon sustained SLO breach.
   */
  async executeAutoRollback(deploymentId: string, reason: string): Promise<void> {
    this.logger.warn(`🚨 Executing SLO-based automated rollback for deployment '${deploymentId}'`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) return;

    // Find previous successful deployment in the same environment
    const previousDeployment = await this.prisma.deployment.findFirst({
      where: {
        environmentId: deployment.environmentId,
        status: DeploymentStatus.SUCCESS,
        id: { not: deploymentId },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.ROLLED_BACK,
        rollbackFromDeploymentId: previousDeployment?.id || null,
        finishedAt: new Date(),
      },
    });

    if (this.eventBus) {
      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'deployment.rolled_back.v1',
        aggregateId: deploymentId,
        aggregateType: 'Deployment',
        occurredOn: new Date(),
        version: 1,
        payload: {
          deploymentId,
          environmentId: deployment.environmentId,
          reason,
          restoredDeploymentId: previousDeployment?.id || null,
        },
      });
    }

    this.logger.log(
      `✓ Automated rollback completed for '${deploymentId}'. Restored version: ${previousDeployment?.releaseVersion || 'previous_stable'}`,
    );
  }

  /**
   * Generates dynamic Nginx reverse proxy split configuration for canary traffic routing.
   */
  generateNginxCanaryConfig(
    canaryTrafficPct: number,
    stableUpstream: string = 'opspilot_app_stable:8080',
    canaryUpstream: string = 'opspilot_app_canary:8080',
  ): string {
    if (canaryTrafficPct <= 0) {
      return `# OpsPilot Dynamic Traffic Split: 100% Stable (Canary Disabled / Rolled Back)\nupstream opspilot_target_app {\n    server ${stableUpstream.replace('http://', '')};\n}\n`;
    }
    if (canaryTrafficPct >= 100) {
      return `# OpsPilot Dynamic Traffic Split: 100% Canary (Promoted to Full Release)\nupstream opspilot_target_app {\n    server ${canaryUpstream.replace('http://', '')};\n}\n`;
    }

    const stablePct = 100 - canaryTrafficPct;
    return `# OpsPilot Dynamic Traffic Split: ${canaryTrafficPct}% Canary / ${stablePct}% Stable\nsplit_clients "\${remote_addr}\${http_user_agent}" $app_canary_upstream {\n    ${canaryTrafficPct}% ${canaryUpstream.replace('http://', '')};\n    *   ${stableUpstream.replace('http://', '')};\n}\n\nupstream opspilot_target_app {\n    server $app_canary_upstream;\n}\n`;
  }
}
