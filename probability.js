/**
 * Semi-Quantitative RBI Analysis Engine (API 580 & 581 / Meridium APM Compliant)
 * Complete implementation copying user's standalone RBI Calculator structure.
 */

// ============================================================================
// 1. DATA & REFERENCE CONSTANTS (API 581, Meridium POF & GE Digital COF)
// ============================================================================

const FLUIDS_DATABASE = [
  { id: "H2", name: "Hydrogen (H2)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["h2", "hydrogen"], mw: 2, density_lb_ft3: 10.0, density_kg_m3: 160.18, k: 1.41, boilingPointF: -423, boilingPointC: -252.8, buoyancy: "B", pff: 0.8, hcf: 119950, p_igf: 1.0, isDense: false },
  { id: "C1", name: "Methane (C1)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c1", "methane", "fuel gas"], mw: 16, density_lb_ft3: 18.7, density_kg_m3: 299.55, k: 1.3, boilingPointF: -259, boilingPointC: -161.7, buoyancy: "B", pff: 5.6, hcf: 50029, p_igf: 0.5, isDense: false },
  { id: "C2", name: "Ethane (C2)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c2", "ethane"], mw: 29, density_lb_ft3: 22.5, density_kg_m3: 360.42, k: 1.22, boilingPointF: -141, boilingPointC: -96.1, buoyancy: "B", pff: 5.4, hcf: 47300, p_igf: 0.5, isDense: false },
  { id: "C3", name: "Propane (C3)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c3", "propane"], mw: 43, density_lb_ft3: 32.1, density_kg_m3: 514.19, k: 1.14, boilingPointF: -49, boilingPointC: -45.0, buoyancy: "D", pff: 5.6, hcf: 46000, p_igf: 0.5, isDense: true },
  { id: "C4", name: "Butane (C4)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c4", "butane", "isobutane"], mw: 57, density_lb_ft3: 37.0, density_kg_m3: 592.68, k: 1.1, boilingPointF: 26, boilingPointC: -3.3, buoyancy: "D", pff: 5.8, hcf: 45500, flashPointC: -60.0, autoignitionC: 287.8, p_igf: 0.25, isDense: true },
  { id: "C3-C4", name: "C3-C4 (LPG Blend)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["lpg", "c3-c4"], mw: 50, density_lb_ft3: 34.5, density_kg_m3: 553.4, k: 1.12, boilingPointF: -11.2, boilingPointC: -24.0, buoyancy: "D", pff: 5.7, hcf: 45750, flashPointC: -75.0, autoignitionC: 300.0, p_igf: 0.35, isDense: true },
  { id: "C5", name: "Pentane (C5)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c5", "pentane"], mw: 71, density_lb_ft3: 40.0, density_kg_m3: 640.74, k: 1.1, boilingPointF: 92, boilingPointC: 33.3, buoyancy: "D", pff: 6.0, hcf: 44600, flashPointC: -40.0, autoignitionC: 260.0, p_igf: 0.25, isDense: true },
  { id: "C6", name: "Hexane (C6)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c6", "hexane"], mw: 85, density_lb_ft3: 41.8, density_kg_m3: 669.57, k: 1.1, boilingPointF: 151, boilingPointC: 66.1, buoyancy: "D", pff: 6.0, hcf: 44400, flashPointC: -21.7, autoignitionC: 225.0, p_igf: 0.25, isDense: true },
  { id: "C7", name: "Heptane (C7)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c7", "heptane"], mw: 100, density_lb_ft3: 42.9, density_kg_m3: 687.19, k: 1.1, boilingPointF: 209, boilingPointC: 98.3, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: -3.9, autoignitionC: 203.9, p_igf: 0.25, isDense: true },
  { id: "C8", name: "Octane (C8)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c8", "octane"], mw: 114, density_lb_ft3: 44.1, density_kg_m3: 706.42, k: 1.1, boilingPointF: 258, boilingPointC: 125.6, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: 13.3, autoignitionC: 220.0, p_igf: 0.25, isDense: true },
  { id: "C5-C8", name: "C5-C8 (Gasoline / Light Naphtha)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["gasoline", "naphtha", "c5-c8"], mw: 100, density_lb_ft3: 42.9, density_kg_m3: 687.19, k: 1.1, boilingPointF: 209, boilingPointC: 98.3, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: -4.0, autoignitionC: 220.0, p_igf: 0.25, isDense: true },
  { id: "C9-C12", name: "C9-C12 (Kerosene / Jet Fuel)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c9-c12", "kerosene", "jet fuel"], mw: 156, density_lb_ft3: 46.3, density_kg_m3: 741.66, k: 1.1, boilingPointF: 384, boilingPointC: 195.6, buoyancy: "D", pff: 6.0, hcf: 44800, flashPointC: 65.0, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C13-16", name: "C13-C16 (Diesel / Light Gasoil)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c13-c16", "c13-16", "diesel", "gasoil"], mw: 200, density_lb_ft3: 47.0, density_kg_m3: 752.87, k: 1.1, boilingPointF: 500, boilingPointC: 260.0, buoyancy: "D", pff: 6.0, hcf: 45900, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C17-25", name: "C17-C25 (Heavy Gasoil / AGO / VGO)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c17-c25", "c17-25", "heavy gasoil", "vgo"], mw: 300, density_lb_ft3: 48.0, density_kg_m3: 768.89, k: 1.1, boilingPointF: 700, boilingPointC: 371.1, buoyancy: "D", pff: 6.0, hcf: 41800, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C25+", name: "C25+ (Resid / Heavy Fuel Oil / Bitumen)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c25+", "resid", "residue", "bitumen", "fuel oil"], mw: 400, density_lb_ft3: 56.2288, density_kg_m3: 900.7, k: 1.1, boilingPointF: 800, boilingPointC: 426.7, buoyancy: "D", pff: 6.0, hcf: 40600, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "MEOH", name: "Methanol (MEOH)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["meoh", "methanol"], mw: 32, density_lb_ft3: 49.6, density_kg_m3: 794.52, k: 1.2, boilingPointF: 148, boilingPointC: 64.4, buoyancy: "D", pff: 5.0, hcf: 19900, flashPointC: 11.1, autoignitionC: 240.0, toxicEndpoint_mg_L: 0.3, p_igf: 0.1, isDense: false },
  { id: "ETOH", name: "Ethanol (ETOH)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["etoh", "ethanol"], mw: 46, density_lb_ft3: 49.2, density_kg_m3: 788.11, k: 1.13, boilingPointF: 173, boilingPointC: 78.3, buoyancy: "D", pff: 5.0, hcf: 26800, flashPointC: 13.0, autoignitionC: 362.8, toxicEndpoint_mg_L: 0.38, p_igf: 0.1, isDense: false },
  { id: "Amine", name: "Amine (MEA / DEA / MDEA)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["amine", "mea", "mdea"], mw: 200, density_lb_ft3: 66.35, density_kg_m3: 1062.83, k: 1.1, boilingPointF: 353, boilingPointC: 178.3, buoyancy: "D", pff: 5.0, hcf: 5000, toxicEndpoint_mg_L: 0.5, p_igf: 0.1, isDense: true },
  { id: "Glycol", name: "Ethylene Glycol (MEG / TEG)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["glycol", "meg"], mw: 62, density_lb_ft3: 69.5, density_kg_m3: 1113.2, k: 1.1, boilingPointF: 387, boilingPointC: 197.3, buoyancy: "D", pff: 5.0, hcf: 16700, p_igf: 0.1, isDense: true },
  { id: "H2S", name: "Hydrogen Sulfide (H2S)", category: "Toxic", group: "Toxic Chemicals", aliases: ["h2s", "sour gas"], mw: 34, density_lb_ft3: 6.64, density_kg_m3: 106.36, k: 1.32, boilingPointF: -76, boilingPointC: -60.0, buoyancy: "D", pff: 1.5, hcf: 15200, autoignitionC: 270.0, toxicEndpoint_mg_L: 0.042, p_igf: 0.05, isDense: true },
  { id: "Chlorine", name: "Chlorine (Cl2)", category: "Toxic", group: "Toxic Chemicals", aliases: ["chlorine", "cl2"], mw: 71, density_lb_ft3: 88.0, density_kg_m3: 1409.63, k: 1.32, boilingPointF: -30, boilingPointC: -34.4, buoyancy: "D", pff: 0.0, hcf: 0, toxicEndpoint_mg_L: 0.0087, p_igf: 0.0, isDense: true },
  { id: "NH3", name: "Ammonia (NH3)", category: "Toxic", group: "Toxic Chemicals", aliases: ["nh3", "ammonia"], mw: 17, density_lb_ft3: 5.15, density_kg_m3: 82.49, k: 1.31, boilingPointF: -28, boilingPointC: -33.3, buoyancy: "B", pff: 1.2, hcf: 18600, autoignitionC: 648.9, toxicEndpoint_mg_L: 0.14, p_igf: 0.05, isDense: false },
  { id: "CO", name: "Carbon Monoxide (CO)", category: "Toxic", group: "Toxic Chemicals", aliases: ["co", "carbon monoxide"], mw: 28, density_lb_ft3: 50.79, density_kg_m3: 813.58, k: 1.4, boilingPointF: -312, boilingPointC: -191.1, buoyancy: "B", pff: 0.8, hcf: 10100, autoignitionC: 608.9, toxicEndpoint_mg_L: 0.033, p_igf: 0.05, isDense: false },
  { id: "H2O", name: "Water (H2O)", category: "Inert", group: "Inerts & Utilities", aliases: ["water", "h2o"], mw: 18, density_lb_ft3: 62.4, density_kg_m3: 999.55, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, buoyancy: "B", pff: 0.0, hcf: 0, p_igf: 0.0, isDense: false },
  { id: "Steam", name: "Steam", category: "Reactive", group: "Inerts & Utilities", aliases: ["steam"], mw: 18, density_lb_ft3: 62.4, density_kg_m3: 999.55, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, buoyancy: "B", pff: 1.0, hcf: 0, p_igf: 0.0, isDense: false },
  { id: "AIR", name: "Air / Nitrogen (N2)", category: "Inert", group: "Inerts & Utilities", aliases: ["air", "nitrogen", "n2"], mw: 29, density_lb_ft3: 15.0, density_kg_m3: 240.28, k: 1.4, boilingPointF: -200, boilingPointC: -128.9, buoyancy: "B", pff: 0.0, hcf: 0, p_igf: 0.0, isDense: false }
];

function getFluidById(query) {
  if (!query || typeof query !== "string" || !query.trim()) {
    return FLUIDS_DATABASE.find((f) => f.id === "C25+") || FLUIDS_DATABASE[0];
  }
  const clean = query.trim().toLowerCase();
  const exact = FLUIDS_DATABASE.find((f) => f.id.toLowerCase() === clean || f.name.toLowerCase() === clean);
  if (exact) return exact;
  const alias = FLUIDS_DATABASE.find((f) => f.aliases?.some((a) => a.toLowerCase() === clean));
  if (alias) return alias;
  if (clean.includes("c25") || clean.includes("resid")) return FLUIDS_DATABASE.find((f) => f.id === "C25+") || FLUIDS_DATABASE[0];
  if (clean.includes("c4") || clean.includes("butane")) return FLUIDS_DATABASE.find((f) => f.id === "C4") || FLUIDS_DATABASE[0];
  if (clean.includes("c3") || clean.includes("propane")) return FLUIDS_DATABASE.find((f) => f.id === "C3") || FLUIDS_DATABASE[0];
  if (clean.includes("diesel")) return FLUIDS_DATABASE.find((f) => f.id === "C13-16") || FLUIDS_DATABASE[0];
  if (clean.includes("gasoline") || clean.includes("naphtha")) return FLUIDS_DATABASE.find((f) => f.id === "C5-C8") || FLUIDS_DATABASE[0];
  return FLUIDS_DATABASE[0];
}

const PRIORITY_NUMBER_MATRIX = {
  1: { A: 1, B: 2, C: 4, D: 7, E: 11 },
  2: { A: 3, B: 6, C: 8, D: 13, E: 16 },
  3: { A: 5, B: 9, C: 14, D: 17, E: 20 },
  4: { A: 10, B: 15, C: 18, D: 21, E: 23 },
  5: { A: 12, B: 19, C: 22, D: 24, E: 25 }
};

const RISK_LEVEL_MATRIX = {
  1: { A: "High", B: "High", C: "High", D: "Medium-High", E: "Medium-High" },
  2: { A: "High", B: "Medium-High", C: "Medium-High", D: "Medium", E: "Medium" },
  3: { A: "High", B: "Medium-High", C: "Medium", D: "Medium", E: "Low" },
  4: { A: "Medium-High", B: "Medium", C: "Medium", D: "Medium", E: "Low" },
  5: { A: "Medium-High", B: "Medium", C: "Low", D: "Low", E: "Low" }
};

const STRUCTURAL_MIN_THICKNESS = {
  "Piping (NPS 1/2)": 1.5,
  "Piping (NPS 3/4)": 1.7,
  "Piping (NPS 1)": 1.8,
  "Piping (NPS 1.5)": 1.8,
  "Piping (NPS 2)": 1.8,
  "Piping (NPS 3)": 2.0,
  "Piping (NPS 4)": 2.3,
  "Piping (NPS 6)": 2.8,
  "Piping (NPS 8)": 3.2,
  "Piping (NPS 10)": 3.6,
  "Piping (NPS 12)": 4.0,
  "Piping": 3.175,
  "Piping Circuit": 3.175,
  "Process Piping": 3.175,
  "Pressure Vessel": 3.175,
  "Storage Tank": 2.5,
  "Tank Bottom": 2.5,
  "Tank Shell": 2.5,
  "Heat Exchanger Shell": 3.175,
  "Heat Exchanger Tube": 1.2,
  "Exchanger": 3.175,
  "Boiler": 3.175
};

const ART_TABLE = {
  0.02: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.04: { 0: 2, 1: { l: 2, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.08: { 0: 8, 1: { l: 5, m: 3, h: 2, vh: 1 }, 2: { l: 3, m: 2, h: 1, vh: 1 }, 3: { l: 2, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.15: { 0: 25, 1: { l: 15, m: 9, h: 5, vh: 2 }, 2: { l: 9, m: 5, h: 3, vh: 1 }, 3: { l: 5, m: 3, h: 2, vh: 1 }, 4: { l: 3, m: 2, h: 1, vh: 1 }, 5: { l: 2, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.25: { 0: 80, 1: { l: 45, m: 25, h: 12, vh: 5 }, 2: { l: 25, m: 12, h: 6, vh: 2 }, 3: { l: 12, m: 6, h: 3, vh: 1 }, 4: { l: 6, m: 3, h: 2, vh: 1 }, 5: { l: 3, m: 2, h: 1, vh: 1 }, 6: { l: 2, m: 1, h: 1, vh: 1 } },
  0.35: { 0: 200, 1: { l: 110, m: 60, h: 30, vh: 10 }, 2: { l: 60, m: 30, h: 15, vh: 5 }, 3: { l: 30, m: 15, h: 7, vh: 2 }, 4: { l: 15, m: 7, h: 4, vh: 1 }, 5: { l: 7, m: 4, h: 2, vh: 1 }, 6: { l: 4, m: 2, h: 1, vh: 1 } },
  0.50: { 0: 500, 1: { l: 280, m: 150, h: 70, vh: 25 }, 2: { l: 150, m: 70, h: 35, vh: 10 }, 3: { l: 70, m: 35, h: 18, vh: 5 }, 4: { l: 35, m: 18, h: 9, vh: 2 }, 5: { l: 18, m: 9, h: 4, vh: 1 }, 6: { l: 9, m: 4, h: 2, vh: 1 } },
  0.70: { 0: 1000, 1: { l: 600, m: 350, h: 180, vh: 60 }, 2: { l: 350, m: 180, h: 90, vh: 25 }, 3: { l: 180, m: 90, h: 45, vh: 12 }, 4: { l: 90, m: 45, h: 22, vh: 6 }, 5: { l: 45, m: 22, h: 11, vh: 3 }, 6: { l: 22, m: 11, h: 5, vh: 1 } },
  0.75: { 0: 1200, 1: { l: 750, m: 450, h: 220, vh: 80 }, 2: { l: 450, m: 220, h: 110, vh: 35 }, 3: { l: 220, m: 110, h: 55, vh: 15 }, 4: { l: 110, m: 55, h: 28, vh: 8 }, 5: { l: 55, m: 28, h: 14, vh: 4 }, 6: { l: 28, m: 14, h: 7, vh: 2 } }
};

const EQUIPMENT_LEAK_AREAS = {
  "Pressure Vessel": { hole_in: 1.0, area_cm2: 53.5483 },
  "Process Piping": { hole_in: 1.0, area_cm2: 53.5483 },
  "Piping": { hole_in: 1.0, area_cm2: 53.5483 },
  "Piping Circuit": { hole_in: 1.0, area_cm2: 53.5483 },
  "Storage Tank": { hole_in: 1.0, area_cm2: 53.5483 },
  "Tank Shell": { hole_in: 1.0, area_cm2: 53.5483 },
  "Tank Bottom": { hole_in: 1.0, area_cm2: 53.5483 },
  "Heat Exchanger Shell": { hole_in: 1.0, area_cm2: 53.5483 },
  "Heat Exchanger Tube": { hole_in: 0.25, area_cm2: 3.167 },
  "Exchanger": { hole_in: 1.0, area_cm2: 53.5483 },
  "Boiler": { hole_in: 1.0, area_cm2: 53.5483 }
};

// ============================================================================
// 2. MATHEMATICAL CALCULATION FUNCTIONS (API 580 / 581, Meridium POF & COF)
// ============================================================================

function getARTDamageFactor(fwl, inspections = 0, conf = "Medium") {
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

function damageFactorToProbability(df) {
  if (df >= 1000) return 1;
  if (df >= 100) return 2;
  if (df >= 10) return 3;
  if (df >= 1) return 4;
  return 5;
}

function getBasicExternalCR_mmyr(tempF) {
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

function calculateInternalThinning(inputs) {
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

function calculateExternalCUI(inputs, tInit_mm = 14.0, tReq_mm = 10.8, yearsInService = 20) {
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

function calculateConsequenceOfFailure(inputs) {
  const fluid = getFluidById(inputs.fluidId);
  const operatingPressure_bar = Math.max(0, parseFloat(inputs.operatingPressure_bar) || 0);
  const operatingTemp_C = parseFloat(inputs.operatingTemp_C) || 25;
  const inventory_kg = parseFloat(inputs.inventory_kg) || 10000;
  const equipmentType = inputs.equipmentType || "Pressure Vessel";
  const detectionTime_min = parseFloat(inputs.detectionTime_min) || 10;
  const isolationTime_min = parseFloat(inputs.isolationTime_min) || 10;

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
  const molecularWeight = fluid.mw || 28;
  const k = fluid.k || 1.3;
  const density_lb_ft3 = fluid.density_lb_ft3 || 50;

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
    toxicCategory = "B"; // Standard conservative representation
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
    // Automatic (Most Severe)
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

function calculateOverallRBI(internalInputs = {}, externalInputs, consequenceInputs) {
  const intInps = internalInputs || {};
  const extInps = externalInputs || intInps;
  const consInps = consequenceInputs || intInps;
  const internalPoF = calculateInternalThinning(intInps);
  const externalPoF = calculateExternalCUI(extInps, intInps.tInit_mm, internalPoF.tReq_mm, intInps.yearsInService);

  let combinedPoF = Math.min(internalPoF.finalProbability, externalPoF.finalProbability);
  let governingPoFMechanism = internalPoF.finalProbability <= externalPoF.finalProbability ? "Internal Thinning" : "External CUI";

  const consequence = calculateConsequenceOfFailure(consInps);
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
// 3. SEED BENCHMARK ASSET & WORKSPACE STORE
// ============================================================================

const BENCHMARK_ASSET = {
  id: "04-VV-00-001 ~ RAW FEED SURGE DRUM",
  tag: "04-VV-00-001",
  name: "RAW FEED SURGE DRUM",
  equipmentCategory: "Pressure Vessel",
  unitService: "Hydrocracker Unit Raw Feed Surge",
  functionalLocation: "NRL-FMT-HCU-MEC",
  facilityName: "Refinery Complex Plant 1",
  designCode: "ASME Sec VIII Div 1",
  designPressure_kgcm2: 25.0,
  designTemp_C: 85.0,
  operatingPressure_kgcm2: 19.8,
  operatingTemp_C: 40.0,
  materialOfConstruction: "SA516-PLATE-Legacy Gr. 70",
  corrosionAllowance_mm: 3.0,
  insulationType: "None",
  processFluid: "C4 (Butane)",
  commissionDate: "2015-06-16",
  scenarioId: "Evergreening 2026",
  scenarioReferenceDate: "2026-06-16",
  isDatasheetLocked: true,
  datasheetSavedAt: "Protected (Sample Benchmark)"
};

const BENCHMARK_COMPONENT = {
  id: "04-VV-00-001-SHELL",
  fullName: "RAW FEED SURGE DRUM SHELL",
  equipmentType: "Pressure Vessel",
  materialSpec: "SA516-PLATE-Legacy Gr. 70",
  isSaved: true,
  hasUnsavedChanges: false,
  technicalData: {
    scenarioId: "Evergreening 2026",
    scenarioReferenceDate: "2026-06-16",
    dateInService: "2000-06-19",
    processFluid: "C4 (Butane)",
    operatingPressure_kgcm2: 17,
    operatingTemp_C: 40,
    initialFluidPhase: "Liquid",
    fluidValidFor581: true,
    toxicMixture: false,
    toxicFluid: "",
    percentToxic: 0,
    toxicFluidValidFor581: false,
    inventory_kg: 11166.09,
    inventoryGroup: "",
    calculatedInventory_kg: 11166.09,
    isolationTime_min: 10,
    detectionTime_min: 10,
    areaHumidity: "Low",
    designPressure_kgcm2: 27.6,
    designTemp_C: 200,
    insideDiameter_mm: 457,
    length_mm: 4200,
    nominalThickness_mm: 14.0,
    insulated: false,
    insulationType: "None",
    pwht: false,
    stressLookupTable: "Pressure Vessels",
    constructionCode: "ASME VIII DIV 1",
    codeYear: "1995",
    materialSpec: "SA516-PLATE-Legacy",
    materialGrade: "70",
    weldJointEfficiency: 0.85,
    isEntryPossible: "Yes (Y)",
    specifiedTmin_mm: 10.8,
    sourceOfCalculatedCorrosionRates: "Asset",
    estimatedInternalCorrosionRate_mm_yr: 0.025,
    estimatedExternalCorrosionRate_mm_yr: 0.076,
    measuredExternalCorrosionRate_mm_yr: 0,
    internalCorrosionType: "General",
    predictableIntCorrLocation: false,
    corrosiveProduct: "",
    susceptibleToCUI: "No (N)",
    lostProductionCategory: "B"
  },
  analyses: [
    {
      id: "Evergreening 2026",
      name: "04-VV-00-001-SHELL ~ Evergreening 2026",
      type: "581",
      isCalculated: true,
      dateCriticalityCalculated: "2026-06-16 10:30:00",
      internalInputs: {
        equipmentType: "Pressure Vessel",
        tInit_mm: 14.0,
        diameter_mm: 457,
        designPressure_bar: 27.06,
        designTemp_C: 200,
        allowableStress_MPa: 137.9,
        yearsInService: 26,
        corrosionRate_mm_yr: 0.025,
        numberOfInspections: 6,
        inspectionConfidence: "High",
        dateInService: "2000-06-19",
        specifiedTmin_mm: 10.8
      },
      externalInputs: {
        operatingTemp_C: 40,
        isInsulated: false,
        materialIsCarbonSteel: true,
        coatingType: "Average - Two Part Industrial (5 yr)",
        insulationType: "N/A (Default)",
        insulationCondition: "Good",
        humidityLevel: "Low",
        nearCoolingTower: false,
        isPiping: false,
        pipingPenetrations: 0,
        pipingTerminations: 0,
        pipingVerticalRuns: 0,
        pipingLength_m: 0,
        numberOfInspections: 2,
        inspectionConfidence: "Medium",
        dateInService: "2000-06-19",
        nominalThickness_mm: 14.0,
        specifiedTmin_mm: 10.8
      },
      consequenceInputs: {
        fluidId: "C4",
        operatingPressure_bar: 16.67,
        operatingTemp_C: 40,
        ambientTemp_C: 25,
        inventory_kg: 11166.09,
        equipmentType: "Pressure Vessel",
        detectionTime_min: 10,
        isolationTime_min: 10,
        lostProductionCategory: "B",
        initialFluidPhase: "Liquid"
      },
      headerData: {
        assetId: "04-VV-00-001",
        analysisId: "Evergreening 2026",
        functionalLocation: "NRL-FMT-HCU-MEC",
        genericFailureFrequency: "3.06E-05 (Failures/Year)",
        criticalityItemType: "Pressure Vessel",
        scenarioId: "Evergreening 2026",
        scenarioReferenceDate: "2026-06-16",
        dateCriticalityCalculated: "2026-06-16 10:30:00",
        effectiveDateForRiskAnalysis: "2026-06-16",
        analysisStartDate: "2026-06-16 10:00:00"
      },
      mechanisms: [
        { id: "internal", name: "Criticality Calculator Internal Corrosion", damageFactor: 1, probabilityOfFailure: 4, consequenceOfFailure: "B", inspectionPriority: 15 },
        { id: "external", name: "Criticality Calculator External Corrosion", damageFactor: 1, probabilityOfFailure: 4, consequenceOfFailure: "B", inspectionPriority: 15 }
      ]
    }
  ]
};

// ============================================================================
// 4. ENTERPRISE APPLICATION CONTROLLER (window.RBIApp)
// ============================================================================

window.RBIApp = {
  assets: [BENCHMARK_ASSET],
  componentsByAsset: {
    [BENCHMARK_ASSET.id]: [BENCHMARK_COMPONENT]
  },
  activeAssetId: BENCHMARK_ASSET.id,
  activeComponentId: BENCHMARK_COMPONENT.id,
  activeAnalysisId: BENCHMARK_COMPONENT.analyses[0].id,

  selectedNode: "dashboard", // 'dashboard' | 'asset' | 'component' | 'analysis'
  assetViewTab: "datasheet", // 'datasheet' | 'components'
  componentTab: "techData", // 'id' | 'techData' | 'rbi581'
  isSidebarOpen: true,

  // Modals state
  activeModal: null, // 'riskMatrix' | 'internalSheet' | 'externalSheet' | 'consequenceSheet' | 'artTable' | 'report' | 'createAsset' | 'createComponent' | 'delete'

  init() {
    this.loadFromBackend();
    this.render();
  },

  async loadFromBackend() {
    try {
      const res = await fetch("/api/risk-calculator?action=get_workspace");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.workspace?.assets?.length > 0) {
          this.assets = data.workspace.assets;
          this.componentsByAsset = data.workspace.componentsByAsset || {};
          this.activeAssetId = this.assets[0].id;
          const comps = this.componentsByAsset[this.activeAssetId] || [];
          if (comps.length > 0) {
            this.activeComponentId = comps[0].id;
            this.activeAnalysisId = comps[0].analyses?.[0]?.id || "";
          }
          this.render();
        }
      }
    } catch (err) {
      console.warn("Could not load workspace from backend, using baseline:", err.message);
    }
  },

  isSavingCloud: false,
  isCloudSynced: true,
  cloudStatusText: "Cloud Synced (FLOC > Assets > Components > Analyses)",

  async syncToBackend(showNotice = false) {
    this.isSavingCloud = true;
    this.cloudStatusText = "Syncing to Cloud Firestore...";
    this.render();

    try {
      const res = await fetch("/api/risk-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_workspace",
          workspace: {
            assets: this.assets,
            componentsByAsset: this.componentsByAsset
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.isCloudSynced = !!data.firestoreSaved;
        if (data.firestoreSaved) {
          const c = data.hierarchyCounts || {};
          this.cloudStatusText = `Cloud Synced (${c.flocs || 1} FLOCs > ${c.assets || 1} Assets > ${c.components || 1} Components > ${c.analyses || 1} Analyses)`;
        } else {
          this.cloudStatusText = "Saved to Local DB (Cloud queued)";
        }
        if (showNotice) {
          alert(data.firestoreSaved
            ? `✅ ${data.message || 'Saved to Cloud Firestore!'}`
            : "✅ Saved locally (queued for Cloud sync)");
        }
      }
    } catch (err) {
      console.warn("Auto-sync workspace note:", err.message);
      this.cloudStatusText = "Saved locally (Offline)";
    } finally {
      this.isSavingCloud = false;
      this.render();
    }
  },

  getActiveAsset() {
    return this.assets.find((a) => a.id === this.activeAssetId) || this.assets[0];
  },

  getActiveComponents() {
    const asset = this.getActiveAsset();
    return asset ? this.componentsByAsset[asset.id] || [] : [];
  },

  getActiveComponent() {
    const comps = this.getActiveComponents();
    return comps.find((c) => c.id === this.activeComponentId) || comps[0];
  },

  getActiveAnalysis() {
    const comp = this.getActiveComponent();
    if (!comp) return null;
    return comp.analyses.find((a) => a.id === this.activeAnalysisId) || comp.analyses[0] || null;
  },

  calculateCurrent() {
    const analysis = this.getActiveAnalysis();
    if (!analysis) return null;
    return calculateOverallRBI(analysis.internalInputs, analysis.externalInputs, analysis.consequenceInputs);
  },

  // ---------------- Navigation Actions ----------------
  selectNode(nodeType, assetId, compId, analysisId) {
    this.selectedNode = nodeType;
    if (assetId) this.activeAssetId = assetId;
    if (compId) this.activeComponentId = compId;
    if (analysisId) this.activeAnalysisId = analysisId;
    this.render();
  },

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.render();
  },

  openModal(modalName) {
    this.activeModal = modalName;
    this.render();
  },

  closeModal() {
    this.activeModal = null;
    this.render();
  },

  // ---------------- Business Logic Actions ----------------
  async runCalculate() {
    const comp = this.getActiveComponent();
    const analysis = this.getActiveAnalysis();
    if (!comp || !analysis) return;

    let rbi = null;
    try {
      // Execute Calculation on Backend Server Engine
      const res = await fetch("/api/risk-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate_analysis",
          inputs: {
            internalInputs: analysis.internalInputs || {},
            externalInputs: analysis.externalInputs || {},
            consequenceInputs: analysis.consequenceInputs || {}
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.results) {
          rbi = data.results;
        }
      }
    } catch (err) {
      console.warn("Backend calculation fallback to local engine:", err);
    }

    if (!rbi) {
      rbi = this.calculateCurrent();
    }

    const calcTime = new Date().toLocaleString();
    analysis.isCalculated = true; // Turn Lightbulb ON!
    analysis.dateCriticalityCalculated = calcTime;
    analysis.headerData.dateCriticalityCalculated = calcTime;
    analysis.results = rbi;

    analysis.mechanisms = [
      { id: "internal", name: "Criticality Calculator Internal Corrosion", damageFactor: rbi.internalPoF.damageFactor, probabilityOfFailure: rbi.internalPoF.finalProbability, consequenceOfFailure: rbi.combinedCoF, inspectionPriority: rbi.priorityNumber },
      { id: "external", name: "Criticality Calculator External Corrosion", damageFactor: rbi.externalPoF.damageFactor, probabilityOfFailure: rbi.externalPoF.finalProbability, consequenceOfFailure: rbi.combinedCoF, inspectionPriority: rbi.priorityNumber }
    ];

    await this.syncToBackend();
    this.render();
  },

  saveComponentData() {
    const comp = this.getActiveComponent();
    if (!comp) return;
    comp.isSaved = true;
    comp.hasUnsavedChanges = false;
    comp.lastSavedAt = new Date().toLocaleTimeString();
    this.syncToBackend();
    this.render();
    alert(`✅ Component "${comp.id}" Technical Datasheet saved and synchronized.`);
  },

  loadSampleUnit() {
    this.assets = [JSON.parse(JSON.stringify(BENCHMARK_ASSET))];
    this.componentsByAsset = {
      [BENCHMARK_ASSET.id]: [JSON.parse(JSON.stringify(BENCHMARK_COMPONENT))]
    };
    this.activeAssetId = BENCHMARK_ASSET.id;
    this.activeComponentId = BENCHMARK_COMPONENT.id;
    this.activeAnalysisId = BENCHMARK_COMPONENT.analyses[0].id;
    this.selectedNode = "dashboard";
    this.syncToBackend();
    this.render();
  },

  // ---------------- HTML Rendering ----------------
  render() {
    const root = document.getElementById("CORROSION_CALCULATIONTab");
    if (!root) return;

    const activeAsset = this.getActiveAsset();
    const activeComps = this.getActiveComponents();
    const activeComp = this.getActiveComponent();
    const activeAnalysis = this.getActiveAnalysis();
    const rbiResult = this.calculateCurrent();

    root.innerHTML = `
      <div class="rbi-app-container">
        <!-- Sub-Header Bar -->
        <header class="rbi-header-bar">
          <div class="rbi-header-left">
            <button type="button" class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.toggleSidebar()">
              ${this.isSidebarOpen ? "◀ Hide Tree" : "▶ Show Tree"}
            </button>
            <div class="rbi-logo-badge">RBI</div>
            <span class="rbi-header-title">Semi-Quantitative RBI <span style="font-weight:400; color:#5eead4; font-size:11.5px;">| API 580 / 581</span></span>
            <div class="rbi-breadcrumbs">
              <button class="rbi-breadcrumb-btn ${this.selectedNode === 'dashboard' ? 'active' : ''}" onclick="window.RBIApp.selectNode('dashboard')">📍 FLOC Dashboard</button>
              ${activeAsset ? `<span>›</span><button class="rbi-breadcrumb-btn ${this.selectedNode === 'asset' ? 'active' : ''}" onclick="window.RBIApp.selectNode('asset', '${activeAsset.id}')">🏢 Asset: ${activeAsset.tag}</button>` : ''}
              ${activeComp ? `<span>›</span><button class="rbi-breadcrumb-btn ${this.selectedNode === 'component' ? 'active' : ''}" onclick="window.RBIApp.selectNode('component', '${activeAsset?.id}', '${activeComp.id}')">📦 ${activeComp.id}</button>` : ''}
              ${activeAnalysis ? `<span>›</span><button class="rbi-breadcrumb-btn ${this.selectedNode === 'analysis' ? 'active' : ''}" onclick="window.RBIApp.selectNode('analysis', '${activeAsset?.id}', '${activeComp?.id}', '${activeAnalysis.id}')"><span class="${activeAnalysis.isCalculated ? 'rbi-bulb-on' : 'rbi-bulb-off'}">💡</span> Analysis: ${activeAnalysis.id}</button>` : ''}
            </div>
          </div>
          <div class="rbi-header-actions">
            <span class="rbi-cloud-status ${this.isSavingCloud ? 'saving' : (this.isCloudSynced ? 'synced' : 'pending')}">${this.isSavingCloud ? '⏳ Syncing to Cloud...' : (this.cloudStatusText || '☁️ Cloud Synced: FLOC > Assets > Components > Analyses')}</span>
            <button class="rbi-hdr-btn ${this.selectedNode === 'dashboard' ? 'rbi-hdr-btn-active' : 'rbi-hdr-btn-teal'}" onclick="window.RBIApp.selectNode('dashboard')">📍 FLOC Dashboard</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.openModal('artTable')">📋 AR/T Table</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.openModal('riskMatrix')">▦ 5×5 Matrix</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.openModal('report')">📄 Report</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-cloud" onclick="window.RBIApp.syncToBackend(true)" title="Save complete hierarchy (FLOC > Assets > Components > Analyses) to Cloud Firestore">💾 Save to Cloud</button>
          </div>
        </header>

        <!-- Workspace Body -->
        <div class="rbi-workspace-body">
          <!-- Left Sidebar Tree -->
          <div class="rbi-sidebar-tree ${this.isSidebarOpen ? '' : 'hidden-sidebar'}">
            <div class="rbi-tree-header">
              <div class="rbi-tree-top-row">
                <span>FLOC & Asset Tree (${this.assets.length})</span>
                <button type="button" class="rbi-icon-btn" onclick="window.RBIApp.openModal('createAsset')" title="Add New Asset">+ Asset</button>
              </div>
              <div class="rbi-tree-toolbar">
                <button type="button" class="rbi-icon-btn" style="flex:1; font-weight:700; color:#0f766e;" onclick="window.RBIApp.openModal('createAsset')">+ New Asset</button>
                <button type="button" class="rbi-icon-btn" style="flex:1;" onclick="window.RBIApp.openModal('createComponent')" ${activeAsset ? '' : 'disabled'}>+ Component</button>
              </div>
              <input type="text" class="rbi-tree-search" placeholder="Search FLOC, assets & components..." oninput="window.RBIApp.filterTree(this.value)">
            </div>
            <div class="rbi-tree-content">
              <div class="rbi-floc-nav-btn ${this.selectedNode === 'dashboard' ? 'active' : ''}" onclick="window.RBIApp.selectNode('dashboard')">
                <span style="font-weight:700;">📍 Plant FLOC Dashboard</span>
                <span style="font-size:10px; font-weight:700;">FLOC</span>
              </div>
              ${this.renderTreeNodes()}
            </div>
          </div>

          <!-- Main Center Pane -->
          <main class="rbi-main-pane">
            ${this.renderMainContent(activeAsset, activeComps, activeComp, activeAnalysis, rbiResult)}
          </main>
        </div>

        <!-- Footer Bar -->
        <footer class="rbi-footer-bar">
          <div>
            <span>Active Asset: <b>${activeAsset ? activeAsset.tag + ' ~ ' + activeAsset.name : 'None'}</b></span> &bull;
            <span>Components: <b>${activeComps.length}</b></span> &bull;
            <span>Selected Node: <b>${this.selectedNode.toUpperCase()}</b></span>
          </div>
          <div>
            <span style="color:#16a34a; font-weight:700;">● RBI 580/581 Engine Online</span> &bull;
            <span>Semi-Quantitative Analysis Standard</span>
          </div>
        </footer>

        <!-- Active Modal Mount -->
        ${this.renderActiveModal(activeAsset, activeComp, activeAnalysis, rbiResult)}
      </div>
    `;
  },

  renderTreeNodes() {
    // Group assets by Functional Location (FLOC)
    const flocs = {};
    this.assets.forEach((asset) => {
      const floc = asset.functionalLocation || "FLOC-GENERAL";
      if (!flocs[floc]) flocs[floc] = [];
      flocs[floc].push(asset);
    });

    return Object.entries(flocs).map(([flocCode, assets]) => `
      <div class="rbi-floc-tree-block">
        <div class="rbi-floc-tree-hdr" onclick="window.RBIApp.selectNode('dashboard')">
          <div style="display:flex; align-items:center; gap:6px;">
            <span>📍</span>
            <span style="font-size:11px; font-weight:800; color:#0f766e;">${flocCode}</span>
          </div>
          <span style="font-size:10px; color:#64748b; font-weight:700;">${assets.length} Eq.</span>
        </div>
        <div style="padding:4px 6px;">
          ${assets.map((asset) => {
            const isAssetSelected = this.selectedNode === "asset" && this.activeAssetId === asset.id;
            const comps = this.componentsByAsset[asset.id] || [];

            return `
              <div class="rbi-tree-node">
                <div class="rbi-node-row ${isAssetSelected ? 'selected' : ''}" onclick="window.RBIApp.selectNode('asset', '${asset.id}')">
                  <span>🏢</span>
                  <div style="flex:1; min-width:0;">
                    <b style="display:block; font-size:11.5px;">${asset.tag}</b>
                    <span class="text-muted" style="font-size:10px; display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${asset.name}</span>
                  </div>
                </div>
                <div style="margin-left:14px; padding-left:8px; border-left:1px solid #cbd5e1; margin-top:2px;">
                  ${comps.map((comp) => {
                    const isCompSelected = this.selectedNode === "component" && this.activeComponentId === comp.id && this.activeAssetId === asset.id;
                    return `
                      <div style="margin-bottom:3px;">
                        <div class="rbi-node-row ${isCompSelected ? 'selected' : ''}" onclick="window.RBIApp.selectNode('component', '${asset.id}', '${comp.id}')">
                          <span>📦</span>
                          <span style="flex:1; font-size:11px; font-weight:600;">${comp.id}</span>
                        </div>
                        <div style="margin-left:14px; padding-left:6px; border-left:1px solid #e2e8f0; margin-top:2px;">
                          ${(comp.analyses || []).map((an) => {
                            const isAnSelected = this.selectedNode === "analysis" && this.activeAnalysisId === an.id && this.activeComponentId === comp.id && this.activeAssetId === asset.id;
                            return `
                              <div class="rbi-node-row ${isAnSelected ? 'selected' : ''}" onclick="window.RBIApp.selectNode('analysis', '${asset.id}', '${comp.id}', '${an.id}')">
                                <span class="${an.isCalculated ? 'rbi-bulb-on' : 'rbi-bulb-off'}">💡</span>
                                <span style="font-size:10.5px; flex:1;">${an.name}</span>
                                <span style="font-size:9.5px; font-weight:700; color:${an.isCalculated ? '#15803d' : '#94a3b8'};">${an.isCalculated ? 'Active' : 'Pending'}</span>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  },

  renderMainContent(activeAsset, activeComps, activeComp, activeAnalysis, rbiResult) {
    if (this.selectedNode === "dashboard" || !activeAsset) {
      return this.renderDashboardView();
    }
    if (this.selectedNode === "asset") {
      return this.renderAssetView(activeAsset, activeComps);
    }
    if (this.selectedNode === "component") {
      return this.renderComponentView(activeAsset, activeComp);
    }
    if (this.selectedNode === "analysis") {
      return this.renderAnalysisView(activeAsset, activeComp, activeAnalysis, rbiResult);
    }
    return this.renderDashboardView();
  },

  // ---------------- VIEW 0: FLOC DASHBOARD ----------------
  renderDashboardView() {
    const totalAssets = this.assets.length;
    let totalComps = 0;
    let totalAnalyses = 0;
    let calculatedCount = 0;

    Object.values(this.componentsByAsset).forEach((comps) => {
      totalComps += comps.length;
      comps.forEach((c) => {
        totalAnalyses += c.analyses?.length || 0;
        calculatedCount += c.analyses?.filter((a) => a.isCalculated).length || 0;
      });
    });

    return `
      <div style="padding:20px; max-width:1200px; margin:0 auto; width:100%; box-sizing:border-box;">
        <div class="rbi-floc-banner">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <span class="rbi-badge" style="background:#0d9488; color:#ffffff; margin-bottom:6px;">API 580 / 581 Plant Asset Management</span>
              <h2 style="margin:4px 0; font-size:22px; font-weight:800;">Plant Functional Location (FLOC) Dashboard</h2>
              <p style="margin:0; font-size:12px; color:#ccfbf1;">Equipments and technical datasheets grouped by Functional Location. Inspect assigned components and RBI calculations.</p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="rbi-hdr-btn rbi-hdr-btn-teal" style="padding:8px 14px; font-size:12px;" onclick="window.RBIApp.openModal('createAsset')">+ Create New Datasheet / Equipment</button>
              <button class="rbi-hdr-btn rbi-hdr-btn-slate" style="padding:8px 14px; font-size:12px;" onclick="window.RBIApp.loadSampleUnit()">✨ Load Sample Unit</button>
            </div>
          </div>
          <div class="rbi-kpi-grid">
            <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Total Equipments</span><div class="rbi-kpi-num">${totalAssets}</div></div>
            <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Components Tracked</span><div class="rbi-kpi-num" style="color:#fbbf24;">${totalComps}</div></div>
            <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8; text-transform:uppercase;">Total Analyses</span><div class="rbi-kpi-num" style="color:#38bdf8;">${totalAnalyses}</div></div>
            <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8; text-transform:uppercase;">RBI Calculated</span><div class="rbi-kpi-num" style="color:#4ade80;">${calculatedCount}</div></div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <h3 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:10px;">Functional Locations Explorer</h3>
          ${this.assets.map((asset) => {
            const comps = this.componentsByAsset[asset.id] || [];
            return `
              <div class="rbi-floc-group-card">
                <div class="rbi-floc-group-hdr" onclick="window.RBIApp.selectNode('asset', '${asset.id}')">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:16px;">🏢</span>
                    <div>
                      <b style="font-size:13px; color:#0f172a;">${asset.tag} &ndash; ${asset.name}</b>
                      <span style="font-size:11px; color:#64748b; display:block;">FLOC: ${asset.functionalLocation} &bull; Category: ${asset.equipmentCategory}</span>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="rbi-badge rbi-badge-locked">🔒 Datasheet Locked</span>
                    <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="event.stopPropagation(); window.RBIApp.selectNode('asset', '${asset.id}')">Open Equipment ›</button>
                  </div>
                </div>
                <table class="rbi-data-table">
                  <thead>
                    <tr>
                      <th>Component ID</th>
                      <th>Equipment Category</th>
                      <th>Process Fluid</th>
                      <th>Operating Specs</th>
                      <th>Analyses</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${comps.length === 0 ? `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:16px;">No components added yet. Use "+ Component" to add parts.</td></tr>` : comps.map((c) => `
                      <tr>
                        <td><b>📦 ${c.id}</b></td>
                        <td>${c.equipmentType}</td>
                        <td>${c.technicalData?.processFluid || 'C4 (Butane)'}</td>
                        <td>${c.technicalData?.operatingPressure_kgcm2 || 0} kg/cm² @ ${c.technicalData?.operatingTemp_C || 0}°C</td>
                        <td><span class="rbi-badge ${c.analyses?.some((a) => a.isCalculated) ? 'rbi-badge-calculated' : 'rbi-badge-pending'}">${c.analyses?.length || 0} Analyses</span></td>
                        <td><button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.selectNode('component', '${asset.id}', '${c.id}')">Open Tech Data</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ---------------- VIEW 1: ASSET VIEW ----------------
  renderAssetView(activeAsset, activeComps) {
    return `
      <div style="padding:20px; max-width:1200px; margin:0 auto; width:100%; box-sizing:border-box;">
        <div class="rbi-tabs-bar" style="margin-bottom:16px; border-radius:6px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <button class="rbi-tab-btn ${this.assetViewTab === 'datasheet' ? 'active' : ''}" onclick="window.RBIApp.assetViewTab = 'datasheet'; window.RBIApp.render();">📄 Asset Technical Datasheet <span class="rbi-badge rbi-badge-locked">🔒 Locked</span></button>
          <button class="rbi-tab-btn ${this.assetViewTab === 'components' ? 'active' : ''}" onclick="window.RBIApp.assetViewTab = 'components'; window.RBIApp.render();">📦 Components Hierarchy (${activeComps.length})</button>
        </div>

        ${this.assetViewTab === 'datasheet' ? `
          <div class="rbi-datasheet-card">
            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="rbi-badge rbi-badge-locked">🔒 Protected Datasheet</span>
                <h2 style="margin:4px 0; font-size:18px; font-weight:800;">${activeAsset.tag} &ndash; ${activeAsset.name}</h2>
                <span style="font-size:11.5px; color:#64748b;">FLOC: ${activeAsset.functionalLocation} &bull; ${activeAsset.facilityName || 'Plant Complex'}</span>
              </div>
            </div>
            <div style="padding:20px;">
              <div class="rbi-datasheet-section-title"><span>1. Asset Identification & Plant Location</span></div>
              <div class="rbi-param-grid" style="margin-bottom:20px;">
                <div class="rbi-param-item"><label>Asset Tag / Equipment ID</label><div class="rbi-param-val-box locked"><span>${activeAsset.tag}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Equipment Name</label><div class="rbi-param-val-box locked"><span>${activeAsset.name}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Equipment Category</label><div class="rbi-param-val-box locked"><span>${activeAsset.equipmentCategory}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Functional Location Code</label><div class="rbi-param-val-box locked"><span>${activeAsset.functionalLocation}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Unit / Operating Service</label><div class="rbi-param-val-box locked"><span>${activeAsset.unitService}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Installation Date</label><div class="rbi-param-val-box locked"><span>${activeAsset.commissionDate || '2015-06-16'}</span><span>🔒</span></div></div>
              </div>

              <div class="rbi-datasheet-section-title"><span>2. Mechanical Design Specifications</span></div>
              <div class="rbi-param-grid" style="margin-bottom:20px;">
                <div class="rbi-param-item"><label>Design Code</label><div class="rbi-param-val-box locked"><span>${activeAsset.designCode || 'ASME Sec VIII Div 1'}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Design Pressure (kg/cm²)</label><div class="rbi-param-val-box locked"><span>${activeAsset.designPressure_kgcm2} kg/cm²</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Design Temperature (°C)</label><div class="rbi-param-val-box locked"><span>${activeAsset.designTemp_C}°C</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Material of Construction</label><div class="rbi-param-val-box locked"><span>${activeAsset.materialOfConstruction || 'SA516 Gr. 70'}</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Corrosion Allowance (mm)</label><div class="rbi-param-val-box locked"><span>${activeAsset.corrosionAllowance_mm} mm</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Insulation Type</label><div class="rbi-param-val-box locked"><span>${activeAsset.insulationType || 'None'}</span><span>🔒</span></div></div>
              </div>

              <div class="rbi-datasheet-section-title"><span>3. Operating Conditions & Process Medium</span></div>
              <div class="rbi-param-grid">
                <div class="rbi-param-item"><label>Operating Pressure (kg/cm²)</label><div class="rbi-param-val-box locked"><span>${activeAsset.operatingPressure_kgcm2} kg/cm²</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Operating Temperature (°C)</label><div class="rbi-param-val-box locked"><span>${activeAsset.operatingTemp_C}°C</span><span>🔒</span></div></div>
                <div class="rbi-param-item"><label>Process Fluid</label><div class="rbi-param-val-box locked"><span>${activeAsset.processFluid || 'C4 (Butane)'}</span><span>🔒</span></div></div>
              </div>
            </div>
          </div>
        ` : `
          <div class="rbi-datasheet-card">
            <div style="padding:14px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <h3 style="margin:0; font-size:14px; font-weight:700;">Components Under ${activeAsset.tag}</h3>
              <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.openModal('createComponent')">+ Add Component</button>
            </div>
            <table class="rbi-data-table">
              <thead>
                <tr>
                  <th>Component ID</th>
                  <th>Process Fluid</th>
                  <th>Oper. Pressure</th>
                  <th>Oper. Temp</th>
                  <th>Analyses Count</th>
                  <th>Calculation Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${activeComps.map((c) => `
                  <tr>
                    <td><b>📦 ${c.id}</b></td>
                    <td>${c.technicalData?.processFluid || 'C4 (Butane)'}</td>
                    <td>${c.technicalData?.operatingPressure_kgcm2 || 0} kg/cm²</td>
                    <td>${c.technicalData?.operatingTemp_C || 0}°C</td>
                    <td>${c.analyses?.length || 0} Analyses</td>
                    <td><span class="rbi-badge ${c.analyses?.some((a) => a.isCalculated) ? 'rbi-badge-calculated' : 'rbi-badge-pending'}">${c.analyses?.some((a) => a.isCalculated) ? 'Calculated' : 'Pending'}</span></td>
                    <td><button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.selectNode('component', '${activeAsset.id}', '${c.id}')">Open Tech Data</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  // ---------------- VIEW 2: COMPONENT VIEW ----------------
  renderComponentView(activeAsset, activeComp) {
    if (!activeComp) return `<div style="padding:30px; text-align:center;">No component selected.</div>`;
    const td = activeComp.technicalData || {};

    return `
      <div style="padding:20px; max-width:1200px; margin:0 auto; width:100%; box-sizing:border-box;">
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:16px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <span class="rbi-badge" style="background:#ccfbf1; color:#0f766e;">Component Master Record</span>
            <h2 style="margin:4px 0; font-size:18px; font-weight:800;">${activeComp.fullName || activeComp.id}</h2>
            <span style="font-size:11.5px; color:#64748b;">Asset: <b>${activeAsset?.tag}</b> &bull; Category: <b>${activeComp.equipmentType}</b></span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" style="padding:8px 16px; font-size:12.5px;" onclick="window.RBIApp.saveComponentData()">💾 Save Component</button>
          </div>
        </div>

        <div class="rbi-datasheet-card">
          <div style="padding:18px 20px;">
            <div class="rbi-datasheet-section-title"><span>0. Scenario & Risk Baseline Details</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item"><label>Scenario ID</label><input type="text" class="rbi-input" value="${td.scenarioId || 'Evergreening 2026'}" onchange="window.RBIApp.updateActiveCompTD('scenarioId', this.value)"></div>
              <div class="rbi-param-item"><label>Scenario Reference Date</label><input type="date" class="rbi-input" value="${td.scenarioReferenceDate || '2026-06-16'}" onchange="window.RBIApp.updateActiveCompTD('scenarioReferenceDate', this.value)"></div>
              <div class="rbi-param-item"><label>Date In Service</label><input type="date" class="rbi-input" value="${td.dateInService || '2000-06-19'}" onchange="window.RBIApp.updateActiveCompTD('dateInService', this.value)"></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>1. Operating and Process Details (API 581)</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item">
                <label>Process Fluid</label>
                <select class="rbi-select" onchange="window.RBIApp.updateActiveCompTD('processFluid', this.value)">
                  ${FLUIDS_DATABASE.map((f) => `<option value="${f.name}" ${f.name === td.processFluid || f.id === td.processFluid ? 'selected' : ''}>${f.name} (${f.density_lb_ft3} lb/ft³)</option>`).join('')}
                </select>
              </div>
              <div class="rbi-param-item"><label>Operating Pressure (kg/cm²)</label><input type="number" step="0.1" class="rbi-input" value="${td.operatingPressure_kgcm2 ?? 17}" onchange="window.RBIApp.updateActiveCompTD('operatingPressure_kgcm2', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Operating Temperature (°C)</label><input type="number" step="1" class="rbi-input" value="${td.operatingTemp_C ?? 40}" onchange="window.RBIApp.updateActiveCompTD('operatingTemp_C', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Initial Fluid Phase</label><select class="rbi-select" onchange="window.RBIApp.updateActiveCompTD('initialFluidPhase', this.value)"><option value="Liquid" ${td.initialFluidPhase === 'Liquid' ? 'selected' : ''}>Liquid</option><option value="Gas" ${td.initialFluidPhase === 'Gas' ? 'selected' : ''}>Gas</option></select></div>
              <div class="rbi-param-item"><label>Fluid Inventory (kg)</label><input type="number" step="100" class="rbi-input" value="${td.inventory_kg ?? 11166}" onchange="window.RBIApp.updateActiveCompTD('inventory_kg', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Detection Time (min)</label><input type="number" class="rbi-input" value="${td.detectionTime_min ?? 10}" onchange="window.RBIApp.updateActiveCompTD('detectionTime_min', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Isolation Time (min)</label><input type="number" class="rbi-input" value="${td.isolationTime_min ?? 10}" onchange="window.RBIApp.updateActiveCompTD('isolationTime_min', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Area Humidity</label><select class="rbi-select" onchange="window.RBIApp.updateActiveCompTD('areaHumidity', this.value)"><option value="Low" ${td.areaHumidity === 'Low' ? 'selected' : ''}>Low</option><option value="Medium" ${td.areaHumidity === 'Medium' ? 'selected' : ''}>Medium</option><option value="High" ${td.areaHumidity === 'High' ? 'selected' : ''}>High</option></select></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>2. Mechanical Design Details</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item"><label>Design Pressure (kg/cm²)</label><input type="number" step="0.1" class="rbi-input" value="${td.designPressure_kgcm2 ?? 27.6}" onchange="window.RBIApp.updateActiveCompTD('designPressure_kgcm2', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Design Temperature (°C)</label><input type="number" step="1" class="rbi-input" value="${td.designTemp_C ?? 200}" onchange="window.RBIApp.updateActiveCompTD('designTemp_C', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Inside Diameter (mm)</label><input type="number" class="rbi-input" value="${td.insideDiameter_mm ?? 457}" onchange="window.RBIApp.updateActiveCompTD('insideDiameter_mm', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Nominal Thickness (mm)</label><input type="number" step="0.1" class="rbi-input" value="${td.nominalThickness_mm ?? 14.0}" onchange="window.RBIApp.updateActiveCompTD('nominalThickness_mm', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Specified Tmin (mm)</label><input type="number" step="0.1" class="rbi-input" value="${td.specifiedTmin_mm ?? 10.8}" onchange="window.RBIApp.updateActiveCompTD('specifiedTmin_mm', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Insulated?</label><select class="rbi-select" onchange="window.RBIApp.updateActiveCompTD('insulated', this.value === 'yes')"><option value="no" ${!td.insulated ? 'selected' : ''}>No</option><option value="yes" ${td.insulated ? 'selected' : ''}>Yes</option></select></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>3. Corrosion Data</span></div>
            <div class="rbi-param-grid">
              <div class="rbi-param-item"><label>Estimated Internal CR (mm/yr)</label><input type="number" step="0.001" class="rbi-input" value="${td.estimatedInternalCorrosionRate_mm_yr ?? 0.025}" onchange="window.RBIApp.updateActiveCompTD('estimatedInternalCorrosionRate_mm_yr', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Estimated External CR (mm/yr)</label><input type="number" step="0.001" class="rbi-input" value="${td.estimatedExternalCorrosionRate_mm_yr ?? 0.076}" onchange="window.RBIApp.updateActiveCompTD('estimatedExternalCorrosionRate_mm_yr', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Lost Production Category</label><select class="rbi-select" onchange="window.RBIApp.updateActiveCompTD('lostProductionCategory', this.value)"><option value="A" ${td.lostProductionCategory === 'A' ? 'selected' : ''}>A</option><option value="B" ${td.lostProductionCategory === 'B' ? 'selected' : ''}>B</option><option value="C" ${td.lostProductionCategory === 'C' ? 'selected' : ''}>C</option><option value="D" ${td.lostProductionCategory === 'D' ? 'selected' : ''}>D</option></select></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  updateActiveCompTD(field, value) {
    const comp = this.getActiveComponent();
    if (comp && comp.technicalData) {
      comp.technicalData[field] = value;
      comp.hasUnsavedChanges = true;
    }
  },

  // ---------------- VIEW 3: ANALYSIS DETAILS VIEW ----------------
  renderAnalysisView(activeAsset, activeComp, activeAnalysis, rbiResult) {
    if (!activeAnalysis) return `<div style="padding:30px; text-align:center;">No analysis selected.</div>`;
    const rbi = rbiResult || this.calculateCurrent();

    return `
      <div style="padding:20px; max-width:1200px; margin:0 auto; width:100%; box-sizing:border-box;">
        <!-- Top Bar with Status and Action Buttons -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:16px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="margin:0; font-size:18px; font-weight:800; color:#0f172a;">Analysis: ${activeAnalysis.name}</h2>
              <span class="rbi-badge ${activeAnalysis.isCalculated ? 'rbi-badge-calculated' : 'rbi-badge-pending'}">${activeAnalysis.isCalculated ? '💡 Calculated (Active)' : 'Pending Calculation'}</span>
            </div>
            <span style="font-size:11.5px; color:#64748b;">Criticality Date: <b>${activeAnalysis.dateCriticalityCalculated || 'Pending'}</b> &bull; Asset: <b>${activeAsset?.tag}</b></span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="rbi-kpi-card" style="padding:4px 10px; background:#f8fafc; border-color:#cbd5e1;"><span style="font-size:9.5px; color:#64748b;">PoF</span> <b style="font-size:14px; color:#0f766e;">${rbi.combinedPoF}</b></div>
            <div class="rbi-kpi-card" style="padding:4px 10px; background:#f8fafc; border-color:#cbd5e1;"><span style="font-size:9.5px; color:#64748b;">CoF</span> <b style="font-size:14px; color:#0f766e;">Category ${rbi.combinedCoF}</b></div>
            <div class="rbi-kpi-card" style="padding:4px 10px; background:#fef3c7; border-color:#fde68a;"><span style="font-size:9.5px; color:#92400e;">Priority</span> <b style="font-size:14px; color:#b45309;">#${rbi.priorityNumber}</b></div>
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" style="padding:8px 16px; font-size:12.5px; font-weight:800;" onclick="window.RBIApp.runCalculate()">🧮 Calculate</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" style="padding:8px 14px; font-size:12px;" onclick="window.RBIApp.openModal('riskMatrix')">▦ Risk Matrix</button>
          </div>
        </div>

        <!-- Section 1: Degradation Mechanisms -->
        <div class="rbi-datasheet-card">
          <div style="padding:14px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:13.5px; font-weight:700;">Degradation Mechanisms (API 581 Thinning & External)</h3>
            <span style="font-size:11px; color:#64748b;">Click mechanism name to inspect datasheet</span>
          </div>
          <table class="rbi-data-table">
            <thead>
              <tr>
                <th>Degradation Mechanism</th>
                <th>Damage Factor</th>
                <th>Probability of Failure</th>
                <th>Consequence Category</th>
                <th>Inspection Priority</th>
                <th>Datasheet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b style="color:#0f766e; cursor:pointer;" onclick="window.RBIApp.openModal('internalSheet')">Criticality Calculator Internal Corrosion</b></td>
                <td><b>${rbi.internalPoF.damageFactor}</b></td>
                <td><span class="rbi-badge" style="background:#dcfce7; color:#166534;">Category ${rbi.internalPoF.finalProbability}</span></td>
                <td>Category ${rbi.combinedCoF}</td>
                <td><b>#${PRIORITY_NUMBER_MATRIX[rbi.internalPoF.finalProbability]?.[rbi.combinedCoF] || rbi.priorityNumber}</b></td>
                <td><button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.openModal('internalSheet')">Open Internal Sheet</button></td>
              </tr>
              <tr>
                <td><b style="color:#0f766e; cursor:pointer;" onclick="window.RBIApp.openModal('externalSheet')">Criticality Calculator External Corrosion</b></td>
                <td><b>${rbi.externalPoF.damageFactor}</b></td>
                <td><span class="rbi-badge" style="background:#dcfce7; color:#166534;">Category ${rbi.externalPoF.finalProbability}</span></td>
                <td>Category ${rbi.combinedCoF}</td>
                <td><b>#${PRIORITY_NUMBER_MATRIX[rbi.externalPoF.finalProbability]?.[rbi.combinedCoF] || rbi.priorityNumber}</b></td>
                <td><button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.openModal('externalSheet')">Open External Sheet</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 2: Consequence Evaluations -->
        <div class="rbi-datasheet-card">
          <div style="padding:14px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:13.5px; font-weight:700;">Consequence Evaluations (API 581 Fire, Toxic & Production Loss)</h3>
            <span style="font-size:11px; color:#64748b;">Governed by GE Digital Section 10 standard</span>
          </div>
          <table class="rbi-data-table">
            <thead>
              <tr>
                <th>Consequence Name</th>
                <th>Governing CoF Category</th>
                <th>Lost Production Category</th>
                <th>Flammable Category</th>
                <th>Toxic Category</th>
                <th>Environmental Cat</th>
                <th>Datasheet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b style="color:#0f766e; cursor:pointer;" onclick="window.RBIApp.openModal('consequenceSheet')">Consequence for RBI</b></td>
                <td><span class="rbi-badge" style="background:#fef3c7; color:#92400e; font-weight:800;">Category ${rbi.consequence.governingCategory} (${rbi.consequence.governingConsequenceType})</span></td>
                <td>Category ${rbi.consequence.productionLossCategory}</td>
                <td>Category ${rbi.consequence.flammableCategory}</td>
                <td>${rbi.consequence.toxicCategory || 'N/A'}</td>
                <td>Category ${rbi.consequence.environmentalCategory}</td>
                <td><button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.openModal('consequenceSheet')">Configure Consequence</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // ---------------- ACTIVE MODALS RENDERING ----------------
  renderActiveModal(activeAsset, activeComp, activeAnalysis, rbiResult) {
    if (!this.activeModal) return "";
    const rbi = rbiResult || this.calculateCurrent();

    if (this.activeModal === "riskMatrix") {
      return this.renderRiskMatrixModal(rbi);
    }
    if (this.activeModal === "internalSheet") {
      return this.renderInternalSheetModal(activeAnalysis, rbi);
    }
    if (this.activeModal === "externalSheet") {
      return this.renderExternalSheetModal(activeAnalysis, rbi);
    }
    if (this.activeModal === "consequenceSheet") {
      return this.renderConsequenceSheetModal(activeAnalysis, rbi);
    }
    if (this.activeModal === "artTable") {
      return this.renderArtTableModal(rbi);
    }
    if (this.activeModal === "report") {
      return this.renderReportModal(activeAnalysis, rbi);
    }
    if (this.activeModal === "createAsset") {
      return this.renderCreateAssetModal();
    }
    if (this.activeModal === "createComponent") {
      return this.renderCreateComponentModal(activeAsset);
    }
    return "";
  },

  renderRiskMatrixModal(rbi) {
    const rows = [
      { num: 1, cols: { E: 11, D: 7, C: 4, B: 2, A: 1 } },
      { num: 2, cols: { E: 16, D: 13, C: 8, B: 6, A: 3 } },
      { num: 3, cols: { E: 20, D: 17, C: 14, B: 9, A: 5 } },
      { num: 4, cols: { E: 23, D: 21, C: 18, B: 15, A: 10 } },
      { num: 5, cols: { E: 25, D: 24, C: 22, B: 19, A: 12 } }
    ];

    const getCellColor = (val) => {
      if ([1, 2, 3, 4, 5, 6].includes(val)) return "cell-red";
      if ([7, 8, 9, 10, 12, 13, 14].includes(val)) return "cell-orange";
      if ([11, 15, 16, 17, 18, 19].includes(val)) return "cell-yellow";
      return "cell-green";
    };

    const targetPriority = rbi.priorityNumber;

    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:800px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>▦ Meridium 5×5 Risk Matrix Summary</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span style="font-size:24px; font-weight:800; color:#dc2626;">50</span>
                <span style="font-weight:700; color:#475569; margin-left:6px;">Total Criticality Risk</span>
              </div>
              <div style="font-size:12px;">
                <span>Driving PoF: <b>Category ${rbi.combinedPoF}</b></span> &bull;
                <span>Driving CoF: <b>Category ${rbi.combinedCoF}</b></span> &bull;
                <span>Inspection Priority: <b style="color:#b45309;">Rank #${targetPriority}</b></span>
              </div>
            </div>

            <!-- 5x5 Grid Table -->
            <div class="rbi-5x5-grid">
              <div style="font-weight:700; color:#64748b; display:flex; align-items:center; justify-content:center;">PoF \\ CoF</div>
              <div style="font-weight:700; text-align:center;">E</div>
              <div style="font-weight:700; text-align:center;">D</div>
              <div style="font-weight:700; text-align:center;">C</div>
              <div style="font-weight:700; text-align:center;">B</div>
              <div style="font-weight:700; text-align:center;">A</div>
              ${rows.map((row) => `
                <div style="font-weight:700; display:flex; align-items:center; justify-content:center;">${row.num}</div>
                ${['E', 'D', 'C', 'B', 'A'].map((col) => {
                  const val = row.cols[col];
                  const isActive = val === targetPriority;
                  return `
                    <div class="rbi-matrix-cell ${getCellColor(val)} ${isActive ? 'active-target' : ''}">
                      <span>#${val}</span>
                      ${isActive ? '<span style="font-size:8px;">ACTIVE</span>' : ''}
                    </div>
                  `;
                }).join('')}
              `).join('')}
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  renderInternalSheetModal(activeAnalysis, rbi) {
    const inp = activeAnalysis.internalInputs || {};
    const res = rbi.internalPoF || {};

    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:900px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Criticality Calculator Internal Corrosion &ndash; Datasheet</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div class="rbi-datasheet-section-title"><span>Input Fields</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item"><label>Date In Service</label><input type="date" class="rbi-input" value="${inp.dateInService || '2000-06-19'}" onchange="window.RBIApp.updateActiveAnalysisInternal('dateInService', this.value)"></div>
              <div class="rbi-param-item"><label>Estimated Rate (mm/yr)</label><input type="number" step="0.001" class="rbi-input" value="${inp.corrosionRate_mm_yr ?? 0.025}" onchange="window.RBIApp.updateActiveAnalysisInternal('corrosionRate_mm_yr', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Number of Inspections</label><input type="number" class="rbi-input" value="${inp.numberOfInspections ?? 6}" onchange="window.RBIApp.updateActiveAnalysisInternal('numberOfInspections', parseInt(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Inspection Confidence</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisInternal('inspectionConfidence', this.value)"><option value="Low" ${inp.inspectionConfidence === 'Low' ? 'selected' : ''}>Low</option><option value="Medium" ${inp.inspectionConfidence === 'Medium' ? 'selected' : ''}>Medium</option><option value="High" ${inp.inspectionConfidence === 'High' ? 'selected' : ''}>High</option><option value="Very High" ${inp.inspectionConfidence === 'Very High' ? 'selected' : ''}>Very High</option></select></div>
              <div class="rbi-param-item"><label>Specified Tmin (mm)</label><input type="number" step="0.1" class="rbi-input" value="${inp.specifiedTmin_mm ?? 10.8}" onchange="window.RBIApp.updateActiveAnalysisInternal('specifiedTmin_mm', parseFloat(this.value)||0)"></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>Output Fields (Calculated via API 581)</span></div>
            <div class="rbi-param-grid">
              <div class="rbi-param-item"><label>Years In Service</label><div class="rbi-param-val-box locked"><span>${res.yearsInService_val} years</span></div></div>
              <div class="rbi-param-item"><label>Estimated Wall Loss</label><div class="rbi-param-val-box locked"><span>${res.estimatedWallLoss_mm} mm</span></div></div>
              <div class="rbi-param-item"><label>Fractional Wall Loss (ar/t)</label><div class="rbi-param-val-box locked"><span>${res.fractionalWallLoss_art}</span></div></div>
              <div class="rbi-param-item"><label>Governing Required Wall (Treq)</label><div class="rbi-param-val-box locked"><span>${res.tReq_mm} mm</span></div></div>
              <div class="rbi-param-item"><label>Wall Ratio (trem / treq)</label><div class="rbi-param-val-box locked"><span>${res.wallRatio}</span></div></div>
              <div class="rbi-param-item"><label>Damage Factor (DF)</label><div class="rbi-param-val-box locked"><b>${res.damageFactor}</b></div></div>
              <div class="rbi-param-item"><label>Probability Category</label><div class="rbi-param-val-box locked" style="background:#dcfce7; color:#166534;"><b>Category ${res.finalProbability}</b></div></div>
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.runCalculate(); window.RBIApp.closeModal();">Save & Recalculate</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  updateActiveAnalysisInternal(field, value) {
    const an = this.getActiveAnalysis();
    if (an && an.internalInputs) {
      an.internalInputs[field] = value;
      this.runCalculate();
    }
  },

  renderExternalSheetModal(activeAnalysis, rbi) {
    const inp = activeAnalysis.externalInputs || {};
    const res = rbi.externalPoF || {};

    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:900px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Criticality Calculator External Corrosion &ndash; Datasheet</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div class="rbi-datasheet-section-title"><span>Input Fields</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item"><label>Operating Temp (°C)</label><input type="number" class="rbi-input" value="${inp.operatingTemp_C ?? 40}" onchange="window.RBIApp.updateActiveAnalysisExternal('operatingTemp_C', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Estimated External CR (mm/yr)</label><input type="number" step="0.001" class="rbi-input" value="${inp.estimatedCorrosionRate_mm_yr ?? 0.076}" onchange="window.RBIApp.updateActiveAnalysisExternal('estimatedCorrosionRate_mm_yr', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Insulated?</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisExternal('isInsulated', this.value === 'yes')"><option value="no" ${!inp.isInsulated ? 'selected' : ''}>No</option><option value="yes" ${inp.isInsulated ? 'selected' : ''}>Yes</option></select></div>
              <div class="rbi-param-item"><label>Insulation Type</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisExternal('insulationType', this.value)"><option value="N/A (Default)">N/A (Default)</option><option value="Mineral Wool">Mineral Wool</option><option value="Calcium Silicate">Calcium Silicate</option><option value="Foam Glass">Foam Glass</option></select></div>
              <div class="rbi-param-item"><label>Near Cooling Tower?</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisExternal('nearCoolingTower', this.value === 'yes')"><option value="no" ${!inp.nearCoolingTower ? 'selected' : ''}>No</option><option value="yes" ${inp.nearCoolingTower ? 'selected' : ''}>Yes (2x Rate)</option></select></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>Output Fields</span></div>
            <div class="rbi-param-grid">
              <div class="rbi-param-item"><label>Predicted External CR</label><div class="rbi-param-val-box locked"><span>${res.predictedCR_mm_yr} mm/yr</span></div></div>
              <div class="rbi-param-item"><label>Effective External Age</label><div class="rbi-param-val-box locked"><span>${res.externalAge_years} years</span></div></div>
              <div class="rbi-param-item"><label>Estimated External Loss</label><div class="rbi-param-val-box locked"><span>${res.wallLoss_mm} mm</span></div></div>
              <div class="rbi-param-item"><label>External Damage Factor</label><div class="rbi-param-val-box locked"><b>${res.damageFactor}</b></div></div>
              <div class="rbi-param-item"><label>Probability Category</label><div class="rbi-param-val-box locked" style="background:#dcfce7; color:#166534;"><b>Category ${res.finalProbability}</b></div></div>
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.runCalculate(); window.RBIApp.closeModal();">Save & Recalculate</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  updateActiveAnalysisExternal(field, value) {
    const an = this.getActiveAnalysis();
    if (an && an.externalInputs) {
      an.externalInputs[field] = value;
      this.runCalculate();
    }
  },

  renderConsequenceSheetModal(activeAnalysis, rbi) {
    const inp = activeAnalysis.consequenceInputs || {};
    const res = rbi.consequence || {};

    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:920px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Consequence of Failure (CoF) &ndash; Technical Datasheet</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div class="rbi-datasheet-section-title"><span>Process & Release Inputs</span></div>
            <div class="rbi-param-grid" style="margin-bottom:20px;">
              <div class="rbi-param-item"><label>Process Fluid</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisConsequence('fluidId', this.value)">${FLUIDS_DATABASE.map((f) => `<option value="${f.id}" ${f.id === inp.fluidId ? 'selected' : ''}>${f.name}</option>`).join('')}</select></div>
              <div class="rbi-param-item"><label>Operating Pressure (bar)</label><input type="number" step="0.1" class="rbi-input" value="${inp.operatingPressure_bar ?? 17}" onchange="window.RBIApp.updateActiveAnalysisConsequence('operatingPressure_bar', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Operating Temp (°C)</label><input type="number" step="1" class="rbi-input" value="${inp.operatingTemp_C ?? 40}" onchange="window.RBIApp.updateActiveAnalysisConsequence('operatingTemp_C', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Inventory (kg)</label><input type="number" step="100" class="rbi-input" value="${inp.inventory_kg ?? 11166}" onchange="window.RBIApp.updateActiveAnalysisConsequence('inventory_kg', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Detection Time (min)</label><input type="number" class="rbi-input" value="${inp.detectionTime_min ?? 10}" onchange="window.RBIApp.updateActiveAnalysisConsequence('detectionTime_min', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Isolation Time (min)</label><input type="number" class="rbi-input" value="${inp.isolationTime_min ?? 10}" onchange="window.RBIApp.updateActiveAnalysisConsequence('isolationTime_min', parseFloat(this.value)||0)"></div>
              <div class="rbi-param-item"><label>Lost Production Category</label><select class="rbi-select" onchange="window.RBIApp.updateActiveAnalysisConsequence('lostProductionCategory', this.value)"><option value="A" ${inp.lostProductionCategory === 'A' ? 'selected' : ''}>A</option><option value="B" ${inp.lostProductionCategory === 'B' ? 'selected' : ''}>B</option><option value="C" ${inp.lostProductionCategory === 'C' ? 'selected' : ''}>C</option><option value="D" ${inp.lostProductionCategory === 'D' ? 'selected' : ''}>D</option></select></div>
            </div>

            <div class="rbi-datasheet-section-title"><span>Calculated Consequence Outputs (API 581 Part 3)</span></div>
            <div class="rbi-param-grid">
              <div class="rbi-param-item"><label>Final Release Phase</label><div class="rbi-param-val-box locked"><b>${res.finalPhase}</b></div></div>
              <div class="rbi-param-item"><label>Discharge Mass Rate</label><div class="rbi-param-val-box locked"><span>${res.dischargeRate_kg_min?.toFixed(1)} kg/min</span></div></div>
              <div class="rbi-param-item"><label>Estimated Leak Quantity</label><div class="rbi-param-val-box locked"><span>${res.leakQuantity_kg?.toFixed(1)} kg</span></div></div>
              <div class="rbi-param-item"><label>Probability of Ignition</label><div class="rbi-param-val-box locked"><span>${((res.probabilityOfIgnition || 0) * 100).toFixed(0)}%</span></div></div>
              <div class="rbi-param-item"><label>Flammable Affected Area</label><div class="rbi-param-val-box locked"><span>${res.flammableAffectedArea_m2?.toFixed(1)} m²</span></div></div>
              <div class="rbi-param-item"><label>Flammable Category</label><div class="rbi-param-val-box locked"><b>Category ${res.flammableCategory}</b></div></div>
              <div class="rbi-param-item"><label>Governing Combined CoF</label><div class="rbi-param-val-box locked" style="background:#fef3c7; color:#92400e;"><b>Category ${res.governingCategory} (${res.governingConsequenceType})</b></div></div>
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.runCalculate(); window.RBIApp.closeModal();">Save & Recalculate</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  updateActiveAnalysisConsequence(field, value) {
    const an = this.getActiveAnalysis();
    if (an && an.consequenceInputs) {
      an.consequenceInputs[field] = value;
      this.runCalculate();
    }
  },

  async fetchArtTableData() {
    if (window._artTableCache) return window._artTableCache;
    try {
      const res = await fetch("/api/risk-calculator?action=art_table");
      if (res.ok) {
        const data = await res.json();
        if (data && data.artTable) {
          window._artTableCache = data.artTable;
          return data.artTable;
        }
      }
    } catch (e) {
      console.warn("Could not fetch ART table from API:", e);
    }
    return null;
  },

  renderArtTableModal(rbi) {
    if (!window._artTableCache) {
      this.fetchArtTableData().then(data => {
        if (data) this.render();
      });
      return `
        <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
          <div class="rbi-modal-window" style="max-width:500px; padding:30px; text-align:center;" onclick="event.stopPropagation()">
            <div style="font-size:14px; color:#475569;">⏳ Loading AR/T Table matrix from Cloud Database...</div>
          </div>
        </div>
      `;
    }

    const artTable = window._artTableCache;
    const keys = Object.keys(artTable).map(parseFloat).sort((a, b) => a - b);
    const activeFWL = rbi?.internalPoF?.fractionalWallLoss_art || 0.05;

    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:960px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Appendix 1 &ndash; AR/T Table (Corrosion Factor Matrix)</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <p style="margin-top:0; font-size:11.5px; color:#64748b;">Fractional Wall Loss (ar/t) vs Number of Inspections (0 to 6) & Confidence Levels (L, M, H, VH). Active ar/t = <b>${activeFWL.toFixed(3)}</b></p>
            <table class="rbi-data-table" style="font-size:11px;">
              <thead>
                <tr>
                  <th>ar / t</th>
                  <th>0 Insp</th>
                  <th>1 Insp (M)</th>
                  <th>2 Insp (M)</th>
                  <th>3 Insp (M)</th>
                  <th>4 Insp (M)</th>
                  <th>5 Insp (M)</th>
                  <th>6 Insp (M)</th>
                </tr>
              </thead>
              <tbody>
                ${keys.map((k) => `
                  <tr style="${Math.abs(k - activeFWL) < 0.03 ? 'background:#fef3c7; font-weight:700;' : ''}">
                    <td><b>${k.toFixed(2)}</b></td>
                    <td>${artTable[k][0]}</td>
                    <td>${artTable[k][1].m}</td>
                    <td>${artTable[k][2].m}</td>
                    <td>${artTable[k][3].m}</td>
                    <td>${artTable[k][4].m}</td>
                    <td>${artTable[k][5].m}</td>
                    <td>${artTable[k][6].m}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  renderReportModal(activeAnalysis, rbi) {
    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:850px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Risk-Based Inspection (RBI) Assessment Report &ndash; Summary</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div style="border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:14px;">
              <h2 style="margin:0; font-size:18px; color:#0f172a;">API 580/581 Semi-Quantitative Integrity Assessment</h2>
              <span style="font-size:12px; color:#64748b;">Equipment: <b>${this.getActiveAsset()?.tag}</b> &bull; Component: <b>${this.getActiveComponent()?.id}</b></span>
            </div>
            <div class="rbi-kpi-grid" style="margin-top:0; border:none; padding:0; margin-bottom:20px;">
              <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8;">OVERALL RISK</span><div class="rbi-kpi-num" style="color:#dc2626;">${rbi.riskLevel}</div></div>
              <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8;">GOVERNING POF</span><div class="rbi-kpi-num" style="color:#0f766e;">Category ${rbi.combinedPoF}</div></div>
              <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8;">GOVERNING COF</span><div class="rbi-kpi-num" style="color:#0f766e;">Category ${rbi.combinedCoF}</div></div>
              <div class="rbi-kpi-card"><span style="font-size:10px; color:#94a3b8;">PRIORITY RANK</span><div class="rbi-kpi-num" style="color:#b45309;">#${rbi.priorityNumber} of 25</div></div>
            </div>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:14px; font-size:12px; line-height:1.6;">
              <b style="color:#0f172a; display:block; margin-bottom:6px;">Inspection Strategy Recommendation:</b>
              ${rbi.riskLevel === 'High'
                ? 'Immediate high-coverage non-intrusive NDE (e.g. 100% automated UT thickness scanning or internal visual inspection). Perform remaining life verification within 6-12 months.'
                : rbi.riskLevel === 'Medium-High'
                ? 'Focused inspection at high-probability damage locations (deadlegs, bends, stagnant areas). Schedule comprehensive thickness monitoring within 1-2 years.'
                : 'Routine inspection per plant turnaround schedule (typically 3-5 years). Baseline external CUI visual survey and spot thickness checks.'}
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.print()">Print / PDF</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  renderCreateAssetModal() {
    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:650px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Create New Asset & Technical Datasheet</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div style="background:#fef3c7; border:1px solid #fde68a; color:#92400e; padding:10px; border-radius:6px; font-size:11.5px; margin-bottom:14px;">
              <b>Datasheet Lock Notice:</b> Once created, this asset technical datasheet will be saved and locked under API 580 integrity governance.
            </div>
            <div class="rbi-param-grid">
              <div class="rbi-param-item"><label>Asset Tag *</label><input type="text" id="new_asset_tag" class="rbi-input" placeholder="e.g. 05-C-101"></div>
              <div class="rbi-param-item"><label>Equipment Category</label><select id="new_asset_cat" class="rbi-select"><option value="Pressure Vessel">Pressure Vessel</option><option value="Column">Column</option><option value="Piping">Piping</option><option value="Heat Exchanger">Heat Exchanger</option><option value="Storage Tank">Storage Tank</option></select></div>
              <div class="rbi-param-item" style="grid-column:span 2;"><label>Equipment Description / Name *</label><input type="text" id="new_asset_name" class="rbi-input" placeholder="e.g. AMINE REGENERATOR COLUMN"></div>
              <div class="rbi-param-item"><label>Functional Location Code</label><input type="text" id="new_asset_floc" class="rbi-input" placeholder="e.g. NRL-FMT-GTU-MEC"></div>
              <div class="rbi-param-item"><label>Process Fluid</label><select id="new_asset_fluid" class="rbi-select">${FLUIDS_DATABASE.map((f) => `<option value="${f.name}">${f.name}</option>`).join('')}</select></div>
              <div class="rbi-param-item"><label>Operating Pressure (kg/cm²)</label><input type="number" id="new_asset_oper_p" class="rbi-input" value="15"></div>
              <div class="rbi-param-item"><label>Operating Temp (°C)</label><input type="number" id="new_asset_oper_t" class="rbi-input" value="45"></div>
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Cancel</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.submitCreateAsset()">Save Asset & Lock Datasheet</button>
          </div>
        </div>
      </div>
    `;
  },

  submitCreateAsset() {
    const tag = document.getElementById("new_asset_tag")?.value.trim().toUpperCase();
    const name = document.getElementById("new_asset_name")?.value.trim().toUpperCase();
    const cat = document.getElementById("new_asset_cat")?.value || "Pressure Vessel";
    const floc = document.getElementById("new_asset_floc")?.value.trim() || "FLOC-UNASSIGNED";
    const fluid = document.getElementById("new_asset_fluid")?.value || "C4 (Butane)";
    const operP = parseFloat(document.getElementById("new_asset_oper_p")?.value) || 0;
    const operT = parseFloat(document.getElementById("new_asset_oper_t")?.value) || 0;

    if (!tag || !name) {
      alert("Please enter Asset Tag and Name.");
      return;
    }

    const newId = `${tag} ~ ${name}`;
    const newAsset = {
      id: newId,
      tag,
      name,
      equipmentCategory: cat,
      functionalLocation: floc,
      unitService: "Refinery Service Unit",
      facilityName: "Plant Complex",
      designCode: "ASME Sec VIII Div 1",
      designPressure_kgcm2: operP * 1.3,
      designTemp_C: operT + 50,
      operatingPressure_kgcm2: operP,
      operatingTemp_C: operT,
      materialOfConstruction: "SA516 Gr. 70",
      corrosionAllowance_mm: 3.0,
      insulationType: "None",
      processFluid: fluid,
      commissionDate: new Date().toISOString().split("T")[0],
      isDatasheetLocked: true,
      datasheetSavedAt: new Date().toLocaleString()
    };

    this.assets.push(newAsset);
    this.componentsByAsset[newId] = [];
    this.activeAssetId = newId;
    this.selectedNode = "asset";
    this.assetViewTab = "datasheet";
    this.closeModal();
    this.syncToBackend();
    this.render();
  },

  renderCreateComponentModal(activeAsset) {
    const tag = activeAsset?.tag || "COMP";
    return `
      <div class="rbi-modal-backdrop" onclick="window.RBIApp.closeModal()">
        <div class="rbi-modal-window" style="max-width:580px;" onclick="event.stopPropagation()">
          <div class="rbi-modal-hdr">
            <b>Create New RBI Component for ${tag}</b>
            <button class="rbi-chevron" style="color:#ffffff; font-size:16px;" onclick="window.RBIApp.closeModal()">&times;</button>
          </div>
          <div class="rbi-modal-body">
            <div style="margin-bottom:12px;">
              <label style="font-size:11.5px; font-weight:700; color:#475569; display:block; margin-bottom:4px;">Quick Component Presets (API 580/581 Parts):</label>
              <div class="rbi-preset-chip-group">
                <button type="button" class="rbi-preset-chip" onclick="window.RBIApp.selectCompPreset('SHELL', '${tag}')">🛡️ Shell</button>
                <button type="button" class="rbi-preset-chip" onclick="window.RBIApp.selectCompPreset('CHANNEL', '${tag}')">🔄 Channel</button>
                <button type="button" class="rbi-preset-chip" onclick="window.RBIApp.selectCompPreset('HEAD', '${tag}')">⭕ Head</button>
                <button type="button" class="rbi-preset-chip" onclick="window.RBIApp.selectCompPreset('TUBE_BUNDLE', '${tag}')">🧬 Tube Bundle</button>
                <button type="button" class="rbi-preset-chip" onclick="window.RBIApp.selectCompPreset('NOZZLE', '${tag}')">🚰 Nozzle</button>
              </div>
            </div>

            <div class="rbi-param-grid" style="grid-template-columns:1fr;">
              <div class="rbi-param-item">
                <label>Component ID / Tag *</label>
                <input type="text" id="new_comp_id" class="rbi-input" value="${tag}-SHELL">
              </div>
              <div class="rbi-param-item">
                <label>Component Full Name / Service</label>
                <input type="text" id="new_comp_fullname" class="rbi-input" value="${tag} - Shell Section">
              </div>
              <div class="rbi-param-item">
                <label>Equipment / Component Category</label>
                <select id="new_comp_cat" class="rbi-select">
                  <option value="Pressure Vessel">Pressure Vessel</option>
                  <option value="Heat Exchanger Shell/Channel">Heat Exchanger Shell/Channel</option>
                  <option value="Heat Exchanger Tube">Heat Exchanger Tube</option>
                  <option value="Piping <= 1.5&quot;">Piping &lt;= 1.5&quot;</option>
                  <option value="Piping 2&quot; - 8&quot;">Piping 2&quot; - 8&quot;</option>
                  <option value="Piping >= 8&quot;">Piping &gt;= 8&quot;</option>
                  <option value="Storage Tank">Storage Tank</option>
                  <option value="Column">Column</option>
                  <option value="Filter">Filter</option>
                  <option value="Reactor">Reactor</option>
                </select>
              </div>
            </div>
          </div>
          <div class="rbi-modal-footer">
            <button class="rbi-hdr-btn rbi-hdr-btn-slate" onclick="window.RBIApp.closeModal()">Cancel</button>
            <button class="rbi-hdr-btn rbi-hdr-btn-teal" onclick="window.RBIApp.submitCreateComponent()">Create Component & Analyses</button>
          </div>
        </div>
      </div>
    `;
  },

  selectCompPreset(type, tag) {
    const idInput = document.getElementById("new_comp_id");
    const nameInput = document.getElementById("new_comp_fullname");
    const catSelect = document.getElementById("new_comp_cat");
    if (!idInput) return;

    if (type === "SHELL") {
      idInput.value = `${tag}-SHELL`;
      if (nameInput) nameInput.value = `${tag} - Shell Section`;
      if (catSelect) catSelect.value = "Pressure Vessel";
    } else if (type === "CHANNEL") {
      idInput.value = `${tag}-CHANNEL`;
      if (nameInput) nameInput.value = `${tag} - Channel Head & Cover`;
      if (catSelect) catSelect.value = "Heat Exchanger Shell/Channel";
    } else if (type === "HEAD") {
      idInput.value = `${tag}-HEAD`;
      if (nameInput) nameInput.value = `${tag} - Top/Bottom Head`;
      if (catSelect) catSelect.value = "Pressure Vessel";
    } else if (type === "TUBE_BUNDLE") {
      idInput.value = `${tag}-TUBES`;
      if (nameInput) nameInput.value = `${tag} - Tube Bundle`;
      if (catSelect) catSelect.value = "Heat Exchanger Tube";
    } else if (type === "NOZZLE") {
      idInput.value = `${tag}-NOZZLE-N1`;
      if (nameInput) nameInput.value = `${tag} - Process Inlet Nozzle`;
      if (catSelect) catSelect.value = 'Piping 2" - 8"';
    }
  },

  submitCreateComponent() {
    const asset = this.getActiveAsset();
    if (!asset) return;
    const compId = document.getElementById("new_comp_id")?.value.trim() || `${asset.tag}-SHELL`;
    const fullName = document.getElementById("new_comp_fullname")?.value.trim() || compId;
    const cat = document.getElementById("new_comp_cat")?.value || "Pressure Vessel";

    const newComp = {
      id: compId,
      fullName: fullName,
      equipmentType: cat,
      materialSpec: asset.materialOfConstruction || "SA516 Gr. 70",
      isSaved: false,
      hasUnsavedChanges: true,
      technicalData: {
        scenarioId: "Evergreening 2026",
        scenarioReferenceDate: "2026-06-16",
        dateInService: asset.commissionDate || "2000-06-19",
        processFluid: asset.processFluid || "C4 (Butane)",
        operatingPressure_kgcm2: asset.operatingPressure_kgcm2 || 17,
        operatingTemp_C: asset.operatingTemp_C || 40,
        initialFluidPhase: "Liquid",
        fluidValidFor581: true,
        toxicMixture: false,
        inventory_kg: 10000,
        isolationTime_min: 10,
        detectionTime_min: 10,
        areaHumidity: "Low",
        nominalThickness_mm: 14.0,
        specifiedTmin_mm: 10.8,
        estimatedInternalCorrosionRate_mm_yr: 0.025,
        estimatedExternalCorrosionRate_mm_yr: 0.076,
        lostProductionCategory: "B"
      },
      analyses: []
    };

    // Auto create analysis 580/581
    newComp.analyses.push({
      id: "Evergreening 2026",
      name: `${compId} ~ Evergreening 2026`,
      type: "581",
      isCalculated: false,
      internalInputs: {
        equipmentType: cat,
        tInit_mm: 14.0,
        diameter_mm: 1000,
        designPressure_bar: (asset.designPressure_kgcm2 || 25) * 0.980665,
        allowableStress_MPa: 137.9,
        corrosionRate_mm_yr: 0.025,
        numberOfInspections: 2,
        inspectionConfidence: "Medium",
        yearsInService: 20,
        specifiedTmin_mm: 10.8
      },
      externalInputs: {
        operatingTemp_C: asset.operatingTemp_C || 40,
        isInsulated: false,
        coatingType: "Average - Two Part Industrial (5 yr)",
        insulationType: "N/A (Default)",
        insulationCondition: "Good",
        humidityLevel: "Low",
        numberOfInspections: 2,
        inspectionConfidence: "Medium",
        yearsInService: 20,
        nominalThickness_mm: 14.0,
        specifiedTmin_mm: 10.8
      },
      consequenceInputs: {
        fluidId: asset.processFluid ? (getFluidById(asset.processFluid)?.id || "C4") : "C4",
        operatingPressure_bar: (asset.operatingPressure_kgcm2 || 17) * 0.980665,
        operatingTemp_C: asset.operatingTemp_C || 40,
        inventory_kg: 10000,
        equipmentType: cat,
        detectionTime_min: 10,
        isolationTime_min: 10,
        lostProductionCategory: "B"
      },
      headerData: {
        assetId: asset.tag,
        analysisId: "Evergreening 2026",
        functionalLocation: asset.functionalLocation,
        genericFailureFrequency: "3.06E-05 (Failures/Year)",
        criticalityItemType: cat,
        scenarioId: "Evergreening 2026",
        scenarioReferenceDate: "2026-06-16",
        dateCriticalityCalculated: "",
        effectiveDateForRiskAnalysis: new Date().toLocaleDateString(),
        analysisStartDate: new Date().toLocaleString()
      },
      mechanisms: [
        { id: "internal", name: "Criticality Calculator Internal Corrosion", damageFactor: 1, probabilityOfFailure: 4, consequenceOfFailure: "B", inspectionPriority: 15 },
        { id: "external", name: "Criticality Calculator External Corrosion", damageFactor: 1, probabilityOfFailure: 4, consequenceOfFailure: "B", inspectionPriority: 15 }
      ]
    });

    if (!this.componentsByAsset[asset.id]) this.componentsByAsset[asset.id] = [];
    this.componentsByAsset[asset.id].push(newComp);
    this.activeComponentId = compId;
    this.activeAnalysisId = newComp.analyses[0].id;
    this.selectedNode = "component";
    this.closeModal();
    this.syncToBackend();
    this.render();
  }
};

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.RBIApp.init());
} else {
  window.RBIApp.init();
}
