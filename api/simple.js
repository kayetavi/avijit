import { loadPipeDimensionsFromFirestore } from "./pipe-dimensions.js";
import { loadB313CatalogFromFirestore } from "./b313.js";

function computeStructuralLimits(nps, temp, thresholds) {
  const category = temp === "high" ? "high" : "low";
  const rules = thresholds?.[category] || [
    { maxNps: 1, t_struct: category === "low" ? 1.8 : 2.0, t_alert: category === "low" ? 2.0 : 2.3 },
    { maxNps: 2, t_struct: category === "low" ? 1.8 : 2.0, t_alert: category === "low" ? 2.5 : 2.8 },
    { maxNps: 3, t_struct: category === "low" ? 2.0 : 2.3, t_alert: category === "low" ? 2.8 : 3.1 },
    { maxNps: 4, t_struct: category === "low" ? 2.3 : 2.8, t_alert: category === "low" ? 3.1 : 3.5 },
    { maxNps: 18, t_struct: category === "low" ? 2.8 : 3.1, t_alert: category === "low" ? 3.3 : 3.8 },
    { maxNps: 24, t_struct: category === "low" ? 3.1 : 3.5, t_alert: category === "low" ? 3.6 : 4.2 },
    { maxNps: 999, t_struct: category === "low" ? 3.5 : 4.0, t_alert: category === "low" ? 4.0 : 4.5 }
  ];

  for (const r of rules) {
    if (nps <= Number(r.maxNps)) {
      return { t_struct: Number(r.t_struct), t_alert: Number(r.t_alert) };
    }
  }
  const last = rules[rules.length - 1];
  return { t_struct: Number(last.t_struct), t_alert: Number(last.t_alert) };
}

export default async function handler(req, res) {
  const [pipeDims, b313Catalog] = await Promise.all([
    loadPipeDimensionsFromFirestore(),
    loadB313CatalogFromFirestore()
  ]);

  // Build OD -> numeric NPS lookup map dynamically from Firestore pipeDimensions
  const npsMap = {};
  const decMap = pipeDims.decimalMap || {};
  for (const [npsKey, odVal] of Object.entries(pipeDims.pipeOD || {})) {
    const numNps = decMap[npsKey] ? parseFloat(decMap[npsKey]) : parseFloat(npsKey);
    if (!isNaN(numNps) && !isNaN(Number(odVal))) {
      npsMap[Number(odVal)] = numNps;
    }
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      source: pipeDims.source,
      npsByOD: npsMap,
      pipeOD: pipeDims.pipeOD,
      pipeDataMaster: pipeDims.pipeDataMaster,
      structuralThresholds: b313Catalog.simpleStructuralThresholds,
      jointEfficiencyTable: b313Catalog.jointEfficiencyTable
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    P,
    D,
    S,
    E,
    CA = 0,
    t_act,
    temp = "low",
    selectedSch = "",
    pUnit = "MPa",
    sUnit = "MPa"
  } = req.body || {};

  const pNum = parseFloat(P);
  const dNum = parseFloat(D);
  const sNum = parseFloat(S);
  const eNum = parseFloat(E);
  const caNum = parseFloat(CA) || 0;
  const tactNum = parseFloat(t_act);

  if (isNaN(pNum) || isNaN(dNum) || isNaN(sNum) || isNaN(eNum) || isNaN(tactNum)) {
    return res.status(400).json({ error: "Please fill all required fields (Pressure, NPS/OD, Allowable Stress, Joint Efficiency, and Actual Thickness)." });
  }

  const pressureToMPa = b313Catalog.unitConversions?.pressureToMPa || { MPa: 1.0, bar: 0.1, kgcm2: 0.0980665, psi: 0.00689476 };
  const stressToMPa = b313Catalog.unitConversions?.stressToMPa || { MPa: 1.0, ksi: 6.89476, kgcm2: 0.0980665, psi: 0.00689476 };

  const P_MPa = Number(pNum * (pressureToMPa[pUnit] || 1.0));
  const S_MPa = Number(sNum * (stressToMPa[sUnit] || 1.0));

  if (S_MPa === 0 || eNum === 0) {
    return res.status(400).json({ error: "Stress or Efficiency cannot be zero." });
  }

  let nps = npsMap[dNum];
  if (!nps) {
    let minDiff = Infinity;
    for (const [key, val] of Object.entries(npsMap)) {
      const diff = Math.abs(parseFloat(key) - dNum);
      if (diff < minDiff && diff <= 0.8) {
        minDiff = diff;
        nps = val;
      }
    }
  }
  if (!nps) nps = 1;

  // Design thickness PD / 2SE
  const t = Number((P_MPa * dNum) / (2 * S_MPa * eNum));

  // Thick wall check
  if ((dNum / t) < 6) {
    return res.status(200).json({
      success: true,
      thickWallError: true,
      message: "Thick Wall Condition Detected (D/t < 6)"
    });
  }

  // Structural thickness from Firestore catalog rules
  const { t_struct, t_alert } = computeStructuralLimits(nps, temp, b313Catalog.simpleStructuralThresholds);

  const t_min = Number(Math.max(t, t_struct));
  const t_req = Number(t_min + caNum);

  let status = "";
  let statusColor = "";
  if (tactNum >= t_req) {
    status = "✅ SAFE (Thickness meets required design & structural criteria)";
    statusColor = "#16a34a";
  } else if (tactNum >= t_min) {
    status = "⚠️ MARGINAL (Remaining corrosion allowance depleted, plan inspection/repair)";
    statusColor = "#d97706";
  } else {
    status = "❌ BELOW MINIMUM REQUIRED (Immediate replacement or derating required)";
    statusColor = "#dc2626";
  }

  let alertMsg = "";
  if (tactNum < t_alert) {
    alertMsg = "<br><span style='color:#e11d48; font-weight: 700;'>⚠️ Critical: Actual thickness is below API Alert Thickness limit!</span>";
  }

  return res.status(200).json({
    success: true,
    source: pipeDims.source,
    thickWallError: false,
    t,
    t_struct,
    t_alert,
    t_min,
    t_req,
    status,
    statusColor,
    alertMsg,
    nps,
    P_MPa,
    S_MPa,
    P: pNum,
    D: dNum,
    S: sNum,
    E: eNum,
    CA: caNum,
    t_act: tactNum,
    temp,
    selectedSch,
    pUnit,
    sUnit
  });
}
