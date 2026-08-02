import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRepositoryConnectionDto {
  @ApiPropertyOptional({ example: 'main', description: 'Updated default repository branch' })
  @IsString()
  @IsOptional()
  defaultBranch?: string;

  @ApiPropertyOptional({
    example: 'sec_123456789',
    description: 'Reference to Secret.id holding Git access token',
  })
  @IsString()
  @IsOptional()
  authSecretId?: string;
}
