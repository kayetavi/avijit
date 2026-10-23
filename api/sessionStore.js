import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFirestoreDb, getActiveProjectConfig } from "./firestoreClient.js";
import { doc, getDoc, setDoc, deleteDoc, query, where, collection, getDocs } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSIONS_CACHE_FILE = path.resolve(__dirname, "../data/secure/sessions.json");

function readDiskSessions() {
  try {
    if (fs.existsSync(SESSIONS_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_CACHE_FILE, "utf8")) || {};
    }
  } catch (e) {}
  return {};
}

function writeDiskSession(sessionData) {
  try {
    const dir = path.dirname(SESSIONS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const all = readDiskSessions();
    all[sessionData.sessionId] = sessionData;
    if (sessionData.uid) all[sessionData.uid] = sessionData;
    fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(all, null, 2), "utf8");
  } catch (e) {}
}

function removeDiskSession(sessionId, uid) {
  try {
    if (fs.existsSync(SESSIONS_CACHE_FILE)) {
      const all = readDiskSessions();
      let changed = false;
      for (const k of Object.keys(all)) {
        const item = all[k];
        const matchSession = sessionId && (k === sessionId || item?.sessionId === sessionId || item?.uid === sessionId);
        const matchUid = uid && (k === uid || item?.uid === uid || item?.sessionId === uid);
        if (matchSession || matchUid) {
          delete all[k];
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(all, null, 2), "utf8");
      }
    }
  } catch (e) {}
}

// In-memory session cache for fast lookups & offline fallback
const memorySessions = new Map();

// Session TTL Configuration (Default: 24 hours, configurable via env var)
export const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_TTL = Number(process.env.SESSION_TTL_MS) || DEFAULT_SESSION_TTL_MS;
export const INACTIVITY_LIMIT = SESSION_TTL;

/**
 * Check whether a session has expired based on its timestamp/lastActive/createdAt/expiresAt
 * @param {object} session
 * @param {number} ttl
 * @returns {boolean}
 */
export function isSessionExpired(session, ttl = SESSION_TTL) {
  if (!session) return true;
  const now = Date.now();

  // If explicit expiration timestamp exists and has passed
  if (session.expiresAt && typeof session.expiresAt === "number" && now > session.expiresAt) {
    return true;
  }

  // Check last activity or creation timestamp
  const referenceTime = session.lastActive || session.timestamp || session.createdAt || 0;
  if (!referenceTime) return true;

  return (now - referenceTime) > ttl;
}

import {
  initFirebaseAdmin,
  getAdminApp,
  getAdminFirestore,
  getAdminAuth,
  isAdminConfigured,
  getAdminStatus
} from "./firebaseAdmin.js";

export {
  initFirebaseAdmin,
  getAdminApp,
  getAdminFirestore,
  getAdminAuth,
  isAdminConfigured,
  getAdminStatus
};

export function getAdminRtdb() {
  return null;
}

export async function saveSession(sessionId, uid, email, deviceId = "Web Browser") {
  const now = Date.now();
  const sessionData = {
    sessionId,
    uid,
    email: (email || "").toLowerCase().trim(),
    deviceId,
    timestamp: now,
    createdAt: now,
    lastActive: now,
    expiresAt: now + SESSION_TTL
  };

  // 1. Save in memory
  memorySessions.set(sessionId, sessionData);
  if (uid) {
    memorySessions.set(uid, sessionData);
  }

  // 2. Persist to secure disk cache
  writeDiskSession(sessionData);

  // 3. Persist in Firestore
  const adminApp = getAdminApp();
  if (adminApp) {
    try {
      const adminDb = adminApp.firestore();
      const docId = uid || sessionId;
      await adminDb.collection("userSessions").doc(docId).set(sessionData, { merge: true });
    } catch (err) {
      console.warn("SessionStore: Admin Firestore save warning:", err?.message || String(err));
    }
  } else {
    try {
      const clientDb = getFirestoreDb();
      if (clientDb) {
        const docId = uid || sessionId;
        await setDoc(doc(clientDb, "userSessions", docId), sessionData, { merge: true });
      }
    } catch (err) {
      console.warn("SessionStore: Client Firestore save warning:", err?.message || String(err));
    }
  }

  return sessionData;
}

// Alias for standard createSession contract compatibility
export async function createSession(sessionId, uid, email, deviceId = "Web Browser") {
  return await saveSession(sessionId, uid, email, deviceId);
}

// Alias for standard getSession contract compatibility
export async function getSession(sessionId, uid) {
  if (!sessionId && !uid) return null;
  const result = await validateSession(sessionId, uid);
  if (result && result.valid && result.session) {
    return result.session;
  }
  return null;
}

