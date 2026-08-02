import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RepositoryProvider } from '@prisma/client';

export class RepositoryConnectionResponseDto {
  @ApiProperty({ example: 'repo_123456789' })
  id!: string;

  @ApiProperty({ example: 'prj_123456789' })
  projectId!: string;

  @ApiProperty({ enum: RepositoryProvider, example: RepositoryProvider.GITHUB })
  provider!: RepositoryProvider;

  @ApiProperty({ example: 'https://github.com/opspilot/opspilot-core.git' })
  repositoryUrl!: string;

  @ApiProperty({ example: 'main' })
  defaultBranch!: string;

  @ApiPropertyOptional({ example: 'sec_123456789' })
  authSecretId?: string | null;

  @ApiPropertyOptional({ example: 'gh_wh_123456789' })
  webhookId?: string | null;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
