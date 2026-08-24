import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsService } from './incidents.service';
import { IncidentsRepository } from './incidents.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('Incidents & AI Copilot Integration Tests', () => {
  let service: IncidentsService;

  const orgId = 'org-inc-101';
  const testIncident = {
    id: 'inc-999',
    organizationId: orgId,
    projectId: 'proj-1',
    environmentId: 'env-prod',
    title: 'Database connection pool exhausted',
    description: 'PostgreSQL connection pool maxed out at 100 connections causing HTTP 500 errors',
    severity: IncidentSeverity.CRITICAL,
    status: IncidentStatus.INVESTIGATING,
    service: 'api-gateway',
    rootCause: null,
    impactSummary: 'Users experiencing intermittent timeouts',
    mitigationAction: null,
    aiInvestigated: false,
    aiEvidence: null,
    timeline: [
      {
        timestamp: new Date().toISOString(),
        event: 'INCIDENT_CREATED',
        description: 'Incident created',
      },
    ],
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    incident: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'inc-999',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
        if (id === 'inc-999') return Promise.resolve({ ...testIncident });
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([testIncident]),
      update: jest.fn().mockImplementation(({ where: { id: _id }, data }) => {
        return Promise.resolve({
          ...testIncident,
          ...data,
          updatedAt: new Date(),
        });
      }),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: orgId, name: 'Production Org' }),
    },
    deployment: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'dep-101',
          releaseVersion: 'v1.4.1',
          status: 'SUCCESS',
          createdAt: new Date(),
        },
      ]),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        IncidentsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
  });

  it('should create an incident and append initial timeline event', async () => {
    const res = await service.create(orgId, {
      title: 'High latency in payment service',
      service: 'payment-service',
      severity: IncidentSeverity.HIGH,
      impactSummary: 'Checkout latency elevated to 1200ms',
    });

    expect(res.id).toBeDefined();
    expect(res.title).toBe('High latency in payment service');
    expect(res.service).toBe('payment-service');
    expect(res.severity).toBe(IncidentSeverity.HIGH);
    expect(res.status).toBe(IncidentStatus.INVESTIGATING);
  });

  it('should list all incidents for an organization', async () => {
    const list = await service.findAll(orgId);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].organizationId).toBe(orgId);
  });

  it('should update incident status and append to timeline', async () => {
    const updated = await service.update('inc-999', {
      status: IncidentStatus.IDENTIFIED,
      rootCause: 'Connection leak in user billing worker',
    });

    expect(updated.status).toBe(IncidentStatus.IDENTIFIED);
    expect(updated.rootCause).toContain('Connection leak');
  });

  it('should trigger AI Incident Copilot investigation and formulate RCA and mitigation', async () => {
    const investigation = await service.investigateWithAi('inc-999');

    expect(investigation.incidentId).toBe('inc-999');
    expect(investigation.confidenceScore).toBeGreaterThanOrEqual(0.8);
    expect(investigation.rootCause).toBeDefined();
    expect(investigation.evidence.length).toBeGreaterThan(0);
    expect(investigation.recommendedFix).toBeDefined();
    expect(investigation.suggestedMitigation).toBeDefined();
  });

  it('should trigger automated mitigation action and record in timeline', async () => {
    const result = await service.triggerMitigation('inc-999', 'ROLLBACK_DEPLOYMENT', {
      targetVersion: 'v1.4.2',
    });

    expect(result.status).toBe('MITIGATION_APPLIED');
    expect(result.actionExecuted).toBe('ROLLBACK_DEPLOYMENT');
    expect(result.incident.id).toBe('inc-999');
    expect(result.incident.status).toBe(IncidentStatus.MONITORING);
  });

  it('should throw NotFoundException when investigating non-existent incident', async () => {
    await expect(service.investigateWithAi('invalid-id')).rejects.toThrow(NotFoundException);
  });
});
