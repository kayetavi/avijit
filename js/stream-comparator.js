// stream-comparator.js - Process Stream & Material Balance Comparator Engine
// Supports both:
// 1. Chemical Component Composition Sheets (H2, H2S, NH3, Hydrocarbons, etc.)
// 2. Physical & Thermodynamic Properties Sheets (Temperature, Pressure, Density, Viscosity, Enthalpy, etc.)
// 3. Combined / Multi-Modal Documents via Gemini AI or Client-Side SheetJS Excel
(function() {
  "use strict";

  // =========================================================================
  // ☁️ Live Cloud Firestore Stream Dataset Ingestion
  // =========================================================================
  async function loadLiveDatasetFromFirestore(preferredQuery) {
    try {
      showLoadingState(true, "Fetching Live Dataset from Firestore...", "Querying Cloud Firestore collections");
      const res = await fetch("/api/stream-datasets");
      const data = await res.json();
      if (!data.success || !data.datasets || data.datasets.length === 0) {
        showLoadingState(false);
        showNotification("No stream datasets found in Firestore. Please upload a dataset first.", true);
        return;
      }

      let target = data.datasets[0];
      if (preferredQuery) {
        const q = String(preferredQuery).toLowerCase();
        const found = data.datasets.find(d => 
          (d.id && d.id.toLowerCase().includes(q)) || 
          (d.title && d.title.toLowerCase().includes(q))
        );
        if (found) target = found;
      }

      const fullRes = await fetch("/api/stream-datasets?id=" + encodeURIComponent(target.id));
      const fullData = await fullRes.json();
      showLoadingState(false);

      if (fullData.success && fullData.dataset) {
        loadDataset(fullData.dataset);
        showNotification("Loaded live Firestore dataset: " + (fullData.dataset.title || target.title));
      } else {
        showNotification("Failed to load live dataset from Firestore.", true);
      }
    } catch (err) {
      showLoadingState(false);
      showNotification("Error loading live dataset from Firestore: " + err.message, true);
    }
  }

  function loadSampleCombined() {
    loadLiveDatasetFromFirestore("RPTU");
  }

  function loadSampleMultiCase() {
    loadLiveDatasetFromFirestore("NHTU");
  }

  function loadSampleProperties() {
    loadLiveDatasetFromFirestore("WHFU");
  }

  function loadSampleComponents() {
    loadLiveDatasetFromFirestore("PFCC");
  }

  // =========================================================================
  // ⚙️ Operating Case & Run State Management (SOR, EOR, Case 1, 2, 3)
  // =========================================================================
  function detectCaseTag(str) {
    if (!str) return null;
    const s = String(str).trim();
    const lower = s.toLowerCase();
    
    // Test SOR / Start of Run
    if (/\b(sor|start\s*of\s*run)\b/i.test(lower)) return "SOR";
    // Test EOR / End of Run
    if (/\b(eor|end\s*of\s*run)\b/i.test(lower)) return "EOR";
    // Test Case 1, Case 2, Case 3, Case 4, Case 5, Case-1, Case-2, Case A, Case B, etc.
    const caseMatch = lower.match(/\bcase\s*[-_]?\s*(\d+|[a-z])\b/i);
    if (caseMatch) return `Case ${caseMatch[1].toUpperCase()}`;
    // Test C1, C2, C3 suffix/tag
    const cMatch = lower.match(/[\(\[\-_\s]c(\d+)\b/i);
    if (cMatch) return `Case ${cMatch[1]}`;
    // Test Run 1, Run 2
    const runMatch = lower.match(/\brun\s*[-_]?\s*(\d+)\b/i);
    if (runMatch) return `Run ${runMatch[1]}`;
    // Common engineering cases
    if (lower.includes("turndown")) return "Turndown";
    if (lower.includes("design") && !lower.includes("design press") && !lower.includes("design temp")) return "Design";
    if (lower.includes("normal") && !lower.includes("normal boiling")) return "Normal";
    if (lower.includes("guarantee")) return "Guarantee";
    return null;
  }

  function extractCaseValue(val) {
    if (val === null || val === undefined) return "";
    let s = String(val).trim();
    if (!s || s === "-" || s === "N/A" || s === "null" || s === "undefined" || s.toLowerCase() === "total" || s.toLowerCase() === "average") return "";
    s = s.replace(/^[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]$/, '').trim();
    const detected = detectCaseTag(s);
    if (detected) return detected;
    // If it's a number (e.g. 1, 2, 3 under Case column), return "Case 1", "Case 2", "Case 3"
    if (/^\d+$/.test(s)) {
      return `Case ${s}`;
    }
    // If it's a single letter (e.g. A, B, C under Case column), return "Case A", "Case B"
    if (/^[a-zA-Z]$/.test(s)) {
      return `Case ${s.toUpperCase()}`;
    }
    // Allow clean short custom case names (e.g. "Mode A", "High Severity", "Summer")
    if (s.length <= 35 && !/^(true|false|\d+(\.\d+)?)$/i.test(s)) {
      return s.replace(/^case[:\s_-]*/i, "Case ").trim();
    }
    return "";
  }

  function cleanBaseStreamNo(rawVal) {
    if (!rawVal) return "";
    let s = String(rawVal).trim();
    // Strip case suffixes like (SOR), [SOR], - SOR, (EOR), [Case 1], - Case 2, [C1], etc.
    s = s.replace(/\s*[\(\[\-_]?\s*(sor|eor|start\s*of\s*run|end\s*of\s*run|case\s*[-_]?\s*\d+|case\s*[-_]?\s*[a-z]|run\s*[-_]?\s*\d+|c\d+|turndown|design|normal)\s*[\)\]]?/gi, "").trim();
    // Strip leading "Stream " if present
    s = s.replace(/^stream\s*/i, "").trim();
    return s || String(rawVal).trim();
  }

  function enrichDatasetWithCases(dataset) {
    if (!dataset || !dataset.streams || dataset.streams.length === 0) return dataset;

    dataset.streams.forEach(s => {
      if (!s.baseStreamNo) {
        s.baseStreamNo = cleanBaseStreamNo(s.streamNo);
      }
      if (!s.caseName) {
        const tag = detectCaseTag(s.streamNo) || detectCaseTag(s.streamName);
        s.caseName = tag || "";
      }
    });

    const distinctCases = Array.from(new Set(dataset.streams.map(s => s.caseName).filter(Boolean)));
    dataset.availableCases = distinctCases;

    return dataset;
  }

  // State Management
  const state = {
    currentDataset: null,
    streamA: null,
    streamB: null,
    selectedMatrixStreams: [], // Array of stream numbers selected for matrix view
    activeMode: "auto", // "components", "properties", "combined", or "auto"
    activeFilter: "all", // "all", "increased", "decreased", "new", "removed"
    searchQuery: "",
    displayBasis: "mass", // "mass" (kg/hr) or "wtPercent" (%)
    activeView: "pairwise", // "pairwise" or "matrix"
    selectedMatrixCase: "all", // "all", "SOR", "EOR", "Case 1", "Case 2", "Case 3", etc.
    caseFilterA: "all",
    caseFilterB: "all",
    chartComparison: null,
    chartDelta: null,
    isMergeUpload: false
  };

  // Initialize
  function init() {
    clearDataset(true); // Start empty; data loads only when user uploads or selects sample
    setupDropzone();
    fetchSavedDatasetsCount();

    // Modal backdrop click and Escape key listeners for streamIngestModal
    const ingestModal = document.getElementById("streamIngestModal");
    if (ingestModal) {
      ingestModal.addEventListener("click", (e) => {
        if (e.target === ingestModal) closeIngestModal();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeIngestModal();
        closeSavedDatasetsModal();
      }
    });
  }

  // Load Dataset into State & UI
  function loadDataset(dataset) {
    if (!dataset || !dataset.streams || dataset.streams.length === 0) return;
    dataset = enrichDatasetWithCases(dataset);
    state.currentDataset = dataset;

    const distinctCases = Array.from(new Set(dataset.streams.map(s => s.caseName).filter(Boolean)));
    state.selectedMatrixCase = "all";
    state.caseFilterA = "all";
    state.caseFilterB = "all";

    // Matrix Stream Selection: Start unselected so user chooses streams manually
    state.selectedMatrixStreams = [];

    const titleEl = document.getElementById("streamDocTitle");
    if (titleEl) {
      titleEl.textContent = dataset.title || "Process Stream Material Balance";
    }

    const modalTitleEl = document.getElementById("modalStreamDocTitle");
    if (modalTitleEl) {
      modalTitleEl.textContent = dataset.title || "Process Stream Material Balance";
    }

    const badge = document.getElementById("streamSaveBadge");
    if (badge) {
      badge.style.display = dataset.id ? "inline-block" : "none";
    }

    const modalBadge = document.getElementById("modalStreamSaveBadge");
    if (modalBadge) {
      modalBadge.style.display = dataset.id ? "inline-block" : "none";
    }

    const metaBadge = document.getElementById("streamDocMetaBadge");
    if (metaBadge) {
      metaBadge.textContent = `${dataset.streams.length} Streams • ${dataset.sheetCategory || 'Active'}`;
      metaBadge.style.background = "#dcfce7";
      metaBadge.style.color = "#15803d";
      metaBadge.style.borderColor = "#bbf7d0";
    }

    const modalCount = document.getElementById("modalStreamCount");
    if (modalCount) {
      modalCount.textContent = `${dataset.streams.length} Streams`;
    }

    // Determine mode: combined vs properties vs components
    const hasProps = dataset.streams.some(s => s.properties && Object.keys(s.properties).length > 0);
    const hasComps = dataset.streams.some(s => s.components && Object.keys(s.components).length > 0);

    if (hasProps && hasComps) {
      state.activeMode = "combined";
    } else if (hasProps && !hasComps) {
      state.activeMode = "properties";
    } else if (hasComps && !hasProps) {
      state.activeMode = "components";
    } else {
      state.activeMode = dataset.sheetCategory === "PROPERTIES" ? "properties" : (dataset.sheetCategory === "COMBINED" ? "combined" : "components");
    }

    updateModeToggleUI(hasComps, hasProps);
    renderMatrixCasePills();
    populateCaseFilterSelects();
    populateStreamDropdowns();
    populateTieInDropdowns();
    renderMatrixChips();
    updateMatrixButtonsState();

    // Default select first two streams (or matching pairs across cases if multi-case)
    const selA = document.getElementById("streamSelectA");
    const selB = document.getElementById("streamSelectB");
    if (selA && selB && dataset.streams.length >= 2) {
      if (distinctCases.length >= 2) {
        const c1 = distinctCases[0];
        const c2 = distinctCases[1];
        const s1 = dataset.streams.find(s => s.caseName === c1) || dataset.streams[0];
        const matchingS2 = dataset.streams.find(s => s.caseName === c2 && (s.baseStreamNo || s.streamNo) === (s1.baseStreamNo || s1.streamNo));
        const s2 = matchingS2 || dataset.streams.find(s => s.streamNo !== s1.streamNo) || dataset.streams[1];
        selA.value = s1.streamNo;
        selB.value = s2.streamNo;
        state.streamA = s1;
        state.streamB = s2;
      } else {
        const stream1 = dataset.streams[0];
        const stream2 = dataset.streams.find(s => s.streamNo !== stream1.streamNo) || dataset.streams[1];
        selA.value = stream1.streamNo;
        selB.value = stream2.streamNo;
        state.streamA = stream1;
        state.streamB = stream2;
      }
    } else if (dataset.streams.length === 1) {
      state.streamA = dataset.streams[0];
      state.streamB = dataset.streams[0];
    }

    runComparison();
    renderMatrixTable();
    scanPlantTieIns();
  }

  function updateModeToggleUI(hasComps, hasProps) {
    const basisWrap = document.getElementById("displayBasisWrap");
    if (basisWrap) {
      if (state.activeMode === "properties") {
        basisWrap.style.display = "none";
      } else {
        basisWrap.style.display = "block";
      }
    }

    const modeWrap = document.getElementById("streamModeToggleWrap");
    const btnCombined = document.getElementById("modeBtnCombined");
    const btnProps = document.getElementById("modeBtnProps");
    const btnComps = document.getElementById("modeBtnComps");

    if (modeWrap) {
      if (hasProps && hasComps) {
        modeWrap.style.display = "flex";
        if (btnCombined) btnCombined.style.display = "inline-block";
        if (btnProps) btnProps.style.display = "inline-block";
        if (btnComps) btnComps.style.display = "inline-block";
      } else {
        modeWrap.style.display = "flex";
        if (btnCombined) btnCombined.style.display = "none";
        if (btnProps) btnProps.style.display = hasProps ? "inline-block" : "none";
        if (btnComps) btnComps.style.display = hasComps ? "inline-block" : "none";
      }
    }

    if (btnCombined) btnCombined.classList.toggle("active", state.activeMode === "combined");
    if (btnProps) btnProps.classList.toggle("active", state.activeMode === "properties");
    if (btnComps) btnComps.classList.toggle("active", state.activeMode === "components");
  }

  function setMode(mode) {
    state.activeMode = mode;
    const hasProps = state.currentDataset?.streams.some(s => s.properties && Object.keys(s.properties).length > 0);
    const hasComps = state.currentDataset?.streams.some(s => s.components && Object.keys(s.components).length > 0);
    updateModeToggleUI(hasComps, hasProps);
    runComparison();
    renderMatrixTable();
  }

  // Populate Dropdown Menus with Operating Case awareness
  function populateStreamDropdowns() {
    const selA = document.getElementById("streamSelectA");
    const selB = document.getElementById("streamSelectB");
    if (!selA || !selB || !state.currentDataset || !state.currentDataset.streams) return;

    const allStreams = state.currentDataset.streams;
    const filterA = state.caseFilterA || "all";
    const filterB = state.caseFilterB || "all";

    const streamsA = (filterA !== "all" && filterA !== "")
      ? allStreams.filter(s => String(s.caseName || "").toUpperCase() === filterA.toUpperCase())
      : allStreams;

    const streamsB = (filterB !== "all" && filterB !== "")
      ? allStreams.filter(s => String(s.caseName || "").toUpperCase() === filterB.toUpperCase())
      : allStreams;

    const formatOpt = (s) => {
      const desc = s.content || s.streamName || `Stream ${s.streamNo}`;
      const tempVal = s.tempC ?? s.properties?.["Temperature (°C)"] ?? s.properties?.["Temperature"] ?? null;
      const tempStr = (tempVal !== null && tempVal !== undefined && tempVal !== "") ? ` | 🌡️ ${tempVal} °C` : "";
      const caseBadge = s.caseName ? `[${s.caseName}] ` : "";
      return `<option value="${escapeHtml(s.streamNo)}">${escapeHtml(caseBadge)}Stream ${escapeHtml(s.baseStreamNo || s.streamNo)}: ${escapeHtml(desc)} [${formatNum(s.massFlow)} kg/hr${tempStr}]</option>`;
    };

    const currentValA = selA.value;
    const currentValB = selB.value;

    selA.innerHTML = streamsA.map(formatOpt).join("");
    selB.innerHTML = streamsB.map(formatOpt).join("");

    if (currentValA && streamsA.some(s => s.streamNo === currentValA)) {
      selA.value = currentValA;
    } else if (streamsA.length > 0) {
      selA.value = streamsA[0].streamNo;
      state.streamA = streamsA[0];
    }

    if (currentValB && streamsB.some(s => s.streamNo === currentValB)) {
      selB.value = currentValB;
    } else if (streamsB.length > 1) {
      selB.value = streamsB[1].streamNo;
      state.streamB = streamsB[1];
    } else if (streamsB.length > 0) {
      selB.value = streamsB[0].streamNo;
      state.streamB = streamsB[0];
    }
  }

  function populateTieInDropdowns() {
    const selA = document.getElementById("tieInSelectA");
    const selB = document.getElementById("tieInSelectB");
    if (!selA || !selB || !state.currentDataset || !state.currentDataset.streams) return;

    const currentValA = selA.value;
    const currentValB = selB.value;
    const streams = state.currentDataset.streams;

    const optionsHtml = streams.map(s => {
      const desc = s.content || s.streamName || `Stream ${s.streamNo}`;
      const tempVal = s.tempC ?? s.properties?.["Temperature (°C)"] ?? s.properties?.["Temperature"] ?? null;
      const tempStr = (tempVal !== null && tempVal !== undefined && tempVal !== "") ? ` | 🌡️ ${tempVal} °C` : "";
      return `<option value="${escapeHtml(s.streamNo)}">Stream ${escapeHtml(s.streamNo)}: ${escapeHtml(desc)} [${formatNum(s.massFlow)} kg/hr${tempStr}]</option>`;
    }).join("");

    selA.innerHTML = optionsHtml;
    selB.innerHTML = optionsHtml;

    const has172A = streams.some(s => s.streamNo === "172A");
    const has173 = streams.some(s => s.streamNo === "173");

    if (currentValA && streams.some(s => s.streamNo === currentValA)) {
      selA.value = currentValA;
    } else if (has172A) {
      selA.value = "172A";
    } else if (state.streamA) {
      selA.value = state.streamA.streamNo;
    } else if (streams.length > 0) {
      selA.value = streams[0].streamNo;
    }

    if (currentValB && streams.some(s => s.streamNo === currentValB)) {
      selB.value = currentValB;
    } else if (has173) {
      selB.value = "173";
    } else if (state.streamB) {
      selB.value = state.streamB.streamNo;
    } else if (streams.length > 1) {
      selB.value = streams[1].streamNo;
    } else if (streams.length > 0) {
      selB.value = streams[0].streamNo;
    }
  }

  // On Stream Selection Change
  function onStreamChange() {
    const selA = document.getElementById("streamSelectA");
    const selB = document.getElementById("streamSelectB");
    if (!selA || !selB || !state.currentDataset) return;

    state.streamA = state.currentDataset.streams.find(s => s.streamNo === selA.value);
    state.streamB = state.currentDataset.streams.find(s => s.streamNo === selB.value);

    runComparison();
  }

  // Main Comparison Calculation
  function runComparison() {
    const sA = state.streamA;
    const sB = state.streamB;
    if (!sA || !sB) return;

    if (state.activeMode === "combined") {
      runCombinedComparison(sA, sB);
    } else if (state.activeMode === "properties") {
      runPropertiesComparison(sA, sB);
    } else {
      runComponentsComparison(sA, sB);
    }

    try { window.NaceClassifier && window.NaceClassifier.render(sA, sB); } catch (e) { console.warn('[NACE]', e); }
  }

  // =========================================================================
  // 1. PHYSICAL & THERMODYNAMIC PROPERTIES COMPARISON (VR Feed / Clarified Oil)
  // =========================================================================
  function runPropertiesComparison(sA, sB) {
    const propsA = sA.properties || {};
    const propsB = sB.properties || {};

    const allPropKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);
    const propRows = [];

    let countIncreased = 0;
    let countDecreased = 0;
    let countEqual = 0;

    allPropKeys.forEach(prop => {
      const rawA = propsA[prop];
      const rawB = propsB[prop];

      const numA = typeof rawA === "number" ? rawA : parseFloat(String(rawA || "").replace(/,/g, ""));
      const numB = typeof rawB === "number" ? rawB : parseFloat(String(rawB || "").replace(/,/g, ""));

      const isNumeric = !isNaN(numA) && !isNaN(numB);

      let delta = 0;
      let pctChange = 0;
      let status = "EQUAL";

      if (isNumeric) {
        delta = numB - numA;
        if (numA !== 0) {
          pctChange = (delta / Math.abs(numA)) * 100;
        } else if (numB > 0) {
          pctChange = 100;
        }

        if (delta > 0.0001) {
          status = "INCREASED";
          countIncreased++;
        } else if (delta < -0.0001) {
          status = "DECREASED";
          countDecreased++;
        } else {
          status = "EQUAL";
          countEqual++;
        }
      } else {
        if (String(rawA).trim() !== String(rawB).trim()) {
          status = "DIFFERENT";
        }
      }

      propRows.push({
        prop,
        rawA: rawA !== undefined ? rawA : "-",
        rawB: rawB !== undefined ? rawB : "-",
        numA: isNumeric ? numA : null,
        numB: isNumeric ? numB : null,
        delta: isNumeric ? delta : null,
        pctChange: isNumeric ? pctChange : null,
        isNumeric,
        status,
        category: categorizeProperty(prop)
      });
    });

    renderPropertiesKPIs(sA, sB, propsA, propsB);
    renderPropertiesEngineeringInsights(sA, sB, propRows);
    renderPropertiesTable(propRows);
    renderPropertiesCharts(sA, sB, propRows);
  }

  function categorizeProperty(name) {
    const n = name.toLowerCase();
    if (n.includes("flow") || n.includes("rate")) return "Hydraulic / Flow";
    if (n.includes("temp") || n.includes("heat") || n.includes("enthalpy") || n.includes("vaporized")) return "Thermal & Phase";
    if (n.includes("press")) return "Pressure / Operating";
    if (n.includes("viscosity") || n.includes("density") || n.includes("gravity") || n.includes("crit")) return "Physical & Transport";
    return "Stream Specification";
  }

  function renderPropertiesKPIs(sA, sB, pA, pB) {
    const grid = document.getElementById("streamKpiGrid");
    if (!grid) return;

    // Mass flow
    const massA = Number(sA.massFlow) || 0;
    const massB = Number(sB.massFlow) || 0;
    const deltaMass = massB - massA;
    const pctMass = massA > 0 ? (deltaMass / massA) * 100 : 0;

    // Temperature
    const tempA = pA["Temperature (°C)"] || sA.tempC || 0;
    const tempB = pB["Temperature (°C)"] || sB.tempC || 0;
    const deltaTemp = Number(tempB) - Number(tempA);

    // Pressure
    const pressA = pA["Pressure (kg/cm2 (g))"] || sA.pressKgCm2 || 0;
    const pressB = pB["Pressure (kg/cm2 (g))"] || sB.pressKgCm2 || 0;
    const deltaPress = Number(pressB) - Number(pressA);

    // Viscosity
    const viscA = pA["Liquid Viscosity (cP)"] || 0;
    const viscB = pB["Liquid Viscosity (cP)"] || 0;
    const deltaVisc = Number(viscB) - Number(viscA);
    const pctVisc = viscA > 0 ? (deltaVisc / viscA) * 100 : 0;

    // Density
    const densA = pA["Liquid Density (kg/m3)"] || 0;
    const densB = pB["Liquid Density (kg/m3)"] || 0;
    const deltaDens = Number(densB) - Number(densA);

    grid.innerHTML = `
      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Mass Flow Rate (kg/hr)</div>
        <div class="stream-kpi-val">${formatNum(massB)}</div>
        <div class="stream-kpi-sub ${deltaMass > 0 ? 'diff-positive' : deltaMass < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaMass >= 0 ? '▲ +' : '▼ '}${formatNum(deltaMass)} kg/hr (${pctMass >= 0 ? '+' : ''}${pctMass.toFixed(1)}%) vs Stream ${sA.streamNo}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Operating Temperature (°C)</div>
        <div class="stream-kpi-val">${tempB}°C</div>
        <div class="stream-kpi-sub ${deltaTemp > 0 ? 'diff-positive' : deltaTemp < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaTemp >= 0 ? '▲ +' : '▼ '}${deltaTemp.toFixed(1)}°C (Stream ${sA.streamNo}: ${tempA}°C)
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Operating Pressure (kg/cm² g)</div>
        <div class="stream-kpi-val">${pressB} kg/cm²</div>
        <div class="stream-kpi-sub ${deltaPress > 0 ? 'diff-positive' : deltaPress < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaPress >= 0 ? '▲ +' : '▼ '}${deltaPress.toFixed(2)} kg/cm² (Stream ${sA.streamNo}: ${pressA} kg/cm²)
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Liquid Viscosity (cP)</div>
        <div class="stream-kpi-val" style="color: ${deltaVisc < 0 ? '#16a34a' : '#d97706'}; font-size: 20px;">
          ${Number(viscB).toFixed(2)} cP
        </div>
        <div class="stream-kpi-sub ${deltaVisc < 0 ? 'diff-positive' : 'diff-negative'}">
          ${deltaVisc >= 0 ? '▲ +' : '▼ '}${deltaVisc.toFixed(2)} cP (${pctVisc.toFixed(1)}%) vs ${Number(viscA).toFixed(2)} cP
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Liquid Density (kg/m³)</div>
        <div class="stream-kpi-val" style="font-size: 19px;">
          ${Number(densB).toFixed(1)} kg/m³
        </div>
        <div class="stream-kpi-sub diff-neutral">
          ${deltaDens >= 0 ? '▲ +' : '▼ '}${deltaDens.toFixed(1)} kg/m³ (SG: ${pB["Specific Gravity"] || '-'})
        </div>
      </div>
    `;
  }

  function renderPropertiesEngineeringInsights(sA, sB, rows) {
    const box = document.getElementById("streamInsightBox");
    if (!box) return;

    const insights = [];

    // Stream content comparison
    const contentA = sA.content || sA.properties?.["Content / Phase"] || "Stream A";
    const contentB = sB.content || sB.properties?.["Content / Phase"] || "Stream B";

    if (contentA.toUpperCase().includes("CLARIFIED") || contentB.toUpperCase().includes("CLARIFIED")) {
      insights.push(`<strong>Clarified Oil (Aromatic Slurry) vs Vacuum Residue (VR Feed):</strong> Stream 100A represents Clarified Oil with drastically lower viscosity (<strong>3.544 cP</strong>) compared to heavy VR Feed (<strong>133.4 to 194.6 cP</strong>). Clarified oil has a higher liquid density (<strong>1018.6 kg/m³</strong>, Specific Gravity 1.120) because it consists of heavy condensed polyaromatic hydrocarbons with low API gravity, whereas VR feed is a high-molecular-weight residuum.`);
    }

    // Viscosity insight
    const viscRow = rows.find(r => r.prop.toLowerCase().includes("viscosity"));
    if (viscRow && viscRow.isNumeric && Math.abs(viscRow.delta) > 10) {
      if (viscRow.delta < 0) {
        insights.push(`<strong>Viscosity Reduction / Hydraulic Lubricity:</strong> Stream ${sB.streamNo} has a ${Math.abs(viscRow.pctChange).toFixed(1)}% lower liquid viscosity (-${Math.abs(viscRow.delta).toFixed(1)} cP). This dramatically decreases pipeline frictional pressure drops ($\Delta P_{friction}$) and improves atomization in downstream ebullated-bed reactor injection nozzles.`);
      } else {
        insights.push(`<strong>High Viscosity Feed Loading:</strong> Stream ${sB.streamNo} possesses significant viscosity (${viscRow.numB.toFixed(1)} cP vs ${viscRow.numA.toFixed(1)} cP), requiring pre-heating to Maintain laminar flow within permissible pumping head limits.`);
      }
    }

    // Pseudo critical pressure & temp
    const pcRow = rows.find(r => r.prop.toLowerCase().includes("pseudo crit press"));
    if (pcRow && pcRow.isNumeric && Math.abs(pcRow.delta) > 5) {
      insights.push(`<strong>Thermodynamic Characterization ($P_{c}, T_{c}$):</strong> Pseudo Critical Pressure shift ($\Delta P_c = ${pcRow.delta > 0 ? '+' : ''}${pcRow.delta.toFixed(2)} kg/cm²$) reflects substantial differences in average molecular weight, Watson characterization factor ($K_W$), and aromaticity.`);
    }

    // Pressure & Temperature
    const tempRow = rows.find(r => r.prop.toLowerCase().includes("temperature"));
    const pressRow = rows.find(r => r.prop.toLowerCase().includes("pressure"));
    if (tempRow && pressRow && (tempRow.delta !== 0 || pressRow.delta !== 0)) {
      insights.push(`<strong>Operating Condition Balance:</strong> Stream ${sB.streamNo} operates at ${sB.tempC || sB.properties?.["Temperature (°C)"]}°C and ${sB.pressKgCm2 || sB.properties?.["Pressure (kg/cm2 (g))"]} kg/cm²(g) vs Stream ${sA.streamNo} (${sA.tempC || sA.properties?.["Temperature (°C)"]}°C, ${sA.pressKgCm2 || sA.properties?.["Pressure (kg/cm2 (g))"]} kg/cm²(g)). Variance ($\Delta T = ${tempRow.delta >= 0 ? '+' : ''}${tempRow.delta}°C$, $\Delta P = ${pressRow.delta >= 0 ? '+' : ''}${pressRow.delta.toFixed(1)} kg/cm²$) aligns with booster pump head and heat exchanger line hydraulics.`);
    }

    // Mass flow distribution
    const massA = Number(sA.massFlow) || 0;
    const massB = Number(sB.massFlow) || 0;
    const deltaMass = massB - massA;
    if (Math.abs(deltaMass) > 100) {
      insights.push(`<strong>Flow Split & Proportioning:</strong> Stream ${sA.streamNo} (${formatNum(massA)} kg/hr) vs Stream ${sB.streamNo} (${formatNum(massB)} kg/hr), representing a net mass flow delta of ${deltaMass >= 0 ? '+' : ''}${formatNum(deltaMass)} kg/hr across branch trains.`);
    }

    box.innerHTML = `
      <div class="stream-insight-header">
        <span>🌡️</span> Chemical Engineering Physical & Thermodynamic Diagnostics (Stream ${sA.streamNo} vs Stream ${sB.streamNo})
      </div>
      <ul class="stream-insight-list">
        ${insights.map(i => `<li>${i}</li>`).join("")}
      </ul>
    `;
  }

  function renderPropertiesTable(rows) {
    const tbody = document.getElementById("streamCompTableBody");
    if (!tbody) return;

    // Apply Filter & Search
    let filtered = rows.filter(r => {
      if (state.searchQuery && !r.prop.toLowerCase().includes(state.searchQuery.toLowerCase())) {
        return false;
      }
      if (state.activeFilter === "increased") return r.status === "INCREASED";
      if (state.activeFilter === "decreased") return r.status === "DECREASED";
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No properties matching filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      let badgeClass = "badge-equal";
      let badgeLabel = "= IDENTICAL";
      let deltaClass = "diff-neutral";

      if (r.status === "INCREASED") {
        badgeClass = "badge-increased";
        badgeLabel = "▲ HIGHER";
        deltaClass = "diff-positive";
      } else if (r.status === "DECREASED") {
        badgeClass = "badge-decreased";
        badgeLabel = "▼ LOWER";
        deltaClass = "diff-negative";
      } else if (r.status === "DIFFERENT") {
        badgeClass = "badge-new";
        badgeLabel = "✦ VARIED CONTENT";
        deltaClass = "diff-positive";
      }

      const displayValA = r.isNumeric ? (typeof r.numA === "number" ? (r.numA >= 100 ? formatNum(r.numA, 1) : r.numA.toFixed(3)) : r.rawA) : r.rawA;
      const displayValB = r.isNumeric ? (typeof r.numB === "number" ? (r.numB >= 100 ? formatNum(r.numB, 1) : r.numB.toFixed(3)) : r.rawB) : r.rawB;
      const displayDelta = r.isNumeric ? (r.delta >= 0 ? '+' : '') + (Math.abs(r.delta) >= 100 ? formatNum(r.delta, 1) : r.delta.toFixed(3)) : "-";
      const displayPct = r.isNumeric ? (r.pctChange >= 0 ? '+' : '') + r.pctChange.toFixed(1) + "%" : "-";

      return `
        <tr>
          <td><strong>${r.prop}</strong></td>
          <td style="color: #64748b; font-size: 12px;">${r.category}</td>
          <td class="num">${displayValA}</td>
          <td class="num"><strong>${displayValB}</strong></td>
          <td class="num ${deltaClass}"><strong>${displayDelta}</strong></td>
          <td class="num ${deltaClass}">${displayPct}</td>
          <td><span class="badge-status ${badgeClass}">${badgeLabel}</span></td>
        </tr>
      `;
    }).join("");
  }

  function renderPropertiesCharts(sA, sB, rows) {
    if (typeof Chart === "undefined") return;

    // Pick top physical metrics to compare
    const targetMetrics = [
      "Liquid Viscosity (cP)",
      "Liquid Density (kg/m3)",
      "Temperature (°C)",
      "Pressure (kg/cm2 (g))",
      "Total Sp. Enthalpy (kcal/kg)",
      "Pseudo Crit Temp (°C)"
    ];

    const chartRows = rows.filter(r => targetMetrics.includes(r.prop) && r.isNumeric);
    const labels = chartRows.map(r => r.prop.split("(")[0].trim());
    const valsA = chartRows.map(r => r.numA);
    const valsB = chartRows.map(r => r.numB);

    const ctxComp = document.getElementById("chartStreamComparison");
    if (ctxComp && typeof Chart !== "undefined") {
      try {
        if (state.chartComparison) state.chartComparison.destroy();

        state.chartComparison = new Chart(ctxComp, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [
              {
                label: `Stream ${sA.streamNo} (${sA.content || ''})`,
                data: valsA,
                backgroundColor: "rgba(59, 130, 246, 0.75)",
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 1
              },
              {
                label: `Stream ${sB.streamNo} (${sB.content || ''})`,
                data: valsB,
                backgroundColor: "rgba(16, 185, 129, 0.75)",
                borderColor: "rgb(16, 185, 129)",
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Physical & Operating Properties: Stream ${sA.streamNo} vs ${sB.streamNo}`
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      } catch (chartErr) {
        console.warn("[StreamComparator] Properties chartComparison init:", chartErr);
      }
    }

    const ctxDelta = document.getElementById("chartStreamDelta");
    if (ctxDelta && typeof Chart !== "undefined") {
      try {
        if (state.chartDelta) state.chartDelta.destroy();

        const deltaRows = rows.filter(r => r.isNumeric && r.delta !== 0 && !r.prop.includes("Flow Mass")).slice(0, 8);
        const deltaLabels = deltaRows.map(r => r.prop.split("(")[0].trim());
        const deltas = deltaRows.map(r => r.pctChange);
        const deltaColors = deltas.map(d => d >= 0 ? "rgba(22, 163, 74, 0.8)" : "rgba(225, 29, 72, 0.8)");

        state.chartDelta = new Chart(ctxDelta, {
          type: "bar",
          data: {
            labels: deltaLabels,
            datasets: [
              {
                label: "Percentage Variance Δ (%)",
                data: deltas,
                backgroundColor: deltaColors,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Relative Shift (%) in Stream ${sB.streamNo} vs Stream ${sA.streamNo}`
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Delta: ${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(1)}%`
                }
              }
            },
            scales: {
              y: {
                title: {
                  display: true,
                  text: "Variance %"
                }
              }
            }
          }
        });
      } catch (chartErr) {
        console.warn("[StreamComparator] Properties chartDelta init:", chartErr);
      }
    }
  }

  // =========================================================================
  // 1.5 COMBINED UNIFIED COMPARISON (Both Physical Properties & Chemical Components)
  // =========================================================================
  function runCombinedComparison(sA, sB) {
    const propsA = sA.properties || {};
    const propsB = sB.properties || {};
    const allPropKeys = new Set([...Object.keys(propsA), ...Object.keys(propsB)]);
    const propRows = [];

    allPropKeys.forEach(prop => {
      const rawA = propsA[prop];
      const rawB = propsB[prop];
      const numA = typeof rawA === "number" ? rawA : parseFloat(String(rawA || "").replace(/,/g, ""));
      const numB = typeof rawB === "number" ? rawB : parseFloat(String(rawB || "").replace(/,/g, ""));
      const isNumeric = !isNaN(numA) && !isNaN(numB);

      let delta = 0;
      let pctChange = 0;
      let status = "EQUAL";

      if (isNumeric) {
        delta = numB - numA;
        if (numA !== 0) pctChange = (delta / Math.abs(numA)) * 100;
        else if (numB > 0) pctChange = 100;

        if (delta > 0.0001) status = "INCREASED";
        else if (delta < -0.0001) status = "DECREASED";
        else status = "EQUAL";
      } else {
        if (String(rawA).trim() !== String(rawB).trim()) status = "DIFFERENT";
      }

      propRows.push({
        prop,
        rawA: rawA !== undefined ? rawA : "-",
        rawB: rawB !== undefined ? rawB : "-",
        numA: isNumeric ? numA : null,
        numB: isNumeric ? numB : null,
        delta: isNumeric ? delta : null,
        pctChange: isNumeric ? pctChange : null,
        isNumeric,
        status,
        category: categorizeProperty(prop)
      });
    });

    const allCompNames = new Set([
      ...Object.keys(sA.components || {}),
      ...Object.keys(sB.components || {})
    ]);

    let totalMassA = sA.massFlow || Object.values(sA.components || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
    let totalMassB = sB.massFlow || Object.values(sB.components || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (totalMassA === 0) totalMassA = 1;
    if (totalMassB === 0) totalMassB = 1;

    let maxGainComp = null;
    let maxGainVal = -Infinity;
    let maxLossComp = null;
    let maxLossVal = -Infinity;
    const compRows = [];

    allCompNames.forEach(comp => {
      const valA = Number(sA.components?.[comp]) || 0;
      const valB = Number(sB.components?.[comp]) || 0;
      const delta = valB - valA;
      let pctChange = 0;
      let status = "EQUAL";

      const wtPctA = (valA / totalMassA) * 100;
      const wtPctB = (valB / totalMassB) * 100;
      const deltaWtPct = wtPctB - wtPctA;

      if (valA === 0 && valB > 0) {
        status = "NEW";
        pctChange = 100;
      } else if (valA > 0 && valB === 0) {
        status = "REMOVED";
        pctChange = -100;
      } else if (delta > 0.001) {
        status = "INCREASED";
        pctChange = valA > 0 ? (delta / valA) * 100 : 100;
      } else if (delta < -0.001) {
        status = "DECREASED";
        pctChange = valA > 0 ? (delta / valA) * 100 : -100;
      } else {
        status = "EQUAL";
      }

      if (delta > maxGainVal) {
        maxGainVal = delta;
        maxGainComp = { comp, delta, valA, valB, pctChange };
      }
      if (delta < 0 && Math.abs(delta) > maxLossVal) {
        maxLossVal = Math.abs(delta);
        maxLossComp = { comp, delta, valA, valB, pctChange };
      }

      compRows.push({
        comp,
        valA,
        valB,
        delta,
        pctChange,
        wtPctA,
        wtPctB,
        deltaWtPct,
        status,
        category: categorizeComponent(comp)
      });
    });

    renderCombinedKPIs(sA, sB, propsA, propsB, maxGainComp, maxLossComp);
    renderCombinedEngineeringInsights(sA, sB, propRows, compRows);
    renderCombinedTable(sA, sB, propRows, compRows);
    renderCombinedCharts(sA, sB, propRows, compRows);
  }

  function renderCombinedKPIs(sA, sB, pA, pB, maxGain, maxLoss) {
    const grid = document.getElementById("streamKpiGrid");
    if (!grid) return;

    const massA = Number(sA.massFlow) || 0;
    const massB = Number(sB.massFlow) || 0;
    const deltaMass = massB - massA;
    const pctMass = massA > 0 ? (deltaMass / massA) * 100 : 0;

    const tempA = pA["Temperature (°C)"] || sA.tempC || 0;
    const tempB = pB["Temperature (°C)"] || sB.tempC || 0;
    const deltaTemp = Number(tempB) - Number(tempA);

    const pressA = pA["Pressure (kg/cm2 (g))"] || sA.pressKgCm2 || 0;
    const pressB = pB["Pressure (kg/cm2 (g))"] || sB.pressKgCm2 || 0;
    const deltaPress = Number(pressB) - Number(pressA);

    const viscA = pA["Liquid Viscosity (cP)"] || 0;
    const viscB = pB["Liquid Viscosity (cP)"] || 0;
    const deltaVisc = Number(viscB) - Number(viscA);

    grid.innerHTML = `
      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Mass Flow Rate (kg/hr)</div>
        <div class="stream-kpi-val">${formatNum(massB)}</div>
        <div class="stream-kpi-sub ${deltaMass > 0 ? 'diff-positive' : deltaMass < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaMass >= 0 ? '▲ +' : '▼ '}${formatNum(deltaMass)} kg/hr (${pctMass >= 0 ? '+' : ''}${pctMass.toFixed(1)}%) vs Stream ${sA.streamNo}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Operating Temperature (°C)</div>
        <div class="stream-kpi-val">${tempB}°C</div>
        <div class="stream-kpi-sub ${deltaTemp > 0 ? 'diff-positive' : deltaTemp < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaTemp >= 0 ? '▲ +' : '▼ '}${deltaTemp.toFixed(1)}°C (Stream ${sA.streamNo}: ${tempA}°C)
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Operating Pressure (kg/cm² g)</div>
        <div class="stream-kpi-val">${pressB} kg/cm²</div>
        <div class="stream-kpi-sub ${deltaPress > 0 ? 'diff-positive' : deltaPress < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaPress >= 0 ? '▲ +' : '▼ '}${deltaPress.toFixed(2)} kg/cm² (Stream ${sA.streamNo}: ${pressA} kg/cm²)
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">⚡ Liquid Viscosity (cP)</div>
        <div class="stream-kpi-val" style="color: #2563eb; font-size: 19px;">
          ${Number(viscB).toFixed(2)} cP
        </div>
        <div class="stream-kpi-sub diff-neutral">
          Stream ${sA.streamNo}: ${Number(viscA).toFixed(2)} cP (Δ ${deltaVisc >= 0 ? '+' : ''}${deltaVisc.toFixed(2)} cP)
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">🧪 Max Enriched Component</div>
        <div class="stream-kpi-val" style="color: #16a34a; font-size: 18px;">
          ${maxGain ? maxGain.comp : 'None'}
        </div>
        <div class="stream-kpi-sub diff-positive">
          ${maxGain ? `▲ +${formatNum(maxGain.delta)} kg/hr (+${maxGain.pctChange.toFixed(0)}%)` : 'No component delta'}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">🧪 Max Stripped Component</div>
        <div class="stream-kpi-val" style="color: #dc2626; font-size: 18px;">
          ${maxLoss ? maxLoss.comp : 'None'}
        </div>
        <div class="stream-kpi-sub diff-negative">
          ${maxLoss ? `▼ -${formatNum(maxLoss.delta)} kg/hr (${maxLoss.pctChange.toFixed(0)}%)` : 'No component stripped'}
        </div>
      </div>
    `;
  }

  function renderCombinedEngineeringInsights(sA, sB, propRows, compRows) {
    const box = document.getElementById("streamInsightBox");
    if (!box) return;

    const insights = [];
    const tempRow = propRows.find(r => r.prop.toLowerCase().includes("temperature"));
    const pressRow = propRows.find(r => r.prop.toLowerCase().includes("pressure"));
    const viscRow = propRows.find(r => r.prop.toLowerCase().includes("viscosity"));

    if (tempRow || pressRow) {
      insights.push(`<strong>Operating Conditions Shift:</strong> Stream ${sB.streamNo} operates at ${sB.tempC || sB.properties?.["Temperature (°C)"] || '-'}°C, ${sB.pressKgCm2 || sB.properties?.["Pressure (kg/cm2 (g))"] || '-'} kg/cm²g vs Stream ${sA.streamNo} (${sA.tempC || sA.properties?.["Temperature (°C)"] || '-'}°C, ${sA.pressKgCm2 || sA.properties?.["Pressure (kg/cm2 (g))"] || '-'} kg/cm²g). Viscosity changes from ${viscRow ? viscRow.rawA : '-'} cP to ${viscRow ? viscRow.rawB : '-'} cP.`);
    }

    const h2o = compRows.find(r => r.comp === "H2O");
    if (h2o && h2o.delta > 5000) {
      insights.push(`<strong>Wash Water Injection Detected:</strong> H2O increases by +${formatNum(h2o.delta)} kg/hr (${h2o.valA} -> ${h2o.valB} kg/hr), preventing ammonium bisulfide salt crystallization in the effluent air coolers (REAC).`);
    }

    const h2s = compRows.find(r => r.comp === "H2S");
    if (h2s && Math.abs(h2s.delta) > 500) {
      insights.push(`<strong>Sour Gas / H2S Phase Migration:</strong> Acid gas (H2S) variance (Δ = ${formatNum(h2s.delta)} kg/hr) reflects vapor-liquid equilibrium flash separation.`);
    }

    const lightEnds = compRows.filter(r => ["METHANE", "ETHANE", "PROPANE", "I-BUTANE", "N-BUTANE"].includes(r.comp));
    const deltaLights = lightEnds.reduce((acc, r) => acc + r.delta, 0);
    if (Math.abs(deltaLights) > 1000) {
      insights.push(`<strong>Light Ends / Off-Gas Yields:</strong> C1–C4 hydrocarbons shift by ${deltaLights >= 0 ? '+' : ''}${formatNum(deltaLights)} kg/hr across the separation stage.`);
    }

    box.innerHTML = `
      <div class="stream-insight-header">
        <span>🔗</span> Unified Physical & Chemical Engineering Diagnostics (Stream ${sA.streamNo} vs Stream ${sB.streamNo})
      </div>
      <ul class="stream-insight-list">
        ${insights.map(i => `<li>${i}</li>`).join("")}
      </ul>
    `;
  }

  function renderCombinedTable(sA, sB, propRows, compRows) {
    const tbody = document.getElementById("streamCompTableBody");
    if (!tbody) return;

    let filteredProps = propRows.filter(r => {
      if (state.searchQuery && !r.prop.toLowerCase().includes(state.searchQuery.toLowerCase())) return false;
      if (state.activeFilter === "increased") return r.status === "INCREASED";
      if (state.activeFilter === "decreased") return r.status === "DECREASED";
      return true;
    });

    let filteredComps = compRows.filter(r => {
      if (state.searchQuery && !r.comp.toLowerCase().includes(state.searchQuery.toLowerCase())) return false;
      if (state.activeFilter === "increased") return r.status === "INCREASED" || r.status === "NEW";
      if (state.activeFilter === "decreased") return r.status === "DECREASED" || r.status === "REMOVED";
      if (state.activeFilter === "new") return r.status === "NEW";
      if (state.activeFilter === "removed") return r.status === "REMOVED";
      return true;
    });

    let html = "";

    if (filteredProps.length > 0) {
      html += `
        <tr style="background: #e0f2fe; border-top: 3px solid #0284c7; border-bottom: 2px solid #bae6fd;">
          <td colspan="7" style="font-weight: 800; color: #0369a1; font-size: 13px; padding: 10px 14px; text-transform: uppercase; letter-spacing: 0.5px;">
            ⚡ Section 1: Physical & Thermodynamic Operating Properties (${filteredProps.length} Parameters)
          </td>
        </tr>
      `;
      html += filteredProps.map(r => {
        let badgeClass = r.status === "INCREASED" ? "badge-increased" : r.status === "DECREASED" ? "badge-decreased" : r.status === "DIFFERENT" ? "badge-new" : "badge-equal";
        let badgeLabel = r.status === "INCREASED" ? "▲ HIGHER" : r.status === "DECREASED" ? "▼ LOWER" : r.status === "DIFFERENT" ? "✦ VARIED" : "= IDENTICAL";
        let deltaClass = r.status === "INCREASED" ? "diff-positive" : r.status === "DECREASED" ? "diff-negative" : "diff-neutral";

        const displayValA = r.isNumeric ? (typeof r.numA === "number" ? (r.numA >= 100 ? formatNum(r.numA, 1) : r.numA.toFixed(3)) : r.rawA) : r.rawA;
        const displayValB = r.isNumeric ? (typeof r.numB === "number" ? (r.numB >= 100 ? formatNum(r.numB, 1) : r.numB.toFixed(3)) : r.rawB) : r.rawB;
        const displayDelta = r.isNumeric ? (r.delta >= 0 ? '+' : '') + (Math.abs(r.delta) >= 100 ? formatNum(r.delta, 1) : r.delta.toFixed(3)) : "-";
        const displayPct = r.isNumeric ? (r.pctChange >= 0 ? '+' : '') + r.pctChange.toFixed(1) + "%" : "-";

        return `
          <tr>
            <td><strong>${r.prop}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${r.category}</td>
            <td class="num">${displayValA}</td>
            <td class="num"><strong>${displayValB}</strong></td>
            <td class="num ${deltaClass}"><strong>${displayDelta}</strong></td>
            <td class="num ${deltaClass}">${displayPct}</td>
            <td><span class="badge-status ${badgeClass}">${badgeLabel}</span></td>
          </tr>
        `;
      }).join("");
    }

    if (filteredComps.length > 0) {
      const isWt = state.displayBasis === "wtPercent";
      html += `
        <tr style="background: #dcfce7; border-top: 3px solid #16a34a; border-bottom: 2px solid #bbf7d0;">
          <td colspan="7" style="font-weight: 800; color: #15803d; font-size: 13px; padding: 10px 14px; text-transform: uppercase; letter-spacing: 0.5px;">
            🧪 Section 2: Chemical Component Breakdown & Mass Distribution (${filteredComps.length} Components - Basis: ${isWt ? 'wt%' : 'kg/hr'})
          </td>
        </tr>
      `;
      html += filteredComps.map(r => {
        let badgeClass = "badge-equal";
        let badgeLabel = "= IDENTICAL";
        let deltaClass = "diff-neutral";

        if (r.status === "NEW") {
          badgeClass = "badge-new";
          badgeLabel = "+ NEW COMPONENT";
          deltaClass = "diff-positive";
        } else if (r.status === "REMOVED") {
          badgeClass = "badge-removed";
          badgeLabel = "✕ STRIPPED / ZERO";
          deltaClass = "diff-negative";
        } else if (r.status === "INCREASED") {
          badgeClass = "badge-increased";
          badgeLabel = "▲ ENRICHED (+)";
          deltaClass = "diff-positive";
        } else if (r.status === "DECREASED") {
          badgeClass = "badge-decreased";
          badgeLabel = "▼ DEPLETED (-)";
          deltaClass = "diff-negative";
        }

        const valA = isWt ? r.wtPctA.toFixed(2) + "%" : formatNum(r.valA);
        const valB = isWt ? r.wtPctB.toFixed(2) + "%" : formatNum(r.valB);
        const delta = isWt ? (r.deltaWtPct >= 0 ? '+' : '') + r.deltaWtPct.toFixed(2) + "%" : (r.delta >= 0 ? '+' : '') + formatNum(r.delta);
        const pctChange = (r.pctChange >= 0 ? '+' : '') + r.pctChange.toFixed(1) + "%";

        return `
          <tr>
            <td><strong>${r.comp}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${r.category}</td>
            <td class="num">${valA}</td>
            <td class="num"><strong>${valB}</strong></td>
            <td class="num ${deltaClass}"><strong>${delta}</strong></td>
            <td class="num ${deltaClass}">${pctChange}</td>
            <td><span class="badge-status ${badgeClass}">${badgeLabel}</span></td>
          </tr>
        `;
      }).join("");
    }

    if (!html) {
      html = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No parameters or components match the current filter.</td></tr>`;
    }

    tbody.innerHTML = html;
  }

  function renderCombinedCharts(sA, sB, propRows, compRows) {
    const ctxComp = document.getElementById("chartStreamComparison");
    if (ctxComp && typeof Chart !== "undefined") {
      try {
        if (state.chartComparison) state.chartComparison.destroy();

        const topComps = [...compRows].sort((a, b) => Math.max(b.valA, b.valB) - Math.max(a.valA, a.valB)).slice(0, 8);
        const labels = topComps.map(r => r.comp);
        const dataA = topComps.map(r => r.valA);
        const dataB = topComps.map(r => r.valB);

        state.chartComparison = new Chart(ctxComp, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: `Stream ${sA.streamNo} (Baseline)`,
                data: dataA,
                backgroundColor: "rgba(37, 99, 235, 0.75)",
                borderColor: "#1d4ed8",
                borderWidth: 1,
                borderRadius: 4
              },
              {
                label: `Stream ${sB.streamNo} (Comparison)`,
                data: dataB,
                backgroundColor: "rgba(22, 163, 74, 0.75)",
                borderColor: "#15803d",
                borderWidth: 1,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Key Components Mass Flow: Stream ${sA.streamNo} vs Stream ${sB.streamNo}`
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "kg/hr" }
              }
            }
          }
        });
      } catch (err) {
        console.warn("[StreamComparator] Combined chart comparison init:", err);
      }
    }

    const ctxDelta = document.getElementById("chartStreamDelta");
    if (ctxDelta && typeof Chart !== "undefined") {
      try {
        if (state.chartDelta) state.chartDelta.destroy();

        const sorted = [...compRows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10);
        const labels = sorted.map(r => r.comp);
        const deltas = sorted.map(r => r.delta);
        const colors = deltas.map(d => d >= 0 ? "rgba(22, 163, 74, 0.8)" : "rgba(225, 29, 72, 0.8)");

        state.chartDelta = new Chart(ctxDelta, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: `Delta kg/hr (Stream ${sB.streamNo} - ${sA.streamNo})`,
              data: deltas,
              backgroundColor: colors,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Net Flow Gain (+) or Depletion (-) in Stream ${sB.streamNo}`
              }
            },
            scales: {
              y: {
                title: { display: true, text: "Variance Δ (kg/hr)" }
              }
            }
          }
        });
      } catch (err) {
        console.warn("[StreamComparator] Combined chart delta init:", err);
      }
    }
  }
  function runComponentsComparison(sA, sB) {
    const allCompNames = new Set([
      ...Object.keys(sA.components || {}),
      ...Object.keys(sB.components || {})
    ]);

    let totalMassA = sA.massFlow || Object.values(sA.components || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
    let totalMassB = sB.massFlow || Object.values(sB.components || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (totalMassA === 0) totalMassA = 1;
    if (totalMassB === 0) totalMassB = 1;

    let countNew = 0;
    let countRemoved = 0;
    let countIncreased = 0;
    let countDecreased = 0;
    let countEqual = 0;

    let maxGainComp = null;
    let maxGainVal = -Infinity;
    let maxLossComp = null;
    let maxLossVal = -Infinity;

    const compRows = [];

    allCompNames.forEach(comp => {
      const valA = Number(sA.components?.[comp]) || 0;
      const valB = Number(sB.components?.[comp]) || 0;
      const delta = valB - valA;
      let pctChange = 0;
      let status = "EQUAL";

      const wtPctA = (valA / totalMassA) * 100;
      const wtPctB = (valB / totalMassB) * 100;
      const deltaWtPct = wtPctB - wtPctA;

      if (valA === 0 && valB > 0) {
        status = "NEW";
        pctChange = 100;
        countNew++;
      } else if (valA > 0 && valB === 0) {
        status = "REMOVED";
        pctChange = -100;
        countRemoved++;
      } else if (delta > 0.001) {
        status = "INCREASED";
        pctChange = valA > 0 ? (delta / valA) * 100 : 100;
        countIncreased++;
      } else if (delta < -0.001) {
        status = "DECREASED";
        pctChange = valA > 0 ? (delta / valA) * 100 : -100;
        countDecreased++;
      } else {
        status = "EQUAL";
        pctChange = 0;
        countEqual++;
      }

      if (delta > maxGainVal) {
        maxGainVal = delta;
        maxGainComp = { comp, delta, valA, valB, pctChange };
      }
      if (delta < 0 && Math.abs(delta) > maxLossVal) {
        maxLossVal = Math.abs(delta);
        maxLossComp = { comp, delta, valA, valB, pctChange };
      }

      compRows.push({
        comp,
        valA,
        valB,
        delta,
        pctChange,
        wtPctA,
        wtPctB,
        deltaWtPct,
        status,
        category: categorizeComponent(comp)
      });
    });

    renderComponentsKPIs({
      sA,
      sB,
      totalMassA,
      totalMassB,
      countNew,
      countRemoved,
      countIncreased,
      countDecreased,
      countEqual,
      maxGainComp,
      maxLossComp
    });

    renderComponentsEngineeringInsights({
      sA,
      sB,
      totalMassA,
      totalMassB,
      compRows
    });

    renderComponentsTable(compRows);
    renderComponentsCharts(sA, sB, compRows);
  }

  function categorizeComponent(name) {
    const n = name.toUpperCase().trim();
    if (["H2", "HYDROGEN"].includes(n)) return "Light Gas / Treating Agent";
    if (["H2O", "WATER", "STEAM"].includes(n)) return "Aqueous / Wash Water";
    if (["H2S", "HYDROGEN SULFIDE", "NH3", "AMMONIA", "CO2"].includes(n)) return "Acid / Sour Gas / Inorganic";
    if (["METHANE", "ETHANE", "PROPANE", "I-BUTANE", "N-BUTANE", "C1", "C2", "C3", "IC4", "NC4"].includes(n)) return "Light Hydrocarbon (LPG/Fuel Gas)";
    if (["NAPHTHA", "GASOLINE"].includes(n)) return "Light Distillate / Naphtha";
    if (["DIESEL", "KEROSENE", "KERO", "LGO"].includes(n)) return "Middle Distillate / Diesel";
    if (["HDT VGO", "LCF VGO", "VGO", "HGO", "VTB", "VR FEED 1", "VR FEED 2", "CLARIFIED OIL", "SR VGO", "HCGO", "RESID"].includes(n)) return "Heavy Hydrocarbon / Residue";
    return "Process Stream Component";
  }

  function renderComponentsKPIs(data) {
    const { sA, sB, totalMassA, totalMassB, countNew, countRemoved, countIncreased, countDecreased, maxGainComp, maxLossComp } = data;

    const deltaMass = totalMassB - totalMassA;
    const pctMass = totalMassA > 0 ? (deltaMass / totalMassA) * 100 : 0;

    const deltaMolar = (sB.molarFlow || 0) - (sA.molarFlow || 0);
    const pctMolar = sA.molarFlow > 0 ? (deltaMolar / sA.molarFlow) * 100 : 0;

    const grid = document.getElementById("streamKpiGrid");
    if (!grid) return;

    const tempA = sA.tempC ?? sA.properties?.["Temperature (°C)"] ?? sA.properties?.["Temperature"] ?? null;
    const tempB = sB.tempC ?? sB.properties?.["Temperature (°C)"] ?? sB.properties?.["Temperature"] ?? null;
    const numTempA = tempA !== null && tempA !== "" ? Number(tempA) : null;
    const numTempB = tempB !== null && tempB !== "" ? Number(tempB) : null;
    const deltaTemp = numTempA !== null && numTempB !== null ? numTempB - numTempA : null;

    let tempKpiHtml = "";
    if (numTempA !== null || numTempB !== null) {
      tempKpiHtml = `
        <div class="stream-kpi-card" style="border-left: 4px solid #ea580c;">
          <div class="stream-kpi-label">Operating Temperature (°C)</div>
          <div class="stream-kpi-val" style="color: #ea580c;">${numTempB !== null ? `${numTempB}°C` : 'N/A'}</div>
          <div class="stream-kpi-sub ${deltaTemp !== null && deltaTemp > 0 ? 'diff-positive' : deltaTemp !== null && deltaTemp < 0 ? 'diff-negative' : 'diff-neutral'}">
            ${deltaTemp !== null ? `${deltaTemp >= 0 ? '▲ +' : '▼ '}${deltaTemp.toFixed(1)}°C (Stream ${sA.streamNo}: ${numTempA}°C)` : (numTempA !== null ? `Stream ${sA.streamNo}: ${numTempA}°C` : 'Stream B unmeasured')}
          </div>
        </div>
      `;
    }

    grid.innerHTML = `
      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Total Mass Flow (kg/hr)</div>
        <div class="stream-kpi-val">${formatNum(totalMassB)}</div>
        <div class="stream-kpi-sub ${deltaMass > 0 ? 'diff-positive' : deltaMass < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${deltaMass >= 0 ? '▲ +' : '▼ '}${formatNum(deltaMass)} kg/hr (${pctMass >= 0 ? '+' : ''}${pctMass.toFixed(1)}%) vs Stream ${sA.streamNo}
        </div>
      </div>

      ${tempKpiHtml}

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Total Molar Flow (kg-mol/hr)</div>
        <div class="stream-kpi-val">${sB.molarFlow ? formatNum(sB.molarFlow, 2) : 'N/A'}</div>
        <div class="stream-kpi-sub ${deltaMolar > 0 ? 'diff-positive' : deltaMolar < 0 ? 'diff-negative' : 'diff-neutral'}">
          ${sA.molarFlow && sB.molarFlow ? (deltaMolar >= 0 ? '▲ +' : '▼ ') + formatNum(deltaMolar, 1) + ' kmol/hr (' + (pctMolar >= 0 ? '+' : '') + pctMolar.toFixed(1) + '%)' : 'Molar flow unmeasured'}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Top Enriched Component</div>
        <div class="stream-kpi-val" style="color: #16a34a; font-size: 19px;">
          ${maxGainComp ? `${maxGainComp.comp} (+${formatNum(maxGainComp.delta)})` : 'None'}
        </div>
        <div class="stream-kpi-sub diff-positive">
          ${maxGainComp ? `Increased from ${formatNum(maxGainComp.valA)} to ${formatNum(maxGainComp.valB)} kg/hr` : 'Identical balance'}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Top Depleted Component</div>
        <div class="stream-kpi-val" style="color: #e11d48; font-size: 19px;">
          ${maxLossComp ? `${maxLossComp.comp} (-${formatNum(Math.abs(maxLossComp.delta))})` : 'None'}
        </div>
        <div class="stream-kpi-sub diff-negative">
          ${maxLossComp ? `Decreased from ${formatNum(maxLossComp.valA)} to ${formatNum(maxLossComp.valB)} kg/hr` : 'No component lost'}
        </div>
      </div>

      <div class="stream-kpi-card">
        <div class="stream-kpi-label">Component Count Shift</div>
        <div class="stream-kpi-val" style="font-size: 18px; display: flex; gap: 8px;">
          <span style="color: #0284c7;" title="Newly introduced components">✨ ${countNew} New</span>
          <span style="color: #b45309;" title="Completely removed components">❌ ${countRemoved} Stripped</span>
        </div>
        <div class="stream-kpi-sub diff-neutral">
          ${countIncreased} Increased | ${countDecreased} Decreased
        </div>
      </div>
    `;
  }

  function renderComponentsEngineeringInsights(data) {
    const { sA, sB, totalMassA, totalMassB, compRows } = data;
    const box = document.getElementById("streamInsightBox");
    if (!box) return;

    const insights = [];

    const h2o = compRows.find(c => c.comp.toUpperCase() === "H2O");
    if (h2o && h2o.delta > 5000) {
      insights.push(`<strong>Wash Water Injection Detected:</strong> Water ($H_2O$) flow spikes by +${formatNum(h2o.delta)} kg/hr (${h2o.valA} → ${formatNum(h2o.valB)} kg/hr, +${h2o.pctChange.toFixed(0)}%). This is characteristic of protective wash water dosing prior to effluent air coolers to dissolve ammonium bisulfide ($NH_4HS$) and ammonium chloride ($NH_4Cl$) salts and prevent fouling/under-deposit corrosion.`);
    } else if (h2o && h2o.delta < -5000) {
      insights.push(`<strong>Sour Water Liquid Separation:</strong> Water ($H_2O$) drops drastically by -${formatNum(Math.abs(h2o.delta))} kg/hr (${formatNum(h2o.valA)} → ${formatNum(h2o.valB)} kg/hr), confirming downstream sour water boot separation in high pressure vessels.`);
    }

    const nh3 = compRows.find(c => c.comp.toUpperCase() === "NH3");
    if (nh3 && nh3.valA > 100 && nh3.valB < 20) {
      insights.push(`<strong>High-Efficiency Ammonia ($NH_3$) Scrubbing:</strong> $NH_3$ collapses from ${formatNum(nh3.valA)} kg/hr down to ${formatNum(nh3.valB)} kg/hr (${nh3.pctChange.toFixed(1)}% removal), indicating virtually complete partition into the aqueous sour water phase.`);
    }

    const h2s = compRows.find(c => c.comp.toUpperCase() === "H2S");
    if (h2s && Math.abs(h2s.delta) > 500) {
      if (h2s.delta < 0) {
        insights.push(`<strong>$H_2S$ Sour Gas Flash / Removal:</strong> $H_2S$ flow decreases by -${formatNum(Math.abs(h2s.delta))} kg/hr (${h2s.pctChange.toFixed(1)}%), representing downstream absorption or phase separation.`);
      } else {
        insights.push(`<strong>$H_2S$ Hydrodesulfurization (HDS) Generation:</strong> $H_2S$ concentration is elevated (+${formatNum(h2s.delta)} kg/hr), indicative of organic sulfur conversion in upstream hydroprocessing catalyst beds.`);
      }
    }

    const diesel = compRows.find(c => c.comp.toUpperCase() === "DIESEL");
    const vgo = compRows.find(c => c.comp.toUpperCase().includes("VGO"));
    if ((diesel && diesel.valA > 1000 && diesel.valB < 500) || (vgo && vgo.valA > 200 && vgo.valB < 10)) {
      insights.push(`<strong>Liquid Hydrocarbon Fractionation / Knockout:</strong> Heavy cuts like Diesel (${diesel ? `${formatNum(diesel.valA)} → ${formatNum(diesel.valB)} kg/hr` : ''}) and Gas Oils are stripped from the vapor phase and directed to cold liquid fractionation.`);
    }

    const deltaTotal = totalMassB - totalMassA;
    if (Math.abs(deltaTotal) > 0.01) {
      insights.push(`<strong>Stream Mass Balance Delta:</strong> Net difference of ${deltaTotal > 0 ? '+' : ''}${formatNum(deltaTotal)} kg/hr between Stream ${sA.streamNo} and Stream ${sB.streamNo}. ${deltaTotal > 0 ? 'Represents additive stream injection (e.g. wash water, stripping gas, or make-up chemical).' : 'Represents effluent split, overhead flash, or liquid product draw off.'}`);
    } else {
      insights.push(`<strong>Zero Mass Deviation:</strong> Total mass flow is strictly conserved (100.0% mass balance closure) between Stream ${sA.streamNo} and Stream ${sB.streamNo}.`);
    }

    box.innerHTML = `
      <div class="stream-insight-header">
        <span>🔍</span> Chemical Engineering Process Insights & Variance Diagnostics (Stream ${sA.streamNo} vs Stream ${sB.streamNo})
      </div>
      <ul class="stream-insight-list">
        ${insights.map(i => `<li>${i}</li>`).join("")}
      </ul>
    `;
  }

  function renderComponentsTable(rows) {
    const tbody = document.getElementById("streamCompTableBody");
    if (!tbody) return;

    let filtered = rows.filter(r => {
      if (state.searchQuery && !r.comp.toLowerCase().includes(state.searchQuery.toLowerCase())) {
        return false;
      }
      if (state.activeFilter === "increased") return r.status === "INCREASED";
      if (state.activeFilter === "decreased") return r.status === "DECREASED";
      if (state.activeFilter === "new") return r.status === "NEW";
      if (state.activeFilter === "removed") return r.status === "REMOVED";
      return true;
    });

    filtered.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #64748b;">No components matching active filter criteria.</td></tr>`;
      return;
    }

    const isWt = state.displayBasis === "wtPercent";

    tbody.innerHTML = filtered.map(r => {
      let badgeClass = "badge-equal";
      let badgeLabel = "= IDENTICAL";
      let deltaClass = "diff-neutral";

      if (r.status === "INCREASED") {
        badgeClass = "badge-increased";
        badgeLabel = "▲ INCREASED";
        deltaClass = "diff-positive";
      } else if (r.status === "DECREASED") {
        badgeClass = "badge-decreased";
        badgeLabel = "▼ DECREASED";
        deltaClass = "diff-negative";
      } else if (r.status === "NEW") {
        badgeClass = "badge-new";
        badgeLabel = "✨ NEW IN STREAM B";
        deltaClass = "diff-positive";
      } else if (r.status === "REMOVED") {
        badgeClass = "badge-removed";
        badgeLabel = "❌ STRIPPED / ZERO";
        deltaClass = "diff-negative";
      }

      const displayValA = isWt ? `${r.wtPctA.toFixed(2)} wt%` : `${formatNum(r.valA)} kg/hr`;
      const displayValB = isWt ? `${r.wtPctB.toFixed(2)} wt%` : `${formatNum(r.valB)} kg/hr`;
      const displayDelta = isWt ? `${r.deltaWtPct >= 0 ? '+' : ''}${r.deltaWtPct.toFixed(2)} wt%` : `${r.delta >= 0 ? '+' : ''}${formatNum(r.delta)} kg/hr`;
      const displayPct = r.status === "NEW" ? "+100% (New)" : r.status === "REMOVED" ? "-100% (Removed)" : `${r.pctChange >= 0 ? '+' : ''}${r.pctChange.toFixed(1)}%`;

      return `
        <tr>
          <td><strong>${r.comp}</strong></td>
          <td style="color: #64748b; font-size: 12px;">${r.category}</td>
          <td class="num">${displayValA}</td>
          <td class="num"><strong>${displayValB}</strong></td>
          <td class="num ${deltaClass}"><strong>${displayDelta}</strong></td>
          <td class="num ${deltaClass}">${displayPct}</td>
          <td><span class="badge-status ${badgeClass}">${badgeLabel}</span></td>
        </tr>
      `;
    }).join("");
  }

  function renderComponentsCharts(sA, sB, rows) {
    if (typeof Chart === "undefined") return;

    const sorted = [...rows].sort((a, b) => Math.max(b.valA, b.valB) - Math.max(a.valA, a.valA)).slice(0, 10);
    const labels = sorted.map(r => r.comp);
    const valsA = sorted.map(r => r.valA);
    const valsB = sorted.map(r => r.valB);

    const ctxComp = document.getElementById("chartStreamComparison");
    if (ctxComp && typeof Chart !== "undefined") {
      try {
        if (state.chartComparison) state.chartComparison.destroy();

        state.chartComparison = new Chart(ctxComp, {
          type: "bar",
          data: {
            labels: labels,
            datasets: [
              {
                label: `Stream ${sA.streamNo} (kg/hr)`,
                data: valsA,
                backgroundColor: "rgba(59, 130, 246, 0.75)",
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 1
              },
              {
                label: `Stream ${sB.streamNo} (kg/hr)`,
                data: valsB,
                backgroundColor: "rgba(16, 185, 129, 0.75)",
                borderColor: "rgb(16, 185, 129)",
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Stream ${sA.streamNo} vs Stream ${sB.streamNo} Component Mass Flows`
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${formatNum(ctx.raw)} kg/hr`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "Mass Flow (kg/hr)"
                }
              }
            }
          }
        });
      } catch (chartErr) {
        console.warn("[StreamComparator] Components chartComparison init:", chartErr);
      }
    }

    const ctxDelta = document.getElementById("chartStreamDelta");
    if (ctxDelta && typeof Chart !== "undefined") {
      try {
        if (state.chartDelta) state.chartDelta.destroy();

        const deltaSorted = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 10);
        const deltaLabels = deltaSorted.map(r => r.comp);
        const deltas = deltaSorted.map(r => r.delta);
        const deltaColors = deltas.map(d => d >= 0 ? "rgba(22, 163, 74, 0.8)" : "rgba(225, 29, 72, 0.8)");

        state.chartDelta = new Chart(ctxDelta, {
          type: "bar",
          data: {
            labels: deltaLabels,
            datasets: [
              {
                label: "Net Delta (Stream B - Stream A)",
                data: deltas,
                backgroundColor: deltaColors,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Net Flow Gain (+) or Loss (-) in Stream ${sB.streamNo}`
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => `Delta: ${ctx.raw >= 0 ? '+' : ''}${formatNum(ctx.raw)} kg/hr`
                }
              }
            },
            scales: {
              y: {
                title: {
                  display: true,
                  text: "Variance Δ (kg/hr)"
                }
              }
            }
          }
        });
      } catch (chartErr) {
        console.warn("[StreamComparator] Components chartDelta init:", chartErr);
      }
    }
  }

  // =========================================================================
  // 3. MULTI-STREAM MATRIX TABLE & STREAM FILTERING (Operating Cases & Full HMB)
  // =========================================================================
  function renderMatrixCasePills() {
    const bar = document.getElementById("matrixCaseFilterBar");
    const label = document.getElementById("matrixCaseFilterLabel");
    const container = document.getElementById("matrixCasePills");
    const btnCompareSorEor = document.getElementById("btnMatrixCompareSorEor");
    const btnCompareCases = document.getElementById("btnMatrixCompareCases");
    const btnMultiCase = document.getElementById("btnMatrixMultiCaseStream");
    if (!container) return;

    if (!state.currentDataset || !state.currentDataset.streams || state.currentDataset.streams.length === 0) {
      if (bar) bar.style.display = "none";
      container.innerHTML = '<span style="font-size: 12px; color: #94a3b8;">No cases available</span>';
      return;
    }

    const streams = state.currentDataset.streams;
    const caseMap = new Map();
    streams.forEach(s => {
      const c = (s.caseName || "").trim();
      if (c) {
        caseMap.set(c, (caseMap.get(c) || 0) + 1);
      }
    });

    const distinctCases = Array.from(caseMap.keys());

    // Auto-detect: if no multiple cases are detected (e.g. RPTU single run, or standard sheet without case column)
    if (distinctCases.length <= 1) {
      state.selectedMatrixCase = "all";
      if (bar) bar.style.display = "flex";
      if (label) {
        label.innerHTML = '<span>⚡ Operating State:</span>';
      }
      if (btnCompareSorEor) btnCompareSorEor.style.display = "none";
      if (btnCompareCases) btnCompareCases.style.display = "none";
      if (btnMultiCase) btnMultiCase.style.display = "none";

      const caseTitle = distinctCases.length === 1 ? distinctCases[0] : "Single Operating State";
      container.innerHTML = `
        <div style="display: inline-flex; align-items: center; gap: 7px; padding: 4px 11px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 11.5px; color: #166534;">
          <span style="font-weight: 700; color: #15803d;">✓ Auto-Detected:</span>
          <span>${escapeHtml(caseTitle)}</span>
          <span style="background: #dcfce7; padding: 1px 7px; border-radius: 10px; font-size: 10.5px; font-weight: 700; color: #166534;">${streams.length} Streams</span>
          <span style="color: #64748b; font-size: 11px;">(No case variations in file)</span>
        </div>
      `;
      return;
    }

    // MULTIPLE CASES DETECTED! (e.g. Case 1, Case 2, Case 3, or SOR, EOR)
    if (bar) bar.style.display = "flex";
    if (label) {
      label.innerHTML = '<span>⚙️ Operating Cases:</span>';
    }

    const activeCase = state.selectedMatrixCase || "all";
    const totalCount = streams.length;

    container.innerHTML = "";

    // 1. All Cases Pill
    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = `matrix-case-pill ${activeCase === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `
      <span>🌐 All Cases</span>
      <span style="font-size: 10px; background: rgba(0,0,0,0.08); padding: 1px 6px; border-radius: 10px; font-weight: 700;">${totalCount}</span>
    `;
    allBtn.onclick = () => setMatrixCaseFilter("all");
    container.appendChild(allBtn);

    // 2. Individual Case Pills
    distinctCases.forEach(cName => {
      const count = caseMap.get(cName);
      const isAct = activeCase.toUpperCase() === cName.toUpperCase();
      let icon = '⚡';
      const upper = cName.toUpperCase();
      if (upper.includes('SOR') || upper.includes('START')) icon = '🟢';
      else if (upper.includes('EOR') || upper.includes('END')) icon = '🔴';
      else if (upper.includes('CASE 1') || upper.includes('RUN 1')) icon = '🔷';
      else if (upper.includes('CASE 2') || upper.includes('RUN 2')) icon = '🔶';
      else if (upper.includes('CASE 3') || upper.includes('RUN 3')) icon = '🟣';
      else if (upper.includes('TURNDOWN')) icon = '📉';
      else if (upper.includes('DESIGN')) icon = '📐';

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `matrix-case-pill ${isAct ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${icon} ${escapeHtml(cName)}</span>
        <span style="font-size: 10px; background: rgba(0,0,0,0.08); padding: 1px 6px; border-radius: 10px; font-weight: 700;">${count}</span>
      `;
      btn.onclick = () => setMatrixCaseFilter(cName);
      container.appendChild(btn);
    });

    // 3. Dynamically configure quick compare buttons based on actual detected cases
    const hasSor = distinctCases.some(c => c.toUpperCase() === 'SOR');
    const hasEor = distinctCases.some(c => c.toUpperCase() === 'EOR');
    if (btnCompareSorEor) {
      btnCompareSorEor.style.display = (hasSor && hasEor) ? "inline-flex" : "none";
    }

    const hasCase1 = distinctCases.some(c => c.toUpperCase() === 'CASE 1');
    const hasCase2 = distinctCases.some(c => c.toUpperCase() === 'CASE 2');
    if (btnCompareCases) {
      if (hasCase1 && hasCase2) {
        btnCompareCases.textContent = "⚖️ Compare Case 1 vs Case 2";
        btnCompareCases.onclick = () => compareCasesInMatrix('Case 1', 'Case 2');
        btnCompareCases.style.display = "inline-flex";
      } else if (distinctCases.length >= 2 && (!hasSor || !hasEor)) {
        const c1 = distinctCases[0];
        const c2 = distinctCases[1];
        btnCompareCases.textContent = `⚖️ Compare ${c1} vs ${c2}`;
        btnCompareCases.onclick = () => compareCasesInMatrix(c1, c2);
        btnCompareCases.style.display = "inline-flex";
      } else {
        btnCompareCases.style.display = "none";
      }
    }

    if (btnMultiCase) {
      const baseCounts = new Map();
      streams.forEach(s => {
        const b = s.baseStreamNo || s.streamNo;
        baseCounts.set(b, (baseCounts.get(b) || 0) + 1);
      });
      const hasSharedStreams = Array.from(baseCounts.values()).some(cnt => cnt > 1);
      btnMultiCase.style.display = hasSharedStreams ? "inline-flex" : "none";
    }
  }

  function setMatrixCaseFilter(caseName) {
    state.selectedMatrixCase = caseName;
    renderMatrixCasePills();

    // Filter view without forcing auto-selection; user selects streams manually or via action buttons
    renderMatrixChips();
    updateMatrixButtonsState();
    renderMatrixTable();
  }

  function renderMatrixChips(filterText = "") {
    const container = document.getElementById("matrixStreamChips");
    const badge = document.getElementById("matrixStreamCountBadge");
    if (!container) return;

    if (!state.currentDataset || !state.currentDataset.streams || state.currentDataset.streams.length === 0) {
      container.innerHTML = '<span style="font-size: 13px; color: #94a3b8; padding: 4px;">No streams loaded. Please upload a file above.</span>';
      if (badge) {
        badge.textContent = "0 Streams";
        badge.style.background = "#f1f5f9";
        badge.style.color = "#64748b";
      }
      return;
    }

    const allStreams = state.currentDataset.streams;
    const selectedCase = state.selectedMatrixCase || "all";

    // 1. Filter by Operating Case if a specific case is selected
    const caseFilteredStreams = (selectedCase !== "all")
      ? allStreams.filter(s => String(s.caseName || "").toUpperCase() === selectedCase.toUpperCase())
      : allStreams;

    const totalCount = caseFilteredStreams.length;
    const selectedSet = new Set(state.selectedMatrixStreams.map(String));
    const selectedInCaseCount = caseFilteredStreams.filter(s => selectedSet.has(String(s.streamNo))).length;

    if (badge) {
      const caseSuffix = selectedCase !== "all" ? ` [${selectedCase}]` : "";
      if (selectedInCaseCount === totalCount && totalCount > 0) {
        badge.textContent = `All ${totalCount} Streams Displayed${caseSuffix}`;
        badge.style.background = "#e0e7ff";
        badge.style.color = "#3730a3";
      } else if (state.selectedMatrixStreams.length === 2) {
        badge.textContent = `⚖️ 2 Streams (Direct Differential Mode)`;
        badge.style.background = "#dcfce7";
        badge.style.color = "#166534";
      } else if (selectedInCaseCount === 0) {
        badge.textContent = `0 Streams Selected${caseSuffix}`;
        badge.style.background = "#fee2e2";
        badge.style.color = "#991b1b";
      } else {
        badge.textContent = `${selectedInCaseCount} of ${totalCount} Streams Selected${caseSuffix}`;
        badge.style.background = "#f1f5f9";
        badge.style.color = "#334155";
      }
    }

    const q = (typeof filterText === "string" ? filterText : (state.matrixChipFilter || "")).trim().toLowerCase();
    const visibleStreams = q
      ? caseFilteredStreams.filter(s => 
          String(s.streamNo).toLowerCase().includes(q) || 
          String(s.baseStreamNo || "").toLowerCase().includes(q) ||
          String(s.content || s.streamName || "").toLowerCase().includes(q) ||
          String(s.caseName || "").toLowerCase().includes(q)
        )
      : caseFilteredStreams;

    if (visibleStreams.length === 0) {
      container.innerHTML = `<span style="font-size: 12.5px; color: #94a3b8; padding: 6px;">No streams matching "${escapeHtml(filterText)}" in ${selectedCase !== 'all' ? selectedCase : 'dataset'}</span>`;
      return;
    }

    const CHIP_RENDER_LIMIT = 150;
    const chipsToRender = visibleStreams.slice(0, CHIP_RENDER_LIMIT);
    const hasMoreChips = visibleStreams.length > CHIP_RENDER_LIMIT;

    let chipsHtml = chipsToRender.map(s => {
      const isChecked = selectedSet.has(String(s.streamNo));
      const desc = s.content || s.streamName || '';
      const cName = s.caseName || '';
      const cType = cName.toUpperCase().includes('SOR') ? 'sor' : (cName.toUpperCase().includes('EOR') ? 'eor' : 'case');
      const caseBadge = (selectedCase === "all" && cName) ? `<span class="stream-case-badge stream-case-badge-${cType}">${escapeHtml(cName)}</span>` : '';
      const displayTag = selectedCase !== "all" ? escapeHtml(s.baseStreamNo || s.streamNo) : escapeHtml(s.streamNo);

      return `
        <label class="matrix-stream-chip ${isChecked ? 'active' : ''}">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.StreamComparator.toggleMatrixStream('${escapeHtml(s.streamNo)}')" />
          <span><strong>Stream ${displayTag}</strong>${caseBadge}${desc ? ` (${escapeHtml(desc)})` : ''}</span>
        </label>
      `;
    }).join("");

    if (hasMoreChips) {
      chipsHtml += `<span style="font-size: 12px; color: #64748b; padding: 5px 10px; align-self: center; background: #f1f5f9; border-radius: 6px;">+ ${visibleStreams.length - CHIP_RENDER_LIMIT} more streams (use filter 🔍 above to locate specific streams)</span>`;
    }

    container.innerHTML = chipsHtml;
  }

  function filterMatrixChips(query) {
    state.matrixChipFilter = query;
    renderMatrixChips(query);
  }

  function updateMatrixButtonsState() {
    const btnSelectAll = document.getElementById("btnMatrixSelectAll");
    if (btnSelectAll && state.currentDataset && state.currentDataset.streams) {
      const selectedCase = state.selectedMatrixCase || "all";
      const targetStreams = (selectedCase !== "all")
        ? state.currentDataset.streams.filter(s => String(s.caseName || "").toUpperCase() === selectedCase.toUpperCase())
        : state.currentDataset.streams;

      const total = targetStreams.length;
      const targetNos = targetStreams.map(s => s.streamNo);
      const selectedSet = new Set(state.selectedMatrixStreams.map(String));
      const allSelected = total > 0 && targetNos.every(no => selectedSet.has(String(no)));

      if (total > 0 && allSelected) {
        btnSelectAll.classList.add("active");
        btnSelectAll.innerHTML = "✓ Deselect All";
        btnSelectAll.title = "Click to unselect all streams in matrix";
      } else {
        btnSelectAll.classList.remove("active");
        btnSelectAll.innerHTML = "✓ Select All";
        btnSelectAll.title = "Click to select all streams in matrix";
      }
    }
  }

  function toggleMatrixStream(streamNo) {
    const sId = String(streamNo);
    const idx = state.selectedMatrixStreams.findIndex(x => String(x) === sId);
    if (idx > -1) {
      state.selectedMatrixStreams.splice(idx, 1);
    } else {
      state.selectedMatrixStreams.push(streamNo);
    }
    updateMatrixButtonsState();
    renderMatrixChips();
    renderMatrixTable();
  }

  function selectAllMatrixStreams() {
    if (!state.currentDataset || !state.currentDataset.streams) return;
    const selectedCase = state.selectedMatrixCase || "all";
    const targetStreams = (selectedCase !== "all")
      ? state.currentDataset.streams.filter(s => String(s.caseName || "").toUpperCase() === selectedCase.toUpperCase())
      : state.currentDataset.streams;

    const targetNos = targetStreams.map(s => s.streamNo);
    const selectedSet = new Set(state.selectedMatrixStreams.map(String));
    const allTargetSelected = targetNos.length > 0 && targetNos.every(no => selectedSet.has(String(no)));

    if (allTargetSelected) {
      // Toggle off target streams
      state.selectedMatrixStreams = state.selectedMatrixStreams.filter(no => !targetNos.includes(no));
      updateMatrixButtonsState();
      renderMatrixChips();
      renderMatrixTable();
    } else {
      // Add missing target streams
      const newSet = new Set([...state.selectedMatrixStreams, ...targetNos]);
      state.selectedMatrixStreams = Array.from(newSet);
      updateMatrixButtonsState();
      renderMatrixChips();

      if (targetNos.length > 8) {
        showLoadingState(true, "Building Stream Matrix...", `Rendering ${state.selectedMatrixStreams.length} selected streams...`);
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              renderMatrixTable();
            } finally {
              showLoadingState(false);
            }
          }, 15);
        });
      } else {
        renderMatrixTable();
      }
    }
  }

  function clearMatrixStreams() {
    state.selectedMatrixStreams = [];
    updateMatrixButtonsState();
    renderMatrixChips();
    renderMatrixTable();
  }

  function selectComparePairMatrix() {
    if (!state.currentDataset) return;
    const sA = state.streamA ? state.streamA.streamNo : (state.currentDataset.streams[0]?.streamNo || "");
    const sB = state.streamB ? state.streamB.streamNo : (state.currentDataset.streams[1]?.streamNo || "");

    if (sA && sB && sA !== sB) {
      state.selectedMatrixStreams = [sA, sB];
    } else if (state.currentDataset.streams.length >= 2) {
      state.selectedMatrixStreams = [state.currentDataset.streams[0].streamNo, state.currentDataset.streams[1].streamNo];
    } else if (state.currentDataset.streams.length === 1) {
      state.selectedMatrixStreams = [state.currentDataset.streams[0].streamNo];
    }
    updateMatrixButtonsState();
    renderMatrixChips();
    renderMatrixTable();
  }

  function compareCasesInMatrix(caseA = "SOR", caseB = "EOR") {
    if (!state.currentDataset || !state.currentDataset.streams) return;
    const streams = state.currentDataset.streams;
    const streamsA = streams.filter(s => String(s.caseName || "").toUpperCase() === String(caseA).toUpperCase());
    const streamsB = streams.filter(s => String(s.caseName || "").toUpperCase() === String(caseB).toUpperCase());

    if (streamsA.length === 0 || streamsB.length === 0) {
      showNotification(`Dataset does not contain both "${caseA}" and "${caseB}" streams to compare.`, true);
      return;
    }

    // Match pairs by baseStreamNo
    const pairs = [];
    streamsA.forEach(sA => {
      const matchB = streamsB.find(sB => String(sB.baseStreamNo || sB.streamNo).toUpperCase() === String(sA.baseStreamNo || sA.streamNo).toUpperCase());
      if (matchB) {
        pairs.push(sA.streamNo);
        pairs.push(matchB.streamNo);
      }
    });

    if (pairs.length === 0) {
      pairs.push(streamsA[0].streamNo, streamsB[0].streamNo);
    }

    // Select paired streams
    state.selectedMatrixStreams = pairs.slice(0, Math.min(pairs.length, 8));
    state.selectedMatrixCase = "all"; // show all so both cases are visible

    renderMatrixCasePills();
    renderMatrixChips();
    updateMatrixButtonsState();
    renderMatrixTable();
    showNotification(`Selected ${state.selectedMatrixStreams.length} streams comparing ${caseA} vs ${caseB} side-by-side in matrix.`);
  }

  function promptSelectStreamAcrossCases() {
    if (!state.currentDataset || !state.currentDataset.streams) return;
    const streams = state.currentDataset.streams;
    const baseMap = new Map();
    streams.forEach(s => {
      const b = s.baseStreamNo || s.streamNo;
      if (!baseMap.has(b)) baseMap.set(b, []);
      baseMap.get(b).push(s);
    });

    const multiCaseBases = Array.from(baseMap.entries()).filter(([b, list]) => list.length > 1);
    const chosenBase = (multiCaseBases.length > 0 ? multiCaseBases[0][0] : Array.from(baseMap.keys())[0]);

    if (!chosenBase) {
      showNotification("No streams available.", true);
      return;
    }

    const matchedStreams = baseMap.get(chosenBase) || [];
    state.selectedMatrixStreams = matchedStreams.map(s => s.streamNo);
    state.selectedMatrixCase = "all";

    renderMatrixCasePills();
    renderMatrixChips();
    updateMatrixButtonsState();
    renderMatrixTable();
    showNotification(`Displaying Stream ${chosenBase} across ${matchedStreams.length} operating cases side-by-side.`);
  }

  // Quick Compare Cases in Pairwise View
  function quickCompareCase(caseA = "SOR", caseB = "EOR") {
    if (!state.currentDataset || !state.currentDataset.streams) return;
    const streams = state.currentDataset.streams;

    const streamsA = streams.filter(s => String(s.caseName || "").toUpperCase() === String(caseA).toUpperCase());
    const streamsB = streams.filter(s => String(s.caseName || "").toUpperCase() === String(caseB).toUpperCase());

    if (streamsA.length === 0 || streamsB.length === 0) {
      showNotification(`Dataset does not contain both "${caseA}" and "${caseB}" cases.`, true);
      return;
    }

    const currentBase = state.streamA?.baseStreamNo || streamsA[0].baseStreamNo;
    const targetA = streamsA.find(s => (s.baseStreamNo || s.streamNo) === currentBase) || streamsA[0];
    const targetB = streamsB.find(s => (s.baseStreamNo || s.streamNo) === (targetA.baseStreamNo || targetA.streamNo)) || streamsB[0];

    state.streamA = targetA;
    state.streamB = targetB;
    state.caseFilterA = caseA;
    state.caseFilterB = caseB;

    populateCaseFilterSelects();
    populateStreamDropdowns();

    const selA = document.getElementById("streamSelectA");
    const selB = document.getElementById("streamSelectB");
    if (selA) selA.value = targetA.streamNo;
    if (selB) selB.value = targetB.streamNo;

    runComparison();
    showNotification(`Now comparing Stream ${targetA.baseStreamNo || targetA.streamNo}: ${caseA} vs ${caseB}.`);
  }

  function onCaseFilterChange(target, caseName) {
    if (target === "A") {
      state.caseFilterA = caseName;
    } else {
      state.caseFilterB = caseName;
    }
    populateStreamDropdowns();
    onStreamChange();
  }

  function populateCaseFilterSelects() {
    const bar = document.getElementById("pairwiseCaseActionBar");
    const btnsContainer = document.getElementById("pairwiseQuickCompareButtons");
    const selA = document.getElementById("caseFilterSelectA");
    const selB = document.getElementById("caseFilterSelectB");
    if (!selA || !selB) return;

    if (!state.currentDataset || !state.currentDataset.streams) {
      if (bar) bar.style.display = "none";
      selA.innerHTML = '<option value="all">All Cases</option>';
      selB.innerHTML = '<option value="all">All Cases</option>';
      return;
    }

    const cases = Array.from(new Set(state.currentDataset.streams.map(s => s.caseName).filter(Boolean)));

    if (cases.length <= 1) {
      if (bar) bar.style.display = "none";
      selA.innerHTML = '<option value="all">All Cases</option>';
      selB.innerHTML = '<option value="all">All Cases</option>';
      state.caseFilterA = "all";
      state.caseFilterB = "all";
      return;
    }

    // Multiple cases present: show the bar!
    if (bar) bar.style.display = "flex";

    let optionsHtml = '<option value="all">All Cases</option>';
    cases.forEach(c => {
      optionsHtml += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
    });

    selA.innerHTML = optionsHtml;
    selB.innerHTML = optionsHtml;

    selA.value = (state.caseFilterA && cases.includes(state.caseFilterA)) ? state.caseFilterA : "all";
    selB.value = (state.caseFilterB && cases.includes(state.caseFilterB)) ? state.caseFilterB : "all";

    // Dynamically render pairwise quick compare buttons based on detected cases
    if (btnsContainer) {
      let btnsHtml = "";
      const hasSor = cases.some(c => c.toUpperCase() === 'SOR');
      const hasEor = cases.some(c => c.toUpperCase() === 'EOR');
      if (hasSor && hasEor) {
        btnsHtml += `
          <button type="button" class="stream-filter-btn" style="font-size: 12px; padding: 4px 10px; background: #eff6ff; border-color: #bfdbfe; color: #1e40af; font-weight: 600;" onclick="window.StreamComparator.quickCompareCase('SOR', 'EOR')" title="Compare active stream between Start of Run (SOR) and End of Run (EOR)">
            🔄 Compare SOR vs EOR
          </button>
        `;
      }
      const hasCase1 = cases.some(c => c.toUpperCase() === 'CASE 1');
      const hasCase2 = cases.some(c => c.toUpperCase() === 'CASE 2');
      const hasCase3 = cases.some(c => c.toUpperCase() === 'CASE 3');
      if (hasCase1 && hasCase2) {
        btnsHtml += `
          <button type="button" class="stream-filter-btn" style="font-size: 12px; padding: 4px 10px; background: #f0fdf4; border-color: #bbf7d0; color: #166534; font-weight: 600;" onclick="window.StreamComparator.quickCompareCase('Case 1', 'Case 2')" title="Compare active stream between Case 1 and Case 2">
            🔄 Compare Case 1 vs Case 2
          </button>
        `;
      }
      if (hasCase1 && hasCase3) {
        btnsHtml += `
          <button type="button" class="stream-filter-btn" style="font-size: 12px; padding: 4px 10px; background: #fdf4ff; border-color: #f5d0fe; color: #86198f; font-weight: 600;" onclick="window.StreamComparator.quickCompareCase('Case 1', 'Case 3')" title="Compare active stream between Case 1 and Case 3">
            🔄 Compare Case 1 vs Case 3
          </button>
        `;
      }
      if (!hasSor && !hasCase1 && cases.length >= 2) {
        const c1 = cases[0];
        const c2 = cases[1];
        btnsHtml += `
          <button type="button" class="stream-filter-btn" style="font-size: 12px; padding: 4px 10px; background: #f0fdf4; border-color: #bbf7d0; color: #166534; font-weight: 600;" onclick="window.StreamComparator.quickCompareCase('${escapeHtml(c1)}', '${escapeHtml(c2)}')">
            🔄 Compare ${escapeHtml(c1)} vs ${escapeHtml(c2)}
          </button>
        `;
      }
      btnsContainer.innerHTML = btnsHtml;
    }
  }

  const MAX_MATRIX_RENDER_STREAMS = 20;

  function renderMatrixTable() {
    const table = document.getElementById("streamMatrixTable");
    if (!table || !state.currentDataset) return;

    const allStreams = state.currentDataset.streams;
    const selectedSet = new Set(state.selectedMatrixStreams.map(String));
    const allSelected = allStreams.filter(s => selectedSet.has(String(s.streamNo)));

    if (allSelected.length === 0) {
      table.innerHTML = `
        <tbody>
          <tr>
            <td colspan="4" style="text-align: center; padding: 40px; color: #64748b; font-size: 14.5px;">
              🔍 <strong>No streams selected for matrix view.</strong><br>
              <span style="font-size: 13px; color: #94a3b8;">Please select streams above or click <em>"✓ Select All"</em> or <em>"⚖️ Compare Selected 2 Streams"</em>.</span>
            </td>
          </tr>
        </tbody>
      `;
      return;
    }

    // SPECIAL 2-STREAM COMPARISON FEATURE INSIDE MATRIX
    if (allSelected.length === 2) {
      renderTwoStreamMatrix(table, allSelected[0], allSelected[1]);
      return;
    }

    // Window / limit streams to MAX_MATRIX_RENDER_STREAMS to prevent browser freeze
    const isLimited = allSelected.length > MAX_MATRIX_RENDER_STREAMS;
    const streams = isLimited ? allSelected.slice(0, MAX_MATRIX_RENDER_STREAMS) : allSelected;

    let warningBanner = "";
    if (isLimited) {
      warningBanner = `
        <tr style="background: #fffbeb; border-bottom: 2px solid #fde68a;">
          <td colspan="${streams.length + 1}" style="padding: 10px 14px; font-size: 12.5px; color: #92400e; font-weight: 600;">
            ⚠️ <strong>Displaying first ${MAX_MATRIX_RENDER_STREAMS} of ${allSelected.length} selected streams</strong> to ensure instant smooth scrolling and prevent browser freeze. Use the filter chips above to select specific streams to inspect, or click <em>"📊 Export Matrix (.xlsx)"</em> to export all ${allSelected.length} streams to Excel.
          </td>
        </tr>
      `;
    }

    // MULTI-STREAM (1, 3, 4, 5+ streams) VIEW
    if (state.activeMode === "combined") {
      const allPropKeys = new Set();
      const allComponents = new Set();
      streams.forEach(s => {
        Object.keys(s.properties || {}).forEach(k => allPropKeys.add(k));
        Object.keys(s.components || {}).forEach(c => allComponents.add(c));
      });
      const propList = Array.from(allPropKeys);
      const compList = Array.from(allComponents);

      let theadHtml = `
        ${warningBanner}
        <tr>
          <th style="min-width: 220px;">Stream Parameter / Component</th>
          ${streams.map(s => `<th class="num" style="min-width: 140px; font-size: 15px;">Stream ${escapeHtml(s.streamNo)}</th>`).join("")}
        </tr>
        <tr style="background: #f1f5f9;">
          <td><strong>Content / Description</strong></td>
          ${streams.map(s => `<td class="num"><strong>${escapeHtml(s.content || s.streamName || '-')}</strong></td>`).join("")}
        </tr>
      `;

      let tbodyHtml = `
        <tr style="background: #e0f2fe; border-top: 3px solid #0284c7; border-bottom: 2px solid #bae6fd;">
          <td colspan="${streams.length + 1}" style="font-weight: 800; color: #0369a1; padding: 10px 14px; font-size: 13.5px; text-transform: uppercase;">
            ⚡ Section 1: Physical & Thermodynamic Properties (${propList.length} Parameters)
          </td>
        </tr>
      `;

      tbodyHtml += propList.map(prop => {
        return `
          <tr>
            <td><strong>${escapeHtml(prop)}</strong></td>
            ${streams.map(s => {
              const val = s.properties?.[prop];
              if (val === undefined || val === null || val === "") return `<td class="num" style="color: #94a3b8;">-</td>`;
              const numVal = parseFloat(String(val).replace(/,/g, ""));
              const display = !isNaN(numVal) && typeof val === "number" ? (numVal >= 100 ? formatNum(numVal, 1) : numVal.toFixed(3)) : val;
              return `<td class="num">${escapeHtml(display)}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("");

      tbodyHtml += `
        <tr style="background: #dcfce7; border-top: 3px solid #16a34a; border-bottom: 2px solid #bbf7d0;">
          <td colspan="${streams.length + 1}" style="font-weight: 800; color: #15803d; padding: 10px 14px; font-size: 13.5px; text-transform: uppercase;">
            🧪 Section 2: Chemical Component Breakdown (kg/hr) (${compList.length} Components)
          </td>
        </tr>
      `;

      tbodyHtml += compList.map(comp => {
        return `
          <tr>
            <td><strong>${escapeHtml(comp)}</strong></td>
            ${streams.map(s => {
              const val = s.components?.[comp];
              const numVal = Number(val) || 0;
              return `<td class="num">${numVal > 0 ? formatNum(numVal) : '<span style="color:#94a3b8;">-</span>'}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    } else if (state.activeMode === "properties") {
      const allPropKeys = new Set();
      streams.forEach(s => {
        Object.keys(s.properties || {}).forEach(k => allPropKeys.add(k));
      });
      const propList = Array.from(allPropKeys);

      let theadHtml = `
        ${warningBanner}
        <tr>
          <th style="min-width: 220px;">Stream No</th>
          ${streams.map(s => `<th class="num" style="min-width: 130px; font-size: 15px;">${escapeHtml(s.streamNo)}</th>`).join("")}
        </tr>
        <tr style="background: #f1f5f9;">
          <td><strong>Content / Description</strong></td>
          ${streams.map(s => `<td class="num"><strong>${escapeHtml(s.content || s.streamName || '-')}</strong></td>`).join("")}
        </tr>
      `;

      let tbodyHtml = propList.map(prop => {
        return `
          <tr>
            <td><strong>${escapeHtml(prop)}</strong></td>
            ${streams.map(s => {
              const val = s.properties?.[prop];
              if (val === undefined || val === null || val === "") return `<td class="num" style="color: #94a3b8;">-</td>`;
              const numVal = parseFloat(String(val).replace(/,/g, ""));
              const display = !isNaN(numVal) && typeof val === "number" ? (numVal >= 100 ? formatNum(numVal, 1) : numVal.toFixed(3)) : val;
              return `<td class="num">${escapeHtml(display)}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    } else {
      const allComponents = new Set();
      streams.forEach(s => {
        Object.keys(s.components || {}).forEach(c => allComponents.add(c));
      });

      const compList = Array.from(allComponents);

      let theadHtml = `
        ${warningBanner}
        <tr>
          <th style="min-width: 180px;">Stream No</th>
          ${streams.map(s => `<th class="num" style="min-width: 120px;">${escapeHtml(s.streamNo)}</th>`).join("")}
        </tr>
        <tr style="background: #f1f5f9;">
          <td><strong>Mass Flow (kg/hr)</strong></td>
          ${streams.map(s => `<td class="num"><strong>${formatNum(s.massFlow)}</strong></td>`).join("")}
        </tr>
        <tr style="background: #f8fafc;">
          <td>Molar Flow (kg-mol/hr)</td>
          ${streams.map(s => `<td class="num">${s.molarFlow ? formatNum(s.molarFlow, 2) : '-'}</td>`).join("")}
        </tr>
        <tr style="background: #f8fafc;">
          <td>Std. Vapor Flow (Nm³/hr)</td>
          ${streams.map(s => `<td class="num">${s.stdVaporFlow ? formatNum(s.stdVaporFlow, 1) : '-'}</td>`).join("")}
        </tr>
        <tr style="background: #fff7ed; font-weight: 600;">
          <td style="color: #c2410c;">🌡️ Operating Temperature (°C)</td>
          ${streams.map(s => {
            const t = s.tempC ?? s.properties?.["Temperature (°C)"] ?? s.properties?.["Temperature"] ?? null;
            return `<td class="num" style="color: #c2410c; font-weight: 700;">${t !== null && t !== undefined && t !== "" ? `${t} °C` : '<span style="color:#94a3b8;font-weight:normal;">-</span>'}</td>`;
          }).join("")}
        </tr>
        <tr style="background: #f0fdf4; font-weight: 600;">
          <td style="color: #15803d;">⏱️ Operating Pressure (kg/cm²g)</td>
          ${streams.map(s => {
            const p = s.pressKgCm2 ?? s.properties?.["Pressure (kg/cm²g)"] ?? s.properties?.["Pressure (kg/cm2 (g))"] ?? null;
            return `<td class="num" style="color: #15803d; font-weight: 700;">${p !== null && p !== undefined && p !== "" ? `${p} kg/cm²` : '<span style="color:#94a3b8;font-weight:normal;">-</span>'}</td>`;
          }).join("")}
        </tr>
        <tr style="background: #e2e8f0; font-weight: bold;">
          <th colspan="${streams.length + 1}">Component Flow Rates (kg/hr)</th>
        </tr>
      `;

      let tbodyHtml = compList.map(comp => {
        return `
          <tr>
            <td><strong>${escapeHtml(comp)}</strong></td>
            ${streams.map(s => {
              const val = s.components?.[comp];
              const numVal = Number(val) || 0;
              return `<td class="num">${numVal > 0 ? formatNum(numVal) : '<span style="color:#94a3b8;">-</span>'}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    }
  }

  function renderTwoStreamMatrix(table, s1, s2) {
    if (state.activeMode === "combined") {
      const props1 = s1.properties || {};
      const props2 = s2.properties || {};
      const allPropKeys = Array.from(new Set([...Object.keys(props1), ...Object.keys(props2)]));

      const comps1 = s1.components || {};
      const comps2 = s2.components || {};
      const allComps = Array.from(new Set([...Object.keys(comps1), ...Object.keys(comps2)]));

      let theadHtml = `
        <tr style="background: #eef2ff;">
          <th colspan="6" style="padding: 10px 16px; color: #3730a3; font-size: 13.5px; text-align: left;">
            ⚖️ Unified 2-Stream Comparison (Properties & Components): <strong>Stream ${s1.streamNo} (${s1.content || s1.streamName || ''})</strong> vs <strong>Stream ${s2.streamNo} (${s2.content || s2.streamName || ''})</strong>
          </th>
        </tr>
        <tr>
          <th style="min-width: 220px;">Parameter / Component</th>
          <th style="min-width: 110px;">Category</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s1.streamNo}</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s2.streamNo}</th>
          <th class="num" style="min-width: 140px;">Variance Δ (${s2.streamNo} - ${s1.streamNo})</th>
          <th style="min-width: 150px;">Status (Variance / Deviation)</th>
        </tr>
      `;

      let tbodyHtml = `
        <tr style="background: #e0f2fe; border-top: 3px solid #0284c7; border-bottom: 2px solid #bae6fd;">
          <td colspan="6" style="font-weight: 800; color: #0369a1; padding: 10px 14px; font-size: 13px; text-transform: uppercase;">
            ⚡ Section 1: Physical & Thermodynamic Properties (${allPropKeys.length} Parameters)
          </td>
        </tr>
      `;

      tbodyHtml += allPropKeys.map(prop => {
        const val1 = props1[prop];
        const val2 = props2[prop];
        const num1 = typeof val1 === "number" ? val1 : parseFloat(String(val1 || "").replace(/,/g, ""));
        const num2 = typeof val2 === "number" ? val2 : parseFloat(String(val2 || "").replace(/,/g, ""));
        const isNum = !isNaN(num1) && !isNaN(num2);

        let deltaStr = "-";
        let statusBadge = `<span class="badge-status badge-equal">= IDENTICAL</span>`;
        let deltaClass = "diff-neutral";

        if (isNum) {
          const delta = num2 - num1;
          const pct = num1 !== 0 ? (delta / Math.abs(num1)) * 100 : (num2 > 0 ? 100 : 0);
          const formattedDelta = delta >= 0 ? `+${Math.abs(delta) >= 100 ? formatNum(delta, 1) : delta.toFixed(3)}` : `${Math.abs(delta) >= 100 ? formatNum(delta, 1) : delta.toFixed(3)}`;
          deltaStr = `<strong>${formattedDelta}</strong> <span style="font-size: 11px; opacity: 0.85;">(${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>`;

          if (delta > 0.0001) {
            deltaClass = "diff-positive";
            statusBadge = `<span class="badge-status badge-increased">▲ INCREASED (+${pct.toFixed(1)}%)</span>`;
          } else if (delta < -0.0001) {
            deltaClass = "diff-negative";
            statusBadge = `<span class="badge-status badge-decreased">▼ DECREASED (${pct.toFixed(1)}%)</span>`;
          }
        } else if (String(val1).trim() !== String(val2).trim()) {
          statusBadge = `<span class="badge-status badge-new">✦ VARIED</span>`;
        }

        const dispVal1 = isNum && typeof num1 === "number" ? (num1 >= 100 ? formatNum(num1, 1) : num1.toFixed(3)) : (val1 ?? "-");
        const dispVal2 = isNum && typeof num2 === "number" ? (num2 >= 100 ? formatNum(num2, 1) : num2.toFixed(3)) : (val2 ?? "-");

        return `
          <tr>
            <td><strong>${prop}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${categorizeProperty(prop)}</td>
            <td class="num">${dispVal1}</td>
            <td class="num"><strong>${dispVal2}</strong></td>
            <td class="num ${deltaClass}">${deltaStr}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join("");

      tbodyHtml += `
        <tr style="background: #dcfce7; border-top: 3px solid #16a34a; border-bottom: 2px solid #bbf7d0;">
          <td colspan="6" style="font-weight: 800; color: #15803d; padding: 10px 14px; font-size: 13px; text-transform: uppercase;">
            🧪 Section 2: Chemical Component Breakdown (kg/hr) (${allComps.length} Components)
          </td>
        </tr>
      `;

      tbodyHtml += allComps.map(comp => {
        const val1 = Number(comps1[comp]) || 0;
        const val2 = Number(comps2[comp]) || 0;
        const delta = val2 - val1;
        const pct = val1 > 0 ? (delta / val1) * 100 : (val2 > 0 ? 100 : 0);

        let deltaClass = "diff-neutral";
        let statusBadge = `<span class="badge-status badge-equal">= IDENTICAL</span>`;

        if (val1 === 0 && val2 > 0) {
          deltaClass = "diff-positive";
          statusBadge = `<span class="badge-status badge-new">✨ NEW IN ${s2.streamNo}</span>`;
        } else if (val1 > 0 && val2 === 0) {
          deltaClass = "diff-negative";
          statusBadge = `<span class="badge-status badge-removed">❌ REMOVED / ZERO</span>`;
        } else if (delta > 0.001) {
          deltaClass = "diff-positive";
          statusBadge = `<span class="badge-status badge-increased">▲ INCREASED (+${pct.toFixed(1)}%)</span>`;
        } else if (delta < -0.001) {
          deltaClass = "diff-negative";
          statusBadge = `<span class="badge-status badge-decreased">▼ DECREASED (${pct.toFixed(1)}%)</span>`;
        }

        const deltaStr = `<strong>${delta >= 0 ? '+' : ''}${formatNum(delta)}</strong> <span style="font-size: 11px; opacity: 0.85;">(${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>`;

        return `
          <tr>
            <td><strong>${comp}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${categorizeComponent(comp)}</td>
            <td class="num">${val1 > 0 ? formatNum(val1) : '<span style="color:#94a3b8;">0</span>'}</td>
            <td class="num"><strong>${val2 > 0 ? formatNum(val2) : '<span style="color:#94a3b8;">0</span>'}</strong></td>
            <td class="num ${deltaClass}">${deltaStr}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    } else if (state.activeMode === "properties") {
      const props1 = s1.properties || {};
      const props2 = s2.properties || {};
      const allPropKeys = Array.from(new Set([...Object.keys(props1), ...Object.keys(props2)]));

      let theadHtml = `
        <tr style="background: #eef2ff;">
          <th colspan="6" style="padding: 10px 16px; color: #3730a3; font-size: 13.5px; text-align: left;">
            ⚖️ Direct 2-Stream Comparison: <strong>Stream ${s1.streamNo} (${s1.content || s1.streamName || ''})</strong> vs <strong>Stream ${s2.streamNo} (${s2.content || s2.streamName || ''})</strong>
          </th>
        </tr>
        <tr>
          <th style="min-width: 220px;">Physical / Thermodynamic Property</th>
          <th style="min-width: 110px;">Category</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s1.streamNo}</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s2.streamNo}</th>
          <th class="num" style="min-width: 130px;">Variance Δ (${s2.streamNo} - ${s1.streamNo})</th>
          <th style="min-width: 150px;">Status (Variance / Deviation)</th>
        </tr>
      `;

      let tbodyHtml = allPropKeys.map(prop => {
        const val1 = props1[prop];
        const val2 = props2[prop];
        const num1 = typeof val1 === "number" ? val1 : parseFloat(String(val1 || "").replace(/,/g, ""));
        const num2 = typeof val2 === "number" ? val2 : parseFloat(String(val2 || "").replace(/,/g, ""));
        const isNum = !isNaN(num1) && !isNaN(num2);

        let deltaStr = "-";
        let statusBadge = `<span class="badge-status badge-equal">= IDENTICAL</span>`;
        let deltaClass = "diff-neutral";

        if (isNum) {
          const delta = num2 - num1;
          const pct = num1 !== 0 ? (delta / Math.abs(num1)) * 100 : (num2 > 0 ? 100 : 0);
          const formattedDelta = delta >= 0 ? `+${Math.abs(delta) >= 100 ? formatNum(delta, 1) : delta.toFixed(3)}` : `${Math.abs(delta) >= 100 ? formatNum(delta, 1) : delta.toFixed(3)}`;
          deltaStr = `<strong>${formattedDelta}</strong> <span style="font-size: 11px; opacity: 0.85;">(${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>`;

          if (delta > 0.0001) {
            deltaClass = "diff-positive";
            statusBadge = `<span class="badge-status badge-increased">▲ INCREASED (+${pct.toFixed(1)}%)</span>`;
          } else if (delta < -0.0001) {
            deltaClass = "diff-negative";
            statusBadge = `<span class="badge-status badge-decreased">▼ DECREASED (${pct.toFixed(1)}%)</span>`;
          }
        } else if (String(val1).trim() !== String(val2).trim()) {
          statusBadge = `<span class="badge-status badge-new">✦ VARIED</span>`;
        }

        const dispVal1 = isNum && typeof num1 === "number" ? (num1 >= 100 ? formatNum(num1, 1) : num1.toFixed(3)) : (val1 ?? "-");
        const dispVal2 = isNum && typeof num2 === "number" ? (num2 >= 100 ? formatNum(num2, 1) : num2.toFixed(3)) : (val2 ?? "-");

        return `
          <tr>
            <td><strong>${prop}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${categorizeProperty(prop)}</td>
            <td class="num">${dispVal1}</td>
            <td class="num"><strong>${dispVal2}</strong></td>
            <td class="num ${deltaClass}">${deltaStr}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    } else {
      const comps1 = s1.components || {};
      const comps2 = s2.components || {};
      const allComps = Array.from(new Set([...Object.keys(comps1), ...Object.keys(comps2)]));

      let theadHtml = `
        <tr style="background: #eef2ff;">
          <th colspan="6" style="padding: 10px 16px; color: #3730a3; font-size: 13.5px; text-align: left;">
            ⚖️ Direct 2-Stream Comparison: <strong>Stream ${s1.streamNo}</strong> vs <strong>Stream ${s2.streamNo}</strong>
          </th>
        </tr>
        <tr>
          <th style="min-width: 180px;">Component</th>
          <th style="min-width: 110px;">Category</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s1.streamNo} (kg/hr)</th>
          <th class="num" style="min-width: 140px; font-size: 14px;">Stream ${s2.streamNo} (kg/hr)</th>
          <th class="num" style="min-width: 140px;">Variance Δ (${s2.streamNo} - ${s1.streamNo})</th>
          <th style="min-width: 150px;">Status (Variance / Deviation)</th>
        </tr>
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td>Total Mass Flow Rate</td>
          <td style="color: #64748b; font-size: 12px;">Overall Balance</td>
          <td class="num">${formatNum(s1.massFlow)} kg/hr</td>
          <td class="num">${formatNum(s2.massFlow)} kg/hr</td>
          <td class="num ${s2.massFlow >= s1.massFlow ? 'diff-positive' : 'diff-negative'}">
            ${s2.massFlow >= s1.massFlow ? '+' : ''}${formatNum(s2.massFlow - s1.massFlow)} kg/hr
          </td>
          <td>
            <span class="badge-status ${s2.massFlow > s1.massFlow ? 'badge-increased' : s2.massFlow < s1.massFlow ? 'badge-decreased' : 'badge-equal'}">
              ${s2.massFlow > s1.massFlow ? '▲ HIGHER' : s2.massFlow < s1.massFlow ? '▼ LOWER' : '= IDENTICAL'}
            </span>
          </td>
        </tr>
        ${(() => {
          const t1 = s1.tempC ?? s1.properties?.["Temperature (°C)"] ?? s1.properties?.["Temperature"] ?? null;
          const t2 = s2.tempC ?? s2.properties?.["Temperature (°C)"] ?? s2.properties?.["Temperature"] ?? null;
          if (t1 === null && t2 === null) return "";
          const numT1 = t1 !== null && t1 !== "" ? Number(t1) : null;
          const numT2 = t2 !== null && t2 !== "" ? Number(t2) : null;
          const deltaT = numT1 !== null && numT2 !== null ? numT2 - numT1 : null;
          return `
            <tr style="background: #fff7ed; font-weight: bold;">
              <td style="color: #c2410c;">Operating Temperature</td>
              <td style="color: #c2410c; font-size: 12px;">Thermal Balance</td>
              <td class="num" style="color: #c2410c;">${numT1 !== null ? `${numT1} °C` : '-'}</td>
              <td class="num" style="color: #c2410c;">${numT2 !== null ? `${numT2} °C` : '-'}</td>
              <td class="num ${deltaT !== null && deltaT > 0 ? 'diff-positive' : deltaT !== null && deltaT < 0 ? 'diff-negative' : 'diff-neutral'}" style="color: #c2410c;">
                ${deltaT !== null ? `${deltaT >= 0 ? '+' : ''}${deltaT.toFixed(1)} °C` : '-'}
              </td>
              <td>
                ${deltaT !== null ? `<span class="badge-status ${deltaT > 0 ? 'badge-increased' : deltaT < 0 ? 'badge-decreased' : 'badge-equal'}">${deltaT > 0 ? '▲ HIGHER' : deltaT < 0 ? '▼ LOWER' : '= EQUAL'}</span>` : '-'}
              </td>
            </tr>
          `;
        })()}
        ${(() => {
          const p1 = s1.pressKgCm2 ?? s1.properties?.["Pressure (kg/cm²g)"] ?? s1.properties?.["Pressure (kg/cm2 (g))"] ?? null;
          const p2 = s2.pressKgCm2 ?? s2.properties?.["Pressure (kg/cm²g)"] ?? s2.properties?.["Pressure (kg/cm2 (g))"] ?? null;
          if (p1 === null && p2 === null) return "";
          const numP1 = p1 !== null && p1 !== "" ? Number(p1) : null;
          const numP2 = p2 !== null && p2 !== "" ? Number(p2) : null;
          const deltaP = numP1 !== null && numP2 !== null ? numP2 - numP1 : null;
          return `
            <tr style="background: #f0fdf4; font-weight: bold;">
              <td style="color: #15803d;">Operating Pressure</td>
              <td style="color: #15803d; font-size: 12px;">Line Hydraulics</td>
              <td class="num" style="color: #15803d;">${numP1 !== null ? `${numP1} kg/cm²` : '-'}</td>
              <td class="num" style="color: #15803d;">${numP2 !== null ? `${numP2} kg/cm²` : '-'}</td>
              <td class="num ${deltaP !== null && deltaP > 0 ? 'diff-positive' : deltaP !== null && deltaP < 0 ? 'diff-negative' : 'diff-neutral'}" style="color: #15803d;">
                ${deltaP !== null ? `${deltaP >= 0 ? '+' : ''}${deltaP.toFixed(2)} kg/cm²` : '-'}
              </td>
              <td>
                ${deltaP !== null ? `<span class="badge-status ${deltaP > 0 ? 'badge-increased' : deltaP < 0 ? 'badge-decreased' : 'badge-equal'}">${deltaP > 0 ? '▲ HIGHER' : deltaP < 0 ? '▼ LOWER' : '= EQUAL'}</span>` : '-'}
              </td>
            </tr>
          `;
        })()}
      `;

      let tbodyHtml = allComps.map(comp => {
        const val1 = Number(comps1[comp]) || 0;
        const val2 = Number(comps2[comp]) || 0;
        const delta = val2 - val1;
        const pct = val1 > 0 ? (delta / val1) * 100 : (val2 > 0 ? 100 : 0);

        let deltaClass = "diff-neutral";
        let statusBadge = `<span class="badge-status badge-equal">= IDENTICAL</span>`;

        if (val1 === 0 && val2 > 0) {
          deltaClass = "diff-positive";
          statusBadge = `<span class="badge-status badge-new">✨ NEW IN ${s2.streamNo}</span>`;
        } else if (val1 > 0 && val2 === 0) {
          deltaClass = "diff-negative";
          statusBadge = `<span class="badge-status badge-removed">❌ REMOVED / ZERO</span>`;
        } else if (delta > 0.001) {
          deltaClass = "diff-positive";
          statusBadge = `<span class="badge-status badge-increased">▲ INCREASED (+${pct.toFixed(1)}%)</span>`;
        } else if (delta < -0.001) {
          deltaClass = "diff-negative";
          statusBadge = `<span class="badge-status badge-decreased">▼ DECREASED (${pct.toFixed(1)}%)</span>`;
        }

        const deltaStr = `<strong>${delta >= 0 ? '+' : ''}${formatNum(delta)}</strong> <span style="font-size: 11px; opacity: 0.85;">(${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)</span>`;

        return `
          <tr>
            <td><strong>${comp}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${categorizeComponent(comp)}</td>
            <td class="num">${val1 > 0 ? formatNum(val1) : '<span style="color:#94a3b8;">0</span>'}</td>
            <td class="num"><strong>${val2 > 0 ? formatNum(val2) : '<span style="color:#94a3b8;">0</span>'}</strong></td>
            <td class="num ${deltaClass}">${deltaStr}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join("");

      table.innerHTML = `<thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody>`;
    }
  }

  // =========================================================================
  // 4. FILE UPLOAD & INGESTION (EXCEL, PDF, IMAGE)
  // =========================================================================
  function setupDropzone() {
    const dropzone = document.getElementById("streamDropzone");
    const fileInput = document.getElementById("streamFileInput");
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processUploadedFiles(Array.from(e.dataTransfer.files), state.isMergeUpload);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processUploadedFiles(Array.from(e.target.files), state.isMergeUpload);
      }
    });
  }

  function openMergeFileInput() {
    state.isMergeUpload = true;
    const fileInput = document.getElementById("streamFileInput");
    if (fileInput) {
      fileInput.click();
    }
  }

  function processUploadedFiles(files, isMerge = false) {
    if (!files || files.length === 0) return;
    state.isMergeUpload = false; // Reset flag after triggering

    const fileArr = Array.from(files);
    const allExcel = fileArr.every(f => {
      const n = f.name.toLowerCase();
      return n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv");
    });

    if (allExcel) {
      if (fileArr.length === 1) {
        showLoadingState(true, `${isMerge ? 'Merging' : 'Analyzing'} Excel document: ${fileArr[0].name}...`);
        parseExcelFile(fileArr[0], isMerge);
      } else {
        parseMultipleExcelFiles(fileArr, isMerge);
      }
      return;
    }

    if (fileArr.length === 1) {
      const file = fileArr[0];
      const name = file.name.toLowerCase();
      showLoadingState(true, `${isMerge ? 'Merging' : 'Analyzing'} document: ${file.name}...`);

      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
        parseExcelFile(file, isMerge);
      } else if (name.endsWith(".pdf") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
        parseDocumentViaGemini([file], isMerge);
      } else {
        showLoadingState(false);
        showNotification("Unsupported file format. Please upload an Excel (.xlsx, .xls, .csv), PDF (.pdf), or Image (.png, .jpg).", true);
      }
    } else {
      // Multiple files uploaded (e.g. Properties PDF + Components PDF or multi-page images)
      showLoadingState(true, `Fusing and correlating ${fileArr.length} documents into unified process dataset...`);
      parseDocumentViaGemini(fileArr, isMerge);
    }
  }

  function showNotification(msg, isError = false) {
    const rawMsg = String(msg || "").trim();
    if (!rawMsg) return;

    // Remove any previous active toast instantly
    const oldToast = document.getElementById("streamComparatorToast");
    if (oldToast) {
      oldToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = "streamComparatorToast";
    toast.className = `stream-comparator-toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");

    // Detect if emoji is already in message (like ✅, 📥, 🗑️, ⚖️, ⚠️)
    const emojiMatch = rawMsg.match(/^([\p{Emoji}\u2700-\u27BF\u2600-\u26FF\s]+)(.*)$/u);
    let iconHtml = "";
    let displayText = rawMsg;

    if (isError) {
      iconHtml = '<span class="stream-toast-badge stream-toast-badge-error">⚠️</span>';
      if (emojiMatch && (emojiMatch[1].includes("⚠️") || emojiMatch[1].includes("❌"))) {
        displayText = emojiMatch[2].trim() || rawMsg;
      }
    } else if (emojiMatch && emojiMatch[1].trim()) {
      iconHtml = `<span class="stream-toast-badge stream-toast-badge-emoji">${emojiMatch[1].trim()}</span>`;
      displayText = emojiMatch[2].trim() || rawMsg;
    } else {
      iconHtml = '<span class="stream-toast-badge stream-toast-badge-success">✓</span>';
    }

    toast.innerHTML = `
      <div class="stream-toast-inner">
        ${iconHtml}
        <span class="stream-toast-text">${escapeHtml(displayText)}</span>
        <button type="button" class="stream-toast-close" title="Dismiss" aria-label="Close">×</button>
      </div>
      <div class="stream-toast-progress-bar"></div>
    `;

    document.body.appendChild(toast);

    // Slide down smoothly from top center
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add("stream-toast-visible");
      });
    });

    let timerId = null;
    const removeToast = () => {
      if (timerId) clearTimeout(timerId);
      toast.classList.remove("stream-toast-visible");
      toast.classList.add("stream-toast-closing");
      setTimeout(() => {
        if (toast && toast.parentNode) toast.remove();
      }, 250);
    };

    const closeBtn = toast.querySelector(".stream-toast-close");
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        removeToast();
      };
    }

    toast.onclick = removeToast;
    timerId = setTimeout(removeToast, 3400);
  }

  function parseExcelFile(file, isMerge = false) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        if (typeof XLSX === "undefined") {
          throw new Error("SheetJS XLSX library is not loaded.");
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        
        let aggregatedDataset = null;
        for (let i = 0; i < workbook.SheetNames.length; i++) {
          const sheetName = workbook.SheetNames[i];
          const worksheet = workbook.Sheets[sheetName];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          if (rawJson && rawJson.length >= 2) {
            try {
              const sheetDataset = extractStreamsFromTableRows(rawJson, `${file.name} - ${sheetName}`, sheetName);
              if (sheetDataset && sheetDataset.streams && sheetDataset.streams.length > 0) {
                if (!aggregatedDataset) {
                  aggregatedDataset = sheetDataset;
                } else {
                  aggregatedDataset = mergeDatasets(aggregatedDataset, sheetDataset);
                }
              }
            } catch (err) {
              console.warn(`Sheet ${sheetName} could not be extracted:`, err);
            }
          }
        }

        showLoadingState(false);
        if (!aggregatedDataset || !aggregatedDataset.streams || aggregatedDataset.streams.length === 0) {
          throw new Error("Could not extract process stream tables from any worksheet in Excel.");
        }

        if (isMerge && state.currentDataset) {
          mergeIncomingDataset(aggregatedDataset);
        } else {
          loadDataset(aggregatedDataset);
          showNotification(`Loaded Excel dataset successfully with ${aggregatedDataset.streams.length} streams.`);
        }
      } catch (err) {
        console.error("Error parsing Excel:", err);
        showLoadingState(false);
        showNotification("Failed to parse Excel file: " + err.message, true);
      }
    };
    reader.onerror = function() {
      showLoadingState(false);
      showNotification("Error reading file.", true);
    };
    reader.readAsArrayBuffer(file);
  }

  function parseMultipleExcelFiles(files, isMerge = false) {
    showLoadingState(true, `Reading and combining ${files.length} Excel files...`);
    let combinedDataset = null;
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          for (let i = 0; i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const worksheet = workbook.Sheets[sheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            if (rawJson && rawJson.length >= 2) {
              try {
                const sheetDataset = extractStreamsFromTableRows(rawJson, `${file.name} - ${sheetName}`, sheetName);
                if (sheetDataset && sheetDataset.streams && sheetDataset.streams.length > 0) {
                  if (!combinedDataset) {
                    combinedDataset = sheetDataset;
                  } else {
                    combinedDataset = mergeDatasets(combinedDataset, sheetDataset);
                  }
                }
              } catch (e) {}
            }
          }
        } catch (err) {
          console.warn("Error reading Excel in multi-upload:", err);
        }

        loadedCount++;
        if (loadedCount === files.length) {
          showLoadingState(false);
          if (!combinedDataset || !combinedDataset.streams || combinedDataset.streams.length === 0) {
            showNotification("Could not extract stream tables from the uploaded Excel files.", true);
            return;
          }
          if (isMerge && state.currentDataset) {
            mergeIncomingDataset(combinedDataset);
          } else {
            loadDataset(combinedDataset);
            showNotification(`Loaded ${combinedDataset.streams.length} process streams from ${files.length} Excel file(s).`);
          }
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function extractStreamsFromTableRows(rows, fileName, sheetName = "") {
    if (!rows || rows.length < 2) {
      throw new Error("Sheet contains less than 2 rows.");
    }

    const defaultCase = detectCaseTag(sheetName) || detectCaseTag(fileName) || null;

    // -------------------------------------------------------------
    // Format A: Test if Table is ROW-WISE (each row represents 1 stream)
    // Common in tabular schedules, SCADA/DCS logs, and database exports.
    // -------------------------------------------------------------
    let rowWiseHeaderIdx = -1;
    let rowWiseStreamColIdx = -1;
    let rowWiseContentColIdx = -1;
    let rowWiseMassFlowColIdx = -1;
    let rowWiseMolarFlowColIdx = -1;
    let rowWiseTempColIdx = -1;
    let rowWisePressColIdx = -1;
    let rowWiseCaseColIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim().toLowerCase();
        if (val === "stream no" || val === "stream #" || val === "stream number" || val === "stream tag" || val === "stream_no" || val === "stream id" || val === "stream") {
          rowWiseHeaderIdx = r;
          rowWiseStreamColIdx = c;
          break;
        }
      }
      if (rowWiseHeaderIdx !== -1) break;
    }

    if (rowWiseHeaderIdx !== -1 && rowWiseHeaderIdx < rows.length - 1) {
      const headerRow = rows[rowWiseHeaderIdx];
      let validDataRowCount = 0;
      for (let r = rowWiseHeaderIdx + 1; r < Math.min(rows.length, rowWiseHeaderIdx + 6); r++) {
        const testVal = String(rows[r]?.[rowWiseStreamColIdx] || "").trim();
        if (testVal && testVal.toLowerCase() !== "unit" && testVal.toLowerCase() !== "phase") validDataRowCount++;
      }

      let recognizedParamHeaders = 0;
      for (let c = 0; c < headerRow.length; c++) {
        if (c === rowWiseStreamColIdx) continue;
        const colHeader = String(headerRow[c] || "").trim().toLowerCase();
        if (!colHeader) continue;
        if (colHeader === "case" || colHeader === "operating case" || colHeader === "run" || colHeader === "run case" || colHeader === "mode") {
          rowWiseCaseColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("content") || colHeader.includes("name") || colHeader.includes("service") || colHeader.includes("description")) {
          rowWiseContentColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("mass flow") || colHeader.includes("mass rate") || colHeader === "flow mass" || colHeader.includes("mass_flow")) {
          rowWiseMassFlowColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("molar flow") || colHeader.includes("molar rate") || colHeader === "flow molar" || colHeader.includes("mole flow")) {
          rowWiseMolarFlowColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("temp")) {
          rowWiseTempColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("press")) {
          rowWisePressColIdx = c;
          recognizedParamHeaders++;
        } else if (colHeader.includes("density") || colHeader.includes("viscosity") || colHeader.includes("flow") || colHeader.includes("phase") || colHeader.includes("weight")) {
          recognizedParamHeaders++;
        }
      }

      // If valid data rows exist and parameters or multiple columns are identified, parse row-wise
      if (validDataRowCount >= 1 && (recognizedParamHeaders >= 1 || headerRow.length >= 4)) {
        const streams = [];
        for (let r = rowWiseHeaderIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;
          const rawStreamNo = String(row[rowWiseStreamColIdx] || "").trim();
          if (!rawStreamNo || rawStreamNo.toLowerCase() === "total" || rawStreamNo.toLowerCase() === "average") continue;

          const rawCase = rowWiseCaseColIdx !== -1 ? String(row[rowWiseCaseColIdx] || "").trim() : "";
          const cellCase = extractCaseValue(rawCase) || detectCaseTag(rawStreamNo);
          const streamCase = cellCase || (defaultCase ? extractCaseValue(defaultCase) : "");
          const baseStreamNo = cleanBaseStreamNo(rawStreamNo);
          const streamNo = streamCase ? `${baseStreamNo} [${streamCase}]` : baseStreamNo;

          const content = rowWiseContentColIdx !== -1 ? String(row[rowWiseContentColIdx] || "").trim() : "";
          let massFlow = 0;
          if (rowWiseMassFlowColIdx !== -1) {
            const rawMf = parseFloat(String(row[rowWiseMassFlowColIdx] || "").replace(/,/g, ""));
            if (!isNaN(rawMf)) massFlow = rawMf;
          }
          let molarFlow = 0;
          if (rowWiseMolarFlowColIdx !== -1) {
            const rawMol = parseFloat(String(row[rowWiseMolarFlowColIdx] || "").replace(/,/g, ""));
            if (!isNaN(rawMol)) molarFlow = rawMol;
          }
          let tempC = null;
          if (rowWiseTempColIdx !== -1) {
            const rawT = parseFloat(String(row[rowWiseTempColIdx] || "").replace(/,/g, ""));
            if (!isNaN(rawT)) tempC = rawT;
          }
          let pressKgCm2 = null;
          if (rowWisePressColIdx !== -1) {
            const rawP = parseFloat(String(row[rowWisePressColIdx] || "").replace(/,/g, ""));
            if (!isNaN(rawP)) pressKgCm2 = rawP;
          }

          const properties = {};
          const components = {};

          if (content) properties["Content / Phase"] = content;
          if (massFlow) properties["Flow Mass (kg/hr)"] = massFlow;
          if (molarFlow) properties["Flow Molar (kg-mol/hr)"] = molarFlow;
          if (tempC !== null) properties["Temperature (°C)"] = tempC;
          if (pressKgCm2 !== null) properties["Pressure (kg/cm²g)"] = pressKgCm2;

          for (let c = 0; c < row.length; c++) {
            if (c === rowWiseStreamColIdx || c === rowWiseContentColIdx || c === rowWiseMassFlowColIdx || c === rowWiseMolarFlowColIdx || c === rowWiseTempColIdx || c === rowWisePressColIdx || c === rowWiseCaseColIdx) {
              continue;
            }
            const colHeader = String(headerRow[c] || "").trim();
            if (!colHeader) continue;
            const valRaw = String(row[c] || "").trim().replace(/,/g, "");
            const numVal = parseFloat(valRaw);

            const lowerHeader = colHeader.toLowerCase();
            const isProp = lowerHeader.includes("temp") ||
                           lowerHeader.includes("press") ||
                           lowerHeader.includes("density") ||
                           lowerHeader.includes("viscosity") ||
                           lowerHeader.includes("visc") ||
                           lowerHeader.includes("phase") ||
                           lowerHeader.includes("weight") ||
                           lowerHeader.includes("mw") ||
                           lowerHeader.includes("enthalpy") ||
                           lowerHeader.includes("gravity") ||
                           lowerHeader.includes("spec") ||
                           lowerHeader.includes("pseudo") ||
                           lowerHeader.includes("state") ||
                           lowerHeader.includes("surface") ||
                           lowerHeader.includes("tension") ||
                           lowerHeader.includes("dyne") ||
                           lowerHeader.includes("vap press") ||
                           lowerHeader.includes("vapor press") ||
                           lowerHeader.includes("vaporized") ||
                           lowerHeader.includes("crit");

            if (isProp) {
              properties[colHeader] = isNaN(numVal) ? valRaw : numVal;
            } else if (!isNaN(numVal) && numVal !== 0) {
              components[colHeader.toUpperCase()] = numVal;
            } else if (!isNaN(numVal) && numVal === 0) {
              components[colHeader.toUpperCase()] = 0;
            }
          }

          if (massFlow === 0 && Object.keys(components).length > 0) {
            massFlow = Object.values(components).reduce((sum, v) => sum + (Number(v) || 0), 0);
          }

          // Extract helper direct physical property fields from properties
          let viscosity = null, liquidDensity = null, mw = null, wtPctVaporized = null, surfaceTension = null, liquidVapPress = null;
          Object.keys(properties).forEach(pk => {
            const pkl = pk.toLowerCase();
            const pkv = properties[pk];
            const pkn = parseFloat(String(pkv).replace(/,/g, ""));
            if (pkl.includes("viscosity") || pkl.includes("visc")) viscosity = isNaN(pkn) ? null : pkn;
            if (pkl.includes("density")) liquidDensity = isNaN(pkn) ? null : pkn;
            if (pkl.includes("weight") || pkl.includes("mw")) mw = isNaN(pkn) ? null : pkn;
            if (pkl.includes("vaporized")) wtPctVaporized = isNaN(pkn) ? null : pkn;
            if (pkl.includes("surface") || pkl.includes("tension")) surfaceTension = isNaN(pkn) ? null : pkn;
            if (pkl.includes("vap press") || pkl.includes("vapor press")) liquidVapPress = isNaN(pkn) ? pkv : pkn;
          });

          streams.push({
            streamNo,
            baseStreamNo,
            caseName: streamCase,
            streamName: `Stream ${baseStreamNo}${streamCase ? ` (${streamCase})` : ''}`,
            content,
            massFlow,
            molarFlow,
            tempC,
            pressKgCm2,
            viscosity,
            liquidDensity,
            mw,
            wtPctVaporized,
            surfaceTension,
            liquidVapPress,
            properties,
            components
          });
        }

        if (streams.length > 0) {
          return {
            title: `Process Stream Dataset: ${fileName}`,
            sheetCategory: "COMBINED",
            unit: "kg/hr",
            streams
          };
        }
      }
    }

    // -------------------------------------------------------------
    // Format B: COLUMN-WISE (Traditional Refinery HMB Sheet layout)
    // Each column is a process stream, column A has property/component names
    // -------------------------------------------------------------
    let streamHeaderRowIdx = -1;
    let streamCols = [];

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || "").trim().toLowerCase();
        if (val.includes("stream no") || val === "stream" || val.includes("stream #")) {
          streamHeaderRowIdx = r;
          break;
        }
      }
      if (streamHeaderRowIdx !== -1) break;
    }

    if (streamHeaderRowIdx === -1) {
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const row = rows[r];
        const candidates = [];
        for (let c = 1; c < row.length; c++) {
          const val = String(row[c] || "").trim();
          if (val && val.length < 20 && !isNaN(parseFloat(val.replace(/[A-Za-z]/g, "")))) {
            candidates.push({ colIdx: c, streamNo: val });
          }
        }
        if (candidates.length >= 2) {
          streamHeaderRowIdx = r;
          streamCols = candidates;
          break;
        }
      }
    } else {
      const headerRow = rows[streamHeaderRowIdx];
      for (let c = 1; c < headerRow.length; c++) {
        const val = String(headerRow[c] || "").trim();
        if (val) {
          streamCols.push({ colIdx: c, streamNo: val });
        }
      }
    }

    if (streamCols.length === 0) {
      throw new Error("Could not detect process stream columns or rows in the uploaded file.");
    }

    const streams = streamCols.map(s => {
      const rawVal = s.streamNo;
      const cellCase = detectCaseTag(rawVal);
      const streamCase = cellCase || (defaultCase ? extractCaseValue(defaultCase) : "");
      const baseStreamNo = cleanBaseStreamNo(rawVal);
      const streamNo = streamCase ? `${baseStreamNo} [${streamCase}]` : baseStreamNo;
      return {
        streamNo,
        baseStreamNo,
        caseName: streamCase,
        streamName: `Stream ${baseStreamNo}${streamCase ? ` (${streamCase})` : ''}`,
        content: "",
        massFlow: 0,
        molarFlow: 0,
        properties: {},
        components: {}
      };
    });

    let hasPropertyRows = false;

    for (let r = streamHeaderRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rowLabel = String(row[0] || "").trim();
      if (!rowLabel) continue;

      const lowerLabel = rowLabel.toLowerCase();

      // Check if row indicates Operating Case
      if (lowerLabel === "case" || lowerLabel === "operating case" || lowerLabel === "run" || lowerLabel === "run case" || lowerLabel === "mode") {
        streamCols.forEach((sc, i) => {
          const val = String(row[sc.colIdx] || "").trim();
          const detected = extractCaseValue(val);
          if (detected) {
            streams[i].caseName = detected;
            streams[i].streamNo = `${streams[i].baseStreamNo} [${detected}]`;
            streams[i].streamName = `Stream ${streams[i].baseStreamNo} (${detected})`;
          }
        });
        continue;
      }

      // Check if row is Content / Phase
      if (lowerLabel === "content" || lowerLabel.includes("phase") || lowerLabel.includes("description") || lowerLabel === "stream name") {
        streamCols.forEach((sc, i) => {
          const val = String(row[sc.colIdx] || "").trim();
          streams[i].content = val;
          streams[i].properties["Content / Phase"] = val;
        });
        hasPropertyRows = true;
        continue;
      }

      // Check if it's a physical / thermodynamic property
      const isProp = lowerLabel.includes("temp") ||
                     lowerLabel.includes("press") ||
                     lowerLabel.includes("density") ||
                     lowerLabel.includes("viscosity") ||
                     lowerLabel.includes("visc") ||
                     lowerLabel.includes("gravity") ||
                     lowerLabel.includes("enthalpy") ||
                     lowerLabel.includes("spec heat") ||
                     lowerLabel.includes("liquid k") ||
                     lowerLabel.includes("pseudo crit") ||
                     lowerLabel.includes("vaporized") ||
                     lowerLabel.includes("flow standard") ||
                     lowerLabel.includes("flow condition") ||
                     lowerLabel.includes("molecular weight") ||
                     lowerLabel.includes("mw") ||
                     lowerLabel.includes("surface tension") ||
                     lowerLabel.includes("surface") ||
                     lowerLabel.includes("tension") ||
                     lowerLabel.includes("dyne") ||
                     lowerLabel.includes("vap press") ||
                     lowerLabel.includes("vapor press");

      if (isProp) {
        hasPropertyRows = true;
        streamCols.forEach((sc, i) => {
          const rawVal = String(row[sc.colIdx] || "").replace(/,/g, "").trim();
          const numVal = parseFloat(rawVal);
          streams[i].properties[rowLabel] = isNaN(numVal) ? rawVal : numVal;

          if (lowerLabel.includes("temp")) streams[i].tempC = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("press") && !lowerLabel.includes("vap") && !lowerLabel.includes("crit")) streams[i].pressKgCm2 = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("viscosity") || lowerLabel.includes("visc")) streams[i].viscosity = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("density")) streams[i].liquidDensity = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("molecular weight") || lowerLabel === "mw" || lowerLabel.includes("mw ")) streams[i].mw = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("vaporized")) streams[i].wtPctVaporized = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("surface tension") || lowerLabel.includes("tension")) streams[i].surfaceTension = isNaN(numVal) ? null : numVal;
          if (lowerLabel.includes("vap press") || lowerLabel.includes("vapor press")) streams[i].liquidVapPress = isNaN(numVal) ? rawVal : numVal;
        });
      } else if (lowerLabel.includes("mass flow") || lowerLabel.includes("mass rate") || lowerLabel === "flow mass") {
        streamCols.forEach((sc, i) => {
          const val = parseFloat(String(row[sc.colIdx] || "").replace(/,/g, ""));
          if (!isNaN(val)) {
            streams[i].massFlow = val;
            streams[i].properties["Flow Mass (kg/hr)"] = val;
          }
        });
        hasPropertyRows = true;
      } else if (lowerLabel.includes("molar flow") || lowerLabel.includes("molar rate") || lowerLabel === "flow molar") {
        streamCols.forEach((sc, i) => {
          const val = parseFloat(String(row[sc.colIdx] || "").replace(/,/g, ""));
          if (!isNaN(val)) {
            streams[i].molarFlow = val;
            streams[i].properties["Flow Molar (kg-mol/hr)"] = val;
          }
        });
        hasPropertyRows = true;
      } else if (!lowerLabel.includes("comp.") && !lowerLabel.includes("component") && !lowerLabel.includes("unit")) {
        // Component row
        const compName = rowLabel.toUpperCase();
        streamCols.forEach((sc, i) => {
          const rawVal = String(row[sc.colIdx] || "").replace(/,/g, "").trim();
          const val = parseFloat(rawVal);
          streams[i].components[compName] = isNaN(val) ? 0 : val;
        });
      }
    }

    streams.forEach(s => {
      if (!s.massFlow || s.massFlow === 0) {
        s.massFlow = Object.values(s.components).reduce((sum, v) => sum + (Number(v) || 0), 0);
      }
    });

    return {
      title: `Uploaded Process Data: ${fileName}`,
      sheetCategory: hasPropertyRows && Object.keys(streams[0].components).length === 0 ? "PROPERTIES" : (hasPropertyRows ? "COMBINED" : "COMPONENTS"),
      unit: "kg/hr",
      streams: streams
    };
  }

  async function parseDocumentViaGemini(files, isMerge = false) {
    try {
      const fileArr = Array.isArray(files) ? files : [files];
      
      const convertedFiles = await Promise.all(
        fileArr.map(file => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                name: file.name,
                mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/png"),
                base64: e.target.result
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      const res = await fetch("/api/parse-stream-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: convertedFiles,
          base64: convertedFiles[0]?.base64,
          mimeType: convertedFiles[0]?.mimeType
        })
      });

      const responseText = await res.text();
      let json = null;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Non-JSON response from server:", responseText.slice(0, 300));
        if (responseText.includes("<!DOCTYPE") || responseText.includes("<html") || !res.ok) {
          throw new Error(`Server returned HTTP ${res.status} (${res.statusText || "Gateway/Network Error"}). If document is very large, consider uploading fewer pages or an Excel sheet.`);
        }
        throw new Error(`Invalid response format from server: ${responseText.slice(0, 100)}`);
      }

      showLoadingState(false);

      if (!res.ok || !json || !json.success || !json.data) {
        throw new Error(json?.error || json?.details || "Document extraction failed");
      }

      if (isMerge && state.currentDataset) {
        mergeIncomingDataset(json.data);
      } else {
        loadDataset(json.data);
        showNotification(`Extracted & Fused ${json.data.streams.length} streams successfully from ${fileArr.length} document(s)!`);
      }
    } catch (err) {
      console.error("AI Document Parser error:", err);
      showLoadingState(false);
      showNotification("Error parsing document with Gemini: " + err.message, true);
    }
  }

  function mergeDatasets(base, incoming) {
    if (!base) return incoming;
    if (!incoming) return base;

    const streamMap = new Map();
    // Index base streams using composite key: baseStreamNo + "__" + caseName
    (base.streams || []).forEach(s => {
      const bNo = String(s.baseStreamNo || s.streamNo).trim().toUpperCase();
      const cName = String(s.caseName || "DEFAULT").trim().toUpperCase();
      const key = `${bNo}__${cName}`;
      streamMap.set(key, {
        ...s,
        properties: { ...(s.properties || {}) },
        components: { ...(s.components || {}) }
      });
    });

    // Merge incoming streams
    (incoming.streams || []).forEach(incStream => {
      const bNo = String(incStream.baseStreamNo || incStream.streamNo).trim().toUpperCase();
      const cName = String(incStream.caseName || "DEFAULT").trim().toUpperCase();
      const key = `${bNo}__${cName}`;
      if (streamMap.has(key)) {
        const existing = streamMap.get(key);
        // Merge properties
        existing.properties = { ...existing.properties, ...(incStream.properties || {}) };
        // Merge components
        existing.components = { ...existing.components, ...(incStream.components || {}) };
        // Merge flow and thermal metadata if missing or more detailed
        if ((!existing.massFlow || existing.massFlow === 0) && incStream.massFlow) existing.massFlow = incStream.massFlow;
        if ((!existing.molarFlow || existing.molarFlow === 0) && incStream.molarFlow) existing.molarFlow = incStream.molarFlow;
        if (!existing.tempC && incStream.tempC) existing.tempC = incStream.tempC;
        if (!existing.pressKgCm2 && incStream.pressKgCm2) existing.pressKgCm2 = incStream.pressKgCm2;
        if ((!existing.content || existing.content === "-") && incStream.content) existing.content = incStream.content;
      } else {
        streamMap.set(key, {
          ...incStream,
          properties: { ...(incStream.properties || {}) },
          components: { ...(incStream.components || {}) }
        });
      }
    });

    const mergedStreams = Array.from(streamMap.values());
    const hasProps = mergedStreams.some(s => s.properties && Object.keys(s.properties).length > 0);
    const hasComps = mergedStreams.some(s => s.components && Object.keys(s.components).length > 0);

    return {
      title: `${base.title || 'Process Stream Balance'} [Multi-Case Sync]`,
      sheetCategory: hasProps && hasComps ? "COMBINED" : (hasProps ? "PROPERTIES" : "COMPONENTS"),
      unit: base.unit || incoming.unit || "kg/hr",
      streams: mergedStreams
    };
  }

  function mergeIncomingDataset(incoming) {
    if (!state.currentDataset) {
      loadDataset(incoming);
      return;
    }

    const merged = mergeDatasets(state.currentDataset, incoming);
    loadDataset(merged);

    if (typeof Swal !== "undefined" && Swal.fire) {
      Swal.fire({
        title: "Datasets Fused Successfully!",
        html: `Merged <strong>${incoming.streams.length}</strong> streams from secondary document.<br>Both <strong>Physical Properties</strong> and <strong>Component Mass Breakdown</strong> are now linked and visible together!`,
        icon: "success",
        confirmButtonColor: "#2563eb"
      });
    } else {
      showNotification("Merged incoming dataset with active dataset.");
    }
  }

  function loadSampleCombined() {
    loadLiveDatasetFromFirestore("RPTU");
  }

  function loadSampleMultiCase() {
    loadLiveDatasetFromFirestore("NHTU");
  }

  function showLoadingState(isLoading, message = "Processing...", subtitle = "") {
    // 1. Ingest modal spinner (if modal is open)
    const spinner = document.getElementById("streamLoadingSpinner");
    const msgEl = document.getElementById("streamLoadingMsg");
    if (spinner) {
      if (isLoading) {
        spinner.style.display = "flex";
        if (msgEl) msgEl.textContent = message;
      } else {
        spinner.style.display = "none";
      }
    }

    // 2. Global Stream Comparator overlay spinner
    const globalOverlay = document.getElementById("streamGlobalSpinnerOverlay");
    const globalTitle = document.getElementById("streamGlobalSpinnerTitle");
    const globalSubtitle = document.getElementById("streamGlobalSpinnerSubtitle");
    if (globalOverlay) {
      if (isLoading) {
        if (globalTitle) globalTitle.textContent = message;
        if (globalSubtitle) {
          globalSubtitle.textContent = subtitle || "Fetching live process stream records from server...";
          globalSubtitle.style.display = "block";
        }
        globalOverlay.style.display = "flex";
      } else {
        globalOverlay.style.display = "none";
      }
    }
  }

  function formatNum(num, dec = 0) {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
  }

  function exportToExcel() {
    if (!state.currentDataset || typeof XLSX === "undefined") {
      showNotification("No data available to export or SheetJS is not loaded.", true);
      return;
    }

    const sA = state.streamA;
    const sB = state.streamB;
    if (!sA || !sB) {
      showNotification("Please select both Stream A and Stream B to export comparison.", true);
      return;
    }

    const deltaMass = (sB.massFlow || 0) - (sA.massFlow || 0);
    const deltaMassPct = sA.massFlow && sA.massFlow > 0 ? ((deltaMass / sA.massFlow) * 100).toFixed(2) + "%" : "-";

    const dataRows = [
      ["PROCESS STREAM MATERIAL BALANCE COMPARISON REPORT"],
      ["Dataset:", state.currentDataset.title || "Refinery HMB"],
      ["Export Date:", new Date().toLocaleString()],
      ["Stream A (Base):", `Stream ${sA.streamNo} (${sA.content || sA.streamName || ''})`, "Mass Flow (kg/hr):", sA.massFlow || 0],
      ["Stream B (Target):", `Stream ${sB.streamNo} (${sB.content || sB.streamName || ''})`, "Mass Flow (kg/hr):", sB.massFlow || 0],
      ["Net Mass Delta:", deltaMass, "Delta %:", deltaMassPct],
      []
    ];

    const includeProps = state.activeMode === "properties" || state.activeMode === "combined";
    const includeComps = state.activeMode === "components" || state.activeMode === "combined";

    if (includeProps) {
      dataRows.push(["--- PHYSICAL & THERMODYNAMIC PROPERTIES ---", "", "", "", "", "", ""]);
      dataRows.push(["Property / Specification", "Category", `Stream ${sA.streamNo}`, `Stream ${sB.streamNo}`, "Variance Δ", "Change (%)", "Status"]);

      const allPropKeys = new Set([...Object.keys(sA.properties || {}), ...Object.keys(sB.properties || {})]);
      allPropKeys.forEach(prop => {
        const valA = sA.properties?.[prop] ?? "-";
        const valB = sB.properties?.[prop] ?? "-";
        const numA = parseFloat(String(valA).replace(/,/g, ""));
        const numB = parseFloat(String(valB).replace(/,/g, ""));
        const isNum = !isNaN(numA) && !isNaN(numB);
        const delta = isNum ? numB - numA : "-";
        const pct = isNum && numA !== 0 ? ((delta / Math.abs(numA)) * 100).toFixed(1) + "%" : "-";
        const status = isNum ? (delta > 0 ? "HIGHER" : (delta < 0 ? "LOWER" : "EQUAL")) : (valA !== valB ? "DIFFERENT" : "EQUAL");

        dataRows.push([prop, categorizeProperty(prop), valA, valB, delta, pct, status]);
      });
      dataRows.push([]);
    }

    if (includeComps) {
      dataRows.push(["--- CHEMICAL COMPONENTS BREAKDOWN (kg/hr) ---", "", "", "", "", "", ""]);
      dataRows.push(["Component", "Category", `Stream ${sA.streamNo} (kg/hr)`, `Stream ${sB.streamNo} (kg/hr)`, "Variance Δ (kg/hr)", "Change (%)", "Status"]);

      const allComps = new Set([...Object.keys(sA.components || {}), ...Object.keys(sB.components || {})]);
      allComps.forEach(comp => {
        const valA = Number(sA.components?.[comp]) || 0;
        const valB = Number(sB.components?.[comp]) || 0;
        const delta = valB - valA;
        const pct = valA > 0 ? (delta / valA * 100).toFixed(1) + "%" : (valB > 0 ? "+100% (New)" : "0%");
        const status = delta > 0 ? "INCREASED" : (delta < 0 ? "DECREASED" : "EQUAL");

        dataRows.push([comp, categorizeComponent(comp), valA, valB, delta, pct, status]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    const sanitizeSheetName = (name) => String(name || "Sheet").replace(/[:\\/?*\[\]]/g, "_").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(`Compare_${sA.streamNo}_vs_${sB.streamNo}`));
    XLSX.writeFile(wb, `Stream_Comparison_${sA.streamNo}_vs_${sB.streamNo}.xlsx`);
    showNotification(`✅ Exported comparison Stream ${sA.streamNo} vs Stream ${sB.streamNo} to Excel!`);
  }

  function exportFullDatasetToExcel() {
    if (!state.currentDataset || !state.currentDataset.streams || state.currentDataset.streams.length === 0) {
      showNotification("No stream dataset is currently loaded to export.", true);
      return;
    }
    if (typeof XLSX === "undefined") {
      showNotification("SheetJS XLSX library is not loaded.", true);
      return;
    }

    showLoadingState(true, "Exporting to Excel (.xlsx)...", `Generating workbook for ${state.currentDataset.streams.length} streams...`);

    setTimeout(() => {
      try {
        const streams = state.currentDataset.streams;
        const wb = XLSX.utils.book_new();

    // Sheet 1: All Streams Overview / Schedule
    const overviewHeaders = [
      "Stream No",
      "Operating Case",
      "Stream Name / Description",
      "Phase / Content",
      "Mass Flow (kg/hr)",
      "Molar Flow (kg-mol/hr)",
      "Temperature (°C)",
      "Pressure (kg/cm²g)",
      "Viscosity (cP)",
      "Liquid Density (kg/m3)",
      "Molecular Weight (MW)",
      "Wt% Vaporized (%)",
      "Surface tension (dyne/cm)",
      "Liquid Vap Press (kg/cm2)"
    ];
    const overviewRows = [
      ["PROCESS STREAM SUMMARY & MATERIAL BALANCE SCHEDULE"],
      ["Dataset:", state.currentDataset.title || "Refinery HMB"],
      ["Total Streams:", streams.length],
      ["Export Date:", new Date().toLocaleString()],
      [],
      overviewHeaders
    ];

    streams.forEach(s => {
      overviewRows.push([
        s.streamNo,
        s.caseName || "-",
        s.streamName || `Stream ${s.streamNo}`,
        s.content || s.properties?.["Content / Phase"] || "-",
        s.massFlow || 0,
        s.molarFlow || 0,
        s.tempC ?? s.properties?.["Temperature (°C)"] ?? "-",
        s.pressKgCm2 ?? s.properties?.["Pressure (kg/cm²g)"] ?? s.properties?.["Pressure (kg/cm2 (g))"] ?? "-",
        s.viscosity ?? s.properties?.["Liquid Viscosity (cP)"] ?? s.properties?.["Viscosity (cP)"] ?? "-",
        s.liquidDensity ?? s.properties?.["Liquid Density (kg/m3)"] ?? "-",
        s.mw ?? s.properties?.["Molecular Weight"] ?? s.properties?.["MW"] ?? "-",
        s.wtPctVaporized ?? s.properties?.["Wt% Vaporized (%)"] ?? "-",
        s.surfaceTension ?? s.properties?.["Surface tension (dyne/cm)"] ?? "-",
        s.liquidVapPress ?? s.properties?.["Liquid Vap Press (kg/cm2)"] ?? "-"
      ]);
    });
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Streams_Schedule");

    // Sheet 2: Component Breakdown Matrix
    const allCompNames = Array.from(new Set(streams.flatMap(s => Object.keys(s.components || {}))));
    if (allCompNames.length > 0) {
      const compHeaders = ["Component Name", "Category", ...streams.map(s => `Stream ${s.streamNo}`)];
      const compRows = [
        ["CHEMICAL COMPONENT MATERIAL BALANCE MATRIX (kg/hr)"],
        [],
        compHeaders
      ];
      allCompNames.forEach(comp => {
        const row = [comp, categorizeComponent(comp)];
        streams.forEach(s => {
          row.push(s.components?.[comp] ?? 0);
        });
        compRows.push(row);
      });
      // Add Totals row
      const totalRow = ["TOTAL MASS FLOW (kg/hr)", "-"];
      streams.forEach(s => {
        totalRow.push(s.massFlow || 0);
      });
      compRows.push(totalRow);

      const wsComp = XLSX.utils.aoa_to_sheet(compRows);
      XLSX.utils.book_append_sheet(wb, wsComp, "Components_Matrix");
    }

    // Sheet 3: Physical Properties Matrix
    const allPropNames = Array.from(new Set(streams.flatMap(s => Object.keys(s.properties || {}))));
    if (allPropNames.length > 0) {
      const propHeaders = ["Property / Parameter", "Category", ...streams.map(s => `Stream ${s.streamNo}`)];
      const propRows = [
        ["PHYSICAL & THERMODYNAMIC PROPERTIES MATRIX"],
        [],
        propHeaders
      ];
      allPropNames.forEach(prop => {
        const row = [prop, categorizeProperty(prop)];
        streams.forEach(s => {
          row.push(s.properties?.[prop] ?? "-");
        });
        propRows.push(row);
      });
      const wsProp = XLSX.utils.aoa_to_sheet(propRows);
      XLSX.utils.book_append_sheet(wb, wsProp, "Properties_Matrix");
    }

    // Sheet 4: Active Comparison (Stream A vs Stream B)
    if (state.streamA && state.streamB) {
      const sA = state.streamA;
      const sB = state.streamB;
      const compData = [
        ["STREAM COMPARISON & MATERIAL BALANCE DIFFERENTIAL"],
        ["Stream A (Base):", `Stream ${sA.streamNo} (${sA.content || ''})`, "Mass Flow (kg/hr):", sA.massFlow || 0],
        ["Stream B (Target):", `Stream ${sB.streamNo} (${sB.content || ''})`, "Mass Flow (kg/hr):", sB.massFlow || 0],
        ["Net Mass Delta:", (sB.massFlow || 0) - (sA.massFlow || 0), "Delta %:", sA.massFlow > 0 ? ((((sB.massFlow || 0) - (sA.massFlow || 0)) / sA.massFlow) * 100).toFixed(2) + "%" : "-"],
        [],
        ["Component / Property", "Type", `Stream ${sA.streamNo}`, `Stream ${sB.streamNo}`, "Variance Δ", "Change (%)", "Status"]
      ];

      // Add properties
      const allProps = new Set([...Object.keys(sA.properties || {}), ...Object.keys(sB.properties || {})]);
      allProps.forEach(p => {
        const vA = sA.properties?.[p] ?? "-";
        const vB = sB.properties?.[p] ?? "-";
        const nA = parseFloat(String(vA).replace(/,/g, ""));
        const nB = parseFloat(String(vB).replace(/,/g, ""));
        const isNum = !isNaN(nA) && !isNaN(nB);
        const delta = isNum ? nB - nA : "-";
        const pct = isNum && nA !== 0 ? ((delta / Math.abs(nA)) * 100).toFixed(1) + "%" : "-";
        const status = isNum ? (delta > 0 ? "HIGHER" : delta < 0 ? "LOWER" : "EQUAL") : (vA !== vB ? "DIFFERENT" : "EQUAL");
        compData.push([p, "Property", vA, vB, delta, pct, status]);
      });

      // Add components
      const allComps = new Set([...Object.keys(sA.components || {}), ...Object.keys(sB.components || {})]);
      allComps.forEach(c => {
        const vA = Number(sA.components?.[c]) || 0;
        const vB = Number(sB.components?.[c]) || 0;
        const delta = vB - vA;
        const pct = vA > 0 ? ((delta / vA) * 100).toFixed(1) + "%" : (vB > 0 ? "+100% (New)" : "0%");
        const status = delta > 0 ? "INCREASED" : delta < 0 ? "DECREASED" : "EQUAL";
        compData.push([c, "Component (kg/hr)", vA, vB, delta, pct, status]);
      });

      const wsCompSheet = XLSX.utils.aoa_to_sheet(compData);
      const sanitizeSheetName = (name) => String(name || "Sheet").replace(/[:\\/?*\[\]]/g, "_").substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsCompSheet, sanitizeSheetName(`Compare_${sA.streamNo}_vs_${sB.streamNo}`));
    }

    const titleSlug = (state.currentDataset.title || "Process_Streams").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${titleSlug}_Full_Dataset_${streams.length}_Streams.xlsx`);
    showNotification(`✅ Exported ${streams.length} process streams to Excel workbook successfully!`);
      } catch (err) {
        console.error("Export Excel error:", err);
        showNotification("Failed to export Excel workbook: " + err.message, true);
      } finally {
        showLoadingState(false);
      }
    }, 40);
  }

  function downloadExcelTemplate() {
    if (typeof XLSX === "undefined") {
      showNotification("SheetJS XLSX library is not loaded.", true);
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Instructions & Guidelines
    const instructionRows = [
      ["PROCESS STREAM MATERIAL BALANCE (HMB) EXCEL TEMPLATE GUIDE"],
      [],
      ["This workbook provides standard formats accepted by the Process Stream Comparator:"],
      ["1. 'Column_Wise_Template' (Standard Refinery HMB Layout) - Each column represents a stream."],
      ["2. 'Row_Wise_Template' (Tabular Schedule Layout) - Each row represents a stream. Ideal for 400+ streams."],
      ["3. 'Multi_Case_Example' - Demonstrates multi-operating case schedules (SOR, EOR, Case 1, 2, 3)."],
      [],
      ["AUTO-DETECTED OPERATING CASES:"],
      ["• If your Excel has a 'Case' column or row, the system automatically detects all operating cases (e.g., SOR, EOR, Case 1, Case 2, Case 3, Turndown)."],
      ["• If no Case column is provided (single operating state, like RPTU), the system auto-detects it as a single operating state with no redundant case filters."],
      [],
      ["KEY GUIDELINES FOR HIGH ACCURACY:"],
      ["• Keep Stream Numbers unique (e.g., 101, 102A, 172, Stream 1)."],
      ["• Mass Flow is in kg/hr (standard) or your plant's base mass flow unit."],
      ["• You can add as many chemical components and physical properties as needed."],
      ["• Zero values can be left as 0 or empty."],
      ["• Both .xlsx, .xls, and .csv formats are supported."],
      ["• You can load up to 1,000+ process streams with instant 1-second browser parsing."],
      [],
      ["Developed for Chemical & Refinery Process Engineering Teams"]
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionRows);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    // Sheet 2: Column-Wise Template (Standard Refinery HMB Layout)
    const colWiseRows = [
      ["Stream No", "113", "112", "113A", "172A", "172B", "173"],
      ["Operating Case", "Base", "Base", "Base", "Base", "Base", "Base"],
      ["Stream Name / Content", "LCF Feed Oil", "Hydrogen Treat Gas", "1st Stage Combined Feed", "Reactor Effluent", "Wash Water Injection", "Effluent Mix Post-WW"],
      ["Phase / State", "Liquid", "Vapor", "Mixed Phase", "Gas + Liquid", "Aqueous Liquid", "Mixed Phase"],
      ["Flow Mass (kg/hr)", 39979, 1450, 41429, 81732, 24700, 106453],
      ["Flow Molar (kg-mol/hr)", 64.9, 725.0, 789.9, 9125.3, 1371.1, 10497.0],
      ["--- PHYSICAL & THERMODYNAMIC PROPERTIES ---", "", "", "", "", "", ""],
      ["Temperature (°C)", 259, 55, 252, 395, 38, 375],
      ["Pressure (kg/cm²g)", 175.5, 178.0, 175.0, 165.0, 175.0, 163.5],
      ["Viscosity (cP)", 4.238, 0.012, 4.100, 0.420, 0.680, 0.510],
      ["Liquid Density (kg/m3)", 923.5, "-", 923.0, 742.0, 993.0, 795.0],
      ["Molecular Weight (MW)", 616.0, 2.0, 52.45, 8.96, 18.02, 10.14],
      ["Wt% Vaporized (%)", 0.0, 100.0, 3.5, 85.0, 0.0, 72.0],
      ["Surface tension (dyne/cm)", 28.5, 0.0, 28.2, 18.5, 70.0, 22.0],
      ["Liquid Vap Press (kg/cm2)", "<0.1", "178.0", "<0.1", "165.0", 0.066, "163.5"],
      ["Enthalpy (kcal/kg)", 123.7, 180.0, 125.6, 312.0, 38.0, 285.0],
      ["--- CHEMICAL COMPONENTS (kg/hr) ---", "", "", "", "", "", ""],
      ["H2", 0, 1400, 1400, 14451, 0, 14451],
      ["H2O", 0, 0, 0, 65, 24700, 24756],
      ["H2S", 150, 25, 175, 14241, 0, 14262],
      ["NH3", 0, 0, 0, 918, 0, 926],
      ["CHLORIDES", 0, 0, 0, 0, 5, 5],
      ["METHANE (C1)", 0, 25, 25, 13999, 0, 13999],
      ["ETHANE (C2)", 0, 0, 0, 6694, 0, 6695],
      ["PROPANE (C3)", 0, 0, 0, 6003, 0, 6003],
      ["I-BUTANE (IC4)", 0, 0, 0, 1454, 0, 1454],
      ["N-BUTANE (NC4)", 0, 0, 0, 2153, 0, 2153],
      ["NAPHTHA", 1200, 0, 1200, 8725, 0, 8726],
      ["DIESEL", 11500, 0, 11500, 12575, 0, 12575],
      ["HDT VGO", 27129, 0, 27129, 440, 0, 436]
    ];
    const wsColWise = XLSX.utils.aoa_to_sheet(colWiseRows);
    XLSX.utils.book_append_sheet(wb, wsColWise, "Column_Wise_Template");

    // Sheet 3: Row-Wise Template (Schedule Format)
    const rowWiseHeaders = [
      "Stream No",
      "Case",
      "Stream Name / Content",
      "Phase",
      "Mass Flow (kg/hr)",
      "Molar Flow (kg-mol/hr)",
      "Temperature (°C)",
      "Pressure (kg/cm²g)",
      "Viscosity (cP)",
      "Liquid Density (kg/m3)",
      "Molecular Weight",
      "Wt% Vaporized (%)",
      "Surface tension (dyne/cm)",
      "Liquid Vap Press (kg/cm2)",
      "H2",
      "H2O",
      "H2S",
      "NH3",
      "CHLORIDES",
      "METHANE",
      "ETHANE",
      "PROPANE",
      "I-BUTANE",
      "N-BUTANE",
      "NAPHTHA",
      "DIESEL",
      "HDT VGO"
    ];
    const rowWiseRows = [
      rowWiseHeaders,
      ["113", "", "LCF Feed Oil", "Liquid", 39979, 64.9, 259, 175.5, 4.238, 923.5, 616.0, 0.0, 28.5, "<0.1", 0, 0, 150, 0, 0, 0, 0, 0, 0, 0, 1200, 11500, 27129],
      ["112", "", "Hydrogen Treat Gas", "Vapor", 1450, 725.0, 55, 178.0, 0.012, 0, 2.0, 100.0, 0.0, 178.0, 1400, 0, 25, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0],
      ["113A", "", "1st Stage Combined Feed", "Mixed Phase", 41429, 789.9, 252, 175.0, 4.100, 923.0, 52.45, 3.5, 28.2, "<0.1", 1400, 0, 175, 0, 0, 25, 0, 0, 0, 0, 1200, 11500, 27129],
      ["172A", "", "Reactor Effluent Before Wash Water", "Gas + Liquid", 81732, 9125.3, 395, 165.0, 0.420, 742.0, 8.96, 85.0, 18.5, 165.0, 14451, 65, 14241, 918, 0, 13999, 6694, 6003, 1454, 2153, 8725, 12575, 440],
      ["172B", "", "Wash Water Injection (Demineralized Water)", "Aqueous Liquid", 24700, 1371.1, 38, 175.0, 0.680, 993.0, 18.02, 0.0, 70.0, 0.066, 0, 24700, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      ["173", "", "Reactor Effluent After Wash Water Injection", "Mixed Phase", 106453, 10497.0, 375, 163.5, 0.510, 795.0, 10.14, 72.0, 22.0, 163.5, 14451, 24756, 14262, 926, 5, 13999, 6695, 6003, 1454, 2153, 8726, 12575, 436]
    ];
    const wsRowWise = XLSX.utils.aoa_to_sheet(rowWiseRows);
    XLSX.utils.book_append_sheet(wb, wsRowWise, "Row_Wise_Template");

    // Sheet 4: Multi-Case Operating Schedule Example (Auto-Detected by Comparator)
    const multiCaseExampleRows = [
      rowWiseHeaders,
      ["113", "SOR", "LCF Feed Oil", "Liquid", 39979, 64.9, 259, 175.5, 4.238, 923.5, 616.0, 0.0, 28.5, "<0.1", 0, 0, 150, 0, 0, 0, 0, 0, 0, 0, 1200, 11500, 27129],
      ["113", "EOR", "LCF Feed Oil", "Liquid", 41178, 66.8, 267, 175.5, 4.238, 923.5, 616.0, 0.0, 28.5, "<0.1", 0, 0, 163, 0, 0, 0, 0, 0, 0, 0, 1260, 11270, 27129],
      ["113", "Case 2", "LCF Feed Oil (Heavy Feed)", "Liquid", 43177, 69.4, 269, 175.5, 4.310, 925.0, 620.0, 0.0, 28.5, "<0.1", 0, 0, 167, 0, 0, 0, 0, 0, 0, 0, 1200, 12535, 27129],
      ["113A", "SOR", "1st Stage Combined Feed", "Mixed Phase", 41429, 789.9, 252, 175.0, 4.100, 923.0, 52.45, 3.5, 28.2, "<0.1", 1400, 0, 175, 0, 0, 25, 0, 0, 0, 0, 1200, 11500, 27129],
      ["113A", "EOR", "1st Stage Combined Feed", "Mixed Phase", 42672, 809.6, 260, 175.0, 4.100, 923.0, 52.45, 3.5, 28.2, "<0.1", 1484, 0, 190, 0, 0, 25, 0, 0, 0, 0, 1260, 11270, 27129],
      ["113A", "Case 2", "1st Stage Combined Feed", "Mixed Phase", 44743, 845.2, 262, 175.0, 4.180, 924.5, 52.80, 3.5, 28.2, "<0.1", 1400, 0, 194, 0, 0, 25, 0, 0, 0, 0, 1200, 12535, 27129]
    ];
    const wsMultiCase = XLSX.utils.aoa_to_sheet(multiCaseExampleRows);
    XLSX.utils.book_append_sheet(wb, wsMultiCase, "Multi_Case_Example");

    XLSX.writeFile(wb, "Process_Stream_Material_Balance_Template.xlsx");
    showNotification("📥 Excel template downloaded: Process_Stream_Material_Balance_Template.xlsx");
  }

  function setFilter(filterType) {
    state.activeFilter = filterType;
    document.querySelectorAll(".stream-filter-btn").forEach(btn => {
      if (btn.dataset.filter === filterType) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    runComparison();
  }

  function setSearch(query) {
    state.searchQuery = query;
    runComparison();
  }

  function setDisplayBasis(basis) {
    state.displayBasis = basis;
    runComparison();
  }

  function clearButtonSpinners() {
    ["tabBtnPairwise", "tabBtnMatrix", "tabBtnTieIn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove("is-switching");
        const icon = btn.querySelector(".btn-spinner-icon");
        if (icon) icon.style.display = "none";
      }
    });
  }

  function setButtonSpinner(btnId) {
    clearButtonSpinners();
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.add("is-switching");
      const icon = btn.querySelector(".btn-spinner-icon");
      if (icon) icon.style.display = "inline-block";
    }
  }

  function switchView(viewName) {
    if (viewName === "ingest") {
      openIngestModal();
      return;
    }
    state.activeView = viewName;
    const pairPane = document.getElementById("streamPairwisePane");
    const matrixPane = document.getElementById("streamMatrixPane");
    const tieInPane = document.getElementById("streamTieInPane");
    const tabPairBtn = document.getElementById("tabBtnPairwise");
    const tabMatrixBtn = document.getElementById("tabBtnMatrix");
    const tabTieInBtn = document.getElementById("tabBtnTieIn");

    if (viewName === "pairwise") {
      setButtonSpinner("tabBtnPairwise");
      if (pairPane) pairPane.style.display = "block";
      if (matrixPane) matrixPane.style.display = "none";
      if (tieInPane) tieInPane.style.display = "none";
      if (tabPairBtn) tabPairBtn.classList.add("active");
      if (tabMatrixBtn) tabMatrixBtn.classList.remove("active");
      if (tabTieInBtn) tabTieInBtn.classList.remove("active");
      setTimeout(() => clearButtonSpinners(), 50);
    } else if (viewName === "matrix") {
      setButtonSpinner("tabBtnMatrix");
      if (pairPane) pairPane.style.display = "none";
      if (matrixPane) matrixPane.style.display = "block";
      if (tieInPane) tieInPane.style.display = "none";
      if (tabPairBtn) tabPairBtn.classList.remove("active");
      if (tabMatrixBtn) tabMatrixBtn.classList.add("active");
      if (tabTieInBtn) tabTieInBtn.classList.remove("active");

      showLoadingState(true, "Loading Multi-Stream Matrix View...", "Rendering process streams & material balance matrix...");
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            renderMatrixCasePills();
            renderMatrixChips();
            renderMatrixTable();
          } finally {
            showLoadingState(false);
            clearButtonSpinners();
          }
        }, 20);
      });
    } else if (viewName === "tiein" || viewName === "mixing") {
      setButtonSpinner("tabBtnTieIn");
      if (pairPane) pairPane.style.display = "none";
      if (matrixPane) matrixPane.style.display = "none";
      if (tieInPane) tieInPane.style.display = "block";
      if (tabPairBtn) tabPairBtn.classList.remove("active");
      if (tabMatrixBtn) tabMatrixBtn.classList.remove("active");
      if (tabTieInBtn) tabTieInBtn.classList.add("active");

      showLoadingState(true, "Scanning Tie-In & Injection Registry...", "Analyzing stream pairs against NACE SP0114 & API 570...");
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            renderTieInControlHub();
            if (window.InjectionMixingViz && typeof window.InjectionMixingViz.init === "function") {
              window.InjectionMixingViz.init("injectionMixingVizContainer");
              calculateTieInPhysics();
            }
          } finally {
            showLoadingState(false);
            clearButtonSpinners();
          }
        }, 20);
      });
    }
  }

  function onTieInStreamChange() {
    calculateTieInPhysics();
  }

  function quickSelectTieInPair(sAId, sBId) {
    const selA = document.getElementById("tieInSelectA");
    const selB = document.getElementById("tieInSelectB");
    if (selA && selB) {
      selA.value = sAId;
      selB.value = sBId;
    }
    calculateTieInPhysics();
    // Scroll to control console smoothly
    const tieInPane = document.getElementById("streamTieInPane");
    if (tieInPane) {
      tieInPane.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function runTieInAnalysis() {
    calculateTieInPhysics();
    scanPlantTieIns();
  }

  async function calculateTieInPhysics() {
    const selA = document.getElementById("tieInSelectA");
    const selB = document.getElementById("tieInSelectB");
    if (!selA || !selB || !state.currentDataset || !state.currentDataset.streams) return;

    const sA = state.currentDataset.streams.find(s => s.streamNo === selA.value);
    const sB = state.currentDataset.streams.find(s => s.streamNo === selB.value);
    if (!sA || !sB) return;

    // Render into dedicated container
    if (window.NaceClassifier && typeof window.NaceClassifier.render === "function") {
      window.NaceClassifier.render(sA, sB, "naceDedicatedContainer");
    }

    // Update real-time 2D simulation visualization
    if (window.InjectionMixingViz && typeof window.InjectionMixingViz.updateFromStreams === "function") {
      window.InjectionMixingViz.updateFromStreams(sA, sB);
    }

    // Geometry inputs
    const pipeIdEl = document.getElementById("tieInPipeId");
    const quillDiaEl = document.getElementById("tieInQuillDia");
    const quillSelectEl = document.getElementById("tieInQuillSelect");
    const kpiGrid = document.getElementById("tieInKpiGrid");

    const pipeIdVal = pipeIdEl?.value?.trim();
    const quillDiaVal = quillDiaEl?.value?.trim();

    if (!pipeIdVal || !quillDiaVal || isNaN(parseFloat(pipeIdVal)) || isNaN(parseFloat(quillDiaVal))) {
      if (kpiGrid) {
        kpiGrid.innerHTML = `
          <div style="grid-column: 1/-1; padding: 14px 18px; background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; color: #92400e; font-size: 13px;">
            ⚠️ <strong>Input Required:</strong> Specify positive numeric Pipe ID and Quill Diameter to evaluate aerodynamics on backend server.
          </div>
        `;
      }
      return;
    }

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 18px; color: #2563eb; font-size: 13px; font-weight: 600;">
          ⏳ Calculating Tie-In Fluid Aerodynamics on Backend API...
        </div>
      `;
    }

    try {
      const response = await fetch("/api/stream-datasets/tie-in-physics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamA: sA,
          streamB: sB,
          pipeIdMm: parseFloat(pipeIdVal),
          quillDiaMm: parseFloat(quillDiaVal),
          quillType: quillSelectEl?.value || "quill_beveled"
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (kpiGrid) {
          kpiGrid.innerHTML = `
            <div style="grid-column: 1/-1; padding: 14px 18px; background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">
              ⚠️ <strong>Backend Calculation Error:</strong> ${data.error || "Missing or incomplete stream operating parameters."}
            </div>
          `;
        }
        return;
      }

      const p = data.physics;
      if (kpiGrid) {
        kpiGrid.innerHTML = `
          <div class="stream-kpi-card" style="border-left: 4px solid ${p.reBorderColor};">
            <div class="stream-kpi-label">Reynolds Number (Re) &amp; Flow Regime</div>
            <div class="stream-kpi-value" style="font-size: 20px; color: ${p.reTextColor};">
              ${p.reMainFormatted}
            </div>
            <div class="stream-kpi-sub">${p.reSub}</div>
          </div>

          <div class="stream-kpi-card" style="border-left: 4px solid ${p.weberBorderColor};">
            <div class="stream-kpi-label">Weber Number (We) Droplet Atomization</div>
            <div class="stream-kpi-value" style="font-size: 20px; color: ${p.weberTextColor};">
              ${p.weberFormatted}
            </div>
            <div class="stream-kpi-sub">${p.weberSub}</div>
          </div>

          <div class="stream-kpi-card" style="border-left: 4px solid ${p.dTBorderColor};">
            <div class="stream-kpi-label">Thermal Gradient (|ΔT|) Fatigue Model</div>
            <div class="stream-kpi-value" style="font-size: 20px; color: ${p.dTTextColor};">
              ${p.dTFormatted}
            </div>
            <div class="stream-kpi-sub">${p.dTSub}</div>
          </div>

          <div class="stream-kpi-card" style="border-left: 4px solid #6366f1;">
            <div class="stream-kpi-label">Main Pipe Velocity (v<sub>main</sub>) &amp; Jet Penetration (M<sub>R</sub>)</div>
            <div class="stream-kpi-value" style="font-size: 20px; color: #4338ca;">
              ${p.vMainFormatted} <span style="font-size: 13px; font-weight: 500; color: #64748b;">(M<sub>R</sub> = ${p.momentumRatioFormatted})</span>
            </div>
            <div class="stream-kpi-sub">${p.quillSub}</div>
          </div>
        `;
      }
    } catch (err) {
      if (kpiGrid) {
        kpiGrid.innerHTML = `
          <div style="grid-column: 1/-1; padding: 14px 18px; background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">
            ⚠️ <strong>Connection Error:</strong> Could not connect to /api/stream-datasets/tie-in-physics.
          </div>
        `;
      }
    }
  }

  // Holds all detected tie-ins from the full dataset scan for filtering & search
  state.allDetectedTieIns = [];
  state.currentTieInFilter = "all";
  state.currentTieInSearch = "";

  function renderTieInRegistryRows(itemsToRender) {
    const tbody = document.getElementById("tieInRegistryTableBody");
    if (!tbody) return;

    if (!itemsToRender || itemsToRender.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
            No mixing or injection point pairs match the active filter or search criteria.
          </td>
        </tr>
      `;
      return;
    }

    // Render limit to guarantee zero freeze / hang when rendering rows
    const MAX_REGISTRY_ROWS = 80;
    const isLimited = itemsToRender.length > MAX_REGISTRY_ROWS;
    const list = isLimited ? itemsToRender.slice(0, MAX_REGISTRY_ROWS) : itemsToRender;

    let rowsHtml = list.map(item => {
      const { sA, sB, res } = item;
      const isInj = res.activeClassification === "INJECTION POINT";
      return `
        <tr>
          <td style="font-weight: 700; color: #1e293b;">
            <span style="color: #2563eb;">Stream ${escapeHtml(sA.streamNo)}</span> &rarr; <span style="color: #7c3aed;">Stream ${escapeHtml(sB.streamNo)}</span>
          </td>
          <td style="font-size: 12px; color: #475569;">
            <div><strong>A:</strong> ${escapeHtml(sA.content || sA.streamName || "Base Stream")}</div>
            <div><strong>B:</strong> ${escapeHtml(sB.content || sB.streamName || "Mixed / Downstream")}</div>
          </td>
          <td>
            <span class="badge-status ${isInj ? 'badge-new' : 'badge-decreased'}" style="font-size: 11px;">
              ${isInj ? '💉 ' : '🔀 '} ${escapeHtml(res.suggestedSubtitle || (isInj ? 'INJECTION POINT' : 'PROCESS MIX POINT'))}
            </span>
          </td>
          <td style="font-weight: 600; color: ${res.dT !== null && res.dT >= 50 ? '#b91c1c' : '#334155'};">
            ${res.dT !== null ? `${res.dT.toFixed(1)} °C` : 'N/A'}
          </td>
          <td style="font-size: 11.5px; color: #475569; max-width: 320px;">
            ${(res.matchedCriteria || []).slice(0, 2).map(c => `• <strong>${escapeHtml(c.title)}</strong> (${escapeHtml(c.clause)})`).join("<br>")}
          </td>
          <td>
            <span class="badge-status ${res.finalRisk === 'HIGH' ? 'badge-decreased' : res.finalRisk === 'MEDIUM' ? 'badge-removed' : 'badge-increased'}" style="font-size: 11px;">
              ${escapeHtml(res.finalRisk)}
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="stream-btn" style="padding: 4px 10px; font-size: 11.5px; background: #4f46e5; color: white;" onclick="window.StreamComparator.quickSelectTieInPair('${escapeHtml(sA.streamNo)}', '${escapeHtml(sB.streamNo)}')">
              🔍 Inspect & Control
            </button>
          </td>
        </tr>
      `;
    }).join("");

    if (isLimited) {
      rowsHtml += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 12px; background: #f8fafc; font-size: 12px; color: #64748b;">
            Displaying top ${MAX_REGISTRY_ROWS} of ${itemsToRender.length} detected points. Use the filter buttons or search box above to isolate specific streams.
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = rowsHtml;
  }

  function applyTieInFilters() {
    let items = state.allDetectedTieIns || [];
    
    // STRICT FILTER: Enforce only Injection Points and Process Mix Points
    items = items.filter(it => it.res.activeClassification === "INJECTION POINT" || it.res.activeClassification === "PROCESS MIX POINT");

    // 1. Category Filter
    if (state.currentTieInFilter === "injection") {
      items = items.filter(it => it.res.activeClassification === "INJECTION POINT");
    } else if (state.currentTieInFilter === "mixing") {
      items = items.filter(it => it.res.activeClassification === "PROCESS MIX POINT");
    } else if (state.currentTieInFilter === "thermal") {
      items = items.filter(it => it.res.dT !== null && it.res.dT >= 50);
    }

    // 2. Search Query
    if (state.currentTieInSearch) {
      const q = state.currentTieInSearch.toLowerCase().trim();
      items = items.filter(it => {
        const sANo = String(it.sA.streamNo || "").toLowerCase();
        const sBNo = String(it.sB.streamNo || "").toLowerCase();
        const descA = String(it.sA.content || it.sA.streamName || "").toLowerCase();
        const descB = String(it.sB.content || it.sB.streamName || "").toLowerCase();
        return sANo.includes(q) || sBNo.includes(q) || descA.includes(q) || descB.includes(q);
      });
    }

    renderTieInRegistryRows(items);
  }

  function filterTieInRegistry(filterType, btnEl) {
    state.currentTieInFilter = filterType;
    const btnGroup = document.getElementById("tieInFilterBtnGroup");
    if (btnGroup) {
      const btns = btnGroup.querySelectorAll(".stream-filter-btn");
      btns.forEach(b => b.classList.remove("active"));
    }
    if (btnEl) btnEl.classList.add("active");
    applyTieInFilters();
  }

  function onTieInSearch(query) {
    state.currentTieInSearch = query;
    applyTieInFilters();
  }

  async function scanPlantTieIns() {
    const tbody = document.getElementById("tieInRegistryTableBody");
    const countBadge = document.getElementById("tieInRegistryCountBadge");
    if (!tbody || !state.currentDataset || !state.currentDataset.streams) return;

    const streams = state.currentDataset.streams;
    const totalCount = streams.length;
    if (totalCount === 0) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 22px; color: #64748b; font-style: italic;">
          ⏳ <em>Scanning full datasheet (${totalCount} process streams) via Backend API for injection & mixing points...</em>
        </td>
      </tr>
    `;

    try {
      const response = await fetch("/api/stream-datasets/tie-in-physics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scan_plant",
          streams
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to scan tie-ins on backend server.");
      }

      const detectedTieIns = data.detectedTieIns || [];
      state.allDetectedTieIns = detectedTieIns;

      const injCount = detectedTieIns.filter(x => x.res?.activeClassification === "INJECTION POINT").length;
      const mixCount = detectedTieIns.filter(x => x.res?.activeClassification === "PROCESS MIX POINT").length;

      if (countBadge) {
        countBadge.textContent = `${detectedTieIns.length} Points (${injCount} Injection, ${mixCount} Mixing)`;
        countBadge.style.background = detectedTieIns.length > 0 ? "#e0e7ff" : "#f1f5f9";
        countBadge.style.color = detectedTieIns.length > 0 ? "#3730a3" : "#64748b";
      }

      if (detectedTieIns.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
              No mixing or injection tie-in pairs auto-detected in the ${streams.length} streams scanned. Use the dropdowns above to select any two streams manually.
            </td>
          </tr>
        `;
        return;
      }

      applyTieInFilters();
    } catch (e) {
      console.error("scanPlantTieIns error:", e);
      tbody.innerHTML = `<tr><td colspan="7" style="color: #dc2626; padding: 16px; text-align: center;">Error scanning tie-ins: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function renderTieInControlHub() {
    populateTieInDropdowns();
    calculateTieInPhysics();
    scanPlantTieIns();
  }

  function loadSampleComponents() {
    loadLiveDatasetFromFirestore("PFCC");
  }

  function loadSampleProperties() {
    loadLiveDatasetFromFirestore("WHFU");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function saveToFirestore() {
    if (!state.currentDataset || !state.currentDataset.streams || state.currentDataset.streams.length === 0) {
      showNotification("No stream dataset is currently loaded to save. Please upload a file or load a sample first.", true);
      return;
    }

    const defaultTitle = state.currentDataset.title || "Refinery HMB Case Study";

    let titleToSave = defaultTitle;
    if (typeof Swal !== "undefined" && Swal.fire) {
      const { value: formValues, isConfirmed } = await Swal.fire({
        title: "💾 Save Dataset to Firestore",
        html: `
          <div style="text-align: left; font-size: 13.5px; color: #475569; margin-bottom: 8px;">
            Enter a descriptive title for this process stream case study:
          </div>
          <input id="swalDatasetTitle" class="swal2-input" placeholder="e.g. NRL SOR CDU Stream Balance" value="${escapeHtml(defaultTitle)}" style="font-size: 14px; width: 85%;">
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Save to Cloud",
        confirmButtonColor: "#16a34a",
        cancelButtonText: "Cancel",
        preConfirm: () => {
          const el = document.getElementById("swalDatasetTitle");
          const val = el ? el.value.trim() : "";
          if (!val) {
            Swal.showValidationMessage("Please provide a dataset name");
            return false;
          }
          return val;
        }
      });

      if (!isConfirmed || !formValues) return;
      titleToSave = formValues;
    }

    showLoadingState(true, "Saving dataset to Firestore database...");

    try {
      const datasetPayload = {
        ...state.currentDataset,
        title: titleToSave
      };

      const userEmail = (window.APP_SESSION && window.APP_SESSION.email) || sessionStorage.getItem("loggedInUser") || "Engineer";

      const res = await fetch("/api/stream-datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: datasetPayload, userEmail })
      });

      const json = await res.json();
      showLoadingState(false);

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save dataset in Firestore");
      }

      state.currentDataset.id = json.id;
      state.currentDataset.title = titleToSave;

      const titleEl = document.getElementById("streamDocTitle");
      if (titleEl) titleEl.textContent = titleToSave;

      const badge = document.getElementById("streamSaveBadge");
      if (badge) badge.style.display = "inline-block";

      showNotification(`✅ Successfully saved "${titleToSave}" to Firestore database!`);
      fetchSavedDatasetsCount();
    } catch (err) {
      console.error("Save to Firestore error:", err);
      showLoadingState(false);
      showNotification("Error saving dataset to Firestore: " + err.message, true);
    }
  }

  async function clearDataset(silent = false) {
    if (!silent) {
      if (!state.currentDataset) {
        showNotification("No stream dataset is currently loaded.");
        return;
      }

      let proceed = true;
      if (typeof Swal !== "undefined" && Swal.fire) {
        const res = await Swal.fire({
          title: "Clear Current Dataset?",
          text: "This will reset the active stream comparison so you can upload a new Excel, PDF, or image data sheet.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#dc2626",
          confirmButtonText: "Yes, Clear",
          cancelButtonText: "Cancel"
        });
        proceed = res.isConfirmed;
      }

      if (!proceed) return;
    }

    state.currentDataset = null;
    state.streamA = null;
    state.streamB = null;
    state.selectedMatrixStreams = [];
    state.matrixChipFilter = "";
    state.selectedMatrixCase = "all";
    state.caseFilterA = "all";
    state.caseFilterB = "all";

    const casePills = document.getElementById("matrixCasePills");
    if (casePills) casePills.innerHTML = '<span style="font-size: 12px; color: #94a3b8;">No cases available</span>';

    const caseSelA = document.getElementById("caseFilterSelectA");
    const caseSelB = document.getElementById("caseFilterSelectB");
    if (caseSelA) caseSelA.innerHTML = '<option value="all">All Cases</option>';
    if (caseSelB) caseSelB.innerHTML = '<option value="all">All Cases</option>';

    // Reset file input
    const fileInput = document.getElementById("streamFileInput");
    if (fileInput) fileInput.value = "";

    // Reset Title and Badge
    const titleEl = document.getElementById("streamDocTitle");
    if (titleEl) titleEl.textContent = "No Dataset Loaded (Upload Document to Begin)";

    const modalTitleEl = document.getElementById("modalStreamDocTitle");
    if (modalTitleEl) modalTitleEl.textContent = "No Dataset Loaded";

    const badge = document.getElementById("streamSaveBadge");
    if (badge) badge.style.display = "none";

    const modalBadge = document.getElementById("modalStreamSaveBadge");
    if (modalBadge) modalBadge.style.display = "none";

    const metaBadge = document.getElementById("streamDocMetaBadge");
    if (metaBadge) {
      metaBadge.textContent = "Ready";
      metaBadge.style.background = "#e0f2fe";
      metaBadge.style.color = "#0369a1";
      metaBadge.style.borderColor = "#bae6fd";
    }

    const modalCount = document.getElementById("modalStreamCount");
    if (modalCount) modalCount.textContent = "0 Streams";

    // Clear dropdowns
    const selA = document.getElementById("streamSelectA");
    const selB = document.getElementById("streamSelectB");
    if (selA) selA.innerHTML = '<option value="">-- No Stream --</option>';
    if (selB) selB.innerHTML = '<option value="">-- No Stream --</option>';

    // Clear KPIs and tables
    const kpiGrid = document.getElementById("streamKpiGrid");
    if (kpiGrid) kpiGrid.innerHTML = '<div style="grid-column: 1 / -1; padding: 26px; text-align: center; color: #94a3b8; font-size: 13.5px;">📄 <strong>No Stream / Material Balance Data Loaded</strong><br><span style="font-size: 12.5px; color: #94a3b8;">Upload an Excel (.xlsx), PDF, or image file above to view parameters, stream comparisons, and component balances.</span></div>';

    const insightsEl = document.getElementById("streamInsightBox") || document.getElementById("streamInsightsContent");
    if (insightsEl) insightsEl.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 16px;">No streams active.</p>';

    const tableBody = document.getElementById("streamCompTableBody") || document.getElementById("streamTableBody");
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 26px; font-size: 13px;">No data loaded. Please upload a stream document above.</td></tr>';

    const matrixTable = document.getElementById("streamMatrixTable");
    if (matrixTable) matrixTable.innerHTML = '<tbody><tr><td colspan="4" style="padding: 30px; text-align: center; color: #94a3b8;">No stream data loaded. Upload an H&MB document above to view the multi-stream matrix.</td></tr></tbody>';

    const matrixChips = document.getElementById("matrixStreamChips") || document.getElementById("streamMatrixChips");
    if (matrixChips) matrixChips.innerHTML = '<div style="color: #94a3b8; font-size: 13px; padding: 6px;">No streams available. Upload a file above.</div>';

    const matrixBadge = document.getElementById("matrixStreamCountBadge");
    if (matrixBadge) {
      matrixBadge.textContent = "0 Streams";
      matrixBadge.style.background = "#f1f5f9";
      matrixBadge.style.color = "#64748b";
    }

    // Destroy active charts
    if (state.chartComparison) {
      state.chartComparison.destroy();
      state.chartComparison = null;
    }
    if (state.chartDelta) {
      state.chartDelta.destroy();
      state.chartDelta = null;
    }

    if (!silent) {
      showNotification("Dataset cleared. You can now upload a fresh file.");
    }
  }

  async function fetchSavedDatasetsCount() {
    try {
      const res = await fetch("/api/stream-datasets");
      const json = await res.json();
      if (json.success && Array.isArray(json.datasets)) {
        const countEl = document.getElementById("savedDatasetsCount");
        if (countEl) countEl.textContent = json.datasets.length;
        const countModalEl = document.getElementById("savedDatasetsCountModal");
        if (countModalEl) countModalEl.textContent = json.datasets.length;
      }
    } catch (e) {
      console.warn("fetchSavedDatasetsCount error:", e);
    }
  }

  function isUserAdmin() {
    if (window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin")) {
      return true;
    }
    try {
      const cachedRaw = (window.RBAC && window.RBAC.permissions) ? JSON.stringify(window.RBAC) : sessionStorage.getItem("cached_rbac_permissions");
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && (!cached.email || cached.email.toLowerCase().trim() === email)) {
          if (cached.isSuperAdmin || cached.role === "admin") {
            return true;
          }
        }
      }
    } catch (e) {}

    if (window.adminPanel && typeof window.adminPanel.isAdmin === "function") {
      try {
        if (window.adminPanel.isAdmin()) return true;
      } catch (e) {}
    }

    return false;
  }

  function openIngestModal() {
    const modal = document.getElementById("streamIngestModal");
    if (!modal) {
      if (window.TemplateManager && typeof window.TemplateManager.loadStreamModals === "function") {
        window.TemplateManager.loadStreamModals(openIngestModal);
      }
      return;
    }
    modal.style.display = "flex";

    const modalTitleEl = document.getElementById("modalStreamDocTitle");
    if (modalTitleEl) {
      modalTitleEl.textContent = state.currentDataset && state.currentDataset.title ? state.currentDataset.title : "No Dataset Loaded";
    }
    const modalBadge = document.getElementById("modalStreamSaveBadge");
    if (modalBadge) {
      modalBadge.style.display = state.currentDataset && state.currentDataset.id ? "inline-block" : "none";
    }
    const modalCount = document.getElementById("modalStreamCount");
    if (modalCount) {
      modalCount.textContent = state.currentDataset && state.currentDataset.streams ? `${state.currentDataset.streams.length} Streams` : "0 Streams";
    }
    fetchSavedDatasetsCount();
  }

  function closeIngestModal() {
    const modal = document.getElementById("streamIngestModal");
    if (modal) modal.style.display = "none";
  }

  async function openSavedDatasetsModal() {
    const modal = document.getElementById("savedStreamsModal");
    const listEl = document.getElementById("savedDatasetsList");
    if (!modal || !listEl) {
      if (window.TemplateManager && typeof window.TemplateManager.loadStreamModals === "function") {
        window.TemplateManager.loadStreamModals(openSavedDatasetsModal);
      }
      return;
    }

    modal.style.display = "flex";
    listEl.innerHTML = `
      <div class="stream-spinner-wrap" style="padding: 32px 16px; text-align: center;">
        <div class="stream-spinner" style="margin: 0 auto 12px auto; width: 32px; height: 32px;"></div>
        <div style="font-size: 13.5px; font-weight: 600; color: #2563eb;">Fetching saved datasets from Cloud Firestore...</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Connecting to database streamDatasets collection...</div>
      </div>
    `;

    showLoadingState(true, "Connecting to Firestore...", "Retrieving saved stream datasets from cloud database...");

    try {
      const res = await fetch("/api/stream-datasets");
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.datasets) || json.datasets.length === 0) {
        listEl.innerHTML = `
          <div style="text-align: center; padding: 32px; color: #64748b; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
            <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
            <div style="font-weight: 600; color: #334155;">No Datasets Saved in Firestore Yet</div>
            <div style="font-size: 13px; margin-top: 4px;">Click <strong>"💾 Save to Firestore"</strong> after loading any stream data sheet to store it here.</div>
          </div>
        `;
        return;
      }

      const isAdmin = isUserAdmin();

      listEl.innerHTML = json.datasets.map(d => {
        const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleString() : "Recently";
        const deleteBtnHtml = isAdmin ? `
          <button type="button" class="stream-btn" style="padding: 6px 10px; font-size: 12.5px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5;" onclick="window.StreamComparator.deleteSavedDataset('${d.id}', '${escapeHtml(d.title)}')" title="Delete dataset permanently (Admin only)">
            🗑️ Delete
          </button>
        ` : '';

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; gap: 12px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; color: #0f172a; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(d.title)}
              </div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                <span>🔢 <strong>${d.streamCount}</strong> Streams</span>
                <span style="margin: 0 6px;">•</span>
                <span>👤 ${escapeHtml(d.savedBy)}</span>
                <span style="margin: 0 6px;">•</span>
                <span>🕒 ${dateStr}</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0; align-items: center;">
              <button type="button" class="stream-btn" style="padding: 6px 12px; font-size: 12.5px; background: #2563eb; color: white;" onclick="window.StreamComparator.loadSavedDataset('${d.id}')">
                📥 Load
              </button>
              ${deleteBtnHtml}
            </div>
          </div>
        `;
      }).join("");

      const countEl = document.getElementById("savedDatasetsCount");
      if (countEl) countEl.textContent = json.datasets.length;
    } catch (err) {
      console.error("Failed to load saved datasets:", err);
      listEl.innerHTML = `<div style="color: #dc2626; padding: 16px; text-align: center;">Error loading datasets: ${escapeHtml(err.message)}</div>`;
    } finally {
      showLoadingState(false);
    }
  }

  function closeSavedDatasetsModal() {
    const modal = document.getElementById("savedStreamsModal");
    if (modal) modal.style.display = "none";
  }

  async function loadSavedDataset(id) {
    showLoadingState(true, "Loading Dataset from Firestore...", "Connecting to database & downloading full stream balance records...");
    closeSavedDatasetsModal();
    closeIngestModal();

    try {
      const res = await fetch(`/api/stream-datasets?id=${encodeURIComponent(id)}`);
      const json = await res.json();

      if (!res.ok || !json.success || !json.dataset) {
        throw new Error(json.error || "Dataset could not be retrieved");
      }

      showLoadingState(true, "Initializing Process Streams...", `Rendering ${json.dataset.streams ? json.dataset.streams.length : 0} streams & material balance matrix...`);

      // Smooth deferred hydration to allow modal transition and browser paint
      setTimeout(() => {
        try {
          loadDataset(json.dataset);

          const badge = document.getElementById("streamSaveBadge");
          if (badge) badge.style.display = "inline-block";

          const streamCount = json.dataset.streams ? json.dataset.streams.length : 0;
          showNotification(`✅ Successfully loaded "${json.dataset.title}" (${streamCount} Streams) from Firestore!`);
        } catch (loadErr) {
          console.error("loadDataset error:", loadErr);
          showNotification("Error initializing stream dataset: " + loadErr.message, true);
        } finally {
          showLoadingState(false);
        }
      }, 50);
    } catch (err) {
      console.error("loadSavedDataset error:", err);
      showLoadingState(false);
      showNotification("Error loading dataset from Firestore: " + err.message, true);
    }
  }

  async function deleteSavedDataset(id, title) {
    if (!isUserAdmin()) {
      showNotification("Permission Denied: Only administrators can delete saved datasets.", true);
      return;
    }

    let proceed = true;
    if (typeof Swal !== "undefined" && Swal.fire) {
      const res = await Swal.fire({
        title: "Delete from Firestore?",
        text: `Are you sure you want to permanently delete "${title}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "Cancel"
      });
      proceed = res.isConfirmed;
    }

    if (!proceed) return;

    showLoadingState(true, "Deleting from Firestore...", `Removing "${title}" from cloud database...`);

    try {
      const callerEmail = ((window.APP_SESSION && window.APP_SESSION.email) || sessionStorage.getItem("loggedInUser") || "").toLowerCase().trim();
      const res = await fetch(`/api/stream-datasets?id=${encodeURIComponent(id)}&callerEmail=${encodeURIComponent(callerEmail)}`, {
        method: "DELETE",
        headers: {
          "X-User-Email": callerEmail
        }
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Delete failed");
      }
      showNotification(`🗑️ Deleted "${title}" from Firestore.`);
      openSavedDatasetsModal();
      fetchSavedDatasetsCount();
    } catch (err) {
      showNotification("Failed to delete dataset: " + err.message, true);
    } finally {
      showLoadingState(false);
    }
  }

  function getAvailableStreams() {
    if (state.currentDataset && Array.isArray(state.currentDataset.streams) && state.currentDataset.streams.length > 0) {
      return state.currentDataset.streams;
    }
    return (typeof NRL_COMBINED_STREAM_DATASET !== "undefined" && NRL_COMBINED_STREAM_DATASET.streams) ? NRL_COMBINED_STREAM_DATASET.streams : [];
  }

  function getActiveStreams() {
    return {
      streamA: state.streamA,
      streamB: state.streamB,
      currentDatasetTitle: state.currentDataset?.title || ""
    };
  }

  function screenStreamInCriteria(targetOrNo) {
    let targetStream = null;
    if (targetOrNo === 'A' || targetOrNo === 'a') {
      targetStream = state.streamA;
    } else if (targetOrNo === 'B' || targetOrNo === 'b') {
      targetStream = state.streamB;
    } else if (typeof targetOrNo === 'string') {
      const all = getAvailableStreams();
      targetStream = all.find(s => s.streamNo === targetOrNo) || state.streamA;
    } else if (typeof targetOrNo === 'object' && targetOrNo) {
      targetStream = targetOrNo;
    }

    if (!targetStream) {
      targetStream = state.streamA || getAvailableStreams()[0];
    }

    if (!targetStream) {
      if (typeof showNotification === 'function') showNotification("No stream selected to screen.", true);
      return;
    }

    // Switch to criteria tab
    if (typeof window.showCriteriaTab === 'function') {
      window.showCriteriaTab();
    } else {
      document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
      const cTab = document.getElementById("a571-criteriaTab");
      if (cTab) cTab.style.display = "block";
    }

    // Load stream into criteria form and screen
    setTimeout(() => {
      if (typeof window.a571_loadStreamData === 'function') {
        window.a571_loadStreamData(targetStream);
      }
    }, 150);
  }

  // Expose Global Object
  window.StreamComparator = {
    init,
    loadDataset,
    loadSampleComponents,
    loadSampleProperties,
    loadSampleNRL: loadSampleProperties,
    loadSampleCombined,
    loadSampleMultiCase,
    setMode,
    showNotification,
    openMergeFileInput,
    mergeDataset: mergeIncomingDataset,
    saveToFirestore,
    clearDataset,
    fetchSavedDatasetsCount,
    openIngestModal,
    closeIngestModal,
    openSavedDatasetsModal,
    closeSavedDatasetsModal,
    loadSavedDataset,
    deleteSavedDataset,
    onStreamChange,
    setFilter,
    setSearch,
    setDisplayBasis,
    switchView,
    exportToExcel,
    exportFullDatasetToExcel,
    downloadExcelTemplate,
    toggleMatrixStream,
    selectAllMatrixStreams,
    clearMatrixStreams,
    selectComparePairMatrix,
    renderMatrixChips,
    filterMatrixChips,
    renderMatrixTable,
    renderTieInControlHub,
    onTieInStreamChange,
    quickSelectTieInPair,
    runTieInAnalysis,
    calculateTieInPhysics,
    scanPlantTieIns,
    filterTieInRegistry,
    onTieInSearch,
    getAvailableStreams,
    getActiveStreams,
    screenStreamInCriteria,
    renderMatrixCasePills,
    setMatrixCaseFilter,
    compareCasesInMatrix,
    promptSelectStreamAcrossCases,
    quickCompareCase,
    onCaseFilterChange,
    populateCaseFilterSelects,
    enrichDatasetWithCases,
    detectCaseTag,
    cleanBaseStreamNo,
    handleFileUpload: (file, isMerge = false) => {
      return new Promise((resolve, reject) => {
        try {
          if (!file) return reject(new Error("No file provided"));
          const reader = new FileReader();
          reader.onload = function(e) {
            try {
              if (typeof XLSX === "undefined") {
                throw new Error("SheetJS XLSX library is not loaded.");
              }
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: "array" });
              let aggregatedDataset = null;
              for (let i = 0; i < workbook.SheetNames.length; i++) {
                const sheetName = workbook.SheetNames[i];
                const worksheet = workbook.Sheets[sheetName];
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                if (rawJson && rawJson.length >= 2) {
                  try {
                    const sheetDataset = extractStreamsFromTableRows(rawJson, `${file.name} - ${sheetName}`, sheetName);
                    if (sheetDataset && sheetDataset.streams && sheetDataset.streams.length > 0) {
                      if (!aggregatedDataset) {
                        aggregatedDataset = sheetDataset;
                      } else {
                        aggregatedDataset = mergeDatasets(aggregatedDataset, sheetDataset);
                      }
                    }
                  } catch (err) {
                    console.warn(`Sheet ${sheetName} could not be extracted:`, err);
                  }
                }
              }
              if (!aggregatedDataset || !aggregatedDataset.streams || aggregatedDataset.streams.length === 0) {
                throw new Error("Could not detect valid process stream tables or chemical component rows in the uploaded Excel sheet.");
              }
              if (isMerge && state.currentDataset) {
                mergeIncomingDataset(aggregatedDataset);
              } else {
                loadDataset(aggregatedDataset);
              }
              showNotification(`✅ Successfully loaded ${aggregatedDataset.streams.length} process streams and chemical components!`);
              resolve(aggregatedDataset);
            } catch (err) {
              showNotification("Failed to parse Excel file: " + err.message, true);
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error("Error reading file stream."));
          reader.readAsArrayBuffer(file);
        } catch (err) {
          reject(err);
        }
      });
    },
    loadDatasetById: loadSavedDataset,
    processUploadedFiles,
    extractStreamsFromTableRows,
    mergeDatasets,
    getCurrentDataset: () => state.currentDataset
  };

  // Run init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
