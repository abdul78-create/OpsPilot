import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { IAiProvider } from '../../../core/ai/interfaces/ai-provider.interface';
import { RuleBasedAiProvider } from '../../../core/ai/providers/rule-based-ai.provider';
import {
  AiAnalysisReport,
  AiAnalysisType,
  JobStatus,
  DeploymentStatus,
  Prisma,
} from '@prisma/client';

export const AI_PROVIDER_TOKEN = 'IAiProvider';

@Injectable()
export class AiOrchestrationService {
  private readonly logger = new Logger(AiOrchestrationService.name);

  constructor(
    private readonly aiRepository: AiOrchestrationRepository,
    private readonly prisma: PrismaService,
    @Inject(RuleBasedAiProvider) private readonly aiProvider: IAiProvider,
  ) {}

  async analyzeRunFailure(pipelineRunId: string): Promise<AiAnalysisReport> {
    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, deletedAt: null },
      include: {
        pipelineDefinition: {
          include: { project: true },
        },
        jobs: {
          where: { status: JobStatus.FAILED },
          include: { logs: { orderBy: { timestamp: 'asc' }, take: 50 } },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${pipelineRunId}' not found`);
    }

    const orgId = run.pipelineDefinition.project.organizationId;
    const projectId = run.pipelineDefinition.project.id;

    const analysisContext = {
      runId: run.id,
      pipelineName: run.pipelineDefinition.name,
      branch: run.branch,
      commitSha: run.commitSha,
      failedJobs: run.jobs.map((j) => ({
        id: j.id,
        name: j.name,
        stage: j.stage,
        logs: j.logs.map((l) => ({
          level: l.level,
          message: l.message,
          timestamp: l.timestamp,
        })),
      })),
    };

    const result = await this.aiProvider.analyzeRunFailure(analysisContext);

    return this.aiRepository.create({
      organization: { connect: { id: orgId } },
      project: { connect: { id: projectId } },
      type: AiAnalysisType.RUN_RCA,
      targetId: run.id,
      summary: result.summary,
      rootCause: result.rootCause,
      confidenceScore: result.confidenceScore,
      riskLevel: result.riskLevel,
      recommendations: result.recommendations as unknown as Prisma.InputJsonValue,
      metadata: {
        failedJobCount: run.jobs.length,
        branch: run.branch,
        commitSha: run.commitSha,
      } as unknown as Prisma.InputJsonValue,
    });
  }

  async scoreDeploymentRisk(deploymentId: string): Promise<AiAnalysisReport> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, deletedAt: null },
      include: {
        environment: {
          include: { project: true },
        },
        approvals: true,
      },
    });

    if (!deployment) {
      throw new NotFoundException(`Deployment '${deploymentId}' not found`);
    }

    const env = deployment.environment;
    const orgId = env.project.organizationId;
    const projectId = env.project.id;

    // Calculate recent failure rate in target environment
    const totalRecent = await this.prisma.deployment.count({
      where: { environmentId: env.id, deletedAt: null },
    });
    const failedRecent = await this.prisma.deployment.count({
      where: {
        environmentId: env.id,
        status: DeploymentStatus.FAILED,
        deletedAt: null,
      },
    });
    const recentFailureRatePercent =
      totalRecent > 0 ? Math.round((failedRecent / totalRecent) * 100) : 0;

    const riskContext = {
      deploymentId: deployment.id,
      environmentName: env.name,
      environmentType: env.type,
      releaseVersion: deployment.releaseVersion,
      requiresApproval: env.requiresApproval,
      approvalCount: deployment.approvals.filter((a) => a.status === 'APPROVED').length,
      minApprovers: env.minApprovers,
      recentFailureRatePercent,
    };

    const result = await this.aiProvider.scoreDeploymentRisk(riskContext);

    return this.aiRepository.create({
      organization: { connect: { id: orgId } },
      project: { connect: { id: projectId } },
      type: AiAnalysisType.DEPLOYMENT_RISK,
      targetId: deployment.id,
      summary: result.summary,
      rootCause: null,
      confidenceScore: 0.9,
      riskLevel: result.riskLevel,
      recommendations: result.recommendations as unknown as Prisma.InputJsonValue,
      metadata: {
        riskScore: result.riskScore,
        riskFactors: result.riskFactors,
        environmentType: env.type,
      } as unknown as Prisma.InputJsonValue,
    });
  }

  @OnEvent('pipeline.run_failed.v1')
  async handleRunFailedEvent(event: { payload: { pipelineRunId: string } }): Promise<void> {
    const runId = event.payload?.pipelineRunId;
    if (!runId) return;

    this.logger.log(`Automated AI Root Cause Analysis triggered for run '${runId}'`);
    try {
      await this.analyzeRunFailure(runId);
    } catch (err) {
      this.logger.error(`Automated RCA failed for run '${runId}': ${(err as Error).message}`);
    }
  }

  async findByOrganization(organizationId: string, type?: string): Promise<AiAnalysisReport[]> {
    return this.aiRepository.findByOrganization(organizationId, type);
  }

  async findById(id: string): Promise<AiAnalysisReport> {
    const report = await this.aiRepository.findById(id);
    if (!report) {
      throw new NotFoundException(`AI Analysis Report '${id}' not found`);
    }
    return report;
  }
}
