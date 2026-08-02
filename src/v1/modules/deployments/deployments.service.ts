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
    const targetDeployment = await this.findById(dto.targetDeploymentId);

    if (targetDeployment.status !== DeploymentStatus.SUCCESS) {
      throw new BadRequestException(
        `Target deployment '${dto.targetDeploymentId}' was not successful and cannot be used for rollback`,
      );
    }

    const rollbackDeployment = await this.createDeployment(targetDeployment.environmentId, userId, {
      pipelineRunId: targetDeployment.pipelineRunId,
      releaseVersion: `${targetDeployment.releaseVersion}-rollback`,
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
}
