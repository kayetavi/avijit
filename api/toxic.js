// ============================================================================
// API 581 TOXIC RELEASE, DISPERSION & GAS COMPOSITION ENGINE (/api/toxic)
// ============================================================================

export const TOXIC_GAS_MAP = [
  { key: "h2s", name: "H₂S (Hydrogen Sulfide)", mw: 34.08, aliases: ["h2s", "h₂s", "hydrogensulfide", "hydrogen sulfide", "sour"] },
  { key: "co", name: "CO (Carbon Monoxide)", mw: 28.01, aliases: ["co", "carbonmonoxide", "carbon monoxide"] },
  { key: "co2", name: "CO₂ (Carbon Dioxide)", mw: 44.01, aliases: ["co2", "co₂", "carbondioxide", "carbon dioxide"] },
  { key: "nh3", name: "NH₃ (Ammonia)", mw: 17.03, aliases: ["nh3", "nh₃", "ammonia"] },
  { key: "so2", name: "SO₂ (Sulfur Dioxide)", mw: 64.06, aliases: ["so2", "so₂", "sulfurdioxide", "sulfur dioxide"] },
  { key: "no", name: "NO (Nitric Oxide)", mw: 30.01, aliases: ["no", "nitricoxide", "nitric oxide"] },
  { key: "no2", name: "NO₂ (Nitrogen Dioxide)", mw: 46.01, aliases: ["no2", "no₂", "nitrogendioxide", "nitrogen dioxide"] },
  { key: "cl2", name: "Cl₂ (Chlorine)", mw: 70.90, aliases: ["cl2", "cl₂", "chlorine"] },
  { key: "hcn", name: "HCN (Hydrogen Cyanide)", mw: 27.03, aliases: ["hcn", "hydrogencyanide", "hydrogen cyanide"] }
];

export const GAS_MOLAR_MASSES = {
  c1: 16.04,
  c2: 30.07,
  c3: 44.10,
  c4: 58.12,
  c5: 72.15,
  h2s: 34.08,
  co: 28.01,
  co2: 44.01
};

export const GAS_NAMES = {
  c1: "C1 (Methane)",
  c2: "C2 (Ethane)",
  c3: "C3 (Propane)",
  c4: "C4 (Butane)",
  c5: "C5 (Pentane)",
  h2s: "H2S",
  co: "CO",
  co2: "CO2"
};

