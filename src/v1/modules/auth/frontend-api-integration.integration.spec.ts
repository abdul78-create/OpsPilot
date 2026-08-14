import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { TokenService } from '../../../core/security/token.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { HashService } from '../../../core/security/hash.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { RequestContextService } from '../../../core/context/request-context.service';

describe('Commercial Product Phase 1 — Web App Frontend ↔ Backend Integration Test Suite', () => {
  let authService: AuthService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('mock_access_token_jwt_nextjs_16'),
    generateRefreshToken: jest.fn().mockReturnValue('mock_refresh_token_jwt_nextjs_16'),
    generateOpaqueRefreshToken: jest.fn().mockReturnValue('mock_opaque_refresh_token_string'),
    generateAuthTokens: jest.fn().mockResolvedValue({
      accessToken: 'mock_access_token_jwt_nextjs_16',
      refreshToken: 'mock_refresh_token_jwt_nextjs_16',
    }),
  };

  const mockHashService = {
    verifyPassword: jest.fn().mockResolvedValue(true),
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('hashed_password'),
    hashSha256: jest.fn().mockReturnValue('mock_sha256_hash'),
  };

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    session: { create: jest.fn().mockResolvedValue({ id: 'sess_100' }) },
    refreshToken: { create: jest.fn().mockResolvedValue({ id: 'rt_100' }) },
    organization: { findFirst: jest.fn(), create: jest.fn() },
    organizationMember: { create: jest.fn() },
    project: { findFirst: jest.fn(), findMany: jest.fn() },
  };

  const mockEventBus = { publish: jest.fn() };
  const mockRequestContext = {
    getStore: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1' }),
    getUserAgent: jest.fn().mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    getCorrelationId: jest.fn().mockReturnValue('corr-nextjs-999'),
  };
  const mockNotificationService = { sendEmail: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: HashService, useValue: mockHashService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: 'INotificationService', useValue: mockNotificationService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('1. Full Web Application Authentication & Session Persistence', () => {
    it('Positive: should validate user credentials and return JWT tokens for Next.js frontend login', async () => {
      const mockUser = {
        id: 'usr_next_100',
        email: 'founder@opspilot.ai',
        passwordHash: 'hashed_password',
        isVerified: true,
        organizationMembers: [
          {
            organizationId: '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
            role: 'ADMIN',
            organization: {
              id: '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
              name: 'OpsPilot Corp',
              slug: 'opspilot',
            },
          },
        ],
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const res = await authService.login({
        email: 'founder@opspilot.ai',
        password: 'Password123!',
      });

      expect(res.tokens.accessToken).toBe('mock_access_token_jwt_nextjs_16');
      expect(res.user.email).toBe('founder@opspilot.ai');
    });

    it('Negative: should reject login for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@opspilot.ai',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow();
    });
  });
});
