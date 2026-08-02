import { ApiProperty } from '@nestjs/swagger';
import { OrgRole, MemberStatus } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class MemberResponseDto {
  @ApiProperty({ example: 'mem_123456789' })
  id!: string;

  @ApiProperty({ example: 'org_123456789' })
  organizationId!: string;

  @ApiProperty({ example: 'usr_123456789' })
  userId!: string;

  @ApiProperty({ enum: OrgRole, example: OrgRole.MEMBER })
  role!: OrgRole;

  @ApiProperty({ enum: MemberStatus, example: MemberStatus.ACTIVE })
  status!: MemberStatus;

  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
