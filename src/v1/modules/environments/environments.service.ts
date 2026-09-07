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
import { Environment, EnvironmentType, EnvironmentConnectionStatus } from '@prisma/client';
import { slugify, validateSlug } from '@shared/utils/slug.util';

const PROTECTED_DEFAULT_SLUGS = new Set(['development', 'staging', 'production']);

export interface TestConnectionResult {
  connectionStatus: EnvironmentConnectionStatus;
  /** Safe human-readable message - NEVER contains credential values */
  message: string;
  testedAt: Date;
}

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

    // Determine initial connectionStatus based on whether target type is provided
    const initialConnectionStatus: EnvironmentConnectionStatus = dto.deploymentTargetType
      ? EnvironmentConnectionStatus.CONFIGURED
      : EnvironmentConnectionStatus.NOT_CONFIGURED;

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
      deploymentTargetType: dto.deploymentTargetType,
      clusterName: dto.clusterName,
      clusterRegion: dto.clusterRegion,
      k8sNamespace: dto.k8sNamespace,
      connectionStatus: initialConnectionStatus,
      credentialsConfigured: false,
    } as any);

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
        connectionStatus: initialConnectionStatus,
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

    // If the deployment target type changes, reset connectionStatus to CONFIGURED
    // (a new connection test must be run to re-establish CONNECTED status)
    const dtoAny = dto as any;
    const updatesTargetType =
      dtoAny.deploymentTargetType !== undefined &&
      dtoAny.deploymentTargetType !== (environment as any).deploymentTargetType;

    const updatesTargetConfig =
      dtoAny.clusterName !== undefined ||
      dtoAny.clusterRegion !== undefined ||
      dtoAny.k8sNamespace !== undefined;

    if (updatesTargetType || updatesTargetConfig) {
      const newTargetType =
        dtoAny.deploymentTargetType ?? (environment as any).deploymentTargetType;
      dtoAny.connectionStatus = newTargetType
        ? EnvironmentConnectionStatus.CONFIGURED
        : EnvironmentConnectionStatus.NOT_CONFIGURED;
      // Reset connection test result when target configuration changes
      dtoAny.lastConnectionTestedAt = null;
      dtoAny.lastConnectionError = null;
    }

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

  /**
   * Tests the deployment target connection for an environment.
   *
   * Rules:
   * - Reads ALL configuration from the database (never trusts request body for target details)
   * - NEVER exposes credential values in the result
   * - Updates connectionStatus + lastConnectionTestedAt + lastConnectionError in DB
   * - Result message is safe for display in the UI
   *
   * Current driver support:
   * - DOCKER:      UNSUPPORTED (OpsPilot runtime Docker only, external host not yet supported)
   * - KUBERNETES:  Checks credential presence; actual API ping deferred until K8S client added
   * - SERVERLESS:  UNSUPPORTED
   * - VIRTUAL_MACHINE: UNSUPPORTED
   * - STATIC:      UNSUPPORTED
   */
  async testConnection(projectId: string, environmentId: string): Promise<TestConnectionResult> {
    // Load environment from DB — do not trust any client-provided target info
    const environment = await this.findByIdOrSlug(projectId, environmentId);
    const envAny = environment as any;

    const targetType = envAny.deploymentTargetType as string | null;
    const testedAt = new Date();

    if (!targetType) {
      // No target configured — reject immediately
      const result: TestConnectionResult = {
        connectionStatus: EnvironmentConnectionStatus.NOT_CONFIGURED,
        message:
          'No deployment target type is configured for this environment. Select a target type in Environment Settings first.',
        testedAt,
      };
      await this.persistConnectionTestResult(environment.id, result);
      return result;
    }

    let result: TestConnectionResult;

    switch (targetType) {
      case 'KUBERNETES': {
        // Check if a credential secret exists for this environment
        const credentialSecret = await this.prisma.secret.findFirst({
          where: {
            environmentId: environment.id,
            key: '_k8s_credential',
            deletedAt: null,
          },
          select: { id: true }, // Only check presence — NEVER read the value
        });

        if (!credentialSecret) {
          result = {
            connectionStatus: EnvironmentConnectionStatus.CONNECTION_FAILED,
            message:
              'Kubernetes credentials are not configured for this environment. Add your cluster credentials using the Secrets vault before testing the connection.',
            testedAt,
          };
        } else if (!envAny.clusterName || !envAny.k8sNamespace) {
          result = {
            connectionStatus: EnvironmentConnectionStatus.CONNECTION_FAILED,
            message:
              'Cluster name and Kubernetes namespace are required. Update your environment configuration.',
            testedAt,
          };
        } else {
          // Credentials present + metadata complete → CONFIGURED
          // Real K8S API ping requires a Kubernetes client library (future work)
          result = {
            connectionStatus: EnvironmentConnectionStatus.CONFIGURED,
            message: `Kubernetes configuration is saved. Cluster: ${envAny.clusterName}, Namespace: ${envAny.k8sNamespace}. Live cluster connectivity verification requires provisioning the K8S integration (coming soon).`,
            testedAt,
          };
        }
        break;
      }

      case 'DOCKER':
        result = {
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
          message:
            "Docker deployments run on OpsPilot's internal runtime. External customer-managed Docker host connections are not yet supported.",
          testedAt,
        };
        break;

      case 'SERVERLESS':
        result = {
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
          message:
            'Serverless (Cloud Run / Lambda) integration is not yet available. Check back in a future release.',
          testedAt,
        };
        break;

      case 'VIRTUAL_MACHINE':
        result = {
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
          message:
            'Virtual Machine (SSH / agent-based) integration is not yet available. Check back in a future release.',
          testedAt,
        };
        break;

      case 'STATIC':
        result = {
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
          message:
            'Static hosting (S3 / CDN) integration is not yet available. Check back in a future release.',
          testedAt,
        };
        break;

      default:
        result = {
          connectionStatus: EnvironmentConnectionStatus.UNSUPPORTED,
          message: `Deployment target type '${targetType}' is not recognized.`,
          testedAt,
        };
    }

    await this.persistConnectionTestResult(environment.id, result);
    return result;
  }

  private async persistConnectionTestResult(
    environmentId: string,
    result: TestConnectionResult,
  ): Promise<void> {
    await this.prisma.environment.update({
      where: { id: environmentId },
      data: {
        connectionStatus: result.connectionStatus,
        lastConnectionTestedAt: result.testedAt,
        // Store only the safe message — never credential values
        lastConnectionError:
          result.connectionStatus === EnvironmentConnectionStatus.CONNECTION_FAILED ||
          result.connectionStatus === EnvironmentConnectionStatus.UNSUPPORTED
            ? result.message
            : null,
      },
    });
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
