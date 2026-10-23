/**
 * Backend Corrosion Rate Estimation Engine
 * Implements API 581 and API 571 quantitative corrosion rate calculation models:
 * - CUI (Corrosion Under Insulation)
 * - Alkaline Sour Water Corrosion (NH4HS & H2S pressure adjustment)
 * - Acid Sour Water Corrosion (API 581 Table 2.B.10.2M, Oxygen & Velocity factors)
 * - Sulfidation & Naphthenic Acid Corrosion (McConomy & modified curves, CS & SS without Mo)
 * - High-Temperature Oxidation (Multi-alloy temperature curves)
 * - Hydrochloric Acid (HCl) Corrosion (CS, SS, Nickel Alloys, Alloy B-2, Alloy 400)
 * - Sulfuric Acid (H2SO4) Corrosion (304 SS concentration & velocity matrix)
 * - CO2 Sweet Corrosion (de Waard-Milliams, Dew point Eq 2.B.25, Base rate Eq 2.B.26 & Glycol/Inhibitor mitigation)
 */

// ── 1. CUI Corrosion Table (API 581) ──
const CUI_TABLE = [
  { temp: -12, values: { Severe: 0, Moderate: 0, Mild: 0, Dry: 0 } },
  { temp: -8,  values: { Severe: 0.076, Moderate: 0.025, Mild: 0, Dry: 0 } },
  { temp: 6,   values: { Severe: 0.254, Moderate: 0.127, Mild: 0.076, Dry: 0.025 } },
  { temp: 32,  values: { Severe: 0.254, Moderate: 0.127, Mild: 0.076, Dry: 0.025 } },
  { temp: 71,  values: { Severe: 0.508, Moderate: 0.254, Mild: 0.127, Dry: 0.051 } },
  { temp: 107, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.025, Dry: 0.025 } },
  { temp: 135, values: { Severe: 0.254, Moderate: 0.051, Mild: 0.025, Dry: 0 } },
  { temp: 162, values: { Severe: 0.127, Moderate: 0.025, Mild: 0, Dry: 0 } },
  { temp: 176, values: { Severe: 0, Moderate: 0, Mild: 0, Dry: 0 } }
];

// ── 2. Acid Sour Water Corrosion Table (API Table 2.B.10.2M) ──
const ACID_SOUR_WATER_TABLE = {
  38: { "4.75": 0.03, "5.25": 0.02, "5.75": 0.01, "6.25": 0.01, "6.75": 0.01 },
  52: { "4.75": 0.08, "5.25": 0.05, "5.75": 0.04, "6.25": 0.03, "6.75": 0.01 },
  79: { "4.75": 0.13, "5.25": 0.08, "5.75": 0.05, "6.25": 0.04, "6.75": 0.02 },
  93: { "4.75": 0.18, "5.25": 0.10, "5.75": 0.08, "6.25": 0.05, "6.75": 0.03 }
};

// ── 3. Alkaline Sour Water Corrosion Table (wt% NH4HS vs velocity m/s) ──
const ALKALINE_SOUR_WATER_TABLE = {
  2:  [0.08, 0.10, 0.13, 0.20, 0.28],
  5:  [0.15, 0.23, 0.30, 0.38, 0.46],
  10: [0.51, 0.69, 0.89, 1.09, 1.27],
  15: [1.14, 1.78, 2.54, 3.81, 5.08]
};
const ALKALINE_VELOCITIES = [3.05, 4.57, 6.10, 7.62, 9.14];

