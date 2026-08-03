import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ArtifactsRepository } from './artifacts.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RegisterArtifactDto } from './dto/register-artifact.dto';
import { Artifact, ArtifactRetentionPolicy, ArtifactStatus } from '@prisma/client';

@Injectable()
export class ArtifactsService {
  constructor(
    private readonly artifactsRepository: ArtifactsRepository,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
  ) {}

  async register(pipelineRunId: string, dto: RegisterArtifactDto): Promise<Artifact> {
    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, deletedAt: null },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${pipelineRunId}' not found`);
    }

    const retentionPolicy = dto.retentionPolicy ?? ArtifactRetentionPolicy.KEEP_30_DAYS;
    const expiresAt = this.computeExpiry(retentionPolicy);

    const artifact = await this.artifactsRepository.create({
      pipelineRun: { connect: { id: pipelineRunId } },
      name: dto.name,
      version: dto.version,
      checksum: dto.checksum,
      storageLocation: dto.storageLocation,
      sizeBytes: dto.sizeBytes ?? 0,
      status: ArtifactStatus.AVAILABLE,
      retentionPolicy,
      expiresAt,
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'artifact.registered.v1',
      aggregateId: artifact.id,
      aggregateType: 'Artifact',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        artifactId: artifact.id,
        pipelineRunId,
        name: artifact.name,
        version: artifact.version,
        checksum: artifact.checksum,
        storageLocation: artifact.storageLocation,
        retentionPolicy: artifact.retentionPolicy,
      },
    });

    return artifact;
  }

  async findByPipelineRun(pipelineRunId: string): Promise<Artifact[]> {
    const run = await this.prisma.pipelineRun.findFirst({
      where: { id: pipelineRunId, deletedAt: null },
    });

    if (!run) {
      throw new NotFoundException(`Pipeline Run '${pipelineRunId}' not found`);
    }

    return this.artifactsRepository.findByPipelineRun(pipelineRunId);
  }

  async findById(artifactId: string): Promise<Artifact> {
    const artifact = await this.artifactsRepository.findOneById(artifactId);

    if (!artifact) {
      throw new NotFoundException(`Artifact '${artifactId}' not found`);
    }

    return artifact;
  }

  async delete(artifactId: string, userId: string): Promise<Artifact> {
    const artifact = await this.findById(artifactId);

    const deleted = await this.artifactsRepository.update(artifact.id, {
      status: ArtifactStatus.DELETED,
      deletedAt: new Date(),
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'artifact.deleted.v1',
      aggregateId: deleted.id,
      aggregateType: 'Artifact',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        artifactId: deleted.id,
        pipelineRunId: deleted.pipelineRunId,
        deletedByUserId: userId,
      },
    });

    return deleted;
  }

  async getDownloadStream(
    artifactId: string,
  ): Promise<{ stream: fs.ReadStream; filename: string; contentType: string; sizeBytes: number }> {
    const artifact = await this.findById(artifactId);

    if (artifact.status !== ArtifactStatus.AVAILABLE) {
      throw new NotFoundException(
        `Artifact '${artifactId}' is no longer available (status: ${artifact.status})`,
      );
    }

    if (!fs.existsSync(artifact.storageLocation)) {
      throw new NotFoundException(
        `Artifact file not found at storage location '${artifact.storageLocation}'`,
      );
    }

    const filename = path.basename(artifact.storageLocation);
    const stats = fs.statSync(artifact.storageLocation);
    const stream = fs.createReadStream(artifact.storageLocation);

    return {
      stream,
      filename,
      contentType:
        filename.endsWith('.tar.gz') || filename.endsWith('.tgz')
          ? 'application/gzip'
          : 'application/octet-stream',
      sizeBytes: stats.size,
    };
  }

  private computeExpiry(policy: ArtifactRetentionPolicy): Date | null {
    const now = new Date();
    switch (policy) {
      case ArtifactRetentionPolicy.KEEP_30_DAYS:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case ArtifactRetentionPolicy.KEEP_90_DAYS:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case ArtifactRetentionPolicy.KEEP_FOREVER:
      case ArtifactRetentionPolicy.KEEP_LATEST_N:
        return null;
    }
  }
}
