import assert from "assert";
import fs from "fs";
import path from "path";
import adminHandler from "../api/admin.js";
import { saveSession, validateSession } from "../api/sessionStore.js";

async function runTest() {
  console.log("=================================================================");
  console.log("   VERIFYING ADMIN PANEL AUTHENTICATION & PERMISSIONS FLOW       ");
  console.log("=================================================================\n");

  const adminEmail = "avijitkayet97@gmail.com";
  const testSessionId = `sess_auth_test_${Date.now()}`;
  const testUid = "usr_superadmin";

  // 1. Create a valid server-side session for admin
  await saveSession(testSessionId, testUid, adminEmail, "admin");
  const validated = await validateSession(testSessionId, testUid);
  assert(validated && validated.valid, "Server session created and verified in sessionStore");
  console.log(" [PASS] Server session created and verified");

  // 2. Test /api/admin rejection when NO session or token is sent (Unauthenticated)
  let unauthReq = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      action: "save_user",
      callerEmail: adminEmail,
      targetEmail: "engineer@example.com",
      role: "engineer",
      allowedModules: { damageExplorer: true }
    }
  };
  let unauthRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await adminHandler(unauthReq, unauthRes);
  assert.strictEqual(unauthRes.statusCode, 401, "Requests without session or token are rejected with HTTP 401");
  assert(unauthRes.data?.error?.includes("Authentication required"), "Rejection error message is exact");
  console.log(" [PASS] Unauthenticated request correctly rejected with 401");

  // 3. Test /api/admin approval when x-session-id header is provided
  let authReqHeader = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-session-id": testSessionId,
      "x-user-uid": testUid
    },
    body: {
      action: "save_user",
      callerEmail: adminEmail,
      targetEmail: "engineer@example.com",
      role: "engineer",
      allowedModules: { damageExplorer: true, api581: true }
    }
  };
  let authResHeader = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await adminHandler(authReqHeader, authResHeader);
  assert.strictEqual(authResHeader.statusCode, 200, "Authenticated request via header succeeds with HTTP 200");
  assert(authResHeader.data?.success, "save_user returns success: true");
  console.log(" [PASS] Authenticated request via x-session-id header accepted with 200");

  // 4. Test /api/admin approval when sessionId is provided in request body payload
  let authReqBody = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      action: "save_user",
      sessionId: testSessionId,
      uid: testUid,
      callerEmail: adminEmail,
      targetEmail: "engineer@example.com",
      role: "engineer",
      allowedModules: { damageExplorer: true, api581: true }
    }
  };
  let authResBody = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.data = payload; return this; }
  };
  await adminHandler(authReqBody, authResBody);
  assert.strictEqual(authResBody.statusCode, 200, "Authenticated request via body payload succeeds with HTTP 200");
  assert(authResBody.data?.success, "save_user returns success: true");
  console.log(" [PASS] Authenticated request via JSON body payload accepted with 200");

  // 5. Test frontend js/admin-panel.js interceptor & adminFetch integration
  const domMock = {
    localStorage: {
      sessionId: testSessionId,
      userUid: testUid,
      loggedInUser: adminEmail,
      getItem(k) { return this[k] || null; },
      setItem(k, v) { this[k] = v; },
      removeItem(k) { delete this[k]; }
    }
  };

  const interceptedCalls = [];
  const mockFetch = async (url, opts = {}) => {
    interceptedCalls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: "Saved" })
    };
  };

  // Mock minimal window environment
  global.window = {
    fetch: mockFetch,
    localStorage: domMock.localStorage,
    sessionStorage: domMock.localStorage,
    Headers: class Headers {
      constructor(init = {}) {
        this.map = new Map();
        if (init) {
          if (init instanceof Headers) {
            init.map.forEach((v, k) => this.map.set(k.toLowerCase(), v));
          } else if (typeof init === "object") {
            Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), v));
          }
        }
      }
      set(k, v) { this.map.set(k.toLowerCase(), v); }
      get(k) { return this.map.get(k.toLowerCase()) || null; }
      has(k) { return this.map.has(k.toLowerCase()); }
    }
  };
  global.fetch = mockFetch;
  global.localStorage = domMock.localStorage;
  global.sessionStorage = domMock.localStorage;
  global.document = {
    body: {
      classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; }
  };

  // Load admin-panel.js
  const scriptContent = fs.readFileSync(path.resolve("js/admin-panel.js"), "utf8");
  eval(scriptContent);

  assert(typeof window.adminPanel?.adminFetch === "function", "window.adminPanel.adminFetch is exposed");
  console.log(" [PASS] window.adminPanel.adminFetch exists");

  // Execute adminFetch to test header & payload enrichment
  await window.adminPanel.adminFetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save_user", targetEmail: "engineer@example.com" })
  });

  const call = interceptedCalls.find(c => c.opts?.body && c.opts.body.includes("engineer@example.com"));
  assert(!!call, "adminFetch dispatched a request matching our payload");
  const reqHeaders = call.opts.headers;
  assert(
    reqHeaders["x-session-id"] === testSessionId || (reqHeaders.get && reqHeaders.get("x-session-id") === testSessionId),
    "adminFetch injected x-session-id header"
  );
  assert(
    reqHeaders["x-user-uid"] === testUid || (reqHeaders.get && reqHeaders.get("x-user-uid") === testUid),
    "adminFetch injected x-user-uid header"
  );

  const payload = JSON.parse(call.opts.body);
  assert.strictEqual(payload.sessionId, testSessionId, "adminFetch injected sessionId into JSON body");
  assert.strictEqual(payload.uid, testUid, "adminFetch injected uid into JSON body");
  assert.strictEqual(payload.callerEmail, adminEmail, "adminFetch injected callerEmail into JSON body");
  console.log(" [PASS] adminFetch guarantees transmission via both headers and JSON payload");

  console.log("\n=================================================================");
  console.log("   ALL AUTHENTICATION & SAVE FLOW TESTS PASSED SUCCESSFULLY!     ");
  console.log("=================================================================\n");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
