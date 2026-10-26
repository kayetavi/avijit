import XLSX from "xlsx";
import { getStressData } from "./database.js";
import databaseHandler from "./database.js";

/**
 * Resolve year, material, grade, and thickness node from stress database with exact or case-insensitive matching
 */
function resolveStressNode(db, { year, material, grade, thickness }) {
  if (!db || typeof db !== "object") return { error: "Database empty" };
  const years = Object.keys(db);
  if (years.length === 0) return { error: "Database empty" };

  const targetYear = year
    ? years.find(y => String(y).trim() === String(year).trim())
    : (years.includes("2020") ? "2020" : years[years.length - 1]);

  if (!targetYear || !db[targetYear]) {
    return { error: `No allowable stress dataset found for Year ${year}.` };
  }

  const yearData = db[targetYear];
  if (!material) {
    return { year: targetYear, yearData };
  }

  const matClean = String(material).trim().toLowerCase();
  const actualMat = Object.keys(yearData).find(
    m => m.trim().toLowerCase() === matClean ||
         m.trim().toLowerCase().includes(matClean) ||
         matClean.includes(m.trim().toLowerCase())
  );

  if (!actualMat || !yearData[actualMat]) {
    return { error: `No allowable stress dataset found for Year ${targetYear}, Material ${material}.` };
  }

  const matData = yearData[actualMat];
  if (!grade) {
    return { year: targetYear, material: actualMat, matData };
  }

  const gradeClean = String(grade).trim().toLowerCase();
  const actualGrade = Object.keys(matData).find(
    g => g.trim().toLowerCase() === gradeClean ||
         g.trim().toLowerCase().includes(gradeClean) ||
         gradeClean.includes(g.trim().toLowerCase())
  );

  if (!actualGrade || !matData[actualGrade]) {
    return { error: `No allowable stress dataset found for Year ${targetYear}, Material ${actualMat}, Grade ${grade}.` };
  }

  let gradeData = matData[actualGrade];
  const thicknessKeys = Object.keys(gradeData).filter(k => k.includes("mm"));
  let resolvedThickness = "";

  if (thicknessKeys.length > 0) {
    const cleanTh = (!thickness || thickness === "__NOT_REQUIRED__") ? "" : String(thickness).trim();
    if (cleanTh && gradeData[cleanTh]) {
      resolvedThickness = cleanTh;
      gradeData = gradeData[cleanTh];
    } else if (cleanTh) {
      const matchTh = thicknessKeys.find(
        tk => tk.toLowerCase().includes(cleanTh.toLowerCase()) || cleanTh.toLowerCase().includes(tk.toLowerCase())
      );
      resolvedThickness = matchTh || thicknessKeys[0];
      gradeData = gradeData[resolvedThickness];
    } else {
      resolvedThickness = thicknessKeys[0];
      gradeData = gradeData[resolvedThickness];
    }
  }

  return {
    year: targetYear,
    material: actualMat,
    grade: actualGrade,
    thickness: resolvedThickness,
    gradeData
  };
}

/**
 * Linear temperature interpolation on master ASME / API 581 stress dataset
 */
