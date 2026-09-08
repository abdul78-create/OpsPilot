const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, memberships: { select: { organizationId: true, role: true } } },
  });
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  console.log('--- ORGS ---');
  console.log(JSON.stringify(orgs, null, 2));
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true, organizationId: true },
  });
  console.log('--- PROJECTS ---');
  console.log(JSON.stringify(projects.slice(-5), null, 2));

  const runs = await prisma.pipelineRun.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: {
      pipelineDefinition: { include: { project: true } },
      jobs: true,
      artifacts: true,
    },
  });
  console.log('--- RECENT RUNS ---');
  for (const r of runs) {
    console.log(`Run ID: ${r.id} | Status: ${r.status} | Pipeline: ${r.pipelineDefinition?.name} (${r.pipelineDefinitionId}) | Project: ${r.pipelineDefinition?.project?.name} (${r.pipelineDefinition?.projectId}) | Jobs: ${r.jobs.map(j => j.name + ' [' + j.stage + ']').join(', ')} | Artifacts: ${r.artifacts.map(a => a.name + ' (' + a.sizeBytes + 'b)').join(', ')}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
