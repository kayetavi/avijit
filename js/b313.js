// ==========================================
// ASME B31.3 PROCESS PIPING THICKNESS LOGIC
// ==========================================

// ✅ Unit Conversion Constants
const pressureToMPa = {
  "MPa": 1.0,
  "bar": 0.1,
  "kgcm2": 0.0980665,
  "psi": 0.00689476
};

const stressToMPa = {
  "MPa": 1.0,
  "ksi": 6.89476,
  "kgcm2": 0.0980665,
  "psi": 0.00689476
};

let currentPressureUnit = "MPa";
let currentStressUnit = "MPa";
let currentTempUnit = "C";

// ✅ Interactive Unit Conversion when Dropdown Changes
function handlePressureUnitChange() {
  const pInput = document.getElementById("b313_pressure");
  const unitSelect = document.getElementById("b313_pressureUnit");
  if (!pInput || !unitSelect) return;

  const newUnit = unitSelect.value || "MPa";
  const oldUnit = currentPressureUnit || "MPa";
  const rawVal = parseFloat(pInput.value);

  if (!isNaN(rawVal) && oldUnit !== newUnit) {
    const valInMPa = rawVal * (pressureToMPa[oldUnit] || 1.0);
    const converted = valInMPa / (pressureToMPa[newUnit] || 1.0);
    pInput.value = converted < 0.01 ? converted.toPrecision(3) : parseFloat(converted.toFixed(3));
  }
  currentPressureUnit = newUnit;
}
window.handlePressureUnitChange = handlePressureUnitChange;

function handleStressUnitChange() {
  const sInput = document.getElementById("b313_stress");
  const unitSelect = document.getElementById("b313_stressUnit");
  if (!sInput || !unitSelect) return;

  const newUnit = unitSelect.value || "MPa";
  const oldUnit = currentStressUnit || "MPa";
  const rawVal = parseFloat(sInput.value);

  if (!isNaN(rawVal) && oldUnit !== newUnit) {
    const valInMPa = rawVal * (stressToMPa[oldUnit] || 1.0);
    const converted = valInMPa / (stressToMPa[newUnit] || 1.0);
    sInput.value = converted < 0.01 ? converted.toPrecision(3) : parseFloat(converted.toFixed(2));
  }
  currentStressUnit = newUnit;
}
window.handleStressUnitChange = handleStressUnitChange;

// ✅ Interactive Temperature Unit Conversion
function handleTempUnitChange() {
  const tInput = document.getElementById("b313_temperature");
  const unitSelect = document.getElementById("b313_tempUnit");
  if (!tInput || !unitSelect) return;

  const newUnit = unitSelect.value || "C";
  const oldUnit = currentTempUnit || "C";
  const rawVal = parseFloat(tInput.value);

  if (!isNaN(rawVal) && oldUnit !== newUnit) {
    let converted;
    if (newUnit === "F") {
      converted = (rawVal * 9 / 5) + 32;
    } else {
      converted = (rawVal - 32) * 5 / 9;
    }
    tInput.value = Math.round(converted * 10) / 10;
  }
  currentTempUnit = newUnit;
  onDesignTemperatureChange();
}
window.handleTempUnitChange = handleTempUnitChange;

// ✅ Helper to Retrieve Design Temperature normalized to °C
function getDesignTemperatureInCelsius() {
  const tInput = document.getElementById("b313_temperature");
  const unitSelect = document.getElementById("b313_tempUnit");
  if (!tInput || tInput.value === "" || tInput.value === null) return NaN;
  const raw = parseFloat(tInput.value);
  if (isNaN(raw)) return NaN;
  const unit = (unitSelect && unitSelect.value) ? unitSelect.value : "C";
  return unit === "F" ? ((raw - 32) * 5 / 9) : raw;
}
window.getDesignTemperatureInCelsius = getDesignTemperatureInCelsius;

// ✅ Toggle Weld Factor Section
function toggleWeldFactor() {
  const highTempEl = document.getElementById("b313_highTemp");
  const sec = document.getElementById("b313_weldFactorSection");
  if (sec && highTempEl) {
    const isYes = highTempEl.value === "yes";
    sec.classList.toggle("hidden", !isYes);
    sec.style.setProperty("display", isYes ? "block" : "none", "important");
  }
}
window.toggleWeldFactor = toggleWeldFactor;

// ✅ Toggle Mill Tolerance Section (Hides/Shows Schedule and Nominal Thickness)
function toggleMillToleranceSection() {
  const el = document.getElementById("b313_includeMillTol");
  const sec = document.getElementById("b313_millTolSection");
  const tolBtn = document.getElementById("b313_checkTolBtn");
  if (el) {
    const isYes = el.value === "yes";
    if (sec) {
      sec.classList.toggle("hidden", !isYes);
      sec.style.setProperty("display", isYes ? "block" : "none", "important");
      if (isYes) {
        loadMillTolerance();
      }
    }
    if (tolBtn) {
      tolBtn.disabled = !isYes;
      if (!isYes) {
        tolBtn.classList.add("disabled");
        tolBtn.style.opacity = "0.4";
        tolBtn.style.cursor = "not-allowed";
        tolBtn.setAttribute("title", "Mill Tolerance is currently set to NO. Set 'Include Mill Tolerance?' to YES to check tolerance.");
      } else {
        tolBtn.classList.remove("disabled");
        tolBtn.style.opacity = "1";
        tolBtn.style.cursor = "pointer";
        tolBtn.removeAttribute("title");
      }
    }
  }
}
window.toggleMillToleranceSection = toggleMillToleranceSection;

// ✅ Toggle Corrosion Allowance Box
function toggleCABox() {
  const el = document.getElementById("b313_includeCA");
  const box = document.getElementById("b313_caBox");
  if (box && el) {
    const isYes = el.value === "yes";
    box.classList.toggle("hidden", !isYes);
    box.style.setProperty("display", isYes ? "flex" : "none", "important");
  }
}
window.toggleCABox = toggleCABox;

// ✅ Auto-select Y Factor based on Design Temperature and Material (Powered by Backend API /api/b313/metadata)
async function autoSelectYFactor(tempC = NaN) {
  if (isNaN(tempC)) {
    tempC = getDesignTemperatureInCelsius();
  }

  const matEl = document.getElementById("b313_yMaterial");
  const ySelect = document.getElementById("b313_yFactor");
  const autoHint = document.getElementById("b313_yAutoHint");
  if (!ySelect) return;

  const materialGroup = (matEl && matEl.value) ? matEl.value : "ferritic";

  try {
    const res = await fetch("/api/b313/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempC: isNaN(tempC) ? null : tempC, materialGroup })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.warn("Y-factor metadata response:", data.error || "Metadata fetch warning");
      return;
    }

    const options = data.options || [];
    const targetIdx = (typeof data.targetIdx === "number" && data.targetIdx >= 0 && data.targetIdx < options.length) ? data.targetIdx : 0;

    ySelect.innerHTML = "";
    options.forEach((item, idx) => {
      const opt = document.createElement("option");
      opt.value = String(item.y);
      opt.textContent = `${item.temp} — Y = ${item.y}${item.note ? ` (${item.note})` : ""}`;
      if (idx === targetIdx) {
        opt.selected = true;
      }
      ySelect.appendChild(opt);
    });
    if (options.length > 0) {
      ySelect.selectedIndex = targetIdx;
    }

    if (autoHint) {
      if (!isNaN(tempC) && options[targetIdx]) {
        const selected = options[targetIdx];
        autoHint.style.display = "inline-flex";
        autoHint.textContent = `⚡ Auto: Y = ${selected.y}`;
      } else {
        autoHint.style.display = "none";
      }
    }
  } catch (err) {
    console.warn("Could not fetch Y-factor metadata:", err?.message || err);
  }
}
window.autoSelectYFactor = autoSelectYFactor;

// ✅ Update Y Factor Dropdown
function updateYDropdown() {
  autoSelectYFactor();
}
window.updateYDropdown = updateYDropdown;

