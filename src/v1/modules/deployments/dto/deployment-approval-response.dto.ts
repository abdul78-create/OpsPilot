import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus } from '@prisma/client';

export class DeploymentApprovalResponseDto {
  @ApiProperty({ example: 'app_123456789' })
  id!: string;

  @ApiProperty({ example: 'dep_123456789' })
  deploymentId!: string;

  @ApiProperty({ example: 'usr_123456789' })
  approverUserId!: string;

  @ApiProperty({ enum: ApprovalStatus, example: ApprovalStatus.APPROVED })
  status!: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Verified staging tests passed cleanly' })
  comment?: string | null;

  @ApiPropertyOptional()
  decidedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
