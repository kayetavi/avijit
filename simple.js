// =========================================================================
// SIMPLE PIPING THICKNESS CALCULATOR (PD / 2SE)
// Includes Pipe Schedule (SCH) Automation & Code Allowable Stress Lookup
// =========================================================================

// 🔹 Stress Unit Conversions to MPa
const simpleStressToMPa = {
  MPa: 1.0,
  ksi: 6.894757,
  kgcm2: 0.0980665,
  psi: 0.006894757
};

let simpleLastStressUnit = "MPa";
let simpleHasInitialized = false;

// 🔹 OD → NPS Mapping (Extended for full standard range 1/8" to 48")
function getNPSFromOD(od) {
  const map = {
    10.3: 0.125,
    13.7: 0.25,
    17.1: 0.375,
    21.3: 0.5,
    26.7: 0.75,
    33.4: 1,
    42.2: 1.25,
    48.3: 1.5,
    60.3: 2,
    73.0: 2.5,
    88.9: 3,
    101.6: 3.5,
    114.3: 4,
    141.3: 5,
    168.3: 6,
    219.1: 8,
    273.0: 10,
    323.9: 12,
    355.6: 14,
    406.4: 16,
    457.0: 18,
    508.0: 20,
    559.0: 22,
    610.0: 24,
    660.4: 26,
    711.2: 28,
    762.0: 30,
    812.8: 32,
    863.6: 34,
    914.4: 36,
    965.2: 38,
    1016.0: 40,
    1066.8: 42,
    1117.6: 44,
    1168.4: 46,
    1219.2: 48
  };
  const numOD = parseFloat(od);
  if (isNaN(numOD)) return 0;
  if (map[numOD] !== undefined) return map[numOD];

  // Fuzzy match for minor float rounding
  let closestVal = 0;
  let minDiff = Infinity;
  for (const [key, val] of Object.entries(map)) {
    const diff = Math.abs(parseFloat(key) - numOD);
    if (diff < minDiff && diff <= 0.8) {
      minDiff = diff;
      closestVal = val;
    }
  }
  return closestVal;
}
window.getNPSFromOD = getNPSFromOD;

// 🔹 Structural Thickness Logic (API based)
function getStructuralFromNPS(nps, temp) {
  let t_struct = 0;
  let t_alert = 0;

  if (temp === "low") {
    if (nps <= 1) { t_struct = 1.8; t_alert = 2.0; }
    else if (nps <= 2) { t_struct = 1.8; t_alert = 2.5; }
    else if (nps <= 3) { t_struct = 2.0; t_alert = 2.8; }
    else if (nps <= 4) { t_struct = 2.3; t_alert = 3.1; }
    else if (nps <= 18) { t_struct = 2.8; t_alert = 3.3; }
    else if (nps <= 24) { t_struct = 3.1; t_alert = 3.6; }
    else { t_struct = 3.5; t_alert = 4.0; }
  } else {
    if (nps <= 1) { t_struct = 2.0; t_alert = 2.3; }
    else if (nps <= 2) { t_struct = 2.0; t_alert = 2.8; }
    else if (nps <= 3) { t_struct = 2.3; t_alert = 3.1; }
    else if (nps <= 4) { t_struct = 2.8; t_alert = 3.5; }
    else if (nps <= 18) { t_struct = 3.1; t_alert = 3.8; }
    else if (nps <= 24) { t_struct = 3.5; t_alert = 4.2; }
    else { t_struct = 4.0; t_alert = 4.5; }
  }

  return { t_struct, t_alert };
}
window.getStructuralFromNPS = getStructuralFromNPS;

// =========================================================================
// PIPE SCHEDULE (SCH) & ACTUAL THICKNESS AUTOMATION
// Reuses pipeDataMaster883 from pipeDataScript_883.js
// =========================================================================

