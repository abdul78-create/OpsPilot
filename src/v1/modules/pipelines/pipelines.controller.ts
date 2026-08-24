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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDefinitionDto } from './dto/create-pipeline-definition.dto';
import { CreatePipelineFromRepoDto } from './dto/create-pipeline-from-repo.dto';
import { UpdatePipelineDefinitionDto } from './dto/update-pipeline-definition.dto';
import { ValidatePipelineYamlDto } from './dto/validate-pipeline-yaml.dto';
import { PipelineDefinitionResponseDto } from './dto/pipeline-definition-response.dto';
import { PipelineVersionResponseDto } from './dto/pipeline-version-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { PipelinePermissions } from '@shared/constants/permissions.constants';

@ApiTags('Pipeline Definitions')
@ApiBearerAuth()
@Controller('projects/:projectId/pipelines')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post('validate-yaml')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({
    summary: 'Parse, validate, and resolve DAG execution plan for a pipeline YAML string',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compiled pipeline graph and validation results',
  })
  validateYaml(@Body() dto: ValidatePipelineYamlDto) {
    const result = this.pipelinesService.validateYaml(dto);
    return {
      message: result.valid
        ? 'Pipeline YAML parsed and compiled successfully'
        : 'Pipeline YAML contains validation errors',
      data: result,
    };
  }

  @Post('from-repo')
  @Permissions(PipelinePermissions.CREATE)
  @ApiOperation({ summary: 'Provision a new Pipeline Definition from connected Repository' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PipelineDefinitionResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Repository connection or Project not found',
  })
  async createFromRepo(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePipelineFromRepoDto,
  ) {
    const pipeline = await this.pipelinesService.createFromRepository(projectId, user.sub, dto);
    return {
      message: 'Pipeline definition successfully created from connected repository',
      data: pipeline,
    };
  }

  @Post()
  @Permissions(PipelinePermissions.CREATE)
  @ApiOperation({ summary: 'Provision a new Pipeline Definition & v1 Version' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PipelineDefinitionResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Pipeline slug already exists in Project',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid YAML configuration' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePipelineDefinitionDto,
  ) {
    const pipeline = await this.pipelinesService.create(projectId, user.sub, dto);
    return {
      message: 'Pipeline definition and initial v1 version successfully created',
      data: pipeline,
    };
  }

  @Get()
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'List all Pipeline Definitions for target Project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [PipelineDefinitionResponseDto] })
  async findAll(@Param('projectId') projectId: string) {
    const pipelines = await this.pipelinesService.findAll(projectId);
    return {
      message: 'Pipeline definitions retrieved successfully',
      data: pipelines,
    };
  }

  @Get(':id')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Retrieve Pipeline Definition details by ID or Slug' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Pipeline UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineDefinitionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pipeline not found' })
  async findOne(@Param('projectId') projectId: string, @Param('id') idOrSlug: string) {
    const pipeline = await this.pipelinesService.findByIdOrSlug(projectId, idOrSlug);
    return {
      message: 'Pipeline definition details retrieved',
      data: pipeline,
    };
  }

  @Get(':id/versions')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'List all immutable Pipeline Versions for Pipeline Definition' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Pipeline UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: [PipelineVersionResponseDto] })
  async findVersions(@Param('projectId') projectId: string, @Param('id') idOrSlug: string) {
    const versions = await this.pipelinesService.findVersions(projectId, idOrSlug);
    return {
      message: 'Pipeline versions history retrieved',
      data: versions,
    };
  }

  @Get(':id/versions/:versionNumber')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Retrieve specific immutable Pipeline Version details' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Pipeline UUID or Slug' })
  @ApiParam({ name: 'versionNumber', description: 'Version number integer (e.g. 1)' })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineVersionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pipeline version not found' })
  async findVersionByNumber(
    @Param('projectId') projectId: string,
    @Param('id') idOrSlug: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    const version = await this.pipelinesService.findVersionByNumber(
      projectId,
      idOrSlug,
      versionNumber,
    );
    return {
      message: 'Pipeline version details retrieved',
      data: version,
    };
  }

  @Patch(':id')
  @Permissions(PipelinePermissions.CREATE)
  @ApiOperation({
    summary: 'Update Pipeline Definition metadata (creates new immutable version if YAML changes)',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Pipeline UUID or Slug' })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineDefinitionResponseDto })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') idOrSlug: string,
    @Body() dto: UpdatePipelineDefinitionDto,
  ) {
    const pipeline = await this.pipelinesService.update(projectId, user.sub, idOrSlug, dto);
    return {
      message: 'Pipeline definition updated successfully',
      data: pipeline,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PipelinePermissions.DELETE)
  @ApiOperation({ summary: 'Soft-delete Pipeline Definition' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Pipeline UUID or Slug' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Pipeline definition soft-deleted' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('id') idOrSlug: string,
  ): Promise<void> {
    await this.pipelinesService.softDelete(projectId, user.sub, idOrSlug);
  }
}
