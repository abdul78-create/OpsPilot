import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrgRole, InvitationStatus } from '@prisma/client';

export class InvitationResponseDto {
  @ApiProperty({ example: 'inv_123456789' })
  id!: string;

  @ApiProperty({ example: 'org_123456789' })
  organizationId!: string;

  @ApiProperty({ example: 'colleague@acme.com' })
  invitedEmail!: string;

  @ApiProperty({ enum: OrgRole, example: OrgRole.MEMBER })
  intendedRole!: OrgRole;

  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.PENDING })
  status!: InvitationStatus;

  @ApiProperty()
  expiresAt!: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date | null;

  @ApiPropertyOptional()
  revokedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
