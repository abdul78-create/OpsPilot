import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceManagerService } from './workspace-manager.service';
import * as fs from 'fs';

describe('WorkspaceManagerService', () => {
  let service: WorkspaceManagerService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkspaceManagerService],
    }).compile();

    service = module.get<WorkspaceManagerService>(WorkspaceManagerService);
    jest.spyOn(service as any, 'cloneRepo').mockResolvedValue(undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should prepare workspace directory lease for pipeline run', async () => {
    const lease = await service.prepareWorkspace('test_run_123', 'https://github.com/acme-corp/backend-api.git', 'main');

    expect(lease).toBeDefined();
    expect(lease.pipelineRunId).toBe('test_run_123');
    expect(lease.isMounted).toBe(true);

    // Cleanup after test
    await service.cleanupWorkspace('test_run_123');
  });
});
