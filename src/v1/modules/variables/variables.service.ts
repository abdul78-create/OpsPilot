import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { VariablesRepository } from './variables.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { CreateVariableDto } from './dto/create-variable.dto';
import { UpdateVariableDto } from './dto/update-variable.dto';
import { EnvironmentVariable, VariableType, VariableScope, VariableSource } from '@prisma/client';

@Injectable()
export class VariablesService {
  constructor(
    private readonly variablesRepository: VariablesRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async create(
    environmentId: string,
    userId: string,
    dto: CreateVariableDto,
  ): Promise<EnvironmentVariable> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    const existingKey = await this.variablesRepository.findByEnvironmentAndKey(
      environmentId,
      dto.key,
    );

    if (existingKey) {
      throw new ConflictException(
        `Variable with key '${dto.key}' already exists in this Environment`,
      );
    }

    const targetType = dto.type || VariableType.STRING;
    this.validateValueTypeAndRegex(dto.value, targetType, dto.validationRegex);

    const variable = await this.variablesRepository.create({
      environment: { connect: { id: environmentId } },
      key: dto.key,
      value: dto.value,
      type: targetType,
      scope: dto.scope || VariableScope.ENVIRONMENT,
      source: dto.source || VariableSource.MANUAL,
      isRequired: dto.isRequired ?? false,
      validationRegex: dto.validationRegex,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'variable.created.v1',
      aggregateId: variable.id,
      aggregateType: 'EnvironmentVariable',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        variableId: variable.id,
        environmentId: variable.environmentId,
        key: variable.key,
        type: variable.type,
        createdByUserId: userId,
      },
    });

    return variable;
  }

  async findAll(environmentId: string): Promise<EnvironmentVariable[]> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    return this.variablesRepository.findEnvironmentVariables(environmentId);
  }

  async findById(environmentId: string, variableId: string): Promise<EnvironmentVariable> {
    const variable = await this.variablesRepository.findById(variableId);

    if (!variable || variable.environmentId !== environmentId) {
      throw new NotFoundException(`Variable '${variableId}' not found in target Environment`);
    }

    return variable;
  }

  async update(
    environmentId: string,
    userId: string,
    variableId: string,
    dto: UpdateVariableDto,
  ): Promise<EnvironmentVariable> {
    const variable = await this.findById(environmentId, variableId);

    if (dto.key && dto.key !== variable.key) {
      const existingKey = await this.variablesRepository.findByEnvironmentAndKey(
        environmentId,
        dto.key,
      );

      if (existingKey && existingKey.id !== variable.id) {
        throw new ConflictException(
          `Variable with key '${dto.key}' already exists in this Environment`,
        );
      }
    }

    const targetType = dto.type || variable.type;
    const targetValue = dto.value !== undefined ? dto.value : variable.value;
    const targetRegex =
      dto.validationRegex !== undefined
        ? dto.validationRegex
        : variable.validationRegex || undefined;

    this.validateValueTypeAndRegex(targetValue, targetType, targetRegex);

    const updatedVariable = await this.variablesRepository.update(variable.id, dto);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'variable.updated.v1',
      aggregateId: updatedVariable.id,
      aggregateType: 'EnvironmentVariable',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        variableId: updatedVariable.id,
        environmentId: updatedVariable.environmentId,
        key: updatedVariable.key,
        updatedByUserId: userId,
      },
    });

    return updatedVariable;
  }

  async softDelete(
    environmentId: string,
    userId: string,
    variableId: string,
  ): Promise<EnvironmentVariable> {
    const variable = await this.findById(environmentId, variableId);

    const deletedVariable = await this.variablesRepository.softDelete(variable.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'variable.deleted.v1',
      aggregateId: deletedVariable.id,
      aggregateType: 'EnvironmentVariable',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        variableId: deletedVariable.id,
        environmentId: deletedVariable.environmentId,
        key: deletedVariable.key,
        deletedByUserId: userId,
      },
    });

    return deletedVariable;
  }

  private validateValueTypeAndRegex(
    value: string,
    type: VariableType,
    regexPattern?: string,
  ): void {
    if (type === VariableType.NUMBER && isNaN(Number(value))) {
      throw new BadRequestException(`Variable value '${value}' is not a valid number`);
    }

    if (
      type === VariableType.BOOLEAN &&
      !['true', 'false', '1', '0'].includes(value.toLowerCase())
    ) {
      throw new BadRequestException(`Variable value '${value}' is not a valid boolean`);
    }

    if (type === VariableType.JSON) {
      try {
        JSON.parse(value);
      } catch {
        throw new BadRequestException(`Variable value '${value}' is not valid JSON string`);
      }
    }

    if (regexPattern) {
      try {
        const regex = new RegExp(regexPattern);
        if (!regex.test(value)) {
          throw new BadRequestException(
            `Variable value '${value}' fails regex pattern '${regexPattern}'`,
          );
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        throw new BadRequestException(`Invalid regex pattern '${regexPattern}'`);
      }
    }
  }
}
