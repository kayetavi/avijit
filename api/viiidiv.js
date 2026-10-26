import { loadB313CatalogFromFirestore } from "./b313.js";

export default async function handler(req, res) {
  const catalog = await loadB313CatalogFromFirestore();

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      source: catalog.source,
      standard: "ASME Section VIII Division 1 (UG-27 & UG-32)",
      jointEfficiencyTable: catalog.jointEfficiencyTable || [],
      unitConversions: catalog.unitConversions || {}
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { type, values } = req.body || {};

  const pressureToMPa = catalog.unitConversions?.pressureToMPa || { MPa: 1.0, bar: 0.1, kgcm2: 0.0980665, psi: 0.00689476 };
  const stressToMPa = catalog.unitConversions?.stressToMPa || { MPa: 1.0, ksi: 6.89476, kgcm2: 0.0980665, psi: 0.00689476 };

  const convertPressureToMPa = (value, unit) => Number(value) * (pressureToMPa[unit] || 1.0);
  const convertStressToMPa = (value, unit) => Number(value) * (stressToMPa[unit] || 1.0);
  const convertLengthToMM = (value, unit) => unit === "inch" ? Number(value) * 25.4 : Number(value);

  const numericFields = ["P", "R", "D", "S", "E"];
  for (const field of numericFields) {
    if (values && values[field] !== undefined) {
      const num = parseFloat(values[field]);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ error: `Invalid value for ${field}` });
      }
    }
  }

  let t = 0;
  let formulaStr = "";
  let P_MPa = 0;
  let S_MPa = 0;
  let dim_mm = 0;

  try {
    if (type === "shell") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.R), values.Runit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (S_MPa * E <= 0.6 * P_MPa) throw new Error("Invalid denominator for shell (S*E <= 0.6P)");
      t = (P_MPa * dim_mm) / (S_MPa * E - 0.6 * P_MPa);
      formulaStr = "UG-27(c)(1) Cylindrical Shell: t = (P × R) / (S × E - 0.6P)";
    } else if (type === "ellipsoidal") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.D), values.Dunit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (2 * S_MPa * E <= 0.2 * P_MPa) throw new Error("Invalid denominator for ellipsoidal (2SE <= 0.2P)");
      t = (P_MPa * dim_mm) / (2 * S_MPa * E - 0.2 * P_MPa);
      formulaStr = "UG-32(d) Ellipsoidal Head: t = (P × D) / (2SE - 0.2P)";
    } else if (type === "torispherical") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.D), values.Dunit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (S_MPa * E <= 0.1 * P_MPa) throw new Error("Invalid denominator for torispherical (SE <= 0.1P)");
      t = (0.885 * P_MPa * dim_mm) / (S_MPa * E - 0.1 * P_MPa);
      formulaStr = "UG-32(e) Torispherical Head: t = (0.885 × P × D) / (SE - 0.1P)";
    } else if (type === "hemispherical") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.D), values.Dunit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (2 * S_MPa * E <= 0.2 * P_MPa) throw new Error("Invalid denominator for hemispherical (2SE <= 0.2P)");
      t = (P_MPa * dim_mm) / (2 * S_MPa * E - 0.2 * P_MPa);
      formulaStr = "UG-32(f) Hemispherical Head: t = (P × D) / (2SE - 0.2P)";
    } else {
      throw new Error("Invalid pressure vessel component type");
    }

    res.status(200).json({
      success: true,
      source: catalog.source,
      thickness: t.toFixed(3),
      thicknessNumeric: Number(t.toFixed(3)),
      unit: "mm",
      formula: formulaStr,
      componentType: type,
      inputRecap: {
        P: Number(values.P),
        Punit: values.Punit || "MPa",
        P_MPa: Number(P_MPa),
        dimension: Number(dim_mm),
        dimLabel: type === "shell" ? "Inside Radius (R)" : "Inside Diameter (D)",
        dimUnit: type === "shell" ? values.Runit : values.Dunit,
        S: Number(values.S),
        Sunit: values.Sunit || "MPa",
        S_MPa: Number(S_MPa),
        E: Number(values.E)
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
