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
import { RepositoriesService } from './repositories.service';
import { CreateRepositoryConnectionDto } from './dto/create-repository-connection.dto';
import { UpdateRepositoryConnectionDto } from './dto/update-repository-connection.dto';
import { RepositoryConnectionResponseDto } from './dto/repository-connection-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { ProjectPermissions } from '@shared/constants/permissions.constants';

import { parseGitHubUrl } from './providers/github-repository.provider';
import { GitHubAppService } from './services/github-app.service';

@ApiTags('Repository Connections')
@ApiBearerAuth()
@Controller('projects/:projectId/repositories')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly githubAppService: GitHubAppService,
  ) {}

  @Post('github/user-repos')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'Fetch user repositories from GitHub REST API' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async listUserRepositories(@Body() body: { accessToken?: string }) {
    const repos = await this.githubAppService.listUserRepositories(body.accessToken);
    return {
      message: 'GitHub user repositories retrieved successfully',
      data: repos,
    };
  }

  @Post()
  @Permissions(ProjectPermissions.CREATE)
  @ApiOperation({ summary: 'Connect a Git Repository to target Project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RepositoryConnectionResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Repository URL already connected to Project',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateRepositoryConnectionDto,
  ) {
    const repo = await this.repositoriesService.create(projectId, user.sub, dto);
    return {
      message: 'Repository connection successfully established',
      data: repo,
    };
  }

  @Get()
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'List all Repository Connections for target Project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [RepositoryConnectionResponseDto] })
  async findAll(@Param('projectId') projectId: string) {
    const repos = await this.repositoriesService.findAll(projectId);
    return {
      message: 'Repository connections retrieved successfully',
      data: repos,
    };
  }

  @Get(':id')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'Retrieve Repository Connection details by ID' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: RepositoryConnectionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Repository connection not found' })
  async findOne(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    return {
      message: 'Repository connection details retrieved',
      data: repo,
    };
  }

  @Patch(':id')
  @Permissions(ProjectPermissions.UPDATE)
  @ApiOperation({ summary: 'Update Repository Connection metadata' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: RepositoryConnectionResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
    @Body() dto: UpdateRepositoryConnectionDto,
  ) {
    const repo = await this.repositoriesService.update(
      projectId,
      user.sub,
      repositoryConnectionId,
      dto,
    );
    return {
      message: 'Repository connection details updated',
      data: repo,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(ProjectPermissions.DELETE)
  @ApiOperation({ summary: 'Disconnect Repository and cleanup webhooks' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Repository connection soft-deleted' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
  ): Promise<void> {
    await this.repositoriesService.softDelete(projectId, user.sub, repositoryConnectionId);
  }

  @Get(':id/branches')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'List GitHub branches for connected Repository' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  async getBranches(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    const parsed = parseGitHubUrl(repo.repositoryUrl);
    const owner = parsed?.owner || 'opspilot';
    const repoName = parsed?.repo || 'app';
    const branches = await this.githubAppService.listBranches(owner, repoName);
    return {
      message: 'Repository branches retrieved successfully',
      data: branches,
    };
  }

  @Get(':id/commits')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'List GitHub commit history for connected Repository' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  async getCommits(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    const parsed = parseGitHubUrl(repo.repositoryUrl);
    const owner = parsed?.owner || 'opspilot';
    const repoName = parsed?.repo || 'app';
    const commits = await this.githubAppService.listCommits(
      owner,
      repoName,
      repo.defaultBranch || 'main',
    );
    return {
      message: 'Repository commits retrieved successfully',
      data: commits,
    };
  }

  @Get(':id/tree')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'Browse GitHub file tree and directory contents' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  async getTree(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
    @Body() body: { path?: string; ref?: string },
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    const parsed = parseGitHubUrl(repo.repositoryUrl);
    const owner = parsed?.owner || 'opspilot';
    const repoName = parsed?.repo || 'app';
    const items = await this.githubAppService.getRepositoryTree(
      owner,
      repoName,
      body?.path || '',
      body?.ref || repo.defaultBranch || 'main',
    );
    return {
      message: 'Repository file tree retrieved successfully',
      data: items,
    };
  }

  @Get(':id/file')
  @Permissions(ProjectPermissions.READ)
  @ApiOperation({ summary: 'Retrieve decoded GitHub file contents for code viewer' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  async getFile(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
    @Body() body: { path: string; ref?: string },
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    const parsed = parseGitHubUrl(repo.repositoryUrl);
    const owner = parsed?.owner || 'opspilot';
    const repoName = parsed?.repo || 'app';
    const file = await this.githubAppService.getFileContent(
      owner,
      repoName,
      body?.path || 'package.json',
      body?.ref || repo.defaultBranch || 'main',
    );
    return {
      message: 'Repository file content retrieved',
      data: file,
    };
  }

  @Post(':id/dispatch')
  @Permissions(ProjectPermissions.UPDATE)
  @ApiOperation({ summary: 'Trigger manual GitHub workflow dispatch' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Repository Connection UUID' })
  async dispatchWorkflow(
    @Param('projectId') projectId: string,
    @Param('id') repositoryConnectionId: string,
    @Body() body: { eventType?: string; payload?: Record<string, unknown> },
  ) {
    const repo = await this.repositoriesService.findById(projectId, repositoryConnectionId);
    const parsed = parseGitHubUrl(repo.repositoryUrl);
    const owner = parsed?.owner || 'opspilot';
    const repoName = parsed?.repo || 'app';
    const result = await this.githubAppService.dispatchWorkflow(
      owner,
      repoName,
      body.eventType || 'manual_build',
      body.payload,
    );
    return {
      message: 'Workflow dispatch event triggered',
      data: result,
    };
  }
}
