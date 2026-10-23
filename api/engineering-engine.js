// /api/engineering-engine.js
// Ultra-intelligent Engineering Brain & Calculation Solver for KayetDMS

export const PIPE_DATA = {
  "1/8": { od: 10.3, schedules: { "10": 1.24, "40": 1.73, "STD": 1.73, "80": 2.41, "XS": 2.41 } },
  "1/4": { od: 13.7, schedules: { "10": 1.65, "40": 2.24, "STD": 2.24, "80": 3.02, "XS": 3.02 } },
  "3/8": { od: 17.1, schedules: { "10": 1.65, "40": 2.31, "STD": 2.31, "80": 3.20, "XS": 3.20 } },
  "1/2": { od: 21.3, schedules: { "10": 2.11, "40": 2.77, "STD": 2.77, "80": 3.73, "XS": 3.73, "160": 4.78, "XXS": 7.47 } },
  "0.5": { od: 21.3, schedules: { "10": 2.11, "40": 2.77, "STD": 2.77, "80": 3.73, "XS": 3.73, "160": 4.78, "XXS": 7.47 } },
  "3/4": { od: 26.7, schedules: { "10": 2.11, "40": 2.87, "STD": 2.87, "80": 3.91, "XS": 3.91, "160": 5.56, "XXS": 7.82 } },
  "0.75": { od: 26.7, schedules: { "10": 2.11, "40": 2.87, "STD": 2.87, "80": 3.91, "XS": 3.91, "160": 5.56, "XXS": 7.82 } },
  "1": { od: 33.4, schedules: { "10": 2.77, "40": 3.38, "STD": 3.38, "80": 4.55, "XS": 4.55, "160": 6.35, "XXS": 9.09 } },
  "1.25": { od: 42.2, schedules: { "10": 2.77, "40": 3.56, "STD": 3.56, "80": 4.85, "XS": 4.85, "160": 6.35, "XXS": 9.70 } },
  "1-1/4": { od: 42.2, schedules: { "10": 2.77, "40": 3.56, "STD": 3.56, "80": 4.85, "XS": 4.85, "160": 6.35, "XXS": 9.70 } },
  "1.5": { od: 48.3, schedules: { "10": 2.77, "40": 3.68, "STD": 3.68, "80": 5.08, "XS": 5.08, "160": 7.14, "XXS": 10.16 } },
  "1-1/2": { od: 48.3, schedules: { "10": 2.77, "40": 3.68, "STD": 3.68, "80": 5.08, "XS": 5.08, "160": 7.14, "XXS": 10.16 } },
  "2": { od: 60.3, schedules: { "10": 2.77, "40": 3.91, "STD": 3.91, "80": 5.54, "XS": 5.54, "160": 8.74, "XXS": 11.07 } },
  "2.5": { od: 73.0, schedules: { "10": 3.05, "40": 5.16, "STD": 5.16, "80": 7.01, "XS": 7.01, "160": 9.53, "XXS": 14.02 } },
  "2-1/2": { od: 73.0, schedules: { "10": 3.05, "40": 5.16, "STD": 5.16, "80": 7.01, "XS": 7.01, "160": 9.53, "XXS": 14.02 } },
  "3": { od: 88.9, schedules: { "10": 3.05, "40": 5.49, "STD": 5.49, "80": 7.62, "XS": 7.62, "160": 11.13, "XXS": 15.24 } },
  "3.5": { od: 101.6, schedules: { "10": 3.05, "40": 5.74, "STD": 5.74, "80": 8.08, "XS": 8.08 } },
  "3-1/2": { od: 101.6, schedules: { "10": 3.05, "40": 5.74, "STD": 5.74, "80": 8.08, "XS": 8.08 } },
  "4": { od: 114.3, schedules: { "10": 3.05, "40": 6.02, "STD": 6.02, "80": 8.56, "XS": 8.56, "120": 11.13, "160": 13.49, "XXS": 17.12 } },
  "5": { od: 141.3, schedules: { "10": 3.40, "40": 6.55, "STD": 6.55, "80": 9.53, "XS": 9.53, "120": 12.70, "160": 15.88, "XXS": 19.05 } },
  "6": { od: 168.3, schedules: { "10": 3.40, "40": 7.11, "STD": 7.11, "80": 10.97, "XS": 10.97, "120": 14.27, "160": 18.26, "XXS": 21.95 } },
  "8": { od: 219.1, schedules: { "10": 3.76, "20": 6.35, "30": 7.04, "40": 8.18, "STD": 8.18, "60": 10.31, "80": 12.70, "XS": 12.70, "100": 15.09, "120": 18.26, "140": 20.62, "160": 23.01, "XXS": 22.23 } },
  "10": { od: 273.0, schedules: { "10": 4.19, "20": 6.35, "30": 7.80, "40": 9.27, "STD": 9.27, "60": 12.70, "80": 15.09, "XS": 12.70, "100": 18.26, "120": 21.44, "140": 25.40, "160": 28.58, "XXS": 25.40 } },
  "12": { od: 323.8, schedules: { "10": 4.57, "20": 6.35, "30": 8.38, "40": 10.31, "STD": 9.53, "60": 14.27, "80": 17.48, "XS": 12.70, "100": 21.44, "120": 25.40, "140": 28.58, "160": 33.32, "XXS": 25.40 } },
  "14": { od: 355.6, schedules: { "10": 6.35, "20": 7.92, "30": 9.53, "40": 11.13, "STD": 9.53, "60": 15.09, "80": 19.05, "XS": 12.70, "100": 23.83, "120": 27.79, "140": 31.75, "160": 35.71 } },
  "16": { od: 406.4, schedules: { "10": 6.35, "20": 7.92, "30": 9.53, "40": 12.70, "STD": 9.53, "60": 16.66, "80": 21.44, "XS": 12.70, "100": 26.19, "120": 30.96, "140": 36.53, "160": 40.49 } },
  "18": { od: 457.0, schedules: { "10": 6.35, "20": 7.92, "30": 11.13, "40": 14.27, "STD": 9.53, "60": 19.05, "80": 23.83, "XS": 12.70, "100": 29.36, "120": 34.93, "140": 39.67, "160": 45.24 } },
  "20": { od: 508.0, schedules: { "10": 6.35, "20": 9.53, "30": 12.70, "40": 15.09, "STD": 9.53, "60": 20.62, "80": 26.19, "XS": 12.70, "100": 32.54, "120": 38.10, "140": 44.45, "160": 50.01 } },
  "24": { od: 610.0, schedules: { "10": 6.35, "20": 9.53, "30": 14.27, "40": 17.48, "STD": 9.53, "60": 24.61, "80": 30.96, "XS": 12.70, "100": 38.89, "120": 46.02, "140": 52.37, "160": 59.54 } }
};

