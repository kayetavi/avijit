import { getAdminFirestore } from "./firebaseAdmin.js";
import { loadPipeDimensionsFromFirestore } from "./pipe-dimensions.js";

const DEFAULT_B313_CATALOG = {
  standard: "ASME B31.3 Process Piping & ASME Section VIII Div. 1",
  unitConversions: {
    pressureToMPa: { MPa: 1.0, bar: 0.1, kgcm2: 0.0980665, psi: 0.00689476 },
    stressToMPa: { MPa: 1.0, ksi: 6.89476, kgcm2: 0.0980665, psi: 0.00689476 }
  },
  yTable: {
    ferritic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, note: "General Service" },
      { temp: "510°C (950°F)", y: 0.5 },
      { temp: "≥ 538°C (1000°F)", y: 0.7 }
    ],
    austenitic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, note: "General Service" },
      { temp: "510°C (950°F)", y: 0.4 },
      { temp: "538°C (1000°F)", y: 0.4 },
      { temp: "566°C (1050°F)", y: 0.4 },
      { temp: "593°C (1100°F)", y: 0.5 },
      { temp: "≥ 621°C (1150°F)", y: 0.7 }
    ],
    nickel: [
      { temp: "≤ 593°C (1100°F)", y: 0.4, note: "All Standard Temps" },
      { temp: "621°C (1150°F)", y: 0.5 },
      { temp: "≥ 649°C (1200°F)", y: 0.7 }
    ],
    grayiron: [
      { temp: "All Allowed Temperatures", y: 0.0, note: "Cast / Brittle" }
    ],
    other: [
      { temp: "All Allowed Temperatures", y: 0.4, note: "Standard Ductile" }
    ]
  },
  wTable: [
    { maxTempC: 427, w: "1.0", numericW: 1.0, label: "≤ 427°C — W = 1.00" },
    { maxTempC: 454, w: "0.95", numericW: 0.95, label: "454°C — W = 0.95" },
    { maxTempC: 482, w: "0.91", numericW: 0.91, label: "482°C — W = 0.91" },
    { maxTempC: 510, w: "0.88", numericW: 0.88, label: "510°C — W = 0.88" },
    { maxTempC: 538, w: "0.85", numericW: 0.85, label: "538°C — W = 0.85" },
    { maxTempC: 566, w: "0.82", numericW: 0.82, label: "566°C — W = 0.82" },
    { maxTempC: 593, w: "0.78", numericW: 0.78, label: "593°C — W = 0.78" },
    { maxTempC: 621, w: "0.75", numericW: 0.75, label: "621°C — W = 0.75" },
    { maxTempC: 649, w: "0.72", numericW: 0.72, label: "649°C — W = 0.72" },
    { maxTempC: 9999, w: "0.70", numericW: 0.70, label: "≥ 677°C — W = 0.70" }
  ],
  jointEfficiencyTable: [
    { code: "ASME B31.3 Table A-1B / Sec VIII UW-12", type: "Seamless Pipe / 100% Radiography (RT)", value: 1.0, label: "Seamless / 100% RT (1.00)" },
    { code: "ASME B31.3 Table A-1B", type: "Double Butt Welded Pipe (EFW)", value: 0.95, label: "Double Butt Welded (0.95)" },
    { code: "ASME B31.3 Table A-1B", type: "Double Butt Welded with Spot RT", value: 0.90, label: "Spot RT (0.90)" },
    { code: "ASME B31.3 Table A-1B / Sec VIII UW-12", type: "Electric Resistance Welded (ERW) / Spot RT", value: 0.85, label: "ERW Not RT (0.85)" },
    { code: "ASME B31.3 Table A-1B", type: "Single Butt Welded Seam", value: 0.80, label: "Single Butt Seam (0.80)" },
    { code: "ASME Sec VIII Div. 1 UW-12", type: "Double-Welded Butt Joint (No RT)", value: 0.70, label: "Double-Welded No RT (0.70)" },
    { code: "ASME B31.3 Table A-1B", type: "Furnace Butt Welded (Continuous Weld)", value: 0.60, label: "Furnace Butt Welded (0.60)" }
  ],
  millToleranceMap: {
    "A53": { type: "%", value: 12.5 },
    "A106": { type: "%", value: 12.5 },
    "A134": { type: "%", value: 12.5 },
    "A135/A135M": { type: "%", value: 12.5 },
    "A312/A312M": { type: "%", value: 12.5 },
    "A335/A335M": { type: "%", value: 12.5 },
    "A358/A358M": { type: "mm", value: 0.3 },
    "A409/A409M": { type: "mm", value: 0.46 },
    "A451/A451M": { type: "mm", value: 0.3 },
    "A524": { type: "%", value: 12.5 },
    "A530/A530M": { type: "%", value: 12.5 },
    "A587": { type: "%", value: 12.5 },
    "A600/A600M": { type: "%", value: 12.5 },
    "A671/A671M": { type: "mm", value: 0.3 },
    "A672/A672M": { type: "mm", value: 0.3 },
    "A691/A691M": { type: "mm", value: 0.3 },
    "A731/A731M": { type: "%", value: 12.5 },
    "A790/A790M": { type: "%", value: 12.5 },
    "IS-3589 (SAW & Seamless Pipe)": { type: "%", value: 12.5 },
    "IS-3589 (ERW Pipe)": { type: "%", value: 10 },
    "IS-1239 (Welded: Light Tubes)": { type: "%", value: 8 },
    "IS-1239 (Welded: Medium/Heavy)": { type: "%", value: 10 },
    "IS-1239 (Seamless)": { type: "%", value: 12.5 }
  },
  standardWallThicknessByOD: {
    "10.3": 1.73, "13.7": 2.24, "17.1": 2.31,
    "21.3": 2.77, "26.7": 2.87, "33.4": 3.38, "42.2": 3.56, "48.3": 3.68,
    "60.3": 3.91, "73.0": 5.16, "88.9": 5.49, "101.6": 5.74, "114.3": 6.02,
    "141.3": 6.55, "168.3": 7.11, "219.1": 8.18, "273.0": 9.27, "323.9": 9.53,
    "355.6": 9.53, "406.4": 9.53, "457.0": 9.53, "508.0": 9.53, "559.0": 9.53,
    "610.0": 9.53, "660.4": 9.53, "711.2": 9.53, "762.0": 9.53, "812.8": 9.53,
    "863.6": 9.53, "914.4": 9.53, "965.2": 9.53, "1016.0": 9.53, "1066.8": 9.53,
    "1117.6": 9.53, "1168.4": 9.53, "1219.2": 9.53
  },
  simpleStructuralThresholds: {
    low: [
      { maxNps: 1, t_struct: 1.8, t_alert: 2.0 },
      { maxNps: 2, t_struct: 1.8, t_alert: 2.5 },
      { maxNps: 3, t_struct: 2.0, t_alert: 2.8 },
      { maxNps: 4, t_struct: 2.3, t_alert: 3.1 },
      { maxNps: 18, t_struct: 2.8, t_alert: 3.3 },
      { maxNps: 24, t_struct: 3.1, t_alert: 3.6 },
      { maxNps: 999, t_struct: 3.5, t_alert: 4.0 }
    ],
    high: [
      { maxNps: 1, t_struct: 2.0, t_alert: 2.3 },
      { maxNps: 2, t_struct: 2.0, t_alert: 2.8 },
      { maxNps: 3, t_struct: 2.3, t_alert: 3.1 },
      { maxNps: 4, t_struct: 2.8, t_alert: 3.5 },
      { maxNps: 18, t_struct: 3.1, t_alert: 3.8 },
      { maxNps: 24, t_struct: 3.5, t_alert: 4.2 },
      { maxNps: 999, t_struct: 4.0, t_alert: 4.5 }
    ]
  }
};

