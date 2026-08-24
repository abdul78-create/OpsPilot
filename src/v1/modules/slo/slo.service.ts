import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SloRepository } from './slo.repository';
import { CreateSloDto } from './dto/create-slo.dto';
import { RecordSloMetricDto } from './dto/record-slo-metric.dto';
import { ServiceLevelObjective, SloStatus } from '@prisma/client';

export interface SloEvaluationResult {
  slo: ServiceLevelObjective;
  currentAvailability: number;
  errorBudgetRemaining: number;
  burnRate: number;
  status: SloStatus;
  alertLevel: 'NONE' | 'ELEVATED' | 'HIGH' | 'CRITICAL_PAGE';
  deploymentFreezeRecommended: boolean;
  recommendation: string;
}

@Injectable()
export class SloService {
  private readonly logger = new Logger(SloService.name);

  constructor(private readonly sloRepository: SloRepository) {}

  async createOrUpdate(organizationId: string, dto: CreateSloDto): Promise<ServiceLevelObjective> {
    const existing = await this.sloRepository.findByService(organizationId, dto.service);
    if (existing) {
      return this.sloRepository.update(existing.id, {
        targetAvailability: dto.targetAvailability,
        targetLatencyP95Ms: dto.targetLatencyP95Ms ?? existing.targetLatencyP95Ms,
        windowDays: dto.windowDays ?? existing.windowDays,
      });
    }

    return this.sloRepository.create({
      organization: { connect: { id: organizationId } },
      service: dto.service,
      targetAvailability: dto.targetAvailability,
      targetLatencyP95Ms: dto.targetLatencyP95Ms ?? 500,
      windowDays: dto.windowDays ?? 30,
      currentAvailability: 100.0,
      errorBudgetRemaining: 100.0,
      burnRate: 0.0,
      status: SloStatus.HEALTHY,
    });
  }

  async list(organizationId: string): Promise<ServiceLevelObjective[]> {
    return this.sloRepository.findByOrganization(organizationId);
  }

  async getByService(organizationId: string, service: string): Promise<ServiceLevelObjective> {
    const slo = await this.sloRepository.findByService(organizationId, service);
    if (!slo) {
      throw new NotFoundException(`SLO for service '${service}' not found in organization.`);
    }
    return slo;
  }

  async recordMetric(
    organizationId: string,
    service: string,
    dto: RecordSloMetricDto,
  ): Promise<SloEvaluationResult> {
    const slo = await this.getByService(organizationId, service);

    if (dto.errorRequests > dto.totalRequests) {
      throw new BadRequestException('errorRequests cannot exceed totalRequests.');
    }

    // Mathematical SRE Calculations
    const validRequests = dto.totalRequests - dto.errorRequests;
    const currentAvailability = Number(((validRequests / dto.totalRequests) * 100).toFixed(4));

    // Allowed error budget fraction (e.g., 99.9% target => 0.001 allowed error fraction)
    const allowedErrorFraction = (100.0 - slo.targetAvailability) / 100.0;
    const actualErrorFraction = dto.errorRequests / dto.totalRequests;

    // Burn rate calculation (Google SRE standard: burn_rate = actual_error_rate / allowed_error_rate)
    const burnRate =
      allowedErrorFraction > 0
        ? Number((actualErrorFraction / allowedErrorFraction).toFixed(2))
        : 0.0;

    // Error budget remaining %
    // If burnRate is 1.0, error budget is consumed at normal 100% rate over window
    // Instantaneous remaining budget calculation:
    let errorBudgetRemaining = 100.0 - burnRate * (100.0 / (slo.windowDays * 24)); // per hour degradation factor
    if (burnRate === 0) {
      errorBudgetRemaining = Math.min(100.0, slo.errorBudgetRemaining + 0.1);
    } else {
      errorBudgetRemaining = Math.max(
        0.0,
        Number((slo.errorBudgetRemaining - burnRate * 0.5).toFixed(2)),
      );
    }

    let status: SloStatus = SloStatus.HEALTHY;
    let alertLevel: 'NONE' | 'ELEVATED' | 'HIGH' | 'CRITICAL_PAGE' = 'NONE';
    let deploymentFreezeRecommended = false;
    let recommendation = 'Service is meeting its reliability objective.';

    if (burnRate >= 14.4 || errorBudgetRemaining <= 0) {
      status = SloStatus.BREACHED;
      alertLevel = 'CRITICAL_PAGE';
      deploymentFreezeRecommended = true;
      recommendation = `CRITICAL: Burn rate ${burnRate}x exceeds 14.4x 1h threshold. Error budget exhausted. Freeze deployments immediately and trigger AI Incident Copilot.`;
    } else if (burnRate >= 6.0 || errorBudgetRemaining < 20.0) {
      status = SloStatus.WARNING;
      alertLevel = 'HIGH';
      deploymentFreezeRecommended = true;
      recommendation = `HIGH ALERT: 6x burn rate detected (budget remaining: ${errorBudgetRemaining}%). Deployment freeze recommended until error rate subsides.`;
    } else if (burnRate > 1.0 || errorBudgetRemaining < 50.0) {
      status = SloStatus.WARNING;
      alertLevel = 'ELEVATED';
      deploymentFreezeRecommended = false;
      recommendation = `Elevated error rate (${burnRate}x burn). Monitor canary releases closely.`;
    }

    const updated = await this.sloRepository.update(slo.id, {
      currentAvailability,
      errorBudgetRemaining,
      burnRate,
      status,
    });

    this.logger.log(
      `SLO Evaluated [${service}]: Availability=${currentAvailability}%, BurnRate=${burnRate}x, Status=${status}`,
    );

    return {
      slo: updated,
      currentAvailability,
      errorBudgetRemaining,
      burnRate,
      status,
      alertLevel,
      deploymentFreezeRecommended,
      recommendation,
    };
  }

  async delete(organizationId: string, service: string): Promise<void> {
    const slo = await this.getByService(organizationId, service);
    await this.sloRepository.delete(slo.id);
  }
}
