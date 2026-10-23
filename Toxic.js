// --- Existing Toxic Calculation Functions ---

function toggleInputs_Toxic(skipReset = false) {
  const calcType = document.getElementById("calcType_Toxic")?.value;

  const toxicGasGroup = document.getElementById("toxicGasGroup");
  const kgInputs = document.getElementById("kgInputs_Toxic");
  const molInputs = document.getElementById("molInputs_Toxic");
  const totalMassFlowGroup = document.getElementById("totalMassFlowGroup");
  const calculateBtn = document.getElementById("calculateBtn");
  const gasCompSection = document.getElementById("gasCompCalculatorSection");

  if (!calcType) {
    if (toxicGasGroup) toxicGasGroup.style.display = "flex";
    if (kgInputs) kgInputs.style.display = "none";
    if (molInputs) molInputs.style.display = "none";
    if (totalMassFlowGroup) totalMassFlowGroup.style.display = "flex";
    if (calculateBtn) calculateBtn.style.display = "inline-flex";
    if (gasCompSection) gasCompSection.style.display = "none";
    if (!skipReset) resetCalculation_Toxic();
    return;
  }

  if (calcType === "kg") {
    if (toxicGasGroup) toxicGasGroup.style.display = "flex";
    if (kgInputs) kgInputs.style.display = "flex";
    if (molInputs) molInputs.style.display = "none";
    if (totalMassFlowGroup) totalMassFlowGroup.style.display = "flex";
    if (calculateBtn) calculateBtn.style.display = "inline-flex";
    if (gasCompSection) gasCompSection.style.display = "none";
  } else if (calcType === "mol") {
    if (toxicGasGroup) toxicGasGroup.style.display = "flex";
    if (kgInputs) kgInputs.style.display = "none";
    if (molInputs) molInputs.style.display = "block";
    if (totalMassFlowGroup) totalMassFlowGroup.style.display = "flex";
    if (calculateBtn) calculateBtn.style.display = "inline-flex";
    if (gasCompSection) gasCompSection.style.display = "none";
  } else if (calcType === "gasComp") {
    if (toxicGasGroup) toxicGasGroup.style.display = "none";
    if (kgInputs) kgInputs.style.display = "none";
    if (molInputs) molInputs.style.display = "none";
    if (totalMassFlowGroup) totalMassFlowGroup.style.display = "none";
    if (calculateBtn) calculateBtn.style.display = "none";
    if (gasCompSection) gasCompSection.style.display = "block";
  }

  if (!skipReset) {
    resetCalculation_Toxic();
  }
}

function resetCalculation_Toxic() {
  const compKg = document.getElementById("componentKg_Toxic");
  const molPct = document.getElementById("molPercent_Toxic");
  const totalMol = document.getElementById("totalMolarFlow_Toxic");
  const totalMass = document.getElementById("totalMassFlow_Toxic");
  const res = document.getElementById("result_Toxic");

  if (compKg) compKg.value = "";
  if (molPct) molPct.value = "";
  if (totalMol) totalMol.value = "";
  if (totalMass) totalMass.value = "";
  if (res) res.innerHTML = "";
}

