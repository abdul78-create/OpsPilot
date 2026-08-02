import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineRunStatus, TriggerType } from '@prisma/client';
import { PipelineJobResponseDto } from './pipeline-job-response.dto';

export class PipelineRunResponseDto {
  @ApiProperty({ example: 'run_123456789' })
  id!: string;

  @ApiProperty({ example: 'pipe_123456789' })
  pipelineDefinitionId!: string;

  @ApiProperty({ example: 'ver_123456789' })
  pipelineVersionId!: string;

  @ApiProperty({ enum: PipelineRunStatus, example: PipelineRunStatus.SUCCESS })
  status!: PipelineRunStatus;

  @ApiProperty({ enum: TriggerType, example: TriggerType.MANUAL })
  triggerType!: TriggerType;

  @ApiProperty({ example: 'usr_123456789' })
  triggeredBy!: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4e5f678901234567890abcdef12345678' })
  commitSha?: string | null;

  @ApiPropertyOptional({ example: 'main' })
  branch?: string | null;

  @ApiProperty()
  queuedAt!: Date;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  finishedAt?: Date | null;

  @ApiPropertyOptional({ example: 120 })
  durationSeconds?: number | null;

  @ApiPropertyOptional({ type: [PipelineJobResponseDto] })
  jobs?: PipelineJobResponseDto[];

  @ApiProperty()
  createdAt!: Date;
}
