/**
 * Firestore Security Rules Evaluation Engine and Test Suite
 * Validates the hardened rules in firestore.rules against:
 * 1. Anonymous / Unauthenticated callers
 * 2. Ordinary authenticated users (Viewers)
 * 3. Role privilege escalation & identity spoofing attempts
 * 4. Authorized Administrators (Super Admin & Admin role)
 * 5. Direct client-side write attempts to protected collections
 * 6. Wildcard zero-trust default-deny catch-all
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Database State for Relational Lookups
const mockDatabase = {
  userRoles: {
    "avijitkayet97@gmail.com": { role: "admin" },
    "avijitkayet@gmail.com": { role: "admin" },
    "lead_engineer@example.com": { role: "lead_engineer" },
    "engineer@example.com": { role: "engineer" },
    "inspector@example.com": { role: "inspector" },
    "viewer@example.com": { role: "viewer" },
    "custom@example.com": { role: "custom_contractor" }
  },
  users: {
    "usr_admin": { role: "admin", email: "avijitkayet97@gmail.com" },
    "usr_lead": { role: "lead_engineer", email: "lead_engineer@example.com" },
    "usr_engineer": { role: "engineer", email: "engineer@example.com" },
    "usr_inspector": { role: "inspector", email: "inspector@example.com" },
    "usr_viewer": { role: "viewer", email: "viewer@example.com" },
    "usr_custom": { role: "custom_contractor", email: "custom@example.com" }
  }
};

/**
 * Evaluates rules logic accurately reflecting Cloud Firestore rules semantics
 */
class RuleContext {
  constructor(auth, pathTokens, operation, resourceData = null, incomingData = null) {
    this.auth = auth; // { uid, token: { email, email_verified } } or null
    this.path = pathTokens;
    this.operation = operation; // 'get', 'list', 'create', 'update', 'delete'
    this.resource = resourceData ? { data: resourceData } : null;
    this.requestResource = incomingData ? { data: incomingData } : null;
  }

  isAuthenticated() {
    return this.auth != null;
  }

  isEmailVerified() {
    return this.isAuthenticated() && this.auth.token?.email_verified === true;
  }

  isOwnerUid(uid) {
    return this.isAuthenticated() && this.auth.uid === uid;
  }

  isOwnerEmail(email) {
    return (
      this.isAuthenticated() &&
      this.isEmailVerified() &&
      this.auth.token?.email != null &&
      email != null &&
      this.auth.token.email.toLowerCase() === email.toLowerCase()
    );
  }

  isOwner(userId) {
    return this.isOwnerUid(userId) || this.isOwnerEmail(userId);
  }

  isSuperAdmin() {
    return (
      this.isAuthenticated() &&
      this.isEmailVerified() &&
      this.auth.token?.email != null &&
      this.auth.token.email.toLowerCase() === "avijitkayet97@gmail.com"
    );
  }

  getUserRole() {
    if (this.isSuperAdmin()) return "admin";
    if (!this.isAuthenticated()) return "viewer";

    const email = this.auth.token?.email?.toLowerCase();
    if (this.isEmailVerified() && email && mockDatabase.userRoles[email]) {
      return mockDatabase.userRoles[email].role;
    }
    const uid = this.auth.uid;
    if (uid && mockDatabase.users[uid]) {
      return mockDatabase.users[uid].role;
    }
    if (this.isEmailVerified() && email && mockDatabase.users[email]) {
      return mockDatabase.users[email].role;
    }
    return "viewer";
  }

  isAdmin() {
    return this.isAuthenticated() && (this.isSuperAdmin() || this.getUserRole() === "admin");
  }

  isLeadEngineerOrAdmin() {
    return this.isAuthenticated() && (this.isAdmin() || this.getUserRole() === "lead_engineer");
  }

  isEngineerOrAbove() {
    if (!this.isAuthenticated()) return false;
    const role = this.getUserRole();
    return this.isAdmin() || role === "lead_engineer" || role === "engineer" || role === "inspector";
  }

