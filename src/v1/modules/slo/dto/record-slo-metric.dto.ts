import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class RecordSloMetricDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  totalRequests: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  errorRequests: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  p95LatencyMs: number;
}
