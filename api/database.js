import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getActiveProjectConfig } from "./firestoreClient.js";
import { getAdminApp } from "./sessionStore.js";
import { loadUsersFromFile, userRolesCache, verifyRequestRbac } from "./rbac.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for speed (<1ms latency) tracked per project
let cachedDamageMechanisms = null;
let cachedDamageMechanismsProjectId = null;
let cachedStressData = null;
let cachedStressDataProjectId = null;

export function invalidateDamageMechanismsCache() {
  cachedDamageMechanisms = null;
  cachedDamageMechanismsProjectId = null;
  cachedStressData = null;
  cachedStressDataProjectId = null;
}



let cachedDamageMechanismsTimestamp = 0;
const DAMAGE_MECHS_CACHE_TTL = 15000; // 15s TTL for fresh real-time Firestore sync

// Fetch Damage Mechanisms from Firebase Cloud Firestore with local cache
export async function getDamageMechanisms(options = {}) {
  const activeProj = getActiveProjectConfig();
  const isExpired = Date.now() - cachedDamageMechanismsTimestamp > DAMAGE_MECHS_CACHE_TTL;
  const forceRefresh = options?.refresh === true || options?.live === true;

  if (!forceRefresh && !isExpired && cachedDamageMechanisms && cachedDamageMechanismsProjectId === activeProj.projectId) {
    return cachedDamageMechanisms;
  }

  let mechs = {};
  let firestoreFound = false;

  // Fetch live from active project's Firestore
  try {
    const adminDb = getAdminFirestore(activeProj.firestoreDatabaseId);
    if (adminDb) {
      const snap = await adminDb.collection("damageMechanisms").get();
      if (!snap.empty) {
        firestoreFound = true;
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          let mechName = d.name;
          if (!mechName || mechName === "undefined") {
            try {
              mechName = decodeURIComponent(docSnap.id);
            } catch (e) {
              mechName = docSnap.id;
            }
          }
          const existing = mechs[mechName] || {};
          mechs[mechName] = {
            id: docSnap.id,
            code: d.code || existing.code || docSnap.id,
            name: mechName,
            category: d.category || existing.category || "API 571 Damage Mechanism",
            description: d.description || existing.description || "",
            affectedMaterials: d.affectedMaterials || d.materials || existing.affectedMaterials || "",
            criticalFactors: d.criticalFactors || existing.criticalFactors || "",
            affectedUnits: d.affectedUnits || existing.affectedUnits || "",
            appearance: d.appearance || existing.appearance || "",
            mitigation: d.mitigation || existing.mitigation || "",
            inspection: d.inspection || existing.inspection || "",
            temperatureComparison: d.temperatureComparison || existing.temperatureComparison || "",
            imagePath: d.imagePath || existing.imagePath || "",
            isCustom: d.isCustom !== undefined ? d.isCustom : (existing.isCustom || false),
            projectId: activeProj.projectId,
            updatedAt: d.updatedAt ? (d.updatedAt.toMillis ? d.updatedAt.toMillis() : d.updatedAt) : (existing.updatedAt || Date.now())
          };
        });
      } else {
        // Auto-seed Firestore with full master catalog if empty
        console.info(`[database.js] Firestore collection 'damageMechanisms' is empty in project ${activeProj.projectId}. Auto-seeding master catalog...`);
        try {
          const { fullCatalog } = await import("../scripts/seed_api571_mechanisms.js");
          for (const [name, data] of Object.entries(fullCatalog)) {
            const docId = data.code || name.replace(/[^a-zA-Z0-9]/g, "_");
            const record = {
              ...data,
              id: docId,
              projectId: activeProj.projectId,
              updatedAt: Date.now()
            };
            await adminDb.collection("damageMechanisms").doc(docId).set(record, { merge: true });
            mechs[name] = record;
          }
          firestoreFound = true;
        } catch (seedErr) {
          console.warn("[database.js] Auto-seed warning:", seedErr.message);
        }
      }
    }
  } catch (err) {
    console.warn(`Firestore fetch notice for damage mechanisms in ${activeProj.projectId}:`, err.message);
  }

  // Include any local custom mechanisms if present
  try {
    const customFilePath = path.resolve(__dirname, "../data/secure/custom_damage_mechanisms.json");
    if (fs.existsSync(customFilePath)) {
      const customs = JSON.parse(fs.readFileSync(customFilePath, "utf8")) || {};
      for (const [cName, cVal] of Object.entries(customs)) {
        if (!mechs[cName]) {
          mechs[cName] = { ...cVal, isCustom: true };
        }
      }
    }
  } catch (e) {}

  // Fallback to master baseline catalog only if mechs is completely empty
  if (Object.keys(mechs).length === 0) {
    try {
      const { fullCatalog } = await import("../scripts/seed_api571_mechanisms.js");
      mechs = JSON.parse(JSON.stringify(fullCatalog));
    } catch (e) {
      console.warn("Failed to load fullCatalog fallback in database.js:", e.message);
    }
  }

  cachedDamageMechanisms = { "Damage Mechanism": mechs };
  cachedDamageMechanismsProjectId = activeProj.projectId;
  cachedDamageMechanismsTimestamp = Date.now();
  return cachedDamageMechanisms;
}

let cachedStressDataTimestamp = 0;
const STRESS_DATA_CACHE_TTL = 15000; // 15s TTL for fresh real-time Firestore sync

// Fetch Stress Data from Firebase Cloud Firestore with local cache
export async function getStressData(options = {}) {
  const activeProj = getActiveProjectConfig();
  const isExpired = Date.now() - cachedStressDataTimestamp > STRESS_DATA_CACHE_TTL;
  const forceRefresh = options?.refresh === true || options?.live === true;

  if (!forceRefresh && !isExpired && cachedStressData && cachedStressDataProjectId === activeProj.projectId) {
    return cachedStressData;
  }

  let stressDataResult = null;

  // 1. Check active project Firestore (prioritize per-year documents in 'stressData' collection)
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection("stressData").get();
      if (!snap.empty) {
        const data = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (d && d.materials && typeof d.materials === "object") {
            data[docSnap.id] = d.materials;
          }
        });
        if (Object.keys(data).length >= 1) {
          stressDataResult = data;
        }
      }

      // Fallback check on systemMeta/stressDataMaster if stressData collection was empty
      if (!stressDataResult || Object.keys(stressDataResult).length === 0) {
        const metaSnap = await adminDb.collection("systemMeta").doc("stressDataMaster").get();
        if (metaSnap.exists && metaSnap.data()?.data && Object.keys(metaSnap.data().data).length >= 1) {
          stressDataResult = metaSnap.data().data;
        }
      }
    }
  } catch (err) {
    console.warn(`Firestore fetch notice for stress data in ${activeProj.projectId}:`, err.message);
  }

  // 2. Fallback to local backup & auto-seed Firestore if Firestore had no stressData documents
  if (!stressDataResult || Object.keys(stressDataResult).length === 0) {
    const backupFile = path.resolve(__dirname, "../data/secure/bk_stress.json");
    if (fs.existsSync(backupFile)) {
      try {
        stressDataResult = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
        const adminDb = getAdminFirestore();
        if (adminDb && stressDataResult && Object.keys(stressDataResult).length > 0) {
          for (const [yr, mats] of Object.entries(stressDataResult)) {
            await adminDb.collection("stressData").doc(String(yr)).set({
              year: String(yr),
              materials: mats,
              updatedAt: Date.now(),
              updatedBy: "system_seed"
            }, { merge: true });
          }
        }
      } catch (e) {
        console.warn("Failed to load bk_stress.json backup:", e.message);
      }
    }
  }

  cachedStressData = stressDataResult || {};
  cachedStressDataProjectId = activeProj.projectId;
  cachedStressDataTimestamp = Date.now();
  return cachedStressData;
}

// Convert flat rows to hierarchical stress tree
function getRecordVal(row, candidates) {
  if (!row || typeof row !== "object") return "";
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find(x => x.trim().toLowerCase() === c.toLowerCase());
    if (k && row[k] !== undefined && row[k] !== "") return row[k];
  }
  for (const c of candidates) {
    const cleanC = c.toLowerCase().replace(/[^a-z0-9]/g, "");
    const k = keys.find(x => x.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanC);
    if (k && row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

export function recordsToStressTree(records) {
  const tree = {};
  if (!Array.isArray(records)) return tree;

  for (const r of records) {
    const year = String(getRecordVal(r, ["year", "code year", "edition", "standard year"]) || "2022").trim();
    const material = String(getRecordVal(r, ["material", "material specification", "spec", "mat", "specification", "material name"])).trim();
    const rawGrade = String(getRecordVal(r, ["grade", "mat grade", "grd", "grade/class", "class", "type"])).trim();
    const grade = rawGrade || "-";
    const rawThickness = String(getRecordVal(r, ["thickness", "thk", "thickness (mm)", "size"])).trim();
    const rawTemp = getRecordVal(r, ["temperature (°c)", "temperature (c)", "temperature", "temp", "temp (°c)", "temp(c)", "deg c", "t (°c)", "t(c)"]);
    const rawStress = getRecordVal(r, ["allowable stress (mpa)", "allowable stress", "stress (mpa)", "stress", "s (mpa)", "s", "design stress", "allowable"]);
    const rawYield = getRecordVal(r, ["yield strength (mpa)", "yield (mpa)", "yield strength", "yield", "sy"]);
    const rawTensile = getRecordVal(r, ["tensile strength (mpa)", "tensile (mpa)", "tensile strength", "tensile", "su"]);

    const tempNum = parseFloat(rawTemp);
    const stressNum = parseFloat(rawStress);
    const yieldNum = rawYield !== undefined && rawYield !== "" ? parseFloat(rawYield) : undefined;
    const tensileNum = rawTensile !== undefined && rawTensile !== "" ? parseFloat(rawTensile) : undefined;

    if (!year || !material || isNaN(tempNum) || isNaN(stressNum)) {
      continue;
    }

    const tempKey = String(tempNum);

    if (!tree[year]) tree[year] = {};
    if (!tree[year][material]) tree[year][material] = {};
    if (!tree[year][material][grade]) tree[year][material][grade] = {};

    const entry = {
      "Allowable Stress": stressNum,
      ...(yieldNum !== undefined && !isNaN(yieldNum) ? { yield: yieldNum } : {}),
      ...(tensileNum !== undefined && !isNaN(tensileNum) ? { tensile: tensileNum } : {})
    };

    const hasThickness = rawThickness &&
      rawThickness.toLowerCase() !== "all" &&
      rawThickness.toLowerCase() !== "none" &&
      rawThickness !== "-" &&
      rawThickness.toLowerCase() !== "n/a";

    if (hasThickness) {
      if (!tree[year][material][grade][rawThickness]) {
        tree[year][material][grade][rawThickness] = {};
      }
      tree[year][material][grade][rawThickness][tempKey] = entry;
    } else {
      tree[year][material][grade][tempKey] = entry;
    }
  }

  return tree;
}

// Deep merge helper
function deepMergeTree(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      !Array.isArray(source[key]) &&
      key in target &&
      target[key] instanceof Object &&
      !Array.isArray(target[key])
    ) {
      if (typeof source[key]["Allowable Stress"] !== "undefined") {
        target[key] = { ...target[key], ...source[key] };
      } else {
        deepMergeTree(target[key], source[key]);
      }
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Count statistics in tree
function countTreeStats(tree) {
  let records = 0;
  const materialsSet = new Set();
  for (const y of Object.keys(tree)) {
    for (const m of Object.keys(tree[y] || {})) {
      materialsSet.add(m);
      for (const g of Object.keys(tree[y][m] || {})) {
        const gradeObj = tree[y][m][g];
        for (const k of Object.keys(gradeObj || {})) {
          if (typeof gradeObj[k] === "object" && gradeObj[k] !== null) {
            if ("Allowable Stress" in gradeObj[k]) {
              records++;
            } else {
              for (const tk of Object.keys(gradeObj[k])) {
                records++;
              }
            }
          }
        }
      }
    }
  }
  return { records, materials: materialsSet.size, years: Object.keys(tree).length };
}

// Save Stress Data to Firebase Cloud Firestore and Local Backup
export async function saveStressData(newStressData, options = {}) {
  const mode = options.mode || "merge";
  let target = {};

  if (mode === "merge") {
    const current = await getStressData();
    target = JSON.parse(JSON.stringify(current || {}));
    deepMergeTree(target, newStressData);
  } else {
    target = JSON.parse(JSON.stringify(newStressData || {}));
  }

  const stats = countTreeStats(target);

  // 1. Persist in Firebase Cloud Firestore
  let firestoreSaved = false;
  let firestoreError = null;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      // Master catalog document
      try {
        await adminDb.collection("systemMeta").doc("stressDataMaster").set({
          years: Object.keys(target),
          totalYears: stats.years,
          totalMaterials: stats.materials,
          totalRecords: stats.records,
          updatedAt: Date.now(),
          updatedBy: options.userEmail || "engineer",
          source: options.source || "dataloader"
        }, { merge: true });
      } catch (metaErr) {
        console.warn("Notice: stressDataMaster doc save note:", metaErr.message);
      }

      // Per-year partitioned documents in stressData collection
      for (const [year, materials] of Object.entries(target)) {
        await adminDb.collection("stressData").doc(String(year)).set({
          year: String(year),
          materials: materials,
          updatedAt: Date.now(),
          updatedBy: options.userEmail || "engineer"
        }, { merge: true });
      }

      firestoreSaved = true;
    }
  } catch (err) {
    console.warn("Firestore save error notice:", err.message);
    firestoreError = err.message;
  }

  // 2. Update memory cache immediately
  cachedStressData = target;

  return {
    success: true,
    firestoreSaved,
    firestoreError,
    stats,
    updatedAt: Date.now()
  };
}

export async function isAuthorizedAdmin(callerEmail, db) {
  const email = (callerEmail || "").toLowerCase().trim();
  if (!email) return false;

  let userRecord = null;
  if (userRolesCache && typeof userRolesCache.get === "function") {
    userRecord = userRolesCache.get(email);
  }
  if (!userRecord) {
    try {
      const fileUsers = loadUsersFromFile();
      userRecord = fileUsers.find((u) => u.email && u.email.toLowerCase().trim() === email);
    } catch (e) {}
  }
  if (!userRecord && db) {
    try {
      const snap = await db.collection("userRoles").doc(email).get();
      if (snap.exists) {
        userRecord = snap.data();
      }
    } catch (e) {
      console.warn("Admin check notice in database.js:", e?.message);
    }
  }

  if (userRecord) {
    if (userRecord.role === "admin" || userRecord.isSuperAdmin) return true;
    if (userRecord.subsections?.adminControlCenter?.appStress === true) return true;
    if (userRecord.allowedModules?.bkStress === true) return true;
    if (userRecord.subsections?.bkStress?.stressLookup === true) return true;
    if (userRecord.allowedModules?.adminControlCenter === true) return true;
  }
  return false;
}

// Delete entire Year from Stress Database (Admin Only)
export async function deleteYearStressData(year, callerEmail) {
  const cleanYear = String(year || "").trim();
  if (!cleanYear) {
    throw new Error("Year parameter is required.");
  }

  const current = await getStressData();
  const target = JSON.parse(JSON.stringify(current || {}));

  if (!target[cleanYear]) {
    return {
      success: false,
      notFound: true,
      message: `Year ${cleanYear} does not exist in the stress database.`
    };
  }

  // Remove the entire year from target tree
  delete target[cleanYear];
  const stats = countTreeStats(target);

  // 1. Delete from Firebase Cloud Firestore
  let firestoreDeleted = false;
  let firestoreError = null;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      await adminDb.collection("stressData").doc(cleanYear).delete();

      // Update master catalog document
      await adminDb.collection("systemMeta").doc("stressDataMaster").set({
        years: Object.keys(target),
        totalYears: stats.years,
        totalMaterials: stats.materials,
        totalRecords: stats.records,
        updatedAt: Date.now(),
        updatedBy: callerEmail || "admin",
        lastDeletedYear: cleanYear
      }, { merge: true });

      firestoreDeleted = true;
    }
  } catch (err) {
    console.warn("Firestore delete error notice:", err.message);
    firestoreError = err.message;
  }

  // 2. Update memory cache immediately
  cachedStressData = target;

  return {
    success: true,
    deletedYear: cleanYear,
    firestoreDeleted,
    firestoreError,
    stats,
    updatedAt: Date.now()
  };
}