// High-performance in-memory server cache (5-minute TTL)
let B313_CATALOG_CACHE = {
  data: null,
  source: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000
};

export async function loadB313CatalogFromFirestore(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && B313_CATALOG_CACHE.data && (now - B313_CATALOG_CACHE.timestamp) < B313_CATALOG_CACHE.ttl) {
    return { ...B313_CATALOG_CACHE.data, source: B313_CATALOG_CACHE.source, cached: true };
  }

  try {
    const db = getAdminFirestore();
    if (db) {
      const snap = await db.collection("b313Catalog").doc("asme_b313_tables").get();
      if (snap.exists) {
        const docData = snap.data();
        if (docData && docData.yTable && docData.millToleranceMap) {
          const merged = {
            ...DEFAULT_B313_CATALOG,
            ...docData
          };
          B313_CATALOG_CACHE = {
            data: merged,
            source: "firestore",
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000
          };
          return { ...merged, source: "firestore", cached: false };
        }
      }
    }
  } catch (err) {
    console.warn("[b313] Firestore catalog fetch warning, using fallback:", err.message);
  }

  B313_CATALOG_CACHE = {
    data: DEFAULT_B313_CATALOG,
    source: "embedded_fallback",
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000
  };
  return { ...DEFAULT_B313_CATALOG, source: "embedded_fallback", cached: false };
}

