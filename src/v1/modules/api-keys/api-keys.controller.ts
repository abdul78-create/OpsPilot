import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';

@ApiTags('API Keys & Service Accounts')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('organizations/:organizationId/api-keys')
  @ApiOperation({ summary: 'Generate a new cryptographically secure API key / CI Service Token' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API Key generated. Secret rawKey returned only once.',
  })
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.apiKeysService.create(organizationId, user.sub, dto);
    return {
      message:
        'API Key generated successfully. Securely save rawKey as it cannot be retrieved again.',
      data: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        rawKey: result.rawKey,
        scopes: result.apiKey.scopes,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt,
      },
    };
  }

  @Get('organizations/:organizationId/api-keys')
  @ApiOperation({ summary: 'List all active and revoked API keys for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  async list(@Param('organizationId') organizationId: string) {
    const keys = await this.apiKeysService.list(organizationId);
    return {
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        scopes: k.scopes,
        isRevoked: k.isRevoked,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    };
  }

  @Delete('organizations/:organizationId/api-keys/:id')
  @ApiOperation({ summary: 'Revoke an API key immediately' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'id', description: 'API Key UUID' })
  async revoke(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    const revoked = await this.apiKeysService.revoke(organizationId, id);
    return {
      message: `API Key '${revoked.name}' revoked successfully`,
      data: {
        id: revoked.id,
        isRevoked: revoked.isRevoked,
      },
    };
  }
}
