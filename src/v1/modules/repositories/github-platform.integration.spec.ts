import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAppService } from './services/github-app.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('GitHub App Platform Integration Test Suite', () => {
  let service: GitHubAppService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GITHUB_APP_ID') return '123456';
      if (key === 'GITHUB_APP_PRIVATE_KEY') return 'mock_test_secret_key';
      return null;
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_app_jwt_header.payload.signature'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAppService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<GitHubAppService>(GitHubAppService);
  });

  it('should generate signed GitHub App JWT for authentication', () => {
    const jwt = service.generateAppJwt();
    expect(jwt).toBe('mock_app_jwt_header.payload.signature');
    expect(mockJwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        iss: '123456',
      }),
      expect.anything(),
    );
  });

  it('should generate and rotate temporary installation access tokens', async () => {
    const tokenObj = await service.getInstallationAccessToken('inst_998877');
    expect(tokenObj.installationId).toBe('inst_998877');
    expect(tokenObj.token).toMatch(/^ghs_rot_/);
    expect(tokenObj.expiresAt).toBeDefined();
  });

  it('should list repository branches including protection rules', async () => {
    const branches = await service.listBranches('abdul78-create', 'StockFlow');
    expect(branches).toHaveLength(3);
    expect(branches.find((b) => b.name === 'main')?.isProtected).toBe(true);
  });

  it('should list repository commit history with author and message lineage', async () => {
    const commits = await service.listCommits('abdul78-create', 'StockFlow', 'main');
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0].sha).toBeDefined();
    expect(commits[0].authorEmail).toBe('abdul@opspilot.ai');
  });

  it('should trigger workflow dispatch event for repository automation', async () => {
    const result = await service.dispatchWorkflow('abdul78-create', 'StockFlow', 'manual_build', {
      env: 'staging',
    });
    expect(result.status).toBe('dispatched');
    expect(result.eventType).toBe('manual_build');
  });
});
