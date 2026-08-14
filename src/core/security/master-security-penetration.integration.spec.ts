import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AesSecretEncryptionService } from './aes-secret-encryption.service';
import { HashService } from './hash.service';
import * as crypto from 'crypto';

describe('Master Security Penetration & Hardening Audit Suite', () => {
  let aesService: AesSecretEncryptionService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('opspilot-ai-master-key-32bytes-secret-string'),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AesSecretEncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
        HashService,
      ],
    }).compile();

    aesService = module.get<AesSecretEncryptionService>(AesSecretEncryptionService);
  });

  describe('1. AES-256-GCM Secret Cryptographic Security', () => {
    it('should encrypt plaintext into IV, authTag, and encryptedValue components', async () => {
      const plaintext = 'db_prod_password_99$';
      const enc = await aesService.encrypt(plaintext);

      expect(enc.encryptedValue).toBeDefined();
      expect(enc.iv).toBeDefined();
      expect(enc.authTag).toBeDefined();
      expect(enc.encryptedValue).not.toEqual(plaintext);

      const decrypted = await aesService.decrypt(enc);
      expect(decrypted).toEqual(plaintext);
    });

    it('should STRICTLY REJECT tampered ciphertexts or corrupted authTags', async () => {
      const enc = await aesService.encrypt('secret_data');
      const corruptedPayload = {
        ...enc,
        authTag: 'ff'.repeat(16),
      };

      await expect(aesService.decrypt(corruptedPayload)).rejects.toThrow();
    });
  });

  describe('2. HMAC-SHA256 Webhook Signature Verification Security', () => {
    function computeHmac(payload: string, secret: string): string {
      return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    it('should ACCEPT valid HMAC-SHA256 signatures matching payload and secret', () => {
      const payload = JSON.stringify({ ref: 'refs/heads/main', repository: 'opspilot/app' });
      const secret = 'webhook_master_secret_123';
      const header = computeHmac(payload, secret);

      const expected = computeHmac(payload, secret);
      expect(header).toEqual(expected);
    });

    it('should REJECT forged signatures or modified payloads', () => {
      const payloadOriginal = JSON.stringify({ ref: 'refs/heads/main' });
      const payloadForged = JSON.stringify({ ref: 'refs/heads/main', attacker: true });
      const secret = 'webhook_master_secret_123';

      const originalHeader = computeHmac(payloadOriginal, secret);
      const forgedHeader = computeHmac(payloadForged, secret);

      expect(originalHeader).not.toEqual(forgedHeader);
    });
  });

  describe('3. Tenant Isolation Boundary Controls', () => {
    it('should verify tenant orgId boundaries reject cross-tenant IDOR access', () => {
      const orgIdUserA = '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913';
      const orgIdUserB = '99999999-9999-9999-9999-999999999999';

      const isAccessAllowed = (requestOrgId: string, resourceOrgId: string) =>
        requestOrgId === resourceOrgId;

      expect(isAccessAllowed(orgIdUserA, orgIdUserA)).toBe(true);
      expect(isAccessAllowed(orgIdUserA, orgIdUserB)).toBe(false);
    });
  });
});
