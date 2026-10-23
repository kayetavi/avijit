import fetch from 'node-fetch';

const PROJECT_ID = 'loginapp-feb72';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function runLiveSmokeTests() {
  console.log("================================================================");
  console.log("   RUNNING LIVE PRODUCTION FIRESTORE RULES SMOKE TESTS          ");
  console.log("   Target Project: " + PROJECT_ID);
  console.log("================================================================");

  let passed = 0;
  let failed = 0;

  // 1. Anonymous Read systemSettings
  try {
    const res = await fetch(`${BASE_URL}/systemSettings/layoutConfig`);
    if (res.status === 403 || res.status === 401) {
      console.log("  [PASS] Live Anonymous Read /systemSettings/layoutConfig -> Denied (403/401)");
      passed++;
    } else {
      console.error(`  [FAIL] Live Anonymous Read /systemSettings returned status ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Error testing /systemSettings:", err.message);
    failed++;
  }

  // 2. Anonymous Read systemAuditLogs
  try {
    const res = await fetch(`${BASE_URL}/systemAuditLogs`);
    if (res.status === 403 || res.status === 401) {
      console.log("  [PASS] Live Anonymous Read /systemAuditLogs -> Denied (403/401)");
      passed++;
    } else {
      console.error(`  [FAIL] Live Anonymous Read /systemAuditLogs returned status ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Error testing /systemAuditLogs:", err.message);
    failed++;
  }

  // 3. Anonymous Read analyses
  try {
    const res = await fetch(`${BASE_URL}/analyses/101-C-01`);
    if (res.status === 403 || res.status === 401) {
      console.log("  [PASS] Live Anonymous Read /analyses/101-C-01 -> Denied (403/401)");
      passed++;
    } else {
      console.error(`  [FAIL] Live Anonymous Read /analyses returned status ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Error testing /analyses:", err.message);
    failed++;
  }

  // 4. Anonymous Invalid Public Contact Submission (contains prohibited 'status' field)
  try {
    const invalidBody = {
      fields: {
        name: { stringValue: "Hacker" },
        email: { stringValue: "hacker@evil.com" },
        status: { stringValue: "verified" }
      }
    };
    const res = await fetch(`${BASE_URL}/contactSubmissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidBody)
    });
    if (res.status === 403 || res.status === 401) {
      console.log("  [PASS] Live Anonymous Contact Submission with prohibited 'status' field -> Denied (403)");
      passed++;
    } else {
      console.error(`  [FAIL] Live Invalid Contact Submission returned status ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Error testing contactSubmissions invalid payload:", err.message);
    failed++;
  }

  // 5. Anonymous Valid Public Contact Submission
  try {
    const validBody = {
      fields: {
        id: { stringValue: `smoke_${Date.now()}` },
        name: { stringValue: "Live Smoke Tester" },
        email: { stringValue: "smoke_test@kayetdms.com" },
        message: { stringValue: "Post-deployment live rule validation" },
        createdAt: { stringValue: new Date().toISOString() }
      }
    };
    const res = await fetch(`${BASE_URL}/contactSubmissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validBody)
    });
    if (res.status === 200) {
      console.log("  [PASS] Live Anonymous Valid Contact Submission -> Allowed (200 OK)");
      passed++;
    } else {
      const errText = await res.text();
      console.error(`  [FAIL] Live Valid Contact Submission returned status ${res.status}: ${errText}`);
      failed++;
    }
  } catch (err) {
    console.error("  [FAIL] Error testing valid contactSubmissions:", err.message);
    failed++;
  }

  console.log("================================================================");
  console.log(`Live Verification Results: ${passed} Passed, ${failed} Failed out of ${passed + failed} tests.`);
  console.log("================================================================");

  if (failed > 0) process.exit(1);
}

runLiveSmokeTests().catch(console.error);
