import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ example: 'colleague@acme.com', description: 'Invitee email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ enum: OrgRole, example: OrgRole.MEMBER, description: 'Intended role' })
  @IsEnum(OrgRole)
  @IsOptional()
  role?: OrgRole;
}
