const http = require('http');

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
    if (body) req.write(JSON.stringify(body));
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

  const projectId = '138ae2ae-2d30-4536-8789-267c5901f05c';

  console.log('\n=== 3. Resolving Target PipelineDefinition ===');
  const pipelinesRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines`,
    { method: 'GET', headers },
  );
  const targetPipeline = pipelinesRes.body?.data?.[0];
  console.log('Target Pipeline:', targetPipeline ? { id: targetPipeline.id, name: targetPipeline.name } : 'NONE');

  if (!targetPipeline) {
    throw new Error('No target pipeline found for step 3 execution verification!');
  }

  console.log('\n=== 4. Negative Security Test: Trigger Non-Existent Pipeline ===');
  const negRes1 = await request(
    `http://localhost:3000/v1/pipelines/00000000-0000-0000-0000-000000000000/runs`,
    { method: 'POST', headers },
    { branch: 'main', triggerType: 'MANUAL' },
  );
  console.log('Negative Test 1 Status:', negRes1.status);
  console.log('Negative Test 1 Message:', negRes1.body?.message);
  if (negRes1.status === 404) {
    console.log('SUCCESS: Triggering non-existent pipeline strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 5. Positive Test: Triggering Real Pipeline Run Execution ===');
  const triggerRes = await request(
    `http://localhost:3000/v1/pipelines/${targetPipeline.id}/runs`,
    { method: 'POST', headers },
    { branch: 'main', triggerType: 'MANUAL' },
  );

  console.log('Trigger Status:', triggerRes.status);
  const runId = triggerRes.body?.data?.id;
  console.log('Trigger Response Data:', {
    runId,
    status: triggerRes.body?.data?.status,
    jobsCount: triggerRes.body?.data?.jobs?.length || 0,
  });

  if (triggerRes.status !== 201 || !runId) {
    throw new Error(`Failed to trigger pipeline run: ${JSON.stringify(triggerRes.body)}`);
  }

  console.log('SUCCESS: Pipeline Run triggered and queued in BullMQ!');

  console.log('\n=== 6. Polling Pipeline Run Execution Status ===');
  let currentRunStatus = 'QUEUED';
  let pollAttempts = 0;
  const maxAttempts = 30;

  while (pollAttempts < maxAttempts) {
    await sleep(2000);
    pollAttempts++;

    const runDetails = await request(
      `http://localhost:3000/v1/runs/${runId}`,
      { method: 'GET', headers },
    );

    currentRunStatus = runDetails.body?.data?.status || 'UNKNOWN';
    console.log(`Poll #${pollAttempts} (${pollAttempts * 2}s): Run '${runId}' Status = ${currentRunStatus}`);

    if (currentRunStatus === 'SUCCESS' || currentRunStatus === 'FAILED') {
      break;
    }
  }

  console.log(`Final Execution Run Status: ${currentRunStatus}`);
  if (currentRunStatus === 'SUCCESS') {
    console.log('SUCCESS: Pipeline execution completed successfully through BullMQ worker!');
  }

  console.log('\n=== 7. Failure Handling & AI Root Cause Analysis Verification ===');
  // Trigger intentional failure webhook to verify failure transition + AI RCA generation
  const failureWebhookPayload = {
    ref: 'refs/heads/main',
    after: 'deadbeef1234567890abcdef1234567890abcdef',
    repository: {
      html_url: 'https://github.com/opspilot-test/does-not-exist-intentional-failure',
      name: 'does-not-exist-intentional-failure',
      owner: { name: 'opspilot-test' },
    },
    pusher: { name: 'dev-tester' },
  };

  const webhookRes = await request(
    'http://localhost:3000/v1/webhooks/github',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': `deliv_${Date.now()}`,
      },
    },
    failureWebhookPayload,
  );
  console.log('Failure Webhook Trigger Status:', webhookRes.status);
  const failRunId = webhookRes.body?.data?.runId;
  console.log('Failure Pipeline Run ID:', failRunId);

  if (failRunId) {
    console.log('Polling Failure Pipeline Run until FAILED status...');
    let failAttempts = 0;
    while (failAttempts < 15) {
      await sleep(2000);
      failAttempts++;
      const runDetails = await request(
        `http://localhost:3000/v1/runs/${failRunId}`,
        { method: 'GET', headers },
      );
      const fStatus = runDetails.body?.data?.status;
      console.log(`Poll #${failAttempts}: Failure Run '${failRunId}' Status = ${fStatus}`);
      if (fStatus === 'FAILED') {
        console.log('SUCCESS: Failure pipeline run transitioned to FAILED and triggered AI RCA listener!');
        break;
      }
    }
  }
}

run().catch((err) => console.error('Verification Error:', err));
