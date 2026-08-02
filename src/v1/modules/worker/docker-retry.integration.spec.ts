import { Test, TestingModule } from '@nestjs/testing';
import { DockerRunnerService } from './services/docker-runner.service';
import { LogsService } from '../log-streaming/logs.service';

describe('DockerRunnerService Selective Retry Integration Test', () => {
  let service: DockerRunnerService;

  const mockLogsService = {
    appendLog: jest.fn(),
    logAndEmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DockerRunnerService,
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<DockerRunnerService>(DockerRunnerService);
    jest.clearAllMocks();
  });

  it('should identify transient daemon errors as retryable', () => {
    expect(service.isTransientError(125, '')).toBe(true);
    expect(service.isTransientError(126, '')).toBe(true);
    expect(service.isTransientError(1, 'Cannot connect to the Docker daemon')).toBe(true);
    expect(service.isTransientError(1, 'network is unreachable')).toBe(true);
  });

  it('should identify code build/test errors as non-retryable (deterministic)', () => {
    expect(service.isTransientError(1, 'tsc error TS2339')).toBe(false);
    expect(service.isTransientError(2, 'npm error ENOENT package.json')).toBe(false);
    expect(service.isTransientError(1, 'Vite build failed')).toBe(false);
  });

  it('should skip retrying when build script exits with code 1 (deterministic failure)', async () => {
    const runStepSpy = jest.spyOn(service, 'runStep').mockResolvedValue({ exitCode: 1 });

    const result = await service.runStepWithRetry({
      pipelineRunId: 'run_test_1',
      jobId: 'job_test_1',
      command: 'npm run build',
    });

    expect(result.exitCode).toBe(1);
    expect(runStepSpy).toHaveBeenCalledTimes(1); // Only 1 attempt, zero retries for deterministic code failure!
  });
});
