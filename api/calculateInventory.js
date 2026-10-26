// api/calculateInventory.js

export const LV_MAP = {
  COLTOP: 0.25, COLMID: 0.25, COLBTM: 0.37,
  DRUM: 0.50, KODRUM: 0.10, COMP: 0.0,
  PUMP: 1.0, HEX: 0.50, FINFAN: 0.25,
  FILTER: 1.0, PIPE: 1.0, REACTOR: 0.15
};

export const FLUID_DENSITIES = {
  water: 1000,
  diesel: 832,
  crude: 850,
  ammonia: 682
};

function sanitizeNum(val, fallback = 0) {
  if (val === null || val === undefined || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export default function handler(req, res) {
  // =========================
  // ✅ GET: Default Liquid Volume % & Fluid Densities Metadata
  // =========================
  if (req.method === "GET") {
    const equipmentType = req.query.defaultLV;
    return res.status(200).json({
      success: true,
      lvPercent: LV_MAP[equipmentType] || 0,
      lvMap: LV_MAP,
      fluidDensities: FLUID_DENSITIES
    });
  }

  // =========================
  // ✅ POST: Single or Bulk Calculation
  // =========================
  if (req.method === "POST") {
    const isBulk = Array.isArray(req.body);
    const items = isBulk ? req.body : [req.body || {}];

    const results = items.map((item) => {
      const shape = item?.shape || "";
      const phase = item?.phase || "";
      const manual = Boolean(item?.manual);
      const volume = sanitizeNum(item?.volume, 0);
      const volumeUnit = item?.volumeUnit || "m3";
      const diameter = sanitizeNum(item?.diameter, 0);
      const length = sanitizeNum(item?.length, 0);
      const diameterUnit = sanitizeNum(item?.diameterUnit, 1);
      const lengthUnit = sanitizeNum(item?.lengthUnit, 1);
      const addHead = Boolean(item?.addHead);
      const headType = item?.headType || "";
      const headCount = sanitizeNum(item?.headCount, 2);
      const equipmentType = item?.equipmentType || "";
      const customPercent = sanitizeNum(item?.customPercent, 0);
      const density = sanitizeNum(item?.density, FLUID_DENSITIES[item?.fluidType] || 0);
      const flowRate = sanitizeNum(item?.flowRate, 0);
      const flowRateUnit = item?.flowRateUnit || "kg/s";
      const residenceTime = sanitizeNum(item?.residenceTime, 0);
      const residenceTimeUnit = item?.residenceTimeUnit || "s";

      let calcVolume = 0;

      // Manual Volume
      if (manual) {
        calcVolume = (volumeUnit === "ft3") ? volume * 0.0283168 : volume;
      } else if (shape && phase !== "vapor") {
        const d = diameter > 0 && diameterUnit > 0 ? diameter * diameterUnit : 0;
        const l = length > 0 && lengthUnit > 0 ? length * lengthUnit : 0;

        let cylVolume = 0, headVolume = 0, heads = 0;

        if (shape === "cylinder") {
          cylVolume = Math.PI * Math.pow(d / 2, 2) * l;
          if (addHead) {
            heads = headCount > 0 ? headCount : 2;
            if (headType === "hemihead") headVolume = (2 / 3) * Math.PI * Math.pow(d / 2, 3);
            else if (headType === "torispherical") headVolume = 0.9 * Math.PI * Math.pow(d / 2, 2) * (d / 4);
            else if (headType === "ellipsoidalhead") headVolume = (Math.PI / 24) * Math.pow(d, 3);
          }
          calcVolume = cylVolume + heads * headVolume;
        } else if (shape === "sphere") {
          calcVolume = (4 / 3) * Math.PI * Math.pow(d / 2, 3);
        }
      }

      let message = "";
      if (phase !== "vapor") {
        message = `📦 Volume: ${calcVolume.toFixed(2)} m³<br>`;
      }

      let liquidMass, vaporMass;

      // Liquid
      if (phase === "liquid" || phase === "both") {
        const percent = (equipmentType === "custom") ? customPercent : (LV_MAP[equipmentType] || 0);

        if (!density || density <= 0) message = "⚠️ Missing density for liquid calculation.";
        else if (equipmentType === "custom" && percent === 0) message = "⚠️ Missing custom liquid %.";
        else {
          liquidMass = calcVolume * percent * density;
          message += `🧪 Liquid Inventory: ${liquidMass.toFixed(2)} kg<br>`;
        }
      }

      // Vapor
      if (phase === "vapor" || phase === "both") {
        let flow = flowRate;
        if (flowRateUnit === "kg/min") flow /= 60;
        if (flowRateUnit === "kg/h") flow /= 3600;

        let rt = residenceTime;
        if (residenceTimeUnit === "min") rt *= 60;
        if (residenceTimeUnit === "h") rt *= 3600;

        if (!rt || rt <= 0) message = "⚠️ Invalid residence time.";
        else {
          vaporMass = flow * rt;
          message += `💨 Vapor Inventory: ${vaporMass.toFixed(2)} kg<br>`;
        }
      }

      return { volume: calcVolume.toFixed(2), liquidMass, vaporMass, message };
    });

    return res.status(200).json(isBulk ? results : results[0]);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
