import { Test, TestingModule } from '@nestjs/testing';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsRepository } from './artifacts.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { ArtifactRetentionPolicy, ArtifactStatus } from '@prisma/client';

describe('ArtifactsService', () => {
  let service: ArtifactsService;

  const mockArtifactsRepository = {
    create: jest.fn(),
    findByPipelineRun: jest.fn(),
    findOneById: jest.fn(),
    update: jest.fn(),
  };

  const mockPrisma = {
    pipelineRun: {
      findFirst: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('mock-correlation-id'),
  };

  const mockArtifact = {
    id: 'art_123',
    pipelineRunId: 'run_123',
    name: 'opspilot-api',
    version: 'v1.4.2',
    checksum: 'sha256:abc123',
    storageLocation: 's3://bucket/artifact.tar.gz',
    sizeBytes: BigInt(52428800),
    status: ArtifactStatus.AVAILABLE,
    retentionPolicy: ArtifactRetentionPolicy.KEEP_30_DAYS,
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        { provide: ArtifactsRepository, useValue: mockArtifactsRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
      ],
    }).compile();

    service = module.get<ArtifactsService>(ArtifactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register()', () => {
    it('should throw NotFoundException when pipeline run not found', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue(null);

      await expect(
        service.register('nonexistent_run', {
          name: 'test',
          version: 'v1.0.0',
          checksum: 'sha256:abc',
          storageLocation: 's3://bucket/artifact.tar.gz',
        }),
      ).rejects.toThrow("Pipeline Run 'nonexistent_run' not found");
    });

    it('should register artifact and publish event when pipeline run exists', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({ id: 'run_123' });
      mockArtifactsRepository.create.mockResolvedValue(mockArtifact);
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.register('run_123', {
        name: 'opspilot-api',
        version: 'v1.4.2',
        checksum: 'sha256:abc123',
        storageLocation: 's3://bucket/artifact.tar.gz',
        retentionPolicy: ArtifactRetentionPolicy.KEEP_30_DAYS,
      });

      expect(result).toEqual(mockArtifact);
      expect(mockArtifactsRepository.create).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'artifact.registered.v1' }),
      );
    });
  });

  describe('computeExpiry via retentionPolicy', () => {
    it('should return null expiry for KEEP_FOREVER policy', async () => {
      mockPrisma.pipelineRun.findFirst.mockResolvedValue({ id: 'run_123' });
      mockArtifactsRepository.create.mockImplementation(async (data) => ({
        ...mockArtifact,
        expiresAt: data.expiresAt ?? null,
        retentionPolicy: data.retentionPolicy,
      }));
      mockEventBus.publish.mockResolvedValue(undefined);

      const result = await service.register('run_123', {
        name: 'opspilot-api',
        version: 'v1.0.0',
        checksum: 'sha256:abc',
        storageLocation: 's3://bucket/artifact.tar.gz',
        retentionPolicy: ArtifactRetentionPolicy.KEEP_FOREVER,
      });

      expect(result.expiresAt).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should throw NotFoundException when artifact not found', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue(null);

      await expect(service.delete('nonexistent_artifact', 'usr_123')).rejects.toThrow(
        "Artifact 'nonexistent_artifact' not found",
      );
    });
  });
});
