const http = require('http');
const crypto = require('crypto');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      res.on('end', () => {
        const isJson = (res.headers['content-type'] || '').includes('application/json');
        if (isJson) {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data.toString()) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        } else {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
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

  console.log('\n=== 3. Negative Security Test: Non-Existent Artifact Download ===');
  const negRes1 = await request(
    `http://localhost:3000/v1/artifacts/00000000-0000-0000-0000-000000000000/download`,
    { method: 'GET', headers },
  );
  console.log('Negative Test 1 Status:', negRes1.status);
  console.log('Negative Test 1 Message:', negRes1.body?.message);
  if (negRes1.status === 404) {
    console.log('SUCCESS: Downloading non-existent artifact strictly rejected with 404 Not Found!');
  }

  console.log('\n=== 4. Resolving Target Successful Pipeline Run & Real Artifact ===');
  const pipelinesRes = await request(
    `http://localhost:3000/v1/projects/${projectId}/pipelines`,
    { method: 'GET', headers },
  );
  const targetPipeline = pipelinesRes.body?.data?.[0];
  if (!targetPipeline) throw new Error('No target pipeline found!');

  const runsRes = await request(
    `http://localhost:3000/v1/pipelines/${targetPipeline.id}/runs`,
    { method: 'GET', headers },
  );
  const successfulRun = (runsRes.body?.data || []).find((r) => r.status === 'SUCCESS');
  if (!successfulRun) throw new Error('No successful pipeline run found for step 4 verification!');

  console.log('Target Successful Pipeline Run ID:', successfulRun.id);

  // Register real artifact in container path /opspilot-artifacts/artifact-<runId>.tar.gz
  const containerArchivePath = `/opspilot-artifacts/artifact-${successfulRun.id}.tar.gz`;
  
  // Calculate checksum of container archive using docker exec
  const { execSync } = require('child_process');
  const shaOutput = execSync(`docker exec opspilot_backend sha256sum ${containerArchivePath}`).toString();
  const actualSha256 = shaOutput.trim().split(/\s+/)[0];
  const sizeOutput = execSync(`docker exec opspilot_backend stat -c%s ${containerArchivePath}`).toString();
  const actualSizeBytes = parseInt(sizeOutput.trim(), 10);

  console.log('\n=== 5. Registering Real Build Artifact Archive ===');
  const regRes = await request(
    `http://localhost:3000/v1/pipeline-runs/${successfulRun.id}/artifacts`,
    { method: 'POST', headers },
    {
      name: `express-build-artifact-${successfulRun.id.slice(0, 8)}`,
      version: '1.0.0',
      checksum: actualSha256,
      storageLocation: containerArchivePath,
      sizeBytes: actualSizeBytes,
    },
  );

  console.log('Artifact Registration Status:', regRes.status);
  const targetArtifact = regRes.body?.data;
  console.log('Registered Artifact Data:', {
    id: targetArtifact?.id,
    name: targetArtifact?.name,
    checksum: targetArtifact?.checksum,
    sizeBytes: targetArtifact?.sizeBytes,
    storageLocation: targetArtifact?.storageLocation,
  });

  if (regRes.status !== 201 || !targetArtifact?.id) {
    throw new Error('Failed to register artifact!');
  }

  console.log('\n=== 6. Positive SHA-256 Integrity Check Test ===');
  const integrityRes = await request(
    `http://localhost:3000/v1/artifacts/${targetArtifact.id}/integrity`,
    { method: 'GET', headers },
  );

  console.log('Integrity Verification Status:', integrityRes.status);
  console.log('Integrity Verification Data:', integrityRes.body?.data);

  if (integrityRes.status === 200 && integrityRes.body?.data?.match === true) {
    console.log('SUCCESS: SHA-256 integrity match verified dynamically on stored archive!');
  } else {
    throw new Error(`Integrity check failed: ${JSON.stringify(integrityRes.body)}`);
  }

  console.log('\n=== 7. Positive Binary Stream Download Test ===');
  const downloadRes = await request(
    `http://localhost:3000/v1/artifacts/${targetArtifact.id}/download`,
    { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
  );

  console.log('Download Status:', downloadRes.status);
  console.log('Download Content-Type:', downloadRes.headers['content-type']);
  console.log('Download Content-Disposition:', downloadRes.headers['content-disposition']);
  console.log('Download Received Size:', downloadRes.raw?.length);

  const downloadedBuffer = downloadRes.raw;
  const downloadedChecksum = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');
  console.log('Downloaded Stream SHA-256 Checksum:', downloadedChecksum);
  console.log('Expected Container SHA-256 Checksum:', actualSha256);

  if (downloadRes.status === 200 && downloadedChecksum === actualSha256) {
    console.log('SUCCESS: Binary stream downloaded successfully with byte-level SHA-256 integrity match!');
  } else {
    throw new Error('Downloaded stream checksum mismatch!');
  }
}

run().catch((err) => console.error('Verification Error:', err));
