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

  console.log('\n=== 3. Negative Security Test: Non-Existent Environment ID ===');
  const negRes1 = await request(
    `http://localhost:3000/v1/environments/00000000-0000-0000-0000-000000000000/deployments`,
    { method: 'POST', headers },
    { pipelineRunId: 'ab22552b-c184-48dd-a845-7b2303d5cdc6' },
  );
  console.log('Negative Test 1 Status:', negRes1.status);
  console.log('Negative Test 1 Message:', negRes1.body?.message);
  if (negRes1.status === 404) {
    console.log('SUCCESS: Triggering deployment for non-existent environment strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 4. Resolving Staging Environment & Successful Pipeline Run ===');
  const envsRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/environments`,
    { method: 'GET', headers },
  );
  const stagingEnv = (envsRes.body?.data || []).find((e) => e.slug === 'staging') || envsRes.body?.data?.[0];
  console.log('Target Environment:', stagingEnv ? { id: stagingEnv.id, name: stagingEnv.name, slug: stagingEnv.slug } : 'NONE');

  if (!stagingEnv) throw new Error('No target environment found!');

  const pipelinesRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines`,
    { method: 'GET', headers },
  );
  const targetPipeline = pipelinesRes.body?.data?.[0];
  const runsRes = await request(
    `http://localhost:3000/v1/pipelines/${targetPipeline.id}/runs`,
    { method: 'GET', headers },
  );
  const successfulRun = (runsRes.body?.data || []).find((r) => r.status === 'SUCCESS');
  console.log('Target Successful Pipeline Run ID:', successfulRun?.id);

  if (!successfulRun) throw new Error('No successful pipeline run found!');

  console.log('\n=== 5. Triggering Real Deployment Release Execution ===');
  const deployRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/deployments`,
    { method: 'POST', headers },
    {
      pipelineRunId: successfulRun.id,
      releaseVersion: `v1.0.step5-${Date.now().toString().slice(-4)}`,
    },
  );

  console.log('Deployment Trigger Status:', deployRes.status);
  const deploymentId = deployRes.body?.data?.id;
  console.log('Created Deployment Data:', {
    id: deploymentId,
    status: deployRes.body?.data?.status,
    releaseVersion: deployRes.body?.data?.releaseVersion,
  });

  if (deployRes.status !== 201 || !deploymentId) {
    throw new Error(`Failed to trigger deployment release: ${JSON.stringify(deployRes.body)}`);
  }

  console.log('\n=== 6. Polling Deployment Status until SUCCESS ===');
  let currentDeployStatus = 'IN_PROGRESS';
  let pollAttempts = 0;
  while (pollAttempts < 15) {
    await sleep(2000);
    pollAttempts++;
    const details = await request(
      `http://localhost:3000/v1/deployments/${deploymentId}`,
      { method: 'GET', headers },
    );
    currentDeployStatus = details.body?.data?.status || 'UNKNOWN';
    console.log(`Poll #${pollAttempts}: Deployment '${deploymentId}' Status = ${currentDeployStatus}`);
    if (currentDeployStatus === 'SUCCESS' || currentDeployStatus === 'FAILED') break;
  }

  console.log(`Final Deployment Status: ${currentDeployStatus}`);

  console.log('\n=== 7. Direct HTTP Health Verification of Deployed App Container ===');
  const liveAppHealth = await request('http://localhost:8080/health');
  console.log('Live App GET http://localhost:8080/health Status:', liveAppHealth.status);
  console.log('Live App Response Payload:', liveAppHealth.body);

  if (liveAppHealth.status === 200 && liveAppHealth.body?.status === 'healthy') {
    console.log('SUCCESS: Deployed application container is actively running and responding with HTTP 200 OK!');
  } else {
    throw new Error('Deployed application HTTP health check failed!');
  }

  console.log('\n=== 8. Deployment Health Probe API Endpoint Verification ===');
  const probeApiRes = await request(
    `http://localhost:3000/v1/deployments/${deploymentId}/health`,
    { method: 'GET', headers },
  );

  console.log('Health Probe API Status:', probeApiRes.status);
  console.log('Health Probe API Data:', probeApiRes.body?.data);

  if (probeApiRes.status === 200 && probeApiRes.body?.data?.statusCode === 200) {
    console.log('SUCCESS: OpsPilot API deployment health probe confirmed 200 OK!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
