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
      },
    });
    console.log(`✓ User '${email}' created successfully.`);
  } else {
    console.log(`✓ User '${email}' already exists.`);
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
