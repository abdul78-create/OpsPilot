/**
 * verify-real-opspilot-runtime.js
 *
 * Real Runtime End-to-End Verification against:
 * Repository: https://github.com/abdul78-create/OpsPilot
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function banner(msg) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  ${msg}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

function req(method, urlPath, body, token, orgId) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'x-organization-id': orgId, 'x-tenant-id': orgId } : {}),
      ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
    };
    const r = http.request({ hostname: 'localhost', port: 3000, path: urlPath, method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(d) }); }
        catch { resolve({ s: res.statusCode, b: d }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  banner('1. CUSTOMER AUTHENTICATION & PROJECT SETUP');

  // Step 1: Login
  console.log('▸ Logging in as sse@opspilot.dev...');
  const loginRes = await req('POST', '/v1/auth/login', {
    email: 'sse@opspilot.dev',
    password: 'SseTest#2026',
  });

  if (loginRes.s !== 200 || !loginRes.b?.data?.tokens?.accessToken) {
    throw new Error(`Login failed: HTTP ${loginRes.s} - ${JSON.stringify(loginRes.b)}`);
  }
  const token = loginRes.b.data.tokens.accessToken;
  const user = loginRes.b.data.user;
  console.log(`✓ Authenticated as ${user.email} (${user.role})`);

  // Find existing project in sse@opspilot.dev org
  const member = await prisma.member.findFirst({
    where: { userId: user.id },
  });
  if (!member) throw new Error('No organization membership found for user');
  const orgId = member.organizationId;
  console.log(`✓ Resolved Organization ID: ${orgId}`);

  let project = await prisma.project.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    include: { repositoryConnections: true, pipelineDefinitions: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!project) {
    throw new Error(`No project found in organization ${orgId}`);
  }
  console.log(`✓ Using Project: '${project.name}' (ID: ${project.id})`);

  // Connect or verify real repository connection for OpsPilot
  let repoConn = await prisma.repositoryConnection.findFirst({
    where: { projectId: project.id, deletedAt: null },
  });

  if (!repoConn || repoConn.repositoryUrl !== 'https://github.com/abdul78-create/OpsPilot') {
    console.log('▸ Connecting https://github.com/abdul78-create/OpsPilot to project...');
    const connectRes = await req('POST', `/v1/projects/${project.id}/repositories`, {
      provider: 'GITHUB',
      repositoryUrl: 'https://github.com/abdul78-create/OpsPilot',
      defaultBranch: 'main',
    }, token, orgId);

    if (![200, 201].includes(connectRes.s)) {
      // If conflict or exists in DB, update it directly
      await prisma.repositoryConnection.upsert({
        where: { id: repoConn?.id || 'temp_conn_id' },
        create: {
          projectId: project.id,
          provider: 'GITHUB',
          repositoryUrl: 'https://github.com/abdul78-create/OpsPilot',
          defaultBranch: 'main',
        },
        update: {
          repositoryUrl: 'https://github.com/abdul78-create/OpsPilot',
          defaultBranch: 'main',
          deletedAt: null,
        },
      });
    }
    repoConn = await prisma.repositoryConnection.findFirst({
      where: { projectId: project.id, deletedAt: null },
    });
  }
  console.log(`✓ Connected Repository: ${repoConn.repositoryUrl} (Branch: ${repoConn.defaultBranch})`);

  banner('2. GENERATE REAL PIPELINE FROM REPOSITORY SCAN');
  console.log('▸ Calling POST /v1/ai/generate-pipeline...');
  const genRes = await req('POST', '/v1/ai/generate-pipeline', {
    projectId: project.id,
    prompt: 'Build and test my Node.js application, run automated tests, and perform a Trivy security scan',
  }, token, orgId);

  if (genRes.s !== 200 && genRes.s !== 201) {
    throw new Error(`Pipeline generation failed: HTTP ${genRes.s} - ${JSON.stringify(genRes.b)}`);
  }

  const genData = genRes.b.data;
  console.log(`✓ Pipeline Name: ${genData.name}`);
  console.log(`✓ Summary: ${genData.summary}`);

  const generatedYaml = genData.yamlConfig;
  console.log('\n--- GENERATED YAML CONFIG ---');
  console.log(generatedYaml);
  console.log('-----------------------------\n');

  // Verify there are NO fake strings
  const forbidden = [
    'git clone repository .',
    'Build Source & Assets',
    'Run Unit & Integration Tests',
    'Deploy Artifacts',
    'echo "Build stage complete"',
    'build-manifest.json',
  ];

  for (const f of forbidden) {
    if (generatedYaml.includes(f)) {
      throw new Error(`VERIFICATION FAILED: Generated YAML contains forbidden synthetic string: '${f}'`);
    }
  }
  console.log('✓ Verified: Generated YAML contains ZERO synthetic/fake fallback strings.');

  // Verify real repository URL is embedded
  if (!generatedYaml.includes('https://github.com/abdul78-create/OpsPilot')) {
    throw new Error('VERIFICATION FAILED: Generated YAML does not contain real repo URL https://github.com/abdul78-create/OpsPilot');
  }
  console.log('✓ Verified: Generated YAML explicitly targets https://github.com/abdul78-create/OpsPilot.');

  banner('3. PERSIST PIPELINE VERSION VIA API & VERIFY IN POSTGRESQL');
  let pipelineDef = await prisma.pipelineDefinition.findFirst({
    where: { projectId: project.id, deletedAt: null },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
  });

  if (!pipelineDef) {
    console.log('▸ Creating initial Pipeline Definition via POST /v1/projects/:projectId/pipelines...');
    const createPipeRes = await req('POST', `/v1/projects/${project.id}/pipelines`, {
      name: genData.name || 'OpsPilot CI/CD Pipeline',
      slug: 'opspilot-ci-cd',
      triggerBranch: 'main',
      yamlConfig: generatedYaml,
    }, token, orgId);

    if (![200, 201].includes(createPipeRes.s)) {
      throw new Error(`Failed to create pipeline: HTTP ${createPipeRes.s} - ${JSON.stringify(createPipeRes.b)}`);
    }
    pipelineDef = createPipeRes.b.data;
  } else {
    console.log(`▸ Updating Pipeline '${pipelineDef.name}' (${pipelineDef.id}) via PATCH /v1/projects/:projectId/pipelines/:id...`);
    const updatePipeRes = await req('PATCH', `/v1/projects/${project.id}/pipelines/${pipelineDef.id}`, {
      yamlConfig: generatedYaml,
    }, token, orgId);

    if (![200, 201].includes(updatePipeRes.s)) {
      throw new Error(`Failed to update pipeline: HTTP ${updatePipeRes.s} - ${JSON.stringify(updatePipeRes.b)}`);
    }
  }

  // Reload latest version from database
  const latestVersion = await prisma.pipelineVersion.findFirst({
    where: { pipelineDefinitionId: pipelineDef.id },
    orderBy: { versionNumber: 'desc' },
  });

  if (!latestVersion) {
    throw new Error('No PipelineVersion found in database after persistence.');
  }

  console.log(`✓ Persisted PipelineVersion in DB: ID ${latestVersion.id} (v${latestVersion.versionNumber})`);
  console.log(`✓ Stored Checksum: ${latestVersion.checksum}`);
  console.log('\n--- PERSISTED PipelineVersion.yamlConfig IN DATABASE ---');
  console.log(latestVersion.yamlConfig);
  console.log('--------------------------------------------------------\n');

  if (latestVersion.yamlConfig !== generatedYaml) {
    throw new Error('VERIFICATION FAILED: Persisted yamlConfig does not match generated YAML.');
  }
  console.log('✓ Verified: Persisted PipelineVersion.yamlConfig matches generated YAML exactly.');

  banner('4. TRIGGER REAL RUN');
  console.log(`▸ Triggering run for Pipeline '${pipelineDef.name}' (${pipelineDef.id})...`);
  const triggerRes = await req('POST', `/v1/pipelines/${pipelineDef.id}/runs`, {
    branch: 'main',
  }, token, orgId);

  if (![200, 201].includes(triggerRes.s)) {
    throw new Error(`Failed to trigger run: HTTP ${triggerRes.s} - ${JSON.stringify(triggerRes.b)}`);
  }

  const runData = triggerRes.b.data;
  const runId = runData.id;
  console.log(`✓ Real Run Triggered: ID ${runId} (Status: ${runData.status})`);
  console.log(`✓ Initial Created Jobs (${runData.jobs?.length || 0}):`);
  for (const j of runData.jobs || []) {
    console.log(`   - Stage: '${j.stage}' | Job Name: '${j.name}' | Status: ${j.status}`);
  }

  banner('5. MONITORING WORKER RUNTIME EXECUTION');
  console.log(`▸ Waiting for worker to process run ${runId}...`);
  const startTime = Date.now();
  let finalRun = null;
  let pollCount = 0;

  while (Date.now() - startTime < 1200000) { // up to 20 minutes
    await new Promise((res) => setTimeout(res, 3000));
    pollCount++;

    const pollRes = await req('GET', `/v1/runs/${runId}`, null, token, orgId);
    if (pollRes.s !== 200) continue;
    const currentRun = pollRes.b.data;

    const jobSummary = (currentRun.jobs || []).map(j => `${j.name}:${j.status}`).join(' | ');
    process.stdout.write(`\r[+${Math.round((Date.now() - startTime) / 1000)}s] Status: ${currentRun.status} [${jobSummary}]      `);

    if (['SUCCESS', 'FAILED', 'CANCELLED'].includes(currentRun.status)) {
      finalRun = currentRun;
      console.log('\n');
      break;
    }
  }

  if (!finalRun) {
    throw new Error('Timeout waiting for pipeline run execution to terminate.');
  }

  console.log(`✓ Final PipelineRun Status: ${finalRun.status} (Duration: ${finalRun.durationSeconds || Math.round((Date.now() - startTime) / 1000)}s)`);

  banner('6. PERSISTED LOGS & RUNTIME OUTPUT EVIDENCE');
  const logsRes = await req('GET', `/v1/runs/${runId}/logs`, null, token, orgId);
  const logs = logsRes.b?.data?.logs || (Array.isArray(logsRes.b?.data) ? logsRes.b.data : []);

  console.log(`✓ Total Log Lines Persisted: ${logs.length}`);
  console.log('\n--- EXECUTION LOGS (First 40 lines) ---');
  for (const l of logs.slice(0, 40)) {
    console.log(`[${l.level || 'INFO'}] ${l.message}`);
  }
  if (logs.length > 40) {
    console.log(`... [${logs.length - 40} more lines omitted] ...`);
    console.log('\n--- EXECUTION LOGS (Last 20 lines) ---');
    for (const l of logs.slice(-20)) {
      console.log(`[${l.level || 'INFO'}] ${l.message}`);
    }
  }
  console.log('--------------------------------------\n');

  banner('7. ARTIFACT INSPECTION');
  const artifacts = await prisma.artifact.findMany({
    where: { pipelineRunId: runId },
  });

  console.log(`✓ Total Artifacts in Database: ${artifacts.length}`);
  for (const art of artifacts) {
    const storagePath = art.storageLocation;
    const checksum = art.checksum;
    console.log(`- ID: ${art.id} | Name: ${art.name} | Size: ${art.sizeBytes} bytes | SHA256: ${checksum} | Path: ${storagePath}`);

    if (fs.existsSync(storagePath)) {
      const stats = fs.statSync(storagePath);
      console.log(`  Actual file on disk: ${stats.size} bytes`);
      const fileData = fs.readFileSync(storagePath);
      const computedHash = crypto.createHash('sha256').update(fileData).digest('hex');
      console.log(`  Verified File SHA256: ${computedHash} (Matches DB: ${computedHash === checksum})`);

      try {
        console.log('  Archive file listing (first 15 entries):');
        const tarListing = execSync(`tar -tzf "${storagePath}"`).toString();
        const files = tarListing.split('\n').filter(Boolean);
        console.log(`  Total files in archive: ${files.length}`);
        files.slice(0, 15).forEach(f => console.log(`    - ${f}`));
        if (files.includes('build-manifest.json')) {
          console.warn('  ⚠️ WARNING: build-manifest.json was found in archive');
        } else {
          console.log('  ✓ Verified: NO dummy build-manifest.json in archive!');
        }
      } catch (tarErr) {
        console.warn(`  Could not inspect tar archive: ${tarErr.message}`);
      }
    } else {
      console.warn(`  Storage path does not exist on disk: ${storagePath}`);
    }
  }

  banner('8. EXECUTION SUMMARY');
  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Repository: https://github.com/abdul78-create/OpsPilot`);
  console.log(`Pipeline: ${pipelineDef.name} (${pipelineDef.id})`);
  console.log(`Run ID: ${runId}`);
  console.log(`Final Status: ${finalRun.status}`);
  console.log(`Jobs Executed (${finalRun.jobs.length}):`);
  for (const j of finalRun.jobs) {
    console.log(`  * Stage: ${j.stage.padEnd(20)} | Name: ${j.name.padEnd(20)} | Status: ${j.status} | Duration: ${j.durationSeconds || 0}s`);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  REAL EXECUTION VERIFIED = ${finalRun.status === 'SUCCESS' ? 'YES' : 'NO'}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('\n❌ EXECUTION FAILED WITH ERROR:', err);
    console.log('\nREAL EXECUTION VERIFIED = NO\n');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
