import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  NotificationChannel,
  AlertPolicy,
  NotificationDelivery,
  AlertEventType,
  NotificationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { CreateAlertPolicyDto } from './dto/create-alert-policy.dto';

@Injectable()
export class AlertsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createChannel(
    organizationId: string,
    dto: CreateNotificationChannelDto,
  ): Promise<NotificationChannel> {
    return this.prismaService.notificationChannel.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type,
        webhookUrl: dto.webhookUrl,
        integrationKey: dto.integrationKey,
        emailAddress: dto.emailAddress,
      },
    });
  }

  async listChannels(organizationId: string): Promise<NotificationChannel[]> {
    return this.prismaService.notificationChannel.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findChannelById(id: string): Promise<NotificationChannel | null> {
    return this.prismaService.notificationChannel.findUnique({
      where: { id },
    });
  }

  async deleteChannel(id: string): Promise<NotificationChannel> {
    return this.prismaService.notificationChannel.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async createPolicy(organizationId: string, dto: CreateAlertPolicyDto): Promise<AlertPolicy> {
    return this.prismaService.alertPolicy.create({
      data: {
        organizationId,
        notificationChannelId: dto.notificationChannelId,
        name: dto.name,
        eventTypes: dto.eventTypes,
        minSeverity: dto.minSeverity,
      },
    });
  }

  async listPolicies(organizationId: string): Promise<AlertPolicy[]> {
    return this.prismaService.alertPolicy.findMany({
      where: { organizationId, isActive: true },
      include: { notificationChannel: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActivePoliciesForEvent(
    organizationId: string,
    eventType: AlertEventType,
  ): Promise<(AlertPolicy & { notificationChannel: NotificationChannel })[]> {
    return this.prismaService.alertPolicy.findMany({
      where: {
        organizationId,
        isActive: true,
        eventTypes: { has: eventType },
        notificationChannel: { isActive: true, deletedAt: null },
      },
      include: { notificationChannel: true },
    });
  }

  async createDelivery(data: {
    organizationId: string;
    notificationChannelId: string;
    eventType: AlertEventType;
    idempotencyKey: string;
    payload: Record<string, unknown>;
  }): Promise<NotificationDelivery> {
    return this.prismaService.notificationDelivery.create({
      data: {
        organizationId: data.organizationId,
        notificationChannelId: data.notificationChannelId,
        eventType: data.eventType,
        idempotencyKey: data.idempotencyKey,
        payload: data.payload as Prisma.InputJsonValue,
        status: NotificationDeliveryStatus.PENDING,
      },
    });
  }

  async updateDeliveryStatus(
    id: string,
    update: {
      status: NotificationDeliveryStatus;
      attemptCount?: number;
      lastAttemptAt?: Date;
      deliveredAt?: Date;
      failureReason?: string;
      nextRetryAt?: Date;
    },
  ): Promise<NotificationDelivery> {
    return this.prismaService.notificationDelivery.update({
      where: { id },
      data: update,
    });
  }

  async findDeliveryByIdempotencyKey(key: string): Promise<NotificationDelivery | null> {
    return this.prismaService.notificationDelivery.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async listDeliveries(
    organizationId: string,
    status?: NotificationDeliveryStatus,
  ): Promise<NotificationDelivery[]> {
    return this.prismaService.notificationDelivery.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