function sanitizeNum(val) {
  if (val === null || val === undefined || val === "") return NaN;
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

export function classifyToxicHazard(toxicityPercent) {
  const pct = Number(toxicityPercent) || 0;
  if (pct > 10) {
    return {
      severityTag: "🔴 Lethal / Extreme Hazard (API 581 Class IV / Cat E)",
      severityColor: "#dc2626",
      rbiImpact: "Immediate shelter-in-place / emergency toxic isolation required. Highly volatile lethal cloud dispersion risk.",
      hazardCategory: "E"
    };
  }
  if (pct > 1) {
    return {
      severityTag: "🟠 High Hazard (API 581 Class III / Cat D)",
      severityColor: "#ea580c",
      rbiImpact: "Strict toxic consequence area evaluation required under API 581 / EPA RMP regulations.",
      hazardCategory: "D"
    };
  }
  if (pct > 0.05) {
    return {
      severityTag: "🟡 Moderate Hazard (API 581 Class II / Cat C)",
      severityColor: "#d97706",
      rbiImpact: "Continuous area toxic gas monitoring (fixed detectors) and PPE compliance required.",
      hazardCategory: "C"
    };
  }
  return {
    severityTag: "🟢 Trace / Low Hazard (API 581 Category A)",
    severityColor: "#16a34a",
    rbiImpact: "Minimal personal protective equipment adjustment required.",
    hazardCategory: "A"
  };
}

export default function handler(req, res) {
  // 1. GET: Return Toxic Gas Catalog & Molar Mass Metadata
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      toxicGasMap: TOXIC_GAS_MAP,
      molarMasses: GAS_MOLAR_MASSES,
      gasNames: GAS_NAMES
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const body = req.body || {};
  const action = body.action || "calculate_toxic";

  // 2. POST action === "gas_composition": Multi-component Gas Composition Calculator
  if (action === "gas_composition") {
    const rawComponents = Array.isArray(body.components) ? body.components : [];
    const components = rawComponents.map((g) => {
      const gasKey = String(g.gasKey || "gas").toLowerCase();
      let molePercent = sanitizeNum(g.molePercent);
      if (isNaN(molePercent) || molePercent < 0) molePercent = 0;
      if (molePercent > 100) molePercent = 100;
      let molarMass = sanitizeNum(g.molarMass);
      if (isNaN(molarMass) || molarMass <= 0) {
        molarMass = GAS_MOLAR_MASSES[gasKey] || 44.0;
      }
      const moleFraction = molePercent / 100;
      const massContribution = moleFraction * molarMass;
      return {
        gasKey: g.gasKey || gasKey,
        customName: g.customName || GAS_NAMES[gasKey] || gasKey.toUpperCase(),
        molePercent,
        moleFraction,
        molarMass,
        massContribution
      };
    });

    const totalMass = components.reduce((sum, g) => sum + g.massContribution, 0);
    const enriched = components.map((g) => ({
      ...g,
      wtPercent: totalMass > 0 ? (g.massContribution / totalMass) * 100 : 0
    }));

    return res.status(200).json({
      success: true,
      totalMass: Number(totalMass.toFixed(6)),
      components: enriched
    });
  }

  // 3. POST action === "convert_units": Bidirectional kg/hr <-> mol% conversion
  if (action === "convert_units") {
    const targetMode = body.targetMode || "kg";
    const toxicMW = sanitizeNum(body.toxicMW ?? body.toxicGas) || 34.08;
    const totalMassFlow = sanitizeNum(body.totalMassFlow);
    let totalMolarFlow = sanitizeNum(body.totalMolarFlow);
    const streamMW = sanitizeNum(body.streamMW) || 30;

    if ((isNaN(totalMolarFlow) || totalMolarFlow <= 0) && totalMassFlow > 0 && streamMW > 0) {
      totalMolarFlow = totalMassFlow / streamMW;
    }

    if (targetMode === "kg") {
      const molPercent = sanitizeNum(body.molPercent);
      if (isNaN(molPercent) || molPercent <= 0 || isNaN(totalMolarFlow) || totalMolarFlow <= 0) {
        return res.status(400).json({ success: false, error: "Valid molPercent and totalMolarFlow required." });
      }
      const componentKg = (molPercent / 100) * totalMolarFlow * toxicMW;
      return res.status(200).json({
        success: true,
        componentKg: Number(componentKg.toFixed(4)),
        totalMolarFlow: Number(totalMolarFlow.toFixed(2))
      });
    } else {
      const componentKg = sanitizeNum(body.componentKg);
      if (isNaN(componentKg) || componentKg <= 0 || isNaN(totalMolarFlow) || totalMolarFlow <= 0) {
        return res.status(400).json({ success: false, error: "Valid componentKg and totalMolarFlow required." });
      }
      const toxicKmol = componentKg / toxicMW;
      const molPercent = (toxicKmol / totalMolarFlow) * 100;
      return res.status(200).json({
        success: true,
        molPercent: Number(molPercent.toFixed(6)),
        totalMolarFlow: Number(totalMolarFlow.toFixed(2))
      });
    }
  }

  // 4. Default POST: Toxic Mass Flow, WT% & API 581 Hazard Classification
  const {
    toxicGas,
    calcType,
    totalMassFlow: totalMassFlowStr,
    componentKg: componentKgStr,
    molPercent: molPercentStr,
    totalMolarFlow: totalMolarFlowStr,
    streamMW: streamMWStr
  } = body;

  const totalMassFlow = sanitizeNum(totalMassFlowStr);

  if (!toxicGas) {
    return res.status(400).json({ error: "Please select a Toxic Gas!" });
  }
  if (!calcType) {
    return res.status(400).json({ error: "Please select a Calculation Type!" });
  }
  if (isNaN(totalMassFlow) || totalMassFlow <= 0) {
    return res.status(400).json({ error: "Enter valid Total Mass Flow!" });
  }

  const toxicMW = sanitizeNum(toxicGas);
  if (isNaN(toxicMW) || toxicMW <= 0) {
    return res.status(400).json({ error: "Invalid Toxic Gas Molecular Weight!" });
  }

  let toxicMassFlow = 0;
  let toxicityPercent = 0;

  if (calcType === "kg") {
    let componentKg = sanitizeNum(componentKgStr);
    if (isNaN(componentKg) || componentKg <= 0) {
      const molPct = sanitizeNum(molPercentStr);
      let totalMolar = sanitizeNum(totalMolarFlowStr);
      const streamMW = sanitizeNum(streamMWStr);
      if ((isNaN(totalMolar) || totalMolar <= 0) && !isNaN(streamMW) && streamMW > 0) {
        totalMolar = totalMassFlow / streamMW;
      }
      if (!isNaN(molPct) && molPct > 0) {
        if (isNaN(totalMolar) || totalMolar <= 0) {
          return res.status(400).json({ error: "Total molar flow is required for mole percent conversion (no default MW fallback permitted)." });
        }
        componentKg = (molPct / 100) * totalMolar * toxicMW;
      }
    }
    if (isNaN(componentKg) || componentKg <= 0) {
      return res.status(400).json({ error: "Enter valid Component Value (kg/hr)!" });
    }
    toxicMassFlow = componentKg;
    toxicityPercent = (toxicMassFlow / totalMassFlow) * 100;
  } else if (calcType === "mol") {
    let molPercent = sanitizeNum(molPercentStr);
    let totalMolarFlow = sanitizeNum(totalMolarFlowStr);
    const streamMW = sanitizeNum(streamMWStr);
    if ((isNaN(totalMolarFlow) || totalMolarFlow <= 0) && !isNaN(streamMW) && streamMW > 0) {
      totalMolarFlow = totalMassFlow / streamMW;
    }

    if (isNaN(totalMolarFlow) || totalMolarFlow <= 0) {
      return res.status(400).json({ error: "Total molar flow is required (no default stream MW fallback permitted)." });
    }

    if (isNaN(molPercent) || molPercent <= 0) {
      const compKg = sanitizeNum(componentKgStr);
      if (!isNaN(compKg) && compKg > 0) {
        const toxicKmol = compKg / toxicMW;
        molPercent = (toxicKmol / totalMolarFlow) * 100;
      }
    }

    if (isNaN(molPercent) || molPercent <= 0) {
      return res.status(400).json({ error: "Enter valid mol% or Component Flow (kg/hr)!" });
    }

    const molFraction = molPercent / 100;
    const toxicMolarFlow = molFraction * totalMolarFlow;
    toxicMassFlow = toxicMolarFlow * toxicMW;
    toxicityPercent = (toxicMassFlow / totalMassFlow) * 100;
  } else {
    return res.status(400).json({ error: "Invalid calculation type!" });
  }

  const hazard = classifyToxicHazard(toxicityPercent);

  const message = `✅ <b>Results:</b><br>
     Toxic Mass Flow: <b>${toxicMassFlow.toFixed(4)}</b> kg/hr<br>
     Toxicity %: <b>${toxicityPercent.toFixed(8)}</b> %`;

  return res.status(200).json({
    success: true,
    toxicMassFlow,
    toxicityPercent,
    severityTag: hazard.severityTag,
    severityColor: hazard.severityColor,
    rbiImpact: hazard.rbiImpact,
    hazardCategory: hazard.hazardCategory,
    message
  });
}