// ── 4. Sulfidation Data Matrix ──
const SULFIDATION_CS_DATA = {
  0.2: {
    0.3:  [0.03, 0.08, 0.18, 0.38, 0.51, 0.89, 1.27, 1.52],
    0.65: [0.13, 0.38, 0.64, 0.89, 1.14, 1.40, 1.65, 1.91],
    1.5:  [0.51, 0.64, 0.89, 1.65, 3.05, 3.81, 4.57, 5.08],
    3.0:  [0.76, 1.02, 1.52, 3.05, 3.81, 4.06, 6.10, 6.10],
    4.0:  [1.02, 2.03, 2.54, 4.06, 4.57, 5.08, 7.11, 7.62]
  },
  0.4: {
    0.3:  [0.03, 0.10, 0.25, 0.51, 0.76, 1.27, 1.78, 2.03],
    0.65: [0.13, 0.25, 0.38, 0.64, 1.02, 1.52, 2.03, 2.29],
    1.5:  [0.20, 0.38, 0.64, 0.89, 1.27, 1.78, 2.29, 2.79],
    3.0:  [0.38, 0.64, 0.89, 1.52, 2.29, 3.05, 3.05, 3.30],
    4.0:  [0.51, 0.76, 1.27, 1.78, 2.29, 3.05, 3.56, 4.06]
  },
  0.6: {
    0.3:  [0.05, 0.13, 0.25, 0.38, 0.64, 1.02, 2.29, 2.54],
    0.65: [0.13, 0.25, 0.38, 0.76, 1.27, 2.03, 2.79, 3.30],
    1.5:  [0.25, 0.38, 0.76, 1.27, 2.03, 2.54, 3.30, 3.81],
    3.0:  [0.38, 0.76, 1.27, 2.03, 2.54, 3.05, 3.56, 4.06],
    4.0:  [0.64, 1.02, 1.52, 2.54, 3.05, 3.81, 4.57, 5.08]
  },
  1.5: {
    0.3:  [0.03, 0.13, 0.38, 0.76, 1.27, 2.03, 2.79, 3.30],
    0.65: [0.08, 0.25, 0.51, 0.89, 1.40, 2.54, 3.30, 3.81],
    1.5:  [0.38, 0.51, 0.89, 1.40, 2.54, 3.05, 3.81, 4.32],
    3.0:  [0.51, 0.76, 1.40, 2.16, 2.79, 3.81, 4.32, 5.08],
    4.0:  [0.76, 1.52, 2.29, 3.05, 3.81, 5.08, 5.08, 6.60]
  },
  2.5: {
    0.3:  [0.05, 0.18, 0.51, 0.89, 1.40, 2.41, 3.30, 3.81],
    0.65: [0.13, 0.25, 0.76, 1.14, 1.52, 2.54, 3.56, 4.06],
    1.5:  [0.38, 0.51, 1.02, 1.52, 1.91, 3.05, 4.32, 5.08],
    3.0:  [0.51, 0.89, 1.52, 2.29, 3.05, 4.32, 5.08, 6.60],
    4.0:  [0.89, 1.27, 2.29, 3.05, 3.81, 5.08, 6.60, 7.11]
  },
  3.0: {
    0.3:  [0.05, 0.20, 0.51, 1.02, 1.52, 2.54, 3.56, 4.06],
    0.65: [0.20, 0.38, 0.64, 1.14, 1.52, 2.54, 3.81, 4.32],
    1.5:  [0.38, 0.64, 0.89, 1.65, 3.05, 3.81, 4.57, 5.08],
    3.0:  [0.76, 1.52, 2.03, 3.05, 3.81, 4.32, 6.10, 6.10],
    4.0:  [1.02, 2.03, 2.54, 4.06, 4.57, 5.08, 7.11, 7.62]
  }
};

const SULFIDATION_SS_DATA = {
  0.2: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    3.0: [0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.10, 0.10],
    4.0: [0.03, 0.03, 0.03, 0.05, 0.08, 0.10, 0.13, 0.15]
  },
  0.4: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.10, 0.03],
    3.0: [0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.10, 0.10],
    4.0: [0.03, 0.03, 0.05, 0.05, 0.08, 0.10, 0.13, 0.15]
  },
  0.8: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    3.0: [0.03, 0.03, 0.03, 0.05, 0.08, 0.10, 0.13, 0.15],
    4.0: [0.03, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30]
  },
  1.5: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    3.0: [0.03, 0.03, 0.03, 0.05, 0.08, 0.10, 0.13, 0.15],
    4.0: [0.03, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30]
  },
  2.5: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    3.0: [0.03, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
    4.0: [0.03, 0.05, 0.10, 0.18, 0.25, 0.36, 0.43, 0.51]
  },
  3.0: {
    1.0: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05],
    1.5: [0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.05, 0.05],
    3.0: [0.03, 0.05, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30],
    4.0: [0.03, 0.05, 0.10, 0.18, 0.25, 0.36, 0.43, 0.51]
  }
};
const SULFIDATION_TEMP_RANGES = [232, 260, 288, 315, 343, 371, 399, Infinity];

