import { getAdminFirestore } from "./firebaseAdmin.js";

function sanitizeDocId(id) {
  if (!id) return `ID-${Date.now()}`;
  return String(id).replace(/[\/\\]/g, "_").trim();
}

function cleanFirestoreObject(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreObject);
  }
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) {
      cleaned[k] = null;
    } else if (v && typeof v === "object" && !(v instanceof Date)) {
      cleaned[k] = cleanFirestoreObject(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ============================================================================
// 1. BACKEND CALCULATION ENGINE (API 580 / 581, Meridium POF & GE Digital COF)
// ============================================================================

export const ART_TABLE = {
  0.02: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.04: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.06: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.08: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.10: { 0: 2, 1: { l: 2, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.12: { 0: 6, 1: { l: 5, m: 3, h: 2, vh: 1 }, 2: { l: 4, m: 2, h: 1, vh: 1 }, 3: { l: 3, m: 1, h: 1, vh: 1 }, 4: { l: 2, m: 1, h: 1, vh: 1 }, 5: { l: 2, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.14: { 0: 20, 1: { l: 17, m: 10, h: 6, vh: 1 }, 2: { l: 13, m: 6, h: 1, vh: 1 }, 3: { l: 10, m: 3, h: 1, vh: 1 }, 4: { l: 7, m: 2, h: 1, vh: 1 }, 5: { l: 5, m: 1, h: 1, vh: 1 }, 6: { l: 4, m: 1, h: 1, vh: 1 } },
  0.16: { 0: 90, 1: { l: 70, m: 50, h: 20, vh: 3 }, 2: { l: 50, m: 20, h: 4, vh: 1 }, 3: { l: 40, m: 10, h: 1, vh: 1 }, 4: { l: 30, m: 5, h: 1, vh: 1 }, 5: { l: 20, m: 2, h: 1, vh: 1 }, 6: { l: 14, m: 1, h: 1, vh: 1 } },
  0.18: { 0: 250, 1: { l: 200, m: 130, h: 70, vh: 7 }, 2: { l: 170, m: 70, h: 10, vh: 1 }, 3: { l: 130, m: 35, h: 3, vh: 1 }, 4: { l: 100, m: 15, h: 1, vh: 1 }, 5: { l: 70, m: 7, h: 1, vh: 1 }, 6: { l: 50, m: 3, h: 1, vh: 1 } },
  0.20: { 0: 400, 1: { l: 300, m: 210, h: 110, vh: 15 }, 2: { l: 290, m: 120, h: 20, vh: 1 }, 3: { l: 260, m: 60, h: 5, vh: 1 }, 4: { l: 180, m: 20, h: 2, vh: 1 }, 5: { l: 120, m: 10, h: 1, vh: 1 }, 6: { l: 100, m: 6, h: 1, vh: 1 } },
  0.25: { 0: 520, 1: { l: 450, m: 290, h: 150, vh: 20 }, 2: { l: 350, m: 170, h: 30, vh: 2 }, 3: { l: 240, m: 80, h: 6, vh: 1 }, 4: { l: 200, m: 30, h: 20, vh: 1 }, 5: { l: 150, m: 15, h: 2, vh: 1 }, 6: { l: 120, m: 7, h: 1, vh: 1 } },
  0.30: { 0: 650, 1: { l: 550, m: 400, h: 200, vh: 30 }, 2: { l: 400, m: 200, h: 40, vh: 4 }, 3: { l: 320, m: 110, h: 9, vh: 2 }, 4: { l: 240, m: 50, h: 4, vh: 2 }, 5: { l: 180, m: 25, h: 3, vh: 2 }, 6: { l: 150, m: 10, h: 2, vh: 2 } },
  0.35: { 0: 750, 1: { l: 650, m: 550, h: 300, vh: 80 }, 2: { l: 600, m: 300, h: 80, vh: 10 }, 3: { l: 540, m: 150, h: 20, vh: 5 }, 4: { l: 440, m: 90, h: 10, vh: 4 }, 5: { l: 350, m: 70, h: 6, vh: 4 }, 6: { l: 280, m: 40, h: 5, vh: 4 } },
  0.40: { 0: 900, 1: { l: 800, m: 700, h: 400, vh: 130 }, 2: { l: 700, m: 400, h: 120, vh: 30 }, 3: { l: 600, m: 200, h: 50, vh: 10 }, 4: { l: 500, m: 140, h: 20, vh: 8 }, 5: { l: 400, m: 110, h: 10, vh: 8 }, 6: { l: 350, m: 90, h: 9, vh: 8 } },
  0.45: { 0: 1000, 1: { l: 900, m: 810, h: 500, vh: 200 }, 2: { l: 800, m: 500, h: 160, vh: 40 }, 3: { l: 700, m: 270, h: 60, vh: 20 }, 4: { l: 600, m: 200, h: 30, vh: 15 }, 5: { l: 500, m: 160, h: 20, vh: 15 }, 6: { l: 400, m: 130, h: 20, vh: 15 } },
  0.50: { 0: 1200, 1: { l: 1100, m: 970, h: 600, vh: 270 }, 2: { l: 1000, m: 600, h: 200, vh: 60 }, 3: { l: 900, m: 360, h: 80, vh: 40 }, 4: { l: 800, m: 270, h: 50, vh: 40 }, 5: { l: 700, m: 210, h: 40, vh: 40 }, 6: { l: 600, m: 180, h: 40, vh: 40 } },
  0.55: { 0: 1350, 1: { l: 1200, m: 1130, h: 700, vh: 350 }, 2: { l: 1100, m: 750, h: 300, vh: 100 }, 3: { l: 1000, m: 500, h: 130, vh: 90 }, 4: { l: 900, m: 350, h: 100, vh: 90 }, 5: { l: 800, m: 260, h: 90, vh: 90 }, 6: { l: 700, m: 240, h: 90, vh: 90 } },
  0.60: { 0: 1500, 1: { l: 1400, m: 1250, h: 850, vh: 500 }, 2: { l: 1300, m: 900, h: 400, vh: 230 }, 3: { l: 1200, m: 620, h: 250, vh: 240 }, 4: { l: 1000, m: 450, h: 220, vh: 210 }, 5: { l: 900, m: 360, h: 210, vh: 210 }, 6: { l: 800, m: 300, h: 210, vh: 210 } },
  0.65: { 0: 1900, 1: { l: 1700, m: 1400, h: 1000, vh: 700 }, 2: { l: 1600, m: 1105, h: 670, vh: 530 }, 3: { l: 1300, m: 880, h: 550, vh: 500 }, 4: { l: 1200, m: 700, h: 530, vh: 500 }, 5: { l: 1100, m: 640, h: 500, vh: 500 }, 6: { l: 1000, m: 600, h: 500, vh: 500 } },
  0.75: { 0: 2300, 1: { l: 2100, m: 1700, h: 1200, vh: 1000 }, 2: { l: 2000, m: 1400, h: 1000, vh: 1000 }, 3: { l: 1800, m: 1100, h: 1000, vh: 1000 }, 4: { l: 1500, m: 1000, h: 1000, vh: 1000 }, 5: { l: 1300, m: 1000, h: 1000, vh: 1000 }, 6: { l: 1000, m: 1000, h: 1000, vh: 1000 } }
};

export const STRUCTURAL_MIN_THICKNESS = {
  "Pressure Vessel": 3.175,
  "Heat Exchanger Tube": 0.889,
  "Heat Exchanger Shell/Channel": 3.175,
  "Piping <= 1.5\"": 1.575,
  "Piping 2\" - 8\"": 2.388,
  "Piping >= 8\"": 3.175,
  "Column": 3.175,
  "Filter": 3.175,
  "Reactor": 3.175,
  "Storage Tank": 4.76
};

export const EQUIPMENT_LEAK_AREAS = {
  "Piping <= 1.5\"": { area_in2: 0.15, area_cm2: 0.9677 },
  "Piping 2\" - 8\"": { area_in2: 0.442, area_cm2: 2.8516 },
  "Piping >= 8\"": { area_in2: 1.48, area_cm2: 9.5484 },
  "Pressure Vessel": { area_in2: 8.3, area_cm2: 53.5483 },
  "Filter": { area_in2: 3.14, area_cm2: 20.258 },
  "Column": { area_in2: 8.3, area_cm2: 53.5483 },
  "Heat Exchanger Shell/Channel": { area_in2: 5.94, area_cm2: 38.3225 },
  "Heat Exchanger Tube": { area_in2: 0.1, area_cm2: 0.6452 },
  "Reactor": { area_in2: 19.64, area_cm2: 126.7094 },
  "Storage Tank": { area_in2: 314.2, area_cm2: 2027.093 }
};

export const FLUIDS_DATABASE = [
  { id: "H2", name: "Hydrogen (H2)", category: "Flammable", mw: 2, density_lb_ft3: 10.0, k: 1.41, boilingPointF: -423, boilingPointC: -252.8, pff: 0.8, hcf: 119950, p_igf: 1.0 },
  { id: "C1", name: "Methane (C1)", category: "Flammable", mw: 16, density_lb_ft3: 18.7, k: 1.3, boilingPointF: -259, boilingPointC: -161.7, pff: 5.6, hcf: 50029, p_igf: 0.5 },
  { id: "C2", name: "Ethane (C2)", category: "Flammable", mw: 29, density_lb_ft3: 22.5, k: 1.22, boilingPointF: -141, boilingPointC: -96.1, pff: 5.4, hcf: 47300, p_igf: 0.5 },
  { id: "C3", name: "Propane (C3)", category: "Flammable", mw: 43, density_lb_ft3: 32.1, k: 1.14, boilingPointF: -49, boilingPointC: -45.0, pff: 5.6, hcf: 46000, p_igf: 0.5 },
  { id: "C4", name: "Butane (C4)", category: "Flammable", mw: 57, density_lb_ft3: 37.0, k: 1.1, boilingPointF: 26, boilingPointC: -3.3, pff: 5.8, hcf: 45500, flashPointC: -60.0, autoignitionC: 287.8, p_igf: 0.25 },
  { id: "C3-C4", name: "C3-C4 (LPG Blend)", category: "Flammable", mw: 50, density_lb_ft3: 34.5, k: 1.12, boilingPointF: -11.2, boilingPointC: -24.0, pff: 5.7, hcf: 45750, p_igf: 0.35 },
  { id: "C5", name: "Pentane (C5)", category: "Flammable", mw: 71, density_lb_ft3: 40.0, k: 1.1, boilingPointF: 92, boilingPointC: 33.3, pff: 6.0, hcf: 44600, flashPointC: -40.0, autoignitionC: 260.0, p_igf: 0.25 },
  { id: "C6", name: "Hexane (C6)", category: "Flammable", mw: 85, density_lb_ft3: 41.8, k: 1.1, boilingPointF: 151, boilingPointC: 66.1, pff: 6.0, hcf: 44400, flashPointC: -21.7, autoignitionC: 225.0, p_igf: 0.25 },
  { id: "C5-C8", name: "C5-C8 (Gasoline / Light Naphtha)", category: "Flammable", mw: 100, density_lb_ft3: 42.9, k: 1.1, boilingPointF: 209, boilingPointC: 98.3, pff: 6.0, hcf: 44200, flashPointC: -4.0, autoignitionC: 220.0, p_igf: 0.25 },
  { id: "C9-C12", name: "C9-C12 (Kerosene / Jet Fuel)", category: "Flammable", mw: 156, density_lb_ft3: 46.3, k: 1.1, boilingPointF: 384, boilingPointC: 195.6, pff: 6.0, hcf: 44800, flashPointC: 65.0, autoignitionC: 204.4, p_igf: 0.1 },
  { id: "C13-16", name: "C13-C16 (Diesel / Light Gasoil)", category: "Flammable", mw: 200, density_lb_ft3: 47.0, k: 1.1, boilingPointF: 500, boilingPointC: 260.0, pff: 6.0, hcf: 45900, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1 },
  { id: "C17-25", name: "C17-C25 (Heavy Gasoil / AGO / VGO)", category: "Flammable", mw: 300, density_lb_ft3: 48.0, k: 1.1, boilingPointF: 700, boilingPointC: 371.1, pff: 6.0, hcf: 41800, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1 },
  { id: "C25+", name: "C25+ (Resid / Heavy Fuel Oil / Bitumen)", category: "Flammable", mw: 400, density_lb_ft3: 56.23, k: 1.1, boilingPointF: 800, boilingPointC: 426.7, pff: 6.0, hcf: 40600, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1 },
  { id: "H2S", name: "Hydrogen Sulfide (H2S)", category: "Toxic", mw: 34, density_lb_ft3: 6.64, k: 1.32, boilingPointF: -76, boilingPointC: -60.0, pff: 1.5, hcf: 15200, p_igf: 0.05 },
  { id: "Chlorine", name: "Chlorine (Cl2)", category: "Toxic", mw: 71, density_lb_ft3: 88.0, k: 1.32, boilingPointF: -30, boilingPointC: -34.4, pff: 0.0, hcf: 0, p_igf: 0.0 },
  { id: "NH3", name: "Ammonia (NH3)", category: "Toxic", mw: 17, density_lb_ft3: 5.15, k: 1.31, boilingPointF: -28, boilingPointC: -33.3, pff: 1.2, hcf: 18600, p_igf: 0.05 },
  { id: "CO", name: "Carbon Monoxide (CO)", category: "Toxic", mw: 28, density_lb_ft3: 50.79, k: 1.4, boilingPointF: -312, boilingPointC: -191.1, pff: 0.8, hcf: 10100, p_igf: 0.05 },
  { id: "H2O", name: "Water (H2O)", category: "Inert", mw: 18, density_lb_ft3: 62.4, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, pff: 0.0, hcf: 0, p_igf: 0.0 },
  { id: "Steam", name: "Steam", category: "Reactive", mw: 18, density_lb_ft3: 62.4, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, pff: 1.0, hcf: 0, p_igf: 0.0 }
];

function getFluid(query) {
  if (!query || typeof query !== "string") return null;
  const q = query.toLowerCase().trim();
  const f = FLUIDS_DATABASE.find(item => item.id.toLowerCase() === q || item.name.toLowerCase() === q || item.name.toLowerCase().includes(q));
  return f || null;
}

export const PRIORITY_NUMBER_MATRIX = {
  1: { A: 1, B: 2, C: 4, D: 7, E: 11 },
  2: { A: 3, B: 6, C: 8, D: 13, E: 16 },
  3: { A: 5, B: 9, C: 14, D: 17, E: 20 },
  4: { A: 10, B: 15, C: 18, D: 21, E: 23 },
  5: { A: 12, B: 19, C: 22, D: 24, E: 25 }
};

export const RISK_LEVEL_MATRIX = {
  1: { A: "High", B: "High", C: "High", D: "Medium-High", E: "Medium-High" },
  2: { A: "High", B: "Medium-High", C: "Medium-High", D: "Medium", E: "Medium" },
  3: { A: "High", B: "Medium-High", C: "Medium", D: "Medium", E: "Low" },
  4: { A: "Medium-High", B: "Medium", C: "Medium", D: "Medium", E: "Low" },
  5: { A: "Medium-High", B: "Medium", C: "Low", D: "Low", E: "Low" }
};

export function getARTDamageFactor(fwl, inspections = 0, conf = "Medium") {
  const keys = Object.keys(ART_TABLE).map(parseFloat).sort((a, b) => a - b);
  const cappedFWL = Math.max(0.02, Math.min(fwl || 0, 0.75));
  const closestKey = keys.find((k) => k >= cappedFWL) ?? keys[keys.length - 1];
  const row = ART_TABLE[closestKey] || ART_TABLE[0.02];
  const inspCount = Math.max(0, Math.min(parseInt(inspections) || 0, 6));
  if (inspCount === 0) return row[0];
  const rawConf = String(conf || "Medium").toLowerCase();
  const confKey = rawConf.includes("very high") || rawConf === "vh" ? "vh" : rawConf.startsWith("h") ? "h" : rawConf.startsWith("m") ? "m" : "l";
  return row[inspCount]?.[confKey] ?? 1;
}

export function damageFactorToProbability(df) {
  if (df >= 1000) return 1;
  if (df >= 100) return 2;
  if (df >= 10) return 3;
  if (df >= 1) return 4;
  return 5;
}

export function getBasicExternalCR_mmyr(tempF) {
  const pts = [
    { t: 0, cr: 0 },
    { t: 100, cr: 0.0254 },
    { t: 150, cr: 0.127 },
    { t: 200, cr: 0.254 },
    { t: 300, cr: 0.356 }
  ];
  if (tempF <= pts[0].t) return pts[0].cr;
  if (tempF >= pts[pts.length - 1].t) return pts[pts.length - 1].cr;
  for (let i = 0; i < pts.length - 1; i++) {
    if (tempF >= pts[i].t && tempF <= pts[i + 1].t) {
      const frac = (tempF - pts[i].t) / (pts[i + 1].t - pts[i].t);
      return pts[i].cr + frac * (pts[i + 1].cr - pts[i].cr);
    }
  }
  return pts[pts.length - 1].cr;
}

export function calculateInternalThinning(inputs = {}) {
  const eqType = inputs.equipmentType || "Pressure Vessel";
  const tInit_mm = parseFloat(inputs.tInit_mm) || 14.0;
  const diameter_mm = Math.max(1, parseFloat(inputs.diameter_mm) || 1000);
  const designPressure_bar = Math.max(0, parseFloat(inputs.designPressure_bar) || 0);
  const allowableStress_MPa = Math.max(1, parseFloat(inputs.allowableStress_MPa) || 137.9);
  const corrosionRate_mm_yr = parseFloat(inputs.corrosionRate_mm_yr ?? inputs.estimatedCorrosionRate_mm_yr) || 0.025;
  const numberOfInspections = parseInt(inputs.numberOfInspections) || 0;
  const inspectionConfidence = inputs.inspectionConfidence || "Medium";

  let yearsInService = parseFloat(inputs.yearsInService) || 0;
  if (inputs.dateInService) {
    const dStart = new Date(inputs.dateInService);
    const startYear = dStart.getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(startYear) && currentYear >= startYear) {
      yearsInService = currentYear - startYear;
    }
  }

  const structuralMin_mm = STRUCTURAL_MIN_THICKNESS[eqType] ?? 3.175;
  const P_MPa = designPressure_bar * 0.1;
  const S_MPa = allowableStress_MPa;
  const D_mm = diameter_mm;

  let pressureMin_mm = 0;
  if (eqType.startsWith("Piping")) {
    const denom = 2 * (S_MPa + 0.4 * P_MPa);
    pressureMin_mm = denom > 0 ? (P_MPa * D_mm) / denom : 0;
  } else {
    const denom = 2 * (S_MPa - 0.6 * P_MPa);
    pressureMin_mm = denom > 0 ? (P_MPa * D_mm) / denom : 0;
  }

  const tReq_mm = inputs.specifiedTmin_mm > 0 ? inputs.specifiedTmin_mm : Math.max(structuralMin_mm, pressureMin_mm);
  const estimatedWallLoss_mm = Number((corrosionRate_mm_yr * yearsInService).toFixed(3));
  const estimatedRemainingWall_mm = Math.max(0, Number((tInit_mm - estimatedWallLoss_mm).toFixed(3)));
  const fractionalWallLoss_art = tInit_mm > 0 ? Number((estimatedWallLoss_mm / tInit_mm).toFixed(3)) : 0;
  const wallRatio = tReq_mm > 0 ? Number((estimatedRemainingWall_mm / tReq_mm).toFixed(2)) : 1.0;

  const halfLifeRemainingAllowance = estimatedRemainingWall_mm - tReq_mm;
  const estimatedHalfLife_years = corrosionRate_mm_yr > 0 && halfLifeRemainingAllowance > 0
    ? Number((halfLifeRemainingAllowance / (2 * corrosionRate_mm_yr)).toFixed(2))
    : 0;

  const damageFactor = getARTDamageFactor(fractionalWallLoss_art, numberOfInspections, inspectionConfidence);
  const baseProbability = damageFactorToProbability(damageFactor);

  let finalProbability = baseProbability;
  let creditApplied = false;
  const cr_mpy = (corrosionRate_mm_yr / 25.4) * 1000;
  if (wallRatio > 1.5 && cr_mpy < 5.0 && baseProbability > 1) {
    finalProbability = Math.min(5, baseProbability + 1);
    creditApplied = true;
  }

  const failureFrequency_per_year = 3.06e-5 * Math.max(1, damageFactor);

  return {
    structuralMin_mm,
    pressureMin_mm,
    tReq_mm,
    estimatedWallLoss_mm,
    estimatedRemainingWall_mm,
    fractionalWallLoss_art,
    wallRatio,
    estimatedHalfLife_years,
    damageFactor,
    baseProbability,
    finalProbability,
    creditApplied,
    yearsInService_val: yearsInService,
    adjustedICDF: damageFactor,
    failureFrequency_per_year
  };
}

export function calculateExternalCUI(inputs = {}, tInit_mm = 14.0, tReq_mm = 10.8, yearsInService = 20) {
  const operatingTemp_C = parseFloat(inputs.operatingTemp_C) || 40;
  const isInsulated = !!inputs.isInsulated;
  const materialIsCarbonSteel = inputs.materialIsCarbonSteel !== false;
  const T_F = (operatingTemp_C * 9 / 5) + 32;

  let baseCR_mmyr = 0;
  if (isInsulated && materialIsCarbonSteel) {
    baseCR_mmyr = getBasicExternalCR_mmyr(T_F);
  }

  const humidityFactor = inputs.humidityLevel === "High" ? 1.0 : inputs.humidityLevel === "Medium" ? 0.5 : 0.25;
  const basicCR_mm_yr = baseCR_mmyr * humidityFactor;

  let insTypeFactor = 1.0;
  if (inputs.insulationType === "Asbestos") insTypeFactor = 1.5;
  else if (inputs.insulationType?.includes("Calcium Silicate (Not Cl Free)")) insTypeFactor = 1.0;
  else if (inputs.insulationType?.includes("Calcium Silicate")) insTypeFactor = 0.75;
  else if (inputs.insulationType?.includes("Mineral Wool") || inputs.insulationType?.includes("Fiberglass")) insTypeFactor = 0.75;
  else if (inputs.insulationType?.includes("Foam")) insTypeFactor = 0.5;

  let insCondFactor = 1.0;
  if (inputs.insulationCondition === "Poor") insCondFactor = 1.5;
  else if (inputs.insulationCondition === "Good") insCondFactor = 0.5;

  const coolingTowerFactor = inputs.nearCoolingTower ? 2.0 : 1.0;

  let coatingLife_years = 1;
  const cType = inputs.coatingType || "Average";
  if (cType.startsWith("None")) coatingLife_years = 1;
  else if (cType.startsWith("Average") || cType.startsWith("Ave")) coatingLife_years = 5;
  else if (cType.startsWith("Best")) coatingLife_years = 10;

  let yearsVal = parseFloat(inputs.yearsInService) || yearsInService;
  if (inputs.dateInService) {
    const dStart = new Date(inputs.dateInService);
    const sYear = dStart.getFullYear();
    if (!isNaN(sYear)) yearsVal = Math.max(0, new Date().getFullYear() - sYear);
  }

  const externalAge_years = Math.max(0, Number((yearsVal - coatingLife_years).toFixed(2)));
  const basicCR = inputs.estimatedRate || inputs.estimatedCorrosionRate_mm_yr || 0.076;
  const predictedCR_mm_yr = Number((basicCR * humidityFactor * insTypeFactor * insCondFactor * coolingTowerFactor).toFixed(4));

  const tInitEff = inputs.nominalThickness_mm || tInit_mm;
  const wallLoss_mm = Number((predictedCR_mm_yr * externalAge_years).toFixed(4));
  const fractionalWallLoss = tInitEff > 0 ? Number((wallLoss_mm / tInitEff).toFixed(3)) : 0;
  const remainingWall_mm = Math.max(0, Number((tInitEff - wallLoss_mm).toFixed(4)));
  const governingTmin_mm = inputs.specifiedTmin_mm > 0 ? inputs.specifiedTmin_mm : tReq_mm;
  const wallRatio = governingTmin_mm > 0 ? Number((remainingWall_mm / governingTmin_mm).toFixed(2)) : 1.0;

  const halfLifeRemainingAllowance = remainingWall_mm - governingTmin_mm;
  const estimatedHalfLife_years = predictedCR_mm_yr > 0 && halfLifeRemainingAllowance > 0
    ? Number((halfLifeRemainingAllowance / (2 * predictedCR_mm_yr)).toFixed(2))
    : 0;

  const damageFactor = inputs.susceptibleToCUI === false ? 1 : getARTDamageFactor(fractionalWallLoss, inputs.numberOfInspections || 0, inputs.inspectionConfidence || "Medium");
  const baseProbability = damageFactorToProbability(damageFactor);

  let finalProbability = baseProbability;
  let creditApplied = false;
  const cr_mpy_ext = (predictedCR_mm_yr / 25.4) * 1000;
  if (wallRatio > 1.5 && cr_mpy_ext < 5.0 && baseProbability > 1) {
    finalProbability = Math.min(5, baseProbability + 1);
    creditApplied = true;
  }

  const failureFrequency_per_year = 3.06e-5 * Math.max(1, damageFactor);

  return {
    basicCR_mm_yr,
    predictedCR_mm_yr,
    coatingLife_years,
    externalAge_years,
    wallLoss_mm,
    fractionalWallLoss,
    wallRatio,
    damageFactor,
    baseProbability,
    finalProbability,
    creditApplied,
    yearsInService_val: yearsVal,
    areaHumidityFactor: humidityFactor,
    insulationConditionFactor: insCondFactor,
    insulationTypeFactor: insTypeFactor,
    coatingFactor: coatingLife_years,
    corrosionFactor: coolingTowerFactor,
    estimatedHalfLife_years,
    failureFrequency_per_year
  };
}

export function calculateConsequenceOfFailure(inputs = {}) {
  const fluid = getFluid(inputs.fluidId || inputs.processFluid);
  if (!fluid || typeof fluid.mw !== "number" || typeof fluid.k !== "number" || typeof fluid.density_lb_ft3 !== "number") {
    throw new Error("Valid fluid ID and properties (molecular weight, specific heat ratio, density) are required (no default fallbacks permitted).");
  }

  if (inputs.operatingPressure_bar === undefined || inputs.operatingPressure_bar === null || isNaN(parseFloat(inputs.operatingPressure_bar))) {
    throw new Error("operatingPressure_bar is required (no default fallbacks permitted).");
  }
  if (inputs.operatingTemp_C === undefined || inputs.operatingTemp_C === null || isNaN(parseFloat(inputs.operatingTemp_C))) {
    throw new Error("operatingTemp_C is required (no default fallbacks permitted).");
  }
  if (inputs.inventory_kg === undefined || inputs.inventory_kg === null || isNaN(parseFloat(inputs.inventory_kg)) || parseFloat(inputs.inventory_kg) <= 0) {
    throw new Error("Valid positive inventory_kg is required (no default fallbacks permitted).");
  }
  if (!inputs.equipmentType || !EQUIPMENT_LEAK_AREAS[inputs.equipmentType]) {
    throw new Error(`Valid equipmentType is required from supported types: ${Object.keys(EQUIPMENT_LEAK_AREAS).join(", ")}`);
  }
  if (inputs.detectionTime_min === undefined || inputs.detectionTime_min === null || isNaN(parseFloat(inputs.detectionTime_min))) {
    throw new Error("detectionTime_min is required (no default fallbacks permitted).");
  }
  if (inputs.isolationTime_min === undefined || inputs.isolationTime_min === null || isNaN(parseFloat(inputs.isolationTime_min))) {
    throw new Error("isolationTime_min is required (no default fallbacks permitted).");
  }

  const operatingPressure_bar = Math.max(0, parseFloat(inputs.operatingPressure_bar));
  const operatingTemp_C = parseFloat(inputs.operatingTemp_C);
  const inventory_kg = parseFloat(inputs.inventory_kg);
  const equipmentType = inputs.equipmentType;
  const detectionTime_min = parseFloat(inputs.detectionTime_min);
  const isolationTime_min = parseFloat(inputs.isolationTime_min);

  let initialPhase = inputs.initialFluidPhase || (operatingTemp_C >= fluid.boilingPointC ? "Gas" : "Liquid");
  const isAtmosphericGas = fluid.boilingPointC <= 26.7;
  const ambientPhase = isAtmosphericGas ? "Gas" : "Liquid";
  let finalPhase = inputs.finalFluidPhase || (initialPhase === "Liquid" && ambientPhase === "Gas" && fluid.boilingPointC <= 26.7 ? "Gas" : ambientPhase === "Liquid" ? "Liquid" : "Gas");

  const leakArea_cm2 = EQUIPMENT_LEAK_AREAS[equipmentType]?.area_cm2 ?? 53.5483;
  const leakArea_in2 = leakArea_cm2 / 6.4516;

  const P_atm_psia = 14.7;
  const P_oper_psig = operatingPressure_bar * 14.5038;
  const P_abs_psia = P_oper_psig + P_atm_psia;
  const T_R = (operatingTemp_C + 273.15) * 1.8;
  const molecularWeight = fluid.mw;
  const k = fluid.k;
  const density_lb_ft3 = fluid.density_lb_ft3;

  let dischargeRate_lb_min = 0;
  let flowRegime = "Liquid";

  if (initialPhase === "Liquid") {
    const Cd_liquid = 0.6;
    if (P_oper_psig > 0 && density_lb_ft3 > 0 && leakArea_in2 > 0) {
      dischargeRate_lb_min = 60 * Cd_liquid * leakArea_in2 * Math.sqrt(2 * density_lb_ft3 * P_oper_psig * (32.2 / 144));
    }
  } else {
    const Cd_gas = 0.9;
    const P_trans_psia = P_atm_psia * Math.pow((k + 1) / 2, k / (k - 1));
    if (P_abs_psia > P_trans_psia) {
      flowRegime = "Sonic Gas (Choked)";
      const factor = Math.sqrt((k * molecularWeight * (32.2 / 144)) / (10.73 * T_R)) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
      dischargeRate_lb_min = 60 * Cd_gas * leakArea_in2 * P_abs_psia * factor;
    } else {
      flowRegime = "Subsonic Gas";
      const pRatio = P_atm_psia / P_abs_psia;
      const factor = Math.sqrt(((molecularWeight * (32.2 / 144)) / (10.73 * T_R)) * (2 * k / (k - 1)) * Math.pow(pRatio, 2 / k) * Math.max(0, 1 - Math.pow(pRatio, (k - 1) / k)));
      dischargeRate_lb_min = 60 * Cd_gas * leakArea_in2 * P_abs_psia * factor;
    }
  }

  dischargeRate_lb_min = Math.max(0, dischargeRate_lb_min);
  const dischargeRate_kg_min = dischargeRate_lb_min * 0.45359237;
  const dischargeRate_g_min = dischargeRate_kg_min * 1000;

  const detIsolTime_min = Math.max(0.01, detectionTime_min + isolationTime_min);
  const inventory_lb = inventory_kg * 2.20462262;
  const deinventoryTime_min = dischargeRate_lb_min > 0 ? inventory_lb / dischargeRate_lb_min : detIsolTime_min;
  const releaseDuration_min = Math.min(detIsolTime_min, deinventoryTime_min);
  const leakQuantity_lb = Math.min(inventory_lb, dischargeRate_lb_min * releaseDuration_min);
  const leakQuantity_kg = leakQuantity_lb * 0.45359237;

  const T_oper_F = operatingTemp_C * 1.8 + 32;
  const T_flash_F = fluid.flashPointC !== undefined ? fluid.flashPointC * 1.8 + 32 : (fluid.boilingPointF ?? -100);
  const T_auto_F = fluid.autoignitionC !== undefined ? fluid.autoignitionC * 1.8 + 32 : 1000;
  const P_IGF = fluid.p_igf ?? (finalPhase === "Gas" ? 0.5 : 0.1);

  let probabilityOfIgnition = P_IGF;
  if (inputs.probabilityOfIgnitionOverride !== undefined && inputs.probabilityOfIgnitionOverride >= 0) {
    probabilityOfIgnition = inputs.probabilityOfIgnitionOverride;
  } else if (T_oper_F <= T_flash_F) {
    probabilityOfIgnition = P_IGF;
  } else if (T_oper_F >= T_auto_F) {
    probabilityOfIgnition = 1.0;
  } else {
    const deltaT = T_auto_F - T_flash_F;
    const tempRatio = deltaT > 0 ? (T_oper_F - T_flash_F) / deltaT : 0.5;
    probabilityOfIgnition = P_IGF + tempRatio * (1 - P_IGF);
  }
  probabilityOfIgnition = Math.min(1.0, Math.max(0.01, +probabilityOfIgnition.toFixed(3)));

  let poolArea_ft2 = 0;
  let poolArea_m2 = 0;
  if (density_lb_ft3 > 0 && leakQuantity_lb > 0) {
    poolArea_ft2 = leakQuantity_lb / (0.0325 * density_lb_ft3);
    poolArea_m2 = poolArea_ft2 / 10.7639104;
  }

  let flammableDistance_ft = 0;
  let flammableDistance_m = 0;
  let flammableAffectedArea_ft2 = 0;
  let flammableAffectedArea_m2 = 0;

  if (fluid.category === "Flammable" && leakQuantity_lb > 0) {
    const PFF = fluid.pff || 6.0;
    const HCf = fluid.hcf || 45500;
    const HCTNT = 4680;

    if (finalPhase === "Liquid") {
      flammableDistance_ft = PFF * Math.sqrt(poolArea_ft2);
      flammableDistance_m = flammableDistance_ft / 3.28084;
    } else {
      const Wf_kg = leakQuantity_lb / 2.2;
      const tntEquivalent_kg = 0.1 * Wf_kg * (HCf / HCTNT);
      flammableDistance_m = tntEquivalent_kg > 0 ? 17 * Math.pow(tntEquivalent_kg, 1 / 3) : 0;
      flammableDistance_ft = flammableDistance_m * 3.2736;
    }
    flammableAffectedArea_ft2 = probabilityOfIgnition * Math.PI * Math.pow(flammableDistance_ft, 2);
    flammableAffectedArea_m2 = flammableAffectedArea_ft2 / 10.7639104;
  }

  let flammableCategory = "E";
  if (flammableAffectedArea_ft2 > 5000000) flammableCategory = "A";
  else if (flammableAffectedArea_ft2 >= 500000) flammableCategory = "B";
  else if (flammableAffectedArea_ft2 >= 50000) flammableCategory = "C";
  else if (flammableAffectedArea_ft2 >= 5000) flammableCategory = "D";

  let toxicCategory = "N/A";
  let toxicMixedReleaseRate_g_min = 0;
  if (inputs.toxicMixture || fluid.category === "Toxic" || inputs.percentToxic > 0) {
    const toxicFraction = (parseFloat(inputs.percentToxic) || 100) / 100;
    toxicMixedReleaseRate_g_min = dischargeRate_g_min * toxicFraction;
    toxicCategory = "B";
  }

  const lostProdCat = inputs.lostProductionCategory || "B";
  const productionLossCategory = lostProdCat;
  const environmentalCategory = "E";

  const catRank = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  let governingCategory = "E";
  let governingConsequenceType = "Flammable Event";

  const driver = inputs.consequenceDriver || "Automatic";
  if (driver === "Production Loss") {
    governingCategory = productionLossCategory;
    governingConsequenceType = "Production Loss";
  } else if (driver === "Flammable") {
    governingCategory = flammableCategory;
    governingConsequenceType = "Flammable Event";
  } else {
    let bestRank = 6;
    if (flammableCategory && catRank[flammableCategory] < bestRank) {
      bestRank = catRank[flammableCategory];
      governingCategory = flammableCategory;
      governingConsequenceType = "Flammable Event";
    }
    if (toxicCategory && toxicCategory !== "N/A" && catRank[toxicCategory] < bestRank) {
      bestRank = catRank[toxicCategory];
      governingCategory = toxicCategory;
      governingConsequenceType = "Toxic Dispersion";
    }
    if (catRank[productionLossCategory] < bestRank) {
      bestRank = catRank[productionLossCategory];
      governingCategory = productionLossCategory;
      governingConsequenceType = "Production Loss";
    }
  }

  return {
    initialPhase,
    finalPhase,
    leakArea_cm2,
    leakArea_in2,
    flowRegime,
    dischargeRate_kg_min,
    dischargeRate_g_min,
    dischargeRate_lb_min,
    deinventoryTime_min,
    releaseDuration_min,
    leakQuantity_kg,
    leakQuantity_lb,
    probabilityOfIgnition,
    flammableDistance_m,
    flammableDistance_ft,
    flammableAffectedArea_m2,
    flammableAffectedArea_ft2,
    flammableCategory,
    poolArea_m2,
    poolArea_ft2,
    toxicMixedReleaseRate_g_min,
    toxicCategory,
    environmentalCategory,
    productionLossCategory,
    governingCategory,
    governingConsequenceType
  };
}

export function calculateOverallRBI(internalInputs, externalInputs, consequenceInputs) {
  const internalPoF = calculateInternalThinning(internalInputs);
  const externalPoF = calculateExternalCUI(externalInputs, internalInputs?.tInit_mm, internalPoF?.tReq_mm, internalInputs?.yearsInService);

  const combinedPoF = Math.min(internalPoF.finalProbability, externalPoF.finalProbability);
  const governingPoFMechanism = internalPoF.finalProbability <= externalPoF.finalProbability ? "Internal Thinning" : "External CUI";

  const consequence = calculateConsequenceOfFailure(consequenceInputs);
  const combinedCoF = consequence.governingCategory;

  const riskLevel = RISK_LEVEL_MATRIX[combinedPoF]?.[combinedCoF] || "Medium";
  const priorityNumber = PRIORITY_NUMBER_MATRIX[combinedPoF]?.[combinedCoF] || 15;

  return {
    internalPoF,
    externalPoF,
    combinedPoF,
    governingPoFMechanism,
    consequence,
    combinedCoF,
    riskLevel,
    priorityNumber
  };
}

// ============================================================================
// 2. MAIN REQUEST HANDLER & CLOUD FIRESTORE HIERARCHICAL PERSISTENCE
// ============================================================================

export default async function handler(req, res) {
  const method = req.method;
  const action = req.body?.action || req.query?.action || (method === "GET" ? "get_workspace" : "save_workspace");

  try {
    // ----------------------------------------------------
    // 0. BACKEND POF & RBI CALCULATION ENGINE ENDPOINTS
    // ----------------------------------------------------
    if (action === "art_table" || action === "get_art_table") {
      return res.status(200).json({
        success: true,
        artTable: ART_TABLE,
        structuralMinThickness: STRUCTURAL_MIN_THICKNESS,
        leakAreas: EQUIPMENT_LEAK_AREAS
      });
    }

    if (action === "pof" || action === "calculate_pof" || req.path.endsWith("/pof")) {
      try {
        const payload = req.body?.data || req.body?.inputs || req.body || {};
        const internalInputs = payload.internalInputs || {};
        const externalInputs = payload.externalInputs || {};

        const internalPoF = calculateInternalThinning(internalInputs);
        const externalPoF = calculateExternalCUI(externalInputs, internalInputs?.tInit_mm, internalPoF?.tReq_mm, internalInputs?.yearsInService);

        const combinedPoF = Math.min(internalPoF.finalProbability, externalPoF.finalProbability);
        const governingPoFMechanism = internalPoF.finalProbability <= externalPoF.finalProbability ? "Internal Thinning" : "External CUI";

        return res.status(200).json({
          success: true,
          calculatedBy: "backend_pof_engine",
          timestamp: new Date().toISOString(),
          internalPoF,
          externalPoF,
          combinedPoF,
          governingPoFMechanism
        });
      } catch (pofErr) {
        return res.status(400).json({ success: false, error: pofErr.message });
      }
    }

    if (action === "calculate" || action === "calculate_analysis") {
      try {
        const payload = req.body?.data || req.body?.inputs || req.body || {};
        const internalInputs = payload.internalInputs || {};
        const externalInputs = payload.externalInputs || {};
        const consequenceInputs = payload.consequenceInputs || {};

        const rbiResults = calculateOverallRBI(internalInputs, externalInputs, consequenceInputs);

        return res.status(200).json({
          success: true,
          calculatedBy: "backend_engine",
          timestamp: new Date().toISOString(),
          results: rbiResults
        });
      } catch (valErr) {
        return res.status(400).json({ success: false, error: valErr.message });
      }
    }

    // ----------------------------------------------------
    // 1. GET WORKSPACE (Hierarchy: FLOC -> Assets -> Components -> Analyses)
    // ----------------------------------------------------
    if (action === "get_workspace") {
      const adminDb = getAdminFirestore();
      if (!adminDb) {
        return res.status(503).json({ error: "Database service unavailable. Live connection to Firestore is mandatory." });
      }
      try {
        const snap = await adminDb.collection("semi_quantitative_rbi_workspace").doc("current_workspace").get();
        if (!snap.exists) {
          return res.status(404).json({ error: "Workspace data not found in Firestore." });
        }
        const workspace = snap.data();
        return res.status(200).json({
          success: true,
          source: "firestore",
          workspace
        });
      } catch (fErr) {
        return res.status(503).json({ error: `Database unestablished: ${fErr.message}` });
      }
    }

    // ----------------------------------------------------
    // 2. SAVE WORKSPACE & CLOUD HIERARCHICAL SYNC
    // Hierarchy: Functional Location > Assets > Components > Analyses
    // ----------------------------------------------------
    if (action === "save_workspace" || action === "sync_cloud") {
      const incoming = req.body?.workspace || req.body?.data || req.body || {};
      const rawAssets = Array.isArray(incoming.assets) ? incoming.assets : [];
      const rawComponentsByAsset = incoming.componentsByAsset || {};

      // 1. Server-side validation & Recalculate each analysis to ensure math backend integrity
      const processedAssets = rawAssets.map(asset => ({ ...asset }));
      const processedComponentsByAsset = {};

      Object.entries(rawComponentsByAsset).forEach(([assetId, comps]) => {
        if (!Array.isArray(comps)) return;
        processedComponentsByAsset[assetId] = comps.map(comp => {
          const updatedComp = { ...comp };
          if (Array.isArray(updatedComp.analyses)) {
            updatedComp.analyses = updatedComp.analyses.map(an => {
              const updatedAn = { ...an };
              // Calculate on backend for maximum accuracy
              const rbi = calculateOverallRBI(
                updatedAn.internalInputs || {},
                updatedAn.externalInputs || {},
                updatedAn.consequenceInputs || {}
              );
              updatedAn.results = rbi;
              updatedAn.isCalculated = true;
              updatedAn.dateCriticalityCalculated = updatedAn.dateCriticalityCalculated || new Date().toLocaleString();
              updatedAn.mechanisms = [
                {
                  id: "internal",
                  name: "Criticality Calculator Internal Corrosion",
                  damageFactor: rbi.internalPoF.damageFactor,
                  probabilityOfFailure: rbi.internalPoF.finalProbability,
                  consequenceOfFailure: rbi.combinedCoF,
                  inspectionPriority: rbi.priorityNumber
                },
                {
                  id: "external",
                  name: "Criticality Calculator External Corrosion",
                  damageFactor: rbi.externalPoF.damageFactor,
                  probabilityOfFailure: rbi.externalPoF.finalProbability,
                  consequenceOfFailure: rbi.combinedCoF,
                  inspectionPriority: rbi.priorityNumber
                }
              ];
              return updatedAn;
            });
          }
          return updatedComp;
        });
      });

      // 2. Group into Functional Locations
      const flocMap = {};
      processedAssets.forEach(asset => {
        const flocId = asset.functionalLocation ? sanitizeDocId(asset.functionalLocation) : "FLOC-GENERAL";
        if (!flocMap[flocId]) {
          flocMap[flocId] = {
            id: flocId,
            flocCode: asset.functionalLocation || "FLOC-GENERAL",
            name: `${asset.facilityName || 'Refinery Complex'} - ${asset.unitService || 'Process Unit'}`,
            unit: asset.unitService || "General Service",
            facility: asset.facilityName || "Plant Complex",
            assets: [],
            totalAssets: 0,
            updatedAt: new Date().toISOString()
          };
        }
        flocMap[flocId].assets.push(asset.id);
        flocMap[flocId].totalAssets += 1;
      });

      const functionalLocationsList = Object.values(flocMap);

      const wsPayload = {
        functionalLocations: functionalLocationsList,
        assets: processedAssets,
        componentsByAsset: processedComponentsByAsset,
        lastUpdated: new Date().toISOString()
      };

      // 3. Hierarchical Cloud Firestore Persistence
      // Functional Location > Assets > Components > Analyses
      let firestoreSaved = false;
      let hierarchyCounts = { flocs: 0, assets: 0, components: 0, analyses: 0 };

      try {
        const adminDb = getAdminFirestore();
        if (adminDb) {
          // A. Save the main aggregated workspace document
          const wsRef = adminDb.collection("semi_quantitative_rbi_workspace").doc("current_workspace");
          const writePromises = [
            wsRef.set(cleanFirestoreObject(wsPayload), { merge: true })
          ];

          // B. Prepare Hierarchical sub-documents in Cloud Firestore concurrently
          for (const floc of functionalLocationsList) {
            const flocDocId = sanitizeDocId(floc.id);
            const flocRef = adminDb.collection("rbi_functional_locations").doc(flocDocId);
            writePromises.push(flocRef.set(cleanFirestoreObject({
              id: floc.id,
              flocCode: floc.flocCode || floc.id,
              name: floc.name || "Process Unit",
              unit: floc.unit || "General Service",
              facility: floc.facility || "Plant Complex",
              totalAssets: floc.totalAssets || 0,
              updatedAt: floc.updatedAt || new Date().toISOString()
            }), { merge: true }));
            hierarchyCounts.flocs++;

            // Assets under this Functional Location
            const flocAssets = processedAssets.filter(a => sanitizeDocId(a.functionalLocation) === flocDocId || (!a.functionalLocation && flocDocId === "FLOC-GENERAL"));
            for (const asset of flocAssets) {
              const assetDocId = sanitizeDocId(asset.id);
              const assetRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId);
              writePromises.push(assetRef.set(cleanFirestoreObject({
                id: asset.id,
                tag: asset.tag || asset.id,
                name: asset.name || "Equipment",
                functionalLocation: asset.functionalLocation || flocDocId,
                equipmentCategory: asset.equipmentCategory || "Pressure Vessel",
                unitService: asset.unitService || "Process Service",
                designPressure_kgcm2: asset.designPressure_kgcm2 ?? 0,
                designTemp_C: asset.designTemp_C ?? 0,
                operatingPressure_kgcm2: asset.operatingPressure_kgcm2 ?? 0,
                operatingTemp_C: asset.operatingTemp_C ?? 0,
                materialOfConstruction: asset.materialOfConstruction || "Carbon Steel",
                processFluid: asset.processFluid || "C4 (Butane)",
                updatedAt: new Date().toISOString()
              }), { merge: true }));
              hierarchyCounts.assets++;

              // Components under this Asset (e.g. Shell, Channel, etc.)
              const comps = processedComponentsByAsset[asset.id] || [];
              for (const comp of comps) {
                const compDocId = sanitizeDocId(comp.id);
                const compRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId).collection("components").doc(compDocId);
                writePromises.push(compRef.set(cleanFirestoreObject({
                  id: comp.id,
                  fullName: comp.fullName || comp.id,
                  equipmentType: comp.equipmentType || "Pressure Vessel",
                  materialSpec: comp.materialSpec || "SA516 Gr. 70",
                  technicalData: comp.technicalData || {},
                  updatedAt: new Date().toISOString()
                }), { merge: true }));
                hierarchyCounts.components++;

                // Analyses under this Component
                const analyses = comp.analyses || [];
                for (const an of analyses) {
                  const anDocId = sanitizeDocId(an.id);
                  const anRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId).collection("components").doc(compDocId).collection("analyses").doc(anDocId);
                  writePromises.push(anRef.set(cleanFirestoreObject({
                    id: an.id,
                    name: an.name || an.id,
                    scenarioId: an.scenarioId || an.id,
                    scenarioReferenceDate: an.scenarioReferenceDate || "",
                    isCalculated: !!an.isCalculated,
                    dateCriticalityCalculated: an.dateCriticalityCalculated || "",
                    internalInputs: an.internalInputs || {},
                    externalInputs: an.externalInputs || {},
                    consequenceInputs: an.consequenceInputs || {},
                    results: an.results || {},
                    mechanisms: an.mechanisms || [],
                    headerData: an.headerData || {},
                    updatedAt: new Date().toISOString()
                  }), { merge: true }));
                  hierarchyCounts.analyses++;
                }
              }
            }
          }

          await Promise.all(writePromises);
          firestoreSaved = true;
        } else {
          return res.status(503).json({ success: false, error: "Database unestablished: Live connection to Cloud Firestore is required." });
        }
      } catch (fErr) {
        console.error("[Risk Calc API] Firestore hierarchical sync error:", fErr);
        return res.status(503).json({
          success: false,
          error: `Cloud database synchronization failed: ${fErr.message}`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Hierarchy synced to Cloud Firestore: ${hierarchyCounts.flocs} FLOCs > ${hierarchyCounts.assets} Assets > ${hierarchyCounts.components} Components > ${hierarchyCounts.analyses} Analyses.`,
        firestoreSaved: true,
        hierarchyCounts,
        workspace: wsPayload
      });
    }

    // ----------------------------------------------------
    // 3. LEGACY SINGLE ASSESSMENT COMPATIBILITY
    // ----------------------------------------------------
    if (action === "get_assessments") {
      const adminDb = getAdminFirestore();
      if (!adminDb) {
        return res.status(503).json({ error: "Database service unavailable. Live connection to Firestore is mandatory." });
      }
      try {
        const snap = await adminDb.collection("semi_quantitative_risk_assessments").limit(100).get();
        const assessments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.status(200).json({
          success: true,
          total: assessments.length,
          assessments
        });
      } catch (e) {
        return res.status(503).json({ error: `Failed to query assessments from Firestore: ${e.message}` });
      }
    }

    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err) {
    console.error("[Risk Calc API] Server Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error in Risk Calculator API",
      message: err.message || String(err)
    });
  }
}
