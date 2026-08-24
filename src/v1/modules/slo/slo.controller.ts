import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SloService } from './slo.service';
import { CreateSloDto } from './dto/create-slo.dto';
import { RecordSloMetricDto } from './dto/record-slo-metric.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';

@ApiTags('Service Level Objectives (SLO) & Error Budgets')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class SloController {
  constructor(private readonly sloService: SloService) {}

  @Post('organizations/:organizationId/slo')
  @ApiOperation({ summary: 'Create or update an SLO definition for a service' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'SLO created or updated' })
  async createOrUpdate(@Param('organizationId') organizationId: string, @Body() dto: CreateSloDto) {
    const slo = await this.sloService.createOrUpdate(organizationId, dto);
    return {
      message: 'SLO saved successfully',
      data: slo,
    };
  }

  @Get('organizations/:organizationId/slo')
  @ApiOperation({ summary: 'List all SLOs and Error Budgets for an Organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  async list(@Param('organizationId') organizationId: string) {
    const slos = await this.sloService.list(organizationId);
    return {
      data: slos,
    };
  }

  @Get('organizations/:organizationId/slo/:service')
  @ApiOperation({ summary: 'Get SLO details and Error Budget status for a service' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'service', description: 'Service name' })
  async getByService(
    @Param('organizationId') organizationId: string,
    @Param('service') service: string,
  ) {
    const slo = await this.sloService.getByService(organizationId, service);
    return {
      data: slo,
    };
  }

  @Post('organizations/:organizationId/slo/:service/record-metric')
  @ApiOperation({ summary: 'Record telemetry metrics and evaluate multi-window burn rates' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'service', description: 'Service name' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SLO evaluated with updated error budget and burn rate',
  })
  async recordMetric(
    @Param('organizationId') organizationId: string,
    @Param('service') service: string,
    @Body() dto: RecordSloMetricDto,
  ) {
    const result = await this.sloService.recordMetric(organizationId, service, dto);
    return {
      message: 'Telemetry evaluated against SLO',
      data: result,
    };
  }

  @Delete('organizations/:organizationId/slo/:service')
  @ApiOperation({ summary: 'Delete an SLO definition' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiParam({ name: 'service', description: 'Service name' })
  async delete(@Param('organizationId') organizationId: string, @Param('service') service: string) {
    await this.sloService.delete(organizationId, service);
    return {
      message: `SLO for service '${service}' deleted successfully`,
    };
  }
}
