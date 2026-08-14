import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PipelinesRepository } from './pipelines.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { YamlValidatorUtil } from './utils/yaml-validator.util';
import { CreatePipelineDefinitionDto } from './dto/create-pipeline-definition.dto';
import { UpdatePipelineDefinitionDto } from './dto/update-pipeline-definition.dto';
import { CreatePipelineFromRepoDto } from './dto/create-pipeline-from-repo.dto';
import { WorkflowCompilerService } from './workflow-compiler.service';
import { parseGitHubUrl } from '../repositories/providers/github-repository.provider';
import { PipelineDefinition, PipelineVersion, TriggerType } from '@prisma/client';
import { slugify, validateSlug } from '@shared/utils/slug.util';

@Injectable()
export class PipelinesService {
  constructor(
    private readonly pipelinesRepository: PipelinesRepository,
    private readonly prisma: PrismaService,
    private readonly txManager: TransactionManager,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
    private readonly workflowCompiler: WorkflowCompilerService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreatePipelineDefinitionDto,
  ): Promise<PipelineDefinition & { versions?: PipelineVersion[] }> {
    const rawSlug = dto.slug || dto.name;
    const targetSlug = slugify(rawSlug);

    validateSlug(targetSlug);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    const existingSlug = await this.pipelinesRepository.findByProjectAndSlug(projectId, targetSlug);

    if (existingSlug) {
      throw new ConflictException(
        `Pipeline with slug '${targetSlug}' already exists in this Project`,
      );
    }

    const yamlResult = YamlValidatorUtil.validateAndCanonicalize(dto.yamlConfig);

    const result = await this.txManager.execute(async (tx) => {
      const pipeline = await tx.pipelineDefinition.create({
        data: {
          project: { connect: { id: projectId } },
          name: dto.name,
          slug: targetSlug,
          description: dto.description,
          triggerType: dto.triggerType || TriggerType.GIT_PUSH,
          triggerBranch: dto.triggerBranch || 'main',
          currentVersionNumber: 1,
        },
      });

      const version = await tx.pipelineVersion.create({
        data: {
          pipelineDefinition: { connect: { id: pipeline.id } },
          versionNumber: 1,
          yamlConfig: dto.yamlConfig,
          checksum: yamlResult.checksum,
          changeSummary: dto.changeSummary || 'Initial pipeline definition',
          createdByUserId: userId,
        },
      });

      return { ...pipeline, versions: [version] };
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.definition_created.v1',
      aggregateId: result.id,
      aggregateType: 'PipelineDefinition',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineDefinitionId: result.id,
        projectId: result.projectId,
        name: result.name,
        slug: result.slug,
        triggerType: result.triggerType,
        createdByUserId: userId,
      },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.version_created.v1',
      aggregateId: result.versions[0].id,
      aggregateType: 'PipelineVersion',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineVersionId: result.versions[0].id,
        pipelineDefinitionId: result.id,
        versionNumber: 1,
        checksum: result.versions[0].checksum,
        createdByUserId: userId,
      },
    });

    return result;
  }

  async createFromRepository(
    projectId: string,
    userId: string,
    dto: CreatePipelineFromRepoDto,
  ): Promise<PipelineDefinition & { versions?: PipelineVersion[] }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    const repoConnection = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: dto.repositoryConnectionId,
        projectId,
        deletedAt: null,
      },
    });

    if (!repoConnection) {
      throw new NotFoundException(
        `RepositoryConnection '${dto.repositoryConnectionId}' not found or does not belong to Project '${projectId}'`,
      );
    }

    const parsed = parseGitHubUrl(repoConnection.repositoryUrl);
    const repoName = parsed?.repo || 'repository';
    const triggerBranch = dto.triggerBranch || repoConnection.defaultBranch || 'main';

    const rawYaml =
      dto.yamlConfig ||
      this.workflowCompiler.generateYamlSpecFromRepo(repoName, triggerBranch, 'node');

    const yamlResult = YamlValidatorUtil.validateAndCanonicalize(rawYaml);

    const pipelineName =
      dto.name || `${repoName.charAt(0).toUpperCase() + repoName.slice(1)} Pipeline`;
    const targetSlug = slugify(pipelineName);

    validateSlug(targetSlug);

    const existingSlug = await this.pipelinesRepository.findByProjectAndSlug(projectId, targetSlug);
    if (existingSlug) {
      throw new ConflictException(
        `Pipeline with slug '${targetSlug}' already exists in this Project`,
      );
    }

    const result = await this.txManager.execute(async (tx) => {
      const pipeline = await tx.pipelineDefinition.create({
        data: {
          project: { connect: { id: projectId } },
          name: pipelineName,
          slug: targetSlug,
          description: `Auto-generated pipeline from connected repository '${repoConnection.repositoryUrl}'`,
          triggerType: dto.triggerType || TriggerType.GIT_PUSH,
          triggerBranch,
          currentVersionNumber: 1,
        },
      });

      const version = await tx.pipelineVersion.create({
        data: {
          pipelineDefinition: { connect: { id: pipeline.id } },
          versionNumber: 1,
          yamlConfig: rawYaml,
          checksum: yamlResult.checksum,
          changeSummary: `Initial pipeline created from repository connection ${repoConnection.id}`,
          createdByUserId: userId,
        },
      });

      return { ...pipeline, versions: [version] };
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.definition_created.v1',
      aggregateId: result.id,
      aggregateType: 'PipelineDefinition',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineDefinitionId: result.id,
        projectId: result.projectId,
        name: result.name,
        slug: result.slug,
        triggerType: result.triggerType,
        createdByUserId: userId,
      },
    });

    return result;
  }

  async findAll(projectId: string): Promise<PipelineDefinition[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    return this.pipelinesRepository.findProjectPipelines(projectId);
  }

  async findByIdOrSlug(
    projectId: string,
    idOrSlug: string,
  ): Promise<PipelineDefinition & { versions?: PipelineVersion[] }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const pipeline = isUuid
      ? await this.prisma.pipelineDefinition.findFirst({
          where: { id: idOrSlug, projectId, deletedAt: null },
          include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
        })
      : await this.pipelinesRepository.findByProjectAndSlug(projectId, idOrSlug);

    if (!pipeline || pipeline.projectId !== projectId) {
      throw new NotFoundException(`Pipeline '${idOrSlug}' not found in target Project`);
    }

    return pipeline;
  }

  async findVersions(projectId: string, idOrSlug: string): Promise<PipelineVersion[]> {
    const pipeline = await this.findByIdOrSlug(projectId, idOrSlug);
    return this.pipelinesRepository.findVersions(pipeline.id);
  }

  async findVersionByNumber(
    projectId: string,
    idOrSlug: string,
    versionNumber: number,
  ): Promise<PipelineVersion> {
    const pipeline = await this.findByIdOrSlug(projectId, idOrSlug);
    const version = await this.pipelinesRepository.findVersionByNumber(pipeline.id, versionNumber);

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found for Pipeline '${idOrSlug}'`);
    }

    return version;
  }

  async update(
    projectId: string,
    userId: string,
    idOrSlug: string,
    dto: UpdatePipelineDefinitionDto,
  ): Promise<PipelineDefinition & { versions?: PipelineVersion[] }> {
    const pipeline = await this.findByIdOrSlug(projectId, idOrSlug);

    let nextVersionNumber = pipeline.currentVersionNumber;
    let newVersion: PipelineVersion | null = null;

    if (dto.yamlConfig) {
      const yamlResult = YamlValidatorUtil.validateAndCanonicalize(dto.yamlConfig);
      nextVersionNumber = pipeline.currentVersionNumber + 1;

      newVersion = await this.pipelinesRepository.createVersion({
        pipelineDefinition: { connect: { id: pipeline.id } },
        versionNumber: nextVersionNumber,
        yamlConfig: dto.yamlConfig,
        checksum: yamlResult.checksum,
        changeSummary: dto.changeSummary || `Updated to version ${nextVersionNumber}`,
        createdByUserId: userId,
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'pipeline.version_created.v1',
        aggregateId: newVersion.id,
        aggregateType: 'PipelineVersion',
        occurredOn: new Date(),
        version: 1,
        correlationId: this.contextService.getCorrelationId(),
        payload: {
          pipelineVersionId: newVersion.id,
          pipelineDefinitionId: pipeline.id,
          versionNumber: nextVersionNumber,
          checksum: newVersion.checksum,
          createdByUserId: userId,
        },
      });
    }

    const updatedPipeline = await this.pipelinesRepository.update(pipeline.id, {
      name: dto.name,
      description: dto.description,
      triggerType: dto.triggerType,
      triggerBranch: dto.triggerBranch,
      currentVersionNumber: nextVersionNumber,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.definition_updated.v1',
      aggregateId: updatedPipeline.id,
      aggregateType: 'PipelineDefinition',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineDefinitionId: updatedPipeline.id,
        projectId: updatedPipeline.projectId,
        name: updatedPipeline.name,
        currentVersionNumber: updatedPipeline.currentVersionNumber,
        updatedByUserId: userId,
      },
    });

    return {
      ...updatedPipeline,
      versions: newVersion ? [newVersion] : pipeline.versions,
    };
  }

  async softDelete(
    projectId: string,
    userId: string,
    idOrSlug: string,
  ): Promise<PipelineDefinition> {
    const pipeline = await this.findByIdOrSlug(projectId, idOrSlug);

    const deletedPipeline = await this.pipelinesRepository.softDelete(pipeline.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'pipeline.definition_deleted.v1',
      aggregateId: deletedPipeline.id,
      aggregateType: 'PipelineDefinition',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        pipelineDefinitionId: deletedPipeline.id,
        projectId: deletedPipeline.projectId,
        deletedByUserId: userId,
      },
    });

    return deletedPipeline;
  }
}
