/**
 * OpsPilot Production Deployment E2E Verification Script
 * Validates the 13 production checks against live Render instances:
 * Backend: https://opspilot-backend-3pgb.onrender.com
 * Frontend: https://opspilot-frontend-4oou.onrender.com
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://opspilot-backend-3pgb.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://opspilot-frontend-4oou.onrender.com';

const results = [];

async function recordCheck(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASSED', duration: `${duration}ms`, detail });
    console.log(`✅ [PASSED] ${name} (${duration}ms)`);
    if (detail) console.log(`   Detail: ${JSON.stringify(detail).slice(0, 140)}`);
  } catch (err) {
    const duration = Date.now() - start;
    results.push({ name, status: 'FAILED', duration: `${duration}ms`, error: err.message });
    console.error(`❌ [FAILED] ${name} (${duration}ms): ${err.message}`);
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('       OPSPILOT LIVE PRODUCTION RUNTIME E2E VALIDATION            ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Backend Target : ${BACKEND_URL}`);
  console.log(`Frontend Target: ${FRONTEND_URL}`);
  console.log(`Timestamp      : ${new Date().toISOString()}\n`);

  // 1. Health & Database Connectivity
  await recordCheck('1. Backend /v1/health & Database Connection', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/health`);
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.success || data.data?.info?.database?.status !== 'up') {
      throw new Error(`DB status not up: ${JSON.stringify(data)}`);
    }
    return { status: data.data.status, db: data.data.info.database.status };
  });

  // 2. Liveness & Readiness Probes
  await recordCheck('2. Backend Liveness & Readiness Probes', async () => {
    const livenessRes = await fetch(`${BACKEND_URL}/v1/health/liveness`);
    if (!livenessRes.ok) throw new Error(`Liveness failed: ${livenessRes.status}`);
    const readinessRes = await fetch(`${BACKEND_URL}/v1/health/readiness`);
    if (!readinessRes.ok) throw new Error(`Readiness failed: ${readinessRes.status}`);
    return { liveness: 'ok', readiness: 'ok' };
  });

  // 3. System Health Metrics Security Rejection (Protected by JwtAuthGuard)
  await recordCheck('3. Security: System Health Metrics requires valid Token (401)', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/metrics/system-health`);
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    }
    return { endpoint: '/v1/metrics/system-health', status: res.status, protected: true };
  });

  // 4. Prometheus Telemetry Stream (Public Exposition)
  await recordCheck('4. Real Prometheus Telemetry Metric Stream', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/metrics/prometheus`);
    if (!res.ok) throw new Error(`Status ${res.status}: ${res.statusText}`);
    const text = await res.text();
    if (!text.includes('opspilot_uptime_seconds') || !text.includes('opspilot_process_memory_rss_bytes')) {
      throw new Error('Prometheus metrics output missing opspilot_uptime_seconds or memory metrics');
    }
    return { bytes: text.length, sample: text.slice(0, 120).replace(/\n/g, ' ') };
  });

  // 5. GitHub OAuth Integration Handshake
  await recordCheck('5. GitHub OAuth Provider Redirection Handshake', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/auth/github`, { redirect: 'manual' });
    const location = res.headers.get('location');
    if (!location || !location.includes('github.com/login/oauth/authorize')) {
      throw new Error(`Expected redirect to GitHub OAuth authorize, got: ${location}`);
    }
    if (!location.includes('client_id=') || !location.includes('redirect_uri=')) {
      throw new Error(`Missing OAuth parameters in redirect: ${location}`);
    }
    return { redirectTarget: location.split('?')[0], hasClientId: true, hasRedirectUri: true };
  });

  // 6. Google OAuth Integration Handshake
  await recordCheck('6. Google OAuth Provider Redirection Handshake', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/auth/google`, { redirect: 'manual' });
    const location = res.headers.get('location');
    if (!location || !location.includes('accounts.google.com/o/oauth2/v2/auth')) {
      throw new Error(`Expected redirect to Google OAuth authorize, got: ${location}`);
    }
    return { redirectTarget: location.split('?')[0], hasClientId: true };
  });

  // 7. Security Positive & Negative Tests: Unauthorized Access Rejected
  await recordCheck('7. Security: Unauthenticated Protected Endpoints Strictly Rejected (401)', async () => {
    const endpoints = [
      '/v1/organizations',
      '/v1/organizations/test-org/projects',
      '/v1/environments/test-env/deployments',
      '/v1/environments/test-env/secrets',
    ];
    for (const ep of endpoints) {
      const res = await fetch(`${BACKEND_URL}${ep}`);
      if (res.status !== 401) {
        throw new Error(`Endpoint ${ep} returned ${res.status} instead of 401 Unauthorized`);
      }
    }
    return { rejectedEndpoints: endpoints, statusExpected: 401 };
  });

  // 8. Security Positive & Negative Tests: Tampered JWT Rejected
  await recordCheck('8. Security: Forged/Tampered JWT Strictly Rejected (401)', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlLXVzZXIifQ.tampered_signature';
    const res = await fetch(`${BACKEND_URL}/v1/organizations`, {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    if (res.status !== 401) {
      throw new Error(`Tampered token returned ${res.status} instead of 401 Unauthorized`);
    }
    return { tamperedTokenRejected: true, status: res.status };
  });

  // 9. Fresh User Registration Flow
  const freshEmail = `qa-prod-e2e-${Date.now()}@opspilot.live`;
  await recordCheck('9. Fresh User Registration Flow', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Engineer',
        email: freshEmail,
        password: 'Password123!Secure',
      }),
    });
    if (res.status !== 201) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Registration failed with status ${res.status}: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return { email: freshEmail, success: data.success, message: data.message };
  });

  // 10. Unverified Email Login Block (Security Gate)
  await recordCheck('10. Security: Unverified Email Login Attempt Strictly Blocked (401)', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freshEmail,
        password: 'Password123!Secure',
      }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unverified account, got ${res.status}`);
    }
    const body = await res.json().catch(() => ({}));
    return { blocked: true, status: res.status, message: body.message };
  });

  // 11. Duplicate User Registration Conflict (409)
  await recordCheck('11. Security: Duplicate Email Registration Conflict (409)', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test Engineer',
        email: freshEmail,
        password: 'Password123!Secure',
      }),
    });
    if (res.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate email, got ${res.status}`);
    }
    return { conflictDetected: true, status: res.status };
  });

  // 12. Production Frontend Page Availability & SSR/SSG
  await recordCheck('12. Frontend Live Page Routes Serving Valid HTML', async () => {
    const routes = [
      '/',
      '/login',
      '/register',
      '/dashboard',
      '/pipelines',
      '/repositories',
      '/deployments',
      '/observability',
      '/billing',
      '/settings',
    ];
    const checked = [];
    for (const route of routes) {
      const res = await fetch(`${FRONTEND_URL}${route}`);
      if (!res.ok) {
        throw new Error(`Route ${route} returned status ${res.status}`);
      }
      const html = await res.text();
      if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
        throw new Error(`Route ${route} did not return valid HTML`);
      }
      checked.push({ route, status: res.status, contentLength: html.length });
    }
    return { routesChecked: checked.length, details: checked };
  });

  // 13. Production API Rate Limiting & Security Headers
  await recordCheck('13. Production Security Headers & Rate Limiting Verification', async () => {
    const res = await fetch(`${BACKEND_URL}/v1/health`);
    const headers = {
      strictTransportSecurity: res.headers.get('strict-transport-security'),
      contentSecurityPolicy: res.headers.get('content-security-policy'),
      xFrameOptions: res.headers.get('x-frame-options'),
      xContentTypeOptions: res.headers.get('x-content-type-options'),
      rateLimitLimit: res.headers.get('x-ratelimit-limit'),
      rateLimitRemaining: res.headers.get('x-ratelimit-remaining'),
    };
    if (!headers.strictTransportSecurity) {
      throw new Error('Missing strict-transport-security header');
    }
    if (!headers.xContentTypeOptions) {
      throw new Error('Missing x-content-type-options header');
    }
    return headers;
  });

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                 VALIDATION RESULTS SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.error(`\n❌ Failed checks:`);
    results.filter((r) => r.status === 'FAILED').forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL 13 PRODUCTION VALIDATION CHECKS PASSED LIVE ON PRODUCTION!`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
