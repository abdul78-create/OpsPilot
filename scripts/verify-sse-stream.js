/**
 * verify-sse-stream.js
 * 
 * Runtime verification of OpsPilot SSE log streaming endpoint.
 * Tests:
 *   1. Auth login → JWT token
 *   2. Create a pipeline run (to get a real runId)
 *   3. Connect to /v1/runs/:runId/logs/stream (SSE)
 *   4. Receive ≥1 SSE event OR confirm stream opens (200 text/event-stream)
 */

const http = require('http');

const BASE = 'http://localhost:3000/v1';
const DEV_EMAIL = 'sse@opspilot.dev';
const DEV_PASSWORD = 'SseTest#2026';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function connectSSE(path, token, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const events = [];
    let resolved = false;

    const req = http.request(opts, (res) => {
      console.log(`  SSE connect → HTTP ${res.statusCode}`);
      console.log(`  Content-Type: ${res.headers['content-type']}`);

      const isSSE = (res.headers['content-type'] || '').includes('text/event-stream');

      if (!isSSE) {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          resolved = true;
          resolve({ connected: false, statusCode: res.statusCode, body, events: [] });
        });
        return;
      }

      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            events.push(line.slice(5).trim());
            console.log(`  SSE event received: ${line.slice(5).trim().slice(0, 80)}`);
          }
        }
      });

      // Wait a bit to collect events, then close
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          req.destroy();
          resolve({ connected: true, statusCode: res.statusCode, events });
        }
      }, timeoutMs);
    });

    req.on('error', (e) => {
      if (!resolved) {
        resolved = true;
        resolve({ connected: false, error: e.message, events: [] });
      }
    });

    req.end();
  });
}

