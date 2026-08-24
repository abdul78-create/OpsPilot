import {
  Controller,
  Get,
  Post,
  Delete,
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
import { AlertsService } from './alerts.service';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { DispatchAlertDto } from './dto/dispatch-alert.dto';
import { JwtAuthGuard } from '../../../core/security/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/security/guards/tenant.guard';
import { NotificationDeliveryStatus } from '@prisma/client';

@ApiTags('Notification Channels & Alert Policies')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ─── CHANNELS ───────────────────────────────────────────────────────────────

  @Post('organizations/:organizationId/notification-channels')
  @ApiOperation({ summary: 'Create a notification channel (Slack / PagerDuty / Webhook / Email)' })
  @ApiParam({ name: 'organizationId' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Notification channel created' })
  async createChannel(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateNotificationChannelDto,
  ) {
    const channel = await this.alertsService.createChannel(organizationId, dto);
    return {
      message: `Notification channel '${channel.name}' (${channel.type}) created`,
      data: channel,
    };
  }

  @Get('organizations/:organizationId/notification-channels')
  @ApiOperation({ summary: 'List all notification channels for an organization' })
  @ApiParam({ name: 'organizationId' })
  async listChannels(@Param('organizationId') organizationId: string) {
    const channels = await this.alertsService.listChannels(organizationId);
    return { data: channels };
  }

  @Delete('organizations/:organizationId/notification-channels/:id')
  @ApiOperation({ summary: 'Delete (deactivate) a notification channel' })
  @ApiParam({ name: 'organizationId' })
  @ApiParam({ name: 'id' })
  async deleteChannel(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    await this.alertsService.deleteChannel(organizationId, id);
    return { message: 'Notification channel deleted successfully' };
  }

  // ─── POLICIES ───────────────────────────────────────────────────────────────

  @Post('organizations/:organizationId/alert-policies')
  @ApiOperation({ summary: 'Create an alert policy — map event types to a notification channel' })
  @ApiParam({ name: 'organizationId' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Alert policy created' })
  async createPolicy(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateAlertPolicyDto,
  ) {
    const policy = await this.alertsService.createPolicy(organizationId, dto);
    return {
      message: `Alert policy '${policy.name}' created for ${policy.eventTypes.join(', ')}`,
      data: policy,
    };
  }

  @Get('organizations/:organizationId/alert-policies')
  @ApiOperation({ summary: 'List all alert policies' })
  @ApiParam({ name: 'organizationId' })
  async listPolicies(@Param('organizationId') organizationId: string) {
    const policies = await this.alertsService.listPolicies(organizationId);
    return { data: policies };
  }

  // ─── DISPATCH ────────────────────────────────────────────────────────────────

  @Post('organizations/:organizationId/alerts/dispatch')
  @ApiOperation({
    summary: 'Dispatch an alert event across all matching policies (Slack / PagerDuty / Webhook)',
  })
  @ApiParam({ name: 'organizationId' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Alert dispatched with delivery reports' })
  async dispatch(@Param('organizationId') organizationId: string, @Body() dto: DispatchAlertDto) {
    const result = await this.alertsService.dispatch(organizationId, dto);
    return {
      message: `Alert dispatched to ${result.dispatched} channel(s)`,
      data: result,
    };
  }

  // ─── DELIVERIES ──────────────────────────────────────────────────────────────

  @Get('organizations/:organizationId/alert-deliveries')
  @ApiOperation({ summary: 'List notification delivery history with optional status filter' })
  @ApiParam({ name: 'organizationId' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'DELIVERED', 'FAILED', 'RETRYING'],
  })
  async listDeliveries(
    @Param('organizationId') organizationId: string,
    @Query('status') status?: NotificationDeliveryStatus,
  ) {
    const deliveries = await this.alertsService.listDeliveries(organizationId, status);
    return { data: deliveries };
  }
}
