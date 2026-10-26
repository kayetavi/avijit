import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminApp, getAdminFirestore, deleteSession, terminateAllUserSessions, verifyServerIdentity } from "./sessionStore.js";
import { AVAILABLE_MODULES, buildRolePermissions, userRolesCache, loadUsersFromFile, saveUsersToFile, markUserDeleted, markUserRestored, isUserDeleted, USERS_FILE, getRoleMatrix, saveRoleMatrixFile, DEFAULT_ROLE_MATRIX, SUPER_ADMIN_EMAIL, isSuperAdminEmail, syncRolesCollectionToFirestore, getRoleCrudPermissions } from "./rbac.js";
import { getDamageMechanisms, invalidateDamageMechanismsCache, getStressData, saveStressData, deleteYearStressData, recordsToStressTree } from "./database.js";
import {
  getFirestoreDb,
  getActiveProjectConfig,
  getAllAvailableProjects,
  setActiveProject,
  saveCustomProject,
  deleteCustomProject,
  testProjectConnection,
  getActiveWorkspaceConfig,
  setActiveWorkspace,
  STANDARD_WORKSPACES,
  getLiveWorkspaces,
  FIREBASE_CONFIG
} from "./firestoreClient.js";
import { doc, setDoc, deleteDoc, getDoc, collection, getDocs } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIT_LOGS_FILE = path.resolve(__dirname, "../data/secure/audit_logs.json");
const LAYOUT_CONFIG_FILE = path.resolve(__dirname, "../data/secure/layout_config.json");
const BACKUP_HISTORY_FILE = path.resolve(__dirname, "../data/secure/backup_history.json");
const STRESS_DATA_FILE = path.resolve(__dirname, "../data/secure/bk_stress.json");
const STREAM_DATASETS_FILE = path.resolve(__dirname, "../data/secure/stream_datasets.json");
const CUSTOM_DAMAGE_MECHS_FILE = path.resolve(__dirname, "../data/secure/custom_damage_mechanisms.json");

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function recordAuditLog(db, event) {
  const item = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    isoDate: new Date().toISOString(),
    user: event.user || "system",
    action: event.action || "ADMIN_ACTION",
    module: event.module || "General",
    recordAffected: event.recordAffected || "—",
    previousValue: event.previousValue !== undefined ? event.previousValue : null,
    newValue: event.newValue !== undefined ? event.newValue : null,
    details: event.details || "",
    status: event.status || "SUCCESS"
  };

  try {
    ensureDirExists(AUDIT_LOGS_FILE);
    let list = [];
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      try { list = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, "utf8")); } catch (e) {}
    }
    list.unshift(item);
    if (list.length > 500) list = list.slice(0, 500);
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to write local audit log:", e.message);
  }

  if (db) {
    try {
      await db.collection("systemAuditLogs").doc(item.id).set(item);
    } catch (e) {
      console.warn("Failed to write Firestore audit log:", e.message);
    }
  }

  return item;
}

function normalizeSidebarModuleId(rawId) {
  if (!rawId) return "";
  const id = String(rawId).trim();
  if (id === "cracking" || id === "crackingMechanism") return "crackingMechanism";
  if (
    id === "damage" ||
    id === "damageMechanisms" ||
    id === "damageMechanism" ||
    id === "damageCatalog" ||
    id === "api571" ||
    id === "api571DamageMechanisms" ||
    id === "damageExplorer"
  ) {
    return "damageExplorer";
  }
  if (id === "remainingLife" || id === "api570") return "api570";
  if (id === "designThickness" || id === "b313" || id === "thicknessCalc") return "thicknessCalc";
  if (id === "tools" || id === "adminControlCenter") return "adminControlCenter";
  if (id === "stream" || id === "streamData" || id === "streamComparator") return "streamComparator";
  return id;
}

function getDefaultLayoutConfig() {
  return {
    tickerText: "Welcome to API 571 Damage Mechanism Dashboard & Industrial Digital Tools",
    tickerUrgency: "normal",
    tickerEnabled: true,
    sidebarModules: [
      { id: "damageExplorer", label: "API 571 Damage Mechanisms", icon: "🛡️", visible: true, order: 1, group: "Damage & Integrity", roles: ["admin", "lead_engineer", "inspector", "viewer"], tabId: "damageExplorerTab", launcherFunc: "showDamageMechanismTab" },
      { id: "api581", label: "API 581 Risk-Based Inspection", icon: "📊", visible: true, order: 2, group: "RBI & Assessment", roles: ["admin", "lead_engineer"], tabId: "a571-criteriaTab", launcherFunc: "showCriteriaTab" },
      { id: "api570", label: "API 570 Piping Inspection", icon: "⏱️", visible: true, order: 3, group: "RBI & Assessment", roles: ["admin", "lead_engineer"], tabId: "remainingLifeTab", launcherFunc: "showRemainingLifeTab" },
      { id: "thicknessCalc", label: "Design Thickness (ASME)", icon: "📐", visible: true, order: 4, group: "Engineering Calculations", roles: ["admin", "lead_engineer", "inspector"], tabId: "ASMEB31_3Tab", launcherFunc: "showASMEB31_3Tab" },
      { id: "crackingMechanism", label: "Cracking Mechanism Analysis", icon: "⚡", visible: true, order: 5, group: "Damage & Integrity", roles: ["admin", "lead_engineer", "inspector", "viewer"], tabId: "crackingMechanismTab", launcherFunc: "showCrackingMechanismTab" },
      { id: "bkStress", label: "Allowable Stress DB", icon: "🧮", visible: true, order: 6, group: "Engineering Calculations", roles: ["admin", "lead_engineer", "inspector", "viewer"], tabId: "bkStressTab", launcherFunc: "showbkStressTab" },
      { id: "streamComparator", label: "Stream Data Comparator", icon: "🔄", visible: true, order: 7, group: "Process & Fluids", roles: ["admin", "lead_engineer", "inspector", "viewer"], tabId: "streamComparatorTab", launcherFunc: "showStreamComparatorTab" },
      { id: "chemicalSuite", label: "Chemical Suite", icon: "⚗️", visible: true, order: 8, group: "Process & Fluids", roles: ["admin", "lead_engineer", "inspector"], tabId: "chemicalSuiteTab", launcherFunc: "showChemicalSuiteTab" },
      { id: "unitConverter", label: "Unit Converters", icon: "📐", visible: true, order: 9, group: "Utilities", roles: ["admin", "lead_engineer", "inspector", "viewer"], tabId: "unitConverterTab", launcherFunc: "showUnitConverterTab" },
      { id: "processFlow", label: "Process Flow Diagrams (PFD)", icon: "🗺️", visible: true, order: 10, group: "Plant Operations", roles: ["admin", "lead_engineer"], tabId: "processFlowModal", launcherFunc: "showPROCESSFLOWDIAGRAMSTab" },
      { id: "rptu", label: "RPTU Dashboard", icon: "📈", visible: true, order: 11, group: "Monitoring", roles: ["admin", "lead_engineer"], tabId: "rptuDashboard", launcherFunc: "showRPTUDashboard" },
      { id: "ccdAI", label: "CCD AI Platform", icon: "🤖", visible: true, order: 12, group: "External Platforms", roles: ["admin", "lead_engineer"], tabId: "ccdAiTab", launcherFunc: "showCCDAITab" },
      { id: "adminControlCenter", label: "Tools", icon: "🛠️", visible: true, order: 13, group: "Governance & Tools", roles: ["admin"], tabId: "adminPanelTab", launcherFunc: "openTool" }
    ],
    welcomeCards: [
      { id: "card_damageExplorer", title: "API 571 Damage Mechanisms", subtitle: "Comprehensive catalog of 90+ damage mechanisms from API RP 571.", icon: "🔬", targetTab: "damageExplorer", enabled: true },
      { id: "card_corrosionRate", title: "API 581 Corrosion Rate Calculator", subtitle: "Calculate corrosion rates and assess remaining life.", icon: "📉", targetTab: "corrosionRate", enabled: true },
      { id: "card_api570", title: "API 570 Remaining Life", subtitle: "Short/Long term corrosion rates, remaining life, half-life inspection intervals & Excel bulk upload.", icon: "⏱️", targetTab: "api570", enabled: true },
      { id: "card_thicknessCalc", title: "Design Thickness (ASME)", subtitle: "ASME B31.3 Process Piping (Eq 3a/3b), Barlow's equation, Section VIII Div 1 vessels & schedule charts.", icon: "📏", targetTab: "thicknessCalc", enabled: true },
      { id: "card_cracking", title: "Cracking Mechanism Analysis", subtitle: "SCC Environmental Finder, Wet H₂S (HIC/SOHIC/SSC) risk screening & thermal fatigue rules.", icon: "⚡", targetTab: "crackingMechanism", enabled: true },
      { id: "card_bkStress", title: "Allowable Stress DB", subtitle: "ASME B31.3 Table A-1 Data & Allowable Stress Database", icon: "🧮", targetTab: "bkStress", enabled: true },
      { id: "card_streamComparator", title: "Stream Data Comparator", subtitle: "Heat & Material Balance Comparison (HMB) between Stream A & B.", icon: "🔄", targetTab: "streamComparator", enabled: true },
      { id: "card_chemicalSuite", title: "Chemical Suite", subtitle: "Corrosion & Chemistry Prediction, SDS & HAZMAT PPE Matrix.", icon: "⚗️", targetTab: "chemicalSuite", enabled: true },
      { id: "card_unitConverter", title: "Unit Converters", subtitle: "Plant & Integrity Unit Converters for corrosion, pressure, temp & flow.", icon: "📐", targetTab: "unitConverter", enabled: true },
      { id: "card_processFlow", title: "Process Flow Diagrams (PFD)", subtitle: "Corrosion loops & degradation maps for Atmospheric Distillation, CDU/VDU, MSP, and H2U units..", icon: "🗺️", targetTab: "processFlow", enabled: true },
      { id: "card_rptu", title: "RPTU Dashboard", subtitle: "Live process telemetry monitoring and Integrity Operating Window (IOW) exceedance alarms.", icon: "📈", targetTab: "rptu", enabled: true },
      { id: "card_ccdAI", title: "CCD AI Platform", subtitle: "AI-powered degradation rate modeling & neural network damage mechanism classifier.", icon: "🤖", targetTab: "ccdAI", enabled: true },
      { id: "card_api571Criteria", title: "API 571 Screening Matrix", subtitle: "Input process conditions to screen and evaluate 17 core damage mechanisms using smart rules.", icon: "🎯", targetTab: "api571Criteria", enabled: true },
      { id: "card_fluidSelector", title: "Representative Fluids (API 581)", subtitle: "Access API 581 Table 4.1 chemical library with thermodynamic properties & flammability limits.", icon: "💧", targetTab: "fluidSelector", enabled: true }
    ],
    updatedAt: Date.now(),
    updatedBy: "system"
  };
}

function sanitizeSidebarModules(modules) {
  if (!Array.isArray(modules)) return [];
  const defaults = getDefaultLayoutConfig().sidebarModules;
  const defaultMap = new Map(defaults.map(d => [d.id, d]));
  const seenIds = new Set();
  const result = [];
  modules.forEach(m => {
    if (!m || !m.id) return;
    const modId = normalizeSidebarModuleId(m.id);
    if (!modId || seenIds.has(modId)) return;
    seenIds.add(modId);
    const def = defaultMap.get(modId) || {};
    result.push({
      ...def,
      ...m,
      id: modId,
      label: String(m.label || m.name || def.label || modId).trim(),
      icon: String(m.icon || def.icon || "📌").trim(),
      visible: m.visible !== false,
      group: m.group || def.group || "Engineering Suite",
      roles: Array.isArray(m.roles) && m.roles.length > 0 ? m.roles : (def.roles || ["admin", "lead_engineer"]),
      tabId: m.tabId || def.tabId || "",
      launcherFunc: m.launcherFunc || def.launcherFunc || ""
    });
  });
  result.forEach((item, idx) => {
    item.order = idx + 1;
  });
  return result;
}