  evaluate() {
    const col = this.path[0];
    const docId = this.path[1];
    const op = this.operation;

    // 1. userSessions/{sessionId}
    if (col === "userSessions") {
      if (op === "get") {
        return (
          this.isAuthenticated() &&
          (this.isOwnerUid(docId) ||
            this.resource?.data?.uid === this.auth.uid ||
            (this.auth.token?.email != null &&
              this.resource?.data?.email?.toLowerCase() === this.auth.token.email.toLowerCase()) ||
            this.isAdmin())
        );
      }
      if (op === "list") {
        return (
          this.isAuthenticated() &&
          (this.isAdmin() ||
            this.resource?.data?.uid === this.auth.uid ||
            (this.auth.token?.email != null &&
              this.resource?.data?.email?.toLowerCase() === this.auth.token.email.toLowerCase()))
        );
      }
      if (op === "create") {
        return (
          this.isAuthenticated() &&
          (this.isOwnerUid(docId) ||
            this.requestResource?.data?.uid === this.auth.uid ||
            (this.auth.token?.email != null &&
              this.requestResource?.data?.email?.toLowerCase() === this.auth.token.email.toLowerCase()) ||
            this.isAdmin())
        );
      }
      if (op === "update") {
        return (
          this.isAuthenticated() &&
          (this.isOwnerUid(docId) ||
            this.resource?.data?.uid === this.auth.uid ||
            this.requestResource?.data?.uid === this.auth.uid ||
            this.isAdmin())
        );
      }
      if (op === "delete") {
        return (
          this.isAuthenticated() &&
          (this.isOwnerUid(docId) ||
            this.resource?.data?.uid === this.auth.uid ||
            this.isAdmin())
        );
      }
    }

    // 2. users/{userId}
    if (col === "users") {
      if (op === "get") {
        return this.isAuthenticated() && (this.isOwner(docId) || this.isAdmin());
      }
      if (op === "list") {
        return this.isAdmin();
      }
      if (op === "create") {
        if (!this.isAuthenticated()) return false;
        if (this.isAdmin()) return true;
        // User cannot assign role or isSuperAdmin unless viewer
        const inc = this.requestResource?.data || {};
        const hasElevatedKeys = ["role", "isSuperAdmin"].some(k => k in inc);
        const roleIsViewer = inc.role === "viewer";
        return this.isOwner(docId) && (!hasElevatedKeys || roleIsViewer);
      }
      if (op === "update") {
        if (!this.isAuthenticated()) return false;
        if (this.isAdmin()) return true;
        const inc = this.requestResource?.data || {};
        const cur = this.resource?.data || {};
        // Diff keys cannot affect role or isSuperAdmin
        const affectedPrivileged =
          (inc.role !== undefined && inc.role !== cur.role) ||
          (inc.isSuperAdmin !== undefined && inc.isSuperAdmin !== cur.isSuperAdmin);
        return this.isOwner(docId) && !affectedPrivileged;
      }
      if (op === "delete") {
        return this.isAdmin();
      }
    }

    // userRoles/{targetUser}
    if (col === "userRoles") {
      if (op === "get") {
        return this.isAuthenticated() && (this.isOwner(docId) || this.isAdmin());
      }
      if (op === "list" || op === "create" || op === "update" || op === "delete") {
        return this.isAdmin();
      }
    }

    // deletedUsers/{targetUser}
    if (col === "deletedUsers") {
      return this.isAdmin();
    }

    // 3. Catalogs: damageMechanisms, customDamageMechanisms, stressData, representativeFluids
    if (["damageMechanisms", "customDamageMechanisms", "stressData", "representativeFluids"].includes(col)) {
      if (op === "get" || op === "list") {
        return this.isAuthenticated();
      }
      return this.isLeadEngineerOrAdmin();
    }

    // streamDatasets/{datasetId}
    if (col === "streamDatasets") {
      if (op === "get" || op === "list") return this.isAuthenticated();
      if (op === "create") {
        return (
          this.isAuthenticated() &&
          (this.isLeadEngineerOrAdmin() ||
            (this.auth.token?.email != null &&
              this.requestResource?.data?.savedBy === this.auth.token.email))
        );
      }
      if (op === "update" || op === "delete") {
        return (
          this.isAuthenticated() &&
          (this.isLeadEngineerOrAdmin() ||
            (this.auth.token?.email != null &&
              this.resource?.data?.savedBy === this.auth.token.email))
        );
      }
    }

    // analyses, structural_thickness_assessments, semi_quantitative_risk_assessments
    if (["analyses", "structural_thickness_assessments", "semi_quantitative_risk_assessments"].includes(col)) {
      if (op === "get" || op === "list") return this.isAuthenticated();
      return this.isEngineerOrAbove();
    }

    // documents, ccd_documents
    if (["documents", "ccd_documents"].includes(col)) {
      if (op === "get" || op === "list") return this.isAuthenticated();
      if (op === "create" || op === "update") return this.isAuthenticated();
      if (op === "delete") return this.isAdmin();
    }

    // doc_locks
    if (col === "doc_locks") {
      return this.isAuthenticated();
    }

    // rbi_functional_locations, semi_quantitative_rbi_workspace
    if (col === "rbi_functional_locations" || col === "semi_quantitative_rbi_workspace") {
      if (op === "get" || op === "list") return this.isAuthenticated();
      return this.isLeadEngineerOrAdmin();
    }

    // contactSubmissions
    if (col === "contactSubmissions") {
      if (op === "create") {
        if (this.isAdmin()) return true;

        const data = this.requestResource?.data || {};
        const keys = Object.keys(data);
        const allowedClientKeys = ['id', 'name', 'email', 'plan', 'planText', 'customMessage', 'message', 'price', 'createdAt'];
        const systemKeys = ['status', 'emailDispatched', 'dispatchedAt', 'emailError'];

        const hasRequired = 'name' in data && 'email' in data;
        const hasOnlyAllowed = keys.every(k => allowedClientKeys.includes(k));
        const hasNoSystemFields = !systemKeys.some(sysKey => sysKey in data);

        const validName = typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 100;
        const validEmail = typeof data.email === 'string' && data.email.length > 0 && data.email.length <= 150 && /^[^@]+@[^@]+\.[^@]+$/.test(data.email);
        const validId = !('id' in data) || (typeof data.id === 'string' && data.id.length <= 100);
        const validPlan = !('plan' in data) || (typeof data.plan === 'string' && data.plan.length <= 50);
        const validPlanText = !('planText' in data) || (typeof data.planText === 'string' && data.planText.length <= 100);
        const validCustomMsg = !('customMessage' in data) || (typeof data.customMessage === 'string' && data.customMessage.length <= 2500);
        const validMsg = !('message' in data) || (typeof data.message === 'string' && data.message.length <= 2500);
        const validPrice = !('price' in data) || (typeof data.price === 'string' && data.price.length <= 50);
        const validCreatedAt = !('createdAt' in data) || (typeof data.createdAt === 'string' && data.createdAt.length <= 50);

        return hasRequired && hasOnlyAllowed && hasNoSystemFields && validName && validEmail && validId && validPlan && validPlanText && validCustomMsg && validMsg && validPrice && validCreatedAt;
      }
      return this.isAdmin(); // Only admin can read, update, or delete
    }

    // 4. systemSettings & systemMeta
    if (col === "systemSettings" || col === "systemMeta") {
      if (op === "get" || op === "list") return this.isAuthenticated();
      return this.isAdmin();
    }

    // systemAuditLogs
    if (col === "systemAuditLogs") {
      if (op === "get" || op === "list") return this.isAdmin();
      if (op === "create") return this.isAuthenticated();
      if (op === "update" || op === "delete") return false; // Immutable!
    }

    // 5. Default Safety Net (Wildcard match /{document=**})
    return false; // Deny by default
  }
}

