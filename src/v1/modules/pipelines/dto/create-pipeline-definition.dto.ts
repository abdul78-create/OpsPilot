import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TriggerType } from '@prisma/client';

export class CreatePipelineDefinitionDto {
  @ApiProperty({ example: 'Build and Deploy CI', description: 'Pipeline display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'build-and-deploy-ci', description: 'Unique pipeline slug' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Automated CI/CD build pipeline',
    description: 'Pipeline description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: TriggerType, example: TriggerType.GIT_PUSH })
  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @ApiPropertyOptional({ example: 'main', description: 'Target branch for pipeline execution' })
  @IsString()
  @IsOptional()
  triggerBranch?: string;

  @ApiProperty({
    example: 'version: 1.0\nname: Build & Test\nstages: [build, test]',
    description: 'Pipeline YAML specification',
  })
  @IsString()
  @IsNotEmpty()
  yamlConfig!: string;

  @ApiPropertyOptional({
    example: 'Initial pipeline definition release',
    description: 'Summary of initial version',
  })
  @IsString()
  @IsOptional()
  changeSummary?: string;
}
