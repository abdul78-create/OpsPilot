import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentType, OrgRole } from '@prisma/client';

export class EnvironmentResponseDto {
  @ApiProperty({ example: 'env_123456789' })
  id!: string;

  @ApiProperty({ example: 'prj_123456789' })
  projectId!: string;

  @ApiProperty({ example: 'Production US-East' })
  name!: string;

  @ApiProperty({ example: 'prod-us-east' })
  slug!: string;

  @ApiProperty({ enum: EnvironmentType, example: EnvironmentType.PRODUCTION })
  type!: EnvironmentType;

  @ApiProperty({ example: true })
  requiresApproval!: boolean;

  @ApiProperty({ example: 1 })
  minApprovers!: number;

  @ApiProperty({ enum: OrgRole, isArray: true, example: [OrgRole.OWNER, OrgRole.ADMIN] })
  allowedRoles!: OrgRole[];

  @ApiPropertyOptional({ example: 'Mon-Thu 09:00-17:00 UTC' })
  deploymentWindow?: string | null;

  @ApiProperty({ example: true })
  autoRollbackEnabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
