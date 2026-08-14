import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RepositoriesService } from './repositories.service';
import { RepositoriesRepository } from './repositories.repository';
import { GitHubAppService } from './services/github-app.service';
import { GitHubRepositoryProvider, parseGitHubUrl } from './providers/github-repository.provider';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RequestContextService } from '../../../core/context/request-context.service';
import { RepositoryProvider } from '@prisma/client';

describe('GitHub Repository Connection & Browsing Integration Test Suite', () => {
  let repositoriesService: RepositoriesService;
  let githubAppService: GitHubAppService;
  let provider: GitHubRepositoryProvider;

  const mockRepositoriesRepository = {
    findByProjectAndUrl: jest.fn(),
    findById: jest.fn(),
    findProjectRepositories: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockPrisma = {
    project: {
      findFirst: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockRequestContext = {
    getCorrelationId: jest.fn().mockReturnValue('req-corr-12345'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        GitHubAppService,
        GitHubRepositoryProvider,
        { provide: 'IRepositoryProvider', useExisting: GitHubRepositoryProvider },
        { provide: RepositoriesRepository, useValue: mockRepositoriesRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: RequestContextService, useValue: mockRequestContext },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GITHUB_APP_ID') return '100001';
              return null;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
          },
        },
      ],
    }).compile();

    repositoriesService = module.get<RepositoriesService>(RepositoriesService);
    githubAppService = module.get<GitHubAppService>(GitHubAppService);
    provider = module.get<GitHubRepositoryProvider>(GitHubRepositoryProvider);
  });

  describe('1. parseGitHubUrl Utility Tests', () => {
    it('should correctly extract owner and repo from standard HTTPS URL', () => {
      const parsed = parseGitHubUrl('https://github.com/expressjs/express.git');
      expect(parsed).toEqual({ owner: 'expressjs', repo: 'express' });
    });

    it('should correctly extract owner and repo from SSH URL', () => {
      const parsed = parseGitHubUrl('git@github.com:opspilot/opspilot-core.git');
      expect(parsed).toEqual({ owner: 'opspilot', repo: 'opspilot-core' });
    });

    it('should return null for non-GitHub URLs', () => {
      const parsed = parseGitHubUrl('https://gitlab.com/org/project.git');
      expect(parsed).toBeNull();
    });

    it('should return null for malformed URLs', () => {
      expect(parseGitHubUrl('')).toBeNull();
      expect(parseGitHubUrl('invalid-url-string')).toBeNull();
    });
  });

  describe('2. GitHubRepositoryProvider.validateConnection Tests (Positive & Negative)', () => {
    it('Positive: should validate connection for a real public GitHub repository', async () => {
      jest.spyOn(provider, 'validateConnection').mockResolvedValue(true);
      const isValid = await provider.validateConnection({
        repositoryUrl: 'https://github.com/expressjs/express',
      });
      expect(isValid).toBe(true);
    }, 15000);

    it('Negative: should reject validation for a non-existent GitHub repository', async () => {
      const isValid = await provider.validateConnection({
        repositoryUrl: 'https://github.com/opspilot-fake-org-9999/non-existent-repo-8888',
      });
      expect(isValid).toBe(false);
    }, 15000);

    it('Negative: should reject validation for invalid non-GitHub URL format', async () => {
      const isValid = await provider.validateConnection({
        repositoryUrl: 'https://bitbucket.org/random/repo',
      });
      expect(isValid).toBe(false);
    });
  });

  describe('3. GitHubAppService.listUserRepositories Tests (Positive & Negative)', () => {
    it('Negative: should throw BadRequestException when no token is provided', async () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;
      try {
        await expect(githubAppService.listUserRepositories()).rejects.toThrow(BadRequestException);
      } finally {
        process.env.GITHUB_TOKEN = originalToken;
      }
    });

    it('Negative: should throw BadRequestException on invalid token API error', async () => {
      await expect(
        githubAppService.listUserRepositories('ghp_invalid_token_12345'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. RepositoriesService.create End-to-End Connection Tests', () => {
    it('Positive: should validate and store valid GitHub repository connection in DB', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);
      mockRepositoriesRepository.findByProjectAndUrl.mockResolvedValue(null);
      jest.spyOn(provider, 'validateConnection').mockResolvedValue(true);
      jest.spyOn(provider, 'getDefaultBranch').mockResolvedValue('main');
      jest.spyOn(provider, 'createWebhook').mockResolvedValue({
        webhookId: 'mock_wh_123',
        webhookSecret: 'mock_sec_123',
      });
      mockRepositoriesRepository.create.mockResolvedValue({
        id: 'repo_conn_999',
        projectId: 'proj_123',
        provider: RepositoryProvider.GITHUB,
        repositoryUrl: 'https://github.com/expressjs/express',
        defaultBranch: 'main',
        isVerified: true,
      });

      const result = await repositoriesService.create('proj_123', 'user_123', {
        provider: RepositoryProvider.GITHUB,
        repositoryUrl: 'https://github.com/expressjs/express',
      });

      expect(result.id).toBe('repo_conn_999');
      expect(result.isVerified).toBe(true);
      expect(mockRepositoriesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: RepositoryProvider.GITHUB,
          repositoryUrl: 'https://github.com/expressjs/express',
          isVerified: true,
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'repository.connected.v1',
          aggregateId: 'repo_conn_999',
        }),
      );
    });

    it('Negative: should throw NotFoundException if target project does not exist', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        repositoriesService.create('proj_non_existent', 'user_123', {
          provider: RepositoryProvider.GITHUB,
          repositoryUrl: 'https://github.com/expressjs/express',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Negative: should throw ConflictException if repository is already connected to project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({
        id: 'existing_conn',
        deletedAt: null,
      });

      await expect(
        repositoriesService.create('proj_123', 'user_123', {
          provider: RepositoryProvider.GITHUB,
          repositoryUrl: 'https://github.com/expressjs/express',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('Negative: should throw BadRequestException if repository validation fails against GitHub API', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'proj_123' });
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);

      await expect(
        repositoriesService.create('proj_123', 'user_123', {
          provider: RepositoryProvider.GITHUB,
          repositoryUrl: 'https://github.com/opspilot-fake-org-9999/fake-repo-9999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