async function calculateToxic_Toxic() {
  const toxicGasSelect = document.getElementById("toxicGas_Toxic");
  const calcTypeSelect = document.getElementById("calcType_Toxic");
  const totalMassFlowInput = document.getElementById("totalMassFlow_Toxic");
  const componentKgInput = document.getElementById("componentKg_Toxic");
  const molPercentInput = document.getElementById("molPercent_Toxic");
  const totalMolarFlowInput = document.getElementById("totalMolarFlow_Toxic");
  const resultEl = document.getElementById("result_Toxic");

  let toxicGas = toxicGasSelect?.value || "";
  let calcType = calcTypeSelect?.value || "";
  let totalMassFlow = parseFloat(totalMassFlowInput?.value || 0);
  let componentKg = parseFloat(componentKgInput?.value || 0);
  let molPercent = parseFloat(molPercentInput?.value || 0);
  let totalMolarFlow = parseFloat(totalMolarFlowInput?.value || 0);

  // Auto-detect calculation type if not explicitly selected
  if (!calcType) {
    if (componentKg > 0) {
      calcType = "kg";
      if (calcTypeSelect) calcTypeSelect.value = "kg";
      toggleInputs_Toxic(true);
    } else if (molPercent > 0) {
      calcType = "mol";
      if (calcTypeSelect) calcTypeSelect.value = "mol";
      toggleInputs_Toxic(true);
    } else {
      calcType = "kg";
      if (calcTypeSelect) calcTypeSelect.value = "kg";
      toggleInputs_Toxic(true);
    }
  }

  // Auto-select H2S default if toxic gas is not selected
  if (!toxicGas) {
    if (toxicGasSelect) {
      toxicGasSelect.value = "34.08";
      toxicGas = "34.08";
    }
  }

  // Validation feedback
  if (!totalMassFlow || totalMassFlow <= 0) {
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="toxic-result-card" style="border-left-color: #f59e0b; background: #fffbeb;">
          <strong style="color: #b45309;">⚠️ Input Required:</strong>
          <span style="color: #92400e; margin-left: 6px;">Please enter a valid <strong>Total Stream Mass Flow (kg/hr)</strong> or load a stream dataset.</span>
        </div>`;
    }
    if (totalMassFlowInput) totalMassFlowInput.focus();
    return;
  }

  const toxicMW = parseFloat(toxicGas) || 34.08;
  const gasNameText = toxicGasSelect ? toxicGasSelect.options[toxicGasSelect.selectedIndex]?.text : `MW: ${toxicMW}`;

  if (calcType === "kg" && (!componentKg || componentKg <= 0)) {
    if (molPercent > 0) {
      if (!totalMolarFlow || totalMolarFlow <= 0) totalMolarFlow = totalMassFlow / 30;
      componentKg = (molPercent / 100) * totalMolarFlow * toxicMW;
      if (componentKgInput) componentKgInput.value = parseFloat(componentKg.toFixed(4));
    } else {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="toxic-result-card" style="border-left-color: #f59e0b; background: #fffbeb;">
            <strong style="color: #b45309;">⚠️ Input Required:</strong>
            <span style="color: #92400e; margin-left: 6px;">Please enter <strong>Toxic Component Flow (kg/hr)</strong>.</span>
          </div>`;
      }
      if (componentKgInput) componentKgInput.focus();
      return;
    }
  }

  if (calcType === "mol" && (!molPercent || molPercent <= 0)) {
    if (componentKg > 0) {
      if (!totalMolarFlow || totalMolarFlow <= 0) totalMolarFlow = totalMassFlow / 30;
      const toxicKmol = componentKg / toxicMW;
      molPercent = (toxicKmol / totalMolarFlow) * 100;
      if (molPercentInput) molPercentInput.value = parseFloat(molPercent.toFixed(6));
    } else {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="toxic-result-card" style="border-left-color: #f59e0b; background: #fffbeb;">
            <strong style="color: #b45309;">⚠️ Input Required:</strong>
            <span style="color: #92400e; margin-left: 6px;">Please enter <strong>Toxic Component Mole % (mol%)</strong>.</span>
          </div>`;
      }
      if (molPercentInput) molPercentInput.focus();
      return;
    }
  }

  if (resultEl) {
    resultEl.innerHTML = `
      <div style="text-align: center; padding: 18px; color: #2563eb;">
        <span style="font-size: 20px; display: block; margin-bottom: 6px;">⏳</span>
        <strong>Evaluating Toxic Metrics via API 581 Strict Calculation Engine...</strong>
      </div>`;
  }

  try {
    const res = await fetch("/api/toxic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toxicGas,
        calcType,
        totalMassFlow: String(totalMassFlow),
        componentKg: String(componentKg),
        molPercent: String(molPercent),
        totalMolarFlow: String(totalMolarFlow)
      })
    });

    let toxicMass = 0;
    let toxicityPct = 0;

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        toxicMass = Number(data.toxicMassFlow || 0);
        toxicityPct = Number(data.toxicityPercent || 0);
      }
    }

    // Client-side math verification fallback
    if (!toxicMass || !toxicityPct) {
      if (calcType === "kg") {
        toxicMass = componentKg;
        toxicityPct = (toxicMass / totalMassFlow) * 100;
      } else {
        if (!totalMolarFlow || totalMolarFlow <= 0) totalMolarFlow = totalMassFlow / 30;
        const toxicKmol = (molPercent / 100) * totalMolarFlow;
        toxicMass = toxicKmol * toxicMW;
        toxicityPct = (toxicMass / totalMassFlow) * 100;
      }
    }

    let severityTag = "🟢 Trace / Low Hazard (API 581 Category A)";
    let severityColor = "#16a34a";
    let rbiImpact = "Minimal personal protective equipment adjustment required.";

    if (toxicityPct > 10) {
      severityTag = "🔴 Lethal / Extreme Hazard (API 581 Class IV / Cat E)";
      severityColor = "#dc2626";
      rbiImpact = "Immediate shelter-in-place / emergency toxic isolation required. Highly volatile lethal cloud dispersion risk.";
    } else if (toxicityPct > 1) {
      severityTag = "🟠 High Hazard (API 581 Class III / Cat D)";
      severityColor = "#ea580c";
      rbiImpact = "Strict toxic consequence area evaluation required under API 581 / EPA RMP regulations.";
    } else if (toxicityPct > 0.05) {
      severityTag = "🟡 Moderate Hazard (API 581 Class II / Cat C)";
      severityColor = "#d97706";
      rbiImpact = "Continuous area toxic gas monitoring (fixed detectors) and PPE compliance required.";
    }

    if (resultEl) {
      resultEl.innerHTML = `
        <div class="toxic-result-card">
          <div class="toxic-result-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span class="toxic-result-badge-success">✓ Strict Toxic Consequence Evaluated</span>
            <span style="font-size:12px; color:#64748b;">Target: <strong>${toxic_escapeHTML(gasNameText)}</strong></span>
          </div>
          
          <div class="toxic-result-grid" style="margin-top:12px;">
            <div class="toxic-kpi-item">
              <span class="toxic-kpi-lbl">TOTAL STREAM MASS FLOW</span>
              <span class="toxic-kpi-val">${totalMassFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>kg/hr</small></span>
            </div>
            <div class="toxic-kpi-item">
              <span class="toxic-kpi-lbl">TOXIC COMPONENT MASS FLOW</span>
              <span class="toxic-kpi-val">${toxicMass.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} <small>kg/hr</small></span>
            </div>
            <div class="toxic-kpi-item toxic-kpi-highlight">
              <span class="toxic-kpi-lbl">TOXICITY PERCENT (WT %)</span>
              <span class="toxic-kpi-val" style="color: #2563eb;">${toxicityPct.toFixed(6)} <small>%</small></span>
            </div>
            <div class="toxic-kpi-item">
              <span class="toxic-kpi-lbl">API 581 HAZARD LEVEL</span>
              <span class="toxic-kpi-val" style="font-size: 14px; color: ${severityColor};">
                ${severityTag}
              </span>
            </div>
          </div>

          <div style="margin-top: 14px; padding: 10px 12px; background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.15); border-radius: 6px; font-size: 12.5px; color: #334155;">
            <strong>🛡️ Risk Assessment & RBI Action:</strong> ${rbiImpact}
          </div>
        </div>
      `;
    }
  } catch (err) {
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="toxic-result-card" style="border-left-color: #ef4444; background: #fef2f2;">
          <strong style="color: #b91c1c;">⚠️ Calculation Notice:</strong>
          <span style="color: #7f1d1d; margin-left: 6px;">${toxic_escapeHTML(err.message)}</span>
        </div>`;
    }
  }
}
window.calculateToxic_Toxic = calculateToxic_Toxic;

