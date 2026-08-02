import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class ProjectResponseDto {
  @ApiProperty({ example: 'prj_123456789' })
  id!: string;

  @ApiProperty({ example: 'org_123456789' })
  organizationId!: string;

  @ApiProperty({ example: 'E-Commerce Core Service' })
  name!: string;

  @ApiProperty({ example: 'ecommerce-core' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Backend microservice handling checkout' })
  description?: string | null;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.ACTIVE })
  status!: ProjectStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
