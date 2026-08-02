import { Controller, Get, UseGuards, HttpStatus, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../../core/security/decorators/public.decorator';
import { MetricsService } from '../services/metrics.service';
import { SystemMetricsResponseDto } from '../dto/system-metrics-response.dto';
import { JwtAuthGuard } from '../../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../core/security/guards/tenant.guard';
import { PermissionsGuard } from '../../../../core/security/guards/permissions.guard';
import { Permissions } from '../../../../core/security/decorators/permissions.decorator';
import { OrganizationPermissions } from '@shared/constants/permissions.constants';

@ApiTags('Observability — Metrics')
@ApiBearerAuth()
@Controller('metrics')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get('prometheus')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Export operational CI/CD system metrics in Prometheus exposition format' })
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getPrometheusMetricsText();
  }

  @Get('system-health')
  @Permissions(OrganizationPermissions.READ)
  @ApiOperation({ summary: 'Retrieve aggregated platform system metrics and usage statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: SystemMetricsResponseDto })
  async getSystemMetrics() {
    const metrics = await this.metricsService.getSystemMetrics();
    return {
      message: 'System metrics retrieved successfully',
      data: metrics,
    };
  }
}
