import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { DemoController } from './demo.controller';
import {
  DemoSeedService,
  DEMO_USER_EMAIL,
  DEMO_ORG_SLUG,
  DEMO_PROJECT_SLUG,
  DEMO_PIPELINE_SLUG,
  DEMO_ENV_SLUG,
} from './demo-seed.service';
import { DemoRunnerService } from './demo-runner.service';
import { AuthService } from '../auth/auth.service';
import { TokenService } from '../../../core/security/token.service';
import { HashService } from '../../../core/security/hash.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { StateMachineService } from '../../../core/worker/state-machine.service';
import { LogsService } from '../log-streaming/logs.service';
import { JobStatus, LogLevel, PipelineRunStatus } from '@prisma/client';

describe('Demo Mode Automated Integration & Security Test Suite', () => {
  let demoController: DemoController;
  let authService: AuthService;
  let demoSeedService: DemoSeedService;
  let demoRunnerService: DemoRunnerService;
  let tokenService: TokenService;
  let prismaService: PrismaService;
  let logsService: LogsService;

  const mockUser = {
    id: 'usr_demo_123',
    email: DEMO_USER_EMAIL,
    name: 'Demo Operator',
    role: 'USER',
    isVerified: true,
  };

  const mockOrg = {
    id: 'org_demo_123',
    name: 'OpsPilot Demo Organization',
    slug: DEMO_ORG_SLUG,
  };

  const mockProject = {
    id: 'proj_demo_123',
    name: 'Demo E-Commerce Platform',
    slug: DEMO_PROJECT_SLUG,
  };

  const mockEnv = {
    id: 'env_demo_123',
    name: 'demo-staging',
    slug: DEMO_ENV_SLUG,
  };

  const mockPipeline = {
    id: 'pipe_demo_123',
    name: 'Demo CI/CD Pipeline',
    slug: DEMO_PIPELINE_SLUG,
  };

  const mockPipelineVersion = {
    id: 'pver_demo_123',
    versionNumber: 1,
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    repositoryConnection: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    environment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    pipelineDefinition: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    pipelineVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    pipelineJob: {
      update: jest.fn(),
    },
    pipelineRun: {
      update: jest.fn(),
    },
    artifact: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('mock_demo_jwt_access_token'),
    decodeToken: jest.fn().mockReturnValue({ isDemo: true, sub: mockUser.id }),
  };

  const mockEventBus = {
    publish: jest.fn().mockResolvedValue(undefined),
  };

  const mockStateMachine = {
    assertValidJobTransition: jest.fn(),
    assertValidRunTransition: jest.fn(),
  };

  const mockLogsService = {
    logAndEmit: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DemoController],
      providers: [
        DemoSeedService,
        DemoRunnerService,
        {
          provide: AuthService,
          useValue: {
            demoLogin: jest.fn(),
          },
        },
        { provide: TokenService, useValue: mockTokenService },
        {
          provide: HashService,
          useValue: {
            hashPassword: jest.fn().mockResolvedValue('mock_hashed_pw'),
            verifyPassword: jest.fn().mockResolvedValue(true),
            hashSha256: jest.fn().mockReturnValue('mock_sha256'),
          },
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: StateMachineService, useValue: mockStateMachine },
        { provide: LogsService, useValue: mockLogsService },
      ],
    }).compile();

    demoController = module.get<DemoController>(DemoController);
    authService = module.get<AuthService>(AuthService);
    demoSeedService = module.get<DemoSeedService>(DemoSeedService);
    demoRunnerService = module.get<DemoRunnerService>(DemoRunnerService);
    tokenService = module.get<TokenService>(TokenService);
    prismaService = module.get<PrismaService>(PrismaService);
    logsService = module.get<LogsService>(LogsService);
  });

  describe('Security Verification: DEMO_MODE_ENABLED Gate', () => {
    it('POSITIVE: should successfully issue demo JWT with isDemo=true when DEMO_MODE_ENABLED is true', async () => {
      process.env.DEMO_MODE_ENABLED = 'true';

      const realAuthService = new AuthService(
        prismaService,
        {} as any,
        tokenService,
        {} as any,
        mockEventBus as any,
        {} as any,
      );

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem_1' });
      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({ id: 'repo_1' });
      mockPrisma.environment.findFirst.mockResolvedValue(mockEnv);
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipelineVersion.findFirst.mockResolvedValue(mockPipelineVersion);

      const result = await realAuthService.demoLogin(demoSeedService);

      expect(result).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock_demo_jwt_access_token');
      expect(result.tokens.refreshToken).toBe('');
      expect(result.user.email).toBe(DEMO_USER_EMAIL);
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: DEMO_USER_EMAIL,
          isDemo: true,
        }),
      );
    });

    it('NEGATIVE: should strictly reject demo login with 403 Forbidden when DEMO_MODE_ENABLED is false', async () => {
      process.env.DEMO_MODE_ENABLED = 'false';

      const realAuthService = new AuthService(
        prismaService,
        {} as any,
        tokenService,
        {} as any,
        mockEventBus as any,
        {} as any,
      );

      await expect(realAuthService.demoLogin(demoSeedService)).rejects.toThrow(ForbiddenException);
      await expect(realAuthService.demoLogin(demoSeedService)).rejects.toThrow(
        /Demo mode is not enabled/,
      );
    });

    it('NEGATIVE: should strictly reject demo login when DEMO_MODE_ENABLED is undefined', async () => {
      delete process.env.DEMO_MODE_ENABLED;

      const realAuthService = new AuthService(
        prismaService,
        {} as any,
        tokenService,
        {} as any,
        mockEventBus as any,
        {} as any,
      );

      await expect(realAuthService.demoLogin(demoSeedService)).rejects.toThrow(ForbiddenException);
    });

    it('POSITIVE: DemoController delegates demoLogin to AuthService', async () => {
      const mockResponse = {
        user: mockUser as any,
        tokens: { accessToken: 'tok_1', refreshToken: '' },
      };
      (authService.demoLogin as jest.Mock).mockResolvedValue(mockResponse);
      const res = await demoController.demoLogin();
      expect(res).toEqual(mockResponse);
      expect(authService.demoLogin).toHaveBeenCalledWith(demoSeedService);
    });
  });

  describe('Demo Seed Service Idempotency & Tenant Isolation', () => {
    it('should create demo resources when they do not exist', async () => {
      process.env.DEMO_MODE_ENABLED = 'true';

      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockOrg);

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      mockPrisma.member.findFirst.mockResolvedValue(null);
      mockPrisma.member.create.mockResolvedValue({ id: 'mem_new' });

      mockPrisma.project.findFirst.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue(mockProject);

      mockPrisma.repositoryConnection.findFirst.mockResolvedValue(null);
      mockPrisma.repositoryConnection.create.mockResolvedValue({ id: 'repo_new' });

      mockPrisma.environment.findFirst.mockResolvedValue(null);
      mockPrisma.environment.create.mockResolvedValue(mockEnv);

      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue(null);
      mockPrisma.pipelineDefinition.create.mockResolvedValue(mockPipeline);

      mockPrisma.pipelineVersion.create.mockResolvedValue(mockPipelineVersion);

      const ctx = await demoSeedService.ensureDemoContext();

      expect(ctx.userId).toBe(mockUser.id);
      expect(ctx.orgId).toBe(mockOrg.id);
      expect(ctx.projectId).toBe(mockProject.id);
      expect(ctx.pipelineId).toBe(mockPipeline.id);
      expect(mockPrisma.organization.create).toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.project.create).toHaveBeenCalled();
    });

    it('should reuse existing demo resources without re-creating them (idempotency)', async () => {
      process.env.DEMO_MODE_ENABLED = 'true';

      mockPrisma.organization.findFirst.mockResolvedValue(mockOrg);
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.member.findFirst.mockResolvedValue({ id: 'mem_existing' });
      mockPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockPrisma.repositoryConnection.findFirst.mockResolvedValue({ id: 'repo_existing' });
      mockPrisma.environment.findFirst.mockResolvedValue(mockEnv);
      mockPrisma.pipelineDefinition.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.pipelineVersion.findFirst.mockResolvedValue(mockPipelineVersion);

      const ctx = await demoSeedService.ensureDemoContext();

      expect(ctx.userId).toBe(mockUser.id);
      expect(ctx.orgId).toBe(mockOrg.id);
      expect(mockPrisma.organization.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });
  });

  describe('Demo Runner Service Simulated Execution', () => {
    it('should execute a demo job, emit real logs, transition state, and return SUCCESS', async () => {
      const mockJob = {
        id: 'job_demo_1',
        pipelineRunId: 'run_demo_1',
        name: 'install-dependencies',
        stage: 'dependency-installation',
        status: JobStatus.QUEUED,
        matrixKey: null,
      } as any;

      mockPrisma.pipelineJob.update
        .mockResolvedValueOnce({ ...mockJob, status: JobStatus.RUNNING })
        .mockResolvedValueOnce({ ...mockJob, status: JobStatus.SUCCESS });

      // Fast-forward simulated delay
      jest.spyOn<any, any>(demoRunnerService, 'delay').mockResolvedValue(undefined);

      const result = await demoRunnerService.executeDemoJob(mockJob);
      expect(result.status).toBe(JobStatus.SUCCESS);
      expect(logsService).toBeDefined();

      expect(mockStateMachine.assertValidJobTransition).toHaveBeenCalledWith(
        JobStatus.QUEUED,
        JobStatus.RUNNING,
      );
      expect(mockStateMachine.assertValidJobTransition).toHaveBeenCalledWith(
        JobStatus.RUNNING,
        JobStatus.SUCCESS,
      );
      expect(mockLogsService.logAndEmit).toHaveBeenCalledWith(
        'run_demo_1',
        LogLevel.INFO,
        expect.stringContaining('DEMO MODE'),
        'job_demo_1',
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'pipeline.job_completed.v1',
          payload: expect.objectContaining({
            jobId: 'job_demo_1',
            status: JobStatus.SUCCESS,
            demo: true,
          }),
        }),
      );
    });

    it('should finalize demo run and publish pipeline.run_completed.v1 event', async () => {
      mockPrisma.pipelineRun.update.mockResolvedValue({
        id: 'run_demo_1',
        status: PipelineRunStatus.SUCCESS,
      });

      await demoRunnerService.finalizeDemoRun('run_demo_1');

      expect(mockPrisma.pipelineRun.update).toHaveBeenCalledWith({
        where: { id: 'run_demo_1' },
        data: expect.objectContaining({
          status: PipelineRunStatus.SUCCESS,
        }),
      });
      expect(mockLogsService.logAndEmit).toHaveBeenCalledWith(
        'run_demo_1',
        LogLevel.INFO,
        expect.stringContaining('DEMO MODE: All pipeline stages completed'),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'pipeline.run_completed.v1',
          payload: expect.objectContaining({
            pipelineRunId: 'run_demo_1',
            status: PipelineRunStatus.SUCCESS,
            demo: true,
          }),
        }),
      );
    });
  });
});
