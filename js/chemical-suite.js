/**
 * ============================================================================
 * ⚗️ CHEMISTRY & CHEMICAL PROTECTIVE SUITE (KayetDMS)
 * Comprehensive Industrial HAZMAT Suite, Chemical Database, Suit PPE Selector,
 * Permeation Matrix, Reactivity Checker & Neutralization Stoichiometry
 * ============================================================================
 */

(function () {
  // 1. Comprehensive Industrial Chemical Database, Reactivity Matrix & Neutralization Stoichiometry (Hydrated from Cloud Firestore via /api/chemical-suite/chemicals)
  let CHEMICAL_DATABASE = [];
  let REACTIVITY_MATRIX = [];
  let NEUTRALIZATION_DATA = {};

  async function fetchChemicalCatalog() {
    try {
      const res = await fetch("/api/chemical-suite/chemicals");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.chemicals)) {
          CHEMICAL_DATABASE = data.chemicals;
        }
        if (data && Array.isArray(data.reactivity)) {
          REACTIVITY_MATRIX = data.reactivity;
        }
        if (data && data.neutralization && typeof data.neutralization === "object") {
          NEUTRALIZATION_DATA = data.neutralization;
        }
        if (window.ChemicalSuite) {
          window.ChemicalSuite.database = CHEMICAL_DATABASE;
          window.ChemicalSuite.reactivity = REACTIVITY_MATRIX;
          window.ChemicalSuite.neutralization = NEUTRALIZATION_DATA;
        }
      }
    } catch (e) {
      console.warn("Could not fetch chemical catalog from API:", e);
    }
  }

  // Expose Global Controller
  window.ChemicalSuite = {
    database: CHEMICAL_DATABASE,
    reactivity: REACTIVITY_MATRIX,
    neutralization: NEUTRALIZATION_DATA,

    async init() {
      await fetchChemicalCatalog();
      this.database = CHEMICAL_DATABASE;
      this.reactivity = REACTIVITY_MATRIX;
      this.neutralization = NEUTRALIZATION_DATA;
      this.populateChemicalSelects();
      this.renderSuitRecommendations();
      if (CHEMICAL_DATABASE.length > 0) {
        this.renderChemicalDetails(CHEMICAL_DATABASE[0].id);
      }
      this.renderReactivityComparison();
      this.initNeutralizationForm();
    },

    populateChemicalSelects() {
      const suitSelect = document.getElementById("chemSuitSelect");
      const dbSelect = document.getElementById("chemDbSelect");
      const reactSelectA = document.getElementById("reactChemSelectA");
      const reactSelectB = document.getElementById("reactChemSelectB");
      const neutSelect = document.getElementById("neutAcidSelect");

      if (suitSelect) {
        suitSelect.innerHTML = CHEMICAL_DATABASE.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
      }
      if (dbSelect) {
        dbSelect.innerHTML = CHEMICAL_DATABASE.map(c => `<option value="${c.id}">${c.name} [${c.category}]</option>`).join("");
      }
      if (reactSelectA && reactSelectB) {
        const opts = CHEMICAL_DATABASE.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
        reactSelectA.innerHTML = opts;
        reactSelectB.innerHTML = opts;
        if (reactSelectB.options.length > 2) reactSelectB.selectedIndex = 2; // Default to NaOH
      }
      if (neutSelect) {
        neutSelect.innerHTML = Object.entries(NEUTRALIZATION_DATA).map(([id, info]) => `<option value="${id}">${info.name}</option>`).join("");
      }
    },

    // 🦺 Module 1: Chemical Protective Suit & PPE Selector
    renderSuitRecommendations() {
      const chemId = document.getElementById("chemSuitSelect")?.value || "hf";
      const scenario = document.getElementById("chemScenarioSelect")?.value || "tankEntry";
      const chem = CHEMICAL_DATABASE.find(c => c.id === chemId) || CHEMICAL_DATABASE[0];
      if (!chem) return;

      const heroEl = document.getElementById("chemSuitHeroBox");
      const tableEl = document.getElementById("chemPermeationTableBody");
      const ppeEl = document.getElementById("chemPpeSpecsBox");

      const suitLevel = chem.suitRecommendations[scenario] || chem.suitRecommendations.tankEntry;

      let icon = "🦺";
      let badgeClass = "chem-badge-blue";
      if (suitLevel.includes("Level A")) {
        icon = "🧑‍🚀";
        badgeClass = "chem-badge-red";
      } else if (suitLevel.includes("Level B")) {
        icon = "🥽";
        badgeClass = "chem-badge-amber";
      } else if (suitLevel.includes("Level C")) {
        icon = "🛡️";
        badgeClass = "chem-badge-blue";
      }

      if (heroEl) {
        heroEl.innerHTML = `
          <div class="chem-suit-icon-badge">${icon}</div>
          <div class="chem-suit-details">
            <span class="chem-badge ${badgeClass}" style="margin-bottom: 8px;">${scenario.toUpperCase()} SCENARIO</span>
            <h4>${suitLevel}</h4>
            <p><strong>Hazard Summary for ${chem.name}:</strong> ${chem.nature}. CAS: <code>${chem.cas}</code> | UN: <code>${chem.un}</code></p>
            <div style="font-size: 13px; color: #475569;">
              <strong>Standards Compliance:</strong> NFPA 1991 (Vapor-Protective Ensembles for Hazardous Chemical Emergencies) & OSHA 29 CFR 1910.120 App B.
            </div>
          </div>
        `;
      }

      if (tableEl) {
        tableEl.innerHTML = chem.permeation.map(p => {
          let ratingClass = "rating-good";
          if (p.rating.includes("Excellent")) ratingClass = "rating-excellent";
          else if (p.rating.includes("Fair")) ratingClass = "rating-fair";
          else if (p.rating.includes("Poor")) ratingClass = "rating-poor";

          return `
            <tr>
              <td><strong>${p.material}</strong></td>
              <td>${p.breakthrough}</td>
              <td><span class="${ratingClass}">${p.rating}</span></td>
            </tr>
          `;
        }).join("");
      }

      if (ppeEl) {
        ppeEl.innerHTML = `
          <div class="chem-grid-2">
            <div style="background: var(--bg-card, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 6px 0; color: #0284c7; font-size: 14px;">🫁 Respiratory Protection</h5>
              <p style="margin: 0; font-size: 13px; line-height: 1.5;">${chem.ppe.respirator}</p>
            </div>
            <div style="background: var(--bg-card, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 6px 0; color: #0284c7; font-size: 14px;">🧤 Chemical Glove Barrier</h5>
              <p style="margin: 0; font-size: 13px; line-height: 1.5;">${chem.ppe.gloves}</p>
            </div>
            <div style="background: var(--bg-card, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 6px 0; color: #0284c7; font-size: 14px;">🥾 Chemical Boots / Footwear</h5>
              <p style="margin: 0; font-size: 13px; line-height: 1.5;">${chem.ppe.boots}</p>
            </div>
            <div style="background: var(--bg-card, #f8fafc); border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 6px 0; color: #0284c7; font-size: 14px;">🧥 Body Enclosure Fabric</h5>
              <p style="margin: 0; font-size: 13px; line-height: 1.5;">${chem.ppe.body}</p>
            </div>
          </div>
          <div style="margin-top: 14px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 12px; font-size: 13px; color: #9f1239;">
            <strong>Metallurgy & Materials Caution:</strong> ${chem.materialsAvoid}
          </div>
        `;
      }
    },

    // 🧪 Module 2: Chemical Properties & SDS Library
    renderChemicalDetails(chemId) {
      const chem = CHEMICAL_DATABASE.find(c => c.id === chemId) || CHEMICAL_DATABASE[0];
      const target = document.getElementById("chemDetailsContainer");
      if (!target || !chem) return;

      const ghsBadges = chem.ghs.map(g => `<span class="ghs-badge-item">⚠️ ${g}</span>`).join("");

      target.innerHTML = `
        <div class="chem-grid-2">
          <!-- Left: Physical & Occupational Constants -->
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; margin-bottom: 12px;">
              <h3 style="margin: 0; color: #0284c7; font-size: 22px;">${chem.name}</h3>
              <span class="chem-badge chem-badge-purple">${chem.category}</span>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">${chem.nature}</p>

            <table class="chem-table" style="margin-bottom: 16px;">
              <tbody>
                <tr><td><strong>Chemical Formula</strong></td><td><code>${chem.formula}</code></td></tr>
                <tr><td><strong>CAS Registry Number</strong></td><td><code>${chem.cas}</code></td></tr>
                <tr><td><strong>UN / NA Hazmat ID</strong></td><td><code>${chem.un}</code></td></tr>
                <tr><td><strong>Molecular Weight</strong></td><td>${chem.molWeight} g/mol</td></tr>
                <tr><td><strong>Density</strong></td><td>${chem.density}</td></tr>
                <tr><td><strong>Boiling Point</strong></td><td>${chem.boilingPt}</td></tr>
                <tr><td><strong>Freezing Point</strong></td><td>${chem.freezingPt}</td></tr>
                <tr><td><strong>Vapor Pressure @ 20°C</strong></td><td>${chem.vaporPressure}</td></tr>
                <tr><td><strong>Flash Point</strong></td><td>${chem.flashPoint}</td></tr>
                <tr><td><strong>Typical pH</strong></td><td>${chem.ph}</td></tr>
              </tbody>
            </table>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
              <h5 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; color: #475569;">Occupational Exposure Limits</h5>
              <div style="font-size: 13px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                <div><span style="color: #64748b;">OSHA PEL:</span><br><strong>${chem.exposure.pel}</strong></div>
                <div><span style="color: #64748b;">ACGIH TLV:</span><br><strong>${chem.exposure.tlv}</strong></div>
                <div><span style="color: #b91c1c;">NIOSH IDLH:</span><br><strong style="color: #b91c1c;">${chem.exposure.idlh}</strong></div>
              </div>
            </div>
          </div>

          <!-- Right: NFPA 704 Diamond & GHS Warnings -->
          <div>
            <h4 style="margin: 0 0 8px 0; text-align: center; font-size: 14px; text-transform: uppercase; color: #64748b;">NFPA 704 Fire Diamond</h4>
            
            <div class="nfpa-diamond-container">
              <div class="nfpa-diamond">
                <div class="nfpa-cell nfpa-top-red" title="Flammability: ${chem.nfpa.flammability}"><span>${chem.nfpa.flammability}</span></div>
                <div class="nfpa-cell nfpa-left-blue" title="Health: ${chem.nfpa.health}"><span>${chem.nfpa.health}</span></div>
                <div class="nfpa-cell nfpa-right-yellow" title="Instability: ${chem.nfpa.instability}"><span>${chem.nfpa.instability}</span></div>
                <div class="nfpa-cell nfpa-bottom-white" title="Special Hazard: ${chem.nfpa.special}"><span>${chem.nfpa.special}</span></div>
              </div>
              <div style="display: flex; gap: 12px; font-size: 11px; margin-top: 10px; color: #64748b;">
                <span style="color: #3b82f6;">■ Health: ${chem.nfpa.health}</span>
                <span style="color: #ef4444;">■ Flammability: ${chem.nfpa.flammability}</span>
                <span style="color: #ca8a04;">■ Instability: ${chem.nfpa.instability}</span>
                <span>□ Special: ${chem.nfpa.special}</span>
              </div>
            </div>

            <div style="margin-top: 16px;">
              <h5 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; color: #64748b;">GHS Hazard Pictograms</h5>
              <div class="ghs-badges-row">${ghsBadges}</div>
              <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.5; color: #dc2626;">${chem.ghsStatements}</p>
            </div>

            <div style="margin-top: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 4px 0; color: #991b1b; font-size: 13px;">🚨 Emergency First Aid Protocol</h5>
              <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #7f1d1d;">${chem.firstAid}</p>
            </div>
          </div>
        </div>
      `;
    },

    // 💥 Module 3: Chemical Reactivity & Mixing Checker
    renderReactivityComparison() {
      const chemAId = document.getElementById("reactChemSelectA")?.value || "hf";
      const chemBId = document.getElementById("reactChemSelectB")?.value || "naoh";
      const container = document.getElementById("reactivityResultBox");
      if (!container) return;

      const chemA = CHEMICAL_DATABASE.find(c => c.id === chemAId) || CHEMICAL_DATABASE[0];
      const chemB = CHEMICAL_DATABASE.find(c => c.id === chemBId) || CHEMICAL_DATABASE[1];
      if (!chemA || !chemB) return;

      if (chemAId === chemBId) {
        container.innerHTML = `
          <div class="reactivity-alert-card safe">
            <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 16px;">🟢 Identical Substance Selected</h4>
            <p style="margin: 0; font-size: 14px; color: #14532d;">No hazardous cross-reactivity. Material is compatible with itself under standard ambient conditions.</p>
          </div>
        `;
        return;
      }

      // Check predefined matrix
      const match = REACTIVITY_MATRIX.find(m => 
        (m.pair[0] === chemAId && m.pair[1] === chemBId) ||
        (m.pair[0] === chemBId && m.pair[1] === chemAId)
      );

      if (match) {
        const isDanger = match.severity === "danger";
        const alertClass = isDanger ? "reactivity-alert-card" : "reactivity-alert-card warning";
        const icon = isDanger ? "🚨 CRITICAL INCOMPATIBILITY / DANGER" : "⚠️ CAUTION / EXOTHERMIC RISK";

        container.innerHTML = `
          <div class="${alertClass}">
            <h4 style="margin: 0 0 8px 0; font-size: 18px; color: ${isDanger ? '#b91c1c' : '#b45309'};">${icon}: ${match.title}</h4>
            <div class="reaction-equation-box">${match.equation}</div>
            <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;"><strong>Hazard Mechanism:</strong> ${match.mechanism}</p>
            <p style="margin: 0; font-size: 13.5px; line-height: 1.5; color: ${isDanger ? '#7f1d1d' : '#78350f'};">
              <strong>Safe Engineering Controls:</strong> ${match.precaution}
            </p>
          </div>
        `;
      } else {
        // Generic categorization check
        let isAcidBase = (chemA.category === "Acids" && chemB.category === "Bases & Amines") || (chemB.category === "Acids" && chemA.category === "Bases & Amines");
        let isOxidizerHydrocarbon = (chemA.nfpa.special?.includes("OX") && chemB.category === "Hydrocarbons & Aromatics") || (chemB.nfpa.special?.includes("OX") && chemA.category === "Hydrocarbons & Aromatics");

        if (isAcidBase) {
          container.innerHTML = `
            <div class="reactivity-alert-card">
              <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #b91c1c;">🚨 Strong Acid-Base Neutralization Hazard</h4>
              <div class="reaction-equation-box">${chemA.name} + ${chemB.name} ➔ Salt + Water + Immense Heat (ΔH ≈ -57 kJ/mol H⁺)</div>
              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">Mixing strong acids with strong alkaline bases generates rapid heat of neutralization, potentially boiling the mixture, causing violent foaming, vessel overpressure, and splashing.</p>
              <p style="margin: 0; font-size: 13px; color: #7f1d1d;"><strong>Control:</strong> Do not mix in common sewer or piping headers without dedicated neutralizers and temperature monitoring.</p>
            </div>
          `;
        } else if (isOxidizerHydrocarbon) {
          container.innerHTML = `
            <div class="reactivity-alert-card">
              <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #b91c1c;">💥 Violent Oxidation / Fire Risk</h4>
              <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">One substance is a powerful oxidizer (${chemA.nfpa.special?.includes("OX") ? chemA.name : chemB.name}) and the other is a combustible organic compound (${chemA.category === "Hydrocarbons & Aromatics" ? chemA.name : chemB.name}). Violent combustion or explosion may occur spontaneously upon mixing.</p>
              <p style="margin: 0; font-size: 13px; color: #7f1d1d;"><strong>Control:</strong> Strictly isolate drainage headers and storage tank containment berms.</p>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div class="reactivity-alert-card safe">
              <h4 style="margin: 0 0 6px 0; color: #166534; font-size: 16px;">🟢 Compatible / No Violent Reaction Documented</h4>
              <p style="margin: 0; font-size: 14px; color: #14532d;">No direct violent exothermic runaway or lethal gas release identified between <strong>${chemA.name}</strong> and <strong>${chemB.name}</strong> under normal ambient conditions. Always consult full NOAA CAMEO reactivity guidelines for elevated temperature or pressure operations.</p>
            </div>
          `;
        }
      }
    },

    // ⚖️ Module 4: Chemical Spill Neutralization & Stoichiometry Calculator
    initNeutralizationForm() {
      const acidSelect = document.getElementById("neutAcidSelect");
      const agentSelect = document.getElementById("neutAgentSelect");
      if (!acidSelect || !agentSelect) return;

      const updateAgents = () => {
        const acidKey = acidSelect.value;
        const config = NEUTRALIZATION_DATA[acidKey];
        if (!config) return;

        agentSelect.innerHTML = config.agents.map((a, idx) => `<option value="${idx}">${a.name}</option>`).join("");
        const concInput = document.getElementById("neutSpillConc");
        if (concInput) concInput.value = config.defaultConc;
        this.calculateNeutralization();
      };

      acidSelect.addEventListener("change", updateAgents);
      agentSelect.addEventListener("change", () => this.calculateNeutralization());
      updateAgents();
    },

    calculateNeutralization() {
      const acidKey = document.getElementById("neutAcidSelect")?.value || "h2so4";
      const agentIdx = parseInt(document.getElementById("neutAgentSelect")?.value || "0", 10);
      const volumeL = parseFloat(document.getElementById("neutSpillVol")?.value || "1000"); // Liters
      const concPct = parseFloat(document.getElementById("neutSpillConc")?.value || "98"); // %

      const config = NEUTRALIZATION_DATA[acidKey];
      if (!config) return;
      const agent = config.agents[agentIdx] || config.agents[0];

      // Math:
      // Volume (L) -> Total solution mass = Volume (L) * (pureDensity * 1.0 kg/L approx)
      // Pure chemical mass = Total solution mass * (concPct / 100)
      const solutionMassKg = volumeL * config.pureDensity;
      const pureMassKg = solutionMassKg * (concPct / 100);
      const pureMoles = (pureMassKg * 1000) / config.molMass; // mol of pure spilled chemical

      // Equivalents ratio
      // Acid Eq = pureMoles * config.equivalents
      // Base Eq = agentMoles * agent.eqPerMol
      // For neutralization: Acid Eq = Base Eq => agentMoles = Acid Eq / agent.eqPerMol
      const acidEq = pureMoles * config.equivalents;
      const agentMolesReq = acidEq / agent.eqPerMol;
      const agentMassKg = (agentMolesReq * agent.molMass) / 1000;
      const agentMassLbs = agentMassKg * 2.20462;

      // Heat generation (MJ) = agentMolesReq * |deltaH| / 1000
      const totalHeatMJ = (agentMolesReq * Math.abs(agent.deltaH)) / 1000;

      // Render results
      const resMassKg = document.getElementById("neutResMassKg");
      const resMassLbs = document.getElementById("neutResMassLbs");
      const resHeat = document.getElementById("neutResHeat");
      const resEq = document.getElementById("neutResEquation");
      const resAdvice = document.getElementById("neutResAdvice");

      if (resMassKg) resMassKg.textContent = `${agentMassKg.toFixed(1)} kg`;
      if (resMassLbs) resMassLbs.textContent = `${agentMassLbs.toFixed(1)} lbs`;
      if (resHeat) resHeat.textContent = `${totalHeatMJ.toFixed(1)} MJ`;
      if (resEq) resEq.textContent = agent.formula;

      let tempRisk = "🟢 Mild heat release. Ensure safety glasses and face shield.";
      if (totalHeatMJ > 200) {
        tempRisk = "🚨 HIGH EXOTHERMIC HEAT WARNING: Over 200 MJ of heat released! Mixture will boil and spatter aggressively if dumped at once. Dilute with cold water mist first, create containment berms, and add neutralizing agent slowly in thin layers.";
      } else if (totalHeatMJ > 50) {
        tempRisk = "🟠 MODERATE HEAT RELEASE: Significant thermal rise. Do not stand directly over the spill. Wear Level B splash gear with face shield.";
      }

      if (resAdvice) {
        resAdvice.innerHTML = `
          <p style="margin: 0 0 6px 0; font-weight: 700;">${tempRisk}</p>
          <div style="font-size: 13px; line-height: 1.5; color: #475569;">
            <strong>Standard Spill SOP:</strong> 
            1. Dike perimeter with inert sand or synthetic berms to prevent sewer entry.<br>
            2. Verify spill pH using calibrated wide-range pH strips (Target safe pH: 6.5 - 8.5).<br>
            3. Apply neutralizing agent from the outer edge inward toward the center with continuous mixing.<br>
            4. Once bubbling / effervescence ceases, test pH before transferring neutralized slurry for industrial waste disposal.
          </div>
        `;
      }
    }
  };

  // 🔀 Sub-tab Switcher inside Chemistry Suite
  window.switchChemSubTab = function (subTabId) {
    document.querySelectorAll(".chem-nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-chem-tab") === subTabId);
    });

    document.querySelectorAll(".chem-section-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === `chemPane_${subTabId}`);
    });

    // Re-render or adjust view if needed
    if (subTabId === "suit") {
      window.ChemicalSuite.renderSuitRecommendations();
    } else if (subTabId === "database") {
      const chemId = document.getElementById("chemDbSelect")?.value || "hf";
      window.ChemicalSuite.renderChemicalDetails(chemId);
    } else if (subTabId === "reactivity") {
      window.ChemicalSuite.renderReactivityComparison();
    } else if (subTabId === "neutralization") {
      window.ChemicalSuite.calculateNeutralization();
    } else if (subTabId === "periodictable") {
      if (window.PeriodicTable && typeof window.PeriodicTable.init === "function") {
        window.PeriodicTable.init();
      }
      if (window.PeriodicTable && typeof window.PeriodicTable.resumeBohrAnimation === "function") {
        window.PeriodicTable.resumeBohrAnimation();
      }
    }

    if (subTabId !== "periodictable" && window.PeriodicTable && typeof window.PeriodicTable.pauseBohrAnimation === "function") {
      window.PeriodicTable.pauseBohrAnimation();
    }
  };

  // 🌐 Main Entrance Function to Show the Suite
  window.showChemicalSuiteTab = function (subTabId = "suit") {
    if (typeof hideMechanismDetails === "function") hideMechanismDetails();
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    const suiteTab = document.getElementById("chemicalSuiteTab");
    if (suiteTab) {
      suiteTab.style.display = "block";
      if (typeof window.switchChemSubTab === "function") window.switchChemSubTab(subTabId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
      window.TemplateManager.load("1080", function () {
        const loaded = document.getElementById("chemicalSuiteTab");
        if (loaded) loaded.style.display = "block";
        if (typeof hideWelcomePanel === "function") hideWelcomePanel();
        if (typeof window.switchChemSubTab === "function") window.switchChemSubTab(subTabId);
      });
    }
  };

  // Initialize on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.ChemicalSuite.init());
  } else {
    window.ChemicalSuite.init();
  }
})();
