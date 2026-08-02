import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EnvironmentType, OrgRole } from '@prisma/client';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'Production US-East', description: 'Environment display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'prod-us-east', description: 'Unique URL-safe environment slug' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ enum: EnvironmentType, example: EnvironmentType.PRODUCTION })
  @IsEnum(EnvironmentType)
  @IsOptional()
  type?: EnvironmentType;

  @ApiPropertyOptional({ example: true, description: 'Requires manual deployment approval' })
  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Minimum sign-offs required' })
  @IsInt()
  @Min(1)
  @IsOptional()
  minApprovers?: number;

  @ApiPropertyOptional({ enum: OrgRole, isArray: true, example: [OrgRole.OWNER, OrgRole.ADMIN] })
  @IsEnum(OrgRole, { each: true })
  @IsOptional()
  allowedRoles?: OrgRole[];

  @ApiPropertyOptional({
    example: 'Mon-Thu 09:00-17:00 UTC',
    description: 'Allowed deployment window',
  })
  @IsString()
  @IsOptional()
  deploymentWindow?: string;

  @ApiPropertyOptional({ example: true, description: 'Auto-rollback on deployment failure' })
  @IsBoolean()
  @IsOptional()
  autoRollbackEnabled?: boolean;
}
