import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RepositoryScannerService } from './services/repository-scanner.service';
import { WorkflowCompilerService } from '../pipelines/workflow-compiler.service';
import { PipelineOrchestratorService } from '../pipelines/services/pipeline-orchestrator.service';
import * as crypto from 'crypto';

describe('WebhooksController HMAC SHA-256 Signature Verification Integration Test', () => {
  let controller: WebhooksController;
  const webhookSecret = 'test_webhook_secret_key_123';

  const mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const mockRequestContext = { getCorrelationId: jest.fn().mockReturnValue('corr-123') };
  const mockScanner = {
    scanRepository: jest
      .fn()
      .mockResolvedValue({ language: 'node', framework: 'express', packageManager: 'npm' }),
  };
  const mockCompiler = { compilePipeline: jest.fn().mockReturnValue({ stages: [] }) };
  const mockOrchestrator = {
    dispatchRun: jest.fn().mockResolvedValue({ runId: 'run_test_hmac', jobsEnqueued: 2 }),
  };

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
    jest.clearAllMocks();
  });

  function computeHmacHeader(payload: object, secret: string): string {
    const bodyStr = JSON.stringify(payload);
    const digest = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
    return `sha256=${digest}`;
  }

  describe('Positive Security Test', () => {
    it('should ACCEPT webhooks with a valid HMAC SHA-256 signature matching secret and payload', () => {
      const payload = {
        ref: 'refs/heads/main',
        repository: { html_url: 'https://github.com/abdul78-create/StockFlow' },
      };
      const validHeader = computeHmacHeader(payload, webhookSecret);

      const isValid = controller.verifyGitHubHmac(payload, validHeader, webhookSecret);
      expect(isValid).toBe(true);
    });
  });

  describe('Negative Security Test', () => {
    it('should REJECT webhooks with a missing signature header', () => {
      const payload = { ref: 'refs/heads/main' };
      const isValid = controller.verifyGitHubHmac(payload, undefined, webhookSecret);
      expect(isValid).toBe(false);
    });

    it('should REJECT webhooks with an invalid/tampered signature header', () => {
      const payload = { ref: 'refs/heads/main' };
      const invalidHeader =
        'sha256=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const isValid = controller.verifyGitHubHmac(payload, invalidHeader, webhookSecret);
      expect(isValid).toBe(false);
    });

    it('should REJECT webhooks when payload content was modified post-signing', () => {
      const payloadOriginal = { ref: 'refs/heads/main', action: 'original' };
      const validHeaderForOriginal = computeHmacHeader(payloadOriginal, webhookSecret);

      const payloadTampered = { ref: 'refs/heads/main', action: 'tampered' };
      const isValid = controller.verifyGitHubHmac(
        payloadTampered,
        validHeaderForOriginal,
        webhookSecret,
      );
      expect(isValid).toBe(false);
    });

    it('should REJECT webhooks signed with an incorrect secret key', () => {
      const payload = { ref: 'refs/heads/main' };
      const wrongSecretHeader = computeHmacHeader(payload, 'wrong_secret_key_456');
      const isValid = controller.verifyGitHubHmac(payload, wrongSecretHeader, webhookSecret);
      expect(isValid).toBe(false);
    });
  });
});
