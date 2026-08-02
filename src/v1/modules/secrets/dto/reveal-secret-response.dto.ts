import { ApiProperty } from '@nestjs/swagger';

export class RevealSecretResponseDto {
  @ApiProperty({ example: 'sec_123456789' })
  id!: string;

  @ApiProperty({ example: 'DATABASE_URL' })
  key!: string;

  @ApiProperty({
    example: 'postgresql://user:pass@host:5432/db',
    description: 'Decrypted plaintext secret value',
  })
  value!: string;

  @ApiProperty({ example: 1 })
  keyVersion!: number;
}
