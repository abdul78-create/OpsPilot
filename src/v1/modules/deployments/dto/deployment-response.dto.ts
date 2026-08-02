import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeploymentStatus } from '@prisma/client';
import { DeploymentApprovalResponseDto } from './deployment-approval-response.dto';

export class DeploymentResponseDto {
  @ApiProperty({ example: 'dep_123456789' })
  id!: string;

  @ApiProperty({ example: 'env_123456789' })
  environmentId!: string;

  @ApiProperty({ example: 'run_123456789' })
  pipelineRunId!: string;

  @ApiProperty({ enum: DeploymentStatus, example: DeploymentStatus.SUCCESS })
  status!: DeploymentStatus;

  @ApiProperty({ example: 'v1.2.0' })
  releaseVersion!: string;

  @ApiProperty({ example: 'usr_123456789' })
  deployedByUserId!: string;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  finishedAt?: Date | null;

  @ApiPropertyOptional({ example: 180 })
  durationSeconds?: number | null;

  @ApiPropertyOptional({ example: 'dep_987654321' })
  rollbackFromDeploymentId?: string | null;

  @ApiPropertyOptional({ type: [DeploymentApprovalResponseDto] })
  approvals?: DeploymentApprovalResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
