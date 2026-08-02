import { Controller, Get, Post, Param, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiReportResponseDto } from './dto/ai-report-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import {
  PipelinePermissions,
  OrganizationPermissions,
} from '@shared/constants/permissions.constants';

@ApiTags('AI Orchestration')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AiOrchestrationController {
  constructor(private readonly aiService: AiOrchestrationService) {}

  @Post('ai/analyze-run/:runId')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Trigger AI Root Cause Analysis (RCA) on a failed Pipeline Run' })
  @ApiParam({ name: 'runId', description: 'Pipeline Run UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AiReportResponseDto })
  async analyzeRunFailure(@Param('runId') runId: string) {
    const report = await this.aiService.analyzeRunFailure(runId);
    return {
      message: 'AI Root Cause Analysis completed successfully',
      data: report,
    };
  }

  @Post('ai/score-deployment/:deploymentId')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Calculate AI Deployment Risk Score before release' })
  @ApiParam({ name: 'deploymentId', description: 'Deployment UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AiReportResponseDto })
  async scoreDeploymentRisk(@Param('deploymentId') deploymentId: string) {
    const report = await this.aiService.scoreDeploymentRisk(deploymentId);
    return {
      message: 'AI Deployment Risk Evaluation completed',
      data: report,
    };
  }

  @Get('organizations/:orgId/ai-reports')
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({ summary: 'List AI Analysis Reports for target Organization' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by analysis type (RUN_RCA, DEPLOYMENT_RISK, etc.)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: [AiReportResponseDto] })
  async findByOrganization(@Param('orgId') orgId: string, @Query('type') type?: string) {
    const reports = await this.aiService.findByOrganization(orgId, type);
    return {
      message: 'AI Analysis Reports retrieved successfully',
      data: reports,
    };
  }

  @Get('ai-reports/:id')
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({ summary: 'Retrieve specific AI Analysis Report details' })
  @ApiParam({ name: 'id', description: 'AI Report UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: AiReportResponseDto })
  async findOne(@Param('id') id: string) {
    const report = await this.aiService.findById(id);
    return {
      message: 'AI Analysis Report retrieved successfully',
      data: report,
    };
  }
}