// --- Gas Composition Calculator JS ---

// Initial gases with molar masses
const molarMasses = {
  c1: 16.04,
  c2: 30.07,
  c3: 44.10,
  c4: 58.12,
  c5: 72.15,
  h2s: 34.08,
  co: 28.01,
  co2: 44.01
};

const gasNames = {
  c1: "C1 (Methane)",
  c2: "C2 (Ethane)",
  c3: "C3 (Propane)",
  c4: "C4 (Butane)",
  c5: "C5 (Pentane)",
  h2s: "H2S",
  co: "CO",
  co2: "CO2"
};

let gasData = [];

function populateGasDropdown() {
  const gasSelect = document.getElementById('gasSelect');
  if (!gasSelect) return;
  gasSelect.innerHTML = '<option value="">--Select--</option>';
  for (const key in molarMasses) {
    const name = gasNames[key] || key.toUpperCase();
    gasSelect.innerHTML += `<option value="${key}">${name}</option>`;
  }
}

function updateTable() {
  const gasTableBody = document.querySelector('#gasTable tbody');
  const totalMassSpan = document.getElementById('totalMass');

  gasTableBody.innerHTML = '';

  gasData.forEach(g => {
    g.moleFraction = g.molePercent / 100;
    g.massContribution = g.moleFraction * g.molarMass;
  });

  let totalMass = gasData.reduce((sum, g) => sum + g.massContribution, 0);

  gasData.forEach((g, idx) => {
    const wtPercent = totalMass ? (g.massContribution / totalMass) * 100 : 0;

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${g.customName || gasNames[g.gasKey] || g.gasKey.toUpperCase()}</td>
      <td><input type="number" min="0" max="100" step="any" value="${g.molePercent.toFixed(3)}" data-idx="${idx}" class="editableMolePercent" /></td>
      <td>${g.moleFraction.toFixed(5)}</td>
      <td>${g.molarMass.toFixed(2)}</td>
      <td>${g.massContribution.toFixed(5)}</td>
      <td>${wtPercent.toFixed(5)}</td>
      <td><button class="removeBtn" data-idx="${idx}">Remove</button></td>
    `;

    gasTableBody.appendChild(tr);
  });

  totalMassSpan.textContent = totalMass.toFixed(6);

  // Add event listeners for inputs and remove buttons
  document.querySelectorAll('.editableMolePercent').forEach(input => {
    input.addEventListener('input', (e) => {
      const i = parseInt(e.target.getAttribute('data-idx'));
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 100) val = 100;
      gasData[i].molePercent = val;
      updateTable();
    });
  });

  document.querySelectorAll('.removeBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.target.getAttribute('data-idx'));
      gasData.splice(i, 1);
      updateTable();
    });
  });
}

function initToxicButtons() {
  const addGasBtn = document.getElementById('addGasBtn');
  if (addGasBtn && !addGasBtn._bound) {
    addGasBtn._bound = true;
    addGasBtn.addEventListener('click', () => {
      const gasSelect = document.getElementById('gasSelect');
      const molePercentInput = document.getElementById('molePercent');
      if (!gasSelect || !molePercentInput) return;

      const gas = gasSelect.value;
      let molePercent = parseFloat(molePercentInput.value);

      if (!gas) {
        alert('Please select a gas.');
        return;
      }
      if (isNaN(molePercent) || molePercent < 0 || molePercent > 100) {
        alert('Please enter a valid mole % between 0 and 100.');
        return;
      }

      const existingIndex = gasData.findIndex(g => g.gasKey === gas);
      if (existingIndex !== -1) {
        gasData[existingIndex].molePercent = molePercent;
      } else {
        gasData.push({
          gasKey: gas,
          customName: null,
          molePercent,
          moleFraction: molePercent / 100,
          molarMass: molarMasses[gas]
        });
      }

      updateTable();

      gasSelect.value = '';
      molePercentInput.value = '';
    });
  }

  const addNewGasBtn = document.getElementById('addNewGasBtn');
  if (addNewGasBtn && !addNewGasBtn._bound) {
    addNewGasBtn._bound = true;
    addNewGasBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('newGasName');
      const massInput = document.getElementById('newGasMolarMass');
      if (!nameInput || !massInput) return;
      const name = nameInput.value.trim();
      const molarMass = parseFloat(massInput.value);

      if (!name) {
        alert('Please enter a gas name.');
        return;
      }
      if (isNaN(molarMass) || molarMass <= 0) {
        alert('Please enter a valid molar mass (> 0).');
        return;
      }

      const key = name.toLowerCase().replace(/\s+/g, '');

      if (!molarMasses[key]) {
        molarMasses[key] = molarMass;
        gasNames[key] = name;
        populateGasDropdown();
        alert(`Gas "${name}" added. Now select it from dropdown to add mole %.`);
      } else {
        alert('Gas already exists. Use dropdown to add mole %.');
      }

      nameInput.value = '';
      massInput.value = '';
    });
  }

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn && !exportCsvBtn._bound) {
    exportCsvBtn._bound = true;
    exportCsvBtn.addEventListener('click', () => {
      if (gasData.length === 0) {
        alert('No data to export.');
        return;
      }
      let csvContent = 'Gas,Mole %,Mole Fraction,Molar Mass (g/mol),Mass Contribution (g),WT %\n';
      let totalMass = gasData.reduce((sum, g) => sum + g.massContribution, 0);

      gasData.forEach(g => {
        const wtPercent = totalMass ? (g.massContribution / totalMass) * 100 : 0;
        const row = [
          `"${g.customName || gasNames[g.gasKey] || g.gasKey.toUpperCase()}"`,
          g.molePercent.toFixed(3),
          g.moleFraction.toFixed(5),
          g.molarMass.toFixed(2),
          g.massContribution.toFixed(5),
          wtPercent.toFixed(5)
        ];
        csvContent += row.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'gas_composition.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}
window.initToxicButtons = initToxicButtons;

// Initialize gas dropdown on page load
function initToxicCalculator() {
  initToxicButtons();
  populateGasDropdown();
  toggleInputs_Toxic(); // set initial visibility based on selected calc type
  toxic_fetchUnits(); // dynamically load stream datasets from database
}

// =================================================================
// ⚡ TOXIC PROCESS STREAM AUTO-LOADER & CLOUD DATABASE INTEGRATION
// =================================================================

window.toxic_CURRENT_STREAMS = [];
window.toxic_LOADED_UNITS = [];

// Standard Toxic Gas Catalog Mapping
const TOXIC_GAS_MAP = [
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

function toxic_escapeHTML(str) {
  if (typeof str !== "string") return String(str || "");
  return str.replace(/[&<>'"]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

async function toxic_fetchUnits() {
  const unitSelector = document.getElementById("toxic-unitSelector");
  const streamSelector = document.getElementById("toxic-streamSelector");
  if (!unitSelector) return;

  unitSelector.innerHTML = '<option value="">⏳ Loading Units from Database...</option>';
  unitSelector.disabled = true;

  if (streamSelector) {
    streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
    streamSelector.disabled = true;
  }

  try {
    const res = await fetch("/api/damage-criteria?action=units");
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.units) && data.units.length > 0) {
      window.toxic_LOADED_UNITS = data.units;
      unitSelector.innerHTML = '<option value="">-- Select Unit / Plant Dataset --</option>';
      data.units.forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.id;
        const countBadge = u.streamCount !== undefined ? ` (${u.streamCount} streams)` : "";
        opt.textContent = `${u.name || u.id}${countBadge}`;
        unitSelector.appendChild(opt);
      });
    } else {
      unitSelector.innerHTML = '<option value="">-- No Units Found in Database --</option>';
    }
  } catch (err) {
    console.warn("[Toxic Auto-Loader] Unit fetch notice:", err);
    unitSelector.innerHTML = '<option value="">⚠️ Error loading units from database</option>';
  } finally {
    unitSelector.disabled = false;
  }
}

async function toxic_onUnitChange(unitId) {
  const streamSelector = document.getElementById("toxic-streamSelector");
  const alertBox = document.getElementById("toxic-autoloadAlert");
  if (!streamSelector) return;

  if (!unitId) {
    streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
    streamSelector.disabled = true;
    if (alertBox) alertBox.style.display = "none";
    return;
  }

  streamSelector.disabled = true;
  streamSelector.innerHTML = '<option value="">⏳ Loading process streams...</option>';

  try {
    const res = await fetch(`/api/damage-criteria?action=streams&unit=${encodeURIComponent(unitId)}`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();

    const streams = (data.success && Array.isArray(data.streams)) ? data.streams : [];
    window.toxic_CURRENT_STREAMS = streams;

    if (streams.length === 0) {
      streamSelector.innerHTML = '<option value="">-- No Streams Found in Unit --</option>';
      streamSelector.disabled = false;
      return;
    }

    streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
    streams.forEach((s) => {
      const streamNo = s.streamNo || s.id || "";
      const streamName = s.name || s.streamName || s.content || `Stream ${streamNo}`;
      const massFlow = s.massFlow || s.velocityFlow || s.flow || s["Mass Flow (kg/hr)"] || s["Flow Mass (kg/hr)"] || "";
      const flowText = massFlow ? ` [${Number(massFlow).toLocaleString()} kg/h]` : "";
      const opt = document.createElement("option");
      opt.value = String(s.id || streamNo);
      opt.textContent = `${streamName}${flowText}`;
      streamSelector.appendChild(opt);
    });

    streamSelector.disabled = false;
  } catch (err) {
    console.error("[Toxic Auto-Loader] Error fetching streams:", err);
    streamSelector.innerHTML = '<option value="">-- Error Loading Streams --</option>';
    streamSelector.disabled = false;
  }
}

async function toxic_onStreamSelect(streamId) {
  if (streamId) {
    await toxic_loadSelectedStream();
  }
}

async function toxic_loadSelectedStream() {
  const unitSelector = document.getElementById("toxic-unitSelector");
  const streamSelector = document.getElementById("toxic-streamSelector");
  const alertBox = document.getElementById("toxic-autoloadAlert");
  const loadBtn = document.getElementById("toxic-btnLoadStream");

  const unitId = unitSelector ? unitSelector.value.trim() : "";
  const streamId = streamSelector ? streamSelector.value.trim() : "";

  if (!unitId) {
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.innerHTML = `
        <div class="toxic-alert-banner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
          <span style="color:#d97706; margin-right:6px;">⚠️</span>
          <strong>Selection Required:</strong> Please select a <strong>Unit / Plant Dataset</strong> first.
        </div>`;
    }
    if (unitSelector) unitSelector.focus();
    return;
  }

  if (!streamId) {
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.innerHTML = `
        <div class="toxic-alert-banner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
          <span style="color:#d97706; margin-right:6px;">⚠️</span>
          <strong>Selection Required:</strong> Please select a <strong>Process Stream</strong> to load.
        </div>`;
    }
    if (streamSelector) streamSelector.focus();
    return;
  }

  const originalText = loadBtn ? loadBtn.innerHTML : "📥 Load Stream";
  if (loadBtn) {
    loadBtn.innerHTML = "⏳ Loading...";
    loadBtn.disabled = true;
  }

  try {
    let streamData = null;

    // Fetch full stream object from cloud backend
    const res = await fetch(`/api/damage-criteria?action=stream_data&unit=${encodeURIComponent(unitId)}&streamId=${encodeURIComponent(streamId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.stream) {
        streamData = json.stream;
      }
    }

    if (!streamData && window.toxic_CURRENT_STREAMS) {
      streamData = window.toxic_CURRENT_STREAMS.find(s => String(s.id) === String(streamId) || String(s.streamNo) === String(streamId));
    }

    if (!streamData) {
      throw new Error(`Stream data '${streamId}' could not be resolved from database.`);
    }

    toxic_applyStreamData(streamData, unitId);

  } catch (err) {
    console.error("[Toxic Auto-Loader] Load error:", err);
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.innerHTML = `
        <div class="toxic-alert-banner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
          <span style="color:#dc2626; margin-right:6px;">❌</span>
          <strong>Error Loading Stream:</strong> ${toxic_escapeHTML(err.message)}
        </div>`;
    }
  } finally {
    if (loadBtn) {
      loadBtn.innerHTML = originalText;
      loadBtn.disabled = false;
    }
  }
}

