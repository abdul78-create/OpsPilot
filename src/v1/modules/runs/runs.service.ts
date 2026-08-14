import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RunsRepository } from './runs.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { TriggerEngineService } from './services/trigger-engine.service';
import { TriggerPipelineRunDto } from './dto/trigger-pipeline-run.dto';
import { PIPELINE_RUN_QUEUE, PIPELINE_RUN_JOB_NAME } from '../../../core/worker/worker.constants';
import {
  PipelineRun,
  PipelineJob,
  PipelineRunStatus,
  JobStatus,
  TriggerType,
} from '@prisma/client';

@Injectable()
export class RunsService {
  constructor(
    private readonly runsRepository: RunsRepository,
    private readonly prisma: PrismaService,
    private readonly txManager: TransactionManager,
    private readonly triggerEngine: TriggerEngineService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
    @InjectQueue(PIPELINE_RUN_QUEUE) private readonly pipelineRunQueue: Queue,
  ) {}

  async triggerRun(
    pipelineId: string,
    userId: string,
    dto: TriggerPipelineRunDto,
  ): Promise<PipelineRun & { jobs: PipelineJob[] }> {
    const pipeline = await this.prisma.pipelineDefinition.findFirst({
      where: { id: pipelineId, deletedAt: null },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline Definition '${pipelineId}' not found`);
    }

    if (!pipeline.isActive) {
      throw new BadRequestException(`Pipeline Definition '${pipeline.name}' is inactive`);
    }

    const latestVersion = pipeline.versions[0];
    if (!latestVersion) {
      throw new NotFoundException(`No valid version found for Pipeline '${pipeline.name}'`);
    }

    const triggerReq = this.triggerEngine.normalizeTriggerRequest(
      pipeline.id,
      latestVersion.id,
      dto.triggerType || TriggerType.MANUAL,
      userId,
      { commitSha: dto.commitSha, branch: dto.branch || pipeline.triggerBranch },
    );

    const result = await this.txManager.execute(async (tx) => {
      const run = await tx.pipelineRun.create({
        data: {
          pipelineDefinition: { connect: { id: triggerReq.pipelineDefinitionId } },
          pipelineVersion: { connect: { id: triggerReq.pipelineVersionId } },
          status: PipelineRunStatus.QUEUED,
          triggerType: triggerReq.triggerType,
          triggeredBy: triggerReq.triggeredBy,
          commitSha: triggerReq.commitSha,
          branch: triggerReq.branch,
          queuedAt: new Date(),
        },
      });

      const defaultJobs = [
        { name: 'Build Source & Assets', stage: 'build' },
        { name: 'Run Unit & Integration Tests', stage: 'test' },
        { name: 'Deploy Artifacts', stage: 'deploy' },
      ];

      const createdJobs: PipelineJob[] = [];
      for (const j of defaultJobs) {
        const job = await tx.pipelineJob.create({
          data: {
            pipelineRun: { connect: { id: run.id } },
            name: j.name,
            stage: j.stage,
            status: JobStatus.QUEUED,
          },
        });
        createdJobs.push(job);
      }

      return { ...run, jobs: createdJobs };
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.run_queued.v1',
      aggregateId: result.id,
      aggregateType: 'PipelineRun',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineRunId: result.id,
        pipelineDefinitionId: result.pipelineDefinitionId,
        pipelineVersionId: result.pipelineVersionId,
        status: result.status,
        triggerType: result.triggerType,
        triggeredBy: result.triggeredBy,
      },
    });

    // Resolve target repository connection URL for worker repository cloning
    const repoConn = await this.prisma.repositoryConnection.findFirst({
      where: { projectId: pipeline.projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const repoUrl = repoConn?.repositoryUrl || 'https://github.com/expressjs/express';

    // Dispatch to BullMQ worker queue for async execution
    await this.pipelineRunQueue.add(PIPELINE_RUN_JOB_NAME, {
      pipelineRunId: result.id,
      repoUrl,
    });

    return result;
  }

  async findAll(pipelineId: string): Promise<PipelineRun[]> {
    const pipeline = await this.prisma.pipelineDefinition.findFirst({
      where: { id: pipelineId, deletedAt: null },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline Definition '${pipelineId}' not found`);
    }

    return this.runsRepository.findPipelineRuns(pipelineId);
  }

  async findById(runId: string): Promise<PipelineRun> {
    const run = await this.runsRepository.findRunDetails(runId);

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${runId}' not found`);
    }

    return run;
  }

  async cancelRun(runId: string, userId: string): Promise<PipelineRun> {
    const run = await this.findById(runId);

    if (run.status === PipelineRunStatus.SUCCESS || run.status === PipelineRunStatus.FAILED) {
      throw new BadRequestException(`Cannot cancel completed Pipeline Run '${runId}'`);
    }

    const updatedRun = await this.runsRepository.update(run.id, {
      status: PipelineRunStatus.CANCELLED,
      finishedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.run_failed.v1',
      aggregateId: updatedRun.id,
      aggregateType: 'PipelineRun',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineRunId: updatedRun.id,
        status: updatedRun.status,
        reason: 'Cancelled by user',
        cancelledByUserId: userId,
      },
    });

    return updatedRun;
  }
}
