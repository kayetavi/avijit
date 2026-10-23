// =========================
// ✅ Spinner Functions
// =========================
function showSpinner(targetId) {
  const target = document.getElementById(targetId);
  target.innerHTML = `<div class="spinner">Calculating... ⏳</div>`;
}

function hideSpinner(targetId) {
  // Nothing needed; results will replace spinner automatically
}



// =========================
// ✅ Toggle collapsible section
// =========================
function toggleSection(sectionId) {
  document.querySelectorAll('.collapsible-content').forEach(section => {
    section.style.display = (section.id === sectionId && section.style.display !== 'block') ? 'block' : 'none';
  });
}

// =========================
// ✅ Handle Shape Selection
// =========================
function handleShapeSelection() {
  const shapeEl = document.getElementById("shape");
  if (!shapeEl) return;
  const shape = shapeEl.value;
  const phaseSec = document.getElementById("phaseSection");
  if (phaseSec) phaseSec.classList.toggle("hidden", !shape);
  handlePhaseSelection();
}

// =========================
// ✅ Handle Phase Selection
// =========================
function handlePhaseSelection() {
  const phaseEl = document.getElementById("phaseInventory");
  if (!phaseEl) return;
  const phase = phaseEl.value;
  const shapeEl = document.getElementById("shape");
  const shape = shapeEl ? shapeEl.value : "";
  const manualEl = document.getElementById("manualVolumeOverride");
  const manual = manualEl ? manualEl.checked : false;

  const liqInputs = document.getElementById("liquidInputs");
  if (liqInputs) liqInputs.classList.toggle("hidden", !(phase === "liquid" || phase === "both"));
  const vapInputs = document.getElementById("vaporInputs");
  if (vapInputs) vapInputs.classList.toggle("hidden", !(phase === "vapor" || phase === "both"));
  const shInputs = document.getElementById("shapeInputs");
  if (shInputs) shInputs.classList.toggle("hidden", phase === "vapor" || manual || shape === "");

  const manualVolumeFields = document.getElementById("manualVolumeFields");
  if (manualVolumeFields) {
    if (phase === "liquid" || phase === "both") {
      manualVolumeFields.classList.remove("hidden");
    } else {
      manualVolumeFields.classList.add("hidden");
      if (manualEl) manualEl.checked = false;
      const volEl = document.getElementById("volume");
      if (volEl) volEl.disabled = true;
      const volUnitEl = document.getElementById("volumeUnit");
      if (volUnitEl) volUnitEl.disabled = true;
    }
  }

  const addHeadCheckboxDiv = document.getElementById("addHeadCheckboxDiv");
  const headTypeSection = document.getElementById("headTypeSection");
  const addHeadCheckbox = document.getElementById("addHeadCheckbox");

  if (!shape || phase === "vapor") {
    if (addHeadCheckboxDiv) addHeadCheckboxDiv.classList.add("hidden");
    if (headTypeSection) headTypeSection.classList.add("hidden");
    if (addHeadCheckbox) addHeadCheckbox.checked = false;
  } else {
    if (addHeadCheckboxDiv) addHeadCheckboxDiv.classList.remove("hidden");
    if (typeof toggleHeadSelection === "function") toggleHeadSelection();
  }
}

// =========================
// ✅ Toggle Manual Volume
// =========================
function toggleManualVolume() {
  const checked = document.getElementById("manualVolumeOverride").checked;
  document.getElementById("volume").disabled = !checked;
  document.getElementById("volumeUnit").disabled = !checked;
  handlePhaseSelection();
}

// =========================
// ✅ Toggle Custom %
function toggleCustomPercent() {
  const isCustom = document.getElementById("equipmentType").value === "custom";
  document.getElementById("customPercentDiv").classList.toggle("hidden", !isCustom);
}

// =========================
// ✅ Auto-fill Density
// =========================
function autoFillDensity() {
  const fluid = document.getElementById("fluidType").value;
  const densities = { water: 1000, diesel: 832, crude: 850, ammonia: 682 };
  document.getElementById("density").value = densities[fluid] || "";
}

// =========================
// ✅ Toggle Head Section
// =========================
function toggleHeadSelection() {
  const show = document.getElementById("addHeadCheckbox").checked;
  document.getElementById("headTypeSection").classList.toggle("hidden", !show);
}