export async function validateSession(sessionId, uid, email = "") {
  if (!sessionId && !uid) {
    return { valid: false, reason: "missing_session_id" };
  }
  const now = Date.now();

  // 1. Check in-memory first
  let mem = (sessionId && memorySessions.get(sessionId)) || (uid && memorySessions.get(uid));
  if (mem) {
    const expired = isSessionExpired(mem, SESSION_TTL);
    if (expired) {
      if (sessionId) memorySessions.delete(sessionId);
      if (uid) memorySessions.delete(uid);
      if (mem.sessionId) memorySessions.delete(mem.sessionId);
      if (mem.uid) memorySessions.delete(mem.uid);
      removeDiskSession(sessionId, uid);
      const app = getAdminApp();
      if (app) {
        const adminDb = app.firestore();
        const docId = uid || sessionId || mem.uid || mem.sessionId;
        if (docId) adminDb.collection("userSessions").doc(docId).delete().catch(() => {});
      }
      return { valid: false, reason: "expired" };
    }
    // Verify sessionId match if both were provided
    if (sessionId && mem.sessionId && mem.sessionId !== sessionId) {
      return { valid: false, reason: "session_mismatch" };
    }
    // Slide/refresh timestamp and lastActive
    mem.timestamp = now;
    mem.lastActive = now;
    mem.expiresAt = now + SESSION_TTL;
    writeDiskSession(mem);
    return { valid: true, email: mem.email, session: mem };
  }

  // 2. Check disk session cache
  const diskSessions = readDiskSessions();
  let diskMem = (sessionId && diskSessions[sessionId]) || (uid && diskSessions[uid]);
  if (diskMem) {
    const expired = isSessionExpired(diskMem, SESSION_TTL);
    if (expired) {
      removeDiskSession(sessionId, uid);
      return { valid: false, reason: "expired" };
    }
    if (sessionId && diskMem.sessionId && diskMem.sessionId !== sessionId) {
      return { valid: false, reason: "session_mismatch" };
    }
    diskMem.timestamp = now;
    diskMem.lastActive = now;
    diskMem.expiresAt = now + SESSION_TTL;
    memorySessions.set(diskMem.sessionId || sessionId, diskMem);
    if (diskMem.uid) memorySessions.set(diskMem.uid, diskMem);
    writeDiskSession(diskMem);
    return { valid: true, email: diskMem.email, session: diskMem };
  }

  // 3. Check Firestore via Admin SDK
  const app = getAdminApp();
  if (app) {
    try {
      const adminDb = app.firestore();
      let docSnap = null;

      if (uid) {
        docSnap = await adminDb.collection("userSessions").doc(uid).get();
      }

      if ((!docSnap || !docSnap.exists) && sessionId) {
        docSnap = await adminDb.collection("userSessions").doc(sessionId).get().catch(() => null);
      }

      if ((!docSnap || !docSnap.exists) && sessionId) {
        const querySnap = await adminDb.collection("userSessions")
          .where("sessionId", "==", sessionId)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          docSnap = querySnap.docs[0];
        }
      }

      if ((!docSnap || !docSnap.exists) && email) {
        const cleanEmail = String(email).toLowerCase().trim();
        const querySnap = await adminDb.collection("userSessions")
          .where("email", "==", cleanEmail)
          .limit(1)
          .get()
          .catch(() => null);
        if (querySnap && !querySnap.empty) {
          docSnap = querySnap.docs[0];
        }
      }

      if (docSnap && docSnap.exists) {
        const data = docSnap.data();
        const expired = isSessionExpired(data, SESSION_TTL);

        if (expired || (sessionId && data.sessionId && data.sessionId !== sessionId)) {
          if (expired) {
            await docSnap.ref.delete().catch(() => {});
            if (data.sessionId) memorySessions.delete(data.sessionId);
            if (data.uid) memorySessions.delete(data.uid);
            removeDiskSession(sessionId, uid);
          }
          return { valid: false, reason: expired ? "expired" : "mismatch" };
        }

        // Slide and refresh session timestamps
        const updatedSession = {
          ...data,
          timestamp: now,
          lastActive: now,
          expiresAt: now + SESSION_TTL
        };

        // Cache in memory and disk
        memorySessions.set(data.sessionId || sessionId, updatedSession);
        if (data.uid) memorySessions.set(data.uid, updatedSession);
        writeDiskSession(updatedSession);

        // Update heartbeat asynchronously
        await docSnap.ref.update({
          timestamp: now,
          lastActive: now,
          expiresAt: now + SESSION_TTL
        }).catch(() => {});

        return { valid: true, email: data.email, session: updatedSession };
      }
    } catch (err) {
      console.warn("SessionStore: Admin Firestore query warning:", err?.message || String(err));
    }
  }

  // 4. Check Firestore via unified client when Admin SDK is unavailable
  try {
    const clientDb = getFirestoreDb ? getFirestoreDb() : null;
    if (clientDb) {
      let snap = null;
      if (uid) {
        snap = await getDoc(doc(clientDb, "userSessions", uid)).catch(() => null);
      }
      if ((!snap || !snap.exists()) && sessionId) {
        snap = await getDoc(doc(clientDb, "userSessions", sessionId)).catch(() => null);
      }
      if (snap && snap.exists()) {
        const data = snap.data();
        const expired = isSessionExpired(data, SESSION_TTL);
        if (expired || (sessionId && data.sessionId && data.sessionId !== sessionId)) {
          return { valid: false, reason: expired ? "expired" : "session_mismatch" };
        }
        const updatedSession = {
          ...data,
          timestamp: now,
          lastActive: now,
          expiresAt: now + SESSION_TTL
        };
        memorySessions.set(data.sessionId || sessionId, updatedSession);
        if (data.uid) memorySessions.set(data.uid, updatedSession);
        writeDiskSession(updatedSession);
        return { valid: true, email: data.email, session: updatedSession };
      }
    }
  } catch (clientErr) {
    console.warn("SessionStore: Client Firestore query warning:", clientErr?.message || String(clientErr));
  }

  // Strictly reject unknown or fabricated sessions. Never trust unverified client assertions.
  return { valid: false, reason: "not_found" };
}

