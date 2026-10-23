// api/get-analyses.js
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getFirestoreDb } from "./firestoreClient.js";
import { collection, getDocs } from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Primary Source of Truth: Firestore "analyses" collection
    const adminDb = getAdminFirestore();
    if (adminDb) {
      try {
        const snap = await Promise.race([
          adminDb.collection("analyses").get(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout reading analyses from Firestore")), 5000))
        ]);

        if (snap && !snap.empty) {
          const list = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          return res.status(200).json(list);
        }
      } catch (fsErr) {
        console.warn("Firestore analyses admin fetch notice:", fsErr?.message || String(fsErr));
      }
    }

    // Client SDK fallback to ensure pure live data
    try {
      const clientDb = getFirestoreDb();
      if (clientDb) {
        const snap = await getDocs(collection(clientDb, "analyses"));
        if (!snap.empty) {
          const list = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          return res.status(200).json(list);
        }
      }
    } catch (clientErr) {
      console.warn("Firestore analyses client fetch notice:", clientErr?.message || String(clientErr));
    }

    return res.status(200).json([]);
  } catch (error) {
    console.error("Error reading analyses data from Firestore:", error);
    res.status(500).json({ error: "Failed to load live analyses from Firestore" });
  }
}
