import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { SecretsRepository } from './secrets.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { ISecretEncryptionProvider } from '../../../core/security/secret-encryption-provider.interface';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { SecretResponseDto } from './dto/secret-response.dto';
import { RevealSecretResponseDto } from './dto/reveal-secret-response.dto';
import { Secret } from '@prisma/client';

@Injectable()
export class SecretsService {
  constructor(
    private readonly secretsRepository: SecretsRepository,
    private readonly prisma: PrismaService,
    @Inject('ISecretEncryptionProvider')
    private readonly encryptionProvider: ISecretEncryptionProvider,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async create(
    environmentId: string,
    userId: string,
    dto: CreateSecretDto,
  ): Promise<SecretResponseDto> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    const existingKey = await this.secretsRepository.findByEnvironmentAndKey(
      environmentId,
      dto.key,
    );

    if (existingKey) {
      throw new ConflictException(
        `Secret with key '${dto.key}' already exists in this Environment`,
      );
    }

    const encrypted = await this.encryptionProvider.encrypt(dto.value);

    const secret = await this.secretsRepository.create({
      environment: { connect: { id: environmentId } },
      key: dto.key,
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      algorithm: encrypted.algorithm,
      keyVersion: encrypted.keyVersion,
      lastRotatedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'secret.created.v1',
      aggregateId: secret.id,
      aggregateType: 'Secret',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        secretId: secret.id,
        environmentId: secret.environmentId,
        key: secret.key,
        keyVersion: secret.keyVersion,
        createdByUserId: userId,
      },
    });

    return this.mapToMaskedResponse(secret);
  }

  async findAll(environmentId: string): Promise<SecretResponseDto[]> {
    const environment = await this.prisma.environment.findFirst({
      where: { id: environmentId, deletedAt: null },
    });

    if (!environment) {
      throw new NotFoundException(`Environment '${environmentId}' not found`);
    }

    const secrets = await this.secretsRepository.findEnvironmentSecrets(environmentId);
    return secrets.map((s) => this.mapToMaskedResponse(s));
  }

  async findByIdMasked(environmentId: string, secretId: string): Promise<SecretResponseDto> {
    const secret = await this.getSecretEntity(environmentId, secretId);
    return this.mapToMaskedResponse(secret);
  }

  async revealSecret(
    environmentId: string,
    userId: string,
    secretId: string,
  ): Promise<RevealSecretResponseDto> {
    const secret = await this.getSecretEntity(environmentId, secretId);

    const plainText = await this.encryptionProvider.decrypt({
      encryptedValue: secret.encryptedValue,
      iv: secret.iv,
      authTag: secret.authTag,
      keyVersion: secret.keyVersion,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'secret.accessed.v1',
      aggregateId: secret.id,
      aggregateType: 'Secret',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        secretId: secret.id,
        environmentId: secret.environmentId,
        key: secret.key,
        accessedByUserId: userId,
        ipAddress: this.contextService.getStore()?.ipAddress,
      },
    });

    return {
      id: secret.id,
      key: secret.key,
      value: plainText,
      keyVersion: secret.keyVersion,
    };
  }

  async update(
    environmentId: string,
    userId: string,
    secretId: string,
    dto: UpdateSecretDto,
  ): Promise<SecretResponseDto> {
    const secret = await this.getSecretEntity(environmentId, secretId);

    const encrypted = await this.encryptionProvider.encrypt(dto.value);

    const updatedSecret = await this.secretsRepository.update(secret.id, {
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      algorithm: encrypted.algorithm,
      keyVersion: encrypted.keyVersion,
      lastRotatedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'secret.updated.v1',
      aggregateId: updatedSecret.id,
      aggregateType: 'Secret',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        secretId: updatedSecret.id,
        environmentId: updatedSecret.environmentId,
        key: updatedSecret.key,
        updatedByUserId: userId,
      },
    });

    return this.mapToMaskedResponse(updatedSecret);
  }

  async rotateSecret(
    environmentId: string,
    userId: string,
    secretId: string,
  ): Promise<SecretResponseDto> {
    const secret = await this.getSecretEntity(environmentId, secretId);
    const currentVersion = this.encryptionProvider.getCurrentKeyVersion();

    const rotated = await this.encryptionProvider.rotateKey(
      {
        encryptedValue: secret.encryptedValue,
        iv: secret.iv,
        authTag: secret.authTag,
        keyVersion: secret.keyVersion,
      },
      currentVersion,
    );

    const updatedSecret = await this.secretsRepository.update(secret.id, {
      encryptedValue: rotated.encryptedValue,
      iv: rotated.iv,
      authTag: rotated.authTag,
      keyVersion: rotated.keyVersion,
      lastRotatedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'secret.rotated.v1',
      aggregateId: updatedSecret.id,
      aggregateType: 'Secret',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        secretId: updatedSecret.id,
        environmentId: updatedSecret.environmentId,
        key: updatedSecret.key,
        newKeyVersion: updatedSecret.keyVersion,
        rotatedByUserId: userId,
      },
    });

    return this.mapToMaskedResponse(updatedSecret);
  }

  async softDelete(
    environmentId: string,
    userId: string,
    secretId: string,
  ): Promise<SecretResponseDto> {
    const secret = await this.getSecretEntity(environmentId, secretId);

    const deletedSecret = await this.secretsRepository.softDelete(secret.id);

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'secret.deleted.v1',
      aggregateId: deletedSecret.id,
      aggregateType: 'Secret',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        secretId: deletedSecret.id,
        environmentId: deletedSecret.environmentId,
        key: deletedSecret.key,
        deletedByUserId: userId,
      },
    });

    return this.mapToMaskedResponse(deletedSecret);
  }

  async findAllByOrganization(organizationId: string): Promise<SecretResponseDto[]> {
    const secrets = await this.secretsRepository.findByOrganization(organizationId);
    return secrets.map((s) => this.mapToMaskedResponse(s));
  }

  async deleteDirect(userId: string, secretId: string): Promise<SecretResponseDto> {
    const secret = await this.secretsRepository.findById(secretId);
    if (!secret) {
      throw new NotFoundException(`Secret '${secretId}' not found`);
    }
    return this.softDelete(secret.environmentId, userId, secretId);
  }

  private async getSecretEntity(environmentId: string, secretId: string): Promise<Secret> {
    const secret = await this.secretsRepository.findById(secretId);

    if (!secret || secret.environmentId !== environmentId) {
      throw new NotFoundException(`Secret '${secretId}' not found in target Environment`);
    }

    return secret;
  }

  private mapToMaskedResponse(secret: Secret): SecretResponseDto {
    return {
      id: secret.id,
      environmentId: secret.environmentId,
      key: secret.key,
      isConfigured: true,
      keyVersion: secret.keyVersion,
      algorithm: secret.algorithm,
      lastRotatedAt: secret.lastRotatedAt,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };
  }
}
