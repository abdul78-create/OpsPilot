const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const repos = await prisma.repositoryConnection.findMany({
    include: { project: true },
  });
  console.log('All RepositoryConnections in DB:');
  for (const r of repos) {
    console.log(`- ID: ${r.id} | Project: ${r.project?.name} (${r.projectId}) | URL: ${r.repositoryUrl} | Deleted: ${r.deletedAt}`);
  }

  const projects = await prisma.project.findMany({
    include: { repositoryConnections: true },
  });
  console.log('\nAll Projects in DB:');
  for (const p of projects) {
    console.log(`- Project ID: ${p.id} | Name: ${p.name} | Org: ${p.organizationId} | Repos: ${p.repositoryConnections.length}`);
  }
}

main().finally(() => prisma.$disconnect());
