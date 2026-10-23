/**
 * 🤖 CCD AI PLATFORM (Corrosion Control Document Management System)
 * Native controller, iframe manager & Corrosion Loop knowledge engine.
 */

(function () {
  "use strict";

  const CCD_EXTERNAL_URL = "/ccd-platform/index.html";

  // Pre-configured Refinery Corrosion Loops Knowledge Base
  const CCD_LOOPS = [
    {
      id: "CL-101",
      name: "CDU Atmospheric Overhead Condenser & Run-Down",
      unit: "Crude Distillation Unit (CDU)",
      moc: "Carbon Steel + 3.0 mm CA / Monel 400 at Bundle Inlet",
      operatingTemp: "85°C – 135°C (185°F – 275°F)",
      operatingPressure: "1.2 – 2.5 kg/cm²g",
      processFluid: "Hydrocarbon vapor, condensed water, HCl, H2S, NH3, organic acids",
      criticalParameters: "Overhead accumulator water pH (target 5.8 – 6.8), Cl- (< 20 ppm), Fe/Cl ratio",
      mechanisms: [
        { code: "API 571 - 3.37", name: "Hydrochloric Acid (HCl) Dew Point Corrosion", risk: "high", details: "Condensation of aqueous HCl at top trays & condenser tubes. Localized thinning, pitting." },
        { code: "API 571 - 3.9", name: "Ammonium Chloride (NH4Cl) Corrosion / Under-Deposit", risk: "high", details: "Deposition of solid NH4Cl salts prior to water dewpoint causing severe localized gouging." },
        { code: "API 571 - 3.67", name: "Wet H2S Damage (Blistering / HIC / SOHIC)", risk: "medium", details: "Aqueous sulfide environment with acidic pH promoting atomic hydrogen permeation." },
        { code: "API 571 - 3.27", name: "Erosion-Corrosion / Two-Phase Flow", risk: "medium", details: "High-velocity wet hydrocarbon vapor impacting condenser nozzle and tube bundle impingement plate." }
      ],
      iow: [
        { parameter: "Overhead Boot Water pH", target: "6.0 – 6.5", min: "5.5", max: "7.0", current: "6.2", status: "normal", pct: 60 },
        { parameter: "Accumulator Chloride (Cl⁻)", target: "< 15 ppm", min: "0", max: "30 ppm", current: "12 ppm", status: "normal", pct: 40 },
        { parameter: "Wash Water Flow Rate", target: "5.5 – 7.0 m³/h", min: "4.0", max: "8.5", current: "6.1 m³/h", status: "normal", pct: 70 },
        { parameter: "Filming Amine Inhibitor", target: "2.0 – 4.0 ppm", min: "1.5", max: "5.0", current: "3.2 ppm", status: "normal", pct: 65 }
      ],
      ndt: "Ultrasonic Thickness (AUT) on overhead piping elbows, PEC on insulated lines, Eddy Current (ECT) on condenser tubes during turnarounds.",
      mitigation: "Continuous wash water injection (25% vaporization minimum), neutralizing amine injection tied to accumulator pH, filming inhibitor injection."
    },
    {
      id: "CL-102",
      name: "Vacuum Column Heavy Vacuum Gas Oil (HVGO) Circuit",
      unit: "Vacuum Distillation Unit (VDU)",
      moc: "5Cr-0.5Mo / 9Cr-1Mo / 316L SS Clad at High-Velocity Nozzles",
      operatingTemp: "310°C – 390°C (590°F – 734°F)",
      operatingPressure: "30 – 60 mmHg absolute",
      processFluid: "Heavy Gas Oil, high Total Acid Number (TAN), high organic sulfur (mercaptans, sulfides)",
      criticalParameters: "TAN (> 1.5 mg KOH/g), total sulfur wt%, fluid velocity (> 30 m/s in transfer line)",
      mechanisms: [
        { code: "API 571 - 3.50", name: "Naphthenic Acid Corrosion (NAC)", risk: "high", details: "Occurs between 220°C and 400°C where organic acids condense. Sharp-edged grooves, impingement patterns without protective FeS scale." },
        { code: "API 571 - 3.61", name: "Sulfidation (High-Temp H2S-Free Sulfur)", risk: "high", details: "Sulfur reaction with iron above 260°C. Uniform thinning governed by Modified McConomy curves." },
        { code: "API 571 - 3.28", name: "Erosion-Corrosion (Cavitation / Flashing)", risk: "medium", details: "High-shear flow at column internals, transfer line elbows, and pump discharge." }
      ],
      iow: [
        { parameter: "Crude Blend TAN", target: "< 1.0 mg KOH/g", min: "0", max: "2.0", current: "0.8 mg KOH/g", status: "normal", pct: 40 },
        { parameter: "HVGO Draw Temp", target: "340°C – 360°C", min: "310", max: "375", current: "352°C", status: "normal", pct: 65 },
        { parameter: "Transfer Line Velocity", target: "< 28 m/s", min: "10", max: "35", current: "24 m/s", status: "normal", pct: 60 }
      ],
      ndt: "Automated Ultrasonic Grid (AUT) on high-turbulence elbows, High-Temperature UT on active lines, profile radiography on small-bore bleeds.",
      mitigation: "Crude blending to limit TAN < 1.0, upgrading metallurgy to 316L/317L (min 2.5% Mo), phosphate-based high-temperature corrosion inhibitor injection."
    },
    {
      id: "CL-201",
      name: "Hydrocracker / Hydrotreater Reactor Effluent Air Cooler (REAC)",
      unit: "Hydroprocessing / H2U Unit",
      moc: "2.25Cr-1Mo / Alloy 825 or Inconel 625 Clad REAC Tubes",
      operatingTemp: "60°C – 150°C (140°F – 300°F)",
      operatingPressure: "70 – 160 kg/cm²g",
      processFluid: "Hydrogen, H2S, NH3, hydrocarbons, aqueous ammonium bisulfide (NH4HS)",
      criticalParameters: "Kp salt precipitation temperature, NH4HS concentration (wt%), REAC header velocity",
      mechanisms: [
        { code: "API 571 - 3.6", name: "Ammonium Bisulfide (NH4HS) Sour Water Corrosion", risk: "high", details: "Extremely aggressive corrosion where NH3 and H2S react in aqueous phase. Velocity-sensitive erosion-corrosion." },
        { code: "API 571 - 3.35", name: "High-Temperature Hydrogen Attack (HTHA)", risk: "medium", details: "Reactor circuit upstream governed by API 941 Nelson Curves. Decarburization and fissuring." },
        { code: "API 571 - 3.51", name: "Polythionic Acid Stress Corrosion Cracking (PASCC)", risk: "medium", details: "Sensitized austenitic stainless steel during turnaround shutdown exposure to air & moisture." },
        { code: "API 571 - 3.36", name: "Hydrogen Embrittlement (HE)", risk: "medium", details: "High-strength bolts and thick-wall Cr-Mo steels during cooldown below 150°C." }
      ],
      iow: [
        { parameter: "REAC Sour Water NH4HS", target: "< 6.0 wt%", min: "0", max: "8.0", current: "4.8 wt%", status: "normal", pct: 55 },
        { parameter: "Wash Water Injection Rate", target: "> 8.0 m³/h", min: "6.0", max: "12.0", current: "9.5 m³/h", status: "normal", pct: 70 },
        { parameter: "Inlet Symmetrical Flow Split", target: "± 5% balance", min: "0", max: "10%", current: "3.2% delta", status: "normal", pct: 30 }
      ],
      ndt: "Internal Rotary Inspection System (IRIS) / Remote Field Testing (RFT) on REAC tubes, PAUT on header box plug welds, radiographic inspection.",
      mitigation: "Continuous high-purity deaerated wash water injection, symmetrical piping distribution to REAC bays, soda ash neutralization wash before shutdown."
    },
    {
      id: "CL-301",
      name: "Amine Gas Treating / Regenerator Column & Overhead",
      unit: "Amine Sweetening Unit (MDEA / DEA)",
      moc: "Carbon Steel with PWHT / 304L/316L SS Trays & Overhead",
      operatingTemp: "45°C (Absorber) / 120°C (Regenerator Bottom)",
      operatingPressure: "1.5 – 35 kg/cm²g",
      processFluid: "Rich/Lean MDEA amine, acid gas (H2S, CO2), amine degradation heat stable salts (HSS)",
      criticalParameters: "Amine acid gas loading (mol acid gas / mol amine), HSS wt%, velocity (< 1.5 m/s for CS)",
      mechanisms: [
        { code: "API 571 - 3.4", name: "Amine Stress Corrosion Cracking (ASCC)", risk: "high", details: "Alkaline stress corrosion cracking in non-PWHT carbon steel piping and vessel welds." },
        { code: "API 571 - 3.3", name: "Amine Corrosion (Acid Gas Flashing & Erosion)", risk: "high", details: "Rich amine flashing CO2/H2S vapors upon pressure reduction. Two-phase severe impingement." },
        { code: "API 571 - 3.67", name: "Wet H2S (SSC, HIC) in Rich Amine", risk: "medium", details: "High partial pressure of H2S in contact with non-NACE compliant steel." }
      ],
      iow: [
        { parameter: "Heat Stable Salts (HSS)", target: "< 2.0 wt%", min: "0", max: "4.0", current: "1.4 wt%", status: "normal", pct: 35 },
        { parameter: "Rich Amine Acid Gas Loading", target: "< 0.45 mol/mol", min: "0", max: "0.55", current: "0.38 mol/mol", status: "normal", pct: 60 },
        { parameter: "Lean Amine Temperature", target: "45°C – 55°C", min: "40", max: "65", current: "49°C", status: "normal", pct: 50 }
      ],
      ndt: "Wet Fluorescent Magnetic Particle Testing (WFMT) on internal welds, Shear Wave / TOFD for crack depth, high-resolution UT mapping on flash valves.",
      mitigation: "Strict Post Weld Heat Treatment (PWHT 620°C) on all carbon steel lines, slipstream filtration & vacuum ion-exchange reclamation, velocity limits."
    },
    {
      id: "CL-401",
      name: "Sour Water Stripper (SWS) Overhead Condenser Loop",
      unit: "Sour Water Stripper Unit",
      moc: "Carbon Steel / Alloy 825 / Titanium Gr. 2 in Tube Bundles",
      operatingTemp: "85°C – 115°C (185°F – 240°F)",
      operatingPressure: "1.5 – 2.2 kg/cm²g",
      processFluid: "Stripped acid gas, 30–50% H2S, 30–50% NH3, trace HCN, chlorides, water vapor",
      criticalParameters: "Overhead reflux water pH (target 8.5 – 9.5), NH4HS concentration, presence of cyanides",
      mechanisms: [
        { code: "API 571 - 3.6", name: "Ammonium Bisulfide (NH4HS) Alkaline Sour Water", risk: "high", details: "Extremely high concentration of NH4HS (8-15 wt%) causing aggressive wall loss and erosion." },
        { code: "API 571 - 3.24", name: "Cyanide Stress Cracking / Hydrogen Blistering", risk: "high", details: "HCN poisons iron sulfide film, accelerating hydrogen charging into steel." },
        { code: "API 571 - 3.28", name: "Erosion-Corrosion in Reflux Piping", risk: "medium", details: "High-turbulence downstream of control valves and piping tee junctions." }
      ],
      iow: [
        { parameter: "SWS Reflux NH4HS wt%", target: "< 8.0 wt%", min: "0", max: "12.0", current: "7.1 wt%", status: "normal", pct: 60 },
        { parameter: "Reflux Boot pH", target: "8.5 – 9.2", min: "8.0", max: "9.8", current: "8.8", status: "normal", pct: 50 },
        { parameter: "Overhead Air Cooler Velocity", target: "< 6.0 m/s", min: "1.5", max: "8.0", current: "5.2 m/s", status: "normal", pct: 65 }
      ],
      ndt: "Profile Radiography (RT) on small diameter elbows, UT thickness scanning, IRIS inspection of titanium/alloy tube bundles.",
      mitigation: "Polysulfide injection to convert cyanides to thiocyanates, upgrading to Titanium or Alloy 825, continuous reflux water purging."
    }
  ];

  let selectedLoopId = "CL-101";

  /**
   * Main function to show CCD AI Platform tab in the dashboard
   */
  window.showCCDAITab = function () {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(function (tab) {
      tab.style.display = "none";
    });

    const mechTitle = document.getElementById("selectedMechanismTitle");
    if (mechTitle) mechTitle.style.display = "none";

    if (typeof window.hideWelcomePanel === "function") window.hideWelcomePanel();
    if (typeof window.hideAllMainPanels === "function") window.hideAllMainPanels();

    // Reset layout modes
    document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

    const tab = document.getElementById("ccdAiTab");
    if (tab) {
      tab.style.display = "block";
      // Keep page scrolled to top so header and navbar remain intact
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Highlight sidebar link
    document.querySelectorAll("#categoryList a").forEach(function (a) {
      a.classList.remove("active-link");
    });
    const sidebarLink = document.querySelector('#rbac_cat_ccdAI li[data-rbac-sub="ccdAiPlatform"] a');
    if (sidebarLink) sidebarLink.classList.add("active-link");

    // Track in Recent Tabs if available
    if (window.recentTabs && typeof window.recentTabs.addTab === "function") {
      window.recentTabs.addTab("ccdAiTab");
    }

    // Initialize native workspace if needed
    renderSelectedLoop();
  };

  /**
   * Alias for backward compatibility with RBAC and menu links
   */
  window.openCCDAIPlatform = function () {
    window.showCCDAITab();
  };

  /**
   * Exit CCD and return to main dashboard
   */
  window.exitCCDPlatform = function () {
    const wrapper = document.querySelector(".ccd-direct-wrapper");
    if (wrapper) wrapper.classList.remove("ccd-fullscreen-active");
    const container = document.getElementById("ccdFrameContainer");
    if (container) container.classList.remove("ccd-fullscreen-active");
    const tab = document.getElementById("ccdAiTab");
    if (tab) tab.classList.remove("ccd-fullscreen-active");
    const btn = document.getElementById("ccdFullscreenBtn");
    if (btn) btn.innerHTML = "⛶ Fullscreen";

    if (typeof window.hideAllMainPanels === "function") window.hideAllMainPanels();
    if (typeof window.showWelcomePanel === "function") window.showWelcomePanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Reload embedded Cloud Run iframe
   */
  window.reloadCCDFrame = function () {
    const frame = document.getElementById("ccdPlatformFrame");
    if (frame) {
      frame.src = CCD_EXTERNAL_URL + "?t=" + Date.now();
    }
  };

  /**
   * Toggle Fullscreen View for the embedded platform
   */
  window.toggleCCDFullscreen = function () {
    const wrapper = document.querySelector(".ccd-direct-wrapper");
    const container = document.getElementById("ccdFrameContainer");
    const tab = document.getElementById("ccdAiTab");
    if (!wrapper) return;

    const isFull = wrapper.classList.toggle("ccd-fullscreen-active");
    if (container) container.classList.toggle("ccd-fullscreen-active", isFull);
    if (tab) tab.classList.toggle("ccd-fullscreen-active", isFull);

    const btn = document.getElementById("ccdFullscreenBtn");
    if (btn) {
      btn.innerHTML = isFull ? "⛶ Exit Fullscreen" : "⛶ Fullscreen";
      btn.title = isFull ? "Exit Fullscreen (Esc)" : "Full Screen View";
    }
  };

  // Keyboard shortcut: Escape to exit fullscreen
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const wrapper = document.querySelector(".ccd-direct-wrapper");
      if (wrapper && wrapper.classList.contains("ccd-fullscreen-active")) {
        window.toggleCCDFullscreen();
      }
    }
  });

  /**
   * Switch between Live Platform View and Native Loop Workspace
   */
  window.switchCCDView = function (mode) {
    const liveView = document.getElementById("ccdLiveViewSection");
    const loopView = document.getElementById("ccdLoopViewSection");
    const btnLive = document.getElementById("ccdBtnViewLive");
    const btnLoops = document.getElementById("ccdBtnViewLoops");

    if (mode === "live") {
      if (liveView) liveView.style.display = "block";
      if (loopView) loopView.style.display = "none";
      if (btnLive) btnLive.classList.add("active");
      if (btnLoops) btnLoops.classList.remove("active");
    } else {
      if (liveView) liveView.style.display = "none";
      if (loopView) loopView.style.display = "grid";
      if (btnLive) btnLive.classList.remove("active");
      if (btnLoops) btnLoops.classList.add("active");
      renderSelectedLoop();
    }
  };

  /**
   * Select a Corrosion Loop from list
   */
  window.selectCCDLoop = function (loopId) {
    selectedLoopId = loopId;
    renderSelectedLoop();
  };

  /**
   * Render Selected Loop details in the native view
   */
  function renderSelectedLoop() {
    const loop = CCD_LOOPS.find(function (l) { return l.id === selectedLoopId; }) || CCD_LOOPS[0];

    // Highlight selected item in list
    document.querySelectorAll(".ccd-loop-item").forEach(function (el) {
      if (el.getAttribute("data-loop-id") === loop.id) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    const titleEl = document.getElementById("ccdLoopTitle");
    const unitEl = document.getElementById("ccdLoopUnit");
    const mocEl = document.getElementById("ccdLoopMoc");
    const tempEl = document.getElementById("ccdLoopTemp");
    const pressEl = document.getElementById("ccdLoopPress");
    const fluidEl = document.getElementById("ccdLoopFluid");
    const ndtEl = document.getElementById("ccdLoopNdt");
    const mitEl = document.getElementById("ccdLoopMit");
    const tableBody = document.getElementById("ccdMechTableBody");
    const iowContainer = document.getElementById("ccdIowContainer");

    if (titleEl) titleEl.innerText = "[" + loop.id + "] " + loop.name;
    if (unitEl) unitEl.innerText = loop.unit;
    if (mocEl) mocEl.innerText = loop.moc;
    if (tempEl) tempEl.innerText = loop.operatingTemp;
    if (pressEl) pressEl.innerText = loop.operatingPressure;
    if (fluidEl) fluidEl.innerText = loop.processFluid;
    if (ndtEl) ndtEl.innerText = loop.ndt;
    if (mitEl) mitEl.innerText = loop.mitigation;

    // Render Damage Mechanisms
    if (tableBody) {
      tableBody.innerHTML = loop.mechanisms.map(function (m) {
        const riskClass = m.risk === "high" ? "ccd-risk-high" : (m.risk === "med" ? "ccd-risk-med" : "ccd-risk-low");
        const riskLabel = m.risk.toUpperCase();
        return (
          "<tr>" +
            "<td style='font-weight:700; color:#0284c7; white-space:nowrap;'>" + m.code + "</td>" +
            "<td style='font-weight:600;'>" + m.name + "</td>" +
            "<td><span class='ccd-risk-badge " + riskClass + "'>" + riskLabel + "</span></td>" +
            "<td style='color:#64748b; font-size:11px;'>" + m.details + "</td>" +
          "</tr>"
        );
      }).join("");
    }

    // Render IOWs
    if (iowContainer) {
      iowContainer.innerHTML = loop.iow.map(function (iow) {
        const barClass = iow.pct > 80 ? "alert" : (iow.pct > 65 ? "warn" : "");
        return (
          "<div class='ccd-iow-card'>" +
            "<div class='ccd-iow-title'>" +
              "<span>" + iow.parameter + "</span>" +
              "<span style='color:#0284c7; font-weight:700;'>" + iow.current + "</span>" +
            "</div>" +
            "<div class='ccd-iow-range'>Target: <strong>" + iow.target + "</strong></div>" +
            "<div class='ccd-iow-range'>Allowable: " + iow.min + " – " + iow.max + "</div>" +
            "<div class='ccd-iow-meter'>" +
              "<div class='ccd-iow-bar " + barClass + "' style='width: " + iow.pct + "%'></div>" +
            "</div>" +
          "</div>"
        );
      }).join("");
    }
  }

  /**
   * Export / Copy formatted CCD Summary Report
   */
  window.exportCCDReport = function () {
    const loop = CCD_LOOPS.find(function (l) { return l.id === selectedLoopId; }) || CCD_LOOPS[0];
    const reportText = [
      "===========================================================",
      "  CORROSION CONTROL DOCUMENT (CCD) SUMMARY REPORT",
      "  KayetDMS Integrity & Damage Mechanism Platform",
      "===========================================================",
      "Loop Identifier   : " + loop.id,
      "Loop Description  : " + loop.name,
      "Refinery Unit     : " + loop.unit,
      "Metallurgy (MOC)  : " + loop.moc,
      "Operating Temp    : " + loop.operatingTemp,
      "Operating Press   : " + loop.operatingPressure,
      "Process Chemistry : " + loop.processFluid,
      "",
      "--- IDENTIFIED API 571 DAMAGE MECHANISMS ---",
      loop.mechanisms.map(function (m, idx) {
        return (idx + 1) + ". [" + m.code + "] " + m.name + " (Susceptibility: " + m.risk.toUpperCase() + ")\n   Details: " + m.details;
      }).join("\n"),
      "",
      "--- INTEGRITY OPERATING WINDOWS (IOW) ---",
      loop.iow.map(function (i) {
        return "- " + i.parameter + ": Current=" + i.current + " | Target=" + i.target + " (Range: " + i.min + " to " + i.max + ")";
      }).join("\n"),
      "",
      "--- NDT INSPECTION & MONITORING ---",
      loop.ndt,
      "",
      "--- CHEMICAL MITIGATION & BARRIERS ---",
      loop.mitigation,
      "===========================================================",
      "Generated: " + new Date().toISOString()
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText).then(function () {
        alert("✅ CCD Summary Report for [" + loop.id + "] copied to clipboard!");
      }).catch(function () {
        prompt("Copy CCD Summary Report below:", reportText);
      });
    } else {
      prompt("Copy CCD Summary Report below:", reportText);
    }
  };

  // Setup frame load listener
  document.addEventListener("DOMContentLoaded", function () {
    const frame = document.getElementById("ccdPlatformFrame");
    if (frame) {
      frame.addEventListener("load", function () {
        const loader = document.getElementById("ccdFrameLoader");
        if (loader) loader.style.display = "none";
      });
    }
  });

})();
