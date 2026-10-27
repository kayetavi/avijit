import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getFirestoreDb, isClientAuthSignedIn } from "./firestoreClient.js";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { verifyRequestRbac } from "./rbac.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DOCS_FILE = path.resolve(__dirname, "../data/secure/ccd_documents.json");

function loadLocalDocs() {
  try {
    if (fs.existsSync(LOCAL_DOCS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_DOCS_FILE, "utf8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveLocalDocs(docs) {
  try {
    const dir = path.dirname(LOCAL_DOCS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_DOCS_FILE, JSON.stringify(docs, null, 2), "utf8");
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const adminDb = getAdminFirestore();
    const clientDb = isClientAuthSignedIn() ? getFirestoreDb() : null;
    const method = req.method.toUpperCase();

    // GET /api/documents
    if (method === "GET") {
      if (adminDb) {
        try {
          const snapshot = await adminDb.collection("documents").get();
          if (!snapshot.empty) {
            const docs = [];
            snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
            return res.status(200).json(docs);
          }
        } catch (err) {
          console.warn("Admin Firestore documents fetch note:", err.message);
        }
      }
      if (clientDb) {
        try {
          const snapshot = await getDocs(collection(clientDb, "documents"));
          if (!snapshot.empty) {
            const docs = [];
            snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
            return res.status(200).json(docs);
          }
        } catch (err) {
          console.warn("Client Firestore documents fetch note:", err.message);
        }
      }
      return res.status(200).json(loadLocalDocs());
    }

    // POST /api/documents or /api/documents/upload (Requires Authentication + 'write' permission)
    if (method === "POST" || method === "PUT") {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "write" });
      if (!authCheck.authorized) return;

      const data = req.body || {};
      const docId = data.id || `doc_${Date.now()}`;
      data.id = docId;
      data.savedBy = authCheck.email;
      data.lastSavedDate = new Date().toISOString().split("T")[0];
      data.lastModifiedDateTime = new Date().toISOString();

      // Persist locally first
      const localDocs = loadLocalDocs();
      const idx = localDocs.findIndex(d => d && d.id === docId);
      if (idx >= 0) localDocs[idx] = { ...localDocs[idx], ...data };
      else localDocs.push(data);
      saveLocalDocs(localDocs);

      if (adminDb) {
        try {
          await adminDb.collection("documents").doc(docId).set(data, { merge: true });
        } catch (err) {
          console.warn("Admin Firestore save note:", err.message);
        }
      } else if (clientDb) {
        try {
          await setDoc(doc(clientDb, "documents", docId), data, { merge: true });
        } catch (err) {
          console.warn("Client Firestore save note:", err.message);
        }
      }

      return res.status(200).json({ success: true, id: docId, document: data });
    }

    // DELETE /api/documents/:id (Requires Authentication + 'delete' permission)
    if (method === "DELETE") {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;

      const id = (req.query && req.query.id) || (req.body && req.body.id) || req.path.split("/").pop();
      if (id && id !== "documents") {
        const localDocs = loadLocalDocs().filter(d => d && d.id !== id);
        saveLocalDocs(localDocs);

        if (adminDb) {
          try {
            await adminDb.collection("documents").doc(id).delete();
          } catch (err) {
            console.warn("Admin Firestore delete note:", err.message);
          }
        } else if (clientDb) {
          try {
            await deleteDoc(doc(clientDb, "documents", id));
          } catch (err) {
            console.warn("Client Firestore delete note:", err.message);
          }
        }
      }
      return res.status(200).json({ success: true, deletedId: id, deletedBy: authCheck.email });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("Error in /api/documents handler:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}