// ── 5. High-Temperature Oxidation Data Matrix ──
const OXIDATION_DATA = {
  "CS":        [0.05, 0.10, 0.15, 0.23, 0.36, 0.56, 0.84, 1.22, null, null, null, null],
  "1.25Cr":    [0.05, 0.08, 0.10, 0.18, 0.30, 0.46, 0.76, 1.17, null, null, null, null],
  "2.25Cr":    [0.03, 0.03, 0.05, 0.10, 0.23, 0.36, 0.61, 1.04, null, null, null, null],
  "5Cr":       [0.03, 0.03, 0.03, 0.05, 0.10, 0.15, 0.38, 0.89, 1.65, null, null, null],
  "7Cr":       [0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.15, 0.43, 0.94, 1.52, null],
  "9Cr":       [0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.13, 0.28, 0.58, 1.02, null],
  "12Cr":      [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.20, 0.38, 0.76, null],
  "304 SS":    [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.10, null],
  "309 SS":    [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05, 0.08, 0.08, null],
  "310 SS/HK": [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05, null],
  "800 H/HP":  [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.05, null]
};
const OXIDATION_TEMP_POINTS = [496, 524, 552, 579, 607, 635, 663, 691, 718, 746, 774, 802];

// ── 6. HCl Corrosion Tables ──
const HCL_TEMP_POINTS = [38, 52, 79, 93];
const HCL_CS_TABLE = {
  0.5:  [25.37, 25.37, 25.37, 25.37],
  0.8:  [22.86, 25.37, 25.37, 25.37],
  1.25: [10.16, 25.37, 25.37, 25.37],
  1.75: [5.08, 17.78, 25.37, 25.37],
  2.25: [2.54, 7.62, 10.16, 14.22],
  2.75: [1.52, 3.30, 5.08, 7.11],
  3.25: [1.02, 1.78, 2.54, 3.56],
  3.75: [0.76, 1.27, 2.29, 3.18],
  4.25: [0.51, 1.02, 1.78, 2.54],
  4.75: [0.25, 0.76, 1.27, 1.78],
  5.25: [0.18, 0.51, 0.76, 1.02],
  5.75: [0.10, 0.38, 0.51, 0.76],
  6.25: [0.08, 0.25, 0.38, 0.51],
  6.8:  [0.05, 0.13, 0.18, 0.25]
};
const HCL_SS_TABLE = {
  0.5:  [22.86, 25.37, 25.37, 25.37],
  0.8:  [12.70, 25.37, 25.37, 25.37],
  1.25: [7.62, 12.70, 17.78, 25.37],
  1.75: [3.81, 6.60, 10.16, 12.70],
  2.25: [2.03, 3.56, 5.08, 6.35],
  2.75: [1.27, 1.78, 2.54, 3.05],
  3.25: [0.76, 1.02, 1.27, 1.65],
  3.75: [0.51, 0.64, 0.76, 0.89],
  4.25: [0.25, 0.38, 0.51, 0.64],
  4.75: [0.13, 0.18, 0.25, 0.30],
  5.25: [0.10, 0.13, 0.15, 0.18],
  5.75: [0.08, 0.10, 0.13, 0.15],
  6.25: [0.05, 0.08, 0.10, 0.13],
  6.8:  [0.03, 0.05, 0.08, 0.10]
};
const HCL_ALLOY_TABLE = {
  "Alloy 20": {
    0.5:  [0.03, 0.08, 1.02, 5.08],
    0.75: [0.05, 0.13, 2.03, 10.16],
    1.0:  [0.25, 1.78, 7.62, 25.37]
  },
  "Alloy 825": {
    0.5:  [0.03, 0.08, 1.02, 5.08],
    0.75: [0.05, 0.13, 2.03, 10.16],
    1.0:  [0.25, 1.78, 7.62, 25.37]
  },
  "Alloy 625": {
    0.5:  [0.03, 0.05, 0.38, 1.91],
    0.75: [0.03, 0.13, 0.64, 3.18],
    1.0:  [0.05, 0.13, 0.85, 10.16]
  },
  "Alloy C-276": {
    0.5:  [0.03, 0.05, 0.20, 0.76],
    0.75: [0.03, 0.05, 0.38, 1.91],
    1.0:  [0.05, 0.25, 1.52, 7.62]
  }
};
const HCL_OXIDANT_TABLE = {
  "Alloy B-2": {
    No: {
      0.5:  [0.03, 0.03, 0.05, 0.10],
      0.75: [0.03, 0.03, 0.13, 0.51],
      1.0:  [0.05, 0.13, 0.25, 0.64]
    },
    Yes: {
      0.5:  [0.10, 0.10, 0.20, 0.41],
      0.75: [0.10, 0.10, 0.51, 2.03],
      1.0:  [0.20, 0.51, 1.02, 2.54]
    }
  },
  "Alloy 400": {
    No: {
      0.5:  [0.03, 0.08, 0.76, 7.62],
      0.75: [0.05, 0.13, 2.03, 20.32],
      1.0:  [0.48, 0.64, 3.81, 22.86]
    },
    Yes: {
      0.5:  [0.10, 0.30, 3.05, 25.37],
      0.75: [0.25, 0.51, 8.13, 25.37],
      1.0:  [1.02, 2.54, 15.24, 25.37]
    }
  }
};

