import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({ example: 'org_123456789' })
  id!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  slug!: string;

  @ApiPropertyOptional({ example: 'https://cdn.opspilot.ai/avatars/acme.png' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: 'billing@acme.com' })
  billingEmail?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
