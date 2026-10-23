/**
 * Representative Fluids Frontend UI Controller
 * Communicates directly with backend API (/api/representative-fluids) for all fluid database properties.
 */

async function initFluidSelector() {
  const filter = document.getElementById("materialFilter");
  if (!filter) return;

  try {
    if (filter.options.length === 0) {
      const response = await fetch("/api/representative-fluids?action=materials");
      if (response.ok) {
        const resData = await response.json();
        const materials = resData.materials || [];
        materials.forEach(mat => {
          const opt = document.createElement("option");
          opt.value = mat;
          opt.textContent = mat;
          filter.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error("Failed to load representative fluid materials from backend:", err);
  }

  // Native listener
  filter.onchange = function () {
    const selected = Array.from(filter.selectedOptions).map(o => o.value);
    renderTable(selected);
  };

  // Safe Select2 integration if jQuery and select2 exist
  if (typeof window.$ !== "undefined" && typeof window.$.fn?.select2 === "function") {
    try {
      $('#materialFilter').select2({
        placeholder: "Select one or more materials...",
        allowClear: true,
        width: '100%'
      });

      $('#materialFilter').off('change.custom').on('change.custom', function () {
        const selected = $(this).val();
        renderTable(selected);
      });
    } catch (err) {
      console.warn("Select2 initialization skipped:", err);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFluidSelector);
} else {
  initFluidSelector();
}

async function renderTable(selectedMaterials) {
  const tbody = document.getElementById("fluidBody");
  const fluidTable = document.getElementById("fluidTable");
  const noDataMsg = document.getElementById("noDataMessage");
  const noteSection = document.getElementById("noteSection");

  if (!tbody || !fluidTable || !noDataMsg) return;

  if (!selectedMaterials || selectedMaterials.length === 0) {
    tbody.innerHTML = "";
    fluidTable.style.display = "none";
    noDataMsg.textContent = "No fluids selected. Please choose from above.";
    noDataMsg.style.display = "block";
    if (noteSection) noteSection.style.display = "none";
    return;
  }

  // Show loading indicator
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#64748b;">⏳ Fetching representative fluid properties from server...</td></tr>`;
  fluidTable.style.display = "table";
  noDataMsg.style.display = "none";

  try {
    const response = await fetch("/api/representative-fluids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedMaterials })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();
    const filtered = result.fluids || [];

    tbody.innerHTML = "";

    if (filtered.length > 0) {
      noDataMsg.style.display = "none";
      fluidTable.style.display = "table";
      if (noteSection) noteSection.style.display = "block";

      filtered.forEach(f => {
        const row = document.createElement("tr");
        f.forEach(cell => {
          const td = document.createElement("td");
          td.textContent = cell;
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    } else {
      fluidTable.style.display = "none";
      noDataMsg.textContent = "No matching representative fluids found.";
      noDataMsg.style.display = "block";
      if (noteSection) noteSection.style.display = "none";
    }
  } catch (err) {
    console.error("Error fetching representative fluid data:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#ef4444;">⚠️ Error retrieving fluid properties from server. Please try again.</td></tr>`;
  }
}

function selectAllFluidGroups() {
  const filter = document.getElementById("materialFilter");
  if (!filter) return;
  Array.from(filter.options).forEach(opt => opt.selected = true);
  if (typeof window.$ !== "undefined" && typeof window.$.fn?.select2 === "function") {
    $('#materialFilter').val(Array.from(filter.options).map(o => o.value)).trigger('change');
  } else {
    const selected = Array.from(filter.selectedOptions).map(o => o.value);
    renderTable(selected);
  }
}
window.selectAllFluidGroups = selectAllFluidGroups;

function clearAllFluidGroups() {
  const filter = document.getElementById("materialFilter");
  if (!filter) return;
  Array.from(filter.options).forEach(opt => opt.selected = false);
  if (typeof window.$ !== "undefined" && typeof window.$.fn?.select2 === "function") {
    $('#materialFilter').val(null).trigger('change');
  } else {
    renderTable([]);
  }
}
window.clearAllFluidGroups = clearAllFluidGroups;
window.initFluidSelector = initFluidSelector;

