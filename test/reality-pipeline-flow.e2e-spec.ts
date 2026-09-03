import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { JobStatus, PipelineRunStatus } from '@prisma/client';

describe('Reality Pipeline Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let orgId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // 1. Authenticate with QA credentials
    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'qa@opspilot.dev', password: 'QASecretPassword@2026!' })
      .expect(200);

    accessToken = loginRes.body?.tokens?.accessToken || loginRes.body?.data?.tokens?.accessToken;
    expect(accessToken).toBeDefined();

    // 2. Fetch active QA organization
    const orgsRes = await request(app.getHttpServer())
      .get('/v1/organizations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const orgs = Array.isArray(orgsRes.body?.data)
      ? orgsRes.body.data
      : Array.isArray(orgsRes.body)
        ? orgsRes.body
        : [];
    orgId = orgs[0]?.id;
    expect(orgId).toBeDefined();

    // 3. Ensure a test project exists
    const projRes = await request(app.getHttpServer())
      .get(`/v1/organizations/${orgId}/projects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const projs = Array.isArray(projRes.body?.data)
      ? projRes.body.data
      : Array.isArray(projRes.body)
        ? projRes.body
        : [];
    if (projs.length > 0) {
      projectId = projs[0].id;
    } else {
      const createProjRes = await request(app.getHttpServer())
        .post(`/v1/organizations/${orgId}/projects`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .send({ name: 'Permanent E2E Project', slug: `e2e-${Date.now()}` })
        .expect(201);
      const createdProj = createProjRes.body?.data || createProjRes.body;
      projectId = createdProj?.id;
    }
    expect(projectId).toBeDefined();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('REAL-E2E-001: Should create a pipeline with YAML schema and bump to v2 immutably', async () => {
    const initialYaml = `version: "1"
name: "E2E Regression Pipeline"
jobs:
  build:
    image: node:20-alpine
    commands:
      - echo "BUILD_V1"`;

    const createRes = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/pipelines`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Permanent E2E Pipeline ' + Date.now(),
        slug: 'e2e-reg-' + Date.now(),
        yamlConfig: initialYaml,
      })
      .expect(201);

    const pipelineId = createRes.body?.data?.id;
    expect(pipelineId).toBeDefined();
    expect(createRes.body?.data?.currentVersionNumber).toBe(1);

    // Bump to v2
    const v2Yaml = initialYaml + '\n      - echo "BUILD_V2_CHANGE"';
    const patchRes = await request(app.getHttpServer())
      .patch(`/v1/projects/${projectId}/pipelines/${pipelineId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'Permanent E2E Pipeline v2',
        yamlConfig: v2Yaml,
        changeSummary: 'Bumped to v2 in automated test',
      })
      .expect(200);

    expect(patchRes.body?.data?.currentVersionNumber).toBe(2);

    // Verify both versions exist immutably in DB
    const versions = await prisma.pipelineVersion.findMany({
      where: { pipelineDefinitionId: pipelineId },
      orderBy: { versionNumber: 'asc' },
    });
    expect(versions.length).toBe(2);
    expect(versions[0].versionNumber).toBe(1);
    expect(versions[1].versionNumber).toBe(2);
    expect(versions[0].checksum).toBeDefined();
    expect(versions[1].checksum).toBeDefined();
  });

  it('REAL-E2E-002: Should preserve exit code 0 and succeed with real artifact generation', async () => {
    const successYaml = `version: "1"
name: "E2E Success Pipeline"
jobs:
  build:
    image: node:20-alpine
    commands:
      - echo "E2E_PERMANENT_SUCCESS_VERIFIED"`;

    const createRes = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/pipelines`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'E2E Success Test ' + Date.now(),
        slug: 'e2e-succ-' + Date.now(),
        yamlConfig: successYaml,
      })
      .expect(201);

    const pipelineId = createRes.body?.data?.id;

    const runRes = await request(app.getHttpServer())
      .post(`/v1/pipelines/${pipelineId}/runs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({ triggerType: 'MANUAL', branch: 'main' })
      .expect(201);

    const runId = runRes.body?.data?.id;
    expect(runId).toBeDefined();

    // Poll until terminal status
    let finalRun = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await request(app.getHttpServer())
        .get(`/v1/runs/${runId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);
      if (check.body?.data?.status === 'SUCCESS' || check.body?.data?.status === 'FAILED') {
        finalRun = check.body?.data;
        break;
      }
    }

    expect(finalRun?.status).toBe(PipelineRunStatus.SUCCESS);

    // Verify logs
    const logsRes = await request(app.getHttpServer())
      .get(`/v1/runs/${runId}/logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const logs = logsRes.body?.data || [];
    const foundLog = logs.some((l: any) => l.message.includes('E2E_PERMANENT_SUCCESS_VERIFIED'));
    expect(foundLog).toBe(true);

    // Verify artifact generated
    const artRes = await request(app.getHttpServer())
      .get(`/v1/pipeline-runs/${runId}/artifacts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    expect(artRes.body?.data?.length).toBeGreaterThan(0);
    expect(artRes.body?.data?.[0]?.status).toBe('AVAILABLE');
  }, 45000);

  it('REAL-E2E-003: Should preserve non-zero exit code 42 and fail without masking', async () => {
    const failYaml = `version: "1"
name: "E2E Failure Pipeline"
jobs:
  build:
    image: node:20-alpine
    commands:
      - echo "E2E_PERMANENT_FAILURE_VERIFIED"
      - exit 42`;

    const createRes = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/pipelines`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'E2E Failure Test ' + Date.now(),
        slug: 'e2e-fail-' + Date.now(),
        yamlConfig: failYaml,
      })
      .expect(201);

    const pipelineId = createRes.body?.data?.id;

    const runRes = await request(app.getHttpServer())
      .post(`/v1/pipelines/${pipelineId}/runs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({ triggerType: 'MANUAL', branch: 'main' })
      .expect(201);

    const runId = runRes.body?.data?.id;
    expect(runId).toBeDefined();

    let finalRun = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await request(app.getHttpServer())
        .get(`/v1/runs/${runId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);
      if (check.body?.data?.status === 'SUCCESS' || check.body?.data?.status === 'FAILED') {
        finalRun = check.body?.data;
        break;
      }
    }

    expect(finalRun?.status).toBe(PipelineRunStatus.FAILED);

    // Verify job in DB is FAILED
    const jobs = await prisma.pipelineJob.findMany({
      where: { pipelineRunId: runId },
    });
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].status).toBe(JobStatus.FAILED);

    // Verify exit code 42 in logs
    const logsRes = await request(app.getHttpServer())
      .get(`/v1/runs/${runId}/logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .expect(200);

    const logs = logsRes.body?.data || [];
    const hasFailMsg = logs.some((l: any) => l.message.includes('E2E_PERMANENT_FAILURE_VERIFIED'));
    const hasExit42 = logs.some(
      (l: any) => l.message.includes('42') || l.message.includes('exited with code 42'),
    );
    expect(hasFailMsg).toBe(true);
    expect(hasExit42).toBe(true);
  }, 45000);

  it('REAL-E2E-004: Should skip downstream jobs when an upstream stage fails', async () => {
    const multiStageYaml = `version: "1"
name: "E2E Multi Stage Pipeline"
jobs:
  build:
    stage: build
    image: node:20-alpine
    commands:
      - echo "STAGE_BUILD_PASSED"
  test:
    stage: test
    image: node:20-alpine
    commands:
      - echo "STAGE_TEST_FAILED"
      - exit 99
  deploy:
    stage: deploy
    image: node:20-alpine
    commands:
      - echo "STAGE_DEPLOY_SKIPPED"`;

    const createRes = await request(app.getHttpServer())
      .post(`/v1/projects/${projectId}/pipelines`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({
        name: 'E2E Multi Stage ' + Date.now(),
        slug: 'e2e-multi-' + Date.now(),
        yamlConfig: multiStageYaml,
      })
      .expect(201);

    const pipelineId = createRes.body?.data?.id;

    const runRes = await request(app.getHttpServer())
      .post(`/v1/pipelines/${pipelineId}/runs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-organization-id', orgId)
      .send({ triggerType: 'MANUAL', branch: 'main' })
      .expect(201);

    const runId = runRes.body?.data?.id;

    let finalRun = null;
    for (let i = 0; i < 45; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await request(app.getHttpServer())
        .get(`/v1/runs/${runId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-organization-id', orgId)
        .expect(200);
      if (check.body?.data?.status === 'SUCCESS' || check.body?.data?.status === 'FAILED') {
        finalRun = check.body?.data;
        break;
      }
    }

    expect(finalRun?.status).toBe(PipelineRunStatus.FAILED);

    const jobs = await prisma.pipelineJob.findMany({
      where: { pipelineRunId: runId },
    });

    const buildJob = jobs.find((j) => j.stage === 'build');
    const testJob = jobs.find((j) => j.stage === 'test');
    const deployJob = jobs.find((j) => j.stage === 'deploy');

    expect(buildJob?.status).toBe(JobStatus.SUCCESS);
    expect(testJob?.status).toBe(JobStatus.FAILED);
    expect(deployJob?.status).toBe(JobStatus.SKIPPED);
  }, 60000);
});
