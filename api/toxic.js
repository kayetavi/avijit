export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const {
    toxicGas,
    calcType,
    totalMassFlow: totalMassFlowStr,
    componentKg: componentKgStr,
    molPercent: molPercentStr,
    totalMolarFlow: totalMolarFlowStr
  } = req.body || {};

  const totalMassFlow = parseFloat(totalMassFlowStr);

  if (!toxicGas) {
    return res.status(400).json({ error: "Please select a Toxic Gas!" });
  }
  if (!calcType) {
    return res.status(400).json({ error: "Please select a Calculation Type!" });
  }
  if (isNaN(totalMassFlow) || totalMassFlow <= 0) {
    return res.status(400).json({ error: "Enter valid Total Mass Flow!" });
  }

  const toxicMW = parseFloat(toxicGas);
  let toxicMassFlow = 0;
  let toxicityPercent = 0;

  if (calcType === "kg") {
    let componentKg = parseFloat(componentKgStr);
    if (isNaN(componentKg) || componentKg <= 0) {
      // Check if molPercent was provided instead and convert
      const molPct = parseFloat(molPercentStr);
      let totalMolar = parseFloat(totalMolarFlowStr);
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
    let molPercent = parseFloat(molPercentStr);
    let totalMolarFlow = parseFloat(totalMolarFlowStr);

    if (isNaN(totalMolarFlow) || totalMolarFlow <= 0) {
      return res.status(400).json({ error: "Total molar flow is required (no default stream MW fallback permitted)." });
    }

    if (isNaN(molPercent) || molPercent <= 0) {
      // Check if componentKg was provided and convert
      const compKg = parseFloat(componentKgStr);
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

  const message = `✅ <b>Results:</b><br>
     Toxic Mass Flow: <b>${toxicMassFlow.toFixed(4)}</b> kg/hr<br>
     Toxicity %: <b>${toxicityPercent.toFixed(8)}</b> %`;

  return res.status(200).json({
    success: true,
    toxicMassFlow,
    toxicityPercent,
    message
  });
}