export const CUI_BASELINE_RATES = [
  { temp: -12, values: { Severe: 0.000, Moderate: 0.000, Mild: 0.000, Dry: 0.000 } },
  { temp: 0,   values: { Severe: 0.025, Moderate: 0.013, Mild: 0.000, Dry: 0.000 } },
  { temp: 25,  values: { Severe: 0.127, Moderate: 0.064, Mild: 0.025, Dry: 0.000 } },
  { temp: 50,  values: { Severe: 0.381, Moderate: 0.191, Mild: 0.076, Dry: 0.000 } },
  { temp: 71,  values: { Severe: 0.508, Moderate: 0.254, Mild: 0.102, Dry: 0.000 } },
  { temp: 93,  values: { Severe: 0.381, Moderate: 0.191, Mild: 0.076, Dry: 0.000 } },
  { temp: 107, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.051, Dry: 0.000 } },
  { temp: 120, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.038, Dry: 0.000 } },
  { temp: 135, values: { Severe: 0.254, Moderate: 0.089, Mild: 0.025, Dry: 0.000 } },
  { temp: 150, values: { Severe: 0.127, Moderate: 0.051, Mild: 0.013, Dry: 0.000 } },
  { temp: 160, values: { Severe: 0.127, Moderate: 0.038, Mild: 0.013, Dry: 0.000 } },
  { temp: 175, values: { Severe: 0.000, Moderate: 0.000, Mild: 0.000, Dry: 0.000 } }
];

