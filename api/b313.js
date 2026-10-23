export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const path = req.path || req.url || "";
  
  const yTable = {
    ferritic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, maxC: 482, note: "General Service / Most Piping" },
      { temp: "510°C (950°F)", y: 0.5, maxC: 510 },
      { temp: "538°C (1000°F)", y: 0.7, maxC: 538 },
      { temp: "566°C (1050°F)", y: 0.7, maxC: 566 },
      { temp: "593°C (1100°F)", y: 0.7, maxC: 593 },
      { temp: "≥ 621°C (≥ 1150°F)", y: 0.7, maxC: Infinity }
    ],
    austenitic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, maxC: 482, note: "General Service / Most Piping" },
      { temp: "510°C (950°F)", y: 0.4, maxC: 510 },
      { temp: "538°C (1000°F)", y: 0.4, maxC: 538 },
      { temp: "566°C (1050°F)", y: 0.4, maxC: 566 },
      { temp: "593°C (1100°F)", y: 0.5, maxC: 593 },
      { temp: "≥ 621°C (≥ 1150°F)", y: 0.7, maxC: Infinity }
    ],
    nickel: [
      { temp: "≤ 482°C (900°F)", y: 0.4, maxC: 482, note: "General Service / Most Piping" },
      { temp: "510°C (950°F)", y: 0.4, maxC: 510 },
      { temp: "538°C (1000°F)", y: 0.4, maxC: 538 },
      { temp: "566°C (1050°F)", y: 0.4, maxC: 566 },
      { temp: "593°C (1100°F)", y: 0.4, maxC: 593 },
      { temp: "≥ 621°C (≥ 1150°F)", y: 0.7, maxC: Infinity }
    ],
    grayiron: [
      { temp: "All Temperatures", y: 0.0, maxC: Infinity, note: "Cast Iron" }
    ],
    other: [
      { temp: "All Temperatures (Ductile)", y: 0.4, maxC: Infinity }
    ]
  };

  const wTable = [
    { maxC: 427, val: "1.0" },
    { maxC: 454, val: "0.95" },
    { maxC: 482, val: "0.91" },
    { maxC: 510, val: "0.88" },
    { maxC: 538, val: "0.85" },
    { maxC: 566, val: "0.82" },
    { maxC: 593, val: "0.78" },
    { maxC: 621, val: "0.75" },
    { maxC: 649, val: "0.72" },
    { maxC: Infinity, val: "0.70" }
  ];

  const millToleranceMap = {
    "A53": { type: "%", value: 0.125 },
    "A106": { type: "%", value: 0.125 },
    "A134": { type: "%", value: 0.125 },
    "A135/A135M": { type: "%", value: 0.125 },
    "A312/A312M": { type: "%", value: 0.125 },
    "A358/A358M": { type: "mm", value: 0.3 },
    "A409/A409M": { type: "mm", value: 0.46 },
    "A451/A451M": { type: "%", value: 0 },
    "A524": { type: "%", value: 0.125 },
    "A530/A530M": { type: "%", value: 0.125 },
    "A587": { type: "%", value: 0.125 },
    "A600/A600M": { type: "mm", value: 0 },
    "A671/A671M": { type: "mm", value: 0.3 },
    "A672/A672M": { type: "mm", value: 0.3 },
    "A691/A691M": { type: "mm", value: 0.3 },
    "A731/A731M": { type: "%", value: 0.125 },
    "A335/A335M": { type: "%", value: 0.125 },
    "A790/A790M": { type: "%", value: 0.125 },
    "IS-3589 (SAW & Seamless Pipe)": { type: "%", value: 0.125 },
    "IS-3589 (ERW Pipe)": { type: "%", value: 0.10 },
    "IS-1239 (Welded: Light Tubes)": { type: "%", value: 0.08 },
    "IS-1239 (Welded: Medium/Heavy)": { type: "%", value: 0.10 },
    "IS-1239 (Seamless)": { type: "%", value: 0.125 }
  };

  function getMillTolerance(material, t_nom) {
    const mt = millToleranceMap[material];
    if (mt && material.indexOf("API 5L") === -1) {
      if (mt.type === "%") {
        return t_nom * mt.value;
      } else if (mt.type === "mm") {
        return mt.value;
      }
    }
    if (material === "API 5L (Seamless)") {
      if (t_nom <= 4.0) return 0.5;
      if (t_nom > 4.0 && t_nom < 25.0) return 0.125 * t_nom;
      if (t_nom >= 25.0) return 0.1 * t_nom;
    }
    if (material === "API 5L (Welded Pipe)") {
      if (t_nom <= 5.0) return 0.5;
      if (t_nom > 5.0 && t_nom < 15.0) return 0.1 * t_nom;
      if (t_nom >= 15.0) return 1.5;
    }
    return 0.125 * (t_nom || 0);
  }

  function getRequiredNominal(material, t_req) {
    if (!material || isNaN(t_req) || t_req <= 0) return t_req;
    const mt = millToleranceMap[material];
    if (mt && material.indexOf("API 5L") === -1) {
      if (mt.type === "%") {
        const frac = mt.value;
        return frac < 1 ? (t_req / (1 - frac)) : t_req;
      } else if (mt.type === "mm") {
        return t_req + mt.value;
      }
    }
    if (material === "API 5L (Seamless)") {
      if (t_req <= 3.5) return t_req + 0.5;
      return t_req / (1 - 0.125);
    }
    if (material === "API 5L (Welded Pipe)") {
      if (t_req <= 4.5) return t_req + 0.5;
      return t_req / (1 - 0.1);
    }
    return t_req / (1 - 0.125);
  }

  // Handle Metadata endpoint
  if (path.includes("/metadata")) {
    const { tempC: tempRaw, materialGroup } = req.body || {};
    const material = (materialGroup && yTable[materialGroup]) ? materialGroup : "ferritic";
    const tempC = (tempRaw !== null && tempRaw !== undefined && tempRaw !== "") ? parseFloat(tempRaw) : NaN;
    const options = yTable[material];

    let targetIdx = 0;
    if (!isNaN(tempC)) {
      if (material === "grayiron" || material === "other") {
        targetIdx = 0;
      } else {
        for (let i = 0; i < options.length; i++) {
          if (tempC <= options[i].maxC) {
            targetIdx = i;
            break;
          }
          targetIdx = i;
        }
      }
    }

    const selectedY = options[targetIdx] ? options[targetIdx].y : 0.4;
    let wVal = "1.0";
    let isHighTemp = false;
    if (!isNaN(tempC) && tempC > 427) {
      isHighTemp = true;
      for (const wRow of wTable) {
        if (tempC <= wRow.maxC) {
          wVal = wRow.val;
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      tempC: isNaN(tempC) ? null : tempC,
      materialGroup: material,
      options,
      targetIdx,
      selectedY,
      isHighTemp,
      wVal,
      wOptions: wTable
    });
  }

  // Handle Mill-Tolerance endpoint
  if (path.includes("/mill-tolerance")) {
    const { materialStd, nominalVal: nomRaw, t_req: reqRaw } = req.body || {};
    if (!materialStd || (!millToleranceMap[materialStd] && materialStd.indexOf("API 5L") === -1)) {
      return res.status(400).json({ error: "Explicit valid materialStd is required (no default fallback permitted)." });
    }
    const nominalVal = parseFloat(nomRaw);
    const t_req = parseFloat(reqRaw);
    if (isNaN(nominalVal) || nominalVal <= 0) {
      return res.status(400).json({ error: "Explicit positive nominalVal is required." });
    }
    if (isNaN(t_req) || t_req <= 0) {
      return res.status(400).json({ error: "Explicit positive t_req is required." });
    }

    const millTolVal = getMillTolerance(materialStd, nominalVal);
    const t_afterMill = Math.max(nominalVal - millTolVal, 0);
    const t_nom_req = getRequiredNominal(materialStd, t_req);

    const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
      ? millTolVal.toFixed(2) + " mm"
      : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");

    return res.status(200).json({
      success: true,
      materialStd,
      nominalVal,
      millTolVal,
      t_afterMill,
      t_nom_req,
      displayTol
    });
  }

  const {
    mode = "full", // "full" or "tolerance_only"
    P_raw,
    pUnit = "MPa",
    T_raw,
    tUnit = "C",
    tempC,
    S_raw,
    sUnit = "MPa",
    D,
    E,
    Y = 0.4,
    W = 1.0,
    includeCA = false,
    caRaw = 0,
    includeMillTol = false,
    materialStd = "A106",
    nominalVal: inputNomVal,
    userEdited = false
  } = req.body || {};

  const pressureToMPa = {
    "MPa": 1.0,
    "bar": 0.1,
    "kgcm2": 0.0980665,
    "psi": 0.00689476
  };

  const stressToMPa = {
    "MPa": 1.0,
    "ksi": 6.89476,
    "kgcm2": 0.0980665,
    "psi": 0.00689476
  };

  const standardWallThicknessByOD = {
    "21.3": 2.77, "26.7": 2.87, "33.4": 3.38, "42.2": 3.56, "48.3": 3.68,
    "60.3": 3.91, "73.0": 5.16, "88.9": 5.49, "101.6": 5.74, "114.3": 6.02,
    "141.3": 6.55, "168.3": 7.11, "219.1": 8.18, "273.1": 9.27, "323.9": 9.53,
    "355.6": 9.53, "406.4": 9.53, "457.2": 9.53, "508.0": 9.53
  };

  const CA = includeCA ? (isNaN(parseFloat(caRaw)) ? 0 : parseFloat(caRaw)) : 0;
  const dVal = parseFloat(D);

  if (mode === "tolerance_only") {
    let nominalVal = parseFloat(inputNomVal);
    if (isNaN(nominalVal) || nominalVal <= 0) {
      if (!isNaN(dVal) && standardWallThicknessByOD[String(dVal)]) {
        nominalVal = standardWallThicknessByOD[String(dVal)];
      }
    }
    if (isNaN(nominalVal) || nominalVal <= 0) {
      return res.status(400).json({ error: "Please enter Nominal Thickness (mm) or select Nominal Pipe Size (NPS)." });
    }

    let millTolVal = 0;
    let t_afterMill = nominalVal;
    let t_includingCA_Mill = nominalVal;

    if (includeMillTol && materialStd) {
      millTolVal = getMillTolerance(materialStd, nominalVal);
      t_afterMill = nominalVal - millTolVal;
      t_includingCA_Mill = includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill;
    } else if (includeCA) {
      t_includingCA_Mill = Math.max(nominalVal - CA, 0);
    }

    const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
      ? millTolVal.toFixed(2) + " mm"
      : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");

    return res.status(200).json({
      success: true,
      mode: "tolerance_only",
      nominalVal,
      materialStd,
      includeMillTol,
      includeCA,
      CA,
      millTolVal,
      t_afterMill,
      t_includingCA_Mill,
      displayTol
    });
  }

  // Full Calculation Mode
  const P_num = parseFloat(P_raw);
  const S_num = parseFloat(S_raw);
  const E_num = parseFloat(E);

  if (isNaN(P_num) || isNaN(S_num)) {
    return res.status(400).json({ error: "Design Pressure and Allowable Stress are required." });
  }
  if (isNaN(dVal) || isNaN(E_num)) {
    return res.status(400).json({ error: "Pipe Diameter and Joint Efficiency are required." });
  }

  const P = P_num * (pressureToMPa[pUnit] || 1.0);
  const S = S_num * (stressToMPa[sUnit] || 1.0);
  const Y_num = isNaN(parseFloat(Y)) ? 0.4 : parseFloat(Y);
  const W_num = isNaN(parseFloat(W)) ? 1.0 : parseFloat(W);

  const denominator = 2 * (S * E_num * W_num + P * Y_num);
  if (denominator <= 0) {
    return res.status(400).json({ error: "Denominator in formula is non-positive. Check input values." });
  }

  const t_design = (P * dVal) / denominator;
  const t_req = t_design + CA;

  let t_nom_req = t_req;
  if (includeMillTol && materialStd) {
    t_nom_req = getRequiredNominal(materialStd, t_req);
  }

  let nominalVal = parseFloat(inputNomVal);
  let autoFilled = false;
  if (!userEdited || isNaN(nominalVal) || nominalVal <= 0) {
    const stdWall = standardWallThicknessByOD[String(dVal)];
    if (stdWall !== undefined && stdWall >= t_nom_req) {
      nominalVal = stdWall;
    } else {
      nominalVal = t_nom_req > 0 ? t_nom_req : t_design;
    }
    autoFilled = true;
  }

  let millTolVal = 0;
  let t_afterMill = nominalVal;
  let t_includingCA_Mill = nominalVal;

  if (includeMillTol && materialStd) {
    millTolVal = getMillTolerance(materialStd, nominalVal);
    t_afterMill = Math.max(nominalVal - millTolVal, 0);
    t_includingCA_Mill = includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill;
  } else if (includeCA) {
    t_includingCA_Mill = Math.max(nominalVal - CA, 0);
  }

  const isAdequate = includeMillTol ? (t_afterMill >= (t_req - 0.001)) : (nominalVal >= (t_req - 0.001));

  const displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || millToleranceMap[materialStd]?.type === "mm"))
    ? millTolVal.toFixed(2) + " mm"
    : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");

  return res.status(200).json({
    success: true,
    mode: "full",
    P_val: P,
    S_val: S,
    t_design,
    t_req,
    t_nom_req,
    nominalVal,
    autoFilled,
    millTolVal,
    t_afterMill,
    t_includingCA_Mill,
    isAdequate,
    displayTol,
    P_raw: P_num,
    pUnit,
    T_raw,
    tUnit,
    tempC,
    S_raw: S_num,
    sUnit,
    D: dVal,
    E: E_num,
    Y: Y_num,
    W: W_num,
    includeCA,
    CA,
    includeMillTol,
    materialStd
  });
}
