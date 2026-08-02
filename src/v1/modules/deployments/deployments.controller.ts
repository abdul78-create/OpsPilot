import { Controller, Get, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { ApproveDeploymentDto } from './dto/approve-deployment.dto';
import { RollbackDeploymentDto } from './dto/rollback-deployment.dto';
import { DeploymentResponseDto } from './dto/deployment-response.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../core/security/decorators/permissions.decorator';
import { CurrentUser } from '../../../core/security/decorators/current-user.decorator';
import { JwtPayload } from '../../../core/security/token.service';
import { EnvironmentPermissions } from '@shared/constants/permissions.constants';
import { OrgRole } from '@prisma/client';

type JwtPayloadWithRole = JwtPayload & { role?: OrgRole };

@ApiTags('Deployments')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('environments/:environmentId/deployments')
  @Permissions(EnvironmentPermissions.DEPLOY)
  @ApiOperation({ summary: 'Trigger a new Deployment Release for target Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DeploymentResponseDto })
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('environmentId') environmentId: string,
    @Body() dto: CreateDeploymentDto,
  ) {
    const deployment = await this.deploymentsService.createDeployment(environmentId, user.sub, dto);
    return {
      message: 'Deployment release triggered successfully',
      data: deployment,
    };
  }

  @Get('environments/:environmentId/deployments')
  @Permissions(EnvironmentPermissions.READ)
  @ApiOperation({ summary: 'List all Deployment Releases for target Environment' })
  @ApiParam({ name: 'environmentId', description: 'Environment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [DeploymentResponseDto] })
  async findAll(@Param('environmentId') environmentId: string) {
    const deployments = await this.deploymentsService.findAll(environmentId);
    return {
      message: 'Environment deployments retrieved successfully',
      data: deployments,
    };
  }

  @Get('deployments/:id')
  @Permissions(EnvironmentPermissions.READ)
  @ApiOperation({ summary: 'Retrieve Deployment Release details and approval history' })
  @ApiParam({ name: 'id', description: 'Deployment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: DeploymentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Deployment not found' })
  async findOne(@Param('id') deploymentId: string) {
    const deployment = await this.deploymentsService.findById(deploymentId);
    return {
      message: 'Deployment details retrieved',
      data: deployment,
    };
  }

  @Post('deployments/:id/approve')
  @Permissions(EnvironmentPermissions.DEPLOY)
  @ApiOperation({ summary: 'Sign off or reject a pending Deployment Approval Gate' })
  @ApiParam({ name: 'id', description: 'Deployment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: DeploymentResponseDto })
  async approve(
    @CurrentUser() user: JwtPayloadWithRole,
    @Param('id') deploymentId: string,
    @Body() dto: ApproveDeploymentDto,
  ) {
    const userRole = user.role || OrgRole.ADMIN;
    const deployment = await this.deploymentsService.approveDeployment(
      deploymentId,
      user.sub,
      userRole,
      dto,
    );
    return {
      message: 'Deployment approval sign-off recorded',
      data: deployment,
    };
  }

  @Post('deployments/:id/rollback')
  @Permissions(EnvironmentPermissions.DEPLOY)
  @ApiOperation({ summary: 'Execute an automated or manual Rollback to a previous release' })
  @ApiParam({ name: 'id', description: 'Deployment UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: DeploymentResponseDto })
  async rollback(
    @CurrentUser() user: JwtPayload,
    @Param('id') deploymentId: string,
    @Body() dto: RollbackDeploymentDto,
  ) {
    const deployment = await this.deploymentsService.rollbackDeployment(
      deploymentId,
      user.sub,
      dto,
    );
    return {
      message: 'Deployment rollback executed successfully',
      data: deployment,
    };
  }
}