// ✅ Configure High-Temperature Service visibility and settings (Powered by Backend API /api/b313/metadata)
async function configureHighTempService(tempC = NaN) {
  if (isNaN(tempC)) {
    tempC = getDesignTemperatureInCelsius();
  }

  const card = document.getElementById("b313_highTempCard");
  const highTempEl = document.getElementById("b313_highTemp");
  const wSec = document.getElementById("b313_weldFactorSection");
  const wSelect = document.getElementById("b313_wFactor");

  if (!card || !highTempEl) return;

  const isHighTemp = !isNaN(tempC) && tempC > 427;

  if (!isHighTemp) {
    card.style.display = "none";
    highTempEl.value = "no";
    if (wSec) {
      wSec.classList.add("hidden");
      wSec.style.setProperty("display", "none", "important");
    }
  } else {
    card.style.display = "block";
    highTempEl.value = "yes";
    if (wSec) {
      wSec.classList.remove("hidden");
      wSec.style.setProperty("display", "block", "important");
    }

    if (wSelect) {
      try {
        const res = await fetch("/api/b313/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tempC, materialGroup: "ferritic" })
        });
        const data = await res.json();
        if (data.success && data.wVal) {
          wSelect.value = data.wVal;
        }
      } catch (err) {
        console.error("Failed to fetch W-factor metadata:", err);
      }
    }
  }
}
window.configureHighTempService = configureHighTempService;

// ✅ Handler for Design Temperature Changes
function onDesignTemperatureChange() {
  const tempC = getDesignTemperatureInCelsius();

  // 1. Sync with Allowable Stress Auto-Lookup Temperature if available
  const autoTempInput = document.getElementById("b313_stressTemp");
  if (autoTempInput && !isNaN(tempC)) {
    autoTempInput.value = Math.round(tempC);
    const autoToggle = document.getElementById("b313_autoStressToggle");
    if (autoToggle && autoToggle.checked && typeof evaluateB313AutoStress === "function") {
      evaluateB313AutoStress();
    }
  }

  // 2. Auto-select Y Factor based on Design Temperature and Y Factor Material
  autoSelectYFactor(tempC);

  // 3. Configure High-Temperature Service visibility and settings
  configureHighTempService(tempC);
}
window.onDesignTemperatureChange = onDesignTemperatureChange;

// ✅ Quick Helper to Apply Required Nominal Wall Thickness and Recalculate
function applyRequiredNominal(val) {
  const nomInput = document.getElementById("b313_nomThickness");
  if (nomInput) {
    nomInput.value = parseFloat(val).toFixed(2);
    nomInput.dataset.userEdited = "true";
  }
  calculateThickness();
}
window.applyRequiredNominal = applyRequiredNominal;

// ✅ Quick Helper to Force Auto-fill from ASME B31.3 Design Formula
function autoFillNominalThickness() {
  const nomInput = document.getElementById("b313_nomThickness");
  const schSelect = document.getElementById("b313_schedule");
  if (nomInput) {
    nomInput.dataset.userEdited = "false";
    nomInput.value = "";
  }
  if (schSelect) {
    schSelect.value = "";
  }
  calculateThickness();
}
window.autoFillNominalThickness = autoFillNominalThickness;

// ✅ Load Mill Tolerance % and mm (Powered by Backend API /api/b313/mill-tolerance)
async function loadMillTolerance() {
  const matEl = document.getElementById("b313_materialStd");
  const nomEl = document.getElementById("b313_nomThickness");
  const autoTolEl = document.getElementById("b313_autoMillTol");
  const millTolEl = document.getElementById("b313_millTolerance");
  if (!matEl || !autoTolEl) return;

  const materialStd = matEl.value;
  const nominalVal = parseFloat(nomEl ? nomEl.value : 0) || 0;

  if (!materialStd) {
    autoTolEl.value = "0%";
    if (millTolEl) millTolEl.value = "0";
    return;
  }

  try {
    const res = await fetch("/api/b313/mill-tolerance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialStd, nominalVal, t_req: 0 })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Mill tolerance fetch failed");

    if (millTolEl) millTolEl.value = String(data.millTolVal);
    autoTolEl.value = data.displayTol;
  } catch (err) {
    console.error("Failed to load mill tolerance:", err);
  }
}
window.loadMillTolerance = loadMillTolerance;

// ✅ Dedicated Tolerance & Net Thickness Check Renderer
function renderToleranceCheck(nominalVal, materialStd, includeCA, CA, includeMillTol, D, serverCalc = null) {
  const resultBox = document.getElementById("b313_resultBox");
  if (!resultBox) return;

  let millTolVal = 0;
  let t_afterMill = nominalVal;
  let t_includingCA_Mill = nominalVal;
  let displayTol = "12.5%";

  if (serverCalc && typeof serverCalc.millTolVal === "number") {
    millTolVal = serverCalc.millTolVal;
    t_afterMill = typeof serverCalc.t_afterMill === "number" ? serverCalc.t_afterMill : (nominalVal - millTolVal);
    t_includingCA_Mill = typeof serverCalc.t_includingCA_Mill === "number"
      ? serverCalc.t_includingCA_Mill
      : (includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill);
    displayTol = serverCalc.displayTol || ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");
  } else {
    const tolMap = (window.b313Catalog && window.b313Catalog.millToleranceMap) || {};
    const entry = tolMap[materialStd];
    if (includeMillTol && materialStd) {
      if (entry) {
        millTolVal = entry.type === "percent" ? nominalVal * (entry.value / 100) : entry.value;
      } else if (materialStd.indexOf("API 5L") !== -1) {
        millTolVal = 0.4;
      } else {
        millTolVal = nominalVal * 0.125;
      }
      t_afterMill = nominalVal - millTolVal;
      t_includingCA_Mill = includeCA ? Math.max(t_afterMill - CA, 0) : t_afterMill;
    } else if (includeCA) {
      t_includingCA_Mill = Math.max(nominalVal - CA, 0);
    }
    displayTol = (materialStd && (materialStd.indexOf("API 5L") !== -1 || entry?.type === "mm"))
      ? millTolVal.toFixed(2) + " mm"
      : ((nominalVal > 0 ? (millTolVal / nominalVal * 100).toFixed(1) : "12.5") + "%");
  }

  let html = `
    <div class="b313-calc-result-card" style="padding:16px;border-radius:8px;border-left:4px solid #27ae60;margin-bottom:15px;background:rgba(39, 174, 96, 0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <h3 class="b313-calc-title" style="margin:0;font-size:16px;color:#27ae60;">⚙️ Mill Under-Tolerance & Thickness Evaluation</h3>
        <span style="font-size:11px;background:#27ae60;color:#fff;padding:3px 10px;border-radius:12px;font-weight:600;letter-spacing:0.5px;">TOLERANCE CHECK MODE</span>
      </div>
      
      <p style="margin:6px 0;font-size:14px;"><strong>Material Standard:</strong> <span style="font-weight:600;">${materialStd || "Standard (12.5%)"}</span></p>
      <p style="margin:6px 0;font-size:14px;"><strong>Nominal Wall Thickness (t<sub>nom</sub>):</strong> <span style="font-size:17px;font-weight:bold;color:#2c3e50;">${nominalVal.toFixed(3)} mm</span></p>
      
      ${includeMillTol ? `
        <p style="margin:6px 0;font-size:14px;">
          <strong>Manufacturer Under-Tolerance:</strong> 
          <span style="font-weight:bold;color:#e74c3c;">-${displayTol} (-${millTolVal.toFixed(3)} mm)</span>
        </p>
        <p style="margin:6px 0;font-size:14px;">
          <strong>Minimum Thickness after Mill Tolerance:</strong> 
          <span style="font-size:16px;font-weight:bold;color:#2980b9;">${t_afterMill.toFixed(3)} mm</span>
          <small style="color:#7f8c8d;">(t<sub>nom</sub> - Tolerance)</small>
        </p>
      ` : `
        <p style="margin:6px 0;font-size:13px;color:#7f8c8d;"><em>Mill Tolerance: Excluded (0.00 mm)</em></p>
      `}

      ${includeCA ? `
        <p style="margin:6px 0;font-size:14px;">
          <strong>Corrosion Allowance (CA):</strong> <span style="font-weight:600;color:#e67e22;">${CA.toFixed(2)} mm</span>
        </p>
        <p style="margin:8px 0;font-size:15px;padding:8px 12px;background:rgba(39, 174, 96, 0.12);border-radius:6px;">
          <strong>Net Available Thickness (t<sub>net</sub>):</strong> 
          <span style="font-size:18px;font-weight:bold;color:#27ae60;">${t_includingCA_Mill.toFixed(3)} mm</span>
          <br><small style="color:#555;">(t<sub>nom</sub> - Mill Tolerance - CA)</small>
        </p>
      ` : `
        <p style="margin:6px 0;font-size:13px;color:#7f8c8d;"><em>Corrosion Allowance: Excluded (0.00 mm)</em></p>
        <p style="margin:8px 0;font-size:15px;padding:8px 12px;background:rgba(39, 174, 96, 0.12);border-radius:6px;">
          <strong>Net Available Thickness:</strong> 
          <span style="font-size:18px;font-weight:bold;color:#27ae60;">${t_afterMill.toFixed(3)} mm</span>
        </p>
      `}

      <div style="margin-top:12px;padding:8px 12px;background:rgba(0,0,0,0.03);border-radius:4px;font-size:12px;color:#64748b;line-height:1.4;">
        ℹ️ <strong>Tolerance Check Active:</strong> Design Pressure (P) and Allowable Stress (S) fields were not provided, so manufacturer under-tolerance and corrosion allowance were evaluated directly without requiring full ASME B31.3 formula inputs.
      </div>
    </div>

    <details open style="margin-top:10px;">
      <summary class="b313-summary-link" style="font-weight:bold;cursor:pointer;margin-bottom:8px;color:#2c3e50;">📋 Tolerance Parameter Breakdown</summary>
      <table class="b313-breakdown-table" style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr class="b313-table-head-row">
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #ddd;">Parameter</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #ddd;">User Selection</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #ddd;">Value / Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Nominal Thickness (t<sub>nom</sub>)</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Specified / NPS Std</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;">${nominalVal.toFixed(3)} mm</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Material Standard</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${materialStd || "Standard"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Tolerance: -${displayTol}</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Mill Tolerance Deduction</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${includeMillTol ? "Included" : "Excluded"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;color:#e74c3c;">${includeMillTol ? `-${millTolVal.toFixed(3)} mm` : "0.00 mm"}</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Minimum Thickness after Under-Tolerance</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">t<sub>nom</sub> - Tolerance</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;color:#2980b9;">${t_afterMill.toFixed(3)} mm</td>
          </tr>
          <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">Corrosion Allowance (CA)</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;">${includeCA ? "Yes" : "No"}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:bold;color:#e67e22;">${includeCA ? `-${CA.toFixed(2)} mm` : "0.00 mm"}</td>
          </tr>
          <tr style="background:rgba(39, 174, 96, 0.08);font-weight:bold;">
            <td style="padding:6px 10px;">Net Usable Wall Thickness</td>
            <td style="padding:6px 10px;">t<sub>nom</sub> - Tol - CA</td>
            <td style="padding:6px 10px;color:#27ae60;font-size:14px;">${t_includingCA_Mill.toFixed(3)} mm</td>
          </tr>
        </tbody>
      </table>
    </details>
  `;

  resultBox.innerHTML = html;
}
window.renderToleranceCheck = renderToleranceCheck;

