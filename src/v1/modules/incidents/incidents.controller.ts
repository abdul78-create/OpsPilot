import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';

@ApiTags('Incidents & AI Copilot')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post('organizations/:organizationId/incidents')
  @ApiOperation({ summary: 'Create a new SRE Incident' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Incident created successfully' })
  async create(@Param('organizationId') organizationId: string, @Body() dto: CreateIncidentDto) {
    const incident = await this.incidentsService.create(organizationId, dto);
    return {
      message: 'Incident recorded successfully',
      data: incident,
    };
  }

  @Get('organizations/:organizationId/incidents')
  @ApiOperation({ summary: 'List all Incidents for an Organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by incident status' })
  async findAll(@Param('organizationId') organizationId: string, @Query('status') status?: string) {
    const incidents = await this.incidentsService.findAll(organizationId, status);
    return {
      data: incidents,
    };
  }

  @Get('incidents/:id')
  @ApiOperation({ summary: 'Get Incident details, timeline, and AI investigation evidence' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  async findOne(@Param('id') id: string) {
    const incident = await this.incidentsService.findById(id);
    return {
      data: incident,
    };
  }

  @Patch('incidents/:id')
  @ApiOperation({ summary: 'Update Incident status, severity, root cause, or mitigation' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  async update(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    const incident = await this.incidentsService.update(id, dto);
    return {
      message: 'Incident updated successfully',
      data: incident,
    };
  }

  @Post('incidents/:id/ai-investigate')
  @ApiOperation({ summary: 'Trigger AI Incident Copilot deep RCA & fix formulation' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'AI RCA investigation report generated' })
  async investigate(@Param('id') id: string) {
    const investigation = await this.incidentsService.investigateWithAi(id);
    return {
      message: 'AI Incident Copilot investigation completed',
      data: investigation,
    };
  }

  @Post('incidents/:id/mitigate')
  @ApiOperation({ summary: 'Trigger automated mitigation action (e.g. rollback, restart, scale)' })
  @ApiParam({ name: 'id', description: 'Incident UUID' })
  async mitigate(
    @Param('id') id: string,
    @Body() body: { action: string; payload?: Record<string, unknown> },
  ) {
    const result = await this.incidentsService.triggerMitigation(id, body.action, body.payload);
    return {
      message: 'Mitigation action triggered successfully',
      data: result,
    };
  }
}
