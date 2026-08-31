const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('OPSPILOT PRODUCTION QA SEEDING');
  console.log('═══════════════════════════════════════════════════════');

  const email = process.env.QA_EMAIL || 'qa@opspilot.dev';
  const plainPassword = process.env.QA_PASSWORD || process.env.SEED_PASSWORD || 'OpsPilotQA@2026!';
  const name = process.env.QA_NAME || 'OpsPilot QA';
  const orgName = process.env.QA_ORG_NAME || 'OpsPilot QA Workspace';
  const orgSlug = process.env.QA_ORG_SLUG || 'opspilot-qa-workspace';

  console.log(`▸ Seeding dedicated QA account: ${email}`);

  // 1. Hash password with argon2id matching application HashService parameters
  const passwordHash = await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 2. Upsert/Find QA User
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
    console.log(`✓ Created new QA User: ${user.id} (${user.email})`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        passwordHash,
        name,
      },
    });
    console.log(`✓ Verified and updated existing QA User: ${user.id} (${user.email})`);
  }

  // 3. Upsert QA Organization
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
    console.log(`✓ Created QA Organization: ${org.id} (${org.name})`);
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: orgName,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Verified QA Organization: ${org.id} (${org.name})`);
  }

  // 4. Ensure OWNER membership
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
    console.log(`✓ Linked User as OWNER of Organization: Member ID ${member.id}`);
  } else {
    member = await prisma.member.update({
      where: { id: member.id },
      data: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Verified User OWNER role in Organization: Member ID ${member.id}`);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('QA PROVISIONING SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`User ID:              ${user.id}`);
  console.log(`Email:                ${user.email}`);
  console.log(`Name:                 ${user.name}`);
  console.log(`Email Verified:       ${user.isVerified}`);
  console.log(`Organization ID:      ${org.id}`);
  console.log(`Organization Name:    ${org.name}`);
  console.log(`Organization Slug:    ${org.slug}`);
  console.log(`Organization Role:    ${member.role}`);
  console.log(`Member Status:        ${member.status}`);
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Error during QA seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
