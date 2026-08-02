import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import { TokenService } from '../../../core/security/token.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MESSAGES } from '@shared/constants/messages.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
    private readonly contextService: RequestContextService,
    private readonly eventBus: EventBusService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
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

    return this.issueAuthTokens(user.id, user.email, user.role, user.isSuperAdmin, user.name);
  }

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

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }

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
