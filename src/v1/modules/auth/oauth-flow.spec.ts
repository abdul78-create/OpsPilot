import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GitHubAuthGuard } from './guards/github-auth.guard';
import { AuthService } from './auth.service';
import { getFrontendRedirectUrl, TRUSTED_PRODUCTION_FRONTEND } from './utils/auth-url.util';

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

  describe('4. Production OAuth Forensic Regression Tests (AUTH-OAUTH-001 to 006)', () => {
    it('AUTH-OAUTH-001: /auth/providers returns standard envelope and unwrapping reads google=true and github=true', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'google-id';
        if (key === 'GOOGLE_CLIENT_SECRET') return 'google-secret';
        if (key === 'GITHUB_CLIENT_ID') return 'github-id';
        if (key === 'GITHUB_CLIENT_SECRET') return 'github-secret';
        return undefined;
      });
      authController = new AuthController(authService as AuthService, configService);
      const rawResponse = authController.getProviders();
      // Simulate TransformInterceptor wrapping:
      const envelope = { success: true, message: 'Operation successful', data: rawResponse };

      // Verify client unwrapping logic:
      const clientPayload = envelope.data ?? envelope;
      expect(clientPayload.google).toBe(true);
      expect(clientPayload.github).toBe(true);
    });

    it('AUTH-OAUTH-002: Production Google callback uses configured FRONTEND_URL as trusted application redirect', () => {
      const prodConfigService = new ConfigService({});
      jest.spyOn(prodConfigService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://opspilot-frontend-zuxp.onrender.com';
        return undefined;
      });
      const req = {
        headers: {
          host: 'opspilot-backend-gd60.onrender.com',
          referer: 'https://accounts.google.com/signin/oauth',
        },
      };

      const redirectUrl = getFrontendRedirectUrl(req, prodConfigService);
      expect(redirectUrl).toBe('https://opspilot-frontend-zuxp.onrender.com');
    });

    it('AUTH-OAUTH-003: Production GitHub callback uses configured FRONTEND_URL as trusted application redirect', () => {
      const prodConfigService = new ConfigService({});
      jest.spyOn(prodConfigService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://opspilot-frontend-zuxp.onrender.com';
        return undefined;
      });
      const req = {
        headers: {
          host: 'opspilot-backend-gd60.onrender.com',
          referer: 'https://github.com/login/oauth/authorize',
        },
      };

      const redirectUrl = getFrontendRedirectUrl(req, prodConfigService);
      expect(redirectUrl).toBe('https://opspilot-frontend-zuxp.onrender.com');
    });

    it('AUTH-OAUTH-004: Google/GitHub Referer cannot override configured FRONTEND_URL', () => {
      const prodConfigService = new ConfigService({});
      jest.spyOn(prodConfigService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://opspilot-frontend-zuxp.onrender.com';
        return undefined;
      });
      const req = {
        headers: {
          referer: 'https://accounts.google.com/o/oauth2/v2/auth',
          origin: 'https://accounts.google.com',
        },
      };

      const redirectUrl = getFrontendRedirectUrl(req, prodConfigService);
      expect(redirectUrl).toBe('https://opspilot-frontend-zuxp.onrender.com');
      expect(redirectUrl).not.toContain('accounts.google.com');
    });

    it('AUTH-OAUTH-005: Arbitrary Referer cannot cause redirect to an external malicious domain (Open Redirect Protection)', () => {
      const prodConfigService = new ConfigService({});
      jest.spyOn(prodConfigService, 'get').mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'https://opspilot-frontend-zuxp.onrender.com';
        return undefined;
      });
      const attackerReq = {
        headers: {
          referer: 'https://attacker-controlled-phishing.com/harvest',
          origin: 'https://attacker-controlled-phishing.com',
        },
      };

      const redirectUrl = getFrontendRedirectUrl(attackerReq, prodConfigService);
      expect(redirectUrl).toBe('https://opspilot-frontend-zuxp.onrender.com');
      expect(redirectUrl).not.toContain('attacker');
    });

    it('AUTH-OAUTH-006: Local development behavior works only when explicitly configured or in non-production on localhost', () => {
      const oldNodeEnv = process.env.NODE_ENV;
      const oldFrontendUrl = process.env.FRONTEND_URL;
      try {
        // Case 1: Local development with explicitly configured localhost FRONTEND_URL
        process.env.NODE_ENV = 'development';
        const devConfigService = new ConfigService({});
        jest.spyOn(devConfigService, 'get').mockReturnValue('http://localhost:3001');
        const localReq = {
          headers: { host: 'localhost:3000' },
        };
        const localUrl = getFrontendRedirectUrl(localReq, devConfigService);
        expect(localUrl).toBe('http://localhost:3001');

        // Case 2: Production mode with localhost configured -> rejected and falls back to trusted production frontend
        process.env.NODE_ENV = 'production';
        const prodLocalConfigService = new ConfigService({});
        jest.spyOn(prodLocalConfigService, 'get').mockReturnValue('http://localhost:3001');
        const prodReq = {
          headers: { host: 'localhost:3000' },
        };
        const fallbackUrl = getFrontendRedirectUrl(prodReq, prodLocalConfigService);
        expect(fallbackUrl).toBe(TRUSTED_PRODUCTION_FRONTEND);

        // Case 3: Production mode without FRONTEND_URL -> defaults to trusted production frontend
        const emptyConfigService = new ConfigService({});
        jest.spyOn(emptyConfigService, 'get').mockReturnValue(undefined);
        delete process.env.FRONTEND_URL;
        const defaultProdUrl = getFrontendRedirectUrl(prodReq, emptyConfigService);
        expect(defaultProdUrl).toBe(TRUSTED_PRODUCTION_FRONTEND);
      } finally {
        process.env.NODE_ENV = oldNodeEnv;
        process.env.FRONTEND_URL = oldFrontendUrl;
      }
    });
  });
});
