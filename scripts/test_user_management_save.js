import { getAdminFirestore, getAdminApp } from "../api/firebaseAdmin.js";
import adminHandler from "../api/admin.js";
import rbacHandler from "../api/rbac.js";
import { saveSession } from "../api/sessionStore.js";

function mockReqRes(method = "POST", body = {}, headers = {}) {
  const req = {
    method,
    body,
    query: method === "GET" ? body : {},
    headers: {
      "content-type": "application/json",
      ...headers
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; },
    end() { return this; }
  };

  return { req, res };
}

async function testAdminSave() {
  console.log("=== TESTING ADMIN USER MANAGEMENT SAVE FLOW ===");

  const adminEmail = "avijitkayet97@gmail.com";
  const adminSessId = `sess_admin_save_test_${Date.now()}`;
  await saveSession(adminSessId, "usr_superadmin", adminEmail, "admin");

  const targetEmail = "engineer@example.com";

  // 1. First set an existing password for targetEmail
  const { req: rInit, res: resInit } = mockReqRes("POST", {
    action: "save_user",
    targetEmail,
    role: "engineer",
    password: "ExistingPassword123!"
  }, { "x-session-id": adminSessId });

  await adminHandler(rInit, resInit);
  console.log("Initial User Creation Status:", resInit.statusCode, resInit.data?.message);

  // 2. Now save Configured Permissions without passing password (simulating UI configured permissions edit)
  const configuredModules = {
    damageExplorer: true,
    api581: true,
    api570: true,
    thicknessCalc: true,
    crackingMechanism: true,
    bkStress: true,
    streamComparator: true,
    chemicalSuite: true,
    unitConverter: true,
    processFlow: true,
    rptu: true,
    ccdAI: true,
    adminControlCenter: false
  };

  const { req: rSave, res: resSave } = mockReqRes("POST", {
    action: "save_user",
    targetEmail,
    role: "engineer",
    allowedModules: configuredModules
  }, { "x-session-id": adminSessId });

  await adminHandler(rSave, resSave);
  console.log("Save Permissions Status:", resSave.statusCode);
  console.log("Response Data:", JSON.stringify(resSave.data, null, 2));

  // Check if password was preserved or changed
  if (resSave.data?.password === "ExistingPassword123!") {
    console.log("Password Preserved: PASS");
  } else {
    console.log("Password Preserved: FAIL (Original: ExistingPassword123!, New:", resSave.data?.password, ")");
  }

  // 3. Check Firestore document userRoles/engineer@example.com
  const adminDb = getAdminFirestore();
  if (adminDb) {
    const urDoc = await adminDb.collection("userRoles").doc(targetEmail).get();
    console.log("userRoles doc exists in Firestore:", urDoc.exists);
    if (urDoc.exists) {
      console.log("userRoles doc role:", urDoc.data()?.role);
      console.log("userRoles doc allowedModules keys:", Object.keys(urDoc.data()?.allowedModules || {}));
    }
  }

  // 4. Test unauthorized user (viewer) trying to save user permissions
  const viewerEmail = "viewer.test@example.com";
  const viewerSessId = `sess_viewer_save_test_${Date.now()}`;
  await saveSession(viewerSessId, "usr_viewer", viewerEmail, "viewer");

  const { req: rViewer, res: resViewer } = mockReqRes("POST", {
    action: "save_user",
    targetEmail,
    role: "admin"
  }, { "x-session-id": viewerSessId });

  await adminHandler(rViewer, resViewer);
  console.log("Viewer Save Attempt Status:", resViewer.statusCode, resViewer.data?.error);
}

testAdminSave().catch(console.error);