// ✅ Standalone / Quick Tolerance Check Function (Powered by Backend API)
async function checkToleranceOnly() {
  const includeMillTol = document.getElementById("b313_includeMillTol")?.value === "yes";
  if (!includeMillTol) {
    console.warn("Tolerance check blocked: Include Mill Tolerance is NO.");
    return;
  }

  const spinner = document.getElementById("b313_spinner");
  const resultBox = document.getElementById("b313_resultBox");
  const tolBtn = document.getElementById("b313_checkTolBtn");

  if (spinner) spinner.classList.remove("b313-hidden");
  if (resultBox) resultBox.innerHTML = "";
  if (tolBtn) {
    tolBtn.disabled = true;
    tolBtn.textContent = "Checking...";
  }

  try {
    const dInput = document.getElementById("b313_diameter");
    const D = dInput ? parseFloat(dInput.value) : NaN;
    const includeCA = document.getElementById("b313_includeCA")?.value === "yes";
    const caRaw = parseFloat(document.getElementById("b313_corrosion")?.value);
    const materialStd = document.getElementById("b313_materialStd")?.value || "A106";
    const nominalInput = document.getElementById("b313_nomThickness");
    let nominalVal = nominalInput ? parseFloat(nominalInput.value) : NaN;

    const res = await fetch("/api/b313/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "tolerance_only",
        D,
        includeCA,
        caRaw,
        includeMillTol,
        materialStd,
        nominalVal
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Tolerance calculation failed");
    }

    if (nominalInput && (!nominalVal || isNaN(nominalVal))) {
      nominalInput.value = data.nominalVal.toFixed(2);
    }

    renderToleranceCheck(data.nominalVal, data.materialStd, data.includeCA, data.CA, data.includeMillTol, D, data);
  } catch (err) {
    if (resultBox) {
      resultBox.innerHTML = `<strong style='color:#e74c3c;'>⚠️ Error: ${err.message}</strong>`;
    }
  } finally {
    if (spinner) spinner.classList.add("b313-hidden");
    if (tolBtn) {
      tolBtn.disabled = false;
      tolBtn.textContent = "⚙️ Check Tolerance Only";
    }
  }
}
window.checkToleranceOnly = checkToleranceOnly;