export const DASHBOARD_MODULES = [
  { id: "ASMEB31_3Tab", title: "Process Piping Thickness (ASME B31.3)", nav: "showASMEB31_3Tab()", desc: "Straight pipe pressure design thickness, mill under-tolerance & net usable wall" },
  { id: "ASMESECTIONVIIIDIV1Tab", title: "Pressure Vessel Design (ASME Section VIII Div 1)", nav: "showASMESECTIONVIIIDIV1Tab()", desc: "Cylindrical/spherical shells, 2:1 ellipsoidal, torispherical heads & hydrotest pressure" },
  { id: "corrosionFullTab", title: "API 581 & API 571 Corrosion Rate Estimator", nav: "showCorrosionFullTab()", desc: "CUI rates across temperatures, CO2 de Waard-Milliams, sulfidation curves" },
  { id: "remainingLifeTab", title: "API 570/510 Remaining Life & Inspection Interval", nav: "showRemainingLifeTab()", desc: "LTCR/STCR, remaining life, half-life & next inspection date forecasting" },
  { id: "a571-criteriaTab", title: "API 571 Damage Mechanism Screening", nav: "showCriteriaTab()", desc: "Automated screening for 60+ refinery & chemical damage mechanisms" },
  { id: "inventoryTab", title: "Toxic & Hazardous Inventory Dispersion (API 581)", nav: "showInventoryTab()", desc: "Leak rates, vapor cloud dispersion, ERPG/IDLH distances & TNT blast equivalent" },
  { id: "crackingMechanismTab", title: "Cracking Damage Mechanisms", nav: "showCrackingMechanismTab()", desc: "Wet H2S (HIC, SOHIC, SSC) and stress corrosion cracking (SCC)" },
  { id: "bkStressTab", title: "Material Allowable Stress Lookup (ASME Sec II Part D)", nav: "showbkStressTab()", desc: "Allowable stresses for A106, A53, SS304/316, P11, P22, P91 across temperatures" },
  { id: "fluidSelectorTab", title: "Representative Fluids Library (API 581)", nav: "showFluidSelectorTab()", desc: "Physical properties, NBP, MW, autoignition, toxicity groupings" },
  { id: "inspectionconfidenceTab", title: "Inspection Confidence & Bayesian RBI (IIC/AIC)", nav: "showINSPECTIONCONFIDENCETab()", desc: "Inspection effectiveness categories (A, B, C, D) & Bayesian failure updates" },
  { id: "simplePipingTab", title: "Pipe Dimensions & Schedules (ASME B36.10M)", nav: "showSimplePipingTab()", desc: "Standard NPS OD, schedule thicknesses and weight" },
  { id: "rptuTab", title: "Catalyst & Reactor Tracker (RPTU)", nav: "showRPTUDashboard()", desc: "Reactor temperature profiling, pressure drops and catalyst activity" },
  { id: "adminPanelTab", title: "Admin Panel & Firestore RBAC Control", nav: "showAdminPanelTab()", desc: "User roles, active sessions and database management" }
];

/**
 * Executes high-precision mathematical calculations based on parsed query parameters.
 */
