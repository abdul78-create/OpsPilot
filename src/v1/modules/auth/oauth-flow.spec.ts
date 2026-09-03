import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { AuthService } from './auth.service';

describe('OAuth Flow & Resilience Verification Spec', () => {
  let configService: ConfigService;
  let authController: AuthController;
  const authService: Partial<AuthService> = {};

  beforeEach(() => {
    configService = new ConfigService({});
  });

  describe('1. AuthController.getProviders()', () => {
    it('should report both unconfigured when no OAuth credentials exist in environment', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      authController = new AuthController(authService as AuthService, configService);

      const status = authController.getProviders();
      expect(status).toEqual({ google: false, github: false });
    });

    it('should report providers as configured when valid credentials exist', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'real-google-id.apps.googleusercontent.com';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'real-google-secret';
        if (key === 'GITHUB_CLIENT_ID') return 'real-github-client-id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'real-github-secret';
        return undefined;
      });
      authController = new AuthController(authService as AuthService, configService);

      const status = authController.getProviders();
      expect(status).toEqual({ google: true, github: true });
    });

    it('should report as unconfigured when placeholders or UNCONFIGURED strings are present', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'UNCONFIGURED_GOOGLE_CLIENT_ID';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'UNCONFIGURED_GOOGLE_CLIENT_SECRET';
        return undefined;
      });
      authController = new AuthController(authService as AuthService, configService);

      const status = authController.getProviders();
      expect(status.google).toBe(false);
    });
  });

  describe('2. OAuth Guards Resilience (Glitch Prevention)', () => {
    let mockRedirect: jest.Mock;
    let mockContext: Partial<ExecutionContext>;

    beforeEach(() => {
      mockRedirect = jest.fn();
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: () => ({ redirect: mockRedirect }),
          getRequest: () => ({
            headers: { host: 'localhost:3000' },
          }),
        }),
      };
    });

    it('GoogleAuthGuard should cleanly intercept unconfigured OAuth and redirect to /login with error', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const guard = new GoogleAuthGuard(configService);

      const canActivate = guard.canActivate(mockContext as ExecutionContext);
      expect(canActivate).toBe(false);
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='));
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('Google%20OAuth%20is%20not%20configured'),
      );
    });

    it('GitHubAuthGuard should cleanly intercept unconfigured OAuth and redirect to /login with error', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const guard = new GitHubAuthGuard(configService);

      const canActivate = guard.canActivate(mockContext as ExecutionContext);
      expect(canActivate).toBe(false);
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/login?error='));
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining('GitHub%20OAuth%20is%20not%20configured'),
      );
    });
  });

  describe('3. AuthService.validateOAuthUser() Default Organization Provisioning', () => {
    let mockPrisma: any;
    let mockHashService: any;
    let mockTokenService: any;
    let mockContextService: any;
    let mockEventBus: any;
    let mockNotificationService: any;
    let fullAuthService: AuthService;

    beforeEach(() => {
      mockPrisma = {
        user: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        organization: {
          create: jest.fn().mockResolvedValue({ id: 'org-oauth-1', name: "Test User's Workspace" }),
        },
        member: {
          findFirst: jest.fn(),
          create: jest.fn(),
        },
        oAuthAccount: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'oauth-acc-1' }),
        },
        session: {
          create: jest.fn().mockResolvedValue({ id: 'sess-oauth-1' }),
        },
        refreshToken: {
          create: jest.fn().mockResolvedValue({ id: 'rt-oauth-1' }),
        },
      };

      mockHashService = {
        hashPassword: jest.fn().mockResolvedValue('argon2_hash'),
        hashSha256: jest.fn().mockReturnValue('sha256_hash'),
      };

      mockTokenService = {
        generateAccessToken: jest.fn().mockReturnValue('jwt_access_token_123'),
        generateOpaqueRefreshToken: jest.fn().mockReturnValue('opaque_refresh_token_123'),
      };

      mockContextService = {
        getStore: jest.fn().mockReturnValue({ ipAddress: '127.0.0.1' }),
        getUserAgent: jest.fn().mockReturnValue('Mozilla/5.0'),
        getCorrelationId: jest.fn().mockReturnValue('corr-123'),
      };

      mockEventBus = {
        publish: jest.fn().mockResolvedValue(undefined),
      };

      mockNotificationService = {
        sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      };

      fullAuthService = new AuthService(
        mockPrisma,
        mockHashService,
        mockTokenService,
        mockContextService,
        mockEventBus,
        mockNotificationService,
      );
    });

    it('should provision a new user AND automatically create a default Workspace Organization', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-123',
        email: 'developer@example.com',
        name: 'Developer Test',
        role: 'USER',
        isSuperAdmin: false,
        isVerified: true,
      });
      mockPrisma.member.findFirst.mockResolvedValue(null);

      const result = await fullAuthService.validateOAuthUser({
        provider: 'github',
        providerId: 'gh_99999',
        email: 'developer@example.com',
        name: 'Developer Test',
        avatarUrl: 'https://avatars.githubusercontent.com/u/99999',
      });

      expect(result.tokens.accessToken).toBe('jwt_access_token_123');
      expect(result.user.email).toBe('developer@example.com');
      // Assert organization was created
      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Developer Test's Workspace",
            members: expect.objectContaining({
              create: expect.objectContaining({
                userId: 'new-user-123',
                role: 'OWNER',
                status: 'ACTIVE',
              }),
            }),
          }),
        }),
      );
    });

    it('should reject OAuth profile if email is missing', async () => {
      await expect(
        fullAuthService.validateOAuthUser({
          provider: 'github',
          providerId: 'gh_no_email',
          email: '',
          name: 'No Email User',
        }),
      ).rejects.toThrow('OAuth provider did not return an email address');
    });
  });
});
