import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeRunRequestDto {
  @ApiProperty({ example: 'run_123456789', description: 'Pipeline Run UUID' })
  @IsString()
  @IsNotEmpty()
  pipelineRunId!: string;
}

export class ScoreDeploymentRequestDto {
  @ApiProperty({ example: 'dep_123456789', description: 'Deployment UUID' })
  @IsString()
  @IsNotEmpty()
  deploymentId!: string;
}
