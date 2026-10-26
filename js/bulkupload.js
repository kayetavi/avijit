function initBulkUpload() {
  const bulkInput = document.getElementById("bulkUploadInput");
  if (bulkInput && !bulkInput._bound) {
    bulkInput._bound = true;
    bulkInput.addEventListener("change", handleBulkUpload);
  }
}
window.initBulkUpload = initBulkUpload;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBulkUpload);
} else {
  initBulkUpload();
}

// Fallback delegation for dynamically mounted template
document.addEventListener("change", function(e) {
  if (e.target && e.target.id === "bulkUploadInput") {
    handleBulkUpload(e);
  }
});

function handleBulkUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    window.bulkData = json;
    document.getElementById("bulkModal").classList.add("show");
    showBulkTable(json);
  };
  reader.readAsArrayBuffer(file);
}

function showBulkTable(data) {
  const container = document.getElementById("bulkResultsTable");
  container.innerHTML = "<p>⏳ Loading...</p>";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "13px";
  table.border = "1";

  const thead = table.createTHead();
  const tbody = table.createTBody();
  const headers = Object.keys(data[0] || {});
  const headerRow = thead.insertRow();

  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.border = "1px solid #999";
    th.style.padding = "5px";
    th.style.backgroundColor = "#f2f2f2";
    headerRow.appendChild(th);
  });

  data.forEach(rowData => {
    const row = tbody.insertRow();
    const isIncomplete = rowData["Remarks"]?.includes("⚠️");

    headers.forEach(h => {
      const cell = row.insertCell();
      cell.textContent = rowData[h] || "";
      cell.style.border = "1px solid #ccc";
      cell.style.padding = "4px";

      if (isIncomplete) {
        cell.style.backgroundColor = "#ffe5e5";
      }
    });
  });

  container.innerHTML = "";
  container.appendChild(table);
}

function closeBulkModal() {
  document.getElementById("bulkModal").classList.remove("show");
}

function resetBulk() {
  document.getElementById("bulkUploadInput").value = "";
  closeBulkModal();
  document.getElementById("bulkResultsTable").innerHTML = "";
  window.bulkData = [];
}

function processBulkData() {
  const container = document.getElementById("bulkResultsTable");

  container.innerHTML = `
    <div style="text-align:center; padding:10px;">
      <span style="font-size:16px;">⏳ Calculating...</span><br/>
      <div style="
        margin: 10px auto;
        border: 4px solid #f3f3f3;
        border-top: 4px solid dodgerblue;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
      "></div>
    </div>
  `;

  setTimeout(() => {
    const rows = window.bulkData || [];

    rows.forEach(r => {
      const shape = (r["Shape"] || "").trim().toLowerCase();
      const eqType = (r["Equipment"] || "").trim().toLowerCase();

      const D = parseFloat(r["Diameter (m)"]);
      const Dtop = parseFloat(r["Top Diameter (m)"]); // For frustum
      const L = parseFloat(r["Length (m)"]);
      const rho = parseFloat(r["Density (kg/m³)"]);
      const manualVolume = parseFloat(r["Manual Volume (m³)"]);

      let volume = 0;
      let missingFields = [];

      if (!isNaN(manualVolume) && manualVolume > 0) {
        volume = manualVolume; // ✅ Use manual input
      } else {
        // 🔵 Auto Volume Calculation Based on Shape
        if (shape === "cylinder") {
          if (!isNaN(D) && !isNaN(L)) {
            volume = Math.PI * Math.pow(D / 2, 2) * L;
          } else {
            if (isNaN(D)) missingFields.push("Diameter");
            if (isNaN(L)) missingFields.push("Length");
          }
        } else if (shape === "sphere") {
          if (!isNaN(D)) {
            volume = (4 / 3) * Math.PI * Math.pow(D / 2, 3);
          } else {
            missingFields.push("Diameter");
          }
        } else if (shape === "cone") {
          if (!isNaN(D) && !isNaN(L)) {
            volume = (1 / 3) * Math.PI * Math.pow(D / 2, 2) * L;
          } else {
            if (isNaN(D)) missingFields.push("Diameter");
            if (isNaN(L)) missingFields.push("Length");
          }
        } else if (shape === "frustum") {
          if (!isNaN(D) && !isNaN(Dtop) && !isNaN(L)) {
            const R1 = D / 2;
            const R2 = Dtop / 2;
            volume = (1 / 3) * Math.PI * L * (R1 * R1 + R1 * R2 + R2 * R2);
          } else {
            if (isNaN(D)) missingFields.push("Bottom Diameter");
            if (isNaN(Dtop)) missingFields.push("Top Diameter");
            if (isNaN(L)) missingFields.push("Length");
          }
        } else {
          volume = NaN;
          missingFields.push("Unsupported Shape");
        }
      }

      // 🟡 Apply Equipment % Factor (mass only)
      const percentMap = {
        "coltop": 0.25,
        "colmid": 0.25,
        "colbtm": 0.37,
        "drum": 0.5,
        "kodrum": 0.1,
        "reactor": 0.15,
        "filter": 1.0,
        "pipe": 1.0,
        "pump": 1.0,
        "comp": 0.0,
        "hex": 0.5,
        "finfan": 0.25
      };

      const percent = percentMap[eqType] ?? 1.0;
      const usableVol = volume;
      const mass = volume * percent * (isNaN(rho) ? 0 : rho);

      r["Volume (m³)"] = isNaN(usableVol) ? "" : usableVol.toFixed(2);
      r["Mass (kg)"] = isNaN(mass) ? "" : mass.toFixed(2);

      if ((isNaN(volume) || volume === 0) && isNaN(manualVolume)) {
        r["Remarks"] = `⚠️ Missing: ${missingFields.join(", ")}`;
      } else {
        r["Remarks"] = "✅ OK";
      }
    });

    setTimeout(() => {
      showBulkTable(rows);
    }, 1500);
  }, 50);
}


function downloadBulkPDF() {
  const element = document.getElementById("bulkResultsTable");
  const opt = {
    margin: 0.5,
    filename: "Inventory_Results.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "a3", orientation: "landscape" }
  };
  html2pdf().from(element).set(opt).save();
}
