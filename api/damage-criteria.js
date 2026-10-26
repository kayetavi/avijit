import { getAdminFirestore } from "./firebaseAdmin.js";
import { getFirestoreDb } from "./firestoreClient.js";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

// In-memory cache for dynamic Firestore criteria tables
let cachedCriteriaDocs = {};
let cachedCriteriaTime = 0;
const CRITERIA_CACHE_TTL = 30000;

export async function getDamageCriteriaFromFirestore(docId) {
  if (cachedCriteriaDocs[docId] && (Date.now() - cachedCriteriaTime < CRITERIA_CACHE_TTL)) {
    return cachedCriteriaDocs[docId];
  }
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection("damageCriteria").doc(docId).get();
      if (snap.exists) {
        cachedCriteriaDocs[docId] = snap.data();
        cachedCriteriaTime = Date.now();
        return cachedCriteriaDocs[docId];
      }
    }
  } catch (err) {
    console.warn(`[DamageCriteria] Firestore fetch notice for ${docId}:`, err.message);
  }
  return null;
}

export const API571_TABLE_3_27_1_FALLBACK = {
  "Carbon steel": { fps1: 1.0, fps4: 4.0, fps27: 27.0 },
  "Cast iron": { fps1: 1.0, fps4: 3.5, fps27: 25.0 },
  "Silicon bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Admiralty brass": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Hydraulic bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "G bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Al bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Aluminum brass": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "90-10 Cu-Ni": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "70-30 Cu-Ni (0.05 %Fe)": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "70-30 Cu-Ni (0.5 % Fe)": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Alloy 400": { fps1: 0.1, fps4: 1.0, fps27: 5.0 },
  "316 SS": { fps1: 0.1, fps4: 1.0, fps27: 5.0 },
  "Alloy C-276": { fps1: 0.1, fps4: 0.5, fps27: 2.0 },
  "Titanium": { fps1: 0.05, fps4: 0.2, fps27: 1.0 }
};

export let API571_TABLE_3_27_1 = API571_TABLE_3_27_1_FALLBACK;

export async function getLiveErosionTable() {
  const doc = await getDamageCriteriaFromFirestore("api571_table_3_27_1");
  if (doc && doc.data && typeof doc.data === "object") {
    API571_TABLE_3_27_1 = doc.data;
    return doc.data;
  }
  return API571_TABLE_3_27_1_FALLBACK;
}

/**
 * Chromium Classification Helper
 */
function crClassification(cr, ninePctNote) {
  if (cr <= 0) return "Cr% not entered — enter alloy Cr% to assess scale resistance.";
  if (ninePctNote) {
    if (cr >= 9) return `Cr=${cr}% — substantial resistance expected (≥9Cr-1Mo level).`;
    if (cr >= 7) return `Cr=${cr}% — moderate resistance improvement (7–9% range).`;
    return `Cr=${cr}% — minimal benefit below ~7%; rate resembles carbon steel.`;
  } else {
    return `Cr=${cr}% entered — resistance increases with Cr content per §3.61.3b; 300 SS is highly resistant.`;
  }
}

/**
 * NH4HS Step-by-Step Justification Builder
 */
function buildNH4HSJustification(data, nh4hsKgHr, nh4hsWt, velocityMS, velocityFPS) {
  if (!(data.h2s > 0 && data.nh3 > 0)) {
    return `Not applicable: H₂S = ${data.h2s} kg/h, NH₃ = ${data.nh3} kg/h. NH4HS forms only when both H₂S and NH₃ are present (§3.5.3c).`;
  }
  if (data.h2o <= 0) {
    return `Not applicable: H₂S (${data.h2s} kg/h) and NH₃ (${data.nh3} kg/h) react to form ≈${nh4hsKgHr.toFixed(1)} kg/h NH4HS, but no water was entered. Per §3.5.3d, NH4HS salts are non-corrosive unless hydrated.`;
  }

  const lines = [];
  lines.push(`APPLICABLE: H₂S (${data.h2s} kg/h) and NH₃ (${data.nh3} kg/h) form ${nh4hsKgHr.toFixed(1)} kg/h NH4HS, hydrated by ${data.h2o} kg/h water to yield ${nh4hsWt.toFixed(2)} wt% aqueous concentration (§3.5.3).`);
  if (nh4hsWt > 2) {
    lines.push(`Concentration (${nh4hsWt.toFixed(2)} wt%) exceeds the 2 wt% severe threshold; accelerated wall thinning expected.`);
  } else {
    lines.push(`Concentration is below 2 wt% baseline threshold; monitoring required at high turbulence locations.`);
  }

  if (data.temp >= 50 && data.temp <= 65) {
    lines.push(`Operating at ${data.temp}°C within the 50–65°C precipitation band; localized solid salt deposition threat.`);
  } else if (data.temp > 65) {
    lines.push(`Operating at ${data.temp}°C (above 65°C); salts remain dissolved here, shifting fouling/corrosion risk downstream.`);
  }

  if (velocityMS > 0) {
    lines.push(`Flow velocity is ${velocityMS.toFixed(2)} m/s (${velocityFPS.toFixed(1)} fps) — wall shear stress accelerates mass transfer.`);
  }
  return lines.join(" ");
}

/**
 * Automatic Flow Velocity Calculator
 */
function calculateVelocity(options) {
  const flowKgHr = Number.isFinite(options.flowKgHr) ? options.flowKgHr : 0;
  const densityKgM3 = Number.isFinite(options.densityKgM3) ? options.densityKgM3 : 0;
  const pipeDiameterMm = Number.isFinite(options.pipeDiameterMm) ? options.pipeDiameterMm : 0;
  const manualVelocityMS = Number.isFinite(options.manualVelocityMS) ? options.manualVelocityMS : 0;

  if (flowKgHr > 0 && densityKgM3 > 0 && pipeDiameterMm > 0) {
    const massFlowKgSec = flowKgHr / 3600;
    const volumetricFlowM3Sec = massFlowKgSec / densityKgM3;
    const diameterM = pipeDiameterMm / 1000;
    const areaM2 = Math.PI * Math.pow(diameterM, 2) / 4;
    const velocityMS = volumetricFlowM3Sec / areaM2;
    const velocityFPS = velocityMS * 3.28084;
    return { velocityMS, velocityFPS, source: "AUTOMATIC — Flow + Density + Pipe ID", calculated: true };
  }

  if (manualVelocityMS > 0) {
    return {
      velocityMS: manualVelocityMS,
      velocityFPS: manualVelocityMS * 3.28084,
      source: "MANUAL — manual input override",
      calculated: false
    };
  }

  return { velocityMS: 0, velocityFPS: 0, source: "NOT AVAILABLE", calculated: false };
}

/**
 * Standalone Nelson Curve Boundary Mathematical Engine per API RP 941 (Figure 3-36-1)
 * @param {string} material - Nelson Curve Metallurgy enum
 * @param {number} ppH2 - Hydrogen partial pressure in psia
 * @returns {number} Limit temperature in °F
 */
function getNelsonCurveLimitTempF(material, ppH2) {
  if (material === "AUSTENITIC_SS" || ppH2 < 50) return 9999;

  switch (material) {
    case "CS_NON_PWHT":
      if (ppH2 <= 250) {
        return 500 - ((ppH2 - 50) / (250 - 50)) * (500 - 450);
      } else if (ppH2 <= 1000) {
        return 450 - ((ppH2 - 250) / (1000 - 250)) * (450 - 400);
      }
      return 400;

    case "CS_PWHT":
      if (ppH2 <= 220) return 590;
      if (ppH2 < 1500) return 590 - 108 * Math.log10(ppH2 / 220);
      return 500;

    case "C_05MO":
      return 500; // Conservative baseline per Annex A

    case "125CR_05MO":
      if (ppH2 <= 1750) return Math.max(550, 1050 - 325 * Math.log10(ppH2 / 50));
      return 550;

    case "225CR_1MO":
      if (ppH2 <= 2000) return Math.max(800, 1150 - 218 * Math.log10(ppH2 / 50));
      return 800;

    case "225CR_1MO_V":
      return 825;

    case "6CR_05MO":
      return 1100;

    default:
      return 400;
  }
}

/**
 * Full API 571 Damage Mechanism Screening Evaluation Engine
 */
