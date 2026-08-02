import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LogLevel } from '@prisma/client';

export class LogEntryResponseDto {
  @ApiProperty({ example: 'log_123456789' })
  id!: string;

  @ApiProperty({ example: 'run_123456789' })
  pipelineRunId!: string;

  @ApiPropertyOptional({ example: 'job_123456789' })
  jobId?: string | null;

  @ApiProperty({ enum: LogLevel, example: LogLevel.INFO })
  level!: LogLevel;

  @ApiProperty({ example: '[Build] Compiling TypeScript sources...' })
  message!: string;

  @ApiProperty({ example: '2026-07-30T16:00:00.000Z' })
  timestamp!: Date;
}
