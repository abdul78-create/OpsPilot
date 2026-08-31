/**
 * Live GitHub Webhook & Pipeline Trigger Verification
 * Simulates real GitHub push, tag, branch, and idempotent webhook deliveries
 * against the production Render backend: https://opspilot-backend-gd60.onrender.com/v1/webhooks/github
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://opspilot-backend-gd60.onrender.com';

const results = [];

async function recordCheck(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASSED', duration: `${duration}ms`, detail });
    console.log(`✅ [PASSED] ${name} (${duration}ms)`);
    if (detail) console.log(`   Detail: ${JSON.stringify(detail).slice(0, 160)}`);
  } catch (err) {
    const duration = Date.now() - start;
    results.push({ name, status: 'FAILED', duration: `${duration}ms`, error: err.message });
    console.error(`❌ [FAILED] ${name} (${duration}ms): ${err.message}`);
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('       OPSPILOT LIVE GITHUB WEBHOOK & DISPATCH VALIDATION          ');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Backend Target : ${BACKEND_URL}`);
  console.log(`Timestamp      : ${new Date().toISOString()}\n`);

  const deliveryId = `live-deliv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const commitSha = `a1b2c3d4e5f6${Date.now().toString(16)}0000000000000000`.slice(0, 40);
  const repoUrl = 'https://github.com/abdul78-create/StockFlow';

  // 1. Live Push Webhook Ingestion & Pipeline Run Trigger
  let dispatchedRunId = null;
  await recordCheck('1. Live GitHub Push Webhook -> Pipeline Run Trigger', async () => {
    const payload = {
      ref: 'refs/heads/main',
      after: commitSha,
      repository: {
        id: 12345678,
        name: 'StockFlow',
        full_name: 'abdul78-create/StockFlow',
        html_url: repoUrl,
        clone_url: `${repoUrl}.git`,
        default_branch: 'main',
      },
      head_commit: {
        id: commitSha,
        message: 'feat: live production webhook verification commit',
        timestamp: new Date().toISOString(),
        author: {
          name: 'QA Automation',
          email: 'qa@opspilot.live',
          username: 'abdul78-create',
        },
      },
      pusher: {
        name: 'abdul78-create',
        email: 'qa@opspilot.live',
      },
      sender: {
        login: 'abdul78-create',
        id: 87654321,
      },
    };

    const res = await fetch(`${BACKEND_URL}/v1/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': deliveryId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Webhook push returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (data.status !== 'success') {
      throw new Error(`Expected status 'success', got: ${JSON.stringify(data)}`);
    }

    dispatchedRunId = data.runId || (data.triggeredRuns && data.triggeredRuns[0]?.runId);
    return {
      status: data.status,
      message: data.message,
      runId: dispatchedRunId,
      stack: data.stack,
      jobsEnqueued: data.jobsEnqueued,
    };
  });

  // 2. Webhook Distributed Idempotency (Duplicate Delivery Deduplication)
  await recordCheck('2. Webhook Idempotency: Duplicate Delivery Ignored/Deduplicated', async () => {
    const payload = {
      ref: 'refs/heads/main',
      after: commitSha,
      repository: { html_url: repoUrl },
      sender: { login: 'abdul78-create' },
    };

    const res = await fetch(`${BACKEND_URL}/v1/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-github-delivery': deliveryId, // Identical deliveryId
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Duplicate webhook returned status ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== 'ignored' && !data.message?.includes('already processed')) {
      throw new Error(`Expected duplicate to be ignored, got: ${JSON.stringify(data)}`);
    }
    return { status: data.status, message: data.message, deliveryId };
  });

  // 3. Tag Created Webhook Event
  await recordCheck('3. GitHub Release Tag Creation Webhook Ingestion', async () => {
    const tagDeliveryId = `tag-deliv-${Date.now()}`;
    const payload = {
      ref: 'refs/tags/v2.1.0',
      repository: { html_url: repoUrl },
      sender: { login: 'abdul78-create' },
    };

    const res = await fetch(`${BACKEND_URL}/v1/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'create',
        'x-github-delivery': tagDeliveryId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Tag webhook returned status ${res.status}`);
    }

    const data = await res.json();
    return { status: data.status, message: data.message };
  });

  // 4. Branch Created Webhook Event
  await recordCheck('4. GitHub Branch Creation Webhook Ingestion', async () => {
    const branchDeliveryId = `branch-deliv-${Date.now()}`;
    const payload = {
      ref: 'refs/heads/feature/live-e2e',
      created: true,
      repository: { html_url: repoUrl },
      sender: { login: 'abdul78-create' },
    };

    const res = await fetch(`${BACKEND_URL}/v1/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'create',
        'x-github-delivery': branchDeliveryId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Branch webhook returned status ${res.status}`);
    }

    const data = await res.json();
    return { status: data.status, message: data.message };
  });

  // 5. GitHub App Installation Webhook Registration
  await recordCheck('5. GitHub App Installation Callback Registration', async () => {
    const payload = {
      installationId: `inst_${Date.now()}`,
      setupAction: 'install',
    };

    const res = await fetch(`${BACKEND_URL}/v1/webhooks/github/installation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`App installation callback returned status ${res.status}`);
    }

    const data = await res.json();
    return { status: data.status, installationId: data.data?.installationId };
  });

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                 WEBHOOK VALIDATION SUMMARY                        ');
  console.log('═══════════════════════════════════════════════════════════════════');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Webhook Checks: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.error(`\n❌ Failed checks:`);
    results.filter((r) => r.status === 'FAILED').forEach((r) => console.error(`- ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL GITHUB WEBHOOK & PIPELINE DISPATCH CHECKS PASSED LIVE ON PRODUCTION!`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
