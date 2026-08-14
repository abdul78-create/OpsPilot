const http = require('http');
const crypto = require('crypto');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
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

function computeHmacSignature(payload, secret) {
  const bodyStr = JSON.stringify(payload);
  const digest = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');
  return `sha256=${digest}`;
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

  const webhookSecret = 'test_webhook_secret_key_123';

  console.log('\n=== 3. Positive Test: Automatic GitHub Push Webhook Processing ===');
  const pushPayload = {
    ref: 'refs/heads/main',
    after: 'step6_commit_sha_9876543210fedcba',
    repository: {
      html_url: 'https://github.com/expressjs/express',
      name: 'express',
    },
    pusher: { name: 'github-automation-bot' },
    head_commit: { message: 'feat: add automated CI/CD push trigger' },
  };

  const validSignature = computeHmacSignature(pushPayload, webhookSecret);
  const deliveryId = `deliv_auto_push_${Date.now()}`;

  const pushRes = await request(
    'http://localhost:3000/v1/webhooks/github',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': deliveryId,
        'X-Hub-Signature-256': validSignature,
      },
    },
    pushPayload,
  );

  console.log('GitHub Push Webhook Ingestion Status:', pushRes.status);
  const webhookData = pushRes.body?.data || pushRes.body;
  const runId = webhookData?.runId;
  console.log('Automatically Triggered Pipeline Run ID:', runId);
  console.log('Jobs Enqueued Count:', webhookData?.jobsEnqueued);

  if (pushRes.status !== 200 || !runId) {
    throw new Error(`Failed to ingest GitHub push webhook: ${JSON.stringify(pushRes.body)}`);
  }

  console.log('SUCCESS: GitHub Push Webhook ingested and Pipeline Run automatically queued!');

  console.log('\n=== 4. Negative Idempotency Test: Duplicate Webhook Delivery ===');
  const dupRes = await request(
    'http://localhost:3000/v1/webhooks/github',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': deliveryId,
        'X-Hub-Signature-256': validSignature,
      },
    },
    pushPayload,
  );
  console.log('Duplicate Delivery Status:', dupRes.status);
  const dupData = dupRes.body?.data || dupRes.body;
  console.log('Duplicate Delivery Message:', dupData?.message);
  if (dupData?.status === 'ignored') {
    console.log('SUCCESS: Duplicate webhook delivery strictly ignored via Redis/memory idempotency lock!');
  }

  console.log('\n=== 5. Polling Automatically Triggered Pipeline Run Status ===');
  let currentStatus = 'QUEUED';
  let pollAttempts = 0;
  while (pollAttempts < 15) {
    await sleep(2000);
    pollAttempts++;
    const runDetails = await request(
      `http://localhost:3000/v1/runs/${runId}`,
      { method: 'GET', headers },
    );
    currentStatus = runDetails.body?.data?.status || 'UNKNOWN';
    console.log(`Poll #${pollAttempts} (${pollAttempts * 2}s): Auto-Triggered Run '${runId}' Status = ${currentStatus}`);
    if (currentStatus === 'SUCCESS' || currentStatus === 'FAILED') break;
  }

  console.log(`Final Execution Status: ${currentStatus}`);
  if (currentStatus === 'SUCCESS') {
    console.log('SUCCESS: Automatic GitHub push pipeline execution completed successfully through BullMQ worker!');
  }

  console.log('\n=== 6. Direct HTTP Health Verification of Deployed App Container ===');
  const liveAppHealth = await request('http://localhost:8080/health');
  console.log('Live App GET http://localhost:8080/health Status:', liveAppHealth.status);
  console.log('Live App Response Payload:', liveAppHealth.body);

  if (liveAppHealth.status === 200 && liveAppHealth.body?.status === 'healthy') {
    console.log('SUCCESS: Deployed application container is actively running and responding with HTTP 200 OK!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