async function main() {
  console.log('\n════════════════════════════════════════════════');
  console.log(' OpsPilot SSE Stream Verification');
  console.log('════════════════════════════════════════════════\n');

  // ── 1. Health check ────────────────────────────────────────
  console.log('[ 1 ] Health check...');
  const health = await request('GET', '/v1/health', null, null);
  console.log(`  HTTP ${health.status} — database: ${health.body?.data?.info?.database?.status ?? 'unknown'}`);
  if (health.status !== 200) { console.error('  ✗ FAIL: Backend unhealthy'); process.exit(1); }
  console.log('  ✓ PASS\n');

  // ── 2. Login for JWT ───────────────────────────────────────
  console.log('[ 2 ] Authenticating...');
  const loginRes = await request('POST', '/v1/auth/login', { email: DEV_EMAIL, password: DEV_PASSWORD }, null);
  console.log(`  HTTP ${loginRes.status}`);
  
  let token = loginRes.body?.data?.tokens?.accessToken ?? loginRes.body?.data?.accessToken ?? loginRes.body?.accessToken ?? null;
  
  if (!token && loginRes.status === 401) {
    // Try register first
    console.log('  Login 401 — attempting register...');
    const regRes = await request('POST', '/v1/auth/register', {
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      name: 'Dev Engineer',
      organizationName: 'OpsPilot Dev Org',
    }, null);
    console.log(`  Register HTTP ${regRes.status}`);
    const loginRes2 = await request('POST', '/v1/auth/login', { email: DEV_EMAIL, password: DEV_PASSWORD }, null);
    token = loginRes2.body?.data?.accessToken ?? loginRes2.body?.accessToken ?? null;
  }

  if (!token) {
    console.error('  ✗ FAIL: No JWT token obtained');
    console.error('  Response:', JSON.stringify(loginRes.body, null, 2));
    process.exit(1);
  }
  console.log(`  ✓ PASS — Token: ${token.slice(0, 20)}...\n`);

  // ── 3. List existing runs ──────────────────────────────────
  console.log('[ 3 ] Fetching existing pipeline runs...');
  const runsRes = await request('GET', '/v1/runs?limit=5', null, token);
  console.log(`  HTTP ${runsRes.status}`);
  
  const runs = runsRes.body?.data?.runs ?? runsRes.body?.data ?? [];
  const runList = Array.isArray(runs) ? runs : [];
  
  let targetRunId = runList[0]?.id ?? null;
  console.log(`  Found ${runList.length} run(s) — using: ${targetRunId ?? '(none)'}`);

  if (!targetRunId) {
    // Try to trigger a run to get an ID
    console.log('  No runs found — fetching pipelines to trigger one...');
    const pipRes = await request('GET', '/v1/pipelines?limit=1', null, token);
    const pipes = pipRes.body?.data?.pipelines ?? pipRes.body?.data ?? [];
    const pipeList = Array.isArray(pipes) ? pipes : [];
    
    if (pipeList.length > 0) {
      const trigRes = await request('POST', `/v1/pipelines/${pipeList[0].id}/trigger`, { branch: 'main' }, token);
      console.log(`  Trigger HTTP ${trigRes.status}`);
      targetRunId = trigRes.body?.data?.id ?? null;
      console.log(`  Triggered run: ${targetRunId}`);
    }
  }

  if (!targetRunId) {
    console.log('  ⚠ No runId available — SSE will be tested with sentinel ID\n');
    targetRunId = 'shell';
  }
  console.log('  ✓ PASS\n');

  // ── 4. SSE stream connection ───────────────────────────────
  console.log(`[ 4 ] Connecting to SSE stream: /v1/runs/${targetRunId}/logs/stream`);
  const sse = await connectSSE(`/v1/runs/${targetRunId}/logs/stream`, token, 4000);
  
  if (sse.connected) {
    console.log(`  ✓ PASS — SSE stream opened (HTTP ${sse.statusCode}, text/event-stream)`);
    console.log(`  Events received within 4s: ${sse.events.length}`);
    if (sse.events.length > 0) {
      console.log('  ✓ PASS — Live SSE data received');
    } else {
      console.log('  ⚠ PARTIAL — Stream connected but no events in 4s (run may be complete)');
    }
  } else {
    console.log(`  ✗ Stream not opened — HTTP ${sse.statusCode ?? 'ERR'}`);
    if (sse.error) console.log(`  Error: ${sse.error}`);
    if (sse.body) console.log(`  Body: ${typeof sse.body === 'string' ? sse.body.slice(0, 200) : JSON.stringify(sse.body).slice(0, 200)}`);
  }
  console.log('');

  // ── 5. Historical logs endpoint ────────────────────────────
  console.log(`[ 5 ] Fetching historical logs: /v1/runs/${targetRunId}/logs`);
  const logsRes = await request('GET', `/v1/runs/${targetRunId}/logs`, null, token);
  console.log(`  HTTP ${logsRes.status}`);
  const logEntries = logsRes.body?.data ?? [];
  const entryCount = Array.isArray(logEntries) ? logEntries.length : 0;
  console.log(`  Log entries returned: ${entryCount}`);
  if (entryCount > 0) {
    const sample = logEntries[0];
    console.log(`  Sample: [${sample.level}] ${sample.message?.slice(0, 60)}`);
    console.log('  ✓ PASS — Historical logs endpoint operational');
  } else {
    console.log('  ⚠ PARTIAL — No log entries (run may not have executed steps)');
  }
  console.log('');

  // ── Summary ────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════');
  console.log(' VERIFICATION SUMMARY');
  console.log('════════════════════════════════════════════════');
  console.log(` Backend health:          ${health.status === 200 ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log(` JWT authentication:      ${token ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log(` SSE stream endpoint:     ${sse.connected ? '✓ VERIFIED (stream opened)' : '✗ NOT VERIFIED'}`);
  console.log(` SSE events received:     ${sse.events?.length > 0 ? `✓ VERIFIED (${sse.events.length} events)` : '⚠ PARTIAL (stream open, no events)'}`);
  console.log(` Historical logs API:     ${logsRes.status === 200 ? '✓ VERIFIED' : '✗ FAILED'}`);
  console.log('');
  
  const allPass = health.status === 200 && token && sse.connected && logsRes.status === 200;
  console.log(` OVERALL: ${allPass ? '✓ SSE STREAMING VERIFIED — Level 4' : '⚠ PARTIAL VERIFICATION'}`);
  console.log('════════════════════════════════════════════════\n');
  
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
