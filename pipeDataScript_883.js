// ============================================================================
// PIPE DATA SCRIPT 883 (UI Client & Backend API Bridge)
// ASME B36.10M / ASME B36.19M Pipe Dimensional Data Interface
// Migrated exclusively to Backend API (/api/pipe-dimensions)
// Authoritative dimensional datasets & geometric calculations
// ============================================================================

(function () {
  "use strict";

  // Global namespace exports - initialized empty to avoid stale / duplicate static datasets
  if (typeof window !== "undefined") {
    window.pipeOD883 = window.pipeOD883 || {};
    window.pipeDataMaster883 = window.pipeDataMaster883 || {};
  }

  const DECIMAL_MAP = {
    "1/8": "0.125", "1/4": "0.25", "3/8": "0.375", "1/2": "0.5",
    "3/4": "0.75", "1": "1.0", "1 1/4": "1.25", "1 1/2": "1.5",
    "2": "2.0", "2 1/2": "2.5", "3": "3.0", "3 1/2": "3.5",
    "4": "4.0", "5": "5.0", "6": "6.0", "8": "8.0",
    "10": "10.0", "12": "12.0", "14": "14.0", "16": "16.0",
    "18": "18.0", "20": "20.0", "22": "22.0", "24": "24.0"
  };

  const STANDARD_NPS_LIST = [
    "1/8", "1/4", "3/8", "1/2", "3/4", "1", "1 1/4", "1 1/2",
    "2", "2 1/2", "3", "3 1/2", "4", "5", "6", "8",
    "10", "12", "14", "16", "18", "20", "22", "24",
    "26", "28", "30", "32", "34", "36", "40", "42", "48"
  ];

  let activeNpsList = [...STANDARD_NPS_LIST];
  let isFetching = false;
  let isLoaded = false;
  let fetchPromise = null;

  // Inject spinner keyframes if needed
  if (typeof document !== "undefined" && !document.getElementById("pipe-loader-style-883")) {
    const style = document.createElement("style");
    style.id = "pipe-loader-style-883";
    style.textContent = `
      @keyframes pipeSpin883 {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .pipe-spin-anim-883 {
        display: inline-block;
        animation: pipeSpin883 0.9s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Helper to show real network loading spinner in UI
   */
  function showLoadingState() {
    const selectNPS883 = document.getElementById("select_nps_883");
    const selectSCH883 = document.getElementById("select_sch_883");
    const resultThickness = document.getElementById("result_thickness_883");

    if (selectNPS883 && !isLoaded) {
      selectNPS883.disabled = true;
      selectNPS883.innerHTML = `<option value="">⌛ Loading ASME Piping Standards...</option>`;
    }

    if (selectSCH883 && !isLoaded) {
      selectSCH883.disabled = true;
      selectSCH883.innerHTML = `<option value="">⌛ Loading ASME Piping Standards...</option>`;
    }

    if (resultThickness && !isLoaded) {
      resultThickness.innerHTML = `
        <div id="pipe_loading_indicator_883" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:22px;background:rgba(15,23,42,0.6);border:1px dashed #38bdf8;border-radius:8px;color:#38bdf8;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
          <svg class="pipe-spin-anim-883" style="width:22px;height:22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <span style="font-weight:500;">Fetching ASME B36.10M / B36.19M Dimensional Standards from Backend...</span>
        </div>
      `;
    }
  }

  /**
   * Helper to show network error state in UI
   */
  function showErrorState(errorMsg) {
    const selectNPS883 = document.getElementById("select_nps_883");
    const selectSCH883 = document.getElementById("select_sch_883");
    const resultThickness = document.getElementById("result_thickness_883");

    if (selectNPS883) {
      selectNPS883.disabled = false;
      selectNPS883.innerHTML = `<option value="">-- Network Error: Retry Below --</option>`;
    }

    if (selectSCH883) {
      selectSCH883.disabled = false;
      selectSCH883.innerHTML = `<option value="">-- Network Error --</option>`;
    }

    if (resultThickness) {
      resultThickness.innerHTML = `
        <div style="background:rgba(239,68,68,0.12);border:1px solid #ef4444;border-radius:8px;padding:16px 20px;color:#fca5a5;text-align:center;">
          <p style="margin:0 0 10px 0;font-weight:600;font-size:14px;">⚠️ Failed to load pipe dimensions from backend API (${errorMsg || "Network Error"}).</p>
          <button type="button" id="pipe_retry_btn_883" style="padding:7px 16px;background:#0284c7;color:#ffffff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            <span>🔄 Retry Loading Pipe Standards</span>
          </button>
        </div>
      `;

      const retryBtn = document.getElementById("pipe_retry_btn_883");
      if (retryBtn) {
        retryBtn.addEventListener("click", function () {
          fetchPromise = null;
          loadPipeDimensionsMaster();
        });
      }
    }
  }

  /**
   * Asynchronous Loader: Fetches standard pipe dimensions exclusively from backend API
   */
  async function loadPipeDimensionsMaster() {
    if (isLoaded && Object.keys(window.pipeDataMaster883 || {}).length > 0) {
      populateNPSDropdown();
      return { master: window.pipeDataMaster883, odMap: window.pipeOD883 };
    }

    if (isFetching && fetchPromise) {
      return fetchPromise;
    }

    isFetching = true;
    showLoadingState();

    fetchPromise = (async () => {
      try {
        const res = await fetch("/api/pipe-dimensions", {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });

        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}`);
        }

        const data = await res.json();
        if (!data || !data.success) {
          throw new Error(data?.error || "Invalid response format from /api/pipe-dimensions");
        }

        const master = data.master || data.pipeDataMaster || {};
        const odMap = data.odMap || data.pipeOD || {};

        // Merge into global objects
        window.pipeOD883 = Object.assign(window.pipeOD883 || {}, odMap);
        window.pipeDataMaster883 = Object.assign(window.pipeDataMaster883 || {}, master);

        // Ensure decimal aliases are mapped
        for (const [frac, dec] of Object.entries(DECIMAL_MAP)) {
          if (window.pipeDataMaster883[frac]) {
            window.pipeDataMaster883[dec] = window.pipeDataMaster883[frac];
            const clean = dec.replace(/\.0$/, "");
            if (clean && !window.pipeDataMaster883[clean]) {
              window.pipeDataMaster883[clean] = window.pipeDataMaster883[frac];
            }
          }
          if (window.pipeOD883[frac]) {
            window.pipeOD883[dec] = window.pipeOD883[frac];
            const clean = dec.replace(/\.0$/, "");
            if (clean && !window.pipeOD883[clean]) {
              window.pipeOD883[clean] = window.pipeOD883[frac];
            }
          }
        }

        if (Array.isArray(data.npsList) && data.npsList.length > 0) {
          activeNpsList = data.npsList;
        }

        isLoaded = true;
        isFetching = false;

        // Populate dropdowns & trigger auto-selection
        populateNPSDropdown();

        // Dispatch custom window event for other dependent modules (b313, simple, structural, chatbot)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pipe-data-ready", {
            detail: {
              master: window.pipeDataMaster883,
              odMap: window.pipeOD883,
              standard: data.standard || "ASME B36.10M / ASME B36.19M"
            }
          }));
        }

        return { master: window.pipeDataMaster883, odMap: window.pipeOD883 };
      } catch (err) {
        isFetching = false;
        console.error("Error loading pipe dimensions from /api/pipe-dimensions:", err);
        showErrorState(err?.message || "Failed to fetch");
        throw err;
      }
    })();

    return fetchPromise;
  }

  /**
   * Populate NPS dropdown from backend data
   */
  function populateNPSDropdown() {
    const selectNPS883 = document.getElementById("select_nps_883");
    if (!selectNPS883) return;

    selectNPS883.disabled = false;
    const currentNps = selectNPS883.value;
    selectNPS883.innerHTML = `<option value="">-- Select NPS Size --</option>`;

    const odMap = window.pipeOD883 || {};
    const npsItems = activeNpsList.length > 0 ? activeNpsList : Object.keys(odMap);

    npsItems.forEach(nps => {
      // Avoid duplicate decimal values in main dropdown
      if (nps.includes(".") && !["0.125", "0.25", "0.375"].includes(nps)) return;

      const od = odMap[nps];
      const opt = document.createElement("option");
      opt.value = nps;
      opt.textContent = od
        ? `NPS ${nps}" (OD: ${od} mm / ${(od / 25.4).toFixed(3)}")`
        : `NPS ${nps}"`;
      if (nps === currentNps) opt.selected = true;
      selectNPS883.appendChild(opt);
    });

    // If nothing selected yet, default to standard NPS 2"
    if (!selectNPS883.value && npsItems.includes("2")) {
      selectNPS883.value = "2";
    }

    if (selectNPS883.value) {
      updateScheduleOptions(selectNPS883.value);
    } else {
      const selectSCH883 = document.getElementById("select_sch_883");
      if (selectSCH883) {
        selectSCH883.disabled = false;
        selectSCH883.innerHTML = `<option value="">-- Select NPS First --</option>`;
      }
      renderPipeResults(null);
    }
  }

  /**
   * Populate schedule dropdown based on chosen NPS
   */
  function updateScheduleOptions(nps) {
    const selectSCH883 = document.getElementById("select_sch_883");
    if (!selectSCH883) return;

    selectSCH883.disabled = false;
    selectSCH883.innerHTML = `<option value="">-- Select Schedule (SCH) --</option>`;

    const master = window.pipeDataMaster883 || {};
    const schedules = master[nps] || master[DECIMAL_MAP[nps]] || {};
    const schKeys = Object.keys(schedules);

    if (schKeys.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "-- No schedules defined for this size --";
      selectSCH883.appendChild(opt);
      renderPipeResults(null);
      return;
    }

    schKeys.forEach(sch => {
      const wt = schedules[sch];
      const opt = document.createElement("option");
      opt.value = sch;
      opt.textContent = wt
        ? `${sch} — (WT: ${wt} mm / ${(wt / 25.4).toFixed(3)}")`
        : sch;
      selectSCH883.appendChild(opt);
    });

    // Auto-select standard schedule (SCH 40, SCH STD, SCH 40S, or first)
    if (schKeys.includes("SCH 40")) {
      selectSCH883.value = "SCH 40";
    } else if (schKeys.includes("SCH STD")) {
      selectSCH883.value = "SCH STD";
    } else if (schKeys.includes("SCH 40S")) {
      selectSCH883.value = "SCH 40S";
    } else if (schKeys.length > 0) {
      selectSCH883.value = schKeys[0];
    }

    calculateAndRender(nps, selectSCH883.value);
  }

  /**
   * Calculate and render dimensions
   */
  function calculateAndRender(nps, sch) {
    if (!nps || !sch) {
      renderPipeResults(null);
      return;
    }

    const master = window.pipeDataMaster883 || {};
    const odMap = window.pipeOD883 || {};

    const schedules = master[nps] || master[DECIMAL_MAP[nps]] || {};
    const thickVal = schedules[sch];
    const odVal = odMap[nps] || odMap[DECIMAL_MAP[nps]];

    const thick = parseFloat(thickVal);
    const od = parseFloat(odVal);

    if (isNaN(thick) || isNaN(od) || thick <= 0 || od <= 0) {
      renderPipeResults(null);
      return;
    }

    const id = parseFloat((od - 2 * thick).toFixed(2));
    const circumference = parseFloat((Math.PI * od).toFixed(2));
    const unitWeightKg = parseFloat((0.0246615 * thick * (od - thick)).toFixed(2));
    const unitWeightLb = parseFloat((unitWeightKg * 0.6719689).toFixed(2));
    const flowAreaCm2 = parseFloat(((Math.PI / 4) * Math.pow(id / 10, 2)).toFixed(2));

    renderPipeResults({
      nps,
      sch,
      od,
      thick,
      id,
      circumference,
      unitWeightKg,
      unitWeightLb,
      flowAreaCm2
    });
  }

  /**
   * Render result cards into DOM
   */
  function renderPipeResults(calc) {
    const resultThickness = document.getElementById("result_thickness_883");
    const resultOD = document.getElementById("result_od_883");
    const resultCirc = document.getElementById("result_circumference_883");
    const resultID = document.getElementById("result_id_883");

    if (!calc) {
      if (resultThickness) {
        resultThickness.innerHTML = `<span style="color: #cbd5e1; font-size: 16px; font-weight: normal;">Please select an NPS size and Schedule above.</span>`;
      }
      if (resultOD) resultOD.innerHTML = "";
      if (resultCirc) resultCirc.innerHTML = "";
      if (resultID) resultID.innerHTML = "";
      return;
    }

    const thickIn = (calc.thick / 25.4).toFixed(3);
    const odIn = (calc.od / 25.4).toFixed(3);
    const idIn = (calc.id / 25.4).toFixed(3);
    const circIn = (calc.circumference / 25.4).toFixed(3);

    if (resultThickness) {
      resultThickness.innerHTML = `
        <div class="pipe-results-grid">
          <div class="pipe-result-card" style="border-left: 4px solid #38bdf8;">
            <span class="res-label">📏 Nominal Wall Thickness (t):</span>
            <span class="res-val">${calc.thick} mm <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">(${thickIn}")</span></span>
          </div>
          <div class="pipe-result-card" style="border-left: 4px solid #60a5fa;">
            <span class="res-label">⭕ Outside Diameter (OD):</span>
            <span class="res-val">${calc.od} mm <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">(${odIn}")</span></span>
          </div>
          <div class="pipe-result-card" style="border-left: 4px solid #34d399;">
            <span class="res-label">🔘 Inside Diameter (ID):</span>
            <span class="res-val" style="color: #34d399;">${calc.id} mm <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">(${idIn}")</span></span>
          </div>
          <div class="pipe-result-card" style="border-left: 4px solid #a78bfa;">
            <span class="res-label">🔄 Outer Circumference:</span>
            <span class="res-val" style="color: #c084fc;">${calc.circumference} mm <span style="font-size: 13px; color: #94a3b8; font-weight: 500;">(${circIn}")</span></span>
          </div>
          <div class="pipe-result-card" style="border-left: 4px solid #fbbf24;">
            <span class="res-label">⚖️ Plain End Pipe Weight:</span>
            <span class="res-val" style="color: #fbbf24; font-size: 15px;">${calc.unitWeightKg} kg/m <span style="font-size: 12px; color: #94a3b8;">(${calc.unitWeightLb} lb/ft)</span></span>
          </div>
          <div class="pipe-result-card" style="border-left: 4px solid #38bdf8;">
            <span class="res-label">🌊 Internal Flow Area:</span>
            <span class="res-val" style="font-size: 15px;">${calc.flowAreaCm2} cm²</span>
          </div>
        </div>
      `;
    }

    if (resultOD) resultOD.innerHTML = "";
    if (resultCirc) resultCirc.innerHTML = "";
    if (resultID) resultID.innerHTML = "";
  }

  /**
   * Main initializer for Pipe Thickness Finder
   */
  function initPipeData883() {
    const selectNPS883 = document.getElementById("select_nps_883");
    const selectSCH883 = document.getElementById("select_sch_883");

    if (!selectNPS883 || !selectSCH883) return;

    if (!selectNPS883._bound) {
      selectNPS883._bound = true;
      selectNPS883.addEventListener("change", function () {
        updateScheduleOptions(this.value);
      });
    }

    if (!selectSCH883._bound) {
      selectSCH883._bound = true;
      selectSCH883.addEventListener("change", function () {
        calculateAndRender(selectNPS883.value, this.value);
      });
    }

    if (isLoaded) {
      populateNPSDropdown();
    } else {
      loadPipeDimensionsMaster();
    }
  }

  /**
   * Shared helper for other modules to resolve closest NPS key from OD or text
   */
  function getPipeDataNpsKey(odValue, optionText) {
    const master = window.pipeDataMaster883;
    if (!master) return null;

    const numOD = parseFloat(odValue);
    if (isNaN(numOD)) return null;

    const odMap = window.pipeOD883;
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
        if (master[rawNps]) return rawNps;
      }
    }
    return null;
  }

  // Execute immediate fetch on script evaluation
  loadPipeDimensionsMaster();

  // Attach DOM readiness handlers
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initPipeData883);
    } else {
      initPipeData883();
    }

    // Auto-init on tab navigation or DOM mutation
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-rbac-sub="pipeThickness"], [href*="pipeThickness"]')) {
        setTimeout(initPipeData883, 50);
      }
    });
  }

  // Preserve global exports & cross-module compatibility
  if (typeof window !== "undefined") {
    window.initPipeData883 = initPipeData883;
    window.loadPipeDimensionsMaster = loadPipeDimensionsMaster;
    window.loadPipeDimensionsFromBackend = loadPipeDimensionsMaster;
    window.populateNPSDropdown = populateNPSDropdown;
    window.updateScheduleOptions = updateScheduleOptions;
    window.calculateAndRenderPipe883 = calculateAndRender;
    window.getPipeDataNpsKey = getPipeDataNpsKey;

    window.whenPipeDataReady = function () {
      if (isLoaded) {
        return Promise.resolve({
          master: window.pipeDataMaster883,
          odMap: window.pipeOD883
        });
      }
      return loadPipeDimensionsMaster();
    };

    window.getPipeDataMaster = function () {
      return window.pipeDataMaster883;
    };

    window.getPipeOD = function () {
      return window.pipeOD883;
    };
  }
})();