function evaluateScreeningMatrix(input, dataset) {
  const normY = (v) => {
    const s = String(v || "").trim().toUpperCase();
    return s === "Y" || s === "YES" || s === "TRUE" || s === "1" ? "Y" : "N";
  };
  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const data = {
    stream: String(input.stream || input.streamName || "Unnamed Stream").trim(),
    phase: String(input.phase || "Mixed").trim().toUpperCase(),
    temp: num(input.temp || input.temperature),
    pressure: num(input.pressure),
    h2: num(input.h2),
    h2MolFrac: num(input.h2MolFrac),
    h2s: num(input.h2s),
    nh3: num(input.nh3),
    nh3Significant: normY(input.nh3Significant),
    otherContamSignificant: normY(input.otherContamSignificant),
    h2o: num(input.h2o),
    co2: num(input.co2),
    carbonSteel: normY(input.carbonSteel != null ? input.carbonSteel : "Y"),
    cr: num(input.cr || input.crContent),
    crContent: num(input.crContent || input.cr),
    stress: normY(input.stress != null ? input.stress : "N"),
    nelsonMaterial: String(input.nelsonMaterial || ""),
    hardness: normY(input.hardness),
    oxygen: normY(input.oxygen),
    amineFlow: num(input.amineFlow),
    amineType: String(input.amineType || "None"),
    amineService: String(input.amineService || "Lean").trim().toUpperCase(),
    hsas: num(input.hsas),
    ph: num(input.ph),
    velocityFlow: num(input.velocityFlow || input.massFlow),
    velocityDensity: num(input.velocityDensity || input.density),
    pipeDiameter: num(input.pipeDiameter),
    manualVelocity: num(input.velocity || input.manualVelocity),
    turbulence: normY(input.turbulence),
    solids: normY(input.solids),
    insulated: normY(input.insulated),
    cuiMaterial: String(input.cuiMaterial || "").trim().toUpperCase(),
    eroMaterial: String(input.eroMaterial || ""),
    deltaT: num(input.deltaT),
    thermalLocation: String(input.thermalLocation || "").trim().toUpperCase()
  };

  const liquidWater = data.phase === "LIQUID" || data.phase === "MIXED" || data.h2o > 0;

  // H2S ppmw in aqueous phase
  let h2sPPMW = 0;
  if (liquidWater && data.h2o > 0 && data.h2s > 0) {
    h2sPPMW = (data.h2s / (data.h2o + data.h2s)) * 1000000;
  }

  // NH4HS Stoichiometry
  const h2sMoles = data.h2s > 0 ? data.h2s / 34.08 : 0;
  const nh3Moles = data.nh3 > 0 ? data.nh3 / 17.03 : 0;
  const limitingMoles = (h2sMoles > 0 && nh3Moles > 0) ? Math.min(h2sMoles, nh3Moles) : 0;
  const nh4hsKgHr = limitingMoles * 51.11;
  const nh4hsWt = (data.h2o > 0 && nh4hsKgHr > 0) ? (nh4hsKgHr / (data.h2o + nh4hsKgHr)) * 100 : 0;

  let nh4hsTemperatureStatus = "";
  if (data.temp >= 50 && data.temp <= 65) {
    nh4hsTemperatureStatus = "Within the critical 50–65°C precipitation/deposition focus range.";
  } else if (data.temp > 65) {
    nh4hsTemperatureStatus = "Above 65°C; salts remain in solution, deposition risk shifts to downstream air coolers/cooling trains.";
  } else {
    nh4hsTemperatureStatus = "Below 50°C; check for deposition that may have occurred during upstream cooling.";
  }

  // Velocity calculation
  const velocityResult = calculateVelocity({
    flowKgHr: data.velocityFlow,
    densityKgM3: data.velocityDensity,
    pipeDiameterMm: data.pipeDiameter,
    manualVelocityMS: data.manualVelocity
  });
  const velocityMS = velocityResult.velocityMS;
  const velocityFPS = velocityResult.velocityFPS;

  // HTHA Thermodynamic Parameters (API RP 941)
  const pAbsKgCm2 = Number(data.pressure || 0) + 1.0332;
  let h2MolFrac = Number(data.h2MolFrac || 0);
  if (h2MolFrac <= 0 && data.h2 > 0) {
    const totalFlow = Number(data.velocityFlow || 0);
    const h2Flow = Number(data.h2 || 0);
    const nH2 = h2Flow / 2.016;
    const nH2S = Number(data.h2s || 0) / 34.08;
    const nNH3 = Number(data.nh3 || 0) / 17.031;
    const nH2O = Number(data.h2o || 0) / 18.015;
    const nCO2 = Number(data.co2 || 0) / 44.01;
    const knownOtherFlow = Number(data.h2s || 0) + Number(data.nh3 || 0) + Number(data.h2o || 0) + Number(data.co2 || 0);
    const knownOtherMoles = nH2S + nNH3 + nH2O + nCO2;

    if (totalFlow > 0 && totalFlow > h2Flow) {
      const remFlow = Math.max(0, totalFlow - h2Flow - knownOtherFlow);
      const otherMW = Number(data.otherMW || data.streamMW || data.gasMW || 50.0);
      const nRem = otherMW > 0 ? (remFlow / otherMW) : 0;
      const totalMoles = nH2 + knownOtherMoles + nRem;
      h2MolFrac = totalMoles > 0 ? Math.min(100, (nH2 / totalMoles) * 100) : 100.0;
    } else if (knownOtherMoles > 0) {
      const totalMoles = nH2 + knownOtherMoles;
      h2MolFrac = Math.min(100, (nH2 / totalMoles) * 100);
    } else {
      h2MolFrac = 100.0;
    }
  }
  const ppH2KgCm2a = pAbsKgCm2 * (h2MolFrac / 100.0);
  const ppH2Psia = ppH2KgCm2a * 14.2233;
  const tempF = (Number(data.temp || 0) * 1.8) + 32;

  let hthaTLimitF = null;
  let hthaMarginF = null;

  // CUI Range Check
  let cuiLower = -12;
  if (data.cuiMaterial === "300SS") cuiLower = 60;
  else if (data.cuiMaterial === "DUPLEX") cuiLower = 140;
  const cuiUpper = 175;
  const cuiTempWithinRange = data.temp >= cuiLower && data.temp <= cuiUpper;

  const results = [];
  function addResult(mechanism, applicable, status, basis, justification, inspection = "", category = "General", corrosionTabKey = null, severity = "HIGH") {
    results.push({
      mechanism,
      applicable: Boolean(applicable),
      status,
      basis,
      justification,
      inspection,
      category,
      corrosionTabKey,
      severity
    });
  }

  // 1. SULFIDATION — API 571 §3.61
  const sulfidation = data.h2 <= 0 && data.temp > 230 && data.h2s > 0;
  let sulfidationBasis = "";
  if (data.h2 > 0) sulfidationBasis = "H₂ present — evaluate high-temp H₂/H₂S (§3.35) separately.";
  else if (data.temp <= 230) sulfidationBasis = "Temperature is at or below the 230°C (450°F) onset threshold.";
  else if (data.h2s <= 0) sulfidationBasis = "No H₂S or reactive sulfur species entered.";
  else sulfidationBasis = "H₂-free sulfur-bearing hydrocarbon service above 230°C.";

  addResult(
    "Sulfidation (3.61)",
    sulfidation,
    sulfidation ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    sulfidationBasis,
    `Temperature = ${data.temp}°C; H₂ = ${data.h2} kg/h; H₂S = ${data.h2s} kg/h. ` +
    (sulfidation ? `H₂-free sulfidic environment verified (§3.61.1) exceeding 230°C onset. ${crClassification(data.cr, false)}` : "High-temperature sulfur conditions not satisfied."),
    sulfidation ? "UT Thickness / Profile RT; Internal VT; High-temperature smart pigging; Low-Si CS thickness survey & API 578 PMI." : "",
    "High Temperature Degradation",
    "sulfidation",
    "HIGH"
  );

  // 2. H2/H2S CORROSION — API 571 §3.35
  const h2h2s = data.h2 > 0 && data.h2s > 0 && data.temp > 230;
  let h2h2sBasis = "";
  if (data.h2 <= 0) h2h2sBasis = "No H₂ present — evaluate 3.61 Sulfidation instead.";
  else if (data.h2s <= 0) h2h2sBasis = "No H₂S present.";
  else if (data.temp <= 230) h2h2sBasis = "Temperature is at or below the 230°C (450°F) Couper-Gorman onset.";
  else h2h2sBasis = "Simultaneous H₂ + H₂S present in hot process stream exceeding 230°C.";

  addResult(
    "H₂/H₂S Corrosion (3.35)",
    h2h2s,
    h2h2s ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    h2h2sBasis,
    `Temperature = ${data.temp}°C; H₂ = ${data.h2} kg/h; H₂S = ${data.h2s} kg/h. ` +
    (h2h2s ? `Couper-Gorman curves applicable. ${crClassification(data.cr, true)}` : "Operating conditions below onset envelope."),
    h2h2s ? "Automated UT Scanning / Profile RT; Internal VT; Tube-Skin Thermocouples / IR thermography." : "",
    "High Temperature Degradation",
    null,
    "HIGH"
  );

  // 3. HTHA — API 571 §3.36 / API RP 941 Nelson Curves
  const hasH2 = (data.h2MolFrac > 0 || data.h2 > 0);
  const hthaActiveEnvelope = hasH2 && ppH2Psia >= 50 && data.temp >= 204 && data.nelsonMaterial !== "AUSTENITIC_SS";

  let hthaApplicable = false;
  let hthaSeverity = "LOW";
  let hthaStatus = "NOT APPLICABLE";
  let hthaBasis = "Operating envelope is safely below HTHA thresholds (ppH2 < 50 psia, Temp < 204°C, or immune metallurgy).";

  if (hthaActiveEnvelope) {
    const tLimitF = getNelsonCurveLimitTempF(data.nelsonMaterial, ppH2Psia);
    const marginF = tLimitF - tempF;
    hthaTLimitF = Number(tLimitF.toFixed(1));
    hthaMarginF = Number(marginF.toFixed(1));

    if (tempF >= tLimitF) {
      hthaApplicable = true;
      hthaSeverity = "CRITICAL";
      hthaStatus = "APPLICABLE - ACTIVE THREAT";
      hthaBasis = `Operating temperature (${data.temp}°C / ${tempF.toFixed(1)}°F) and ppH2 (${ppH2Psia.toFixed(1)} psia) EXCEED the API RP 941 limit (${tLimitF.toFixed(1)}°F) for ${data.nelsonMaterial}.`;
    } else if (tempF >= (tLimitF - 50)) {
      hthaApplicable = true;
      hthaSeverity = "MEDIUM";
      hthaStatus = "CONDITIONAL - 50°F SAFETY BUFFER ALERT";
      hthaBasis = `Operating within 50°F (28°C) buffer zone below the Nelson curve. Historical temperature excursions can cause incubation damage.`;
    } else {
      hthaApplicable = false;
      hthaSeverity = "LOW";
      hthaStatus = "NOT APPLICABLE (SAFE OPERATING REGIME)";
      hthaBasis = `Operating safely below API RP 941 curve limit by ${marginF.toFixed(1)}°F.`;
    }
  }

  addResult(
    "High-Temperature Hydrogen Attack - HTHA (3.36)",
    hthaApplicable,
    hthaStatus,
    hthaBasis,
    "Evaluated against exact API RP 941 8th/9th edition Nelson Curve limit equations.",
    hthaApplicable ? "Advanced Ultrasonic Backscatter Technique (AUBT); TOFD; Phased Array UT (PAUT); In-situ Field Metallographic Replication (FMR)." : "",
    "High Temperature Degradation",
    null,
    hthaSeverity
  );

  // 4. High-Temperature Oxidation (§3.48)
  {
    const tempC = Number(data.temp || 0);
    const tempF = (tempC * 1.8) + 32;
    const oxygenPresent = (data.oxygen === "Y" || data.phase === "VAPOR");
    const hasWaterVapor = (Number(data.h2o || 0) > 0 && (data.phase === "VAPOR" || data.phase === "MIXED"));
    const cr = Number(data.crContent ?? data.cr ?? 0);

    // Metallurgy Classification
    const mat = data.eroMaterial || "";
    const isStainless = (mat === "316 SS" || data.cuiMaterial === "300SS" || (data.carbonSteel === "N" && cr >= 16));
    const isNickelAlloy = (mat === "Alloy C-276" || mat === "Alloy 400");
    const isCarbonSteel = (data.carbonSteel === "Y" && cr < 1.0);

    // Temperature Thresholds for Oxidation Scaling per API 571 Table 3-48-1a/b
    let tThresholdC = 538; // Default CS: 1000°F (538°C)
    let alloyLabel = "Carbon Steel";

    if (isStainless || isNickelAlloy) {
      tThresholdC = 815; // 300 SS: 1500°F (815°C)
      alloyLabel = isStainless ? "Austenitic Stainless Steel (300 SS)" : "Nickel-based Alloy";
    } else if (cr >= 9.0) {
      tThresholdC = 650; // 9Cr-1Mo: ~1200°F (650°C)
      alloyLabel = "9Cr-1Mo Steel";
    } else if (cr >= 5.0) {
      tThresholdC = 620; // 5Cr-0.5Mo: ~1150°F (620°C)
      alloyLabel = "5Cr-0.5Mo Steel";
    } else if (cr >= 2.0) {
      tThresholdC = 590; // 2.25Cr-1Mo: ~1100°F (590°C)
      alloyLabel = "2.25Cr-1Mo Steel";
    } else if (cr >= 1.0) {
      tThresholdC = 565; // 1.25Cr-0.5Mo: ~1050°F (565°C)
      alloyLabel = "1.25Cr-0.5Mo Steel";
    }

    let oxApplicable = false;
    let oxStatus = "NOT APPLICABLE";
    let oxSeverity = "LOW";
    let oxBasis = `Operating temperature (${tempC}°C) is below scaling threshold (${tThresholdC}°C) for ${alloyLabel}.`;
    let oxInspection = "";

    if (oxygenPresent && tempC >= tThresholdC) {
      oxApplicable = true;
      const overtemp = tempC - tThresholdC;
      oxSeverity = (overtemp >= 50) ? "CRITICAL" : "HIGH";
      oxStatus = "APPLICABLE - ACTIVE THREAT";
      
      let moistureAlert = hasWaterVapor ? " Presence of water vapor significantly accelerates scaling and metal loss rates (§3.48.3d)." : "";
      oxBasis = `Operating temperature (${tempC}°C / ${tempF.toFixed(0)}°F) exceeds scaling temperature threshold (${tThresholdC}°C) for ${alloyLabel} in oxygen-containing vapor.${moistureAlert}`;
      oxInspection = "Visual Inspection (VT) for external scaling/blistering, Profile Radiography (PRT), High-temperature Ultrasonic Thickness (UT) gauging on heater/boiler tubes, Laser profilometry for tube bulging/sagging.";
    } else if (oxygenPresent && tempC >= (tThresholdC - 30)) {
      oxApplicable = true;
      oxStatus = "CONDITIONAL - NEAR SCALING THRESHOLD";
      oxSeverity = "MEDIUM";
      oxBasis = `Operating within 30°C of the oxidation scaling limit (${tThresholdC}°C) for ${alloyLabel}. Temperature excursions or localized hot spots can trigger rapid scale formation.`;
      oxInspection = "Infrared (IR) Thermography tube skin temperature scanning to detect burner impingement/hot spots.";
    }

    addResult(
      "High-Temperature Oxidation (3.48)",
      oxApplicable,
      oxStatus,
      oxBasis,
      "Evaluated per API 571 Section 3.48 (Cr content protective scaling boundaries, metal skin temperature, and water vapor acceleration).",
      oxInspection,
      "High Temperature Degradation",
      null,
      oxSeverity
    );
  }

  // 5. SOUR WATER CORROSION — ACIDIC — API 571 §3.58
  const sourWaterPhaseGate = liquidWater;
  const sourWaterH2SGate = data.h2s > 0;
  const sourWaterMaterialGate = data.carbonSteel === "Y";
  const significantNH3 = data.nh3Significant === "Y";
  const significantOtherContam = data.otherContamSignificant === "Y";
  const sourWaterOutOfScope = significantNH3 || significantOtherContam;
  const sourWater = sourWaterPhaseGate && sourWaterH2SGate && sourWaterMaterialGate && !sourWaterOutOfScope;
  let sourWaterBasis = "";
  if (!sourWaterPhaseGate) sourWaterBasis = "No liquid water phase confirmed. Check downstream condensation.";
  else if (!sourWaterH2SGate) sourWaterBasis = "No H₂S present.";
  else if (!sourWaterMaterialGate) sourWaterBasis = "Carbon-steel construction gate not met.";
  else if (significantNH3) sourWaterBasis = "Significant NH₃ present (§3.58.1b scope exclusion); evaluate §3.5 NH4HS instead.";
  else if (significantOtherContam) sourWaterBasis = "Significant chlorides/cyanides present (§3.58.1b exclusion); evaluate HCl / cyanide mechanisms.";
  else sourWaterBasis = `Acidic sour water environment on carbon steel (pH ${data.ph > 0 ? data.ph : "unbuffered"}).`;

  addResult(
    "Sour Water Corrosion — Acidic (3.58)",
    sourWater,
    sourWater ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    sourWaterBasis,
    `Phase = ${data.phase}; H₂S = ${data.h2s} kg/h; NH₃ = ${data.nh3} kg/h; pH = ${data.ph || "unmeasured"}. ` +
    (sourWater ? "Forms thin semi-protective FeS scale; breakdown leads to uniform and localized attack." : "Acidic sour water criteria not satisfied."),
    sourWater ? "UT Thickness Grids / Profile RT; Permanently mounted ultrasonic sensors; Corrosion coupons / ER probes." : "",
    "Aqueous & Acid Thinning",
    "Acid Sour Water Corrosion",
    "HIGH"
  );

  // 6. NH4HS CORROSION — API 571 §3.5
  const nh4hsFormation = data.h2s > 0 && data.nh3 > 0;
  const nh4hs = nh4hsFormation && data.h2o > 0;
  let nh4hsBasis = "";
  if (!nh4hsFormation) nh4hsBasis = "Requires both H₂S and NH₃ to synthesize NH4HS salts.";
  else if (data.h2o <= 0) nh4hsBasis = "Dry salts are non-corrosive (§3.5.3d); enter water to evaluate hydrated corrosion.";
  else nh4hsBasis = `Hydrated NH4HS solution confirmed (${nh4hsWt.toFixed(2)} wt%). ${nh4hsTemperatureStatus}`;

  addResult(
    "NH4HS Alkaline Sour Water Corrosion (3.5)",
    nh4hs,
    nh4hs ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    nh4hsBasis,
    buildNH4HSJustification(data, nh4hsKgHr, nh4hsWt, velocityMS, velocityFPS),
    nh4hs ? "UT Scanning & Profile RT at high-shear points, downstream elbows, wash water tees; GWT screening; IRIS tube inspection." : "",
    "Aqueous & Acid Thinning",
    "Alkaline Sour Water Corrosion",
    nh4hsWt > 2 || velocityMS > 6 ? "CRITICAL" : "MODERATE"
  );

  // 7. NH4Cl CORROSION — API 571 §3.4
  const nh4cl = data.nh3 > 0 && (data.otherContamSignificant === "Y" || (data.temp >= 110 && data.temp <= 185));
  addResult(
    "Ammonium Chloride (NH4Cl) Salt Corrosion (3.4)",
    nh4cl,
    nh4cl ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    nh4cl ? "NH₃ and chloride species present within 110–185°C salt sublimation window." : "Conditions outside NH4Cl deposition band.",
    nh4cl ? `Temperature = ${data.temp}°C; NH₃ = ${data.nh3} kg/h. Hygroscopic NH4Cl salts deposit directly from vapor phase, absorbing trace water to create highly corrosive acidic salt cakes.` : "Salt sublimation conditions not met.",
    nh4cl ? "Profile RT to identify salt cake deposition in dead-legs & exchanger inlets; High-resolution UT under deposits." : "",
    "Aqueous & Acid Thinning",
    null,
    "HIGH"
  );

  // 8. Hydrochloric Acid (HCl) Corrosion (§3.37)
  {
    const liquidWater = (data.phase === "LIQUID" || data.phase === "MIXED" || Number(data.h2o || 0) > 0);
    const dewPointRegime = (Number(data.temp || 0) <= 135 && liquidWater); // Overhead condensation envelope
    const chloridesPresent = (data.otherContamSignificant === "Y");
    const measuredPh = Number(data.ph || 0);
    const isAcidic = (measuredPh > 0 && measuredPh < 4.5);
    const unmeasuredAcidRisk = (measuredPh === 0 && (chloridesPresent || data.nh3 > 0)); // salt hydrolysis risk

    // Metallurgy classification based on existing selections
    const mat = data.eroMaterial || "";
    const isTitanium = (mat === "Titanium");
    const isAlloy400 = (mat === "Alloy 400");
    const isStainless = (mat === "316 SS" || data.cuiMaterial === "300SS" || (data.carbonSteel === "N" && !isTitanium && !isAlloy400));
    const isCarbonSteel = (data.carbonSteel === "Y");

    let hclApplicable = false;
    let hclStatus = "NOT APPLICABLE";
    let hclSeverity = "LOW";
    let hclBasis = "Chlorides absent or operating above aqueous condensation regime.";
    let hclInspection = "";

    if (chloridesPresent && (liquidWater || dewPointRegime || (isTitanium && data.phase === "VAPOR"))) {
      if (isCarbonSteel) {
        if (isAcidic || dewPointRegime) {
          hclApplicable = true;
          hclSeverity = isAcidic ? "CRITICAL" : "HIGH";
          hclStatus = "APPLICABLE - ACTIVE THREAT";
          hclBasis = `Carbon steel exposed to condensing aqueous HCl (pH: ${measuredPh > 0 ? measuredPh : 'Unbuffered / Low'}, Temp: ${data.temp}°C). Rapid general and localized pitting attack.`;
          hclInspection = "Profile Radiography (PRT), Ultrasonic Thickness Scanning (AUT/UT grid) at water wash injection points, overhead piping elbows, and accumulator boots.";
        }
      } else if (isStainless) {
        // 300/400 SS are NOT usefully resistant to HCl at any concentration/temp (§3.37.3e)
        hclApplicable = true;
        hclSeverity = "CRITICAL";
        hclStatus = "APPLICABLE - HIGH ALLOY VULNERABILITY";
        hclBasis = "Stainless steel is NOT resistant to aqueous HCl at any concentration/temperature; susceptible to rapid pitting and Cl-SCC.";
        hclInspection = "Eddy Current Testing (ECT), Internal Borescope, Dye Penetrant (PT), High-frequency UT.";
      } else if (isAlloy400) {
        // Resistant to dilute HCl, but sensitive to oxidizing species (§3.37.3g)
        if (data.oxygen === "Y") {
          hclApplicable = true;
          hclSeverity = "HIGH";
          hclStatus = "CONDITIONAL - OXIDIZING SPECIES ALERT";
          hclBasis = "Alloy 400 is resistant to dilute HCl, but corrosion rates accelerate drastically in the presence of oxygen/oxidizing agents (§3.37.3g).";
          hclInspection = "UT thickness gauging, corrosion probes, monitoring of dissolved O2 ingress.";
        } else {
          hclApplicable = false;
          hclStatus = "NOT APPLICABLE (ALLOY 400 RESISTANT)";
          hclSeverity = "LOW";
          hclBasis = "Alloy 400 provides excellent resistance to non-oxidizing dilute hydrochloric acid.";
        }
      } else if (isTitanium) {
        // Titanium excels in aqueous/oxidizing HCl but fails if dry (§3.37.3g)
        if (!liquidWater && data.phase === "VAPOR") {
          hclApplicable = true;
          hclSeverity = "CRITICAL";
          hclStatus = "APPLICABLE - DRY HCL IGNITION/ATTACK";
          hclBasis = "Titanium fails rapidly and can ignite/corrode catastrophically in dry HCl vapor service without sufficient moisture (§3.37.3g).";
          hclInspection = "Moisture analyzers, internal VT, specialized acoustic emission.";
        } else {
          hclApplicable = false;
          hclStatus = "NOT APPLICABLE (TITANIUM RESISTANT)";
          hclSeverity = "LOW";
          hclBasis = "Titanium possesses superior passivity in wet/condensing aqueous hydrochloric acid.";
        }
      }
    }

    addResult(
      "Hydrochloric Acid (HCl) Corrosion (3.37)",
      hclApplicable,
      hclStatus,
      hclBasis,
      "Evaluated per API 571 Section 3.37 (Dew point condensation, pH < 4.5 threshold, and alloy-specific resistance boundaries).",
      hclInspection,
      "Aqueous & Acid Thinning",
      null,
      hclSeverity
    );
  }

  // 9. CO2 CORROSION — API 571 §3.18
  const co2Corrosion = data.co2 > 0 && liquidWater && data.carbonSteel === "Y";
  addResult(
    "Carbon Dioxide (CO₂) Sweet Corrosion (3.18)",
    co2Corrosion,
    co2Corrosion ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    co2Corrosion ? "Dissolved CO₂ in aqueous condensate forming carbonic acid (H₂CO₃) on carbon steel." : "No CO₂ / liquid water contact on carbon steel.",
    co2Corrosion ? `CO₂ = ${data.co2} kg/h. Carbonic acid promotes mesa-type localized pitting and uniform thinning.` : "Sweet corrosion criteria not satisfied.",
    co2Corrosion ? "Automated UT grid scans; High-resolution profile radiography; Flush-mounted ER probes." : "",
    "Aqueous & Acid Thinning",
    "co2",
    "MODERATE"
  );

  // 10. WET H2S — BLISTERING & HIC — API 571 §3.67
  const wetH2SGate = data.carbonSteel === "Y" && liquidWater && data.h2s > 0 && h2sPPMW >= 1;
  addResult(
    "Wet H₂S — Hydrogen Blistering & HIC (3.67)",
    wetH2SGate,
    wetH2SGate ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    wetH2SGate ? "Aqueous H₂S ≥ 1 ppmw on carbon steel creates atomic hydrogen charging." : "Hydrogen charging threshold (≥1 ppmw H₂S in water) not satisfied.",
    `H₂S in water ≈ ${h2sPPMW.toFixed(1)} ppmw; Phase = ${data.phase}. ` + (wetH2SGate ? "Atomic hydrogen diffuses to internal inclusions, recombining into molecular H₂ gas causing lamina blistering/HIC (does not require tensile stress)." : "Wet H₂S criteria not met."),
    wetH2SGate ? "Internal VT for blistering; WFMT / ECT / ACFM (PT unreliable); Angle-beam UT (SWUT / PAUT) for planar sizing." : "",
    "Environmental Cracking",
    null,
    "HIGH"
  );

  // 11. WET H2S — SOHIC — API 571 §3.67
  const sohic = wetH2SGate && data.stress === "Y" && data.hardness !== "Y";
  addResult(
    "Wet H₂S — SOHIC (3.67)",
    sohic,
    sohic ? "APPLICABLE - ACTIVE THREAT" : (wetH2SGate ? "SCREEN FURTHER - VERIFY STRESS" : "Not applicable"),
    sohic ? "Wet H₂S charging + residual/applied tensile stress on normal hardness steel." : "Requires wet H₂S conditions and un-relieved tensile stresses.",
    `Wet H₂S gate = ${wetH2SGate ? "MET" : "NOT MET"}; Residual/Tensile Stress = ${data.stress}. ` + (sohic ? "Hydrogen cracks stack in through-thickness orientation perpendicular to tensile stress field." : "SOHIC criteria not complete."),
    sohic ? "WFMT / ACFM at weld seams & nozzle knuckles; Angle-beam PAUT for through-thickness crack sizing." : "",
    "Environmental Cracking",
    null,
    "HIGH"
  );

  // 12. WET H2S — SSC — API 571 §3.67
  const ssc = wetH2SGate && data.stress === "Y" && data.hardness === "Y";
  addResult(
    "Wet H₂S — Sulfide Stress Cracking - SSC (3.67)",
    ssc,
    ssc ? "APPLICABLE - CRITICAL RISK" : (wetH2SGate ? "SCREEN FURTHER - VERIFY HARDNESS" : "Not applicable"),
    ssc ? "Wet H₂S + tensile stress + high weld/base metal hardness (>237 HB / NACE MR0175)." : "SSC requires high hardness (>237 HB) and tensile stress in sour water.",
    `Hardness > 237 HB = ${data.hardness}; Stress = ${data.stress}; Temp = ${data.temp}°C. ` + (ssc ? "Brittle catastrophic cracking can propagate within hours/days of sour water contact." : "Hardness criteria not confirmed."),
    ssc ? "Wet Fluorescent MT (WFMT) on ID surfaces; Field Hardness Testing (HT); Angle-Beam PAUT." : "",
    "Environmental Cracking",
    null,
    "CRITICAL"
  );

  // 13. AMINE CORROSION — API 571 §3.2
  const aminePresent = data.amineFlow > 0;
  const amineCorrosion = aminePresent && data.carbonSteel === "Y";
  addResult(
    "Amine Corrosion (3.2)",
    amineCorrosion,
    amineCorrosion ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    amineCorrosion ? `Carbon steel in ${data.amineType || "amine"} ${data.amineService ? data.amineService.toLowerCase() : ""} service.` : "No amine service indicated on carbon steel.",
    `Amine Flow = ${data.amineFlow} kg/h; Service = ${data.amineService}; HSAS = ${data.hsas}%. ` + (amineCorrosion ? "Corrosion arises from dissolved acid gases (CO₂/H₂S), HSAS (>2%), and degradation products." : "Amine conditions not met."),
    amineCorrosion ? "Visual Inspection with Pit Gauge; Automated UT scanning at impingement zones; Rich-amine flow velocity surveys." : "",
    "Aqueous & Acid Thinning",
    null,
    "MODERATE"
  );

  // 14. AMINE SCC — API 571 §3.3
  const amineSCC = aminePresent && data.carbonSteel === "Y" && data.stress === "Y";
  addResult(
    "Amine Stress Corrosion Cracking (3.3)",
    amineSCC,
    amineSCC ? "APPLICABLE - ACTIVE THREAT" : "Not applicable",
    amineSCC ? `Alkanolamine solution on non-PWHT carbon steel with residual tensile stress (§3.3.1).` : "Requires amine, carbon steel, and residual tensile stresses.",
    `Amine Service = ${data.amineService}; Amine Type = ${data.amineType || "DEA/MDEA"}; Stress = ${data.stress}. ` + (amineSCC ? "Lean amine systems lack protective sulfide scale and are most prone to cracking even at ambient temperature." : "Amine SCC criteria not complete."),
    amineSCC ? "WFMT / ACFM on un-PWHT weld seams, heat-affected zones, and cold-worked elbows; PAUT." : "",
    "Environmental Cracking",
    null,
    "HIGH"
  );

  // 15. CUI — API 571 §3.22
  const cui = data.insulated === "Y" && cuiTempWithinRange;
  addResult(
    "Corrosion Under Insulation - CUI (3.22)",
    cui,
    cui ? "APPLICABLE - ACTIVE THREAT" : (data.insulated === "Y" ? "LOW PRIORITY - OUTSIDE PEAK BAND" : "Not applicable"),
    cui ? `Insulated equipment operating within ${cuiLower}–${cuiUpper}°C moisture retention window (§3.22.3a).` : (data.insulated === "Y" ? `Insulated, but operating temperature (${data.temp}°C) is outside peak CUI range.` : "Equipment is un-insulated."),
    `Insulated = ${data.insulated}; Temp = ${data.temp}°C; Material = ${data.cuiMaterial}. ` + (cui ? "Water ingress into lagging creates prolonged surface wetting and rapid external thinning / pitting." : "CUI criteria not active."),
    cui ? "External Visual Inspection (VT) of weatherproofing; Insulation stripping + UT/Pit gauge; Pulsed Eddy Current (PEC) & Profile RT." : "",
    "External & CUI",
    "cui",
    "HIGH"
  );

  // 16. EROSION / EROSION-CORROSION — API 571 §3.27
  const erosion = data.turbulence === "Y" || data.solids === "Y" || velocityMS > 5.0;
  let eroRateText = "";
  const eroRow = API571_TABLE_3_27_1[data.eroMaterial];
  if (eroRow) {
    const bucket = velocityFPS <= 2.5 ? "fps1" : (velocityFPS <= 15 ? "fps4" : "fps27");
    const rate = eroRow[bucket];
    if (rate !== null && rate !== undefined) {
      eroRateText = ` Table 3-27-1 benchmark rate for ${data.eroMaterial} = ${rate} mpy.`;
    }
  }

  addResult(
    "Erosion / Erosion-Corrosion (3.27)",
    erosion,
    erosion ? "APPLICABLE - SCREEN FURTHER" : "Low priority",
    erosion ? "High velocity, flow turbulence, or entrained particulates/catalyst fines flagged." : "No severe velocity or particulate turbulence entered.",
    `Calculated Velocity = ${velocityMS.toFixed(2)} m/s (${velocityFPS.toFixed(1)} fps); Turbulence = ${data.turbulence}; Solids = ${data.solids}.${eroRateText}`,
    erosion ? "High-density UT grids and profile radiography at elbows, reducers, tees, and control valve discharge nozzles; GWT screening." : "",
    "Flow, Velocity & Erosion",
    null,
    "HIGH"
  );

  // 17. Thermal Fatigue (§3.64)
  const deltaT = Number(data.deltaT || 0);
  const serviceType = data.thermalLocation || "MIX_POINT";
  const isTurbulent = data.turbulence === "Y";

  let tfApplicable = false;
  let tfStatus = "NOT APPLICABLE";
  let tfSeverity = "LOW";
  let tfBasis = "Thermal cycling magnitude |ΔT| is below initiation threshold.";
  let tfInspection = "";

  if (serviceType === "MIX_POINT") {
    if (deltaT >= 110) {
      tfApplicable = true;
      tfStatus = "APPLICABLE - ACTIVE THREAT";
      tfSeverity = "CRITICAL";
      tfBasis = `Severe mix point temperature difference (|ΔT| = ${deltaT}°C ≥ 110°C / 200°F). High risk of rapid thermal fatigue cracking.`;
      tfInspection = "Angle-beam UT (shear wave), Phased Array UT (PAUT), PT on ID surface, profile RT for internal thermal sleeve integrity.";
    } else if (deltaT >= 28 || (deltaT > 15 && isTurbulent)) {
      tfApplicable = true;
      tfStatus = "CONDITIONAL - THERMAL STRIPING ALERT";
      tfSeverity = "MEDIUM";
      tfBasis = `Mixing point |ΔT| = ${deltaT}°C exceeds 28°C (50°F) threshold. Susceptible to turbulent thermal striping at mixing zone.`;
      tfInspection = "Surface PT/MT at weld toes, external shear wave UT screening downstream of mixing tee (up to 5-10D).";
    }
  } else if (serviceType === "COKE_DRUM") {
    if (deltaT >= 110) {
      tfApplicable = true;
      tfStatus = "APPLICABLE - ACTIVE THREAT";
      tfSeverity = "CRITICAL";
      tfBasis = `Coke drum quenching cycle (|ΔT| = ${deltaT}°C ≥ 110°C). Severe cyclic stresses at skirt-to-shell attachment weld and shell bulging zones.`;
      tfInspection = "Angle-beam UT, TOFD, Wet Fluorescent MT (WFMT) on skirt attachment weld, laser profilometry for bulging.";
    }
  } else {
    // TUBE_ATTACHMENT / GENERAL_CYCLIC
    if (deltaT >= 110) {
      tfApplicable = true;
      tfStatus = "APPLICABLE - ACTIVE THREAT";
      tfSeverity = "HIGH";
      tfBasis = `Thermal swing |ΔT| = ${deltaT}°C exceeds rule-of-thumb limit (110°C to 165°C / 200°F to 300°F) with constrained expansion.`;
      tfInspection = "Visual inspection for weld toe cracking, PT/WFMT, High-temperature thickness & strain monitoring.";
    }
  }

  addResult(
    "Thermal Fatigue (3.64)",
    tfApplicable,
    tfStatus,
    tfBasis,
    "Evaluated per API 571 Section 3.64 (Magnitude of temperature swing, mixing geometry, and cyclic differential expansion constraints).",
    tfInspection,
    "High Temperature Degradation / Cracking",
    null,
    tfSeverity
  );

  // Summary Metrics
  const applicableList = results.filter(r => r.applicable);
  const applicableCount = applicableList.length;
  const conditionalCount = results.filter(r => !r.applicable && r.status.includes("SCREEN FURTHER")).length;
  const notApplicableCount = results.length - applicableCount - conditionalCount;
  let dominantThreat = "None Flagged";
  if (applicableList.length > 0) {
    dominantThreat = applicableList.find(r => r.severity === "CRITICAL")?.mechanism || applicableList[0].mechanism;
  }

  return {
    success: true,
    stream: data.stream,
    input: data,
    calculatedParameters: {
      h2sPPMW,
      nh4hsKgHr,
      nh4hsWt,
      velocityMS,
      velocityFPS,
      velocitySource: velocityResult.source,
      velocityFlow: data.velocityFlow,
      velocityDensity: data.velocityDensity,
      pipeDiameter: data.pipeDiameter,
      cuiLower,
      cuiUpper,
      nh4hsTemperatureStatus,
      nh3: data.nh3,
      nh3Significant: data.nh3Significant,
      otherContamSignificant: data.otherContamSignificant,
      ph: data.ph,
      pressure: data.pressure,
      deltaT: data.deltaT,
      co2: data.co2,
      ppH2Psia: Number(ppH2Psia.toFixed(2)),
      ppH2KgCm2a: Number(ppH2KgCm2a.toFixed(2)),
      tempF: Number(tempF.toFixed(1)),
      hthaTLimitF,
      hthaMarginF,
      nelsonMaterial: data.nelsonMaterial,
      h2MolFrac: Number(h2MolFrac.toFixed(2))
    },
    kpis: {
      total: results.length,
      applicable: applicableCount,
      conditional: conditionalCount,
      notApplicable: notApplicableCount,
      dominantThreat
    },
    results
  };
}

