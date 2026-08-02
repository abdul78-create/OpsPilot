import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: OrgRole,
    example: OrgRole.ADMIN,
    description: 'New organization member role',
  })
  @IsEnum(OrgRole)
  @IsNotEmpty()
  role!: OrgRole;
}
