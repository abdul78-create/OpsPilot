import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import { TokenService } from '../../../core/security/token.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { EventBusService } from '../../../core/events/event-bus.service';

// ─── helpers ────────────────────────────────────────────────────────────────
function sha256(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function makeMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed_pw',
    name: 'Test User',
    role: 'USER',
    isSuperAdmin: false,
    isVerified: false,
    deletedAt: null,
    ...overrides,
  };
}

// ─── mock factories ──────────────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailVerification: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  passwordReset: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
  },
};

const mockHashService = {
  hashPassword: jest.fn().mockResolvedValue('hashed_pw'),
  verifyPassword: jest.fn().mockResolvedValue(true),
  hashSha256: jest.fn((v: string) => sha256(v)),
};

const mockTokenService = {
  generateAccessToken: jest.fn().mockReturnValue('mock_access_token'),
  generateOpaqueRefreshToken: jest.fn().mockReturnValue('mock_raw_refresh'),
};

const mockContextService = {
  getCorrelationId: jest.fn().mockReturnValue('corr-1'),
  getStore: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1' }),
  getUserAgent: jest.fn().mockReturnValue('jest-test'),
};

const mockEventBus = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationService = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

// ─── suite ───────────────────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset default session create mock
    mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HashService, useValue: mockHashService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: RequestContextService, useValue: mockContextService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: 'INotificationService', useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── REGISTER ────────────────────────────────────────────────────────────────
  describe('register()', () => {
    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(makeMockUser());

      await expect(
        service.register({ email: 'test@example.com', password: 'Pass1234', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user, store hashed verification token, and send verification email', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce(makeMockUser({ isVerified: false }));
      mockPrisma.emailVerification.create.mockResolvedValueOnce({ id: 'ev-1' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Pass1234',
        name: 'Test',
      });

      expect(result.message).toContain('verify your account');
      expect(mockPrisma.emailVerification.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.emailVerification.create.mock.calls[0][0];
      // tokenHash must be a sha256 hex (64 chars), NOT the raw token
      expect(createCall.data.tokenHash).toHaveLength(64);
      expect(mockNotificationService.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('should NOT issue JWT tokens on registration', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce(makeMockUser());
      mockPrisma.emailVerification.create.mockResolvedValueOnce({ id: 'ev-1' });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Pass1234',
        name: 'Test',
      });

      // result should be a simple message object, not AuthResponseDto
      expect((result as any).tokens).toBeUndefined();
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });
  });

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.login({ email: 'nobody@example.com', password: 'any' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(makeMockUser({ isVerified: true }));
      mockHashService.verifyPassword.mockResolvedValueOnce(false);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is not verified (positive security test)', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(makeMockUser({ isVerified: false }));
      mockHashService.verifyPassword.mockResolvedValueOnce(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'Pass1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens when credentials are valid and user is verified', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(makeMockUser({ isVerified: true }));
      mockHashService.verifyPassword.mockResolvedValueOnce(true);

      const result = await service.login({ email: 'test@example.com', password: 'Pass1234' });

      expect(result.tokens.accessToken).toBe('mock_access_token');
      expect(result.tokens.refreshToken).toBe('mock_raw_refresh');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  // ── VERIFY EMAIL ─────────────────────────────────────────────────────────────
  describe('verifyEmail()', () => {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const futureDate = new Date(Date.now() + 60_000);
    const pastDate = new Date(Date.now() - 60_000);

    it('should throw BadRequestException for an unknown token (negative security test)', async () => {
      mockPrisma.emailVerification.findUnique.mockResolvedValueOnce(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token (negative security test)', async () => {
      mockPrisma.emailVerification.findUnique.mockResolvedValueOnce({
        tokenHash,
        userId: 'user-1',
        expiresAt: pastDate,
        user: makeMockUser(),
      });
      mockPrisma.emailVerification.delete.mockResolvedValueOnce({});

      await expect(service.verifyEmail(rawToken)).rejects.toThrow(BadRequestException);
    });

    it('should mark user verified, delete token record, and return auth tokens (positive test)', async () => {
      const verifiedUser = makeMockUser({ isVerified: true });
      mockPrisma.emailVerification.findUnique.mockResolvedValueOnce({
        tokenHash,
        userId: 'user-1',
        expiresAt: futureDate,
        user: makeMockUser(),
      });
      mockPrisma.user.update.mockResolvedValueOnce(verifiedUser);
      mockPrisma.emailVerification.delete.mockResolvedValueOnce({});

      const result = await service.verifyEmail(rawToken);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isVerified: true } }),
      );
      expect(mockPrisma.emailVerification.delete).toHaveBeenCalledTimes(1);
      expect(result.tokens.accessToken).toBe('mock_access_token');
    });
  });

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
  describe('forgotPassword()', () => {
    it('should return safe message even if email does not exist (prevents enumeration)', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('password reset link');
      expect(mockNotificationService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should generate reset token and send reset email when user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(makeMockUser({ isVerified: true }));
      mockPrisma.passwordReset.deleteMany.mockResolvedValueOnce({ count: 0 });
      mockPrisma.passwordReset.create.mockResolvedValueOnce({ id: 'pr-1' });

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toContain('password reset link');
      expect(mockPrisma.passwordReset.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.passwordReset.create.mock.calls[0][0];
      // stored hash must be sha256 (64 chars), not raw token
      expect(createCall.data.tokenHash).toHaveLength(64);
      expect(mockNotificationService.sendPasswordReset).toHaveBeenCalledTimes(1);
    });
  });

  // ── RESET PASSWORD ─────────────────────────────────────────────────────────────
  describe('resetPassword()', () => {
    const rawToken = randomBytes(32).toString('hex');
    const pastDate = new Date(Date.now() - 60_000);
    const futureDate = new Date(Date.now() + 60_000);

    it('should throw BadRequestException for invalid reset token (negative security test)', async () => {
      mockPrisma.passwordReset.findUnique.mockResolvedValueOnce(null);

      await expect(service.resetPassword('bad-token', 'NewPass1234')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired reset token (negative security test)', async () => {
      mockPrisma.passwordReset.findUnique.mockResolvedValueOnce({
        userId: 'user-1',
        expiresAt: pastDate,
        user: makeMockUser(),
      });
      mockPrisma.passwordReset.delete.mockResolvedValueOnce({});

      await expect(service.resetPassword(rawToken, 'NewPass1234')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update password, revoke all refresh tokens, and delete reset record (positive test)', async () => {
      mockPrisma.passwordReset.findUnique.mockResolvedValueOnce({
        userId: 'user-1',
        expiresAt: futureDate,
        user: makeMockUser(),
      });
      mockPrisma.user.update.mockResolvedValueOnce(makeMockUser());
      mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.passwordReset.delete.mockResolvedValueOnce({});

      const result = await service.resetPassword(rawToken, 'NewPass1234');

      expect(result.message).toContain('Password updated');
      expect(mockHashService.hashPassword).toHaveBeenCalledWith('NewPass1234');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isRevoked: true, revokedAt: expect.any(Date) } }),
      );
      expect(mockPrisma.passwordReset.delete).toHaveBeenCalledTimes(1);
    });
  });
});
