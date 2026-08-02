import { ApiProperty } from '@nestjs/swagger';

export class SecretResponseDto {
  @ApiProperty({ example: 'sec_123456789' })
  id!: string;

  @ApiProperty({ example: 'env_123456789' })
  environmentId!: string;

  @ApiProperty({ example: 'DATABASE_URL' })
  key!: string;

  @ApiProperty({ example: true, description: 'Indicates that encrypted secret payload is active' })
  isConfigured!: boolean;

  @ApiProperty({ example: 1, description: 'Master key rotation version' })
  keyVersion!: number;

  @ApiProperty({ example: 'aes-256-gcm' })
  algorithm!: string;

  @ApiProperty()
  lastRotatedAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
