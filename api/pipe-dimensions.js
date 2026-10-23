import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "secure", "pipe_dimensions.json");

let memoryCachedDataset = null;

function loadPipeDimensions() {
  if (memoryCachedDataset) return memoryCachedDataset;
  try {
    if (fs.existsSync(DATA_PATH)) {
      memoryCachedDataset = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
      return memoryCachedDataset;
    }
  } catch (err) {
    console.error("Error reading pipe dimensions dataset:", err);
  }
  return { pipeOD: {}, pipeDataMaster: {} };
}

export default async function handler(req, res) {
  const dataset = loadPipeDimensions();
  const method = req.method;

  try {
    // 1. GET: Return complete dimensional tables
    if (method === "GET") {
      res.setHeader("Cache-Control", "public, max-age=86400");

      const nps = req.query?.nps;
      const sch = req.query?.sch;

      if (nps && sch) {
        return handleLookup(dataset, nps, sch, res);
      }

      if (nps) {
        const schedules = dataset.pipeDataMaster?.[nps] || {};
        const od = dataset.pipeOD?.[nps] || null;
        return res.status(200).json({ success: true, nps, od, schedules });
      }

      const master = dataset.pipeDataMaster || {};
      const odMap = dataset.pipeOD || {};

      return res.status(200).json({
        success: true,
        standard: dataset.standard || "ASME B36.10M / ASME B36.19M",
        master: master,
        odMap: odMap,
        pipeDataMaster: master,
        pipeOD: odMap,
        npsList: dataset.npsList || [
          "1/8", "1/4", "3/8", "1/2", "3/4", "1", "1 1/4", "1 1/2",
          "2", "2 1/2", "3", "3 1/2", "4", "5", "6", "8",
          "10", "12", "14", "16", "18", "20", "22", "24",
          "26", "28", "30", "32", "34", "36", "40", "42", "48"
        ]
      });
    }

    // 2. POST: Dimensional lookup and geometric calculation engine
    if (method === "POST") {
      const { nps, sch } = req.body || {};
      if (!nps || !sch) {
        return res.status(400).json({ success: false, error: "NPS and SCH are required parameters" });
      }

      return handleLookup(dataset, nps, sch, res);
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Error in /api/pipe-dimensions handler:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error", message: err.message });
  }
}

function handleLookup(dataset, nps, sch, res) {
  const od = parseFloat(dataset.pipeOD?.[nps]);
  const thicknessVal = dataset.pipeDataMaster?.[nps]?.[sch];

  if (!thicknessVal || isNaN(od)) {
    return res.status(200).json({
      success: false,
      error: `No dimensional standard data found for NPS ${nps} ${sch}`,
      nps,
      sch
    });
  }

  const thickness = parseFloat(thicknessVal);
  if (isNaN(thickness) || thickness <= 0) {
    return res.status(200).json({
      success: false,
      error: `Wall thickness not defined for NPS ${nps} ${sch}`,
      nps,
      sch
    });
  }

  // Exact geometric calculations
  const id = Number((od - 2 * thickness).toFixed(2));
  const circumference = Number((Math.PI * od).toFixed(2));
  const metalArea = Number(((Math.PI / 4) * (Math.pow(od, 2) - Math.pow(id, 2))).toFixed(2));
  const flowArea = Number(((Math.PI / 4) * Math.pow(id, 2)).toFixed(2));
  const unitWeightKgPerM = Number((0.0246615 * thickness * (od - thickness)).toFixed(2));

  return res.status(200).json({
    success: true,
    nps,
    sch,
    od: od.toFixed(1),
    thickness: thickness.toFixed(2),
    id: id.toFixed(2),
    circumference: circumference.toFixed(2),
    metalAreaMm2: metalArea,
    flowAreaMm2: flowArea,
    linearWeightKgPerM: unitWeightKgPerM,
    standard: "ASME B36.10M / ASME B36.19M"
  });
}
