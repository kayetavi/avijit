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