// Helper to parse Firestore cloud datasets into normalized Unit & Stream records
function parseCloudDataset(docData, docId) {
  const title = (docData.title || "").trim();
  const rawUnit = (docData.unit && docData.unit !== "kg/hr" ? String(docData.unit).trim() : "").trim();

  let unitId = rawUnit;
  if (!unitId) {
    const clean = title.replace(/[-_]/g, " ").trim();
    const firstWord = clean.split(/\s+/)[0] || "";
    unitId = firstWord ? firstWord.toUpperCase() : String(docId || "");
  }
  if (!unitId) {
    unitId = String(docId || "");
  }

  const unitName = docData.title || unitId;
  const streams = Array.isArray(docData.streams) ? docData.streams : [];

  return {
    docId,
    unitId,
    unitName,
    title: title || unitName,
    streamCount: streams.length,
    streams,
    source: "firestore"
  };
}

// Convert a single raw stream from Firestore dataset to a clean format
function normalizeStreamRecord(st, index) {
  const p = st.properties || {};
  const c = st.components || {};

  const streamNo = String(st.streamNo || st.id || index + 1).trim();
  const content = String(st.content || st.streamName || "").trim();
  const name = content ? `Stream ${streamNo} - ${content}` : `Stream ${streamNo}`;

  // Helper to extract numeric value from st, p, or c
  const getNumVal = (...keys) => {
    for (const k of keys) {
      if (st[k] !== undefined && st[k] !== null && st[k] !== "") {
        const v = parseFloat(st[k]);
        if (Number.isFinite(v)) return v;
      }
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
        const v = parseFloat(p[k]);
        if (Number.isFinite(v)) return v;
      }
      if (c[k] !== undefined && c[k] !== null && c[k] !== "") {
        const v = parseFloat(c[k]);
        if (Number.isFinite(v)) return v;
      }
    }
    return null;
  };

  // Helper to extract string/dropdown value from st, p, or c
  const getStrVal = (...keys) => {
    for (const k of keys) {
      if (st[k] !== undefined && st[k] !== null && st[k] !== "") {
        if (typeof st[k] === "boolean") return st[k] ? "Y" : "N";
        return String(st[k]).trim();
      }
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
        if (typeof p[k] === "boolean") return p[k] ? "Y" : "N";
        return String(p[k]).trim();
      }
      if (c[k] !== undefined && c[k] !== null && c[k] !== "") {
        if (typeof c[k] === "boolean") return c[k] ? "Y" : "N";
        return String(c[k]).trim();
      }
    }
    return "";
  };

  const temp = getNumVal("tempC", "Temperature (°C)", "Temperature", "temp");
  const pressure = getNumVal("pressKgCm2", "Pressure (kg/cm²g)", "Pressure (kg/cm2 (g))", "Pressure (barg)", "Pressure", "pressure");
  const massFlow = getNumVal("massFlow", "Flow Mass (kg/hr)", "Mass Flow (kg/hr)", "Mass Flow", "Flow Mass");
  const density = getNumVal("liquidDensity", "vaporDensity", "density", "Liquid Density (kg/m3)", "Vapor Density (kg/m3)", "Density (kg/m3)", "Density");
  const pipeDiameter = getNumVal("pipeDiameter", "Pipe Diameter (mm)", "Pipe Diameter");

  const phase = getStrVal("phase", "Phase");

  // Helper to extract constituents from component/properties maps
  const getCompVal = (...names) => {
    for (const n of names) {
      if (st[n] !== undefined && st[n] !== null && st[n] !== "") {
        const v = parseFloat(st[n]);
        if (Number.isFinite(v)) return v;
      }
      if (c[n] !== undefined && c[n] !== null && c[n] !== "") {
        const v = parseFloat(c[n]);
        if (Number.isFinite(v)) return v;
      }
      if (p[n] !== undefined && p[n] !== null && p[n] !== "") {
        const v = parseFloat(p[n]);
        if (Number.isFinite(v)) return v;
      }
    }
    const cleanLower = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [k, v] of Object.entries(c)) {
      const ck = cleanLower(k);
      for (const n of names) {
        if (ck === cleanLower(n)) {
          const num = parseFloat(v);
          if (Number.isFinite(num)) return num;
        }
      }
    }
    for (const [k, v] of Object.entries(p)) {
      const pk = cleanLower(k);
      for (const n of names) {
        if (pk === cleanLower(n)) {
          const num = parseFloat(v);
          if (Number.isFinite(num)) return num;
        }
      }
    }
    return null;
  };

  // Extract component fractions (kg/hr or specified units)
  const h2 = getCompVal("H2", "Hydrogen");
  const h2s = getCompVal("H2S", "Hydrogen Sulfide", "HydrogenSulfide");
  const nh3 = getCompVal("NH3", "Ammonia");
  const h2o = getCompVal("H2O", "Water", "Steam");
  const co2 = getCompVal("CO2", "Carbon Dioxide", "CarbonDioxide");
  const chloride = getCompVal("Chloride", "Chlorides", "HCl", "hcl");
  const sulfur = getCompVal("Sulfur", "Total Sulfur", "TotalSulfur", "total_sulfur");
  const co = getCompVal("CO", "Carbon Monoxide", "CarbonMonoxide");
  const caustic = getCompVal("Caustic", "NaOH", "Sodium Hydroxide");
  const methane = getCompVal("Methane", "CH4", "ch4");
  const nitrogen = getCompVal("Nitrogen", "N2", "n2");
  const h2MolFrac = getCompVal("H2_MOL", "H2_VOL", "H2 (mol%)", "H2 (vol%)", "h2MolFrac", "h2_mol");
  const amine = getCompVal("MDEA", "DEA", "MEA", "Amine");

  const constituentsMap = {
    h2,
    h2s,
    nh3,
    h2o,
    co2,
    chloride,
    sulfur,
    co,
    caustic,
    methane,
    nitrogen,
    h2MolFrac,
    amine
  };

  const amineFlow = getNumVal("amineFlow", "Amine Flow") ?? amine;
  const amineType = getStrVal("amineType", "Amine Type");
  const amineService = getStrVal("amineService", "Amine Service");
  const carbonSteel = getStrVal("carbonSteel", "Carbon Steel");
  const crContent = getNumVal("crContent", "Cr Content (%)", "Cr Content", "Cr");
  const stress = getStrVal("stress", "Stress");
  const hardness = getStrVal("hardness", "Hardness");
  const oxygen = getStrVal("oxygen", "Oxygen");
  const hsas = getNumVal("hsas", "HSAS");
  const ph = getNumVal("ph", "pH", "PH");
  const turbulence = getStrVal("turbulence", "Turbulence");
  const solids = getStrVal("solids", "Solids");
  const insulated = getStrVal("insulated", "Insulated");
  const cuiMaterial = getStrVal("cuiMaterial", "CUI Material");
  const nh3Significant = getStrVal("nh3Significant", "NH3 Significant");
  const otherContamSignificant = getStrVal("otherContamSignificant", "Other Contaminants Significant");
  const deltaT = getNumVal("deltaT", "Delta T");
  const eroMaterial = getStrVal("eroMaterial", "Erosion Material");

  return {
    id: streamNo,
    streamNo,
    name,
    streamName: name,
    content,
    phase,
    temp,
    pressure,
    massFlow,
    density,
    pipeDiameter,
    h2,
    h2MolFrac,
    h2s,
    nh3,
    h2o,
    co2,
    chloride,
    sulfur,
    co,
    caustic,
    methane,
    nitrogen,
    amineFlow,
    amineType,
    amineService,
    carbonSteel,
    crContent,
    stress,
    hardness,
    oxygen,
    hsas,
    ph,
    turbulence,
    solids,
    insulated,
    cuiMaterial,
    nh3Significant,
    otherContamSignificant,
    deltaT,
    eroMaterial,
    description: content,
    components: { ...c, ...constituentsMap },
    constituents: constituentsMap,
    properties: p
  };
}

