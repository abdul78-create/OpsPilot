import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordTestResultDto {
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @IsNotEmpty()
  @IsString()
  testSuite: string;

  @IsNotEmpty()
  @IsString()
  testName: string;

  @IsNotEmpty()
  @IsBoolean()
  passed: boolean;

  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  runId?: string;
}
