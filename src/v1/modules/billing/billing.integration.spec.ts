import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('BillingService Integration Tests', () => {
  let service: BillingService;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        id: '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
        name: 'Production Workspace',
        members: [{ id: 'm1' }, { id: 'm2' }],
        projects: [
          {
            id: 'p1',
            pipelineDefinitions: [
              {
                id: 'pipe1',
                runs: [
                  { id: 'r1', durationSeconds: 120 },
                  { id: 'r2', durationSeconds: 180 },
                ],
              },
            ],
            environments: [
              {
                id: 'env1',
                deployments: [{ id: 'd1' }, { id: 'd2' }],
              },
            ],
          },
        ],
      }),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should return active plan and calculated usage metrics', async () => {
    const res = await service.getSubscriptionAndUsage('3fdaca7b-c8e4-4be4-ba50-e1a2085ac913');
    expect(res.organizationId).toBe('3fdaca7b-c8e4-4be4-ba50-e1a2085ac913');
    expect(res.plan.name).toBe('Starter');
    expect(res.usage.teamSeats).toBe(2);
    expect(res.usage.deployments).toBe(2);
    expect(res.usage.buildMinutes).toBe(5); // (120+180)/60
  });

  it('should generate checkout session for PRO plan upgrade when payment provider configured', async () => {
    process.env.BILLING_CHECKOUT_BASE_URL = 'https://billing.opspilot.ai/checkout';
    const res = await service.createCheckoutSession('3fdaca7b-c8e4-4be4-ba50-e1a2085ac913', 'PRO');
    expect(res.sessionId).toContain('checkout_');
    expect(res.plan.price).toBe('$29');
    expect(res.checkoutUrl).toContain('https://billing.opspilot.ai/checkout');
    delete process.env.BILLING_CHECKOUT_BASE_URL;
  });

  it('should throw ServiceUnavailableException when payment provider is unconfigured', async () => {
    delete process.env.BILLING_CHECKOUT_BASE_URL;
    await expect(
      service.createCheckoutSession('3fdaca7b-c8e4-4be4-ba50-e1a2085ac913', 'PRO'),
    ).rejects.toThrow('Billing checkout gateway is currently unavailable');
  });

  it('should return invoice payment history or empty array if none exist', async () => {
    const invoices = await service.getInvoices('3fdaca7b-c8e4-4be4-ba50-e1a2085ac913');
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices.length).toBe(0);
  });
});
