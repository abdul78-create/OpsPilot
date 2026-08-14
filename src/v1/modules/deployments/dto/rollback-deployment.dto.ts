import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RollbackDeploymentDto {
  @ApiPropertyOptional({
    example: 'dep_123456789',
    description:
      'Target successful Deployment UUID to rollback to (defaults to latest successful deployment)',
  })
  @IsString()
  @IsOptional()
  targetDeploymentId?: string;

  @ApiPropertyOptional({
    example: 'Automated rollback triggered by elevated error rates',
    description: 'Rollback rationale',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
