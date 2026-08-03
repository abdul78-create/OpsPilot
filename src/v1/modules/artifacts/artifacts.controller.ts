import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ArtifactsService } from './artifacts.service';
import { RegisterArtifactDto } from './dto/register-artifact.dto';
import { ArtifactResponseDto } from './dto/artifact-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { PipelinePermissions } from '@shared/constants/permissions.constants';

@ApiTags('Artifacts')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('pipeline-runs/:runId/artifacts')
  @Permissions(PipelinePermissions.CREATE)
  @ApiOperation({ summary: 'Register a build artifact produced by a Pipeline Run' })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ArtifactResponseDto })
  async register(@Param('runId') runId: string, @Body() dto: RegisterArtifactDto) {
    const artifact = await this.artifactsService.register(runId, dto);
    return {
      message: 'Artifact registered successfully',
      data: artifact,
    };
  }

  @Get('pipeline-runs/:runId/artifacts')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'List all artifacts produced by a Pipeline Run' })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [ArtifactResponseDto] })
  async findByRun(@Param('runId') runId: string) {
    const artifacts = await this.artifactsService.findByPipelineRun(runId);
    return {
      message: 'Pipeline run artifacts retrieved successfully',
      data: artifacts,
    };
  }

  @Get('artifacts/:id')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Retrieve artifact metadata by ID' })
  @ApiParam({ name: 'id', description: 'Artifact UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: ArtifactResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Artifact not found' })
  async findOne(@Param('id') artifactId: string) {
    const artifact = await this.artifactsService.findById(artifactId);
    return {
      message: 'Artifact details retrieved',
      data: artifact,
    };
  }

  @Get('artifacts/:id/download')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Download build artifact file archive' })
  @ApiParam({ name: 'id', description: 'Artifact UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Binary stream download' })
  async download(@Param('id') artifactId: string, @Res() res: Response) {
    const { stream, filename, contentType, sizeBytes } =
      await this.artifactsService.getDownloadStream(artifactId);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', sizeBytes);
    stream.pipe(res);
  }

  @Delete('artifacts/:id')
  @Permissions(PipelinePermissions.DELETE)
  @ApiOperation({ summary: 'Soft-delete an artifact' })
  @ApiParam({ name: 'id', description: 'Artifact UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: ArtifactResponseDto })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') artifactId: string) {
    const artifact = await this.artifactsService.delete(artifactId, user.sub);
    return {
      message: 'Artifact deleted successfully',
      data: artifact,
    };
  }
}
