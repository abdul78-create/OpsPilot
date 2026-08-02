import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenDataDto {
  @ApiProperty({ description: 'Short-lived JWT Access Token' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque Refresh Token' })
  refreshToken!: string;
}

export class UserPayloadDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  role!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserPayloadDto })
  user!: UserPayloadDto;

  @ApiProperty({ type: AuthTokenDataDto })
  tokens!: AuthTokenDataDto;
}
