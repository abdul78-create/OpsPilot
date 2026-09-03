import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import { OrgRole, MemberStatus } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { provisionQaAccount } = require('../../../../prisma/seed-qa');

describe('Permanent QA Account Provisioning & Data Integrity Verification', () => {
  let prisma: PrismaService;
  let hashService: HashService;
  const testEmail = `test-qa-spec-${Date.now()}@opspilot.dev`;
  const testOrgSlug = `test-qa-spec-workspace-${Date.now()}`;
  const testPassword = 'QASecretPassword@2026!';
  let createdUserId: string;
  let createdOrgId: string;

  let isDbConnected = false;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL =
        'postgresql://postgres:postgres@localhost:5432/nest_db?schema=public';
    }
    prisma = new PrismaService();
    hashService = new HashService();
    try {
      await prisma.$connect();
      isDbConnected = true;
    } catch (err) {
      console.warn(
        'PostgreSQL database not available for QA account integrity spec:',
        (err as Error).message,
      );
    }
  });

  afterAll(async () => {
    if (isDbConnected) {
      try {
        if (createdOrgId) {
          await prisma.member.deleteMany({ where: { organizationId: createdOrgId } });
          await prisma.organization.deleteMany({ where: { id: createdOrgId } });
        }
        if (createdUserId) {
          await prisma.user.deleteMany({ where: { id: createdUserId } });
        }
        await prisma.$disconnect();
      } catch {
        // teardown cleanup
      }
    }
  });

  it('1. should refuse to provision if QA_PASSWORD is missing', async () => {
    await expect(
      provisionQaAccount({
        email: testEmail,
        password: '',
        name: 'OpsPilot QA',
        orgName: 'OpsPilot QA Workspace',
        orgSlug: testOrgSlug,
        prismaClient: prisma,
      }),
    ).rejects.toThrow('QA_PASSWORD is required');
  });

  it('2. should provision QA user and organization successfully', async () => {
    const result = await provisionQaAccount({
      email: testEmail,
      password: testPassword,
      name: 'OpsPilot QA',
      orgName: 'OpsPilot QA Workspace',
      orgSlug: testOrgSlug,
      prismaClient: prisma,
    });

    expect(result).toBeDefined();
    expect(result.user).toBeDefined();
    expect(result.org).toBeDefined();
    expect(result.member).toBeDefined();

    createdUserId = result.user.id;
    createdOrgId = result.org.id;
  });

  it('3. should verify QA user exists with isVerified = true', async () => {
    const user = await prisma.user.findFirst({
      where: { email: testEmail, deletedAt: null },
    });

    expect(user).toBeDefined();
    expect(user!.email).toBe(testEmail);
    expect(user!.name).toBe('OpsPilot QA');
    expect(user!.isVerified).toBe(true);
    expect(user!.passwordHash).toBeDefined();
  });

  it('4. should verify password verification succeeds with correct QA_PASSWORD', async () => {
    const user = await prisma.user.findFirst({
      where: { email: testEmail, deletedAt: null },
    });

    const isValid = await hashService.verifyPassword(user!.passwordHash, testPassword);
    expect(isValid).toBe(true);
  });

  it('5. should verify wrong password strictly fails authentication', async () => {
    const user = await prisma.user.findFirst({
      where: { email: testEmail, deletedAt: null },
    });

    const isInvalid = await hashService.verifyPassword(user!.passwordHash, 'WrongPassword999!');
    expect(isInvalid).toBe(false);
  });

  it('6. should verify organization membership is OWNER and status is ACTIVE', async () => {
    const org = await prisma.organization.findUnique({
      where: { slug: testOrgSlug },
      include: { members: true },
    });

    expect(org).toBeDefined();
    expect(org!.name).toBe('OpsPilot QA Workspace');

    const member = org!.members.find((m) => m.userId === createdUserId);
    expect(member).toBeDefined();
    expect(member!.role).toBe(OrgRole.OWNER);
    expect(member!.status).toBe(MemberStatus.ACTIVE);
  });

  it('7. should remain strictly idempotent when running provisioning twice without creating duplicates', async () => {
    const secondRun = await provisionQaAccount({
      email: testEmail,
      password: testPassword,
      name: 'OpsPilot QA',
      orgName: 'OpsPilot QA Workspace',
      orgSlug: testOrgSlug,
      prismaClient: prisma,
    });

    expect(secondRun.user.id).toBe(createdUserId);
    expect(secondRun.org.id).toBe(createdOrgId);

    // Verify user count with this email is exactly 1
    const userCount = await prisma.user.count({
      where: { email: testEmail, deletedAt: null },
    });
    expect(userCount).toBe(1);

    // Verify org count with this slug is exactly 1
    const orgCount = await prisma.organization.count({
      where: { slug: testOrgSlug },
    });
    expect(orgCount).toBe(1);

    // Verify member count for this user in this org is exactly 1
    const memberCount = await prisma.member.count({
      where: { userId: createdUserId, organizationId: createdOrgId },
    });
    expect(memberCount).toBe(1);
  });

  it('8. should verify zero operational/demo entities are created by provisioning', async () => {
    const org = await prisma.organization.findUnique({
      where: { slug: testOrgSlug },
      include: {
        projects: {
          include: {
            repositoryConnections: true,
            pipelineDefinitions: {
              include: {
                runs: {
                  include: {
                    artifacts: true,
                  },
                },
              },
            },
            environments: {
              include: {
                deployments: true,
              },
            },
          },
        },
        aiReports: true,
        incidents: true,
      },
    });

    expect(org).toBeDefined();
    expect(org!.projects).toHaveLength(0);
    expect(org!.aiReports).toHaveLength(0);
    expect(org!.incidents).toHaveLength(0);

    const projectCount = await prisma.project.count({ where: { organizationId: createdOrgId } });
    const repoCount = await prisma.repositoryConnection.count({
      where: { project: { organizationId: createdOrgId } },
    });
    const pipelineCount = await prisma.pipelineDefinition.count({
      where: { project: { organizationId: createdOrgId } },
    });
    const runCount = await prisma.pipelineRun.count({
      where: { pipelineDefinition: { project: { organizationId: createdOrgId } } },
    });
    const deploymentCount = await prisma.deployment.count({
      where: { environment: { project: { organizationId: createdOrgId } } },
    });

    expect(projectCount).toBe(0);
    expect(repoCount).toBe(0);
    expect(pipelineCount).toBe(0);
    expect(runCount).toBe(0);
    expect(deploymentCount).toBe(0);
  });
});
