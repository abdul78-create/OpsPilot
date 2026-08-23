import { Test, TestingModule } from '@nestjs/testing';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';
import { GitHubAppService } from '../repositories/services/github-app.service';
import { NotFoundException } from '@nestjs/common';

describe('AI Fix Application & Human-Approved Branch Workflow', () => {
  let service: AiOrchestrationService;

  const mockAiRepo = {
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockPrisma = {
    pipelineRun: { findFirst: jest.fn() },
    deployment: { findFirst: jest.fn(), count: jest.fn() },
  };

  const mockAiProvider = {
    analyzeRunFailure: jest.fn(),
    scoreDeploymentRisk: jest.fn(),
  };

  const mockGitHubApp = {
    createBranch: jest.fn().mockResolvedValue({
      ref: 'refs/heads/opspilot/fix-abc12345',
      sha: 'sha_123',
      created: true,
    }),
    createOrUpdateFile: jest.fn().mockResolvedValue({
      path: 'opspilot-fix.patch',
      commitSha: 'commit_sha_123',
      status: 'COMMITTED',
    }),
    createPullRequest: jest.fn().mockResolvedValue({
      prNumber: 99,
      htmlUrl: 'https://github.com/org/repo/pull/99',
      title: 'fix: automated patch',
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiOrchestrationService,
        { provide: AiOrchestrationRepository, useValue: mockAiRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiAiProvider, useValue: mockAiProvider },
        { provide: GitHubAppService, useValue: mockGitHubApp },
      ],
    }).compile();

    service = module.get<AiOrchestrationService>(AiOrchestrationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prepare an isolated fix branch proposal without modifying main directly', async () => {
    const reportId = 'rep_123';
    const targetRunId = 'run_abc12345_def';

    mockAiRepo.findById.mockResolvedValueOnce({
      id: reportId,
      targetId: targetRunId,
      summary: 'Permission denied on deploy script',
      rootCause: 'Binary missing execute permissions',
      metadata: {
        suggestedCommands: ['chmod +x scripts/*.sh'],
        suggestedPatch:
          '--- a/pipeline.yml\n+++ b/pipeline.yml\n@@ -5,2 +5,3 @@\n+    - run: chmod +x ./entrypoint.sh',
      },
    });

    const result = await service.applyFix(reportId);

    expect(result.reportId).toBe(reportId);
    expect(result.targetRunId).toBe(targetRunId);
    expect(result.fixBranch).toBe(`opspilot/fix-${targetRunId.slice(0, 8)}`);
    expect(result.suggestedPatch).toContain('chmod +x ./entrypoint.sh');
    expect(result.suggestedCommands).toContain('chmod +x scripts/*.sh');
    expect(result.status).toBe('READY_FOR_REVIEW');
    expect(result.reTestInstructions).toContain(
      `git checkout -b opspilot/fix-${targetRunId.slice(0, 8)}`,
    );
  });

  it('should create remote branch, commit patch file, and open Pull Request on GitHub when createRemotePr is true', async () => {
    const reportId = 'rep_pr_123';
    const targetRunId = 'fe987654_xyz';

    mockAiRepo.findById.mockResolvedValueOnce({
      id: reportId,
      targetId: targetRunId,
      summary: 'Missing dependencies',
      rootCause: 'Module not found',
      confidenceScore: 0.95,
      metadata: {
        suggestedCommands: ['npm install axios'],
        suggestedPatch:
          '--- a/package.json\n+++ b/package.json\n@@ -10,1 +10,2 @@\n+ "axios": "^1.6.0"',
      },
    });

    const result = await service.applyFix(reportId, {
      createRemotePr: true,
      owner: 'acme-org',
      repo: 'web-app',
      accessToken: 'ghp_test_token',
    });

    expect(mockGitHubApp.createBranch).toHaveBeenCalledWith(
      'acme-org',
      'web-app',
      'opspilot/fix-fe987654',
      'main',
      'ghp_test_token',
    );

    expect(mockGitHubApp.createOrUpdateFile).toHaveBeenCalledWith(
      'acme-org',
      'web-app',
      'opspilot-fix.patch',
      expect.stringContaining('axios'),
      expect.any(String),
      'opspilot/fix-fe987654',
      'ghp_test_token',
    );

    expect(mockGitHubApp.createPullRequest).toHaveBeenCalledWith(
      'acme-org',
      'web-app',
      expect.stringContaining('fix(opspilot)'),
      'opspilot/fix-fe987654',
      'main',
      expect.any(String),
      'ghp_test_token',
    );

    expect(result.status).toBe('PULL_REQUEST_OPENED');
    expect(result.pullRequest?.htmlUrl).toBe('https://github.com/org/repo/pull/99');
  });

  it('should throw NotFoundException if AI report does not exist', async () => {
    mockAiRepo.findById.mockResolvedValueOnce(null);

    await expect(service.applyFix('non_existent_report')).rejects.toThrow(NotFoundException);
  });
});
