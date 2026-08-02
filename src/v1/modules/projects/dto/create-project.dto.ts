import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'E-Commerce Core Service', description: 'Project display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'ecommerce-core',
    description: 'Unique URL-safe project slug within the organization',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Backend microservice handling checkout and inventory',
    description: 'Project description',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