/**
 * Backend Route Handler for /api/damage-criteria
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const method = req.method;
  const action = req.query.action || req.body?.action || (method === "POST" ? "screen" : "catalog");

  const adminDb = getAdminFirestore();
  let clientDb = null;
  try {
    clientDb = typeof getFirestoreDb === "function" ? getFirestoreDb() : null;
  } catch (e) {
    // optional clientDb fallback
  }

  try {
    // -------------------------------------------------------------
    // ACTION: "units" - Retrieve live plant units from Cloud Firestore streamDatasets
    // -------------------------------------------------------------
    if (action === "units") {
      const unitsMap = new Map();

      if (adminDb) {
        try {
          const snap = await Promise.race([
            adminDb.collection("streamDatasets").get(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
          ]);
          snap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const docId = docSnap.id;
            const parsed = parseCloudDataset(data, docId);
            if (parsed.unitId || parsed.docId) {
              const uKey = parsed.docId || parsed.unitId;
              unitsMap.set(uKey, {
                id: parsed.docId,
                unitId: parsed.unitId,
                name: parsed.unitName,
                title: parsed.title,
                docId: parsed.docId,
                streamCount: parsed.streamCount,
                source: "firestore"
              });
            }
          });
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Firestore units query error:", dbErr.message);
        }
      }

      if (unitsMap.size === 0 && clientDb) {
        try {
          const snap = await getDocs(collection(clientDb, "streamDatasets"));
          snap.forEach((docSnap) => {
            const data = docSnap.data() || {};
            const docId = docSnap.id;
            const parsed = parseCloudDataset(data, docId);
            if (parsed.unitId || parsed.docId) {
              const uKey = parsed.docId || parsed.unitId;
              unitsMap.set(uKey, {
                id: parsed.docId,
                unitId: parsed.unitId,
                name: parsed.unitName,
                title: parsed.title,
                docId: parsed.docId,
                streamCount: parsed.streamCount,
                source: "firestore"
              });
            }
          });
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Client Firestore units query note:", dbErr.message);
        }
      }

      if (unitsMap.size === 0) {
        return res.status((!adminDb && !clientDb) ? 503 : 404).json({
          success: false,
          error: "Stream data not found in Firestore"
        });
      }

      const unitsList = Array.from(unitsMap.values());
      unitsList.sort((a, b) => (b.streamCount || 0) - (a.streamCount || 0));

      return res.status(200).json({
        success: true,
        source: "firestore",
        count: unitsList.length,
        units: unitsList
      });
    }

    // -------------------------------------------------------------
    // ACTION: "streams" - Retrieve live streams from Cloud Firestore for a selected Unit
    // -------------------------------------------------------------
    if (action === "streams") {
      const unitKey = String(req.query.unit || req.body?.unit || "").trim();
      if (!unitKey) {
        return res.status(400).json({
          success: false,
          error: "Missing required 'unit' parameter"
        });
      }

      let matchedStreams = [];
      let unitTitle = unitKey;

      if (adminDb) {
        try {
          // 1. Try direct doc lookup by docId first
          try {
            const singleDoc = await adminDb.collection("streamDatasets").doc(unitKey).get();
            if (singleDoc.exists) {
              const d = singleDoc.data() || {};
              const parsed = parseCloudDataset(d, singleDoc.id);
              if (parsed.streams && parsed.streams.length > 0) {
                matchedStreams = parsed.streams;
                unitTitle = parsed.title;
              }
            }
          } catch (e) {}

          // 2. Search all documents if not matched by docId
          if (matchedStreams.length === 0) {
            const snap = await Promise.race([
              adminDb.collection("streamDatasets").get(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
            ]);
            snap.forEach((docSnap) => {
              const d = docSnap.data() || {};
              const parsed = parseCloudDataset(d, docSnap.id);
              const uUpper = unitKey.toUpperCase();
              if (
                parsed.unitId === uUpper ||
                parsed.docId === unitKey ||
                docSnap.id === unitKey ||
                parsed.title.toUpperCase().includes(uUpper) ||
                uUpper.includes(parsed.unitId)
              ) {
                if (parsed.streams.length > matchedStreams.length) {
                  matchedStreams = parsed.streams;
                  unitTitle = parsed.title;
                }
              }
            });
          }
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Firestore streams query error:", dbErr.message);
        }
      }

      // Try clientDb if adminDb returned nothing
      if (matchedStreams.length === 0 && clientDb) {
        try {
          try {
            const singleDoc = await getDoc(doc(clientDb, "streamDatasets", unitKey));
            if (singleDoc.exists()) {
              const d = singleDoc.data() || {};
              const parsed = parseCloudDataset(d, singleDoc.id);
              if (parsed.streams && parsed.streams.length > 0) {
                matchedStreams = parsed.streams;
                unitTitle = parsed.title;
              }
            }
          } catch (e) {}

          if (matchedStreams.length === 0) {
            const snap = await getDocs(collection(clientDb, "streamDatasets"));
            snap.forEach((docSnap) => {
              const d = docSnap.data() || {};
              const parsed = parseCloudDataset(d, docSnap.id);
              const uUpper = unitKey.toUpperCase();
              if (
                parsed.unitId === uUpper ||
                parsed.docId === unitKey ||
                docSnap.id === unitKey ||
                parsed.title.toUpperCase().includes(uUpper) ||
                uUpper.includes(parsed.unitId)
              ) {
                if (parsed.streams.length > matchedStreams.length) {
                  matchedStreams = parsed.streams;
                  unitTitle = parsed.title;
                }
              }
            });
          }
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Client Firestore streams query error:", dbErr.message);
        }
      }

      if (matchedStreams.length === 0) {
        return res.status((!adminDb && !clientDb) ? 503 : 404).json({
          success: false,
          error: "Stream data not found in Firestore"
        });
      }

      const formattedStreams = matchedStreams.map((st, idx) => {
        const norm = normalizeStreamRecord(st, idx);
        const rawCase = st.caseName || st.case || norm.caseName || (st.streamNo && st.streamNo.includes("[") ? (st.streamNo.match(/\[(.*?)\]/)?.[1] || "") : "");
        return {
          ...norm,
          id: norm.streamNo,
          streamNo: norm.streamNo,
          baseStreamNo: st.baseStreamNo || norm.streamNo,
          caseName: rawCase || "",
          name: norm.name,
          content: norm.content,
          phase: norm.phase,
          temp: norm.temp,
          pressure: norm.pressure,
          massFlow: norm.massFlow,
          description: norm.content,
          components: norm.components,
          constituents: norm.constituents,
          properties: norm.properties
        };
      });

      return res.status(200).json({
        success: true,
        source: "firestore",
        unit: unitKey,
        unitTitle,
        count: formattedStreams.length,
        streams: formattedStreams
      });
    }

    // -------------------------------------------------------------
    // ACTION: "stream_data" - Fetch full parameters of a specific stream from Firestore
    // -------------------------------------------------------------
    if (action === "stream_data") {
      const streamId = String(req.query.streamId || req.query.id || req.body?.streamId || req.body?.id || "").trim();
      const unitKey = String(req.query.unit || req.body?.unit || "").trim();

      if (!streamId) {
        return res.status(400).json({ success: false, error: "Missing required 'streamId' parameter" });
      }

      let rawStream = null;

      if (adminDb) {
        try {
          // 1. First read single document by doc(unitKey)
          if (unitKey) {
            try {
              const singleDoc = await adminDb.collection("streamDatasets").doc(unitKey).get();
              if (singleDoc.exists) {
                const parsed = parseCloudDataset(singleDoc.data() || {}, singleDoc.id);
                const found = parsed.streams.find((s) => String(s.streamNo).trim() === streamId || String(s.id).trim() === streamId);
                if (found) rawStream = found;
              }
            } catch (e) {}
          }

          // 2. Scan whole collection only if doc(unitKey) lookup fails, and stop at the first match
          if (!rawStream) {
            const snap = await Promise.race([
              adminDb.collection("streamDatasets").get(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
            ]);
            for (const docSnap of snap.docs) {
              const parsed = parseCloudDataset(docSnap.data() || {}, docSnap.id);
              const uUpper = unitKey ? unitKey.toUpperCase() : "";
              if (!unitKey || parsed.unitId === uUpper || parsed.docId === unitKey || docSnap.id === unitKey || parsed.title.toUpperCase().includes(uUpper)) {
                const found = parsed.streams.find((s) => String(s.streamNo).trim() === streamId || String(s.id).trim() === streamId);
                if (found) {
                  rawStream = found;
                  break; // Stop at first match
                }
              }
            }
          }
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Firestore stream_data lookup error:", dbErr.message);
        }
      }

      // Try clientDb if adminDb returned nothing
      if (!rawStream && clientDb) {
        try {
          // 1. First read single document by doc(unitKey)
          if (unitKey) {
            try {
              const singleDoc = await getDoc(doc(clientDb, "streamDatasets", unitKey));
              if (singleDoc.exists()) {
                const parsed = parseCloudDataset(singleDoc.data() || {}, singleDoc.id);
                const found = parsed.streams.find((s) => String(s.streamNo).trim() === streamId || String(s.id).trim() === streamId);
                if (found) rawStream = found;
              }
            } catch (e) {}
          }

          // 2. Scan whole collection only if doc(unitKey) lookup fails, and stop at the first match
          if (!rawStream) {
            const snap = await getDocs(collection(clientDb, "streamDatasets"));
            for (const docSnap of snap.docs) {
              const parsed = parseCloudDataset(docSnap.data() || {}, docSnap.id);
              const uUpper = unitKey ? unitKey.toUpperCase() : "";
              if (!unitKey || parsed.unitId === uUpper || parsed.docId === unitKey || docSnap.id === unitKey || parsed.title.toUpperCase().includes(uUpper)) {
                const found = parsed.streams.find((s) => String(s.streamNo).trim() === streamId || String(s.id).trim() === streamId);
                if (found) {
                  rawStream = found;
                  break; // Stop at first match
                }
              }
            }
          }
        } catch (dbErr) {
          console.warn("[API DamageCriteria] Client Firestore stream_data lookup error:", dbErr.message);
        }
      }

      if (!rawStream) {
        return res.status((!adminDb && !clientDb) ? 503 : 404).json({
          success: false,
          error: "Stream data not found in Firestore"
        });
      }

      const normalized = normalizeStreamRecord(rawStream, 0);

      return res.status(200).json({
        success: true,
        source: "firestore",
        stream: normalized
      });
    }

    // -------------------------------------------------------------
    // ACTION: "presets" / "catalog" - Live Erosion Table from Firestore
    // -------------------------------------------------------------
    if (action === "presets" || action === "catalog") {
      const erosionTable = await getLiveErosionTable();
      return res.status(200).json({
        success: true,
        source: "firestore",
        presets: {},
        erosionTable
      });
    }

    // -------------------------------------------------------------
    // ACTION: "criteria_tables" - All Master Screening Tables from Firestore
    // -------------------------------------------------------------
    if (action === "criteria_tables") {
      const erosionDoc = await getDamageCriteriaFromFirestore("api571_table_3_27_1");
      const crackingDoc = await getDamageCriteriaFromFirestore("cracking_mechanism_rules");
      const limitsDoc = await getDamageCriteriaFromFirestore("screening_limits");
      return res.status(200).json({
        success: true,
        source: "firestore",
        erosionTable: erosionDoc?.data || API571_TABLE_3_27_1_FALLBACK,
        crackingRules: crackingDoc?.rules || [],
        screeningLimits: limitsDoc?.limits || {}
      });
    }

    // -------------------------------------------------------------
    // ACTION: "cracking_mechanism" - Environmental Cracking Evaluator
    // -------------------------------------------------------------
    if (action === "cracking_mechanism") {
      const input = req.body || req.query || {};
      const h2s = parseFloat(input.h2s) || 0;
      const freeH2O = String(input.freeH2O || "").toLowerCase().trim();
      const pwht = String(input.pwht || "").toLowerCase().trim();
      const hcn = parseFloat(input.hcn) || 0;
      const ph = parseFloat(input.ph) || 0;
      const chloride = parseFloat(input.chloride) || 0;
      const oxygen = parseFloat(input.oxygen) || 0;
      const temp = parseFloat(input.temp) || 0;
      const caustic = parseFloat(input.caustic) || 0;
      const dea = String(input.dea || "").toLowerCase().trim();
      const scale = String(input.scale || "").toLowerCase().trim();
      const stability = String(input.stability || "").toLowerCase().trim();
      const material = String(input.material || input.materialType || "").toLowerCase().trim();
      const amineType = String(input.amineType || "").toLowerCase().trim();

      let mechanism = "";
      let potential = "";
      let priority = null;
      let code = "";

      // Priority 1 — Wet H2S
      if (h2s > 50 && freeH2O === "yes" && pwht === "no" && (hcn > 20 || ph < 5.5)) {
        mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
        potential = "H";
        priority = 1;
        code = "2";
      } else if (h2s > 50 && freeH2O === "yes" && pwht === "yes" && (hcn > 20 || ph < 5.5)) {
        mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
        potential = "M";
        priority = 1;
        code = "2";
      } else if (h2s > 20 && h2s <= 50 && freeH2O === "yes" && pwht === "yes") {
        mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
        potential = "L";
        priority = 1;
        code = "2";
      }
      // Priority 2 — Chloride SCC
      else if (chloride >= 50 && temp > 140 && oxygen >= 10) {
        mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
        potential = "H";
        priority = 2;
        code = "15";
      } else if (chloride >= 25 && chloride < 50 && oxygen < 10 && temp > 140) {
        mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
        potential = "M";
        priority = 2;
        code = "15";
      } else if (chloride >= 5 && chloride < 25 && oxygen < 0.1 && ph > 9 && temp > 120) {
        mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
        potential = "L";
        priority = 2;
        code = "15";
      }
      // Priority 3 — Caustic Cracking
      else if ((material === "carbon steel" || material === "300 series ss") && temp > 200 && pwht === "no") {
        mechanism = "Caustic Cracking";
        potential = "H";
        priority = 3;
        code = "24";
      } else if (material === "carbon steel" && temp < 200 && caustic < 30 && pwht === "yes") {
        mechanism = "Caustic Cracking";
        potential = "M";
        priority = 3;
        code = "24";
      } else if ((temp < 110 && caustic <= 50) || (temp < 150 && caustic > 0)) {
        mechanism = "Caustic Cracking";
        potential = "L";
        priority = 3;
        code = "24";
      }
      // Priority 4 — Amine Cracking (ASCC)
      else if (material === "carbon steel" && pwht === "no") {
        if (amineType === "mea" || ((amineType === "dea" || amineType === "mdea") && temp > 140)) {
          mechanism = "Amine Cracking (ASCC)";
          potential = "H";
          priority = 4;
          code = "43";
        } else if (temp >= 125 && temp <= 150) {
          mechanism = "Amine Cracking (ASCC)";
          potential = "M";
          priority = 4;
          code = "43";
        }
      } else if (material === "carbon steel" && pwht === "yes") {
        mechanism = "Amine Cracking (ASCC)";
        potential = "L";
        priority = 4;
        code = "43";
      }
      // Priority 5 — PTA SCC
      else if (scale === "yes" && temp > 800 && stability === "upset") {
        mechanism = "Polythionic Acid SCC (PTA)";
        potential = "H";
        priority = 5;
        code = "5";
      } else if (scale === "yes" && stability === "upset") {
        mechanism = "Polythionic Acid SCC (PTA)";
        potential = "M";
        priority = 5;
        code = "5";
      } else if (scale === "yes" && stability === "stable") {
        mechanism = "Polythionic Acid SCC (PTA)";
        potential = "L";
        priority = 5;
        code = "5";
      }

      return res.status(200).json({
        success: true,
        source: "firestore_damage_criteria",
        mechanism: mechanism || null,
        potential: potential || null,
        priority,
        code,
        matched: !!mechanism
      });
    }

    // -------------------------------------------------------------
    // ACTION: "screen" - Post matrix evaluation
    // -------------------------------------------------------------
    if (method === "POST" || action === "screen") {
      const payload = req.body?.data || req.body || {};
      const liveErosion = await getLiveErosionTable();
      API571_TABLE_3_27_1 = liveErosion;
      const evaluation = evaluateScreeningMatrix(payload);
      return res.status(200).json(evaluation);
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("API /api/damage-criteria error:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error", message: err.message });
  }
}
