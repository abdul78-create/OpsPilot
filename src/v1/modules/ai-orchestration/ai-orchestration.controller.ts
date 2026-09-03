import { Controller, Get, Post, Param, Query, Body, UseGuards, HttpStatus } from '@nestjs/common';
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

  @Get('ai/status')
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({
    summary: 'Retrieve AI Provider status, model information, and active capabilities',
  })
  async getAiStatus() {
    const status = await this.aiService.getAiStatus();
    return {
      message: 'AI status retrieved',
      data: status,
    };
  }

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

  @Post('ai/optimize-pipeline/:pipelineId')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Calculate AI Pipeline Optimization recommendations' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AiReportResponseDto })
  async optimizePipeline(@Param('pipelineId') pipelineId: string) {
    const report = await this.aiService.optimizePipeline(pipelineId);
    return {
      message: 'AI Pipeline Optimization completed',
      data: report,
    };
  }

  @Post('ai/audit-security/:targetId')
  @Permissions(PipelinePermissions.READ)
  @ApiOperation({ summary: 'Perform AI Security Audit on pipeline or run' })
  @ApiParam({ name: 'targetId', description: 'Pipeline or Run UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AiReportResponseDto })
  async auditSecurity(@Param('targetId') targetId: string) {
    const report = await this.aiService.auditSecurity(targetId);
    return {
      message: 'AI Security Audit completed',
      data: report,
    };
  }

  @Post('ai/query')
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({ summary: 'Context-aware AI assistance query' })
  async queryAi(
    @Body()
    body: {
      workspace: string;
      projectId?: string;
      pipelineId?: string;
      runId?: string;
      deploymentId?: string;
      question: string;
    },
  ) {
    const response = await this.aiService.queryAi(body);
    return {
      message: 'AI response generated',
      data: response,
    };
  }

  @Post('ai/generate-pipeline')
  @Permissions(PipelinePermissions.TRIGGER)
  @ApiOperation({ summary: 'Generate structured pipeline DAG from prompt' })
  async generatePipeline(@Body() body: { prompt: string }) {
    const result = await this.aiService.generatePipeline(body.prompt);
    return {
      message: 'Pipeline specification generated successfully',
      data: result,
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

  @Post('ai/apply-fix/:id')
  @Permissions(PipelinePermissions.TRIGGER)
  @ApiOperation({ summary: 'Prepare an isolated fix branch proposal from AI RCA recommendations' })
  @ApiParam({ name: 'id', description: 'AI Report UUID' })
  @ApiResponse({ status: HttpStatus.OK })
  async applyFix(@Param('id') id: string) {
    const result = await this.aiService.applyFix(id);
    return {
      message: 'AI fix proposal prepared on isolated branch',
      data: result,
    };
  }
}
