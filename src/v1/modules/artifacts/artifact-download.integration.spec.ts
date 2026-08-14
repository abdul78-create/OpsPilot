import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsRepository } from './artifacts.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { ArtifactStatus } from '@prisma/client';

describe('Artifact Download & Integrity Verification Integration Test Suite', () => {
  let artifactsService: ArtifactsService;
  let tempFilePath: string;
  let sampleBuffer: Buffer;
  let expectedChecksum: string;

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
    getCorrelationId: jest.fn().mockReturnValue('req-corr-art-999'),
  };

  beforeAll(() => {
    const tempDir = path.join(__dirname, 'temp_test_artifacts');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    tempFilePath = path.join(tempDir, 'test-build-artifact.tar.gz');
    sampleBuffer = Buffer.from('OpsPilot Build Binary Content Sample Tarball Archive Payload 2026');
    fs.writeFileSync(tempFilePath, sampleBuffer);
    expectedChecksum = crypto.createHash('sha256').update(sampleBuffer).digest('hex');
  });

  afterAll(async () => {
    await new Promise((r) => setTimeout(r, 100));
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    const tempDir = path.join(__dirname, 'temp_test_artifacts');
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

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

    artifactsService = module.get<ArtifactsService>(ArtifactsService);
  });

  describe('1. Positive Artifact Download & Integrity Tests', () => {
    it('Positive: should retrieve read stream, filename, content-type and size for available artifact', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue({
        id: 'art_valid_100',
        pipelineRunId: 'run_100',
        name: 'test-build-artifact',
        storageLocation: tempFilePath,
        checksum: expectedChecksum,
        status: ArtifactStatus.AVAILABLE,
        sizeBytes: BigInt(sampleBuffer.length),
      });

      const result = await artifactsService.getDownloadStream('art_valid_100');

      expect(result.filename).toBe('test-build-artifact.tar.gz');
      expect(result.contentType).toBe('application/gzip');
      expect(result.sizeBytes).toBe(sampleBuffer.length);
      expect(result.stream).toBeDefined();
      result.stream.destroy();
    });

    it('Positive: should dynamically re-calculate SHA-256 file checksum and confirm match', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue({
        id: 'art_valid_100',
        pipelineRunId: 'run_100',
        name: 'test-build-artifact',
        storageLocation: tempFilePath,
        checksum: expectedChecksum,
        status: ArtifactStatus.AVAILABLE,
      });

      const integrity = await artifactsService.verifyIntegrity('art_valid_100');

      expect(integrity.match).toBe(true);
      expect(integrity.actualChecksum).toBe(expectedChecksum);
      expect(integrity.expectedChecksum).toBe(expectedChecksum);
    });
  });

  describe('2. Negative Security & Boundary Tests', () => {
    it('Negative: should throw NotFoundException if artifact ID does not exist', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue(null);

      await expect(artifactsService.getDownloadStream('art_non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Negative: should throw NotFoundException if artifact status is DELETED', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue({
        id: 'art_deleted_100',
        storageLocation: tempFilePath,
        status: ArtifactStatus.DELETED,
      });

      await expect(artifactsService.getDownloadStream('art_deleted_100')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Negative: should throw NotFoundException if artifact file is missing on disk', async () => {
      mockArtifactsRepository.findOneById.mockResolvedValue({
        id: 'art_missing_file_100',
        storageLocation: path.join(__dirname, 'non_existent_file_path.tar.gz'),
        status: ArtifactStatus.AVAILABLE,
      });

      await expect(artifactsService.getDownloadStream('art_missing_file_100')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
