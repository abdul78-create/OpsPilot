import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GeneratePipelineDto {
  @ApiProperty({
    example: 'Deploy my Python application to staging',
    description: 'Natural language specification prompt',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Target Customer Project UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;
}
