/**
 * Secure Server-Side Firebase Admin SDK Singleton for Kayet DMS
 * 
 * Provides centralized, hardened initialization of Firebase Admin SDK
 * using secure environment variables or Secret Manager volume mounts.
 * Never exposes or logs private keys or credentials.
 */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getClientFirestoreBridge } from "./firestoreBridge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let adminApp = null;
let initAttempted = false;
let initSource = null;
let initError = null;

const DEFAULT_PROJECT_ID = "loginapp-feb72";

/**
 * Safely parse a potential JSON or base64-encoded JSON string
 */
function tryParseJson(str) {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();

  // Try direct JSON parsing
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return null;
    }
  }

  // Try base64 decoding if it looks like base64
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
    if (decoded.startsWith("{") && decoded.endsWith("}")) {
      return JSON.parse(decoded);
    }
  } catch (e) {
    // Not valid base64
  }

  return null;
}

/**
 * Normalizes and validates service account credentials
 * Ensures required fields exist and private key format is correct
 */
function validateAndNormalizeCredentials(raw) {
  if (!raw || typeof raw !== "object") return null;

  const projectId = raw.project_id || raw.projectId || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID;
  const clientEmail = raw.client_email || raw.clientEmail;
  let privateKey = raw.private_key || raw.privateKey;

  if (!clientEmail || typeof clientEmail !== "string" || !clientEmail.includes("@")) {
    return null;
  }

  if (!privateKey || typeof privateKey !== "string") {
    return null;
  }

  // Normalize escaped newlines in private key
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey
  };
}

/**
 * Discovers credentials from supported environment variables, secret mounts, or custom parameter
 */
function resolveCredentials(customSa = null) {
  if (customSa) {
    const validated = validateAndNormalizeCredentials(customSa);
    if (validated) return { credentials: validated, source: "custom_parameter" };
  }

  // 1. Check FIREBASE_SERVICE_ACCOUNT (JSON string or base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = tryParseJson(process.env.FIREBASE_SERVICE_ACCOUNT);
    const validated = validateAndNormalizeCredentials(parsed);
    if (validated) return { credentials: validated, source: "env:FIREBASE_SERVICE_ACCOUNT" };
  }

  // 2. Check FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const parsed = tryParseJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const validated = validateAndNormalizeCredentials(parsed);
    if (validated) return { credentials: validated, source: "env:FIREBASE_SERVICE_ACCOUNT_KEY" };
  }

  // 3. Check FIREBASE_SERVICE_ACCOUNT_BASE64
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const parsed = tryParseJson(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
    const validated = validateAndNormalizeCredentials(parsed);
    if (validated) return { credentials: validated, source: "env:FIREBASE_SERVICE_ACCOUNT_BASE64" };
  }

  // 4. Check explicit file path via env vars (Secret Manager volume mounts)
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicitPath && fs.existsSync(explicitPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(explicitPath, "utf8"));
      const validated = validateAndNormalizeCredentials(content);
      if (validated) return { credentials: validated, source: `file:${path.basename(explicitPath)}` };
    } catch (e) {}
  }

  // 5. Check conventional secrets directories (e.g. Docker / Kubernetes / local)
  const candidateDirs = [
    path.resolve(__dirname, "../secrets"),
    "/secrets",
    "/etc/secrets"
  ];

  for (const sDir of candidateDirs) {
    if (fs.existsSync(sDir)) {
      const priorityPath = path.join(sDir, "serviceAccountKey.json");
      if (fs.existsSync(priorityPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(priorityPath, "utf8"));
          const validated = validateAndNormalizeCredentials(content);
          if (validated) return { credentials: validated, source: `file:${priorityPath}` };
        } catch (e) {}
      }

      // Check other json files in secrets directory
      try {
        const files = fs.readdirSync(sDir).filter(f => f.endsWith(".json"));
        for (const file of files) {
          const filePath = path.join(sDir, file);
          try {
            const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
            const validated = validateAndNormalizeCredentials(content);
            if (validated) return { credentials: validated, source: `file:${file}` };
          } catch (e) {}
        }
      } catch (e) {}
    }
  }

  // 6. Check discrete environment variables
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const discrete = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
    };
    const validated = validateAndNormalizeCredentials(discrete);
    if (validated) return { credentials: validated, source: "env:discrete_credentials" };
  }

  return { credentials: null, source: null };
}

/**
 * Initializes the Firebase Admin SDK singleton once.
 * Fails safely without exposing secrets if configuration is missing.
 */
export function initFirebaseAdmin(customSa = null) {
  if (adminApp) return adminApp;

  // Check if Firebase Admin app already exists in runtime
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    initAttempted = true;
    initSource = "existing_admin_app";
    return adminApp;
  }

  const { credentials, source } = resolveCredentials(customSa);

  if (!credentials) {
    initAttempted = true;
    initError = "No valid Firebase Admin credentials found in environment or secrets store.";
    return null;
  }

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey
      }),
      projectId: credentials.projectId
    });

    initAttempted = true;
    initSource = source;
    initError = null;

    console.info(`[FirebaseAdmin] Successfully initialized Firebase Admin SDK (Project: ${credentials.projectId}, Source: ${source})`);
    return adminApp;
  } catch (err) {
    initAttempted = true;
    initError = err?.message || "Failed to initialize Firebase Admin SDK";
    console.warn(`[FirebaseAdmin] Initialization warning: ${initError}`);
    adminApp = null;
    return null;
  }
}

/**
 * Returns the active Firebase Admin App instance (or attempts initialization)
 */
export function getAdminApp() {
  if (adminApp) return adminApp;
  return initFirebaseAdmin();
}

/**
 * Returns the Admin Firestore instance (or falls back seamlessly to Cloud Firestore bridge)
 */
export function getAdminFirestore() {
  const app = getAdminApp();
  if (app) {
    try {
      return app.firestore();
    } catch (e) {
      console.warn("[FirebaseAdmin] Firestore instance resolution note:", e?.message);
    }
  }

  // Seamless fallback to Cloud Firestore bridge using active project credentials
  try {
    return getClientFirestoreBridge();
  } catch (err) {
    console.warn("[FirebaseAdmin] Could not load getClientFirestoreBridge:", err?.message);
    return null;
  }
}

/**
 * Returns the Admin Auth instance (or null if Admin SDK unconfigured)
 */
export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return app.auth();
  } catch (e) {
    return null;
  }
}

/**
 * Checks whether Firebase Admin SDK is currently configured and operational
 */
export function isAdminConfigured() {
  return !!getAdminApp();
}

/**
 * Returns a non-sensitive diagnostic summary of Admin SDK status (zero secrets exposed)
 */
export function getAdminStatus() {
  const app = getAdminApp();
  return {
    configured: !!app,
    projectId: app?.options?.projectId || null,
    source: initSource,
    initAttempted,
    hasError: !!initError
  };
}

// Initial bootstrap attempt
initFirebaseAdmin();
