import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AesSecretEncryptionService } from './aes-secret-encryption.service';

describe('AesSecretEncryptionService', () => {
  let service: AesSecretEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AesSecretEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-32-byte-master-encryption-key!'),
          },
        },
      ],
    }).compile();

    service = module.get<AesSecretEncryptionService>(AesSecretEncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully encrypt and decrypt a plaintext payload (round-trip)', async () => {
    const plainText = 'SuperSecretDbPassword123!';
    const encrypted = await service.encrypt(plainText);

    expect(encrypted.encryptedValue).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.keyVersion).toBe(1);

    const decrypted = await service.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should reject tampered authentication tags during decryption', async () => {
    const plainText = 'SensitiveKey';
    const encrypted = await service.encrypt(plainText);

    // Tamper with authTag
    const tamperedTag = '00' + encrypted.authTag.substring(2);

    await expect(
      service.decrypt({
        ...encrypted,
        authTag: tamperedTag,
      }),
    ).rejects.toThrow('Decryption failed');
  });

  it('should rotate key and preserve plaintext value', async () => {
    const plainText = 'RotateMeSecret';
    const encrypted = await service.encrypt(plainText);

    const rotated = await service.rotateKey(encrypted, 2);
    expect(rotated.keyVersion).toBe(2);

    const decrypted = await service.decrypt(rotated);
    expect(decrypted).toBe(plainText);
  });
});
