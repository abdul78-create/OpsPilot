import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsRepository } from './audit-logs.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { AuditAction } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('Audit Log System Integration Tests', () => {
  let service: AuditLogsService;

  const orgId = 'org-audit-001';

  const sampleLog = {
    id: 'al-1',
    organizationId: orgId,
    userId: 'user-101',
    action: AuditAction.CREATE,
    resourceType: 'PipelineDefinition',
    resourceId: 'pipe-999',
    payload: { name: 'prod-pipeline' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  };

  const mockPrisma = {
    auditLog: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where: { id } }) =>
          id === 'al-1' ? Promise.resolve(sampleLog) : Promise.resolve(null),
        ),
      findMany: jest.fn().mockResolvedValue([sampleLog]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: `al-${Date.now()}`,
          ...args.data,
          createdAt: new Date(),
        }),
      ),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        AuditLogsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should query paginated audit logs with no filters', async () => {
    const result = await service.query(orgId, {});

    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(50);
    expect(result.meta.totalItems).toBe(1);
  });

  it('should query audit logs filtered by action type', async () => {
    const result = await service.query(orgId, { action: AuditAction.CREATE });

    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].action).toBe(AuditAction.CREATE);
  });

  it('should query audit logs with custom pagination', async () => {
    const result = await service.query(orgId, { page: '1', limit: '10' });

    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('should retrieve a specific audit log by ID with tenant isolation', async () => {
    const log = await service.getById(orgId, 'al-1');

    expect(log.id).toBe('al-1');
    expect(log.organizationId).toBe(orgId);
    expect(log.action).toBe(AuditAction.CREATE);
    expect(log.resourceType).toBe('PipelineDefinition');
  });

  it('should throw NotFoundException for audit log from different tenant', async () => {
    await expect(service.getById('different-org', 'al-1')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException for non-existent audit log ID', async () => {
    await expect(service.getById(orgId, 'al-non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should programmatically write an audit log for AI and automated events', async () => {
    const log = await service.write({
      organizationId: orgId,
      userId: 'ai-agent',
      action: AuditAction.EXECUTE,
      resourceType: 'AiAnalysisReport',
      resourceId: 'report-555',
      payload: {
        type: 'RUN_RCA',
        confidenceScore: 0.92,
        incident: 'inc-999',
      },
      ipAddress: '127.0.0.1',
    });

    expect(log.id).toBeDefined();
    expect(log.action).toBe(AuditAction.EXECUTE);
    expect(log.resourceType).toBe('AiAnalysisReport');
  });

  it('should write audit log for API key revocation event', async () => {
    const log = await service.write({
      organizationId: orgId,
      userId: 'user-admin-001',
      action: AuditAction.DELETE,
      resourceType: 'ApiKey',
      resourceId: 'key-revoked-1',
      payload: { keyPrefix: 'opspilot_live_abc123...' },
    });

    expect(log.action).toBe(AuditAction.DELETE);
    expect(log.resourceType).toBe('ApiKey');
  });
});
