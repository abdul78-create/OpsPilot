import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { AlertEventType } from '@prisma/client';

export class DispatchAlertDto {
  @IsNotEmpty()
  @IsEnum(AlertEventType)
  eventType: AlertEventType;

  @IsNotEmpty()
  @IsObject()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}
