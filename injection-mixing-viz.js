/**
 * injection-mixing-viz.js
 * High-Fidelity 2D Engineering Simulation & Inspection Circuit Visualizer
 * For NACE SP0114 & API 570 Injection Points and Process Mix Points.
 */

(function () {
  "use strict";

  // Visualizer internal state
  const state = {
    mode: "auto", // "auto" | "injection" | "mixing"
    activeSimulation: "injection", // currently rendered: "injection" | "mixing"
    autoDetectedType: "injection",
    streamA: null,
    streamB: null,
    animating: true,
    animSpeed: 1.0,
    time: 0,
    particles: [],

    // Engineering parameters
    pipeIdMm: 254, // 10" pipe ID
    quillDiaMm: 12,
    quillDepthPercent: 50, // 50% = centerline
    quillStyle: "quill_beveled", // "quill_beveled" | "quill_straight" | "quill_spray" | "open_boss"

    // Process variables
    flowA: 81732, // kg/h
    tempA: 395, // °C
    densityA: 742, // kg/m³
    viscA: 0.42, // cP

    flowB: 24700, // kg/h
    tempB: 38, // °C
    densityB: 993, // kg/m³
    viscB: 0.68, // cP
    surfTension: 70.0, // dyne/cm

    // Mix Tee specific parameters
    branchAngle: 90, // 90 or 45 degrees
    staticMixerEnabled: false,
    thermalSleeveEnabled: false,

    // Container handle
    targetContainerId: "injectionMixingVizContainer",

    // Canvas handles
    canvas: null,
    ctx: null,
    animFrameId: null
  };

  /**
   * Initialize or mount visualizer in target container
   */
  function init(containerId) {
    if (containerId) state.targetContainerId = containerId;
    const container = document.getElementById(state.targetContainerId || "injectionMixingVizContainer");
    if (!container) return;

    // Render HTML scaffolding with controls, badges, and canvas
    container.innerHTML = `
      <div class="stream-card" style="border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.06); padding: 0; overflow: hidden; margin-bottom: 20px;">
        <!-- Visualizer Header & Mode Selector -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 2px solid #3b82f6;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="vizTypeIcon" style="font-size: 22px;">💉</span>
              <h3 id="vizTitleText" style="margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; color: #f8fafc;">
                API 570 / NACE SP0114 2D Injection Point Simulation
              </h3>
              <span id="vizMatchBadge" style="font-size: 11.5px; padding: 3px 9px; border-radius: 6px; font-weight: 600; background: #0284c7; color: #ffffff;">
                ⚡ Auto-Matched from Stream
              </span>
            </div>
            <p id="vizSubtitleText" style="margin: 4px 0 0 0; font-size: 12.5px; color: #94a3b8;">
              Real-time fluid trajectory, droplet atomization (We), middle 1/3 quill depth, and 12" / 25D inspection boundaries.
            </p>
          </div>

          <!-- Mode Switching & Hide Buttons -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); padding: 4px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);">
              <button type="button" id="vizBtnAuto" class="stream-filter-btn active" style="font-size: 12px; padding: 5px 12px; background: #2563eb; color: #fff; border: none;" onclick="window.InjectionMixingViz.setMode('auto')">
                ⚡ Auto-Match
              </button>
              <button type="button" id="vizBtnInjection" class="stream-filter-btn" style="font-size: 12px; padding: 5px 12px; background: transparent; color: #cbd5e1; border: none;" onclick="window.InjectionMixingViz.setMode('injection')">
                💉 Injection Point
              </button>
              <button type="button" id="vizBtnMixing" class="stream-filter-btn" style="font-size: 12px; padding: 5px 12px; background: transparent; color: #cbd5e1; border: none;" onclick="window.InjectionMixingViz.setMode('mixing')">
                🔀 Process Mix Point
              </button>
            </div>
            <button type="button" class="stream-filter-btn" style="font-size: 12px; padding: 5px 12px; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; cursor: pointer;" onclick="window.InjectionMixingViz.toggleVisibility(false)" title="Hide 2D Simulation">
              ✕ Hide
            </button>
          </div>
        </div>

        <!-- Canvas Display Area -->
        <div style="position: relative; background: #0f172a; width: 100%; height: 460px; overflow: hidden; border-bottom: 1px solid #334155;">
          <canvas id="injMixCanvas" style="display: block; width: 100%; height: 100%; cursor: crosshair;"></canvas>

          <!-- Floating Engineering HUD Overlays (Clean, non-intrusive) -->
          <div id="vizHudTopLeft" style="position: absolute; top: 10px; left: 14px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); padding: 7px 12px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.2); color: #f1f5f9; font-size: 11px; pointer-events: none; max-width: 310px; z-index: 5;">
            <div id="vizHudStreamInfo">
              <strong>Main Stream A:</strong> Loading...<br>
              <strong>Injectant / Branch B:</strong> Loading...
            </div>
          </div>

          <div id="vizHudTopRight" style="position: absolute; top: 10px; right: 14px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); padding: 7px 12px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.2); color: #f1f5f9; font-size: 11px; pointer-events: none; text-align: right; z-index: 5;">
            <div id="vizHudPhysicsInfo">
              <strong>Calculated Metrics</strong>
            </div>
          </div>

          <!-- Bottom Warning Banner (e.g. Impingement or Severe Thermal Shock) -->
          <div id="vizWarningBanner" style="position: absolute; bottom: 12px; left: 16px; right: 16px; background: rgba(220, 38, 38, 0.9); color: white; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; display: none; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none; z-index: 5;">
            <span id="vizWarningText">⚠️ Alert: Liquid impingement hazard on pipe wall</span>
            <span style="font-size: 11px; background: rgba(0,0,0,0.25); padding: 2px 6px; border-radius: 4px;">NACE SP0114 Section 7.2 Violation</span>
          </div>
        </div>

        <!-- Interactive Engineering Control Console -->
        <div style="background: #f8fafc; padding: 14px 18px; border-top: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 12.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">
              🎛️ Simulation Parameters &amp; Circuit Controls:
            </span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" id="vizBtnToggleAnim" class="stream-btn" style="padding: 4px 12px; font-size: 12px; background: #0284c7; color: white;" onclick="window.InjectionMixingViz.toggleAnimation()">
                ⏸️ Pause Motion
              </button>
              <button type="button" class="stream-btn stream-btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="window.InjectionMixingViz.resetToStreamValues()">
                🔄 Sync with Streams
              </button>
              <button type="button" class="stream-btn" style="padding: 4px 12px; font-size: 12px; background: #059669; color: white;" onclick="window.InjectionMixingViz.exportSnapshot()">
                📸 Export 2D Blueprint (.PNG)
              </button>
            </div>
          </div>

          <!-- Controls Grid for Injection Mode -->
          <div id="vizControlsInjection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
            <div class="stream-field" style="margin: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #475569;">
                <span>Quill Insertion Depth:</span>
                <span id="quillDepthVal" style="color: #2563eb; font-weight: 700;">50% (Centerline)</span>
              </div>
              <input type="range" id="quillDepthSlider" min="15" max="85" value="50" step="1" style="width: 100%; margin-top: 6px;" oninput="window.InjectionMixingViz.onQuillDepthInput(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
                <span>15% (Wall)</span>
                <span style="color: #10b981; font-weight: 600;">33%-66% (Center 1/3)</span>
                <span>85% (Far Wall)</span>
              </div>
            </div>

            <div class="stream-field" style="margin: 0;">
              <label style="font-size: 11.5px; font-weight: 600; color: #475569; margin-bottom: 4px;">Quill Tip Style / Geometry:</label>
              <select id="quillStyleSelect" class="stream-select" style="padding: 5px 8px; font-size: 12px;" onchange="window.InjectionMixingViz.onQuillStyleChange(this.value)">
                <option value="quill_beveled" selected>45° Beveled Tip Facing Downstream (SP0114 7.2)</option>
                <option value="quill_straight">Straight-Cut Orifice (Center 1/3)</option>
                <option value="quill_spray">Atomizing Spray Nozzle (Conical Plume)</option>
                <option value="open_boss">Flush Sidewall Boss (No Quill - Impingement Hazard)</option>
              </select>
            </div>

            <div class="stream-field" style="margin: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #475569;">
                <span>Main Pipe Velocity (v<sub>m</sub>):</span>
                <span id="mainVelVal" style="color: #2563eb; font-weight: 700;">-- m/s</span>
              </div>
              <input type="range" id="mainFlowSlider" min="10000" max="250000" value="81732" step="1000" style="width: 100%; margin-top: 6px;" oninput="window.InjectionMixingViz.onMainFlowInput(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
                <span>Low Velocity (10k kg/h)</span>
                <span>High Velocity (250k kg/h)</span>
              </div>
            </div>

            <div class="stream-field" style="margin: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #475569;">
                <span>Injectant Rate (m<sub>j</sub>):</span>
                <span id="injectRateVal" style="color: #2563eb; font-weight: 700;">-- kg/h</span>
              </div>
              <input type="range" id="injectFlowSlider" min="500" max="50000" value="24700" step="500" style="width: 100%; margin-top: 6px;" oninput="window.InjectionMixingViz.onInjectFlowInput(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
                <span>0.5 T/h</span>
                <span>50 T/h</span>
              </div>
            </div>
          </div>

          <!-- Controls Grid for Mixing Mode -->
          <div id="vizControlsMixing" style="display: none; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
            <div class="stream-field" style="margin: 0;">
              <label style="font-size: 11.5px; font-weight: 600; color: #475569; margin-bottom: 4px;">Internal Static Mixer (Sulzer/Kenics):</label>
              <button type="button" id="btnStaticMixerToggle" class="stream-btn" style="width: 100%; padding: 6px 12px; font-size: 12px; background: #e2e8f0; color: #334155; justify-content: center;" onclick="window.InjectionMixingViz.toggleStaticMixer()">
                ⚪ Static Mixer: OFF (Long 25D Plume)
              </button>
            </div>

            <div class="stream-field" style="margin: 0;">
              <label style="font-size: 11.5px; font-weight: 600; color: #475569; margin-bottom: 4px;">Thermal Sleeve / Liner:</label>
              <button type="button" id="btnThermalSleeveToggle" class="stream-btn" style="width: 100%; padding: 6px 12px; font-size: 12px; background: #e2e8f0; color: #334155; justify-content: center;" onclick="window.InjectionMixingViz.toggleThermalSleeve()">
                ⚪ Thermal Sleeve: Not Fitted
              </button>
            </div>

            <div class="stream-field" style="margin: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #475569;">
                <span>Branch Entry Tee Angle:</span>
                <span id="branchAngleVal" style="color: #2563eb; font-weight: 700;">90° Standard Tee</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button type="button" id="btnAngle90" class="stream-filter-btn active" style="flex: 1; padding: 5px; font-size: 11.5px;" onclick="window.InjectionMixingViz.setBranchAngle(90)">
                  90° Perpendicular
                </button>
                <button type="button" id="btnAngle45" class="stream-filter-btn" style="flex: 1; padding: 5px; font-size: 11.5px;" onclick="window.InjectionMixingViz.setBranchAngle(45)">
                  45° Lateral Tee
                </button>
              </div>
            </div>

            <div class="stream-field" style="margin: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: #475569;">
                <span>Thermal Shock (|ΔT|):</span>
                <span id="thermalShockVal" style="color: #dc2626; font-weight: 700;">-- °C</span>
              </div>
              <input type="range" id="tempDeltaSlider" min="0" max="350" value="150" step="5" style="width: 100%; margin-top: 6px;" oninput="window.InjectionMixingViz.onTempDeltaInput(this.value)">
              <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
                <span>0°C (Isothermal)</span>
                <span style="color: #ea580c; font-weight: 600;">167°C (SP0114 Limit)</span>
                <span>350°C (Extreme)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Canvas attachment
    state.canvas = document.getElementById("injMixCanvas");
    if (state.canvas) {
      state.ctx = state.canvas.getContext("2d");
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
    }

    // Init particles
    initParticles();

    // Check if container is visible before starting animation
    const containerEl = document.getElementById(state.targetContainerId || "injectionMixingVizContainer");
    const isVisibleNow = containerEl && containerEl.style.display !== "none";
    if (isVisibleNow && !state.animFrameId) {
      startAnimation();
    }
  }

  function resizeCanvas() {
    if (!state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round((rect.width || 960) * dpr);
    const targetH = Math.round((rect.height || 460) * dpr);
    if (state.canvas.width !== targetW || state.canvas.height !== targetH) {
      state.canvas.width = targetW;
      state.canvas.height = targetH;
    }
  }

  function initParticles() {
    state.particles = [];
    const count = 130;
    const isInj = state.activeSimulation === "injection";
    const pipeTop = isInj ? 110 : 130;
    const pipeBottom = isInj ? 290 : 310;
    const pipeHeight = pipeBottom - pipeTop;
    const left = 55;
    const right = 880;

    for (let i = 0; i < count; i++) {
      const type = Math.random() > 0.4 ? "main" : "injectant";
      let x, y, vx, vy;
      if (isInj) {
        x = left + Math.random() * (right - left);
        y = pipeTop + 8 + Math.random() * (pipeHeight - 16);
        vx = 2.2 + Math.random() * 3.0;
        vy = (Math.random() - 0.5) * 0.4;
      } else {
        if (type === "injectant" && Math.random() < 0.22) {
          // Inside vertical branch neck
          x = 246 + Math.random() * 68;
          y = 35 + Math.random() * 85;
          vx = (Math.random() - 0.5) * 0.5;
          vy = 2.0 + Math.random() * 2.0;
        } else {
          // Inside main pipe
          x = left + Math.random() * (right - left);
          y = pipeTop + 10 + Math.random() * (pipeHeight - 20);
          vx = 2.2 + Math.random() * 3.0;
          vy = (Math.random() - 0.5) * 0.4;
        }
      }
      state.particles.push({
        x, y, vx, vy,
        radius: 1.5 + Math.random() * 2.2,
        type,
        life: 20 + Math.random() * 80
      });
    }
  }

  /**
   * Called by StreamComparator whenever stream pair changes or analysis runs
   */
  function updateFromStreams(sA, sB) {
    state.streamA = sA;
    state.streamB = sB;

    if (!sA || !sB) return;

    // Detect type based on NACE SP0114 logic or stream properties
    let detected = "mixing";
    if (window.NaceClassifier && typeof window.NaceClassifier.classifyTieIn === "function") {
      const cls = window.NaceClassifier.classifyTieIn(sA, sB);
      if (cls.activeClassification === "INJECTION POINT" ||
          (cls.suggestedSubtitle && cls.suggestedSubtitle.includes("WASH WATER")) ||
          (cls.suggestedSubtitle && cls.suggestedSubtitle.includes("INJECTION"))) {
        detected = "injection";
      } else {
        detected = "mixing";
      }
    } else {
      // Fallback detection
      const nameB = (sB.content || sB.streamName || "").toLowerCase();
      if (nameB.includes("wash water") || nameB.includes("inhibitor") || nameB.includes("injection") || nameB.includes("quill")) {
        detected = "injection";
      }
    }

    state.autoDetectedType = detected;

    // Extract stream values into state
    const propsA = sA.properties || {};
    const propsB = sB.properties || {};

    state.flowA = parseFloat(sA.massFlow) || 50000;
    state.flowB = parseFloat(sB.massFlow) || 20000;

    state.tempA = parseFloat(sA.tempC ?? propsA["Temperature (°C)"] ?? propsA["Temp C"] ?? 250);
    state.tempB = parseFloat(sB.tempC ?? propsB["Temperature (°C)"] ?? propsB["Temp C"] ?? 40);

    state.densityA = parseFloat(sA.liquidDensity ?? propsA["Liquid Density (kg/m3)"] ?? propsA["Density (kg/m3)"] ?? 850);
    state.densityB = parseFloat(sB.liquidDensity ?? propsB["Liquid Density (kg/m3)"] ?? propsB["Density (kg/m3)"] ?? 998);

    state.viscA = parseFloat(sA.viscosity ?? propsA["Liquid Viscosity (cP)"] ?? 1.0);
    state.viscB = parseFloat(sB.viscosity ?? propsB["Liquid Viscosity (cP)"] ?? 1.0);

    state.surfTension = parseFloat(sB.surfaceTension ?? propsB["Surface Tension (dyne/cm)"] ?? 65.0);

    // If in auto mode, switch simulation to match detected
    if (state.mode === "auto") {
      state.activeSimulation = state.autoDetectedType;
    }

    syncUIElements();
  }

  function setMode(newMode) {
    state.mode = newMode;
    const btnAuto = document.getElementById("vizBtnAuto");
    const btnInj = document.getElementById("vizBtnInjection");
    const btnMix = document.getElementById("vizBtnMixing");

    [btnAuto, btnInj, btnMix].forEach(b => {
      if (b) {
        b.classList.remove("active");
        b.style.background = "transparent";
        b.style.color = "#cbd5e1";
      }
    });

    if (newMode === "auto") {
      if (btnAuto) {
        btnAuto.classList.add("active");
        btnAuto.style.background = "#2563eb";
        btnAuto.style.color = "#fff";
      }
      state.activeSimulation = state.autoDetectedType;
    } else if (newMode === "injection") {
      if (btnInj) {
        btnInj.classList.add("active");
        btnInj.style.background = "#0284c7";
        btnInj.style.color = "#fff";
      }
      state.activeSimulation = "injection";
    } else if (newMode === "mixing") {
      if (btnMix) {
        btnMix.classList.add("active");
        btnMix.style.background = "#7c3aed";
        btnMix.style.color = "#fff";
      }
      state.activeSimulation = "mixing";
    }

    syncUIElements();
  }

  function syncUIElements() {
    const isInj = state.activeSimulation === "injection";

    // Header updates
    const iconEl = document.getElementById("vizTypeIcon");
    const titleEl = document.getElementById("vizTitleText");
    const badgeEl = document.getElementById("vizMatchBadge");
    const subEl = document.getElementById("vizSubtitleText");

    const controlsInj = document.getElementById("vizControlsInjection");
    const controlsMix = document.getElementById("vizControlsMixing");

    if (iconEl) iconEl.textContent = isInj ? "💉" : "🔀";
    if (titleEl) {
      titleEl.textContent = isInj
        ? "API 570 / NACE SP0114 2D Injection Point Simulation"
        : "Process Mixing Tee & Thermal Fatigue 2D Simulation";
    }
    if (badgeEl) {
      if (state.mode === "auto") {
        badgeEl.textContent = isInj ? "⚡ Auto-Matched: Injection Point" : "⚡ Auto-Matched: Process Mix Point";
        badgeEl.style.background = isInj ? "#0284c7" : "#7c3aed";
      } else {
        badgeEl.textContent = "🔧 Manual Override Mode";
        badgeEl.style.background = "#475569";
      }
    }
    if (subEl) {
      subEl.textContent = isInj
        ? "Quill trajectory, middle 1/3 depth compliance, droplet atomization (We), and 12\" / 25D API 570 inspection limits."
        : "Thermal stratification layer, thermal shock (|ΔT|), striping cyclic fatigue, static mixer, and C-scan NDT circuit.";
    }

    if (controlsInj) controlsInj.style.display = isInj ? "grid" : "none";
    if (controlsMix) controlsMix.style.display = isInj ? "none" : "grid";

    // Sync sliders to current state
    const flowMainSlider = document.getElementById("mainFlowSlider");
    if (flowMainSlider) flowMainSlider.value = state.flowA;

    const injectFlowSlider = document.getElementById("injectFlowSlider");
    if (injectFlowSlider) injectFlowSlider.value = state.flowB;

    const tempDeltaSlider = document.getElementById("tempDeltaSlider");
    if (tempDeltaSlider) tempDeltaSlider.value = Math.abs(state.tempA - state.tempB);

    updateHudText();
  }

  function updateHudText() {
    const sA = state.streamA;
    const sB = state.streamB;

    const hudLeft = document.getElementById("vizHudStreamInfo");
    const hudRight = document.getElementById("vizHudPhysicsInfo");
    const warnBanner = document.getElementById("vizWarningBanner");
    const warnText = document.getElementById("vizWarningText");

    // Velocity in main pipe:
    const areaM2 = Math.PI * Math.pow(state.pipeIdMm / 1000, 2) / 4;
    const vMain = (state.flowA / 3600) / (state.densityA * areaM2);

    const mainVelEl = document.getElementById("mainVelVal");
    if (mainVelEl) mainVelEl.textContent = `${vMain.toFixed(2)} m/s`;

    const injectRateEl = document.getElementById("injectRateVal");
    if (injectRateEl) injectRateEl.textContent = `${(state.flowB).toLocaleString()} kg/h`;

    const dT = Math.abs(state.tempA - state.tempB);
    const thermalShockEl = document.getElementById("thermalShockVal");
    if (thermalShockEl) thermalShockEl.textContent = `${dT.toFixed(1)} °C`;

    if (hudLeft) {
      hudLeft.innerHTML = `
        <div style="font-weight: 700; color: #60a5fa; margin-bottom: 2px;">
          ${sA ? `Stream ${sA.streamNo}: ${sA.content || sA.streamName || 'Process Feed'}` : 'Main Process Stream (A)'}
        </div>
        <div>Flow: <strong>${(state.flowA).toLocaleString()} kg/h</strong> | Temp: <strong>${state.tempA.toFixed(1)} °C</strong> | Vel: <strong>${vMain.toFixed(2)} m/s</strong></div>
        <div style="font-weight: 700; color: #a78bfa; margin-top: 4px; margin-bottom: 2px;">
          ${sB ? `Stream ${sB.streamNo}: ${sB.content || sB.streamName || 'Tie-In Stream'}` : 'Tie-In / Injectant (B)'}
        </div>
        <div>Flow: <strong>${(state.flowB).toLocaleString()} kg/h</strong> | Temp: <strong>${state.tempB.toFixed(1)} °C</strong> | |ΔT|: <strong style="color: ${dT > 167 ? '#f87171' : '#fcd34d'}">${dT.toFixed(1)} °C</strong></div>
      `;
    }

    if (state.activeSimulation === "injection") {
      // Injection physics
      const quillAreaM2 = Math.PI * Math.pow(state.quillDiaMm / 1000, 2) / 4;
      const vQuill = (state.flowB / 3600) / (state.densityB * quillAreaM2);
      const sigmaNm = state.surfTension * 1e-3;
      const vRel = Math.abs(vQuill - vMain);
      const weber = (state.densityA * Math.pow(vRel, 2) * (state.quillDiaMm / 1000)) / (sigmaNm || 0.045);
      const isMiddleThird = state.quillDepthPercent >= 33 && state.quillDepthPercent <= 66;

      if (hudRight) {
        hudRight.innerHTML = `
          <div>Quill Velocity: <strong style="color: #38bdf8;">${vQuill.toFixed(2)} m/s</strong></div>
          <div>Weber No (We): <strong style="color: ${weber >= 12 ? '#34d399' : '#f87171'};">${weber.toFixed(1)}</strong> (${weber >= 12 ? 'Atomized' : 'Coarse/Drip'})</div>
          <div>Quill Depth: <strong style="color: ${isMiddleThird ? '#34d399' : '#f87171'};">${state.quillDepthPercent}%</strong> (${isMiddleThird ? 'Middle 1/3 OK' : 'Non-Compliant'})</div>
          <div>API 570 Limits: <strong style="color: #fbbf24;">12" Up / 25D Down</strong></div>
        `;
      }

      // Impingement warning
      if (warnBanner) {
        if (!isMiddleThird || state.quillStyle === "open_boss") {
          warnBanner.style.display = "flex";
          if (state.quillStyle === "open_boss") {
            warnText.textContent = "⚠️ High Risk: Flush sidewall boss causes chemical channeling along pipe wall (No center dispersion)!";
          } else {
            warnText.textContent = `⚠️ Warning: Quill insertion at ${state.quillDepthPercent}% violates NACE SP0114 Middle 1/3 rule (High wall impingement risk)!`;
          }
        } else {
          warnBanner.style.display = "none";
        }
      }
    } else {
      // Mixing physics
      const mCpA = state.flowA * 2.2; // approx Cp
      const mCpB = state.flowB * 4.18; // approx Cp
      const tBlend = (mCpA * state.tempA + mCpB * state.tempB) / (mCpA + mCpB);
      const mixLengthD = state.staticMixerEnabled ? 4 : 28;
      const fatigueSeverity = state.staticMixerEnabled ? "LOW (<12%)" : (dT > 167 ? "CRITICAL (88%)" : dT >= 50 ? "MODERATE (46%)" : "LOW (14%)");
      const fatigueColor = state.staticMixerEnabled ? "#34d399" : (dT > 167 ? "#f87171" : dT >= 50 ? "#fbbf24" : "#34d399");

      if (hudRight) {
        hudRight.innerHTML = `
          <div>Blend Temp (T<sub>blend</sub>): <strong style="color: #38bdf8;">${tBlend.toFixed(1)} °C</strong></div>
          <div>Thermal Shock (|ΔT|): <strong style="color: ${dT > 167 ? '#f87171' : '#fbbf24'};">${dT.toFixed(1)} °C</strong></div>
          <div>Fatigue Severity: <strong style="color: ${fatigueColor};">${fatigueSeverity}</strong></div>
          <div>Req. Mixing Length: <strong style="color: #a78bfa;">${mixLengthD} Pipe Diameters</strong></div>
        `;
      }

      if (warnBanner) {
        if (dT > 167 && !state.staticMixerEnabled) {
          warnBanner.style.display = "flex";
          warnText.textContent = `⚠️ High Fatigue Risk: |ΔT| = ${dT.toFixed(1)}°C exceeds SP0114 7.10.1 Limit (167°C). Rapid thermal striping on bottom weld!`;
        } else {
          warnBanner.style.display = "none";
        }
      }
    }
  }

  // Animation controller
  function startAnimation() {
    if (state.animFrameId) return;

    function frame() {
      // Visibility guard: sleep immediately when container is hidden or tab inactive
      const containerEl = document.getElementById(state.targetContainerId || "injectionMixingVizContainer");
      if (!containerEl || containerEl.style.display === "none" || containerEl.offsetParent === null) {
        state.animFrameId = null;
        return;
      }

      if (state.animating) {
        state.time += 0.03 * state.animSpeed;
        updateParticles();
        renderCanvas();
      }
      state.animFrameId = requestAnimationFrame(frame);
    }
    state.animFrameId = requestAnimationFrame(frame);
  }

  function stopAnimation() {
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }
  }

  function updateParticles() {
    const isInj = state.activeSimulation === "injection";
    const W = state.canvas ? (state.canvas.width / (window.devicePixelRatio || 1)) : 960;
    const pipeLeft = 50;
    const pipeRight = Math.max(pipeLeft + 400, W - 50);

    if (isInj) {
      const pipeTop = 110;
      const pipeBottom = 290;
      const pipeHeight = pipeBottom - pipeTop;
      const quillX = 280;
      const insertionPx = pipeTop + (pipeHeight * (state.quillDepthPercent / 100));

      state.particles.forEach(p => {
        p.x += p.vx * state.animSpeed;
        p.y += p.vy * state.animSpeed;
        p.life -= 0.5 * state.animSpeed;

        // Wall collision: keep strictly within upper and lower pipe walls
        if (p.y <= pipeTop + p.radius + 1) {
          p.y = pipeTop + p.radius + 1;
          p.vy = Math.abs(p.vy) * 0.4;
        } else if (p.y >= pipeBottom - p.radius - 1) {
          p.y = pipeBottom - p.radius - 1;
          p.vy = -Math.abs(p.vy) * 0.4;
        }

        // Respawn if leaving downstream exit, going backwards, or dead
        if (p.x >= pipeRight - 6 || p.x < pipeLeft || p.life <= 0) {
          p.life = 70 + Math.random() * 60;
          if (p.type === "injectant") {
            p.x = quillX + 6;
            p.y = state.quillStyle === "open_boss" ? (pipeTop + p.radius + 3) : insertionPx;
            p.vx = 2.4 + Math.random() * 3.6;
            p.vy = (Math.random() - 0.5) * (state.quillStyle === "quill_spray" ? 2.2 : 0.8);
          } else {
            p.x = pipeLeft + 2 + Math.random() * 20;
            p.y = pipeTop + 8 + Math.random() * (pipeHeight - 16);
            p.vx = 2.2 + Math.random() * 3.0;
            p.vy = (Math.random() - 0.5) * 0.3;
          }
        }
      });
    } else {
      // Mixing Mode (Tee Pipe)
      const pipeTop = 130;
      const pipeBottom = 310;
      const pipeHeight = pipeBottom - pipeTop;
      const teeX = 280;
      const branchDia = 80;
      const branchLeft = teeX - branchDia / 2; // 240
      const branchRight = teeX + branchDia / 2; // 320
      const branchTop = 30;

      state.particles.forEach(p => {
        p.x += p.vx * state.animSpeed;
        p.y += p.vy * state.animSpeed;
        p.life -= 0.5 * state.animSpeed;

        // 1. Strict Bottom Pipe Wall Collision (Never escape below bottom)
        if (p.y >= pipeBottom - p.radius - 1) {
          p.y = pipeBottom - p.radius - 1;
          p.vy = -Math.abs(p.vy) * 0.35;
        }

        // 2. Zone-Specific Boundary Collision
        if (p.y < pipeTop) {
          // Inside vertical branch neck
          if (p.x <= branchLeft + p.radius + 1) {
            p.x = branchLeft + p.radius + 1;
            p.vx = Math.abs(p.vx) * 0.4;
          } else if (p.x >= branchRight - p.radius - 1) {
            p.x = branchRight - p.radius - 1;
            p.vx = -Math.abs(p.vx) * 0.4;
          }
          if (p.y < branchTop + 2) {
            p.y = branchTop + 2;
            p.vy = Math.abs(p.vy) * 0.5;
          }
        } else {
          // Inside main horizontal pipe (y >= pipeTop)
          // Top wall boundary: only exists when x is OUTSIDE the branch neck!
          const inBranchZone = (p.x >= branchLeft - 2 && p.x <= branchRight + 2);
          if (!inBranchZone && p.y <= pipeTop + p.radius + 1) {
            p.y = pipeTop + p.radius + 1;
            p.vy = Math.abs(p.vy) * 0.35;
          }
          if (p.x < pipeLeft + 2) {
            p.x = pipeLeft + 2;
            p.vx = Math.abs(p.vx);
          }
        }

        // 3. Fluid dynamics interactions in mixing tee
        if (p.type === "injectant") {
          if (p.y >= pipeTop && p.y <= pipeBottom) {
            // Main process stream crossflow sweeps branch stream rightwards
            p.vx += 0.32 * state.animSpeed;
            // Tendency to stratify near bottom if cold/dense
            if (p.x > branchRight && p.y < pipeTop + pipeHeight * 0.55) {
              p.vy += 0.08 * state.animSpeed;
            }
          }
          if (state.staticMixerEnabled && p.x >= 390 && p.x <= 570) {
            // Swirl inside static mixer
            p.vy += Math.sin((p.x - 390) * 0.08 + state.time * 4) * 0.7;
          }
        }

        // 4. Respawn check
        if (p.x >= pipeRight - 6 || p.life <= 0) {
          p.life = 70 + Math.random() * 60;
          if (p.type === "injectant") {
            // Respawn at top of vertical branch neck
            p.x = branchLeft + 10 + Math.random() * (branchDia - 20);
            p.y = branchTop + 4 + Math.random() * 8;
            p.vx = (Math.random() - 0.5) * 0.5;
            p.vy = 2.0 + Math.random() * 2.2;
          } else {
            // Respawn at left inlet of main pipe
            p.x = pipeLeft + 2 + Math.random() * 15;
            p.y = pipeTop + 10 + Math.random() * (pipeHeight - 20);
            p.vx = 2.4 + Math.random() * 3.0;
            p.vy = (Math.random() - 0.5) * 0.3;
          }
        }
      });
    }
  }

  /**
   * Main Render Pipeline
   */
  function renderCanvas() {
    const canvas = state.canvas;
    const ctx = state.ctx;
    if (!canvas || !ctx) return;

    const W = canvas.width / (window.devicePixelRatio || 1);
    const H = canvas.height / (window.devicePixelRatio || 1);

    ctx.save();
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // Background: Dark Blueprint Style
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H);

    // Engineering Coordinate Grid
    drawEngineeringGrid(ctx, W, H);

    if (state.activeSimulation === "injection") {
      drawInjectionSimulation(ctx, W, H);
    } else {
      drawMixingSimulation(ctx, W, H);
    }

    ctx.restore();
  }

  function drawEngineeringGrid(ctx, W, H) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = 20;

    ctx.beginPath();
    for (let x = 0; x < W; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  /**
   * DRAW INJECTION SIMULATION (NACE SP0114 / API 570)
   */
  function drawInjectionSimulation(ctx, W, H) {
    const pipeTop = 110;
    const pipeBottom = 290;
    const pipeHeight = pipeBottom - pipeTop;
    const pipeLeft = 50;
    const pipeRight = W - 50;

    const quillX = 280;
    const insertionPx = pipeTop + (pipeHeight * (state.quillDepthPercent / 100));

    // 1. API 570 Inspection Circuit Dimensions & Markings
    drawInspectionLimits(ctx, quillX, pipeTop, pipeBottom, pipeLeft, pipeRight);

    // 2. Main Process Pipe Solid Geometry (Carbon Steel with wall hatching)
    drawPipeSpool(ctx, pipeLeft, pipeRight, pipeTop, pipeBottom);

    // 3. Middle 1/3 Guide Band (SP0114 Section 7.2)
    drawMiddleThirdZone(ctx, pipeLeft, pipeRight, pipeTop, pipeBottom);

    // 4. Fluid Dynamics & Droplet Spray Plume (Strictly clipped to inner pipe cavity)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pipeLeft, pipeTop, pipeRight - pipeLeft, pipeBottom - pipeTop);
    ctx.clip();
    drawSprayPlume(ctx, quillX, insertionPx, pipeTop, pipeBottom, pipeRight);
    ctx.restore();

    // 5. Injection Quill & Flange Assembly
    drawQuillAssembly(ctx, quillX, pipeTop, insertionPx);

    // 6. CML (Corrosion Monitoring Location) Inspection Points
    drawCmlTargets(ctx, quillX, pipeTop, pipeBottom);

    // 7. Dimension Callouts & Technical Labels
    drawInjectionAnnotations(ctx, quillX, insertionPx, pipeTop, pipeBottom);
  }

  /**
   * DRAW MIXING POINT SIMULATION (Thermal Fatigue / Stratification)
   */
  function drawMixingSimulation(ctx, W, H) {
    const pipeTop = 130;
    const pipeBottom = 310;
    const pipeLeft = 50;
    const pipeRight = W - 50;
    const teeX = 280;
    const branchDia = 80;
    const branchLeft = teeX - branchDia / 2;
    const branchRight = teeX + branchDia / 2;
    const branchTop = 30;

    // 1. Mixing Inspection Boundaries
    drawMixingInspectionLimits(ctx, teeX, pipeTop, pipeBottom, pipeLeft, pipeRight);

    // 2. Pipe Tee Geometry (Main horizontal + Vertical/Lateral branch)
    drawMixingTeePipes(ctx, pipeLeft, pipeRight, pipeTop, pipeBottom, teeX, state.branchAngle);

    // 3, 4, 5, 6: Fluid layers, static mixer, and particles strictly clipped to T-junction inner fluid path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pipeLeft, pipeTop);
    ctx.lineTo(branchLeft, pipeTop);
    ctx.lineTo(branchLeft, branchTop);
    ctx.lineTo(branchRight, branchTop);
    ctx.lineTo(branchRight, pipeTop);
    ctx.lineTo(pipeRight, pipeTop);
    ctx.lineTo(pipeRight, pipeBottom);
    ctx.lineTo(pipeLeft, pipeBottom);
    ctx.closePath();
    ctx.clip();

    // 3. Thermal Stratification Gradient & Striping Waves
    drawThermalStratification(ctx, teeX, pipeTop, pipeBottom, pipeRight);

    // 4. Internal Static Mixer (if enabled)
    if (state.staticMixerEnabled) {
      drawStaticMixerElements(ctx, 390, pipeTop + 4, pipeBottom - 4, 180);
    }

    // 5. Thermal Sleeve / Protective Liner (if enabled)
    if (state.thermalSleeveEnabled) {
      drawThermalSleeveLiner(ctx, teeX, pipeTop);
    }

    // 6. Mixing Stream Particles
    drawMixingParticles(ctx, teeX, pipeTop, pipeBottom);

    ctx.restore();

    // 7. Crotch Stress Callout & Technical Markings (Rendered clean on top of pipes)
    drawMixingAnnotations(ctx, teeX, pipeTop, pipeBottom);
  }

  /**
   * Drawing Helper: Pipe Spool Walls & Cross-Hatching
   */
  function drawPipeSpool(ctx, left, right, top, bottom) {
    const wallThick = 14;

    // Fluid cavity background
    ctx.fillStyle = "#0c1524";
    ctx.fillRect(left, top, right - left, bottom - top);

    // Top wall
    ctx.fillStyle = "#334155";
    ctx.fillRect(left, top - wallThick, right - left, wallThick);
    drawHatching(ctx, left, top - wallThick, right - left, wallThick);

    // Bottom wall
    ctx.fillStyle = "#334155";
    ctx.fillRect(left, bottom, right - left, wallThick);
    drawHatching(ctx, left, bottom, right - left, wallThick);

    // Inner pipe boundary lines
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(right, top);
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();

    // Pipe centerline (dash-dot)
    const midY = (top + bottom) / 2;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 4, 2, 4]);
    ctx.beginPath();
    ctx.moveTo(left, midY);
    ctx.lineTo(right, midY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Centerline symbol CL
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText("℄ PIPE CENTERLINE", left + 8, midY - 4);
  }

  function drawHatching(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    const spacing = 8;
    for (let i = -h; i < w + h; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(x + i, y);
      ctx.lineTo(x + i + h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Middle 1/3 Pipe Guideline (NACE SP0114 Section 7.2)
   */
  function drawMiddleThirdZone(ctx, left, right, top, bottom) {
    const H = bottom - top;
    const oneThirdY = top + H / 3;
    const twoThirdY = top + (2 * H) / 3;

    // Shaded allowed target corridor
    ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
    ctx.fillRect(left, oneThirdY, right - left, twoThirdY - oneThirdY);

    // Dashed boundaries
    ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    ctx.moveTo(left, oneThirdY);
    ctx.lineTo(right, oneThirdY);
    ctx.moveTo(left, twoThirdY);
    ctx.lineTo(right, twoThirdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = "#10b981";
    ctx.font = "10.5px sans-serif";
    ctx.fillText("TARGET INJECTION ZONE: Middle 1/3 Pipe Diameter (D_i / 3)", left + 18, oneThirdY + 14);
  }

  /**
   * Inspection Limits: 12" Upstream & 25D Downstream per API 570 §5.9
   */
  function drawInspectionLimits(ctx, quillX, pipeTop, pipeBottom, pipeLeft, pipeRight) {
    const dimY = pipeTop - 38;
    const upLimitX = Math.max(pipeLeft + 20, quillX - 140); // 12" upstream equivalent
    const dnLimitX = Math.min(pipeRight - 20, quillX + 380); // 25D downstream equivalent

    // Upstream 12" dimension line
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;

    // Upstream tick & arrow
    drawDimension(ctx, upLimitX, quillX, dimY, "12\" (300 mm) Upstream Limit (API 570 §5.9)");

    // Downstream 25D dimension line
    drawDimension(ctx, quillX, dnLimitX, dimY, "Downstream Inspection Circuit: 25D - 30D (~6.5 - 7.6 m)");

    // Vertical boundary limit lines (dashed)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(upLimitX, dimY - 4);
    ctx.lineTo(upLimitX, pipeBottom + 40);

    ctx.moveTo(dnLimitX, dimY - 4);
    ctx.lineTo(dnLimitX, pipeBottom + 40);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDimension(ctx, x1, x2, y, label) {
    ctx.strokeStyle = "#38bdf8";
    ctx.fillStyle = "#38bdf8";
    ctx.lineWidth = 1.2;

    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Arrows
    drawArrowHead(ctx, x1, y, Math.PI);
    drawArrowHead(ctx, x2, y, 0);

    // Text above line
    ctx.font = "10.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, (x1 + x2) / 2, y - 6);
    ctx.textAlign = "left";
  }

  function drawArrowHead(ctx, x, y, angle) {
    const s = 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s, -s / 2);
    ctx.lineTo(-s, s / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Injection Quill, Flange, Valves & Beveled Tip
   */
  function drawQuillAssembly(ctx, x, pipeTop, tipY) {
    const isFlushBoss = state.quillStyle === "open_boss";
    const actualTipY = isFlushBoss ? pipeTop + 2 : tipY;

    // Flanged Nozzle Boss on Pipe
    ctx.fillStyle = "#475569";
    ctx.fillRect(x - 22, pipeTop - 32, 44, 32);

    // Welding fillets
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(x - 30, pipeTop);
    ctx.lineTo(x - 22, pipeTop);
    ctx.lineTo(x - 22, pipeTop - 12);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 30, pipeTop);
    ctx.lineTo(x + 22, pipeTop);
    ctx.lineTo(x + 22, pipeTop - 12);
    ctx.closePath();
    ctx.fill();

    // Pipe Flange
    ctx.fillStyle = "#64748b";
    ctx.fillRect(x - 32, pipeTop - 42, 64, 10);

    // Quill Mating Flange
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x - 32, pipeTop - 54, 64, 10);

    // Flange Stud Bolts
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(x - 26, pipeTop - 58, 6, 28);
    ctx.fillRect(x + 20, pipeTop - 58, 6, 28);

    // Quill Body Pipe (downward into stream)
    const quillOuterWidth = 14;
    const quillHalf = quillOuterWidth / 2;

    ctx.fillStyle = "#0284c7";
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 1;

    if (!isFlushBoss) {
      // Draw Quill shaft
      ctx.fillRect(x - quillHalf, pipeTop - 54, quillOuterWidth, actualTipY - (pipeTop - 54));
      ctx.strokeRect(x - quillHalf, pipeTop - 54, quillOuterWidth, actualTipY - (pipeTop - 54));

      // Quill Tip Geometry
      if (state.quillStyle === "quill_beveled") {
        // 45° bevel cut facing downstream (Right)
        ctx.beginPath();
        ctx.moveTo(x - quillHalf, actualTipY - 14);
        ctx.lineTo(x + quillHalf, actualTipY);
        ctx.lineTo(x - quillHalf, actualTipY);
        ctx.closePath();
        ctx.fillStyle = "#0c1524"; // Cut away orifice
        ctx.fill();

        // 45° Bevel line indicator
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - quillHalf, actualTipY - 14);
        ctx.lineTo(x + quillHalf, actualTipY);
        ctx.stroke();

        // Bevel callout
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("45° Bevel (Downstream)", x + 16, actualTipY - 6);
      } else if (state.quillStyle === "quill_spray") {
        // Spray Nozzle head
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(x - 12, actualTipY - 8);
        ctx.lineTo(x + 12, actualTipY - 8);
        ctx.lineTo(x, actualTipY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Open Boss: Orifice at pipe top inner surface
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.arc(x, pipeTop + 4, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f97316";
      ctx.font = "10px sans-serif";
      ctx.fillText("⚠️ NO QUILL (Wall Boss)", x + 18, pipeTop + 14);
    }

    // Feed valve and arrow entering quill
    ctx.strokeStyle = "#38bdf8";
    ctx.fillStyle = "#38bdf8";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, pipeTop - 85);
    ctx.lineTo(x, pipeTop - 56);
    ctx.stroke();
    drawArrowHead(ctx, x, pipeTop - 56, Math.PI / 2);

    // Chemical feed label
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("CHEMICAL FEED / INJECTANT", x + 14, pipeTop - 74);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${(state.flowB).toLocaleString()} kg/h @ ${state.tempB}°C`, x + 14, pipeTop - 60);
  }

  /**
   * Spray Plume / Droplet Trajectory
   */
  function drawSprayPlume(ctx, quillX, tipY, pipeTop, pipeBottom, pipeRight) {
    const isFlushBoss = state.quillStyle === "open_boss";
    const originY = isFlushBoss ? pipeTop + 2 : tipY;
    const originX = quillX + 6;

    // Plume envelope gradient
    const plumeGrad = ctx.createRadialGradient(originX, originY, 4, originX + 220, originY, 260);
    plumeGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
    plumeGrad.addColorStop(0.35, "rgba(14, 165, 233, 0.25)");
    plumeGrad.addColorStop(0.8, "rgba(2, 132, 199, 0.08)");
    plumeGrad.addColorStop(1, "rgba(2, 132, 199, 0.0)");

    ctx.fillStyle = plumeGrad;
    ctx.beginPath();
    ctx.moveTo(originX, originY);

    if (isFlushBoss) {
      // Fluid hugs top wall (high erosion-corrosion)
      ctx.lineTo(pipeRight - 20, pipeTop);
      ctx.lineTo(pipeRight - 20, pipeTop + 35);
      ctx.lineTo(originX + 20, pipeTop + 25);
    } else {
      // Disperses toward center and downstream
      ctx.quadraticCurveTo(originX + 100, originY - 10, pipeRight - 20, pipeTop + 20);
      ctx.lineTo(pipeRight - 20, pipeBottom - 20);
      ctx.quadraticCurveTo(originX + 80, originY + 30, originX, originY + 8);
    }
    ctx.closePath();
    ctx.fill();

    // Render animated droplets inside plume
    state.particles.forEach(p => {
      ctx.fillStyle = p.type === "injectant" ? "#38bdf8" : "rgba(251, 191, 36, 0.65)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.type === "injectant" ? p.radius : p.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Check Wall Impingement zone
    const isMiddleThird = state.quillDepthPercent >= 33 && state.quillDepthPercent <= 66;
    if (!isMiddleThird && !isFlushBoss) {
      const impY = state.quillDepthPercent > 66 ? pipeBottom : pipeTop;
      const impGrad = ctx.createLinearGradient(quillX + 40, impY, quillX + 180, impY);
      impGrad.addColorStop(0, "rgba(239, 68, 68, 0.8)");
      impGrad.addColorStop(1, "rgba(239, 68, 68, 0.0)");

      ctx.fillStyle = impGrad;
      ctx.fillRect(quillX + 40, state.quillDepthPercent > 66 ? pipeBottom - 8 : pipeTop, 180, 8);

      // Warning arrow at bottom
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10.5px sans-serif";
      ctx.fillText("⚡ CRITICAL WALL IMPINGEMENT (Accelerated Thinning)", quillX + 60, state.quillDepthPercent > 66 ? pipeBottom + 30 : pipeTop - 20);
    }
  }

  /**
   * CML (Corrosion Monitoring Location) Inspection Points (API 570)
   */
  function drawCmlTargets(ctx, quillX, pipeTop, pipeBottom) {
    const cmls = [
      { id: "CML-1", x: quillX - 140, y: pipeBottom + 14, desc: "Upstream Baseline (-12\")" },
      { id: "CML-2", x: quillX, y: pipeTop - 14, desc: "Quill Nozzle Throat" },
      { id: "CML-3", x: quillX + 70, y: pipeBottom + 14, desc: "Impingement Zone (+2D)" },
      { id: "CML-4", x: quillX + 260, y: pipeBottom + 14, desc: "Dispersion Limit (+15D)" }
    ];

    cmls.forEach(cml => {
      // Target circle
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.arc(cml.x, cml.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Outer bullseye ring
      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cml.x, cml.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Callout tag
      ctx.fillStyle = "#f43f5e";
      ctx.font = "bold 9.5px sans-serif";
      ctx.fillText(cml.id, cml.x - 14, cml.y > pipeBottom ? cml.y + 16 : cml.y - 12);
    });
  }

  /**
   * Injection Annotations & Process Flow Marker
   */
  function drawInjectionAnnotations(ctx, quillX, tipY, pipeTop, pipeBottom) {
    // Process flow arrow (Main stream)
    const arrY = (pipeTop + pipeBottom) / 2;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
    ctx.lineWidth = 1;
    drawBadgeRect(ctx, 62, arrY - 26, 155, 46, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("MAIN PROCESS FLOW", 70, arrY - 10);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${(state.flowA).toLocaleString()} kg/h @ ${state.tempA}°C`, 70, arrY + 8);
    ctx.restore();

    // Quill tip location badge
    const isMiddleThird = state.quillDepthPercent >= 33 && state.quillDepthPercent <= 66;
    ctx.fillStyle = isMiddleThird ? "#10b981" : "#ef4444";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(
      isMiddleThird ? "✅ Center 1/3 Depth (Compliant)" : "❌ Outside Center 1/3",
      quillX + 16,
      tipY + 18
    );
  }

  /**
   * DRAW MIXING POINT: Tee Pipes (Horizontal Main + Branch)
   */
  function drawMixingTeePipes(ctx, left, right, top, bottom, teeX, branchAngle) {
    const wallThick = 14;
    const branchDia = 80;
    const branchLeft = teeX - branchDia / 2;
    const branchRight = teeX + branchDia / 2;

    // Fluid cavity
    ctx.fillStyle = "#0c1524";
    ctx.fillRect(left, top, right - left, bottom - top);

    // Branch fluid cavity
    ctx.fillRect(branchLeft, 30, branchDia, top - 30);

    // Top pipe wall with cutout for branch tee
    ctx.fillStyle = "#334155";
    ctx.fillRect(left, top - wallThick, branchLeft - left, wallThick);
    drawHatching(ctx, left, top - wallThick, branchLeft - left, wallThick);

    ctx.fillRect(branchRight, top - wallThick, right - branchRight, wallThick);
    drawHatching(ctx, branchRight, top - wallThick, right - branchRight, wallThick);

    // Bottom continuous wall
    ctx.fillRect(left, bottom, right - left, wallThick);
    drawHatching(ctx, left, bottom, right - left, wallThick);

    // Branch vertical walls
    ctx.fillRect(branchLeft - wallThick, 30, wallThick, top - 30);
    drawHatching(ctx, branchLeft - wallThick, 30, wallThick, top - 30);

    ctx.fillRect(branchRight, 30, wallThick, top - 30);
    drawHatching(ctx, branchRight, 30, wallThick, top - 30);

    // Tee Crotch Welds (High Stress Concentration)
    ctx.fillStyle = "#94a3b8";
    // Left crotch weld
    ctx.beginPath();
    ctx.moveTo(branchLeft, top);
    ctx.lineTo(branchLeft - 8, top);
    ctx.lineTo(branchLeft, top - 8);
    ctx.closePath();
    ctx.fill();

    // Right crotch weld
    ctx.beginPath();
    ctx.moveTo(branchRight, top);
    ctx.lineTo(branchRight + 8, top);
    ctx.lineTo(branchRight, top - 8);
    ctx.closePath();
    ctx.fill();

    // Branch Flange at top
    ctx.fillStyle = "#64748b";
    ctx.fillRect(branchLeft - 18, 30, branchDia + 36, 12);
  }

  /**
   * Thermal Stratification Layer & Cyclic Striping Waves
   */
  function drawThermalStratification(ctx, teeX, top, bottom, right) {
    const H = bottom - top;
    const dT = Math.abs(state.tempA - state.tempB);

    if (state.staticMixerEnabled) {
      // Rapid blending: Uniform mixed gradient after mixer
      const blendGrad = ctx.createLinearGradient(teeX, top, right, top);
      blendGrad.addColorStop(0, "rgba(14, 165, 233, 0.4)");
      blendGrad.addColorStop(0.3, "rgba(147, 51, 234, 0.5)");
      blendGrad.addColorStop(0.6, "rgba(99, 102, 241, 0.5)");
      blendGrad.addColorStop(1, "rgba(59, 130, 246, 0.45)");

      ctx.fillStyle = blendGrad;
      ctx.fillRect(teeX, top, right - teeX, H);

      // Uniform temp callout
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("✅ HOMOGENEOUS THERMAL BLEND (Stratification Eliminated)", 400, top + H / 2);
    } else {
      // Severe stratification: Cold fluid flows along bottom or wall
      const stratGrad = ctx.createLinearGradient(0, top, 0, bottom);
      stratGrad.addColorStop(0, "rgba(234, 88, 12, 0.6)"); // Hot process fluid top (Stream A)
      stratGrad.addColorStop(0.5, "rgba(217, 119, 6, 0.4)");
      stratGrad.addColorStop(0.85, "rgba(2, 132, 199, 0.7)"); // Cold branch fluid bottom (Stream B)
      stratGrad.addColorStop(1, "rgba(3, 105, 161, 0.85)");

      ctx.fillStyle = stratGrad;
      ctx.fillRect(teeX, top, right - teeX, H);

      // Thermal Striping Waves (Cyclic thermal fatigue on bottom wall)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = teeX; x < right; x += 4) {
        const wave = Math.sin((x - teeX) * 0.05 + state.time * 3) * (dT > 167 ? 14 : 8);
        const y = bottom - 22 + wave;
        if (x === teeX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Thermal striping callout
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("⚡ THERMAL STRIPING INTERFACE (f ≈ 0.1 - 2 Hz)", teeX + 30, bottom - 32);
    }
  }

  /**
   * Internal Static Mixer Elements (Kenics / Sulzer helical blades)
   */
  function drawStaticMixerElements(ctx, startX, top, bottom, length) {
    const H = bottom - top;
    const endX = startX + length;

    // Housing spool boundary
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, top, length, H);

    // Helical blades inside spool
    const blades = 4;
    const bladeW = length / blades;

    for (let i = 0; i < blades; i++) {
      const bx = startX + i * bladeW;
      const isAlt = i % 2 === 0;

      ctx.strokeStyle = "#94a3b8";
      ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      if (isAlt) {
        ctx.moveTo(bx, top);
        ctx.bezierCurveTo(bx + bladeW / 2, top + H / 2, bx + bladeW / 2, top + H / 2, bx + bladeW, bottom);
        ctx.bezierCurveTo(bx + bladeW / 2, bottom, bx, bottom - 10, bx, top);
      } else {
        ctx.moveTo(bx, bottom);
        ctx.bezierCurveTo(bx + bladeW / 2, top + H / 2, bx + bladeW / 2, top + H / 2, bx + bladeW, top);
        ctx.bezierCurveTo(bx + bladeW / 2, top, bx, top + 10, bx, bottom);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10.5px sans-serif";
    ctx.fillText("🌀 INTERNAL STATIC MIXER (4 Elements)", startX + 10, top - 8);
  }

  /**
   * Thermal Sleeve / Stress Isolator Liner
   */
  function drawThermalSleeveLiner(ctx, teeX, pipeTop) {
    const branchDia = 80;
    const left = teeX - branchDia / 2 + 8;
    const right = teeX + branchDia / 2 - 8;

    ctx.strokeStyle = "#34d399";
    ctx.lineWidth = 3;

    // Liner tube inside branch neck
    ctx.beginPath();
    ctx.moveTo(left, 45);
    ctx.lineTo(left, pipeTop + 16);

    ctx.moveTo(right, 45);
    ctx.lineTo(right, pipeTop + 16);
    ctx.stroke();

    // Liner label
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("🛡️ Thermal Sleeve Liner (Protects Crotch Weld)", teeX + 46, 65);
  }

  function drawMixingParticles(ctx, teeX, top, bottom) {
    state.particles.forEach(p => {
      ctx.fillStyle = p.type === "injectant" ? "#38bdf8" : "#f97316";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBadgeRect(ctx, x, y, w, h, r = 6) {
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    }
  }

  function drawMixingInspectionLimits(ctx, teeX, pipeTop, pipeBottom, pipeLeft, pipeRight) {
    const dimY = pipeTop - 48; // Y = 82, leaving ample room for branch labels above
    const upLimitX = Math.max(pipeLeft + 20, teeX - 140);
    const dnLimitX = Math.min(pipeRight - 20, teeX + 380);

    drawDimension(ctx, upLimitX, teeX - 45, dimY, "12\" (300 mm) Upstream Run");
    drawDimension(ctx, teeX + 45, dnLimitX, dimY, "Downstream Mixing Circuit: 25D - 30D");

    // Branch upstream 12" limit line (neatly on left of branch neck)
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(teeX - 65, 48);
    ctx.lineTo(teeX - 42, 48);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("12\" Upstream Limit", teeX - 46, 44);
    ctx.textAlign = "left";
  }

  function drawMixingAnnotations(ctx, teeX, pipeTop, pipeBottom) {
    const branchDia = 80;
    const branchRight = teeX + branchDia / 2; // 320
    const branchLeft = teeX - branchDia / 2;  // 240
    const pipeHeight = pipeBottom - pipeTop;
    const midY = pipeTop + pipeHeight / 2;    // Y = 220, centered inside main pipe

    // Stream A label badge: cleanly positioned inside pipe cavity along centerline
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
    ctx.lineWidth = 1;
    drawBadgeRect(ctx, 62, midY - 24, 160, 44, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f97316";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("STREAM A: MAIN PROCESS RUN", 70, midY - 8);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${(state.flowA).toLocaleString()} kg/h @ ${state.tempA}°C`, 70, midY + 10);
    ctx.restore();

    // Stream B label badge: neatly placed to the right of vertical branch neck (above downstream dimension)
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1;
    drawBadgeRect(ctx, branchRight + 12, 32, 155, 42, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("STREAM B: BRANCH TEE", branchRight + 18, 48);
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${(state.flowB).toLocaleString()} kg/h @ ${state.tempB}°C`, branchRight + 18, 64);
    ctx.restore();

    // Crotch stress concentration point & leader callout
    const crotchX = branchLeft; // 240
    const crotchY = pipeTop;    // 130
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(crotchX, crotchY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#fecaca";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(crotchX, crotchY, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Clear angled leader line pointing up-left
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(crotchX, crotchY - 8);
    ctx.lineTo(crotchX - 20, crotchY - 24);
    ctx.lineTo(crotchX - 44, crotchY - 24);
    ctx.stroke();

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("High Stress Crotch Weld", crotchX - 48, crotchY - 20);
    ctx.font = "8.5px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("(API 570 §5.6 Fatigue Zone)", crotchX - 48, crotchY - 9);
    ctx.textAlign = "left";
  }

  /**
   * Interactive Event Handlers
   */
  function onQuillDepthInput(val) {
    state.quillDepthPercent = parseFloat(val) || 50;
    const depthEl = document.getElementById("quillDepthVal");
    if (depthEl) {
      const isMid = state.quillDepthPercent >= 33 && state.quillDepthPercent <= 66;
      depthEl.textContent = `${state.quillDepthPercent}% (${isMid ? 'Center 1/3 OK' : 'Non-Compliant'})`;
      depthEl.style.color = isMid ? "#10b981" : "#ef4444";
    }
    updateHudText();
  }

  function onQuillStyleChange(val) {
    state.quillStyle = val;
    updateHudText();
  }

  function onMainFlowInput(val) {
    state.flowA = parseFloat(val) || 50000;
    updateHudText();
  }

  function onInjectFlowInput(val) {
    state.flowB = parseFloat(val) || 20000;
    updateHudText();
  }

  function onTempDeltaInput(val) {
    const delta = parseFloat(val) || 100;
    state.tempB = Math.max(20, state.tempA - delta);
    updateHudText();
  }

  function toggleStaticMixer() {
    state.staticMixerEnabled = !state.staticMixerEnabled;
    const btn = document.getElementById("btnStaticMixerToggle");
    if (btn) {
      if (state.staticMixerEnabled) {
        btn.textContent = "🌀 Static Mixer: ON (Rapid 4D Blending)";
        btn.style.background = "#10b981";
        btn.style.color = "#ffffff";
      } else {
        btn.textContent = "⚪ Static Mixer: OFF (Long 25D Plume)";
        btn.style.background = "#e2e8f0";
        btn.style.color = "#334155";
      }
    }
    updateHudText();
  }

  function toggleThermalSleeve() {
    state.thermalSleeveEnabled = !state.thermalSleeveEnabled;
    const btn = document.getElementById("btnThermalSleeveToggle");
    if (btn) {
      if (state.thermalSleeveEnabled) {
        btn.textContent = "🛡️ Thermal Sleeve: INSTALLED";
        btn.style.background = "#10b981";
        btn.style.color = "#ffffff";
      } else {
        btn.textContent = "⚪ Thermal Sleeve: Not Fitted";
        btn.style.background = "#e2e8f0";
        btn.style.color = "#334155";
      }
    }
    updateHudText();
  }

  function setBranchAngle(angle) {
    state.branchAngle = angle;
    const btn90 = document.getElementById("btnAngle90");
    const btn45 = document.getElementById("btnAngle45");
    const angleEl = document.getElementById("branchAngleVal");

    if (btn90) btn90.classList.toggle("active", angle === 90);
    if (btn45) btn45.classList.toggle("active", angle === 45);
    if (angleEl) angleEl.textContent = angle === 90 ? "90° Standard Tee" : "45° Lateral Tee";
  }

  function toggleAnimation() {
    state.animating = !state.animating;
    const btn = document.getElementById("vizBtnToggleAnim");
    if (btn) {
      btn.textContent = state.animating ? "⏸️ Pause Motion" : "▶️ Resume Motion";
      btn.style.background = state.animating ? "#0284c7" : "#059669";
    }
  }

  function resetToStreamValues() {
    if (state.streamA && state.streamB) {
      updateFromStreams(state.streamA, state.streamB);
      state.quillDepthPercent = 50;
      const depthSlider = document.getElementById("quillDepthSlider");
      if (depthSlider) depthSlider.value = 50;
      onQuillDepthInput(50);
    }
  }

  function exportSnapshot() {
    if (!state.canvas) return;
    const link = document.createElement("a");
    const modeName = state.activeSimulation === "injection" ? "Injection_Point_Circuit" : "Process_Mix_Tee_Circuit";
    link.download = `NACE_SP0114_${modeName}_Snapshot.png`;
    link.href = state.canvas.toDataURL("image/png");
    link.click();
  }

  function isVisible() {
    const container = document.getElementById("injectionMixingVizContainer");
    return container ? (container.style.display !== "none" && container.style.display !== "") : false;
  }

  function toggleVisibility(forceState) {
    const container = document.getElementById("injectionMixingVizContainer");
    if (!container) return;

    const currentlyVisible = isVisible();
    const makeVisible = (forceState !== undefined) ? !!forceState : !currentlyVisible;

    container.style.display = makeVisible ? "block" : "none";
    state.visible = makeVisible;

    // Update toggle button on parent dashboard
    const btnText = document.getElementById("vizToggleBtnText");
    const btnIcon = document.getElementById("vizToggleBtnIcon");
    const btn = document.getElementById("btnToggle2dSimulation");
    const badge = document.getElementById("vizStatusBadge");

    if (btnText) btnText.textContent = makeVisible ? "Hide 2D Simulation" : "Show 2D Simulation";
    if (btnIcon) btnIcon.textContent = makeVisible ? "🙈" : "👁️";
    if (badge) {
      badge.textContent = makeVisible ? "Active (Simulating)" : "Hidden";
      badge.style.background = makeVisible ? "#065f46" : "#334155";
      badge.style.color = makeVisible ? "#34d399" : "#94a3b8";
    }
    if (btn) {
      btn.style.background = makeVisible ? "#475569" : "#2563eb";
    }

    if (makeVisible) {
      if (!state.canvas || !state.ctx) {
        init("injectionMixingVizContainer");
      } else {
        resizeCanvas();
      }
      state.animating = true;
      if (!state.animFrameId) {
        startAnimation();
      }
      setTimeout(() => {
        container.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    } else {
      // Pause animation loop to save CPU when hidden
      if (state.animFrameId) {
        cancelAnimationFrame(state.animFrameId);
        state.animFrameId = null;
      }
    }
  }

  function show() {
    toggleVisibility(true);
  }

  function hide() {
    toggleVisibility(false);
  }

  // Public export API
  window.InjectionMixingViz = {
    init,
    updateFromStreams,
    setMode,
    onQuillDepthInput,
    onQuillStyleChange,
    onMainFlowInput,
    onInjectFlowInput,
    onTempDeltaInput,
    toggleStaticMixer,
    toggleThermalSleeve,
    setBranchAngle,
    toggleAnimation,
    resetToStreamValues,
    exportSnapshot,
    toggleVisibility,
    isVisible,
    show,
    hide,
    pause: stopAnimation,
    resume: startAnimation,
    stopAnimation,
    startAnimation
  };

  // Auto-init on DOMContentLoaded if container exists
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init("injectionMixingVizContainer");
    });
  } else {
    init("injectionMixingVizContainer");
  }
})();
