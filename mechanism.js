function findMechanism() {
  let h2s = parseFloat(document.getElementById("inputH2S").value) || 0;
  let freeH2O = (document.getElementById("selectFreeH2O").value || "").toLowerCase();
  let pwht = (document.getElementById("selectPWHT").value || "").toLowerCase();
  let hcn = parseFloat(document.getElementById("inputHCN").value) || 0;
  let ph = parseFloat(document.getElementById("inputPH").value) || 0;
  let chloride = parseFloat(document.getElementById("inputChloride").value) || 0;
  let oxygen = parseFloat(document.getElementById("inputOxygen").value) || 0;
  let temp = parseFloat(document.getElementById("inputTemp").value) || 0;
  let caustic = parseFloat(document.getElementById("inputCaustic").value) || 0;
  let dea = (document.getElementById("selectDEA").value || "").toLowerCase();
  let scale = (document.getElementById("selectScale").value || "").toLowerCase();
  let stability = (document.getElementById("selectStability").value || "").toLowerCase();
  let material = (document.getElementById("selectMaterialType").value || "").toLowerCase();
  let amineType = (document.getElementById("selectAmineType").value || "").toLowerCase();

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
  const resultEl = document.getElementById("mechanismResult");
  if (!mechanism) {
    resultEl.innerHTML = "⚠ No exact match found for given criteria.";
  } else {
    resultEl.innerHTML =
      `Cracking Mechanism: <span style="color:blue">${mechanism}</span><br>` +
      `Initial Potential: <span style="color:red">${potential}</span>`;
  }
}
