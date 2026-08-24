import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiKeysRepository } from './api-keys.repository';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKey } from '@prisma/client';
import * as crypto from 'crypto';

export interface CreatedApiKeyResult {
  apiKey: ApiKey;
  rawKey: string;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly apiKeysRepo: ApiKeysRepository) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResult> {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawKey = `opspilot_live_${rawSecret}`;
    const keyPrefix = `opspilot_live_${rawSecret.slice(0, 6)}...`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    let expiresAt: Date | null = null;
    if (dto.expiresInDays) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const scopes = dto.scopes && dto.scopes.length > 0 ? dto.scopes : ['read', 'write', 'deploy'];

    const apiKey = await this.apiKeysRepo.create({
      organization: { connect: { id: organizationId } },
      user: { connect: { id: userId } },
      name: dto.name,
      keyPrefix,
      keyHash,
      scopes,
      expiresAt,
      isRevoked: false,
    });

    this.logger.log(
      `Generated API Key [${dto.name}] prefix=${keyPrefix} for Org=${organizationId}`,
    );

    return {
      apiKey,
      rawKey,
    };
  }

  async list(organizationId: string): Promise<ApiKey[]> {
    return this.apiKeysRepo.findByOrganization(organizationId);
  }

  async getById(organizationId: string, id: string): Promise<ApiKey> {
    const key = await this.apiKeysRepo.findById(id);
    if (!key || key.organizationId !== organizationId) {
      throw new NotFoundException(`API Key '${id}' not found.`);
    }
    return key;
  }

  async revoke(organizationId: string, id: string): Promise<ApiKey> {
    const key = await this.getById(organizationId, id);
    return this.apiKeysRepo.update(key.id, {
      isRevoked: true,
    });
  }

  async validateKey(rawKey: string, requiredScope?: string): Promise<ApiKey> {
    if (!rawKey || !rawKey.startsWith('opspilot_live_')) {
      throw new UnauthorizedException('Invalid API Key format.');
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = await this.apiKeysRepo.findByKeyHash(keyHash);

    if (!key) {
      throw new UnauthorizedException('API Key not found or invalid.');
    }

    if (key.isRevoked) {
      throw new UnauthorizedException('API Key has been revoked.');
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedException('API Key has expired.');
    }

    if (
      requiredScope &&
      !key.scopes.includes(requiredScope) &&
      !key.scopes.includes('*') &&
      !key.scopes.includes('admin')
    ) {
      throw new ForbiddenException(`API Key lacks required '${requiredScope}' permission.`);
    }

    // Update last used asynchronously without blocking request
    this.apiKeysRepo.update(key.id, { lastUsedAt: new Date() }).catch((err) => {
      this.logger.warn(`Failed to update lastUsedAt for key ${key.id}: ${err.message}`);
    });

    return key;
  }
}
