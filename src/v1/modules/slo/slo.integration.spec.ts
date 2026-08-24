import { Test, TestingModule } from '@nestjs/testing';
import { SloService } from './slo.service';
import { SloRepository } from './slo.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { SloStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SLO & Error Budget Service Integration Tests', () => {
  let service: SloService;

  const orgId = 'org-slo-404';
  const existingSlo = {
    id: 'slo-101',
    organizationId: orgId,
    service: 'api-service',
    targetAvailability: 99.9,
    targetLatencyP95Ms: 250,
    windowDays: 30,
    currentAvailability: 100.0,
    errorBudgetRemaining: 100.0,
    burnRate: 0.0,
    status: SloStatus.HEALTHY,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    serviceLevelObjective: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.organizationId_service?.service === 'api-service' || where.id === 'slo-101') {
          return Promise.resolve({ ...existingSlo });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue([existingSlo]),
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'slo-new',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      update: jest.fn().mockImplementation(({ where: { id: _id }, data }) => {
        return Promise.resolve({
          ...existingSlo,
          ...data,
          updatedAt: new Date(),
        });
      }),
      delete: jest.fn().mockResolvedValue({ id: 'slo-101' }),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SloService, SloRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SloService>(SloService);
  });

  it('should create or update an SLO definition', async () => {
    const slo = await service.createOrUpdate(orgId, {
      service: 'api-service',
      targetAvailability: 99.9,
      targetLatencyP95Ms: 200,
      windowDays: 30,
    });

    expect(slo).toBeDefined();
    expect(slo.service).toBe('api-service');
    expect(slo.targetAvailability).toBe(99.9);
  });

  it('should list all SLOs for an organization', async () => {
    const list = await service.list(orgId);
    expect(list.length).toBe(1);
    expect(list[0].service).toBe('api-service');
  });

  it('should record nominal metrics with 0% error and maintain HEALTHY status', async () => {
    const res = await service.recordMetric(orgId, 'api-service', {
      totalRequests: 10000,
      errorRequests: 0,
      p95LatencyMs: 120,
    });

    expect(res.currentAvailability).toBe(100.0);
    expect(res.burnRate).toBe(0.0);
    expect(res.status).toBe(SloStatus.HEALTHY);
    expect(res.alertLevel).toBe('NONE');
    expect(res.deploymentFreezeRecommended).toBe(false);
  });

  it('should calculate elevated burn rate (2x) and return WARNING with elevated alert', async () => {
    // 99.9% target => allowed error rate = 0.1% = 0.001
    // In 10,000 requests, 20 errors = 0.002 = 2x burn rate
    const res = await service.recordMetric(orgId, 'api-service', {
      totalRequests: 10000,
      errorRequests: 20,
      p95LatencyMs: 220,
    });

    expect(res.currentAvailability).toBe(99.8);
    expect(res.burnRate).toBe(2.0);
    expect(res.status).toBe(SloStatus.WARNING);
    expect(res.alertLevel).toBe('ELEVATED');
  });

  it('should calculate severe burn rate (15x) and trigger CRITICAL BREACHED and deployment freeze', async () => {
    // 150 errors in 10,000 requests = 1.5% actual error rate / 0.1% allowed = 15x burn rate
    const res = await service.recordMetric(orgId, 'api-service', {
      totalRequests: 10000,
      errorRequests: 150,
      p95LatencyMs: 850,
    });

    expect(res.currentAvailability).toBe(98.5);
    expect(res.burnRate).toBe(15.0);
    expect(res.status).toBe(SloStatus.BREACHED);
    expect(res.alertLevel).toBe('CRITICAL_PAGE');
    expect(res.deploymentFreezeRecommended).toBe(true);
    expect(res.recommendation).toContain('CRITICAL');
  });

  it('should throw BadRequestException if errorRequests > totalRequests', async () => {
    await expect(
      service.recordMetric(orgId, 'api-service', {
        totalRequests: 100,
        errorRequests: 150,
        p95LatencyMs: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException for unknown service', async () => {
    await expect(service.getByService(orgId, 'unknown-service')).rejects.toThrow(NotFoundException);
  });
});