function getSimplePipeDataNpsKey(odValue, optionText) {
  if (typeof window.getPipeDataNpsKey === "function") {
    const key = window.getPipeDataNpsKey(odValue, optionText);
    if (key) return key;
  }

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
window.getSimplePipeDataNpsKey = getSimplePipeDataNpsKey;

function updateSimpleScheduleList() {
  const dSelect = document.getElementById("simple_diameter");
  const schSelect = document.getElementById("simple_schedule");
  const actInput = document.getElementById("simple_actual");
  const badge = document.getElementById("simple_act_source_badge");

  if (!dSelect || !schSelect) return;

  const odVal = dSelect.value;
  const optText = dSelect.options[dSelect.selectedIndex] ? dSelect.options[dSelect.selectedIndex].textContent : "";
  const master = window.pipeDataMaster883 || (typeof pipeDataMaster883 !== "undefined" ? pipeDataMaster883 : null);

  const prevSelectedSch = schSelect.value;
  schSelect.innerHTML = '<option value="">-- Select SCH --</option>';

  if (!odVal || !master) {
    schSelect.disabled = true;
    if (actInput && actInput.dataset.userEdited !== "true") {
      actInput.value = "";
      if (badge) badge.style.display = "none";
    }
    return;
  }

  const npsKey = getSimplePipeDataNpsKey(odVal, optText);
  if (!npsKey || !master[npsKey]) {
    schSelect.disabled = true;
    return;
  }

  schSelect.disabled = false;
  const availableSchedules = master[npsKey];
  let schFound = false;

  for (const [schName, thicknessVal] of Object.entries(availableSchedules)) {
    const opt = document.createElement("option");
    opt.value = schName;
    opt.textContent = `${schName} (${thicknessVal} mm)`;
    if (schName === prevSelectedSch) {
      opt.selected = true;
      schFound = true;
    }
    schSelect.appendChild(opt);
  }

  if (schFound && prevSelectedSch) {
    const thickVal = availableSchedules[prevSelectedSch];
    if (actInput && thickVal !== undefined) {
      actInput.value = thickVal;
      actInput.dataset.userEdited = "false";
      if (badge) {
        badge.textContent = `Auto from ${prevSelectedSch} (${thickVal} mm)`;
        badge.style.display = "inline-block";
      }
    }
  } else {
    schSelect.value = "";
    if (actInput && actInput.dataset.userEdited !== "true") {
      actInput.value = "";
      if (badge) badge.style.display = "none";
    }
  }
}
window.updateSimpleScheduleList = updateSimpleScheduleList;

function onSimpleScheduleChange() {
  const dSelect = document.getElementById("simple_diameter");
  const schSelect = document.getElementById("simple_schedule");
  const actInput = document.getElementById("simple_actual");
  const badge = document.getElementById("simple_act_source_badge");

  if (!schSelect || !actInput) return;

  const selectedSch = schSelect.value;
  if (!selectedSch) {
    if (actInput.dataset.userEdited !== "true") {
      actInput.value = "";
      if (badge) badge.style.display = "none";
    }
    return;
  }

  const odVal = dSelect ? dSelect.value : "";
  const optText = dSelect && dSelect.options[dSelect.selectedIndex] ? dSelect.options[dSelect.selectedIndex].textContent : "";
  const master = window.pipeDataMaster883 || (typeof pipeDataMaster883 !== "undefined" ? pipeDataMaster883 : null);

  if (master && odVal) {
    const npsKey = getSimplePipeDataNpsKey(odVal, optText);
    if (npsKey && master[npsKey] && master[npsKey][selectedSch] !== undefined) {
      const thickness = master[npsKey][selectedSch];
      actInput.value = thickness;
      actInput.dataset.userEdited = "false";
      if (badge) {
        badge.textContent = `Auto from ${selectedSch} (${thickness} mm)`;
        badge.style.display = "inline-block";
      }
      return;
    }
  }
}
window.onSimpleScheduleChange = onSimpleScheduleChange;

function onSimpleActualInput() {
  const actInput = document.getElementById("simple_actual");
  const badge = document.getElementById("simple_act_source_badge");
  if (!actInput) return;

  if (actInput.value && actInput.value.trim() !== "") {
    actInput.dataset.userEdited = "true";
    if (badge) {
      badge.textContent = "Manual / Measured";
      badge.style.display = "inline-block";
    }
  } else {
    actInput.dataset.userEdited = "false";
    if (badge) badge.style.display = "none";
  }
}
window.onSimpleActualInput = onSimpleActualInput;

// =========================================================================
// ALLOWABLE STRESS AUTOMATION LOGIC (ASME Table A-1 Database Lookup)
// Reuses bk_stressData.js & bk_stressscript.js
// =========================================================================

function toggleSimpleAutoStress() {
  const toggle = document.getElementById("simple_autoStressToggle");
  const panel = document.getElementById("simple_autoStressPanel");
  const stressInput = document.getElementById("simple_stress");
  if (!toggle) return;

  const isAuto = toggle.checked;
  if (panel) {
    panel.style.display = isAuto ? "block" : "none";
  }

  if (stressInput) {
    if (isAuto) {
      stressInput.readOnly = true;
      stressInput.classList.add("readonly-field");
      stressInput.setAttribute("title", "Allowable Stress is automatically determined from Code/Material data");
      initSimpleAutoStressFields();
    } else {
      stressInput.readOnly = false;
      stressInput.classList.remove("readonly-field");
      stressInput.removeAttribute("title");
    }
  }
}
window.toggleSimpleAutoStress = toggleSimpleAutoStress;

function initSimpleAutoStressFields(force = false, preferredYear = null, preferredMaterial = null, preferredGrade = null, preferredTemp = null) {
  const autoToggle = document.getElementById("simple_autoStressToggle");
  const panel = document.getElementById("simple_autoStressPanel");
  const stressInput = document.getElementById("simple_stress");

  if (autoToggle && !autoToggle.checked && !autoToggle.dataset.userManuallyToggled) {
    autoToggle.checked = true;
  }
  const isAuto = autoToggle ? autoToggle.checked : true;
  if (panel && isAuto) {
    panel.style.display = "block";
  }
  if (stressInput && isAuto) {
    stressInput.readOnly = true;
    stressInput.classList.add("readonly-field");
    stressInput.setAttribute("title", "Allowable Stress is automatically determined from selected Code/Material data");
  }

  const yearSelect = document.getElementById("simple_stressYear");
  const matSelect = document.getElementById("simple_stressMaterial");
  const grSelect = document.getElementById("simple_stressGrade");
  const thSelect = document.getElementById("simple_stressThickness");
  const tempInput = document.getElementById("simple_stressTemp");

  if (!yearSelect) return;

  const years = (typeof window.bkGetAvailableYears === "function")
    ? window.bkGetAvailableYears()
    : (window.bkStressData ? Object.keys(window.bkStressData) : []);

  if (!years || years.length === 0) return;

  let curYear = preferredYear ? String(preferredYear).trim() : yearSelect.value;
  if (!curYear || !years.includes(curYear)) {
    curYear = years.includes("2022") ? "2022" : years[0];
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

  // Temperature
  if (tempInput) {
    tempInput.disabled = false;
    if (preferredTemp !== null && preferredTemp !== undefined && preferredTemp !== "") {
      tempInput.value = preferredTemp;
    } else if (!tempInput.value || isNaN(parseFloat(tempInput.value))) {
      tempInput.value = "100";
    }
  }

  evaluateSimpleAutoStress(true);
}
window.initSimpleAutoStressFields = initSimpleAutoStressFields;

function onSimpleStressYearChange() {
  const yearSelect = document.getElementById("simple_stressYear");
  const matSelect = document.getElementById("simple_stressMaterial");
  const year = yearSelect ? yearSelect.value : "";
  if (!year) {
    evaluateSimpleAutoStress();
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
  onSimpleStressMaterialChange();
}
window.onSimpleStressYearChange = onSimpleStressYearChange;

function onSimpleStressMaterialChange() {
  const yearSelect = document.getElementById("simple_stressYear");
  const matSelect = document.getElementById("simple_stressMaterial");
  const grSelect = document.getElementById("simple_stressGrade");
  const year = yearSelect ? yearSelect.value : "";
  const material = matSelect ? matSelect.value : "";

  if (!year || !material) {
    evaluateSimpleAutoStress();
    return;
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
  onSimpleStressGradeChange();
}
window.onSimpleStressMaterialChange = onSimpleStressMaterialChange;

function onSimpleStressGradeChange() {
  const yearSelect = document.getElementById("simple_stressYear");
  const matSelect = document.getElementById("simple_stressMaterial");
  const grSelect = document.getElementById("simple_stressGrade");
  const thSelect = document.getElementById("simple_stressThickness");
  const tempInput = document.getElementById("simple_stressTemp");

  const year = yearSelect ? yearSelect.value : "";
  const material = matSelect ? matSelect.value : "";
  const grade = grSelect ? grSelect.value : "";

  if (!year || !material || !grade) {
    evaluateSimpleAutoStress();
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

  evaluateSimpleAutoStress();
}
window.onSimpleStressGradeChange = onSimpleStressGradeChange;

function onSimpleStressThicknessChange() {
  const thSelect = document.getElementById("simple_stressThickness");
  const tempInput = document.getElementById("simple_stressTemp");
  if (tempInput && thSelect) {
    tempInput.disabled = !thSelect.value;
  }
  evaluateSimpleAutoStress();
}
window.onSimpleStressThicknessChange = onSimpleStressThicknessChange;

function onSimpleStressTempInput() {
  evaluateSimpleAutoStress();
}
window.onSimpleStressTempInput = onSimpleStressTempInput;

function evaluateSimpleAutoStress(isLiveUpdate = false) {
  const toggle = document.getElementById("simple_autoStressToggle");
  if (toggle && !toggle.checked) return;

  const year = document.getElementById("simple_stressYear")?.value;
  const material = document.getElementById("simple_stressMaterial")?.value;
  const grade = document.getElementById("simple_stressGrade")?.value;
  const thSelect = document.getElementById("simple_stressThickness");
  const thickness = thSelect ? thSelect.value : null;
  const tempVal = document.getElementById("simple_stressTemp")?.value;
  const temp = (tempVal !== "" && tempVal !== undefined) ? parseFloat(tempVal) : NaN;

  const msgEl = document.getElementById("simple_stressValidationMsg");
  const resultDiv = document.getElementById("simple_autoStressResultDiv");
  const stressDisplay = document.getElementById("simple_autoStressDisplay");
  const yieldDisplay = document.getElementById("simple_autoYieldDisplay");
  const tensileDisplay = document.getElementById("simple_autoTensileDisplay");
  const stressInput = document.getElementById("simple_stress");
  const unitSelect = document.getElementById("simple_stressUnit");
  const tempSelect = document.getElementById("simple_temp");

  // Missing material or grade
  if (!year || !material || !grade) {
    if (msgEl) {
      msgEl.style.display = "block";
      msgEl.style.color = "#475569";
      msgEl.innerHTML = "ℹ️ Please select Material, Grade, Thickness and Temperature to determine Allowable Stress.";
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
      msgEl.innerHTML = `ℹ️ Please enter Temperature (°C) to determine Allowable Stress.${rangeHint}`;
    }
    if (resultDiv) resultDiv.style.display = "none";
    if (stressInput) stressInput.value = "";
    return;
  }

  // Lookup allowable stress
  const lookup = (typeof window.bkLookupAllowableStress === "function")
    ? window.bkLookupAllowableStress(year, material, grade, temp, thickness)
    : null;

  if (!lookup || !lookup.success) {
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

  // Valid allowable stress found
  if (msgEl) msgEl.style.display = "none";

  if (resultDiv) {
    resultDiv.style.display = "block";
    resultDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 700; color: #166534;">Allowable Stress (S):</span>
          <span id="simple_autoStressDisplay" style="font-size: 18px; font-weight: 800; color: #15803d;">${lookup.stress}</span>
          <span style="font-size: 13px; font-weight: 600; color: #166534;">MPa</span>
          <span class="live-sync-badge" style="background: #16a34a; color: #ffffff; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; display: inline-flex; align-items: center; gap: 4px;">
            ⚡ LIVE DB (${year})
          </span>
        </div>
        <div style="font-size: 12px; color: #334155; display: flex; gap: 14px;">
          <span>Yield: <strong id="simple_autoYieldDisplay" style="color: #0f172a;">${lookup.yield || "--"}</strong> MPa</span>
          <span>Tensile: <strong id="simple_autoTensileDisplay" style="color: #0f172a;">${lookup.tensile || "--"}</strong> MPa</span>
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
      const conv = lookup.stress / (simpleStressToMPa[sUnit] || 1.0);
      stressInput.value = parseFloat(conv.toFixed(2));
    }
    stressInput.classList.remove("live-db-updated");
    void stressInput.offsetWidth;
    stressInput.classList.add("live-db-updated");
  }

  // 🔹 Auto-sync for Design Temperature (< 400°F / ≥ 400°F)
  if (tempSelect) {
    if (temp >= 204.44) {
      tempSelect.value = "high";
    } else {
      tempSelect.value = "low";
    }
  }

  // If pressure is entered or calculation was already performed, recalculate PD / 2SE live!
  const pInput = document.getElementById("simple_pressure");
  const pVal = pInput ? parseFloat(pInput.value) : NaN;
  const resultBox = document.getElementById("simple_resultBox");
  if (!isNaN(pVal) && pVal > 0 && typeof calculateSimpleThickness === "function") {
    calculateSimpleThickness();
  } else if (resultBox && resultBox.innerHTML.trim() !== "" && typeof calculateSimpleThickness === "function") {
    calculateSimpleThickness();
  }
}
window.evaluateSimpleAutoStress = evaluateSimpleAutoStress;

// Listen for application-wide stress data updates
window.addEventListener("stressDataRefreshed", function(e) {
  const d = (e && e.detail) ? e.detail : {};
  if (typeof initSimpleAutoStressFields === "function") {
    initSimpleAutoStressFields(true, d.year, d.material, d.grade, d.temp);
  }
});

function onSimpleStressUnitChange() {
  const unitSelect = document.getElementById("simple_stressUnit");
  const stressInput = document.getElementById("simple_stress");
  const toggle = document.getElementById("simple_autoStressToggle");
  if (!unitSelect || !stressInput) return;

  const newUnit = unitSelect.value;
  const oldUnit = simpleLastStressUnit || "MPa";

  if (toggle && toggle.checked) {
    evaluateSimpleAutoStress();
  } else {
    // Convert manual value
    const curVal = parseFloat(stressInput.value);
    if (!isNaN(curVal)) {
      const valInMPa = curVal * (simpleStressToMPa[oldUnit] || 1.0);
      const converted = valInMPa / (simpleStressToMPa[newUnit] || 1.0);
      stressInput.value = parseFloat(converted.toFixed(2));
    }
  }

  simpleLastStressUnit = newUnit;
}
window.onSimpleStressUnitChange = onSimpleStressUnitChange;

// 🔹 Navigation bridge from Simple to ASME B31.3
function openB313FromSimple() {
  if (typeof window.showASMEB31_3Tab === "function") {
    if (typeof window.hideAllMainPanels === "function") window.hideAllMainPanels();
    window.showASMEB31_3Tab();
    if (typeof window.hideWelcomePanel === "function") window.hideWelcomePanel();
  } else {
    document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
    const b313Tab = document.getElementById("ASMEB31_3Tab");
    if (b313Tab) b313Tab.style.display = "block";
    const title = document.getElementById("selectedMechanismTitle");
    if (title) title.style.display = "none";
    const welcome = document.getElementById("welcomePanel");
    if (welcome) welcome.style.display = "none";
  }
}
window.openB313FromSimple = openB313FromSimple;

// =========================================================================
// MAIN CALCULATION FUNCTION (PD / 2SE)
// =========================================================================

async function calculateSimpleThickness() {
  const pInput = document.getElementById("simple_pressure");
  const dSelect = document.getElementById("simple_diameter");
  const schSelect = document.getElementById("simple_schedule");
  const sInput = document.getElementById("simple_stress");
  const eInput = document.getElementById("simple_efficiency");
  const caInput = document.getElementById("simple_ca");
  const actInput = document.getElementById("simple_actual");
  const tempSelect = document.getElementById("simple_temp");
  const pUnitSelect = document.getElementById("simple_pressureUnit");
  const sUnitSelect = document.getElementById("simple_stressUnit");
  const resultBox = document.getElementById("simple_resultBox");

  const P = parseFloat(pInput?.value);
  const D = parseFloat(dSelect?.value);
  const S = parseFloat(sInput?.value);
  const E = parseFloat(eInput?.value);
  const CA = parseFloat(caInput?.value) || 0;
  const t_act = parseFloat(actInput?.value);
  const temp = tempSelect ? tempSelect.value : "low";
  const selectedSch = schSelect ? schSelect.value : "";

  const pUnit = pUnitSelect ? pUnitSelect.value : "MPa";
  const sUnit = sUnitSelect ? sUnitSelect.value : "MPa";

  // Validation
  if (isNaN(P) || isNaN(D) || isNaN(S) || isNaN(E) || isNaN(t_act)) {
    resultBox.innerHTML = "<span style='color:red;'>⚠️ Please fill all required fields (Pressure, NPS, Allowable Stress, Joint Efficiency, and Actual Thickness).</span>";
    return;
  }

  if (resultBox) {
    resultBox.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <div class="loader" style="margin: 0 auto 10px auto;"></div>
        <p style="font-size:13px; font-weight:600; color:#2563eb;">Calculating PD/2SE on Backend Server...</p>
      </div>
    `;
  }

  try {
    const res = await fetch("/api/simple", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        P,
        D,
        S,
        E,
        CA,
        t_act,
        temp,
        selectedSch,
        pUnit,
        sUnit
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Calculation failed");
    }

    if (data.thickWallError) {
      resultBox.innerHTML = `
        <div style="color:#b91c1c; text-align:center; padding:15px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
          <b style="font-size: 16px;">⚠️ Thick Wall Condition Detected (D/t < 6)</b><br><br>
          👉 The simplified <strong>PD / 2SE</strong> formula is only valid for thin-wall cylinders.<br>
          👉 Please use the ASME B31.3 equation (Clause 304.1.2) for rigorous thick-wall verification.<br><br>

          <button type="button" onclick="openB313FromSimple()" 
            style="background:#dc2626; color:white; padding:10px 18px; border:none; border-radius:6px; cursor:pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
            🚀 Open ASME B31.3 Calculator
          </button>
        </div>`;
      return;
    }

    const {
      t,
      t_struct,
      t_alert,
      t_min,
      t_req,
      status,
      statusColor,
      alertMsg,
      nps,
      P_MPa,
      S_MPa
    } = data;

    const structBox = document.getElementById("simple_struct_display");
    if (structBox) structBox.value = t_struct;

    const schText = selectedSch ? ` <span style="font-size: 12px; color: #2563eb; font-weight: 600;">(SCH: ${selectedSch})</span>` : "";

    resultBox.innerHTML = `
<div class="simple-result">

  <h3 style="margin-top: 0; color: #1e293b; border-bottom: 2px solid rgba(0,0,0,0.08); padding-bottom: 8px;">Thickness Result Summary (Backend PD/2SE)</h3>

  <!-- 📊 RESULT TABLE -->
  <table class="result-table">
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
        <th>Meaning</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Design Thickness (t)</strong></td>
        <td><strong>${t.toFixed(2)} mm</strong></td>
        <td>Required thickness to withstand internal pressure (PD / 2SE)</td>
      </tr>
      <tr>
        <td><strong>Structural Thickness (t_struct)</strong></td>
        <td><strong>${t_struct.toFixed(2)} mm</strong></td>
        <td>Minimum thickness for mechanical/rigidity support (API guidelines)</td>
      </tr>
      <tr>
        <td><strong>Minimum Thickness (t_min)</strong></td>
        <td><strong>${t_min.toFixed(2)} mm</strong></td>
        <td>Maximum of design pressure thickness and structural thickness</td>
      </tr>
      <tr>
        <td><strong>Required Thickness (t_min + CA)</strong></td>
        <td><strong>${t_min.toFixed(2)} + ${CA} = <span style="color:#2563eb; font-size:16px;">${t_req.toFixed(2)} mm</span></strong></td>
        <td>Final required governing thickness including corrosion allowance</td>
      </tr>
      <tr>
        <td><strong>Actual / Measured Thickness</strong></td>
        <td><strong>${t_act.toFixed(2)} mm</strong>${schText}</td>
        <td>Provided pipe wall thickness compared against required thickness</td>
      </tr>
    </tbody>
  </table>

  <br>

  <!-- 📥 INPUT RECAP TABLE -->
  <table class="result-table">
    <thead>
      <tr><th>Input Parameter</th><th>Specified Input</th><th>Internal Converted</th></tr>
    </thead>
    <tbody>
      <tr><td>Internal Pressure (P)</td><td>${P} ${pUnit}</td><td>${P_MPa.toFixed(3)} MPa</td></tr>
      <tr><td>Outside Diameter (D)</td><td>${D} mm</td><td>NPS ${nps}" ${selectedSch ? `[${selectedSch}]` : ""}</td></tr>
      <tr><td>Allowable Stress (S)</td><td>${S} ${sUnit}</td><td>${S_MPa.toFixed(2)} MPa</td></tr>
      <tr><td>Joint Efficiency (E)</td><td colspan="2">${E}</td></tr>
      <tr><td>Corrosion Allowance (CA)</td><td colspan="2">${CA} mm</td></tr>
      <tr><td>Design Temperature</td><td colspan="2">${temp === "low" ? "< 400°F (205°C)" : "≥ 400°F (205°C)"}</td></tr>
    </tbody>
  </table>

  <br>

  <!-- 🎯 EVALUATION TABLE -->
  <table class="result-table">
    <thead>
      <tr><th colspan="2">Integrity Evaluation</th></tr>
    </thead>
    <tbody>
      <tr><td>Structural Minimum Thickness</td><td>${t_struct.toFixed(2)} mm</td></tr>
      <tr><td>Minimum Required Thickness</td><td>${t_min.toFixed(2)} mm</td></tr>
      <tr><td>Alert Thickness Threshold</td><td>${t_alert.toFixed(2)} mm</td></tr>
      <tr><td>Actual Thickness Provided</td><td><strong>${t_act.toFixed(2)} mm</strong>${schText}</td></tr>
      <tr><td>Remaining Corrosion Margin</td><td><strong style="color: ${(t_act - t_req) >= 0 ? '#16a34a' : '#dc2626'};">${(t_act - t_req).toFixed(2)} mm</strong></td></tr>
    </tbody>
  </table>

  <br>

  <!-- 🚦 STATUS BOX -->
  <div class="status-box" style="border-left: 5px solid ${statusColor}; background: rgba(0,0,0,0.03); padding: 12px; border-radius: 4px;">
    <strong style="color: ${statusColor}; font-size: 15px;">Status:</strong> <span style="font-size: 14px; font-weight: 600;">${status}</span>
    ${alertMsg}
  </div>

  <hr style="margin-top: 15px; border: 0; border-top: 1px solid #ddd;">

  <small style="color: #64748b;">
    ✔ t = Pressure design thickness (PD / 2SE)<br>
    ✔ t_struct = API minimum mechanical/structural limit<br>
    ✔ t_min = max(t, t_struct)<br>
    ✔ Final Required = t_min + CA
  </small>

</div>
`;
  } catch (err) {
    if (resultBox) {
      resultBox.innerHTML = `<span style='color:red;'>⚠️ Error connecting to server: ${err.message}</span>`;
    }
  }
}
window.calculateSimpleThickness = calculateSimpleThickness;

// =========================================================================
// INITIALIZATION
// =========================================================================

function initSimplePiping() {
  const dSelect = document.getElementById("simple_diameter");
  const schSelect = document.getElementById("simple_schedule");
  const actInput = document.getElementById("simple_actual");
  const stressUnitSelect = document.getElementById("simple_stressUnit");
  const autoStressToggle = document.getElementById("simple_autoStressToggle");

  if (stressUnitSelect) {
    simpleLastStressUnit = stressUnitSelect.value || "MPa";
    stressUnitSelect.removeEventListener("change", onSimpleStressUnitChange);
    stressUnitSelect.addEventListener("change", onSimpleStressUnitChange);
  }

  if (dSelect) {
    dSelect.removeEventListener("change", updateSimpleScheduleList);
    dSelect.addEventListener("change", updateSimpleScheduleList);
  }

  if (schSelect) {
    schSelect.removeEventListener("change", onSimpleScheduleChange);
    schSelect.addEventListener("change", onSimpleScheduleChange);
  }

  if (actInput) {
    actInput.removeEventListener("input", onSimpleActualInput);
    actInput.addEventListener("input", onSimpleActualInput);
  }

  if (autoStressToggle) {
    autoStressToggle.removeEventListener("change", toggleSimpleAutoStress);
    autoStressToggle.addEventListener("change", toggleSimpleAutoStress);
    if (autoStressToggle.checked) {
      toggleSimpleAutoStress();
    }
  }

  // Populate schedules for initial diameter if present
  if (dSelect && dSelect.value) {
    updateSimpleScheduleList();
    // Default to SCH 40 if available
    if (schSelect && (!schSelect.value || schSelect.value === "")) {
      for (let i = 0; i < schSelect.options.length; i++) {
        if (schSelect.options[i].value === "SCH 40") {
          schSelect.selectedIndex = i;
          onSimpleScheduleChange();
          break;
        }
      }
    }
  }

  simpleHasInitialized = true;
}
window.initSimplePiping = initSimplePiping;

// Run on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSimplePiping);
} else {
  initSimplePiping();
}
