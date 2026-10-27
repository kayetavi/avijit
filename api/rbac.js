import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminApp, getAdminFirestore, verifyServerIdentity } from "./sessionStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const USERS_FILE = path.resolve(__dirname, "../data/secure/users.json");
export const ROLE_MATRIX_FILE = path.resolve(__dirname, "../data/secure/role_matrix.json");

export const DEFAULT_ROLE_MATRIX = {
  admin: {
    damageExplorer: true,
    api581: true,
    api570: true,
    thicknessCalc: true,
    processFlow: true,
    crackingMechanism: true,
    bkStress: true,
    ccdAI: true,
    chemicalSuite: true,
    streamComparator: true,
    unitConverter: true,
    adminControlCenter: true
  },
  lead_engineer: {
    damageExplorer: true,
    api581: true,
    api570: true,
    thicknessCalc: true,
    processFlow: true,
    crackingMechanism: true,
    bkStress: true,
    ccdAI: true,
    chemicalSuite: true,
    streamComparator: true,
    unitConverter: true,
    adminControlCenter: false
  },
  inspector: {
    damageExplorer: true,
    api581: true,
    api570: true,
    thicknessCalc: true,
    processFlow: true,
    crackingMechanism: true,
    bkStress: true,
    ccdAI: false,
    chemicalSuite: true,
    streamComparator: false,
    unitConverter: true,
    adminControlCenter: false
  },
  viewer: {
    damageExplorer: true,
    api581: true,
    api570: true,
    thicknessCalc: false,
    processFlow: true,
    crackingMechanism: false,
    bkStress: false,
    ccdAI: false,
    chemicalSuite: false,
    streamComparator: false,
    unitConverter: true,
    adminControlCenter: false
  }
};

export const DEFAULT_ROLE_CRUD_PERMISSIONS = {
  admin: {
    read: true,
    write: true,
    edit: true,
    delete: true,
    manageUsers: true,
    manageSystem: true,
    runCalculations: true
  },
  lead_engineer: {
    read: true,
    write: true,
    edit: true,
    delete: true,
    manageUsers: false,
    manageSystem: false,
    runCalculations: true
  },
  inspector: {
    read: true,
    write: true,
    edit: false,
    delete: false,
    manageUsers: false,
    manageSystem: false,
    runCalculations: true
  },
  viewer: {
    read: true,
    write: false,
    edit: false,
    delete: false,
    manageUsers: false,
    manageSystem: false,
    runCalculations: false
  }
};

export const ROLE_METADATA = {
  admin: {
    id: "admin",
    role: "admin",
    label: "Admin",
    description: "Full administrative control over users, RBAC roles, engineering catalogs, calculations, and system settings."
  },
  lead_engineer: {
    id: "lead_engineer",
    role: "lead_engineer",
    label: "Lead Engineer",
    description: "Full engineering access: read, write, edit, and delete engineering datasets, damage mechanisms, stress tables, and RBI workspaces."
  },
  inspector: {
    id: "inspector",
    role: "inspector",
    label: "Inspector",
    description: "Field inspection & integrity analysis access: read catalogs, run thickness/corrosion calculations, and save inspection analyses (no catalog edit/delete)."
  },
  viewer: {
    id: "viewer",
    role: "viewer",
    label: "Viewer",
    description: "Read-only observer access to approved dashboards, damage mechanisms, and process diagrams (no write/edit/delete permissions)."
  }
};

export function getRoleCrudPermissions(role, customPermissions = {}) {
  const normRole = String(role || "viewer").toLowerCase().trim();
  if (normRole === "admin") {
    return { ...DEFAULT_ROLE_CRUD_PERMISSIONS.admin };
  }
  const base =
    DEFAULT_ROLE_CRUD_PERMISSIONS[normRole] ||
    (normRole === "engineer" || normRole === "manager"
      ? DEFAULT_ROLE_CRUD_PERMISSIONS.lead_engineer
      : DEFAULT_ROLE_CRUD_PERMISSIONS.viewer);

  return {
    ...base,
    ...(customPermissions && typeof customPermissions === "object" ? customPermissions : {}),
    manageUsers: false,
    manageSystem: false
  };
}

export function getRoleMatrix() {
  try {
    if (fs.existsSync(ROLE_MATRIX_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ROLE_MATRIX_FILE, "utf8"));
      if (parsed && typeof parsed === "object") {
        return {
          admin: { ...DEFAULT_ROLE_MATRIX.admin },
          lead_engineer: { ...DEFAULT_ROLE_MATRIX.lead_engineer, ...(parsed.lead_engineer || parsed.engineer || {}) },
          inspector: { ...DEFAULT_ROLE_MATRIX.inspector, ...(parsed.inspector || {}) },
          viewer: { ...DEFAULT_ROLE_MATRIX.viewer, ...(parsed.viewer || {}) }
        };
      }
    }
  } catch (err) {
    console.warn("Failed to read role_matrix.json:", err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_ROLE_MATRIX));
}