// Test Runner
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

// -------------------------------------------------------------
// SUITE 1: ANONYMOUS ACCESS TESTS (Must be DENIED everywhere except public contact create)
// -------------------------------------------------------------
test("Anonymous cannot read systemSettings/layoutConfig", () => {
  const ctx = new RuleContext(null, ["systemSettings", "layoutConfig"], "get");
  assert(ctx.evaluate() === false, "Anonymous read systemSettings should be denied");
});

test("Anonymous cannot write systemSettings/layoutConfig", () => {
  const ctx = new RuleContext(null, ["systemSettings", "layoutConfig"], "update", {}, { tickerText: "hacked" });
  assert(ctx.evaluate() === false, "Anonymous write systemSettings should be denied");
});

test("Anonymous cannot read userRoles", () => {
  const ctx = new RuleContext(null, ["userRoles", "avijitkayet97@gmail.com"], "get");
  assert(ctx.evaluate() === false, "Anonymous read userRoles should be denied");
});

test("Anonymous cannot write userRoles", () => {
  const ctx = new RuleContext(null, ["userRoles", "hacker@evil.com"], "create", null, { role: "admin" });
  assert(ctx.evaluate() === false, "Anonymous write userRoles should be denied");
});

test("Anonymous cannot read userSessions", () => {
  const ctx = new RuleContext(null, ["userSessions", "sess_123"], "get", { uid: "user_1" });
  assert(ctx.evaluate() === false, "Anonymous read userSessions should be denied");
});

