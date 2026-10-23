import { saveSession, validateSession, deleteSession, terminateAllUserSessions, updateHeartbeat } from "../api/sessionStore.js";
import adminHandler from "../api/admin.js";
import loginHandler from "../api/login.js";
import rbacHandler from "../api/rbac.js";
import sessionHandler from "../api/session.js";
import { DEFAULT_ROLE_MATRIX, buildRolePermissions, getUserRbacData } from "../api/rbac.js";

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

async function runE2EVerification() {
  console.log("=================================================================");
  console.log("   KAYETDMS — SESSION, RBAC & API ENDPOINT E2E VERIFICATION      ");
  console.log("=================================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function recordTest(name, isPass, detail) {
    total++;
    if (isPass) {
      passed++;
      console.log(` [PASS] ${name}: ${detail}`);
    } else {
      failed++;
      console.error(` [FAIL] ${name}: ${detail}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Session Lifecycle & Invalidation E2E
  // -------------------------------------------------------------
  console.log("--- 1. Session Creation, Heartbeat, Logout & Forced Revocation ---");
  const testUser = {
    uid: "usr_e2e_test_1",
    email: "test.inspector@kayetdms.com",
    role: "inspector"
  };
  const sessId1 = `sess_e2e_1_${Date.now()}`;

  // 1a. Create session
  await saveSession(sessId1, testUser.uid, testUser.email, testUser.role);
  const v1 = await validateSession(sessId1, testUser.uid);
  recordTest("Session Creation", v1.valid === true && v1.session?.email === testUser.email, `Session created with ID ${sessId1}`);

  // 1b. Update Heartbeat
  const hbRes = await updateHeartbeat(sessId1, testUser.uid);
  recordTest("Session Heartbeat", hbRes.success === true, "Heartbeat timestamp successfully updated");

  // 1c. API Request with valid session (validate action)
  const { req: reqSessOk, res: resSessOk } = mockReqRes("POST", { action: "validate", sessionId: sessId1, uid: testUser.uid });
  await sessionHandler(reqSessOk, resSessOk);
  recordTest("Authenticated Session API Access", resSessOk.statusCode === 200 && resSessOk.data?.valid === true, `HTTP ${resSessOk.statusCode} - Session Valid`);

  // 1d. Single Session Logout (deleteSession)
  await deleteSession(sessId1, testUser.uid);
  const v2 = await validateSession(sessId1, testUser.uid);
  recordTest("Session Single Logout", v2.valid === false, "Session evicted from session store");

  // 1e. Re-try API request with logged out session to protected admin API endpoint
  const { req: reqSessRev, res: resSessRev } = mockReqRes("POST", { action: "get_users" }, { "x-session-id": sessId1, "x-user-uid": testUser.uid });
  await adminHandler(reqSessRev, resSessRev);
  recordTest("Revoked Session API Rejection", resSessRev.statusCode === 401, `HTTP ${resSessRev.statusCode} - Revoked session blocked`);

  // 1f. Force Logout All Sessions for User
  const sessId2A = `sess_multi_2a_${Date.now()}`;
  const sessId2B = `sess_multi_2b_${Date.now()}`;
  await saveSession(sessId2A, testUser.uid, testUser.email, testUser.role);
  await saveSession(sessId2B, testUser.uid, testUser.email, testUser.role);

  await terminateAllUserSessions(testUser.email, testUser.uid);
  const v2A = await validateSession(sessId2A, testUser.uid);
  const v2B = await validateSession(sessId2B, testUser.uid);
  recordTest("Force Logout All Sessions", v2A.valid === false && v2B.valid === false, "All concurrent active sessions purged");

  // -------------------------------------------------------------
  // TEST 2: RBAC Role Isolation Across Roles
  // -------------------------------------------------------------
  console.log("\n--- 2. Role-Based Access Control (RBAC) Matrix Verification ---");
  const rolesToTest = ["admin", "lead_engineer", "engineer", "inspector", "viewer", "custom"];
  
  for (const r of rolesToTest) {
    const perms = buildRolePermissions(r);
    const hasAdminPanel = perms.modules.adminControlCenter === true;
    const hasDamageExp = perms.modules.damageExplorer === true;

    if (r === "admin") {
      recordTest(`RBAC Role: ${r}`, hasAdminPanel === true && hasDamageExp === true, "Full administrative & module access");
    } else if (r === "lead_engineer" || r === "engineer") {
      recordTest(`RBAC Role: ${r}`, hasAdminPanel === false && hasDamageExp === true, "Engineering access granted, restricted from Admin Control Center");
    } else if (r === "inspector") {
      recordTest(`RBAC Role: ${r}`, hasAdminPanel === false && perms.modules.api570 === true, "Inspection operational access, restricted from Admin Panel");
    } else if (r === "viewer") {
      recordTest(`RBAC Role: ${r}`, hasAdminPanel === false && perms.modules.thicknessCalc === false, "Read-only access, restricted from calculators and admin panel");
    } else {
      recordTest(`RBAC Role: ${r}`, hasAdminPanel === false, "Custom role default fallback safely enforced");
    }
  }

  // -------------------------------------------------------------
  // TEST 3: Protected API Endpoints Authorization Checks
  // -------------------------------------------------------------
  console.log("\n--- 3. API Endpoint Enforcement & Defense Checks ---");

  // 3a. Admin Endpoint without auth header
  const { req: rUnauth, res: resUnauth } = mockReqRes("POST", { action: "get_users" });
  await adminHandler(rUnauth, resUnauth);
  recordTest("Unauthenticated Access Rejection", resUnauth.statusCode === 401, `HTTP ${resUnauth.statusCode} (401 Unauthorized)`);

  // 3b. Admin Endpoint with forged session header
  const { req: rForged, res: resForged } = mockReqRes("POST", { action: "get_users" }, { "x-session-id": "fake_forged_session_777" });
  await adminHandler(rForged, resForged);
  recordTest("Forged Session ID Rejection", resForged.statusCode === 401, `HTTP ${resForged.statusCode} (401 Unauthorized)`);

  // 3c. Admin Endpoint with Viewer role session
  const viewerSessId = `sess_viewer_test_${Date.now()}`;
  await saveSession(viewerSessId, "usr_v1", "viewer@example.com", "viewer");
  const { req: rViewer, res: resViewer } = mockReqRes("POST", { action: "get_users" }, { "x-session-id": viewerSessId });
  await adminHandler(rViewer, resViewer);
  recordTest("Unauthorized Role (Viewer calling Admin API) Rejection", resViewer.statusCode === 403 || resViewer.statusCode === 401, `HTTP ${resViewer.statusCode} (Access denied)`);

  // 3d. Admin Endpoint with Super Admin session
  const adminSessId = `sess_admin_test_${Date.now()}`;
  await saveSession(adminSessId, "usr_a1", "avijitkayet97@gmail.com", "admin");
  const { req: rAdmin, res: resAdmin } = mockReqRes("POST", { action: "get_users" }, { "x-session-id": adminSessId });
  await adminHandler(rAdmin, resAdmin);
  recordTest("Authorized Admin Session Access", resAdmin.statusCode === 200 && Array.isArray(resAdmin.data?.users), `HTTP ${resAdmin.statusCode} - Returned ${resAdmin.data?.users?.length || 0} users`);

  // Cleanup sessions
  await deleteSession(viewerSessId, "usr_v1");
  await deleteSession(adminSessId, "usr_a1");

  console.log("\n================================================");
  console.log(`SUMMARY: ${passed}/${total} Tests Passed (${failed} Failed)`);
  console.log("================================================\n");

  if (failed > 0) process.exit(1);
}

runE2EVerification().catch(err => {
  console.error("E2E Verification Error:", err);
  process.exit(1);
});
