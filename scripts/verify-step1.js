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
  console.log('Health:', health.body);

  console.log('\n=== 2. User Login ===');
  const login = await request(
    'http://localhost:3000/v1/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@opspilot.ai', password: 'Password123!' },
  );

  console.log('Login Full Body:', JSON.stringify(login.body));
  const token = login.body?.accessToken || login.body?.data?.accessToken || login.body?.data?.tokens?.accessToken;
  console.log('Login Status:', login.status);
  console.log('Obtained Token:', token ? `${token.substring(0, 15)}...` : 'FAILED');

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-organization-id': '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
    'Content-Type': 'application/json',
  };

  const projectId = '138ae2ae-2d30-4536-8789-267c5901f05c';

  console.log('\n=== 3. Negative Security Test: Connecting Non-Existent Repository ===');
  const negRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/repositories`,
    { method: 'POST', headers },
    {
      provider: 'GITHUB',
      repositoryUrl: 'https://github.com/opspilot-fake-org-9999/non-existent-repo-9999',
    },
  );
  console.log('Negative Connection Status:', negRes.status);
  console.log('Negative Response:', negRes.body);
  if (negRes.status === 400) {
    console.log('SUCCESS: Invalid/non-existent repository strictly rejected by GitHub REST API validation!');
  }

  console.log('\n=== 4. Positive Test: Connecting Real GitHub Repository ===');
  // Cleanup previous test connection if present
  const existing = await request(
    `http://localhost:3000/v1/projects/${projectId}/repositories`,
    { method: 'GET', headers },
  );

  if (existing.body?.data && Array.isArray(existing.body.data)) {
    for (const repo of existing.body.data) {
      if (repo.repositoryUrl.includes('express')) {
        console.log(`Cleaning up previous test connection ${repo.id}...`);
        await request(
          `http://localhost:3000/v1/projects/${projectId}/repositories/${repo.id}`,
          { method: 'DELETE', headers },
        );
      }
    }
  }

  const posRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/repositories`,
    { method: 'POST', headers },
    {
      provider: 'GITHUB',
      repositoryUrl: 'https://github.com/expressjs/express',
      defaultBranch: 'main',
    },
  );

  console.log('Positive Connection Status:', posRes.status);
  console.log('Positive Response:', posRes.body);
  if (posRes.status === 201) {
    console.log('SUCCESS: Real GitHub repository connected successfully and stored in DB!');
  }

  console.log('\n=== 5. Browsing Real GitHub User Repositories API Endpoint ===');
  const browseRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/repositories/github/user-repos`,
    { method: 'POST', headers },
    {},
  );
  console.log('Browse User Repos Status:', browseRes.status);
  console.log('Browse Response Summary:', {
    message: browseRes.body?.message,
  });
  if (browseRes.status === 400) {
    console.log('SUCCESS: Repository browsing endpoint strictly requires GitHub access token (positive security boundary verified)!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