function normalizeAndMergeWelcomeCards(existingCards, defaultCards) {
  if (!existingCards || !Array.isArray(existingCards) || existingCards.length === 0) {
    return defaultCards;
  }
  const existingMap = new Map();
  existingCards.forEach(c => {
    if (!c) return;
    if (c.targetTab === "inventoryCalc" || c.id === "card_inv") return;
    if (c.targetTab) existingMap.set(c.targetTab, c);
    if (c.id) existingMap.set(c.id, c);
    // Aliases
    if (c.id === "card_dmg" || c.id === "card_damageExplorer" || c.targetTab === "damageExplorer") existingMap.set("damageExplorer", c);
    if (c.targetTab === "cracking") existingMap.set("crackingMechanism", c);
    if (c.id === "card_corr") existingMap.set("corrosionRate", c);
    if (c.id === "card_crit") existingMap.set("api571Criteria", c);
    if (c.id === "card_fluid") existingMap.set("fluidSelector", c);
    if (c.id === "card_stream") existingMap.set("streamComparator", c);
    if (c.id === "card_chem") existingMap.set("chemicalSuite", c);
    if (c.id === "card_unit") existingMap.set("unitConverter", c);
    if (c.id === "card_stress") existingMap.set("bkStress", c);
    if (c.id === "card_crack") existingMap.set("crackingMechanism", c);
    if (c.id === "card_thickness") existingMap.set("thicknessCalc", c);
    if (c.id === "card_pfd") existingMap.set("processFlow", c);
    if (c.id === "card_ai") existingMap.set("ccdAI", c);
  });

  const merged = [];
  defaultCards.forEach(defCard => {
    const found = existingMap.get(defCard.targetTab) || existingMap.get(defCard.id);
    if (found) {
      merged.push({
        id: defCard.id,
        targetTab: defCard.targetTab,
        icon: found.icon || defCard.icon,
        title: found.title !== undefined ? found.title : defCard.title,
        subtitle: found.subtitle !== undefined ? found.subtitle : defCard.subtitle,
        enabled: found.enabled !== false
      });
    } else {
      merged.push({ ...defCard });
    }
  });
  return merged;
}

function hasUserSubAccess(userRecord, modId, subId) {
  if (!userRecord) return false;
  if (userRecord.isSuperAdmin || userRecord.role === "admin") return true;

  // 1. Direct check in user subsections if subId is specified
  if (subId && userRecord.subsections && typeof userRecord.subsections === "object") {
    const modSubs = userRecord.subsections[modId];
    if (modSubs) {
      if (Array.isArray(modSubs) && (modSubs.includes(subId) || (subId === "appStream" && modSubs.includes("app-stream")) || (subId === "app-stream" && modSubs.includes("appStream")))) return true;
      if (typeof modSubs === "object") {
        if (modSubs[subId] === true) return true;
        if (subId === "appStream" && modSubs["app-stream"] === true) return true;
        if (subId === "app-stream" && modSubs.appStream === true) return true;
        if (subId === "appCracking" && modSubs["app-cracking"] === true) return true;
        if (subId === "app-cracking" && modSubs.appCracking === true) return true;
        if (subId === "appStress" && modSubs["app-stress"] === true) return true;
        if (subId === "app-stress" && modSubs.appStress === true) return true;
      }
    }
  }

  // 2. Check allowedModules
  const mods = userRecord.allowedModules;
  let hasMod = false;
  if (Array.isArray(mods)) {
    hasMod = mods.includes(modId);
  } else if (mods && typeof mods === "object") {
    if (mods[modId] === false && modId !== "adminControlCenter") return false;
    hasMod = mods[modId] === true;
  }

  // 3. If module not explicitly true in allowedModules, check if ANY subsection of this module is true
  if (!hasMod && userRecord.subsections && typeof userRecord.subsections === "object") {
    const modSubs = userRecord.subsections[modId];
    if (modSubs && typeof modSubs === "object") {
      for (const k in modSubs) {
        if (modSubs[k] === true) {
          hasMod = true;
          break;
        }
      }
    }
  }

  if (!hasMod) return false;

  // If no specific subsection is requested, having the module is enough
  if (!subId) return true;

  // Check subsections
  const allSubs = userRecord.subsections;
  if (!allSubs || typeof allSubs !== "object") return true;
  const modSubs = allSubs[modId];
  if (!modSubs) return true;

  if (Array.isArray(modSubs)) {
    return modSubs.includes(subId);
  } else if (typeof modSubs === "object") {
    return modSubs[subId] === true;
  }
  return false;
}

async function isAuthorizedForAction(callerEmail, action, db) {
  let email = (callerEmail || "").toLowerCase().trim();
  if (!email || email === "null" || email === "undefined") {
    return false; // Deny unauthenticated requests
  }
  if (isSuperAdminEmail(email)) {
    return true;
  }


  // 1. Fetch user record from cache, file, or Firestore
  let userRecord = null;
  if (userRolesCache && typeof userRolesCache.get === "function") {
    userRecord = userRolesCache.get(email);
  }
  if (!userRecord) {
    const fileUsers = loadUsersFromFile();
    userRecord = fileUsers.find((u) => u.email && u.email.toLowerCase().trim() === email);
  }
  if (!userRecord && db) {
    try {
      const snap = await Promise.race([
        db.collection("userRoles").doc(email).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout checking user role")), 2500))
      ]);
      if (snap && snap.exists) {
        userRecord = snap.data();
      }
    } catch (e) {
      console.warn("User auth check note:", e?.message);
    }
  }
  if (!userRecord) {
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        const snap = await Promise.race([
          adminDb.collection("userRoles").doc(email).get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout checking user role")), 2500))
        ]);
        if (snap && snap.exists) {
          userRecord = snap.data();
        }
      }
    } catch (e) {}
  }


  if (!userRecord) return false;
  if (userRecord.isSuperAdmin || userRecord.role === "admin") return true;

  // Granular action mapping to assigned module / subsection
  switch (action) {
    // 📦 Guarded Bundle & Template Delivery for Admin & Assigned Tools Users
    case "get_admin_bundle":
    case "get_admin_template":
      return hasUserSubAccess(userRecord, "adminControlCenter", null);

    // 🛡️ Damage Mechanisms Catalog & Manager
    case "get_damage_mechanisms":
    case "upload_damage_mechanism_image":
    case "save_damage_mechanism":
    case "delete_damage_mechanism":
    case "bulk_import_damage_mechanisms":
      return hasUserSubAccess(userRecord, "adminControlCenter", "appDamage") ||
             hasUserSubAccess(userRecord, "damageExplorer", null);

    // 📊 Stream Datasets & Sheet Manager
    case "get_stream_datasets":
    case "save_stream_dataset":
    case "delete_stream_dataset":
      return hasUserSubAccess(userRecord, "adminControlCenter", "appStream") ||
             hasUserSubAccess(userRecord, "streamComparator", null);

    // 🧮 Allowable Stress Manager & DataLoader
    case "get_stress_manager_data":
      return hasUserSubAccess(userRecord, "adminControlCenter", "appStress") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "stress_tab_year_mgr") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "stress_tab_bulk_loader") ||
             hasUserSubAccess(userRecord, "bkStress", null);
    case "save_stress_year":
      return hasUserSubAccess(userRecord, "adminControlCenter", "stress_action_add") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "appStress");
    case "delete_stress_year":
      return hasUserSubAccess(userRecord, "adminControlCenter", "stress_action_delete") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "appStress");
    case "bulk_import_stress_records":
      return hasUserSubAccess(userRecord, "adminControlCenter", "stress_tab_bulk_loader") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "appStress");

    // 🖥️ Layout & Navigation Builder
    case "get_layout_config":
      return true; // public read
    case "save_layout_config":
      return hasUserSubAccess(userRecord, "adminControlCenter", "layoutBuilder") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sidebarOrder") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "tickerText") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "welcomeCards") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "navVisibility");

    // 📱 System Overview
    case "get_overview":
      return hasUserSubAccess(userRecord, "adminControlCenter", null) ||
             hasUserSubAccess(userRecord, "adminControlCenter", "appOverview");

    // ⚙️ Systems & Diagnostics
    case "get_sessions":
    case "terminate_session":
    case "clear_stale_sessions":
      return hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "activeSessions");
    case "get_collection_docs":
    case "save_firestore_doc":
    case "delete_firestore_doc":
      return hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "firestoreExplorer");

    // 💾 Master Data, Backup & Logs
    case "export_backup":
      return hasUserSubAccess(userRecord, "adminControlCenter", "masterData") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "jsonBackup") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics");
    case "restore_backup":
      return hasUserSubAccess(userRecord, "adminControlCenter", "masterData") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "jsonRestore") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics");
    case "get_backup_history":
      return hasUserSubAccess(userRecord, "adminControlCenter", "masterData") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "backupHistory") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics");
    case "get_system_logs":
      return hasUserSubAccess(userRecord, "adminControlCenter", "masterData") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "systemLogs") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics");
    case "get_audit_logs":
    case "record_audit_log":
      return hasUserSubAccess(userRecord, "adminControlCenter", "masterData") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "auditTrail") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics");

    // 👥 User Management & Roles
    case "get_users":
    case "save_user":
    case "set_password":
    case "get_reset_link":
    case "delete_user":
      return hasUserSubAccess(userRecord, "adminControlCenter", "userManagement") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "rbacPermissions") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "accessControl");

    // 🔄 Project & Workspace Switcher
    case "get_projects":
    case "switch_project":
    case "test_project_connection":
    case "sync_data_to_project":
    case "save_custom_project":
    case "delete_custom_project":
    case "switch_workspace":
      return hasUserSubAccess(userRecord, "adminControlCenter", "sysDiagnostics") ||
             hasUserSubAccess(userRecord, "adminControlCenter", "projectSwitcher") ||
             userRecord.role === "admin" || userRecord.isSuperAdmin === true;

    default:
      return userRecord.role === "admin" || userRecord.isSuperAdmin === true;
  }
}

