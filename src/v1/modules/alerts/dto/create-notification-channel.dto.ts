import { IsEnum, IsNotEmpty, IsString, IsUrl, ValidateIf } from 'class-validator';
import { NotificationChannelType } from '@prisma/client';

export class CreateNotificationChannelDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType;

  @ValidateIf((o) => o.type === 'SLACK_WEBHOOK' || o.type === 'WEBHOOK')
  @IsNotEmpty()
  @IsUrl()
  webhookUrl?: string;

  @ValidateIf((o) => o.type === 'PAGERDUTY')
  @IsNotEmpty()
  @IsString()
  integrationKey?: string;

  @ValidateIf((o) => o.type === 'EMAIL')
  @IsNotEmpty()
  @IsString()
  emailAddress?: string;
}