function toxic_applyStreamData(st, unitId) {
  if (!st) return;

  const streamName = st.name || st.streamName || st.content || `Stream ${st.streamNo || st.id || '1'}`;
  
  // 1. Resolve Total Mass Flow (kg/hr) with exhaustive property fallbacks
  let totalMassFlow = st.massFlow;
  if (totalMassFlow === undefined || totalMassFlow === null || totalMassFlow === "") {
    totalMassFlow = st.velocityFlow || st.flow || st.mass_flow || st.totalMassFlow || st.massFlowKgHr;
  }
  if (totalMassFlow === undefined || totalMassFlow === null || totalMassFlow === "") {
    totalMassFlow = st["Flow Mass (kg/hr)"] || st["Mass Flow (kg/hr)"] || st["Mass Flow"] || st["Total Flow (kg/hr)"] || st["Flow (kg/hr)"];
  }
  if ((totalMassFlow === undefined || totalMassFlow === null || totalMassFlow === "") && st.properties) {
    totalMassFlow = st.properties["Flow Mass (kg/hr)"] || st.properties["Mass Flow (kg/hr)"] || st.properties["Mass Flow"] || st.properties.massFlow || st.properties.flow;
  }
  totalMassFlow = parseFloat(totalMassFlow);
  if (!Number.isFinite(totalMassFlow) || totalMassFlow < 0) totalMassFlow = 0;

  // 2. Resolve Total Molar Flow (kmol/hr)
  let totalMolarFlow = st.molarFlow;
  if (totalMolarFlow === undefined || totalMolarFlow === null || totalMolarFlow === "") {
    totalMolarFlow = st["Flow Molar (kmol/hr)"] || st["Molar Flow (kmol/hr)"] || st["Molar Flow"] || (st.properties && (st.properties["Flow Molar (kmol/hr)"] || st.properties["Molar Flow (kmol/hr)"]));
  }
  totalMolarFlow = parseFloat(totalMolarFlow);
  if (!Number.isFinite(totalMolarFlow) || totalMolarFlow <= 0) {
    const mw = parseFloat(st.moleWeight || st.mw || st["Molecular Weight"] || (st.properties && st.properties["Molecular Weight"]) || 0);
    if (mw > 0 && totalMassFlow > 0) {
      totalMolarFlow = totalMassFlow / mw;
    }
  }

  // 3. Scan for Toxic Components
  const comps = st.components || {};
  let detectedToxic = null;
  let detectedKg = 0;
  let detectedMolPct = 0;

  // Match against standard toxic gas map
  for (const tox of TOXIC_GAS_MAP) {
    // Check direct properties on stream
    if (st[tox.key] !== undefined && parseFloat(st[tox.key]) > 0) {
      detectedToxic = tox;
      detectedKg = parseFloat(st[tox.key]);
      break;
    }
    // Check components object / array
    for (const [cName, cVal] of Object.entries(comps)) {
      const cleanName = cName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (tox.aliases.some(alias => cleanName.includes(alias.replace(/[^a-z0-9]/g, "")))) {
        detectedToxic = tox;
        if (typeof cVal === "object" && cVal !== null) {
          detectedKg = parseFloat(cVal.kgHr || cVal.flowKg || cVal.massFlow || 0);
          detectedMolPct = parseFloat(cVal.molePercent || cVal.molPct || (cVal.fraction ? cVal.fraction * 100 : 0));
        } else {
          const numVal = parseFloat(cVal);
          if (numVal > 0) {
            if (numVal <= 100 && totalMassFlow > 0 && numVal <= (totalMassFlow * 0.5)) {
              detectedMolPct = numVal;
            } else {
              detectedKg = numVal;
            }
          }
        }
        break;
      }
    }
    if (detectedToxic) break;
  }

  // Default fallback to H2S if none detected
  if (!detectedToxic) {
    detectedToxic = TOXIC_GAS_MAP[0]; // H2S (34.08)
    detectedKg = parseFloat(st.h2s || 0);
  }

  // Populate Compound Gas Table (gasComp mode) if components are present
  if (comps && typeof comps === "object" && Object.keys(comps).length > 0) {
    gasData = [];
    for (const [cName, cVal] of Object.entries(comps)) {
      const cleanKey = cName.toLowerCase().replace(/[^a-z0-9]/g, "");
      let molPct = 0;
      if (typeof cVal === "object" && cVal !== null) {
        molPct = parseFloat(cVal.molePercent || cVal.molPct || (cVal.fraction ? cVal.fraction * 100 : 0));
      } else {
        molPct = parseFloat(cVal);
      }
      if (isNaN(molPct) || molPct < 0) molPct = 0;

      // Match molar mass
      let gasKey = null;
      for (const [k, mw] of Object.entries(molarMasses)) {
        if (cleanKey.includes(k)) {
          gasKey = k;
          break;
        }
      }

      if (gasKey) {
        gasData.push({
          gasKey,
          customName: gasNames[gasKey] || cName,
          molePercent: molPct,
          moleFraction: molPct / 100,
          molarMass: molarMasses[gasKey]
        });
      } else {
        const customMw = parseFloat(st.moleWeight || 44);
        gasData.push({
          gasKey: cleanKey || "gas",
          customName: cName,
          molePercent: molPct,
          moleFraction: molPct / 100,
          molarMass: customMw
        });
      }
    }
    updateTable();
  }

  // Apply to UI fields
  const calcTypeSelect = document.getElementById("calcType_Toxic");
  const toxicGasSelect = document.getElementById("toxicGas_Toxic");
  const totalMassFlowInput = document.getElementById("totalMassFlow_Toxic");
  const componentKgInput = document.getElementById("componentKg_Toxic");
  const molPercentInput = document.getElementById("molPercent_Toxic");
  const totalMolarFlowInput = document.getElementById("totalMolarFlow_Toxic");

  // Cache active stream data for instant multi-mode conversion
  window.toxic_CURRENT_ACTIVE_STREAM = {
    st,
    unitId,
    streamName,
    detectedToxic,
    detectedKg,
    detectedMolPct,
    totalMassFlow,
    totalMolarFlow
  };

  // Determine calculation mode first and switch visibility WITHOUT wiping fields
  if (detectedKg > 0 || (detectedMolPct <= 0 && detectedKg === 0)) {
    if (calcTypeSelect) calcTypeSelect.value = "kg";
    toggleInputs_Toxic(true);
    if (componentKgInput) componentKgInput.value = parseFloat(detectedKg.toFixed(4));
  } else if (detectedMolPct > 0) {
    if (calcTypeSelect) calcTypeSelect.value = "mol";
    toggleInputs_Toxic(true);
    if (molPercentInput) molPercentInput.value = parseFloat(detectedMolPct.toFixed(6));
    if (totalMolarFlowInput && totalMolarFlow > 0) totalMolarFlowInput.value = parseFloat(totalMolarFlow.toFixed(2));
  }

  // Populate Total Mass Flow directly into input field
  if (totalMassFlowInput && totalMassFlow > 0) {
    totalMassFlowInput.value = totalMassFlow;
  }

  // Select matching toxic gas in dropdown
  if (toxicGasSelect) {
    toxicGasSelect.value = String(detectedToxic.mw);
  }

  // Show Alert Banner
  const alertBox = document.getElementById("toxic-autoloadAlert");
  if (alertBox) {
    alertBox.style.display = "block";
    const unitBadge = unitId ? ` [${toxic_escapeHTML(unitId)}]` : "";
    alertBox.innerHTML = `
      <div class="a571-alert-inner" style="background:#ecfdf5; border-color:#a7f3d0; color:#065f46; padding:10px 14px; border-radius:6px; display:flex; align-items:center; justify-content:space-between;">
        <div>
          <span style="color:#059669; font-weight:700; margin-right:6px;">✓ Stream Parameters Loaded${unitBadge}:</span>
          <strong>${toxic_escapeHTML(streamName)}</strong>
          <span style="opacity:0.85; font-size:12.5px; margin-left:6px;">(Mass Flow: <strong>${totalMassFlow.toLocaleString()} kg/h</strong> | Target Toxic: ${toxic_escapeHTML(detectedToxic.name)})</span>
        </div>
        <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="background:none; border:none; color:#065f46; cursor:pointer; font-size:16px;">&times;</button>
      </div>`;
  }

  // Ready State: Prompt user to click Execute calculation button
  const resultEl = document.getElementById("result_Toxic");
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="toxic-result-card" style="border-left-color: #3b82f6; background: #eff6ff;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color: #1e40af;">Ready for Evaluation:</strong>
            <span style="color: #1e3a8a; margin-left: 6px;">Stream <strong>${toxic_escapeHTML(streamName)}</strong> parameters loaded successfully.</span>
          </div>
          <button type="button" class="toxic-btn toxic-btn-primary" onclick="calculateToxic_Toxic()" style="padding:6px 14px; font-size:12.5px;">
            ⚡ Execute Toxic Strict Calculation
          </button>
        </div>
      </div>`;
  }
}

function toxic_onCalcTypeChange() {
  const calcType = document.getElementById("calcType_Toxic")?.value;
  toggleInputs_Toxic(true);

  if (!calcType) return;

  const active = window.toxic_CURRENT_ACTIVE_STREAM;
  const toxicGasSelect = document.getElementById("toxicGas_Toxic");
  const componentKgInput = document.getElementById("componentKg_Toxic");
  const molPercentInput = document.getElementById("molPercent_Toxic");
  const totalMolarFlowInput = document.getElementById("totalMolarFlow_Toxic");
  const totalMassFlowInput = document.getElementById("totalMassFlow_Toxic");

  let toxicMW = parseFloat(toxicGasSelect?.value || (active?.detectedToxic?.mw || 34.08));
  if (isNaN(toxicMW) || toxicMW <= 0) toxicMW = 34.08;

  let totalMass = parseFloat(totalMassFlowInput?.value || active?.totalMassFlow || 0);
  let totalMolar = parseFloat(totalMolarFlowInput?.value || active?.totalMolarFlow || 0);

  if (active && active.st) {
    if (totalMassFlowInput && totalMass > 0) {
      totalMassFlowInput.value = totalMass;
    }

    if (calcType === "kg") {
      let kg = active.detectedKg;
      if (!kg || kg <= 0) {
        let molPct = active.detectedMolPct || parseFloat(molPercentInput?.value || 0);
        if (molPct > 0 && totalMolar > 0) {
          kg = (molPct / 100) * totalMolar * toxicMW;
        } else if (molPct > 0 && totalMass > 0) {
          const avgMW = parseFloat(active.st.moleWeight || 30);
          totalMolar = totalMass / avgMW;
          kg = (molPct / 100) * totalMolar * toxicMW;
        }
      }
      if (componentKgInput && kg > 0) {
        componentKgInput.value = parseFloat(kg.toFixed(4));
      }
    } else if (calcType === "mol") {
      let molPct = active.detectedMolPct;
      if (!molPct || molPct <= 0) {
        let kg = active.detectedKg || parseFloat(componentKgInput?.value || 0);
        if (kg > 0 && totalMolar > 0) {
          const toxicKmol = kg / toxicMW;
          molPct = (toxicKmol / totalMolar) * 100;
        } else if (kg > 0 && totalMass > 0) {
          const avgMW = parseFloat(active.st.moleWeight || 30);
          totalMolar = totalMass / avgMW;
          const toxicKmol = kg / toxicMW;
          molPct = (toxicKmol / totalMolar) * 100;
        }
      }
      if (molPercentInput && molPct > 0) {
        molPercentInput.value = parseFloat(molPct.toFixed(6));
      }
      if (totalMolarFlowInput && totalMolar > 0) {
        totalMolarFlowInput.value = parseFloat(totalMolar.toFixed(2));
      }
    } else if (calcType === "gasComp") {
      updateTable();
    }
  } else {
    // Bidirectional conversion for manual input
    if (calcType === "kg") {
      const molPct = parseFloat(molPercentInput?.value || 0);
      if (molPct > 0 && totalMolar > 0) {
        const kg = (molPct / 100) * totalMolar * toxicMW;
        if (componentKgInput) componentKgInput.value = parseFloat(kg.toFixed(4));
      }
    } else if (calcType === "mol") {
      const kg = parseFloat(componentKgInput?.value || 0);
      if (kg > 0 && totalMass > 0) {
        if (!totalMolar || totalMolar <= 0) {
          totalMolar = totalMass / 30;
          if (totalMolarFlowInput) totalMolarFlowInput.value = parseFloat(totalMolar.toFixed(2));
        }
        const toxicKmol = kg / toxicMW;
        const molPct = (toxicKmol / totalMolar) * 100;
        if (molPercentInput) molPercentInput.value = parseFloat(molPct.toFixed(6));
      }
    }
  }
}

function toxic_onGasChange() {
  const calcType = document.getElementById("calcType_Toxic")?.value;
  if (!calcType) return;
  toxic_onCalcTypeChange();
}

function toxic_syncFromActiveStream() {
  const alertBox = document.getElementById("toxic-autoloadAlert");

  // Check API 571 cached stream data
  let activeStream = window.a571_lastScreenedData || window.currentSelectedStream || null;

  if (!activeStream && window.a571_STREAM_PRESETS) {
    const keys = Object.keys(window.a571_STREAM_PRESETS);
    if (keys.length > 0) {
      activeStream = window.a571_STREAM_PRESETS[keys[0]];
    }
  }

  if (activeStream) {
    toxic_applyStreamData(activeStream, "Active Session Sync");
  } else {
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.innerHTML = `
        <div class="a571-alert-inner" style="background:#fef3c7; border-color:#fde68a; color:#92400e; padding:8px 12px; border-radius:6px;">
          <span style="color:#d97706; margin-right:6px;">⚠️</span>
          <strong>No Active Stream Detected:</strong> Please select a unit and stream from the dropdown above or run an API 571 screening first.
        </div>`;
    }
  }
}

function toxic_resetAllFields() {
  resetCalculation_Toxic();
  const alertBox = document.getElementById("toxic-autoloadAlert");
  if (alertBox) alertBox.style.display = "none";
  const unitSelector = document.getElementById("toxic-unitSelector");
  const streamSelector = document.getElementById("toxic-streamSelector");
  if (unitSelector) unitSelector.value = "";
  if (streamSelector) {
    streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
    streamSelector.disabled = true;
  }
}

window.toxic_fetchUnits = toxic_fetchUnits;
window.toxic_onUnitChange = toxic_onUnitChange;
window.toxic_onStreamSelect = toxic_onStreamSelect;
window.toxic_loadSelectedStream = toxic_loadSelectedStream;
window.toxic_syncFromActiveStream = toxic_syncFromActiveStream;
window.toxic_resetAllFields = toxic_resetAllFields;
window.toxic_onCalcTypeChange = toxic_onCalcTypeChange;
window.toxic_onGasChange = toxic_onGasChange;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToxicCalculator);
} else {
  initToxicCalculator();
}
