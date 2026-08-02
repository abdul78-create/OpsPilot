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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { ProjectPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('organizations/:orgId/projects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Permissions(ProjectPermissions.CREATE)
  @ApiOperation({ summary: 'Provision a new Project and default environments' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProjectResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Project slug already exists in Organization',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('orgId') orgId: string,
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(orgId, user.sub, dto);
    return {
      message: 'Project successfully created with default environments',
      data: project,
    };
  }

  @Get()
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'List all active Projects for target Organization' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProjectResponseDto] })
  async findAll(@Param('orgId') orgId: string) {
    const projects = await this.projectsService.findAll(orgId);
    return {
      message: 'Projects retrieved successfully',
      data: projects,
    };
  }

  @Get(':id')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'Retrieve Project details by ID or Slug' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'id', description: 'Project UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Project not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') idOrSlug: string) {
    const project = await this.projectsService.findByIdOrSlug(orgId, idOrSlug);
    return {
      message: 'Project details retrieved',
      data: project,
    };
  }

  @Patch(':id')
  @Permissions(ProjectPermissions.UPDATE)
  @ApiOperation({ summary: 'Update Project metadata' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'id', description: 'Project UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: ProjectResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('orgId') orgId: string,
    @Param('id') idOrSlug: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(orgId, user.sub, idOrSlug, dto);
    return {
      message: 'Project metadata updated',
      data: project,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(ProjectPermissions.DELETE)
  @ApiOperation({ summary: 'Soft-delete Project' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID or Slug' })
  @ApiParam({ name: 'id', description: 'Project UUID or Slug' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Project soft-deleted' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('orgId') orgId: string,
    @Param('id') idOrSlug: string,
  ): Promise<void> {
    await this.projectsService.softDelete(orgId, user.sub, idOrSlug);
  }
}
