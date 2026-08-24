import { Controller, Get, Param, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get('organizations/:organizationId/audit-logs')
  @ApiOperation({
    summary: 'Query immutable audit logs with tenant isolation, filtering and pagination',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'EXECUTE',
      'APPROVE',
      'REJECT',
      'ROTATE',
      'REVEAL',
      'ROLLBACK',
    ],
  })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'resourceId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO 8601 date-time' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO 8601 date-time' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Results per page (default: 50, max: 100)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated audit log records returned' })
  async query(@Param('organizationId') organizationId: string, @Query() dto: QueryAuditLogsDto) {
    const result = await this.auditLogsService.query(organizationId, dto);
    return {
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('organizations/:organizationId/audit-logs/:id')
  @ApiOperation({ summary: 'Get a single audit log record by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audit log record returned' })
  async getById(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    const log = await this.auditLogsService.getById(organizationId, id);
    return {
      data: log,
    };
  }
}
