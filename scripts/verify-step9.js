const http = require('http');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== 1. Checking API Health ===');
  const health = await request('http://localhost:3000/v1/health');
  console.log('Health Status:', health.body?.data?.status || health.status);

  console.log('\n=== 2. User Login ===');
  const login = await request(
    'http://localhost:3000/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@opspilot.ai', password: 'Password123!' },
  );

  const token = login.body?.data?.tokens?.accessToken;
  console.log('Login Status:', login.status);
  console.log('Obtained Token:', token ? `${token.substring(0, 15)}...` : 'FAILED');

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-organization-id': '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
    'Content-Type': 'application/json',
  };

  const targetRunId = 'ab22552b-c184-48dd-a845-7b2303d5cdc6';

  console.log('\n=== 3. Negative Security Test: Non-Existent Run Log Request ===');
  const badLogsRes = await request(
    'http://localhost:3000/v1/runs/00000000-0000-0000-0000-000000000000/logs',
    { method: 'GET', headers },
  );
  console.log('Non-Existent Logs Status:', badLogsRes.status);
  console.log('Non-Existent Logs Message:', badLogsRes.body?.message);
  if (badLogsRes.status === 404) {
    console.log('SUCCESS: Requesting logs for non-existent run ID strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 4. Positive Test: Fetch Historical Execution Logs ===');
  const logsRes = await request(
    `http://localhost:3000/v1/runs/${targetRunId}/logs`,
    { method: 'GET', headers },
  );
  console.log('Fetch Logs Status:', logsRes.status);
  const logsData = logsRes.body?.data || logsRes.body;
  console.log('Retrieved Log Entries Count:', Array.isArray(logsData) ? logsData.length : 0);
  if (Array.isArray(logsData) && logsData.length > 0) {
    console.log('Sample Log Entry:', {
      id: logsData[0].id,
      level: logsData[0].level,
      message: logsData[0].message,
    });
  }

  if (logsRes.status !== 200) {
    throw new Error(`Failed to fetch historical logs: ${JSON.stringify(logsRes.body)}`);
  }

  console.log('SUCCESS: Historical logs fetched successfully from database!');

  console.log('\n=== 5. Positive Test: SSE Real-Time Log Streaming Connection ===');
  const sseHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'text/event-stream',
  };

  const ssePromise = new Promise((resolve, reject) => {
    const req = http.request(
      `http://localhost:3000/v1/runs/${targetRunId}/logs/stream`,
      { method: 'GET', headers: sseHeaders },
      (res) => {
        console.log('SSE Handshake Status:', res.statusCode);
        console.log('SSE Content-Type Header:', res.headers['content-type']);
        if (res.statusCode === 200 && res.headers['content-type']?.includes('text/event-stream')) {
          req.destroy();
          resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
        } else {
          req.destroy();
          reject(new Error(`Unexpected SSE status/headers: ${res.statusCode} ${res.headers['content-type']}`));
        }
      },
    );
    req.on('error', reject);
    req.end();
  });

  const sseResult = await ssePromise;
  if (sseResult.status === 200 && sseResult.contentType.includes('text/event-stream')) {
    console.log('SUCCESS: SSE real-time log streaming connection established with text/event-stream header!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
