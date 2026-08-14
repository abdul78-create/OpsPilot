/**
 * verify-sse-stream-v2.js
 *
 * Complete end-to-end SSE log streaming verification.
 * Stages:
 *   1. Health check
 *   2. Login (pre-existing verified user)
 *   3. Fetch organization membership
 *   4. Create project + pipeline
 *   5. Trigger a pipeline run → get runId
 *   6. Connect to SSE stream /v1/runs/:runId/logs/stream
 *   7. Historical logs /v1/runs/:runId/logs
 */

const http = require('http');

const EMAIL    = 'sse@opspilot.dev';
const PASSWORD = 'SseTest#2026';

let TOKEN = null;
let ORG_ID = null;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const p = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(ORG_ID ? { 'x-organization-id': ORG_ID, 'x-tenant-id': ORG_ID } : {}),
      ...(p ? { 'Content-Length': Buffer.byteLength(p) } : {}),
    };
    const r = http.request({ hostname: 'localhost', port: 3000, path, method, headers }, (resp) => {
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => {
        try { resolve({ s: resp.statusCode, h: resp.headers, b: JSON.parse(d) }); }
        catch { resolve({ s: resp.statusCode, h: resp.headers, b: d }); }
      });
    });
    r.on('error', reject);
    if (p) r.write(p);
    r.end();
  });
}

function connectSSE(path, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const headers = {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(ORG_ID ? { 'x-organization-id': ORG_ID, 'x-tenant-id': ORG_ID } : {}),
    };
    const events = [];
    let done = false;
    const r = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET', headers }, (resp) => {
      console.log(`    HTTP ${resp.statusCode} | Content-Type: ${resp.headers['content-type']}`);
      const isSSE = (resp.headers['content-type'] || '').includes('text/event-stream');
      if (!isSSE) {
        let body = '';
        resp.on('data', (c) => (body += c));
        resp.on('end', () => { done = true; resolve({ connected: false, statusCode: resp.statusCode, body }); });
        return;
      }
      resp.on('data', (chunk) => {
        chunk.toString().split('\n').forEach((line) => {
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            events.push(payload);
            console.log(`    SSE event: ${payload.slice(0, 100)}`);
          }
        });
      });
      setTimeout(() => {
        if (!done) { done = true; r.destroy(); resolve({ connected: true, statusCode: resp.statusCode, events }); }
      }, timeoutMs);
    });
    r.on('error', (e) => { if (!done) { done = true; resolve({ connected: false, error: e.message, events: [] }); } });
    r.end();
  });
}

function pass(msg) { console.log(`  ✓ PASS — ${msg}`); }
function fail(msg) { console.log(`  ✗ FAIL — ${msg}`); }
function warn(msg) { console.log(`  ⚠ PARTIAL — ${msg}`); }

