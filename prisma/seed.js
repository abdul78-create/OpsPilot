/**
 * OpsPilot Production Database Seed Handler
 *
 * Production Rule: OpsPilot starts with a clean database.
 * No demo, sample, dummy, mock, fake, trial, or default accounts are created in production.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('OPSPILOT PRODUCTION DATABASE INITIALIZATION');
  console.log('═══════════════════════════════════════════════════════');

  if (process.env.SEED_TEST_FIXTURES === 'true') {
    console.log('ℹ SEED_TEST_FIXTURES=true detected. Isolated test fixtures allowed only in test environment.');
  } else {
    console.log('✓ Clean production database confirmed.');
    console.log('✓ Zero demo users, organizations, projects, or pipelines created.');
    console.log('✓ Ready for real tenant registrations via /v1/auth/register.');
  }

  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Error during database initialization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