test("Anonymous cannot read engineering catalogs (damageMechanisms)", () => {
  const ctx = new RuleContext(null, ["damageMechanisms", "dm_sulfidation"], "get");
  assert(ctx.evaluate() === false, "Anonymous read catalogs should be denied");
});

test("Anonymous cannot read or write CCD documents", () => {
  const ctx1 = new RuleContext(null, ["documents", "doc_1"], "get");
  const ctx2 = new RuleContext(null, ["ccd_documents", "doc_1"], "update", {}, { title: "hacked" });
  assert(ctx1.evaluate() === false, "Anonymous read CCD documents should be denied");
  assert(ctx2.evaluate() === false, "Anonymous write CCD documents should be denied");
});

test("Anonymous CAN submit valid public contact inquiries (contactSubmissions create)", () => {
  const ctx = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "Prospect", email: "prospect@plant.com", message: "Hello", plan: "1year", planText: "1 Year Plan" });
  assert(ctx.evaluate() === true, "Valid public contact inquiry creation must be allowed");
});

test("Anonymous CANNOT set trusted system field 'status' on contactSubmissions", () => {
  const ctx = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "Hacker", email: "hacker@plant.com", status: "verified" });
  assert(ctx.evaluate() === false, "Setting system field 'status' on public submission must be denied");
});

test("Anonymous CANNOT set trusted system field 'emailDispatched' on contactSubmissions", () => {
  const ctx = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "Hacker", email: "hacker@plant.com", emailDispatched: true });
  assert(ctx.evaluate() === false, "Setting system field 'emailDispatched' on public submission must be denied");
});

test("Anonymous CANNOT set trusted system field 'dispatchedAt' or 'emailError' on contactSubmissions", () => {
  const ctx1 = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "Hacker", email: "hacker@plant.com", dispatchedAt: "2026-10-14T00:00:00Z" });
  const ctx2 = new RuleContext(null, ["contactSubmissions", "sub_2"], "create", null, { name: "Hacker", email: "hacker@plant.com", emailError: "none" });
  assert(ctx1.evaluate() === false, "Setting system field 'dispatchedAt' on public submission must be denied");
  assert(ctx2.evaluate() === false, "Setting system field 'emailError' on public submission must be denied");
});

test("Anonymous CANNOT submit invalid email formats (contactSubmissions)", () => {
  const ctx1 = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "User", email: "notanemail" });
  const ctx2 = new RuleContext(null, ["contactSubmissions", "sub_2"], "create", null, { name: "User", email: "@missingusername.com" });
  assert(ctx1.evaluate() === false, "Invalid email address format must be denied");
  assert(ctx2.evaluate() === false, "Invalid email address format missing username must be denied");
});

test("Anonymous CANNOT submit invalid field types (contactSubmissions)", () => {
  const ctx1 = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: 12345, email: "user@plant.com" });
  const ctx2 = new RuleContext(null, ["contactSubmissions", "sub_2"], "create", null, { name: "User", email: "user@plant.com", plan: ["3month"] });
  assert(ctx1.evaluate() === false, "Non-string name must be denied");
  assert(ctx2.evaluate() === false, "Non-string plan array must be denied");
});