export async function interpolateStress({ year, material, grade, thickness, temperatureC, temperatureF }) {
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

  let temp = parseFloat(temperatureC);
  if (isNaN(temp) && temperatureF !== undefined && temperatureF !== null && temperatureF !== "") {
    const tf = parseFloat(temperatureF);
    if (!isNaN(tf)) {
      temp = Number((((tf - 32) * 5) / 9).toFixed(2));
    }
  }

  if (isNaN(temp)) {
    return {
      status: 400,
      body: {
        success: false,
        errorType: "missing_temperature",
        error: "Temperature in °C (or °F) is required and must be a valid number."
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

  const resolved = resolveStressNode(db, { year, material, grade, thickness });
  if (resolved.error || !resolved.gradeData || typeof resolved.gradeData !== "object") {
    return {
      status: 404,
      body: {
        success: false,
        errorType: "not_found",
        error: resolved.error || `No allowable stress dataset found for Year ${year}, Material ${material}, Grade ${grade}.`
      }
    };
  }

  const { gradeData } = resolved;

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

  const minTemp = Number(temps[0]);
  const maxTemp = Number(temps[temps.length - 1]);
  const tempF = Number(((temp * 9) / 5 + 32).toFixed(1));

  if (temp < minTemp || temp > maxTemp) {
    return {
      status: 422,
      body: {
        success: false,
        errorType: "temp_out_of_range",
        error: `Temperature ${temp}°C (${tempF}°F) is outside the available dataset range (${minTemp}°C to ${maxTemp}°C).`,
        minTemp,
        maxTemp,
        minTempF: Number(((minTemp * 9) / 5 + 32).toFixed(1)),
        maxTempF: Number(((maxTemp * 9) / 5 + 32).toFixed(1))
      }
    };
  }

  // Exact temperature match
  if (temps.includes(temp)) {
    const exact = gradeData[temp] || gradeData[String(temp)];
    if (exact) {
      const exactStress = Number(exact["Allowable Stress"] !== undefined ? exact["Allowable Stress"] : exact.stress || 0);
      return {
        status: 200,
        body: {
          success: true,
          interpolated: false,
          year: resolved.year,
          material: resolved.material,
          grade: resolved.grade,
          thickness: resolved.thickness || "",
          temperatureC: Number(temp),
          temperatureF: tempF,
          stress: Number(exactStress.toFixed(2)),
          yield: Number((Number(exact.yield || 0)).toFixed(2)),
          tensile: Number((Number(exact.tensile || 0)).toFixed(2)),
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

  const lowStress = Number(lowData["Allowable Stress"] !== undefined ? lowData["Allowable Stress"] : lowData.stress || 0);
  const highStress = Number(highData["Allowable Stress"] !== undefined ? highData["Allowable Stress"] : highData.stress || 0);
  const lowYield = Number(lowData.yield || 0);
  const highYield = Number(highData.yield || 0);
  const lowTensile = Number(lowData.tensile || 0);
  const highTensile = Number(highData.tensile || 0);

  const ratio = (temp - lower) / (upper - lower);

  return {
    status: 200,
    body: {
      success: true,
      interpolated: true,
      year: resolved.year,
      material: resolved.material,
      grade: resolved.grade,
      thickness: resolved.thickness || "",
      temperatureC: Number(temp),
      temperatureF: tempF,
      lowerBound: Number(lower),
      upperBound: Number(upper),
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
export async function getStressMetadata(options = {}) {
  const db = await getStressData(options);
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
      year: params.year || "2020",
      material: params.material || params.spec,
      grade: params.grade,
      thickness: params.thickness,
      temperatureC: params.temperatureC !== undefined ? params.temperatureC : (params.tempC !== undefined ? params.tempC : (params.temperature !== undefined ? params.temperature : params.temp)),
      temperatureF: params.temperatureF !== undefined ? params.temperatureF : params.tempF
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
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const forceRefresh = req.query?.refresh === "1" || req.query?.live === "1" || !!req.query?._t;
    const meta = await getStressMetadata({ refresh: forceRefresh });
    return res.status(200).json({ success: true, ...meta });
  }

  // 4. Server-side filtered GET queries (?year=, ?material= / ?spec=, ?grade=, ?temp= / ?tempF=)
  if (req.method === "GET") {
    const qYear = req.query?.year;
    const qMat = req.query?.material || req.query?.spec;
    const qGrade = req.query?.grade;
    const qThickness = req.query?.thickness;
    const qTempC = req.query?.temperatureC ?? req.query?.tempC ?? req.query?.temperature ?? req.query?.temp;
    const qTempF = req.query?.temperatureF ?? req.query?.tempF;

    if (qYear || qMat || qGrade || qTempC !== undefined || qTempF !== undefined) {
      // If temperature + material + grade are provided, run server-side interpolation directly
      if ((qTempC !== undefined || qTempF !== undefined) && qMat && qGrade) {
        const result = await interpolateStress({
          year: qYear || "2020",
          material: qMat,
          grade: qGrade,
          thickness: qThickness,
          temperatureC: qTempC,
          temperatureF: qTempF
        });
        return res.status(result.status).json(result.body);
      }

      const forceRefresh = req.query?.refresh === "1" || req.query?.live === "1" || !!req.query?._t;
      const db = await getStressData({ refresh: forceRefresh });
      const resolved = resolveStressNode(db, {
        year: qYear,
        material: qMat,
        grade: qGrade,
        thickness: qThickness
      });

      if (resolved.error) {
        return res.status(404).json({
          success: false,
          errorType: "not_found",
          error: resolved.error
        });
      }

      if (resolved.gradeData) {
        return res.status(200).json({
          success: true,
          year: resolved.year,
          material: resolved.material,
          grade: resolved.grade,
          thickness: resolved.thickness || "",
          temperaturePoints: resolved.gradeData
        });
      }

      if (resolved.matData) {
        return res.status(200).json({
          success: true,
          year: resolved.year,
          material: resolved.material,
          grades: Object.keys(resolved.matData),
          data: resolved.matData
        });
      }

      if (resolved.yearData) {
        return res.status(200).json({
          success: true,
          year: resolved.year,
          materials: Object.keys(resolved.yearData),
          data: resolved.yearData
        });
      }
    }
  }

  // 5. Default: delegate to databaseHandler for CRUD, sync, and full data tree
  return databaseHandler(req, res);
}
