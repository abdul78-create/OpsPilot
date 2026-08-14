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

  const projectId = '138ae2ae-2d30-4536-8789-267c5901f05c';

  console.log('\n=== 3. Resolving Staging Environment & Previous Successful Deployment v1 ===');
  const envsRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/environments`,
    { method: 'GET', headers },
  );
  const stagingEnv = (envsRes.body?.data || []).find((e) => e.slug === 'staging') || envsRes.body?.data?.[0];
  console.log('Target Environment:', stagingEnv ? { id: stagingEnv.id, name: stagingEnv.name } : 'NONE');

  const deploymentsRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/deployments`,
    { method: 'GET', headers },
  );
  const successfulV1 = (deploymentsRes.body?.data || []).find((d) => d.status === 'SUCCESS' || d.status === 'ROLLED_BACK');
  console.log('Target Successful Deployment v1:', successfulV1 ? { id: successfulV1.id, version: successfulV1.releaseVersion } : 'NONE');

  if (!successfulV1) throw new Error('No successful v1 deployment found for rollback baseline!');

  console.log('\n=== 4. Triggering New Deployment v2 ===');
  const v2DeployRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/deployments`,
    { method: 'POST', headers },
    {
      pipelineRunId: successfulV1.pipelineRunId,
      releaseVersion: `v2.0.0-step7-broken-${Date.now().toString().slice(-4)}`,
    },
  );

  const v2DeploymentId = v2DeployRes.body?.data?.id;
  console.log('Triggered Deployment v2 ID:', v2DeploymentId, 'Status:', v2DeployRes.status);

  console.log('\n=== 5. Polling Deployment v2 Execution until Finished ===');
  let v2Status = 'IN_PROGRESS';
  let pollAttempts = 0;
  while (pollAttempts < 10) {
    await sleep(2000);
    pollAttempts++;
    const v2Details = await request(
      `http://localhost:3000/v1/deployments/${v2DeploymentId}`,
      { method: 'GET', headers },
    );
    v2Status = v2Details.body?.data?.status || 'UNKNOWN';
    console.log(`Poll #${pollAttempts}: Deployment v2 Status = ${v2Status}`);
    if (v2Status !== 'IN_PROGRESS') break;
  }

  console.log('\n=== 6. Negative Security Test: Non-Existent Deployment ID Rollback ===');
  const badIdRes = await request(
    'http://localhost:3000/v1/deployments/00000000-0000-0000-0000-000000000000/rollback',
    { method: 'POST', headers },
    { targetDeploymentId: successfulV1.id },
  );
  console.log('Non-Existent Rollback Status:', badIdRes.status);
  console.log('Non-Existent Rollback Message:', badIdRes.body?.message);
  if (badIdRes.status === 404) {
    console.log('SUCCESS: Rollback for non-existent deployment ID strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 7. Positive Test: Executing Automated Rollback from v2 -> v1 ===');
  const rollbackRes = await request(
    `http://localhost:3000/v1/deployments/${v2DeploymentId}/rollback`,
    { method: 'POST', headers },
    {
      targetDeploymentId: successfulV1.id,
      reason: 'Reverting breaking release v2 back to stable v1',
    },
  );

  console.log('Rollback Endpoint HTTP Status:', rollbackRes.status);
  const rollbackData = rollbackRes.body?.data || rollbackRes.body;
  console.log('Rollback Result Data:', {
    id: rollbackData?.id,
    status: rollbackData?.status,
    releaseVersion: rollbackData?.releaseVersion,
    rollbackFromDeploymentId: rollbackData?.rollbackFromDeploymentId,
  });

  if (rollbackRes.status !== 200 && rollbackRes.status !== 201) {
    throw new Error(`Rollback request failed: ${JSON.stringify(rollbackRes.body)}`);
  }

  console.log('SUCCESS: Rollback executed and recorded in database!');

  console.log('\n=== 8. Direct HTTP Health Verification of Restored Application Container ===');
  await sleep(1000);
  const liveAppHealth = await request('http://localhost:8080/health');
  console.log('Live App GET http://localhost:8080/health Status:', liveAppHealth.status);
  console.log('Live App Response Payload:', liveAppHealth.body);

  if (liveAppHealth.status === 200 && liveAppHealth.body?.status === 'healthy') {
    console.log('SUCCESS: Restored application container is actively running and responding with HTTP 200 OK!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
