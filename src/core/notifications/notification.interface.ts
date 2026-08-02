export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendInvitationPayload {
  toEmail: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}

export interface INotificationService {
  sendEmail(payload: SendEmailPayload): Promise<void>;
  sendInvitation(payload: SendInvitationPayload): Promise<void>;
  sendPasswordReset(toEmail: string, resetUrl: string): Promise<void>;
}
