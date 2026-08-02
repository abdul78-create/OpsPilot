import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VariableType, VariableScope, VariableSource } from '@prisma/client';

export class CreateVariableDto {
  @ApiProperty({
    example: 'LOG_LEVEL',
    description: 'Variable key (uppercase alphanumeric with underscores)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Variable key must consist of uppercase alphanumeric characters and underscores',
  })
  key!: string;

  @ApiProperty({ example: 'debug', description: 'Plain-text variable value' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({ enum: VariableType, example: VariableType.STRING })
  @IsEnum(VariableType)
  @IsOptional()
  type?: VariableType;

  @ApiPropertyOptional({ enum: VariableScope, example: VariableScope.ENVIRONMENT })
  @IsEnum(VariableScope)
  @IsOptional()
  scope?: VariableScope;

  @ApiPropertyOptional({ enum: VariableSource, example: VariableSource.MANUAL })
  @IsEnum(VariableSource)
  @IsOptional()
  source?: VariableSource;

  @ApiPropertyOptional({ example: false, description: 'Requires value present for deployment' })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    example: '^(debug|info|warn|error)$',
    description: 'Optional regex pattern',
  })
  @IsString()
  @IsOptional()
  validationRegex?: string;
}
