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

async function run() {
  console.log('=== 1. Checking API Health ===');
  const health = await request('http://localhost:3000/v1/health');
  console.log('Health:', health.body?.data?.status || health.status);

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

  console.log('\n=== 3. Resolving Connected GitHub Repository ===');
  const reposRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/repositories`,
    { method: 'GET', headers },
  );
  const connectedRepo = reposRes.body?.data?.[0];
  console.log('Target Connected Repository:', connectedRepo ? { id: connectedRepo.id, url: connectedRepo.repositoryUrl } : 'NONE');

  if (!connectedRepo) {
    throw new Error('No connected repository found for step 2 verification!');
  }

  console.log('\n=== 4. Negative Security Test: Non-Existent RepositoryConnectionId ===');
  const negRes1 = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines/from-repo`,
    { method: 'POST', headers },
    { repositoryConnectionId: '00000000-0000-0000-0000-000000000000' },
  );
  console.log('Negative Test 1 Status:', negRes1.status);
  console.log('Negative Test 1 Message:', negRes1.body?.message);
  if (negRes1.status === 404) {
    console.log('SUCCESS: Invalid repository connection ID strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 5. Positive Test: Creating Pipeline from Connected GitHub Repo ===');
  // Cleanup any previous pipeline with slug 'express-pipeline' for idempotent runs
  const existingPipelines = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines`,
    { method: 'GET', headers },
  );
  if (existingPipelines.body?.data && Array.isArray(existingPipelines.body.data)) {
    for (const p of existingPipelines.body.data) {
      if (p.slug.includes('express')) {
        console.log(`Cleaning up existing test pipeline ${p.id}...`);
        await request(
          `http://localhost:3000/v1/projects/${projectId}/pipelines/${p.id}`,
          { method: 'DELETE', headers },
        );
      }
    }
  }

  const posRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines/from-repo`,
    { method: 'POST', headers },
    {
      repositoryConnectionId: connectedRepo.id,
      name: 'Express Pipeline Step2 Test',
    },
  );

  console.log('Positive Creation Status:', posRes.status);
  console.log('Pipeline Definition Data:', {
    id: posRes.body?.data?.id,
    name: posRes.body?.data?.name,
    slug: posRes.body?.data?.slug,
    currentVersionNumber: posRes.body?.data?.currentVersionNumber,
    versionsCount: posRes.body?.data?.versions?.length || 0,
  });

  if (posRes.status === 201) {
    console.log('SUCCESS: Pipeline Definition and initial v1 Version created from connected repository!');
  }

  console.log('\n=== 6. Negative Conflict Test: Duplicate Pipeline Creation ===');
  const negRes2 = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines/from-repo`,
    { method: 'POST', headers },
    {
      repositoryConnectionId: connectedRepo.id,
      name: 'Express Pipeline Step2 Test',
    },
  );
  console.log('Duplicate Conflict Status:', negRes2.status);
  console.log('Duplicate Conflict Message:', negRes2.body?.message);
  if (negRes2.status === 409) {
    console.log('SUCCESS: Duplicate pipeline slug strictly rejected with 409 Conflict!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