// =========================
// ✅ Call API for Single Inventory Calculation
// =========================
async function calculateInventory() {
  const targetId = "inventoryResult";
  showSpinner(targetId);

  const payload = {
    shape: document.getElementById("shape").value,
    phase: document.getElementById("phaseInventory").value,
    manual: document.getElementById("manualVolumeOverride").checked,
    volume: parseFloat(document.getElementById("volume").value || "0"),
    volumeUnit: document.getElementById("volumeUnit").value,
    diameter: parseFloat(document.getElementById("inv_diameter").value),
    length: parseFloat(document.getElementById("inv_length").value),
    diameterUnit: parseFloat(document.getElementById("inv_diameterUnit").value) || 1,
    lengthUnit: parseFloat(document.getElementById("inv_lengthUnit").value) || 1,
    headType: document.getElementById("headType").value,
    headCount: parseInt(document.getElementById("headCount").value) || 2,
    addHead: document.getElementById("addHeadCheckbox").checked,
    equipmentType: document.getElementById("equipmentType").value,
    customPercent: parseFloat(document.getElementById("customPercent").value || "0"),
    density: parseFloat(document.getElementById("density").value || "0"),
    flowRate: parseFloat(document.getElementById("flowRate").value || "0"),
    flowRateUnit: document.getElementById("flowRateUnit").value,
    residenceTime: parseFloat(document.getElementById("residenceTime").value || "0"),
    residenceTimeUnit: document.getElementById("residenceTimeUnit").value
  };

  try {
    const res = await fetch("/api/calculateInventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    document.getElementById(targetId).innerHTML = data.message;
  } catch (err) {
    document.getElementById(targetId).innerHTML = "⚠️ Calculation failed.";
    console.error(err);
  }
}


// =========================
// ✅ Bulk Upload CSV
// =========================
function handleBulkUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const targetId = "bulkUploadResult";
  showSpinner(targetId); // ← Add spinner here

  const reader = new FileReader();
  reader.onload = async function(e) {
    const text = e.target.result;
    const rows = text.split("\n").filter(r => r.trim());
    const headers = rows[0].split(",").map(h => h.trim());
    const data = rows.slice(1).map(row => {
      const cols = row.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = isNaN(cols[i]) ? cols[i] : parseFloat(cols[i]);
      });
      return obj;
    });

    try {
      const res = await fetch("/api/calculateInventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const results = await res.json();
      document.getElementById(targetId).innerHTML = results.map(r => r.message).join("<hr>");
    } catch (err) {
      document.getElementById(targetId).innerHTML = "⚠️ Bulk calculation failed.";
      console.error(err);
    }
  };
  reader.readAsText(file);
}


// =========================
// ✅ Bulk Upload Tab Switching
// =========================
function showBulkUploader() {
  const calcSec = document.getElementById("inventoryCalcSection");
  const bulkSec = document.getElementById("bulkUploadSection");
  if (calcSec) calcSec.style.display = "none";
  if (bulkSec) bulkSec.style.display = "block";
  document.getElementById("invTabBtnSingle")?.classList.remove("active");
  document.getElementById("invTabBtnBulk")?.classList.add("active");
}

function showInventoryCalculator() {
  const calcSec = document.getElementById("inventoryCalcSection");
  const bulkSec = document.getElementById("bulkUploadSection");
  if (calcSec) calcSec.style.display = "block";
  if (bulkSec) bulkSec.style.display = "none";
  document.getElementById("invTabBtnSingle")?.classList.add("active");
  document.getElementById("invTabBtnBulk")?.classList.remove("active");
}

// =========================
// ✅ Init Event Listeners
// =========================
function initInventory() {
  // Hide Add Head checkbox initially
  const headDiv = document.getElementById("addHeadCheckboxDiv");
  if (headDiv) headDiv.classList.add("hidden");
  const headCheckbox = document.getElementById("addHeadCheckbox");
  if (headCheckbox) headCheckbox.checked = false;
  if (typeof handlePhaseSelection === "function") handlePhaseSelection();

  // Equipment type change listener
  const eqType = document.getElementById("equipmentType");
  if (eqType) {
    eqType.addEventListener("change", toggleCustomPercent);
  }

  // Fluid type change listener
  const fluidEl = document.getElementById("fluidType");
  if (fluidEl) {
    fluidEl.addEventListener("change", autoFillDensity);
  }

  // Bulk upload file input
  const bulkFileInput = document.getElementById("bulkFileInput");
  if (bulkFileInput) bulkFileInput.addEventListener("change", handleBulkUpload);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initInventory);
} else {
  initInventory();
}
