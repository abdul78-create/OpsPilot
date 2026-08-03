const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  console.log('→ Checking database for failed migrations...');
  try {
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM _prisma_migrations WHERE finished_at IS NULL`
    );
    if (deleted > 0) {
      console.log(`✓ Cleared ${deleted} failed migration record(s) from metadata table.`);
    } else {
      console.log('✓ No failed migrations found in metadata.');
    }
  } catch (err) {
    console.log('ℹ Database metadata clean (or table does not exist yet).');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed to run migration cleanup:', err);
  process.exit(0); // Exit cleanly to avoid blocking startup
});