async function main() {
  const results = {};
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  OpsPilot SSE Live Stream — E2E Verification v2');
  console.log('════════════════════════════════════════════════════════\n');

  // ── 1. Health ─────────────────────────────────────────────────────────────
  console.log('[ 1 ] Backend health...');
  const health = await req('GET', '/v1/health');
  results.health = health.s === 200 && health.b?.data?.info?.database?.status === 'up';
  results.health ? pass(`HTTP 200 | database: ${health.b.data.info.database.status}`) : fail(`HTTP ${health.s}`);
  if (!results.health) { process.exit(1); }

  // ── 2. Authenticate ───────────────────────────────────────────────────────
  console.log('\n[ 2 ] Authenticating...');
  const login = await req('POST', '/v1/auth/login', { email: EMAIL, password: PASSWORD });
  TOKEN = login.b?.data?.tokens?.accessToken ?? null;
  results.auth = !!TOKEN && login.s === 200;
  results.auth ? pass(`JWT obtained (${TOKEN.slice(0, 25)}...)`) : fail(`HTTP ${login.s} — ${JSON.stringify(login.b).slice(0,100)}`);
  if (!results.auth) process.exit(1);

  // ── 3. Get/create organization ────────────────────────────────────────────
  console.log('\n[ 3 ] Fetching organizations...');
  const orgs = await req('GET', '/v1/organizations');
  const orgList = orgs.b?.data?.organizations ?? orgs.b?.data ?? [];
  
  if (Array.isArray(orgList) && orgList.length > 0) {
    ORG_ID = orgList[0].id;
    pass(`Found org: ${orgList[0].name} (${ORG_ID})`);
  } else {
    console.log('  No org found, creating...');
    const newOrg = await req('POST', '/v1/organizations', { name: 'SSE Test Org', slug: `sse-org-${Date.now()}` });
    ORG_ID = newOrg.b?.data?.id;
    if (ORG_ID) pass(`Created org (${ORG_ID})`); else fail(`Could not create org: ${JSON.stringify(newOrg.b).slice(0,100)}`);
  }
  results.org = !!ORG_ID;
  if (!results.org) process.exit(1);

  // ── 4. Create project ─────────────────────────────────────────────────────
  console.log('\n[ 4 ] Creating project...');
  const proj = await req('POST', `/v1/organizations/${ORG_ID}/projects`, {
    name: `SSE Test Project ${Date.now()}`,
    description: 'Automated SSE verification project',
  });
  const projectId = proj.b?.data?.id;
  console.log(`  HTTP ${proj.s} | projectId: ${projectId ?? 'NONE'}`);
  results.project = !!projectId;
  if (!projectId) { warn('Could not create project — will try to find existing one');
    const projList = await req('GET', `/v1/organizations/${ORG_ID}/projects`);
    const projects = projList.b?.data?.projects ?? projList.b?.data ?? [];
    const existingProject = Array.isArray(projects) ? projects[0] : null;
    if (existingProject) { pass(`Using existing project: ${existingProject.id}`); results.projectId = existingProject.id; }
    else { fail('No projects available'); process.exit(1); }
  } else {
    pass(`Project created: ${projectId}`);
    results.projectId = projectId;
  }

  // ── 5. Create pipeline ────────────────────────────────────────────────────
  console.log('\n[ 5 ] Creating pipeline...');
  const pip = await req('POST', `/v1/projects/${results.projectId}/pipelines`, {
    name: 'SSE Verify Pipeline',
    triggerBranch: 'main',
    yamlConfig: `version: '1.0'
name: SSE Verify Pipeline
stages:
  - name: build
    jobs:
      - name: echo-job
        image: alpine:latest
        steps:
          - name: echo
            run: echo "OpsPilot SSE stream verification"
`,
  });
  const pipelineId = pip.b?.data?.id;
  console.log(`  HTTP ${pip.s} | pipelineId: ${pipelineId ?? 'NONE'}`);
  if (pip.s !== 201) {
    console.log(`  Error body:`, JSON.stringify(pip.b, null, 2));
  }
  results.pipeline = !!pipelineId;
  
  if (!pipelineId) {
    warn('Pipeline creation failed — checking existing pipelines');
    const pipList = await req('GET', `/v1/projects/${results.projectId}/pipelines`);
    const pipes = pipList.b?.data?.pipelines ?? pipList.b?.data ?? [];
    const existing = Array.isArray(pipes) ? pipes[0] : null;
    if (existing) { pass(`Using existing pipeline: ${existing.id}`); results.pipelineId = existing.id; }
    else { fail('No pipelines available'); process.exit(1); }
  } else {
    pass(`Pipeline created: ${pipelineId}`);
    results.pipelineId = pipelineId;
  }

  // ── 6. Trigger pipeline run ───────────────────────────────────────────────
  console.log('\n[ 6 ] Triggering pipeline run...');
  const trigger = await req('POST', `/v1/pipelines/${results.pipelineId}/runs`, {
    branch: 'main',
    commitSha: 'abc1234deadbeef',
    triggerType: 'MANUAL',
  });
  const runId = trigger.b?.data?.id;
  console.log(`  HTTP ${trigger.s} | runId: ${runId ?? 'NONE'}`);
  results.runTriggered = !!runId;
  results.runId = runId;

  if (!runId) {
    warn(`Could not trigger run — ${JSON.stringify(trigger.b).slice(0,150)}`);
    // Fall back to fetching existing runs
    const existing = await req('GET', `/v1/pipelines/${results.pipelineId}/runs`);
    const runs = existing.b?.data?.runs ?? existing.b?.data ?? [];
    const existingRun = Array.isArray(runs) ? runs[0] : null;
    if (existingRun) { pass(`Using existing run: ${existingRun.id}`); results.runId = existingRun.id; }
    else { fail('No runs available — cannot test SSE'); process.exit(1); }
  } else {
    pass(`Run queued: ${runId}`);
    // Wait a moment for the run to start
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── 7. SSE stream connection test ─────────────────────────────────────────
  console.log(`\n[ 7 ] Connecting to SSE stream: /v1/runs/${results.runId}/logs/stream`);
  const sse = await connectSSE(`/v1/runs/${results.runId}/logs/stream`, 5000);
  results.sseConnected = sse.connected;
  results.sseEvents = sse.events?.length ?? 0;

  if (sse.connected) {
    pass(`Stream opened (HTTP ${sse.statusCode}, text/event-stream)`);
    if (sse.events.length > 0) {
      pass(`${sse.events.length} SSE event(s) received — LIVE STREAMING VERIFIED`);
    } else {
      warn('Stream opened but 0 events in 5s — run may be queued or already complete');
    }
  } else {
    fail(`Stream failed — HTTP ${sse.statusCode ?? 'ERR'}`);
    if (sse.body) console.log(`    Response: ${typeof sse.body === 'string' ? sse.body.slice(0, 200) : JSON.stringify(sse.body).slice(0, 200)}`);
  }

  // ── 8. Historical logs ────────────────────────────────────────────────────
  console.log(`\n[ 8 ] Historical logs: /v1/runs/${results.runId}/logs`);
  const logs = await req('GET', `/v1/runs/${results.runId}/logs`);
  const logEntries = logs.b?.data ?? [];
  const logCount = Array.isArray(logEntries) ? logEntries.length : 0;
  console.log(`  HTTP ${logs.s} | entries: ${logCount}`);
  results.historicalLogs = logs.s === 200;
  if (logs.s === 200 && logCount > 0) {
    pass(`${logCount} log entries — sample: [${logEntries[0]?.level}] ${logEntries[0]?.message?.slice(0, 50)}`);
  } else if (logs.s === 200) {
    warn('HTTP 200 but 0 log entries (run may still be queued)');
  } else {
    fail(`HTTP ${logs.s}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  VERIFICATION SUMMARY');
  console.log('════════════════════════════════════════════════════════');
  console.log(` [ 1 ] Backend health:           ${results.health ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log(` [ 2 ] JWT authentication:       ${results.auth ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log(` [ 3 ] Organization context:     ${results.org ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log(` [ 4 ] Project created:          ${results.project ? '✓ VERIFIED' : '⚠ PARTIAL (used existing)'}`);
  console.log(` [ 5 ] Pipeline created:         ${results.pipeline ? '✓ VERIFIED' : '⚠ PARTIAL (used existing)'}`);
  console.log(` [ 6 ] Run triggered:            ${results.runTriggered ? `✓ VERIFIED (runId: ${results.runId?.slice(0,8)})` : '⚠ PARTIAL (used existing)'}`);
  console.log(` [ 7 ] SSE stream connected:     ${results.sseConnected ? '✓ VERIFIED (text/event-stream)' : '✗ FAILED'}`);
  console.log(` [ 7 ] SSE events received:      ${results.sseEvents > 0 ? `✓ VERIFIED (${results.sseEvents} events)` : '⚠ PARTIAL (stream open, 0 events yet)'}`);
  console.log(` [ 8 ] Historical logs API:      ${results.historicalLogs ? '✓ VERIFIED' : '✗ FAILED'}`);

  const corePass = results.health && results.auth && results.org && results.sseConnected && results.historicalLogs;
  const evidenceLevel = results.sseEvents > 0 ? 'Level 4 — LIVE SSE STREAMING VERIFIED' : 'Level 3.5 — SSE endpoint open, no live events yet';

  console.log('');
  console.log(` OVERALL: ${corePass ? '✓' : '⚠'} ${evidenceLevel}`);
  console.log('════════════════════════════════════════════════════════\n');

  process.exit(corePass ? 0 : 1);
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1); });
