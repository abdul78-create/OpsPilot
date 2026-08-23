const http = require('http');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_production_min_32_chars!!';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const now = Math.floor(Date.now() / 1000);
const token = generateJwt(
  {
    sub: '42a5fc5a-da18-44be-b6a1-8f133a0385f4',
    email: 'admin@opspilot.ai',
    role: 'ADMIN',
    isSuperAdmin: true,
    oid: '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
    type: 'access',
    iat: now,
    exp: now + 3600,
  },
  JWT_SECRET
);

const pipelineId = '923a1e6e-3f99-4e6e-8d04-4531a3c6e8a1';

const postData = JSON.stringify({ branch: 'main', commitSha: 'c0ffee1' });

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: `/v1/pipelines/${pipelineId}/runs`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      Authorization: `Bearer ${token}`,
      'x-organization-id': '3fdaca7b-c8e4-4be4-ba50-e1a2085ac913',
    },
  },
  (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      console.log('Response Body:', body);
    });
  }
);

req.on('error', console.error);
req.write(postData);
req.end();
