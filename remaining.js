// ==========================================
// API 570 Corrosion & Remaining Life UI Module
// Frontend presentation and backend API bridge
// ==========================================

// ✅ Helper date formatter for UI display
function formatDate(date) {
  if (!date) return "";
  if (typeof date === "string" && /^\d{2}-\d{2}-\d{4}$/.test(date)) return date;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Robust Multi-Format Inspection Date Parser with Disambiguation & Validation
 */
function parseInspectionDate(value) {
  if (!value) throw new Error("Missing inspection date value.");
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Numeric Excel serial number
  if (!isNaN(value) && value !== "") {
    const parsed = new Date((Number(value) - 25569) * 86400 * 1000 + (new Date().getTimezoneOffset() * 60000));
    if (isNaN(parsed.getTime())) throw new Error(`Invalid Excel date serial: ${value}`);
    return parsed;
  }

  if (typeof value === "string") {
    const clean = value.trim();
    // ISO format YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const yyyy = parseInt(isoMatch[1], 10);
      const mm = parseInt(isoMatch[2], 10) - 1;
      const dd = parseInt(isoMatch[3], 10);
      const parsed = new Date(yyyy, mm, dd);
      if (isNaN(parsed.getTime()) || parsed.getFullYear() !== yyyy || parsed.getMonth() !== mm || parsed.getDate() !== dd) {
        throw new Error(`Invalid ISO calendar date: ${value}`);
      }
      return parsed;
    }

    // Split by separator [-/.]
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      let p1 = parseInt(parts[0], 10);
      let p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);
      const yyyy = p3 < 100 ? 2000 + p3 : p3;

      let dd, mm;
      // Disambiguation: if day > 12, strictly treat as DD-MM-YYYY (industrial standard)
      if (p1 > 12) {
        dd = p1;
        mm = p2 - 1;
      } else if (p2 > 12) {
        mm = p1 - 1;
        dd = p2;
      } else {
        // Both <= 12, default industrial standard DD-MM-YYYY
        dd = p1;
        mm = p2 - 1;
      }

      const parsed = new Date(yyyy, mm, dd);
      if (isNaN(parsed.getTime()) || parsed.getFullYear() !== yyyy || parsed.getMonth() !== mm || parsed.getDate() !== dd) {
        throw new Error(`Invalid calendar date: ${value}`);
      }
      return parsed;
    }

    const parsed = new Date(clean);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Unparseable inspection date string: ${value}`);
    }
    return parsed;
  }

  throw new Error(`Invalid inspection date type: ${typeof value}`);
}

function parseDDMMYYYY(value) {
  try {
    return parseInspectionDate(value);
  } catch (e) {
    return null;
  }
}

// Delegated Backend API Caller for Single Corrosion Calculation
async function calculateRowAsync(row) {
  try {
    const response = await fetch("/api/remaining?action=calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error("Backend calculation error in calculateRowAsync:", err);
    return {
      error: err.message || "Backend calculation service unavailable. Please check inputs.",
      tagNumber: row.tagNumber || row.tagnumber || "-"
    };
  }
}

// Pure Dumb UI: delegates all row calculations directly to backend API (/api/remaining)
async function calculateRow(row) {
  return await calculateRowAsync(row);
}


// ✅ Download Template fetched from Backend Configuration
async function downloadTemplate() {
  try {
    let templateData = null;
    try {
      const response = await fetch("/api/remaining?action=template");
      if (response.ok) {
        templateData = await response.json();
      }
    } catch (e) {
      console.warn("Could not fetch remote template config, using default schema:", e);
    }

    const headers = templateData?.template?.headers || [
      "Tag Number", "BaseDate", "BaseThk", "MidDate", "MidThk", "LastDate", "LastThk", "Tmin", "Freq"
    ];
    const blankRow = templateData?.template?.blankRow || ["", "", "", "", "", "", "", "", ""];
    const picklistData = templateData?.template?.picklist || [
      ["Column Name", "Tag Number", "BaseDate", "BaseThk", "MidDate", "MidThk", "LastDate", "LastThk", "Tmin", "Freq"],
      ["Description / Format / Example",
        "Unique equipment tag (e.g., E-101, P-201A)",
        "Inspection date (format: dd-mm-yyyy)",
        "Base measured thickness (mm) e.g., 6.5",
        "Mid inspection date (optional, dd-mm-yyyy)",
        "Mid thickness (optional, mm)",
        "Last inspection date (format: dd-mm-yyyy)",
        "Last measured thickness (mm) e.g., 6.0",
        "Minimum allowable thickness (mm) e.g., 3.8",
        "Inspection frequency in months (e.g., 24)"
      ]
    ];

    if (typeof XLSX === "undefined") {
      alert("Excel library is still loading. Please wait a moment.");
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsMain = XLSX.utils.aoa_to_sheet([headers, blankRow]);
    const wsPicklist = XLSX.utils.aoa_to_sheet(picklistData);

    XLSX.utils.book_append_sheet(wb, wsMain, "Corrosion_Analysis_Details");
    XLSX.utils.book_append_sheet(wb, wsPicklist, "Picklist");
    XLSX.writeFile(wb, "corrosion_analysis_template.xlsx");
  } catch (err) {
    console.error("Error downloading template:", err);
    alert("Error downloading template: " + err.message);
  }
}

// ✅ SINGLE FORM CALCULATE HANDLER
async function calculate() {
  const calcBtn = document.querySelector("#remainingLifeTab button[onclick='calculate()']") || document.getElementById("remainingCalculateBtn");
  const oldText = calcBtn ? calcBtn.innerHTML : "";
  if (calcBtn) {
    calcBtn.disabled = true;
    calcBtn.innerHTML = `Calculating on server... ⏳`;
  }

  const row = {
    tagNumber: document.getElementById("tagNumber")?.value || "-",
    basedate: document.getElementById("baseDate")?.value,
    basethk: document.getElementById("baseThk")?.value,
    middate: document.getElementById("midDate")?.value,
    midthk: document.getElementById("midThk")?.value,
    lastdate: document.getElementById("lastDate")?.value,
    lastthk: document.getElementById("lastThk")?.value,
    tmin: document.getElementById("tmin")?.value,
    freq: document.getElementById("freq")?.value
  };

  let result = null;
  try {
    const res = await fetch("/api/remaining?action=calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row })
    });
    if (res.ok) {
      result = await res.json();
    } else {
      const errData = await res.json().catch(() => ({}));
      result = { error: errData.error || `Server error (${res.status})` };
    }
  } catch (err) {
    result = { error: "Backend calculation service unavailable: " + err.message };
  } finally {
    if (calcBtn) {
      calcBtn.disabled = false;
      calcBtn.innerHTML = oldText;
    }
  }

  if (result.error) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Calculation Error",
        text: result.error,
        confirmButtonColor: "#d33"
      });
    } else {
      alert(result.error);
    }
    return;
  }

  // ✅ UI Output updates
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val != null ? val : "-";
  };

  setEl("ccr", result.controllingCorrosionRate);
  setEl("ltcr", result.longTermCorrosionRate);
  setEl("stcr", result.shortTermCorrosionRate);
  setEl("schedDate", result.scheduledNextInspection);
  setEl("intDate", result.intervalNextInspection);
  setEl("factorDate", `${result.factorLifeDuration} (${result.factorLifeDate})`);
  setEl("projDate", `${result.estimatedLife} (${result.projectedTminDate})`);
  setEl("tminVal", result.tmin);
  setEl("remLife", `${result.estimatedLife} (${result.projectedTminDate})`);

  if (result.trendData) {
    drawTrendChart(result.trendData, result);
  }
}

// ✅ PROFESSIONAL API 570 / 510 TREND & FORECAST CHART
let trendChart;
let lastChartDataPoints = null;
let lastCalcResult = null;

function getChartColors() {
  const isDark = document.documentElement.classList.contains("dark-mode") ||
                 document.body.classList.contains("dark-mode") ||
                 (!document.documentElement.classList.contains("light-mode") && !document.body.classList.contains("light-mode"));
  return {
    isDark,
    text: isDark ? "#cbd5e1" : "#475569",
    grid: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    border: isDark ? "#334155" : "#e2e8f0",
    bg: isDark ? "#181d24" : "#ffffff",
    cardBg: isDark ? "#0f172a" : "#f8fafc"
  };
}

function drawTrendChart(dataPoints, calcResult = null) {
  if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) return;
  lastChartDataPoints = dataPoints;
  if (calcResult) lastCalcResult = calcResult;
  const currentResult = calcResult || lastCalcResult;

  let canvas = document.getElementById("thicknessTrendChart");
  if (!canvas || typeof Chart === "undefined") return;

  // 1. SAFELY DESTROY ANY EXISTING CHART INSTANCES
  if (typeof Chart.getChart === "function") {
    const existingInstance = Chart.getChart(canvas);
    if (existingInstance) {
      try { existingInstance.destroy(); } catch (_) {}
    }
  }
  if (trendChart && typeof trendChart.destroy === "function") {
    try { trendChart.destroy(); } catch (_) {}
    trendChart = null;
  }

  // 2. STABLE CANVAS REUSE & DESTRUCTION (Prevents aspect ratio corruption on multiple calculates)
  // Ensure canvas width/height style are correctly maintained
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const ctx = canvas.getContext("2d");
  const colors = getChartColors();

  // 3. Update Header Badges & KPI Strip
  if (currentResult) {
    const badgeTag = document.getElementById("chartBadgeTag");
    const badgeCCR = document.getElementById("chartBadgeCCR");
    const badgeLife = document.getElementById("chartBadgeLife");
    const kpiGrid = document.getElementById("chartKpiGrid");

    const tag = currentResult.tagNumber || document.getElementById("tagNumber")?.value || "-";
    if (badgeTag) {
      if (tag && tag !== "-") {
        badgeTag.textContent = `🏷️ ${tag}`;
        badgeTag.style.display = "inline-flex";
      } else {
        badgeTag.style.display = "none";
      }
    }
    if (badgeCCR && currentResult.controllingCorrosionRate) {
      badgeCCR.textContent = `⚡ CCR: ${currentResult.controllingCorrosionRate}`;
      badgeCCR.style.display = "inline-flex";
    }
    if (badgeLife && currentResult.estimatedLife) {
      const shortLife = currentResult.estimatedLife.split(",")[0] || currentResult.estimatedLife;
      badgeLife.textContent = `⏱️ Life: ${shortLife.trim()}`;
      badgeLife.style.display = "inline-flex";
    }

    if (kpiGrid) {
      kpiGrid.style.display = "grid";
      const setVal = (id, v) => {
        const el = document.getElementById(id);
        if (el) el.textContent = v != null && v !== "" ? v : "-";
      };
      setVal("kpiBaseThk", dataPoints[0] ? `${Number(dataPoints[0].thk).toFixed(2)} mm` : "-");
      setVal("kpiLastThk", dataPoints[dataPoints.length - 1] ? `${Number(dataPoints[dataPoints.length - 1].thk).toFixed(2)} mm` : "-");
      setVal("kpiTminVal", currentResult.tmin ? `${Number(currentResult.tmin).toFixed(2)} mm` : "-");
      setVal("kpiRateVal", currentResult.controllingCorrosionRate || "-");
      setVal("kpiRetireDate", currentResult.projectedTminDate || "-");
    }
  }

  // 4. PREPARE MULTI-SERIES DATASET (Measured, Projection, T-Min Threshold)
  const measuredLabels = dataPoints.map(p => formatDate(p.date));
  const measuredValues = dataPoints.map(p => Number(p.thk));

  const tminVal = currentResult && currentResult.tmin != null && !isNaN(parseFloat(currentResult.tmin))
    ? parseFloat(currentResult.tmin)
    : null;

  const projDateStr = currentResult && currentResult.projectedTminDate && currentResult.projectedTminDate !== "-"
    ? formatDate(currentResult.projectedTminDate)
    : null;

  const hasProjection = Boolean(projDateStr && tminVal != null && measuredValues.length > 0);

  // Unified Timeline Labels
  const allLabels = [...measuredLabels];
  if (hasProjection && !allLabels.includes(projDateStr)) {
    allLabels.push(projDateStr);
  }

  // Dataset 1: Measured Historical Thickness
  const measuredData = allLabels.map((lbl, idx) => {
    if (idx < measuredValues.length) return measuredValues[idx];
    return null; // null for projected future date
  });

  // Dataset 2: Projected Degradation Line (from Last Measured to Projected T-Min Date)
  let projectionData = null;
  if (hasProjection) {
    projectionData = allLabels.map((lbl, idx) => {
      if (idx === measuredValues.length - 1) return measuredValues[measuredValues.length - 1]; // connects from last point
      if (idx === allLabels.length - 1) return tminVal; // projected retirement point
      return null;
    });
  }

  // Dataset 3: T-Min Critical Retirement Threshold (constant line across all timeline points)
  let tminData = null;
  if (tminVal != null) {
    tminData = allLabels.map(() => tminVal);
  }

  // Gradient for Historical Line Fill
  let areaGradient = "rgba(37, 99, 235, 0.12)";
  try {
    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, colors.isDark ? "rgba(59, 130, 246, 0.28)" : "rgba(37, 99, 235, 0.20)");
    grad.addColorStop(1, colors.isDark ? "rgba(59, 130, 246, 0.01)" : "rgba(37, 99, 235, 0.01)");
    areaGradient = grad;
  } catch (_) {}

  const datasets = [
    {
      label: "Measured Thickness (mm)",
      data: measuredData,
      borderColor: "#2563eb",
      borderWidth: 2.75,
      backgroundColor: areaGradient,
      fill: true,
      tension: 0.25,
      pointRadius: 6,
      pointHoverRadius: 8.5,
      pointBackgroundColor: "#2563eb",
      pointBorderColor: colors.isDark ? "#1e293b" : "#ffffff",
      pointBorderWidth: 2,
      order: 1
    }
  ];

  if (projectionData) {
    datasets.push({
      label: "Forecast Degradation (CCR)",
      data: projectionData,
      borderColor: "#d97706",
      borderWidth: 2,
      borderDash: [6, 5],
      backgroundColor: "transparent",
      fill: false,
      tension: 0,
      pointRadius: (ctx) => (ctx.dataIndex === allLabels.length - 1 ? 6.5 : 0),
      pointHoverRadius: 8.5,
      pointStyle: "triangle",
      pointBackgroundColor: "#d97706",
      pointBorderColor: colors.isDark ? "#1e293b" : "#ffffff",
      pointBorderWidth: 2,
      order: 2
    });
  }

  if (tminData) {
    datasets.push({
      label: `T-Min Limit (${tminVal.toFixed(2)} mm)`,
      data: tminData,
      borderColor: "#ef4444",
      borderWidth: 2,
      borderDash: [7, 4],
      backgroundColor: colors.isDark ? "rgba(239, 68, 68, 0.06)" : "rgba(239, 68, 68, 0.04)",
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      order: 3
    });
  }

  // Calculate clean suggested Y min/max
  const allNumericVals = [...measuredValues];
  if (tminVal != null) allNumericVals.push(tminVal);
  const minVal = Math.min(...allNumericVals);
  const maxVal = Math.max(...allNumericVals);
  const yPadding = Math.max(0.5, (maxVal - minVal) * 0.2);

  // 5. INITIALIZE CRISP, PROFESSIONAL CHART
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 450,
        easing: "easeOutQuart"
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 14,
            boxHeight: 14,
            usePointStyle: true,
            padding: 14,
            color: colors.text,
            font: {
              size: 11.5,
              weight: "600",
              family: "system-ui, -apple-system, sans-serif"
            }
          }
        },
        tooltip: {
          backgroundColor: colors.isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#f1f5f9",
          borderColor: colors.isDark ? "#334155" : "#475569",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            title: function (items) {
              const lbl = items[0]?.label || "";
              if (lbl === projDateStr) return `📅 ${lbl} (Projected Retirement)`;
              return `📅 Inspection Date: ${lbl}`;
            },
            label: function (context) {
              const val = context.parsed.y;
              if (val == null) return null;
              return ` ${context.dataset.label}: ${val.toFixed(2)} mm`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          suggestedMin: Math.max(0, minVal - yPadding),
          suggestedMax: maxVal + yPadding,
          title: {
            display: true,
            text: "Wall Thickness (mm)",
            color: colors.text,
            font: {
              size: 11.5,
              weight: "600",
              family: "system-ui, -apple-system, sans-serif"
            }
          },
          ticks: {
            color: colors.text,
            callback: function (val) {
              return Number(val).toFixed(2) + " mm";
            },
            font: { size: 10.5 }
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        },
        x: {
          title: {
            display: true,
            text: "Inspection Timeline & T-Min Forecast",
            color: colors.text,
            font: {
              size: 11.5,
              weight: "600",
              family: "system-ui, -apple-system, sans-serif"
            }
          },
          ticks: {
            color: colors.text,
            font: { size: 10.5 }
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        }
      }
    }
  });
}

window.drawTrendChart = drawTrendChart;

window.updateChartTheme = function () {
  if (lastChartDataPoints) {
    drawTrendChart(lastChartDataPoints, lastCalcResult);
  }
};
window.addEventListener("themechange", () => {
  if (window.updateChartTheme) window.updateChartTheme();
});

// ✅ Excel / CSV Bulk Parser with Backend Processing
async function parseCSV() {
  const fileInput = document.getElementById("bulkUpload");
  const file = fileInput?.files?.[0];
  if (!file) {
    alert("Please upload an Excel (.xlsx/.xls) or CSV file.");
    return;
  }

  const reader = new FileReader();

  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    reader.onload = async function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          alert("Excel sheet is empty!");
          return;
        }

        const normalizedRows = jsonData.map(rowObj => {
          const normalized = {};
          Object.keys(rowObj).forEach(k => {
            const key = k.trim().toLowerCase().replace(/\s+/g, "");
            normalized[key] = rowObj[k];
          });

          ["basedate", "middate", "lastdate"].forEach(field => {
            if (normalized[field] != null && normalized[field] !== "") {
              let val = normalized[field];
              if (!isNaN(val) && val !== "") {
                const excelDate = new Date((Number(val) - 25569) * 86400 * 1000);
                normalized[field] = formatDate(excelDate);
                return;
              }
              if (val instanceof Date && !isNaN(val.getTime())) {
                normalized[field] = formatDate(val);
                return;
              }
              if (typeof val === "string") {
                val = val.trim().replace(/\./g, "-").replace(/\\/g, "/");
                const m = val.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
                if (m) {
                  const dd = parseInt(m[1], 10);
                  const mm = parseInt(m[2], 10);
                  const yyyy = m[3].length === 2 ? "20" + m[3] : m[3];
                  normalized[field] = `${String(dd).padStart(2, '0')}-${String(mm).padStart(2, '0')}-${yyyy}`;
                  return;
                }
              }
            }
          });

          return normalized;
        });

        // Send to Backend Bulk Calculator (Authoritative)
        let results = [];
        try {
          const resp = await fetch("/api/remaining", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "calculate-bulk", rows: normalizedRows })
          });
          if (resp.ok) {
            const data = await resp.json();
            results = data.results || [];
          } else {
            const errData = await resp.json().catch(() => ({}));
            alert("Backend Calculation Error: " + (errData.error || `Server status ${resp.status}`));
            return;
          }
        } catch (err) {
          alert("Backend calculation service unavailable: " + err.message);
          return;
        }

        showBulkResults(results);
      } catch (err) {
        alert("Error reading Excel file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = async function (e) {
      try {
        const csvText = e.target.result.trim();
        const lines = csvText.split("\n").filter(line => line.trim() !== "");
        if (lines.length < 2) {
          alert("CSV must have at least one data row.");
          return;
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
          const rowCells = lines[i].split(delimiter).map(c => c.trim());
          const rowObj = {};
          headers.forEach((header, idx) => (rowObj[header] = rowCells[idx]));
          rows.push(rowObj);
        }

        let results = [];
        try {
          const resp = await fetch("/api/remaining", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "calculate-bulk", rows })
          });
          if (resp.ok) {
            const data = await resp.json();
            results = data.results || [];
          } else {
            const errData = await resp.json().catch(() => ({}));
            alert("Backend Calculation Error: " + (errData.error || `Server status ${resp.status}`));
            return;
          }
        } catch (err) {
          alert("Backend calculation service unavailable: " + err.message);
          return;
        }

        showBulkResults(results);
      } catch (err) {
        alert("Error reading CSV file: " + err.message);
      }
    };
    reader.readAsText(file);
  }
}

// ✅ Close Modal
window.closeBulkModal = function() {
  const modal = document.getElementById("bulkPreviewModal");
  if (modal) modal.style.display = "none";
};

document.addEventListener("DOMContentLoaded", function() {
  const modal = document.getElementById("bulkPreviewModal");
  const closeBtn = document.getElementById("closeBulkBtn");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
  }
});

function exportBulkTableToExcel() {
  const table = document.getElementById("bulkPreviewTable");
  if (!table || typeof XLSX === "undefined") return;
  const wb = XLSX.utils.table_to_book(table, { sheet: "Preview" });
  XLSX.writeFile(wb, "Bulk_Corrosion_Analysis.xlsx");
}

function exportBulkTableToPDF() {
  if (!window.jspdf) {
    alert("PDF library is loading. Please try again.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Bulk Corrosion Analysis Report", 14, 15);
  doc.setFontSize(10);
  doc.text("API 570 Inspection & Remaining Life Estimator", 14, 22);
  doc.text("Date: " + new Date().toLocaleDateString(), 14, 28);

  doc.autoTable({
    html: "#bulkPreviewTable",
    startY: 34,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    }
  });

  doc.save("Bulk_Corrosion_Analysis_Report.pdf");
}

function toggleRemainingSettingsMenu(event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  const menu = document.getElementById('settingsMenu');
  if (!menu) return;
  const isCurrentlyOpen = (menu.style.display === 'block') || (window.getComputedStyle && window.getComputedStyle(menu).display === 'block');
  menu.style.display = isCurrentlyOpen ? 'none' : 'block';
}

function toggleSettingsMenu(event) {
  if (event && event.target && event.target.closest && (event.target.closest('#remainingLifeTab') || event.target.closest('.remaining-settings-container') || event.target.id === 'remainingSettingsBtn')) {
    toggleRemainingSettingsMenu(event);
    return;
  }
  const menu = document.getElementById('settingsMenu');
  if (menu && (!event || !event.target || event.target.id !== 'settingsBtn')) {
    toggleRemainingSettingsMenu(event);
    return;
  }
  const topDropdown = document.getElementById('dropdownContent');
  if (topDropdown) topDropdown.classList.toggle('show');
}

document.addEventListener('click', (event) => {
  const menu = document.getElementById('settingsMenu');
  if (!menu || menu.style.display === 'none') return;
  const btn = document.getElementById('remainingSettingsBtn');
  if (event && event.target && (menu.contains(event.target) || (btn && btn.contains(event.target)))) {
    return;
  }
  menu.style.display = 'none';
});

function closeSettingsMenu() {
  const menu = document.getElementById('settingsMenu');
  if (menu) menu.style.display = 'none';
}

// ✅ Save Analysis to Backend Storage & Cache
async function saveAnalysisToServer(singleData = null) {
  try {
    let newEntries = [];

    // Case 1: Manual Single Entry Save
    if (!singleData) {
      const baseDate = document.getElementById("baseDate")?.value?.trim();
      const lastDate = document.getElementById("lastDate")?.value?.trim();
      const baseThk = document.getElementById("baseThk")?.value?.trim();
      const lastThk = document.getElementById("lastThk")?.value?.trim();
      const tmin = document.getElementById("tmin")?.value?.trim();
      const tagNumber = document.getElementById("tagNumber")?.value?.trim() || "-";

      if (!baseDate || !lastDate || !baseThk || !lastThk || !tmin) {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Missing Required Fields',
          text: 'Missing required fields (Base Date, Last Date, Base/Last Thickness, Tmin). Save cancelled.',
          confirmButtonColor: '#d33'
        });
        return;
      }

      const analysisData = {
        tagNumber,
        ccr: document.getElementById("ccr")?.innerText || "-",
        ltcr: document.getElementById("ltcr")?.innerText || "-",
        stcr: document.getElementById("stcr")?.innerText || "-",
        tminVal: document.getElementById("tminVal")?.innerText || "-",
        remLife: document.getElementById("remLife")?.innerText || "-",
        schedDate: document.getElementById("schedDate")?.innerText || "-",
        projDate: document.getElementById("projDate")?.innerText || "-",
        savedAt: new Date().toLocaleString()
      };

      // Persist to Backend API
      await fetch("/api/remaining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", data: analysisData, overwrite: true })
      });

      // Saved directly to Cloud Firestore

      Swal.fire({
        icon: 'success',
        title: '✅ Save Successful',
        text: tagNumber === "-" ? "Analysis saved (no Tag Number)." : `Tag "${tagNumber}" saved to database successfully.`,
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: "small-swal-popup" }
      });
      return;
    }

    // Case 2: Bulk Upload Save
    else if (Array.isArray(singleData)) {
      newEntries = singleData
        .filter(r => !r.error && r.baseDate && r.lastDate && r.baseThk && r.lastThk && r.tmin)
        .map(r => ({
          tagNumber: r.tagNumber || "-",
          ccr: r.controllingCorrosionRate || "-",
          ltcr: r.longTermCorrosionRate || "-",
          stcr: r.shortTermCorrosionRate || "-",
          tminVal: r.tmin || "-",
          remLife: r.estimatedLife || "-",
          schedDate: r.scheduledNextInspection || "-",
          projDate: r.projectedTminDate || "-",
          savedAt: new Date().toLocaleString()
        }));

      if (newEntries.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Nothing Saved',
          text: 'All bulk records invalid or missing required fields. Nothing saved.',
          confirmButtonColor: '#d33'
        });
        return;
      }

      // Persist to Backend API
      await fetch("/api/remaining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", data: newEntries, overwrite: true })
      });

      // Bulk saved directly to Cloud Firestore

      Swal.fire({
        icon: "success",
        title: "✅ Bulk Save Complete",
        text: `Saved ${newEntries.length} record(s) to secure backend database.`,
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: "small-swal-popup" }
      });
    }
  } catch (err) {
    console.error("Error saving analysis:", err);
    Swal.fire({
      icon: 'error',
      title: '❌ Save Failed',
      text: `Failed to save data: ${err.message}`,
      confirmButtonColor: '#d33'
    });
  }
}

// ✅ View Saved Analyses
async function viewSavedAnalyses() {
  const modal = document.getElementById("savedDataModal");
  const container = document.getElementById("savedDataTable");
  if (!modal || !container) return;

  let data = [];
  try {
    const res = await fetch("/api/remaining?action=get-analyses");
    if (res.ok) {
      data = await res.json();
    } else {
      console.error("Error retrieving analyses from cloud database.");
    }
  } catch (e) {
    console.error("Failed to fetch analyses:", e);
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#888; padding:20px;'>No saved analysis records found in database.</p>";
  } else {
    let tableHTML = `
      <table class="saved-data-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>CCR</th>
            <th>LTCR</th>
            <th>STCR</th>
            <th>Tmin</th>
            <th>Remaining Life</th>
            <th>Schedule Date</th>
            <th>Projected Date</th>
            <th>Saved At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>`;

    data.forEach((row, index) => {
      tableHTML += `
        <tr>
          <td>${row.tagNumber || "-"}</td>
          <td>${row.ccr || "-"}</td>
          <td>${row.ltcr || "-"}</td>
          <td>${row.stcr || "-"}</td>
          <td>${row.tminVal || row.tmin || "-"}</td>
          <td>${row.remLife || "-"}</td>
          <td>${row.schedDate || "-"}</td>
          <td>${row.projDate || "-"}</td>
          <td>${row.savedAt || "-"}</td>
          <td>
            <button class="saved-data-delete-btn" onclick="deleteAnalysis(${index})">Delete</button>
          </td>
        </tr>`;
    });

    tableHTML += "</tbody></table>";
    container.innerHTML = tableHTML;
  }

  modal.style.display = "flex";
}

function closeSavedDataModal() {
  const modal = document.getElementById("savedDataModal");
  if (modal) modal.style.display = "none";
}

async function deleteAnalysis(index) {
  if (confirm("Are you sure you want to delete this record?")) {
    try {
      await fetch("/api/remaining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", index })
      });
    } catch (e) {
      console.warn("Backend delete sync:", e);
    }
    viewSavedAnalyses();
  }
}

async function clearAllAnalyses() {
  if (confirm("⚠️ This will delete ALL saved analyses from the database. Continue?")) {
    try {
      await fetch("/api/remaining", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-all" })
      });
    } catch (e) {
      console.warn("Backend clear sync:", e);
    }
    viewSavedAnalyses();
  }
}

window.onclick = function (event) {
  const modal = document.getElementById("savedDataModal");
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

function showBulkResults(results) {
  const uniqueMap = new Map();
  const duplicates = [];

  results.forEach(r => {
    const tag = (r.tagNumber || "").trim().toUpperCase();
    if (tag && tag !== "-" && uniqueMap.has(tag)) {
      duplicates.push(tag);
    } else if (tag && tag !== "-") {
      uniqueMap.set(tag, r);
    } else {
      uniqueMap.set(`ITEM_${Math.random()}`, r);
    }
  });

  const uniqueResults = Array.from(uniqueMap.values());

  if (duplicates.length > 0 && typeof Swal !== "undefined") {
    Swal.fire({
      icon: "warning",
      title: "⚠️ Duplicate Tag Numbers Found",
      text: `The following Tag Numbers were duplicated and consolidated:\n\n${[...new Set(duplicates)].join(", ")}`,
      confirmButtonColor: "#f39c12"
    });
  }

  const table = document.getElementById("bulkPreviewTable");
  if (!table) return;
  table.innerHTML = "";

  const resultsToShow = uniqueResults;
  const firstValid = resultsToShow.find(r => !r.error);

  if (!firstValid) {
    let headerRow = "<tr><th>Tag Number</th><th>Error Description</th></tr>";
    table.innerHTML = headerRow;

    resultsToShow.forEach(res => {
      let rowHtml = `<tr><td>${res.tagNumber || "-"}</td><td style="color:red;">${res.error}</td></tr>`;
      table.innerHTML += rowHtml;
    });

    const modal = document.getElementById("bulkPreviewModal");
    if (modal) modal.style.display = "block";
    return;
  }

  const fieldKeys = ["tagNumber", "baseDate", "baseThk", "midDate", "midThk", "lastDate", "lastThk", "tmin", "freq", "controllingCorrosionRate", "longTermCorrosionRate", "shortTermCorrosionRate", "scheduledNextInspection", "projectedTminDate", "estimatedLife"];
  let headerRow = "<tr>";
  fieldKeys.forEach(h => {
    const displayHeader = h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    headerRow += `<th>${displayHeader}</th>`;
  });
  if (resultsToShow.some(r => r.error)) headerRow += `<th>Error</th>`;
  headerRow += "</tr>";
  table.innerHTML = headerRow;

  resultsToShow.forEach(res => {
    let rowHtml = "<tr>";
    fieldKeys.forEach(h => {
      rowHtml += `<td>${res[h] !== undefined ? res[h] : "-"}</td>`;
    });
    if (resultsToShow.some(r => r.error)) {
      rowHtml += `<td style="color:${res.error ? "red" : "inherit"};">${res.error || "-"}</td>`;
    }
    rowHtml += "</tr>";
    table.innerHTML += rowHtml;
  });

  const modal = document.getElementById("bulkPreviewModal");
  if (modal) modal.style.display = "block";

  // Auto-save unique valid results to backend database
  saveAnalysisToServer(resultsToShow);
}

// Export functions to window
window.formatDate = formatDate;
window.parseDDMMYYYY = parseDDMMYYYY;
window.calculateRow = calculateRow;
window.calculate = calculate;
window.downloadTemplate = downloadTemplate;
window.parseCSV = parseCSV;
window.saveAnalysisToServer = saveAnalysisToServer;
window.viewSavedAnalyses = viewSavedAnalyses;
window.closeSavedDataModal = closeSavedDataModal;
window.deleteAnalysis = deleteAnalysis;
window.clearAllAnalyses = clearAllAnalyses;
window.showBulkResults = showBulkResults;
window.exportBulkTableToExcel = exportBulkTableToExcel;
window.exportBulkTableToPDF = exportBulkTableToPDF;
window.toggleSettingsMenu = toggleSettingsMenu;
window.toggleRemainingSettingsMenu = toggleRemainingSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
