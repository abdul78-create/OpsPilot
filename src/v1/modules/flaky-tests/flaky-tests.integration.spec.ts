import { Test, TestingModule } from '@nestjs/testing';
import { FlakyTestsService } from './flaky-tests.service';
import { FlakyTestsRepository } from './flaky-tests.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('Flaky Test Intelligence Integration Tests', () => {
  let service: FlakyTestsService;

  const orgId = 'org-flaky-99';
  const projId = 'proj-flaky-1';

  let inMemoryDb: any[] = [];

  const mockPrisma = {
    flakyTestRecord: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id) {
          return Promise.resolve(inMemoryDb.find((r) => r.id === where.id) || null);
        }
        if (where.projectId_testSuite_testName) {
          const { projectId, testSuite, testName } = where.projectId_testSuite_testName;
          return Promise.resolve(
            inMemoryDb.find(
              (r) =>
                r.projectId === projectId && r.testSuite === testSuite && r.testName === testName,
            ) || null,
          );
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        let results = [...inMemoryDb];
        if (where?.organizationId) {
          results = results.filter((r) => r.organizationId === where.organizationId);
        }
        if (where?.projectId) {
          results = results.filter((r) => r.projectId === where.projectId);
        }
        if (where?.isQuarantined !== undefined) {
          results = results.filter((r) => r.isQuarantined === where.isQuarantined);
        }
        return Promise.resolve(results);
      }),
      create: jest.fn().mockImplementation((args) => {
        const item = {
          id: `ft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          organizationId: args.data.organization.connect.id,
          projectId: args.data.project.connect.id,
          testSuite: args.data.testSuite,
          testName: args.data.testName,
          failureCount: args.data.failureCount,
          totalRuns: args.data.totalRuns,
          flakinessScore: args.data.flakinessScore,
          isQuarantined: false,
          quarantinedAt: null,
          quarantinedBy: null,
          lastFailureRunId: args.data.lastFailureRunId ?? null,
          lastFailureMessage: args.data.lastFailureMessage ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.push(item);
        return Promise.resolve(item);
      }),
      update: jest.fn().mockImplementation(({ where: { id }, data }) => {
        const index = inMemoryDb.findIndex((r) => r.id === id);
        if (index === -1) return Promise.resolve(null);
        inMemoryDb[index] = { ...inMemoryDb[index], ...data, updatedAt: new Date() };
        return Promise.resolve(inMemoryDb[index]);
      }),
    },
  };

  beforeAll(async () => {
    inMemoryDb = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlakyTestsService,
        FlakyTestsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FlakyTestsService>(FlakyTestsService);
  });

  beforeEach(() => {
    inMemoryDb = [];
  });

  it('should record an initial test run (passing) with 0% flakiness score', async () => {
    const res = await service.recordResult(orgId, {
      projectId: projId,
      testSuite: 'auth.spec.ts',
      testName: 'should generate JWT token',
      passed: true,
      durationMs: 45,
    });

    expect(res.record.totalRuns).toBe(1);
    expect(res.record.failureCount).toBe(0);
    expect(res.record.flakinessScore).toBe(0.0);
    expect(res.isFlaky).toBe(false);
    expect(res.quarantineRecommended).toBe(false);
  });

  it('should track intermittent failure and calculate statistical flakiness score across multiple runs', async () => {
    // Run 1: Pass
    await service.recordResult(orgId, {
      projectId: projId,
      testSuite: 'webhook.spec.ts',
      testName: 'should process webhook event concurrently',
      passed: true,
    });

    // Run 2: Fail (1 failure in 2 runs = 50% flakiness)
    const run2 = await service.recordResult(orgId, {
      projectId: projId,
      testSuite: 'webhook.spec.ts',
      testName: 'should process webhook event concurrently',
      passed: false,
      errorMessage: 'Race condition on concurrent DB insert',
    });

    expect(run2.record.totalRuns).toBe(2);
    expect(run2.record.failureCount).toBe(1);
    expect(run2.record.flakinessScore).toBe(50.0);
    expect(run2.isFlaky).toBe(true);

    // Run 3: Pass (1 failure in 3 runs = 33.33% flakiness)
    const run3 = await service.recordResult(orgId, {
      projectId: projId,
      testSuite: 'webhook.spec.ts',
      testName: 'should process webhook event concurrently',
      passed: true,
    });

    expect(run3.record.totalRuns).toBe(3);
    expect(run3.record.failureCount).toBe(1);
    expect(run3.record.flakinessScore).toBe(33.33);
    expect(run3.quarantineRecommended).toBe(true);
  });

  it('should toggle quarantine state on a flaky test', async () => {
    const recorded = await service.recordResult(orgId, {
      projectId: projId,
      testSuite: 'chaos.spec.ts',
      testName: 'should withstand random kill -9',
      passed: false,
    });

    const quarantined = await service.toggleQuarantine(
      recorded.record.id,
      { isQuarantined: true, reason: 'High flakiness under memory contention' },
      'lead-sre@opspilot.ai',
    );

    expect(quarantined.isQuarantined).toBe(true);
    expect(quarantined.quarantinedBy).toBe('lead-sre@opspilot.ai');
    expect(quarantined.quarantinedAt).toBeDefined();

    const quarantineList = await service.getQuarantined(projId);
    expect(quarantineList.length).toBe(1);
    expect(quarantineList[0].id).toBe(recorded.record.id);
  });

  it('should throw NotFoundException when toggling quarantine on unknown test ID', async () => {
    await expect(
      service.toggleQuarantine('ft-unknown-999', { isQuarantined: true }),
    ).rejects.toThrow(NotFoundException);
  });
});
