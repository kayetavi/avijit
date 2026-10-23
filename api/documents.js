import { getAdminFirestore } from "./firebaseAdmin.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  try {
    const adminDb = getAdminFirestore();
    const method = req.method.toUpperCase();

    // GET /api/documents
    if (method === "GET") {
      if (!adminDb) {
        return res.status(503).json({ error: "Live Firestore database connection required." });
      }
      try {
        const snapshot = await adminDb.collection("documents").get();
        const docs = [];
        snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
        return res.status(200).json(docs);
      } catch (err) {
        console.error("Firestore documents fetch error:", err.message);
        return res.status(503).json({ error: `Firestore fetch error: ${err.message}` });
      }
    }

    // POST /api/documents or /api/documents/upload
    if (method === "POST") {
      if (!adminDb) {
        return res.status(503).json({ error: "Live Firestore database connection required." });
      }
      const data = req.body || {};
      const docId = data.id || `doc_${Date.now()}`;
      data.id = docId;
      data.lastSavedDate = new Date().toISOString().split("T")[0];
      data.lastModifiedDateTime = new Date().toISOString();

      try {
        await adminDb.collection("documents").doc(docId).set(data, { merge: true });
        return res.status(200).json({ success: true, id: docId, document: data });
      } catch (err) {
        console.error("Firestore save failed:", err.message);
        return res.status(503).json({ error: `Firestore save failed: ${err.message}` });
      }
    }

    // DELETE /api/documents/:id
    if (method === "DELETE") {
      if (!adminDb) {
        return res.status(503).json({ error: "Live Firestore database connection required." });
      }
      const id = req.path.split("/").pop();
      try {
        if (id && id !== "documents") {
          await adminDb.collection("documents").doc(id).delete();
        }
        return res.status(200).json({ success: true, deletedId: id });
      } catch (err) {
        console.error("Firestore delete failed:", err.message);
        return res.status(503).json({ error: `Firestore delete failed: ${err.message}` });
      }
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("Error in /api/documents handler:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}
