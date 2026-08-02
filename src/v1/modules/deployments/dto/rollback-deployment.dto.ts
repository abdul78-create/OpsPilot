import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RollbackDeploymentDto {
  @ApiProperty({
    example: 'dep_123456789',
    description: 'Target successful Deployment UUID to rollback to',
  })
  @IsString()
  @IsNotEmpty()
  targetDeploymentId!: string;

  @ApiPropertyOptional({
    example: 'Automated rollback triggered by elevated error rates',
    description: 'Rollback rationale',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
