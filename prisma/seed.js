const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('→ Seeding database...');

  // 1. Create Default Admin User
  const email = 'admin@opspilot.io';
  const plainPassword = 'admin123';
  const name = 'Alice Chen';

  console.log(`▸ Checking if user '${email}' exists...`);
  let user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (!user) {
    console.log(`▸ Hashing password...`);
    const passwordHash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    console.log(`▸ Creating user '${email}'...`);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        isSuperAdmin: true,
        isVerified: true,
      },
    });
    console.log(`✓ User '${email}' created successfully.`);
  } else {
    // Ensure existing admin is verified (migration may have set default false)
    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
      console.log(`✓ Patched isVerified=true for existing user '${email}'.`);
    } else {
      console.log(`✓ User '${email}' already exists and is verified.`);
    }
  }

  // 2. Create Default Organization
  const orgSlug = 'acme-corp';
  const orgName = 'Acme Corp';

  console.log(`▸ Checking if organization '${orgSlug}' exists...`);
  let org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!org) {
    console.log(`▸ Creating organization '${orgSlug}'...`);
    org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        billingEmail: email,
      },
    });
    console.log(`✓ Organization '${orgSlug}' created successfully.`);
  } else {
    console.log(`✓ Organization '${orgSlug}' already exists.`);
  }

  // 3. Link User to Organization
  console.log(`▸ Checking if membership exists...`);
  const membership = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: org.id,
    },
  });

  if (!membership) {
    console.log(`▸ Linking user to organization...`);
    await prisma.member.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ Membership linked successfully.`);
  } else {
    console.log(`✓ Membership already exists.`);
  }

  // 4. Create Dedicated Production QA Account (Zero fake operational activity)
  const qaEmail = process.env.QA_EMAIL || 'qa@opspilot.dev';
  const qaPlainPassword = process.env.QA_PASSWORD || process.env.SEED_PASSWORD || 'OpsPilotQA@2026!';
  const qaName = process.env.QA_NAME || 'OpsPilot QA';
  const qaOrgName = process.env.QA_ORG_NAME || 'OpsPilot QA Workspace';
  const qaOrgSlug = process.env.QA_ORG_SLUG || 'opspilot-qa-workspace';

  console.log(`▸ Checking if QA user '${qaEmail}' exists...`);
  let qaUser = await prisma.user.findFirst({
    where: { email: qaEmail, deletedAt: null },
  });

  const qaPasswordHash = await argon2.hash(qaPlainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  if (!qaUser) {
    qaUser = await prisma.user.create({
      data: {
        email: qaEmail,
        passwordHash: qaPasswordHash,
        name: qaName,
        role: 'USER',
        isSuperAdmin: false,
        isVerified: true,
      },
    });
    console.log(`✓ QA User '${qaEmail}' created successfully.`);
  } else {
    qaUser = await prisma.user.update({
      where: { id: qaUser.id },
      data: {
        isVerified: true,
        passwordHash: qaPasswordHash,
        name: qaName,
      },
    });
    console.log(`✓ QA User '${qaEmail}' verified and updated.`);
  }

  // QA Organization
  let qaOrg = await prisma.organization.findUnique({
    where: { slug: qaOrgSlug },
  });

  if (!qaOrg) {
    qaOrg = await prisma.organization.create({
      data: {
        name: qaOrgName,
        slug: qaOrgSlug,
        billingEmail: qaEmail,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ QA Organization '${qaOrgSlug}' created successfully.`);
  } else {
    qaOrg = await prisma.organization.update({
      where: { id: qaOrg.id },
      data: {
        name: qaOrgName,
        status: 'ACTIVE',
      },
    });
    console.log(`✓ QA Organization '${qaOrgSlug}' already exists.`);
  }

  // Link QA User to QA Organization as OWNER
  const qaMembership = await prisma.member.findFirst({
    where: {
      userId: qaUser.id,
      organizationId: qaOrg.id,
    },
  });

  if (!qaMembership) {
    await prisma.member.create({
      data: {
        userId: qaUser.id,
        organizationId: qaOrg.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ QA Membership linked as OWNER.`);
  } else {
    await prisma.member.update({
      where: { id: qaMembership.id },
      data: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`✓ QA Membership role verified as OWNER.`);
  }

  console.log('✓ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
