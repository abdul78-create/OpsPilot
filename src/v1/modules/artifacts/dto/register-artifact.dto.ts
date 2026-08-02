import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ArtifactRetentionPolicy } from '@prisma/client';

export class RegisterArtifactDto {
  @ApiProperty({ example: 'opspilot-api-linux-amd64', description: 'Artifact name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'v1.4.2', description: 'Semantic version tag' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({
    example: 'sha256:a1b2c3d4e5f6...',
    description: 'SHA-256 checksum of artifact content',
  })
  @IsString()
  @IsNotEmpty()
  checksum!: string;

  @ApiProperty({
    example: 's3://opspilot-artifacts/runs/run_123/opspilot-api-v1.4.2.tar.gz',
    description: 'Storage location URI',
  })
  @IsString()
  @IsNotEmpty()
  storageLocation!: string;

  @ApiPropertyOptional({ example: 52428800, description: 'Artifact size in bytes' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({
    enum: ArtifactRetentionPolicy,
    example: ArtifactRetentionPolicy.KEEP_30_DAYS,
  })
  @IsEnum(ArtifactRetentionPolicy)
  @IsOptional()
  retentionPolicy?: ArtifactRetentionPolicy;
}
