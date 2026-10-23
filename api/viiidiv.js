export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { type, values } = req.body || {};

  const convertPressureToMPa = (value, unit) => {
    switch (unit) {
      case "bar": return value * 0.1;
      case "kgcm2": return value * 0.0980665;
      case "psi": return value * 0.00689476;
      default: return value; // MPa
    }
  };

  const convertStressToMPa = (value, unit) => {
    switch (unit) {
      case "kgcm2": return value * 0.0980665;
      case "psi": return value * 0.00689476;
      case "ksi": return value * 6.89476;
      default: return value; // MPa
    }
  };

  const convertLengthToMM = (value, unit) =>
    unit === "inch" ? value * 25.4 : value;

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
    }
    else if (type === "ellipsoidal") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.D), values.Dunit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (2 * S_MPa * E <= 0.2 * P_MPa) throw new Error("Invalid denominator for ellipsoidal (2SE <= 0.2P)");
      t = (P_MPa * dim_mm) / (2 * S_MPa * E - 0.2 * P_MPa);
      formulaStr = "UG-32(d) Ellipsoidal Head: t = (P × D) / (2SE - 0.2P)";
    }
    else if (type === "torispherical") {
      P_MPa = convertPressureToMPa(Number(values.P), values.Punit);
      dim_mm = convertLengthToMM(Number(values.D), values.Dunit);
      S_MPa = convertStressToMPa(Number(values.S), values.Sunit);
      const E = Number(values.E);

      if (S_MPa * E <= 0.1 * P_MPa) throw new Error("Invalid denominator for torispherical (SE <= 0.1P)");
      t = (0.885 * P_MPa * dim_mm) / (S_MPa * E - 0.1 * P_MPa);
      formulaStr = "UG-32(e) Torispherical Head: t = (0.885 × P × D) / (SE - 0.1P)";
    }
    else if (type === "hemispherical") {
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
      thickness: t.toFixed(3),
      unit: "mm",
      formula: formulaStr,
      componentType: type,
      inputRecap: {
        P: values.P,
        Punit: values.Punit || "MPa",
        P_MPa,
        dimension: dim_mm,
        dimLabel: type === "shell" ? "Inside Radius (R)" : "Inside Diameter (D)",
        dimUnit: type === "shell" ? values.Runit : values.Dunit,
        S: values.S,
        Sunit: values.Sunit || "MPa",
        S_MPa,
        E: values.E
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