// ── 7. H2SO4 Corrosion Table (304 SS) ──
const H2SO4_304SS_TABLE = {
  30: {
    98:   [0.13, 0.25, 0.38],
    92.5: [0.51, 1.02, 1.52],
    87:   [1.02, 2.03, 3.05],
    82:   [2.54, 5.08, 7.62],
    75:   [12.7, 25.37, 25.37],
    65:   [25.37, 25.37, 25.37],
    50:   [25.37, 25.37, 25.37],
    30:   [25.37, 25.37, 25.37],
    15:   [10.16, 20.32, 25.37],
    8:    [5.08, 10.16, 15.24],
    3.5:  [1.27, 2.54, 3.81],
    2:    [0.51, 1.02, 1.52]
  },
  40: {
    98:   [0.51, 1.02, 1.52],
    92.5: [1.02, 2.03, 3.05],
    87:   [2.03, 4.06, 6.10],
    82:   [5.08, 7.62, 25.37],
    75:   [25.37, 25.37, 2.51],
    65:   [25.37, 25.37, 25.37],
    50:   [25.37, 25.37, 25.37],
    30:   [25.37, 25.37, 25.37],
    15:   [25.37, 25.37, 25.37],
    8:    [10.16, 15.24, 25.37],
    3.5:  [2.54, 3.81, 5.33],
    2:    [1.02, 1.52, 1.78]
  },
  60: {
    98:   [5.08, 10.16, 15.24],
    92.5: [12.7, 25.37, 25.37],
    87:   [25.37, 25.37, 25.37],
    82:   [25.37, 25.37, 25.37],
    75:   [25.37, 25.37, 25.37],
    65:   [25.37, 25.37, 25.37],
    50:   [25.37, 25.37, 25.37],
    30:   [25.37, 25.37, 25.37],
    15:   [25.37, 25.37, 25.37],
    8:    [12.7, 25.37, 25.37],
    3.5:  [3.56, 5.33, 6.60],
    2:    [1.52, 2.03, 2.54]
  }
};

// ── Math Helpers ──
function linearInterpolate(x, xPoints, yValues) {
  if (x <= xPoints[0]) return yValues[0];
  if (x >= xPoints[xPoints.length - 1]) return yValues[yValues.length - 1];
  for (let i = 0; i < xPoints.length - 1; i++) {
    const x1 = xPoints[i], x2 = xPoints[i + 1];
    const y1 = yValues[i], y2 = yValues[i + 1];
    if (y1 === null || y2 === null) return null;
    if (x >= x1 && x <= x2) {
      return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
    }
  }
  return yValues[yValues.length - 1];
}

function findClosestNumber(val, array) {
  return array.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
}

function estimatePhFromClWppm(clppm) {
  if (clppm >= 3601) return 0.5;
  if (clppm >= 1201) return 1.0;
  if (clppm >= 361) return 1.5;
  if (clppm >= 121) return 2.0;
  if (clppm >= 36) return 2.5;
  if (clppm >= 16) return 3.0;
  if (clppm >= 6) return 3.5;
  if (clppm >= 3) return 4.0;
  if (clppm >= 1) return 4.5;
  return 5.0;
}

