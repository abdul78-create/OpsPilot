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

  console.log('\n=== 3. Resolving Staging Environment ===');
  const envsRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/environments`,
    { method: 'GET', headers },
  );
  const stagingEnv = (envsRes.body?.data || []).find((e) => e.slug === 'staging') || envsRes.body?.data?.[0];
  console.log('Target Environment:', stagingEnv ? { id: stagingEnv.id, name: stagingEnv.name } : 'NONE');

  if (!stagingEnv) throw new Error('No target environment found!');

  const secretKey = `DB_URL_STEP8_${Date.now().toString().slice(-4)}`;
  const secretValue = 'postgres://opspilot_sec_usr:SuperSecretPass2026!@localhost:5432/opspilot_db';

  console.log('\n=== 4. Positive Test: Create & Encrypt Secret ===');
  const createRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/secrets`,
    { method: 'POST', headers },
    { key: secretKey, value: secretValue },
  );

  console.log('Create Secret Status:', createRes.status);
  const secretData = createRes.body?.data || createRes.body;
  console.log('Created Secret Masked Metadata:', {
    id: secretData?.id,
    key: secretData?.key,
    isConfigured: secretData?.isConfigured,
    keyVersion: secretData?.keyVersion,
    algorithm: secretData?.algorithm,
  });

  if (createRes.status !== 201 || !secretData?.id) {
    throw new Error(`Failed to create secret: ${JSON.stringify(createRes.body)}`);
  }

  console.log('SUCCESS: Secret encrypted and stored in vault!');

  console.log('\n=== 5. Negative Test: Duplicate Key Conflict ===');
  const dupRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/secrets`,
    { method: 'POST', headers },
    { key: secretKey, value: 'duplicate_attempt' },
  );
  console.log('Duplicate Secret Status:', dupRes.status);
  console.log('Duplicate Secret Message:', dupRes.body?.message);
  if (dupRes.status === 409) {
    console.log('SUCCESS: Creating duplicate secret key strictly rejected with HTTP 409 Conflict!');
  }

  console.log('\n=== 6. Positive Test: List Masked Secrets ===');
  const listRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/secrets`,
    { method: 'GET', headers },
  );
  console.log('List Secrets Status:', listRes.status);
  const secretsList = listRes.body?.data || listRes.body;
  console.log('Secrets Count:', Array.isArray(secretsList) ? secretsList.length : 0);
  const foundInList = (secretsList || []).find((s) => s.key === secretKey);
  console.log('Found Secret in List (Masked):', foundInList);

  console.log('\n=== 7. Positive Test: Audited Decryption & Plaintext Reveal ===');
  const revealRes = await request(
    `http://localhost:3000/v1/environments/${stagingEnv.id}/secrets/${secretData.id}/reveal`,
    { method: 'POST', headers },
  );
  console.log('Reveal Secret Status:', revealRes.status);
  const revealedData = revealRes.body?.data || revealRes.body;
  console.log('Revealed Plaintext Data:', {
    id: revealedData?.id,
    key: revealedData?.key,
    revealedValue: revealedData?.value,
  });

  if ((revealRes.status === 200 || revealRes.status === 201) && revealedData?.value === secretValue) {
    console.log('SUCCESS: Secret plaintext accurately decrypted from AES-256-GCM vault!');
  } else {
    throw new Error('Secret decryption payload mismatch!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
