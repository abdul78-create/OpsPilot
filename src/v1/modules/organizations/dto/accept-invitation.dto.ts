import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({ description: 'Raw 64-character invitation token string' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
