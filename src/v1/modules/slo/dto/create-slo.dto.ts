import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSloDto {
  @IsNotEmpty()
  @IsString()
  service: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(90.0)
  @Max(99.999)
  targetAvailability: number; // e.g. 99.9

  @IsOptional()
  @IsNumber()
  @Min(10)
  targetLatencyP95Ms?: number = 500;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  windowDays?: number = 30;
}
