const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- INSPECTING ENVIRONMENTS TABLE SCHEMA ---');
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'environments' 
      AND column_name IN ('connectionStatus', 'credentialsConfigured', 'lastConnectionTestedAt', 'lastConnectionError')
    ORDER BY column_name;
  `);
  console.log(JSON.stringify(columns, null, 2));

  console.log('--- INSPECTING APPLIED PRISMA MIGRATIONS ---');
  const migrations = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at, applied_steps_count
    FROM "_prisma_migrations"
    ORDER BY started_at DESC
    LIMIT 5;
  `);
  console.log(JSON.stringify(migrations, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
