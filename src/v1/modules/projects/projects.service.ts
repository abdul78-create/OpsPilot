import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ProjectsRepository } from './projects.repository';
import { TransactionManager } from '../../../core/database/transaction.manager';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, EnvironmentType, ProjectStatus } from '@prisma/client';
import { slugify, validateSlug } from '@shared/utils/slug.util';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly transactionManager: TransactionManager,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    const rawSlug = dto.slug || dto.name;
    const targetSlug = slugify(rawSlug);

    validateSlug(targetSlug);

    const existingSlug = await this.projectsRepository.findByOrganizationAndSlug(
      organizationId,
      targetSlug,
    );

    if (existingSlug) {
      throw new ConflictException(
        `Project with slug '${targetSlug}' already exists in this Organization`,
      );
    }

    // Atomic Transaction: Create Project AND 3 Default Environments
    const project = await this.transactionManager.execute(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          organizationId,
          name: dto.name,
          slug: targetSlug,
          description: dto.description,
          status: ProjectStatus.ACTIVE,
        },
      });

      await tx.environment.createMany({
        data: [
          {
            projectId: createdProject.id,
            name: 'Development',
            slug: 'development',
            type: EnvironmentType.DEVELOPMENT,
            requiresApproval: false,
          },
          {
            projectId: createdProject.id,
            name: 'Staging',
            slug: 'staging',
            type: EnvironmentType.STAGING,
            requiresApproval: false,
          },
          {
            projectId: createdProject.id,
            name: 'Production',
            slug: 'production',
            type: EnvironmentType.PRODUCTION,
            requiresApproval: true,
          },
        ],
      });

      return createdProject;
    });

    // Publish Versioned Domain Event ONLY AFTER transaction completes
    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'project.created.v1',
      aggregateId: project.id,
      aggregateType: 'Project',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        projectId: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        createdByUserId: userId,
      },
    });

    return project;
  }

  async findAll(organizationId: string): Promise<Project[]> {
    return this.projectsRepository.findOrganizationProjects(organizationId);
  }

  async findByIdOrSlug(organizationId: string, idOrSlug: string): Promise<Project> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const project = isUuid
      ? await this.projectsRepository.findById(idOrSlug)
      : await this.projectsRepository.findByOrganizationAndSlug(organizationId, idOrSlug);

    if (!project || project.organizationId !== organizationId) {
      throw new NotFoundException(`Project '${idOrSlug}' not found in target Organization`);
    }

    return project;
  }

  async update(
    organizationId: string,
    userId: string,
    idOrSlug: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findByIdOrSlug(organizationId, idOrSlug);

    if (dto.slug && dto.slug !== project.slug) {
      const targetSlug = slugify(dto.slug);
      validateSlug(targetSlug);

      const existingSlug = await this.projectsRepository.findByOrganizationAndSlug(
        organizationId,
        targetSlug,
      );

      if (existingSlug && existingSlug.id !== project.id) {
        throw new ConflictException(
          `Project with slug '${targetSlug}' already exists in this Organization`,
        );
      }
      dto.slug = targetSlug;
    }

    const updatedProject = await this.projectsRepository.update(project.id, dto);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'project.updated.v1',
      aggregateId: updatedProject.id,
      aggregateType: 'Project',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        projectId: updatedProject.id,
        organizationId: updatedProject.organizationId,
        name: updatedProject.name,
        slug: updatedProject.slug,
        updatedByUserId: userId,
      },
    });

    return updatedProject;
  }

  async softDelete(organizationId: string, userId: string, idOrSlug: string): Promise<Project> {
    const project = await this.findByIdOrSlug(organizationId, idOrSlug);

    const deletedProject = await this.projectsRepository.softDelete(project.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'project.deleted.v1',
      aggregateId: deletedProject.id,
      aggregateType: 'Project',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        projectId: deletedProject.id,
        organizationId: deletedProject.organizationId,
        deletedByUserId: userId,
      },
    });

    return deletedProject;
  }
}
