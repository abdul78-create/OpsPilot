import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerType } from '@prisma/client';
import { PipelineVersionResponseDto } from './pipeline-version-response.dto';

export class PipelineDefinitionResponseDto {
  @ApiProperty({ example: 'pipe_123456789' })
  id!: string;

  @ApiProperty({ example: 'prj_123456789' })
  projectId!: string;

  @ApiProperty({ example: 'Build & Test CI' })
  name!: string;

  @ApiProperty({ example: 'build-and-test-ci' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Automated CI/CD build pipeline' })
  description?: string | null;

  @ApiProperty({ enum: TriggerType, example: TriggerType.GIT_PUSH })
  triggerType!: TriggerType;

  @ApiProperty({ example: 'main' })
  triggerBranch!: string;

  @ApiProperty({ example: 1 })
  currentVersionNumber!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ type: PipelineVersionResponseDto })
  activeVersion?: PipelineVersionResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
