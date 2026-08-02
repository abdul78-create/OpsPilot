import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeploymentDto {
  @ApiProperty({ example: 'run_123456789', description: 'Pipeline Run UUID to deploy' })
  @IsString()
  @IsNotEmpty()
  pipelineRunId!: string;

  @ApiPropertyOptional({ example: 'v1.2.0', description: 'Release tag or version number' })
  @IsString()
  @IsOptional()
  releaseVersion?: string;
}
