import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { RepositoryProvider } from '@prisma/client';

export class CreateRepositoryConnectionDto {
  @ApiProperty({ enum: RepositoryProvider, example: RepositoryProvider.GITHUB })
  @IsEnum(RepositoryProvider)
  @IsNotEmpty()
  provider!: RepositoryProvider;

  @ApiProperty({
    example: 'https://github.com/opspilot/opspilot-core.git',
    description: 'Git repository URL',
  })
  @IsUrl()
  @IsNotEmpty()
  repositoryUrl!: string;

  @ApiPropertyOptional({ example: 'main', description: 'Default repository branch' })
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

  @ApiPropertyOptional({
    example: 'ghp_1234567890abcdef',
    description: 'GitHub Personal Access Token or OAuth token for authentication',
  })
  @IsString()
  @IsOptional()
  accessToken?: string;
}
