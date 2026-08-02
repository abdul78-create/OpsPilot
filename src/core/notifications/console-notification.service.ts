import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationService,
  SendEmailPayload,
  SendInvitationPayload,
} from './notification.interface';

@Injectable()
export class ConsoleNotificationService implements INotificationService {
  private readonly logger = new Logger(ConsoleNotificationService.name);

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    this.logger.log(
      `[EMAIL DISPATCH] To: ${payload.to} | Subject: "${payload.subject}" | Body length: ${payload.body.length} chars`,
    );
  }

  async sendInvitation(payload: SendInvitationPayload): Promise<void> {
    this.logger.log(
      `[INVITATION EMAIL] To: ${payload.toEmail} | Org: ${payload.organizationName} | Role: ${payload.role} | URL: ${payload.inviteUrl}`,
    );
  }

  async sendPasswordReset(toEmail: string, resetUrl: string): Promise<void> {
    this.logger.log(`[PASSWORD RESET EMAIL] To: ${toEmail} | Reset URL: ${resetUrl}`);
  }
}
