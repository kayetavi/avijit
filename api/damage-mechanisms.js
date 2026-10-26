/**
 * API 571 Damage Mechanism Backend Engine & Data Service
 * Serves comprehensive API 571 3rd Edition catalog, custom mechanisms, search, and resolver logic.
 * Dynamically binds to active Firebase Project.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getActiveProjectConfig } from "./firestoreClient.js";
import { verifyRequestRbac } from "./rbac.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache with project tracking
let cachedMechanisms = null;
let cachedMechanismsProjectId = null;

export function invalidateDamageMechanismsCache() {
  cachedMechanisms = null;
  cachedMechanismsProjectId = null;
}
// 24 API 571 Micrograph Catalog Linkage
export const API571_MICROGRAPH_MAP = {
  corrosionunderinsulation: "image/cui.png",
  corrosionunderinsulationcui: "image/cui.png",
  cui: "image/cui.png",
  "20": "image/cui.png",

  hightemperaturehydrogenattack: "image/htha.png",
  hightemperaturehydrogenattackhtha: "image/htha.png",
  htha: "image/htha.png",
  "10": "image/htha.png",

  sulfidation: "image/sulfidation.png",
  "1": "image/sulfidation.png",

  aminestresscorrosioncracking: "image/AmineSCC.png",
  aminestresscorrosioncrackingaminescc: "image/AmineSCC.png",
  aminescc: "image/AmineSCC.png",
  aminecracking: "image/AmineSCC.png",
  "43": "image/AmineSCC.png",

  ammoniastresscorrosioncracking: "image/AmmoniaSCC.png",
  ammoniascc: "image/AmmoniaSCC.png",
  "45": "image/AmmoniaSCC.png",

  atmosphericcorrosion: "image/AtmosphericCorrosion.png",
  atm: "image/AtmosphericCorrosion.png",
  "19": "image/AtmosphericCorrosion.png",

  boilerwatersteamcondensatecorrosion: "image/BoilerWaterSteamCorrosion.png",
  boilerwaterandsteamcondensatecorrosion: "image/BoilerWaterSteamCorrosion.png",
  boilerwatercorrosion: "image/BoilerWaterSteamCorrosion.png",
  steamcondensatecorrosion: "image/BoilerWaterSteamCorrosion.png",
  "27": "image/BoilerWaterSteamCorrosion.png",

  brinecorrosion: "image/BrineCorrosion.png",
  brine: "image/BrineCorrosion.png",
  "69": "image/BrineCorrosion.png",

  co2corrosion: "image/CO₂_Corrosion.png",
  co2corrosionsweetcorrosion: "image/CO₂_Corrosion.png",
  sweetcorrosion: "image/CO₂_Corrosion.png",
  co2: "image/CO₂_Corrosion.png",
  "28": "image/CO₂_Corrosion.png",

  carbonatestresscorrosioncracking: "image/CarbonateSCC.png",
  carbonatescc: "image/CarbonateSCC.png",
  "11": "image/CarbonateSCC.png",

  causticcorrosion: "image/CausticCorrosion.png",
  "24": "image/CausticCorrosion.png",

  erosionerosioncorrosion: "image/Erosion_Erosion_Corrosion.png",
  erosioncorrosion: "image/Erosion_Erosion_Corrosion.png",
  erosion: "image/Erosion_Erosion_Corrosion.png",
  "17": "image/Erosion_Erosion_Corrosion.png",

  hightemperatureh2h2scorrosion: "image/High_temperature_H₂_H₂S_Corrosion.png",
  hightemph2h2scorrosion: "image/High_temperature_H₂_H₂S_Corrosion.png",
  "4": "image/High_temperature_H₂_H₂S_Corrosion.png",

  hydrogenembrittlement: "image/Hydrogen_Embrittlement.png",
  hydrogenembrittlementhe: "image/Hydrogen_Embrittlement.png",
  he: "image/Hydrogen_Embrittlement.png",
  "47": "image/Hydrogen_Embrittlement.png",

  nitriding: "image/Nitriding.png",
  "40": "image/Nitriding.png",

  soilcorrosion: "image/Soil.png",
  soil: "image/Soil.png",
  "23": "image/Soil.png",

  temperembrittlement: "image/TemperEmbrittlement.png",
  "16": "image/TemperEmbrittlement.png",

  carburization: "image/carburization.png",
  "36": "image/carburization.png",

  fluegasdewpointcorrosion: "image/combustion.png",
  fluegasdewpointcorrosioncombustion: "image/combustion.png",
  combustion: "image/combustion.png",
  "29": "image/combustion.png",

  fuelashcorrosion: "image/fuel_ash_corrosion.png",
  "39": "image/fuel_ash_corrosion.png",

  metaldusting: "image/metal_dusting.png",
  "38": "image/metal_dusting.png",

  naphthenicacidcorrosion: "image/nac.png",
  naphthenicacidcorrosionnac: "image/nac.png",
  nac: "image/nac.png",
  "6": "image/nac.png",

  oxidation: "image/oxidation.png",
  hightemperatureoxidation: "image/oxidation.png",
  "34": "image/oxidation.png",

  sulfuricacidcorrosion: "image/sulfuric-acid-corrosion.png",
  sulfuricacid: "image/sulfuric-acid-corrosion.png",
  "31": "image/sulfuric-acid-corrosion.png"
};

export function getMechanismMicrograph(name, code) {
  if (code && API571_MICROGRAPH_MAP[String(code).toLowerCase().trim()]) {
    return API571_MICROGRAPH_MAP[String(code).toLowerCase().trim()];
  }
  const norm = normalizeStr(name);
  if (API571_MICROGRAPH_MAP[norm]) {
    return API571_MICROGRAPH_MAP[norm];
  }
  for (const [key, val] of Object.entries(API571_MICROGRAPH_MAP)) {
    if (key.length > 3 && (norm.includes(key) || key.includes(norm))) {
      return val;
    }
  }
  return "";
}



// Map common aliases to canonical names
const ALIAS_MAP = {
  "cui": "Corrosion Under Insulation (CUI)",
  "hic": "Hydrogen-Induced Cracking (HIC/SOHIC)",
  "sohic": "Hydrogen-Induced Cracking (HIC/SOHIC)",
  "ssc": "Sulfide Stress Corrosion Cracking (SSC)",
  "scc": "Chloride Stress Corrosion Cracking (Cl-SCC)",
  "clscc": "Chloride Stress Corrosion Cracking (Cl-SCC)",
  "pascc": "Polythionic Acid Stress Corrosion Cracking (PASCC)",
  "hta": "High-Temperature Hydrogen Attack (HTHA)",
  "htha": "High-Temperature Hydrogen Attack (HTHA)",
  "mic": "Microbiologically Influenced Corrosion (MIC)",
  "co2": "CO2 Corrosion (Sweet Corrosion)",
  "h2s": "Sour Water Corrosion (Acidic/Alkaline)",
  "amine": "Amine Stress Corrosion Cracking",
  "caustic": "Caustic Stress Corrosion Cracking (Caustic Embrittlement)",
  "sulfidation": "Sulfidation",
  "oxidation": "Oxidation",
  "naphthenic": "Naphthenic Acid Corrosion (NAC)",
  "nac": "Naphthenic Acid Corrosion (NAC)",
  "fuel ash": "Fuel Ash Corrosion",
  "flue gas": "Flue Gas Dew Point Corrosion",
  "ammonium chloride": "Ammonium Chloride Corrosion",
  "ammonium bisulfide": "Ammonium Bisulfide Corrosion",
  "polythionic": "Polythionic Acid Stress Corrosion Cracking (PASCC)",
  "chloride cracking": "Chloride Stress Corrosion Cracking (Cl-SCC)",
  "caustic cracking": "Caustic Stress Corrosion Cracking (Caustic Embrittlement)",
  "amine cracking": "Amine Stress Corrosion Cracking",
  "boiler water / steam condensate corrosion": "Boiler Water and Steam Condensate Corrosion",
  "boilerwatersteamcondensatecorrosion": "Boiler Water and Steam Condensate Corrosion",
  "high-temp h2/h2s corrosion": "High-temperature H₂/H₂S Corrosion",
  "hightemph2h2scorrosion": "High-temperature H₂/H₂S Corrosion",
  "hightemperatureh2h2scorrosion": "High-temperature H₂/H₂S Corrosion"
};

function normalizeStr(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

let cachedMechanismsTimestamp = 0;
const MECHANISMS_CACHE_TTL = 15000; // 15s TTL for fresh real-time Firestore sync

// Fetch all damage mechanisms dynamically based on active Firebase Project
export async function getAllDamageMechanisms(options = {}) {
  const activeProj = getActiveProjectConfig();
  const isExpired = Date.now() - cachedMechanismsTimestamp > MECHANISMS_CACHE_TTL;
  const forceRefresh = options?.refresh === true || options?.live === true;

  if (!forceRefresh && !isExpired && cachedMechanisms && cachedMechanismsProjectId === activeProj.projectId) {
    return cachedMechanisms;
  }

  let mechs = {};
  let firestoreLoaded = false;

  // 1. Fetch live from Active Project's Firestore
  try {
    const adminDb = getAdminFirestore(activeProj.firestoreDatabaseId);
    if (adminDb) {
      const snap = await adminDb.collection("damageMechanisms").get();
      if (!snap.empty) {
        firestoreLoaded = true;
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          let name = d.name;
          if (!name || name === "undefined") {
            try {
              name = decodeURIComponent(docSnap.id);
            } catch (e) {
              name = docSnap.id;
            }
          }
          const existing = mechs[name] || {};
          mechs[name] = {
            id: docSnap.id,
            code: d.code || existing.code || docSnap.id,
            name: name,
            category: d.category || existing.category || "API 571 Damage Mechanism",
            description: d.description || existing.description || "",
            affectedMaterials: d.affectedMaterials || d.materials || existing.affectedMaterials || "",
            criticalFactors: d.criticalFactors || existing.criticalFactors || "",
            affectedUnits: d.affectedUnits || existing.affectedUnits || "",
            appearance: d.appearance || existing.appearance || "",
            mitigation: d.mitigation || existing.mitigation || "",
            inspection: d.inspection || existing.inspection || "",
            temperatureComparison: d.temperatureComparison || existing.temperatureComparison || "",
            imagePath: d.imagePath || existing.imagePath || getMechanismMicrograph(name, d.code || docSnap.id),
            isCustom: d.isCustom !== undefined ? d.isCustom : (existing.isCustom || false),
            projectId: activeProj.projectId,
            updatedAt: d.updatedAt ? (d.updatedAt.toMillis ? d.updatedAt.toMillis() : d.updatedAt) : (existing.updatedAt || Date.now())
          };
        });
      } else {
        // Auto-seed Firestore with full master catalog if empty
        console.info(`[DamageMechanisms] Firestore collection 'damageMechanisms' is empty in project ${activeProj.projectId}. Auto-seeding master catalog...`);
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
          firestoreLoaded = true;
        } catch (seedErr) {
          console.warn("[DamageMechanisms] Auto-seed warning:", seedErr.message);
        }
      }
    }
  } catch (err) {
    console.warn(`Firestore read for ${activeProj.projectId}:`, err.message);
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

  // 2. Fallback to master baseline catalog only if mechs is still empty
  if (Object.keys(mechs).length === 0) {
    try {
      const { fullCatalog } = await import("../scripts/seed_api571_mechanisms.js");
      mechs = JSON.parse(JSON.stringify(fullCatalog));
    } catch (e) {
      console.warn("Failed to load fullCatalog fallback:", e.message);
    }
  }

  // Ensure all 24 micrographs are linked across catalog
  for (const [name, val] of Object.entries(mechs)) {
    if (!val.imagePath) {
      const fallbackImg = getMechanismMicrograph(name, val.code);
      if (fallbackImg) val.imagePath = fallbackImg;
    }
  }

  cachedMechanisms = mechs;
  cachedMechanismsProjectId = activeProj.projectId;
  cachedMechanismsTimestamp = Date.now();
  return mechs;
}

// Resolve single mechanism by name, code, or alias
export async function resolveDamageMechanism(query) {
  if (!query) return null;
  const mechs = await getAllDamageMechanisms();
  const qStr = String(query).trim();
  const qNorm = normalizeStr(qStr);

  // 1. Exact match
  if (mechs[qStr]) {
    return { name: qStr, ...mechs[qStr] };
  }

  // 2. Exact code match
  for (const [name, val] of Object.entries(mechs)) {
    if (val.code && String(val.code).trim().toLowerCase() === qStr.toLowerCase()) {
      return { name, ...val };
    }
  }

  // 3. Alias dictionary match
  const matchedName = ALIAS_MAP[qNorm] || ALIAS_MAP[qStr.toLowerCase()];
  if (matchedName && mechs[matchedName]) {
    return { name: matchedName, ...mechs[matchedName] };
  }

  // 4. Normalized key match
  for (const [name, val] of Object.entries(mechs)) {
    if (normalizeStr(name) === qNorm) {
      return { name, ...val };
    }
  }

  // 5. Substring inclusion
  for (const [name, val] of Object.entries(mechs)) {
    const nNorm = normalizeStr(name);
    if (nNorm.includes(qNorm) || qNorm.includes(nNorm)) {
      return { name, ...val };
    }
  }

  return null;
}

// Handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const activeProj = getActiveProjectConfig();
    const action = String(req.query.action || req.body?.action || "").toLowerCase().trim();

    // POST / PUT: Save or Update Damage Mechanism in Firestore (Requires Authentication + 'edit' permission)
    if ((req.method === "POST" || req.method === "PUT") && (action === "save" || req.body?.mechanism)) {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "edit" });
      if (!authCheck.authorized) return;

      const payload = req.body?.mechanism || req.body || {};
      const mechName = String(payload.name || "").trim();
      if (!mechName) {
        return res.status(400).json({ success: false, error: "Mechanism 'name' is required." });
      }
      const docId = String(payload.id || payload.code || mechName.replace(/[^a-zA-Z0-9_-]/g, "_")).trim();
      const record = {
        id: docId,
        code: String(payload.code || docId).trim(),
        name: mechName,
        category: String(payload.category || "API 571 Damage Mechanism").trim(),
        description: String(payload.description || ""),
        affectedMaterials: String(payload.affectedMaterials || ""),
        criticalFactors: String(payload.criticalFactors || ""),
        affectedUnits: String(payload.affectedUnits || ""),
        appearance: String(payload.appearance || ""),
        mitigation: String(payload.mitigation || ""),
        inspection: String(payload.inspection || ""),
        temperatureComparison: String(payload.temperatureComparison || ""),
        imagePath: payload.imagePath || getMechanismMicrograph(mechName, payload.code || docId),
        isCustom: payload.isCustom !== undefined ? Boolean(payload.isCustom) : true,
        projectId: activeProj.projectId,
        updatedBy: authCheck.email,
        updatedAt: Date.now()
      };

      const adminDb = getAdminFirestore(activeProj.firestoreDatabaseId);
      if (adminDb) {
        await adminDb.collection("damageMechanisms").doc(docId).set(record, { merge: true });
      }
      invalidateDamageMechanismsCache();
      return res.status(200).json({
        success: true,
        activeProject: activeProj.projectId,
        message: `Damage mechanism '${mechName}' saved to Firestore.`,
        mechanism: record
      });
    }

    // DELETE: Remove Damage Mechanism from Firestore (Requires Authentication + 'delete' permission)
    if (req.method === "DELETE" || action === "delete") {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;

      const targetId = String(req.query.id || req.body?.id || req.query.code || req.body?.code || req.query.name || req.body?.name || "").trim();
      if (!targetId) {
        return res.status(400).json({ success: false, error: "Mechanism 'id', 'code', or 'name' is required for deletion." });
      }
      const docId = targetId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const adminDb = getAdminFirestore(activeProj.firestoreDatabaseId);
      if (adminDb) {
        await adminDb.collection("damageMechanisms").doc(targetId).delete().catch(() => {});
        if (docId !== targetId) {
          await adminDb.collection("damageMechanisms").doc(docId).delete().catch(() => {});
        }
      }
      invalidateDamageMechanismsCache();
      return res.status(200).json({
        success: true,
        activeProject: activeProj.projectId,
        deletedId: targetId,
        deletedBy: authCheck.email
      });
    }

    const name = req.query.name || req.body?.name;
    const code = req.query.code || req.body?.code;
    const search = req.query.q || req.query.search || req.body?.q;

    // Search / Single Resolve
    if (name || code) {
      const match = await resolveDamageMechanism(name || code);
      if (match) {
        return res.status(200).json({ success: true, activeProject: activeProj.projectId, mechanism: match });
      }
      return res.status(404).json({ success: false, activeProject: activeProj.projectId, error: `Damage mechanism '${name || code}' not found` });
    }

    const isForceRefresh = req.query.refresh === "true" || req.query.refresh === "1" || req.query.live === "true" || req.query.live === "1";
    const allMechs = await getAllDamageMechanisms({ refresh: isForceRefresh });

    // Query search / Filter / Synonym Resolver
    if (search) {
      const directMatch = await resolveDamageMechanism(search);
      const sNorm = normalizeStr(search);
      const filtered = {};
      for (const [mName, mVal] of Object.entries(allMechs)) {
        const hay = [
          mName,
          mVal.code || "",
          mVal.category || "",
          mVal.description || "",
          mVal.affectedMaterials || "",
          mVal.affectedUnits || ""
        ].join(" ").toLowerCase();
        if (hay.includes(search.toLowerCase()) || normalizeStr(mName).includes(sNorm)) {
          filtered[mName] = mVal;
        }
      }
      return res.status(200).json({
        success: true,
        activeProject: activeProj.projectId,
        count: Object.keys(filtered).length,
        mechanism: directMatch,
        mechanisms: filtered
      });
    }

    // Build grouped categories map for convenient lookup
    const categories = {};
    for (const [mName, mVal] of Object.entries(allMechs)) {
      const cat = mVal.category || "API 571 Damage Mechanism";
      if (!categories[cat]) categories[cat] = {};
      categories[cat][mName] = mVal;
    }

    // Default: return full structure { "Damage Mechanism": mechs } and grouped categories
    return res.status(200).json({
      success: true,
      source: "firestore",
      activeProject: activeProj.projectId,
      activeProjectName: activeProj.name,
      count: Object.keys(allMechs).length,
      "Damage Mechanism": allMechs,
      mechanisms: allMechs,
      categories
    });
  } catch (error) {
    console.error("Damage Mechanisms API Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
}