// Update single Temperature Stress Point in Database & Firebase
export async function updateTemperaturePoint(payload, userEmail) {
  const { year, material, grade, thickness, temperature, allowableStress, yield: yieldVal, tensile: tensileVal, oldTemperature } = payload;
  const cleanYear = String(year || "").trim();
  const cleanMat = String(material || "").trim();
  const cleanGrade = String(grade || "").trim();
  const cleanThickness = String(thickness || "").trim();

  const tempNum = parseFloat(temperature);
  const stressNum = parseFloat(allowableStress);
  const yieldNum = yieldVal !== undefined && yieldVal !== "" && !isNaN(parseFloat(yieldVal)) ? parseFloat(yieldVal) : undefined;
  const tensileNum = tensileVal !== undefined && tensileVal !== "" && !isNaN(parseFloat(tensileVal)) ? parseFloat(tensileVal) : undefined;

  if (!cleanYear || !cleanMat || !cleanGrade || isNaN(tempNum) || isNaN(stressNum)) {
    throw new Error("Invalid parameters: year, material, grade, temperature, and allowable stress are required.");
  }

  const current = await getStressData();
  const target = JSON.parse(JSON.stringify(current || {}));

  if (!target[cleanYear]) target[cleanYear] = {};
  if (!target[cleanYear][cleanMat]) target[cleanYear][cleanMat] = {};
  if (!target[cleanYear][cleanMat][cleanGrade]) target[cleanYear][cleanMat][cleanGrade] = {};

  const entry = {
    "Allowable Stress": stressNum,
    ...(yieldNum !== undefined ? { yield: yieldNum } : {}),
    ...(tensileNum !== undefined ? { tensile: tensileNum } : {})
  };

  const hasThickness = cleanThickness &&
    cleanThickness.toLowerCase() !== "all" &&
    cleanThickness.toLowerCase() !== "none" &&
    cleanThickness !== "-" &&
    cleanThickness.toLowerCase() !== "n/a";

  const targetNode = hasThickness
    ? (target[cleanYear][cleanMat][cleanGrade][cleanThickness] = target[cleanYear][cleanMat][cleanGrade][cleanThickness] || {})
    : target[cleanYear][cleanMat][cleanGrade];

  // If old temperature was provided and user modified temperature number, remove old key
  if (oldTemperature !== undefined && oldTemperature !== null && String(oldTemperature) !== String(tempNum)) {
    delete targetNode[String(oldTemperature)];
  }

  targetNode[String(tempNum)] = entry;

  const stats = countTreeStats(target);

  // Sync to Firestore
  let firestoreSaved = false;
  let firestoreError = null;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      await adminDb.collection("systemMeta").doc("stressDataMaster").set({
        years: Object.keys(target),
        totalYears: stats.years,
        totalMaterials: stats.materials,
        totalRecords: stats.records,
        updatedAt: Date.now(),
        updatedBy: userEmail || "engineer"
      }, { merge: true });

      await adminDb.collection("stressData").doc(cleanYear).set({
        year: cleanYear,
        materials: target[cleanYear],
        updatedAt: Date.now(),
        updatedBy: userEmail || "engineer"
      }, { merge: true });

      firestoreSaved = true;
    }
  } catch (err) {
    console.warn("Firestore temperature point update error:", err.message);
    firestoreError = err.message;
  }

  cachedStressData = target;

  return {
    success: true,
    firestoreSaved,
    firestoreError,
    stats,
    updatedPoint: {
      year: cleanYear,
      material: cleanMat,
      grade: cleanGrade,
      thickness: cleanThickness,
      temperature: tempNum,
      "Allowable Stress": stressNum,
      yield: yieldNum,
      tensile: tensileNum
    }
  };
}

// Delete Temperature Point (Admin Only)
export async function deleteTemperaturePoint(payload, callerEmail) {
  const { year, material, grade, thickness, temperature } = payload;
  const cleanYear = String(year || "").trim();
  const cleanMat = String(material || "").trim();
  const cleanGrade = String(grade || "").trim();
  const cleanThickness = String(thickness || "").trim();
  const tempKey = String(temperature);

  const current = await getStressData();
  const target = JSON.parse(JSON.stringify(current || {}));

  if (!target[cleanYear]?.[cleanMat]?.[cleanGrade]) {
    return { success: false, notFound: true, message: "Material/Grade not found in database." };
  }

  const hasThickness = cleanThickness &&
    cleanThickness.toLowerCase() !== "all" &&
    cleanThickness.toLowerCase() !== "none" &&
    cleanThickness !== "-" &&
    cleanThickness.toLowerCase() !== "n/a";

  const targetNode = hasThickness
    ? target[cleanYear][cleanMat][cleanGrade][cleanThickness]
    : target[cleanYear][cleanMat][cleanGrade];

  if (!targetNode || targetNode[tempKey] === undefined) {
    return { success: false, notFound: true, message: `Temperature point ${tempKey}°C not found.` };
  }

  delete targetNode[tempKey];
  const stats = countTreeStats(target);

  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection("systemMeta").doc("stressDataMaster").set({
        years: Object.keys(target),
        updatedAt: Date.now(),
        updatedBy: callerEmail || "admin",
        totalYears: stats.years,
        totalMaterials: stats.materials,
        totalRecords: stats.records
      }, { merge: true });

      await db.collection("stressData").doc(cleanYear).set({
        year: cleanYear,
        materials: target[cleanYear],
        updatedAt: Date.now(),
        updatedBy: callerEmail || "admin"
      }, { merge: false });
    } catch (err) {
      console.warn("Firestore delete point error:", err.message);
    }
  }

  cachedStressData = target;
  cachedStressDataTimestamp = Date.now();
  return { success: true, stats, deletedTemperature: tempKey };
}

