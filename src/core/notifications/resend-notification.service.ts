import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationService,
  SendEmailPayload,
  SendInvitationPayload,
} from './notification.interface';

const RESEND_API_URL = 'https://api.resend.com/emails';

@Injectable()
export class ResendNotificationService implements INotificationService {
  private readonly logger = new Logger(ResendNotificationService.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? '';
    this.fromAddress = process.env.RESEND_FROM_EMAIL ?? 'OpsPilot <onboarding@resend.dev>';
  }

  private async sendViaResend(payload: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend API error [${response.status}]: ${body}`);
      throw new Error(`Failed to send email via Resend: ${response.status}`);
    }

    this.logger.log(
      `Email sent via Resend to ${payload.to.join(', ')} — subject: "${payload.subject}"`,
    );
  }

  async sendEmail(payload: SendEmailPayload): Promise<void> {
    await this.sendViaResend({
      to: [payload.to],
      subject: payload.subject,
      html: payload.html ?? `<p>${payload.body}</p>`,
    });
  }

  async sendInvitation(payload: SendInvitationPayload): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; background: #09090b; color: #e4e4e7; padding: 32px;">
        <div style="max-width: 480px; margin: 0 auto;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 22px; font-weight: 700; color: #fff;">OpsPilot</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">You've been invited to ${payload.organizationName}</h1>
          <p style="color: #a1a1aa; margin-bottom: 24px;">
            <strong style="color: #e4e4e7;">${payload.inviterName}</strong> has invited you to join <strong style="color: #e4e4e7;">${payload.organizationName}</strong> as a <strong style="color: #e4e4e7;">${payload.role}</strong>.
          </p>
          <a href="${payload.inviteUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Accept Invitation</a>
          <p style="color: #52525b; font-size: 12px; margin-top: 32px;">If you were not expecting this invitation, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendViaResend({
      to: [payload.toEmail],
      subject: `You've been invited to ${payload.organizationName} on OpsPilot`,
      html,
    });
  }

  async sendPasswordReset(toEmail: string, resetUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; background: #09090b; color: #e4e4e7; padding: 32px;">
        <div style="max-width: 480px; margin: 0 auto;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 22px; font-weight: 700; color: #fff;">OpsPilot</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Reset your password</h1>
          <p style="color: #a1a1aa; margin-bottom: 24px;">We received a request to reset your password. This link expires in <strong style="color: #e4e4e7;">1 hour</strong>.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Reset Password</a>
          <p style="color: #52525b; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendViaResend({
      to: [toEmail],
      subject: 'Reset your OpsPilot password',
      html,
    });
  }

  async sendEmailVerification(toEmail: string, verificationUrl: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: system-ui, sans-serif; background: #09090b; color: #e4e4e7; padding: 32px;">
        <div style="max-width: 480px; margin: 0 auto;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 22px; font-weight: 700; color: #fff;">OpsPilot</span>
          </div>
          <h1 style="font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 8px;">Verify your email address</h1>
          <p style="color: #a1a1aa; margin-bottom: 24px;">Thanks for signing up! Please click the button below to verify your email address. This link expires in <strong style="color: #e4e4e7;">24 hours</strong>.</p>
          <a href="${verificationUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Verify Email Address</a>
          <p style="color: #52525b; font-size: 12px; margin-top: 32px;">If you didn't create an OpsPilot account, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;
    await this.sendViaResend({
      to: [toEmail],
      subject: 'Verify your OpsPilot email address',
      html,
    });
  }
}