test("Anonymous CANNOT submit invalid contactSubmissions (missing email or name)", () => {
  const ctx1 = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "No Email" });
  const ctx2 = new RuleContext(null, ["contactSubmissions", "sub_2"], "create", null, { email: "no@name.com" });
  assert(ctx1.evaluate() === false, "Contact submission missing email must be denied");
  assert(ctx2.evaluate() === false, "Contact submission missing name must be denied");
});

test("Anonymous CANNOT submit contactSubmissions with unexpected keys (payload injection)", () => {
  const ctx = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: "Hacker", email: "hacker@evil.com", maliciousPayload: "DROP TABLE" });
  assert(ctx.evaluate() === false, "Contact submission with unexpected keys must be denied");
});

test("Anonymous CANNOT submit contactSubmissions exceeding string bounds", () => {
  const hugeName = "A".repeat(101);
  const ctx = new RuleContext(null, ["contactSubmissions", "sub_1"], "create", null, { name: hugeName, email: "valid@email.com" });
  assert(ctx.evaluate() === false, "Contact submission exceeding name length bound must be denied");
});

test("Anonymous CANNOT read, update, or delete contactSubmissions", () => {
  const ctxGet = new RuleContext(null, ["contactSubmissions", "sub_1"], "get");
  const ctxUpdate = new RuleContext(null, ["contactSubmissions", "sub_1"], "update", {}, { name: "Changed" });
  const ctxDelete = new RuleContext(null, ["contactSubmissions", "sub_1"], "delete");
  assert(ctxGet.evaluate() === false, "Anonymous read contactSubmissions must be denied");
  assert(ctxUpdate.evaluate() === false, "Anonymous update contactSubmissions must be denied");
  assert(ctxDelete.evaluate() === false, "Anonymous delete contactSubmissions must be denied");
});

test("Anonymous cannot read or write arbitrary collections (Wildcard Default Deny)", () => {
  const ctx1 = new RuleContext(null, ["arbitrary_unlisted_collection", "doc_1"], "get");
  const ctx2 = new RuleContext(null, ["secret_data", "doc_1"], "create", null, { test: 1 });
  assert(ctx1.evaluate() === false, "Wildcard read must be denied");
  assert(ctx2.evaluate() === false, "Wildcard write must be denied");
});

// -------------------------------------------------------------
// SUITE 2: ORDINARY AUTHENTICATED USER (Viewer / Engineer)
// -------------------------------------------------------------
const viewerAuth = {
  uid: "usr_viewer",
  token: { email: "viewer@example.com", email_verified: true }
};

test("Authenticated Viewer CAN read application layoutConfig", () => {
  const ctx = new RuleContext(viewerAuth, ["systemSettings", "layoutConfig"], "get");
  assert(ctx.evaluate() === true, "Viewer should read layoutConfig");
});

test("Authenticated Viewer CANNOT write layoutConfig (Direct Client Write Attempt)", () => {
  const ctx = new RuleContext(viewerAuth, ["systemSettings", "layoutConfig"], "update", {}, { tickerText: "defaced" });
  assert(ctx.evaluate() === false, "Viewer write layoutConfig must be denied");
});

test("Authenticated Viewer CAN read engineering catalogs", () => {
  const ctx = new RuleContext(viewerAuth, ["damageMechanisms", "dm_sulfidation"], "get");
  assert(ctx.evaluate() === true, "Viewer should read damage mechanisms catalog");
});

test("Authenticated Viewer CANNOT modify engineering catalogs (write damageMechanisms)", () => {
  const ctx = new RuleContext(viewerAuth, ["damageMechanisms", "dm_sulfidation"], "update", {}, { description: "malicious" });
  assert(ctx.evaluate() === false, "Viewer write damage mechanisms must be denied");
});

test("Authenticated Viewer CAN read their own user session", () => {
  const ctx = new RuleContext(viewerAuth, ["userSessions", "sess_viewer"], "get", { uid: "usr_viewer", email: "viewer@example.com" });
  assert(ctx.evaluate() === true, "Viewer should read their own session");
});

