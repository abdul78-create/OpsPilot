import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

export class UpdateIncidentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsString()
  rootCause?: string;

  @IsOptional()
  @IsString()
  impactSummary?: string;

  @IsOptional()
  @IsString()
  mitigationAction?: string;
}
