import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import { TokenService } from '../../../core/security/token.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { INotificationService } from '../../../core/notifications/notification.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MESSAGES } from '@shared/constants/messages.constants';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

function sha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
    private readonly contextService: RequestContextService,
    private readonly eventBus: EventBusService,
    @Inject('INotificationService')
    private readonly notificationService: INotificationService,
  ) {}

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException(MESSAGES.USER_EMAIL_EXISTS);
    }

    const passwordHash = await this.hashService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        isVerified: false,
      },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'UserRegisteredEvent',
      aggregateId: user.id,
      aggregateType: 'User',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: { userId: user.id, email: user.email },
    });

    // Generate email verification token
    const rawToken = generateSecureToken();
    const tokenHash = sha256(rawToken);

    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    await this.notificationService.sendEmailVerification(user.email, verificationUrl);

    this.logger.log(`Verification email dispatched for user ${user.id}`);

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.hashService.verifyPassword(user.passwordHash, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Email verification required. Please check your inbox and verify your email before signing in.',
      );
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: this.contextService.getStore()?.ipAddress,
        userAgent: this.contextService.getUserAgent(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.eventBus.publish({
      eventId: `evt_${Date.now()}`,
      eventName: 'SessionCreatedEvent',
      aggregateId: user.id,
      aggregateType: 'Session',
      occurredOn: new Date(),
      version: 1,
      correlationId: this.contextService.getCorrelationId(),
      payload: {
        userId: user.id,
        sessionId: session.id,
        ipAddress: this.contextService.getStore()?.ipAddress,
      },
    });

    return this.issueAuthTokens(
      user.id,
      user.email,
      user.role,
      user.isSuperAdmin,
      user.name,
      session.id,
    );
  }

  // ─────────────────────────────────────────────
  // VERIFY EMAIL
  // ─────────────────────────────────────────────
  async verifyEmail(token: string): Promise<AuthResponseDto> {
    const tokenHash = sha256(token);

    const record = await this.prisma.emailVerification.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired email verification link.');
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.emailVerification.delete({ where: { tokenHash } });
      throw new BadRequestException(
        'This verification link has expired. Please register again or request a new one.',
      );
    }

    // Mark the user as verified
    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true },
    });

    // Clean up the verification record
    await this.prisma.emailVerification.delete({ where: { tokenHash } });

    // Create a session and issue tokens so the user is logged in immediately
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: this.contextService.getStore()?.ipAddress,
        userAgent: this.contextService.getUserAgent(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Email verified and session created for user ${user.id}`);

    return this.issueAuthTokens(
      user.id,
      user.email,
      user.role,
      user.isSuperAdmin,
      user.name,
      session.id,
    );
  }

  // ─────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_MESSAGE =
      'If that email is registered, you will receive a password reset link shortly.';

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    // Return same safe message even when user doesn't exist (prevents user enumeration)
    if (!user) {
      return { message: SAFE_MESSAGE };
    }

    // Invalidate any existing password reset tokens for this user
    await this.prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const rawToken = generateSecureToken();
    const tokenHash = sha256(rawToken);

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.notificationService.sendPasswordReset(user.email, resetUrl);

    this.logger.log(`Password reset email dispatched for user ${user.id}`);

    return { message: SAFE_MESSAGE };
  }

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = sha256(token);

    const record = await this.prisma.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.passwordReset.delete({ where: { tokenHash } });
      throw new BadRequestException(
        'This password reset link has expired. Please request a new one.',
      );
    }

    const newPasswordHash = await this.hashService.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all active refresh tokens for security (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId: record.userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // Clean up reset record
    await this.prisma.passwordReset.delete({ where: { tokenHash } });

    this.logger.log(`Password reset completed for user ${record.userId}`);

    return { message: 'Password updated successfully. Please sign in with your new password.' };
  }

  // ─────────────────────────────────────────────
  // REFRESH TOKENS
  // ─────────────────────────────────────────────
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const tokenHash = this.hashService.hashSha256(dto.refreshToken);

    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.isRevoked) {
      this.logger.warn(
        `REUSE DETECTED! Revoking all refresh tokens for userId: ${existingToken.userId}`,
      );

      await this.prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId },
        data: { isRevoked: true, revokedAt: new Date() },
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'TokenReuseDetectedEvent',
        aggregateId: existingToken.userId,
        aggregateType: 'RefreshToken',
        occurredOn: new Date(),
        version: 1,
        correlationId: this.contextService.getCorrelationId(),
        payload: { userId: existingToken.userId, attemptedTokenHash: tokenHash },
      });

      throw new ForbiddenException('Security alert: Token reuse detected. Please re-authenticate.');
    }

    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedException('Expired refresh token');
    }

    const user = existingToken.user;

    const newRawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const newTokenHash = this.hashService.hashSha256(newRawRefreshToken);

    const newRecord = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        parentTokenId: existingToken.id,
        deviceInfo: this.contextService.getUserAgent(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenId: newRecord.id,
      },
    });

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      type: 'access',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken: newRawRefreshToken,
      },
    };
  }

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────
  // OAUTH VALIDATE & PROVISION USER
  // ─────────────────────────────────────────────
  async validateOAuthUser(oauthProfile: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }): Promise<AuthResponseDto> {
    const { provider, providerId, email, name, avatarUrl } = oauthProfile;

    if (!email) {
      throw new BadRequestException('OAuth provider did not return an email address');
    }

    let user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user) {
      const randomPassword = generateSecureToken();
      const passwordHash = await this.hashService.hashPassword(randomPassword);

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatarUrl: avatarUrl ?? null,
          passwordHash,
          isVerified: true,
        },
      });

      this.logger.log(`Provisioned new user ${user.id} via ${provider} OAuth`);
    } else if (!user.isVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, avatarUrl: avatarUrl ?? user.avatarUrl },
      });
    }

    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });

    if (!existingOAuth) {
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider,
          providerId,
        },
      });
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: this.contextService.getStore()?.ipAddress ?? '0.0.0.0',
        userAgent: this.contextService.getUserAgent(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return this.issueAuthTokens(
      user.id,
      user.email,
      user.role,
      user.isSuperAdmin,
      user.name,
      session.id,
    );
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async issueAuthTokens(
    userId: string,
    email: string,
    role: string,
    isSuperAdmin: boolean,
    name: string,
    sessionId?: string,
  ): Promise<AuthResponseDto> {
    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      email,
      role,
      isSuperAdmin,
      sid: sessionId,
      type: 'access',
    });

    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.hashService.hashSha256(rawRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        deviceInfo: this.contextService.getUserAgent(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        id: userId,
        email,
        name,
        role,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
      },
    };
  }
}