// ✅ Final Calculation (Powered by Backend API)
async function calculateThickness() {
  const spinner = document.getElementById("b313_spinner");
  const resultBox = document.getElementById("b313_resultBox");
  const calcBtn = document.querySelector("#ASMEB31_3Tab .calculate-btn") || document.querySelector(".calculate-btn");

  if (spinner) spinner.classList.remove("b313-hidden");
  if (resultBox) resultBox.innerHTML = "";
  if (calcBtn) {
    calcBtn.disabled = true;
    calcBtn.textContent = "Calculating...";
  }

  try {
    const pInput = document.getElementById("b313_pressure");
    const tInput = document.getElementById("b313_temperature");
    const tUnit = document.getElementById("b313_tempUnit")?.value || "C";
    const sInput = document.getElementById("b313_stress");
    const dInput = document.getElementById("b313_diameter");
    const eInput = document.getElementById("b313_efficiency");
    const yInput = document.getElementById("b313_yFactor");
    const pUnit = document.getElementById("b313_pressureUnit")?.value || "MPa";
    const sUnit = document.getElementById("b313_stressUnit")?.value || "MPa";

    const P_raw = pInput ? parseFloat(pInput.value) : NaN;
    const T_raw = tInput ? parseFloat(tInput.value) : NaN;
    const tempC = getDesignTemperatureInCelsius();
    const S_raw = sInput ? parseFloat(sInput.value) : NaN;
    const D = dInput ? parseFloat(dInput.value) : NaN;
    const E = eInput ? parseFloat(eInput.value) : NaN;
    const Y = (yInput && !isNaN(parseFloat(yInput.value))) ? parseFloat(yInput.value) : 0.4;

    const isHighTemp = document.getElementById("b313_highTemp")?.value === "yes";
    const W = isHighTemp ? (parseFloat(document.getElementById("b313_wFactor")?.value) || 1.0) : 1.0;

    const includeCA = document.getElementById("b313_includeCA")?.value === "yes";
    const caRaw = parseFloat(document.getElementById("b313_corrosion")?.value);

    const includeMillTol = document.getElementById("b313_includeMillTol")?.value === "yes";
    const materialStd = document.getElementById("b313_materialStd")?.value || "";
    const nominalInput = document.getElementById("b313_nomThickness");
    const userEdited = nominalInput ? (nominalInput.dataset.userEdited === "true") : false;
    let nominalVal = nominalInput ? parseFloat(nominalInput.value) : NaN;

    if (isNaN(P_raw) || isNaN(S_raw)) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div style="padding:12px;background:#fef9e7;border-left:4px solid #f39c12;border-radius:5px;font-size:14px;color:#7d6608;">
            <strong>⚠️ Design Pressure and Allowable Stress are required for ASME B31.3 thickness calculation.</strong><br>
            If you only want to check Mill Tolerance and Net Wall without pressure/stress, click the dedicated <button type="button" onclick="checkToleranceOnly()" style="margin-left:6px;padding:3px 8px;background:#2c3e50;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">⚙️ Check Tolerance Only</button> button.
          </div>
        `;
      }
      return;
    }

    if (isNaN(D) || isNaN(E)) {
      if (resultBox) {
        resultBox.innerHTML = "<strong style='color:#b91c1c;'>⚠️ Please select Pipe Diameter (NPS / OD) and Weld Joint Efficiency (E).</strong>";
      }
      return;
    }

    const res = await fetch("/api/b313/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "full",
        P_raw,
        pUnit,
        T_raw,
        tUnit,
        tempC,
        S_raw,
        sUnit,
        D,
        E,
        Y,
        W,
        includeCA,
        caRaw,
        includeMillTol,
        materialStd,
        nominalVal,
        userEdited
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "ASME B31.3 calculation failed");
    }

    if (data.autoFilled && nominalInput) {
      nominalInput.value = data.nominalVal.toFixed(2);
      nominalInput.dataset.userEdited = "false";
      const schSelect = document.getElementById("b313_schedule");
      if (schSelect) {
        for (let i = 0; i < schSelect.options.length; i++) {
          const opt = schSelect.options[i];
          if (opt.textContent.includes(`(${data.nominalVal.toFixed(2)} mm)`) || opt.textContent.includes(`(${data.nominalVal} mm)`)) {
            schSelect.value = opt.value;
            break;
          }
        }
      }
      loadMillTolerance();
    }

    const {
      t_design,
      t_req,
      t_nom_req,
      nominalVal: finalNom,
      millTolVal,
      t_afterMill,
      t_includingCA_Mill,
      isAdequate,
      displayTol,
      P_val,
      S_val,
      CA
    } = data;

    let html = `
      <div class="b313-calc-result-card" style="padding:15px;border-radius:6px;border-left:4px solid #2980b9;margin-bottom:15px;">
        <h3 class="b313-calc-title" style="margin-top:0;font-size:16px;">📊 Calculation Results (Backend ASME B31.3)</h3>
        <p style="margin:5px 0;"><strong>ASME B31.3 Formula:</strong> <code>t = (P × D) / [2 × (S × E × W + P × Y)]</code></p>
        
        <p class="b313-res-design" style="margin:8px 0;font-size:16px;">
          <strong>Design Thickness (t):</strong> <span style="font-size:18px;font-weight:bold;color:#2c3e50;">${t_design.toFixed(3)} mm</span>
        </p>
        
        <p class="b313-res-req" style="margin:8px 0;font-size:16px;">
          <strong>Required Thickness (tm = t + CA):</strong> <span style="font-size:18px;font-weight:bold;color:#16a085;">${t_req.toFixed(3)} mm</span>
          <small style="color:#555;">(${t_design.toFixed(3)} mm design + ${CA.toFixed(2)} mm CA)</small>
        </p>

        <p style="margin:8px 0;font-size:15px;">
          <strong>Nominal Thickness Selected:</strong> <span style="font-size:16px;font-weight:bold;color:#2980b9;">${finalNom.toFixed(2)} mm</span>
          <small style="color:${userEdited ? '#d35400' : '#2980b9'};font-weight:bold;">
            (${userEdited ? 'Custom User Override' : 'Auto-filled from Design Calculation'})
          </small>
        </p>

        <div class="b313-mill-subcard" style="margin-top:10px;padding-top:10px;border-top:1px dashed #bce;font-size:14px;">
          <p style="margin:4px 0;"><strong>Mill Tolerance (${includeMillTol ? (materialStd || "Standard") : "Excluded"}):</strong> ${includeMillTol ? `-${displayTol} (-${millTolVal.toFixed(3)} mm)` : "0.00 mm"}</p>
          <p style="margin:4px 0;"><strong>Thickness after Mill Tolerance:</strong> <span style="font-weight:bold;color:#2980b9;">${t_afterMill.toFixed(3)} mm</span></p>
          <p class="b313-res-net" style="margin:6px 0;font-weight:bold;font-size:15px;padding:8px 12px;background:rgba(39, 174, 96, 0.12);border-radius:6px;border-left:3px solid #27ae60;">
            <span style="color:#166534;">Net Usable Wall (t_nom - MillTol - CA):</span> <strong style="font-size:17px;color:#27ae60;margin-left:6px;">${t_includingCA_Mill.toFixed(3)} mm</strong>
            <br><small style="font-weight:normal;color:#555;font-size:12px;">(${finalNom.toFixed(2)} mm nominal ${includeMillTol ? `- ${millTolVal.toFixed(3)} mm mill tol` : ''} ${includeCA ? `- ${CA.toFixed(2)} mm CA` : ''})</small>
          </p>
          <p style="margin:4px 0;font-size:13px;color:#555;">
            Minimum Required Nominal Wall (t<sub>nom, req</sub>): <strong>${t_nom_req.toFixed(3)} mm</strong>
          </p>
        </div>
    `;

    if (includeMillTol) {
      if (isAdequate) {
        html += `
          <div style="margin-top:12px;padding:10px 14px;background:#eafaf1;border-left:4px solid #27ae60;color:#1e8449;border-radius:4px;font-size:13px;">
            <strong>✅ ACCEPTABLE (Complies with ASME B31.3):</strong><br>
            Nominal thickness of <strong>${finalNom.toFixed(2)} mm</strong> yields <strong>${t_afterMill.toFixed(3)} mm</strong> after mill tolerance deduction, which satisfies the required minimum thickness (t<sub>m</sub> = ${t_req.toFixed(3)} mm).
          </div>
        `;
      } else {
        html += `
          <div style="margin-top:12px;padding:10px 14px;background:#fef5e7;border-left:4px solid #e67e22;color:#b9770e;border-radius:4px;font-size:13px;">
            <strong>⚠️ INSUFFICIENT THICKNESS:</strong><br>
            Nominal thickness of <strong>${finalNom.toFixed(2)} mm</strong> yields <strong>${t_afterMill.toFixed(3)} mm</strong> after mill tolerance deduction, which is less than required minimum thickness (t<sub>m</sub> = ${t_req.toFixed(3)} mm).<br>
            <div style="margin-top:8px;">
              <button type="button" onclick="window.applyRequiredNominal(${t_nom_req.toFixed(2)})" style="padding:5px 12px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">
                ⚡ Set Nominal to Required (${t_nom_req.toFixed(2)} mm) & Recalculate
              </button>
            </div>
          </div>
        `;
      }
    } else {
      html += `
        <div style="margin-top:12px;padding:10px 14px;background:#eafaf1;border-left:4px solid #27ae60;color:#1e8449;border-radius:4px;font-size:13px;">
          <strong>✅ ASME B31.3 MINIMUM REQUIRED THICKNESS:</strong><br>
          Design minimum required wall thickness <strong>t<sub>m</sub> = ${t_req.toFixed(3)} mm</strong> (Design t: ${t_design.toFixed(3)} mm + CA: ${CA.toFixed(2)} mm).<br>
          <small style="color:#64748b;">To verify pipe schedule (SCH) and apply manufacturer under-tolerance, set "Include Mill Tolerance?" to YES.</small>
        </div>
      `;
    }

    html += `
        <p class="b313-res-meta" style="margin-top:10px;font-size:12px;color:#777;">
          Calculated via Backend API with P = ${P_val.toFixed(3)} MPa, ${!isNaN(tempC) ? `T = ${tempC.toFixed(1)}°C, ` : ''}S = ${S_val.toFixed(2)} MPa, OD = ${D.toFixed(1)} mm, E = ${E}, Y = ${Y}, W = ${W}
        </p>
      </div>
    `;

    html += `
      <details open style="margin-top:10px;">
        <summary class="b313-summary-link" style="font-weight:bold;cursor:pointer;margin-bottom:8px;">📋 View Parameter Breakdown (Backend)</summary>
        <table class="b313-breakdown-table" style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr class="b313-table-head-row">
              <th style="padding:6px 10px;text-align:left;">Parameter</th>
              <th style="padding:6px 10px;text-align:left;">User Input</th>
              <th style="padding:6px 10px;text-align:left;">Value Used in Formula / Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:6px 10px;">Design Pressure (P)</td>
              <td style="padding:6px 10px;">${P_raw} ${pUnit}</td>
              <td style="padding:6px 10px;font-weight:bold;">${P_val.toFixed(3)} MPa</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Design Temperature (T)</td>
              <td style="padding:6px 10px;">${!isNaN(T_raw) ? `${T_raw} °${tUnit}` : "Ambient / Not specified"}</td>
              <td style="padding:6px 10px;font-weight:bold;">${!isNaN(tempC) ? `${tempC.toFixed(1)} °C` : "Ambient"}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Allowable Stress (S)</td>
              <td style="padding:6px 10px;">${S_raw} ${sUnit}</td>
              <td style="padding:6px 10px;font-weight:bold;">${S_val.toFixed(2)} MPa</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Pipe Outside Diameter (D)</td>
              <td style="padding:6px 10px;">${D} mm</td>
              <td style="padding:6px 10px;font-weight:bold;">${D} mm</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Joint Efficiency (E)</td>
              <td style="padding:6px 10px;">${E}</td>
              <td style="padding:6px 10px;font-weight:bold;">${E}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Y Factor (ASME Table 304.1.1)</td>
              <td style="padding:6px 10px;">${Y}</td>
              <td style="padding:6px 10px;font-weight:bold;">${Y}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Weld Strength Factor (W)</td>
              <td style="padding:6px 10px;">${isHighTemp ? "High Temp" : "Standard"}</td>
              <td style="padding:6px 10px;font-weight:bold;">${W}</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Corrosion Allowance (CA)</td>
              <td style="padding:6px 10px;">${includeCA ? `${CA} mm` : "None"}</td>
              <td style="padding:6px 10px;font-weight:bold;">${CA} mm</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Mill Tolerance</td>
              <td style="padding:6px 10px;">${includeMillTol ? (materialStd || "Standard") : "Excluded"}</td>
              <td style="padding:6px 10px;font-weight:bold;">${includeMillTol ? `${millTolVal.toFixed(3)} mm (-${displayTol})` : "0.000 mm"}</td>
            </tr>
            <tr style="background:rgba(41, 128, 185, 0.05);">
              <td style="padding:6px 10px;">Design Thickness (t)</td>
              <td style="padding:6px 10px;">Formula Eq. 3a</td>
              <td style="padding:6px 10px;font-weight:bold;color:#2c3e50;">${t_design.toFixed(3)} mm</td>
            </tr>
            <tr style="background:rgba(22, 160, 133, 0.05);">
              <td style="padding:6px 10px;">Required Thickness (tm = t + CA)</td>
              <td style="padding:6px 10px;">t + CA</td>
              <td style="padding:6px 10px;font-weight:bold;color:#16a085;">${t_req.toFixed(3)} mm</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Nominal Thickness Selected (t<sub>nom</sub>)</td>
              <td style="padding:6px 10px;">${userEdited ? 'User Override' : 'Auto-Calculated'}</td>
              <td style="padding:6px 10px;font-weight:bold;color:#2980b9;">${finalNom.toFixed(2)} mm</td>
            </tr>
            <tr>
              <td style="padding:6px 10px;">Thickness after Mill Tolerance</td>
              <td style="padding:6px 10px;">t<sub>nom</sub> - MillTol</td>
              <td style="padding:6px 10px;font-weight:bold;">${t_afterMill.toFixed(3)} mm</td>
            </tr>
            <tr style="background:rgba(39, 174, 96, 0.08);font-weight:bold;">
              <td style="padding:6px 10px;">Net Usable Wall Thickness</td>
              <td style="padding:6px 10px;">t<sub>nom</sub> - MillTol - CA</td>
              <td style="padding:6px 10px;color:#27ae60;font-size:14px;">${t_includingCA_Mill.toFixed(3)} mm</td>
            </tr>
          </tbody>
        </table>
      </details>
    `;

    if (resultBox) resultBox.innerHTML = html;
  } catch (err) {
    if (resultBox) {
      resultBox.innerHTML = `<strong style='color:#e74c3c;'>⚠️ Error: ${err.message}</strong>`;
    }
  } finally {
    if (spinner) spinner.classList.add("b313-hidden");
    if (calcBtn) {
      calcBtn.disabled = false;
      calcBtn.textContent = "Calculate T-min";
    }
  }
}
window.calculateThickness = calculateThickness;

// Dynamic ASME B31.3 Catalog Hydration from Backend (/api/b313)
window.b313Catalog = window.b313Catalog || {};
let standardWallThicknessByOD = {};

(async function hydrateB313CatalogFromBackend() {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/b313", { headers: { Accept: "application/json" } });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.catalog) {
        window.b313Catalog = json.catalog;
        if (json.catalog.standardWallThicknessByOD) {
          standardWallThicknessByOD = json.catalog.standardWallThicknessByOD;
        }
      }
    }
  } catch (err) {
    console.warn("[B31.3] Could not pre-fetch B31.3 catalog metadata:", err?.message || err);
  }
})();

// ==========================================
// DYNAMIC SCHEDULE & PIPE THICKNESS LOOKUP
// (REUSES PIPE THICKNESS FINDER DATA)
// ==========================================

function getPipeDataNpsKey(odValue, optionText) {
  const master = window.pipeDataMaster883 || (typeof pipeDataMaster883 !== "undefined" ? pipeDataMaster883 : null);
  if (!master) return null;

  const numOD = parseFloat(odValue);
  if (isNaN(numOD)) return null;

  const odMap = window.pipeOD883 || (typeof pipeOD883 !== "undefined" ? pipeOD883 : null);
  if (odMap) {
    let closestKey = null;
    let minDiff = Infinity;
    for (const [key, od] of Object.entries(odMap)) {
      const diff = Math.abs(od - numOD);
      if (diff < minDiff) {
        minDiff = diff;
        closestKey = key;
      }
    }
    if (minDiff <= 1.5 && closestKey && master[closestKey]) {
      return closestKey;
    }
  }

  if (optionText) {
    const match = optionText.match(/NPS\s+([0-9\/\s\.]+)"/i);
    if (match) {
      const rawNps = match[1].trim();
      const fracMap = {
        "1/8": "1/8",
        "1/4": "1/4",
        "3/8": "3/8",
        "1/2": "0.5",
        "3/4": "0.75",
        "1 1/4": "1.25",
        "1 1/2": "1.5",
        "2 1/2": "2.5",
        "3 1/2": "3.5"
      };
      const mapped = fracMap[rawNps] || rawNps;
      if (master[mapped]) return mapped;
    }
  }

  return null;
}
window.getPipeDataNpsKey = getPipeDataNpsKey;

function updateB313ScheduleList() {
  const dSelect = document.getElementById("b313_diameter");
  const schSelect = document.getElementById("b313_schedule");
  const nomInput = document.getElementById("b313_nomThickness");
  if (!schSelect) return;

  const previousSch = schSelect.value;
  schSelect.innerHTML = '<option value="">-- Select SCH --</option>';

  if (!dSelect || !dSelect.value) {
    schSelect.disabled = true;
    if (nomInput) {
      nomInput.value = "";
      nomInput.dataset.userEdited = "false";
      loadMillTolerance();
    }
    return;
  }

  const selectedOpt = dSelect.options[dSelect.selectedIndex];
  const npsKey = getPipeDataNpsKey(dSelect.value, selectedOpt ? selectedOpt.textContent : "");
  const master = window.pipeDataMaster883 || (typeof pipeDataMaster883 !== "undefined" ? pipeDataMaster883 : null);

  if (!npsKey || !master || !master[npsKey]) {
    schSelect.disabled = true;
    if (nomInput) {
      nomInput.value = "";
      nomInput.dataset.userEdited = "false";
      loadMillTolerance();
    }
    return;
  }

  schSelect.disabled = false;
  const schedules = master[npsKey];
  let isPreviousValid = false;

  for (const sch in schedules) {
    const thickVal = schedules[sch];
    if (thickVal !== "" && thickVal !== null && thickVal !== undefined) {
      const numThick = parseFloat(thickVal);
      if (!isNaN(numThick) && numThick > 0) {
        if (sch === previousSch) {
          isPreviousValid = true;
        }
        const opt = document.createElement("option");
        opt.value = sch;
        opt.textContent = `${sch} (${numThick} mm)`;
        schSelect.appendChild(opt);
      }
    }
  }

  // Clear invalid previous Schedule/Thickness selection or refresh if valid
  if (isPreviousValid && previousSch) {
    schSelect.value = previousSch;
    const newThick = parseFloat(schedules[previousSch]);
    if (!isNaN(newThick) && newThick > 0 && nomInput) {
      nomInput.value = newThick;
      nomInput.dataset.userEdited = "true";
      loadMillTolerance();
    }
  } else {
    schSelect.value = "";
    if (nomInput) {
      nomInput.value = "";
      nomInput.dataset.userEdited = "false";
      loadMillTolerance();
    }
  }
}
window.updateB313ScheduleList = updateB313ScheduleList;

function onB313ScheduleChange() {
  const dSelect = document.getElementById("b313_diameter");
  const schSelect = document.getElementById("b313_schedule");
  const nomInput = document.getElementById("b313_nomThickness");
  if (!schSelect || !nomInput) return;

  const sch = schSelect.value;
  if (!sch) {
    nomInput.value = "";
    nomInput.dataset.userEdited = "false";
    loadMillTolerance();
    return;
  }

  const selectedOpt = dSelect ? dSelect.options[dSelect.selectedIndex] : null;
  const npsKey = getPipeDataNpsKey(dSelect ? dSelect.value : "", selectedOpt ? selectedOpt.textContent : "");
  const master = window.pipeDataMaster883 || (typeof pipeDataMaster883 !== "undefined" ? pipeDataMaster883 : null);

  if (npsKey && master && master[npsKey]) {
    const thickVal = master[npsKey][sch];
    const numThick = parseFloat(thickVal);
    if (!isNaN(numThick) && numThick > 0) {
      nomInput.value = numThick;
      nomInput.dataset.userEdited = "true";
      loadMillTolerance();
    }
  }
}
window.onB313ScheduleChange = onB313ScheduleChange;

function onDiameterChange() {
  updateB313ScheduleList();
}
window.onDiameterChange = onDiameterChange;

// ✅ Resilient Initialization Function
let b313HasInitialized = false;

function initB313() {
  const pUnit = document.getElementById("b313_pressureUnit");
  if (pUnit) {
    if (!pUnit.value) pUnit.value = "MPa";
    currentPressureUnit = pUnit.value;
    pUnit.removeEventListener("change", handlePressureUnitChange);
    pUnit.addEventListener("change", handlePressureUnitChange);
  }

  const tInput = document.getElementById("b313_temperature");
  if (tInput) {
    tInput.removeEventListener("input", onDesignTemperatureChange);
    tInput.addEventListener("input", onDesignTemperatureChange);
    tInput.removeEventListener("change", onDesignTemperatureChange);
    tInput.addEventListener("change", onDesignTemperatureChange);
  }

  const tUnit = document.getElementById("b313_tempUnit");
  if (tUnit) {
    if (!tUnit.value) tUnit.value = "C";
    currentTempUnit = tUnit.value;
    tUnit.removeEventListener("change", handleTempUnitChange);
    tUnit.addEventListener("change", handleTempUnitChange);
  }

  const sUnit = document.getElementById("b313_stressUnit");
  if (sUnit) {
    if (!sUnit.value) sUnit.value = "MPa";
    currentStressUnit = sUnit.value;
    sUnit.removeEventListener("change", handleStressUnitChange);
    sUnit.addEventListener("change", handleStressUnitChange);
  }

  const dSelect = document.getElementById("b313_diameter");
  if (dSelect) {
    dSelect.removeEventListener("change", onDiameterChange);
    dSelect.addEventListener("change", onDiameterChange);
  }

  const schSelect = document.getElementById("b313_schedule");
  if (schSelect) {
    schSelect.removeEventListener("change", onB313ScheduleChange);
    schSelect.addEventListener("change", onB313ScheduleChange);
  }

  const nomInput = document.getElementById("b313_nomThickness");
  const initialNomVal = parseFloat(nomInput ? nomInput.value : "");

  // Dynamically populate schedules based on selected NPS
  updateB313ScheduleList();

  // If nominal thickness was pre-populated and schedule not yet set, match it
  if (schSelect && !schSelect.value && !isNaN(initialNomVal) && initialNomVal > 0) {
    for (let i = 0; i < schSelect.options.length; i++) {
      const opt = schSelect.options[i];
      if (opt.textContent.includes(`(${initialNomVal} mm)`) || opt.textContent.includes(`(${initialNomVal.toFixed(2)} mm)`)) {
        schSelect.value = opt.value;
        if (nomInput) {
          nomInput.value = initialNomVal.toFixed(2);
        }
        break;
      }
    }
  }

  const effSelect = document.getElementById("b313_efficiency");
  if (effSelect) {
    effSelect.removeEventListener("change", calculateThickness);
  }

  const yMat = document.getElementById("b313_yMaterial");
  if (yMat) {
    if (!yMat.value) yMat.value = "ferritic";
    yMat.removeEventListener("change", updateYDropdown);
    yMat.addEventListener("change", updateYDropdown);
  }

  // Populate Y-Factor dropdown if needed
  const ySelect = document.getElementById("b313_yFactor");
  if (ySelect && ySelect.options.length <= 1) {
    updateYDropdown();
  }

  const caSelect = document.getElementById("b313_includeCA");
  if (caSelect) {
    if (!caSelect.value) caSelect.value = "yes";
    toggleCABox();
    caSelect.removeEventListener("change", toggleCABox);
    caSelect.addEventListener("change", toggleCABox);
  }

  const millTolSelect = document.getElementById("b313_includeMillTol");
  if (millTolSelect) {
    if (!millTolSelect.value) millTolSelect.value = "no";
    toggleMillToleranceSection();
    millTolSelect.removeEventListener("change", toggleMillToleranceSection);
    millTolSelect.addEventListener("change", toggleMillToleranceSection);
  }

  const highTemp = document.getElementById("b313_highTemp");
  if (highTemp) {
    if (!highTemp.value) highTemp.value = "no";
    toggleWeldFactor();
    highTemp.removeEventListener("change", toggleWeldFactor);
    highTemp.addEventListener("change", toggleWeldFactor);
  }

  const matStd = document.getElementById("b313_materialStd");
  if (matStd) {
    matStd.removeEventListener("change", loadMillTolerance);
    matStd.addEventListener("change", loadMillTolerance);
    loadMillTolerance();
  }

  if (nomInput) {
    nomInput.removeEventListener("input", onNominalInput);
    nomInput.addEventListener("input", onNominalInput);
  }

  // 🔹 Auto Stress Lookup controls (By default UNCHECKED as requested)
  const autoToggle = document.getElementById("b313_autoStressToggle");
  if (autoToggle) {
    autoToggle.removeEventListener("change", toggleB313AutoStress);
    autoToggle.addEventListener("change", toggleB313AutoStress);
    toggleB313AutoStress();
  }

  const stressYear = document.getElementById("b313_stressYear");
  if (stressYear) {
    stressYear.removeEventListener("change", onB313StressYearChange);
    stressYear.addEventListener("change", onB313StressYearChange);
  }

  const stressMat = document.getElementById("b313_stressMaterial");
  if (stressMat) {
    stressMat.removeEventListener("change", onB313StressMaterialChange);
    stressMat.addEventListener("change", onB313StressMaterialChange);
  }

  const stressGrade = document.getElementById("b313_stressGrade");
  if (stressGrade) {
    stressGrade.removeEventListener("change", onB313StressGradeChange);
    stressGrade.addEventListener("change", onB313StressGradeChange);
  }

  const stressTh = document.getElementById("b313_stressThickness");
  if (stressTh) {
    stressTh.removeEventListener("change", onB313StressThicknessChange);
    stressTh.addEventListener("change", onB313StressThicknessChange);
  }

  const stressTemp = document.getElementById("b313_stressTemp");
  if (stressTemp) {
    stressTemp.removeEventListener("input", onB313StressTempInput);
    stressTemp.addEventListener("input", onB313StressTempInput);
  }

  // Initial configure for Y factor, High-temperature service, and Mill tolerance
  autoSelectYFactor();
  configureHighTempService();
  toggleMillToleranceSection();

  b313HasInitialized = true;
}

// =========================================================================
// ALLOWABLE STRESS AUTOMATION LOGIC (REUSES EXISTING CODE / DATABASE)
// =========================================================================

function toggleB313AutoStress() {
  const toggle = document.getElementById("b313_autoStressToggle");
  const panel = document.getElementById("b313_autoStressPanel");
  const manualGroup = document.getElementById("b313_manualStressGroup");
  const stressLabel = document.getElementById("b313_stressLabel");
  const stressInput = document.getElementById("b313_stress");
  if (!toggle) return;

  const isAuto = toggle.checked;
  if (panel) {
    panel.style.display = isAuto ? "block" : "none";
  }

  // Hide manual Allowable Stress (S) field when Auto Lookup is active
  if (manualGroup) {
    manualGroup.style.display = isAuto ? "none" : "flex";
  }
  if (stressLabel) {
    stressLabel.style.display = isAuto ? "none" : "block";
  }

  if (stressInput) {
    if (isAuto) {
      stressInput.readOnly = true;
      stressInput.classList.add("readonly-field");
      stressInput.setAttribute("title", "Allowable Stress is automatically determined from selected Code/Material data");
      stressInput.setAttribute("placeholder", "Auto-populated from Live Stress DB");
      initB313AutoStressFields(true);
    } else {
      stressInput.readOnly = false;
      stressInput.classList.remove("readonly-field");
      stressInput.removeAttribute("title");
      stressInput.setAttribute("placeholder", "Enter Allowable Stress");
    }
  }
}
window.toggleB313AutoStress = toggleB313AutoStress;

function initB313AutoStressFields(force = false, preferredYear = null, preferredMaterial = null, preferredGrade = null, preferredTemp = null) {
  const autoToggle = document.getElementById("b313_autoStressToggle");
  const panel = document.getElementById("b313_autoStressPanel");
  const manualGroup = document.getElementById("b313_manualStressGroup");
  const stressLabel = document.getElementById("b313_stressLabel");
  const stressInput = document.getElementById("b313_stress");

  const isAuto = autoToggle ? autoToggle.checked : false;
  if (panel) {
    panel.style.display = isAuto ? "block" : "none";
  }
  if (manualGroup) {
    manualGroup.style.display = isAuto ? "none" : "flex";
  }
  if (stressLabel) {
    stressLabel.style.display = isAuto ? "none" : "block";
  }
  if (stressInput) {
    if (isAuto) {
      stressInput.readOnly = true;
      stressInput.classList.add("readonly-field");
      stressInput.setAttribute("title", "Allowable Stress is automatically determined from selected Code/Material data");
      stressInput.setAttribute("placeholder", "Auto-populated from Live Stress DB");
    } else {
      stressInput.readOnly = false;
      stressInput.classList.remove("readonly-field");
      stressInput.removeAttribute("title");
      stressInput.setAttribute("placeholder", "Enter Allowable Stress");
    }
  }

  const yearSelect = document.getElementById("b313_stressYear");
  const matSelect = document.getElementById("b313_stressMaterial");
  const grSelect = document.getElementById("b313_stressGrade");
  const thSelect = document.getElementById("b313_stressThickness");
  const tempInput = document.getElementById("b313_stressTemp");

  if (!yearSelect) return;

  const years = (typeof window.bkGetAvailableYears === "function")
    ? window.bkGetAvailableYears()
    : (window.bkStressData ? Object.keys(window.bkStressData) : []);

  if (!years || years.length === 0 || !window.bkStressData || Object.keys(window.bkStressData).length === 0) {
    if (!window._b313FetchingStress) {
      window._b313FetchingStress = true;
      fetch("/api/stress-data?_t=" + Date.now(), {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          window._b313FetchingStress = false;
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            window.bkStressData = data;
            window._stressInterpolationCache = {};
            initB313AutoStressFields(true, preferredYear, preferredMaterial, preferredGrade, preferredTemp);
          }
        })
        .catch(() => { window._b313FetchingStress = false; });
    }
    if (!years || years.length === 0) return;
  }

  let curYear = preferredYear ? String(preferredYear).trim() : yearSelect.value;
  if (!curYear || !years.includes(curYear)) {
    curYear = years.includes("2020") ? "2020" : (years.includes("2022") ? "2022" : years[years.length - 1]);
  }

  yearSelect.innerHTML = '<option value="">-- Select Year --</option>';
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === curYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });
  yearSelect.value = curYear;

  // Materials for curYear
  if (matSelect && typeof window.bkGetMaterialsForYear === "function") {
    const materials = window.bkGetMaterialsForYear(curYear);
    matSelect.innerHTML = '<option value="">-- Select Material --</option>';
    matSelect.disabled = materials.length === 0;

    let curMat = preferredMaterial ? String(preferredMaterial).trim() : matSelect.value;
    if (!curMat || !materials.includes(curMat)) {
      curMat = materials.includes("A106") ? "A106" : materials[0];
    }

    materials.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      if (m === curMat) opt.selected = true;
      matSelect.appendChild(opt);
    });
    if (curMat) matSelect.value = curMat;

    // Grades for curMat
    if (grSelect && curMat && typeof window.bkGetGradesForMaterial === "function") {
      const grades = window.bkGetGradesForMaterial(curYear, curMat);
      grSelect.innerHTML = '<option value="">-- Select Grade --</option>';
      grSelect.disabled = grades.length === 0;

      let curGrade = preferredGrade ? String(preferredGrade).trim() : grSelect.value;
      if (!curGrade || !grades.includes(curGrade)) {
        curGrade = grades.includes("B") ? "B" : grades[0];
      }

      grades.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        if (g === curGrade) opt.selected = true;
        grSelect.appendChild(opt);
      });
      if (curGrade) grSelect.value = curGrade;

      // Thickness for curGrade
      if (thSelect && curGrade) {
        const thInfo = (typeof window.bkGetThicknessForGrade === "function")
          ? window.bkGetThicknessForGrade(curYear, curMat, curGrade)
          : { hasThickness: false, thicknessList: [] };

        if (thInfo.hasThickness && thInfo.thicknessList.length > 0) {
          thSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
          let curTh = thSelect.value;
          if (!curTh || !thInfo.thicknessList.includes(curTh)) {
            curTh = thInfo.thicknessList[0];
          }
          thInfo.thicknessList.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            if (t === curTh) opt.selected = true;
            thSelect.appendChild(opt);
          });
          thSelect.disabled = false;
          thSelect.value = curTh;
        } else {
          thSelect.innerHTML = '<option value="__NOT_REQUIRED__">Not Required (All Thicknesses)</option>';
          thSelect.value = "__NOT_REQUIRED__";
          thSelect.disabled = true;
        }
      }
    }
  }

  // Temperature sync
  const curDesTemp = getDesignTemperatureInCelsius();
  const desTempEl = document.getElementById("b313_temperature");
  const desUnitEl = document.getElementById("b313_tempUnit");
  if (preferredTemp !== null && preferredTemp !== undefined && preferredTemp !== "") {
    if (tempInput) tempInput.value = preferredTemp;
    if (desTempEl) {
      const u = desUnitEl ? desUnitEl.value : "C";
      desTempEl.value = u === "F" ? Math.round((preferredTemp * 9 / 5) + 32) : preferredTemp;
      autoSelectYFactor(preferredTemp);
      configureHighTempService(preferredTemp);
    }
  } else if (!isNaN(curDesTemp)) {
    if (tempInput) tempInput.value = Math.round(curDesTemp);
  } else if (desTempEl && (!desTempEl.value || desTempEl.value === "")) {
    desTempEl.value = "100";
    if (tempInput) tempInput.value = "100";
    autoSelectYFactor(100);
    configureHighTempService(100);
  }

  if (isAuto) {
    evaluateB313AutoStress(true);
  }
}
window.initB313AutoStressFields = initB313AutoStressFields;

function onB313StressYearChange() {
  const yearSelect = document.getElementById("b313_stressYear");
  const matSelect = document.getElementById("b313_stressMaterial");
  const year = yearSelect ? yearSelect.value : "";
  if (!year) {
    evaluateB313AutoStress();
    return;
  }
  const curMat = matSelect ? matSelect.value : "";
  if (matSelect && typeof window.bkGetMaterialsForYear === "function") {
    const materials = window.bkGetMaterialsForYear(year);
    matSelect.innerHTML = '<option value="">-- Select Material --</option>';
    matSelect.disabled = materials.length === 0;

    let nextMat = materials.includes(curMat) ? curMat : (materials.includes("A106") ? "A106" : materials[0]);
    materials.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      if (m === nextMat) opt.selected = true;
      matSelect.appendChild(opt);
    });
    if (nextMat) matSelect.value = nextMat;
  }
  onB313StressMaterialChange();
}
window.onB313StressYearChange = onB313StressYearChange;

function onB313StressMaterialChange() {
  const yearSelect = document.getElementById("b313_stressYear");
  const matSelect = document.getElementById("b313_stressMaterial");
  const grSelect = document.getElementById("b313_stressGrade");
  const year = yearSelect ? yearSelect.value : "";
  const material = matSelect ? matSelect.value : "";

  if (!year || !material) {
    evaluateB313AutoStress();
    return;
  }

  // Sync with b313_materialStd if possible
  const matStd = document.getElementById("b313_materialStd");
  if (matStd && material) {
    for (let i = 0; i < matStd.options.length; i++) {
      if (matStd.options[i].value === material || material.startsWith(matStd.options[i].value)) {
        matStd.selectedIndex = i;
        if (typeof loadMillTolerance === "function") loadMillTolerance();
        break;
      }
    }
  }

  const curGrade = grSelect ? grSelect.value : "";
  if (grSelect && typeof window.bkGetGradesForMaterial === "function") {
    const grades = window.bkGetGradesForMaterial(year, material);
    grSelect.innerHTML = '<option value="">-- Select Grade --</option>';
    grSelect.disabled = grades.length === 0;

    let nextGrade = grades.includes(curGrade) ? curGrade : (grades.includes("B") ? "B" : grades[0]);
    grades.forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      if (g === nextGrade) opt.selected = true;
      grSelect.appendChild(opt);
    });
    if (nextGrade) grSelect.value = nextGrade;
  }
  onB313StressGradeChange();
}
window.onB313StressMaterialChange = onB313StressMaterialChange;

function onB313StressGradeChange() {
  const yearSelect = document.getElementById("b313_stressYear");
  const matSelect = document.getElementById("b313_stressMaterial");
  const grSelect = document.getElementById("b313_stressGrade");
  const thSelect = document.getElementById("b313_stressThickness");
  const tempInput = document.getElementById("b313_stressTemp");

  const year = yearSelect ? yearSelect.value : "";
  const material = matSelect ? matSelect.value : "";
  const grade = grSelect ? grSelect.value : "";

  if (!year || !material || !grade) {
    evaluateB313AutoStress();
    return;
  }

  const thInfo = (typeof window.bkGetThicknessForGrade === "function")
    ? window.bkGetThicknessForGrade(year, material, grade)
    : { hasThickness: false, thicknessList: [] };

  if (thSelect) {
    if (thInfo.hasThickness && thInfo.thicknessList.length > 0) {
      thSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
      let curTh = thSelect.value;
      if (!curTh || !thInfo.thicknessList.includes(curTh)) {
        curTh = thInfo.thicknessList[0];
      }
      thInfo.thicknessList.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        if (t === curTh) opt.selected = true;
        thSelect.appendChild(opt);
      });
      thSelect.disabled = false;
      thSelect.value = curTh;
    } else {
      thSelect.innerHTML = '<option value="__NOT_REQUIRED__">Not Required (All Thicknesses)</option>';
      thSelect.value = "__NOT_REQUIRED__";
      thSelect.disabled = true;
    }
  }

  if (tempInput) {
    tempInput.disabled = false;
    if (!tempInput.value || isNaN(parseFloat(tempInput.value))) {
      tempInput.value = "100";
    }
  }

  evaluateB313AutoStress();
}
window.onB313StressGradeChange = onB313StressGradeChange;

function onB313StressThicknessChange() {
  const thSelect = document.getElementById("b313_stressThickness");
  const tempInput = document.getElementById("b313_stressTemp");
  if (tempInput && thSelect) {
    tempInput.disabled = !thSelect.value;
  }
  evaluateB313AutoStress();
}
window.onB313StressThicknessChange = onB313StressThicknessChange;

function onB313StressTempInput() {
  const stressTempInput = document.getElementById("b313_stressTemp");
  const tempInput = document.getElementById("b313_temperature");
  const tempUnit = document.getElementById("b313_tempUnit")?.value || "C";
  if (stressTempInput && tempInput && stressTempInput.value !== "") {
    const valC = parseFloat(stressTempInput.value);
    if (!isNaN(valC)) {
      tempInput.value = tempUnit === "F" ? Math.round((valC * 9 / 5) + 32) : valC;
      autoSelectYFactor(valC);
      configureHighTempService(valC);
    }
  }
  evaluateB313AutoStress();
}
window.onB313StressTempInput = onB313StressTempInput;

function evaluateB313AutoStress(isLiveUpdate = false) {
  const toggle = document.getElementById("b313_autoStressToggle");
  if (toggle && !toggle.checked) return;

  const year = document.getElementById("b313_stressYear")?.value;
  const material = document.getElementById("b313_stressMaterial")?.value;
  const grade = document.getElementById("b313_stressGrade")?.value;
  const thSelect = document.getElementById("b313_stressThickness");
  const thickness = thSelect ? thSelect.value : null;
  
  let temp = getDesignTemperatureInCelsius();
  if (isNaN(temp)) {
    const tempVal = document.getElementById("b313_stressTemp")?.value;
    if (tempVal !== "" && tempVal !== undefined) {
      temp = parseFloat(tempVal);
    }
  }

  const msgEl = document.getElementById("b313_stressValidationMsg");
  const resultDiv = document.getElementById("b313_autoStressResultDiv");
  const stressDisplay = document.getElementById("b313_autoStressDisplay");
  const yieldDisplay = document.getElementById("b313_autoYieldDisplay");
  const tensileDisplay = document.getElementById("b313_autoTensileDisplay");
  const stressInput = document.getElementById("b313_stress");
  const unitSelect = document.getElementById("b313_stressUnit");

  // Missing material or grade
  if (!year || !material || !grade) {
    if (msgEl) {
      msgEl.style.display = "block";
      msgEl.style.color = "#475569";
      msgEl.innerHTML = "ℹ️ Please select Material, Grade, and Thickness to determine Allowable Stress.";
    }
    if (resultDiv) resultDiv.style.display = "none";
    if (stressInput) stressInput.value = "";
    return;
  }

  // Thickness check
  const thInfo = (typeof window.bkGetThicknessForGrade === "function")
    ? window.bkGetThicknessForGrade(year, material, grade)
    : { hasThickness: false, thicknessList: [] };

  if (thInfo.hasThickness && (!thickness || thickness === "__NOT_REQUIRED__")) {
    if (msgEl) {
      msgEl.style.display = "block";
      msgEl.style.color = "#475569";
      msgEl.innerHTML = "ℹ️ Please select Thickness (mm) to continue.";
    }
    if (resultDiv) resultDiv.style.display = "none";
    if (stressInput) stressInput.value = "";
    return;
  }

  // Temperature check
  if (isNaN(temp)) {
    if (msgEl) {
      msgEl.style.display = "block";
      msgEl.style.color = "#475569";
      const range = (typeof window.bkGetTemperatureRange === "function")
        ? window.bkGetTemperatureRange(year, material, grade, thickness)
        : null;
      const rangeHint = range ? ` (Database range: ${range.minTemp}°C to ${range.maxTemp}°C)` : "";
      msgEl.innerHTML = `ℹ️ Please enter Design Temperature (T) in the design inputs above to determine Allowable Stress.${rangeHint}`;
    }
    if (resultDiv) resultDiv.style.display = "none";
    if (stressInput) stressInput.value = "";
    return;
  }

  // Reusing existing Allowable Stress lookup logic
  const lookup = (typeof window.bkLookupAllowableStress === "function")
    ? window.bkLookupAllowableStress(year, material, grade, temp, thickness)
    : null;

  if (!lookup || !lookup.success) {
    if (lookup && lookup.pending) {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "#2563eb";
        msgEl.innerHTML = "⏳ Syncing live Allowable Stress from Cloud Firestore...";
      }
      return;
    }
    if (msgEl) {
      msgEl.style.display = "block";
      msgEl.style.color = "#dc2626";
      if (lookup && lookup.errorType === "temp_out_of_range") {
        msgEl.innerHTML = `⚠️ <strong>Temperature is outside available Allowable Stress data range.</strong> Available range for ${material} ${grade} is <strong>${lookup.minTemp}°C to ${lookup.maxTemp}°C</strong>.`;
      } else if (lookup && lookup.errorType === "not_found") {
        msgEl.innerHTML = "⚠️ <strong>No Allowable Stress data available for the selected combination.</strong>";
      } else {
        msgEl.innerHTML = `⚠️ ${lookup ? lookup.message : "Unable to determine Allowable Stress."}`;
      }
    }
    if (resultDiv) resultDiv.style.display = "none";
    if (stressInput) stressInput.value = "";
    return;
  }

  // Success: valid allowable stress found
  if (msgEl) msgEl.style.display = "none";

  if (resultDiv) {
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: #166534;">Allowable Stress (S):</span>
          <span id="b313_autoStressDisplay" style="font-size: 18px; font-weight: 800; color: #15803d;">${lookup.stress}</span>
          <span style="font-size: 13px; font-weight: 600; color: #166534;">MPa</span>
          <span class="live-sync-badge" style="background: #16a34a; color: #ffffff; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 4px;">
            ⚡ LIVE FIRESTORE (${year})
          </span>
        </div>
        <div style="font-size: 12px; color: #334155; display: flex; gap: 14px;">
          <span>Yield: <strong id="b313_autoYieldDisplay" style="color: #0f172a;">${lookup.yield || "--"}</strong> MPa</span>
          <span>Tensile: <strong id="b313_autoTensileDisplay" style="color: #0f172a;">${lookup.tensile || "--"}</strong> MPa</span>
        </div>
      </div>
    `;
    resultDiv.classList.remove("live-db-updated");
    void resultDiv.offsetWidth;
    resultDiv.classList.add("live-db-updated");
  }

  if (stressInput) {
    const sUnit = unitSelect ? (unitSelect.value || "MPa") : "MPa";
    if (sUnit === "MPa") {
      stressInput.value = lookup.stress;
    } else {
      const conv = lookup.stress / (stressToMPa[sUnit] || 1.0);
      stressInput.value = parseFloat(conv.toFixed(2));
    }
    stressInput.classList.remove("live-db-updated");
    void stressInput.offsetWidth;
    stressInput.classList.add("live-db-updated");
  }
}
window.evaluateB313AutoStress = evaluateB313AutoStress;

// Listen for application-wide stress data updates
window.addEventListener("stressDataRefreshed", function(e) {
  const d = (e && e.detail) ? e.detail : {};
  if (typeof initB313AutoStressFields === "function") {
    initB313AutoStressFields(true, d.year, d.material, d.grade, d.temp);
  }
});


function onNominalInput() {
  if (!this.value || this.value.trim() === "") {
    this.dataset.userEdited = "false";
  } else {
    this.dataset.userEdited = "true";
  }
  loadMillTolerance();
}

window.initB313 = initB313;

// Re-sync schedule dropdowns whenever /api/pipe-dimensions finishes loading
if (typeof window !== "undefined") {
  window.addEventListener("pipe-data-ready", function () {
    updateB313ScheduleList();
  });
}

// Initialize on DOM ready or immediately if already loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initB313);
} else {
  initB313();
}
