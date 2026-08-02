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
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { EnvironmentResponseDto } from './dto/environment-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';

@ApiTags('Environments')
@ApiBearerAuth()
@Controller('projects/:projectId/environments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class EnvironmentsController {
  constructor(private readonly envsService: EnvironmentsService) {}

  @Post()
  @Permissions('env:create')
  @ApiOperation({ summary: 'Provision a custom Environment for target Project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: EnvironmentResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Environment slug already exists in Project',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    const env = await this.envsService.create(projectId, user.sub, dto);
    return {
      message: 'Environment successfully created',
      data: env,
    };
  }

  @Get()
  @Permissions('env:read')
  @ApiOperation({ summary: 'List all Environments for target Project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [EnvironmentResponseDto] })
  async findAll(@Param('projectId') projectId: string) {
    const envs = await this.envsService.findAll(projectId);
    return {
      message: 'Environments retrieved successfully',
      data: envs,
    };
  }

  @Get(':id')
  @Permissions('env:read')
  @ApiOperation({ summary: 'Retrieve Environment details by ID or Slug' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Environment UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: EnvironmentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Environment not found' })
  async findOne(@Param('projectId') projectId: string, @Param('id') idOrSlug: string) {
    const env = await this.envsService.findByIdOrSlug(projectId, idOrSlug);
    return {
      message: 'Environment details retrieved',
      data: env,
    };
  }

  @Patch(':id')
  @Permissions('env:update')
  @ApiOperation({ summary: 'Update Environment metadata and protection rules' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Environment UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: EnvironmentResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') idOrSlug: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    const env = await this.envsService.update(projectId, user.sub, idOrSlug, dto);
    return {
      message: 'Environment details and protection rules updated',
      data: env,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('env:delete')
  @ApiOperation({ summary: 'Soft-delete custom Environment' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Environment UUID or Slug' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Environment soft-deleted' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Core default environments cannot be deleted',
  })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') idOrSlug: string,
  ): Promise<void> {
    await this.envsService.softDelete(projectId, user.sub, idOrSlug);
  }
}
