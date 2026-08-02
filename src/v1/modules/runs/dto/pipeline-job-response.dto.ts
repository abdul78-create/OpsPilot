import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';

export class PipelineJobResponseDto {
  @ApiProperty({ example: 'job_123456789' })
  id!: string;

  @ApiProperty({ example: 'run_123456789' })
  pipelineRunId!: string;

  @ApiProperty({ example: 'Build Docker Image' })
  name!: string;

  @ApiProperty({ example: 'build' })
  stage!: string;

  @ApiProperty({ enum: JobStatus, example: JobStatus.SUCCESS })
  status!: JobStatus;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  finishedAt?: Date | null;

  @ApiPropertyOptional({ example: 45 })
  durationSeconds?: number | null;

  @ApiProperty()
  createdAt!: Date;
}