async function isAuthorizedAdmin(callerEmail, db) {
  return isAuthorizedForAction(callerEmail, "admin", db);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const method = req.method;
    const payload = method === "GET" ? req.query : (req.body || {});
    const action = (payload.action || req.query?.action || "").toLowerCase();
    const identity = await verifyServerIdentity(req);
    // CRITICAL SECURITY ENFORCEMENT:
    // Identity is derived EXCLUSIVELY from verified Firebase ID token or trusted server-side session.
    // Client-supplied callerEmail, email, or query parameters are NEVER trusted as proof of authentication.
    const callerEmail = (identity && identity.verified && identity.email)
      ? identity.email.toLowerCase().trim()
      : "";

    const adminApp = getAdminApp();
    const activeProject = getActiveProjectConfig();
    const db = (adminApp ? adminApp.firestore(activeProject.firestoreDatabaseId || "(default)") : null) || getAdminFirestore();

    // Verify authorization per action (granular role & section permissions)
    const isPublicRead = action === "get_layout_config";
    if (!isPublicRead) {
      if (!identity || !identity.verified || !callerEmail) {
        return res.status(401).json({
          error: "Authentication required. Please provide a valid Firebase ID token or active server session.",
          reason: identity?.reason || "unauthenticated"
        });
      }

      const authorized = await isAuthorizedForAction(callerEmail, action, db);
      if (!authorized) {
        return res.status(403).json({
          error: `Access Denied. You do not have permission to perform action '${action}'.`,
          callerEmail
        });
      }
    }

    // -------------------------------------------------------------
    // 🛡️ DYNAMIC GUARDED ASSET DELIVERY: Admin Bundle & Admin Template
    // -------------------------------------------------------------
    if (action === "get_admin_bundle") {
      try {
        const bundlePath = path.resolve(__dirname, "../js/admin-panel.js");
        if (!fs.existsSync(bundlePath)) {
          return res.status(404).json({ error: "Admin panel bundle file not found." });
        }
        const scriptCode = fs.readFileSync(bundlePath, "utf8");
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        return res.status(200).send(scriptCode);
      } catch (err) {
        console.error("Error serving admin bundle:", err);
        return res.status(500).json({ error: "Failed to load admin panel bundle." });
      }
    }

    if (action === "get_admin_template") {
      try {
        const templatePath = path.resolve(__dirname, "../templates/view-admin-1000.html");
        if (!fs.existsSync(templatePath)) {
          return res.status(404).json({ error: "Admin template file not found." });
        }
        const templateHtml = fs.readFileSync(templatePath, "utf8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(templateHtml);
      } catch (err) {
        console.error("Error serving admin template:", err);
        return res.status(500).json({ error: "Failed to load admin template." });
      }
    }

    // -------------------------------------------------------------
    // 1. SYSTEM OVERVIEW STATS
    // -------------------------------------------------------------
    if (action === "get_overview") {
      let totalUsers = 1;
      const roleBreakdown = { admin: 1, lead_engineer: 1, inspector: 0, viewer: 1, custom: 2 };
      let activeSessionsCount = 1;
      let totalSessionsCount = 1;
      const now = Date.now();
      const collections = ["userRoles", "userSessions"];

      if (db) {
        // Users stats with timeout
        try {
          const usersSnap = await Promise.race([
            db.collection("userRoles").get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
          ]);
          if (usersSnap && usersSnap.size > 0) {
            totalUsers = usersSnap.size;
            roleBreakdown.admin = 0;
            roleBreakdown.lead_engineer = 0;
            roleBreakdown.inspector = 0;
            roleBreakdown.viewer = 0;
            roleBreakdown.custom = 0;
            usersSnap.forEach((doc) => {
              const u = doc.data();
              const r = u.role || "lead_engineer";
              if (roleBreakdown[r] !== undefined) roleBreakdown[r]++;
              else roleBreakdown.custom++;
            });
          }
        } catch (e) {
          console.warn("get_overview users note:", e?.message);
        }

        // Sessions stats with timeout
        try {
          const sessionsSnap = await Promise.race([
            db.collection("userSessions").get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
          ]);
          if (sessionsSnap) {
            totalSessionsCount = sessionsSnap.size;
            activeSessionsCount = 0;
            sessionsSnap.forEach((doc) => {
              const s = doc.data();
              const lastActive = s.timestamp || 0;
              if (now - lastActive < 15 * 60 * 1000) {
                activeSessionsCount++;
              }
            });
          }
        } catch (e) {
          console.warn("get_overview sessions note:", e?.message);
        }
      }

      return res.status(200).json({
        success: true,
        stats: {
          totalUsers: Math.max(totalUsers, 1),
          roleBreakdown,
          activeSessionsCount: Math.max(activeSessionsCount, 0),
          totalSessionsCount: Math.max(totalSessionsCount, 0),
          availableModulesCount: AVAILABLE_MODULES.length,
          collections,
          firestoreConnected: !!db
        }
      });
    }

    // -------------------------------------------------------------
    // 2. USER MANAGEMENT (LIST / SAVE / DELETE / PASSWORD)
    // -------------------------------------------------------------
    if (action === "get_users") {
      const users = [];
      const authUsersMap = new Map();

      // Retrieve Firebase Authentication user records if Admin SDK available
      if (adminApp) {
        try {
          const authList = await Promise.race([
            adminApp.auth().listUsers(1000),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
          ]);
          if (authList && authList.users) {
            authList.users.forEach((u) => {
              if (u.email) {
                authUsersMap.set(u.email.toLowerCase().trim(), {
                  uid: u.uid,
                  emailVerified: u.emailVerified,
                  disabled: u.disabled,
                  creationTime: u.metadata?.creationTime,
                  lastSignInTime: u.metadata?.lastSignInTime
                });
              }
            });
          }
        } catch (authErr) {
          console.warn("Could not list Firebase Auth users:", authErr?.message);
        }
      }

      // 1. Read from Admin SDK first (trusted server credentials)
      if (db) {
        try {
          const snap = await Promise.race([
            db.collection("userRoles").get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          if (snap && snap.docs) {
            snap.docs.forEach((d) => {
              const data = d.data();
              const email = (data.email || d.id).toLowerCase().trim();
              const authInfo = authUsersMap.get(email);
              users.push({
                id: d.id,
                ...data,
                hasAuthAccount: !!authInfo || !!data.hasAuthAccount,
                authUid: authInfo?.uid || data.authUid || "",
                lastSignInTime: authInfo?.lastSignInTime || data.lastSignInTime || null
              });
              if (authInfo) authUsersMap.delete(email);
            });
          }
        } catch (dbErr) {
          console.warn("[Admin] Admin SDK get users note:", dbErr?.message);
        }
      }



      // Merge with local persistent file
      const fileUsers = loadUsersFromFile();
      fileUsers.forEach((fu) => {
        const email = (fu.email || fu.id || "").toLowerCase().trim();
        const existingIdx = users.findIndex((u) => u.email && u.email.toLowerCase().trim() === email);
        const authInfo = authUsersMap.get(email);
        if (existingIdx >= 0) {
          users[existingIdx] = {
            ...fu,
            ...users[existingIdx],
            hasAuthAccount: users[existingIdx].hasAuthAccount || !!authInfo,
            authUid: users[existingIdx].authUid || authInfo?.uid || ""
          };
        } else {
          users.push({
            ...fu,
            hasAuthAccount: !!authInfo || !!fu.hasAuthAccount,
            authUid: authInfo?.uid || fu.authUid || ""
          });
        }
        if (authInfo) authUsersMap.delete(email);
      });

      // Merge with in-memory userRolesCache
      userRolesCache.forEach((val, key) => {
        const email = key.toLowerCase().trim();
        if (!users.some((u) => u.email && u.email.toLowerCase().trim() === email)) {
          const authInfo = authUsersMap.get(email);
          users.push({
            ...val,
            hasAuthAccount: !!authInfo || !!val.hasAuthAccount,
            authUid: authInfo?.uid || val.authUid || ""
          });
          if (authInfo) authUsersMap.delete(email);
        }
      });

      const superPerms = buildRolePermissions("admin");

      // Normalize allowedModules for every user based on their Firestore role
      users.forEach((u) => {
        if (u.isSuperAdmin || u.role === "admin") {
          u.allowedModules = { ...superPerms.modules, ...(u.allowedModules || {}) };
          u.subsections = { ...superPerms.subsections, ...(u.subsections || {}) };
          u.role = "admin";
          u.isSuperAdmin = true;
        } else if (u.allowedModules) {
          const cleanMods = {};
          AVAILABLE_MODULES.forEach((m) => {
            if (typeof u.allowedModules[m.id] === "boolean") {
              cleanMods[m.id] = u.allowedModules[m.id];
            } else if (m.id === "damageExplorer" && (typeof u.allowedModules.damageMechanisms === "boolean" || typeof u.allowedModules.damage === "boolean" || typeof u.allowedModules.api571 === "boolean")) {
              cleanMods[m.id] = (u.allowedModules.damageMechanisms !== undefined ? u.allowedModules.damageMechanisms : (u.allowedModules.damage !== undefined ? u.allowedModules.damage : u.allowedModules.api571));
            } else if (m.id === "api570" && typeof u.allowedModules.remainingLife === "boolean") {
              cleanMods[m.id] = u.allowedModules.remainingLife;
            } else {
              const defaultPerms = buildRolePermissions(u.role || "lead_engineer");
              cleanMods[m.id] = defaultPerms.modules[m.id] ?? false;
            }
          });
          u.allowedModules = cleanMods;
        } else {
          u.allowedModules = { ...buildRolePermissions(u.role || "lead_engineer").modules };
        }
      });

      // Synchronize persistent cache
      saveUsersToFile(users);
      users.forEach((u) => {
        if (u.email) userRolesCache.set(u.email.toLowerCase().trim(), u);
      });

      return res.status(200).json({
        success: true,
        users,
        availableModules: AVAILABLE_MODULES
      });
    }

    const AUTH_KEYS = [
      "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk", // loginapp-feb72
      FIREBASE_CONFIG.apiKey
    ];

    async function sendFirebaseAuthResetEmail(email) {
      for (const apiKey of AUTH_KEYS) {
        if (!apiKey) continue;
        try {
          const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestType: "PASSWORD_RESET", email })
          });
          const d = await r.json();
          if (r.ok) return { success: true, email: d.email || email };
        } catch (e) {}
      }
      return { success: false };
    }

    async function createFirebaseAuthUserRest(email, password) {
      for (const apiKey of AUTH_KEYS) {
        if (!apiKey) continue;
        try {
          const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true })
          });
          const d = await r.json();
          if (r.ok && d.localId) {
            return { success: true, uid: d.localId, email: d.email };
          }
        } catch (e) {}
      }
      return { success: false };
    }

    async function deleteFirebaseAuthUserRest(email, password) {
      for (const apiKey of AUTH_KEYS) {
        if (!apiKey) continue;
        try {
          let idToken = null;
          if (password) {
            const signRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password, returnSecureToken: true })
            });
            const signData = await signRes.json();
            if (signData.idToken) {
              idToken = signData.idToken;
            }
          }
          if (idToken) {
            const delRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken })
            });
            if (delRes.ok) return true;
          }
        } catch (e) {}
      }
      return false;
    }

    if (action === "save_user") {
      const targetEmail = (payload.targetEmail || "").toLowerCase().trim();
      const role = payload.role || "lead_engineer";
      const customModules = payload.allowedModules || {};
      const customSubsections = payload.subsections || {};
      let password = payload.password ? String(payload.password).trim() : "";

      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(400).json({ error: "Valid user email address is required" });
      }

      // Un-delete / restore if this user was previously blacklisted/deleted
      await markUserRestored(targetEmail);

      // Robustly build permissions honoring any role with explicitly allowed modules
      const perms = buildRolePermissions(role, customModules, customSubsections);

      let authCreated = false;
      let authUpdated = false;
      let authUid = "";

      // Check if user already exists to preserve existing password if none provided
      let existingPassword = "";
      if (db) {
        try {
          const docSnap = await db.collection("userRoles").doc(targetEmail).get();
          if (docSnap.exists && docSnap.data()?.password) {
            existingPassword = docSnap.data().password;
          }
        } catch (e) {}
      }

      if (!existingPassword) {
        const cached = userRolesCache.get(targetEmail);
        if (cached && cached.password) existingPassword = cached.password;
      }

      if (!existingPassword) {
        const fileUsers = loadUsersFromFile();
        const fUser = fileUsers.find(u => u.email && u.email.toLowerCase().trim() === targetEmail);
        if (fUser && fUser.password) existingPassword = fUser.password;
      }

      if (!password || password.length < 6) {
        if (existingPassword) {
          password = existingPassword;
        } else {
          const randNum = Math.floor(1000 + Math.random() * 9000);
          password = `Kayet@${randNum}`;
        }
      }

      const isNewUser = !existingPassword;
      if (isNewUser || (payload.password && String(payload.password).trim().length >= 6)) {
        // Attempt Firebase Authentication REST Account Creation / Update
        const restAuth = await createFirebaseAuthUserRest(targetEmail, password);
        if (restAuth.success) {
          authCreated = true;
          authUid = restAuth.uid;
        }

        if (adminApp) {
          try {
            let existingAuthUser = null;
            try { existingAuthUser = await adminApp.auth().getUserByEmail(targetEmail); } catch (e) {}
            if (!existingAuthUser) {
              const newAuthUser = await adminApp.auth().createUser({
                email: targetEmail,
                password: password,
                displayName: targetEmail.split("@")[0],
                emailVerified: true
              });
              authCreated = true;
              authUid = newAuthUser.uid;
            } else {
              authUid = existingAuthUser.uid;
              if (payload.password && String(payload.password).trim().length >= 6) {
                await adminApp.auth().updateUser(existingAuthUser.uid, { password });
                authUpdated = true;
              }
            }
          } catch (authOpErr) {}
        }
      } else {
        if (adminApp) {
          try {
            const existingAuthUser = await adminApp.auth().getUserByEmail(targetEmail);
            if (existingAuthUser) authUid = existingAuthUser.uid;
          } catch (e) {}
        }
      }

      const isSuper = targetEmail === SUPER_ADMIN_EMAIL || role === "admin";
      const crudPerms = getRoleCrudPermissions(isSuper ? "admin" : role, payload.permissions);
      const userRecord = {
        id: targetEmail,
        email: targetEmail,
        role: role,
        permissions: crudPerms,
        allowedModules: perms.modules,
        subsections: perms.subsections,
        isSuperAdmin: isSuper,
        authUid,
        password: password,
        hasAuthAccount: true,
        updatedBy: callerEmail,
        updatedAt: Date.now()
      };

      // 1. Save to in-memory cache
      userRolesCache.set(targetEmail, userRecord);

      // 2. Save to local persistent JSON file
      const currentFileUsers = loadUsersFromFile();
      const existingUserIdx = currentFileUsers.findIndex((u) => u.email && u.email.toLowerCase().trim() === targetEmail);
      if (existingUserIdx >= 0) {
        currentFileUsers[existingUserIdx] = { ...currentFileUsers[existingUserIdx], ...userRecord };
      } else {
        currentFileUsers.push(userRecord);
      }
      saveUsersToFile(currentFileUsers);

      // 3. Save to Firestore userRoles and users collections via Admin SDK
      let firestoreSaved = false;
      if (db) {
        try {
          await db.collection("userRoles").doc(targetEmail).set(userRecord, { merge: true });
          await db.collection("users").doc(targetEmail).set({
            uid: authUid || targetEmail,
            email: targetEmail,
            role: role,
            permissions: crudPerms,
            isSuperAdmin: isSuper,
            updatedAt: Date.now()
          }, { merge: true });
          firestoreSaved = true;
        } catch (adminErr) {
          console.warn("[Admin] Admin SDK save_user error:", adminErr?.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: `User ${targetEmail} saved in Firestore and Auth with role ${role.toUpperCase()}. User can log in with password: ${password}`,
        user: userRecord,
        authCreated,
        authUpdated,
        password: password,
        resetLink: `https://loginapp-feb72.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(targetEmail)}`
      });
    }

    // 🔑 Direct Password Set / Reset by Admin
    if (action === "set_password") {
      const targetEmail = (payload.targetEmail || "").toLowerCase().trim();
      let newPassword = payload.password ? String(payload.password).trim() : "";

      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(400).json({ error: "Valid user email address is required" });
      }

      // If no password provided, auto-generate one
      if (!newPassword || newPassword.length < 6) {
        const randNum = Math.floor(1000 + Math.random() * 9000);
        newPassword = `Kayet@${randNum}`;
      }

      // 1. Update in-memory cache
      const existingUser = userRolesCache.get(targetEmail) || { email: targetEmail, role: "lead_engineer" };
      existingUser.password = newPassword;
      delete existingUser.assignedPassword;
      delete existingUser.temporaryPassword;
      existingUser.updatedAt = Date.now();
      userRolesCache.set(targetEmail, existingUser);

      // 2. Update local file
      try {
        const currentUsers = loadUsersFromFile();
        const uIdx = currentUsers.findIndex((u) => u.email && u.email.toLowerCase().trim() === targetEmail);
        if (uIdx >= 0) {
          currentUsers[uIdx].password = newPassword;
          delete currentUsers[uIdx].assignedPassword;
          delete currentUsers[uIdx].temporaryPassword;
          currentUsers[uIdx].updatedAt = Date.now();
        } else {
          currentUsers.push(existingUser);
        }
        saveUsersToFile(currentUsers);
      } catch (fErr) {}

      // 3. Update Firestore userRoles
      try {
        const adminDb = getAdminFirestore();
        if (adminDb) {
          await adminDb.collection("userRoles").doc(targetEmail).set({
            password: newPassword,
            updatedAt: Date.now()
          }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Firestore set_password note:", fsErr?.message);
      }

      // 4. Update Firebase Authentication REST / Admin SDK
      await createFirebaseAuthUserRest(targetEmail, newPassword);
      if (adminApp) {
        try {
          const authUser = await adminApp.auth().getUserByEmail(targetEmail);
          if (authUser) {
            await adminApp.auth().updateUser(authUser.uid, { password: newPassword });
          } else {
            await adminApp.auth().createUser({
              email: targetEmail,
              password: newPassword,
              emailVerified: true
            });
          }
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        message: `Password for ${targetEmail} has been successfully updated. User can now login immediately with this password.`,
        email: targetEmail,
        password: newPassword,
        resetLink: `https://loginapp-feb72.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(targetEmail)}`
      });
    }

    // 🔗 Generate Firebase Password Reset Link & Send Email
    if (action === "get_reset_link") {
      const targetEmail = (payload.targetEmail || "").toLowerCase().trim();
      if (!targetEmail || !targetEmail.includes("@")) {
        return res.status(400).json({ error: "Valid user email address is required" });
      }

      // 1. Generate official Firebase Admin password reset link if Admin SDK is available
      let adminLink = "";
      if (adminApp) {
        try {
          adminLink = await adminApp.auth().generatePasswordResetLink(targetEmail);
        } catch (e) {
          console.warn("generatePasswordResetLink note:", e?.message);
        }
      }

      // 2. Trigger Firebase Auth password reset email
      const emailSent = await sendFirebaseAuthResetEmail(targetEmail);

      const standardLink = adminLink || `https://loginapp-feb72.firebaseapp.com/__/auth/action?mode=resetPassword&email=${encodeURIComponent(targetEmail)}`;

      return res.status(200).json({
        success: true,
        email: targetEmail,
        message: `Password reset link generated and dispatched to ${targetEmail}. User can click the link in their email to set their new password.`,
        resetLink: standardLink,
        emailDispatched: emailSent.success
      });
    }

    if (action === "delete_user") {
      const targetEmail = (payload.targetEmail || "").toLowerCase().trim();
      if (!targetEmail) {
        return res.status(400).json({ error: "Target email is required" });
      }
      if (targetEmail === callerEmail) {
        return res.status(400).json({ error: "You cannot delete your own active session account." });
      }

      // 0. Extract saved user credentials before deleting records to remove from Firebase Auth
      const savedUser = userRolesCache?.get(targetEmail) || (loadUsersFromFile() || []).find((u) => u.email && u.email.toLowerCase().trim() === targetEmail);
      const userPassword = savedUser?.password || payload.password || "";
      await deleteFirebaseAuthUserRest(targetEmail, userPassword);

      // 1. Mark user as deleted in blacklist (prevents auto-creation and login)
      await markUserDeleted(targetEmail, callerEmail);

      // 2. Delete from Firestore userRoles, users, userSessions, deletedUsers (Admin SDK first)
      let firestoreDeleted = false;
      if (db) {
        try {
          await db.collection("userRoles").doc(targetEmail).delete().catch(() => {});
          await db.collection("users").doc(targetEmail).delete().catch(() => {});
          await db.collection("userSessions").doc(targetEmail).delete().catch(() => {});
          await db.collection("deletedUsers").doc(targetEmail).set({
            email: targetEmail,
            deletedAt: Date.now(),
            deletedBy: callerEmail || SUPER_ADMIN_EMAIL
          }, { merge: true }).catch(() => {});
          firestoreDeleted = true;
        } catch (dbErr) {
          console.warn("[Admin] Admin SDK delete user note:", dbErr?.message);
        }
      }



      if (userRolesCache) {
        userRolesCache.delete(targetEmail);
      }

      // 3. Delete from local file
      try {
        const currentUsers = loadUsersFromFile();
        const filtered = currentUsers.filter((u) => u.email && u.email.toLowerCase().trim() !== targetEmail);
        saveUsersToFile(filtered);
      } catch (fErr) {
        console.warn("Local file delete user note:", fErr?.message);
      }

      // 4. Terminate any active sessions immediately
      try {
        await terminateAllUserSessions(targetEmail);
      } catch (sessErr) {
        console.warn("Session termination note:", sessErr?.message);
      }

      // 5. Delete from Firebase Admin SDK if exists
      if (adminApp) {
        try {
          const authUser = await adminApp.auth().getUserByEmail(targetEmail);
          if (authUser) {
            await adminApp.auth().deleteUser(authUser.uid);
          }
        } catch (e) {
          console.warn("Firebase Auth deletion notice:", e?.message);
        }
      }

      try {
        await recordAuditLog(db, {
          user: callerEmail || SUPER_ADMIN_EMAIL,
          action: "DELETE_USER",
          module: "User Governance",
          recordAffected: targetEmail,
          details: `User account deleted from Firestore, blacklisted from login, and active sessions terminated by ${callerEmail || SUPER_ADMIN_EMAIL}`
        });
      } catch (logErr) {}

      return res.status(200).json({
        success: true,
        message: `User ${targetEmail} access revoked, permanently deleted from Firestore & Firebase Authentication, and active sessions terminated.`
      });
    }

    // -------------------------------------------------------------
    // 2.5 ROLES & PERMISSIONS MATRIX MANAGEMENT
    // -------------------------------------------------------------
    if (action === "get_role_matrix") {
      const matrix = getRoleMatrix();
      const rolesCollection = await syncRolesCollectionToFirestore(db);
      return res.status(200).json({
        success: true,
        matrix,
        rolesCollection,
        availableModules: AVAILABLE_MODULES,
        defaultMatrix: DEFAULT_ROLE_MATRIX
      });
    }

    if (action === "save_role_matrix") {
      const incomingMatrix = payload.matrix;
      if (!incomingMatrix || typeof incomingMatrix !== "object") {
        return res.status(400).json({ error: "Invalid role matrix data payload" });
      }

      // Always maintain admin full root access
      incomingMatrix.admin = { ...DEFAULT_ROLE_MATRIX.admin };

      saveRoleMatrixFile(incomingMatrix);
      await syncRolesCollectionToFirestore(db);

      // Synchronize all existing users having non-admin, non-custom roles
      const fileUsers = loadUsersFromFile();
      let updatedUsersCount = 0;

      for (let i = 0; i < fileUsers.length; i++) {
        const u = fileUsers[i];
        if (!u.email || u.email === SUPER_ADMIN_EMAIL || u.isSuperAdmin || u.role === "admin" || u.role === "custom") {
          continue;
        }
        const userRole = u.role || "viewer";
        if (incomingMatrix[userRole] || (userRole === "engineer" && incomingMatrix.lead_engineer)) {
          const effectiveRole = (userRole === "engineer") ? "lead_engineer" : userRole;
          const newPerms = buildRolePermissions(effectiveRole);
          fileUsers[i].permissions = newPerms.permissions;
          fileUsers[i].allowedModules = newPerms.modules;
          fileUsers[i].subsections = newPerms.subsections;
          fileUsers[i].updatedAt = Date.now();
          userRolesCache.set(u.email.toLowerCase().trim(), fileUsers[i]);
          updatedUsersCount++;

          if (db) {
            try {
              await db.collection("userRoles").doc(u.email.toLowerCase().trim()).set({
                permissions: newPerms.permissions,
                allowedModules: newPerms.modules,
                subsections: newPerms.subsections,
                updatedAt: Date.now()
              }, { merge: true });
              await db.collection("users").doc(u.email.toLowerCase().trim()).set({
                permissions: newPerms.permissions,
                updatedAt: Date.now()
              }, { merge: true });
            } catch (e) {
              console.warn("[Admin] Admin SDK sync role update note:", e?.message);
            }
          }
        }
      }

      saveUsersToFile(fileUsers);

      await recordAuditLog(db, {
        user: callerEmail || SUPER_ADMIN_EMAIL,
        action: "ROLE_MATRIX_SAVED",
        module: "Roles & Permissions Matrix",
        recordAffected: "Standard Engineering Roles (Admin, Lead Engineer, Inspector, Viewer)",
        details: `Saved updated role matrix to Firestore roles collection and synchronized permissions for ${updatedUsersCount} user(s).`
      });

      return res.status(200).json({
        success: true,
        message: `Roles & permissions matrix successfully saved! Synchronized ${updatedUsersCount} user account(s).`,
        matrix: incomingMatrix,
        updatedUsersCount
      });
    }

    if (action === "reset_role_matrix") {
      saveRoleMatrixFile(DEFAULT_ROLE_MATRIX);
      await syncRolesCollectionToFirestore(db);
      return res.status(200).json({
        success: true,
        message: "Roles & permissions matrix reset to standard engineering defaults.",
        matrix: DEFAULT_ROLE_MATRIX
      });
    }

    // -------------------------------------------------------------
    // 3. LIVE ACTIVE SESSIONS MANAGEMENT
    // -------------------------------------------------------------
    if (action === "get_sessions") {
      const sessions = [];
      const now = Date.now();

      if (db) {
        try {
          const snap = await Promise.race([
            db.collection("userSessions").get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2500))
          ]);
          if (snap) {
            snap.forEach((doc) => {
              const data = doc.data();
              const lastActive = data.timestamp || 0;
              const diffMs = now - lastActive;
              const diffMinutes = Math.floor(diffMs / 60000);

              let status = "Active";
              if (diffMs > 60 * 60 * 1000) status = "Expired";
              else if (diffMs > 10 * 60 * 1000) status = "Idle";

              sessions.push({
                id: doc.id,
                sessionId: data.sessionId || doc.id,
                uid: data.uid || "",
                email: data.email || "Unknown User",
                deviceId: data.deviceId || "Web Browser",
                timestamp: lastActive,
                diffMinutes,
                status
              });
            });
          }
        } catch (e) {
          console.warn("get_sessions firestore note:", e?.message);
        }
      }

      // If no active sessions recorded, provide local authenticated session
      if (sessions.length === 0) {
        sessions.push({
          id: "sess_local_" + Date.now().toString(36),
          sessionId: "sess_active_admin",
          uid: "super_admin",
          email: callerEmail || SUPER_ADMIN_EMAIL,
          deviceId: "Web Console (Current Session)",
          timestamp: now,
          diffMinutes: 0,
          status: "Active"
        });
      }

      // Sort by recent activity
      sessions.sort((a, b) => b.timestamp - a.timestamp);

      return res.status(200).json({
        success: true,
        sessions
      });
    }

    if (action === "terminate_session") {
      const docId = payload.docId;
      const sessionId = payload.sessionId;

      if (!docId && !sessionId) {
        return res.status(400).json({ error: "docId or sessionId is required" });
      }

      await deleteSession(sessionId, docId);

      return res.status(200).json({
        success: true,
        message: "Session terminated successfully. User will be logged out on next action."
      });
    }

    if (action === "clear_stale_sessions") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      let removedCount = 0;

      if (db) {
        const snap = await db.collection("userSessions").get();
        const batch = db.batch();
        snap.forEach((doc) => {
          const data = doc.data();
          if ((data.timestamp || 0) < cutoff) {
            batch.delete(doc.ref);
            removedCount++;
          }
        });
        if (removedCount > 0) {
          await batch.commit();
        }
      }

      return res.status(200).json({
        success: true,
        message: `Cleared ${removedCount} stale sessions older than 24 hours.`
      });
    }

    // -------------------------------------------------------------
    // 4. FIRESTORE DATABASE & COLLECTIONS EXPLORER
    // -------------------------------------------------------------
    if (action === "get_collection_docs") {
      let collectionName = payload.collectionName || req.query?.collectionName || "userRoles";
      const docs = [];

      // 1. Query via Admin SDK first (trusted server credentials)
      if (db) {
        try {
          let targetCol = collectionName;
          let snap = await db.collection(targetCol).get();

          if (snap.empty && targetCol === "customDamageMechanisms") {
            const altSnap = await db.collection("damageMechanisms").get();
            if (!altSnap.empty) snap = altSnap;
          } else if (snap.empty && targetCol === "damageMechanisms") {
            const altSnap = await db.collection("customDamageMechanisms").get();
            if (!altSnap.empty) snap = altSnap;
          }

          snap.forEach((docSnap) => {
            docs.push({
              id: docSnap.id,
              data: docSnap.data()
            });
          });
        } catch (err) {
          console.warn(`[Admin] Admin SDK get_collection_docs note:`, err.message);
        }
      }

      // 2. Fallback to clientDb if Admin SDK is unavailable or returned empty
      if (docs.length === 0) {
        const clientDb = getFirestoreDb();
        if (clientDb) {
          try {
            let targetCol = collectionName;
            let snap = await getDocs(collection(clientDb, targetCol));

            if (snap.empty && targetCol === "customDamageMechanisms") {
              const altSnap = await getDocs(collection(clientDb, "damageMechanisms"));
              if (!altSnap.empty) snap = altSnap;
            } else if (snap.empty && targetCol === "damageMechanisms") {
              const altSnap = await getDocs(collection(clientDb, "customDamageMechanisms"));
              if (!altSnap.empty) snap = altSnap;
            }

            snap.forEach((docSnap) => {
              docs.push({
                id: docSnap.id,
                data: docSnap.data()
              });
            });
          } catch (err) {
            console.warn(`[get_collection_docs] Error querying collection '${collectionName}':`, err.message);
          }
        }
      }


      return res.status(200).json({
        success: true,
        collectionName,
        total: docs.length,
        documents: docs
      });
    }

    if (action === "save_firestore_doc") {
      const collectionName = payload.collectionName;
      const docId = payload.docId;
      const data = payload.data;

      if (!collectionName || !docId || !data) {
        return res.status(400).json({ error: "collectionName, docId, and data are required" });
      }

      let firestorePersisted = false;
      let firestoreError = null;

      if (db) {
        try {
          await db.collection(collectionName).doc(docId).set(data, { merge: true });
          firestorePersisted = true;
        } catch (e) {
          firestoreError = e?.message || String(e);
        }
      }



      return res.status(200).json({
        success: true,
        message: firestorePersisted
          ? `Document '${docId}' in collection '${collectionName}' saved successfully.`
          : `Document '${docId}' saved with warning: Firestore write failed (${firestoreError}).`,
        firestorePersisted,
        firestoreError
      });
    }

    if (action === "delete_firestore_doc") {
      const collectionName = payload.collectionName;
      const docId = payload.docId;

      if (!collectionName || !docId) {
        return res.status(400).json({ error: "collectionName and docId are required" });
      }

      if (collectionName === "userRoles" && docId === SUPER_ADMIN_EMAIL) {
        return res.status(400).json({ error: "Cannot delete super admin user record." });
      }

      if (!firestoreDeleted && db) {
        try {
          await db.collection(collectionName).doc(docId).delete();
          firestoreDeleted = true;
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        message: `Document '${docId}' deleted from collection '${collectionName}'.`
      });
    }

    // -------------------------------------------------------------
    // 5. DATABASE BACKUP / EXPORT (Full & Selective Master Data)
    // -------------------------------------------------------------
    if (action === "export_backup") {
      const selectedScope = Array.isArray(payload.scope) ? payload.scope : ["all"];
      const backup = {
        version: "2026.1",
        exportedAt: new Date().toISOString(),
        exportedBy: callerEmail,
        scope: selectedScope,
        collections: {}
      };

      const shouldExport = (col) => selectedScope.includes("all") || selectedScope.includes(col);

      // A. User Roles & Sessions
      if (shouldExport("userRoles") || shouldExport("userSessions")) {
        if (db) {
          const cols = [];
          if (shouldExport("userRoles")) cols.push("userRoles");
          if (shouldExport("userSessions")) cols.push("userSessions");
          for (const colName of cols) {
            try {
              const snap = await db.collection(colName).get();
              const items = {};
              snap.forEach((doc) => { items[doc.id] = doc.data(); });
              backup.collections[colName] = items;
            } catch (e) {}
          }
        }
      }

      // B. Damage Mechanisms
      if (shouldExport("damageMechanisms")) {
        try {
          const dmData = await getDamageMechanisms();
          backup.collections.damageMechanisms = (dmData && dmData["Damage Mechanism"]) ? dmData["Damage Mechanism"] : {};
        } catch (e) {}
      }

      // C. Process Stream Datasets
      if (shouldExport("streamDatasets")) {
        try {
          if (fs.existsSync(STREAM_DATASETS_FILE)) {
            backup.collections.streamDatasets = JSON.parse(fs.readFileSync(STREAM_DATASETS_FILE, "utf8"));
          } else {
            backup.collections.streamDatasets = [];
          }
        } catch (e) {}
      }

      // D. Allowable Stress Database
      if (shouldExport("stressData")) {
        try {
          backup.collections.stressData = await getStressData();
        } catch (e) {
          backup.collections.stressData = {};
        }
      }

      // E. Layout & Navigation Configuration
      if (shouldExport("layoutConfig")) {
        try {
          if (fs.existsSync(LAYOUT_CONFIG_FILE)) {
            backup.collections.layoutConfig = JSON.parse(fs.readFileSync(LAYOUT_CONFIG_FILE, "utf8"));
          } else {
            backup.collections.layoutConfig = getDefaultLayoutConfig();
          }
        } catch (e) {}
      }

      // Record in backup history
      try {
        ensureDirExists(BACKUP_HISTORY_FILE);
        let history = [];
        if (fs.existsSync(BACKUP_HISTORY_FILE)) {
          try { history = JSON.parse(fs.readFileSync(BACKUP_HISTORY_FILE, "utf8")); } catch (e) {}
        }
        const histItem = {
          id: "bk_" + Date.now(),
          type: "BACKUP_EXPORT",
          timestamp: Date.now(),
          isoDate: new Date().toISOString(),
          user: callerEmail,
          scope: selectedScope,
          fileName: `dms_backup_${new Date().toISOString().slice(0, 10)}.json`,
          collectionsCount: Object.keys(backup.collections).length
        };
        history.unshift(histItem);
        if (history.length > 50) history = history.slice(0, 50);
        fs.writeFileSync(BACKUP_HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
      } catch (e) {}

      // Log audit event
      await recordAuditLog(db, {
        user: callerEmail,
        action: "BACKUP_EXPORTED",
        module: "Master Data & Backup",
        recordAffected: "Full/Selective Snapshot",
        details: `Exported collections: ${Object.keys(backup.collections).join(", ")}`
      });

      return res.status(200).json({
        success: true,
        backup
      });
    }

    // -------------------------------------------------------------
    // 6. DAMAGE MECHANISM MANAGEMENT (CRUD, IMAGE UPLOAD, BULK)
    // -------------------------------------------------------------
    if (action === "get_damage_mechanisms") {
      const isForceRefresh = req.query?.refresh === "1" || req.query?.refresh === "true" || payload?.refresh === true || req.query?.live === "1";
      const data = await getDamageMechanisms({ refresh: isForceRefresh });
      const mechs = (data && data["Damage Mechanism"]) ? data["Damage Mechanism"] : {};
      return res.status(200).json({
        success: true,
        total: Object.keys(mechs).length,
        mechanisms: mechs
      });
    }

    if (action === "seed_damage_mechanisms") {
      const activeProj = getActiveProjectConfig();
      let count = 0;
      try {
        const { fullCatalog } = await import("../scripts/seed_api571_mechanisms.js");
        if (db) {
          for (const [name, data] of Object.entries(fullCatalog)) {
            const docId = data.code || name.replace(/[^a-zA-Z0-9]/g, "_");
            const record = {
              ...data,
              id: docId,
              projectId: activeProj.projectId,
              updatedAt: Date.now()
            };
            await db.collection("damageMechanisms").doc(docId).set(record, { merge: true });
            count++;
          }
        }
        invalidateDamageMechanismsCache();
        return res.status(200).json({
          success: true,
          message: `Successfully seeded ${count} API 571 damage mechanisms into Firestore for project ${activeProj.projectId}!`,
          count
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // 🖼️ Upload / Replace Image for Damage Mechanism
    if (action === "upload_damage_mechanism_image") {
      const fileData = payload.fileData || "";
      const rawFileName = payload.fileName || "mechanism_diagram.png";
      const mechName = (payload.name || payload.code || "dm").replace(/[^a-zA-Z0-9_-]/g, "_");

      if (!fileData) {
        return res.status(400).json({ error: "Missing image file data" });
      }

      try {
        // Detect extension from data URL or filename
        let ext = "png";
        let base64Content = fileData;
        if (fileData.startsWith("data:")) {
          const match = fileData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            ext = match[1] === "jpeg" ? "jpg" : match[1];
            base64Content = match[2];
          }
        } else if (rawFileName.includes(".")) {
          ext = rawFileName.split(".").pop().toLowerCase();
        }

        const safeExt = ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext) ? ext : "png";
        const uploadsDir = path.resolve(__dirname, "../image/uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const uniqueName = `dm_${mechName}_${Date.now()}.${safeExt}`;
        const targetPath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(targetPath, Buffer.from(base64Content, "base64"));

        const publicImagePath = `image/uploads/${uniqueName}`;

        return res.status(200).json({
          success: true,
          imagePath: publicImagePath,
          fileName: uniqueName,
          message: "Image uploaded and stored successfully."
        });
      } catch (uploadErr) {
        console.error("Image upload failed:", uploadErr);
        return res.status(500).json({ error: `Image upload failed: ${uploadErr.message}` });
      }
    }

    // 💾 Save / Update Single Damage Mechanism
    if (action === "save_damage_mechanism") {
      const mechName = (payload.name || "").trim();
      if (!mechName) {
        return res.status(400).json({ error: "Damage mechanism name is required." });
      }

      let imagePath = (payload.imagePath || "").trim();

      // If inline base64 image data is provided, save it
      if (payload.imageData && payload.imageData.startsWith("data:image/")) {
        try {
          const uploadsDir = path.resolve(__dirname, "../image/uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const match = payload.imageData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const safeName = `dm_${mechName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(uploadsDir, safeName), Buffer.from(match[2], "base64"));
            imagePath = `image/uploads/${safeName}`;
          }
        } catch (imgErr) {
          console.warn("Inline image saving notice:", imgErr.message);
        }
      }

      const mechDocId = (payload.id || payload.code || mechName).replace(/[^a-zA-Z0-9_-]/g, "_");
      const record = {
        id: mechDocId,
        code: String(payload.code || "").trim(),
        name: mechName,
        description: payload.description || "",
        affectedMaterials: payload.affectedMaterials || "",
        criticalFactors: payload.criticalFactors || "",
        affectedUnits: payload.affectedUnits || "",
        appearance: payload.appearance || "",
        mitigation: payload.mitigation || "",
        inspection: payload.inspection || "",
        temperatureComparison: payload.temperatureComparison || "",
        imagePath: imagePath,
        isCustom: true,
        updatedAt: Date.now(),
        updatedBy: callerEmail
      };

      // 1. Save to Firestore if available
      if (db) {
        try {
          await db.collection("damageMechanisms").doc(mechDocId).set(record, { merge: true });
        } catch (fErr) {
          console.warn("Firestore save damageMechanism notice:", fErr.message);
        }
      }

      // 2. Persist to local custom overlay file
      try {
        const customFilePath = path.resolve(__dirname, "../data/secure/custom_damage_mechanisms.json");
        let customMechs = {};
        if (fs.existsSync(customFilePath)) {
          customMechs = JSON.parse(fs.readFileSync(customFilePath, "utf8")) || {};
        }
        customMechs[mechName] = record;
        fs.writeFileSync(customFilePath, JSON.stringify(customMechs, null, 2), "utf8");
      } catch (fileErr) {
        console.warn("Local custom file write notice:", fileErr.message);
      }

      // 3. Invalidate memory cache so next request fetches fresh data
      invalidateDamageMechanismsCache();

      return res.status(200).json({
        success: true,
        message: `Damage mechanism '${mechName}' saved successfully.`,
        mechanism: record
      });
    }

    // 🗑️ Delete Custom Damage Mechanism
    if (action === "delete_damage_mechanism") {
      const mechName = (payload.name || "").trim();
      const mechDocId = (payload.id || payload.code || mechName).replace(/[^a-zA-Z0-9_-]/g, "_");

      if (!mechName && !mechDocId) {
        return res.status(400).json({ error: "Damage mechanism identifier is required." });
      }

      if (db && mechDocId) {
        try {
          await db.collection("damageMechanisms").doc(mechDocId).delete();
        } catch (fErr) {
          console.warn("Firestore delete notice:", fErr.message);
        }
      }

      try {
        const customFilePath = path.resolve(__dirname, "../data/secure/custom_damage_mechanisms.json");
        if (fs.existsSync(customFilePath)) {
          const customMechs = JSON.parse(fs.readFileSync(customFilePath, "utf8")) || {};
          if (customMechs[mechName]) {
            delete customMechs[mechName];
            fs.writeFileSync(customFilePath, JSON.stringify(customMechs, null, 2), "utf8");
          }
        }
      } catch (fileErr) {
        console.warn("Local custom file delete notice:", fileErr.message);
      }

      invalidateDamageMechanismsCache();

      return res.status(200).json({
        success: true,
        message: `Damage mechanism '${mechName || mechDocId}' removed successfully.`
      });
    }

    // 📥 Bulk Import Damage Mechanisms (JSON)
    if (action === "bulk_import_damage_mechanisms") {
      const rawList = payload.mechanisms;
      if (!rawList) {
        return res.status(400).json({ error: "No mechanisms data provided for bulk import." });
      }

      let count = 0;
      const customFilePath = path.resolve(__dirname, "../data/secure/custom_damage_mechanisms.json");
      let customMechs = {};
      if (fs.existsSync(customFilePath)) {
        try {
          customMechs = JSON.parse(fs.readFileSync(customFilePath, "utf8")) || {};
        } catch (e) {
          customMechs = {};
        }
      }

      const items = Array.isArray(rawList)
        ? rawList
        : Object.entries(rawList).map(([k, v]) => ({ name: k, ...v }));

      for (const item of items) {
        const name = (item.name || item.title || "").trim();
        if (!name) continue;
        const mechDocId = (item.id || item.code || name).replace(/[^a-zA-Z0-9_-]/g, "_");
        const record = {
          id: mechDocId,
          code: String(item.code || "").trim(),
          name: name,
          description: item.description || "",
          affectedMaterials: item.affectedMaterials || "",
          criticalFactors: item.criticalFactors || "",
          affectedUnits: item.affectedUnits || "",
          appearance: item.appearance || "",
          mitigation: item.mitigation || "",
          inspection: item.inspection || "",
          temperatureComparison: item.temperatureComparison || "",
          imagePath: item.imagePath || "",
          isCustom: true,
          updatedAt: Date.now(),
          updatedBy: callerEmail
        };

        if (db) {
          try {
            await db.collection("damageMechanisms").doc(mechDocId).set(record, { merge: true });
          } catch (e) {}
        }
        customMechs[name] = record;
        count++;
      }

      try {
        fs.writeFileSync(customFilePath, JSON.stringify(customMechs, null, 2), "utf8");
      } catch (e) {}

      invalidateDamageMechanismsCache();

      return res.status(200).json({
        success: true,
        message: `Successfully imported ${count} damage mechanisms.`,
        count
      });
    }

    // -------------------------------------------------------------
    // 7. RESTORE BACKUP & VALIDATE (JSON Restore Engine)
    // -------------------------------------------------------------
    if (action === "restore_backup") {
      const backupData = payload.backupData || {};
      const previewOnly = payload.previewOnly === true;
      const selectedScope = Array.isArray(payload.scope) ? payload.scope : ["all"];

      if (!backupData || typeof backupData !== "object" || !backupData.collections) {
        return res.status(400).json({ error: "Invalid backup format. Missing 'collections' root object." });
      }

      const collections = backupData.collections;
      const counts = {
        userRoles: collections.userRoles ? Object.keys(collections.userRoles).length : 0,
        damageMechanisms: collections.damageMechanisms ? Object.keys(collections.damageMechanisms).length : 0,
        streamDatasets: Array.isArray(collections.streamDatasets) ? collections.streamDatasets.length : (collections.streamDatasets ? Object.keys(collections.streamDatasets).length : 0),
        stressYears: collections.stressData ? Object.keys(collections.stressData).length : 0,
        layoutConfig: collections.layoutConfig ? 1 : 0
      };

      if (previewOnly) {
        return res.status(200).json({
          success: true,
          preview: true,
          version: backupData.version || "Unknown",
          exportedAt: backupData.exportedAt || "Unknown",
          exportedBy: backupData.exportedBy || "Unknown",
          counts
        });
      }

      // Execute actual restore
      const restored = [];
      const shouldRestore = (col) => selectedScope.includes("all") || selectedScope.includes(col);

      // Restore User Roles
      if (shouldRestore("userRoles") && collections.userRoles && db) {
        let uCount = 0;
        for (const [emailKey, roleDoc] of Object.entries(collections.userRoles)) {
          try {
            await db.collection("userRoles").doc(emailKey).set(roleDoc, { merge: true });
            uCount++;
          } catch (e) {}
        }
        restored.push(`User Roles (${uCount} records)`);
      }

      // Restore Damage Mechanisms
      if (shouldRestore("damageMechanisms") && collections.damageMechanisms) {
        try {
          ensureDirExists(CUSTOM_DAMAGE_MECHS_FILE);
          fs.writeFileSync(CUSTOM_DAMAGE_MECHS_FILE, JSON.stringify(collections.damageMechanisms, null, 2), "utf8");
          invalidateDamageMechanismsCache();
          restored.push(`Damage Mechanisms (${counts.damageMechanisms} records)`);
        } catch (e) {}
      }

      // Restore Stream Datasets
      if (shouldRestore("streamDatasets") && collections.streamDatasets) {
        try {
          ensureDirExists(STREAM_DATASETS_FILE);
          const list = Array.isArray(collections.streamDatasets) ? collections.streamDatasets : Object.values(collections.streamDatasets);
          fs.writeFileSync(STREAM_DATASETS_FILE, JSON.stringify(list, null, 2), "utf8");
          restored.push(`Process Stream Datasets (${list.length} records)`);
        } catch (e) {}
      }

      // Restore Stress Data
      if (shouldRestore("stressData") && collections.stressData) {
        try {
          const db = getAdminFirestore();
          if (db) {
            const years = Object.keys(collections.stressData);
            await db.collection("systemMeta").doc("stressDataMaster").set({
              data: collections.stressData,
              years,
              totalYears: years.length,
              lastUpdated: Date.now()
            }, { merge: true });
            for (const y of years) {
              await db.collection("stressData").doc(String(y)).set({
                year: String(y),
                materials: collections.stressData[y],
                updatedAt: Date.now()
              }, { merge: true });
            }
          }
          restored.push(`Allowable Stress Database (${counts.stressYears} code editions)`);
        } catch (e) {}
      }

      // Restore Layout Config
      if (shouldRestore("layoutConfig") && collections.layoutConfig) {
        try {
          ensureDirExists(LAYOUT_CONFIG_FILE);
          fs.writeFileSync(LAYOUT_CONFIG_FILE, JSON.stringify(collections.layoutConfig, null, 2), "utf8");
          restored.push(`Layout & Navigation Configuration`);
          // Also persist to Firestore (Admin SDK first)
          if (db) {
            await db.collection("systemSettings").doc("layoutConfig").set(collections.layoutConfig, { merge: true }).catch(() => {});
          }
        } catch (e) {}
      }

      // Record in backup history
      try {
        ensureDirExists(BACKUP_HISTORY_FILE);
        let history = [];
        if (fs.existsSync(BACKUP_HISTORY_FILE)) {
          try { history = JSON.parse(fs.readFileSync(BACKUP_HISTORY_FILE, "utf8")); } catch (e) {}
        }
        history.unshift({
          id: "rst_" + Date.now(),
          type: "BACKUP_RESTORE",
          timestamp: Date.now(),
          isoDate: new Date().toISOString(),
          user: callerEmail,
          scope: selectedScope,
          restoredSummary: restored.join(", ")
        });
        if (history.length > 50) history = history.slice(0, 50);
        fs.writeFileSync(BACKUP_HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
      } catch (e) {}

      // Record Audit Log
      await recordAuditLog(db, {
        user: callerEmail,
        action: "BACKUP_RESTORED",
        module: "Master Data & Backup",
        recordAffected: "System Restore",
        details: `Restored components: ${restored.join(", ")}`
      });

      return res.status(200).json({
        success: true,
        message: `Successfully restored: ${restored.join(", ")}`,
        restored
      });
    }

    // -------------------------------------------------------------
    // 8. BACKUP & RESTORE HISTORY
    // -------------------------------------------------------------
    if (action === "get_backup_history") {
      let history = [];
      try {
        if (fs.existsSync(BACKUP_HISTORY_FILE)) {
          history = JSON.parse(fs.readFileSync(BACKUP_HISTORY_FILE, "utf8"));
        }
      } catch (e) {}
      return res.status(200).json({
        success: true,
        history
      });
    }

    // -------------------------------------------------------------
    // 9. SYSTEM LOGS & AUDIT TRAIL
    // -------------------------------------------------------------
    if (action === "get_system_logs" || action === "get_audit_logs") {
      let logs = [];
      const queryCat = (payload.category || "all").toLowerCase();
      const querySearch = (payload.search || "").toLowerCase().trim();

      if (db) {
        try {
          const snap = await db.collection("systemAuditLogs").orderBy("timestamp", "desc").limit(100).get();
          snap.forEach(doc => logs.push(doc.data()));
        } catch (e) {}
      }

      if (logs.length === 0 && fs.existsSync(AUDIT_LOGS_FILE)) {
        try {
          logs = JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, "utf8"));
        } catch (e) {}
      }

      let filtered = logs;
      if (queryCat !== "all") {
        filtered = filtered.filter(l => (l.module || "").toLowerCase().includes(queryCat) || (l.action || "").toLowerCase().includes(queryCat));
      }
      if (querySearch) {
        filtered = filtered.filter(l =>
          (l.user || "").toLowerCase().includes(querySearch) ||
          (l.action || "").toLowerCase().includes(querySearch) ||
          (l.recordAffected || "").toLowerCase().includes(querySearch) ||
          (l.details || "").toLowerCase().includes(querySearch)
        );
      }

      return res.status(200).json({
        success: true,
        total: filtered.length,
        logs: filtered.slice(0, 100)
      });
    }

    if (action === "record_audit_log") {
      const entry = await recordAuditLog(db, {
        user: callerEmail,
        action: payload.logAction || "USER_ACTION",
        module: payload.logModule || "Admin",
        recordAffected: payload.recordAffected || "—",
        previousValue: payload.previousValue,
        newValue: payload.newValue,
        details: payload.details || ""
      });
      return res.status(200).json({ success: true, entry });
    }

    // -------------------------------------------------------------
    // 10. LAYOUT & NAVIGATION CONFIGURATION
    // -------------------------------------------------------------
    if (action === "get_layout_config") {
      let config = null;

      // 1. Try reading from Firestore Admin SDK if initialized
      if (db) {
        try {
          const snap = await db.collection("systemSettings").doc("layoutConfig").get();
          if (snap && snap.exists) config = snap.data();
        } catch (e) {
          console.warn("[Admin] Admin SDK layoutConfig fetch note:", e?.message);
        }
      }

      // 2. Try reading from Firestore via unified project client (getFirestoreDb)
      if (!config) {
        try {
          const clientDb = getFirestoreDb();
          if (clientDb) {
            const snap = await Promise.race([
              getDoc(doc(clientDb, "systemSettings", "layoutConfig")),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout reading layoutConfig")), 3000))
            ]);
            if (snap && snap.exists()) {
              config = snap.data();
            }
          }
        } catch (e) {
          console.warn("[Admin] FirestoreClient layoutConfig fetch note:", e?.message);
        }
      }


      // 3. Fallback to local layout_config.json file
      if (!config && fs.existsSync(LAYOUT_CONFIG_FILE)) {
        try {
          config = JSON.parse(fs.readFileSync(LAYOUT_CONFIG_FILE, "utf8"));
        } catch (e) {}
      }

      const defaults = getDefaultLayoutConfig();
      let needsSelfHeal = false;
      if (!config) {
        config = defaults;
      } else {
        if (!config.tickerText || !config.tickerText.trim()) {
          config.tickerText = defaults.tickerText;
        }
        const rawCount = Array.isArray(config.sidebarModules) ? config.sidebarModules.length : 0;
        const hadLegacyIds = Array.isArray(config.sidebarModules) && config.sidebarModules.some(m => m && m.id !== normalizeSidebarModuleId(m.id));
        // Ensure all default modules exist in sidebarModules without disrupting user's order
        if (!config.sidebarModules || !Array.isArray(config.sidebarModules) || config.sidebarModules.length === 0) {
          config.sidebarModules = defaults.sidebarModules;
        } else {
          config.sidebarModules = sanitizeSidebarModules(config.sidebarModules);
          const existingIds = new Set(config.sidebarModules.map(m => m.id));
          defaults.sidebarModules.forEach(dm => {
            if (!existingIds.has(dm.id)) {
              config.sidebarModules.push(dm);
            }
          });
        }
        config.sidebarModules = sanitizeSidebarModules(config.sidebarModules);
        if (hadLegacyIds || rawCount !== config.sidebarModules.length) {
          needsSelfHeal = true;
        }
        config.welcomeCards = normalizeAndMergeWelcomeCards(config.welcomeCards, defaults.welcomeCards);
      }

      if (needsSelfHeal) {
        try {
          ensureDirExists(LAYOUT_CONFIG_FILE);
          fs.writeFileSync(LAYOUT_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
        } catch (e) {}
        if (db) {
          try { await db.collection("systemSettings").doc("layoutConfig").set(config); } catch (e) {}
        }
        try {
          const clientDb = getFirestoreDb();
          if (clientDb) {
            await setDoc(doc(clientDb, "systemSettings", "layoutConfig"), config);
          }
        } catch (e) {}
      }

      return res.status(200).json({ success: true, config });
    }

    if (action === "save_layout_config") {
      let config = payload.config;
      const defaults = getDefaultLayoutConfig();
      if (!config || Object.keys(config).length === 0 || !config.sidebarModules || !Array.isArray(config.sidebarModules)) {
        config = defaults;
      } else {
        // Preserve user's exact reordered sequence, but append any missing modules to the bottom
        config.sidebarModules = sanitizeSidebarModules(config.sidebarModules);
        const existingIds = new Set(config.sidebarModules.map(m => m.id));
        defaults.sidebarModules.forEach(dm => {
          if (!existingIds.has(dm.id)) {
            config.sidebarModules.push(dm);
          }
        });
        config.sidebarModules = sanitizeSidebarModules(config.sidebarModules);
        config.welcomeCards = normalizeAndMergeWelcomeCards(config.welcomeCards, defaults.welcomeCards);
      }
      config.updatedAt = Date.now();
      config.updatedBy = callerEmail;

      try {
        ensureDirExists(LAYOUT_CONFIG_FILE);
        fs.writeFileSync(LAYOUT_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
      } catch (fileErr) {
        console.warn("[Admin] Local layoutConfig save warning:", fileErr.message);
      }

      let firestorePersisted = false;
      let firestoreError = null;

      // 1. Persist to Firestore via Admin SDK if initialized
      if (db) {
        try {
          await db.collection("systemSettings").doc("layoutConfig").set(config);
          firestorePersisted = true;
        } catch (e) {
          firestoreError = e?.message || String(e);
          console.warn("[Admin] Admin SDK layoutConfig save warning:", firestoreError);
        }
      }

      // 2. Also persist via unified Firestore client (getFirestoreDb)
      try {
        const clientDb = getFirestoreDb();
        if (clientDb) {
          await setDoc(doc(clientDb, "systemSettings", "layoutConfig"), config);
          firestorePersisted = true;
          firestoreError = null;
        }
      } catch (clientErr) {
        if (!firestorePersisted) {
          firestoreError = clientErr?.message || String(clientErr);
        }
      }

      await recordAuditLog(db, {
        user: callerEmail,
        action: "LAYOUT_CONFIG_UPDATED",
        module: "Layout & Navigation Builder",
        recordAffected: "Global Navigation Config",
        details: `Saved navigation order (${config.sidebarModules.length} modules), visibility, ticker announcements and welcome cards. Firestore sync: ${firestorePersisted ? "SUCCESS" : "LOCAL_FALLBACK"}`
      });

      return res.status(200).json({
        success: true,
        message: firestorePersisted
          ? "Layout configuration saved and synchronized to Firestore successfully."
          : "Layout configuration saved locally (Firestore sync unavailable).",
        config,
        firestorePersisted,
        firestoreError
      });
    }

    // -------------------------------------------------------------
    // 11. PROCESS STREAM DATASET MANAGEMENT (ADMIN)
    // -------------------------------------------------------------
    if (action === "get_stream_datasets") {
      let datasets = [];

      // 1. Read via Admin SDK first
      if (db) {
        try {
          const snap = await db.collection("streamDatasets").get();
          snap.forEach(docSnap => {
            datasets.push(docSnap.data());
          });
        } catch (e) {
          console.warn("[Admin] Admin SDK get_stream_datasets note:", e?.message);
        }
      }

      // 2. Fallback to clientDb if Admin SDK returned no datasets
      if (datasets.length === 0) {
        const clientDb = getFirestoreDb();
        if (clientDb) {
          try {
            const snap = await getDocs(collection(clientDb, "streamDatasets"));
            snap.forEach(docSnap => {
              const d = docSnap.data();
              datasets.push(d);
            });
          } catch (e) {
            console.warn("[Admin] get_stream_datasets error:", e?.message);
          }
        }
      }

      datasets.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      return res.status(200).json({ success: true, total: datasets.length, datasets });
    }

    if (action === "save_stream_dataset") {
      const dataset = payload.dataset;
      if (!dataset || !dataset.streams || !Array.isArray(dataset.streams) || dataset.streams.length === 0) {
        return res.status(400).json({ error: "Invalid stream dataset. Must contain at least 1 stream." });
      }

      const id = dataset.id || `stream_ds_${Date.now()}`;
      const title = dataset.title || `Stream Dataset ${new Date().toLocaleDateString()}`;
      const record = {
        ...dataset,
        id,
        title,
        streamCount: dataset.streams.length,
        updatedAt: Date.now(),
        uploadedBy: callerEmail || SUPER_ADMIN_EMAIL
      };

      let firestorePersisted = false;
      let firestoreError = null;

      // 1. Persist to Firestore via Admin SDK if initialized
      if (db) {
        try {
          await db.collection("streamDatasets").doc(id).set(record, { merge: true });
          firestorePersisted = true;
        } catch (e) {
          firestoreError = e?.message || String(e);
          console.warn("[Admin] Admin SDK save_stream_dataset warning:", firestoreError);
        }
      } else {
        firestoreError = "Firebase Admin SDK unconfigured on server.";
      }

      await recordAuditLog(db, {
        user: callerEmail || SUPER_ADMIN_EMAIL,
        action: "STREAM_DATASET_SAVED",
        module: "Stream Data Manager",
        recordAffected: `Dataset: ${title} (${id})`,
        details: `Saved stream dataset containing ${record.streamCount} streams to master database. Firestore sync: ${firestorePersisted ? "SUCCESS" : "ERROR"}`
      });

      return res.status(200).json({
        success: true,
        message: firestorePersisted
          ? `Dataset '${title}' saved and synchronized to Firestore successfully!`
          : `Dataset '${title}' processed (Firestore write error: ${firestoreError}).`,
        dataset: record,
        firestorePersisted,
        firestoreError
      });
    }

    if (action === "delete_stream_dataset") {
      const datasetId = payload.id;
      if (!datasetId) return res.status(400).json({ error: "Missing dataset ID" });

      let firestoreDeleted = false;
      if (db) {
        try {
          await db.collection("streamDatasets").doc(datasetId).delete();
          firestoreDeleted = true;
        } catch (e) {}
      }

      await recordAuditLog(db, {
        user: callerEmail,
        action: "STREAM_DATASET_DELETED",
        module: "Stream Data Manager",
        recordAffected: `Dataset ID: ${datasetId}`,
        details: `Permanently removed stream dataset from master database.`
      });

      return res.status(200).json({ success: true, message: `Dataset '${datasetId}' deleted.` });
    }

    // -------------------------------------------------------------
    // 12. ALLOWABLE STRESS MASTER MANAGEMENT (ADMIN)
    // -------------------------------------------------------------
    if (action === "get_stress_manager_data") {
      const stressDb = await getStressData({ refresh: true });

      const yearsSummary = [];
      for (const [year, mats] of Object.entries(stressDb)) {
        const matNames = Object.keys(mats || {});
        let totalRecords = 0;
        matNames.forEach(m => {
          const grades = Object.keys(mats[m] || {});
          totalRecords += grades.length;
        });
        yearsSummary.push({
          year,
          materialsCount: matNames.length,
          gradesCount: totalRecords,
          sampleMaterials: matNames.slice(0, 5)
        });
      }

      return res.status(200).json({
        success: true,
        years: yearsSummary,
        totalEditions: yearsSummary.length,
        activeDbEdition: yearsSummary.length > 0 ? yearsSummary[0].year : "2022"
      });
    }

    if (action === "save_stress_year") {
      const newYear = String(payload.year || "").trim();
      const cloneFromYear = String(payload.cloneFrom || "").trim();

      if (!newYear || !/^\d{4}$/.test(newYear)) {
        return res.status(400).json({ error: "Please specify a valid 4-digit edition year (e.g. 2024)." });
      }

      let stressDb = await getStressData({ refresh: true });

      if (stressDb[newYear]) {
        return res.status(400).json({ error: `Edition year '${newYear}' already exists in database.` });
      }

      const yearMaterials = cloneFromYear && stressDb[cloneFromYear]
        ? JSON.parse(JSON.stringify(stressDb[cloneFromYear]))
        : {};

      stressDb[newYear] = yearMaterials;

      if (db) {
        try {
          await db.collection("stressData").doc(newYear).set({
            year: newYear,
            materials: yearMaterials,
            updatedAt: Date.now()
          }, { merge: true });
          const years = Object.keys(stressDb);
          await db.collection("systemMeta").doc("stressDataMaster").set({
            years,
            totalYears: years.length,
            lastUpdated: Date.now()
          }, { merge: true });
        } catch (e) {
          console.warn("Firestore save_stress_year error:", e.message);
        }
      }

      invalidateDamageMechanismsCache();

      await recordAuditLog(db, {
        user: callerEmail,
        action: "STRESS_YEAR_ADDED",
        module: "Allowable Stress Manager",
        recordAffected: `Year: ${newYear}`,
        details: cloneFromYear ? `Cloned edition from ${cloneFromYear}` : `Created empty edition`
      });

      return res.status(200).json({ success: true, message: `Code Edition ${newYear} created successfully.`, year: newYear });
    }

    if (action === "delete_stress_year") {
      const yearToDelete = String(payload.year || "").trim();
      if (!yearToDelete) return res.status(400).json({ error: "Missing year to delete." });

      const delRes = await deleteYearStressData(yearToDelete, callerEmail);
      if (delRes.notFound) {
        return res.status(404).json({ error: `Year '${yearToDelete}' not found in database.` });
      }

      invalidateDamageMechanismsCache();

      await recordAuditLog(db, {
        user: callerEmail,
        action: "STRESS_YEAR_DELETED",
        module: "Allowable Stress Manager",
        recordAffected: `Year: ${yearToDelete}`,
        details: `Deleted code edition and all associated materials.`
      });

      return res.status(200).json({ success: true, message: `Code Edition ${yearToDelete} deleted successfully.` });
    }

    if (action === "bulk_import_stress_records") {
      const records = Array.isArray(payload.records) ? payload.records : [];
      if (records.length === 0) {
        return res.status(400).json({ error: "No stress records provided for bulk import." });
      }

      const inputTree = recordsToStressTree(records);
      if (!inputTree || Object.keys(inputTree).length === 0) {
        return res.status(400).json({ error: "No valid stress records found in uploaded rows." });
      }

      const saveRes = await saveStressData(inputTree, {
        mode: "merge",
        userEmail: callerEmail,
        source: "admin_bulk_import"
      });

      invalidateDamageMechanismsCache();

      await recordAuditLog(db, {
        user: callerEmail,
        action: "STRESS_RECORDS_IMPORTED",
        module: "Allowable Stress Manager",
        recordAffected: `Bulk Import (${records.length} rows)`,
        details: `Imported rows into Firestore stress database (Total records: ${saveRes.stats?.records || 0}).`
      });

      return res.status(200).json({
        success: true,
        imported: records.length,
        skipped: 0,
        errors: [],
        message: `Successfully imported ${records.length} stress records to Firestore.`
      });
    }

    // -------------------------------------------------------------
    // 16. 🔄 PROJECT & WORKSPACE SWITCHER
    // -------------------------------------------------------------
    if (action === "get_projects") {
      const activeProject = getActiveProjectConfig();
      const allProjects = getAllAvailableProjects();
      const activeWorkspace = getActiveWorkspaceConfig();

      return res.status(200).json({
        success: true,
        activeProject,
        availableProjects: allProjects,
        activeWorkspace,
        availableWorkspaces: await getLiveWorkspaces(),
        systemInfo: {
          nodeEnv: process.env.NODE_ENV || "production",
          firestoreDatabaseId: activeProject.firestoreDatabaseId || "(default)",
          serverTime: Date.now()
        }
      });
    }

    if (action === "switch_project") {
      const targetProjectId = (payload.projectId || "").trim();
      if (!targetProjectId) {
        return res.status(400).json({ error: "Missing projectId parameter." });
      }

      const prevProject = getActiveProjectConfig();
      const updatedProject = setActiveProject(targetProjectId);

      // Invalidate relevant in-memory caches
      invalidateDamageMechanismsCache();
      userRolesCache.clear();

      await recordAuditLog(db, {
        user: callerEmail,
        action: "PROJECT_SWITCH",
        module: "Project Switcher",
        recordAffected: targetProjectId,
        previousValue: prevProject.projectId,
        newValue: updatedProject.projectId,
        details: `Switched active Firebase project from ${prevProject.projectId} to ${updatedProject.projectId}.`
      });

      return res.status(200).json({
        success: true,
        message: `Successfully switched active project to ${updatedProject.name || updatedProject.projectId}`,
        activeProject: updatedProject
      });
    }

    if (action === "test_project_connection") {
      const targetConfig = payload.projectConfig || {};
      const targetProjectId = payload.projectId;

      let configToTest = targetConfig;
      if (!configToTest.apiKey && targetProjectId) {
        const allProjects = getAllAvailableProjects();
        configToTest = allProjects.find(p => p.id === targetProjectId || p.projectId === targetProjectId) || {};
      }

      if (!configToTest.apiKey || !configToTest.projectId) {
        return res.status(400).json({ error: "Invalid project config for connection test. ApiKey and ProjectId are required." });
      }

      const result = await testProjectConnection(configToTest);
      return res.status(200).json(result);
    }

    if (action === "sync_data_to_project") {
      const activeProj = getActiveProjectConfig();
      const db = getFirestoreDb();
      let dmsSynced = 0;
      let stressYearsSynced = 0;

      // 1. Sync Damage Mechanisms
      try {
        const localDms = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/secure/damage_mechanisms.json"), "utf8"));
        const rawDms = localDms["Damage Mechanism"] || localDms;
        for (const [name, val] of Object.entries(rawDms)) {
          const docId = String(val.id || val.code || name.replace(/[^a-zA-Z0-9_]/g, "_")).slice(0, 100);
          try {
            await setDoc(doc(db, "damageMechanisms", docId), {
              id: docId,
              code: val.code || docId,
              name,
              category: val.category || "API 571 Damage Mechanism",
              description: val.description || "",
              affectedMaterials: val.affectedMaterials || "",
              criticalFactors: val.criticalFactors || "",
              affectedUnits: val.affectedUnits || "",
              appearance: val.appearance || "",
              mitigation: val.mitigation || "",
              inspection: val.inspection || "",
              temperatureComparison: val.temperatureComparison || "",
              imagePath: val.imagePath || "",
              isCustom: false,
              updatedAt: Date.now()
            }, { merge: true });
            dmsSynced++;
          } catch (e) {
            console.warn("sync doc error:", e.message);
          }
        }
      } catch (dmErr) {
        console.warn("sync damage mechanisms error:", dmErr.message);
      }

      // 2. Sync Stress Master
      try {
        if (fs.existsSync(STRESS_DATA_FILE)) {
          const stressData = JSON.parse(fs.readFileSync(STRESS_DATA_FILE, "utf8"));
          const years = Object.keys(stressData);
          await setDoc(doc(db, "systemMeta", "stressDataMaster"), {
            data: stressData,
            years,
            totalYears: years.length,
            lastUpdated: Date.now()
          }, { merge: true });
          for (const y of years) {
            await setDoc(doc(db, "stressData", String(y)), {
              year: String(y),
              materials: stressData[y],
              updatedAt: Date.now()
            }, { merge: true });
            stressYearsSynced++;
          }
        }
      } catch (e) {
        console.warn("sync stress error:", e.message);
      }

      invalidateDamageMechanismsCache();

      await recordAuditLog(db, {
        user: callerEmail,
        action: "PROJECT_DATA_SYNCED",
        module: "Project Switcher",
        recordAffected: activeProj.projectId,
        details: `Synchronized ${dmsSynced} Damage Mechanisms and ${stressYearsSynced} Stress Editions to ${activeProj.projectId}.`
      });

      return res.status(200).json({
        success: true,
        message: `Successfully synchronized ${dmsSynced} Damage Mechanisms and ${stressYearsSynced} Stress Editions to ${activeProj.name || activeProj.projectId}.`,
        dmsSynced,
        stressYearsSynced
      });
    }

    if (action === "save_custom_project") {
      const { id, name, projectId, apiKey, authDomain, firestoreDatabaseId, storageBucket, description } = payload;
      if (!projectId || !apiKey) {
        return res.status(400).json({ error: "ProjectId and ApiKey are required for custom project." });
      }

      const projectRecord = {
        id: id || `custom_${projectId.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        name: name || projectId,
        projectId: projectId.trim(),
        apiKey: apiKey.trim(),
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        firestoreDatabaseId: firestoreDatabaseId || "(default)",
        storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
        description: description || "Custom user-configured Firebase Project",
        isDefault: false
      };

      const updatedList = saveCustomProject(projectRecord);

      await recordAuditLog(db, {
        user: callerEmail,
        action: "CUSTOM_PROJECT_SAVED",
        module: "Project Switcher",
        recordAffected: projectRecord.projectId,
        details: `Saved custom project profile: ${projectRecord.name}`
      });

      return res.status(200).json({
        success: true,
        message: `Custom project '${projectRecord.name}' saved successfully.`,
        availableProjects: getAllAvailableProjects()
      });
    }

    if (action === "delete_custom_project") {
      const { projectId } = payload;
      if (!projectId) {
        return res.status(400).json({ error: "Missing projectId parameter." });
      }

      const activeProject = getActiveProjectConfig();
      if (activeProject.id === projectId || activeProject.projectId === projectId) {
        return res.status(400).json({ error: "Cannot delete the currently active project. Switch to another project first." });
      }

      deleteCustomProject(projectId);

      await recordAuditLog(db, {
        user: callerEmail,
        action: "CUSTOM_PROJECT_DELETED",
        module: "Project Switcher",
        recordAffected: projectId,
        details: `Deleted custom project profile: ${projectId}`
      });

      return res.status(200).json({
        success: true,
        message: `Project profile '${projectId}' deleted.`,
        availableProjects: getAllAvailableProjects()
      });
    }

    if (action === "switch_workspace") {
      const { workspaceId } = payload;
      if (!workspaceId) {
        return res.status(400).json({ error: "Missing workspaceId parameter." });
      }

      const activeWorkspace = setActiveWorkspace(workspaceId);

      await recordAuditLog(db, {
        user: callerEmail,
        action: "WORKSPACE_SWITCH",
        module: "Plant Engineering Workspace",
        recordAffected: workspaceId,
        details: `Switched plant engineering workspace to: ${activeWorkspace.name}`
      });

      return res.status(200).json({
        success: true,
        message: `Active plant workspace switched to ${activeWorkspace.name}`,
        activeWorkspace
      });
    }

    return res.status(400).json({ error: `Unknown admin action: '${action}'` });
  } catch (err) {
    console.error("Admin API error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
