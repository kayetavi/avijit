// ✅ /api/chatbot.js
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getFirestoreDb } from "./firestoreClient.js";
import { doc, getDoc } from "firebase/firestore";

async function getSearchCredentials() {
  let apiKey = process.env.GOOGLE_SEARCH_API_KEY || "";
  let cx = process.env.GOOGLE_SEARCH_CX || "";
  if (apiKey && cx) return { apiKey, cx };

  const adminDb = getAdminFirestore();
  if (adminDb) {
    try {
      const snap = await adminDb.collection("systemSettings").doc("searchConfig").get();
      if (snap.exists) {
        const d = snap.data() || {};
        apiKey = apiKey || d.apiKey || "";
        cx = cx || d.cx || "";
      }
    } catch (_) {}
  }
  if (!apiKey || !cx) {
    const clientDb = getFirestoreDb();
    if (clientDb) {
      try {
        const snap = await getDoc(doc(clientDb, "systemSettings", "searchConfig"));
        if (snap.exists()) {
          const d = snap.data() || {};
          apiKey = apiKey || d.apiKey || "";
          cx = cx || d.cx || "";
        }
      } catch (_) {}
    }
  }
  return { apiKey, cx };
}

export default async function handler(req, res) {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: "Missing 'q' parameter." });
  }

  const { apiKey, cx } = await getSearchCredentials();
  if (!apiKey || !cx) {
    return res.status(503).json({
      error: "Google Custom Search credentials are not configured in environment (GOOGLE_SEARCH_API_KEY / GOOGLE_SEARCH_CX) or Firestore (systemSettings/searchConfig)."
    });
  }

  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${cx}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error("Google API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
