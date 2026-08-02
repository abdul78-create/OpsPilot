import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

export class AuditLogResponseDto {
  @ApiProperty({ example: 'aud_123456789' })
  id!: string;

  @ApiPropertyOptional({ example: 'org_123456789' })
  organizationId?: string | null;

  @ApiPropertyOptional({ example: 'usr_123456789' })
  userId?: string | null;

  @ApiProperty({ enum: AuditAction, example: AuditAction.CREATE })
  action!: AuditAction;

  @ApiProperty({ example: 'Project' })
  resourceType!: string;

  @ApiPropertyOptional({ example: 'prj_123456789' })
  resourceId?: string | null;

  @ApiPropertyOptional({ example: { name: 'OpsPilot Web' } })
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '127.0.0.1' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  userAgent?: string | null;

  @ApiProperty()
  createdAt!: Date;
}