export function saveRoleMatrixFile(matrix) {
  ensureDirExists(ROLE_MATRIX_FILE);
  fs.writeFileSync(ROLE_MATRIX_FILE, JSON.stringify(matrix, null, 2), "utf8");
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const AVAILABLE_MODULES = [
  {
    id: "damageExplorer",
    name: "API 571 Damage Mechanisms",
    category: "API 571 Damage Mechanisms",
    icon: "🛡️",
    tabId: "damageExplorerTab",
    launcherFunc: "showDamageMechanismTab",
    subsections: [
      {
        id: "damageCatalog",
        name: "Damage Mechanism Catalog",
        category: "API 571 Damage Mechanisms",
        icon: "📖",
        tabId: "damageExplorerTab",
        launcherFunc: "showDamageMechanismTab"
      }
    ]
  },
  {
    id: "api581",
    name: "API 581 Risk-Based Inspection",
    category: "Risk-Based Inspection",
    icon: "📊",
    tabId: "a571-criteriaTab",
    launcherFunc: "showCriteriaTab",
    subsections: [
      {
        id: "api571Criteria",
        name: "API 571 Damage Mechanism Screening",
        category: "General Risk",
        icon: "🔎",
        tabId: "a571-criteriaTab",
        launcherFunc: "showCriteriaTab"
      },
      {
        id: "corrosionRate",
        name: "Corrosion Rate Estimator",
        category: "General Risk",
        icon: "📉",
        tabId: "corrosionFullTab",
        launcherFunc: "showCorrosionFullTab"
      },
      {
        id: "fluidSelector",
        name: "Representative Fluid Selector",
        category: "General Risk",
        icon: "💧",
        tabId: "fluidSelectorTab",
        launcherFunc: "showFluidSelectorTab"
      },
      {
        id: "inventoryCalc",
        name: "Equipment Inventory Calculator",
        category: "General Risk",
        icon: "🛢️",
        tabId: "inventoryTab",
        launcherFunc: "showInventoryTab"
      },
      {
        id: "inspectionConfidence",
        name: "Inspection Confidence & Effectiveness",
        category: "General Risk",
        icon: "🎯",
        tabId: "inspectionconfidenceTab",
        launcherFunc: "showINSPECTIONCONFIDENCETab"
      },
      {
        id: "toxicCalc",
        name: "Toxic Fluid Consequence (% Calculation)",
        category: "General Risk",
        icon: "☠️",
        tabId: "TOXIC_CALCULATIONTab",
        launcherFunc: "showTOXIC_CALCULATIONTab"
      },
      {
        id: "quantitativeGroup",
        name: "Quantitative",
        isGroup: true,
        category: "Quantitative",
        icon: "📐",
        children: [
          {
            id: "cofCalculator",
            name: "Risk Calculator_COF",
            category: "Quantitative",
            icon: "💥",
            tabId: "cof_calculatorTab",
            launcherFunc: "showcof_calculatorTab"
          },
          {
            id: "qpofCalculator",
            name: "Risk Calculator_POF",
            category: "Quantitative",
            icon: "📈",
            tabId: "QPOF_calculatorTab",
            launcherFunc: "showQPOF_calculatorTab"
          }
        ]
      },
      {
        id: "semiQuantitativeGroup",
        name: "Semi Quantitative",
        isGroup: true,
        category: "Semi Quantitative",
        icon: "⚖️",
        children: [
          {
            id: "corrosionCalc",
            name: "Risk Calculator",
            category: "Semi Quantitative",
            icon: "🧮",
            tabId: "CORROSION_CALCULATIONTab",
            launcherFunc: "showCORROSION_CALCULATIONTab"
          }
        ]
      }
    ]
  },
  {
    id: "api570",
    name: "API 570 Remaining Life",
    category: "Integrity & Piping",
    icon: "⏱️",
    tabId: "remainingLifeTab",
    launcherFunc: "showRemainingLifeTab",
    subsections: [
      { id: "remainingLifeCalc", name: "API 570 Remaining Life", category: "Integrity & Piping", icon: "⏱️", tabId: "remainingLifeTab", launcherFunc: "showRemainingLifeTab" }
    ]
  },
  {
    id: "thicknessCalc",
    name: "Design Thickness (ASME)",
    category: "Mechanical Design",
    icon: "📐",
    tabId: "ASMEB31_3Tab",
    launcherFunc: "showASMEB31_3Tab",
    subsections: [
      {
        id: "processPipingGroup",
        name: "Process Piping",
        isGroup: true,
        category: "Process Piping",
        icon: "🔧",
        children: [
          {
            id: "asmeB31_3",
            name: "ASME B31.3 Advanced",
            category: "Process Piping",
            icon: "⚙️",
            tabId: "ASMEB31_3Tab",
            launcherFunc: "showASMEB31_3Tab"
          },
          {
            id: "simplePiping",
            name: "Simple Formula (PD / 2SE)",
            category: "Process Piping",
            icon: "📏",
            tabId: "simplePipingTab",
            launcherFunc: "showSimplePipingTab"
          }
        ]
      },
      {
        id: "asmeSectionVIII",
        name: "Pressure Vessel (ASME Sec VIII Div 1)",
        category: "Mechanical Design",
        icon: "🛢️",
        tabId: "ASMESECTIONVIIIDIV1Tab",
        launcherFunc: "showASMESECTIONVIIIDIV1Tab"
      },
      {
        id: "pipeThickness",
        name: "Piping Schedule & Thickness Chart",
        category: "Mechanical Design",
        icon: "📋",
        tabId: "pipeThicknessTab",
        launcherFunc: "showpipeThicknessTab"
      },
      {
        id: "structuralThickness",
        name: "Structural Minimum Thickness (API 574)",
        category: "Mechanical Design",
        icon: "🏗️",
        tabId: "structuralThicknessTab",
        launcherFunc: "showStructuralThicknessTab"
      }
    ]
  },
  {
    id: "crackingMechanism",
    name: "Cracking Mechanism Finder",
    category: "Damage Screening",
    icon: "⚡",
    tabId: "crackingMechanismTab",
    launcherFunc: "showCrackingMechanismTab",
    subsections: [
      { id: "crackingFinder", name: "Cracking Mechanism Finder", category: "Damage Screening", icon: "⚡", tabId: "crackingMechanismTab", launcherFunc: "showCrackingMechanismTab" }
    ]
  },
  {
    id: "bkStress",
    name: "Allowable Stress & Material Data",
    category: "Materials",
    icon: "🧮",
    tabId: "bkStressTab",
    launcherFunc: "showbkStressTab",
    subsections: [
      { id: "stressLookup", name: "Allowable Stress & Material Data", category: "Materials", icon: "🧮", tabId: "bkStressTab", launcherFunc: "showbkStressTab" }
    ]
  },
  {
    id: "streamComparator",
    name: "Stream Comparator (HMB)",
    category: "Process Engineering",
    icon: "🔄",
    tabId: "streamComparatorTab",
    launcherFunc: "showStreamComparatorTab",
    subsections: [
      { id: "streamComparatorMain", name: "Stream Comparator (HMB)", category: "Process Engineering", icon: "🔄", tabId: "streamComparatorTab", launcherFunc: "showStreamComparatorTab" }
    ]
  },
  {
    id: "chemicalSuite",
    name: "Chemistry & Chemical Suite",
    category: "Process Engineering",
    icon: "⚗️",
    tabId: "chemicalSuiteTab",
    launcherFunc: "showChemicalSuiteTab",
    subsections: [
      { id: "chemicalSafetySuite", name: "Chemistry & Chemical Suite", category: "Process Engineering", icon: "⚗️", tabId: "chemicalSuiteTab", launcherFunc: "showChemicalSuiteTab" }
    ]
  },
  {
    id: "unitConverter",
    name: "Plant & Integrity Unit Converters",
    category: "Utilities",
    icon: "📐",
    tabId: "unitConverterTab",
    launcherFunc: "showUnitConverterTab",
    subsections: [
      { id: "unitConverterMain", name: "Plant & Integrity Unit Converters", category: "Utilities", icon: "📐", tabId: "unitConverterTab", launcherFunc: "showUnitConverterTab" }
    ]
  },
  {
    id: "processFlow",
    name: "Process Flow Diagrams (PFD)",
    category: "Diagrams",
    icon: "🗺️",
    tabId: "processFlowModal",
    launcherFunc: "showPROCESSFLOWDIAGRAMSTab",
    subsections: [
      { id: "cduVdu", name: "CDU / VDU Distillation Unit", category: "Diagrams", icon: "🛢️", tabId: "cduVduModal", launcherFunc: "showCDUVDUTab" },
      { id: "atmospheric", name: "Hydroprocessing Unit (HCU)", category: "Diagrams", icon: "🔥", tabId: "processFlowModal", launcherFunc: "showPROCESSFLOWDIAGRAMSTab" },
      { id: "msp", name: "Motor Spirit Production (MSP)", category: "Diagrams", icon: "⛽", tabId: "mspModal", launcherFunc: "showMSPTab" },
      { id: "h2u", name: "Hydrogen Generation Unit (H2U)", category: "Diagrams", icon: "💨", tabId: "h2uModal", launcherFunc: "showH2UTab" }
    ]
  },
  {
    id: "ccdAI",
    name: "CCD AI Platform",
    category: "Integrity Management",
    icon: "🤖",
    tabId: "ccdAiTab",
    launcherFunc: "showCCDAITab",
    subsections: [
      { id: "ccdAiPlatform", name: "CCD AI Platform", category: "Integrity Management", icon: "🤖", tabId: "ccdAiTab", launcherFunc: "showCCDAITab" }
    ]
  },
  {
    id: "adminControlCenter",
    name: "Admin & Engineering Tools",
    category: "Governance & Tools",
    icon: "🛠️",
    tabId: "adminPanelTab",
    launcherFunc: "openTool",
    subsections: [
      { id: "userManagement", name: "User Management", category: "Tools", icon: "👤", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "users-list", group: "USERS & PERMISSIONS" },
      { id: "rbacPermissions", name: "Roles & Permissions", category: "Tools", icon: "🛡️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "roles-config", group: "USERS & PERMISSIONS" },
      { id: "accessControl", name: "Access Control", category: "Tools", icon: "🔒", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "access-control", group: "USERS & PERMISSIONS" },

      { id: "appOverview", name: "Applications Overview", category: "Tools", icon: "🎛️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-hub", group: "APPLICATION MANAGER" },
      { id: "appStream", name: "Stream Data Manager", category: "Tools", icon: "📊", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-stream", group: "APPLICATION MANAGER" },
      { id: "appStress", name: "Allowable Stress Manager", category: "Tools", icon: "🧮", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-stress", group: "APPLICATION MANAGER" },

      { id: "firestoreExplorer", name: "Firestore Collections Explorer", category: "Tools", icon: "🗄️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-firestore", group: "SYSTEMS" },
      { id: "sysDiagnostics", name: "Backup & Cloud Diagnostics", category: "Tools", icon: "⚙️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-diagnostics", group: "SYSTEMS" },
      { id: "projectSwitcher", name: "Project Switcher", category: "Tools", icon: "🔄", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-projects", group: "SYSTEMS" },
      { id: "activeSessions", name: "Active Sessions", category: "Tools", icon: "👤", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-sessions", group: "SYSTEMS" },
      { id: "systemLogs", name: "System Logs", category: "Tools", icon: "📋", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-logs", group: "SYSTEMS" },

      { id: "layoutBuilder", name: "Sidebar Configuration", category: "Tools", icon: "📑", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "layout-sidebar", group: "LAYOUT & NAVIGATION BUILDER" },
      { id: "sidebarOrder", name: "Sidebar Order", category: "Tools", icon: "↕️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sidebar-order", group: "LAYOUT & NAVIGATION BUILDER" },
      { id: "tickerText", name: "Ticker Text", category: "Tools", icon: "📢", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "ticker-text", group: "LAYOUT & NAVIGATION BUILDER" },
      { id: "welcomeCards", name: "Welcome Cards", category: "Tools", icon: "🎴", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "welcome-cards", group: "LAYOUT & NAVIGATION BUILDER" },
      { id: "navVisibility", name: "Navigation Visibility", category: "Tools", icon: "👁️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "nav-visibility", group: "LAYOUT & NAVIGATION BUILDER" },

      { id: "masterData", name: "Master Data Management", category: "Tools", icon: "🗃️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-overview", group: "MASTER DATA, BACKUP & LOGS" },
      { id: "jsonBackup", name: "1-Click JSON Backup", category: "Tools", icon: "⚡", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-backup", group: "MASTER DATA, BACKUP & LOGS" },
      { id: "jsonRestore", name: "JSON Restore", category: "Tools", icon: "🔄", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-restore", group: "MASTER DATA, BACKUP & LOGS" },
      { id: "backupHistory", name: "Backup History", category: "Tools", icon: "📜", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-history", group: "MASTER DATA, BACKUP & LOGS" },
      { id: "auditTrail", name: "Audit Trail", category: "Tools", icon: "🔍", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-audit", group: "MASTER DATA, BACKUP & LOGS" }
    ]
  }
];

/**
 * Filters the master AVAILABLE_MODULES catalog into an authorized navigation schema
 * based on verified role and permissions. Non-admin unauthorized modules and leaf tools
 * are completely omitted.
 */
export function filterAuthorizedNavigation(availableModules, allowedModules = {}, allowedSubsections = {}, isAdmin = false) {
  if (!availableModules || !Array.isArray(availableModules)) return [];
  if (isAdmin) {
    return JSON.parse(JSON.stringify(availableModules));
  }

  // Normalize allowedModules aliases
  const normAllowed = {};
  if (allowedModules && typeof allowedModules === "object") {
    Object.keys(allowedModules).forEach((k) => {
      let normKey = k;
      if (k === "damage" || k === "damageMechanisms" || k === "damageMechanism" || k === "api571" || k === "damageCatalog" || k === "card_damageExplorer" || k === "card_dmg") normKey = "damageExplorer";
      if (k === "cracking") normKey = "crackingMechanism";
      if (k === "b313" || k === "designThickness") normKey = "thicknessCalc";
      if (k === "tools") normKey = "adminControlCenter";
      if (k === "remainingLife") normKey = "api570";
      if (k === "stream" || k === "streams" || k === "streamData" || k === "streamBalance") normKey = "streamComparator";
      normAllowed[normKey] = allowedModules[k];
    });
  }

  const normSubsections = {};
  if (allowedSubsections && typeof allowedSubsections === "object") {
    Object.keys(allowedSubsections).forEach((k) => {
      let normKey = k;
      if (k === "damage" || k === "damageMechanisms" || k === "damageMechanism" || k === "api571") normKey = "damageExplorer";
      if (k === "cracking") normKey = "crackingMechanism";
      if (k === "b313" || k === "designThickness") normKey = "thicknessCalc";
      if (k === "tools") normKey = "adminControlCenter";
      if (k === "remainingLife") normKey = "api570";
      if (k === "stream" || k === "streams" || k === "streamData" || k === "streamBalance") normKey = "streamComparator";

      normSubsections[normKey] = {};
      const subObj = allowedSubsections[k];
      if (subObj && typeof subObj === "object") {
        Object.keys(subObj).forEach((sk) => {
          let normSubKey = sk;
          if (normKey === "adminControlCenter" && (sk === "app-stream" || sk === "streamData")) normSubKey = "appStream";
          if (normKey === "streamComparator" && sk === "stream") normSubKey = "streamComparatorMain";
          normSubsections[normKey][normSubKey] = subObj[sk];
        });
      }
    });
  }

  const result = [];
  for (const mod of availableModules) {
    const isModAllowed = normAllowed[mod.id] === true;
    const modSubs = normSubsections[mod.id] || {};

    let hasAnySubTrue = false;
    if (mod.subsections && Array.isArray(mod.subsections) && mod.subsections.length > 0) {
      for (const sub of mod.subsections) {
        if (modSubs[sub.id] === true) {
          hasAnySubTrue = true;
          break;
        }
        if (sub.isGroup && Array.isArray(sub.children)) {
          for (const child of sub.children) {
            if (modSubs[child.id] === true) {
              hasAnySubTrue = true;
              break;
            }
          }
        }
      }
    } else if (Object.values(modSubs).some(v => v === true)) {
      hasAnySubTrue = true;
    }

    if (!isModAllowed && !hasAnySubTrue) {
      continue;
    }

    let filteredSubs = [];
    if (mod.subsections && Array.isArray(mod.subsections) && mod.subsections.length > 0) {
      for (const sub of mod.subsections) {
        if (sub.isGroup && Array.isArray(sub.children)) {
          const isGroupAllowed = modSubs[sub.id] === true || (isModAllowed && modSubs[sub.id] !== false);
          const filteredChildren = sub.children.filter(child => {
            if (modSubs[child.id] === true) return true;
            if (modSubs[child.id] === false) return false;
            return isGroupAllowed;
          });
          if (filteredChildren.length > 0) {
            filteredSubs.push({
              ...sub,
              children: filteredChildren
            });
          }
        } else {
          if (modSubs[sub.id] === true || (isModAllowed && modSubs[sub.id] !== false)) {
            filteredSubs.push(sub);
          }
        }
      }
      if (filteredSubs.length === 0) continue;
    }

    result.push({
      ...mod,
      subsections: filteredSubs
    });
  }

  return result;
}

export function buildRolePermissions(role, customModules = {}, customSubsections = {}, customCrud = {}) {
  const allModulesTrue = {};
  const allSubsectionsTrue = {};

  AVAILABLE_MODULES.forEach((mod) => {
    allModulesTrue[mod.id] = true;
    allSubsectionsTrue[mod.id] = {};
    if (mod.subsections && mod.subsections.length > 0) {
      mod.subsections.forEach((sub) => {
        allSubsectionsTrue[mod.id][sub.id] = true;
        if (sub.isGroup && Array.isArray(sub.children)) {
          sub.children.forEach(child => {
            allSubsectionsTrue[mod.id][child.id] = true;
          });
        }
      });
    }
  });

  if (role === "admin") {
    return {
      modules: allModulesTrue,
      subsections: allSubsectionsTrue,
      permissions: getRoleCrudPermissions("admin")
    };
  }

  // Normalize customModules aliases (e.g. damageMechanisms, api571 -> damageExplorer)
  const normCustomModules = {};
  if (customModules && typeof customModules === "object") {
    Object.keys(customModules).forEach(k => {
      let normKey = k;
      if (k === "damage" || k === "damageMechanisms" || k === "damageMechanism" || k === "api571" || k === "damageCatalog" || k === "card_damageExplorer" || k === "card_dmg") normKey = "damageExplorer";
      if (k === "cracking") normKey = "crackingMechanism";
      if (k === "b313" || k === "designThickness") normKey = "thicknessCalc";
      if (k === "tools") normKey = "adminControlCenter";
      if (k === "remainingLife") normKey = "api570";
      if (k === "stream" || k === "streams" || k === "streamData" || k === "streamBalance") normKey = "streamComparator";
      normCustomModules[normKey] = customModules[k];
    });
  }

  const normCustomSubsections = {};
  if (customSubsections && typeof customSubsections === "object") {
    Object.keys(customSubsections).forEach(k => {
      let normKey = k;
      if (k === "damage" || k === "damageMechanisms" || k === "damageMechanism" || k === "api571" || k === "damageCatalog") normKey = "damageExplorer";
      if (k === "cracking") normKey = "crackingMechanism";
      if (k === "b313" || k === "designThickness") normKey = "thicknessCalc";
      if (k === "tools") normKey = "adminControlCenter";
      if (k === "remainingLife") normKey = "api570";
      if (k === "stream" || k === "streams" || k === "streamData" || k === "streamBalance") normKey = "streamComparator";

      normCustomSubsections[normKey] = {};
      const subObj = customSubsections[k];
      if (subObj && typeof subObj === "object") {
        Object.keys(subObj).forEach(sk => {
          let normSubKey = sk;
          if (normKey === "adminControlCenter" && (sk === "app-stream" || sk === "streamData")) normSubKey = "appStream";
          if (normKey === "streamComparator" && (sk === "stream")) normSubKey = "streamComparatorMain";
          normCustomSubsections[normKey][normSubKey] = subObj[sk];
        });
      }
    });
  }

  // Base preset modules
  let baseModules = {};
  let baseSubsections = {};

  const matrix = getRoleMatrix();
  const matrixRole = matrix[role] || (role === "engineer" ? matrix.lead_engineer : null);

  if (matrixRole) {
    baseModules = {};
    AVAILABLE_MODULES.forEach(mod => {
      baseModules[mod.id] = matrixRole[mod.id] === true;
    });
    baseSubsections = JSON.parse(JSON.stringify(allSubsectionsTrue));
    Object.keys(baseSubsections).forEach(m => {
      if (!baseModules[m]) {
        Object.keys(baseSubsections[m]).forEach(k => baseSubsections[m][k] = false);
      }
    });
    if (role === "viewer" && baseSubsections.api581) {
      baseSubsections.api581.corrosionRate = false;
      baseSubsections.api581.inventoryCalc = false;
      baseSubsections.api581.toxicCalc = false;
      baseSubsections.api581.cofCalculator = false;
      baseSubsections.api581.qpofCalculator = false;
      baseSubsections.api581.corrosionCalc = false;
    }
  } else if (role === "lead_engineer" || role === "engineer") {
    baseModules = { ...allModulesTrue };
    baseSubsections = JSON.parse(JSON.stringify(allSubsectionsTrue));
    baseModules.adminControlCenter = false;
    if (baseSubsections.adminControlCenter) {
      Object.keys(baseSubsections.adminControlCenter).forEach(k => baseSubsections.adminControlCenter[k] = false);
    }
  } else if (role === "inspector") {
    baseModules = {
      api570: true,
      damageExplorer: true,
      api581: true,
      thicknessCalc: true,
      crackingMechanism: true,
      bkStress: true,
      streamComparator: false,
      chemicalSuite: true,
      unitConverter: true,
      processFlow: true,
      ccdAI: false,
      adminControlCenter: false
    };
    baseSubsections = JSON.parse(JSON.stringify(allSubsectionsTrue));
    if (baseSubsections.adminControlCenter) {
      Object.keys(baseSubsections.adminControlCenter).forEach(k => baseSubsections.adminControlCenter[k] = false);
    }
    if (baseSubsections.streamComparator) {
      Object.keys(baseSubsections.streamComparator).forEach(k => baseSubsections.streamComparator[k] = false);
    }
    if (baseSubsections.ccdAI) {
      Object.keys(baseSubsections.ccdAI).forEach(k => baseSubsections.ccdAI[k] = false);
    }
  } else if (role === "viewer") {
    baseModules = {
      api570: true,
      damageExplorer: true,
      api581: true,
      thicknessCalc: false,
      crackingMechanism: false,
      bkStress: false,
      streamComparator: false,
      chemicalSuite: false,
      unitConverter: true,
      processFlow: true,
      ccdAI: false,
      adminControlCenter: false
    };
    baseSubsections = JSON.parse(JSON.stringify(allSubsectionsTrue));
    Object.keys(baseSubsections).forEach(m => {
      if (!baseModules[m]) {
        Object.keys(baseSubsections[m]).forEach(k => baseSubsections[m][k] = false);
      }
    });
    if (baseSubsections.api581) {
      baseSubsections.api581.corrosionRate = false;
      baseSubsections.api581.inventoryCalc = false;
      baseSubsections.api581.toxicCalc = false;
      baseSubsections.api581.cofCalculator = false;
      baseSubsections.api581.qpofCalculator = false;
      baseSubsections.api581.corrosionCalc = false;
    }
  } else {
    // Custom role: starts with empty/false defaults
    AVAILABLE_MODULES.forEach((mod) => {
      baseModules[mod.id] = false;
      baseSubsections[mod.id] = {};
      if (mod.subsections) {
        mod.subsections.forEach((sub) => {
          baseSubsections[mod.id][sub.id] = false;
          if (sub.isGroup && Array.isArray(sub.children)) {
            sub.children.forEach(child => {
              baseSubsections[mod.id][child.id] = false;
            });
          }
        });
      }
    });
  }

  // Ensure every available module and child exists in baseModules / baseSubsections
  AVAILABLE_MODULES.forEach((mod) => {
    if (baseModules[mod.id] === undefined) {
      baseModules[mod.id] = false;
    }
    if (!baseSubsections[mod.id]) baseSubsections[mod.id] = {};
    if (mod.subsections) {
      mod.subsections.forEach((sub) => {
        if (baseSubsections[mod.id][sub.id] === undefined) {
          baseSubsections[mod.id][sub.id] = false;
        }
        if (sub.isGroup && Array.isArray(sub.children)) {
          sub.children.forEach(child => {
            if (baseSubsections[mod.id][child.id] === undefined) {
              baseSubsections[mod.id][child.id] = false;
            }
          });
        }
      });
    }
  });

  // Apply custom module overrides whenever provided
  if (normCustomModules && typeof normCustomModules === "object" && Object.keys(normCustomModules).length > 0) {
    AVAILABLE_MODULES.forEach((mod) => {
      if (typeof normCustomModules[mod.id] === "boolean") {
        baseModules[mod.id] = normCustomModules[mod.id];
        if (normCustomModules[mod.id] === false && baseSubsections[mod.id]) {
          Object.keys(baseSubsections[mod.id]).forEach(k => {
            baseSubsections[mod.id][k] = false;
          });
        } else if (normCustomModules[mod.id] === true && baseSubsections[mod.id] && mod.id !== "adminControlCenter") {
          // When a non-admin module is enabled, default its subsections & group children to true unless explicitly false in normCustomSubsections
          Object.keys(baseSubsections[mod.id]).forEach(k => {
            if (!normCustomSubsections[mod.id] || normCustomSubsections[mod.id][k] !== false) {
              baseSubsections[mod.id][k] = true;
            }
          });
        }
      }
    });
  }

  // Apply custom subsection overrides for any subsection keys (including granular action/tab permissions and group children)
  if (normCustomSubsections && typeof normCustomSubsections === "object") {
    Object.keys(normCustomSubsections).forEach(modId => {
      if (!baseSubsections[modId]) baseSubsections[modId] = {};
      const subObj = normCustomSubsections[modId];
      if (subObj && typeof subObj === "object") {
        Object.keys(subObj).forEach(subId => {
          if (typeof subObj[subId] === "boolean") {
            baseSubsections[modId][subId] = subObj[subId];
          }
        });
      }
    });
  }

  // Propagate group-level permissions to children if child wasn't explicitly overridden
  AVAILABLE_MODULES.forEach((mod) => {
    if (mod.subsections && baseSubsections[mod.id]) {
      mod.subsections.forEach((sub) => {
        if (sub.isGroup && Array.isArray(sub.children)) {
          const explicitSubObj = (normCustomSubsections && normCustomSubsections[mod.id]) || {};
          const groupAllowed = baseSubsections[mod.id][sub.id] === true || (baseModules[mod.id] === true && explicitSubObj[sub.id] !== false);
          sub.children.forEach((child) => {
            if (typeof explicitSubObj[child.id] === "boolean") {
              baseSubsections[mod.id][child.id] = explicitSubObj[child.id];
            } else {
              baseSubsections[mod.id][child.id] = groupAllowed;
            }
          });
          // Sync group flag if any child is true
          if (sub.children.some(c => baseSubsections[mod.id][c.id] === true)) {
            baseSubsections[mod.id][sub.id] = true;
          }
        }
      });
    }

    if (normCustomModules && normCustomModules[mod.id] === false) {
      baseModules[mod.id] = false;
      if (baseSubsections[mod.id]) {
        Object.keys(baseSubsections[mod.id]).forEach(k => {
          baseSubsections[mod.id][k] = false;
        });
      }
    } else if (baseSubsections[mod.id]) {
      const hasAnySubTrue = Object.values(baseSubsections[mod.id]).some(Boolean);
      if (hasAnySubTrue) {
        baseModules[mod.id] = true;
      }
    }
  });

  return {
    modules: baseModules,
    subsections: baseSubsections,
    permissions: getRoleCrudPermissions(role, customCrud)
  };
}

let rolesSeededFlag = false;
export async function syncRolesCollectionToFirestore(dbInstance = null) {
  const db = dbInstance || getAdminFirestore();
  const roleKeys = ["admin", "lead_engineer", "inspector", "viewer"];
  const rolesCatalog = {};

  for (const rKey of roleKeys) {
    const built = buildRolePermissions(rKey);
    const meta = ROLE_METADATA[rKey] || { id: rKey, role: rKey, label: rKey.toUpperCase(), description: "" };
    rolesCatalog[rKey] = {
      id: rKey,
      role: rKey,
      label: meta.label,
      description: meta.description,
      permissions: built.permissions,
      allowedModules: built.modules,
      subsections: built.subsections,
      updatedAt: Date.now()
    };
  }

  if (db) {
    try {
      for (const [rKey, roleDoc] of Object.entries(rolesCatalog)) {
        await db.collection("roles").doc(rKey).set(roleDoc, { merge: true });
      }
      rolesSeededFlag = true;
    } catch (err) {
      console.warn("[RBAC] syncRolesCollectionToFirestore warning:", err?.message || String(err));
    }
  }

  return rolesCatalog;
}

// In-memory cache for fast fallback
export const userRolesCache = new Map();

// Default Super Admin email
export const SUPER_ADMIN_EMAIL = "avijitkayet97@gmail.com";
export const SUPER_ADMIN_EMAILS = new Set([
  "avijitkayet97@gmail.com",
  "kayetavijit97@gmail.com"
]);

export function isSuperAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  return SUPER_ADMIN_EMAILS.has(email.toLowerCase().trim());
}

export const DELETED_USERS_FILE = path.resolve(__dirname, "../data/secure/deleted_users.json");
export const deletedUsersCache = new Set();

export function loadDeletedUsersFromFile() {
  try {
    ensureDirExists(DELETED_USERS_FILE);
    if (fs.existsSync(DELETED_USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_USERS_FILE, "utf8"));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("Failed to read deleted users file:", err.message);
  }
  return [];
}

export function saveDeletedUsersToFile(deletedList) {
  try {
    ensureDirExists(DELETED_USERS_FILE);
    fs.writeFileSync(DELETED_USERS_FILE, JSON.stringify(deletedList, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to write deleted users file:", err.message);
  }
}

function initBootstrapDeletedUsers() {
  const list = loadDeletedUsersFromFile();
  list.forEach(item => {
    const email = typeof item === "string" ? item : item?.email;
    if (email) deletedUsersCache.add(email.toLowerCase().trim());
  });
}
initBootstrapDeletedUsers();

export async function isUserDeleted(email) {
  const target = (email || "").toLowerCase().trim();
  if (!target) return false;
  if (isSuperAdminEmail(target)) return false;
  if (deletedUsersCache.has(target)) return true;

  const db = getAdminFirestore();
  if (db) {
    try {
      const snap = await db.collection("deletedUsers").doc(target).get();
      if (snap && snap.exists) {
        deletedUsersCache.add(target);
        return true;
      }
    } catch (e) {}
  }
  return false;
}

export async function markUserDeleted(email, deletedBy = "") {
  const target = (email || "").toLowerCase().trim();
  if (!target || isSuperAdminEmail(target)) return;

  deletedUsersCache.add(target);

  const fileList = loadDeletedUsersFromFile();
  const idx = fileList.findIndex(item => (typeof item === "string" ? item : item?.email).toLowerCase().trim() === target);
  const record = { email: target, deletedAt: Date.now(), deletedBy };
  if (idx >= 0) {
    fileList[idx] = record;
  } else {
    fileList.push(record);
  }
  saveDeletedUsersToFile(fileList);

  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection("deletedUsers").doc(target).set(record, { merge: true });
    } catch (e) {}
  }
}

export async function markUserRestored(email) {
  const target = (email || "").toLowerCase().trim();
  if (!target) return;

  deletedUsersCache.delete(target);

  const fileList = loadDeletedUsersFromFile();
  const filtered = fileList.filter(item => (typeof item === "string" ? item : item?.email).toLowerCase().trim() !== target);
  saveDeletedUsersToFile(filtered);

  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection("deletedUsers").doc(target).delete();
    } catch (e) {}
  }
}

export function loadUsersFromFile() {
  try {
    ensureDirExists(USERS_FILE);
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
      if (Array.isArray(data)) {
        return data.filter(u => u && typeof u.email === "string" && u.email.trim().length > 0);
      }
    }
  } catch (err) {
    console.warn("Failed to read users file:", err.message);
  }
  return [];
}

export function saveUsersToFile(users) {
  try {
    ensureDirExists(USERS_FILE);
    const validUsers = Array.isArray(users)
      ? users.filter(u => u && typeof u.email === "string" && u.email.trim().length > 0)
      : [];
    fs.writeFileSync(USERS_FILE, JSON.stringify(validUsers, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to write users file:", err.message);
  }
}

// Initial bootstrap of userRolesCache from file or seeds
function initBootstrapUsers() {
  let fileUsers = loadUsersFromFile();
  const adminPerms = buildRolePermissions("admin");
  let changed = false;

  for (const superEmail of SUPER_ADMIN_EMAILS) {
    if (!fileUsers.some(u => u && u.email && u.email.toLowerCase().trim() === superEmail)) {
      fileUsers.push({
        id: superEmail,
        email: superEmail,
        role: "admin",
        allowedModules: adminPerms.modules,
        subsections: adminPerms.subsections,
        isSuperAdmin: true,
        hasAuthAccount: true,
        updatedAt: Date.now()
      });
      changed = true;
    }
  }

  if (changed || fileUsers.length === 0) {
    saveUsersToFile(fileUsers);
  }

  fileUsers.forEach((u) => {
    if (u && u.email) {
      userRolesCache.set(u.email.toLowerCase().trim(), u);
    }
  });
}

initBootstrapUsers();

function parseFirestoreRestValue(valObj) {
  if (!valObj || typeof valObj !== "object") return undefined;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("booleanValue" in valObj) return Boolean(valObj.booleanValue);
  if ("integerValue" in valObj) return Number(valObj.integerValue);
  if ("doubleValue" in valObj) return Number(valObj.doubleValue);
  if ("nullValue" in valObj) return null;
  if ("timestampValue" in valObj) return new Date(valObj.timestampValue).getTime();
  if ("arrayValue" in valObj) {
    return (valObj.arrayValue.values || []).map(parseFirestoreRestValue);
  }
  if ("mapValue" in valObj) {
    const out = {};
    const fields = valObj.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

async function fetchUserRoleViaRest(targetEmail, idToken, uid = "") {
  if (!idToken) return null;
  const projectId = process.env.FIREBASE_PROJECT_ID || "loginapp-feb72";
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const pathsToTry = [
    `userRoles/${encodeURIComponent(targetEmail)}`,
    ...(uid ? [`users/${encodeURIComponent(uid)}`] : []),
    `users/${encodeURIComponent(targetEmail)}`
  ];

  for (const relPath of pathsToTry) {
    try {
      const resp = await fetch(`${baseUrl}/${relPath}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Accept": "application/json"
        }
      });
      if (resp.ok) {
        const docJson = await resp.json();
        if (docJson && docJson.fields) {
          const parsed = parseFirestoreRestValue({ mapValue: { fields: docJson.fields } });
          if (parsed && typeof parsed === "object") {
            return parsed;
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

export async function getUserRbacData(email, options = {}) {
  if (!email) return null;
  const targetEmail = String(email).toLowerCase().trim();

  // 0. If user is deleted/blacklisted, return null
  if (await isUserDeleted(targetEmail)) {
    return null;
  }

  let roleData = null;

  // 1. Read from live Firestore via Admin SDK or Bridge
  const db = getAdminFirestore();
  if (db) {
    try {
      const snap = await db.collection("userRoles").doc(targetEmail).get();
      if (snap && snap.exists) {
        roleData = snap.data();
        userRolesCache.set(targetEmail, roleData);
      }
    } catch (err) {
      console.warn("Admin Firestore getUserRbacData note:", err?.message || String(err));
    }
  }

  // 2. If Admin SDK unavailable or doc not yet resolved, try Firestore REST API with verified idToken
  if (!roleData && options?.idToken) {
    roleData = await fetchUserRoleViaRest(targetEmail, options.idToken, options.uid);
    if (roleData) {
      userRolesCache.set(targetEmail, roleData);
    }
  }

  // 3. Fallback to in-memory cache and persistent local users.json store
  if (!roleData && userRolesCache.has(targetEmail)) {
    roleData = userRolesCache.get(targetEmail);
  }

  if (!roleData) {
    const fileUsers = loadUsersFromFile();
    const found = fileUsers.find(u => u && u.email && u.email.toLowerCase().trim() === targetEmail);
    if (found) {
      roleData = found;
      userRolesCache.set(targetEmail, roleData);
    }
  }

  // 4. Bootstrap Super Admin if matching primary admin email
  if (!roleData && isSuperAdminEmail(targetEmail)) {
    const adminPerms = buildRolePermissions("admin");
    roleData = {
      id: targetEmail,
      email: targetEmail,
      role: "admin",
      allowedModules: adminPerms.modules,
      subsections: adminPerms.subsections,
      isSuperAdmin: true,
      hasAuthAccount: true,
      updatedAt: Date.now()
    };
    userRolesCache.set(targetEmail, roleData);
  }

  // If user not found in userRoles collection or cache, return null
  if (!roleData) {
    return null;
  }

  const resolvedPassword = roleData.password || roleData.assignedPassword || roleData.temporaryPassword || "";
  const isUserAdmin = roleData.role === "admin" || roleData.isSuperAdmin === true || isSuperAdminEmail(targetEmail);

  let allowedModules = roleData.allowedModules || {};
  let subsections = roleData.subsections || {};
  let crudPermissions = getRoleCrudPermissions(isUserAdmin ? "admin" : (roleData.role || "viewer"), roleData.permissions);

  if (isUserAdmin) {
    const adminPerms = buildRolePermissions("admin");
    allowedModules = { ...adminPerms.modules, ...allowedModules };
    subsections = { ...adminPerms.subsections, ...subsections };
    crudPermissions = getRoleCrudPermissions("admin");
  } else {
    const normalizedPerms = buildRolePermissions(
      roleData.role || "lead_engineer",
      allowedModules,
      subsections,
      roleData.permissions
    );
    allowedModules = normalizedPerms.modules;
    subsections = normalizedPerms.subsections;
    crudPermissions = normalizedPerms.permissions;
  }

  // Ensure Firestore roles collection is initialized in background
  if (db && !rolesSeededFlag) {
    syncRolesCollectionToFirestore(db).catch(() => {});
  }

  const authorizedNav = filterAuthorizedNavigation(
    AVAILABLE_MODULES,
    allowedModules,
    subsections,
    isUserAdmin
  );

  return {
    email: targetEmail,
    role: isUserAdmin ? "admin" : (roleData.role || "viewer"),
    isSuperAdmin: isUserAdmin,
    permissions: crudPermissions,
    allowedModules: allowedModules,
    subsections: subsections,
    availableModules: isUserAdmin ? AVAILABLE_MODULES : authorizedNav,
    authorizedNavigation: authorizedNav,
    authUid: roleData.authUid || options?.uid || "",
    password: resolvedPassword
  };
}

/**
 * Reusable Backend RBAC & Session Verification Middleware Helper
 * Validates Firebase ID token / Server Session and checks role CRUD permissions (`read`, `write`, `edit`, `delete`, `admin`).
 * Automatically sends 401 Unauthorized or 403 Forbidden if check fails.
 */
export async function verifyRequestRbac(req, res, options = {}) {
  const { requiredPermission = "read", moduleId = null, sectionId = null } = options;
  const identity = await verifyServerIdentity(req);

  if (!identity || !identity.verified || !identity.email) {
    if (res && !res.headersSent) {
      res.status(401).json({
        success: false,
        error: "Unauthorized: Valid Firebase Authentication token or active server session is required.",
        reason: identity?.reason || "unauthenticated"
      });
    }
    return { authorized: false, status: 401, reason: "unauthenticated" };
  }

  const email = identity.email.toLowerCase().trim();
  const rbacData = await getUserRbacData(email, {
    idToken: identity.idToken || "",
    uid: identity.uid || ""
  });

  if (!rbacData) {
    if (res && !res.headersSent) {
      res.status(403).json({
        success: false,
        error: "Forbidden: User account does not have active RBAC privileges or has been revoked.",
        reason: "no_rbac_record"
      });
    }
    return { authorized: false, status: 403, reason: "no_rbac_record" };
  }

  const isAdmin = Boolean(rbacData.isSuperAdmin || rbacData.role === "admin");
  const perms = rbacData.permissions || getRoleCrudPermissions(rbacData.role);

  if (requiredPermission === "admin" && !isAdmin) {
    if (res && !res.headersSent) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Administrator privileges required. Current role '${rbacData.role}' is not authorized.`,
        role: rbacData.role,
        requiredPermission: "admin"
      });
    }
    return { authorized: false, status: 403, role: rbacData.role };
  }

  if (!isAdmin && requiredPermission && perms[requiredPermission] !== true) {
    if (res && !res.headersSent) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Role '${rbacData.role}' does not have '${requiredPermission}' permission for this operation.`,
        role: rbacData.role,
        permissions: perms,
        requiredPermission
      });
    }
    return { authorized: false, status: 403, role: rbacData.role };
  }

  if (!isAdmin && moduleId) {
    const hasMod = rbacData.allowedModules && rbacData.allowedModules[moduleId] === true;
    const hasSub = sectionId && rbacData.subsections && rbacData.subsections[moduleId] && rbacData.subsections[moduleId][sectionId] === true;
    if (!hasMod && !hasSub) {
      if (res && !res.headersSent) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Role '${rbacData.role}' does not have access to module '${moduleId}'.`,
          role: rbacData.role,
          moduleId
        });
      }
      return { authorized: false, status: 403, role: rbacData.role };
    }
  }

  return {
    authorized: true,
    status: 200,
    email,
    uid: identity.uid || rbacData.authUid || "",
    role: rbacData.role,
    isSuperAdmin: isAdmin,
    permissions: perms,
    rbacData
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const method = req.method;
  const payload = method === "GET" ? req.query : req.body || {};
  const action = (payload.action || "get_my_permissions").toLowerCase();
  const identity = await verifyServerIdentity(req);
  const callerEmail = (identity && identity.verified && identity.email)
    ? identity.email.toLowerCase().trim()
    : "";
  let targetEmail = (payload.targetEmail || payload.email || callerEmail || "").toLowerCase().trim();

  const db = getAdminFirestore();

  const identityOpts = {
    idToken: identity?.idToken || "",
    uid: identity?.uid || ""
  };

  // Server-side identity & authority verification
  const callerRecord = callerEmail ? await getUserRbacData(callerEmail, identityOpts) : null;
  const isCallerAdmin = Boolean(callerRecord && (callerRecord.role === "admin" || callerRecord.isSuperAdmin));

  // Enforce server-side RBAC for administrative operations
  if (action === "list_users" || action === "update_user_role" || action === "save_permissions" || action === "delete_user_role") {
    if (!identity || !identity.verified || !callerEmail) {
      return res.status(401).json({
        error: "Authentication required. Please provide a valid Firebase ID token or active server session.",
        reason: identity?.reason || "unauthenticated"
      });
    }
    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Access Denied. Administrator privileges required." });
    }
  }

  // Prevent non-admins from querying other users' permissions when authenticated as a different user
  if ((action === "get_my_permissions" || action === "get_permissions") && !isCallerAdmin && callerEmail) {
    targetEmail = callerEmail;
  }

  // 0. Get available modules & role templates catalog (backed by Firestore 'roles' collection)
  if (action === "get_modules" || action === "get_available_modules" || action === "get_role_templates" || action === "get_roles") {
    const rolesCatalog = await syncRolesCollectionToFirestore(db);
    return res.status(200).json({
      success: true,
      availableModules: AVAILABLE_MODULES,
      roles: ["admin", "lead_engineer", "inspector", "viewer"],
      rolesCollection: rolesCatalog,
      roleTemplates: {
        admin: buildRolePermissions("admin"),
        manager: buildRolePermissions("lead_engineer"),
        lead_engineer: buildRolePermissions("lead_engineer"),
        engineer: buildRolePermissions("lead_engineer"),
        inspector: buildRolePermissions("inspector"),
        viewer: buildRolePermissions("viewer")
      }
    });
  }

  // 1. Get current user's permissions
  if (action === "get_my_permissions" || action === "get_permissions") {
    let rbacData = (targetEmail === callerEmail && callerRecord)
      ? callerRecord
      : (targetEmail ? await getUserRbacData(targetEmail, identityOpts) : null);
    if (!rbacData) {
      const fallbackRole = isSuperAdminEmail(targetEmail) ? "admin" : "viewer";
      const isSuper = fallbackRole === "admin";
      const defaultPerms = buildRolePermissions(fallbackRole);
      const authorizedNav = filterAuthorizedNavigation(
        AVAILABLE_MODULES,
        defaultPerms.modules,
        defaultPerms.subsections,
        isSuper
      );
      rbacData = {
        email: targetEmail || "",
        role: fallbackRole,
        isSuperAdmin: isSuper,
        permissions: defaultPerms.permissions,
        allowedModules: defaultPerms.modules,
        subsections: defaultPerms.subsections,
        availableModules: AVAILABLE_MODULES,
        authorizedNavigation: authorizedNav
      };
    }
    return res.status(200).json({
      success: true,
      ...rbacData,
      roleTemplates: {
        admin: buildRolePermissions("admin"),
        lead_engineer: buildRolePermissions("lead_engineer"),
        inspector: buildRolePermissions("inspector"),
        viewer: buildRolePermissions("viewer")
      }
    });
  }

  // 2. List all users and their roles (Admin only)
  if (action === "list_users") {
    let usersList = [];
    if (db) {
      try {
        await syncRolesCollectionToFirestore(db);
        const snap = await db.collection("userRoles").get();
        snap.forEach((doc) => {
          usersList.push(doc.data());
        });
      } catch (err) {
        console.warn("Firestore Admin list_users notice:", err.message);
      }
    }

    const fileUsers = loadUsersFromFile();
    fileUsers.forEach((fu) => {
      const email = (fu.email || fu.id || "").toLowerCase().trim();
      if (email && !usersList.some(u => u.email && u.email.toLowerCase().trim() === email)) {
        usersList.push(fu);
      }
    });

    userRolesCache.forEach((val, key) => {
      const email = key.toLowerCase().trim();
      if (email && !usersList.some(u => u.email && u.email.toLowerCase().trim() === email)) {
        usersList.push(val);
      }
    });

    // Enrich with CRUD permissions
    usersList = usersList.map((u) => ({
      ...u,
      permissions: getRoleCrudPermissions(u.isSuperAdmin || u.role === "admin" ? "admin" : (u.role || "viewer"), u.permissions)
    }));

    // Update file & cache
    saveUsersToFile(usersList);
    usersList.forEach((u) => {
      if (u.email) userRolesCache.set(u.email.toLowerCase().trim(), u);
    });

    // Sanitize sensitive credentials before returning to client
    const sanitizedUsers = usersList.map((u) => {
      const { password, ...safeUser } = u;
      return safeUser;
    });

    return res.status(200).json({
      success: true,
      users: sanitizedUsers,
      availableModules: AVAILABLE_MODULES
    });
  }

  // 3. Save or update user role & permissions (Admin only)
  if (action === "update_user_role" || action === "save_permissions") {
    if (!targetEmail) {
      return res.status(400).json({ error: "Target email is required" });
    }

    const newRole = payload.role || "lead_engineer";
    const customModules = payload.allowedModules || {};
    const customSubsections = payload.subsections || {};
    const customCrud = payload.permissions || {};

    const finalPerms = buildRolePermissions(newRole, customModules, customSubsections, customCrud);

    const record = {
      id: targetEmail,
      email: targetEmail,
      role: newRole,
      permissions: finalPerms.permissions,
      allowedModules: finalPerms.modules,
      subsections: finalPerms.subsections,
      isSuperAdmin: newRole === "admin",
      updatedBy: callerEmail || "system",
      updatedAt: Date.now()
    };

    userRolesCache.set(targetEmail, record);

    // Save to file
    const fileUsers = loadUsersFromFile();
    const existingIdx = fileUsers.findIndex((u) => u.email && u.email.toLowerCase().trim() === targetEmail);
    if (existingIdx >= 0) {
      fileUsers[existingIdx] = { ...fileUsers[existingIdx], ...record };
    } else {
      fileUsers.push(record);
    }
    saveUsersToFile(fileUsers);

    // Save to Firestore userRoles and users collections (Admin SDK first)
    let firestorePersisted = false;
    if (db) {
      try {
        await db.collection("userRoles").doc(targetEmail).set(record, { merge: true });
        await db.collection("users").doc(targetEmail).set({
          uid: record.authUid || targetEmail,
          email: targetEmail,
          role: newRole,
          permissions: finalPerms.permissions,
          isSuperAdmin: newRole === "admin",
          updatedAt: Date.now()
        }, { merge: true });
        firestorePersisted = true;
      } catch (adminErr) {
        console.warn("Admin SDK userRoles update note:", adminErr?.message || String(adminErr));
      }
    }

    return res.status(200).json({
      success: true,
      message: `Permissions updated successfully for ${targetEmail}`,
      user: record
    });
  }

  // 4. Delete a user role record (Reverts to standard default)
  if (action === "delete_user_role") {
    if (!targetEmail) {
      return res.status(400).json({ error: "Missing target email" });
    }

    userRolesCache.delete(targetEmail);

    const fileUsers = loadUsersFromFile();
    const filtered = fileUsers.filter((u) => u.email && u.email.toLowerCase().trim() !== targetEmail);
    saveUsersToFile(filtered);

    let firestoreDeleted = false;
    if (db) {
      try {
        await db.collection("userRoles").doc(targetEmail).delete();
        await db.collection("users").doc(targetEmail).delete();
        firestoreDeleted = true;
      } catch (err) {}
    }

    return res.status(200).json({
      success: true,
      message: `Role removed for ${targetEmail}`
    });
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}