export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const payload = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const mechanism = payload.mechanism || payload.type || "";

    // ── 1. CUI Calculation ──
    if (mechanism === "cui") {
      const material = (payload.material || "cs").toLowerCase();
      const temp = parseFloat(payload.temp);
      const insulated = payload.insulated === "Yes" || payload.insulated === true;
      const exposed = payload.exposed === "Yes" || payload.exposed === true;
      const severity = payload.severity || "Moderate";

      if (isNaN(temp)) {
        return res.status(400).json({ success: false, message: "Valid temperature is required for CUI calculation." });
      }

      let minTemp = -12, maxTemp = 175;
      if (material === "ss300") minTemp = 60;
      else if (material === "duplex") minTemp = 140;

      if (temp < minTemp || temp > maxTemp) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: 0,
          message: `For selected material, valid CUI temperature range is ${minTemp}°C to ${maxTemp}°C.`
        });
      }

      if (!insulated || !exposed) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: 0,
          message: "CUI requires insulation AND moisture exposure."
        });
      }

      if (temp > 176) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: 0,
          message: "Not Susceptible to CUI above 176°C."
        });
      }

      const closest = CUI_TABLE.reduce((prev, curr) =>
        Math.abs(curr.temp - temp) < Math.abs(prev.temp - temp) ? curr : prev
      );
      const rate = closest.values[severity] ?? 0;
      const labels = CUI_TABLE.map(row => `${row.temp}°C`);
      const rates = CUI_TABLE.map(row => row.values[severity]);

      return res.status(200).json({
        success: true,
        applicable: true,
        rate: Number(rate.toFixed(3)),
        temperature: closest.temp,
        severity,
        message: `Estimated Corrosion Rate: ${rate} mm/year at ${closest.temp}°C [${severity}]`,
        chartData: { labels, rates }
      });
    }

    // ── 2. Alkaline Sour Water Corrosion (NH4HS) ──
    if (mechanism === "Alkaline Sour Water Corrosion") {
      const nh4hs = parseFloat(payload.nh4hs);
      const velocity = parseFloat(payload.velocity);
      const pressureKnown = payload.pressureKnown === "Yes" || payload.pressureKnown === true;
      const h2sPressure = parseFloat(payload.h2sPressure);

      if (isNaN(nh4hs) || isNaN(velocity)) {
        return res.status(400).json({ success: false, message: "Valid NH4HS concentration and velocity are required." });
      }

      const nh4hsKey = Object.keys(ALKALINE_SOUR_WATER_TABLE).find(k => Math.abs(nh4hs - parseFloat(k)) < 0.5);
      if (!nh4hsKey) {
        return res.status(400).json({ success: false, message: "Invalid NH4HS wt% input (choose 2, 5, 10, or 15)." });
      }

      const vIndex = ALKALINE_VELOCITIES.findIndex(v => Math.abs(v - velocity) < 0.1);
      if (vIndex === -1) {
        return res.status(400).json({ success: false, message: "Invalid velocity (choose 3.05, 4.57, 6.10, 7.62, 9.14 m/s)." });
      }

      const baseCR = ALKALINE_SOUR_WATER_TABLE[nh4hsKey][vIndex];
      let adjustedCR = baseCR;

      if (pressureKnown && !isNaN(h2sPressure)) {
        const diff = h2sPressure - 3.51;
        if (h2sPressure < 3.51) {
          adjustedCR = Math.max(((baseCR / 1.76) * diff) + baseCR, 0);
        } else {
          adjustedCR = Math.max(((baseCR / 2.81) * diff) + baseCR, 0);
        }

        return res.status(200).json({
          success: true,
          baseRate: Number(baseCR.toFixed(3)),
          adjustedRate: Number(adjustedCR.toFixed(3)),
          rate: Number(adjustedCR.toFixed(3)),
          message: `Estimated Corrosion Rate: ${adjustedCR.toFixed(3)} mm/year (NH₄HS ${nh4hs} wt%, Velocity ${velocity} m/s, H₂S ${h2sPressure} kg/cm²)`,
          chartData: {
            labels: ["Baseline", "Adjusted (H₂S)"],
            rates: [Number(baseCR.toFixed(3)), Number(adjustedCR.toFixed(3))]
          }
        });
      }

      return res.status(200).json({
        success: true,
        baseRate: Number(baseCR.toFixed(3)),
        rate: Number(baseCR.toFixed(3)),
        message: `Baseline Corrosion Rate: ${baseCR.toFixed(3)} mm/year (NH₄HS ${nh4hs} wt%, Velocity ${velocity} m/s, No H₂S adjustment)`,
        chartData: {
          labels: ["Baseline"],
          rates: [Number(baseCR.toFixed(3))]
        }
      });
    }

    // ── 3. Acid Sour Water Corrosion ──
    if (mechanism === "Acid Sour Water Corrosion") {
      const h2o = String(payload.h2o || payload.h2oPresentASW || "").toLowerCase();
      if (h2o === "no") {
        return res.status(200).json({
          success: true,
          rate: 0,
          message: "Estimated Corrosion Rate: 0 mm/y (No H₂O Present)"
        });
      }

      const temp = payload.temp || payload.tempASW;
      const ph = payload.ph || payload.phFinalASW;
      const oxygen = parseFloat(payload.oxygen || payload.oxygenASW) || 0;
      const velocity = parseFloat(payload.velocity || payload.velocityASW) || 0;

      const base = ACID_SOUR_WATER_TABLE[temp]?.[ph];
      if (!base) {
        return res.status(400).json({ success: false, message: "Invalid Temperature or pH combination for API Table 2.B.10.2M." });
      }

      const oxygenFactor = oxygen > 50 ? 2.0 : 1.0;
      const velocityFactor = 1 + 0.1 * velocity;
      const finalRate = base * oxygenFactor * velocityFactor;

      return res.status(200).json({
        success: true,
        baseRate: Number(base.toFixed(3)),
        finalRate: Number(finalRate.toFixed(3)),
        rate: Number(finalRate.toFixed(3)),
        oxygenFactor,
        velocityFactor: Number(velocityFactor.toFixed(2)),
        temperature: temp,
        ph,
        message: `Final Estimated Corrosion Rate: ${finalRate.toFixed(3)} mm/year (Base: ${base} mm/y, O2 factor: ${oxygenFactor}, Velocity factor: ${velocityFactor.toFixed(2)})`,
        chartData: {
          labels: ["Base Rate", "Adjusted Rate"],
          rates: [Number(base.toFixed(3)), Number(finalRate.toFixed(3))]
        }
      });
    }

    // ── 4. Sulfidation & Naphthenic Acid Corrosion ──
    if (mechanism === "sulfidation") {
      const temp = parseFloat(payload.temp || payload.tempSulf);
      const sulfur = parseFloat(payload.sulfur || payload.sulfurSulf);
      const tan = parseFloat(payload.tan || payload.tanSulf);
      const material = (payload.material || payload.materialSulf || "CS").toUpperCase();

      if (isNaN(temp) || isNaN(sulfur) || isNaN(tan)) {
        return res.status(400).json({ success: false, message: "Valid temperature, sulfur %, and TAN are required." });
      }

      if (temp < 232 || temp > 399) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: 0,
          message: "Not Susceptible to Sulfidation at this temperature (<232°C or >399°C)."
        });
      }

      const dataSource = material === "CS" ? SULFIDATION_CS_DATA : SULFIDATION_SS_DATA;
      const sulfurKey = Object.keys(dataSource).find(s => Math.abs(parseFloat(s) - sulfur) < 0.11);
      const tanKey = sulfurKey && Object.keys(dataSource[sulfurKey]).find(t => Math.abs(parseFloat(t) - tan) < 0.11);

      if (!sulfurKey || !tanKey) {
        return res.status(400).json({ success: false, message: "Invalid combination of Sulfur % and TAN value for selected material." });
      }

      const selectedRates = dataSource[sulfurKey][tanKey];
      const corrosionRate = linearInterpolate(temp, SULFIDATION_TEMP_RANGES, selectedRates);

      return res.status(200).json({
        success: true,
        applicable: true,
        rate: Number(corrosionRate.toFixed(3)),
        temperature: temp,
        sulfur,
        tan,
        material: material === "CS" ? "Carbon Steel / 12%Cr" : "Austenitic SS without Mo",
        message: `Estimated Corrosion Rate: ${corrosionRate.toFixed(3)} mm/year at ${temp}°C (${material === "CS" ? "Carbon Steel / 12%Cr" : "Austenitic SS without Mo"}, Sulfur: ${sulfur}%, TAN: ${tan})`,
        chartData: {
          labels: [`TAN ${tan} @ ${temp}°C`],
          rates: [Number(corrosionRate.toFixed(3))]
        }
      });
    }

    // ── 5. High-Temperature Oxidation ──
    if (mechanism === "oxidation") {
      const material = payload.material || payload.materialOxidation || "CS";
      const temp = parseFloat(payload.temp || payload.tempOxidation);

      if (!material || isNaN(temp)) {
        return res.status(400).json({ success: false, message: "Material and temperature are required for Oxidation calculation." });
      }

      const rates = OXIDATION_DATA[material];
      if (!rates) {
        return res.status(400).json({ success: false, message: `Unsupported oxidation material: ${material}` });
      }

      const estimatedRate = linearInterpolate(temp, OXIDATION_TEMP_POINTS, rates);
      if (estimatedRate === null || isNaN(estimatedRate)) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: null,
          message: `Temperature out of range or data unavailable for ${material} at ${temp}°C.`
        });
      }

      return res.status(200).json({
        success: true,
        applicable: true,
        rate: Number(estimatedRate.toFixed(3)),
        material,
        temperature: temp,
        message: `Estimated Corrosion Rate: ${estimatedRate.toFixed(3)} mm/year at ${temp}°C for ${material}`,
        chartData: {
          labels: ["Oxidation Rate"],
          rates: [Number(estimatedRate.toFixed(3))]
        }
      });
    }

    // ── 6. HCl Corrosion ──
    if (mechanism === "HCl Corrosion") {
      const material = payload.material || payload.materialHCl;
      const temp = parseFloat(payload.temp || payload.tempHCl);

      if (!material || isNaN(temp)) {
        return res.status(400).json({ success: false, message: "Material and temperature are required." });
      }

      let ph = parseFloat(payload.ph || payload.phHCl);
      if (isNaN(ph) && payload.clwppmHCl) {
        ph = estimatePhFromClWppm(parseFloat(payload.clwppmHCl));
      }

      let cl = parseFloat(payload.cl || payload.clHCl);
      let oxid = payload.oxid || payload.oxidHCl || "No";

      let rate = null;

      if (material === "Carbon Steel") {
        const phVal = findClosestNumber(ph, Object.keys(HCL_CS_TABLE).map(Number));
        rate = linearInterpolate(temp, HCL_TEMP_POINTS, HCL_CS_TABLE[phVal]);
      } else if (material === "300 Series SS") {
        const phVal = findClosestNumber(ph, Object.keys(HCL_SS_TABLE).map(Number));
        rate = linearInterpolate(temp, HCL_TEMP_POINTS, HCL_SS_TABLE[phVal]);
      } else if (HCL_ALLOY_TABLE[material]) {
        const clVal = findClosestNumber(cl, [0.5, 0.75, 1.0]);
        rate = linearInterpolate(temp, HCL_TEMP_POINTS, HCL_ALLOY_TABLE[material][clVal]);
      } else if (HCL_OXIDANT_TABLE[material]) {
        const clVal = findClosestNumber(cl, [0.5, 0.75, 1.0]);
        const oxidTable = HCL_OXIDANT_TABLE[material][oxid] || HCL_OXIDANT_TABLE[material]["No"];
        rate = linearInterpolate(temp, HCL_TEMP_POINTS, oxidTable[clVal]);
      }

      if (rate === null || isNaN(rate)) {
        return res.status(400).json({ success: false, message: "Corrosion rate not available for selected HCl parameters." });
      }

      return res.status(200).json({
        success: true,
        rate: Number(rate.toFixed(2)),
        material,
        temperature: temp,
        message: `Estimated Corrosion Rate: ${rate.toFixed(2)} mm/year (${material} @ ${temp}°C)`,
        chartData: {
          labels: ["HCl Corrosion Rate"],
          rates: [Number(rate.toFixed(2))]
        }
      });
    }

    // ── 7. H2SO4 Corrosion ──
    if (mechanism === "H2SO4 Corrosion") {
      const material = payload.material || payload.materialH2SO4 || "304 SS";
      const temp = parseInt(payload.temp || payload.tempH2SO4, 10);
      const conc = parseFloat(payload.conc || payload.concH2SO4);
      const velocityRange = String(payload.velocityRange || payload.velH2SO4 || "<1");

      if (material !== "304 SS") {
        return res.status(400).json({ success: false, message: "Only 304 SS is currently modeled for H2SO4 corrosion." });
      }

      const row = H2SO4_304SS_TABLE[temp];
      if (!row || !row[conc]) {
        return res.status(400).json({ success: false, message: "No H2SO4 corrosion data for selected temp/concentration." });
      }

      let velIndex = 0;
      if (velocityRange === "1–2.5" || velocityRange === "1-2.5" || velocityRange === "1.83") velIndex = 1;
      else if (velocityRange === "2.5–5" || velocityRange === "2.5-5" || velocityRange === "2.13") velIndex = 2;

      const rate = row[conc][velIndex];

      return res.status(200).json({
        success: true,
        rate: Number(rate.toFixed(2)),
        allRates: row[conc],
        message: `Estimated Corrosion Rate: ${rate.toFixed(2)} mm/year (304 SS at ${temp}°C, ${conc}% H₂SO₄, ${velocityRange} m/s)`,
        chartData: {
          labels: ["<1 m/s", "1–2.5 m/s", "2.5–5 m/s"],
          rates: row[conc]
        }
      });
    }

    // ── 8. CO2 Sweet Corrosion ──
    if (mechanism === "co2" || mechanism === "co2_dew_point" || mechanism === "co2_corrosion") {
      const action = payload.action || "corrosion";

      if (action === "dew_point") {
        const totalPressure = parseFloat(payload.totalPressure || payload.P);
        if (isNaN(totalPressure) || totalPressure <= 0) {
          return res.status(400).json({ success: false, message: "Valid total pressure (bar) is required." });
        }
        const dewPoint = 114.27 - 12.5 * Math.log10(totalPressure);
        return res.status(200).json({
          success: true,
          dewPoint: Number(dewPoint.toFixed(2)),
          totalPressure,
          message: `Dew Point Temp = ${dewPoint.toFixed(2)} °C`
        });
      }

      const temp = parseFloat(payload.temp || payload.tempCO2);
      const ph = parseFloat(payload.ph || payload.phCO2);
      const pco2 = parseFloat(payload.pco2 || payload.pco2CO2);
      const shear = parseFloat(payload.shear || payload.shearCO2);
      const dewPoint = parseFloat(payload.dewPoint || payload.dew);

      if ([temp, ph, pco2, shear].some(v => isNaN(v))) {
        return res.status(400).json({ success: false, message: "Please provide temperature, pH, pCO2, and shear stress." });
      }

      if (!isNaN(dewPoint) && temp > dewPoint) {
        return res.status(200).json({
          success: true,
          applicable: false,
          rate: 0,
          dewPoint,
          message: `No CO₂ corrosion — Operating Temp (${temp}°C) exceeds Dew Point (${dewPoint.toFixed(2)}°C).`
        });
      }

      // Base Corrosion Rate (Eq 2.B.26)
      const f_TpH = Math.pow((0.6 + (temp - 20) * 0.01 - (ph - 5) * 0.05), 0.52);
      const exponent = 0.146 + 0.0324 * (shear / 19);
      const f_CO2 = Math.pow(pco2, exponent);
      const baseRate = f_TpH * f_CO2;

      // Check mitigation
      const hasMitigation = payload.hasGlycolOrInhibitor === "Yes" || payload.glycol !== undefined || payload.inhibitor !== undefined;
      let finalRate = baseRate;
      let fGlycol = 1.0;

      if (hasMitigation) {
        const glycol = parseFloat(payload.glycol ?? 0);
        const inhibitor = parseFloat(payload.inhibitor ?? 1.0);
        fGlycol = Math.pow(10, 1.6 * (Math.log10(100 - Math.max(glycol, 0.01)) - 2));
        finalRate = baseRate * Math.min(fGlycol, inhibitor);
      }

      return res.status(200).json({
        success: true,
        applicable: true,
        baseRate: Number(baseRate.toFixed(3)),
        finalRate: Number(finalRate.toFixed(3)),
        rate: Number(finalRate.toFixed(3)),
        dewPoint: !isNaN(dewPoint) ? Number(dewPoint.toFixed(2)) : null,
        message: `Final Adjusted CO2 Rate: ${finalRate.toFixed(3)} mm/year (Base: ${baseRate.toFixed(3)} mm/year)`,
        chartData: {
          labels: ["Base Rate", "Final (After Mitigation)"],
          rates: [Number(baseRate.toFixed(3)), Number(finalRate.toFixed(3))]
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: `Unknown corrosion mechanism requested: ${mechanism}`
    });
  } catch (err) {
    console.error("[Corrosion Rate API Error]:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message || String(err)
    });
  }
}
