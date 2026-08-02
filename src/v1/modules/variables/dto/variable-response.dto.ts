import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VariableType, VariableScope, VariableSource } from '@prisma/client';

export class VariableResponseDto {
  @ApiProperty({ example: 'var_123456789' })
  id!: string;

  @ApiProperty({ example: 'env_123456789' })
  environmentId!: string;

  @ApiProperty({ example: 'LOG_LEVEL' })
  key!: string;

  @ApiProperty({ example: 'debug' })
  value!: string;

  @ApiProperty({ enum: VariableType, example: VariableType.STRING })
  type!: VariableType;

  @ApiProperty({ enum: VariableScope, example: VariableScope.ENVIRONMENT })
  scope!: VariableScope;

  @ApiProperty({ enum: VariableSource, example: VariableSource.MANUAL })
  source!: VariableSource;

  @ApiProperty({ example: false })
  isRequired!: boolean;

  @ApiPropertyOptional({ example: '^(debug|info|warn|error)$' })
  validationRegex?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
