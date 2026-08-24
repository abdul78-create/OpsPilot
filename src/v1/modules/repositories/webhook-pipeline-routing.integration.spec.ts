import { Test, TestingModule } from '@nestjs/testing';
import {
  WebhookPipelineRouterService,
  TriggeredRunSummary,
} from '../pipelines/services/webhook-pipeline-router.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { getQueueToken } from '@nestjs/bullmq';
import { PIPELINE_RUN_QUEUE } from '../../../core/worker/worker.constants';
import { TriggerType, PipelineRunStatus, JobStatus, ProjectStatus } from '@prisma/client';

describe('WebhookPipelineRouterService Integration Tests', () => {
  let service: WebhookPipelineRouterService;

  const orgId = 'org-webhook-001';
  const projectId = 'proj-webhook-001';
  const pipelineId = 'pipe-webhook-001';
  const pipelineVersionId = 'pipver-webhook-001';

  // ─── Shared in-memory state ────────────────────────────────────────────────
  let inMemoryRuns: Record<string, unknown>[] = [];
  let inMemoryJobs: Record<string, unknown>[] = [];
  let publishedEvents: Record<string, unknown>[] = [];
  let enqueuedBullJobs: Record<string, unknown>[] = [];

  // ─── Test fixture data ─────────────────────────────────────────────────────

  const mainBranchPipeline = {
    id: pipelineId,
    projectId,
    name: 'Main CI Pipeline',
    slug: 'main-ci',
    triggerType: TriggerType.GIT_PUSH,
    triggerBranch: 'main',
    isActive: true,
    deletedAt: null,
    versions: [{ id: pipelineVersionId, versionNumber: 1, yamlConfig: '# pipeline' }],
  };

  const wildcardPipeline = {
    id: 'pipe-wildcard-001',
    projectId: 'proj-wildcard-001',
    name: 'Wildcard All-Branches Pipeline',
    slug: 'wildcard-ci',
    triggerType: TriggerType.GIT_PUSH,
    triggerBranch: '*',
    isActive: true,
    deletedAt: null,
    versions: [{ id: 'pipver-wildcard-001', versionNumber: 1, yamlConfig: '# wildcard' }],
  };

  const repositoryConnection = {
    id: 'conn-001',
    projectId,
    repositoryUrl: 'https://github.com/myorg/myrepo',
    provider: 'GITHUB',
    deletedAt: null,
    project: {
      id: projectId,
      organizationId: orgId,
      status: ProjectStatus.ACTIVE,
    },
  };

  // ─── Mock Prisma ───────────────────────────────────────────────────────────

  const buildMockPrisma = (pipelines: unknown[], connections: unknown[]) => ({
    repositoryConnection: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          (connections as (typeof repositoryConnection)[]).filter(
            (c) => c.repositoryUrl === where.repositoryUrl && !c.deletedAt,
          ),
        );
      }),
    },
    pipelineDefinition: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          (pipelines as (typeof mainBranchPipeline)[]).filter(
            (p) =>
              p.projectId === where.projectId &&
              p.isActive === where.isActive &&
              !p.deletedAt &&
              p.triggerType === where.triggerType,
          ),
        );
      }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        pipelineRun: {
          create: jest.fn().mockImplementation((args) => {
            const run = {
              id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              ...args.data,
              createdAt: new Date(),
            };
            inMemoryRuns.push(run);
            return Promise.resolve(run);
          }),
        },
        pipelineJob: {
          create: jest.fn().mockImplementation((args) => {
            const job = {
              id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              ...args.data,
              createdAt: new Date(),
            };
            inMemoryJobs.push(job);
            return Promise.resolve(job);
          }),
        },
      };
      return fn(fakeTx);
    }),
  });

  const mockEventBus = {
    publish: jest.fn().mockImplementation((event) => {
      publishedEvents.push(event);
      return Promise.resolve();
    }),
  };

  const mockQueue = {
    add: jest.fn().mockImplementation((name, data, opts) => {
      enqueuedBullJobs.push({ name, data, opts });
      return Promise.resolve({ id: `bull-${Date.now()}` });
    }),
  };

  // ─── Test Setup ───────────────────────────────────────────────────────────

  const buildModule = async (pipelines: unknown[], connections: unknown[]) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookPipelineRouterService,
        { provide: PrismaService, useValue: buildMockPrisma(pipelines, connections) },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: getQueueToken(PIPELINE_RUN_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    return module.get<WebhookPipelineRouterService>(WebhookPipelineRouterService);
  };

  beforeEach(() => {
    inMemoryRuns = [];
    inMemoryJobs = [];
    publishedEvents = [];
    enqueuedBullJobs = [];
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 1: HAPPY PATH — Pipeline Matching & Triggering
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[ROUTING] Happy path — push to registered repository', () => {
    it('should find matching pipeline and create a PipelineRun DB record', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'abc1234def5678901234567890123456789012',
        pusher: 'john-doe',
      });

      expect(result.triggeredRuns.length).toBe(1);
      expect(result.triggeredRuns[0].pipelineDefinitionId).toBe(pipelineId);
      expect(result.triggeredRuns[0].pipelineName).toBe('Main CI Pipeline');
      expect(result.triggeredRuns[0].organizationId).toBe(orgId);
      expect(result.triggeredRuns[0].branch).toBe('main');
      expect(result.triggeredRuns[0].commitSha).toBe('abc1234def5678901234567890123456789012');
      expect(result.triggeredRuns[0].pipelineRunId).toBeDefined();
    });

    it('should create a PipelineRun with status QUEUED in the DB', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-abc-123',
        pusher: 'pusher-user',
      });

      expect(inMemoryRuns.length).toBe(1);
      const run = inMemoryRuns[0] as Record<string, unknown>;
      expect(run['status']).toBe(PipelineRunStatus.QUEUED);
      expect(run['triggerType']).toBe(TriggerType.GIT_PUSH);
      expect(run['triggeredBy']).toBe('pusher-user');
      expect(run['commitSha']).toBe('sha-abc-123');
      expect(run['branch']).toBe('main');
    });

    it('should create default build/test/deploy PipelineJob records per run', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-jobs-test',
        pusher: 'devops-bot',
      });

      expect(inMemoryJobs.length).toBe(3);

      const stages = inMemoryJobs.map((j) => (j as Record<string, unknown>)['stage']);
      expect(stages).toContain('build');
      expect(stages).toContain('test');
      expect(stages).toContain('deploy');

      const statuses = inMemoryJobs.map((j) => (j as Record<string, unknown>)['status']);
      statuses.forEach((s) => expect(s).toBe(JobStatus.QUEUED));
    });

    it('should enqueue a BullMQ job with the correct pipelineRunId and repoUrl', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-bullmq-test',
        pusher: 'ci-user',
      });

      expect(enqueuedBullJobs.length).toBe(1);
      const job = enqueuedBullJobs[0] as Record<string, unknown>;
      expect(job['data']).toMatchObject({
        pipelineRunId: result.triggeredRuns[0].pipelineRunId,
        repoUrl: 'https://github.com/myorg/myrepo',
        commitSha: 'sha-bullmq-test',
        branch: 'main',
      });
    });

    it('should publish pipeline.run_queued.v1 domain event with correct metadata', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-event-test',
        pusher: 'pipeline-bot',
      });

      expect(publishedEvents.length).toBe(1);
      const event = publishedEvents[0] as Record<string, unknown>;
      expect(event['eventName']).toBe('pipeline.run_queued.v1');
      expect(event['aggregateType']).toBe('PipelineRun');
      const payload = event['payload'] as Record<string, unknown>;
      expect(payload['pipelineRunId']).toBe(result.triggeredRuns[0].pipelineRunId);
      expect(payload['triggerType']).toBe(TriggerType.GIT_PUSH);
      expect(payload['repositoryUrl']).toBe('https://github.com/myorg/myrepo');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 2: BRANCH MISMATCH — No Trigger
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[BRANCH MISMATCH] Push to non-matching branch', () => {
    it('should NOT trigger pipeline when pushed branch does not match triggerBranch', async () => {
      service = await buildModule([mainBranchPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'develop', // Pipeline triggers on 'main'
        commitSha: 'sha-mismatch-001',
        pusher: 'dev-user',
      });

      expect(result.triggeredRuns.length).toBe(0);
      expect(result.skippedPipelines.length).toBe(1);
      expect(result.skippedPipelines[0].reason).toContain('Branch mismatch');
      expect(result.skippedPipelines[0].reason).toContain("pushed='develop'");
      expect(result.skippedPipelines[0].reason).toContain("trigger='main'");

      // Nothing should be enqueued or created
      expect(inMemoryRuns.length).toBe(0);
      expect(inMemoryJobs.length).toBe(0);
      expect(enqueuedBullJobs.length).toBe(0);
    });

    it('should trigger pipeline with wildcard triggerBranch (*) for any branch', async () => {
      const wildcardConnection = {
        ...repositoryConnection,
        projectId: 'proj-wildcard-001',
        project: { id: 'proj-wildcard-001', organizationId: orgId, status: ProjectStatus.ACTIVE },
      };
      service = await buildModule([wildcardPipeline], [wildcardConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'feature/new-auth-system',
        commitSha: 'sha-wildcard-test',
        pusher: 'feature-dev',
      });

      expect(result.triggeredRuns.length).toBe(1);
      expect(result.triggeredRuns[0].pipelineName).toBe('Wildcard All-Branches Pipeline');
      expect(result.triggeredRuns[0].branch).toBe('feature/new-auth-system');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 3: NO REPOSITORY CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[NO MATCH] Push to unregistered repository', () => {
    it('should return empty result when no RepositoryConnection exists for the pushed repo', async () => {
      service = await buildModule([mainBranchPipeline], []); // no connections

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/unknown-org/unknown-repo',
        branch: 'main',
        commitSha: 'sha-no-connection',
        pusher: 'unknown-user',
      });

      expect(result.triggeredRuns.length).toBe(0);
      expect(result.skippedPipelines.length).toBe(0);
      expect(inMemoryRuns.length).toBe(0);
      expect(enqueuedBullJobs.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 4: MULTIPLE PIPELINES — Fan-out
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[FAN-OUT] Multiple pipelines matching same repo+branch', () => {
    it('should trigger all matching pipelines and create separate runs', async () => {
      const secondPipeline = {
        ...mainBranchPipeline,
        id: 'pipe-webhook-002',
        name: 'Security Scan Pipeline',
        slug: 'security-scan',
        versions: [{ id: 'pipver-002', versionNumber: 1, yamlConfig: '# security' }],
      };

      service = await buildModule([mainBranchPipeline, secondPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-fanout-test',
        pusher: 'release-manager',
      });

      expect(result.triggeredRuns.length).toBe(2);
      expect(inMemoryRuns.length).toBe(2);
      expect(inMemoryJobs.length).toBe(6); // 3 jobs per pipeline × 2 pipelines
      expect(enqueuedBullJobs.length).toBe(2);
      expect(publishedEvents.length).toBe(2);

      const runIds = result.triggeredRuns.map((r: TriggeredRunSummary) => r.pipelineRunId);
      expect(new Set(runIds).size).toBe(2); // Distinct run IDs
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 5: INACTIVE PROJECT — Skipped
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[INACTIVE PROJECT] Should skip pipelines for non-ACTIVE projects', () => {
    it('should not trigger pipelines when project status is ARCHIVED', async () => {
      const archivedConn = {
        ...repositoryConnection,
        project: { id: projectId, organizationId: orgId, status: ProjectStatus.ARCHIVED },
      };

      service = await buildModule([mainBranchPipeline], [archivedConn]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-archived',
        pusher: 'legacy-user',
      });

      expect(result.triggeredRuns.length).toBe(0);
      expect(inMemoryRuns.length).toBe(0);
      expect(enqueuedBullJobs.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST SUITE 6: PIPELINE WITH NO VERSIONS — Skip, No Crash
  // ═══════════════════════════════════════════════════════════════════════════

  describe('[NO VERSION] Pipeline without any versions', () => {
    it('should skip pipeline gracefully and report it in skippedPipelines', async () => {
      const noVersionPipeline = {
        ...mainBranchPipeline,
        versions: [], // No versions
      };

      service = await buildModule([noVersionPipeline], [repositoryConnection]);

      const result = await service.routePushEvent({
        repositoryUrl: 'https://github.com/myorg/myrepo',
        branch: 'main',
        commitSha: 'sha-no-version',
        pusher: 'ci-bot',
      });

      expect(result.triggeredRuns.length).toBe(0);
      expect(result.skippedPipelines.length).toBe(1);
      expect(result.skippedPipelines[0].reason).toContain('No pipeline version found');
      expect(inMemoryRuns.length).toBe(0);
    });
  });
});