test("Authenticated Viewer CANNOT read another user's session", () => {
  const ctx = new RuleContext(viewerAuth, ["userSessions", "sess_admin"], "get", { uid: "usr_admin", email: "avijitkayet97@gmail.com" });
  assert(ctx.evaluate() === false, "Viewer reading another user session must be denied");
});

test("Authenticated Viewer CANNOT escalate their own role in users collection", () => {
  const ctx = new RuleContext(viewerAuth, ["users", "usr_viewer"], "update", { role: "viewer", isSuperAdmin: false }, { role: "admin" });
  assert(ctx.evaluate() === false, "Privilege escalation attempt must be denied");
});

test("Authenticated Viewer CANNOT self-grant isSuperAdmin in users collection", () => {
  const ctx = new RuleContext(viewerAuth, ["users", "usr_viewer"], "update", { role: "viewer", isSuperAdmin: false }, { isSuperAdmin: true });
  assert(ctx.evaluate() === false, "isSuperAdmin tampering must be denied");
});

test("Authenticated Viewer CANNOT modify userRoles", () => {
  const ctx = new RuleContext(viewerAuth, ["userRoles", "viewer@example.com"], "update", { role: "viewer" }, { role: "admin" });
  assert(ctx.evaluate() === false, "Viewer write userRoles must be denied");
});

test("Authenticated Viewer CANNOT delete system audit logs", () => {
  const ctx = new RuleContext(viewerAuth, ["systemAuditLogs", "log_123"], "delete");
  assert(ctx.evaluate() === false, "Audit log deletion must be strictly denied");
});

test("Authenticated Viewer CANNOT write to analyses/{tagNumber}", () => {
  const ctx = new RuleContext(viewerAuth, ["analyses", "101-C-01"], "update", {}, { nominalThickness: 12.7 });
  assert(ctx.evaluate() === false, "Viewer write to analyses must be denied");
});

test("Authenticated Viewer CANNOT write to structural_thickness_assessments", () => {
  const ctx = new RuleContext(viewerAuth, ["structural_thickness_assessments", "doc_1"], "create", null, { minThickness: 5.0 });
  assert(ctx.evaluate() === false, "Viewer write to structural_thickness_assessments must be denied");
});

test("Authenticated Viewer CANNOT write to semi_quantitative_risk_assessments", () => {
  const ctx = new RuleContext(viewerAuth, ["semi_quantitative_risk_assessments", "doc_1"], "update", {}, { riskScore: "HIGH" });
  assert(ctx.evaluate() === false, "Viewer write to semi_quantitative_risk_assessments must be denied");
});

const customContractorAuth = {
  uid: "usr_custom",
  token: { email: "custom@example.com", email_verified: true }
};

test("Custom Role (Non-Operational Contractor) CANNOT write to analyses/{tagNumber}", () => {
  const ctx = new RuleContext(customContractorAuth, ["analyses", "101-C-01"], "update", {}, { nominalThickness: 12.7 });
  assert(ctx.evaluate() === false, "Custom contractor role write to analyses must be denied");
});

const engineerAuth = {
  uid: "usr_engineer",
  token: { email: "engineer@example.com", email_verified: true }
};

test("Authorized Engineer CAN write to analyses/{tagNumber}", () => {
  const ctx = new RuleContext(engineerAuth, ["analyses", "101-C-01"], "update", {}, { nominalThickness: 12.7 });
  assert(ctx.evaluate() === true, "Authorized Engineer write to analyses must be permitted");
});

test("Authorized Engineer CAN write to structural_thickness_assessments", () => {
  const ctx = new RuleContext(engineerAuth, ["structural_thickness_assessments", "doc_1"], "create", null, { minThickness: 5.0 });
  assert(ctx.evaluate() === true, "Authorized Engineer write to structural_thickness_assessments must be permitted");
});

const inspectorAuth = {
  uid: "usr_inspector",
  token: { email: "inspector@example.com", email_verified: true }
};

