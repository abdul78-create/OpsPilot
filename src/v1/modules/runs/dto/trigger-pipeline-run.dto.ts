import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TriggerType } from '@prisma/client';

export class TriggerPipelineRunDto {
  @ApiPropertyOptional({ enum: TriggerType, example: TriggerType.MANUAL })
  @IsEnum(TriggerType)
  @IsOptional()
  triggerType?: TriggerType;

  @ApiPropertyOptional({ example: 'main', description: 'Target Git branch' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f678901234567890abcdef12345678',
    description: 'Target Git commit SHA',
  })
  @IsString()
  @IsOptional()
  commitSha?: string;
}
