import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "./firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "../data/secure/pipe_dimensions.json");

const STANDARD_NPS_LIST = [
  "1/8", "1/4", "3/8", "1/2", "3/4", "1", "1 1/4", "1 1/2",
  "2", "2 1/2", "3", "3 1/2", "4", "5", "6", "8",
  "10", "12", "14", "16", "18", "20", "22", "24",
  "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48"
];

const DECIMAL_MAP = {
  "1/8": "0.125", "1/4": "0.25", "3/8": "0.375", "1/2": "0.5",
  "3/4": "0.75", "1": "1.0", "1 1/4": "1.25", "1 1/2": "1.5",
  "2": "2.0", "2 1/2": "2.5", "3": "3.0", "3 1/2": "3.5",
  "4": "4.0", "5": "5.0", "6": "6.0", "8": "8.0",
  "10": "10.0", "12": "12.0", "14": "14.0", "16": "16.0",
  "18": "18.0", "20": "20.0", "22": "22.0", "24": "24.0",
  "26": "26.0", "28": "28.0", "30": "30.0", "32": "32.0",
  "34": "34.0", "36": "36.0", "38": "38.0", "40": "40.0",
  "42": "42.0", "44": "44.0", "46": "46.0", "48": "48.0"
};

// Resilient embedded fallback in case both Firestore and disk are unreachable
const EMBEDDED_FALLBACK_PIPE_DIMENSIONS = {
  standard: "ASME B36.10M / ASME B36.19M",
  unit: "mm",
  npsList: STANDARD_NPS_LIST,
  decimalMap: DECIMAL_MAP,
  pipeOD: {
    "1/8": 10.3, "0.125": 10.3, "1/4": 13.7, "0.25": 13.7, "3/8": 17.1, "0.375": 17.1,
    "1/2": 21.3, "0.5": 21.3, "3/4": 26.7, "0.75": 26.7, "1": 33.4,
    "1 1/4": 42.2, "1.25": 42.2, "1 1/2": 48.3, "1.5": 48.3, "2": 60.3,
    "2 1/2": 73.0, "2.5": 73.0, "3": 88.9, "3 1/2": 101.6, "3.5": 101.6,
    "4": 114.3, "5": 141.3, "6": 168.3, "8": 219.1, "10": 273.0, "12": 323.9,
    "14": 355.6, "16": 406.4, "18": 457.0, "20": 508.0, "22": 559.0, "24": 610.0,
    "26": 660.4, "28": 711.2, "30": 762.0, "32": 812.8, "34": 863.6, "36": 914.4,
    "38": 965.2, "40": 1016.0, "42": 1066.8, "44": 1117.6, "46": 1168.4, "48": 1219.2
  },
  pipeDataMaster: {
    "1/8": { "SCH 10S": 1.24, "SCH 10": 1.24, "SCH 40S": 1.73, "SCH STD": 1.73, "SCH 40": 1.73, "SCH 80S": 2.41, "SCH XS": 2.41, "SCH 80": 2.41 },
    "1/4": { "SCH 10S": 1.65, "SCH 10": 1.65, "SCH 40S": 2.24, "SCH STD": 2.24, "SCH 40": 2.24, "SCH 80S": 3.02, "SCH XS": 3.02, "SCH 80": 3.02 },
    "3/8": { "SCH 10S": 1.65, "SCH 10": 1.65, "SCH 40S": 2.31, "SCH STD": 2.31, "SCH 40": 2.31, "SCH 80S": 3.20, "SCH XS": 3.20, "SCH 80": 3.20 },
    "1/2": { "SCH 5S": 1.65, "SCH 10S": 2.11, "SCH 10": 2.11, "SCH 40S": 2.77, "SCH STD": 2.77, "SCH 40": 2.77, "SCH 80S": 3.73, "SCH XS": 3.73, "SCH 80": 3.73, "SCH 160": 4.78, "SCH XXS": 7.47 },
    "3/4": { "SCH 5S": 1.65, "SCH 10S": 2.11, "SCH 10": 2.11, "SCH 40S": 2.87, "SCH STD": 2.87, "SCH 40": 2.87, "SCH 80S": 3.91, "SCH XS": 3.91, "SCH 80": 3.91, "SCH 160": 5.56, "SCH XXS": 7.82 },
    "1": { "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.38, "SCH STD": 3.38, "SCH 40": 3.38, "SCH 80S": 4.55, "SCH XS": 4.55, "SCH 80": 4.55, "SCH 160": 6.35, "SCH XXS": 9.09 },
    "1 1/4": { "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.56, "SCH STD": 3.56, "SCH 40": 3.56, "SCH 80S": 4.85, "SCH XS": 4.85, "SCH 80": 4.85, "SCH 160": 6.35, "SCH XXS": 9.70 },
    "1 1/2": { "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.68, "SCH STD": 3.68, "SCH 40": 3.68, "SCH 80S": 5.08, "SCH XS": 5.08, "SCH 80": 5.08, "SCH 160": 7.14, "SCH XXS": 10.16 },
    "2": { "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.91, "SCH STD": 3.91, "SCH 40": 3.91, "SCH 80S": 5.54, "SCH XS": 5.54, "SCH 80": 5.54, "SCH 160": 8.74, "SCH XXS": 11.07 },
    "2 1/2": { "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.16, "SCH STD": 5.16, "SCH 40": 5.16, "SCH 80S": 7.01, "SCH XS": 7.01, "SCH 80": 7.01, "SCH 160": 9.53, "SCH XXS": 14.02 },
    "3": { "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.49, "SCH STD": 5.49, "SCH 40": 5.49, "SCH 80S": 7.62, "SCH XS": 7.62, "SCH 80": 7.62, "SCH 160": 11.13, "SCH XXS": 15.24 },
    "3 1/2": { "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.74, "SCH STD": 5.74, "SCH 40": 5.74, "SCH 80S": 8.08, "SCH XS": 8.08, "SCH 80": 8.08, "SCH XXS": 16.15 },
    "4": { "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 6.02, "SCH STD": 6.02, "SCH 40": 6.02, "SCH 80S": 8.56, "SCH XS": 8.56, "SCH 80": 8.56, "SCH 120": 11.13, "SCH 160": 13.49, "SCH XXS": 17.12 },
    "5": { "SCH 5S": 2.77, "SCH 10S": 3.40, "SCH 10": 3.40, "SCH 40S": 6.55, "SCH STD": 6.55, "SCH 40": 6.55, "SCH 80S": 9.53, "SCH XS": 9.53, "SCH 80": 9.53, "SCH 120": 12.70, "SCH 160": 15.88, "SCH XXS": 19.05 },
    "6": { "SCH 5S": 2.77, "SCH 10S": 3.40, "SCH 10": 3.40, "SCH 40S": 7.11, "SCH STD": 7.11, "SCH 40": 7.11, "SCH 80S": 10.97, "SCH XS": 10.97, "SCH 80": 10.97, "SCH 120": 14.27, "SCH 160": 18.26, "SCH XXS": 21.95 },
    "8": { "SCH 5S": 2.77, "SCH 10S": 3.76, "SCH 10": 3.76, "SCH 20": 6.35, "SCH 30": 7.04, "SCH 40S": 8.18, "SCH STD": 8.18, "SCH 40": 8.18, "SCH 60": 10.31, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 12.70, "SCH 100": 15.09, "SCH 120": 18.26, "SCH 140": 20.62, "SCH 160": 23.01, "SCH XXS": 22.23 },
    "10": { "SCH 5S": 3.40, "SCH 10S": 4.19, "SCH 10": 4.19, "SCH 20": 6.35, "SCH 30": 7.80, "SCH 40S": 9.27, "SCH STD": 9.27, "SCH 40": 9.27, "SCH 60": 12.70, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 15.09, "SCH 100": 18.26, "SCH 120": 21.44, "SCH 140": 25.40, "SCH 160": 28.58, "SCH XXS": 25.40 },
    "12": { "SCH 5S": 3.96, "SCH 10S": 4.57, "SCH 10": 4.57, "SCH 20": 6.35, "SCH 30": 8.38, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 10.31, "SCH 60": 14.27, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 17.48, "SCH 100": 21.44, "SCH 120": 25.40, "SCH 140": 28.58, "SCH 160": 33.32, "SCH XXS": 25.40 },
    "14": { "SCH 5S": 3.96, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 9.53, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 11.13, "SCH 60": 15.09, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 19.05, "SCH 100": 23.83, "SCH 120": 27.79, "SCH 140": 31.75, "SCH 160": 35.71 },
    "16": { "SCH 5S": 4.19, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 9.53, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 12.70, "SCH 60": 16.66, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 21.44, "SCH 100": 26.19, "SCH 120": 30.96, "SCH 140": 36.53, "SCH 160": 40.49 },
    "18": { "SCH 5S": 4.19, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 11.13, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 14.27, "SCH 60": 19.05, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 23.83, "SCH 100": 29.36, "SCH 120": 34.93, "SCH 140": 39.67, "SCH 160": 45.24 },
    "20": { "SCH 5S": 4.78, "SCH 10S": 5.54, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 12.70, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 15.09, "SCH 60": 20.62, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 26.19, "SCH 100": 32.54, "SCH 120": 38.10, "SCH 140": 44.45, "SCH 160": 50.01 },
    "22": { "SCH 5S": 4.78, "SCH 10S": 5.54, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 12.70, "SCH STD": 9.53, "SCH 60": 22.23, "SCH XS": 12.70, "SCH 80": 28.58, "SCH 100": 34.93, "SCH 120": 41.28, "SCH 140": 47.63, "SCH 160": 53.98 },
    "24": { "SCH 5S": 5.54, "SCH 10S": 6.35, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 14.27, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 17.48, "SCH 60": 24.61, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 30.96, "SCH 100": 38.89, "SCH 120": 46.02, "SCH 140": 52.37, "SCH 160": 59.54 },
    "26": { "SCH 10": 7.92, "SCH 20": 12.70, "SCH STD": 9.53, "SCH XS": 12.70 },
    "28": { "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH STD": 9.53, "SCH XS": 12.70 },
    "30": { "SCH 5S": 6.35, "SCH 10S": 7.92, "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH STD": 9.53, "SCH XS": 12.70 },
    "32": { "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 17.48, "SCH STD": 9.53, "SCH XS": 12.70 },
    "34": { "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 17.48, "SCH STD": 9.53, "SCH XS": 12.70 },
    "36": { "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 19.05, "SCH STD": 9.53, "SCH XS": 12.70 },
    "38": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70 },
    "40": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88 },
    "42": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88 },
    "44": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70 },
    "46": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70 },
    "48": { "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88 }
  }
};

// Ensure decimal aliases exist in embedded fallback
for (const [frac, dec] of Object.entries(DECIMAL_MAP)) {
  if (EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[frac]) {
    EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[dec] = EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[frac];
    const clean = dec.replace(/\.0$/, "");
    if (clean && !EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[clean]) {
      EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[clean] = EMBEDDED_FALLBACK_PIPE_DIMENSIONS.pipeDataMaster[frac];
    }
  }
}

// High-performance in-memory server cache (5-minute TTL)
let PIPE_DIM_CACHE = {
  data: null,
  source: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000
};

/**
 * Normalizes pipeOD and pipeDataMaster to guarantee strict numeric values
 * and complete fractional/decimal alias coverage.
 */
function normalizePipeDimensionsDataset(raw) {
  const pipeOD = {};
  const pipeDataMaster = {};

  const srcOD = raw?.pipeOD || raw?.odMap || {};
  for (const [k, v] of Object.entries(srcOD)) {
    const num = Number(v);
    if (!isNaN(num) && num > 0) {
      pipeOD[k] = num;
    }
  }

  const srcMaster = raw?.pipeDataMaster || raw?.master || {};
  for (const [npsKey, schObj] of Object.entries(srcMaster)) {
    if (schObj && typeof schObj === "object") {
      pipeDataMaster[npsKey] = {};
      for (const [schName, wtVal] of Object.entries(schObj)) {
        const numWt = Number(wtVal);
        if (!isNaN(numWt) && numWt > 0) {
          pipeDataMaster[npsKey][schName] = numWt;
        }
      }
    }
  }

  // Ensure decimal aliases for fractional NPS keys
  const decMap = raw?.decimalMap || DECIMAL_MAP;
  for (const [frac, dec] of Object.entries(decMap)) {
    if (pipeOD[frac] !== undefined) {
      pipeOD[dec] = pipeOD[frac];
      const clean = String(dec).replace(/\.0$/, "");
      if (clean && pipeOD[clean] === undefined) {
        pipeOD[clean] = pipeOD[frac];
      }
    }
    if (pipeDataMaster[frac]) {
      pipeDataMaster[dec] = pipeDataMaster[frac];
      const clean = String(dec).replace(/\.0$/, "");
      if (clean && !pipeDataMaster[clean]) {
        pipeDataMaster[clean] = pipeDataMaster[frac];
      }
    }
  }

  return {
    standard: raw?.standard || "ASME B36.10M / ASME B36.19M",
    unit: raw?.unit || "mm",
    npsList: Array.isArray(raw?.npsList) && raw.npsList.length > 0 ? raw.npsList : STANDARD_NPS_LIST,
    decimalMap: decMap,
    pipeOD,
    pipeDataMaster
  };
}

/**
 * Loads Pipe Dimensions from Firestore (`pipeDimensions/asme_b36_10m_19m`)
 * with in-memory caching and fallback to `data/secure/pipe_dimensions.json` or embedded defaults.
 */
export async function loadPipeDimensionsFromFirestore(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && PIPE_DIM_CACHE.data && (now - PIPE_DIM_CACHE.timestamp) < PIPE_DIM_CACHE.ttl) {
    return { ...PIPE_DIM_CACHE.data, source: PIPE_DIM_CACHE.source, cached: true };
  }

  // 1. Primary authoritative source: Cloud Firestore
  try {
    const db = getAdminFirestore();
    if (db) {
      const docSnap = await db.collection("pipeDimensions").doc("asme_b36_10m_19m").get();
      if (docSnap.exists) {
        const docData = docSnap.data();
        if (docData && docData.pipeOD && docData.pipeDataMaster && Object.keys(docData.pipeDataMaster).length > 0) {
          const normalized = normalizePipeDimensionsDataset(docData);
          PIPE_DIM_CACHE = {
            data: normalized,
            source: "firestore",
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000
          };
          return { ...normalized, source: "firestore", cached: false };
        }
      }
    }
  } catch (err) {
    console.warn("[pipe-dimensions] Firestore fetch warning, using fallback:", err.message);
  }

  // 2. Local secure JSON fallback
  try {
    if (fs.existsSync(DATA_PATH)) {
      const rawJson = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
      if (rawJson && rawJson.pipeDataMaster && Object.keys(rawJson.pipeDataMaster).length > 0) {
        const normalized = normalizePipeDimensionsDataset(rawJson);
        PIPE_DIM_CACHE = {
          data: normalized,
          source: "local_fallback",
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000
        };
        return { ...normalized, source: "local_fallback", cached: false };
      }
    }
  } catch (err) {
    console.warn("[pipe-dimensions] Local JSON fallback warning:", err.message);
  }

  // 3. Embedded ASME B36.10M / B36.19M standard fallback
  const fallback = normalizePipeDimensionsDataset(EMBEDDED_FALLBACK_PIPE_DIMENSIONS);
  PIPE_DIM_CACHE = {
    data: fallback,
    source: "embedded_fallback",
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000
  };
  return { ...fallback, source: "embedded_fallback", cached: false };
}

function resolveNpsKey(rawNps, pipeOD, pipeDataMaster, decimalMap = DECIMAL_MAP) {
  if (!rawNps && rawNps !== 0) return null;
  const clean = String(rawNps).replace(/"/g, "").replace(/^NPS\s*/i, "").trim().replace("-", " ");
  if (pipeDataMaster[clean]) return clean;
  if (decimalMap[clean] && pipeDataMaster[decimalMap[clean]]) return decimalMap[clean];

  // Reverse lookup from decimal to fraction
  for (const [frac, dec] of Object.entries(decimalMap)) {
    if (Number(dec) === Number(clean) && pipeDataMaster[frac]) {
      return frac;
    }
  }
  return null;
}

function resolveNpsByOD(odVal, pipeOD, pipeDataMaster) {
  const numOD = parseFloat(odVal);
  if (isNaN(numOD) || numOD <= 0) return null;
  let closestKey = null;
  let minDiff = Infinity;
  for (const [k, od] of Object.entries(pipeOD)) {
    const diff = Math.abs(Number(od) - numOD);
    if (diff < minDiff) {
      minDiff = diff;
      closestKey = k;
    }
  }
  if (minDiff <= 1.5 && closestKey && pipeDataMaster[closestKey]) {
    return closestKey;
  }
  return null;
}

function normalizeScheduleKey(rawSch, schedulesObj) {
  if (!rawSch || !schedulesObj) return null;
  const s = String(rawSch).trim();
  if (schedulesObj[s] !== undefined) return s;
  const upper = s.toUpperCase();
  if (schedulesObj[upper] !== undefined) return upper;
  const withPrefix = upper.startsWith("SCH ") ? upper : `SCH ${upper}`;
  if (schedulesObj[withPrefix] !== undefined) return withPrefix;
  return null;
}

function computePipeGeometry(nps, sch, odVal, thickVal) {
  const od = Number(odVal);
  const thick = Number(thickVal);
  if (isNaN(od) || isNaN(thick) || od <= 0 || thick <= 0) return null;

  const id = Number((od - 2 * thick).toFixed(2));
  const circumference = Number((Math.PI * od).toFixed(2));
  const unitWeightKg = Number((0.0246615 * thick * (od - thick)).toFixed(2));
  const unitWeightLb = Number((unitWeightKg * 0.6719689).toFixed(2));
  const flowAreaCm2 = Number(((Math.PI / 4) * Math.pow(id / 10, 2)).toFixed(2));

  return {
    nps,
    sch,
    od: Number(od),
    od_in: Number((od / 25.4).toFixed(3)),
    thick: Number(thick),
    thick_in: Number((thick / 25.4).toFixed(3)),
    id,
    id_in: Number((id / 25.4).toFixed(3)),
    circumference,
    circumference_in: Number((circumference / 25.4).toFixed(3)),
    unitWeightKg,
    unitWeightLb,
    flowAreaCm2
  };
}

export default async function handler(req, res) {
  try {
    const forceRefresh = req.query?.refresh === "true" || req.body?.refresh === true;
    const dataset = await loadPipeDimensionsFromFirestore(forceRefresh);
    const { pipeOD, pipeDataMaster, npsList, decimalMap, standard, unit, source, cached } = dataset;

    if (req.method === "GET") {
      const { nps, sch, od } = req.query || {};

      // Filtered query by NPS or OD
      if (nps || od) {
        const resolvedNps = nps
          ? resolveNpsKey(nps, pipeOD, pipeDataMaster, decimalMap)
          : resolveNpsByOD(od, pipeOD, pipeDataMaster);

        if (!resolvedNps) {
          return res.status(404).json({
            success: false,
            error: `Pipe NPS/OD (${nps || od}) not found in ASME B36.10M / B36.19M catalog.`
          });
        }

        const odVal = Number(pipeOD[resolvedNps]);
        const schedules = pipeDataMaster[resolvedNps] || {};

        if (sch) {
          const resolvedSch = normalizeScheduleKey(sch, schedules);
          if (!resolvedSch) {
            return res.status(404).json({
              success: false,
              error: `Schedule '${sch}' not defined for NPS ${resolvedNps}`
            });
          }
          const wt = Number(schedules[resolvedSch]);
          const geometry = computePipeGeometry(resolvedNps, resolvedSch, odVal, wt);
          return res.status(200).json({
            success: true,
            source,
            cached,
            standard,
            unit,
            nps: resolvedNps,
            schedule: resolvedSch,
            od: odVal,
            wallThickness: wt,
            geometry
          });
        }

        return res.status(200).json({
          success: true,
          source,
          cached,
          standard,
          unit,
          nps: resolvedNps,
          od: odVal,
          od_in: Number((odVal / 25.4).toFixed(3)),
          schedules,
          scheduleList: Object.keys(schedules)
        });
      }

      // Full catalog response
      return res.status(200).json({
        success: true,
        source,
        cached,
        standard,
        unit,
        npsList,
        decimalMap,
        pipeOD,
        odMap: pipeOD,
        pipeDataMaster,
        master: pipeDataMaster
      });
    }

    if (req.method === "POST") {
      const { action, nps, sch, od } = req.body || {};

      if (!action || action === "get_all") {
        return res.status(200).json({
          success: true,
          source,
          cached,
          standard,
          unit,
          npsList,
          decimalMap,
          pipeOD,
          odMap: pipeOD,
          pipeDataMaster,
          master: pipeDataMaster
        });
      }

      const resolvedNps = nps
        ? resolveNpsKey(nps, pipeOD, pipeDataMaster, decimalMap)
        : resolveNpsByOD(od, pipeOD, pipeDataMaster);

      if (action === "get_by_nps") {
        if (!resolvedNps) {
          return res.status(404).json({
            success: false,
            error: `Pipe NPS '${nps || od}' not found in ASME standard tables.`
          });
        }
        const odVal = Number(pipeOD[resolvedNps]);
        const schedules = pipeDataMaster[resolvedNps] || {};
        return res.status(200).json({
          success: true,
          source,
          nps: resolvedNps,
          od: odVal,
          schedules
        });
      }

      if (action === "get_thickness" || action === "calculate_geometry") {
        if (!resolvedNps || !sch) {
          return res.status(400).json({
            success: false,
            error: "Both 'nps' (or 'od') and 'sch' parameters are required."
          });
        }
        const schedules = pipeDataMaster[resolvedNps] || {};
        const resolvedSch = normalizeScheduleKey(sch, schedules);
        if (!resolvedSch) {
          return res.status(404).json({
            success: false,
            error: `Wall thickness not defined for NPS ${resolvedNps} and schedule ${sch}.`
          });
        }
        const odVal = Number(pipeOD[resolvedNps]);
        const thickVal = Number(schedules[resolvedSch]);
        const geometry = computePipeGeometry(resolvedNps, resolvedSch, odVal, thickVal);

        return res.status(200).json({
          success: true,
          source,
          ...geometry
        });
      }

      return res.status(400).json({
        success: false,
        error: `Unsupported action: ${action}`
      });
    }

    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });
  } catch (err) {
    console.error("Pipe Dimensions API Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while loading pipe dimensions."
    });
  }
}
