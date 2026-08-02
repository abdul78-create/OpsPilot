import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtifactRetentionPolicy, ArtifactStatus } from '@prisma/client';

export class ArtifactResponseDto {
  @ApiProperty({ example: 'art_123456789' })
  id!: string;

  @ApiProperty({ example: 'run_123456789' })
  pipelineRunId!: string;

  @ApiProperty({ example: 'opspilot-api-linux-amd64' })
  name!: string;

  @ApiProperty({ example: 'v1.4.2' })
  version!: string;

  @ApiProperty({ example: 'sha256:a1b2c3d4e5f6...' })
  checksum!: string;

  @ApiProperty({ example: 's3://opspilot-artifacts/runs/run_123/opspilot-api-v1.4.2.tar.gz' })
  storageLocation!: string;

  @ApiProperty({ example: 52428800, description: 'Size in bytes' })
  sizeBytes!: string;

  @ApiProperty({ enum: ArtifactStatus, example: ArtifactStatus.AVAILABLE })
  status!: ArtifactStatus;

  @ApiProperty({ enum: ArtifactRetentionPolicy, example: ArtifactRetentionPolicy.KEEP_30_DAYS })
  retentionPolicy!: ArtifactRetentionPolicy;

  @ApiPropertyOptional()
  expiresAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;
}
