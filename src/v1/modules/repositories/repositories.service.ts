import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { RepositoriesRepository } from './repositories.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { IRepositoryProvider } from './interfaces/repository-provider.interface';
import { CreateRepositoryConnectionDto } from './dto/create-repository-connection.dto';
import { UpdateRepositoryConnectionDto } from './dto/update-repository-connection.dto';
import { RepositoryConnection, RepositoryProvider } from '@prisma/client';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly repositoriesRepository: RepositoriesRepository,
    private readonly prisma: PrismaService,
    @Inject('IRepositoryProvider')
    private readonly repositoryProvider: IRepositoryProvider,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async create(
    projectId: string,
    userId: string,
    dto: CreateRepositoryConnectionDto,
  ): Promise<RepositoryConnection> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    const existingRepo = await this.repositoriesRepository.findByProjectAndUrl(
      projectId,
      dto.repositoryUrl,
    );

    if (existingRepo) {
      throw new ConflictException(
        `Repository URL '${dto.repositoryUrl}' is already connected to this Project`,
      );
    }

    const isValid = await this.repositoryProvider.validateConnection({
      repositoryUrl: dto.repositoryUrl,
    });

    if (!isValid) {
      throw new BadRequestException(
        `Failed to validate Repository URL '${dto.repositoryUrl}' for provider ${dto.provider}`,
      );
    }

    const webhookResult = await this.repositoryProvider.createWebhook(
      { repositoryUrl: dto.repositoryUrl },
      `https://api.opspilot.ai/v1/webhooks/${dto.provider.toLowerCase()}`,
    );

    const defaultBranch =
      dto.defaultBranch ||
      (await this.repositoryProvider.getDefaultBranch({
        repositoryUrl: dto.repositoryUrl,
      }));

    const repoConnection = await this.repositoriesRepository.create({
      project: { connect: { id: projectId } },
      provider: dto.provider || RepositoryProvider.GITHUB,
      repositoryUrl: dto.repositoryUrl,
      defaultBranch,
      authSecretId: dto.authSecretId,
      webhookId: webhookResult.webhookId,
      webhookSecret: webhookResult.webhookSecret,
      isVerified: true,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'repository.connected.v1',
      aggregateId: repoConnection.id,
      aggregateType: 'RepositoryConnection',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        repositoryConnectionId: repoConnection.id,
        projectId: repoConnection.projectId,
        provider: repoConnection.provider,
        repositoryUrl: repoConnection.repositoryUrl,
        defaultBranch: repoConnection.defaultBranch,
        connectedByUserId: userId,
      },
    });

    return repoConnection;
  }

  async findAll(projectId: string): Promise<RepositoryConnection[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException(`Project '${projectId}' not found`);
    }

    return this.repositoriesRepository.findProjectRepositories(projectId);
  }

  async findById(projectId: string, repositoryConnectionId: string): Promise<RepositoryConnection> {
    const repo = await this.repositoriesRepository.findById(repositoryConnectionId);

    if (!repo || repo.projectId !== projectId) {
      throw new NotFoundException(
        `Repository connection '${repositoryConnectionId}' not found in target Project`,
      );
    }

    return repo;
  }

  async update(
    projectId: string,
    userId: string,
    repositoryConnectionId: string,
    dto: UpdateRepositoryConnectionDto,
  ): Promise<RepositoryConnection> {
    const repo = await this.findById(projectId, repositoryConnectionId);

    const updatedRepo = await this.repositoriesRepository.update(repo.id, dto);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'repository.updated.v1',
      aggregateId: updatedRepo.id,
      aggregateType: 'RepositoryConnection',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        repositoryConnectionId: updatedRepo.id,
        projectId: updatedRepo.projectId,
        defaultBranch: updatedRepo.defaultBranch,
        updatedByUserId: userId,
      },
    });

    return updatedRepo;
  }

  async softDelete(
    projectId: string,
    userId: string,
    repositoryConnectionId: string,
  ): Promise<RepositoryConnection> {
    const repo = await this.findById(projectId, repositoryConnectionId);

    if (repo.webhookId) {
      await this.repositoryProvider.deleteWebhook(
        { repositoryUrl: repo.repositoryUrl },
        repo.webhookId,
      );
    }

    const deletedRepo = await this.repositoriesRepository.softDelete(repo.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'repository.disconnected.v1',
      aggregateId: deletedRepo.id,
      aggregateType: 'RepositoryConnection',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        repositoryConnectionId: deletedRepo.id,
        projectId: deletedRepo.projectId,
        repositoryUrl: deletedRepo.repositoryUrl,
        disconnectedByUserId: userId,
      },
    });

    return deletedRepo;
  }
}
