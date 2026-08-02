import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RepositoryScannerService } from './services/repository-scanner.service';
import { WorkflowCompilerService } from '../pipelines/workflow-compiler.service';
import { PipelineOrchestratorService } from '../pipelines/services/pipeline-orchestrator.service';

describe('WebhooksController X-GitHub-Delivery Idempotency Integration Test', () => {
  let controller: WebhooksController;

  const mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const mockRequestContext = { getCorrelationId: jest.fn().mockReturnValue('corr-123') };
  const mockScanner = { scanRepository: jest.fn().mockResolvedValue({ language: 'node', framework: 'express', packageManager: 'npm' }) };
  const mockCompiler = { compilePipeline: jest.fn().mockReturnValue({ stages: [] }) };
  const mockOrchestrator = { dispatchRun: jest.fn().mockResolvedValue({ runId: 'run_test_idempotent', jobsEnqueued: 2 }) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: RepositoryScannerService, useValue: mockScanner },
        { provide: WorkflowCompilerService, useValue: mockCompiler },
        { provide: PipelineOrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    (controller as any).processedDeliveries = new Map();
    jest.clearAllMocks();
  });



  it('should ACCEPT the first webhook delivery with a unique X-GitHub-Delivery ID', async () => {
    const deliveryId = 'deliv_77889900_unique_1';
    const payload = { ref: 'refs/heads/main', repository: { html_url: 'https://github.com/abdul78-create/StockFlow' } };

    const res = await controller.handleWebhook('github', 'push', '', deliveryId, payload);
    expect(res.status).toBe('success');
    expect(mockOrchestrator.dispatchRun).toHaveBeenCalledTimes(1);
  });

  it('should IGNORE duplicate webhook delivery with identical X-GitHub-Delivery ID (Idempotence)', async () => {
    const deliveryId = 'deliv_77889900_duplicate_2';
    const payload = { ref: 'refs/heads/main', repository: { html_url: 'https://github.com/abdul78-create/StockFlow' } };

    // 1st delivery
    const res1 = await controller.handleWebhook('github', 'push', '', deliveryId, payload);
    expect(res1.status).toBe('success');

    // 2nd delivery (Duplicate delivery retry from GitHub)
    const res2 = await controller.handleWebhook('github', 'push', '', deliveryId, payload);
    expect(res2.status).toBe('ignored');
    expect(res2.message).toContain('already processed (Idempotent)');
    expect(mockOrchestrator.dispatchRun).toHaveBeenCalledTimes(1); // Pipeline run triggered ONLY ONCE!
  });

  it('should ACCEPT distinct webhook deliveries with different X-GitHub-Delivery IDs', async () => {
    const payload = { ref: 'refs/heads/main', repository: { html_url: 'https://github.com/abdul78-create/StockFlow' } };

    const res1 = await controller.handleWebhook('github', 'push', '', 'deliv_A', payload);
    const res2 = await controller.handleWebhook('github', 'push', '', 'deliv_B', payload);

    expect(res1.status).toBe('success');
    expect(res2.status).toBe('success');
    expect(mockOrchestrator.dispatchRun).toHaveBeenCalledTimes(2);
  });
});
