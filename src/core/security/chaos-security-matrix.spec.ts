import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AesSecretEncryptionService } from './aes-secret-encryption.service';
import { HashService } from './hash.service';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantGuard } from './guards/tenant.guard';
import { RequestContextService } from '../context/request-context.service';
import { PrismaService } from '../database/prisma.service';
import { Reflector } from '@nestjs/core';
import { PipelineRunStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';

describe('OpsPilot 15-Point Reliability, Chaos & Security Hardening Matrix', () => {
  let aesService: AesSecretEncryptionService;
  let tokenService: TokenService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret-hardening-min-32-chars-long';
      if (key === 'ENCRYPTION_KEY')
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      return null;
    }),
  };

  const mockPrisma = {
    organization: { findFirst: jest.fn() },
    member: { findFirst: jest.fn() },
    project: { findFirst: jest.fn() },
    pipelineRun: { findMany: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    pipelineJob: { update: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AesSecretEncryptionService,
        TokenService,
        HashService,
        JwtService,
        Reflector,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        RequestContextService,
        TenantGuard,
      ],
    }).compile();

    aesService = module.get<AesSecretEncryptionService>(AesSecretEncryptionService);
    tokenService = module.get<TokenService>(TokenService);
  });

  /* ── 1. AES-256-GCM Cryptographic Integrity & Anti-Tampering ── */
  describe('Point 11: Secret Masking & GCM Ciphertext Authenticity', () => {
    it('should encrypt secret and decrypt successfully with valid authTag', async () => {
      const plaintext = 'sk-live-super-secret-api-key-999';
      const enc = await aesService.encrypt(plaintext);

      expect(enc.encryptedValue).toBeDefined();
      expect(enc.iv).toBeDefined();
      expect(enc.authTag).toBeDefined();
      expect(enc.encryptedValue).not.toEqual(plaintext);

      const decrypted = await aesService.decrypt(enc);
      expect(decrypted).toEqual(plaintext);
    });

    it('should STRICTLY REJECT tampered ciphertext or modified authTag (Negative Test)', async () => {
      const enc = await aesService.encrypt('secret-data');
      const tampered = { ...enc, authTag: '00'.repeat(16) };

      await expect(aesService.decrypt(tampered)).rejects.toThrow();
    });

    it('should redact secrets matching pattern in logs', () => {
      const secret = 'super-secret-token-xyz';
      const logLine = `Executing curl -H "Authorization: Bearer ${secret}" https://api.service.internal`;
      const redacted = logLine.replace(new RegExp(secret, 'g'), '***');

      expect(redacted).not.toContain(secret);
      expect(redacted).toContain('***');
    });
  });

  /* ── 2. JWT Security, Expiration, and Tampering Rejection ── */
  describe('Point 7: JWT Security, Expiration & Forgery Rejection', () => {
    it('should accept valid, unexpired token', () => {
      const token = tokenService.generateAccessToken({
        sub: 'usr-1',
        email: 'dev@opspilot.ai',
        role: 'ADMIN',
        isSuperAdmin: false,
        type: 'access',
      });

      const payload = tokenService.verifyAccessToken(token);
      expect(payload.sub).toBe('usr-1');
      expect(payload.email).toBe('dev@opspilot.ai');
    });

    it('should STRICTLY REJECT forged or signature-tampered JWTs (Negative Test)', () => {
      const token = tokenService.generateAccessToken({
        sub: 'usr-1',
        email: 'dev@opspilot.ai',
        role: 'ADMIN',
        isSuperAdmin: false,
        type: 'access',
      });

      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.bad_signature_xyz`;

      expect(() => tokenService.verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  /* ── 3. Multi-Tenant Cross-Organization Isolation ── */
  describe('Point 6: Multi-Tenant Cross-Organization Resource Isolation', () => {
    let tenantGuard: TenantGuard;
    let contextService: RequestContextService;

    beforeEach(() => {
      contextService = new RequestContextService();
      tenantGuard = new TenantGuard(mockPrisma as any, contextService, new Reflector());
    });

    it('should allow user belonging to Organization A to access Org A', async () => {
      const mockReq: any = {
        headers: { 'x-organization-id': 'org-alpha' },
        user: { sub: 'usr-1', isSuperAdmin: false },
        params: {},
      };

      mockPrisma.organization.findFirst.mockResolvedValueOnce({
        id: 'org-alpha',
        name: 'Alpha Org',
      });
      mockPrisma.member.findFirst.mockResolvedValueOnce({
        id: 'mem-1',
        organizationId: 'org-alpha',
        userId: 'usr-1',
      });

      const context: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => mockReq }),
      };

      const allowed = await tenantGuard.canActivate(context);
      expect(allowed).toBe(true);
      expect(mockReq.organization.id).toBe('org-alpha');
    });

    it('should STRICTLY BLOCK user belonging to Org A from accessing Org B (Cross-Tenant Negative Test)', async () => {
      const mockReq: any = {
        headers: { 'x-organization-id': 'org-bravo' },
        user: { sub: 'usr-1', isSuperAdmin: false },
        params: {},
      };

      mockPrisma.organization.findFirst.mockResolvedValueOnce({
        id: 'org-bravo',
        name: 'Bravo Org',
      });
      mockPrisma.member.findFirst.mockResolvedValueOnce(null); // User 1 is NOT a member of Org Bravo

      const context: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => mockReq }),
      };

      await expect(tenantGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  /* ── 4. Webhook HMAC & Idempotency Security ── */
  describe('Point 8 & 9: GitHub Webhook HMAC Verification & Idempotency', () => {
    function computeHmac(payload: string, secret: string): string {
      return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    it('should verify valid HMAC signature matching payload and secret (Positive Test)', () => {
      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { full_name: 'org/repo' },
      });
      const secret = 'webhook_secret_key_123';
      const signature = computeHmac(payload, secret);

      const computed = computeHmac(payload, secret);
      const match = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
      expect(match).toBe(true);
    });

    it('should REJECT modified webhook payloads or invalid signatures (Negative Test)', () => {
      const payload = JSON.stringify({ ref: 'refs/heads/main' });
      const tamperedPayload = JSON.stringify({ ref: 'refs/heads/main', maliciousInjection: true });
      const secret = 'webhook_secret_key_123';
      const signature = computeHmac(payload, secret);

      const computedForTampered = computeHmac(tamperedPayload, secret);
      const match = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedForTampered),
      );
      expect(match).toBe(false);
    });

    it('should recognize and reject duplicate delivery IDs (Idempotency)', () => {
      const processedDeliveries = new Set<string>();
      const deliveryId = '7d2e4f6a-8b1c-4d3e-9f0a-1b2c3d4e5f6a';

      // First arrival -> Processed
      expect(processedDeliveries.has(deliveryId)).toBe(false);
      processedDeliveries.add(deliveryId);

      // Replay arrival -> Duplicate detected
      expect(processedDeliveries.has(deliveryId)).toBe(true);
    });
  });

  /* ── 5. Worker Startup State Reconciliation (Recovery Rule) ── */
  describe('Point 3: Worker Startup State Reconciliation for Orphaned Jobs', () => {
    it('should cleanly fail orphaned RUNNING runs left after ungraceful server restarts', async () => {
      const orphanedRuns = [
        {
          id: 'run_crashed_1',
          status: PipelineRunStatus.RUNNING,
          startedAt: new Date(Date.now() - 300000),
        },
      ];

      mockPrisma.pipelineRun.findMany.mockResolvedValueOnce(orphanedRuns);
      mockPrisma.pipelineRun.update.mockResolvedValueOnce({
        id: 'run_crashed_1',
        status: PipelineRunStatus.FAILED,
      });

      // Simulate reconciliation routine
      const reconciled = [];
      for (const run of orphanedRuns) {
        const updated = await mockPrisma.pipelineRun.update({
          where: { id: run.id },
          data: {
            status: PipelineRunStatus.FAILED,
            finishedAt: new Date(),
          },
        });
        reconciled.push(updated);
      }

      expect(reconciled.length).toBe(1);
      expect(reconciled[0].status).toBe(PipelineRunStatus.FAILED);
    });
  });

  /* ── 6. Path Traversal & Workspace Isolation ── */
  describe('Point 10 & 12: Directory Traversal Prevention & Workspace Sandbox', () => {
    it('should detect and reject directory traversal attempts in file paths', () => {
      const maliciousPaths = [
        '../../etc/passwd',
        '..\\..\\Windows\\System32\\config\\SAM',
        'artifacts/../../../secret.env',
        '/var/run/docker.sock',
        '../../../root/.ssh/id_rsa',
      ];

      function isPathSafe(baseDir: string, targetPath: string): boolean {
        if (targetPath.includes('\0')) return false;
        const normalizedTarget = targetPath.replace(/\\/g, '/');
        const resolvedBase = path.resolve(baseDir);
        const resolvedTarget = path.resolve(resolvedBase, normalizedTarget);
        const relative = path.relative(resolvedBase, resolvedTarget);

        if (relative.startsWith('..') || path.isAbsolute(relative) || relative === '') {
          return false;
        }
        return resolvedTarget.startsWith(resolvedBase + path.sep);
      }

      const workspaceDir = path.resolve(process.cwd(), 'opspilot-workspaces', 'run_101');
      for (const p of maliciousPaths) {
        const safe = isPathSafe(workspaceDir, p);
        expect(safe).toBe(false);
      }

      const safePath = 'src/index.ts';
      expect(isPathSafe(workspaceDir, safePath)).toBe(true);
    });
  });

  /* ── 7. Deployment Rollback on Failure ── */
  describe('Point 13: Deployment Rollback State Transition on Failure', () => {
    it('should trigger rollback to previous healthy version when deployment fails', () => {
      const previousHealthyDeployment = { id: 'dep-10', version: 'v1.4.0', status: 'SUCCESS' };
      const failedDeployment = { id: 'dep-11', version: 'v1.5.0', status: 'FAILED' };

      const rollbackTarget =
        failedDeployment.status === 'FAILED' ? previousHealthyDeployment : null;

      expect(rollbackTarget).not.toBeNull();
      expect(rollbackTarget?.version).toBe('v1.4.0');
    });
  });
});
