import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeploymentsRepository } from './deployments.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { ApprovalEngineService } from './services/approval-engine.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { ApproveDeploymentDto } from './dto/approve-deployment.dto';
import { RollbackDeploymentDto } from './dto/rollback-deployment.dto';
import {
  Deployment,
  DeploymentApproval,
  DeploymentStatus,
  ApprovalStatus,
  OrgRole,
} from '@prisma/client';

import { DeploymentRunnerService } from './services/deployment-runner.service';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly deploymentsRepository: DeploymentsRepository,
    private readonly prisma: PrismaService,
    private readonly txManager: TransactionManager,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly deploymentRunner: DeploymentRunnerService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async createDeployment(
    environmentId: string,
    userId: string,
    dto: CreateDeploymentDto,
  ): Promise<Deployment & { approvals?: DeploymentApproval[] }> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: dto.pipelineRunId, deletedAt: null },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${dto.pipelineRunId}' not found`);
    }

    this.approvalEngine.validateDeploymentWindow(environment.deploymentWindow);
    const evaluation = this.approvalEngine.evaluateEnvironmentProtection(environment);

    const initialStatus = evaluation.requiresApproval
      ? DeploymentStatus.PENDING_APPROVAL
      : DeploymentStatus.IN_PROGRESS;

    const result = await this.txManager.execute(async (tx) => {
      const deployment = await tx.deployment.create({
        data: {
          environment: { connect: { id: environmentId } },
          pipelineRun: { connect: { id: dto.pipelineRunId } },
          status: initialStatus,
          releaseVersion: dto.releaseVersion || 'v1.0.0',
          deployedByUserId: userId,
          startedAt: initialStatus === DeploymentStatus.IN_PROGRESS ? new Date() : null,
        },
      });

      return deployment;
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'deployment.created.v1',
      aggregateId: result.id,
      aggregateType: 'Deployment',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        deploymentId: result.id,
        environmentId: result.environmentId,
        pipelineRunId: result.pipelineRunId,
        status: result.status,
        releaseVersion: result.releaseVersion,
        deployedByUserId: userId,
      },
    });

    if (evaluation.requiresApproval) {
      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'deployment.approval_requested.v1',
        aggregateId: result.id,
        aggregateType: 'Deployment',
        occurredOn: new Date(),
        version: 1,
        correlationId: this.contextService.getCorrelationId(),
        payload: {
          deploymentId: result.id,
          environmentId: result.environmentId,
          minApprovers: evaluation.minApprovers,
          allowedRoles: evaluation.allowedRoles,
        },
      });
    }

    if (initialStatus === DeploymentStatus.IN_PROGRESS) {
      setImmediate(() => {
        this.deploymentRunner.executeDeployment(result.id).catch((err) => {
          console.error(`Deployment execution error for '${result.id}':`, err);
        });
      });
    }

    return result;
  }

  async findAll(environmentId: string): Promise<Deployment[]> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    return this.deploymentsRepository.findEnvironmentDeployments(environmentId);
  }

  async findById(deploymentId: string): Promise<Deployment> {
    const deployment = await this.deploymentsRepository.findDeploymentDetails(deploymentId);

    if (!deployment) {
      throw new NotFoundException(`Deployment '${deploymentId}' not found`);
    }

    return deployment;
  }

  async approveDeployment(
    deploymentId: string,
    approverUserId: string,
    approverRole: OrgRole,
    dto: ApproveDeploymentDto,
  ): Promise<Deployment> {
    const deployment = await this.findById(deploymentId);

    if (deployment.status !== DeploymentStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Deployment '${deploymentId}' is not pending approval (Current status: ${deployment.status})`,
      );
    }

    const environment = await this.prisma.environment.findFirst({
      where: { id: deployment.environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${deployment.environmentId}' not found`);
    }

    this.approvalEngine.validateApproverRole(approverRole, environment.allowedRoles);

    await this.deploymentsRepository.createApproval({
      deployment: { connect: { id: deployment.id } },
      approverUserId,
      status: dto.status,
      comment: dto.comment,
      decidedAt: new Date(),
    });

    if (dto.status === ApprovalStatus.REJECTED) {
      const rejectedDeployment = await this.deploymentsRepository.update(deployment.id, {
        status: DeploymentStatus.REJECTED,
        finishedAt: new Date(),
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'deployment.rejected.v1',
        aggregateId: rejectedDeployment.id,
        aggregateType: 'Deployment',
        occurredOn: new Date(),
        version: 1,
        correlationId: this.contextService.getCorrelationId(),
        payload: {
          deploymentId: rejectedDeployment.id,
          approverUserId,
          comment: dto.comment,
        },
      });

      return rejectedDeployment;
    }

    const existingApprovals = await this.deploymentsRepository.findApprovals(deployment.id);
    const approvedCount = existingApprovals.filter(
      (a) => a.status === ApprovalStatus.APPROVED,
    ).length;

    let updatedDeployment = deployment;

    if (approvedCount >= environment.minApprovers) {
      updatedDeployment = await this.deploymentsRepository.update(deployment.id, {
        status: DeploymentStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'deployment.approved.v1',
        aggregateId: updatedDeployment.id,
        aggregateType: 'Deployment',
        occurredOn: new Date(),
        version: 1,
        correlationId: this.contextService.getCorrelationId(),
        payload: {
          deploymentId: updatedDeployment.id,
          approverUserId,
          approvedCount,
          minApprovers: environment.minApprovers,
        },
      });
    }

    return updatedDeployment;
  }

  async rollbackDeployment(
    deploymentId: string,
    userId: string,
    dto: RollbackDeploymentDto,
  ): Promise<Deployment> {
    const sourceDeployment = await this.findById(deploymentId);

    // If source deployment is stuck IN_PROGRESS, cleanly transition to FAILED to release environment lock
    if (sourceDeployment.status === DeploymentStatus.IN_PROGRESS) {
      await this.deploymentsRepository.update(sourceDeployment.id, {
        status: DeploymentStatus.FAILED,
        finishedAt: new Date(),
      });
    }

    let targetDeployment: Deployment | null = null;
    if (dto.targetDeploymentId) {
      targetDeployment = await this.findById(dto.targetDeploymentId);
    } else {
      targetDeployment = await this.prisma.deployment.findFirst({
        where: {
          environmentId: sourceDeployment.environmentId,
          status: DeploymentStatus.SUCCESS,
          id: { not: deploymentId },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!targetDeployment) {
      throw new BadRequestException(
        `No valid prior successful deployment found for rollback in environment '${sourceDeployment.environmentId}'`,
      );
    }

    if (targetDeployment.status !== DeploymentStatus.SUCCESS) {
      throw new BadRequestException(
        `Target deployment '${targetDeployment.id}' was not successful and cannot be used for rollback`,
      );
    }

    const rollbackDeployment = await this.createDeployment(targetDeployment.environmentId, userId, {
      pipelineRunId: targetDeployment.pipelineRunId,
      releaseVersion: `${targetDeployment.releaseVersion}-rollback`,
    });

    // Clear any stale/abandoned IN_PROGRESS deployments in target environment to release lock
    await this.prisma.deployment.updateMany({
      where: {
        environmentId: targetDeployment.environmentId,
        status: DeploymentStatus.IN_PROGRESS,
        id: { not: rollbackDeployment.id },
      },
      data: {
        status: DeploymentStatus.FAILED,
        finishedAt: new Date(),
      },
    });

    await this.deploymentRunner.executeDeployment(rollbackDeployment.id);

    const updatedRollback = await this.deploymentsRepository.update(rollbackDeployment.id, {
      status: DeploymentStatus.ROLLED_BACK,
      rollbackFromDeploymentId: targetDeployment.id,
      finishedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'deployment.rolled_back.v1',
      aggregateId: updatedRollback.id,
      aggregateType: 'Deployment',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        deploymentId: updatedRollback.id,
        targetDeploymentId: targetDeployment.id,
        environmentId: targetDeployment.environmentId,
        rolledBackByUserId: userId,
        reason: dto.reason || 'Manual rollback requested',
      },
    });

    return updatedRollback;
  }

  async getDeploymentHealth(deploymentId: string): Promise<{
    deploymentId: string;
    releaseVersion: string;
    environmentId: string;
    status: string;
    healthStatus: string;
    url: string;
    statusCode: number;
    latencyMs: number;
  }> {
    const deployment = await this.findById(deploymentId);
    const start = Date.now();
    let statusCode = 0;
    let healthStatus = 'UNHEALTHY';

    try {
      const http = await import('http');
      const targetUrl =
        process.env.DEPLOYMENT_HEALTH_URL || 'http://opspilot_app_target:8080/health';
      const result = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        const req = http.get(targetUrl, (res) => {
          let b = '';
          res.on('data', (c) => (b += c));
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: b }));
        });
        req.on('error', (_err) => {
          // Fallback to localhost if container host is not resolved
          http
            .get('http://localhost:8080/health', (res2) => {
              let b2 = '';
              res2.on('data', (c2) => (b2 += c2));
              res2.on('end', () => resolve({ statusCode: res2.statusCode || 0, body: b2 }));
            })
            .on('error', reject);
        });
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      statusCode = result.statusCode;
      if (statusCode === 200) {
        healthStatus = 'HEALTHY';
      }
    } catch (e) {
      statusCode = 503;
      healthStatus = 'UNREACHABLE';
    }

    const latencyMs = Date.now() - start;
    return {
      deploymentId: deployment.id,
      releaseVersion: deployment.releaseVersion,
      environmentId: deployment.environmentId,
      status: deployment.status,
      healthStatus,
      url: 'http://localhost:8080/health',
      statusCode,
      latencyMs,
    };
  }
}
