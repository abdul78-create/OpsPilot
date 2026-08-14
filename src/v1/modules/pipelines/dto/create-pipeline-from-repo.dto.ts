import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreatePipelineFromRepoDto {
  @ApiProperty({
    example: '933a6fe9-e4ac-48fb-878c-91661d3c90c6',
    description: 'Target RepositoryConnection UUID',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  repositoryConnectionId!: string;

  @ApiPropertyOptional({ example: 'Express Core Pipeline', description: 'Pipeline display name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'main', description: 'Target branch for pipeline execution' })
  @IsString()
  @IsOptional()
  triggerBranch?: string;

  @ApiPropertyOptional({ enum: TriggerType, example: TriggerType.GIT_PUSH })
  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @ApiPropertyOptional({
    example:
      'version: "1"\nname: Build & Test\nstages:\n  - name: test\n    commands: ["npm test"]',
    description: 'Custom YAML specification (overrides automatic stack detection)',
  })
  @IsString()
  @IsOptional()
  yamlConfig?: string;
}
