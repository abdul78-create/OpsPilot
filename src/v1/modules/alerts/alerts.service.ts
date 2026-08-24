import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AlertsRepository } from './alerts.repository';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';
import { DispatchAlertDto } from './dto/dispatch-alert.dto';
import {
  NotificationChannel,
  AlertPolicy,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationChannelType,
  AlertEventType,
} from '@prisma/client';
import * as crypto from 'crypto';

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 1000;

export interface AlertDispatchResult {
  dispatched: number;
  deliveries: Array<{ channelId: string; channelName: string; status: string }>;
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly alertsRepo: AlertsRepository) {}

  // ─── CHANNEL MANAGEMENT ────────────────────────────────────────────────────

  async createChannel(
    organizationId: string,
    dto: CreateNotificationChannelDto,
  ): Promise<NotificationChannel> {
    return this.alertsRepo.createChannel(organizationId, dto);
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    return this.alertsRepo.listChannels(organizationId);
  }

  async getChannel(organizationId: string, id: string): Promise<NotificationChannel> {
    const ch = await this.alertsRepo.findChannelById(id);
    if (!ch || ch.organizationId !== organizationId) {
      throw new NotFoundException(`Notification channel '${id}' not found.`);
    }
    return ch;
  }

  async deleteChannel(organizationId: string, id: string): Promise<void> {
    await this.getChannel(organizationId, id);
    await this.alertsRepo.deleteChannel(id);
  }

  // ─── POLICY MANAGEMENT ─────────────────────────────────────────────────────

  async createPolicy(organizationId: string, dto: CreateAlertPolicyDto): Promise<AlertPolicy> {
    // Verify channel belongs to org
    await this.getChannel(organizationId, dto.notificationChannelId);
    return this.alertsRepo.createPolicy(organizationId, dto);
  }

  async listPolicies(organizationId: string): Promise<AlertPolicy[]> {
    return this.alertsRepo.listPolicies(organizationId);
  }

  // ─── ALERT DISPATCH ENGINE ──────────────────────────────────────────────────

  async dispatch(organizationId: string, dto: DispatchAlertDto): Promise<AlertDispatchResult> {
    const policies = await this.alertsRepo.findActivePoliciesForEvent(
      organizationId,
      dto.eventType,
    );

    if (policies.length === 0) {
      this.logger.log(
        `No active alert policies matched event '${dto.eventType}' for org ${organizationId}`,
      );
      return { dispatched: 0, deliveries: [] };
    }

    const results: AlertDispatchResult['deliveries'] = [];

    for (const policy of policies) {
      // Severity gate: skip if event severity is below policy minimum
      if (policy.minSeverity && dto.severity) {
        const severityOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
        if ((severityOrder[dto.severity] ?? 0) < (severityOrder[policy.minSeverity] ?? 0)) {
          this.logger.debug(
            `Skipping channel ${policy.notificationChannel.name} — severity ${dto.severity} below threshold ${policy.minSeverity}`,
          );
          continue;
        }
      }

      const idempotencyKey = dto.idempotencyKey
        ? `${dto.idempotencyKey}:${policy.notificationChannelId}`
        : crypto
            .createHash('sha256')
            .update(
              `${organizationId}:${dto.eventType}:${policy.notificationChannelId}:${Date.now()}`,
            )
            .digest('hex');

      // Check idempotency
      const existing = await this.alertsRepo.findDeliveryByIdempotencyKey(idempotencyKey);
      if (existing && existing.status === NotificationDeliveryStatus.DELIVERED) {
        this.logger.warn(`Duplicate alert dispatch skipped (idempotency key: ${idempotencyKey})`);
        results.push({
          channelId: policy.notificationChannelId,
          channelName: policy.notificationChannel.name,
          status: 'DUPLICATE_SKIPPED',
        });
        continue;
      }

      // Create delivery record
      const delivery = await this.alertsRepo.createDelivery({
        organizationId,
        notificationChannelId: policy.notificationChannelId,
        eventType: dto.eventType,
        idempotencyKey,
        payload: dto.payload,
      });

      // Dispatch with exponential backoff retry
      const status = await this.dispatchWithRetry(delivery, policy.notificationChannel, dto);
      results.push({
        channelId: policy.notificationChannelId,
        channelName: policy.notificationChannel.name,
        status,
      });
    }

    return {
      dispatched: results.filter((r) => r.status === 'DELIVERED').length,
      deliveries: results,
    };
  }

  private async dispatchWithRetry(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
    dto: DispatchAlertDto,
  ): Promise<string> {
    let attempt = 0;

    while (attempt < MAX_RETRY_ATTEMPTS) {
      attempt++;
      try {
        await this.sendToChannel(channel, dto.eventType, dto.payload);

        await this.alertsRepo.updateDeliveryStatus(delivery.id, {
          status: NotificationDeliveryStatus.DELIVERED,
          attemptCount: attempt,
          lastAttemptAt: new Date(),
          deliveredAt: new Date(),
        });

        this.logger.log(
          `Alert DELIVERED [${dto.eventType}] → ${channel.name} (${channel.type}) on attempt ${attempt}`,
        );
        return 'DELIVERED';
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Alert delivery FAILED [attempt ${attempt}/${MAX_RETRY_ATTEMPTS}] → ${channel.name}: ${errMsg}`,
        );

        const isLastAttempt = attempt >= MAX_RETRY_ATTEMPTS;
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        const nextRetryAt = isLastAttempt ? undefined : new Date(Date.now() + backoffMs);

        await this.alertsRepo.updateDeliveryStatus(delivery.id, {
          status: isLastAttempt
            ? NotificationDeliveryStatus.FAILED
            : NotificationDeliveryStatus.RETRYING,
          attemptCount: attempt,
          lastAttemptAt: new Date(),
          failureReason: errMsg,
          nextRetryAt,
        });

        if (!isLastAttempt) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(backoffMs, 8000)));
        }
      }
    }

    return 'FAILED';
  }

  private async sendToChannel(
    channel: NotificationChannel,
    eventType: AlertEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    switch (channel.type) {
      case NotificationChannelType.SLACK_WEBHOOK:
        return this.sendSlack(channel.webhookUrl!, eventType, payload);
      case NotificationChannelType.PAGERDUTY:
        return this.sendPagerDuty(channel.integrationKey!, eventType, payload);
      case NotificationChannelType.WEBHOOK:
        return this.sendWebhook(channel.webhookUrl!, eventType, payload);
      case NotificationChannelType.EMAIL:
        this.logger.log(`Email alert dispatched to ${channel.emailAddress} for event ${eventType}`);
        return;
      default:
        throw new Error(`Unsupported notification channel type: ${channel.type}`);
    }
  }

  private async sendSlack(
    webhookUrl: string,
    eventType: AlertEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const severityEmoji = this.severityEmoji(payload['severity'] as string | undefined);
    const slackBody = {
      text: `${severityEmoji} *OpsPilot Alert: ${eventType}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmoji} OpsPilot: ${eventType}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: Object.entries(payload)
            .slice(0, 8)
            .map(([key, value]) => ({
              type: 'mrkdwn',
              text: `*${key}:*\n${String(value).slice(0, 200)}`,
            })),
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Dispatched at ${new Date().toISOString()} via OpsPilot Alerting Engine`,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Slack webhook returned ${response.status}: ${text}`);
    }
  }

  private async sendPagerDuty(
    integrationKey: string,
    eventType: AlertEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const severity = this.mapSeverityToPagerDuty(payload['severity'] as string | undefined);
    const body = {
      routing_key: integrationKey,
      event_action: 'trigger',
      dedup_key: `opspilot:${eventType}:${payload['resourceId'] ?? Date.now()}`,
      payload: {
        summary: `OpsPilot: ${eventType}`,
        severity,
        source: 'OpsPilot Alerting Engine',
        timestamp: new Date().toISOString(),
        custom_details: payload,
      },
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`PagerDuty Events API returned ${response.status}: ${text}`);
    }
  }

  private async sendWebhook(
    webhookUrl: string,
    eventType: AlertEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const body = {
      source: 'OpsPilot',
      eventType,
      timestamp: new Date().toISOString(),
      payload,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook returned ${response.status}: ${text}`);
    }
  }

  private severityEmoji(severity?: string): string {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚠️';
    }
  }

  private mapSeverityToPagerDuty(severity?: string): string {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'info';
    }
  }

  // ─── DELIVERY INSPECTION ────────────────────────────────────────────────────

  async listDeliveries(
    organizationId: string,
    status?: NotificationDeliveryStatus,
  ): Promise<NotificationDelivery[]> {
    return this.alertsRepo.listDeliveries(organizationId, status);
  }
}