// ---------------------------------------------------------------------------
// Engineering Reference Catalogs (Cloud Firestore collection: engineeringCatalog)
// ---------------------------------------------------------------------------
const SEED_CCD_LOOPS = [
  {
    id: "CL-101",
    name: "CDU Atmospheric Overhead Condenser & Run-Down",
    unit: "Crude Distillation Unit (CDU)",
    moc: "Carbon Steel + 3.0 mm CA / Monel 400 at Bundle Inlet",
    operatingTemp: "85°C – 135°C (185°F – 275°F)",
    operatingPressure: "1.2 – 2.5 kg/cm²g",
    processFluid: "Hydrocarbon vapor, condensed water, HCl, H2S, NH3, organic acids",
    criticalParameters: "Overhead accumulator water pH (target 5.8 – 6.8), Cl- (< 20 ppm), Fe/Cl ratio",
    mechanisms: [
      { code: "API 571 - 3.37", name: "Hydrochloric Acid (HCl) Dew Point Corrosion", risk: "high", details: "Condensation of aqueous HCl at top trays & condenser tubes. Localized thinning, pitting." },
      { code: "API 571 - 3.9", name: "Ammonium Chloride (NH4Cl) Corrosion / Under-Deposit", risk: "high", details: "Deposition of solid NH4Cl salts prior to water dewpoint causing severe localized gouging." },
      { code: "API 571 - 3.67", name: "Wet H2S Damage (Blistering / HIC / SOHIC)", risk: "medium", details: "Aqueous sulfide environment with acidic pH promoting atomic hydrogen permeation." },
      { code: "API 571 - 3.27", name: "Erosion-Corrosion / Two-Phase Flow", risk: "medium", details: "High-velocity wet hydrocarbon vapor impacting condenser nozzle and tube bundle impingement plate." }
    ],
    iow: [
      { parameter: "Overhead Boot Water pH", target: "6.0 – 6.5", min: "5.5", max: "7.0", current: "6.2", status: "normal", pct: 60 },
      { parameter: "Accumulator Chloride (Cl⁻)", target: "< 15 ppm", min: "0", max: "30 ppm", current: "12 ppm", status: "normal", pct: 40 },
      { parameter: "Wash Water Flow Rate", target: "5.5 – 7.0 m³/h", min: "4.0", max: "8.5", current: "6.1 m³/h", status: "normal", pct: 70 },
      { parameter: "Filming Amine Inhibitor", target: "2.0 – 4.0 ppm", min: "1.5", max: "5.0", current: "3.2 ppm", status: "normal", pct: 65 }
    ],
    ndt: "Ultrasonic Thickness (AUT) on overhead piping elbows, PEC on insulated lines, Eddy Current (ECT) on condenser tubes during turnarounds.",
    mitigation: "Continuous wash water injection (25% vaporization minimum), neutralizing amine injection tied to accumulator pH, filming inhibitor injection."
  },
  {
    id: "CL-102",
    name: "Vacuum Column Heavy Vacuum Gas Oil (HVGO) Circuit",
    unit: "Vacuum Distillation Unit (VDU)",
    moc: "5Cr-0.5Mo / 9Cr-1Mo / 316L SS Clad at High-Velocity Nozzles",
    operatingTemp: "310°C – 390°C (590°F – 734°F)",
    operatingPressure: "30 – 60 mmHg absolute",
    processFluid: "Heavy Gas Oil, high Total Acid Number (TAN), high organic sulfur (mercaptans, sulfides)",
    criticalParameters: "TAN (> 1.5 mg KOH/g), total sulfur wt%, fluid velocity (> 30 m/s in transfer line)",
    mechanisms: [
      { code: "API 571 - 3.50", name: "Naphthenic Acid Corrosion (NAC)", risk: "high", details: "Occurs between 220°C and 400°C where organic acids condense. Sharp-edged grooves, impingement patterns without protective FeS scale." },
      { code: "API 571 - 3.61", name: "Sulfidation (High-Temp H2S-Free Sulfur)", risk: "high", details: "Sulfur reaction with iron above 260°C. Uniform thinning governed by Modified McConomy curves." },
      { code: "API 571 - 3.28", name: "Erosion-Corrosion (Cavitation / Flashing)", risk: "medium", details: "High-shear flow at column internals, transfer line elbows, and pump discharge." }
    ],
    iow: [
      { parameter: "Crude Blend TAN", target: "< 1.0 mg KOH/g", min: "0", max: "2.0", current: "0.8 mg KOH/g", status: "normal", pct: 40 },
      { parameter: "HVGO Draw Temp", target: "340°C – 360°C", min: "310", max: "375", current: "352°C", status: "normal", pct: 65 },
      { parameter: "Transfer Line Velocity", target: "< 28 m/s", min: "10", max: "35", current: "24 m/s", status: "normal", pct: 60 }
    ],
    ndt: "Automated Ultrasonic Grid (AUT) on high-turbulence elbows, High-Temperature UT on active lines, profile radiography on small-bore bleeds.",
    mitigation: "Crude blending to limit TAN < 1.0, upgrading metallurgy to 316L/317L (min 2.5% Mo), phosphate-based high-temperature corrosion inhibitor injection."
  },
  {
    id: "CL-201",
    name: "Hydrocracker / Hydrotreater Reactor Effluent Air Cooler (REAC)",
    unit: "Hydroprocessing / H2U Unit",
    moc: "2.25Cr-1Mo / Alloy 825 or Inconel 625 Clad REAC Tubes",
    operatingTemp: "60°C – 150°C (140°F – 300°F)",
    operatingPressure: "70 – 160 kg/cm²g",
    processFluid: "Hydrogen, H2S, NH3, hydrocarbons, aqueous ammonium bisulfide (NH4HS)",
    criticalParameters: "Kp salt precipitation temperature, NH4HS concentration (wt%), REAC header velocity",
    mechanisms: [
      { code: "API 571 - 3.6", name: "Ammonium Bisulfide (NH4HS) Sour Water Corrosion", risk: "high", details: "Extremely aggressive corrosion where NH3 and H2S react in aqueous phase. Velocity-sensitive erosion-corrosion." },
      { code: "API 571 - 3.35", name: "High-Temperature Hydrogen Attack (HTHA)", risk: "medium", details: "Reactor circuit upstream governed by API 941 Nelson Curves. Decarburization and fissuring." },
      { code: "API 571 - 3.51", name: "Polythionic Acid Stress Corrosion Cracking (PASCC)", risk: "medium", details: "Sensitized austenitic stainless steel during turnaround shutdown exposure to air & moisture." },
      { code: "API 571 - 3.36", name: "Hydrogen Embrittlement (HE)", risk: "medium", details: "High-strength bolts and thick-wall Cr-Mo steels during cooldown below 150°C." }
    ],
    iow: [
      { parameter: "REAC Sour Water NH4HS", target: "< 6.0 wt%", min: "0", max: "8.0", current: "4.8 wt%", status: "normal", pct: 55 },
      { parameter: "Wash Water Injection Rate", target: "> 8.0 m³/h", min: "6.0", max: "12.0", current: "9.5 m³/h", status: "normal", pct: 70 },
      { parameter: "Inlet Symmetrical Flow Split", target: "± 5% balance", min: "0", max: "10%", current: "3.2% delta", status: "normal", pct: 30 }
    ],
    ndt: "Internal Rotary Inspection System (IRIS) / Remote Field Testing (RFT) on REAC tubes, PAUT on header box plug welds, radiographic inspection.",
    mitigation: "Continuous high-purity deaerated wash water injection, symmetrical piping distribution to REAC bays, soda ash neutralization wash before shutdown."
  },
  {
    id: "CL-301",
    name: "Amine Gas Treating / Regenerator Column & Overhead",
    unit: "Amine Sweetening Unit (MDEA / DEA)",
    moc: "Carbon Steel with PWHT / 304L/316L SS Trays & Overhead",
    operatingTemp: "45°C (Absorber) / 120°C (Regenerator Bottom)",
    operatingPressure: "1.5 – 35 kg/cm²g",
    processFluid: "Rich/Lean MDEA amine, acid gas (H2S, CO2), amine degradation heat stable salts (HSS)",
    criticalParameters: "Amine acid gas loading (mol acid gas / mol amine), HSS wt%, velocity (< 1.5 m/s for CS)",
    mechanisms: [
      { code: "API 571 - 3.4", name: "Amine Stress Corrosion Cracking (ASCC)", risk: "high", details: "Alkaline stress corrosion cracking in non-PWHT carbon steel piping and vessel welds." },
      { code: "API 571 - 3.3", name: "Amine Corrosion (Acid Gas Flashing & Erosion)", risk: "high", details: "Rich amine flashing CO2/H2S vapors upon pressure reduction. Two-phase severe impingement." },
      { code: "API 571 - 3.67", name: "Wet H2S (SSC, HIC) in Rich Amine", risk: "medium", details: "High partial pressure of H2S in contact with non-NACE compliant steel." }
    ],
    iow: [
      { parameter: "Heat Stable Salts (HSS)", target: "< 2.0 wt%", min: "0", max: "4.0", current: "1.4 wt%", status: "normal", pct: 35 },
      { parameter: "Rich Amine Acid Gas Loading", target: "< 0.45 mol/mol", min: "0", max: "0.55", current: "0.38 mol/mol", status: "normal", pct: 60 },
      { parameter: "Lean Amine Temperature", target: "45°C – 55°C", min: "40", max: "65", current: "49°C", status: "normal", pct: 50 }
    ],
    ndt: "Wet Fluorescent Magnetic Particle Testing (WFMT) on internal welds, Shear Wave / TOFD for crack depth, high-resolution UT mapping on flash valves.",
    mitigation: "Strict Post Weld Heat Treatment (PWHT 620°C) on all carbon steel lines, slipstream filtration & vacuum ion-exchange reclamation, velocity limits."
  },
  {
    id: "CL-401",
    name: "Sour Water Stripper (SWS) Overhead Condenser Loop",
    unit: "Sour Water Stripper Unit",
    moc: "Carbon Steel / Alloy 825 / Titanium Gr. 2 in Tube Bundles",
    operatingTemp: "85°C – 115°C (185°F – 240°F)",
    operatingPressure: "1.5 – 2.2 kg/cm²g",
    processFluid: "Stripped acid gas, 30–50% H2S, 30–50% NH3, trace HCN, chlorides, water vapor",
    criticalParameters: "Overhead reflux water pH (target 8.5 – 9.5), NH4HS concentration, presence of cyanides",
    mechanisms: [
      { code: "API 571 - 3.6", name: "Ammonium Bisulfide (NH4HS) Alkaline Sour Water", risk: "high", details: "Extremely high concentration of NH4HS (8-15 wt%) causing aggressive wall loss and erosion." },
      { code: "API 571 - 3.24", name: "Cyanide Stress Cracking / Hydrogen Blistering", risk: "high", details: "HCN poisons iron sulfide film, accelerating hydrogen charging into steel." },
      { code: "API 571 - 3.28", name: "Erosion-Corrosion in Reflux Piping", risk: "medium", details: "High-turbulence downstream of control valves and piping tee junctions." }
    ],
    iow: [
      { parameter: "SWS Reflux NH4HS wt%", target: "< 8.0 wt%", min: "0", max: "12.0", current: "7.1 wt%", status: "normal", pct: 60 },
      { parameter: "Reflux Boot pH", target: "8.5 – 9.2", min: "8.0", max: "9.8", current: "8.8", status: "normal", pct: 50 },
      { parameter: "Overhead Air Cooler Velocity", target: "< 6.0 m/s", min: "1.5", max: "8.0", current: "5.2 m/s", status: "normal", pct: 65 }
    ],
    ndt: "Profile Radiography (RT) on small diameter elbows, UT thickness scanning, IRIS inspection of titanium/alloy tube bundles.",
    mitigation: "Polysulfide injection to convert cyanides to thiocyanates, upgrading to Titanium or Alloy 825, continuous reflux water purging."
  }
];

const SEED_PERIODIC_CATEGORIES = {
  "alkali-metal": { name: "Alkali metals", color: "#0284c7" },
  "alkaline-earth": { name: "Alkaline earth metals", color: "#b91c1c" },
  "transition-metal": { name: "Transition metals", color: "#2b394f" },
  "post-transition": { name: "Post-transition metals", color: "#15803d" },
  "metalloid": { name: "Metalloids", color: "#b45309" },
  "reactive-nonmetal": { name: "Reactive non-metals", color: "#1e40af" },
  "noble-gas": { name: "Noble gases", color: "#881337" },
  "lanthanide": { name: "Lanthanides", color: "#0369a1" },
  "actinide": { name: "Actinides", color: "#7c2d12" },
  "unknown": { name: "Unknown properties", color: "#374151" }
};

