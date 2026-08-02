import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EnvironmentsRepository } from './environments.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Environment, EnvironmentType } from '@prisma/client';
import { slugify, validateSlug } from '@shared/utils/slug.util';

const PROTECTED_DEFAULT_SLUGS = new Set(['development', 'staging', 'production']);

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly environmentsRepository: EnvironmentsRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async create(projectId: string, userId: string, dto: CreateEnvironmentDto): Promise<Environment> {
    const rawSlug = dto.slug || dto.name;
    const targetSlug = slugify(rawSlug);

    validateSlug(targetSlug);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    const existingSlug = await this.environmentsRepository.findByProjectAndSlug(
      projectId,
      targetSlug,
    );

    if (existingSlug) {
      throw new ConflictException(
        `Environment with slug '${targetSlug}' already exists in this Project`,
      );
    }

    const environment = await this.environmentsRepository.create({
      project: { connect: { id: projectId } },
      name: dto.name,
      slug: targetSlug,
      type: dto.type || EnvironmentType.DEVELOPMENT,
      requiresApproval: dto.requiresApproval ?? false,
      minApprovers: dto.minApprovers ?? 1,
      allowedRoles: dto.allowedRoles,
      deploymentWindow: dto.deploymentWindow,
      autoRollbackEnabled: dto.autoRollbackEnabled ?? true,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'environment.created.v1',
      aggregateId: environment.id,
      aggregateType: 'Environment',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        environmentId: environment.id,
        projectId: environment.projectId,
        name: environment.name,
        slug: environment.slug,
        type: environment.type,
        createdByUserId: userId,
      },
    });

    return environment;
  }

  async findAll(projectId: string): Promise<Environment[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    return this.environmentsRepository.findProjectEnvironments(projectId);
  }

  async findByIdOrSlug(projectId: string, idOrSlug: string): Promise<Environment> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const environment = isUuid
      ? await this.environmentsRepository.findById(idOrSlug)
      : await this.environmentsRepository.findByProjectAndSlug(projectId, idOrSlug);

    if (!environment || environment.projectId !== projectId) {
      throw new NotFoundException(`Environment '${idOrSlug}' not found in target Project`);
    }

    return environment;
  }

  async update(
    projectId: string,
    userId: string,
    idOrSlug: string,
    dto: UpdateEnvironmentDto,
  ): Promise<Environment> {
    const environment = await this.findByIdOrSlug(projectId, idOrSlug);

    if (dto.slug && dto.slug !== environment.slug) {
      const targetSlug = slugify(dto.slug);
      validateSlug(targetSlug);

      const existingSlug = await this.environmentsRepository.findByProjectAndSlug(
        projectId,
        targetSlug,
      );

      if (existingSlug && existingSlug.id !== environment.id) {
        throw new ConflictException(
          `Environment with slug '${targetSlug}' already exists in this Project`,
        );
      }
      dto.slug = targetSlug;
    }

    const isProtectionUpdate =
      dto.requiresApproval !== undefined ||
      dto.minApprovers !== undefined ||
      dto.allowedRoles !== undefined ||
      dto.deploymentWindow !== undefined ||
      dto.autoRollbackEnabled !== undefined;

    const updatedEnvironment = await this.environmentsRepository.update(environment.id, dto);

    const eventName = isProtectionUpdate
      ? 'environment.protection_updated.v1'
      : 'environment.updated.v1';

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName,
      aggregateId: updatedEnvironment.id,
      aggregateType: 'Environment',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        environmentId: updatedEnvironment.id,
        projectId: updatedEnvironment.projectId,
        name: updatedEnvironment.name,
        slug: updatedEnvironment.slug,
        requiresApproval: updatedEnvironment.requiresApproval,
        updatedByUserId: userId,
      },
    });

    return updatedEnvironment;
  }

  async softDelete(projectId: string, userId: string, idOrSlug: string): Promise<Environment> {
    const environment = await this.findByIdOrSlug(projectId, idOrSlug);

    if (PROTECTED_DEFAULT_SLUGS.has(environment.slug.toLowerCase())) {
      throw new BadRequestException(
        `Default core environment '${environment.slug}' cannot be deleted`,
      );
    }

    const deletedEnvironment = await this.environmentsRepository.softDelete(environment.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'environment.deleted.v1',
      aggregateId: deletedEnvironment.id,
      aggregateType: 'Environment',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        environmentId: deletedEnvironment.id,
        projectId: deletedEnvironment.projectId,
        deletedByUserId: userId,
      },
    });

    return deletedEnvironment;
  }
}
