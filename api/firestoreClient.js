/**
 * Unified Multi-Project Firestore & Firebase Service Client for Kayet DMS
 * Primary cloud integration: loginapp-feb72
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, deleteDoc, setLogLevel } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
  getAdminApp,
  getAdminFirestore,
  isAdminConfigured,
  getAdminStatus
} from "./firebaseAdmin.js";

// Silence noisy internal @firebase/firestore gRPC stream logs (e.g. idle Listen disconnect & handled permission checks)
try {
  setLogLevel("silent");
} catch (e) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACTIVE_PROJECT_FILE = path.resolve(__dirname, "../data/secure/active_project.json");
const CUSTOM_PROJECTS_FILE = path.resolve(__dirname, "../data/secure/custom_projects.json");
const ACTIVE_WORKSPACE_FILE = path.resolve(__dirname, "../data/secure/active_workspace.json");

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Built-in standard project profiles
export const STANDARD_PROJECTS = {
  "loginapp-feb72": {
    id: "loginapp-feb72",
    name: "LoginApp Feb72 (Primary Cloud Project)",
    projectId: "loginapp-feb72",
    apiKey: "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk",
    authDomain: "loginapp-feb72.firebaseapp.com",
    firestoreDatabaseId: "(default)",
    storageBucket: "loginapp-feb72.firebasestorage.app",
    messagingSenderId: "743648198302",
    appId: "1:743648198302:web:fe5a2cb3f81d2a31f5458f",
    description: "Primary user authentication and cloud engineering workspace.",
    tag: "Active Default",
    isDefault: true
  }
};

// Built-in engineering plant workspaces
export const STANDARD_WORKSPACES = [
  { id: "ws_cdu_vdu", name: "Crude Distillation Unit (CDU / VDU)", unitType: "Refinery Crude Processing", defaultFluid: "Crude Oil (API 32)", streamCount: 24, status: "Active" },
  { id: "ws_hcu", name: "Hydrocracker Unit (HCU Complex)", unitType: "High Pressure Hydroprocessing", defaultFluid: "Sour Gas / Gas Oil", streamCount: 18, status: "Active" },
  { id: "ws_h2u", name: "Hydrogen Generation Unit (H2U)", unitType: "Steam Methane Reforming", defaultFluid: "Synthesis Gas (H2/CO)", streamCount: 12, status: "Active" },
  { id: "ws_msp", name: "Motor Spirit Plant (MSP Gasoline Pool)", unitType: "Gasoline Blending & Treatment", defaultFluid: "Motor Spirit Blend", streamCount: 8, status: "Active" }
];

export async function getLiveWorkspaces() {
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection("streamDatasets").get();
      if (!snap.empty) {
        const list = [];
        snap.forEach(docSnap => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.title || docSnap.id,
            unitType: d.unitType || "Refinery Process Unit",
            defaultFluid: d.defaultFluid || "Process Stream",
            streamCount: d.streamCount || (d.streams ? d.streams.length : 0),
            status: "Active"
          });
        });
        if (list.length > 0) return list;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live workspaces from Firestore:", err.message);
  }
  return STANDARD_WORKSPACES;
}

export function getCustomProjects() {
  try {
    ensureDirExists(CUSTOM_PROJECTS_FILE);
    if (fs.existsSync(CUSTOM_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_PROJECTS_FILE, "utf8")) || [];
    }
  } catch (err) {
    console.warn("Failed to load custom_projects.json:", err.message);
  }
  return [];
}

export function saveCustomProject(project) {
  ensureDirExists(CUSTOM_PROJECTS_FILE);
  const list = getCustomProjects().filter(p => p.id !== project.id);
  list.push({
    ...project,
    tag: "Custom Workspace",
    updatedAt: Date.now()
  });
  fs.writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(list, null, 2), "utf8");
  return list;
}

export function deleteCustomProject(projectId) {
  ensureDirExists(CUSTOM_PROJECTS_FILE);
  const list = getCustomProjects().filter(p => p.id !== projectId);
  fs.writeFileSync(CUSTOM_PROJECTS_FILE, JSON.stringify(list, null, 2), "utf8");
  return list;
}

export function getAllAvailableProjects() {
  const customs = getCustomProjects();
  const all = { ...STANDARD_PROJECTS };
  customs.forEach(cp => {
    all[cp.id] = cp;
  });
  return Object.values(all);
}

export function getActiveProjectConfig() {
  try {
    if (fs.existsSync(ACTIVE_PROJECT_FILE)) {
      const saved = JSON.parse(fs.readFileSync(ACTIVE_PROJECT_FILE, "utf8"));
      if (saved && saved.projectId) {
        return saved;
      }
    }
  } catch (err) {
    console.warn("Failed to read active_project.json:", err.message);
  }
  try {
    const appletCfgPath = path.resolve(__dirname, "../firebase-applet-config.json");
    if (fs.existsSync(appletCfgPath)) {
      const appletCfg = JSON.parse(fs.readFileSync(appletCfgPath, "utf8"));
      if (appletCfg && appletCfg.projectId) {
        const rawDbId = appletCfg.firestoreDatabaseId;
        const normalizedDbId = (!rawDbId || rawDbId.startsWith("ai-studio-")) ? "(default)" : rawDbId;
        return {
          id: appletCfg.projectId,
          name: "LoginApp Feb72 (Primary Cloud Project)",
          ...appletCfg,
          firestoreDatabaseId: normalizedDbId,
          tag: "Active Default"
        };
      }
    }
  } catch (err) {
    console.warn("Failed to read firebase-applet-config.json:", err.message);
  }
  return STANDARD_PROJECTS["loginapp-feb72"];
}

export function getActiveWorkspaceConfig() {
  try {
    if (fs.existsSync(ACTIVE_WORKSPACE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(ACTIVE_WORKSPACE_FILE, "utf8"));
      if (saved && saved.id) return saved;
    }
  } catch (err) {
    console.warn("Failed to read active_workspace.json:", err.message);
  }
  return STANDARD_WORKSPACES[0];
}

export function setActiveWorkspace(workspaceId) {
  ensureDirExists(ACTIVE_WORKSPACE_FILE);
  const ws = STANDARD_WORKSPACES.find(w => w.id === workspaceId) || { id: workspaceId, name: workspaceId };
  fs.writeFileSync(ACTIVE_WORKSPACE_FILE, JSON.stringify(ws, null, 2), "utf8");
  return ws;
}

// Active singleton instances
let appInstance = null;
let dbInstance = null;
let authInstance = null;
let currentActiveProjectId = null;

export function setActiveProject(projectId) {
  const allProjects = getAllAvailableProjects();
  const target = allProjects.find(p => p.id === projectId || p.projectId === projectId);
  if (!target) {
    throw new Error(`Project profile '${projectId}' not found in registered projects.`);
  }

  ensureDirExists(ACTIVE_PROJECT_FILE);
  fs.writeFileSync(ACTIVE_PROJECT_FILE, JSON.stringify(target, null, 2), "utf8");

  // Reset instances so next query binds to new project
  appInstance = null;
  dbInstance = null;
  authInstance = null;
  currentActiveProjectId = target.projectId;

  return target;
}

export function getFirebaseApp() {
  const active = getActiveProjectConfig();
  if (appInstance && currentActiveProjectId === active.projectId) {
    return appInstance;
  }

  const appName = `kayet_app_${active.projectId.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const existingApps = getApps();
  const existing = existingApps.find(a => a.name === appName);
  if (existing) {
    appInstance = existing;
  } else {
    appInstance = initializeApp({
      apiKey: active.apiKey,
      authDomain: active.authDomain,
      projectId: active.projectId,
      storageBucket: active.storageBucket,
      messagingSenderId: active.messagingSenderId,
      appId: active.appId
    }, appName);
  }
  currentActiveProjectId = active.projectId;
  return appInstance;
}

export function getFirestoreDb() {
  const active = getActiveProjectConfig();
  if (dbInstance && currentActiveProjectId === active.projectId) {
    return dbInstance;
  }
  const app = getFirebaseApp();
  const dbId = active.firestoreDatabaseId && active.firestoreDatabaseId !== "(default)"
    ? active.firestoreDatabaseId
    : null;
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  return dbInstance;
}

export function getFirebaseAuth() {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  authInstance = getAuth(app);
  return authInstance;
}

export function isClientAuthSignedIn() {
  try {
    const auth = getFirebaseAuth();
    return Boolean(auth && auth.currentUser);
  } catch (e) {
    return false;
  }
}

export async function testProjectConnection(targetConfig) {
  const startTime = Date.now();
  const tempName = `test_conn_${Date.now()}`;
  let tempApp = null;
  try {
    tempApp = initializeApp({
      apiKey: targetConfig.apiKey,
      authDomain: targetConfig.authDomain,
      projectId: targetConfig.projectId,
      storageBucket: targetConfig.storageBucket,
      messagingSenderId: targetConfig.messagingSenderId,
      appId: targetConfig.appId
    }, tempName);

    const dbId = targetConfig.firestoreDatabaseId && targetConfig.firestoreDatabaseId !== "(default)"
      ? targetConfig.firestoreDatabaseId
      : null;
    const tempDb = dbId ? getFirestore(tempApp, dbId) : getFirestore(tempApp);

    // Perform a lightweight probe only if authenticated, otherwise verify app init
    let snap = null;
    if (isClientAuthSignedIn()) {
      const probeDoc = doc(tempDb, "systemMeta", "stressDataMaster");
      snap = await getDoc(probeDoc).catch(() => null);
    }
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      latencyMs,
      projectId: targetConfig.projectId,
      databaseId: dbId,
      documentFound: snap ? snap.exists() : false,
      message: `Successfully connected to ${targetConfig.projectId} (${latencyMs}ms)`
    };
  } catch (err) {
    return {
      success: false,
      projectId: targetConfig.projectId,
      error: err.message || String(err),
      latencyMs: Date.now() - startTime
    };
  } finally {
    if (tempApp) {
      deleteApp(tempApp).catch(() => {});
    }
  }
}

export const FIREBASE_CONFIG = getActiveProjectConfig();
export const FIRESTORE_DATABASE_ID = FIREBASE_CONFIG.firestoreDatabaseId || "(default)";

export {
  getAdminApp,
  getAdminFirestore,
  isAdminConfigured,
  getAdminStatus,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc
};
