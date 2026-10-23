import XLSX from "xlsx";
import { getStressData } from "./database.js";
import databaseHandler from "./database.js";

/**
 * Linear temperature interpolation on master ASME / API 581 stress dataset
 */
export async function interpolateStress({ year, material, grade, thickness, temperatureC }) {
  if (!year || !material || !grade) {
    return {
      status: 400,
      body: {
        success: false,
        errorType: "missing_parameters",
        error: "Year, material, and grade are required for stress interpolation."
      }
    };
  }

  const temp = parseFloat(temperatureC);
  if (isNaN(temp)) {
    return {
      status: 400,
      body: {
        success: false,
        errorType: "missing_temperature",
        error: "Temperature in °C is required and must be a valid number."
      }
    };
  }

  const db = await getStressData();
  if (!db || Object.keys(db).length === 0) {
    return {
      status: 503,
      body: {
        success: false,
        errorType: "database_unavailable",
        error: "Allowable Stress database service is unavailable."
      }
    };
  }

  if (!db[year] || !db[year][material] || !db[year][material][grade]) {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "not_found",
        error: `No allowable stress dataset found for Year ${year}, Material ${material}, Grade ${grade}.`
      }
    };
  }

  let gradeData = db[year][material][grade];
  const thicknessKeys = Object.keys(gradeData).filter(k => k.includes("mm"));

  if (thicknessKeys.length > 0) {
    if (thickness && gradeData[thickness]) {
      gradeData = gradeData[thickness];
    } else {
      gradeData = gradeData[thicknessKeys[0]];
    }
  }

  if (!gradeData || typeof gradeData !== "object") {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "not_found",
        error: "No temperature points found for the selected specification."
      }
    };
  }

  const temps = Object.keys(gradeData)
    .map(t => parseFloat(t))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  if (temps.length === 0) {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "not_found",
        error: "No numeric temperature points available."
      }
    };
  }

  const minTemp = temps[0];
  const maxTemp = temps[temps.length - 1];

  if (temp < minTemp || temp > maxTemp) {
    return {
      status: 422,
      body: {
        success: false,
        errorType: "temp_out_of_range",
        error: `Temperature ${temp}°C is outside the available dataset range (${minTemp}°C to ${maxTemp}°C).`,
        minTemp,
        maxTemp
      }
    };
  }

  // Exact temperature match
  if (temps.includes(temp)) {
    const exact = gradeData[temp] || gradeData[String(temp)];
    if (exact) {
      return {
        status: 200,
        body: {
          success: true,
          interpolated: false,
          temperatureC: temp,
          stress: exact["Allowable Stress"] !== undefined ? exact["Allowable Stress"] : exact.stress,
          yield: exact.yield || 0,
          tensile: exact.tensile || 0,
          minTemp,
          maxTemp
        }
      };
    }
  }

  // Linear Interpolation between bracketing points
  let lower, upper;
  for (let i = 0; i < temps.length - 1; i++) {
    if (temps[i] <= temp && temp <= temps[i + 1]) {
      lower = temps[i];
      upper = temps[i + 1];
      break;
    }
  }

  if (lower === undefined || upper === undefined) {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "interpolation_failed",
        error: "Could not bracket temperature within data points."
      }
    };
  }

  const lowData = gradeData[lower] || gradeData[String(lower)];
  const highData = gradeData[upper] || gradeData[String(upper)];

  if (!lowData || !highData) {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "interpolation_failed",
        error: "Missing endpoint data points for temperature interpolation."
      }
    };
  }

  const lowStress = lowData["Allowable Stress"] !== undefined ? lowData["Allowable Stress"] : lowData.stress || 0;
  const highStress = highData["Allowable Stress"] !== undefined ? highData["Allowable Stress"] : highData.stress || 0;
  const lowYield = lowData.yield || 0;
  const highYield = highData.yield || 0;
  const lowTensile = lowData.tensile || 0;
  const highTensile = highData.tensile || 0;

  const ratio = (temp - lower) / (upper - lower);

  return {
    status: 200,
    body: {
      success: true,
      interpolated: true,
      temperatureC: temp,
      lowerBound: lower,
      upperBound: upper,
      stress: Number((lowStress + (highStress - lowStress) * ratio).toFixed(2)),
      yield: Number((lowYield + (highYield - lowYield) * ratio).toFixed(2)),
      tensile: Number((lowTensile + (highTensile - lowTensile) * ratio).toFixed(2)),
      minTemp,
      maxTemp
    }
  };
}

/**
 * Lightweight stress hierarchy (without bulky temperature point tables)
 */
export async function getStressMetadata() {
  const db = await getStressData();
  const years = Object.keys(db || {});
  const hierarchy = {};

  for (const y of years) {
    hierarchy[y] = {};
    const mats = db[y] || {};
    for (const m of Object.keys(mats)) {
      hierarchy[y][m] = {};
      const grades = mats[m] || {};
      for (const g of Object.keys(grades)) {
        const grObj = grades[g] || {};
        const keys = Object.keys(grObj);
        const thicknessList = keys.filter(k => k.includes("mm"));
        hierarchy[y][m][g] = {
          hasThickness: thicknessList.length > 0,
          thicknessList
        };
      }
    }
  }

  return { years, hierarchy };
}

/**
 * Generate standard ASME stress template file
 */