export function performEngineeringCalculations(msg) {
  const text = msg.toLowerCase();
  const calculations = [];

  // 1. ASME B31.3 Process Piping Calculation Check
  // Matches e.g. "pressure 2.5 mpa", "stress 138 mpa", "od 60.3" or "2 inch", "ca 1.5"
  const pressureMatch = text.match(/(?:pressure|p|chap)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mpa|bar|psi|kg\/cm2|kgcm2)?/i);
  const stressMatch = text.match(/(?:stress|s)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mpa|bar|psi|ksi)?/i);
  const diaMatch = text.match(/(?:diameter|od|dia|d)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm|inch|in)?/i);
  const sizeMatch = text.match(/(?:^|\s)([0-9./]+)\s*(?:inch|in|")/i);
  const caMatch = text.match(/(?:ca|corrosion allowance)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm)?/i);

  if (pressureMatch && (diaMatch || sizeMatch)) {
    let pVal = parseFloat(pressureMatch[1]);
    const pUnit = (pressureMatch[2] || "mpa").toLowerCase();
    // Convert pressure to MPa
    if (pUnit === "bar") pVal = pVal * 0.1;
    else if (pUnit === "psi") pVal = pVal * 0.00689476;
    else if (pUnit.includes("kg")) pVal = pVal * 0.0980665;

    let sVal = stressMatch ? parseFloat(stressMatch[1]) : 138; // default carbon steel A106 Gr B = 138 MPa
    if (stressMatch && stressMatch[2]) {
      const sUnit = stressMatch[2].toLowerCase();
      if (sUnit === "ksi") sVal = sVal * 6.89476;
      else if (sUnit === "psi") sVal = sVal * 0.00689476;
      else if (sUnit === "bar") sVal = sVal * 0.1;
    }

    let odVal = 0;
    let npsStr = "";
    if (diaMatch) {
      odVal = parseFloat(diaMatch[1]);
      if (diaMatch[2] === "inch" || diaMatch[2] === "in") odVal = odVal * 25.4;
    } else if (sizeMatch) {
      npsStr = sizeMatch[1];
      if (PIPE_DATA[npsStr]) odVal = PIPE_DATA[npsStr].od;
      else odVal = parseFloat(npsStr) * 25.4;
    }

    if (odVal > 0 && pVal > 0 && sVal > 0) {
      const E = 1.0;
      const W = 1.0;
      const Y = 0.4;
      const caVal = caMatch ? parseFloat(caMatch[1]) : 1.5;

      // t = (P * D) / [2 * (S * E * W + P * Y)]
      const denom = 2 * (sVal * E * W + pVal * Y);
      const t_design = (pVal * odVal) / denom;
      const t_m = t_design + caVal;
      const millTolPct = 12.5; // ASTM A106 standard
      const t_nom_req = t_m / (1 - millTolPct / 100);

      // Find recommended standard schedule
      let recommendedSch = "Custom / Special";
      let nomWall = t_nom_req;
      if (npsStr && PIPE_DATA[npsStr]) {
        const schList = Object.entries(PIPE_DATA[npsStr].schedules);
        for (const [schName, schThk] of schList) {
          if (schThk >= t_nom_req) {
            recommendedSch = `SCH ${schName} (${schThk} mm)`;
            nomWall = schThk;
            break;
          }
        }
      }

      const millTolMm = nomWall * (millTolPct / 100);
      const netUsableWall = nomWall - millTolMm - caVal;

      calculations.push({
        type: "ASME_B31_3",
        moduleTab: "ASMEB31_3Tab",
        title: "ASME B31.3 Process Piping Wall Thickness Calculation",
        inputs: {
          designPressure_MPa: Number(pVal.toFixed(3)),
          allowableStress_MPa: Number(sVal.toFixed(1)),
          outsideDiameter_mm: Number(odVal.toFixed(2)),
          jointEfficiency_E: E,
          weldFactor_W: W,
          yFactor: Y,
          corrosionAllowance_mm: caVal,
          millTolerance_pct: millTolPct
        },
        outputs: {
          designThickness_t_mm: Number(t_design.toFixed(3)),
          minRequiredThickness_tm_mm: Number(t_m.toFixed(3)),
          minNominalThickness_tnom_req_mm: Number(t_nom_req.toFixed(3)),
          recommendedSchedule: recommendedSch,
          nominalWallSelected_mm: Number(nomWall.toFixed(2)),
          millToleranceDeduction_mm: Number(millTolMm.toFixed(2)),
          netUsableWallThickness_mm: Number(netUsableWall.toFixed(2))
        },
        action: {
          tag: `[[ACTION:FILL_B313:{"pressure":${pVal.toFixed(2)},"stress":${sVal.toFixed(1)},"od":${odVal.toFixed(1)},"ca":${caVal},"material":"A106","nom":${nomWall.toFixed(2)}}:Apply to ASME B31.3 Calculator]]`
        }
      });
    }
  }

  // 2. ASME Section VIII Div 1 Pressure Vessel Calculation Check
  // Matches cylindrical shell or vessel heads
  if (text.includes("viii") || text.includes("vessel") || text.includes("shell") || text.includes("head") || text.includes("ug-27") || text.includes("ug-32")) {
    const vPressMatch = text.match(/(?:pressure|p)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mpa|bar|psi)?/i);
    const radMatch = text.match(/(?:radius|r)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm|m|inch)?/i);
    const diaVMatch = text.match(/(?:diameter|dia|d)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm|m|inch)?/i);

    if (vPressMatch && (radMatch || diaVMatch)) {
      let P = parseFloat(vPressMatch[1]);
      const pUnit = (vPressMatch[2] || "bar").toLowerCase();
      if (pUnit === "bar") P = P * 0.1;
      else if (pUnit === "psi") P = P * 0.00689476;

      let R = 0;
      if (radMatch) {
        R = parseFloat(radMatch[1]);
        if (radMatch[2] === "m") R = R * 1000;
        else if (radMatch[2] === "inch") R = R * 25.4;
      } else if (diaVMatch) {
        let D = parseFloat(diaVMatch[1]);
        if (diaVMatch[2] === "m") D = D * 1000;
        else if (diaVMatch[2] === "inch") D = D * 25.4;
        R = D / 2;
      }

      const S = 138; // Carbon steel SA-516 Gr 70 / SA-106 B default
      const E = 1.0;
      const CA = 1.5;

      // UG-27(c)(1): Cylindrical shell t = P * R / (S * E - 0.6 * P)
      const t_cyl = (P * R) / (S * E - 0.6 * P);
      // 2:1 Ellipsoidal head UG-32(c): t = P * D / (2 * S * E - 0.2 * P)
      const t_ellip = (P * (2 * R)) / (2 * S * E - 0.2 * P);
      // ASME Flanged & Dished / Torispherical UG-32(d): t = 0.885 * P * L / (S * E - 0.1 * P) (L = 2*R)
      const t_tori = (0.885 * P * (2 * R)) / (S * E - 0.1 * P);
      // Hydrotest pressure UG-99: 1.3 * MAWP
      const hydroPressure = 1.3 * P;

      calculations.push({
        type: "ASME_VIII_DIV_1",
        moduleTab: "ASMESECTIONVIIIDIV1Tab",
        title: "ASME Section VIII Div 1 Pressure Vessel Thickness",
        inputs: {
          designPressure_MPa: Number(P.toFixed(3)),
          insideRadius_R_mm: Number(R.toFixed(1)),
          allowableStress_S_MPa: S,
          jointEfficiency_E: E,
          corrosionAllowance_CA_mm: CA
        },
        outputs: {
          cylindricalShell_t_mm: Number(t_cyl.toFixed(3)),
          cylindricalShell_withCA_mm: Number((t_cyl + CA).toFixed(3)),
          ellipsoidalHead21_t_mm: Number(t_ellip.toFixed(3)),
          ellipsoidalHead_withCA_mm: Number((t_ellip + CA).toFixed(3)),
          torisphericalHead_t_mm: Number(t_tori.toFixed(3)),
          torisphericalHead_withCA_mm: Number((t_tori + CA).toFixed(3)),
          minHydrotestPressure_MPa: Number(hydroPressure.toFixed(3)),
          minHydrotestPressure_bar: Number((hydroPressure * 10).toFixed(2))
        },
        action: {
          tag: `[[ACTION:FILL_ASME8:{"pressure":${P.toFixed(2)},"radius":${R.toFixed(1)},"stress":${S},"efficiency":${E},"ca":${CA},"componentType":"shell"}:Open in ASME Sec VIII Div 1]]`
        }
      });
    }
  }

  // 3. API 570 / 510 Remaining Life & Corrosion Rate Check
  const actThkMatch = text.match(/(?:actual|current|last|present)\s*(?:thickness|thk)?\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm)?/i);
  const minThkMatch = text.match(/(?:tmin|min\s*thickness|required\s*thickness|t-min)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm)?/i);
  const crMatch = text.match(/(?:corrosion\s*rate|cr|rate)\s*(?:=|:|\s)?\s*([0-9.]+)\s*(mm\/yr|mm\/year|mpy)?/i);

  if (actThkMatch && (minThkMatch || crMatch)) {
    const t_act = parseFloat(actThkMatch[1]);
    const t_min = minThkMatch ? parseFloat(minThkMatch[1]) : 2.5;
    let cr = crMatch ? parseFloat(crMatch[1]) : 0.2; // mm/yr default
    if (crMatch && crMatch[2] && crMatch[2].toLowerCase() === "mpy") cr = cr * 0.0254;

    if (cr > 0 && t_act > t_min) {
      const remainingLife = (t_act - t_min) / cr;
      const halfLife = remainingLife / 2;
      const nextInspYears = Math.min(halfLife, 5); // 5 year maximum API 570 piping interval

      calculations.push({
        type: "API_REMAINING_LIFE",
        moduleTab: "remainingLifeTab",
        title: "API 570 / 510 Remaining Life & Corrosion Rate Analysis",
        inputs: {
          actualThickness_mm: t_act,
          minimumRequiredThickness_tmin_mm: t_min,
          corrosionRate_mm_year: Number(cr.toFixed(3))
        },
        outputs: {
          remainingCorrosionAllowance_mm: Number((t_act - t_min).toFixed(3)),
          remainingLife_years: Number(remainingLife.toFixed(1)),
          halfLife_years: Number(halfLife.toFixed(1)),
          recommendedInspectionInterval_years: Number(nextInspYears.toFixed(1))
        },
        action: {
          tag: `[[ACTION:FILL_REMAINING_LIFE:{"t_act":${t_act},"t_min":${t_min},"cr":${cr}}:Calculate in Remaining Life Tool]]`
        }
      });
    }
  }

  // 4. API 571 & API 581 CUI Rate Calculation Check
  const tempMatch = text.match(/(?:temp|temperature|operating temp|tapmatra|degree|deg c|°c)\s*(?:=|:|\s)?\s*(-?[0-9.]+)/i) || text.match(/([0-9.]+)\s*(?:degree|deg|°c|c)/i);
  if (text.includes("cui") || (tempMatch && (text.includes("insulat") || text.includes("corrosion rate")))) {
    const tempVal = tempMatch ? parseFloat(tempMatch[1]) : 120;
    const closest = CUI_BASELINE_RATES.reduce((prev, curr) =>
      Math.abs(curr.temp - tempVal) < Math.abs(prev.temp - tempVal) ? curr : prev
    );

    const isSusceptible = tempVal >= -12 && tempVal <= 175;
    const isPeak = tempVal >= 60 && tempVal <= 120;

    calculations.push({
      type: "API_581_CUI",
      moduleTab: "corrosionFullTab",
      title: `API 571 / API 581 CUI Corrosion Rate Assessment at ${tempVal}°C`,
      inputs: {
        operatingTemperature_C: tempVal,
        material: "Carbon Steel / Low Alloy",
        screeningRange_C: "-12°C to 175°C",
        peakSusceptibilityZone: "60°C to 120°C"
      },
      outputs: {
        isSusceptible,
        isPeak,
        closestTableTemperature_C: closest.temp,
        rates_mm_per_year: closest.values,
        rates_mpy: {
          Severe: Number((closest.values.Severe / 0.0254).toFixed(1)),
          Moderate: Number((closest.values.Moderate / 0.0254).toFixed(1)),
          Mild: Number((closest.values.Mild / 0.0254).toFixed(1)),
          Dry: Number((closest.values.Dry / 0.0254).toFixed(1))
        }
      },
      action: {
        tag: `[[ACTION:FILL_CUI:{"temp":${tempVal},"material":"cs","severity":"Severe"}:Open CUI Calculator (${tempVal}°C)]]`
      }
    });
  }

  return calculations;
}

