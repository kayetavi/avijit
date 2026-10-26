// ==========================================================================
// API 571 CRACKING MECHANISM FINDER
// Connected to Dynamic Firestore Backend API (/api/damage-criteria?action=cracking_mechanism)
// With resilient client fallback to ensure zero breaking changes
// ==========================================================================

async function findMechanism() {
  const h2s = parseFloat(document.getElementById("inputH2S")?.value) || 0;
  const freeH2O = (document.getElementById("selectFreeH2O")?.value || "").toLowerCase().trim();
  const pwht = (document.getElementById("selectPWHT")?.value || "").toLowerCase().trim();
  const hcn = parseFloat(document.getElementById("inputHCN")?.value) || 0;
  const ph = parseFloat(document.getElementById("inputPH")?.value) || 0;
  const chloride = parseFloat(document.getElementById("inputChloride")?.value) || 0;
  const oxygen = parseFloat(document.getElementById("inputOxygen")?.value) || 0;
  const temp = parseFloat(document.getElementById("inputTemp")?.value) || 0;
  const caustic = parseFloat(document.getElementById("inputCaustic")?.value) || 0;
  const dea = (document.getElementById("selectDEA")?.value || "").toLowerCase().trim();
  const scale = (document.getElementById("selectScale")?.value || "").toLowerCase().trim();
  const stability = (document.getElementById("selectStability")?.value || "").toLowerCase().trim();
  const material = (document.getElementById("selectMaterialType")?.value || "").toLowerCase().trim();
  const amineType = (document.getElementById("selectAmineType")?.value || "").toLowerCase().trim();

  const resultEl = document.getElementById("mechanismResult");
  if (!resultEl) return;

  const payload = {
    h2s,
    freeH2O,
    pwht,
    hcn,
    ph,
    chloride,
    oxygen,
    temp,
    caustic,
    dea,
    scale,
    stability,
    material,
    materialType: material,
    amineType
  };

  // Indicate loading state
  resultEl.innerHTML = '<span style="color:#64748b;">Evaluating cracking mechanisms via Firestore API...</span>';

  // 1. Try Backend Dynamic Evaluation via Firestore endpoint
  try {
    const res = await fetch("/api/damage-criteria?action=cracking_mechanism", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        if (!data.matched || !data.mechanism) {
          resultEl.innerHTML = "⚠ No exact match found for given criteria.";
        } else {
          const potColor = data.potential === "H" ? "#dc2626" : (data.potential === "M" ? "#d97706" : "#2563eb");
          resultEl.innerHTML =
            `Cracking Mechanism: <strong style="color:#2563eb;">${data.mechanism}</strong><br>` +
            `Initial Potential: <strong style="color:${potColor};">${data.potential}</strong>` +
            `<div style="margin-top:6px; font-size:11.5px; color:#64748b;">Resolved via Firestore API 571 Criteria Engine</div>`;
        }
        return;
      }
    }
  } catch (err) {
    console.warn("[CrackingFinder] Backend API lookup error, falling back to local engine:", err);
  }

  // 2. Resilient Client Fallback (Ensures zero UI disruption if network unavailable)
  let mechanism = "";
  let potential = "";

  // Priority 1 — Wet H2S
  if (h2s > 50 && freeH2O === "yes" && pwht === "no" && (hcn > 20 || ph < 5.5)) {
    mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
    potential = "H";
  } else if (h2s > 50 && freeH2O === "yes" && pwht === "yes" && (hcn > 20 || ph < 5.5)) {
    mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
    potential = "M";
  } else if (h2s > 20 && h2s <= 50 && freeH2O === "yes" && pwht === "yes") {
    mechanism = "Wet H2S (Blistering, SOHIC, HIC, SSC)";
    potential = "L";
  }
  // Priority 2 — Chloride SCC
  else if (chloride >= 50 && temp > 140 && oxygen >= 10) {
    mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
    potential = "H";
  } else if (chloride >= 25 && chloride < 50 && oxygen < 10 && temp > 140) {
    mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
    potential = "M";
  } else if (chloride >= 5 && chloride < 25 && oxygen < 0.1 && ph > 9 && temp > 120) {
    mechanism = "Chloride Stress Corrosion Cracking (Cl SCC)";
    potential = "L";
  }
  // Priority 3 — Caustic Cracking
  else if ((material === "carbon steel" || material === "300 series ss") && temp > 200 && pwht === "no") {
    mechanism = "Caustic Cracking";
    potential = "H";
  } else if (material === "carbon steel" && temp < 200 && caustic < 30 && pwht === "yes") {
    mechanism = "Caustic Cracking";
    potential = "M";
  } else if ((temp < 110 && caustic <= 50) || (temp < 150 && caustic > 0)) {
    mechanism = "Caustic Cracking";
    potential = "L";
  }
  // Priority 4 — Amine Cracking (ASCC)
  else if (material === "carbon steel" && pwht === "no") {
    if (
      amineType === "mea" ||
      ((amineType === "dea" || amineType === "mdea") && temp > 140)
    ) {
      mechanism = "Amine Cracking (ASCC)";
      potential = "H";
    } else if (temp >= 125 && temp <= 150) {
      mechanism = "Amine Cracking (ASCC)";
      potential = "M";
    }
  } else if (material === "carbon steel" && pwht === "yes") {
    mechanism = "Amine Cracking (ASCC)";
    potential = "L";
  }
  // Priority 5 — PTA SCC
  else if (scale === "yes" && temp > 800 && stability === "upset") {
    mechanism = "Polythionic Acid SCC (PTA)";
    potential = "H";
  } else if (scale === "yes" && stability === "upset") {
    mechanism = "Polythionic Acid SCC (PTA)";
    potential = "M";
  } else if (scale === "yes" && stability === "stable") {
    mechanism = "Polythionic Acid SCC (PTA)";
    potential = "L";
  }

  // Output
  if (!mechanism) {
    resultEl.innerHTML = "⚠ No exact match found for given criteria.";
  } else {
    const potColor = potential === "H" ? "#dc2626" : (potential === "M" ? "#d97706" : "#2563eb");
    resultEl.innerHTML =
      `Cracking Mechanism: <strong style="color:#2563eb;">${mechanism}</strong><br>` +
      `Initial Potential: <strong style="color:${potColor};">${potential}</strong>`;
  }
}

if (typeof window !== "undefined") {
  window.findMechanism = findMechanism;
}
