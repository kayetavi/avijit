export default function handler(req, res) {
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

  // Unit conversion to MPa
  let P_MPa = pNum;
  if (pUnit === "bar") P_MPa *= 0.1;
  else if (pUnit === "kgcm2") P_MPa *= 0.0980665;
  else if (pUnit === "psi") P_MPa *= 0.00689476;

  let S_MPa = sNum;
  if (sUnit === "ksi") S_MPa *= 6.89476;
  else if (sUnit === "kgcm2") S_MPa *= 0.0980665;
  else if (sUnit === "psi") S_MPa *= 0.00689476;

  if (S_MPa === 0 || eNum === 0) {
    return res.status(400).json({ error: "Stress or Efficiency cannot be zero." });
  }

  // NPS Mapping
  const npsMap = {
    10.3: 0.125, 13.7: 0.25, 17.1: 0.375, 21.3: 0.5, 26.7: 0.75, 33.4: 1, 42.2: 1.25, 48.3: 1.5,
    60.3: 2, 73.0: 2.5, 88.9: 3, 101.6: 3.5, 114.3: 4, 141.3: 5, 168.3: 6, 219.1: 8,
    273.0: 10, 323.9: 12, 355.6: 14, 406.4: 16, 457.0: 18, 508.0: 20, 559.0: 22, 610.0: 24,
    660.4: 26, 711.2: 28, 762.0: 30, 812.8: 32, 863.6: 34, 914.4: 36, 965.2: 38,
    1016.0: 40, 1066.8: 42, 1117.6: 44, 1168.4: 46, 1219.2: 48
  };

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
  const t = (P_MPa * dNum) / (2 * S_MPa * eNum);

  // Thick wall check
  if ((dNum / t) < 6) {
    return res.status(200).json({
      success: true,
      thickWallError: true,
      message: "Thick Wall Condition Detected (D/t < 6)"
    });
  }

  // Structural thickness
  let t_struct = 0;
  let t_alert = 0;
  if (temp === "low") {
    if (nps <= 1) { t_struct = 1.8; t_alert = 2.0; }
    else if (nps <= 2) { t_struct = 1.8; t_alert = 2.5; }
    else if (nps <= 3) { t_struct = 2.0; t_alert = 2.8; }
    else if (nps <= 4) { t_struct = 2.3; t_alert = 3.1; }
    else if (nps <= 18) { t_struct = 2.8; t_alert = 3.3; }
    else if (nps <= 24) { t_struct = 3.1; t_alert = 3.6; }
    else { t_struct = 3.5; t_alert = 4.0; }
  } else {
    if (nps <= 1) { t_struct = 2.0; t_alert = 2.3; }
    else if (nps <= 2) { t_struct = 2.0; t_alert = 2.8; }
    else if (nps <= 3) { t_struct = 2.3; t_alert = 3.1; }
    else if (nps <= 4) { t_struct = 2.8; t_alert = 3.5; }
    else if (nps <= 18) { t_struct = 3.1; t_alert = 3.8; }
    else if (nps <= 24) { t_struct = 3.5; t_alert = 4.2; }
    else { t_struct = 4.0; t_alert = 4.5; }
  }

  const t_min = Math.max(t, t_struct);
  const t_req = t_min + caNum;

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
