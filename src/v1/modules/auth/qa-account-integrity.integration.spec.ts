import { PrismaService } from '../../../core/database/prisma.service';
import { HashService } from '../../../core/security/hash.service';
import { OrgRole, MemberStatus } from '@prisma/client';

describe('QA Account Provisioning & Production Data-Integrity Verification', () => {
  let prisma: PrismaService;
  let hashService: HashService;

  beforeAll(async () => {
    prisma = new PrismaService();
    hashService = new HashService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should verify QA User exists with verified email and secure Argon2id hash', async () => {
    const user = await prisma.user.findFirst({
      where: { email: 'qa@opspilot.dev', deletedAt: null },
    });

    expect(user).toBeDefined();
    expect(user!.email).toBe('qa@opspilot.dev');
    expect(user!.name).toBe('OpsPilot QA');
    expect(user!.isVerified).toBe(true);
    expect(user!.passwordHash).toBeDefined();

    // Verify argon2 password validation
    const isValid = await hashService.verifyPassword(user!.passwordHash, 'OpsPilotQA@2026!');
    expect(isValid).toBe(true);

    // Negative security check: wrong password must be rejected
    const isInvalid = await hashService.verifyPassword(user!.passwordHash, 'WrongPassword123!');
    expect(isInvalid).toBe(false);
  });

  it('should verify QA Organization exists with OWNER membership and zero fake entities', async () => {
    const user = await prisma.user.findFirst({
      where: { email: 'qa@opspilot.dev', deletedAt: null },
    });
    expect(user).toBeDefined();

    const org = await prisma.organization.findUnique({
      where: { slug: 'opspilot-qa-workspace' },
      include: {
        members: true,
        projects: true,
        aiReports: true,
        incidents: true,
      },
    });

    expect(org).toBeDefined();
    expect(org!.name).toBe('OpsPilot QA Workspace');

    // Verify membership
    const member = org!.members.find((m) => m.userId === user!.id);
    expect(member).toBeDefined();
    expect(member!.role).toBe(OrgRole.OWNER);
    expect(member!.status).toBe(MemberStatus.ACTIVE);

    // Strict data integrity check: No fake/mock data created
    expect(org!.projects).toHaveLength(0);
    expect(org!.aiReports).toHaveLength(0);
    expect(org!.incidents).toHaveLength(0);
  });
});
