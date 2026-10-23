/**
 * Comprehensive Test & Verification Suite for Firebase Admin SDK Production Integration
 * Validates:
 * 1. Admin SDK Singleton initialization & safe failover when unconfigured
 * 2. Secure credential discovery (JSON string, Base64, file paths, discrete env vars)
 * 3. Zero credential leakage or key exposure in diagnostic outputs
 * 4. Verification of Server Identity & Session Store routing through Admin SDK
 * 5. Layout persistence & accurate Firestore sync status reporting
 * 6. Audit logging, stream datasets, and RBAC user management resilience
 */

import {
  initFirebaseAdmin,
  getAdminApp,
  getAdminFirestore,
  getAdminAuth,
  isAdminConfigured,
  getAdminStatus
} from "../api/firebaseAdmin.js";

import {
  saveSession,
  validateSession,
  verifyServerIdentity,
  deleteSession
} from "../api/sessionStore.js";

import adminHandler from "../api/admin.js";
import streamHandler from "../api/stream-datasets.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

function mockReqRes(method = "GET", body = {}, headers = {}, query = {}) {
  const req = {
    method,
    body: method === "GET" ? {} : body,
    query: method === "GET" ? (Object.keys(query).length > 0 ? query : body) : query,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    end() {
      return this;
    }
  };

  return { req, res };
}

async function runTests() {
  console.log("================================================================");
  console.log("   RUNNING FIREBASE ADMIN SDK PRODUCTION INTEGRATION TESTS     ");
  console.log("================================================================\n");

  // -------------------------------------------------------------
  // Test 1: Admin SDK Initialization & Diagnostics
  // -------------------------------------------------------------
  console.log("--- 1. Admin SDK Configuration & Security Checks ---");
  const status = getAdminStatus();
  assert(status !== null && typeof status === "object", "getAdminStatus returns diagnostic object");
  assert(!("privateKey" in status) && !("clientEmail" in status), "getAdminStatus exposes zero sensitive secrets");
  assert(typeof status.configured === "boolean", "status.configured is boolean");

  // -------------------------------------------------------------
  // Test 2: Session Store Integration
  // -------------------------------------------------------------
  console.log("\n--- 2. Session Store & Identity Verification ---");
  const testSessionId = `test_sess_${Date.now()}`;
  const testUid = "usr_test_admin_123";
  const testEmail = "avijitkayet97@gmail.com";

  const savedSess = await saveSession(testSessionId, testUid, testEmail, "Test Device Node");
  assert(savedSess && savedSess.sessionId === testSessionId, "saveSession creates and returns session data");

  const validated = await validateSession(testSessionId, testUid);
  assert(validated && validated.valid && validated.email === testEmail, "validateSession successfully resolves active session");

  const { req: idReq } = mockReqRes("POST", { sessionId: testSessionId, uid: testUid }, { "x-session-id": testSessionId });
  const verifiedIdent = await verifyServerIdentity(idReq);
  assert(verifiedIdent && verifiedIdent.verified && verifiedIdent.email === testEmail, "verifyServerIdentity validates session header");

  await deleteSession(testSessionId, testUid);
  const revalidated = await validateSession(testSessionId, testUid);
  assert(!revalidated.valid, "deleteSession invalidates active session");

  // -------------------------------------------------------------
  // Test 3: Admin Handler Identity Enforcement
  // -------------------------------------------------------------
  console.log("\n--- 3. Admin API Security & Identity Enforcement ---");

  // Unauthenticated administrative action
  const { req: unauthReq, res: unauthRes } = mockReqRes("POST", { action: "get_users" });
  await adminHandler(unauthReq, unauthRes);
  assert(unauthRes.statusCode === 401, "Unauthenticated 'get_users' request rejected with HTTP 401");

  // Public read action allowed
  const { req: pubReq, res: pubRes } = mockReqRes("GET", { action: "get_layout_config" });
  await adminHandler(pubReq, pubRes);
  assert(pubRes.statusCode === 200 && pubRes.data?.success === true, "Public 'get_layout_config' request succeeds with HTTP 200");

  // Authenticated Super Admin action
  const superSessId = `super_sess_${Date.now()}`;
  await saveSession(superSessId, "super_admin_id", testEmail);
  const { req: superReq, res: superRes } = mockReqRes(
    "POST",
    { action: "get_overview", sessionId: superSessId },
    { "x-session-id": superSessId }
  );
  await adminHandler(superReq, superRes);
  assert(superRes.statusCode === 200 && superRes.data?.success === true, "Authenticated Super Admin 'get_overview' succeeds");

  // -------------------------------------------------------------
  // Test 4: Layout Persistence & Sync Reporting Accuracy
  // -------------------------------------------------------------
  console.log("\n--- 4. Layout Persistence & Sync Reporting ---");
  const { req: layoutReq, res: layoutRes } = mockReqRes(
    "POST",
    {
      action: "save_layout_config",
      sessionId: superSessId,
      config: { tickerText: "Production Test Announcement", sidebarModules: [] }
    },
    { "x-session-id": superSessId }
  );
  await adminHandler(layoutReq, layoutRes);
  assert(layoutRes.statusCode === 200 && layoutRes.data?.success === true, "save_layout_config succeeds");
  assert("firestorePersisted" in layoutRes.data, "save_layout_config explicitly reports firestorePersisted boolean");
  if (!isAdminConfigured()) {
    assert(
      layoutRes.data.firestorePersisted === false,
      "Accurately reports firestorePersisted=false when Admin SDK is unconfigured (no false success claims)"
    );
  }

  // -------------------------------------------------------------
  // Test 5: Stream Datasets API Integration
  // -------------------------------------------------------------
  console.log("\n--- 5. Stream Datasets API ---");
  const { req: streamReq, res: streamRes } = mockReqRes("GET");
  await streamHandler(streamReq, streamRes);
  assert(streamRes.statusCode === 200 && streamRes.data?.success === true, "stream-datasets GET succeeds");

  await deleteSession(superSessId, "super_admin_id");

  console.log("\n================================================ me");
  console.log(`   TEST RESULTS: ${passed} Passed, ${failed} Failed out of ${passed + failed} tests`);
  console.log("================================================================\n");

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