export default async function handler(req, res) {
  const url = req.url || "";
  const forceRefresh = req.query?.refresh === "true" || req.body?.refresh === true;

  const catalog = await loadB313CatalogFromFirestore(forceRefresh);
  const pressureToMPa = catalog.unitConversions?.pressureToMPa || DEFAULT_B313_CATALOG.unitConversions.pressureToMPa;
  const stressToMPa = catalog.unitConversions?.stressToMPa || DEFAULT_B313_CATALOG.unitConversions.stressToMPa;
  const yTable = catalog.yTable || DEFAULT_B313_CATALOG.yTable;
  const wTable = catalog.wTable || DEFAULT_B313_CATALOG.wTable;
  const jointEfficiencyTable = catalog.jointEfficiencyTable || DEFAULT_B313_CATALOG.jointEfficiencyTable;
  const millToleranceMap = catalog.millToleranceMap || DEFAULT_B313_CATALOG.millToleranceMap;
  const standardWallThicknessByOD = catalog.standardWallThicknessByOD || DEFAULT_B313_CATALOG.standardWallThicknessByOD;
  const simpleStructuralThresholds = catalog.simpleStructuralThresholds || DEFAULT_B313_CATALOG.simpleStructuralThresholds;

  function getMillTolerance(material, t_nom) {
    const mt = millToleranceMap[material];
    const numNom = Number(t_nom) || 0;
    if (mt) {
      if (mt.type === "%") return numNom * (Number(mt.value) / 100);
      if (mt.type === "mm") return Number(mt.value);
    }
    if (material && material.indexOf("API 5L") !== -1) {
      if (material.indexOf("Seamless") !== -1) {
        if (numNom <= 4) return 0.5;
        if (numNom < 25) return 0.125 * numNom;
        return 0.1 * numNom;
      } else {
        if (numNom <= 5) return 0.5;
        if (numNom < 15) return 0.1 * numNom;
        return 1.5;
      }
    }
    return 0.125 * numNom;
  }

  function calculateRequiredNominalThickness(t_req, material) {
    const numReq = Number(t_req) || 0;
    if (!material) return numReq / (1 - 0.125);
    const mt = millToleranceMap[material];
    if (mt) {
      if (mt.type === "%") return numReq / (1 - Number(mt.value) / 100);
      if (mt.type === "mm") return numReq + Number(mt.value);
    }
    if (material && material.indexOf("API 5L") !== -1) {
      if (material.indexOf("Seamless") !== -1) {
        if (numReq <= 3.5) return numReq + 0.5;
        if (numReq < 21.875) return numReq / (1 - 0.125);
        return numReq / (1 - 0.1);
      } else {
        if (numReq <= 4.5) return numReq + 0.5;
        if (numReq < 13.5) return numReq / (1 - 0.1);
        return numReq + 1.5;
      }
    }
    return numReq / (1 - 0.125);
  }

  // =========================================================================
  // GET /api/b313 or GET /api/b313/metadata -> Full B31.3 & VIII Catalog
  // =========================================================================
  if (req.method === "GET") {
    const pipeDims = await loadPipeDimensionsFromFirestore(forceRefresh);
    return res.status(200).json({
      success: true,
      source: catalog.source,
      cached: catalog.cached,
      standard: catalog.standard,
      unitConversions: { pressureToMPa, stressToMPa },
      yTable,
      wTable,
      jointEfficiencyTable,
      millToleranceMap,
      standardWallThicknessByOD,
      simpleStructuralThresholds,
      catalog: {
        yTable,
        wTable,
        jointEfficiencyTable,
        millToleranceMap,
        standardWallThicknessByOD,
        simpleStructuralThresholds,
        unitConversions: { pressureToMPa, stressToMPa }
      },
      pipeOD: pipeDims.pipeOD,
      pipeDataMaster: pipeDims.pipeDataMaster,
      npsList: pipeDims.npsList
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // =========================================================================
  // 1. METADATA ENDPOINT: /api/b313/metadata
  // =========================================================================
  if (url.includes("/metadata")) {
    const { tempC, materialGroup = "ferritic", includeCatalog = false } = req.body || {};
    const options = yTable[materialGroup] || yTable.ferritic;

    let targetIdx = 0;
    const numTempC = (tempC !== null && tempC !== undefined && tempC !== "") ? parseFloat(tempC) : NaN;
    if (!isNaN(numTempC)) {
      if (materialGroup === "ferritic") {
        if (numTempC <= 482) targetIdx = 0;
        else if (numTempC <= 524) targetIdx = 1;
        else targetIdx = 2;
      } else if (materialGroup === "austenitic") {
        if (numTempC <= 482) targetIdx = 0;
        else if (numTempC <= 524) targetIdx = 1;
        else if (numTempC <= 552) targetIdx = 2;
        else if (numTempC <= 580) targetIdx = 3;
        else if (numTempC <= 607) targetIdx = 4;
        else targetIdx = 5;
      } else if (materialGroup === "nickel") {
        if (numTempC <= 593) targetIdx = 0;
        else if (numTempC <= 635) targetIdx = 1;
        else targetIdx = 2;
      } else {
        targetIdx = 0;
      }
    }

    let wVal = "1.0";
    if (!isNaN(numTempC)) {
      for (const row of wTable) {
        if (numTempC <= Number(row.maxTempC)) {
          wVal = String(row.w);
          break;
        }
      }
    }

    const responsePayload = {
      success: true,
      source: catalog.source,
      options,
      targetIdx,
      selectedY: options[targetIdx] ? Number(options[targetIdx].y) : 0.4,
      wVal,
      isHighTemp: !isNaN(numTempC) && numTempC > 427
    };

    if (includeCatalog) {
      responsePayload.yTable = yTable;
      responsePayload.wTable = wTable;
      responsePayload.jointEfficiencyTable = jointEfficiencyTable;
      responsePayload.millToleranceMap = millToleranceMap;
      responsePayload.standardWallThicknessByOD = standardWallThicknessByOD;
    }

    return res.status(200).json(responsePayload);
  }

  // =========================================================================
  // 2. MILL TOLERANCE ENDPOINT: /api/b313/mill-tolerance
  // =========================================================================
  if (url.includes("/mill-tolerance")) {
    const { materialStd = "", nominalVal = 0, t_req = 0 } = req.body || {};
    const numNom = parseFloat(nominalVal) || 0;
    const numReq = parseFloat(t_req) || 0;

    if (!materialStd || (!millToleranceMap[materialStd] && materialStd.indexOf("API 5L") === -1)) {
      return res.status(200).json({
        success: true,
        source: catalog.source,
        millTolVal: 0,
        displayTol: "0%",
        t_afterMill: numNom,
        t_nom_req: calculateRequiredNominalThickness(numReq, materialStd)
      });
    }

    const millTolVal = Number(getMillTolerance(materialStd, numNom));
    const t_afterMill = Number(Math.max(numNom - millTolVal, 0));
    const t_nom_req = Number(calculateRequiredNominalThickness(numReq, materialStd));

    const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
      ? millTolVal.toFixed(2) + " mm"
      : (millToleranceMap[materialStd] ? `${millToleranceMap[materialStd].value}%` : "12.5%");

    return res.status(200).json({
      success: true,
      source: catalog.source,
      millTolVal,
      displayTol,
      t_afterMill,
      t_nom_req
    });
  }

  // =========================================================================
  // 3. CALCULATE ENDPOINT: /api/b313/calculate (and /api/b313)
  // =========================================================================
  const body = req.body || {};
  const mode = body.mode || "full";

  // Helper to resolve default standard wall thickness from OD using Firestore pipeDimensions or standardWallThicknessByOD
  async function resolveDefaultStdThickness(odNum) {
    if (isNaN(odNum) || odNum <= 0) return 6.02;
    const odKey = Object.keys(standardWallThicknessByOD).find(k => Math.abs(parseFloat(k) - odNum) < 0.5);
    if (odKey) return Number(standardWallThicknessByOD[odKey]);

    try {
      const pipeDims = await loadPipeDimensionsFromFirestore();
      for (const [nps, odVal] of Object.entries(pipeDims.pipeOD || {})) {
        if (Math.abs(Number(odVal) - odNum) < 0.8) {
          const schMap = pipeDims.pipeDataMaster?.[nps] || {};
          if (schMap["SCH 40"]) return Number(schMap["SCH 40"]);
          if (schMap["SCH STD"]) return Number(schMap["SCH STD"]);
        }
      }
    } catch (_e) {}
    return 6.02;
  }

  if (mode === "tolerance_only") {
    const D = parseFloat(body.D);
    const includeCA = Boolean(body.includeCA);
    const caRaw = parseFloat(body.caRaw);
    const CA = includeCA ? (isNaN(caRaw) ? 0 : caRaw) : 0;
    const includeMillTol = Boolean(body.includeMillTol);
    const materialStd = body.materialStd || "A106";
    let nominalVal = parseFloat(body.nominalVal);

    if (isNaN(nominalVal) || nominalVal <= 0) {
      nominalVal = await resolveDefaultStdThickness(D);
    }

    let millTolVal = 0;
    let t_afterMill = nominalVal;
    let t_includingCA_Mill = nominalVal;

    if (includeMillTol && materialStd) {
      millTolVal = Number(getMillTolerance(materialStd, nominalVal));
      t_afterMill = Number(nominalVal - millTolVal);
      t_includingCA_Mill = Number(includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill);
    } else if (includeCA) {
      t_includingCA_Mill = Number(Math.max(nominalVal - CA, 0));
    }

    const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
      ? millTolVal.toFixed(2) + " mm"
      : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");

    return res.status(200).json({
      success: true,
      source: catalog.source,
      mode: "tolerance_only",
      nominalVal: Number(nominalVal),
      materialStd,
      includeCA,
      CA: Number(CA),
      includeMillTol,
      millTolVal: Number(millTolVal),
      t_afterMill: Number(t_afterMill),
      t_includingCA_Mill: Number(t_includingCA_Mill),
      displayTol
    });
  }

  // Full ASME B31.3 Calculation
  const P_raw = parseFloat(body.P_raw ?? body.P);
  const pUnit = body.pUnit || "MPa";
  const T_raw = parseFloat(body.T_raw ?? body.T);
  const tUnit = body.tUnit || "C";
  const tempC = parseFloat(body.tempC);
  const S_raw = parseFloat(body.S_raw ?? body.S);
  const sUnit = body.sUnit || "MPa";
  const D = parseFloat(body.D);
  const E = parseFloat(body.E);
  const Y = !isNaN(parseFloat(body.Y)) ? parseFloat(body.Y) : 0.4;
  const W = !isNaN(parseFloat(body.W)) ? parseFloat(body.W) : 1.0;
  const includeCA = Boolean(body.includeCA);
  const caRaw = parseFloat(body.caRaw ?? body.CA);
  const CA = includeCA ? (isNaN(caRaw) ? 0 : caRaw) : 0;
  const includeMillTol = Boolean(body.includeMillTol);
  const materialStd = body.materialStd || "";
  const userEdited = Boolean(body.userEdited);
  let nominalVal = parseFloat(body.nominalVal);

  if (isNaN(P_raw) || isNaN(S_raw) || isNaN(D) || isNaN(E)) {
    return res.status(400).json({ error: "Missing or invalid required inputs (P, S, D, E)." });
  }

  const P_val = Number(P_raw * (pressureToMPa[pUnit] || 1.0));
  const S_val = Number(S_raw * (stressToMPa[sUnit] || 1.0));

  const denominator = 2 * (S_val * E * W + P_val * Y);
  if (denominator <= 0) {
    return res.status(400).json({ error: "Invalid calculation denominator (<= 0)." });
  }

  const t_design = Number((P_val * D) / denominator);
  const t_req = Number(t_design + CA);
  const t_nom_req = Number(includeMillTol ? calculateRequiredNominalThickness(t_req, materialStd) : t_req);

  let autoFilled = false;
  if (isNaN(nominalVal) || nominalVal <= 0 || !userEdited) {
    nominalVal = Number(parseFloat(t_nom_req.toFixed(2)));
    autoFilled = true;
  }

  let millTolVal = 0;
  let t_afterMill = nominalVal;
  let t_includingCA_Mill = Number(Math.max(nominalVal - CA, 0));

  if (includeMillTol) {
    millTolVal = Number(getMillTolerance(materialStd, nominalVal));
    t_afterMill = Number(nominalVal - millTolVal);
    t_includingCA_Mill = Number(includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill);
  }

  const isAdequate = t_afterMill >= (t_req - 0.001);
  const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
    ? millTolVal.toFixed(2) + " mm"
    : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");

  return res.status(200).json({
    success: true,
    source: catalog.source,
    mode: "full",
    t_design,
    t_req,
    t_nom_req,
    nominalVal: Number(nominalVal),
    autoFilled,
    millTolVal: Number(millTolVal),
    t_afterMill: Number(t_afterMill),
    t_includingCA_Mill: Number(t_includingCA_Mill),
    isAdequate,
    displayTol,
    P_val,
    S_val,
    CA: Number(CA),
    P_raw,
    pUnit,
    T_raw,
    tUnit,
    tempC,
    S_raw,
    sUnit,
    D,
    E,
    Y,
    W,
    includeCA,
    includeMillTol,
    materialStd,
    userEdited
  });
}
