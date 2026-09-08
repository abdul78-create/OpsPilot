const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const runId = process.argv[2] || '62cf370f-a542-4ea7-a7ae-307ed9281d78';
  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    include: {
      jobs: true,
      artifacts: true,
      logs: {
        take: 50,
        orderBy: { timestamp: 'desc' },
      },
    },
  });

  console.log('=== RUN ===');
  console.log('ID:', run.id, 'Status:', run.status, 'Duration:', run.durationSeconds);
  console.log('=== JOBS ===');
  for (const j of run.jobs) {
    console.log(`- ${j.name} (${j.stage}): Status: ${j.status} | ExitCode: ${j.exitCode} | Duration: ${j.durationSeconds}s`);
  }
  console.log('=== ARTIFACTS ===');
  for (const a of run.artifacts) {
    console.log(`- ${a.name}: ${a.sizeBytes} bytes | SHA256: ${a.checksum} | Path: ${a.storageLocation}`);
  }
  console.log('=== ERROR LOGS (first 30) ===');
  for (const l of run.logs) {
    console.log(`[${l.jobId || 'RUN'}] ${l.message}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
