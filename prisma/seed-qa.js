const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

async function provisionQaAccount(options = {}) {
  const prisma = options.prismaClient || new PrismaClient();
  const plainPassword = options.password !== undefined ? options.password : process.env.QA_PASSWORD;

  if (!plainPassword) {
    throw new Error(
      'QA_PASSWORD is required to provision the QA account. Usage: QA_PASSWORD="<password>" npm run seed:qa',
    );
  }

  const email = options.email || process.env.QA_EMAIL || 'qa@opspilot.dev';
  const name = options.name || process.env.QA_NAME || 'OpsPilot QA';
  const orgName = options.orgName || process.env.QA_ORG_NAME || 'OpsPilot QA Workspace';
  const orgSlug = options.orgSlug || process.env.QA_ORG_SLUG || 'opspilot-qa-workspace';

  // 1. Hash password with argon2id matching application HashService parameters
  const passwordHash = await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 2. Upsert QA User (Idempotent)
  let user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'USER',
        isSuperAdmin: false,
        isVerified: true,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        passwordHash,
        name,
      },
    });
  }

  // 3. Upsert QA Organization (Idempotent)
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        billingEmail: email,
        status: 'ACTIVE',
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: orgName,
        status: 'ACTIVE',
      },
    });
  }

  // 4. Ensure OWNER membership (Idempotent)
  let member = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: org.id,
    },
  });

  if (!member) {
    member = await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  } else {
    member = await prisma.member.update({
      where: { id: member.id },
      data: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  return { user, org, member };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('OPSPILOT MANUAL QA ACCOUNT PROVISIONING');
    console.log('═══════════════════════════════════════════════════════');

    const result = await provisionQaAccount({ prismaClient: prisma });

    console.log('QA PROVISIONING COMPLETED SUCCESSFULLY');
    console.log(`User Email:           ${result.user.email}`);
    console.log(`Email Verified:       ${result.user.isVerified}`);
    console.log(`Organization Name:    ${result.org.name}`);
    console.log(`Organization Slug:    ${result.org.slug}`);
    console.log(`Membership Role:      ${result.member.role}`);
    console.log(`Membership Status:    ${result.member.status}`);
    console.log('Operational Entities: 0 Projects, 0 Repositories, 0 Pipelines, 0 Runs');
    console.log('═══════════════════════════════════════════════════════');
  } catch (err) {
    console.error('❌ Error during QA account provisioning:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { provisionQaAccount };
