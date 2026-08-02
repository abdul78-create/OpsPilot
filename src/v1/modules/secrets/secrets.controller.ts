import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';
import { SecretResponseDto } from './dto/secret-response.dto';
import { RevealSecretResponseDto } from './dto/reveal-secret-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { SecretPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Secrets')
@ApiBearerAuth()
@Controller('environments/:environmentId/secrets')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  @Permissions(SecretPermissions.CREATE)
  @ApiOperation({ summary: 'Create and encrypt a Secret for target Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SecretResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Secret key already exists in Environment',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Body() dto: CreateSecretDto,
  ) {
    const secret = await this.secretsService.create(environmentId, user.sub, dto);
    return {
      message: 'Secret successfully encrypted and stored',
      data: secret,
    };
  }

  @Get()
  @Permissions(SecretPermissions.READ)
  @ApiOperation({ summary: 'List all Secrets (Masked Metadata Only) for target Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [SecretResponseDto] })
  async findAll(@Param('environmentId') environmentId: string) {
    const secrets = await this.secretsService.findAll(environmentId);
    return {
      message: 'Secrets metadata list retrieved successfully',
      data: secrets,
    };
  }

  @Get(':id')
  @Permissions(SecretPermissions.READ)
  @ApiOperation({ summary: 'Retrieve Secret metadata (Plaintext Masked)' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Secret UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SecretResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Secret not found' })
  async findOne(@Param('environmentId') environmentId: string, @Param('id') secretId: string) {
    const secret = await this.secretsService.findByIdMasked(environmentId, secretId);
    return {
      message: 'Secret metadata retrieved',
      data: secret,
    };
  }

  @Post(':id/reveal')
  @Permissions(SecretPermissions.REVEAL)
  @ApiOperation({ summary: 'Decrypt and reveal Secret plaintext value (Audited)' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Secret UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: RevealSecretResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient reveal permissions' })
  async reveal(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') secretId: string,
  ) {
    const revealed = await this.secretsService.revealSecret(environmentId, user.sub, secretId);
    return {
      message: 'Secret plaintext revealed',
      data: revealed,
    };
  }

  @Post(':id/rotate')
  @Permissions(SecretPermissions.ROTATE)
  @ApiOperation({ summary: 'Re-encrypt Secret using current active master key version' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Secret UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SecretResponseDto })
  async rotate(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') secretId: string,
  ) {
    const secret = await this.secretsService.rotateSecret(environmentId, user.sub, secretId);
    return {
      message: 'Secret successfully re-encrypted under active key version',
      data: secret,
    };
  }

  @Patch(':id')
  @Permissions(SecretPermissions.UPDATE)
  @ApiOperation({ summary: 'Update Secret value (Re-encrypts payload)' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Secret UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SecretResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') secretId: string,
    @Body() dto: UpdateSecretDto,
  ) {
    const secret = await this.secretsService.update(environmentId, user.sub, secretId, dto);
    return {
      message: 'Secret value updated and re-encrypted',
      data: secret,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(SecretPermissions.DELETE)
  @ApiOperation({ summary: 'Soft-delete Secret entry' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiParam({ name: 'id', description: 'Secret UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Secret soft-deleted' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Param('id') secretId: string,
  ): Promise<void> {
    await this.secretsService.softDelete(environmentId, user.sub, secretId);
  }
}