const SEED_PERIODIC_RAW_ELEMENTS = [
  [1, "H", "Hydrogen", 1.008, "reactive-nonmetal", 1, 1, [1], "1s¹", 14, 20, 0.00008988, 2.20, "Gas", 1766, "Henry Cavendish", "Hydrogen is the chemical element with the symbol H and atomic number 1. It is the lightest element and the most abundant chemical substance in the Universe.", "Crucial in hydroprocessing, HDS units, and amine treating. Key risk: High Temperature Hydrogen Attack (HTHA) per API 941."],
  [2, "He", "Helium", 4.0026, "noble-gas", 1, 18, [2], "1s²", 1, 4, 0.0001785, null, "Gas", 1868, "Pierre Janssen", "Helium is a colorless, odorless, tasteless, non-toxic, inert, monatomic gas, the first in the noble gas group in the periodic table.", "Used for precision leak detection in pressurized heat exchangers and piping systems."],
  [3, "Li", "Lithium", 6.94, "alkali-metal", 2, 1, [2, 1], "[He] 2s¹", 454, 1603, 0.534, 0.98, "Solid", 1817, "Johan August Arfwedson", "Lithium is a soft, silvery-white alkali metal. Under standard conditions, it is the least dense metal and least dense solid element.", "Used in industrial lithium greases, high-performance battery metallurgy, and special heat-transfer fluids."],
  [4, "Be", "Beryllium", 9.0122, "alkaline-earth", 2, 2, [2, 2], "[He] 2s²", 1560, 2742, 1.85, 1.57, "Solid", 1798, "Louis Nicolas Vauquelin", "Beryllium is a relatively rare metal in the universe. It is a divalent element which occurs naturally only in combination with other elements within minerals.", "Beryllium-copper alloys provide non-sparking hand tools required in explosive hydrocarbon atmospheres."],
  [5, "B", "Boron", 10.81, "metalloid", 2, 13, [2, 3], "[He] 2s² 2p¹", 2349, 4200, 2.34, 2.04, "Solid", 1808, "Joseph Louis Gay-Lussac", "Boron is a low-abundance metalloid element produced entirely by cosmic ray spallation and supernovae.", "Alloyed in carbon steels (0.001-0.003%) to dramatically enhance hardenability in structural components."],
  [6, "C", "Carbon", 12.011, "reactive-nonmetal", 2, 14, [2, 4], "[He] 2s² 2p²", 3823, 4098, 2.267, 2.55, "Solid", "Ancient", "Known since antiquity", "Carbon is nonmetallic and tetravalent—making four electrons available to form covalent chemical bonds.", "Fundamental to carbon steel (API 5L, ASTM A106). Carbon content governs weldability, tensile strength, and PWHT criteria."],
  [7, "N", "Nitrogen", 14.007, "reactive-nonmetal", 2, 15, [2, 5], "[He] 2s² 2p³", 63, 77, 0.0012506, 3.04, "Gas", 1772, "Daniel Rutherford", "Nitrogen is a nonmetal and the lightest member of group 15 of the periodic table, often called the pnictogens.", "Essential purge gas for vessel inerting, blanketing hydrocarbon storage tanks, and preventing pyrophoric iron sulfide ignition."],
  [8, "O", "Oxygen", 15.999, "reactive-nonmetal", 2, 16, [2, 6], "[He] 2s² 2p⁴", 54, 90, 0.001429, 3.44, "Gas", 1774, "Joseph Priestley", "Oxygen is a member of the chalcogen group in the periodic table, a highly reactive nonmetal, and an oxidizing agent.", "Oxygen ingress in boiler feedwater or sour water causes severe pitting; controlled scavenger dosing is mandatory."],
  [9, "F", "Fluorine", 18.998, "reactive-nonmetal", 2, 17, [2, 7], "[He] 2s² 2p⁵", 53, 85, 0.001696, 3.98, "Gas", 1886, "Henri Moissan", "Fluorine is an extremely toxic, pale yellow halogen gas. It is the most chemically reactive and electronegative of all elements.", "Constituent of Hydrofluoric Acid (HF) alkylation. Forms backbone of PTFE/PVDF chemically inert protective linings."],
  [10, "Ne", "Neon", 20.180, "noble-gas", 2, 18, [2, 8], "[He] 2s² 2p⁶", 25, 27, 0.0009002, null, "Gas", 1898, "William Ramsay", "Neon is a colorless, odorless, inert monatomic noble gas under standard conditions, with about two-thirds the density of air.", "Specialized cryogenic cooling and high-voltage discharge indicator applications."],
  [11, "Na", "Sodium", 22.990, "alkali-metal", 3, 1, [2, 8, 1], "[Ne] 3s¹", 371, 1156, 0.968, 0.93, "Solid", 1807, "Humphry Davy", "Sodium is a soft, silvery-white, highly reactive alkali metal in group 1 of the periodic table.", "Key component of Caustic Soda (NaOH). Excessive concentration induces Caustic Embrittlement / SCC per API 571."],
  [12, "Mg", "Magnesium", 24.305, "alkaline-earth", 3, 2, [2, 8, 2], "[Ne] 3s²", 923, 1363, 1.738, 1.31, "Solid", 1755, "Joseph Black", "Magnesium is a shiny gray solid which bears a close physical resemblance to the other five elements in the alkaline earth group.", "Used as sacrificial galvanic anodes for cathodic protection (CP) of buried pipelines and water storage tanks."],
  [13, "Al", "Aluminium", 26.982, "post-transition", 3, 13, [2, 8, 3], "[Ne] 3s² 3p¹", 933, 2743, 2.70, 1.61, "Solid", 1825, "Hans Christian Ørsted", "Aluminium is a silvery-white, soft, non-magnetic, and ductile metal in the boron group.", "Commonly used for piping weather jacketing and cryogenic piping systems; susceptible to galvanic corrosion when coupled to carbon steel."],
  [14, "Si", "Silicon", 28.085, "metalloid", 3, 14, [2, 8, 4], "[Ne] 3s² 3p²", 1687, 3538, 2.329, 1.90, "Solid", 1824, "Jöns Jacob Berzelius", "Silicon is a hard, brittle crystalline solid with a blue-grey metallic lustre, and is a tetravalent metalloid and semiconductor.", "Used as a deoxidizer in steelmaking; silicone lubricants and seals provide wide chemical service envelope."],
  [15, "P", "Phosphorus", 30.974, "reactive-nonmetal", 3, 15, [2, 8, 5], "[Ne] 3s² 3p³", 317, 554, 1.823, 2.19, "Solid", 1669, "Hennig Brand", "Phosphorus is a chemical element existing in two major forms: white phosphorus and red phosphorus.", "Impurity in carbon steel strictly limited (typically <0.025-0.035%) to avoid temper embrittlement and hot-shortness."],
  [16, "S", "Sulfur", 32.06, "reactive-nonmetal", 3, 16, [2, 8, 6], "[Ne] 3s² 3p⁴", 388, 718, 2.07, 2.58, "Solid", "Ancient", "Known since antiquity", "Sulfur is a bright yellow, crystalline solid at room temperature. It is an abundant, multivalent nonmetal.", "Primary element in Sour Crude, H2S, Polythionic Acid Stress Corrosion Cracking (PASCC), and Sulfidation at >260°C."],
  [17, "Cl", "Chlorine", 35.45, "reactive-nonmetal", 3, 17, [2, 8, 7], "[Ne] 3s² 3p⁵", 172, 239, 0.0032, 3.16, "Gas", 1774, "Carl Wilhelm Scheele", "Chlorine is a yellow-green gas at room temperature. It is an extremely reactive element and a strong oxidizing agent.", "Responsible for Chloride Stress Corrosion Cracking (Cl-SCC) in 300-series stainless steels above 60°C per API 571."],
  [18, "Ar", "Argon", 39.948, "noble-gas", 3, 18, [2, 8, 8], "[Ne] 3s² 3p⁶", 84, 87, 0.001784, null, "Gas", 1894, "Lord Rayleigh", "Argon is the third-most abundant gas in the Earth's atmosphere. It is an odorless and colorless noble gas.", "Primary shielding gas for TIG (GTAW) and MIG (GMAW) welding of critical alloy piping and pressure vessels."],
  [19, "K", "Potassium", 39.098, "alkali-metal", 4, 1, [2, 8, 8, 1], "[Ar] 4s¹", 337, 1032, 0.89, 0.82, "Solid", 1807, "Humphry Davy", "Potassium is an alkali metal that reacts vigorously with water to generate hydrogen and potassium hydroxide.", "Used in hot potassium carbonate (Benfield) CO2 removal units in synthesis gas and hydrogen production."],
  [20, "Ca", "Calcium", 40.078, "alkaline-earth", 4, 2, [2, 8, 8, 2], "[Ar] 4s²", 1115, 1757, 1.55, 1.00, "Solid", 1808, "Humphry Davy", "Calcium is a reactive soft metallic element that readily forms a dark oxide-nitride layer in air.", "Calcium treatment is used during secondary steelmaking to modify sulfide inclusions (shape control for HIC resistance)."],
  [21, "Sc", "Scandium", 44.956, "transition-metal", 4, 3, [2, 8, 9, 2], "[Ar] 3d¹ 4s²", 1814, 3109, 2.985, 1.36, "Solid", 1879, "Lars Fredrik Nilson", "Scandium is a silvery-white metallic d-block element, historically classified as a rare-earth element.", "Alloyed in high-strength aerospace and marine aluminum alloys to inhibit grain growth during welding."],
  [22, "Ti", "Titanium", 47.867, "transition-metal", 4, 4, [2, 8, 10, 2], "[Ar] 3d² 4s²", 1941, 3560, 4.506, 1.54, "Solid", 1791, "William Gregor", "Titanium is a lustrous transition metal with a silver color, low density, and high strength. It is highly resistant to corrosion in sea water.", "Essential for seawater cooling tubes (Grade 2) and stabilizing stainless steels (Grade 321) against intergranular sensitization."],
  [23, "V", "Vanadium", 50.942, "transition-metal", 4, 5, [2, 8, 11, 2], "[Ar] 3d³ 4s²", 2183, 3680, 6.11, 1.63, "Solid", 1801, "Andrés Manuel del Río", "Vanadium is a hard, silvery-grey, ductile, malleable transition metal. It forms a protective oxide layer that resists corrosion.", "Key microalloy in Cr-Mo-V steels (e.g. 2.25Cr-1Mo-0.25V) for hydrocracker reactor vessels with superior creep resistance."],
  [24, "Cr", "Chromium", 51.996, "transition-metal", 4, 6, [2, 8, 13, 1], "[Ar] 3d⁵ 4s¹", 2180, 2944, 7.19, 1.66, "Solid", 1797, "Louis Nicolas Vauquelin", "Chromium is a steely-grey, lustrous, hard, and brittle transition metal. It takes a high polish and resists tarnishing.", "The fundamental element in stainless steel (>10.5% Cr) and alloy piping (P5, P9, P11, P22, P91) for oxidation and sulfidation resistance."],
  [25, "Mn", "Manganese", 54.938, "transition-metal", 4, 7, [2, 8, 13, 2], "[Ar] 3d⁵ 4s²", 1519, 2334, 7.21, 1.55, "Solid", 1774, "Johan Gottlieb Gahn", "Manganese is a transition metal with a multifaceted array of industrial alloy uses, particularly in stainless steels.", "Binds with sulfur as MnS in steel; Mn/C ratio governs low-temperature toughness and ductile-to-brittle transition temperature (DBTT)."],
  [26, "Fe", "Iron", 55.845, "transition-metal", 4, 8, [2, 8, 14, 2], "[Ar] 3d⁶ 4s²", 1811, 3134, 7.874, 1.83, "Solid", "Ancient", "Known since antiquity", "Iron is by mass the most common element on Earth, right in front of oxygen, forming much of Earth's outer and inner core.", "The primary metallic backbone of modern process infrastructure, refineries, pressure vessels, pipelines, and structural equipment."],
  [27, "Co", "Cobalt", 58.933, "transition-metal", 4, 9, [2, 8, 15, 2], "[Ar] 3d⁷ 4s²", 1768, 3200, 8.90, 1.88, "Solid", 1735, "Georg Brandt", "Cobalt is a hard, lustrous, silver-gray metal. It is produced by reductive smelting from ores and copper byproducts.", "Constituent of Stellite hardfacing alloys applied on valve seats, plugs, and pump impellers for high-temperature erosion resistance."],
  [28, "Ni", "Nickel", 58.693, "transition-metal", 4, 10, [2, 8, 16, 2], "[Ar] 3d⁸ 4s²", 1728, 3003, 8.908, 1.91, "Solid", 1751, "Axel Fredrik Cronstedt", "Nickel is a silvery-white lustrous metal with a slight golden tinge. It belongs to the transition metals and is hard and ductile.", "Vital for austenitic stabilization (304, 316) and nickel superalloys (Inconel 625, Hastelloy C276, Monel 400) for aggressive acidic/chloride service."],
  [29, "Cu", "Copper", 63.546, "transition-metal", 4, 11, [2, 8, 18, 1], "[Ar] 3d¹⁰ 4s¹", 1358, 2835, 8.96, 1.90, "Solid", "Ancient", "Known since antiquity", "Copper is a soft, malleable, and ductile metal with very high thermal and electrical conductivity.", "Base metal for 90/10 and 70/30 Cu-Ni seawater exchangers; susceptible to ammonia SCC and high erosion-corrosion velocity limits."],
  [30, "Zn", "Zinc", 65.38, "transition-metal", 4, 12, [2, 8, 18, 2], "[Ar] 3d¹⁰ 4s²", 693, 1180, 7.14, 1.65, "Solid", "Ancient", "Known since antiquity", "Zinc is a slightly brittle metal at room temperature and has a silvery-greyish appearance when oxidation is removed.", "Used for hot-dip galvanizing of structural steel and external piping supports; zinc embrittlement risk if welded onto stainless steel."],
  [31, "Ga", "Gallium", 69.723, "post-transition", 4, 13, [2, 8, 18, 3], "[Ar] 3d¹⁰ 4s² 4p¹", 303, 2673, 5.91, 1.81, "Solid", 1875, "Lecoq de Boisbaudran", "Gallium is a soft, silvery metal at standard temperature and pressure. In its liquid state, it becomes silvery white.", "Known for causing Liquid Metal Embrittlement (LME) when in contact with aluminum structures."],
  [32, "Ge", "Germanium", 72.630, "metalloid", 4, 14, [2, 8, 18, 4], "[Ar] 3d¹⁰ 4s² 4p²", 1211, 3106, 5.323, 2.01, "Solid", 1886, "Clemens Winkler", "Germanium is a lustrous, hard-brittle, grayish-white metalloid in the carbon group.", "Applied in infrared optical spectroscopy windows for process gas analyzers and pyrometers."],
  [33, "As", "Arsenic", 74.922, "metalloid", 4, 15, [2, 8, 18, 5], "[Ar] 3d¹⁰ 4s² 4p³", 1090, 887, 5.727, 2.18, "Solid", "Ancient", "Known since antiquity", "Arsenic is a metalloid occurring in many minerals, usually in combination with sulfur and metals.", "Trace poison in hydroprocessing catalysts and known promoter of hydrogen recombination poisoning leading to increased HIC susceptibility."],
  [34, "Se", "Selenium", 78.971, "reactive-nonmetal", 4, 16, [2, 8, 18, 6], "[Ar] 3d¹⁰ 4s² 4p⁴", 494, 958, 4.81, 2.55, "Solid", 1817, "Jöns Jacob Berzelius", "Selenium is a nonmetal with properties that are intermediate between the elements above and below in the periodic table.", "Added in small amounts to improve machinability in stainless steels, but must be limited in sour service alloys."],
  [35, "Br", "Bromine", 79.904, "reactive-nonmetal", 4, 17, [2, 8, 18, 7], "[Ar] 3d¹⁰ 4s² 4p⁵", 266, 332, 3.1028, 2.96, "Liquid", 1826, "Antoine Jérôme Balard", "Bromine is a fuming red-brown liquid at room temperature that evaporates readily to form a similarly coloured vapour.", "High corrosive severity in bromine manufacturing; requires tantalum or specific PTFE lined piping systems."],
  [36, "Kr", "Krypton", 83.798, "noble-gas", 4, 18, [2, 8, 18, 8], "[Ar] 3d¹⁰ 4s² 4p⁶", 116, 120, 0.003749, 3.00, "Gas", 1898, "William Ramsay", "Krypton is a colorless, odorless, tasteless noble gas that occurs in trace amounts in the atmosphere.", "Used in specialized laser alignment and diagnostic inspection equipment."],
  [37, "Rb", "Rubidium", 85.468, "alkali-metal", 5, 1, [2, 8, 18, 8, 1], "[Kr] 5s¹", 312, 961, 1.532, 0.82, "Solid", 1861, "Robert Bunsen", "Rubidium is a soft, silvery-white metallic element of the alkali metal group.", "Used in atomic vapor frequency standards and specialized catalytic synthesis."],
  [38, "Sr", "Strontium", 87.62, "alkaline-earth", 5, 2, [2, 8, 18, 8, 2], "[Kr] 5s²", 1050, 1655, 2.64, 0.95, "Solid", 1790, "Adair Crawford", "Strontium is an alkaline earth metal, a soft silver-white yellowish metallic element that is highly chemically reactive.", "Forms strontium sulfate scale in produced water systems that is virtually impossible to dissolve with standard chemical acid washes."],
  [39, "Y", "Yttrium", 88.906, "transition-metal", 5, 3, [2, 8, 18, 9, 2], "[Kr] 4d¹ 5s²", 1799, 3609, 4.472, 1.22, "Solid", 1794, "Johan Gadolin", "Yttrium is a silvery-metallic transition metal chemically similar to the lanthanides and often classified as a rare-earth element.", "Used in Yttria-Stabilized Zirconia (YSZ) thermal barrier coatings on gas turbine blades and high-temperature burner nozzles."],
  [40, "Zr", "Zirconium", 91.224, "transition-metal", 5, 4, [2, 8, 18, 10, 2], "[Kr] 4d² 5s²", 2128, 4682, 6.52, 1.33, "Solid", 1789, "Martin Heinrich Klaproth", "Zirconium is a lustrous, grey-white, strong transition metal that resembles hafnium and, to a lesser extent, titanium.", "Outstanding corrosion resistance in hot concentrated hydrochloric, nitric, and sulfuric acids."],
  [41, "Nb", "Niobium", 92.906, "transition-metal", 5, 5, [2, 8, 18, 12, 1], "[Kr] 4d⁴ 5s¹", 2750, 5017, 8.57, 1.6, "Solid", 1801, "Charles Hatchett", "Niobium, also known as columbium, is a light grey, crystalline, and ductile transition metal.", "Stabilizing element in 347 stainless steel (forms NbC) to prevent chromium depletion and sensitization during welding."],
  [42, "Mo", "Molybdenum", 95.95, "transition-metal", 5, 6, [2, 8, 18, 13, 1], "[Kr] 4d⁵ 5s¹", 2896, 4912, 10.28, 2.16, "Solid", 1778, "Carl Wilhelm Scheele", "Molybdenum is a refractory transition metal that has the 6th-highest melting point of any element.", "Crucial for pitting resistance in stainless steels (Pitting Resistance Equivalent PREN = %Cr + 3.3%Mo + 16%N). Resists hydrogen attack."],
  [43, "Tc", "Technetium", 98, "transition-metal", 5, 7, [2, 8, 18, 13, 2], "[Kr] 4d⁵ 5s²", 2430, 4538, 11, 1.9, "Solid", 1937, "Emilio Segrè", "Technetium is the lowest atomic number element in the periodic table with no stable isotopes.", "Used as a corrosion inhibitor additive in closed nuclear reactor secondary loops in laboratory studies."],
  [44, "Ru", "Ruthenium", 101.07, "transition-metal", 5, 8, [2, 8, 18, 15, 1], "[Kr] 4d⁷ 5s¹", 2607, 4423, 12.45, 2.2, "Solid", 1844, "Karl Ernst Claus", "Ruthenium is a rare transition metal belonging to the platinum group of the periodic table.", "Added to titanium (Grade 7 Ti-0.15Pd / Grade 26 Ti-0.1Ru) to provide exceptional resistance to hot reducing acids."],
  [45, "Rh", "Rhodium", 102.91, "transition-metal", 5, 9, [2, 8, 18, 16, 1], "[Kr] 4d⁸ 5s¹", 2237, 3968, 12.41, 2.28, "Solid", 1803, "William Hyde Wollaston", "Rhodium is an extraordinarily rare, silvery-white, hard, corrosion-resistant transition metal.", "Used in high-temperature catalytic converter meshes and noble thermocouple protection sheaths."],
  [46, "Pd", "Palladium", 106.42, "transition-metal", 5, 10, [2, 8, 18, 18], "[Kr] 4d¹⁰", 1828, 3236, 12.023, 2.20, "Solid", 1803, "William Hyde Wollaston", "Palladium is a rare and lustrous silvery-white metal discovered in 1803 by William Hyde Wollaston.", "Used in hydrogen purification membranes and as an alloying addition to titanium for sour brine service."],
  [47, "Ag", "Silver", 107.87, "transition-metal", 5, 11, [2, 8, 18, 18, 1], "[Kr] 4d¹⁰ 5s¹", 1235, 2435, 10.49, 1.93, "Solid", "Ancient", "Known since antiquity", "Silver is a soft, white, lustrous transition metal, it exhibits the highest electrical conductivity, thermal conductivity, and reflectivity of any metal.", "Silver-plated gaskets used in high-temperature flange sealing and specialized catalytic oxidation reactors."],
  [48, "Cd", "Cadmium", 112.41, "transition-metal", 5, 12, [2, 8, 18, 18, 2], "[Kr] 4d¹⁰ 5s²", 594, 1040, 8.65, 1.69, "Solid", 1817, "Karl Samuel Leberecht Hermann", "Cadmium is a soft, malleable, ductile, bluish-white bivalent metal. It is chemically similar to zinc and mercury.", "Historically used for fastener plating; prohibited on high-strength bolts in hot service due to cadmium embrittlement."],
  [49, "In", "Indium", 114.82, "post-transition", 5, 13, [2, 8, 18, 18, 3], "[Kr] 4d¹⁰ 5s² 5p¹", 430, 2345, 7.31, 1.78, "Solid", 1863, "Ferdinand Reich", "Indium is a post-transition metal that makes up 0.21 parts per million of the Earth's crust.", "Used for cryogenic vacuum seals and low-melting thermal fuses in fire-safe emergency shutdown systems."],
  [50, "Sn", "Tin", 118.71, "post-transition", 5, 14, [2, 8, 18, 18, 4], "[Kr] 4d¹⁰ 5s² 5p²", 505, 2875, 7.265, 1.96, "Solid", "Ancient", "Known since antiquity", "Tin is a silvery-coloured metal that is soft enough to be cut without much force.", "Bronzes and babbitt bearing materials in rotating equipment (turbines, multi-stage boiler feed pumps)."],
  [51, "Sb", "Antimony", 121.76, "metalloid", 5, 15, [2, 8, 18, 18, 5], "[Kr] 4d¹⁰ 5s² 5p³", 904, 1860, 6.697, 2.05, "Solid", "Ancient", "Known since antiquity", "Antimony is a lustrous gray metalloid found in nature mainly as the sulfide mineral stibnite.", "Hardener in lead acid batteries and chemical lead linings used in sulfuric acid processing."],
  [52, "Te", "Tellurium", 127.60, "metalloid", 5, 16, [2, 8, 18, 18, 6], "[Kr] 4d¹⁰ 5s² 5p⁴", 723, 1261, 6.24, 2.1, "Solid", 1782, "Franz-Joseph Müller von Reichenstein", "Tellurium is a brittle, mildly toxic, rare, silver-white metalloid.", "Small additions enhance the machinability of copper and steel alloys."],
  [53, "I", "Iodine", 126.90, "reactive-nonmetal", 5, 17, [2, 8, 18, 18, 7], "[Kr] 4d¹⁰ 5s² 5p⁵", 387, 457, 4.933, 2.66, "Solid", 1811, "Bernard Courtois", "Iodine is a chemical element with symbol I and atomic number 53. It is the heaviest of the stable halogens.", "Causes stress corrosion cracking in titanium alloys under high stress and elevated temperature."],
  [54, "Xe", "Xenon", 131.29, "noble-gas", 5, 18, [2, 8, 18, 18, 8], "[Kr] 4d¹⁰ 5s² 5p⁶", 161, 165, 0.005894, 2.6, "Gas", 1898, "William Ramsay", "Xenon is a colorless, dense, odorless noble gas found in Earth's atmosphere in trace amounts.", "Used in high-intensity arc inspection lamps and specialized vacuum leak tracing."],
  [55, "Cs", "Caesium", 132.91, "alkali-metal", 6, 1, [2, 8, 18, 18, 8, 1], "[Xe] 6s¹", 302, 944, 1.93, 0.79, "Solid", 1860, "Robert Bunsen", "Caesium is a soft, silvery-golden alkali metal with a melting point of 28.5 °C.", "High-density caesium formate brines used as deep-well drilling and completion fluids in oil & gas exploration."],
  [56, "Ba", "Barium", 137.33, "alkaline-earth", 6, 2, [2, 8, 18, 18, 8, 2], "[Xe] 6s²", 1000, 2170, 3.51, 0.89, "Solid", 1772, "Carl Wilhelm Scheele", "Barium is a soft, silvery alkaline earth metal. Because of its high chemical reactivity, barium is never found in nature as a free element.", "Barium sulfate (Barite) is standard heavy weighting agent for drilling mud; BaSO4 scale deposits resist all standard acidizing."],
  [57, "La", "Lanthanum", 138.91, "lanthanide", 6, 3, [2, 8, 18, 18, 9, 2], "[Xe] 5d¹ 6s²", 1193, 3737, 6.162, 1.10, "Solid", 1839, "Carl Gustaf Mosander", "Lanthanum is a soft, ductile, silvery-white metal that tarnishes slowly when exposed to air.", "Major constituent of fluid catalytic cracking (FCC) zeolite catalysts in oil refineries."],
  [58, "Ce", "Cerium", 140.12, "lanthanide", 6, 4, [2, 8, 18, 19, 9, 2], "[Xe] 4f¹ 5d¹ 6s²", 1068, 3716, 6.77, 1.12, "Solid", 1803, "Martin Heinrich Klaproth", "Cerium is a soft, ductile, and silvery-white metal that easily oxidizes across air.", "Used as a deoxidizer and sulfur scavenger in casting, and in catalyst formulations for emissions abatement."],
  [59, "Pr", "Praseodymium", 140.91, "lanthanide", 6, 5, [2, 8, 18, 21, 8, 2], "[Xe] 4f³ 6s²", 1208, 3793, 6.77, 1.13, "Solid", 1885, "Carl Auer von Welsbach", "Praseodymium is a soft, silvery, malleable and ductile metal in the lanthanide group.", "Component of didymium glass used in welder protective safety goggles."],
  [60, "Nd", "Neodymium", 144.24, "lanthanide", 6, 6, [2, 8, 18, 22, 8, 2], "[Xe] 4f⁴ 6s²", 1297, 3347, 7.01, 1.14, "Solid", 1885, "Carl Auer von Welsbach", "Neodymium is a moderately soft, silvery metal that quickly tarnishes in air and moisture.", "NdFeB permanent magnets used in canned-motor sealless pumps and magnetic drive agitators in toxic services."],
  [61, "Pm", "Promethium", 145, "lanthanide", 6, 7, [2, 8, 18, 23, 8, 2], "[Xe] 4f⁵ 6s²", 1315, 3273, 7.26, 1.13, "Solid", 1945, "Chien Shiung Wu", "Promethium is an extremely rare radioactive lanthanide element.", "Used in radioactive thickness gauging instruments for real-time steel wall measurement."],
  [62, "Sm", "Samarium", 150.36, "lanthanide", 6, 8, [2, 8, 18, 24, 8, 2], "[Xe] 4f⁶ 6s²", 1345, 2067, 7.52, 1.17, "Solid", 1879, "Lecoq de Boisbaudran", "Samarium is a moderately hard silvery metal that slowly oxidizes in air.", "Samarium-Cobalt (SmCo) magnets retain magnetic strength up to 300°C in high-temperature downhole pumps."],
  [63, "Eu", "Europium", 151.96, "lanthanide", 6, 9, [2, 8, 18, 25, 8, 2], "[Xe] 4f⁷ 6s²", 1099, 1802, 5.244, 1.2, "Solid", 1901, "Eugène-Anatole Demarçay", "Europium is a ductile, silvery metal that is the most reactive of the rare-earth elements.", "Used as a phosphor dopant in fluorescent non-destructive testing (NDT) penetration inspection."],
  [64, "Gd", "Gadolinium", 157.25, "lanthanide", 6, 10, [2, 8, 18, 25, 9, 2], "[Xe] 4f⁷ 5d¹ 6s²", 1585, 3546, 7.90, 1.20, "Solid", 1880, "Jean Charles Galissard de Marignac", "Gadolinium is a silvery-white malleable and ductile rare-earth metal.", "High thermal neutron capture cross-section; used for neutron shielding and shielding alloys."],
  [65, "Tb", "Terbium", 158.93, "lanthanide", 6, 11, [2, 8, 18, 27, 8, 2], "[Xe] 4f⁹ 6s²", 1629, 3503, 8.23, 1.2, "Solid", 1843, "Carl Gustaf Mosander", "Terbium is a silvery-white rare earth metal that is malleable, ductile, and soft enough to be cut with a knife.", "Used in magnetostrictive alloys (Terfenol-D) for precision ultrasonic acoustic emission sensors."],
  [66, "Dy", "Dysprosium", 162.50, "lanthanide", 6, 12, [2, 8, 18, 28, 8, 2], "[Xe] 4f¹⁰ 6s²", 1680, 2840, 8.54, 1.22, "Solid", 1886, "Lecoq de Boisbaudran", "Dysprosium is a rare-earth element with a metallic, bright silver luster.", "Added to neodymium magnets to increase demagnetization resistance in offshore electric submersible pumps."],
  [67, "Ho", "Holmium", 164.93, "lanthanide", 6, 13, [2, 8, 18, 29, 8, 2], "[Xe] 4f¹¹ 6s²", 1734, 2993, 8.79, 1.23, "Solid", 1878, "Jacques-Louis Soret", "Holmium is a relatively soft and malleable silvery-white rare earth metal.", "Highest magnetic moment of any element; used in specialized magnetic flux concentrators."],
  [68, "Er", "Erbium", 167.26, "lanthanide", 6, 14, [2, 8, 18, 30, 8, 2], "[Xe] 4f¹² 6s²", 1802, 3141, 9.066, 1.24, "Solid", 1843, "Carl Gustaf Mosander", "Erbium is a silvery-white solid metal that slowly tarnishes in air.", "Used in fiber-optic distributed acoustic sensing (DAS) systems for long-distance pipeline leak monitoring."],
  [69, "Tm", "Thulium", 168.93, "lanthanide", 6, 15, [2, 8, 18, 31, 8, 2], "[Xe] 4f¹³ 6s²", 1818, 2223, 9.32, 1.25, "Solid", 1879, "Per Teodor Cleve", "Thulium is the second-least abundant of the lanthanides.", "Portable X-ray and gamma radiography sources for piping field weld inspection."],
  [70, "Yb", "Ytterbium", 173.05, "lanthanide", 6, 16, [2, 8, 18, 32, 8, 2], "[Xe] 4f¹⁴ 6s²", 1097, 1469, 6.90, 1.1, "Solid", 1878, "Jean Charles Galissard de Marignac", "Ytterbium is a soft, malleable and ductile chemical element in the lanthanide series.", "Used in high-power industrial fiber laser cutters and automated pipeline orbital welding units."],
  [71, "Lu", "Lutetium", 174.97, "lanthanide", 6, 17, [2, 8, 18, 32, 9, 2], "[Xe] 4f¹⁴ 5d¹ 6s²", 1925, 3675, 9.841, 1.27, "Solid", 1907, "Georges Urbain", "Lutetium is a silvery-white metal which resists corrosion in dry air.", "Catalyst in refinery petroleum cracking, alkylation, and hydrogenation."],
  [72, "Hf", "Hafnium", 178.49, "transition-metal", 6, 4, [2, 8, 18, 32, 10, 2], "[Xe] 4f¹⁴ 5d² 6s²", 2506, 4876, 13.31, 1.3, "Solid", 1923, "Dirk Coster", "Hafnium is a lustrous, silvery gray, tetravalent transition metal.", "Doped into nickel-base superalloys to strengthen grain boundaries at 1000°C+ service."],
  [73, "Ta", "Tantalum", 180.95, "transition-metal", 6, 5, [2, 8, 18, 32, 11, 2], "[Xe] 4f¹⁴ 5d³ 6s²", 3290, 5731, 16.69, 1.5, "Solid", 1802, "Anders Gustaf Ekeberg", "Tantalum is a rare, hard, blue-gray, lustrous transition metal that is highly corrosion-resistant.", "Premier corrosion-resistant metal for hot concentrated hydrochloric acid and chlorine service equipment."],
  [74, "W", "Tungsten", 183.84, "transition-metal", 6, 6, [2, 8, 18, 32, 12, 2], "[Xe] 4f¹⁴ 5d⁴ 6s²", 3695, 5828, 19.25, 2.36, "Solid", 1781, "Carl Wilhelm Scheele", "Tungsten is a rare metal found naturally on Earth almost exclusively as compounds with other elements.", "Tungsten carbide hardfacing for high-wear choke valves; non-consumable TIG (GTAW) welding electrodes."],
  [75, "Re", "Rhenium", 186.21, "transition-metal", 6, 7, [2, 8, 18, 32, 13, 2], "[Xe] 4f¹⁴ 5d⁵ 6s²", 3459, 5869, 21.02, 1.9, "Solid", 1925, "Masataka Ogawa", "Rhenium is a silvery-gray, heavy, third-row transition metal in group 7 of the periodic table.", "Added to single-crystal turbine blades to inhibit creep deformation and microstructural coarsening."],
  [76, "Os", "Osmium", 190.23, "transition-metal", 6, 8, [2, 8, 18, 32, 14, 2], "[Xe] 4f¹⁴ 5d⁶ 6s²", 3306, 5285, 22.59, 2.2, "Solid", 1803, "Smithson Tennant", "Osmium is a hard, brittle, bluish-white transition metal in the platinum group that is the densest naturally occurring element.", "Extreme wear applications and specialized oxidation-resistant chemical instrumentation tips."],
  [77, "Ir", "Iridium", 192.22, "transition-metal", 6, 9, [2, 8, 18, 32, 15, 2], "[Xe] 4f¹⁴ 5d⁷ 6s²", 2719, 4701, 22.56, 2.20, "Solid", 1803, "Smithson Tennant", "Iridium is a very hard, brittle, silvery-white transition metal of the platinum group.", "Gamma radiographic isotope (Iridium-192) universally employed for non-destructive inspection of piping welds."],
  [78, "Pt", "Platinum", 195.08, "transition-metal", 6, 10, [2, 8, 18, 32, 17, 1], "[Xe] 4f¹⁴ 5d⁹ 6s¹", 2041, 4098, 21.45, 2.28, "Solid", 1735, "Antonio de Ulloa", "Platinum is a dense, malleable, ductile, highly unreactive, precious, silverish-white transition metal.", "Industrial catalyst in Continuous Catalytic Reforming (CCR) units for high-octane gasoline production."],
  [79, "Au", "Gold", 196.97, "transition-metal", 6, 11, [2, 8, 18, 32, 18, 1], "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", 1337, 3129, 19.30, 2.54, "Solid", "Ancient", "Known since antiquity", "Gold is a bright, slightly reddish yellow, dense, soft, malleable, and ductile metal.", "Gold-plated electrical contacts on safety-instrumented system (SIS) trip relays in corrosive H2S atmospheres."],
  [80, "Hg", "Mercury", 200.59, "transition-metal", 6, 12, [2, 8, 18, 32, 18, 2], "[Xe] 4f¹⁴ 5d¹⁰ 6s²", 234, 630, 13.534, 2.00, "Liquid", "Ancient", "Known since antiquity", "Mercury is a heavy, silvery d-block element, the only metallic element that is liquid at standard conditions.", "Presents catastrophic Liquid Metal Embrittlement (LME) hazard to aluminum brazed heat exchangers (BAHX) in LNG plants."],
  [81, "Tl", "Thallium", 204.38, "post-transition", 6, 13, [2, 8, 18, 32, 18, 3], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", 577, 1746, 11.85, 1.62, "Solid", 1861, "William Crookes", "Thallium is a gray post-transition metal that is not found free in nature.", "Constituent of low-temperature mercury-thallium thermometers used down to -58°C."],
  [82, "Pb", "Lead", 207.2, "post-transition", 6, 14, [2, 8, 18, 32, 18, 4], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", 600, 2022, 11.34, 2.33, "Solid", "Ancient", "Known since antiquity", "Lead is a heavy metal that is denser than most common materials. It is soft and malleable with a low melting point.", "Used for radiation shielding collimators in field radiography of pipes and tanks; historical chemical lead vessel linings."],
  [83, "Bi", "Bismuth", 208.98, "post-transition", 6, 15, [2, 8, 18, 32, 18, 5], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", 544, 1837, 9.78, 2.02, "Solid", "Ancient", "Known since antiquity", "Bismuth is a pentavalent post-transition metal and one of the pnictogens with chemical properties resembling its lighter group 15 siblings.", "Used in low-melting fire sprinkler plugs and fusible temperature safety relief elements."],
  [84, "Po", "Polonium", 209, "post-transition", 6, 16, [2, 8, 18, 32, 18, 6], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", 527, 1235, 9.196, 2.0, "Solid", 1898, "Marie Curie", "Polonium is a rare and highly radioactive metal with no stable isotopes.", "Used in industrial static eliminators for volatile fuel handling facilities."],
  [85, "At", "Astatine", 210, "metalloid", 6, 17, [2, 8, 18, 32, 18, 7], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", 575, 610, 6.35, 2.2, "Solid", 1940, "Dale R. Corson", "Astatine is a very rare radioactive chemical element.", "Research element investigated for targeted alpha therapy."],
  [86, "Rn", "Radon", 222, "noble-gas", 6, 18, [2, 8, 18, 32, 18, 8], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", 202, 211, 0.00973, 2.2, "Gas", 1900, "Friedrich Ernst Dorn", "Radon is a radioactive, colorless, odorless, tasteless noble gas.", "Naturally occurring radioactive material (NORM) daughter isotope in natural gas production piping."],
  [87, "Fr", "Francium", 223, "alkali-metal", 7, 1, [2, 8, 18, 32, 18, 8, 1], "[Rn] 7s¹", 300, 950, 1.87, 0.7, "Solid", 1939, "Marguerite Perey", "Francium is an extremely radioactive alkali metal; its most stable isotope has a half-life of only 22 minutes.", "Studied in atomic physics labs for atomic structure spectroscopic probing."],
  [88, "Ra", "Radium", 226, "alkaline-earth", 7, 2, [2, 8, 18, 32, 18, 8, 2], "[Rn] 7s²", 973, 2010, 5.5, 0.9, "Solid", 1898, "Marie Curie", "Radium is an almost pure-white alkaline earth metal, but it readily reacts with nitrogen on exposure to air.", "Major contributor to NORM scale deposits on internal pipeline surfaces and tubulars in oilfield production."],
  [89, "Ac", "Actinium", 227, "actinide", 7, 3, [2, 8, 18, 32, 18, 9, 2], "[Rn] 6d¹ 7s²", 1323, 3471, 10.07, 1.1, "Solid", 1899, "André-Louis Debierne", "Actinium is a soft, silvery-white radioactive actinide metal.", "Used as a neutron source in oilfield sub-surface geological formation logging tools."],
  [90, "Th", "Thorium", 232.04, "actinide", 7, 4, [2, 8, 18, 32, 18, 10, 2], "[Rn] 6d² 7s²", 2115, 5061, 11.72, 1.3, "Solid", 1829, "Jöns Jacob Berzelius", "Thorium is a weakly radioactive metallic chemical element with symbol Th and atomic number 90.", "Thorium oxide (ThO2) added to tungsten electrodes (EWTh-2) for enhanced arc stability in pipe GTAW welding."],
  [91, "Pa", "Protactinium", 231.04, "actinide", 7, 5, [2, 8, 18, 32, 20, 9, 2], "[Rn] 5f² 6d¹ 7s²", 1841, 4300, 15.37, 1.5, "Solid", 1913, "Kasimir Fajans", "Protactinium is a dense, silvery-gray actinide metal which readily reacts with oxygen, water vapor and inorganic acids.", "Basic nuclear physics research and radioactive decay dating."],
  [92, "U", "Uranium", 238.03, "actinide", 7, 6, [2, 8, 18, 32, 21, 9, 2], "[Rn] 5f³ 6d¹ 7s²", 1405, 4404, 19.1, 1.38, "Solid", 1789, "Martin Heinrich Klaproth", "Uranium is a silvery-grey metal in the actinide series of the periodic table.", "Depleted uranium used as high-density gamma radiation shielding in portable weld radiography cameras."],
  [93, "Np", "Neptunium", 237, "actinide", 7, 7, [2, 8, 18, 32, 22, 9, 2], "[Rn] 5f⁴ 6d¹ 7s²", 917, 4273, 20.45, 1.36, "Solid", 1940, "Edwin McMillan", "Neptunium is a radioactive actinide metal, the first transuranic element.", "Precursor in the production of Plutonium-238 for deep-space radioisotope power generators."],
  [94, "Pu", "Plutonium", 244, "actinide", 7, 8, [2, 8, 18, 32, 24, 8, 2], "[Rn] 5f⁶ 7s²", 912, 3501, 19.816, 1.28, "Solid", 1940, "Glenn T. Seaborg", "Plutonium is a radioactive actinide metal of silvery-gray appearance that tarnishes when oxidized.", "Nuclear fuel element in pressurized water reactors and radioisotope thermoelectric generators."],
  [95, "Am", "Americium", 243, "actinide", 7, 9, [2, 8, 18, 32, 25, 8, 2], "[Rn] 5f⁷ 7s²", 1449, 2880, 12, 1.13, "Solid", 1944, "Glenn T. Seaborg", "Americium is a synthetic radioactive element in the actinide series.", "Americium-241 is universally used in industrial ionization smoke detectors and downhole neutron density gauges."],
  [96, "Cm", "Curium", 247, "actinide", 7, 10, [2, 8, 18, 32, 25, 9, 2], "[Rn] 5f⁷ 6d¹ 7s²", 1613, 3383, 13.51, 1.28, "Solid", 1944, "Glenn T. Seaborg", "Curium is a transuranic radioactive chemical element named after Marie and Pierre Curie.", "Alpha source for Alpha Particle X-Ray Spectrometers (APXS) in space mineralogy."],
  [97, "Bk", "Berkelium", 247, "actinide", 7, 11, [2, 8, 18, 32, 27, 8, 2], "[Rn] 5f⁹ 7s²", 1259, 2900, 14.78, 1.3, "Solid", 1949, "Glenn T. Seaborg", "Berkelium is a transuranic radioactive chemical element discovered at UC Berkeley.", "Target material for synthesis of heavier superheavy elements including tennessine."],
  [98, "Cf", "Californium", 251, "actinide", 7, 12, [2, 8, 18, 32, 28, 8, 2], "[Rn] 5f¹⁰ 7s²", 1173, 1743, 15.1, 1.3, "Solid", 1950, "Glenn T. Seaborg", "Californium is a radioactive actinide element, the sixth transuranic element to be synthesized.", "Californium-252 is an intense neutron source used in Prompt Gamma Neutron Activation Analysis (PGNAA) of coal and cement."],
  [99, "Es", "Einsteinium", 252, "actinide", 7, 13, [2, 8, 18, 32, 29, 8, 2], "[Rn] 5f¹¹ 7s²", 1133, 1269, 8.84, 1.3, "Solid", 1952, "Albert Ghiorso", "Einsteinium is a synthetic element named after Albert Einstein, discovered in the debris of the first thermonuclear bomb.", "Fundamental actinide chemistry investigations."],
  [100, "Fm", "Fermium", 257, "actinide", 7, 14, [2, 8, 18, 32, 30, 8, 2], "[Rn] 5f¹² 7s²", 1800, null, null, 1.3, "Solid", 1952, "Albert Ghiorso", "Fermium is the heaviest element that can be formed by neutron bombardment of lighter elements.", "Nuclear physics research on spontaneous fission kinetics."],
  [101, "Md", "Mendelevium", 258, "actinide", 7, 15, [2, 8, 18, 32, 31, 8, 2], "[Rn] 5f¹³ 7s²", 1100, null, null, 1.3, "Solid", 1955, "Albert Ghiorso", "Mendelevium is a synthetic element in the actinide series, named after Dmitri Mendeleev.", "Radioactive tracer studies in heavy actinide chemistry."],
  [102, "No", "Nobelium", 259, "actinide", 7, 16, [2, 8, 18, 32, 32, 8, 2], "[Rn] 5f¹⁴ 7s²", 1100, null, null, 1.3, "Solid", 1966, "Joint Institute for Nuclear Research", "Nobelium is a synthetic radioactive element named after Alfred Nobel.", "Investigation of relativistic electron shell effects in heavy atoms."],
  [103, "Lr", "Lawrencium", 266, "actinide", 7, 17, [2, 8, 18, 32, 32, 8, 3], "[Rn] 5f¹⁴ 7s² 7p¹", 1900, null, null, 1.3, "Solid", 1961, "Albert Ghiorso", "Lawrencium is a synthetic chemical element named after Ernest Lawrence.", "Final member of the actinide series in period 7."],
  [104, "Rf", "Rutherfordium", 267, "transition-metal", 7, 4, [2, 8, 18, 32, 32, 10, 2], "[Rn] 5f¹⁴ 6d² 7s²", 2400, 5800, 23.2, null, "Solid", 1969, "Albert Ghiorso", "Rutherfordium is a synthetic chemical element named after physicist Ernest Rutherford.", "First transactinide element investigated for group 4 chemical homologue verification."],
  [105, "Db", "Dubnium", 268, "transition-metal", 7, 5, [2, 8, 18, 32, 32, 11, 2], "[Rn] 5f¹⁴ 6d³ 7s²", null, null, 29.3, null, "Solid", 1970, "Albert Ghiorso", "Dubnium is a synthetic chemical element named after the town of Dubna in Russia.", "Nuclear decay pathway modeling."],
  [106, "Sg", "Seaborgium", 269, "transition-metal", 7, 6, [2, 8, 18, 32, 32, 12, 2], "[Rn] 5f¹⁴ 6d⁴ 7s²", null, null, 35.0, null, "Solid", 1974, "Albert Ghiorso", "Seaborgium is a synthetic chemical element named after the American nuclear chemist Glenn T. Seaborg.", "Heavy group 6 chemical behavior studies."],
  [107, "Bh", "Bohrium", 270, "transition-metal", 7, 7, [2, 8, 18, 32, 32, 13, 2], "[Rn] 5f¹⁴ 6d⁵ 7s²", null, null, 37.1, null, "Solid", 1981, "Peter Armbruster", "Bohrium is a synthetic chemical element named after Danish physicist Niels Bohr.", "Gas-phase thermochromatography investigations."],
  [108, "Hs", "Hassium", 269, "transition-metal", 7, 8, [2, 8, 18, 32, 32, 14, 2], "[Rn] 5f¹⁴ 6d⁶ 7s²", null, null, 40.7, null, "Solid", 1984, "Peter Armbruster", "Hassium is a synthetic chemical element named after the German state of Hesse.", "Group 8 tetroxide volatility comparisons with osmium."],
  [109, "Mt", "Meitnerium", 278, "unknown", 7, 9, [2, 8, 18, 32, 32, 15, 2], "[Rn] 5f¹⁴ 6d⁷ 7s²", null, null, 37.4, null, "Solid", 1982, "Peter Armbruster", "Meitnerium is a synthetic chemical element named after Austrian-Swedish physicist Lise Meitner.", "Relativistic quantum chemistry benchmarking."],
  [110, "Ds", "Darmstadtium", 281, "unknown", 7, 10, [2, 8, 18, 32, 32, 17, 1], "[Rn] 5f¹⁴ 6d⁹ 7s¹", null, null, 34.8, null, "Solid", 1994, "Sigurd Hofmann", "Darmstadtium is a synthetic chemical element named after the German city of Darmstadt.", "Superheavy element synthesis research."],
  [111, "Rg", "Roentgenium", 282, "unknown", 7, 11, [2, 8, 18, 32, 32, 18, 1], "[Rn] 5f¹⁴ 6d¹⁰ 7s¹", null, null, 28.7, null, "Solid", 1994, "Sigurd Hofmann", "Roentgenium is an extremely radioactive synthetic element named after Wilhelm Röntgen.", "Group 11 relativistic contraction experiments."],
  [112, "Cn", "Copernicium", 285, "unknown", 7, 12, [2, 8, 18, 32, 32, 18, 2], "[Rn] 5f¹⁴ 6d¹⁰ 7s²", 283, 340, 23.7, null, "Liquid", 1996, "Sigurd Hofmann", "Copernicium is a synthetic chemical element; it has symbol Cn and atomic number 112. Its known isotopes are extremely radioactive, and have only been created in a laboratory.", "Superheavy group 12 element exhibiting relativistic inertness resembling a noble gas."],
  [113, "Nh", "Nihonium", 286, "unknown", 7, 13, [2, 8, 18, 32, 32, 18, 3], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", 700, 1400, 16, null, "Solid", 2004, "RIKEN (Japan)", "Nihonium is a synthetic chemical element with the symbol Nh and atomic number 113.", "First element discovered in an Asian laboratory."],
  [114, "Fl", "Flerovium", 289, "unknown", 7, 14, [2, 8, 18, 32, 32, 18, 4], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", 340, 420, 14, null, "Solid", 1998, "Joint Institute for Nuclear Research", "Flerovium is an extremely radioactive synthetic chemical element.", "Researched for potential island-of-stability nuclear shell closure."],
  [115, "Mc", "Moscovium", 290, "unknown", 7, 15, [2, 8, 18, 32, 32, 18, 5], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", 670, 1400, 13.5, null, "Solid", 2003, "Joint Institute for Nuclear Research", "Moscovium is an extremely radioactive synthetic element named after the Moscow Oblast.", "High-energy nuclear fusion cross-section studies."],
  [116, "Lv", "Livermorium", 293, "unknown", 7, 16, [2, 8, 18, 32, 32, 18, 6], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", 709, 1085, 12.9, null, "Solid", 2000, "Lawrence Livermore National Laboratory", "Livermorium is a synthetic chemical element named in honour of Lawrence Livermore National Laboratory.", "Superheavy chalcogen homologue research."],
  [117, "Ts", "Tennessine", 294, "unknown", 7, 17, [2, 8, 18, 32, 32, 18, 7], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", 723, 883, 7.2, null, "Solid", 2010, "Joint Institute for Nuclear Research / ORNL", "Tennessine is a synthetic chemical element named after the state of Tennessee.", "Heaviest known halogen-group synthetic element."],
  [118, "Og", "Oganesson", 294, "unknown", 7, 18, [2, 8, 18, 32, 32, 18, 8], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁸", 325, 450, 5.0, null, "Solid", 2002, "Joint Institute for Nuclear Research", "Oganesson is a synthetic chemical element named after nuclear physicist Yuri Oganessian. It has the highest atomic number and atomic mass of all known elements.", "Predicted to have uniform electron-gas distribution due to strong spin-orbit relativistic effects."]
];

const SEED_PFD_UNIT_MECHANISMS = {
  hcu: [
    { code: "1", name: "Sulfidation" },
    { code: "2", name: "Wet H₂S Damage (Blistering, HIC, SOHIC, SSC)" },
    { code: "3", name: "Creep and Stress Rupture" },
    { code: "4", name: "High-temperature H₂/H₂S Corrosion" },
    { code: "5", name: "Polythionic Acid Stress Corrosion Cracking" },
    { code: "6", name: "Naphthenic Acid Corrosion" },
    { code: "7", name: "Ammonium Bisulfide Corrosion (Alkaline Sour Water)" },
    { code: "8", name: "Ammonium Chloride and Amine Hydrochloride Corrosion" },
    { code: "9", name: "Hydrochloric Acid Corrosion" },
    { code: "10", name: "High-temperature Hydrogen Attack (HTHA)" },
    { code: "16", name: "Temper Embrittlement" },
    { code: "20", name: "Erosion/Erosion-Corrosion" },
    { code: "22", name: "Amine Stress Corrosion Cracking" },
    { code: "23", name: "Chloride Stress Corrosion Cracking" },
    { code: "25", name: "Hydrogen Embrittlement" },
    { code: "30", name: "Short-term Overheating-Stress Rupture" },
    { code: "31", name: "Brittle Fracture" },
    { code: "32", name: "Sigma Phase Embrittlement" },
    { code: "35", name: "Stress Relaxation Cracking (Reheat Cracking)" },
    { code: "45", name: "Amine Corrosion" },
    { code: "46", name: "Corrosion Under Insulation (CUI)" }
  ],
  cduvdu: [
    { code: "1", name: "Sulfidation" },
    { code: "2", name: "Wet H₂S Damage (Blistering, HIC, SOHIC, SSC)" },
    { code: "3", name: "Creep and Stress Rupture" },
    { code: "5", name: "Polythionic Acid Stress Corrosion Cracking" },
    { code: "6", name: "Naphthenic Acid Corrosion" },
    { code: "8", name: "Ammonium Chloride and Amine Hydrochloride Corrosion" },
    { code: "9", name: "Hydrochloric Acid Corrosion" },
    { code: "11", name: "Oxidation" },
    { code: "18", name: "Caustic Stress Corrosion Cracking" },
    { code: "19", name: "Caustic Corrosion" },
    { code: "20", name: "Erosion/Erosion-Corrosion" },
    { code: "23", name: "Chloride Stress Corrosion Cracking" },
    { code: "30", name: "Short-term Overheating-Stress Rupture" },
    { code: "33", name: "885 °F (475 °C) Embrittlement" },
    { code: "39", name: "Dissimilar Metal Weld Cracking" },
    { code: "42", name: "CO₂ Corrosion" },
    { code: "44", name: "Fuel Ash Corrosion" },
    { code: "48", name: "Ammonia Stress Corrosion Cracking" },
    { code: "52", name: "Liquid Metal Embrittlement (LME)" },
    { code: "66", name: "Aqueous Organic AcidCorrosion" },
    { code: "67", name: "Brine Corrosion" }
  ],
  msp: [
    { code: "3", name: "Creep and Stress Rupture" },
    { code: "8", name: "Ammonium Chloride and Amine Hydrochloride Corrosion" },
    { code: "9", name: "Hydrochloric Acid Corrosion" },
    { code: "10", name: "High-temperature Hydrogen Attack (HTHA)" },
    { code: "11", name: "Oxidation" },
    { code: "16", name: "Temper Embrittlement" },
    { code: "20", name: "Erosion/Erosion-Corrosion" },
    { code: "24", name: "Carburization" },
    { code: "25", name: "Hydrogen Embrittlement" },
    { code: "30", name: "Short-term Overheating-Stress Rupture" },
    { code: "35", name: "Stress Relaxation Cracking (Reheat Cracking)" },
    { code: "49", name: "Ammonia Stress Corrosion Cracking" },
    { code: "51", name: "Mechanical Fatigue" },
    { code: "59", name: "Metal Dusting" }
  ],
  h2u: [
    { code: "3", name: "Creep and Stress Rupture" },
    { code: "10", name: "High-temperature Hydrogen Attack (HTHA)" },
    { code: "11", name: "Oxidation" },
    { code: "5", name: "Sulfidation" },
    { code: "12", name: "Thermal Fatigue" },
    { code: "14", name: "Refractory Degradation" },
    { code: "16", name: "Temper Embrittlement" },
    { code: "11", name: "Carbonate Stress Corrosion Cracking" },
    { code: "21", name: "Polythionic Acid Stress Corrosion Cracking" },
    { code: "22", name: "Amine Stress Corrosion Cracking" },
    { code: "23", name: "Chloride Stress Corrosion Cracking" },
    { code: "26", name: "Short-term Overheating-Stress Rupture" },
    { code: "27", name: "Thermal Shock" },
    { code: "30", name: "Short-term Overheating-Stress Rupture" },
    { code: "32", name: "Sigma Phase Embrittlement" },
    { code: "35", name: "Stress Relaxation Cracking (Reheat Cracking)" },
    { code: "39", name: "Dissimilar Metal Weld Cracking" },
    { code: "42", name: "CO₂ Corrosion" },
    { code: "45", name: "Amine Corrosion" },
    { code: "50", name: "Boiler WaterSteam Corrosion" },
    { code: "59", name: "Metal Dusting" }
  ]
};

const catalogMemoryCache = new Map();
const CATALOG_DISK_FILE = path.resolve(__dirname, "../data/secure/engineering_catalog.json");

function readCatalogDiskCache() {
  try {
    if (fs.existsSync(CATALOG_DISK_FILE)) {
      return JSON.parse(fs.readFileSync(CATALOG_DISK_FILE, "utf8")) || {};
    }
  } catch (e) {}
  return {};
}

function writeCatalogDiskCache(docId, payload) {
  try {
    const dir = path.dirname(CATALOG_DISK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const all = readCatalogDiskCache();
    all[docId] = { payload, updatedAt: Date.now() };
    fs.writeFileSync(CATALOG_DISK_FILE, JSON.stringify(all, null, 2), "utf8");
  } catch (e) {}
}

export async function getOrSeedEngineeringCatalog(docId, defaultPayload, options = {}) {
  const activeProj = getActiveProjectConfig();
  const cacheKey = `${activeProj.projectId}:${docId}`;
  if (!options.refresh && catalogMemoryCache.has(cacheKey)) {
    return catalogMemoryCache.get(cacheKey);
  }
  const diskAll = readCatalogDiskCache();
  let result = (diskAll[docId] && diskAll[docId].payload) ? diskAll[docId].payload : defaultPayload;
  try {
    const adminDb = getAdminFirestore(activeProj.firestoreDatabaseId);
    if (adminDb) {
      const docRef = adminDb.collection("engineeringCatalog").doc(docId);
      const snap = await docRef.get();
      if (snap.exists && snap.data()?.payload) {
        result = snap.data().payload;
        writeCatalogDiskCache(docId, result);
      } else {
        const setRes = await docRef.set({
          id: docId,
          payload: result,
          projectId: activeProj.projectId,
          updatedAt: Date.now()
        }, { merge: true });
        if (!diskAll[docId]) {
          writeCatalogDiskCache(docId, result);
        }
      }
    }
  } catch (err) {
    console.warn(`[database.js] Firestore engineeringCatalog/${docId} sync notice:`, err.message);
  }
  catalogMemoryCache.set(cacheKey, result);
  return result;
}

// API Handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const type = req.query?.type || ((req.url && req.url.includes("stress")) ? "stress-data" : "damage-mechanisms");
  const name = req.query?.name;
  const isStressRoute = (type === "stress-data" || type === "stress");

  try {
    // -------------------------------------------------------------
    // DELETE: Delete entire Year or specific Temperature Point (Requires 'delete' permission)
    // -------------------------------------------------------------
    if (req.method === "DELETE" && isStressRoute) {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;
      const callerEmail = authCheck.email;

      const yearToDelete = req.body?.year || req.query.year;
      if (!yearToDelete) {
        return res.status(400).json({ error: "Missing required parameter 'year'." });
      }

      const deleteResult = await deleteYearStressData(yearToDelete, callerEmail);
      return res.status(200).json({
        success: true,
        message: `Successfully deleted code year ${yearToDelete} stress dataset from database and Firebase Firestore.`,
        ...deleteResult
      });
    }

    // -------------------------------------------------------------
    // POST / PUT: Save / Bulk upload / Update / Delete actions
    // -------------------------------------------------------------
    if (req.method === "POST" || req.method === "PUT") {
      if (isStressRoute) {
        const body = req.body || {};
        const action = (body.action || "").toLowerCase();

        // Action 1: Delete Year (Requires 'delete' permission)
        if (action === "delete-year") {
          const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
          if (!authCheck.authorized) return;
          const callerEmail = authCheck.email;

          const yearToDelete = body.year;
          if (!yearToDelete) {
            return res.status(400).json({ error: "Missing required parameter 'year'." });
          }

          const deleteResult = await deleteYearStressData(yearToDelete, callerEmail);
          return res.status(200).json({
            success: true,
            message: `Successfully deleted code year ${yearToDelete} stress dataset from database and Firebase Firestore.`,
            ...deleteResult
          });
        }

        // Action 2: Update Temperature Point (Requires 'edit' permission)
        if (action === "update-temperature-point" || action === "update-temperature") {
          const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "edit" });
          if (!authCheck.authorized) return;

          const updateResult = await updateTemperaturePoint(body, authCheck.email);
          return res.status(200).json({
            success: true,
            message: `Successfully updated allowable stress for ${body.material} ${body.grade} at ${body.temperature}°C.`,
            ...updateResult
          });
        }

        // Action 3: Delete Temperature Point (Requires 'delete' permission)
        if (action === "delete-temperature-point") {
          const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
          if (!authCheck.authorized) return;

          const delResult = await deleteTemperaturePoint(body, authCheck.email);
          return res.status(200).json({
            success: true,
            message: `Successfully deleted temperature point ${body.temperature}°C for ${body.material} ${body.grade}.`,
            ...delResult
          });
        }

        // Action 4: Bulk upload / Standard tree save (Requires 'edit' permission)
        const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "edit" });
        if (!authCheck.authorized) return;

        let inputTree = body.stressData;

        if (!inputTree && Array.isArray(body.records)) {
          inputTree = recordsToStressTree(body.records);
        }

        if (!inputTree || Object.keys(inputTree).length === 0) {
          return res.status(400).json({
            error: "Invalid payload. Provide either 'records' (array of rows) or 'stressData' (hierarchical object)."
          });
        }

        const saveResult = await saveStressData(inputTree, {
          mode: body.mode || "merge",
          userEmail: authCheck.email,
          batchCount: Array.isArray(body.records) ? body.records.length : undefined,
          source: body.source || "dataloader"
        });

        return res.status(200).json({
          success: true,
          message: saveResult.firestoreSaved
            ? `Successfully saved ${saveResult.stats.records} stress records to Firebase Cloud Firestore!`
            : `Saved ${saveResult.stats.records} stress records to database (Local backup synchronized).`,
          ...saveResult
        });
      }

      return res.status(400).json({ error: "Unsupported write operation for this collection." });
    }

    // -------------------------------------------------------------
    // GET: Retrieve data
    // -------------------------------------------------------------
    const forceRefresh = req.query?.refresh === "1" || req.query?.live === "1" || !!req.query?._t;

    if (type === "ccd-loops") {
      const loops = await getOrSeedEngineeringCatalog("ccd_loops", SEED_CCD_LOOPS, { refresh: forceRefresh });
      return res.status(200).json({ success: true, loops });
    }

    if (type === "periodic-table") {
      const elements = SEED_PERIODIC_RAW_ELEMENTS.map((r) => ({
        number: r[0],
        symbol: r[1],
        name: r[2],
        mass: r[3],
        category: r[4],
        period: r[5],
        group: r[6],
        shells: r[7],
        config: r[8],
        mpK: r[9],
        bpK: r[10],
        density: r[11],
        eneg: r[12],
        phase: r[13],
        discDate: r[14],
        discBy: r[15],
        summary: r[16],
        industrial: r[17]
      }));
      const ptable = await getOrSeedEngineeringCatalog(
        "periodic_table",
        { categories: SEED_PERIODIC_CATEGORIES, elements },
        { refresh: forceRefresh }
      );
      return res.status(200).json({ success: true, ...ptable });
    }

    if (type === "pfd-mechanisms") {
      const units = await getOrSeedEngineeringCatalog("pfd_unit_mechanisms", SEED_PFD_UNIT_MECHANISMS, { refresh: forceRefresh });
      return res.status(200).json({ success: true, units });
    }

    if (isStressRoute) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const data = await getStressData({ refresh: forceRefresh });
      return res.status(200).json(data);
    }

    // Default: damage mechanisms
    const allData = await getDamageMechanisms({ refresh: forceRefresh });
    const mechs = allData["Damage Mechanism"] || {};

    if (name) {
      if (mechs[name]) {
        return res.status(200).json({ name, ...mechs[name] });
      }
      return res.status(404).json({ error: `Mechanism '${name}' not found` });
    }

    return res.status(200).json(allData);
  } catch (error) {
    console.error("Database API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process database request." });
  }
}
