import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RepositoryScannerService } from './services/repository-scanner.service';
import { WorkflowCompilerService } from '../pipelines/workflow-compiler.service';
import { PipelineOrchestratorService } from '../pipelines/services/pipeline-orchestrator.service';
import { WebhookPipelineRouterService } from '../pipelines/services/webhook-pipeline-router.service';
import { GitHubAppService } from './services/github-app.service';
import * as crypto from 'crypto';

describe('GitHub Push Webhook E2E Automation Integration Test Suite', () => {
  let controller: WebhooksController;
  const webhookSecret = 'test_github_push_secret_2026';

  const mockEventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-webhook-555'),
  };
  const mockScanner = {
    scanRepository: jest.fn().mockResolvedValue({
      language: 'node',
      framework: 'express',
      packageManager: 'npm',
    }),
  };
  const mockCompiler = {
    compilePipeline: jest.fn().mockReturnValue({
      stages: [
        { id: 'build', name: 'Build', stage: 'build' },
        { id: 'test', name: 'Test', stage: 'test' },
      ],
    }),
  };
  const mockOrchestrator = {
    dispatchRun: jest.fn().mockResolvedValue({
      runId: 'run_push_auto_777',
      jobsEnqueued: 2,
    }),
  };
  const mockGitHubAppService = { listUserRepositories: jest.fn().mockResolvedValue([]) };
  // Router returns empty triggeredRuns — tests verify fallback stack-scan dispatch path (runId / jobsEnqueued from orchestrator)
  const mockWebhookRouter = {
    routePushEvent: jest.fn().mockResolvedValue({ triggeredRuns: [], skippedPipelines: [] }),
  };

  beforeEach(async () => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        { provide: RepositoryScannerService, useValue: mockScanner },
        { provide: WorkflowCompilerService, useValue: mockCompiler },
        { provide: PipelineOrchestratorService, useValue: mockOrchestrator },
        { provide: GitHubAppService, useValue: mockGitHubAppService },
        { provide: WebhookPipelineRouterService, useValue: mockWebhookRouter },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  function computeHmacHeader(payload: object, secret: string): string {
    const bodyStr = JSON.stringify(payload);
    const digest = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
    return `sha256=${digest}`;
  }

  describe('1. Positive GitHub Push Webhook Processing & Auto-Dispatch', () => {
    it('Positive: should process push webhook, verify HMAC, emit push event, scan stack, and dispatch pipeline run', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = webhookSecret;

      const payload = {
        ref: 'refs/heads/main',
        after: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
        repository: {
          html_url: 'https://github.com/expressjs/express',
        },
        pusher: { name: 'express-maintainer' },
        head_commit: { message: 'feat: optimize middleware pipeline performance' },
      };

      const signature = computeHmacHeader(payload, webhookSecret);
      const deliveryId = `deliv_${Date.now()}_pos`;

      const result = await controller.handleWebhook(
        'github',
        'push',
        signature,
        deliveryId,
        payload,
      );

      expect(result.status).toBe('success');
      expect(result.runId).toBe('run_push_auto_777');
      expect(result.jobsEnqueued).toBe(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'repository.push.v1',
          aggregateId: 'https://github.com/expressjs/express',
        }),
      );
      expect(mockOrchestrator.dispatchRun).toHaveBeenCalledWith(
        expect.stringMatching(/^run_\d+/),
        expect.objectContaining({ stages: expect.any(Array) }),
        'https://github.com/expressjs/express',
        '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
        'main',
      );
    });
  });

  describe('2. Negative Security & Idempotency Tests', () => {
    it('Negative: should throw UnauthorizedException if HMAC signature is invalid or tampered', async () => {
      process.env.GITHUB_WEBHOOK_SECRET = webhookSecret;

      const payload = { ref: 'refs/heads/main' };
      const invalidSignature =
        'sha256=invalid00000000000000000000000000000000000000000000000000000000';

      await expect(
        controller.handleWebhook('github', 'push', invalidSignature, 'deliv_bad_sig', payload),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('Negative: should return idempotent status and skip processing on duplicate delivery ID', async () => {
      const payload = {
        ref: 'refs/heads/main',
        repository: { html_url: 'https://github.com/expressjs/express' },
      };
      const deliveryId = 'deliv_duplicate_test_123';

      // First delivery
      const res1 = await controller.handleWebhook('github', 'push', '', deliveryId, payload);
      expect(res1.status).toBe('success');

      // Duplicate delivery with same deliveryId
      const res2 = await controller.handleWebhook('github', 'push', '', deliveryId, payload);
      expect(res2.status).toBe('ignored');
      expect(res2.message).toContain('already processed');
    });
  });
});