export async function generateStressTemplate(format = "xlsx") {
  const db = await getStressData();
  let sampleData = [];

  if (db && typeof db === "object" && Object.keys(db).length > 0) {
    const year = Object.keys(db)[0];
    const mats = db[year] || {};
    for (const mat of Object.keys(mats).slice(0, 2)) {
      const grades = mats[mat] || {};
      for (const gr of Object.keys(grades).slice(0, 2)) {
        const grObj = grades[gr] || {};
        const keys = Object.keys(grObj);
        const hasThk = keys.some(k => k.includes("mm"));
        if (hasThk) {
          for (const thk of keys) {
            const tempsObj = grObj[thk] || {};
            for (const [temp, valObj] of Object.entries(tempsObj).slice(0, 3)) {
              sampleData.push({
                Year: String(year),
                Material: mat,
                Grade: gr,
                Thickness: thk,
                "Temperature (°C)": parseFloat(temp),
                "Allowable Stress (MPa)": valObj["Allowable Stress"] || valObj.stress || 0,
                "Yield Strength (MPa)": valObj.yield || 0,
                "Tensile Strength (MPa)": valObj.tensile || 0,
                Remarks: "Cloud Master Dataset"
              });
            }
          }
        } else {
          for (const [temp, valObj] of Object.entries(grObj).slice(0, 3)) {
            sampleData.push({
              Year: String(year),
              Material: mat,
              Grade: gr,
              Thickness: "",
              "Temperature (°C)": parseFloat(temp),
              "Allowable Stress (MPa)": valObj["Allowable Stress"] || valObj.stress || 0,
              "Yield Strength (MPa)": valObj.yield || 0,
              "Tensile Strength (MPa)": valObj.tensile || 0,
              Remarks: "Cloud Master Dataset"
            });
          }
        }
      }
    }
  }

  if (sampleData.length === 0) {
    sampleData = [
      {
        Year: "2024",
        Material: "A106",
        Grade: "B",
        Thickness: "",
        "Temperature (°C)": 38,
        "Allowable Stress (MPa)": 137.9,
        "Yield Strength (MPa)": 241.32,
        "Tensile Strength (MPa)": 413.69,
        Remarks: "ASME B31.3 Table A-1 Template Schema"
      }
    ];
  }

  const instructions = [
    { "Column / Section": "Year", "Specification & Rules": "Code Edition Year (e.g. 1993, 2004, 2016, 2020, 2022, 2024). Required." },
    { "Column / Section": "Material", "Specification & Rules": "ASTM / ASME specification (e.g. A106, A53, A312, A333, API 5L, A516). Required." },
    { "Column / Section": "Grade", "Specification & Rules": "Material Grade (e.g. B, TP304L, TP316, TP321, 6, X52, 70). Required." },
    { "Column / Section": "Thickness", "Specification & Rules": "Thickness bracket (e.g. >10mm, ≤10mm). Leave blank if not thickness-dependent." },
    { "Column / Section": "Temperature (°C)", "Specification & Rules": "Temperature point in degrees Celsius (°C). Numeric value. Required." },
    { "Column / Section": "Allowable Stress (MPa)", "Specification & Rules": "Code basic allowable stress S in MPa. Numeric value. Required." },
    { "Column / Section": "Yield Strength (MPa)", "Specification & Rules": "Minimum specified yield strength Sy in MPa. Numeric value. Optional." },
    { "Column / Section": "Tensile Strength (MPa)", "Specification & Rules": "Minimum specified tensile strength Su in MPa. Numeric value. Optional." },
    { "Column / Section": "Remarks", "Specification & Rules": "Engineering references or notes. Optional." }
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(sampleData);
  const wsInst = XLSX.utils.json_to_sheet(instructions);

  wsData["!cols"] = [
    { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
    { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 35 }
  ];
  wsInst["!cols"] = [{ wch: 25 }, { wch: 80 }];

  XLSX.utils.book_append_sheet(wb, wsData, "Stress_Data");
  XLSX.utils.book_append_sheet(wb, wsInst, "Instructions");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(wsData);
    return {
      buffer: Buffer.from(csv, "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: "Stress_Value_Upload_Template.csv"
    };
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return {
    buffer: buf,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "Stress_Value_Upload_Template.xlsx"
  };
}

/**
 * Main Controller for /api/stress-data
 */
export default async function handler(req, res) {
  const path = req.path || "";
  const action = req.query?.action || req.body?.action || "";

  // 1. Interpolation endpoint
  if (path.endsWith("/interpolate") || action === "interpolate") {
    if (req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    }
    const params = req.method === "POST" ? (req.body || {}) : (req.query || {});
    const result = await interpolateStress({
      year: params.year,
      material: params.material,
      grade: params.grade,
      thickness: params.thickness,
      temperatureC: params.temperatureC !== undefined ? params.temperatureC : (params.temperature !== undefined ? params.temperature : params.temp)
    });
    return res.status(result.status).json(result.body);
  }

  // 2. Template download endpoint
  if (path.endsWith("/template") || action === "template") {
    const format = (req.query?.format || req.body?.format || "xlsx").toLowerCase();
    const template = await generateStressTemplate(format);
    res.setHeader("Content-Disposition", `attachment; filename="${template.filename}"`);
    res.setHeader("Content-Type", template.contentType);
    return res.status(200).send(template.buffer);
  }

  // 3. Metadata endpoint
  if (path.endsWith("/metadata") || action === "metadata") {
    const meta = await getStressMetadata();
    return res.status(200).json({ success: true, ...meta });
  }

  // 4. Default: delegate to databaseHandler for CRUD, sync, and full data
  return databaseHandler(req, res);
}