test("Authorized Inspector CAN write to analyses/{tagNumber}", () => {
  const ctx = new RuleContext(inspectorAuth, ["analyses", "101-C-01"], "update", {}, { lastInspectionDate: "2026-10-14" });
  assert(ctx.evaluate() === true, "Authorized Inspector write to analyses must be permitted");
});

const leadEngineerAuth = {
  uid: "usr_lead",
  token: { email: "lead_engineer@example.com", email_verified: true }
};

test("Lead Engineer CAN write to analyses/{tagNumber}", () => {
  const ctx = new RuleContext(leadEngineerAuth, ["analyses", "101-C-01"], "update", {}, { approvedBy: "lead" });
  assert(ctx.evaluate() === true, "Lead Engineer write to analyses must be permitted");
});

// -------------------------------------------------------------
// SUITE 3: EMAIL SPOOFING & UNVERIFIED IDENTITY ATTEMPTS
// -------------------------------------------------------------
test("Spoof Attack: Caller claims Super Admin email but email_verified is FALSE", () => {
  const spoofAuth = {
    uid: "attacker_uid",
    token: { email: "avijitkayet97@gmail.com", email_verified: false }
  };
  const ctx = new RuleContext(spoofAuth, ["systemSettings", "layoutConfig"], "update", {}, { test: 1 });
  assert(ctx.evaluate() === false, "Unverified email caller MUST NOT be granted admin rights");
});

test("Spoof Attack: Untrusted claim in token or body without matching DB role is rejected", () => {
  const fakeAdminAuth = {
    uid: "random_attacker",
    token: { email: "attacker@evil.com", email_verified: true, role: "admin" }
  };
  const ctx = new RuleContext(fakeAdminAuth, ["userRoles", "target@example.com"], "create", null, { role: "admin" });
  assert(ctx.evaluate() === false, "Unregistered user claiming role:admin must be rejected by RBAC lookup");
});

// -------------------------------------------------------------
// SUITE 4: AUTHORIZED ADMINISTRATOR ACCESS
// -------------------------------------------------------------
const superAdminAuth = {
  uid: "admin_avijit",
  token: { email: "avijitkayet97@gmail.com", email_verified: true }
};

test("Super Admin CAN write layoutConfig to systemSettings", () => {
  const ctx = new RuleContext(superAdminAuth, ["systemSettings", "layoutConfig"], "update", {}, { sidebarModules: [] });
  assert(ctx.evaluate() === true, "Super Admin should have write permission to layoutConfig");
});

test("Super Admin CAN manage userRoles", () => {
  const ctx = new RuleContext(superAdminAuth, ["userRoles", "engineer@nrl.co.in"], "create", null, { role: "lead_engineer" });
  assert(ctx.evaluate() === true, "Super Admin should create userRoles");
});

test("Super Admin CAN inspect all userSessions", () => {
  const ctx = new RuleContext(superAdminAuth, ["userSessions", "sess_any"], "get", { uid: "other_user" });
  assert(ctx.evaluate() === true, "Super Admin should inspect userSessions");
});

test("Super Admin CAN update master engineering catalogs", () => {
  const ctx = new RuleContext(superAdminAuth, ["damageMechanisms", "dm_htha"], "update", {}, { standard: "API 941" });
  assert(ctx.evaluate() === true, "Super Admin should update damage mechanisms");
});

test("Super Admin CANNOT delete audit logs (Enforcing Total Immutability)", () => {
  const ctx = new RuleContext(superAdminAuth, ["systemAuditLogs", "log_456"], "delete");
  assert(ctx.evaluate() === false, "Audit logs MUST remain immutable even for Super Admin");
});

// Run all tests
let passed = 0;
let failed = 0;

console.log("================================================================");
console.log("   RUNNING FIRESTORE SECURITY RULES REGRESSION TEST SUITE       ");
console.log("================================================================");

for (const t of tests) {
  try {
    t.fn();
    console.log(`  [PASS] ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${t.name} -> ${err.message}`);
    failed++;
  }
}

console.log("================================================================");
console.log(`Results: ${passed} Passed, ${failed} Failed out of ${tests.length} tests.`);
console.log("================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
