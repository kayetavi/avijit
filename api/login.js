import { FIREBASE_CONFIG, getFirebaseAuth } from "./firestoreClient.js";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { saveSession, getAdminApp } from "./sessionStore.js";
import {
  getUserRbacData,
  isUserDeleted,
  isSuperAdminEmail,
  buildRolePermissions,
  userRolesCache,
  loadUsersFromFile,
  saveUsersToFile
} from "./rbac.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Supported Auth API keys
const AUTH_KEYS = [
  FIREBASE_CONFIG.apiKey || "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk" // loginapp-feb72 (user accounts)
];

// Security Hardening: Use crypto.randomBytes for cryptographically secure session identifiers
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Basic input sanitization helper against XSS/HTML injection for stored strings
function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[<>]/g, "").trim();
}

// Verify credentials via Firebase Auth REST API
async function verifyWithFirebaseAuth(email, password) {
  let lastError = null;

  for (const apiKey of AUTH_KEYS) {
    try {
      const restUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
      const response = await fetch(restUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const data = await response.json();
      if (response.ok && data.localId) {
        return {
          success: true,
          uid: data.localId,
          email: data.email || email,
          idToken: data.idToken
        };
      }

      if (data?.error?.message) {
        lastError = data.error.message;
        // If rate-limited, record error
        if (lastError === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          break;
        }
      }
    } catch (err) {
      console.warn("Firebase Auth REST request error:", err?.message || String(err));
    }
  }

  return { success: false, error: lastError };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method allowed." });
  }

  const { email, password, deviceId, idToken, uid: clientUid } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const cleanEmail = sanitizeInput(email.toLowerCase());
  const sessionId = generateSessionId();
  const resolvedAdminApp = getAdminApp();

  try {
    let authenticatedUid = null;
    let verifiedEmail = cleanEmail;
    let verifiedIdToken = idToken || null;

    // 1. If client already verified via Firebase Auth and provided idToken
    if (idToken) {
      if (resolvedAdminApp) {
        try {
          const decoded = await resolvedAdminApp.auth().verifyIdToken(idToken);
          authenticatedUid = decoded.uid;
          verifiedEmail = sanitizeInput((decoded.email || cleanEmail).toLowerCase());
        } catch (tokenErr) {
          console.info("ID token verification note:", tokenErr?.message);
        }
      }
      if (!authenticatedUid) {
        for (const apiKey of AUTH_KEYS) {
          try {
            const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken })
            });
            const data = await resp.json();
            if (resp.ok && data?.users && data.users.length > 0) {
              authenticatedUid = data.users[0].localId;
              verifiedEmail = sanitizeInput((data.users[0].email || cleanEmail).toLowerCase());
              break;
            }
          } catch (e) {}
        }
      }
    }

    // 2. Authenticate with password
    if (!authenticatedUid) {
      if (!password) {
        return res.status(400).json({ error: "Password is required." });
      }

      // 1. Check if user is in deleted list
      const isDel = await isUserDeleted(cleanEmail);
      if (isDel) {
        return res.status(403).json({
          error: "This user account has been deleted by an Administrator. Access denied."
        });
      }

      // 2. Check if user exists in database / cache
      let userRbac = await getUserRbacData(cleanEmail);

      // 3. Authenticate password for user
      let isPasswordCorrect = false;
      let matchedViaFirebase = false;

      // Check A: Database userRoles password
      if (userRbac && userRbac.password && userRbac.password === password) {
        isPasswordCorrect = true;
      }

      // Check B: Firebase Authentication REST API (primary cloud auth & password reset link sync)
      if (!isPasswordCorrect) {
        const authResult = await verifyWithFirebaseAuth(cleanEmail, password);
        if (authResult.success) {
          isPasswordCorrect = true;
          matchedViaFirebase = true;
          authenticatedUid = authResult.uid;
          verifiedIdToken = authResult.idToken || null;

          // Sign in server-side Firebase Client Auth so getFirestoreDb() is authenticated
          try {
            const clientAuth = getFirebaseAuth();
            if (clientAuth) {
              signInWithEmailAndPassword(clientAuth, cleanEmail, password).catch(() => {});
            }
          } catch (e) {}

          // Refresh userRbac using the verified Firebase ID token
          const liveRbac = await getUserRbacData(cleanEmail, {
            idToken: verifiedIdToken,
            uid: authenticatedUid
          });
          if (liveRbac) {
            userRbac = liveRbac;
          } else {
            // Valid Firebase Auth user on loginapp-feb72 without local cache entry yet
            const assignedRole = isSuperAdminEmail(cleanEmail) ? "admin" : "lead_engineer";
            const perms = buildRolePermissions(assignedRole);
            const newRecord = {
              id: cleanEmail,
              email: cleanEmail,
              role: assignedRole,
              allowedModules: perms.modules,
              subsections: perms.subsections,
              isSuperAdmin: assignedRole === "admin",
              authUid: authenticatedUid,
              password: password,
              hasAuthAccount: true,
              updatedAt: Date.now()
            };
            userRolesCache.set(cleanEmail, newRecord);
            const currentUsers = loadUsersFromFile();
            if (!currentUsers.some(u => u && u.email && u.email.toLowerCase().trim() === cleanEmail)) {
              currentUsers.push(newRecord);
              saveUsersToFile(currentUsers);
            }
            userRbac = await getUserRbacData(cleanEmail, {
              idToken: verifiedIdToken,
              uid: authenticatedUid
            });
          }
        }
      }

      if (!userRbac) {
        return res.status(404).json({
          error: "This email is not registered in the system. Please contact the Administrator to create an account."
        });
      }

      if (isPasswordCorrect) {
        authenticatedUid = authenticatedUid || userRbac?.authUid || `usr_${cleanEmail.replace(/[^a-z0-9]/gi, "_")}`;
        verifiedEmail = cleanEmail;

        // If user logged in with a new password from Firebase Auth (reset link), sync to database
        if (matchedViaFirebase && userRbac && userRbac.password !== password) {
          userRbac.password = password;
          const cached = userRolesCache.get(cleanEmail) || {};
          userRolesCache.set(cleanEmail, { ...cached, email: cleanEmail, password, updatedAt: Date.now() });
          try {
            const fileUsers = loadUsersFromFile();
            const idx = fileUsers.findIndex(u => u && u.email && u.email.toLowerCase().trim() === cleanEmail);
            if (idx >= 0) {
              fileUsers[idx].password = password;
              fileUsers[idx].updatedAt = Date.now();
              saveUsersToFile(fileUsers);
            }
          } catch (e) {}
          try {
            const adminDb = getAdminFirestore();
            if (adminDb) {
              await adminDb.collection("userRoles").doc(cleanEmail).set({ password, updatedAt: Date.now() }, { merge: true });
            }
          } catch (e) {}
        }
      } else {
        return res.status(401).json({
          error: "Incorrect password. Please verify your credentials or click 'Forgot Password?' to reset."
        });
      }
    }

    // Double check deletion and RBAC authorization for verified email
    const isDel = await isUserDeleted(verifiedEmail);
    if (isDel) {
      return res.status(403).json({
        error: "This user account has been deleted by an Administrator. Access denied."
      });
    }

    let rbacData = null;
    try {
      rbacData = await getUserRbacData(verifiedEmail, {
        idToken: verifiedIdToken,
        uid: authenticatedUid
      });
    } catch (rbacErr) {
      console.warn("RBAC lookup warning during login:", rbacErr?.message || String(rbacErr));
    }

    if (!rbacData) {
      return res.status(403).json({
        error: "Access denied. Your account is not registered or has been removed by the Administrator."
      });
    }

    // 3. Save active session to memory and Firestore userSessions
    await saveSession(sessionId, authenticatedUid, verifiedEmail, sanitizeInput(deviceId || "Web Browser"), verifiedIdToken || "");

    // Also persist session directly to Firestore using unified client
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        await adminDb.collection("userSessions").doc(authenticatedUid).set({
          sessionId,
          uid: authenticatedUid,
          email: verifiedEmail,
          deviceId: sanitizeInput(deviceId || "Web Browser"),
          timestamp: Date.now()
        }, { merge: true });
      }
    } catch (fsErr) {
      console.warn("Notice: userSessions direct write:", fsErr?.message || String(fsErr));
    }

    // Set multi-channel secure cookie for session
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const sameSite = isSecure ? "SameSite=None; Secure" : "SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `sessionId=${encodeURIComponent(sessionId)}; Path=/; ${sameSite}; Max-Age=86400`,
      `x-session-id=${encodeURIComponent(sessionId)}; Path=/; ${sameSite}; Max-Age=86400`,
      `loggedInUser=${encodeURIComponent(verifiedEmail)}; Path=/; ${sameSite}; Max-Age=86400`
    ]);

    return res.status(200).json({
      message: "Login successful",
      sessionId,
      idToken: verifiedIdToken || "",
      email: verifiedEmail,
      uid: authenticatedUid,
      rbac: rbacData
    });
  } catch (err) {
    console.error("Login Error:", err?.message || String(err));
    return res.status(500).json({ error: "Internal server error during login." });
  }
}
