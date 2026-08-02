import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';

@Injectable()
export class HashService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(hash: string, plainText: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  hashSha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}
