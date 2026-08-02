import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PipelineVersionResponseDto {
  @ApiProperty({ example: 'ver_123456789' })
  id!: string;

  @ApiProperty({ example: 'pipe_123456789' })
  pipelineDefinitionId!: string;

  @ApiProperty({ example: 1, description: 'Sequential version number' })
  versionNumber!: number;

  @ApiProperty({ example: 'version: 1.0\nname: Build' })
  yamlConfig!: string;

  @ApiProperty({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' })
  checksum!: string;

  @ApiPropertyOptional({ example: 'Added Docker build stage' })
  changeSummary?: string | null;

  @ApiPropertyOptional({ example: 'usr_123456789' })
  createdByUserId?: string | null;

  @ApiProperty()
  createdAt!: Date;
}
