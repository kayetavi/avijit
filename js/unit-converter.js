/* ============================================================================
   📐 Plant & Integrity Core Unit Converters Engine (Section 1)
   Instant Reactive Calculations, Clipboard Support & Filter Engine
   ============================================================================ */

(function () {
  "use strict";

  // State
  let isUpdating = false;
  let pressureIsGauge = true; // true = Gauge (g), false = Absolute (a)
  const ATM_BAR = 1.01325;
  const ATM_PSI = 14.695948775;
  const ATM_KGCM2 = 1.033227;
  const ATM_MPA = 0.101325;
  const ATM_KPA = 101.325;

  // Helper: Format floating numbers cleanly
  function fmt(val, maxDecimals = 4) {
    if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return "";
    if (val === 0) return "0";
    const abs = Math.abs(val);
    if (abs >= 1e6 || (abs < 0.0001 && abs > 0)) {
      return val.toExponential(4);
    }
    // Round to maxDecimals avoiding trailing floating inaccuracies
    const factor = Math.pow(10, maxDecimals);
    const rounded = Math.round(val * factor) / factor;
    return String(rounded);
  }

  function parse(val) {
    if (val === null || val === undefined || val === "") return NaN;
    const num = parseFloat(String(val).replace(/,/g, ""));
    return isNaN(num) ? NaN : num;
  }

  function setVal(id, val, maxDecimals = 4) {
    const el = document.getElementById(id);
    if (el) {
      el.value = fmt(val, maxDecimals);
    }
  }

  // Decimal to nearest standard fraction for inches
  function toFraction(val) {
    if (isNaN(val) || val <= 0) return "--";
    const whole = Math.floor(val);
    const remainder = val - whole;
    if (remainder < 0.001) return whole > 0 ? `${whole}"` : `0"`;

    // Denominators up to 64
    const denominators = [2, 4, 8, 16, 32, 64];
    let bestNumerator = 0;
    let bestDenominator = 1;
    let minError = 999;

    for (const d of denominators) {
      const n = Math.round(remainder * d);
      const error = Math.abs(remainder - n / d);
      if (error < minError) {
        minError = error;
        bestNumerator = n;
        bestDenominator = d;
      }
    }

    // Simplify fraction
    function gcd(a, b) {
      return b === 0 ? a : gcd(b, a % b);
    }
    const g = gcd(bestNumerator, bestDenominator);
    bestNumerator /= g;
    bestDenominator /= g;

    if (bestNumerator === bestDenominator) {
      return `${whole + 1}"`;
    }
    if (bestNumerator === 0) {
      return whole > 0 ? `${whole}"` : `0"`;
    }

    const fracStr = `${bestNumerator}/${bestDenominator}"`;
    return whole > 0 ? `${whole} ${fracStr}` : fracStr;
  }

  // 1-Click Copy with feedback
  function copyFieldValue(fieldId, btnEl) {
    const el = document.getElementById(fieldId);
    if (!el || !el.value) return;
    navigator.clipboard.writeText(el.value).then(() => {
      const origText = btnEl.innerHTML;
      btnEl.innerHTML = "✓";
      btnEl.style.color = "#16a34a";
      setTimeout(() => {
        btnEl.innerHTML = origText;
        btnEl.style.color = "";
      }, 1200);
    }).catch(err => {
      console.warn("Copy to clipboard failed:", err);
    });
  }
  window.copyFieldValue = copyFieldValue;

  // ==========================================================================
  // 1. CORROSION RATE CONVERTER
  // ==========================================================================
  function updateCorrosionRate(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearCorrosionRate();
        isUpdating = false;
        return;
      }

      // Standardize base to mm/year
      let mmyr = 0;
      switch (sourceId) {
        case "uc_cr_mmyr":
          mmyr = val;
          break;
        case "uc_cr_mpy":
          mmyr = val / 39.37007874;
          break;
        case "uc_cr_umyr":
          mmyr = val / 1000;
          break;
        case "uc_cr_nmhr":
          mmyr = (val * 8760) / 1e6;
          break;
        case "uc_cr_inyr":
          mmyr = val * 25.4;
          break;
      }

      // Propagate to other fields
      if (sourceId !== "uc_cr_mmyr") setVal("uc_cr_mmyr", mmyr, 4);
      if (sourceId !== "uc_cr_mpy") setVal("uc_cr_mpy", mmyr * 39.37007874, 3);
      if (sourceId !== "uc_cr_umyr") setVal("uc_cr_umyr", mmyr * 1000, 2);
      if (sourceId !== "uc_cr_nmhr") setVal("uc_cr_nmhr", (mmyr * 1e6) / 8760, 2);
      if (sourceId !== "uc_cr_inyr") setVal("uc_cr_inyr", mmyr / 25.4, 5);

      // Severity Assessment
      const statusBox = document.getElementById("uc_cr_status");
      if (statusBox) {
        const mpy = mmyr * 39.37007874;
        statusBox.className = "uc-status-box";
        if (mmyr < 0.025) {
          statusBox.classList.add("uc-status-green");
          statusBox.innerHTML = `<span>🟢</span> <div><strong>Low / Negligible Corrosion</strong> (&lt; 1 mpy / &lt; 0.025 mm/yr). Excellent material selection under baseline service.</div>`;
        } else if (mmyr <= 0.125) {
          statusBox.classList.add("uc-status-blue");
          statusBox.innerHTML = `<span>🔵</span> <div><strong>Moderate / Acceptable</strong> (1 to 5 mpy / 0.025 to 0.125 mm/yr). Normal industrial design range for carbon steel.</div>`;
        } else if (mmyr <= 0.250) {
          statusBox.classList.add("uc-status-amber");
          statusBox.innerHTML = `<span>🟡</span> <div><strong>High / Cautionary</strong> (5 to 10 mpy / 0.125 to 0.250 mm/yr). Requires active mitigation, chemical dosing, or elevated CML frequency.</div>`;
        } else {
          statusBox.classList.add("uc-status-red");
          statusBox.innerHTML = `<span>🔴</span> <div><strong>Severe / Critical</strong> (&gt; 10 mpy / &gt; 0.250 mm/yr). Severe thinning risk. Statutory API 510/570 inspection required immediately.</div>`;
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearCorrosionRate() {
    ["uc_cr_mmyr", "uc_cr_mpy", "uc_cr_umyr", "uc_cr_nmhr", "uc_cr_inyr"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const statusBox = document.getElementById("uc_cr_status");
    if (statusBox) {
      statusBox.className = "uc-status-box uc-status-blue";
      statusBox.innerHTML = `<span>ℹ️</span> <div>Type a corrosion rate in any field to calculate all engineering equivalents.</div>`;
    }
  }

  // ==========================================================================
  // 2. PRESSURE & STRESS CONVERTER
  // ==========================================================================
  function setPressureMode(mode) {
    if ((mode === "gauge" && pressureIsGauge) || (mode === "abs" && !pressureIsGauge)) return;
    pressureIsGauge = mode === "gauge";

    // Toggle button active classes
    const btnG = document.getElementById("uc_btn_press_gauge");
    const btnA = document.getElementById("uc_btn_press_abs");
    if (btnG) btnG.classList.toggle("active", pressureIsGauge);
    if (btnA) btnA.classList.toggle("active", !pressureIsGauge);

    // Update tags text
    const suffix = pressureIsGauge ? "(g)" : "(a)";
    const tagBar = document.getElementById("uc_tag_press_bar");
    const tagPsi = document.getElementById("uc_tag_press_psi");
    const tagKg = document.getElementById("uc_tag_press_kg");
    if (tagBar) tagBar.innerText = `bar${suffix}`;
    if (tagPsi) tagPsi.innerText = pressureIsGauge ? "psig" : "psia";
    if (tagKg) tagKg.innerText = `kg/cm²${suffix}`;

    // Recalculate using current bar input
    const barEl = document.getElementById("uc_pr_bar");
    if (barEl && barEl.value !== "") {
      updatePressure("uc_pr_bar");
    }
  }
  window.setPressureMode = setPressureMode;

  function updatePressure(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearPressure();
        isUpdating = false;
        return;
      }

      // Base: bar in current mode
      let bar = 0;
      switch (sourceId) {
        case "uc_pr_bar":
          bar = val;
          break;
        case "uc_pr_psi":
          bar = val / 14.503773773;
          break;
        case "uc_pr_kgcm2":
          bar = val / 1.019716213;
          break;
        case "uc_pr_mpa":
          bar = val * 10;
          break;
        case "uc_pr_kpa":
          bar = val / 100;
          break;
        case "uc_pr_atm":
          bar = val * ATM_BAR;
          break;
        case "uc_pr_mmh2o":
          bar = val / 10197.16213;
          break;
        case "uc_pr_inhg":
          bar = val / 29.529983;
          break;
        case "uc_pr_mmhg":
          bar = val / 750.06168;
          break;
      }

      // Propagate
      if (sourceId !== "uc_pr_bar") setVal("uc_pr_bar", bar, 4);
      if (sourceId !== "uc_pr_psi") setVal("uc_pr_psi", bar * 14.503773773, 3);
      if (sourceId !== "uc_pr_kgcm2") setVal("uc_pr_kgcm2", bar * 1.019716213, 4);
      if (sourceId !== "uc_pr_mpa") setVal("uc_pr_mpa", bar / 10, 5);
      if (sourceId !== "uc_pr_kpa") setVal("uc_pr_kpa", bar * 100, 2);
      if (sourceId !== "uc_pr_atm") setVal("uc_pr_atm", bar / ATM_BAR, 4);
      if (sourceId !== "uc_pr_mmh2o") setVal("uc_pr_mmh2o", bar * 10197.16213, 1);
      if (sourceId !== "uc_pr_inhg") setVal("uc_pr_inhg", bar * 29.529983, 3);
      if (sourceId !== "uc_pr_mmhg") setVal("uc_pr_mmhg", bar * 750.06168, 2);

      // Status indicator with equivalent absolute / gauge reference
      const statusBox = document.getElementById("uc_pr_status");
      if (statusBox) {
        const altMode = pressureIsGauge ? "Absolute" : "Gauge";
        const altBar = pressureIsGauge ? bar + ATM_BAR : bar - ATM_BAR;
        const altPsi = pressureIsGauge ? bar * 14.50377 + ATM_PSI : bar * 14.50377 - ATM_PSI;
        statusBox.className = "uc-status-box uc-status-blue";
        statusBox.innerHTML = `<span>⚙️</span> <div>Equivalent <strong>${altMode} Pressure</strong>: <strong>${fmt(altBar, 3)} bar(${altMode[0].toLowerCase()})</strong> | <strong>${fmt(altPsi, 2)} ${pressureIsGauge ? 'psia' : 'psig'}</strong> (assuming 1 atm = 1.01325 bar)</div>`;
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearPressure() {
    ["uc_pr_bar", "uc_pr_psi", "uc_pr_kgcm2", "uc_pr_mpa", "uc_pr_kpa", "uc_pr_atm", "uc_pr_mmh2o", "uc_pr_inhg", "uc_pr_mmhg"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const statusBox = document.getElementById("uc_pr_status");
    if (statusBox) {
      statusBox.className = "uc-status-box uc-status-blue";
      statusBox.innerHTML = `<span>ℹ️</span> <div>Toggle between Gauge (g) and Absolute (a) pressure at the top.</div>`;
    }
  }

  // ==========================================================================
  // 3. TEMPERATURE CONVERTER
  // ==========================================================================
  function updateTemperature(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearTemperature();
        isUpdating = false;
        return;
      }

      // Base: °C
      let c = 0;
      switch (sourceId) {
        case "uc_temp_c":
          c = val;
          break;
        case "uc_temp_f":
          c = (val - 32) / 1.8;
          break;
        case "uc_temp_k":
          c = val - 273.15;
          break;
        case "uc_temp_r":
          c = (val - 491.67) / 1.8;
          break;
      }

      if (sourceId !== "uc_temp_c") setVal("uc_temp_c", c, 2);
      if (sourceId !== "uc_temp_f") setVal("uc_temp_f", c * 1.8 + 32, 2);
      if (sourceId !== "uc_temp_k") setVal("uc_temp_k", c + 273.15, 2);
      if (sourceId !== "uc_temp_r") setVal("uc_temp_r", (c + 273.15) * 1.8, 2);

      // Diagnostic Benchmark
      const statusBox = document.getElementById("uc_temp_status");
      if (statusBox) {
        statusBox.className = "uc-status-box";
        if (c < 0) {
          statusBox.classList.add("uc-status-blue");
          statusBox.innerHTML = `<span>❄️</span> <div><strong>Sub-Zero / Cryogenic Regime</strong> (&lt; 0°C). Check for MDMT, brittle fracture, and Charpy impact exemption curves.</div>`;
        } else if (c <= 205) {
          statusBox.classList.add("uc-status-green");
          statusBox.innerHTML = `<span>🟢</span> <div><strong>Standard Process Temperature</strong> (&le; 205°C / 400°F). Baseline allowable stresses apply; below sulfidation threshold.</div>`;
        } else if (c < 400) {
          statusBox.classList.add("uc-status-amber");
          statusBox.innerHTML = `<span>🟡</span> <div><strong>High Temperature Regime</strong> (205°C to 400°C / 400°F to 750°F). Exceeds Modified McConomy sulfidation threshold (&gt; 230°C). Check HTHA Nelson Curve.</div>`;
        } else {
          statusBox.classList.add("uc-status-red");
          statusBox.innerHTML = `<span>🔥</span> <div><strong>Creep & Metallurgical Damage Regime</strong> (&ge; 400°C / &ge; 750°F). Material in time-dependent allowable stress range. Susceptible to thermal fatigue & creep.</div>`;
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearTemperature() {
    ["uc_temp_c", "uc_temp_f", "uc_temp_k", "uc_temp_r"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const statusBox = document.getElementById("uc_temp_status");
    if (statusBox) {
      statusBox.className = "uc-status-box uc-status-blue";
      statusBox.innerHTML = `<span>ℹ️</span> <div>Instant conversion across Celsius, Fahrenheit, Kelvin, and Rankine scales.</div>`;
    }
  }

  // ==========================================================================
  // 4. THICKNESS, LENGTH & CORROSION ALLOWANCE
  // ==========================================================================
  function updateThickness(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearThickness();
        isUpdating = false;
        return;
      }

      // Base: mm
      let mm = 0;
      switch (sourceId) {
        case "uc_th_mm":
          mm = val;
          break;
        case "uc_th_mil":
          mm = val * 0.0254;
          break;
        case "uc_th_in_dec":
          mm = val * 25.4;
          break;
        case "uc_th_m":
          mm = val * 1000;
          break;
        case "uc_th_ft":
          mm = val * 304.8;
          break;
      }

      if (sourceId !== "uc_th_mm") setVal("uc_th_mm", mm, 4);
      if (sourceId !== "uc_th_mil") setVal("uc_th_mil", mm / 0.0254, 2);
      if (sourceId !== "uc_th_in_dec") setVal("uc_th_in_dec", mm / 25.4, 4);
      if (sourceId !== "uc_th_m") setVal("uc_th_m", mm / 1000, 5);
      if (sourceId !== "uc_th_ft") setVal("uc_th_ft", mm / 304.8, 4);

      // Update fraction display
      const fracEl = document.getElementById("uc_th_in_frac");
      if (fracEl) {
        fracEl.value = toFraction(mm / 25.4);
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearThickness() {
    ["uc_th_mm", "uc_th_mil", "uc_th_in_dec", "uc_th_in_frac", "uc_th_m", "uc_th_ft"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  // ==========================================================================
  // 5. FLOW RATES (MASS & VOLUMETRIC PROCESS STREAMS)
  // ==========================================================================
  function updateFlow(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearFlow();
        isUpdating = false;
        return;
      }

      // Handle Mass Flow (Base: kg/hr)
      if (["uc_fl_kghr", "uc_fl_mtday", "uc_fl_lbhr", "uc_fl_tonhr"].includes(sourceId)) {
        let kghr = 0;
        switch (sourceId) {
          case "uc_fl_kghr":
            kghr = val;
            break;
          case "uc_fl_mtday":
            kghr = (val * 1000) / 24;
            break;
          case "uc_fl_lbhr":
            kghr = val / 2.2046226;
            break;
          case "uc_fl_tonhr":
            kghr = val * 1000;
            break;
        }

        if (sourceId !== "uc_fl_kghr") setVal("uc_fl_kghr", kghr, 2);
        if (sourceId !== "uc_fl_mtday") setVal("uc_fl_mtday", (kghr * 24) / 1000, 3);
        if (sourceId !== "uc_fl_lbhr") setVal("uc_fl_lbhr", kghr * 2.2046226, 2);
        if (sourceId !== "uc_fl_tonhr") setVal("uc_fl_tonhr", kghr / 1000, 3);
      }

      // Handle Liquid Volume (Base: m3/hr)
      if (["uc_fl_m3hr", "uc_fl_bpd", "uc_fl_gpm", "uc_fl_lmin"].includes(sourceId)) {
        let m3hr = 0;
        switch (sourceId) {
          case "uc_fl_m3hr":
            m3hr = val;
            break;
          case "uc_fl_bpd":
            m3hr = val / 150.955;
            break;
          case "uc_fl_gpm":
            m3hr = val / 4.4028675;
            break;
          case "uc_fl_lmin":
            m3hr = val / 16.66667;
            break;
        }

        if (sourceId !== "uc_fl_m3hr") setVal("uc_fl_m3hr", m3hr, 3);
        if (sourceId !== "uc_fl_bpd") setVal("uc_fl_bpd", m3hr * 150.955, 2);
        if (sourceId !== "uc_fl_gpm") setVal("uc_fl_gpm", m3hr * 4.4028675, 2);
        if (sourceId !== "uc_fl_lmin") setVal("uc_fl_lmin", m3hr * 16.66667, 2);
      }

      // Handle Gas Volume (Base: MMSCFD)
      if (["uc_fl_mmscfd", "uc_fl_nm3hr", "uc_fl_sm3hr"].includes(sourceId)) {
        let mmscfd = 0;
        switch (sourceId) {
          case "uc_fl_mmscfd":
            mmscfd = val;
            break;
          case "uc_fl_nm3hr":
            mmscfd = val / 1177.2;
            break;
          case "uc_fl_sm3hr":
            mmscfd = val / 1115.8;
            break;
        }

        if (sourceId !== "uc_fl_mmscfd") setVal("uc_fl_mmscfd", mmscfd, 4);
        if (sourceId !== "uc_fl_nm3hr") setVal("uc_fl_nm3hr", mmscfd * 1177.2, 2);
        if (sourceId !== "uc_fl_sm3hr") setVal("uc_fl_sm3hr", mmscfd * 1115.8, 2);
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearFlow() {
    ["uc_fl_kghr", "uc_fl_mtday", "uc_fl_lbhr", "uc_fl_tonhr", "uc_fl_m3hr", "uc_fl_bpd", "uc_fl_gpm", "uc_fl_lmin", "uc_fl_mmscfd", "uc_fl_nm3hr", "uc_fl_sm3hr"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  // ==========================================================================
  // 6. DENSITY, SPECIFIC GRAVITY & OILFIELD GRAVITY
  // ==========================================================================
  function updateDensity(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearDensity();
        isUpdating = false;
        return;
      }

      // Base: kg/m3
      let kgm3 = 0;
      switch (sourceId) {
        case "uc_den_kgm3":
          kgm3 = val;
          break;
        case "uc_den_gcm3":
          kgm3 = val * 1000;
          break;
        case "uc_den_lbft3":
          kgm3 = val / 0.06242796;
          break;
        case "uc_den_ppg":
          kgm3 = val / 0.008345404;
          break;
        case "uc_den_sg":
          kgm3 = val * 1000;
          break;
        case "uc_den_api":
          const sg = 141.5 / (val + 131.5);
          kgm3 = sg * 1000;
          break;
      }

      const sg = kgm3 / 1000;
      const api = sg > 0 ? (141.5 / sg) - 131.5 : 0;

      if (sourceId !== "uc_den_kgm3") setVal("uc_den_kgm3", kgm3, 2);
      if (sourceId !== "uc_den_gcm3") setVal("uc_den_gcm3", kgm3 / 1000, 4);
      if (sourceId !== "uc_den_lbft3") setVal("uc_den_lbft3", kgm3 * 0.06242796, 3);
      if (sourceId !== "uc_den_ppg") setVal("uc_den_ppg", kgm3 * 0.008345404, 3);
      if (sourceId !== "uc_den_sg") setVal("uc_den_sg", sg, 4);
      if (sourceId !== "uc_den_api") setVal("uc_den_api", api, 2);

      // Crude classification badge
      const statusBox = document.getElementById("uc_den_status");
      if (statusBox) {
        statusBox.className = "uc-status-box";
        if (api > 31.1) {
          statusBox.classList.add("uc-status-green");
          statusBox.innerHTML = `<span>🟢</span> <div><strong>Light Crude Oil</strong> (&gt; 31.1° API, SG &lt; 0.870). High yields of light distillates, gasoline & naphtha.</div>`;
        } else if (api >= 22.3) {
          statusBox.classList.add("uc-status-blue");
          statusBox.innerHTML = `<span>🔵</span> <div><strong>Medium Crude Oil</strong> (22.3° to 31.1° API, SG 0.870 to 0.920). Typical refinery atmospheric distillation feed.</div>`;
        } else if (api >= 10.0) {
          statusBox.classList.add("uc-status-amber");
          statusBox.innerHTML = `<span>🟡</span> <div><strong>Heavy Crude Oil</strong> (10.0° to 22.3° API, SG 0.920 to 1.000). High sulfur & metals; elevated vacuum residue yield.</div>`;
        } else {
          statusBox.classList.add("uc-status-red");
          statusBox.innerHTML = `<span>🔴</span> <div><strong>Extra Heavy Crude / Bitumen</strong> (&lt; 10.0° API, SG &gt; 1.000). Heavier than water; requires coker / hydrocracker processing.</div>`;
        }
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearDensity() {
    ["uc_den_kgm3", "uc_den_gcm3", "uc_den_lbft3", "uc_den_ppg", "uc_den_sg", "uc_den_api"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const statusBox = document.getElementById("uc_den_status");
    if (statusBox) {
      statusBox.className = "uc-status-box uc-status-blue";
      statusBox.innerHTML = `<span>ℹ️</span> <div>Enter density or SG to automatically calculate °API and identify crude classification.</div>`;
    }
  }

  // ==========================================================================
  // 7. CONCENTRATION & WATER/GAS CHEMISTRY
  // ==========================================================================
  function updateConcentration(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearConcentration();
        isUpdating = false;
        return;
      }

      // Base: ppmw
      let ppmw = 0;
      switch (sourceId) {
        case "uc_conc_ppmw":
          ppmw = val;
          break;
        case "uc_conc_wtpct":
          ppmw = val * 10000;
          break;
        case "uc_conc_ppmv":
          ppmw = val; // approximation for light gases / standard water
          break;
        case "uc_conc_molpct":
          ppmw = val * 10000;
          break;
        case "uc_conc_mgl":
          ppmw = val; // aqueous 1 mg/L ≈ 1 ppmw
          break;
        case "uc_conc_mgm3":
          ppmw = val / 1000;
          break;
        case "uc_conc_grains":
          ppmw = val * 15.9; // H2S pipeline standard: 1 grain/100 SCF ≈ 15.9 ppmv
          break;
      }

      if (sourceId !== "uc_conc_ppmw") setVal("uc_conc_ppmw", ppmw, 2);
      if (sourceId !== "uc_conc_wtpct") setVal("uc_conc_wtpct", ppmw / 10000, 4);
      if (sourceId !== "uc_conc_ppmv") setVal("uc_conc_ppmv", ppmw, 2);
      if (sourceId !== "uc_conc_molpct") setVal("uc_conc_molpct", ppmw / 10000, 4);
      if (sourceId !== "uc_conc_mgl") setVal("uc_conc_mgl", ppmw, 2);
      if (sourceId !== "uc_conc_mgm3") setVal("uc_conc_mgm3", ppmw * 1000, 1);
      if (sourceId !== "uc_conc_grains") setVal("uc_conc_grains", ppmw / 15.9, 3);
    } finally {
      isUpdating = false;
    }
  }

  function clearConcentration() {
    ["uc_conc_ppmw", "uc_conc_wtpct", "uc_conc_ppmv", "uc_conc_molpct", "uc_conc_mgl", "uc_conc_mgm3", "uc_conc_grains"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  // ==========================================================================
  // 8. VISCOSITY (DYNAMIC & KINEMATIC)
  // ==========================================================================
  function updateViscosity(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearViscosity();
        isUpdating = false;
        return;
      }

      // Read SG reference (default 1.0)
      const sgEl = document.getElementById("uc_visc_sg_ref");
      const sg = parse(sgEl?.value) || 1.0;

      // Base: cP (Centipoise)
      let cp = 0;
      switch (sourceId) {
        case "uc_visc_cp":
          cp = val;
          break;
        case "uc_visc_pas":
          cp = val * 1000;
          break;
        case "uc_visc_poise":
          cp = val * 100;
          break;
        case "uc_visc_cst":
          cp = val * sg;
          break;
        case "uc_visc_ssu":
          const cst = val <= 466 ? val / 4.632 : val / 4.664;
          cp = cst * sg;
          break;
      }

      const cst = cp / sg;
      const ssu = cst <= 100 ? cst * 4.632 : cst * 4.664;

      if (sourceId !== "uc_visc_cp") setVal("uc_visc_cp", cp, 3);
      if (sourceId !== "uc_visc_pas") setVal("uc_visc_pas", cp / 1000, 5);
      if (sourceId !== "uc_visc_poise") setVal("uc_visc_poise", cp / 100, 4);
      if (sourceId !== "uc_visc_cst") setVal("uc_visc_cst", cst, 3);
      if (sourceId !== "uc_visc_ssu") setVal("uc_visc_ssu", ssu, 1);
    } finally {
      isUpdating = false;
    }
  }

  function clearViscosity() {
    ["uc_visc_cp", "uc_visc_pas", "uc_visc_poise", "uc_visc_cst", "uc_visc_ssu"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  // ==========================================================================
  // 9. ENERGY, ENTHALPY & HEAT DUTY
  // ==========================================================================
  function updateEnergy(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearEnergy();
        isUpdating = false;
        return;
      }

      // Heat Duty (Base: kW)
      if (["uc_en_kw", "uc_en_mw", "uc_en_kcalhr", "uc_en_mmbtu", "uc_en_hp"].includes(sourceId)) {
        let kw = 0;
        switch (sourceId) {
          case "uc_en_kw":
            kw = val;
            break;
          case "uc_en_mw":
            kw = val * 1000;
            break;
          case "uc_en_kcalhr":
            kw = val / 859.8452;
            break;
          case "uc_en_mmbtu":
            kw = val / 0.003412142;
            break;
          case "uc_en_hp":
            kw = val / 1.341022;
            break;
        }

        if (sourceId !== "uc_en_kw") setVal("uc_en_kw", kw, 2);
        if (sourceId !== "uc_en_mw") setVal("uc_en_mw", kw / 1000, 4);
        if (sourceId !== "uc_en_kcalhr") setVal("uc_en_kcalhr", kw * 859.8452, 1);
        if (sourceId !== "uc_en_mmbtu") setVal("uc_en_mmbtu", kw * 0.003412142, 4);
        if (sourceId !== "uc_en_hp") setVal("uc_en_hp", kw * 1.341022, 2);
      }

      // Specific Enthalpy (Base: kJ/kg)
      if (["uc_en_kjkg", "uc_en_btulb", "uc_en_kcalkg"].includes(sourceId)) {
        let kjkg = 0;
        switch (sourceId) {
          case "uc_en_kjkg":
            kjkg = val;
            break;
          case "uc_en_btulb":
            kjkg = val / 0.4299226;
            break;
          case "uc_en_kcalkg":
            kjkg = val * 4.184;
            break;
        }

        if (sourceId !== "uc_en_kjkg") setVal("uc_en_kjkg", kjkg, 2);
        if (sourceId !== "uc_en_btulb") setVal("uc_en_btulb", kjkg * 0.4299226, 2);
        if (sourceId !== "uc_en_kcalkg") setVal("uc_en_kcalkg", kjkg / 4.184, 2);
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearEnergy() {
    ["uc_en_kw", "uc_en_mw", "uc_en_kcalhr", "uc_en_mmbtu", "uc_en_hp", "uc_en_kjkg", "uc_en_btulb", "uc_en_kcalkg"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  // ==========================================================================
  // 10. FORCE & FLANGE BOLTING TORQUE (ASME PCC-1)
  // ==========================================================================
  function updateTorque(sourceId) {
    if (isUpdating) return;
    isUpdating = true;
    try {
      const sourceEl = document.getElementById(sourceId);
      const val = parse(sourceEl?.value);

      if (isNaN(val)) {
        clearTorque();
        isUpdating = false;
        return;
      }

      // Base: N*m
      let nm = 0;
      switch (sourceId) {
        case "uc_tq_nm":
          nm = val;
          break;
        case "uc_tq_ftlb":
          nm = val / 0.737562;
          break;
        case "uc_tq_inlb":
          nm = val / 8.850746;
          break;
        case "uc_tq_kgfm":
          nm = val * 9.80665;
          break;
      }

      const ftlb = nm * 0.737562;

      if (sourceId !== "uc_tq_nm") setVal("uc_tq_nm", nm, 2);
      if (sourceId !== "uc_tq_ftlb") setVal("uc_tq_ftlb", ftlb, 2);
      if (sourceId !== "uc_tq_inlb") setVal("uc_tq_inlb", nm * 8.850746, 1);
      if (sourceId !== "uc_tq_kgfm") setVal("uc_tq_kgfm", nm / 9.80665, 3);

      // Reference bolt guidance badge
      const statusBox = document.getElementById("uc_tq_status");
      if (statusBox) {
        statusBox.className = "uc-status-box uc-status-blue";
        let boltRef = "";
        if (ftlb < 60) {
          boltRef = "Typical for 1/2\" to 5/8\" B7 studs (Small bore piping flanges)";
        } else if (ftlb <= 130) {
          boltRef = "Typical for 3/4\" B7 studs (Standard Class 150/300 flanges)";
        } else if (ftlb <= 220) {
          boltRef = "Typical for 7/8\" B7 studs (Medium diameter flanges)";
        } else if (ftlb <= 340) {
          boltRef = "Typical for 1\" B7 studs (Class 300/600 piping)";
        } else if (ftlb <= 500) {
          boltRef = "Typical for 1-1/8\" B7 studs (Pressure vessel manways / Class 600)";
        } else {
          boltRef = "Heavy industrial bolting: &ge; 1-1/4\" studs (Hydraulic torque wrench recommended)";
        }
        statusBox.innerHTML = `<span>🔧</span> <div><strong>ASME PCC-1 Estimate</strong>: ${boltRef}</div>`;
      }
    } finally {
      isUpdating = false;
    }
  }

  function clearTorque() {
    ["uc_tq_nm", "uc_tq_ftlb", "uc_tq_inlb", "uc_tq_kgfm"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const statusBox = document.getElementById("uc_tq_status");
    if (statusBox) {
      statusBox.className = "uc-status-box uc-status-blue";
      statusBox.innerHTML = `<span>ℹ️</span> <div>Calculates torque across N·m, ft·lbf, in·lbf, and kgf·m for ASME PCC-1 make-up bolt tightening.</div>`;
    }
  }

  // ==========================================================================
  // RESET ALL & CATEGORY FILTERING
  // ==========================================================================
  function resetAll() {
    clearCorrosionRate();
    clearPressure();
    clearTemperature();
    clearThickness();
    clearFlow();
    clearDensity();
    clearConcentration();
    clearViscosity();
    clearEnergy();
    clearTorque();
    // Default seed for demo
    seedDefaults();
  }
  window.resetAllUnitConverters = resetAll;

  function seedDefaults() {
    // Seed sensible defaults so user immediately sees calculations
    const cr = document.getElementById("uc_cr_mmyr");
    if (cr) { cr.value = "0.12"; updateCorrosionRate("uc_cr_mmyr"); }

    const pr = document.getElementById("uc_pr_bar");
    if (pr) { pr.value = "10"; updatePressure("uc_pr_bar"); }

    const temp = document.getElementById("uc_temp_c");
    if (temp) { temp.value = "150"; updateTemperature("uc_temp_c"); }

    const th = document.getElementById("uc_th_mm");
    if (th) { th.value = "12.7"; updateThickness("uc_th_mm"); }

    const fl = document.getElementById("uc_fl_kghr");
    if (fl) { fl.value = "45000"; updateFlow("uc_fl_kghr"); }

    const den = document.getElementById("uc_den_kgm3");
    if (den) { den.value = "850"; updateDensity("uc_den_kgm3"); }

    const conc = document.getElementById("uc_conc_ppmw");
    if (conc) { conc.value = "250"; updateConcentration("uc_conc_ppmw"); }

    const visc = document.getElementById("uc_visc_cp");
    if (visc) { visc.value = "1.5"; updateViscosity("uc_visc_cp"); }

    const en = document.getElementById("uc_en_kw");
    if (en) { en.value = "250"; updateEnergy("uc_en_kw"); }

    const tq = document.getElementById("uc_tq_nm");
    if (tq) { tq.value = "150"; updateTorque("uc_tq_nm"); }
  }

  function filterCategory(cat, pillEl) {
    document.querySelectorAll(".uc-pill").forEach(p => p.classList.remove("active"));
    if (pillEl) pillEl.classList.add("active");

    const cards = document.querySelectorAll(".uc-card");
    cards.forEach(card => {
      const cardCats = (card.getAttribute("data-uc-cat") || "").split(" ");
      if (cat === "all" || cardCats.includes(cat)) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }
  window.filterUnitCategory = filterCategory;

  function filterSearch(term) {
    const q = (term || "").toLowerCase().trim();
    const cards = document.querySelectorAll(".uc-card");
    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      if (!q || text.includes(q)) {
        card.style.display = "flex";
        if (q) card.classList.add("highlighted");
        else card.classList.remove("highlighted");
      } else {
        card.style.display = "none";
        card.classList.remove("highlighted");
      }
    });
  }
  window.filterUnitSearch = filterSearch;

  // Initialize listeners
  function init() {
    const map = [
      { ids: ["uc_cr_mmyr", "uc_cr_mpy", "uc_cr_umyr", "uc_cr_nmhr", "uc_cr_inyr"], fn: updateCorrosionRate },
      { ids: ["uc_pr_bar", "uc_pr_psi", "uc_pr_kgcm2", "uc_pr_mpa", "uc_pr_kpa", "uc_pr_atm", "uc_pr_mmh2o", "uc_pr_inhg", "uc_pr_mmhg"], fn: updatePressure },
      { ids: ["uc_temp_c", "uc_temp_f", "uc_temp_k", "uc_temp_r"], fn: updateTemperature },
      { ids: ["uc_th_mm", "uc_th_mil", "uc_th_in_dec", "uc_th_m", "uc_th_ft"], fn: updateThickness },
      { ids: ["uc_fl_kghr", "uc_fl_mtday", "uc_fl_lbhr", "uc_fl_tonhr", "uc_fl_m3hr", "uc_fl_bpd", "uc_fl_gpm", "uc_fl_lmin", "uc_fl_mmscfd", "uc_fl_nm3hr", "uc_fl_sm3hr"], fn: updateFlow },
      { ids: ["uc_den_kgm3", "uc_den_gcm3", "uc_den_lbft3", "uc_den_ppg", "uc_den_sg", "uc_den_api"], fn: updateDensity },
      { ids: ["uc_conc_ppmw", "uc_conc_wtpct", "uc_conc_ppmv", "uc_conc_molpct", "uc_conc_mgl", "uc_conc_mgm3", "uc_conc_grains"], fn: updateConcentration },
      { ids: ["uc_visc_cp", "uc_visc_pas", "uc_visc_poise", "uc_visc_cst", "uc_visc_ssu"], fn: updateViscosity },
      { ids: ["uc_en_kw", "uc_en_mw", "uc_en_kcalhr", "uc_en_mmbtu", "uc_en_hp", "uc_en_kjkg", "uc_en_btulb", "uc_en_kcalkg"], fn: updateEnergy },
      { ids: ["uc_tq_nm", "uc_tq_ftlb", "uc_tq_inlb", "uc_tq_kgfm"], fn: updateTorque }
    ];

    map.forEach(group => {
      group.ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener("input", () => group.fn(id));
          el.addEventListener("focus", () => el.select());
        }
      });
    });

    const viscSg = document.getElementById("uc_visc_sg_ref");
    if (viscSg) {
      viscSg.addEventListener("input", () => updateViscosity("uc_visc_cp"));
    }

    seedDefaults();
  }

  // Export to window
  window.UnitConverter = {
    init,
    resetAll,
    clearCorrosionRate,
    clearPressure,
    clearTemperature,
    clearThickness,
    clearFlow,
    clearDensity,
    clearConcentration,
    clearViscosity,
    clearEnergy,
    clearTorque
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
