import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiAnalysisType, AiRiskLevel } from '@prisma/client';

export class AiReportResponseDto {
  @ApiProperty({ example: 'air_123456789' })
  id!: string;

  @ApiProperty({ example: 'org_123456789' })
  organizationId!: string;

  @ApiPropertyOptional({ example: 'prj_123456789' })
  projectId?: string | null;

  @ApiProperty({ enum: AiAnalysisType, example: AiAnalysisType.RUN_RCA })
  type!: AiAnalysisType;

  @ApiProperty({ example: 'run_123456789', description: 'ID of analyzed target resource' })
  targetId!: string;

  @ApiProperty({ example: 'Automated Root Cause Analysis for Pipeline Run failure' })
  summary!: string;

  @ApiPropertyOptional({ example: 'Job step exceeded execution timeout limit.' })
  rootCause?: string | null;

  @ApiProperty({ example: 0.95, description: 'Confidence score from 0.0 to 1.0' })
  confidenceScore!: number;

  @ApiProperty({ enum: AiRiskLevel, example: AiRiskLevel.HIGH })
  riskLevel!: AiRiskLevel;

  @ApiProperty({ example: ['Increase step timeout', 'Split heavy build tasks'] })
  recommendations!: string[];

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}
