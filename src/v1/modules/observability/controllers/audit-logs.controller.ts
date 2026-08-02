import { Controller, Get, Param, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditLogsService } from '../services/audit-logs.service';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { JwtAuthGuard } from '../../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../../core/security/decorators/permissions.decorator';
import { OrganizationPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Observability — Audit Logs')
@ApiBearerAuth()
@Controller('organizations/:orgId/audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({ summary: 'List audit trail for target Organization' })
  @ApiParam({ name: 'orgId', description: 'Organization UUID' })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filter by action type (CREATE, UPDATE, DELETE, etc.)',
  })
  @ApiQuery({
    name: 'resourceType',
    required: false,
    description: 'Filter by resource type (Project, Secret, etc.)',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by User UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: [AuditLogResponseDto] })
  async findAll(
    @Param('orgId') orgId: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('userId') userId?: string,
  ) {
    const logs = await this.auditLogsService.findOrganizationAuditLogs(orgId, {
      action,
      resourceType,
      userId,
    });
    return {
      message: 'Organization audit trail retrieved successfully',
      data: logs,
    };
  }
}
