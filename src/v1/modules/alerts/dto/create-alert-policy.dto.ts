import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AlertEventType } from '@prisma/client';

export class CreateAlertPolicyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  notificationChannelId: string;

  @IsNotEmpty()
  @IsArray()
  @IsEnum(AlertEventType, { each: true })
  eventTypes: AlertEventType[];

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  minSeverity?: string;
}
