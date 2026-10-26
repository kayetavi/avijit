// =========================================================================
// BULK STRESS VALUE DATALOADER & FIREBASE CLOUD SYNCHRONIZATION ENGINE
// =========================================================================

(function () {
  let parsedBulkRecords = [];
  let validBulkRecords = [];
  let invalidBulkRecords = [];
  let currentPreviewFilter = "all";
  let currentSearchQuery = "";
  let currentPage = 1;
  const rowsPerPage = 25;

  // Sub-Tab Switcher
  function switchStressSubTab(subTab) {
    const singleSection = document.getElementById("stressSingleCalcSection");
    const btnSingle = document.getElementById("btnStressSingleTab");

    if (subTab === "dataloader" || subTab === "yearmanager") {
      if (typeof window.showAdminPanelTab === "function" && window.adminPanel) {
        window.showAdminPanelTab();
        window.adminPanel.navigateTo("app-stress");
        if (typeof window.adminPanel.switchStressAdminSubtab === "function") {
          window.adminPanel.switchStressAdminSubtab(subTab === "dataloader" ? "bulk" : "year");
        }
      }
      return;
    }

    if (singleSection) singleSection.style.display = "block";
    if (btnSingle) btnSingle.classList.add("active");
    if (typeof renderTemperaturePointsTable === "function") {
      renderTemperaturePointsTable();
    }
    if (typeof updateQuickYearDeleteButton === "function") {
      updateQuickYearDeleteButton();
    }
    updateActiveDatabaseSummaryBadge();
  }
  window.switchStressSubTab = switchStressSubTab;

  // Display summary of active database in the badge
  function updateActiveDatabaseSummaryBadge() {
    const badge = document.getElementById("stressActiveDbBadge");
    if (!badge) return;
    const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
    if (!db || Object.keys(db).length === 0) {
      badge.textContent = "Active Cloud DB: Loading...";
      badge.style.background = "#fef3c7";
      badge.style.color = "#92400e";
      badge.style.borderColor = "#fde68a";
      return;
    }
    const years = Object.keys(db);
    let totalMats = 0;
    const matSet = new Set();
    years.forEach(y => {
      Object.keys(db[y] || {}).forEach(m => matSet.add(m));
    });
    badge.textContent = `Active Cloud DB: ${years.length} Code Editions • ${matSet.size} Unique Materials`;
    badge.style.background = "#ecfdf5";
    badge.style.color = "#065f46";
    badge.style.borderColor = "#a7f3d0";
  }

  // =========================================================================
  // DOWNLOAD TEMPLATE LOGIC
  // =========================================================================

  function downloadStressTemplate(format = "xlsx") {
    const targetFormat = String(format).toLowerCase() === "csv" ? "csv" : "xlsx";
    window.location.href = `/api/stress-data/template?format=${targetFormat}`;
  }
  window.downloadStressTemplate = downloadStressTemplate;

  // Helper to trigger client download of blob
  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // EXPORT CURRENT ACTIVE DATABASE TO EXCEL
  // =========================================================================

  function exportStressDatabase(format = "xlsx") {
    if (typeof canUserExportStress === "function" && !canUserExportStress()) {
      alert("⚠️ Permission Denied: You do not have permission to export stress datasets.");
      return;
    }
    const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
    if (!db || Object.keys(db).length === 0) {
      alert("⚠️ No stress database currently loaded to export.");
      return;
    }

    const rows = [];
    for (const year of Object.keys(db)) {
      for (const mat of Object.keys(db[year] || {})) {
        for (const grade of Object.keys(db[year][mat] || {})) {
          const gradeObj = db[year][mat][grade];
          for (const key of Object.keys(gradeObj || {})) {
            const val = gradeObj[key];
            if (typeof val === "object" && val !== null) {
              if ("Allowable Stress" in val) {
                // Key is temperature
                rows.push({
                  "Year": year,
                  "Material": mat,
                  "Grade": grade,
                  "Thickness": "",
                  "Temperature (°C)": parseFloat(key),
                  "Allowable Stress (MPa)": val["Allowable Stress"],
                  "Yield Strength (MPa)": val.yield ?? "",
                  "Tensile Strength (MPa)": val.tensile ?? ""
                });
              } else {
                // Key is thickness
                const thicknessKey = key;
                for (const tempKey of Object.keys(val)) {
                  const subVal = val[tempKey];
                  if (typeof subVal === "object" && subVal !== null) {
                    rows.push({
                      "Year": year,
                      "Material": mat,
                      "Grade": grade,
                      "Thickness": thicknessKey,
                      "Temperature (°C)": parseFloat(tempKey),
                      "Allowable Stress (MPa)": subVal["Allowable Stress"],
                      "Yield Strength (MPa)": subVal.yield ?? "",
                      "Tensile Strength (MPa)": subVal.tensile ?? ""
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    if (typeof XLSX !== "undefined") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 14 },
        { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Active_Stress_Data");

      if (format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(ws);
        downloadBlob(csv, "Active_Stress_Database.csv", "text/csv;charset=utf-8;");
      } else {
        XLSX.writeFile(wb, "Active_Stress_Database.xlsx");
      }
    }
  }
  window.exportStressDatabase = exportStressDatabase;

  // =========================================================================
  // FILE UPLOAD, PARSING & DATA VALIDATION
  // =========================================================================

  // Helper to ensure SheetJS XLSX is available with fallback CDNs
  async function ensureXLSX() {
    if (typeof XLSX !== "undefined" && XLSX.read && XLSX.utils) return XLSX;
    if (window.XLSX && window.XLSX.read && window.XLSX.utils) return window.XLSX;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      script.crossOrigin = "anonymous";
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error("SheetJS XLSX library failed to initialize"));
      };
      script.onerror = () => {
        const script2 = document.createElement("script");
        script2.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        script2.crossOrigin = "anonymous";
        script2.onload = () => resolve(window.XLSX);
        script2.onerror = () => reject(new Error("Unable to load Excel parser (XLSX). Please verify network access."));
        document.head.appendChild(script2);
      };
      document.head.appendChild(script);
    });
  }
  window.ensureXLSX = ensureXLSX;

  function initStressDataLoaderEvents() {
    const fileInput = document.getElementById("stressBulkFileInput");
    const dropZone = document.getElementById("stressDropZone");

    if (fileInput && !fileInput._bound) {
      fileInput._bound = true;
      fileInput.addEventListener("change", handleStressFileSelect);
    }

    if (dropZone && !dropZone._bound) {
      dropZone._bound = true;
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
        dropZone.style.borderColor = "#0284c7";
        dropZone.style.backgroundColor = "#e0f2fe";
      });
      dropZone.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
        dropZone.style.borderColor = "#0284c7";
        dropZone.style.backgroundColor = "#f0f9ff";
      });
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
        dropZone.style.borderColor = "#0284c7";
        dropZone.style.backgroundColor = "#f0f9ff";
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processStressFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  function handleStressFileSelect(e) {
    if (e && e.target && e.target.files && e.target.files.length > 0) {
      processStressFile(e.target.files[0]);
    }
  }

  async function processStressFile(file) {
    if (!file) return;
    const statusDiv = document.getElementById("stressLoaderStatus");
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: #0284c7; padding: 12px; background: #e0f2fe; border-radius: 6px;">
          <div class="stress-spinner"></div>
          <span>Parsing <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)...</span>
        </div>
      `;
      statusDiv.style.display = "block";
    }

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith(".json")) {
      reader.onload = function (e) {
        try {
          const json = JSON.parse(e.target.result);
          if (Array.isArray(json)) {
            normalizeAndValidateStressData(json);
          } else if (typeof json === "object") {
            const flat = flattenHierarchyToRecords(json);
            normalizeAndValidateStressData(flat);
          }
        } catch (err) {
          showStressLoaderError("Invalid JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      // Excel (.xlsx, .xls) or CSV
      reader.onload = async function (e) {
        try {
          const xlsxLib = await ensureXLSX();
          if (!xlsxLib || !xlsxLib.read) {
            throw new Error("Excel parsing engine (XLSX) could not be initialized.");
          }

          const data = new Uint8Array(e.target.result);
          const workbook = xlsxLib.read(data, { type: "array" });

          // Intelligently find the most appropriate sheet
          let selectedSheet = workbook.SheetNames[0];
          for (const sName of workbook.SheetNames) {
            const lower = sName.toLowerCase();
            if (!lower.includes("instruct") && !lower.includes("read") && !lower.includes("help")) {
              selectedSheet = sName;
              break;
            }
          }

          const worksheet = workbook.Sheets[selectedSheet];
          
          // Try converting array-of-arrays first to detect header row if title rows exist
          let rawRows = [];
          const rowsAsArrays = xlsxLib.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

          if (rowsAsArrays && rowsAsArrays.length > 0) {
            let headerRowIdx = 0;
            for (let r = 0; r < Math.min(rowsAsArrays.length, 10); r++) {
              const rowValues = rowsAsArrays[r].map(v => String(v).toLowerCase().trim());
              if (rowValues.some(v => v.includes("material") || v.includes("stress") || v.includes("spec") || v.includes("allowable") || v.includes("temp"))) {
                headerRowIdx = r;
                break;
              }
            }

            const headers = rowsAsArrays[headerRowIdx].map(h => String(h).trim());
            for (let r = headerRowIdx + 1; r < rowsAsArrays.length; r++) {
              const rowData = rowsAsArrays[r];
              if (!rowData || rowData.every(c => c === "" || c === null || c === undefined)) continue;
              const rowObj = {};
              headers.forEach((h, colIdx) => {
                if (h) rowObj[h] = rowData[colIdx] !== undefined ? rowData[colIdx] : "";
              });
              rawRows.push(rowObj);
            }
          }

          if (!rawRows || rawRows.length === 0) {
            rawRows = xlsxLib.utils.sheet_to_json(worksheet, { defval: "" });
          }

          if (!rawRows || rawRows.length === 0) {
            showStressLoaderError("Spreadsheet appears empty or has no recognizable data rows.");
            return;
          }

          normalizeAndValidateStressData(rawRows);
        } catch (err) {
          showStressLoaderError("Failed to parse spreadsheet file: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  function flattenHierarchyToRecords(hierarchy) {
    const list = [];
    for (const year of Object.keys(hierarchy)) {
      for (const mat of Object.keys(hierarchy[year] || {})) {
        for (const grade of Object.keys(hierarchy[year][mat] || {})) {
          const node = hierarchy[year][mat][grade];
          for (const key of Object.keys(node || {})) {
            const val = node[key];
            if (typeof val === "object" && val !== null) {
              if ("Allowable Stress" in val) {
                list.push({
                  Year: year,
                  Material: mat,
                  Grade: grade,
                  Thickness: "",
                  "Temperature (°C)": key,
                  "Allowable Stress (MPa)": val["Allowable Stress"],
                  "Yield Strength (MPa)": val.yield,
                  "Tensile Strength (MPa)": val.tensile
                });
              } else {
                for (const tempKey of Object.keys(val)) {
                  list.push({
                    Year: year,
                    Material: mat,
                    Grade: grade,
                    Thickness: key,
                    "Temperature (°C)": tempKey,
                    "Allowable Stress (MPa)": val[tempKey]["Allowable Stress"],
                    "Yield Strength (MPa)": val[tempKey].yield,
                    "Tensile Strength (MPa)": val[tempKey].tensile
                  });
                }
              }
            }
          }
        }
      }
    }
    return list;
  }

  function showStressLoaderError(msg) {
    const statusDiv = document.getElementById("stressLoaderStatus");
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div style="background: #fee2e2; border: 1px solid #f87171; color: #991b1b; padding: 12px; border-radius: 6px;">
          ❌ <strong>Upload Error:</strong> ${msg}
        </div>
      `;
      statusDiv.style.display = "block";
    }
  }

  // Normalize column names and validate rows
  function normalizeAndValidateStressData(rawRows) {
    parsedBulkRecords = [];
    validBulkRecords = [];
    invalidBulkRecords = [];

    const defaultYear = document.getElementById("stressDefaultYear")?.value || "2022";

    rawRows.forEach((row, idx) => {
      // Find values with alias tolerance
      const year = findColumnValue(row, ["year", "code year", "edition", "standard year", "code edition", "asme year", "standard"]) || defaultYear;
      const material = findColumnValue(row, ["material", "material specification", "spec", "mat", "specification", "material name", "material spec", "alloy", "steel", "mat.", "grade/spec"]);
      const grade = findColumnValue(row, ["grade", "mat grade", "grd", "grade/class", "class", "type", "gr", "gr."]);
      const thickness = findColumnValue(row, ["thickness", "thk", "thickness (mm)", "size", "thickness range", "thk range", "wall thickness"]) || "";
      const rawTemp = findColumnValue(row, ["temperature (°c)", "temperature (c)", "temperature", "temp", "temp (°c)", "temp(c)", "temperature, °c", "temp_c", "t (°c)", "t(c)", "deg c", "temp (c)"]);
      const rawTempF = findColumnValue(row, ["temperature (°f)", "temp (°f)", "temp (f)", "temperature (f)", "deg f", "t (°f)", "t(f)"]);
      const rawStress = findColumnValue(row, ["allowable stress (mpa)", "allowable stress", "stress (mpa)", "stress", "s (mpa)", "s", "allowable stress, mpa", "max allowable stress", "design stress", "allowable"]);
      const rawStressKsi = findColumnValue(row, ["allowable stress (ksi)", "stress (ksi)", "s (ksi)", "ksi"]);
      const rawStressPsi = findColumnValue(row, ["allowable stress (psi)", "stress (psi)", "s (psi)", "psi"]);
      const rawYield = findColumnValue(row, ["yield strength (mpa)", "yield (mpa)", "yield strength", "yield", "sy", "yield (ksi)"]);
      const rawTensile = findColumnValue(row, ["tensile strength (mpa)", "tensile (mpa)", "tensile strength", "tensile", "su", "tensile (ksi)"]);
      const remarks = findColumnValue(row, ["remarks", "notes", "reference", "code reference", "comment"]) || "";

      let tempNum = parseFloat(rawTemp);
      if ((isNaN(tempNum) || rawTemp === "") && rawTempF !== "" && !isNaN(parseFloat(rawTempF))) {
        tempNum = Math.round((parseFloat(rawTempF) - 32) * 5 / 9);
      }

      let stressNum = parseFloat(rawStress);
      if ((isNaN(stressNum) || rawStress === "" || stressNum <= 0) && rawStressKsi !== "" && !isNaN(parseFloat(rawStressKsi))) {
        stressNum = parseFloat((parseFloat(rawStressKsi) * 6.894757).toFixed(2));
      } else if ((isNaN(stressNum) || rawStress === "" || stressNum <= 0) && rawStressPsi !== "" && !isNaN(parseFloat(rawStressPsi))) {
        stressNum = parseFloat((parseFloat(rawStressPsi) / 145.038).toFixed(2));
      }

      const yieldNum = rawYield !== "" && rawYield !== undefined ? parseFloat(rawYield) : undefined;
      const tensileNum = rawTensile !== "" && rawTensile !== undefined ? parseFloat(rawTensile) : undefined;

      const cleanGrade = (grade && String(grade).trim() !== "") ? String(grade).trim() : "-";

      const issues = [];
      if (!material) issues.push("Missing Material Specification");
      if (isNaN(tempNum)) issues.push("Invalid or missing Temperature (°C)");
      if (isNaN(stressNum) || stressNum <= 0) issues.push("Invalid or missing Allowable Stress (MPa)");

      const cleanRecord = {
        index: idx + 1,
        Year: String(year).trim(),
        Material: String(material || "").trim().toUpperCase(),
        Grade: cleanGrade,
        Thickness: String(thickness || "").trim(),
        "Temperature (°C)": !isNaN(tempNum) ? tempNum : rawTemp,
        "Allowable Stress (MPa)": !isNaN(stressNum) ? stressNum : rawStress,
        "Yield Strength (MPa)": yieldNum !== undefined && !isNaN(yieldNum) ? yieldNum : (rawYield || ""),
        "Tensile Strength (MPa)": tensileNum !== undefined && !isNaN(tensileNum) ? tensileNum : (rawTensile || ""),
        Remarks: remarks,
        isValid: issues.length === 0,
        issues: issues
      };

      parsedBulkRecords.push(cleanRecord);
      if (cleanRecord.isValid) {
        validBulkRecords.push(cleanRecord);
      } else {
        invalidBulkRecords.push(cleanRecord);
      }
    });

    renderDataLoaderKPIs();
    renderDataLoaderPreviewTable();

    const previewContainer = document.getElementById("stressPreviewContainer");
    if (previewContainer) {
      previewContainer.style.display = "block";
      previewContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const statusDiv = document.getElementById("stressLoaderStatus");
    if (statusDiv) {
      if (validBulkRecords.length > 0) {
        statusDiv.innerHTML = `
          <div style="background: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 12px; border-radius: 6px; font-weight: 500;">
            ✅ <strong>Parsed ${parsedBulkRecords.length} records successfully!</strong> ${validBulkRecords.length} rows are valid and ready to be saved to Firebase Cloud Firestore.
          </div>
        `;
      } else {
        statusDiv.innerHTML = `
          <div style="background: #fffbeb; border: 1px solid #f59e0b; color: #92400e; padding: 12px; border-radius: 6px;">
            ⚠️ Parsed ${parsedBulkRecords.length} records, but none passed validation. Please verify column headers: <strong>Material</strong>, <strong>Temperature (°C)</strong>, and <strong>Allowable Stress (MPa)</strong>.
          </div>
        `;
      }
      statusDiv.style.display = "block";
    }

    const saveBtn = document.getElementById("btnSaveStressToFirebase");
    if (saveBtn) {
      saveBtn.disabled = validBulkRecords.length === 0;
    }
  }

  function findColumnValue(row, candidateKeys) {
    if (!row || typeof row !== "object") return "";
    const rowKeys = Object.keys(row);

    // 1. Exact match (case-insensitive)
    for (const ck of candidateKeys) {
      const matchKey = rowKeys.find(k => k.trim().toLowerCase() === ck.toLowerCase());
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") {
        return row[matchKey];
      }
    }

    // 2. Normalized alphanumeric match (strips (°C), spaces, symbols)
    for (const ck of candidateKeys) {
      const cleanCk = ck.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchKey = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanCk);
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") {
        return row[matchKey];
      }
    }

    // 3. Substring / contains match for longer keywords
    for (const ck of candidateKeys) {
      const cleanCk = ck.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanCk.length < 4) continue;
      const matchKey = rowKeys.find(k => {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanK.includes(cleanCk) || cleanCk.includes(cleanK);
      });
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== "") {
        return row[matchKey];
      }
    }

    return "";
  }

  // =========================================================================
  // KPI METRICS & STATS BAR
  // =========================================================================

  function renderDataLoaderKPIs() {
    const kpiDiv = document.getElementById("stressDataLoaderKPIs");
    if (!kpiDiv) return;

    const total = parsedBulkRecords.length;
    const valid = validBulkRecords.length;
    const errors = invalidBulkRecords.length;

    const materialsSet = new Set();
    const yearsSet = new Set();
    validBulkRecords.forEach(r => {
      if (r.Material) materialsSet.add(r.Material);
      if (r.Year) yearsSet.add(r.Year);
    });

    kpiDiv.innerHTML = `
      <div class="stress-kpi-card">
        <span class="stress-kpi-num">${total}</span>
        <span class="stress-kpi-label">📋 Total Rows Parsed</span>
      </div>
      <div class="stress-kpi-card" style="border-left-color: #10b981;">
        <span class="stress-kpi-num" style="color: #059669;">${valid}</span>
        <span class="stress-kpi-label">✅ Valid Records</span>
      </div>
      <div class="stress-kpi-card" style="border-left-color: #3b82f6;">
        <span class="stress-kpi-num" style="color: #2563eb;">${materialsSet.size}</span>
        <span class="stress-kpi-label">🏷️ Materials</span>
      </div>
      <div class="stress-kpi-card" style="border-left-color: #8b5cf6;">
        <span class="stress-kpi-num" style="color: #7c3aed;">${yearsSet.size}</span>
        <span class="stress-kpi-label">📅 Code Years</span>
      </div>
      <div class="stress-kpi-card" style="border-left-color: ${errors > 0 ? '#ef4444' : '#94a3b8'};">
        <span class="stress-kpi-num" style="color: ${errors > 0 ? '#dc2626' : '#64748b'};">${errors}</span>
        <span class="stress-kpi-label">⚠️ Warnings / Incomplete</span>
      </div>
    `;
    kpiDiv.style.display = "flex";
  }

  // =========================================================================
  // PREVIEW TABLE RENDERING
  // =========================================================================

  function filterStressPreview(type) {
    currentPreviewFilter = type;
    currentPage = 1;
    document.querySelectorAll(".stress-filter-pill").forEach(p => p.classList.remove("active"));
    const activePill = document.getElementById("stressFilterPill_" + type);
    if (activePill) activePill.classList.add("active");
    renderDataLoaderPreviewTable();
  }
  window.filterStressPreview = filterStressPreview;

  function onStressSearchInput(e) {
    currentSearchQuery = (e.target.value || "").toLowerCase().trim();
    currentPage = 1;
    renderDataLoaderPreviewTable();
  }
  window.onStressSearchInput = onStressSearchInput;

  function renderDataLoaderPreviewTable() {
    const tbody = document.getElementById("stressPreviewTbody");
    const countSpan = document.getElementById("stressPreviewVisibleCount");
    const paginationDiv = document.getElementById("stressPreviewPagination");
    if (!tbody) return;

    let filtered = parsedBulkRecords;

    if (currentPreviewFilter === "valid") {
      filtered = filtered.filter(r => r.isValid);
    } else if (currentPreviewFilter === "issues") {
      filtered = filtered.filter(r => !r.isValid);
    }

    if (currentSearchQuery) {
      filtered = filtered.filter(r =>
        r.Material.toLowerCase().includes(currentSearchQuery) ||
        r.Grade.toLowerCase().includes(currentSearchQuery) ||
        r.Year.toLowerCase().includes(currentSearchQuery) ||
        (r.Thickness && r.Thickness.toLowerCase().includes(currentSearchQuery))
      );
    }

    if (countSpan) {
      countSpan.textContent = `Showing ${filtered.length} of ${parsedBulkRecords.length} records`;
    }

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + rowsPerPage);

    tbody.innerHTML = "";

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 25px; color: #64748b;">No matching records found.</td></tr>`;
      if (paginationDiv) paginationDiv.innerHTML = "";
      return;
    }

    pageItems.forEach(r => {
      const tr = document.createElement("tr");
      if (!r.isValid) {
        tr.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
      }

      tr.innerHTML = `
        <td style="text-align: center; color: #64748b;">${r.index}</td>
        <td style="text-align: center;">
          ${r.isValid
            ? `<span class="stress-badge stress-badge-valid">✅ Valid</span>`
            : `<span class="stress-badge stress-badge-error" title="${r.issues.join("; ")}">⚠️ Issues (${r.issues.length})</span>`
          }
        </td>
        <td><strong>${r.Year}</strong></td>
        <td><strong style="color: #2563eb;">${r.Material}</strong></td>
        <td><strong>${r.Grade}</strong></td>
        <td style="color: #475569;">${r.Thickness || '<span style="color:#94a3b8;">All</span>'}</td>
        <td style="text-align: right; font-family: monospace; font-size: 13.5px;">${r["Temperature (°C)"]} °C</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669; font-size: 14px;">${r["Allowable Stress (MPa)"]}</td>
        <td style="text-align: right; font-family: monospace; color: #475569;">${r["Yield Strength (MPa)"] || "--"}</td>
        <td style="text-align: right; font-family: monospace; color: #475569;">${r["Tensile Strength (MPa)"] || "--"}</td>
      `;
      tbody.appendChild(tr);
    });

    // Pagination controls
    if (paginationDiv) {
      if (totalPages > 1) {
        paginationDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <button type="button" class="stress-btn-page" ${currentPage === 1 ? "disabled" : ""} onclick="changeStressPage(${currentPage - 1})">
              ◀ Prev
            </button>
            <span style="font-size: 13px; color: #475569; font-weight: 600;">
              Page ${currentPage} of ${totalPages}
            </span>
            <button type="button" class="stress-btn-page" ${currentPage === totalPages ? "disabled" : ""} onclick="changeStressPage(${currentPage + 1})">
              Next ▶
            </button>
          </div>
        `;
      } else {
        paginationDiv.innerHTML = "";
      }
    }
  }

  function changeStressPage(newPage) {
    currentPage = newPage;
    renderDataLoaderPreviewTable();
  }
  window.changeStressPage = changeStressPage;

  // =========================================================================
  // SAVE TO FIREBASE CLOUD DATABASE
  // =========================================================================

  async function saveStressDataToFirebase() {
    const bottomStatus = document.getElementById("stressSaveBottomStatus");
    const topStatus = document.getElementById("stressLoaderStatus");
    const saveBtn = document.getElementById("btnSaveStressToFirebase");

    if (!validBulkRecords || validBulkRecords.length === 0) {
      const emptyMsg = `
        <div style="background: #fef2f2; border: 1.5px solid #ef4444; color: #991b1b; padding: 14px; border-radius: 8px; font-size: 13.5px;">
          ⚠️ <strong>No Valid Records Available:</strong> Please select or drag an Excel (.xlsx/.xls) or CSV file with valid stress records in the box above before saving.
        </div>
      `;
      if (bottomStatus) {
        bottomStatus.style.display = "block";
        bottomStatus.innerHTML = emptyMsg;
        bottomStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (topStatus) {
        topStatus.style.display = "block";
        topStatus.innerHTML = emptyMsg;
      }
      return;
    }

    const mode = document.querySelector('input[name="stressMergeMode"]:checked')?.value || "merge";

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <div style="display: inline-flex; align-items: center; gap: 8px;">
          <div class="stress-spinner-small"></div>
          <span>Saving ${validBulkRecords.length} records to Firebase...</span>
        </div>
      `;
    }

    const renderProgressHtml = (stepNum, stepTitle, stepDetail) => `
      <div style="background: #eff6ff; border: 2px solid #3b82f6; color: #1e40af; padding: 16px; border-radius: 8px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.15);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="stress-spinner-small" style="width: 24px; height: 24px; border-width: 3px; border-top-color: #2563eb;"></div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 14.5px; color: #1e3a8a; margin-bottom: 3px;">
              ⏳ Synchronizing with Firebase Cloud Database (Step ${stepNum} of 3)
            </div>
            <div style="font-size: 13px; color: #1d4ed8; font-weight: 500;">
              ${stepTitle}
            </div>
            <div style="font-size: 12px; color: #3b82f6; margin-top: 2px;">
              ${stepDetail}
            </div>
          </div>
        </div>
      </div>
    `;

    if (bottomStatus) {
      bottomStatus.style.display = "block";
      bottomStatus.innerHTML = renderProgressHtml(1, `Transmitting ${validBulkRecords.length} validated records to Firebase Cloud...`, "Writing to Firestore collection 'stressData' and master catalog...");
      bottomStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (topStatus) {
      topStatus.style.display = "block";
      topStatus.innerHTML = renderProgressHtml(1, `Transmitting ${validBulkRecords.length} validated records to Firebase Cloud...`, "Writing to Firestore collection 'stressData' and master catalog...");
    }

    try {
      const userEmail = window.currentUserEmail || (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";

      const res = await fetch("/api/stress-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk-upload",
          mode: mode,
          records: validBulkRecords,
          userEmail: userEmail,
          source: "Bulk DataLoader UI"
        })
      });

      if (bottomStatus) {
        bottomStatus.innerHTML = renderProgressHtml(2, "Firebase cloud database updated!", "Refreshing local in-memory cache and re-indexing code years...");
      }

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || "Failed to save to Firebase Firestore");
      }

      if (bottomStatus) {
        bottomStatus.innerHTML = renderProgressHtml(3, "Updating application dropdowns...", "Broadcasting newly added years to Single Material Lookup, B31.3 Calculator, and Simple Calculator...");
      }

      // Extract target year and material from the uploaded records so we can immediately show it
      const uploadedYears = [...new Set(validBulkRecords.map(r => String(r.Year).trim()))];
      const targetYear = uploadedYears[0] || null;
      const targetMaterial = validBulkRecords[0]?.Material ? String(validBulkRecords[0].Material).trim() : null;
      const targetGrade = validBulkRecords[0]?.Grade ? String(validBulkRecords[0].Grade).trim() : null;

      // Refresh stress database across entire client and auto-select newly saved year/material
      await refreshStressDataFromCloud(targetYear, targetMaterial);

      const successHtml = `
        <div style="background: #ecfdf5; border: 2px solid #10b981; color: #065f46; padding: 18px; border-radius: 8px; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <span style="font-size: 28px; line-height: 1;">🎉</span>
            <div style="flex: 1;">
              <strong style="font-size: 16px; color: #064e3b; display: block; margin-bottom: 4px;">
                Successfully Saved & Synchronized to Firebase Cloud Database!
              </strong>
              <div style="font-size: 13.5px; line-height: 1.5; color: #065f46; margin-bottom: 8px;">
                ${json.message}<br>
                • <strong>Total Records in Cloud Database:</strong> <b>${json.stats?.records || validBulkRecords.length}</b><br>
                • <strong>Materials in Database:</strong> <b>${json.stats?.materials || "--"}</b><br>
                • <strong>Code Editions Available:</strong> <b>${json.stats?.years || "--"} Code Years</b>
              </div>
              <div style="background: rgba(16, 185, 129, 0.12); border-left: 4px solid #10b981; padding: 10px 14px; border-radius: 4px; font-size: 13px; color: #047857; margin-bottom: 12px;">
                ✅ <strong>Live Automatic Reflection Complete:</strong> All new and updated code years, material specifications, and allowable stresses have been automatically refreshed across:
                <ul style="margin: 4px 0 0 18px; padding: 0;">
                  <li><strong>Single Material Lookup & Editor</strong> (Year & Material dropdowns updated and auto-selected)</li>
                  <li><strong>ASME B31.3 Piping Design Calculator</strong> (Table A-1 Year selector updated)</li>
                  <li><strong>Simple Thickness / Stress Calculator</strong> (Auto stress year selector updated)</li>
                  <li><strong>Year & DB Manager</strong> (Code edition cards updated & preserved on refresh)</li>
                </ul>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button type="button" class="stress-btn-primary" onclick="switchStressSubTab('calculator'); if (typeof window.bkSelectMaterialAndRender === 'function') { window.bkSelectMaterialAndRender('${targetYear}', '${targetMaterial}', '${targetGrade}'); }" style="padding: 8px 16px; font-size: 13.5px; font-weight: 700;">
                  🔍 View ${targetMaterial ? targetMaterial + ' (' + targetYear + ')' : 'Uploaded Records'} in Single Material Lookup & Editor
                </button>
                <button type="button" class="stress-btn-secondary" onclick="switchStressSubTab('yearmanager')" style="padding: 8px 14px; font-size: 13px; font-weight: 600;">
                  ⚙️ View in Year & DB Manager
                </button>
                <button type="button" class="stress-btn-secondary" onclick="exportStressDatabase('xlsx')" style="padding: 8px 14px; font-size: 13px;">
                  📊 Download Synced DB (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      if (bottomStatus) {
        bottomStatus.style.display = "block";
        bottomStatus.innerHTML = successHtml;
        bottomStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (topStatus) {
        topStatus.style.display = "block";
        topStatus.innerHTML = successHtml;
      }

    } catch (err) {
      console.error("Firebase save error:", err);
      const errHtml = `
        <div style="background: #fef2f2; border: 2px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 8px;">
          <strong style="font-size: 14.5px;">❌ Firebase Save Failed:</strong> ${err.message}
          <div style="margin-top: 6px; font-size: 12.5px; color: #7f1d1d;">
            Your parsed records are preserved in the preview table. You can retry the save or verify your connection.
          </div>
        </div>
      `;
      if (bottomStatus) {
        bottomStatus.style.display = "block";
        bottomStatus.innerHTML = errHtml;
        bottomStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (topStatus) {
        topStatus.style.display = "block";
        topStatus.innerHTML = errHtml;
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `☁️ Save to Firebase Cloud Database`;
      }
    }
  }
  window.saveStressDataToFirebase = saveStressDataToFirebase;

  // =========================================================================
  // APPLICATION-WIDE LIVE STRESS DATABASE BROADCASTER
  // =========================================================================

  function broadcastStressDatabaseUpdate(preferredYear = null, preferredMaterial = null, preferredGrade = null, preferredTemp = null) {
    const data = window.bkStressData || {};

    // 1. Re-populate Standalone Allowable Stress Tab (Single Material Lookup)
    if (typeof window.bkPopulateYears === "function") {
      window.bkPopulateYears(preferredYear, preferredMaterial, preferredGrade);
    }

    // 2. LIVE AUTO-REFLECT into ASME B31.3 Process Piping Thickness Calculator
    if (typeof window.initB313AutoStressFields === "function") {
      window.initB313AutoStressFields(true, preferredYear, preferredMaterial, preferredGrade, preferredTemp);
    }

    // 3. LIVE AUTO-REFLECT into Simple Piping Thickness Calculator (PD / 2SE)
    if (typeof window.initSimpleAutoStressFields === "function") {
      window.initSimpleAutoStressFields(true, preferredYear, preferredMaterial, preferredGrade, preferredTemp);
    }

    // 4. Re-populate DataLoader Quick Test Sandbox
    if (typeof populateQuickTestYearSelect === "function") {
      populateQuickTestYearSelect();
    }

    // 5. Re-render Year & DB Manager cards
    if (typeof renderYearManagerList === "function") {
      renderYearManagerList();
    }

    // 6. Update database status badge & delete button
    if (typeof updateActiveDatabaseSummaryBadge === "function") {
      updateActiveDatabaseSummaryBadge();
    }
    if (typeof updateQuickYearDeleteButton === "function") {
      updateQuickYearDeleteButton();
    }

    // 7. If single material lookup has material selected, refresh temperature points table
    if (typeof renderTemperaturePointsTable === "function") {
      renderTemperaturePointsTable();
    }

    // 8. Fire global custom event for any other app modules
    window.dispatchEvent(new CustomEvent("stressDataRefreshed", {
      detail: {
        data: data,
        year: preferredYear,
        material: preferredMaterial,
        grade: preferredGrade,
        temp: preferredTemp
      }
    }));
  }
  window.broadcastStressDatabaseUpdate = broadcastStressDatabaseUpdate;

  // =========================================================================
  // REFRESH STRESS DATA FROM CLOUD (CLIENT-SIDE SYNC)
  // =========================================================================

  async function refreshStressDataFromCloud(preferredYear = null, preferredMaterial = null, preferredGrade = null, preferredTemp = null) {
    try {
      const badge = document.getElementById("stressActiveDbBadge");
      if (badge && (!window.bkStressData || Object.keys(window.bkStressData).length === 0)) {
        badge.textContent = "🔄 Syncing with Cloud...";
        badge.style.background = "#e0f2fe";
        badge.style.color = "#0369a1";
        badge.style.borderColor = "#bae6fd";
      }
      const res = await fetch("/api/stress-data?_t=" + Date.now(), {
        headers: { "Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache" }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && Object.keys(json).length > 0) {
          window.bkStressData = json;
          if (typeof bkStressData !== "undefined") {
            bkStressData = json;
          }
          try {
            /* in-memory cache: window.bkStressData */
          } catch (e) {}

          broadcastStressDatabaseUpdate(preferredYear, preferredMaterial, preferredGrade, preferredTemp);
          updateActiveDatabaseSummaryBadge();
          console.info("Stress database synchronized live across application with years:", Object.keys(json));
        }
      }
    } catch (err) {
      console.warn("Could not refresh stress data:", err);
    } finally {
      updateActiveDatabaseSummaryBadge();
    }
  }
  window.refreshStressDataFromCloud = refreshStressDataFromCloud;

  // =========================================================================
  // QUICK TEST QUERY SANDBOX (INSIDE DATALOADER)
  // =========================================================================

  function populateQuickTestYearSelect() {
    const ySel = document.getElementById("stressQuickTestYear");
    if (!ySel) return;
    const years = window.bkGetAvailableYears ? window.bkGetAvailableYears() : Object.keys(window.bkStressData || {});
    const cur = ySel.value;
    ySel.innerHTML = '<option value="">-- Year --</option>';
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === cur) opt.selected = true;
      ySel.appendChild(opt);
    });
  }

  function onQuickTestYearChange() {
    const ySel = document.getElementById("stressQuickTestYear");
    const mSel = document.getElementById("stressQuickTestMaterial");
    const gSel = document.getElementById("stressQuickTestGrade");
    const thSel = document.getElementById("stressQuickTestThickness");
    const tempInput = document.getElementById("stressQuickTestTemp");

    const year = ySel ? ySel.value : "";
    if (mSel) {
      mSel.innerHTML = '<option value="">-- Material --</option>';
      mSel.disabled = !year;
    }
    if (gSel) {
      gSel.innerHTML = '<option value="">-- Grade --</option>';
      gSel.disabled = true;
    }
    if (thSel) {
      thSel.innerHTML = '<option value="">-- Thickness --</option>';
      thSel.disabled = true;
    }
    if (tempInput) tempInput.disabled = true;

    if (year && typeof window.bkGetMaterialsForYear === "function") {
      const mats = window.bkGetMaterialsForYear(year);
      mats.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        mSel.appendChild(opt);
      });
    }
    evaluateQuickTestQuery();
  }
  window.onQuickTestYearChange = onQuickTestYearChange;

  function onQuickTestMaterialChange() {
    const ySel = document.getElementById("stressQuickTestYear");
    const mSel = document.getElementById("stressQuickTestMaterial");
    const gSel = document.getElementById("stressQuickTestGrade");
    const thSel = document.getElementById("stressQuickTestThickness");
    const tempInput = document.getElementById("stressQuickTestTemp");

    const year = ySel ? ySel.value : "";
    const mat = mSel ? mSel.value : "";

    if (gSel) {
      gSel.innerHTML = '<option value="">-- Grade --</option>';
      gSel.disabled = !mat;
    }
    if (thSel) {
      thSel.innerHTML = '<option value="">-- Thickness --</option>';
      thSel.disabled = true;
    }
    if (tempInput) tempInput.disabled = true;

    if (year && mat && typeof window.bkGetGradesForMaterial === "function") {
      const grades = window.bkGetGradesForMaterial(year, mat);
      grades.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        gSel.appendChild(opt);
      });
    }
    evaluateQuickTestQuery();
  }
  window.onQuickTestMaterialChange = onQuickTestMaterialChange;

  function onQuickTestGradeChange() {
    const ySel = document.getElementById("stressQuickTestYear");
    const mSel = document.getElementById("stressQuickTestMaterial");
    const gSel = document.getElementById("stressQuickTestGrade");
    const thSel = document.getElementById("stressQuickTestThickness");
    const tempInput = document.getElementById("stressQuickTestTemp");

    const year = ySel ? ySel.value : "";
    const mat = mSel ? mSel.value : "";
    const grade = gSel ? gSel.value : "";

    if (!year || !mat || !grade) return;

    const thInfo = typeof window.bkGetThicknessForGrade === "function"
      ? window.bkGetThicknessForGrade(year, mat, grade)
      : { hasThickness: false, thicknessList: [] };

    if (thSel) {
      if (thInfo.hasThickness) {
        thSel.innerHTML = '<option value="">-- Thickness --</option>';
        thInfo.thicknessList.forEach(t => {
          const opt = document.createElement("option");
          opt.value = t;
          opt.textContent = t;
          thSel.appendChild(opt);
        });
        thSel.disabled = false;
        if (tempInput) tempInput.disabled = true;
      } else {
        thSel.innerHTML = '<option value="__NOT_REQUIRED__">All Thicknesses</option>';
        thSel.disabled = true;
        if (tempInput) tempInput.disabled = false;
      }
    }
    evaluateQuickTestQuery();
  }
  window.onQuickTestGradeChange = onQuickTestGradeChange;

  function onQuickTestThicknessChange() {
    const thSel = document.getElementById("stressQuickTestThickness");
    const tempInput = document.getElementById("stressQuickTestTemp");
    if (tempInput && thSel) {
      tempInput.disabled = !thSel.value;
    }
    evaluateQuickTestQuery();
  }
  window.onQuickTestThicknessChange = onQuickTestThicknessChange;

  function evaluateQuickTestQuery() {
    const year = document.getElementById("stressQuickTestYear")?.value;
    const material = document.getElementById("stressQuickTestMaterial")?.value;
    const grade = document.getElementById("stressQuickTestGrade")?.value;
    const thSel = document.getElementById("stressQuickTestThickness");
    const thickness = thSel ? thSel.value : null;
    const tempVal = document.getElementById("stressQuickTestTemp")?.value;
    const resultBox = document.getElementById("stressQuickTestResult");

    if (!resultBox) return;

    if (!year || !material || !grade || !tempVal) {
      resultBox.innerHTML = `<span style="color: #64748b; font-size: 13px;">Select Material, Grade and Temperature to test query.</span>`;
      return;
    }

    const temp = parseFloat(tempVal);
    if (isNaN(temp)) return;

    const res = window.bkLookupAllowableStress
      ? window.bkLookupAllowableStress(year, material, grade, temp, thickness)
      : null;

    if (!res || !res.success) {
      resultBox.innerHTML = `<span style="color: #dc2626; font-size: 13px; font-weight: 600;">⚠️ ${res ? res.message : "Lookup failed"}</span>`;
    } else {
      resultBox.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; font-size: 13.5px;">
          <span>Allowable Stress <strong>S:</strong> <strong style="color: #059669; font-size: 15px;">${res.stress} MPa</strong></span>
          <span>Yield <strong>Sy:</strong> ${res.yield ? `<strong>${res.yield} MPa</strong>` : "--"}</span>
          <span>Tensile <strong>Su:</strong> ${res.tensile ? `<strong>${res.tensile} MPa</strong>` : "--"}</span>
        </div>
      `;
    }
  }
  window.evaluateQuickTestQuery = evaluateQuickTestQuery;

  // =========================================================================
  // USER ROLE & ADMIN VERIFICATION
  // =========================================================================

  function getCallerEmail() {
    const stored = ((window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "").toLowerCase().trim();
    if (stored && stored !== "null" && stored !== "undefined" && stored !== "[object object]") return stored;
    if (window.RBAC && window.RBAC.userEmail) {
      const rEmail = String(window.RBAC.userEmail).toLowerCase().trim();
      if (rEmail && rEmail !== "null" && rEmail !== "undefined") return rEmail;
    }
    if (window.adminPanel && typeof window.adminPanel.getCallerEmail === "function") {
      const apEmail = window.adminPanel.getCallerEmail();
      if (apEmail) return apEmail;
    }
    return "";
  }

  function isUserAdmin() {
    if (window.RBAC) {
      if (window.RBAC.isSuperAdmin || window.RBAC.role === "admin") return true;
    }
    try {
      const cached = window.RBAC || (typeof sessionStorage !== "undefined" ? JSON.parse(sessionStorage.getItem("cached_rbac_permissions") || "{}") : {});
      if (cached && (cached.isSuperAdmin || cached.role === "admin")) return true;
    } catch (e) {}
    return false;
  }
  window.isUserAdmin = isUserAdmin;

  function canUserExportStress() {
    if (window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin")) return true;
    if (window.RBAC && typeof window.RBAC.hasSectionAccess === "function") {
      const res = window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_export");
      if (typeof res === "boolean") return res;
    }
    try {
      const cached = window.RBAC || (typeof sessionStorage !== "undefined" ? JSON.parse(sessionStorage.getItem("cached_rbac_permissions") || "{}") : {});
      if (cached && (cached.isSuperAdmin || cached.role === "admin")) return true;
      if (cached && cached.subsections && cached.subsections.adminControlCenter) {
        if (typeof cached.subsections.adminControlCenter.stress_action_export === "boolean") {
          return cached.subsections.adminControlCenter.stress_action_export;
        }
      }
    } catch (e) {}
    return false;
  }
  window.canUserExportStress = canUserExportStress;

  function canUserDeleteStress() {
    if (window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin")) return true;
    if (window.RBAC && typeof window.RBAC.canDelete === "function" && !window.RBAC.canDelete()) {
      return false;
    }
    if (window.RBAC && typeof window.RBAC.hasSectionAccess === "function") {
      const res = window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_delete");
      if (typeof res === "boolean") return res;
    }
    try {
      const cached = window.RBAC || (typeof sessionStorage !== "undefined" ? JSON.parse(sessionStorage.getItem("cached_rbac_permissions") || "{}") : {});
      if (cached && (cached.isSuperAdmin || cached.role === "admin")) return true;
      if (cached && cached.permissions && cached.permissions.delete === false) return false;
      if (cached && cached.subsections && cached.subsections.adminControlCenter) {
        if (typeof cached.subsections.adminControlCenter.stress_action_delete === "boolean") {
          return cached.subsections.adminControlCenter.stress_action_delete;
        }
      }
    } catch (e) {}
    return false;
  }
  window.canUserDeleteStress = canUserDeleteStress;

  function canUserAddStress() {
    if (window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin")) return true;
    if (window.RBAC && typeof window.RBAC.canEdit === "function" && !window.RBAC.canEdit()) {
      return false;
    }
    if (window.RBAC && typeof window.RBAC.hasSectionAccess === "function") {
      const res = window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_add");
      if (typeof res === "boolean") return res;
    }
    if (window.RBAC && typeof window.RBAC.canEdit === "function" && window.RBAC.canEdit()) {
      return true;
    }
    try {
      const cached = window.RBAC || (typeof sessionStorage !== "undefined" ? JSON.parse(sessionStorage.getItem("cached_rbac_permissions") || "{}") : {});
      if (cached && (cached.isSuperAdmin || cached.role === "admin")) return true;
      if (cached && cached.permissions && cached.permissions.edit === true) return true;
      if (cached && cached.subsections && cached.subsections.adminControlCenter) {
        if (typeof cached.subsections.adminControlCenter.stress_action_add === "boolean") {
          return cached.subsections.adminControlCenter.stress_action_add;
        }
      }
    } catch (e) {}
    return false;
  }
  window.canUserAddStress = canUserAddStress;

  function updateAdminRoleIndicator() {
    const el = document.getElementById("stressAdminRoleIndicator");
    if (!el) return;
    const admin = isUserAdmin();
    const canDel = canUserDeleteStress();
    const canEdit = canUserAddStress();
    const email = getCallerEmail();
    if (admin) {
      el.style.background = "#dcfce7";
      el.style.color = "#15803d";
      el.style.borderColor = "#86efac";
      el.innerHTML = `🛡️ Manager / Admin Access: <strong>${email}</strong> (Full Delete & Edit Permissions)`;
    } else if (canDel || canEdit) {
      el.style.background = "#eff6ff";
      el.style.color = "#1d4ed8";
      el.style.borderColor = "#93c5fd";
      el.innerHTML = `⚙️ Active User: <strong>${email}</strong> (${canDel ? "Delete & Edit" : "Edit Only"} Permissions Active)`;
    } else {
      el.style.background = "#f1f5f9";
      el.style.color = "#475569";
      el.style.borderColor = "#cbd5e1";
      el.innerHTML = `🔒 Restricted User View (Edit & Delete restricted by Role Permissions)`;
    }
  }

  // =========================================================================
  // YEAR MANAGER & ADMIN YEAR DELETION
  // =========================================================================

  function renderYearManagerList() {
    const container = document.getElementById("stressYearCardsList");
    if (!container) return;

    const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
    if (!db || Object.keys(db).length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #64748b; font-size: 13.5px;">
          No code editions or years found in database. Use Bulk DataLoader to import stress datasets.
        </div>
      `;
      return;
    }

    const years = Object.keys(db).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    const canExport = canUserExportStress();
    const canDelete = canUserDeleteStress();

    let html = "";
    years.forEach(year => {
      const materials = Object.keys(db[year] || {});
      let pointCount = 0;

      materials.forEach(mat => {
        const grades = Object.keys(db[year][mat] || {});
        grades.forEach(gr => {
          const grObj = db[year][mat][gr] || {};
          Object.keys(grObj).forEach(k => {
            if (typeof grObj[k] === "object" && grObj[k] !== null) {
              if ("Allowable Stress" in grObj[k]) {
                pointCount++;
              } else {
                pointCount += Object.keys(grObj[k]).length;
              }
            }
          });
        });
      });

      html += `
        <div class="stress-year-card">
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="width: 44px; height: 44px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px;">
              ${year}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 15px; color: #0f172a;">
                ASME B31.3 / API Code Edition ${year}
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 3px; display: flex; gap: 12px;">
                <span>📦 <strong>${materials.length}</strong> Materials</span>
                <span>📈 <strong>${pointCount}</strong> Stress Data Points</span>
                <span style="color: #059669;">☁️ Firebase Firestore Synced</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            ${
              canExport
                ? `<button type="button" class="stress-btn-secondary" onclick="exportYearToExcel('${year}')" title="Export ${year} dataset to Excel">
                     📊 Export Year (.xlsx)
                   </button>`
                : `<button type="button" class="stress-btn-secondary" disabled style="opacity: 0.45; cursor: not-allowed; filter: grayscale(1); pointer-events: none;" title="Export permission restricted by Admin">
                     📊 Export Year (.xlsx)
                   </button>`
            }
            ${
              canDelete
                ? `<button type="button" class="stress-btn-danger" onclick="promptDeleteYear('${year}')" title="Permanently delete entire ${year} dataset">
                     🗑️ Delete Year ${year}
                   </button>`
                : `<button type="button" class="stress-btn-danger" disabled style="opacity: 0.45; cursor: not-allowed; filter: grayscale(1); pointer-events: none;" title="Delete permission restricted by Admin">
                     🗑️ Delete Year ${year}
                   </button>`
            }
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    if (typeof window.enforceAllowableStressPermissions === "function") {
      window.enforceAllowableStressPermissions();
    }
  }
  window.renderYearManagerList = renderYearManagerList;

  function updateQuickYearDeleteButton() {
    const btn = document.getElementById("btnDeleteSelectedYearQuick");
    const yearSel = document.getElementById("bkYearSelect");
    if (!btn || !yearSel) return;

    const selectedYear = yearSel.value;
    const canDelete = canUserDeleteStress();

    if (selectedYear && canDelete) {
      btn.style.display = "inline-flex";
      btn.textContent = `🗑️ Delete Year ${selectedYear}`;
    } else {
      btn.style.display = "none";
    }
  }
  window.updateQuickYearDeleteButton = updateQuickYearDeleteButton;

  function promptDeleteCurrentYear() {
    const yearSel = document.getElementById("bkYearSelect");
    if (!yearSel || !yearSel.value) return;
    promptDeleteYear(yearSel.value);
  }
  window.promptDeleteCurrentYear = promptDeleteCurrentYear;

  let activeYearPendingDelete = null;

  function promptDeleteYear(year) {
    if (!canUserDeleteStress()) {
      alert("⚠️ Permission Denied: You do not have permission to delete code edition years.");
      return;
    }

    activeYearPendingDelete = String(year).trim();
    const modal = document.getElementById("stressYearDeleteModal");
    const targetSpan = document.getElementById("modalDeleteYearTarget");
    const expectedCode = document.getElementById("modalConfirmYearExpected");
    const input = document.getElementById("modalConfirmYearInput");
    const btnExecute = document.getElementById("btnExecuteDeleteYear");
    const msg = document.getElementById("stressYearDeleteModalMsg");

    if (targetSpan) targetSpan.textContent = activeYearPendingDelete;
    if (expectedCode) expectedCode.textContent = activeYearPendingDelete;
    document.querySelectorAll(".modalYearSpan").forEach(el => el.textContent = activeYearPendingDelete);

    if (input) {
      input.value = "";
      input.style.borderColor = "#cbd5e1";
    }
    if (btnExecute) {
      btnExecute.disabled = true;
      btnExecute.innerHTML = `🗑️ Permanently Delete Year`;
    }
    if (msg) {
      msg.style.display = "none";
      msg.textContent = "";
    }

    if (modal) modal.style.display = "flex";
  }
  window.promptDeleteYear = promptDeleteYear;

  function closeYearDeleteModal() {
    const modal = document.getElementById("stressYearDeleteModal");
    if (modal) modal.style.display = "none";
    activeYearPendingDelete = null;
  }
  window.closeYearDeleteModal = closeYearDeleteModal;

  function onConfirmYearInputChange() {
    const input = document.getElementById("modalConfirmYearInput");
    const btnExecute = document.getElementById("btnExecuteDeleteYear");
    if (!input || !btnExecute || !activeYearPendingDelete) return;

    const val = input.value.trim();
    if (val === activeYearPendingDelete) {
      btnExecute.disabled = false;
      input.style.borderColor = "#dc2626";
    } else {
      btnExecute.disabled = true;
      input.style.borderColor = "#cbd5e1";
    }
  }
  window.onConfirmYearInputChange = onConfirmYearInputChange;

  async function submitDeleteYear() {
    if (!activeYearPendingDelete) return;
    if (!canUserDeleteStress()) {
      alert("⚠️ Permission Denied: You do not have permission to delete code edition years.");
      closeYearDeleteModal();
      return;
    }

    const btnExecute = document.getElementById("btnExecuteDeleteYear");
    const msg = document.getElementById("stressYearDeleteModalMsg");

    if (btnExecute) {
      btnExecute.disabled = true;
      btnExecute.innerHTML = `<span class="stress-spinner-small"></span> Deleting from Firebase...`;
    }

    if (msg) {
      msg.style.display = "block";
      msg.style.background = "#eff6ff";
      msg.style.color = "#1d4ed8";
      msg.style.border = "1px solid #bfdbfe";
      msg.innerHTML = `Connecting to Firebase Firestore to delete year <strong>${activeYearPendingDelete}</strong>...`;
    }

    try {
      const response = await fetch("/api/stress-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-year",
          year: activeYearPendingDelete,
          callerEmail: getCallerEmail()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to delete year.");
      }

      // 1. Remove from client in-memory database
      const deletedYear = activeYearPendingDelete;
      if (window.bkStressData && window.bkStressData[deletedYear]) {
        delete window.bkStressData[deletedYear];
      }
      if (typeof bkStressData !== "undefined" && bkStressData && bkStressData[deletedYear]) {
        delete bkStressData[deletedYear];
      }
      try {
        /* in-memory cache: window.bkStressData */
      } catch (e) {}

      if (msg) {
        msg.style.background = "#ecfdf5";
        msg.style.color = "#065f46";
        msg.style.border = "1px solid #a7f3d0";
        msg.innerHTML = `✅ Successfully deleted Code Edition Year <strong>${deletedYear}</strong> from Firebase Firestore and local database!`;
      }

      // 2. Re-populate UI dropdowns across all app calculators
      if (typeof window.bkPopulateYears === "function") {
        window.bkPopulateYears();
      } else {
        const yearSel = document.getElementById("bkYearSelect");
        if (yearSel) {
          const availYears = window.bkGetAvailableYears ? window.bkGetAvailableYears() : Object.keys(window.bkStressData || {});
          yearSel.innerHTML = '<option value="">-- Select Year --</option>';
          availYears.forEach(y => {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            yearSel.appendChild(opt);
          });
        }
      }

      if (typeof window.initB313AutoStressFields === "function") {
        window.initB313AutoStressFields(true);
      }
      if (typeof window.initSimpleAutoStressFields === "function") {
        window.initSimpleAutoStressFields(true);
      }

      populateQuickTestYearSelect();
      updateActiveDatabaseSummaryBadge();

      // Reset single calculator if deleted year was active
      const curYear = document.getElementById("bkYearSelect")?.value;
      if (curYear === deletedYear || !curYear) {
        const matSel = document.getElementById("bkMaterialSelect");
        const grSel = document.getElementById("bkGradeSelect");
        const thSel = document.getElementById("bkThicknessSelect");
        const tempInp = document.getElementById("bkTemperatureInput");
        const outDiv = document.getElementById("bkOutputDiv");
        if (matSel) { matSel.innerHTML = '<option value="">-- Select Material --</option>'; matSel.disabled = true; }
        if (grSel) { grSel.innerHTML = '<option value="">-- Select Grade --</option>'; grSel.disabled = true; }
        if (thSel) { thSel.innerHTML = '<option value="">-- Select Thickness --</option>'; thSel.disabled = true; }
        if (tempInp) { tempInp.value = ""; tempInp.disabled = true; }
        if (outDiv) outDiv.style.display = "none";
        renderTemperaturePointsTable();
      }

      renderYearManagerList();
      updateQuickYearDeleteButton();

      setTimeout(() => {
        closeYearDeleteModal();
      }, 1500);

    } catch (err) {
      console.error("Year deletion error:", err);
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#fef2f2";
        msg.style.color = "#991b1b";
        msg.style.border = "1px solid #fecaca";
        msg.textContent = `❌ ${err.message}`;
      }
      if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.innerHTML = `🗑️ Permanently Delete Year`;
      }
    }
  }
  window.submitDeleteYear = submitDeleteYear;

  // Export specific Year dataset to Excel
  function exportYearToExcel(year) {
    if (!canUserExportStress()) {
      alert("⚠️ Permission Denied: You do not have permission to export stress datasets.");
      return;
    }
    if (typeof XLSX === "undefined") {
      alert("Excel export library is loading, please try again in a moment.");
      return;
    }

    const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
    if (!db || !db[year]) {
      alert(`Year ${year} has no data to export.`);
      return;
    }

    const rows = [];
    const materials = Object.keys(db[year]);
    materials.forEach(mat => {
      const grades = Object.keys(db[year][mat] || {});
      grades.forEach(gr => {
        const grObj = db[year][mat][gr] || {};
        Object.keys(grObj).forEach(k => {
          if (typeof grObj[k] === "object" && grObj[k] !== null) {
            if ("Allowable Stress" in grObj[k]) {
              rows.push({
                "Year": year,
                "Material": mat,
                "Grade": gr,
                "Thickness": "",
                "Temperature (°C)": parseFloat(k),
                "Allowable Stress (MPa)": grObj[k]["Allowable Stress"],
                "Yield Strength (MPa)": grObj[k].yield ?? "",
                "Tensile Strength (MPa)": grObj[k].tensile ?? ""
              });
            } else {
              const th = k;
              Object.keys(grObj[th]).forEach(tk => {
                const subEntry = grObj[th][tk];
                rows.push({
                  "Year": year,
                  "Material": mat,
                  "Grade": gr,
                  "Thickness": th,
                  "Temperature (°C)": parseFloat(tk),
                  "Allowable Stress (MPa)": subEntry["Allowable Stress"],
                  "Yield Strength (MPa)": subEntry.yield ?? "",
                  "Tensile Strength (MPa)": subEntry.tensile ?? ""
                });
              });
            }
          }
        });
      });
    });

    rows.sort((a, b) => a.Material.localeCompare(b.Material) || a.Grade.localeCompare(b.Grade) || (a["Temperature (°C)"] - b["Temperature (°C)"]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `ASME_${year}_Stress`);
    XLSX.writeFile(wb, `ASME_Stress_Data_Year_${year}.xlsx`);
  }
  window.exportYearToExcel = exportYearToExcel;

  // =========================================================================
  // TEMPERATURE POINTS MANAGEMENT & EDITING (SINGLE LOOKUP TAB)
  // =========================================================================

  function renderTemperaturePointsTable() {
    const card = document.getElementById("stressPointsManagerCard");
    const tbody = document.getElementById("stressPointsTableBody");
    const title = document.getElementById("stressPointsTitle");
    if (!card || !tbody) return;

    const yearSel = document.getElementById("bkYearSelect");
    const matSel = document.getElementById("bkMaterialSelect");
    const grSel = document.getElementById("bkGradeSelect");
    const thSel = document.getElementById("bkThicknessSelect");

    const year = yearSel ? yearSel.value : "";
    const material = matSel ? matSel.value : "";
    const grade = grSel ? grSel.value : "";
    const thickness = (thSel && !thSel.disabled && thSel.value) ? thSel.value : "";

    if (!year || !material || !grade) {
      card.style.display = "none";
      return;
    }

    const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
    if (!db || !db[year]?.[material]?.[grade]) {
      card.style.display = "none";
      return;
    }

    let gradeObj = db[year][material][grade];
    if (thickness && gradeObj[thickness]) {
      gradeObj = gradeObj[thickness];
    } else {
      const thKeys = Object.keys(gradeObj).filter(k => k.includes("mm"));
      if (thKeys.length > 0) {
        gradeObj = gradeObj[thKeys[0]];
      }
    }

    if (!gradeObj) {
      card.style.display = "none";
      return;
    }

    const tempKeys = Object.keys(gradeObj)
      .map(t => parseFloat(t))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    if (tempKeys.length === 0) {
      card.style.display = "none";
      return;
    }

    if (title) {
      title.innerHTML = `📊 Configured Temperature Points: <strong>${material} ${grade}</strong> (${year}${thickness ? ` • ${thickness}` : ""})`;
    }

    const canEdit = canUserAddStress();
    const canDel = canUserDeleteStress();
    let rowsHtml = "";

    tempKeys.forEach(t => {
      const entry = gradeObj[t] || gradeObj[String(t)] || {};
      const stress = entry["Allowable Stress"];
      const yld = entry.yield !== undefined ? entry.yield : "--";
      const tens = entry.tensile !== undefined ? entry.tensile : "--";

      const escYear = String(year);
      const escMat = String(material);
      const escGrade = String(grade);
      const escTh = String(thickness);
      const escTemp = String(t);
      const escStress = String(stress);
      const escYield = entry.yield !== undefined ? String(entry.yield) : "";
      const escTensile = entry.tensile !== undefined ? String(entry.tensile) : "";

      rowsHtml += `
        <tr>
          <td style="font-weight: 700; color: #0284c7;">${t} °C</td>
          <td style="font-weight: 700; color: #059669; font-size: 13.5px;">${stress} MPa</td>
          <td>${yld !== "--" ? `${yld} MPa` : "--"}</td>
          <td>${tens !== "--" ? `${tens} MPa` : "--"}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
              ${
                canEdit
                  ? `<button type="button" class="stress-btn-edit" onclick="openEditTemperaturePointModal('${escYear}', '${escMat}', '${escGrade}', '${escTh}', '${escTemp}', '${escStress}', '${escYield}', '${escTensile}')" title="Update Allowable Stress or Strength values">
                       ✏️ Edit
                     </button>`
                  : `<button type="button" class="stress-btn-edit" style="opacity: 0.4; cursor: not-allowed;" disabled title="Edit restricted by role permissions">
                       🔒 Edit
                     </button>`
              }
              ${
                canDel
                  ? `<button type="button" class="stress-btn-danger" style="padding: 4px 8px; font-size: 11.5px;" onclick="promptDeleteTemperaturePoint('${escYear}', '${escMat}', '${escGrade}', '${escTh}', '${escTemp}')" title="Delete this temperature point">
                       🗑️
                     </button>`
                  : `<button type="button" class="stress-btn-danger" style="padding: 4px 8px; font-size: 11.5px; opacity: 0.4;" disabled title="Delete restricted by role permissions">
                       🔒
                     </button>`
              }
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;
    card.style.display = "block";
  }
  window.renderTemperaturePointsTable = renderTemperaturePointsTable;

  function openEditTemperaturePointModal(year, mat, grade, thickness, temp, stress, yld, tensile) {
    const modal = document.getElementById("stressTempEditModal");
    const title = document.getElementById("stressTempModalTitle");
    const subtext = document.getElementById("stressTempModalSubtext");
    const msg = document.getElementById("stressTempModalMsg");

    document.getElementById("modalEditYear").value = year;
    document.getElementById("modalEditMaterial").value = mat;
    document.getElementById("modalEditGrade").value = grade;
    document.getElementById("modalEditThickness").value = thickness || "";
    document.getElementById("modalEditOldTemp").value = temp;

    document.getElementById("modalTempInput").value = temp;
    document.getElementById("modalStressInput").value = stress;
    document.getElementById("modalYieldInput").value = yld || "";
    document.getElementById("modalTensileInput").value = tensile || "";

    if (title) title.textContent = `✏️ Edit Temperature Point: ${temp}°C`;
    if (subtext) {
      subtext.innerHTML = `Code Edition: <strong>${year}</strong> • Material: <strong>${mat}</strong> • Grade: <strong>${grade}</strong> ${thickness ? `• Thickness: <strong>${thickness}</strong>` : ""}`;
    }
    if (msg) {
      msg.style.display = "none";
      msg.textContent = "";
    }

    const saveBtn = document.getElementById("btnSaveTempPointToFirebase");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `💾 Save to Firebase Cloud`;
    }

    if (modal) modal.style.display = "flex";
  }
  window.openEditTemperaturePointModal = openEditTemperaturePointModal;

  function openAddTemperaturePointModal() {
    const yearSel = document.getElementById("bkYearSelect");
    const matSel = document.getElementById("bkMaterialSelect");
    const grSel = document.getElementById("bkGradeSelect");
    const thSel = document.getElementById("bkThicknessSelect");

    const year = yearSel ? yearSel.value : "";
    const mat = matSel ? matSel.value : "";
    const grade = grSel ? grSel.value : "";
    const thickness = (thSel && !thSel.disabled && thSel.value) ? thSel.value : "";

    if (!year || !mat || !grade) {
      alert("Please select Year, Material, and Grade first.");
      return;
    }

    const modal = document.getElementById("stressTempEditModal");
    const title = document.getElementById("stressTempModalTitle");
    const subtext = document.getElementById("stressTempModalSubtext");
    const msg = document.getElementById("stressTempModalMsg");

    document.getElementById("modalEditYear").value = year;
    document.getElementById("modalEditMaterial").value = mat;
    document.getElementById("modalEditGrade").value = grade;
    document.getElementById("modalEditThickness").value = thickness;
    document.getElementById("modalEditOldTemp").value = "";

    document.getElementById("modalTempInput").value = "";
    document.getElementById("modalStressInput").value = "";
    document.getElementById("modalYieldInput").value = "";
    document.getElementById("modalTensileInput").value = "";

    if (title) title.textContent = `➕ Add New Temperature Point`;
    if (subtext) {
      subtext.innerHTML = `Code Edition: <strong>${year}</strong> • Material: <strong>${mat}</strong> • Grade: <strong>${grade}</strong> ${thickness ? `• Thickness: <strong>${thickness}</strong>` : ""}`;
    }
    if (msg) {
      msg.style.display = "none";
      msg.textContent = "";
    }

    const saveBtn = document.getElementById("btnSaveTempPointToFirebase");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `💾 Save to Firebase Cloud`;
    }

    if (modal) modal.style.display = "flex";
  }
  window.openAddTemperaturePointModal = openAddTemperaturePointModal;

  function closeTemperaturePointModal() {
    const modal = document.getElementById("stressTempEditModal");
    if (modal) modal.style.display = "none";
  }
  window.closeTemperaturePointModal = closeTemperaturePointModal;

  async function submitTemperaturePointUpdate() {
    const year = document.getElementById("modalEditYear").value;
    const material = document.getElementById("modalEditMaterial").value;
    const grade = document.getElementById("modalEditGrade").value;
    const thickness = document.getElementById("modalEditThickness").value;
    const oldTemp = document.getElementById("modalEditOldTemp").value;

    const tempVal = document.getElementById("modalTempInput").value;
    const stressVal = document.getElementById("modalStressInput").value;
    const yieldVal = document.getElementById("modalYieldInput").value;
    const tensileVal = document.getElementById("modalTensileInput").value;

    const msg = document.getElementById("stressTempModalMsg");
    const saveBtn = document.getElementById("btnSaveTempPointToFirebase");

    const tempNum = parseFloat(tempVal);
    const stressNum = parseFloat(stressVal);

    if (isNaN(tempNum)) {
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#fef2f2";
        msg.style.color = "#991b1b";
        msg.textContent = "Please enter a valid numeric Temperature (°C).";
      }
      return;
    }

    if (isNaN(stressNum) || stressNum <= 0) {
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#fef2f2";
        msg.style.color = "#991b1b";
        msg.textContent = "Please enter a valid positive Allowable Stress (MPa).";
      }
      return;
    }

    const yieldNum = yieldVal !== "" && !isNaN(parseFloat(yieldVal)) ? parseFloat(yieldVal) : undefined;
    const tensileNum = tensileVal !== "" && !isNaN(parseFloat(tensileVal)) ? parseFloat(tensileVal) : undefined;

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span class="stress-spinner-small"></span> Saving to Firebase...`;
    }

    try {
      const response = await fetch("/api/stress-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-temperature-point",
          year,
          material,
          grade,
          thickness,
          temperature: tempNum,
          allowableStress: stressNum,
          yield: yieldNum,
          tensile: tensileNum,
          oldTemperature: oldTemp || undefined,
          userEmail: getCallerEmail()
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.message || "Failed to update temperature point.");
      }

      // Update in-memory db immediately
      const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
      if (db) {
        if (!db[year]) db[year] = {};
        if (!db[year][material]) db[year][material] = {};
        if (!db[year][material][grade]) db[year][material][grade] = {};

        const entry = {
          "Allowable Stress": stressNum,
          ...(yieldNum !== undefined ? { yield: yieldNum } : {}),
          ...(tensileNum !== undefined ? { tensile: tensileNum } : {})
        };

        const targetNode = thickness ? (db[year][material][grade][thickness] = db[year][material][grade][thickness] || {}) : db[year][material][grade];

        if (oldTemp && String(oldTemp) !== String(tempNum)) {
          delete targetNode[String(oldTemp)];
        }
        targetNode[String(tempNum)] = entry;
        try {
          /* in-memory cache: window.bkStressData */
        } catch (e) {}
      }

      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#ecfdf5";
        msg.style.color = "#065f46";
        msg.innerHTML = `✅ Successfully saved to Firebase Cloud Firestore!`;
      }

      // Live reflection across the application (B31.3, Simple Piping, Single Lookup)
      broadcastStressDatabaseUpdate(year, material, grade, tempNum);

      const tempInp = document.getElementById("bkTemperatureInput");
      if (tempInp && tempInp.value) {
        tempInp.dispatchEvent(new Event("input"));
      }

      setTimeout(() => {
        closeTemperaturePointModal();
      }, 1000);

    } catch (err) {
      console.error("Temperature update error:", err);
      if (msg) {
        msg.style.display = "block";
        msg.style.background = "#fef2f2";
        msg.style.color = "#991b1b";
        msg.textContent = `❌ ${err.message}`;
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `💾 Save to Firebase Cloud`;
      }
    }
  }
  window.submitTemperaturePointUpdate = submitTemperaturePointUpdate;

  async function promptDeleteTemperaturePoint(year, material, grade, thickness, temp) {
    if (!canUserDeleteStress()) {
      alert("⚠️ Permission Denied: You do not have permission to delete temperature points.");
      return;
    }

    const conf = confirm(`Are you sure you want to delete temperature point ${temp}°C for ${material} ${grade}? This will permanently remove it from Firebase Firestore.`);
    if (!conf) return;

    try {
      const response = await fetch("/api/stress-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-temperature-point",
          year,
          material,
          grade,
          thickness,
          temperature: temp,
          callerEmail: getCallerEmail()
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.message || "Failed to delete point.");
      }

      // Remove from client in-memory db
      const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
      if (db?.[year]?.[material]?.[grade]) {
        const targetNode = thickness ? db[year][material][grade][thickness] : db[year][material][grade];
        if (targetNode) {
          delete targetNode[String(temp)];
        }
      }
      try {
        /* in-memory cache: window.bkStressData */
      } catch (e) {}

      broadcastStressDatabaseUpdate(year, material, grade);

      const tempInp = document.getElementById("bkTemperatureInput");
      if (tempInp && tempInp.value) {
        tempInp.dispatchEvent(new Event("input"));
      }

    } catch (err) {
      alert(`❌ Error deleting temperature point: ${err.message}`);
    }
  }
  window.promptDeleteTemperaturePoint = promptDeleteTemperaturePoint;

  // Window exports for Dataloader & Excel Upload
  window.initStressDataLoaderEvents = initStressDataLoaderEvents;
  window.handleStressFileSelect = handleStressFileSelect;
  window.processStressFile = processStressFile;
  window.normalizeAndValidateStressData = normalizeAndValidateStressData;

  // Global event delegation for bulk stress file upload & drop zone
  document.addEventListener("change", (e) => {
    if (e.target && e.target.id === "stressBulkFileInput") {
      handleStressFileSelect(e);
    }
  });

  document.addEventListener("dragover", (e) => {
    const dz = e.target && (e.target.id === "stressDropZone" ? e.target : e.target.closest("#stressDropZone"));
    if (dz) {
      e.preventDefault();
      dz.classList.add("dragover");
      dz.style.backgroundColor = "#e0f2fe";
      dz.style.borderColor = "#0284c7";
    }
  });

  document.addEventListener("dragleave", (e) => {
    const dz = e.target && (e.target.id === "stressDropZone" ? e.target : e.target.closest("#stressDropZone"));
    if (dz && (!e.relatedTarget || !dz.contains(e.relatedTarget))) {
      e.preventDefault();
      dz.classList.remove("dragover");
      dz.style.backgroundColor = "#f0f9ff";
      dz.style.borderColor = "#0284c7";
    }
  });

  document.addEventListener("drop", (e) => {
    const dz = e.target && (e.target.id === "stressDropZone" ? e.target : e.target.closest("#stressDropZone"));
    if (dz) {
      e.preventDefault();
      dz.classList.remove("dragover");
      dz.style.backgroundColor = "#f0f9ff";
      dz.style.borderColor = "#0284c7";
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processStressFile(e.dataTransfer.files[0]);
      }
    }
  });

  // Initialization
  function init() {
    initStressDataLoaderEvents();
    updateActiveDatabaseSummaryBadge();
    populateQuickTestYearSelect();
    updateAdminRoleIndicator();
    if (typeof renderYearManagerList === "function") {
      renderYearManagerList();
    }
    // Fetch fresh database from cloud Firestore to sync any new code years or points
    refreshStressDataFromCloud();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
