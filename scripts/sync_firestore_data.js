import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: "AIzaSyAFpVOdyeqEfYutE4uHDsygmzCgSh0t0dk",
  authDomain: "loginapp-feb72.firebaseapp.com",
  projectId: "loginapp-feb72",
  storageBucket: "loginapp-feb72.firebasestorage.app",
  messagingSenderId: "743648198302",
  appId: "1:743648198302:web:fe5a2cb3f81d2a31f5458f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncAll() {
  console.log("Starting Firestore data sync for loginapp-feb72...");

  // 1. Sync Stress Data
  const stressPath = path.resolve(__dirname, "../data/secure/bk_stress.json");
  if (fs.existsSync(stressPath)) {
    const stressData = JSON.parse(fs.readFileSync(stressPath, "utf8"));
    const years = Object.keys(stressData);
    console.log(`Found ${years.length} years of stress data. Uploading to Firestore...`);

    for (const year of years) {
      try {
        console.log(`Uploading year: ${year}...`);
        const yearDocRef = doc(db, "stressData", String(year));
        await setDoc(yearDocRef, {
          year: String(year),
          materials: stressData[year],
          updatedAt: Date.now()
        });
        console.log(`Uploaded stressData/${year} with ${Object.keys(stressData[year]).length} materials`);
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error uploading year ${year}:`, err.message);
      }
    }

    // Master summary doc in systemMeta
    await setDoc(doc(db, "systemMeta", "stressDataMaster"), {
      years: years,
      totalYears: years.length,
      updatedAt: Date.now(),
      status: "synced",
      standard: "ASME B31.3 Table A-1"
    });
    console.log("Uploaded systemMeta/stressDataMaster");
  }

  // 2. Sync Stream Datasets
  const streamPath = path.resolve(__dirname, "../data/secure/stream_datasets.json");
  if (fs.existsSync(streamPath)) {
    const streamDatasets = JSON.parse(fs.readFileSync(streamPath, "utf8"));
    console.log(`Found ${streamDatasets.length} stream datasets. Uploading to Firestore...`);

    for (const ds of streamDatasets) {
      if (ds && ds.id) {
        const dsDocRef = doc(db, "streamDatasets", String(ds.id));
        await setDoc(dsDocRef, {
          ...ds,
          updatedAt: Date.now()
        });
        console.log(`Uploaded streamDatasets/${ds.id} (${ds.title}) with ${ds.streams?.length || 0} streams`);
      }
    }
  }

  console.log("Firestore sync completed successfully!");
  process.exit(0);
}

syncAll().catch((err) => {
  console.error("Sync failed:", err);
  process.exit(1);
});
