import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSecretDto {
  @ApiProperty({
    example: 'new_postgresql_password_123',
    description: 'Updated plaintext secret value to encrypt',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
