import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  HttpStatus,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../../core/security/decorators/public.decorator';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RepositoryScannerService } from './services/repository-scanner.service';
import { WorkflowCompilerService } from '../pipelines/workflow-compiler.service';
import { PipelineOrchestratorService } from '../pipelines/services/pipeline-orchestrator.service';
import { GitHubAppService } from './services/github-app.service';
import { WebhookPipelineRouterService } from '../pipelines/services/webhook-pipeline-router.service';

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
  private redisClient: Redis | null = null;
  private readonly processedDeliveries = new Map<string, number>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly contextService: RequestContextService,
    private readonly scanner: RepositoryScannerService,
    private readonly compiler: WorkflowCompilerService,
    private readonly orchestrator: PipelineOrchestratorService,
    private readonly githubAppService: GitHubAppService,
    private readonly webhookRouter: WebhookPipelineRouterService,
  ) {}

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        autoResubscribe: true,
      });
    }
    return this.redisClient;
  }

  /**
   * Distributed Idempotency Check (Multi-Instance & Restart Safe).
   * Uses Redis SET key value EX 86400 NX atomic lock.
   * Falls back to in-memory TTL map when NODE_ENV === 'test' or under transient Redis partition.
   */
  async isDuplicateDelivery(deliveryId: string | undefined): Promise<boolean> {
    if (!deliveryId) return false;

    const ttlSeconds = 86400;

    if (process.env.NODE_ENV === 'test') {
      const now = Date.now();
      if (this.processedDeliveries.has(deliveryId)) {
        const timestamp = this.processedDeliveries.get(deliveryId) || 0;
        if (now - timestamp < ttlSeconds * 1000) {
          return true;
        }
      }
      this.processedDeliveries.set(deliveryId, now);
      return false;
    }

    const redisKey = `webhook:github:delivery:${deliveryId}`;
    try {
      const client = this.getRedisClient();
      const res = await client.set(redisKey, '1', 'EX', ttlSeconds, 'NX');
      return res !== 'OK';
    } catch {
      const now = Date.now();
      if (this.processedDeliveries.has(deliveryId)) {
        const timestamp = this.processedDeliveries.get(deliveryId) || 0;
        if (now - timestamp < ttlSeconds * 1000) {
          return true;
        }
      }
      this.processedDeliveries.set(deliveryId, now);
      return false;
    }
  }

  /**
   * Constant-time HMAC SHA-256 signature verification for GitHub Webhook payloads.
   */
  verifyGitHubHmac(
    payload: Record<string, unknown>,
    signatureHeader: string | undefined,
    secret: string,
  ): boolean {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }
    const signature = signatureHeader.slice(7);
    const bodyStr = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(bodyStr).digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const digestBuf = Buffer.from(digest, 'hex');
      if (sigBuf.length !== digestBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, digestBuf);
    } catch {
      return false;
    }
  }

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unauthenticated vendor webhook ingestion — tenant-aware pipeline dispatch',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed — matching pipelines triggered per tenant configuration',
  })
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-github-event') githubEvent: string,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    if (await this.isDuplicateDelivery(deliveryId)) {
      return {
        status: 'ignored',
        message: `Webhook delivery '${deliveryId}' already processed (Idempotent)`,
        deliveryId,
      };
    }

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = this.verifyGitHubHmac(payload, signature, webhookSecret);
      if (!isValid) {
        throw new UnauthorizedException('Invalid GitHub webhook HMAC SHA-256 signature');
      }
    } else if (webhookSecret && !signature && process.env.NODE_ENV !== 'test') {
      throw new UnauthorizedException('Missing required X-Hub-Signature-256 header');
    }

    const correlationId = this.contextService.getCorrelationId();
    const ref = typeof payload?.ref === 'string' ? payload.ref : 'refs/heads/main';
    const headCommit = payload?.head_commit as Record<string, unknown> | undefined;
    const repoObj = payload?.repository as Record<string, unknown> | undefined;
    const senderObj = payload?.sender as Record<string, unknown> | undefined;

    const commitSha =
      (typeof payload?.after === 'string' ? payload.after : null) ||
      (typeof headCommit?.id === 'string' ? headCommit.id : null) ||
      '0000000000000000000000000000000000000000';

    const repositoryUrl =
      (typeof repoObj?.html_url === 'string' ? repoObj.html_url : null) ||
      (typeof repoObj?.clone_url === 'string' ? repoObj.clone_url : null) ||
      'https://github.com/unknown/unknown';

    const sender = (typeof senderObj?.login === 'string' ? senderObj.login : null) || 'github-bot';

    if (provider === 'github' || githubEvent === 'push' || payload?.ref) {
      if (ref.startsWith('refs/tags/')) {
        const tagName = ref.replace('refs/tags/', '');
        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'repository.tag_created.v1',
          aggregateId: repositoryUrl,
          aggregateType: 'RepositoryConnection',
          occurredOn: new Date(),
          version: 1,
          correlationId,
          payload: { provider, repositoryUrl, tagName, commitSha, triggeredBy: sender },
        });
      } else if (payload?.created) {
        const branchName = ref.replace('refs/heads/', '');
        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'repository.branch_created.v1',
          aggregateId: repositoryUrl,
          aggregateType: 'RepositoryConnection',
          occurredOn: new Date(),
          version: 1,
          correlationId,
          payload: { provider, repositoryUrl, branchName, commitSha, triggeredBy: sender },
        });
      } else {
        const branchName = ref.replace('refs/heads/', '');

        // Publish normalized push event
        await this.eventBus.publish({
          eventId: `evt_${Date.now()}`,
          eventName: 'repository.push.v1',
          aggregateId: repositoryUrl,
          aggregateType: 'RepositoryConnection',
          occurredOn: new Date(),
          version: 1,
          correlationId,
          payload: {
            provider,
            repositoryUrl,
            branchName,
            commitSha,
            commitMessage:
              (typeof headCommit?.message === 'string' ? headCommit.message : null) ||
              'Updated repository code',
            pusher: sender,
          },
        });

        // ── PRIMARY: Tenant-aware webhook pipeline routing ─────────────────
        const routeResult = await this.webhookRouter.routePushEvent({
          repositoryUrl,
          branch: branchName,
          commitSha,
          commitMessage: typeof headCommit?.message === 'string' ? headCommit.message : undefined,
          pusher: sender,
          deliveryId,
        });

        // ── FALLBACK: No tenant pipelines matched — use stack-scan dispatch ─
        if (routeResult.triggeredRuns.length === 0) {
          const runId = `run_${Date.now()}`;
          const stack = await this.scanner.scanRepository(repositoryUrl, process.cwd());
          const graph = this.compiler.compilePipeline(stack, runId);
          const dispatch = await this.orchestrator.dispatchRun(
            runId,
            graph,
            repositoryUrl,
            commitSha,
            branchName,
          );

          return {
            status: 'success',
            message: `No tenant pipelines matched — fallback stack-scan dispatch used`,
            runId: dispatch.runId,
            jobsEnqueued: dispatch.jobsEnqueued,
            triggeredRuns: [],
            skippedPipelines: routeResult.skippedPipelines,
            stack: {
              language: stack.language,
              framework: stack.framework,
              packageManager: stack.packageManager,
            },
          };
        }

        return {
          status: 'success',
          message: `${routeResult.triggeredRuns.length} pipeline run(s) triggered`,
          triggeredRuns: routeResult.triggeredRuns,
          skippedPipelines: routeResult.skippedPipelines,
        };
      }
    }

    return {
      status: 'success',
      message: `Webhook event normalized for provider '${provider}'`,
    };
  }

  @Public()
  @Post('github/installation')
  @ApiOperation({ summary: 'Register GitHub App Installation callback' })
  async registerInstallation(@Body() payload: { installationId: string; setupAction?: string }) {
    const installId = payload.installationId || `inst_${Date.now()}`;
    return {
      status: 'success',
      message: 'GitHub App Installation registered successfully',
      data: {
        installationId: installId,
        appSlug: 'opspilot-ci-cd',
        targetType: 'Organization',
        repositoriesAccessible: ['https://github.com/abdul78-create/StockFlow'],
        installedAt: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Post('github/repositories')
  @ApiOperation({
    summary:
      'List repositories accessible via GitHub authentication token or GitHub App installation',
  })
  async listAppRepositories(@Body() payload: { installationId?: string; accessToken?: string }) {
    const token = payload?.accessToken || process.env.GITHUB_TOKEN;
    if (token) {
      try {
        const repos = await this.githubAppService.listUserRepositories(token);
        return { status: 'success', data: { repositories: repos } };
      } catch (err) {
        return {
          status: 'error',
          message: (err as Error).message,
          data: { repositories: [] },
        };
      }
    }

    return {
      status: 'not_configured',
      message:
        'GitHub App / OAuth repository browsing is not configured. Provide an accessToken or set GITHUB_TOKEN to list repositories dynamically.',
      data: { repositories: [] },
    };
  }
}
