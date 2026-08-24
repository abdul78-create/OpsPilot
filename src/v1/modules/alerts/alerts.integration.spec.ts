import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { AlertsRepository } from './alerts.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  AlertEventType,
  NotificationChannelType,
  NotificationDeliveryStatus,
} from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('Notification & Alerting Engine Integration Tests', () => {
  let service: AlertsService;

  const orgId = 'org-alerts-001';

  let inMemoryChannels: Record<string, unknown>[] = [];
  let inMemoryPolicies: Record<string, unknown>[] = [];
  let inMemoryDeliveries: Record<string, unknown>[] = [];

  const slackChannel = {
    id: 'ch-slack-1',
    organizationId: orgId,
    name: 'SRE Slack Alerts',
    type: NotificationChannelType.SLACK_WEBHOOK,
    webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TEST',
    integrationKey: null,
    emailAddress: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const pagerDutyChannel = {
    id: 'ch-pd-1',
    organizationId: orgId,
    name: 'PagerDuty On-Call',
    type: NotificationChannelType.PAGERDUTY,
    webhookUrl: null,
    integrationKey: 'pd-routing-key-abc123',
    emailAddress: null,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    notificationChannel: {
      create: jest.fn().mockImplementation((args) => {
        const item = {
          id: `ch-${Date.now()}`,
          ...args.data,
          isActive: true,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryChannels.push(item);
        return Promise.resolve(item);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([...inMemoryChannels])),
      findUnique: jest
        .fn()
        .mockImplementation(({ where: { id } }) =>
          Promise.resolve(inMemoryChannels.find((c) => c['id'] === id) || null),
        ),
      update: jest.fn().mockImplementation(({ where: { id }, data }) => {
        const index = inMemoryChannels.findIndex((c) => c['id'] === id);
        if (index !== -1) inMemoryChannels[index] = { ...inMemoryChannels[index], ...data };
        return Promise.resolve(inMemoryChannels[index]);
      }),
    },
    alertPolicy: {
      create: jest.fn().mockImplementation((args) => {
        const item = {
          id: `pol-${Date.now()}`,
          ...args.data,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryPolicies.push(item);
        return Promise.resolve(item);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let results = [...inMemoryPolicies];
        if (where?.organizationId)
          results = results.filter((p) => p['organizationId'] === where.organizationId);
        if (where?.isActive !== undefined)
          results = results.filter((p) => p['isActive'] === where.isActive);
        if (where?.eventTypes?.has) {
          results = results.filter((p) =>
            (p['eventTypes'] as AlertEventType[]).includes(where.eventTypes.has),
          );
        }
        // Include notification channel data for policies
        return Promise.resolve(
          results.map((p) => ({
            ...p,
            notificationChannel:
              inMemoryChannels.find((c) => c['id'] === p['notificationChannelId']) || slackChannel,
          })),
        );
      }),
    },
    notificationDelivery: {
      create: jest.fn().mockImplementation((args) => {
        const item = {
          id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          ...args.data,
          attemptCount: 0,
          lastAttemptAt: null,
          deliveredAt: null,
          failureReason: null,
          nextRetryAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDeliveries.push(item);
        return Promise.resolve(item);
      }),
      findUnique: jest
        .fn()
        .mockImplementation(({ where: { idempotencyKey } }) =>
          Promise.resolve(
            inMemoryDeliveries.find((d) => d['idempotencyKey'] === idempotencyKey) || null,
          ),
        ),
      update: jest.fn().mockImplementation(({ where: { id }, data }) => {
        const index = inMemoryDeliveries.findIndex((d) => d['id'] === id);
        if (index !== -1) inMemoryDeliveries[index] = { ...inMemoryDeliveries[index], ...data };
        return Promise.resolve(inMemoryDeliveries[index]);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let results = [...inMemoryDeliveries];
        if (where?.organizationId)
          results = results.filter((d) => d['organizationId'] === where.organizationId);
        if (where?.status) results = results.filter((d) => d['status'] === where.status);
        return Promise.resolve(results);
      }),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        AlertsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  beforeEach(() => {
    inMemoryChannels = [{ ...slackChannel }, { ...pagerDutyChannel }];
    inMemoryPolicies = [];
    inMemoryDeliveries = [];
  });

  it('should create a Slack webhook notification channel', async () => {
    inMemoryChannels = [];
    const ch = await service.createChannel(orgId, {
      name: 'SRE Slack',
      type: NotificationChannelType.SLACK_WEBHOOK,
      webhookUrl: 'https://hooks.slack.com/services/TEST/TEST/TESTTOKEN',
    });

    expect(ch.id).toBeDefined();
    expect(ch.name).toBe('SRE Slack');
    expect(ch.type).toBe(NotificationChannelType.SLACK_WEBHOOK);
  });

  it('should create a PagerDuty notification channel', async () => {
    inMemoryChannels = [];
    const ch = await service.createChannel(orgId, {
      name: 'PagerDuty Critical',
      type: NotificationChannelType.PAGERDUTY,
      integrationKey: 'pd-test-key-abcd',
    });

    expect(ch.type).toBe(NotificationChannelType.PAGERDUTY);
    expect(ch['integrationKey']).toBe('pd-test-key-abcd');
  });

  it('should create an alert policy matching INCIDENT_CREATED → Slack channel', async () => {
    const policy = await service.createPolicy(orgId, {
      name: 'Incident Alerts',
      notificationChannelId: 'ch-slack-1',
      eventTypes: [AlertEventType.INCIDENT_CREATED, AlertEventType.INCIDENT_RESOLVED],
      minSeverity: 'HIGH',
    });

    expect(policy.id).toBeDefined();
    expect(policy.eventTypes).toContain(AlertEventType.INCIDENT_CREATED);
    expect(policy['minSeverity']).toBe('HIGH');
  });

  it('[DISPATCH] should dispatch alert to matched policy and create delivery record', async () => {
    // Setup a matching policy in memory
    inMemoryPolicies.push({
      id: 'pol-test-1',
      organizationId: orgId,
      notificationChannelId: 'ch-slack-1',
      name: 'Incident Alerts',
      eventTypes: [AlertEventType.INCIDENT_CREATED],
      minSeverity: 'HIGH',
      isActive: true,
    });

    // Mock fetch to simulate Slack 200 OK
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('ok'),
    } as Response);

    const result = await service.dispatch(orgId, {
      eventType: AlertEventType.INCIDENT_CREATED,
      severity: 'CRITICAL',
      payload: {
        incidentId: 'inc-101',
        title: 'Database connection pool exhausted',
        service: 'api-gateway',
        severity: 'CRITICAL',
      },
    });

    expect(result.dispatched).toBe(1);
    expect(result.deliveries.length).toBe(1);
    expect(result.deliveries[0].status).toBe('DELIVERED');
    expect(inMemoryDeliveries.length).toBe(1);
    expect(inMemoryDeliveries[0]['status']).toBe(NotificationDeliveryStatus.DELIVERED);
  });

  it('[DISPATCH] should skip alert when event severity is below policy minimum', async () => {
    inMemoryPolicies.push({
      id: 'pol-high-only',
      organizationId: orgId,
      notificationChannelId: 'ch-slack-1',
      name: 'High+ Incidents Only',
      eventTypes: [AlertEventType.INCIDENT_CREATED],
      minSeverity: 'HIGH',
      isActive: true,
    });

    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') } as Response);

    const result = await service.dispatch(orgId, {
      eventType: AlertEventType.INCIDENT_CREATED,
      severity: 'LOW',
      payload: { incidentId: 'inc-low', severity: 'LOW' },
    });

    // LOW severity should be gated by minSeverity: HIGH
    expect(result.dispatched).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('[IDEMPOTENCY] should not re-deliver alert with the same idempotency key', async () => {
    inMemoryPolicies.push({
      id: 'pol-idem-1',
      organizationId: orgId,
      notificationChannelId: 'ch-slack-1',
      name: 'Idem Test',
      eventTypes: [AlertEventType.SLO_BREACHED],
      minSeverity: null,
      isActive: true,
    });

    const idempotencyKey = 'unique-alert-event-slo-breached-001';

    // Pre-seed a DELIVERED record to simulate already-sent notification
    inMemoryDeliveries.push({
      id: 'del-idem-pre',
      organizationId: orgId,
      notificationChannelId: 'ch-slack-1',
      eventType: AlertEventType.SLO_BREACHED,
      idempotencyKey: `${idempotencyKey}:ch-slack-1`,
      payload: {},
      status: NotificationDeliveryStatus.DELIVERED,
    });

    global.fetch = jest.fn();

    const result = await service.dispatch(orgId, {
      eventType: AlertEventType.SLO_BREACHED,
      payload: { service: 'api-service', burnRate: 15.0 },
      idempotencyKey,
    });

    expect(result.dispatched).toBe(0);
    expect(result.deliveries[0].status).toBe('DUPLICATE_SKIPPED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('[RETRY] should mark delivery as FAILED after Slack returns non-200', async () => {
    inMemoryPolicies.push({
      id: 'pol-fail-1',
      organizationId: orgId,
      notificationChannelId: 'ch-slack-1',
      name: 'Failing Channel',
      eventTypes: [AlertEventType.DEPLOYMENT_FAILED],
      minSeverity: null,
      isActive: true,
    });

    // Mock Slack to always fail
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    } as Response);

    const result = await service.dispatch(orgId, {
      eventType: AlertEventType.DEPLOYMENT_FAILED,
      payload: { deploymentId: 'dep-111', environment: 'production' },
    });

    expect(result.dispatched).toBe(0);
    expect(result.deliveries[0].status).toBe('FAILED');
    const delivery = inMemoryDeliveries[0] as Record<string, unknown>;
    expect(delivery['status']).toBe(NotificationDeliveryStatus.FAILED);
    expect(delivery['attemptCount']).toBe(5); // MAX_RETRY_ATTEMPTS exhausted
    expect(delivery['failureReason']).toContain('503');
  }, 30000); // Retry with backoff takes time

  it('should return NotFoundException when accessing channel from another org', async () => {
    await expect(service.getChannel('foreign-org', 'ch-slack-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
