import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import {
  ISecretEncryptionProvider,
  EncryptedPayload,
  DecryptPayload,
} from './secret-encryption-provider.interface';

@Injectable()
export class AesSecretEncryptionService implements ISecretEncryptionProvider {
  private readonly algorithm = 'aes-256-gcm';
  private readonly currentKeyVersion = 1;
  private readonly masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawSecret =
      this.configService.get<string>('SECRET_ENCRYPTION_KEY') ||
      'opspilot-ai-default-master-encryption-key-32bytes';

    // Derive 256-bit Buffer key via SHA-256
    this.masterKey = createHash('sha256').update(rawSecret).digest();
  }

  getCurrentKeyVersion(): number {
    return this.currentKeyVersion;
  }

  async encrypt(plainText: string): Promise<EncryptedPayload> {
    try {
      const iv = randomBytes(12); // 96-bit IV for GCM
      const cipher = createCipheriv(this.algorithm, this.masterKey, iv);

      const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

      const authTag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        keyVersion: this.currentKeyVersion,
        algorithm: this.algorithm,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to encrypt secret payload: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async decrypt(payload: DecryptPayload): Promise<string> {
    try {
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const encryptedText = Buffer.from(payload.encryptedValue, 'hex');

      const decipher = createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);

      return decrypted.toString('utf8');
    } catch {
      throw new BadRequestException(
        'Decryption failed: Tampered IV, authTag, or invalid key payload',
      );
    }
  }

  async rotateKey(payload: DecryptPayload, targetVersion: number): Promise<EncryptedPayload> {
    const plainText = await this.decrypt(payload);
    const reEncrypted = await this.encrypt(plainText);

    return {
      ...reEncrypted,
      keyVersion: targetVersion,
    };
  }
}
