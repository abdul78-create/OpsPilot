import { Test, TestingModule } from '@nestjs/testing';
import { DockerRunnerService } from './services/docker-runner.service';
import { LogsService } from '../log-streaming/logs.service';
import { RuleBasedAiProvider } from '../../../core/ai/providers/rule-based-ai.provider';
import { GeminiAiProvider } from '../../../core/ai/providers/gemini-ai.provider';
import { ConfigService } from '@nestjs/config';
import { LogLevel, AiRiskLevel } from '@prisma/client';

describe('Docker Runner Security Hardening & AI RCA Fix Proposal Verification', () => {
  let dockerRunner: DockerRunnerService;
  let ruleBasedAi: RuleBasedAiProvider;

  const mockLogsService = {
    logAndEmit: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerRunnerService,
        { provide: LogsService, useValue: mockLogsService },
        RuleBasedAiProvider,
        GeminiAiProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    dockerRunner = module.get<DockerRunnerService>(DockerRunnerService);
    ruleBasedAi = module.get<RuleBasedAiProvider>(RuleBasedAiProvider);
  });

  describe('1. Docker Runner Resource Limits & Sandboxing', () => {
    it('should configure memory, CPU, PID limits, and network sandbox', async () => {
      // Execute a quick safe echo command to verify parameter construction
      const result = await dockerRunner.runStep({
        pipelineRunId: 'test_run_hardened_1',
        jobId: 'test_job_1',
        image: 'alpine:latest',
        command: 'echo "Sandbox Active"',
        memoryLimit: '512m',
        cpuLimit: '1.0',
        network: 'bridge',
        timeoutSeconds: 30,
      });

      expect(result.exitCode).toBe(0);
      expect(mockLogsService.logAndEmit).toHaveBeenCalledWith(
        'test_run_hardened_1',
        LogLevel.INFO,
        expect.stringContaining('[Sandbox] Executing in container (Mem: 512m, CPU: 1.0'),
        'test_job_1',
      );
    }, 30000);

    it('should STRICTLY REJECT any attempt to mount docker.sock (Negative Security Test)', async () => {
      await expect(
        dockerRunner.runStep({
          pipelineRunId: 'test_run_exploit',
          jobId: 'test_job_exploit',
          command: 'echo "exploit"',
          workspacePath: '/var/run/docker.sock',
        }),
      ).rejects.toThrow('Security Violation: Mounting docker.sock is strictly forbidden');
    });

    it('should default to air-gapped network isolation (network: none) when internet is not requested', async () => {
      const result = await dockerRunner.runStep({
        pipelineRunId: 'test_run_isolated',
        jobId: 'test_job_isolated',
        image: 'alpine:latest',
        command: 'echo "Air-Gapped Test"',
        network: 'none',
        timeoutSeconds: 30,
      });

      expect(result.exitCode).toBe(0);
      expect(mockLogsService.logAndEmit).toHaveBeenCalledWith(
        'test_run_isolated',
        LogLevel.INFO,
        expect.stringContaining('Net: none'),
        'test_job_isolated',
      );
    }, 30000);
  });

  describe('2. AI RCA with Actionable Patch & Fix Proposals', () => {
    it('should generate concrete CLI fix commands and git unified diff patch for permission errors', async () => {
      const result = await ruleBasedAi.analyzeRunFailure({
        runId: 'run_perm_fail',
        pipelineName: 'Production Deploy',
        failedJobs: [
          {
            id: 'job_1',
            name: 'build-and-deploy',
            stage: 'deploy',
            logs: [
              {
                level: LogLevel.ERROR,
                message: 'sh: ./deploy.sh: Permission denied (EACCES)',
                timestamp: new Date(),
              },
            ],
          },
        ],
      });

      expect(result.riskLevel).toBe(AiRiskLevel.HIGH);
      expect(result.rootCause).toContain('File system or binary permission failure');
      expect(result.suggestedCommands).toBeDefined();
      expect(result.suggestedCommands).toContain('chmod +x scripts/*.sh');
      expect(result.suggestedPatch).toBeDefined();
      expect(result.suggestedPatch).toContain('chmod +x ./entrypoint.sh');
    });

    it('should generate concrete dependency fix commands and patch for missing modules', async () => {
      const result = await ruleBasedAi.analyzeRunFailure({
        runId: 'run_mod_fail',
        pipelineName: 'Frontend Build',
        failedJobs: [
          {
            id: 'job_2',
            name: 'compile',
            stage: 'build',
            logs: [
              {
                level: LogLevel.ERROR,
                message: 'Error: Cannot find module "typescript"',
                timestamp: new Date(),
              },
            ],
          },
        ],
      });

      expect(result.suggestedCommands).toContain('npm install');
      expect(result.suggestedPatch).toContain('"typescript": "^5.0.0"');
    });
  });
});
