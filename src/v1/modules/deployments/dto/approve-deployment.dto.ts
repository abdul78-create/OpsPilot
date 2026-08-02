import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export class ApproveDeploymentDto {
  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.APPROVED })
  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  status!: ApprovalStatus;

  @ApiPropertyOptional({
    example: 'Verified staging tests passed cleanly',
    description: 'Approval or rejection rationale',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