export async function verifyServerIdentity(req) {
  const method = req.method;
  const payload = method === "GET" ? req.query : (req.body || {});
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (payload.idToken || payload.token) {
    token = String(payload.idToken || payload.token).trim();
  } else if (req.headers?.["x-firebase-id-token"]) {
    token = String(req.headers["x-firebase-id-token"]).trim();
  }

  // Check if token is a Firebase ID Token (JWT standard has 3 base64 parts separated by dots)
  const isJwt = token && token.split(".").length === 3;

  // 1. Verify Firebase ID token if present and formatted as a JWT
  if (isJwt) {
    // A. Verify via Admin SDK if initialized
    const app = getAdminApp();
    if (app) {
      try {
        const decoded = await app.auth().verifyIdToken(token);
        if (decoded && decoded.email) {
          return {
            verified: true,
            email: decoded.email.toLowerCase().trim(),
            uid: decoded.uid,
            authMethod: "firebase_admin_token"
          };
        }
      } catch (err) {
        console.warn("[SessionStore] Admin SDK verifyIdToken notice:", err?.message || String(err));
        // Fall through to REST API or active session
      }
    }

    // B. Verify via Google Identity Toolkit REST API
    try {
      const activeProj = getActiveProjectConfig ? getActiveProjectConfig() : null;
      const apiKey = activeProj?.apiKey || process.env.FIREBASE_API_KEY || "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk";
      const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token })
      });
      const data = await resp.json();
      if (resp.ok && data?.users && data.users.length > 0 && data.users[0]?.email) {
        const u = data.users[0];
        return {
          verified: true,
          email: u.email.toLowerCase().trim(),
          uid: u.localId,
          authMethod: "firebase_id_token"
        };
      }
    } catch (err) {
      console.warn("[SessionStore] Identity REST verify notice:", err?.message || String(err));
      // Fall through to session verification
    }
  }

  // 2. Validate trusted server-side session (requires sessionId or cookie)
  const cookieHeader = req.headers?.cookie || "";
  let cookieSessionId = "";
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)(?:sessionId|x-session-id|session_id)=([^;]+)/);
    if (match) cookieSessionId = decodeURIComponent(match[1]).trim();
  }

  // If token was passed in Authorization: Bearer <sessionId> (non-JWT), treat it as sessionId
  const tokenAsSession = (!isJwt && token) ? token : "";

  const sessionId = payload.sessionId ||
    req.headers?.["x-session-id"] ||
    req.headers?.["x-session-token"] ||
    tokenAsSession ||
    cookieSessionId ||
    "";

  const uid = payload.uid || req.headers?.["x-user-uid"] || "";
  const emailClaim = (payload.callerEmail || payload.email || req.query?.callerEmail || req.query?.email || "").toLowerCase().trim();

  if (sessionId) {
    const sessionRes = await validateSession(sessionId, uid, emailClaim);
    if (sessionRes && sessionRes.valid && sessionRes.email) {
      return {
        verified: true,
        email: sessionRes.email.toLowerCase().trim(),
        uid: sessionRes.session?.uid || uid,
        authMethod: "server_session",
        session: sessionRes.session
      };
    }
  }

  // Fallback: If sessionId was not directly passed, but an email is claimed,
  // verify whether that user has an active, unexpired session in server store
  if (emailClaim) {
    const sessionRes = await validateSession("", uid, emailClaim);
    if (sessionRes && sessionRes.valid && sessionRes.email) {
      return {
        verified: true,
        email: sessionRes.email.toLowerCase().trim(),
        uid: sessionRes.session?.uid || uid,
        authMethod: "server_session_email_recovery",
        session: sessionRes.session
      };
    }
  }

  // No verified token and no valid session provided: unauthenticated
  return {
    verified: false,
    reason: (token && isJwt) ? "expired_token" : (sessionId ? "invalid_session" : "unauthenticated"),
    error: "Authentication required. Please provide a valid Firebase ID token or active server session."
  };
}

