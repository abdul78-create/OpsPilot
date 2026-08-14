import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RunsService } from './runs.service';
import { TriggerPipelineRunDto } from './dto/trigger-pipeline-run.dto';
import { PipelineRunResponseDto } from './dto/pipeline-run-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { PipelinePermissions } from '@shared/constants/permissions.constants';

@ApiTags('Pipeline Runs')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post('pipelines/:pipelineId/runs')
  @Post('projects/:projectId/pipelines/:pipelineId/runs')
  @Permissions(PipelinePermissions.TRIGGER)
  @ApiOperation({ summary: 'Trigger a new Pipeline Run execution' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline Definition UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PipelineRunResponseDto })
  async trigger(
    @CurrentUser() user: JwtPayload,
    @Param('pipelineId') pipelineId: string,
    @Body() dto: TriggerPipelineRunDto,
  ) {
    const run = await this.runsService.triggerRun(pipelineId, user.sub, dto);
    return {
      message: 'Pipeline execution queued successfully',
      data: run,
    };
  }

  @Get('pipelines/:pipelineId/runs')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'List execution run history for target Pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline Definition UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [PipelineRunResponseDto] })
  async findAll(@Param('pipelineId') pipelineId: string) {
    const runs = await this.runsService.findAll(pipelineId);
    return {
      message: 'Pipeline run execution history retrieved successfully',
      data: runs,
    };
  }

  @Get('runs/:id')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Retrieve Pipeline Run execution details and job nodes' })
  @ApiParam({ name: 'id', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineRunResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Pipeline run not found' })
  async findOne(@Param('id') runId: string) {
    const run = await this.runsService.findById(runId);
    return {
      message: 'Pipeline run details retrieved',
      data: run,
    };
  }

  @Post('runs/:id/cancel')
  @Permissions(PipelinePermissions.CANCEL)
  @ApiOperation({ summary: 'Cancel an active Pipeline Run execution' })
  @ApiParam({ name: 'id', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: PipelineRunResponseDto })
  async cancel(@CurrentUser() user: JwtPayload, @Param('id') runId: string) {
    const run = await this.runsService.cancelRun(runId, user.sub);
    return {
      message: 'Pipeline run cancelled successfully',
      data: run,
    };
  }
}