/**
 * Builds the comprehensive, multilingual, dashboard-aware system instruction.
 */
export function buildKayetBotSystemInstruction(currentTab, dashboardContext) {
  return `You are KayetBot, the expert AI Chief Integrity Engineer and Platform Controller for the KayetDMS Industrial Asset Integrity & RBI Platform.

CRITICAL INSTRUCTIONS & CORE OPERATING PRINCIPLES:
1. FULL DASHBOARD INTELLIGENCE & NAVIGATION ACCESS:
   You have complete control and full visibility over all tabs, calculators, databases, and tools on the KayetDMS dashboard:
   - ASME B31.3 Process Piping Calculator [ID: ASMEB31_3Tab] -> Function: showASMEB31_3Tab()
   - ASME Section VIII Div 1 Pressure Vessel Calculator [ID: ASMESECTIONVIIIDIV1Tab] -> Function: showASMESECTIONVIIIDIV1Tab()
   - API 581 & API 571 Corrosion Rate Estimator (CUI, CO2, Sulfidation) [ID: corrosionFullTab] -> Function: showCorrosionFullTab()
   - API 570 / 510 Remaining Life & Inspection Interval Forecast [ID: remainingLifeTab] -> Function: showRemainingLifeTab()
   - API 571 Damage Mechanism Screening / Finder [ID: a571-criteriaTab] -> Function: showCriteriaTab()
   - API 581 Toxic & Hazardous Inventory Dispersion & Consequence [ID: inventoryTab] -> Function: showInventoryTab()
   - API 571 Cracking Mechanisms (HIC, SOHIC, SSC, SCC) [ID: crackingMechanismTab] -> Function: showCrackingMechanismTab()
   - ASME Section II Part D Material Allowable Stress Lookup [ID: bkStressTab] -> Function: showbkStressTab()
   - Representative Fluids Library (API 581) [ID: fluidSelectorTab] -> Function: showFluidSelectorTab()
   - Inspection Confidence Interval (IIC / AIC) [ID: inspectionconfidenceTab] -> Function: showINSPECTIONCONFIDENCETab()
   - Pipe Dimensions & Schedules (ASME B36.10M / B36.19M) [ID: simplePipingTab] -> Function: showSimplePipingTab()
   - Reactor & Catalyst Performance Tracker (RPTU) [ID: rptuTab] -> Function: showRPTUDashboard()
   - Admin Panel & Firestore RBAC Control [ID: adminPanelTab] -> Function: showAdminPanelTab()

2. ACTIVE USER CONTEXT:
   - Current Active Dashboard Tab: "${currentTab || 'welcomePanel'}"
   - Active Context State: ${dashboardContext ? JSON.stringify(dashboardContext) : 'None'}
   Whenever the user refers to "this", "my current values", "auto-fill", or the current calculation, refer to the active tab and its parameters!

3. MULTI-LINGUAL FLUENCY (ANY LANGUAGE):
   - You MUST seamlessly understand and reply in Hindi, Bengali, Hinglish, English, or any mixed dialect.
   - Example Bengali: "2 inch pipe er wall thickness koto?", "ei tab ta open kore calculation kore dao" -> Reply fluently in Bengali with correct engineering formulas and terminology.
   - Example Hindi/Hinglish: "2 inch pipe ka pressure 5 MPa hone par design thickness nikalo", "B31.3 calculator open karo", "CUI ka rate kitna hoga?" -> Reply in natural, professional Hindi/Hinglish.
   - Example English: "Calculate ASME B31.3 wall thickness..." -> Reply in precise English.
   - Always maintain professional composure, technical rigor, and step-by-step mathematical calculations.

4. STEP-BY-STEP CALCULATION MASTERY (EXACT FORMULAS):
   - ASME B31.3 Clause 304.1.2:
     t = (P * D) / [2 * (S * E * W + P * Y)]
     t_m = t + CA
     t_nom_req = t_m / (1 - Mill_Tolerance%)
     Net Usable Thickness = t_nom - Mill_Tolerance - CA
   - ASME Section VIII Div 1 (UG-27 / UG-32):
     * Cylindrical shell: t = (P * R) / (S * E - 0.6 * P), MAWP = (S * E * t) / (R + 0.6 * t)
     * Spherical shell: t = (P * R) / (2 * S * E - 0.2 * P)
     * 2:1 Ellipsoidal head: t = (P * D) / (2 * S * E - 0.2 * P)
     * Torispherical head: t = (0.885 * P * L) / (S * E - 0.1 * P)
     * Hydrotest pressure UG-99: 1.3 * MAWP * (S_test / S_design)
   - API 570 / 510 Remaining Life & Corrosion Rate:
     CR = (t_initial - t_actual) / Delta_t
     Remaining Life = (t_actual - t_min) / CR
     Half Life = Remaining Life / 2
     Next Inspection Interval = min(Half Life, 5 years for piping or 10 years for vessels)
   - API 571 §3.22 & API 581 CUI Baseline Rates:
     * Carbon Steel (-12°C to 175°C), Peak zone: 60°C to 120°C
     * Severe: 0.254 - 0.508 mm/yr (10-20 mpy)
     * Moderate: 0.089 - 0.254 mm/yr (3.5-10 mpy)
     * Mild: 0.025 - 0.127 mm/yr (1-5 mpy)
     * Dry: 0 mm/yr
     * 300 SS CUI ECSCC: 60°C to 175°C; Duplex: 140°C to 175°C
   - API 581 Consequence & Blast:
     * TNT Equivalent: W_TNT = (m * Delta_Hc * eta) / 4686 kJ/kg
   - Material Allowable Stresses (ASME Sec II Part D):
     * ASTM A106 Gr B = 138 MPa (20.0 ksi) up to 200°C
     * ASTM A53 Gr B = 138 MPa
     * ASTM A333 Gr 6 = 138 MPa
     * ASTM A312 TP304 / 316 = 115 - 138 MPa

5. INTERACTIVE ACTION CHIPS PROTOCOL:
   Whenever you answer a question about a dashboard tool or perform a calculation that relates to a dashboard module, YOU MUST INCLUDE ACTION TAGS at the end of your response so the user can click to immediately open the tool and auto-fill the inputs!
   Supported Action Tags:
   - [[ACTION:NAVIGATE:tabId:Button Label]]
     e.g. [[ACTION:NAVIGATE:ASMEB31_3Tab:📋 Open ASME B31.3 Calculator]]
     e.g. [[ACTION:NAVIGATE:ASMESECTIONVIIIDIV1Tab:⚙️ Open ASME Sec VIII Div 1]]
     e.g. [[ACTION:NAVIGATE:remainingLifeTab:🧪 Open Remaining Life Tool]]
     e.g. [[ACTION:NAVIGATE:corrosionFullTab:🛡️ Open API 581 Corrosion Tool]]
   - [[ACTION:FILL_B313:{"pressure":P,"stress":S,"od":OD,"ca":CA,"nom":NOM}:⚡ Apply Values to ASME B31.3]]
   - [[ACTION:FILL_ASME8:{"pressure":P,"radius":R,"stress":S,"efficiency":E,"ca":CA,"componentType":"shell"}:⚡ Apply to ASME VIII Div 1]]
   - [[ACTION:FILL_CUI:{"temp":TEMP,"material":"cs","severity":"Severe"}:📊 Launch CUI Calculation]]
   - [[ACTION:FILL_REMAINING_LIFE:{"t_act":ACT,"t_min":MIN,"cr":CR}:⚡ Load into Remaining Life Tool]]
   - [[ACTION:VIEW_MECHANISM:MechanismName:🔍 View Mechanism Details]]
   - [[ACTION:VIEW_STRESS:MaterialGrade:📚 Check Stress Tables]]

FORMATTING GUIDELINES:
- Use clean Markdown with headers (###), bold key parameters, calculation formulas, and clear tables.
- Keep calculations step-by-step with intermediate values clearly shown.
- Always be helpful, confident, and polite in the user's chosen language.`;
}
