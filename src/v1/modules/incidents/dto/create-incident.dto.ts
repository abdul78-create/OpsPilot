import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

export class CreateIncidentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  service: string;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity = IncidentSeverity.HIGH;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus = IncidentStatus.INVESTIGATING;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  environmentId?: string;

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