export async function updateHeartbeat(sessionId, uid) {
  const now = Date.now();
  let found = false;

  const mem = (sessionId && memorySessions.get(sessionId)) || (uid && memorySessions.get(uid));
  if (mem) {
    if (isSessionExpired(mem, SESSION_TTL)) {
      await deleteSession(sessionId, uid);
      return { success: false, reason: "expired" };
    }
    mem.timestamp = now;
    mem.lastActive = now;
    mem.expiresAt = now + SESSION_TTL;
    found = true;
  }

  const app = getAdminApp();
  if (app) {
    try {
      const adminDb = app.firestore();
      const docId = uid || sessionId;
      if (docId) {
        await adminDb.collection("userSessions").doc(docId).set({
          timestamp: now,
          lastActive: now,
          expiresAt: now + SESSION_TTL
        }, { merge: true });
        found = true;
      }
    } catch (err) {
      // Non-blocking
    }
  }

  return { success: found };
}

export async function deleteSession(sessionId, uid) {
  if (sessionId) memorySessions.delete(sessionId);
  if (uid) memorySessions.delete(uid);
  for (const [key, sess] of memorySessions.entries()) {
    if (
      (sessionId && (key === sessionId || sess.sessionId === sessionId || sess.uid === sessionId)) ||
      (uid && (key === uid || sess.uid === uid || sess.sessionId === uid))
    ) {
      memorySessions.delete(key);
    }
  }
  removeDiskSession(sessionId, uid);

  const app = getAdminApp();
  if (app) {
    try {
      const adminDb = app.firestore();
      if (uid) await adminDb.collection("userSessions").doc(uid).delete().catch(() => {});
      if (sessionId) await adminDb.collection("userSessions").doc(sessionId).delete().catch(() => {});
    } catch (err) {
      // Non-blocking
    }
  } else {
    try {
      const clientDb = getFirestoreDb ? getFirestoreDb() : null;
      if (clientDb) {
        if (uid) await deleteDoc(doc(clientDb, "userSessions", uid)).catch(() => {});
        if (sessionId) await deleteDoc(doc(clientDb, "userSessions", sessionId)).catch(() => {});
      }
    } catch (e) {}
  }

  return { success: true };
}

export async function terminateAllUserSessions(email, uid) {
  const targetEmail = (email || "").toLowerCase().trim();

  // 1. Purge matching memory sessions
  for (const [key, sess] of memorySessions.entries()) {
    if (
      (uid && (sess.uid === uid || sess.sessionId === uid)) ||
      (targetEmail && sess.email && sess.email.toLowerCase().trim() === targetEmail)
    ) {
      memorySessions.delete(key);
    }
  }

  // 2. Purge matching disk sessions
  try {
    if (fs.existsSync(SESSIONS_CACHE_FILE)) {
      const all = readDiskSessions();
      let changed = false;
      for (const k of Object.keys(all)) {
        const sess = all[k];
        if (
          sess &&
          ((uid && (sess.uid === uid || sess.sessionId === uid)) ||
           (targetEmail && sess.email && sess.email.toLowerCase().trim() === targetEmail))
        ) {
          delete all[k];
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(SESSIONS_CACHE_FILE, JSON.stringify(all, null, 2), "utf8");
      }
    }
  } catch (e) {}

  // 2. Purge from Firestore userSessions
  const app = getAdminApp();
  if (app) {
    try {
      const adminDb = app.firestore();
      if (uid) {
        await adminDb.collection("userSessions").doc(uid).delete().catch(() => {});
      }
      if (targetEmail) {
        const snap = await adminDb.collection("userSessions").where("email", "==", targetEmail).get().catch(() => null);
        if (snap && !snap.empty) {
          const batch = adminDb.batch();
          snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit().catch(() => {});
        }
      }
    } catch (err) {
      console.warn("SessionStore: batch delete sessions note:", err?.message);
    }
  } else {
    try {
      const clientDb = getFirestoreDb ? getFirestoreDb() : null;
      if (clientDb) {
        if (uid) await deleteDoc(doc(clientDb, "userSessions", uid)).catch(() => {});
        if (targetEmail) {
          const q = query(collection(clientDb, "userSessions"), where("email", "==", targetEmail));
          const snap = await getDocs(q).catch(() => null);
          if (snap && !snap.empty) {
            for (const d of snap.docs) {
              await deleteDoc(d.ref).catch(() => {});
            }
          }
        }
      }
    } catch (e) {}
  }

  return { success: true };
}
