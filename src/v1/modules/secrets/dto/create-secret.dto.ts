import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSecretDto {
  @ApiProperty({
    example: 'DATABASE_URL',
    description: 'Secret key name (uppercase alphanumeric with underscores)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Secret key must consist of uppercase alphanumeric characters and underscores',
  })
  key!: string;

  @ApiProperty({
    example: 'postgresql://user:pass@host:5432/db',
    description: 'Plaintext secret value to encrypt',
  })
  @IsString()
  @IsNotEmpty()
  value!: string;
}
