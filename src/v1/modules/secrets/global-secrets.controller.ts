import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SecretsService } from './secrets.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { SecretPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Secrets')
@ApiBearerAuth()
@Controller('secrets')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class GlobalSecretsController {
  constructor(
    private readonly secretsService: SecretsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Permissions(SecretPermissions.READ)
  @ApiOperation({
    summary: 'List all Secrets (Masked) across Organization or specified Environment',
  })
  async findAllGlobal(
    @Headers('x-organization-id') orgId: string,
    @Query('environmentId') environmentId?: string,
  ) {
    if (environmentId) {
      const secrets = await this.secretsService.findAll(environmentId);
      return {
        message: 'Secrets metadata list retrieved successfully',
        data: secrets,
      };
    }
    const secrets = await this.secretsService.findAllByOrganization(orgId);
    return {
      message: 'Secrets metadata list retrieved successfully',
      data: secrets,
    };
  }

  @Post()
  @Permissions(SecretPermissions.CREATE)
  @ApiOperation({ summary: 'Create and encrypt Secret for active Environment' })
  async createGlobal(
    @CurrentUser() user: JwtPayload,
    @Headers('x-organization-id') orgId: string,
    @Body() dto: CreateSecretDto & { environmentId?: string },
  ) {
    let targetEnvId = dto.environmentId;
    if (!targetEnvId) {
      const env = await this.prisma.environment.findFirst({
        where: {
          project: { organizationId: orgId, deletedAt: null },
          deletedAt: null,
        },
      });
      if (!env) {
        throw new NotFoundException('No active environment found for organization to store secret');
      }
      targetEnvId = env.id;
    }
    const secret = await this.secretsService.create(targetEnvId, user.sub, dto);
    return {
      message: 'Secret successfully encrypted and stored',
      data: secret,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(SecretPermissions.DELETE)
  @ApiOperation({ summary: 'Delete a Secret by ID' })
  async deleteGlobal(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.secretsService.deleteDirect(user.sub, id);
  }
}
