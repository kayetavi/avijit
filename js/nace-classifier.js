// nace-classifier.js - NACE SP0114 Tie-in & Injection/Mix Point Classification Engine
// Standard: NACE SP0114 / API 570 / API RP 571
(function () {
  "use strict";

  // In-memory cache for user manual classification overrides
  // Key: `${streamNoA}->${streamNoB}`, Value: "auto" | "injectant" | "process_mix" | "split" | "unrelated"
  const userOverrides = {};

  // Target composition components for corrosion and mixing logic (excluding keys containing "FLOW")
  const TARGET_COMP_NAMES = ["H2O", "H2S", "NH3", "HCL", "CO2", "O2", "CHLORIDES"];

  /**
   * Safe numeric parser
   */
  function parseNum(val) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    const cleaned = String(val).replace(/,/g, "").trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Format numbers cleanly with commas
   */
  function fmt(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return "-";
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * Extract standardized stream data from stream object (Read-only)
   * Prompt fields:
   * tempC ?? properties['Temperature (°C)']
   * pressKgCm2 ?? properties['Pressure (kg/cm2 (g))'] ?? properties['Pressure (kg/cm²g)']
   * massFlow
   * content
   * components{}
   */
  function extractStreamData(s) {
    if (!s) return null;
    const props = s.properties || {};

    // Temperature (°C)
    let rawTemp = s.tempC ?? props["Temperature (°C)"] ?? props["Temperature (C)"] ?? props["Temperature"];
    const tempC = parseNum(rawTemp);

    // Pressure (kg/cm2 (g))
    let rawPress = s.pressKgCm2 ?? props["Pressure (kg/cm2 (g))"] ?? props["Pressure (kg/cm²g)"] ?? props["Pressure (kg/cm2)"] ?? props["Pressure"];
    const pressKgCm2 = parseNum(rawPress);

    // Mass Flow (kg/hr)
    let rawMass = s.massFlow ?? props["Flow Mass (kg/hr)"] ?? props["Mass Flow (kg/hr)"] ?? props["Mass Flow"] ?? props["Flow Mass"];
    const massFlow = parseNum(rawMass);

    // Content / Phase
    const content = String(s.content ?? props["Content / Phase"] ?? props["Phase / Content"] ?? props["Phase"] ?? props["Content"] ?? "").trim();

    // Components dictionary
    const components = s.components && typeof s.components === "object" ? s.components : null;

    // Physical & Thermodynamic Mixing Properties
    let rawVisc = s.viscosity ?? props["Liquid Viscosity (cP)"] ?? props["Viscosity (cP)"] ?? props["Viscosity"];
    const viscosity = parseNum(rawVisc);

    let rawDens = s.liquidDensity ?? props["Liquid Density (kg/m3)"] ?? props["Density (kg/m3)"] ?? props["Density"];
    const liquidDensity = parseNum(rawDens);

    let rawMw = s.mw ?? props["Molecular Weight"] ?? props["MW"] ?? props["Molecular Weight (MW)"];
    const mw = parseNum(rawMw);

    let rawVap = s.wtPctVaporized ?? props["Wt% Vaporized (%)"] ?? props["Wt% Vaporized"] ?? props["Vaporized (%)"];
    const wtPctVaporized = parseNum(rawVap);

    let rawSt = s.surfaceTension ?? props["Surface tension (dyne/cm)"] ?? props["Surface Tension (dyne/cm)"] ?? props["Surface tension"];
    const surfaceTension = parseNum(rawSt);

    let rawVp = s.liquidVapPress ?? props["Liquid Vap Press (kg/cm2)"] ?? props["Liquid Vap Press"] ?? props["Vapor Pressure"];
    const liquidVapPress = rawVp !== undefined && rawVp !== null ? String(rawVp).trim() : null;

    return {
      raw: s,
      streamNo: String(s.streamNo || "Unknown"),
      streamName: String(s.streamName || s.name || s.streamNo || "Stream"),
      tempC,
      pressKgCm2,
      massFlow,
      content,
      components,
      viscosity,
      liquidDensity,
      mw,
      wtPctVaporized,
      surfaceTension,
      liquidVapPress
    };
  }

  /**
   * Filter and map component keys to canonical symbols
   * Ignores keys containing "FLOW"
   */
  function normalizeComponentKey(rawKey) {
    if (!rawKey) return null;
    const k = String(rawKey).trim().toUpperCase();
    if (k.includes("FLOW")) return null;

    if (k === "H2O" || k === "WATER" || k === "STEAM" || k === "AQUEOUS") return "H2O";
    if (k === "H2S" || k === "HYDROGEN SULFIDE" || k === "HYDROGEN SULPHIDE") return "H2S";
    if (k === "NH3" || k === "AMMONIA") return "NH3";
    if (k === "HCL" || k === "HYDROGEN CHLORIDE" || k === "HYDROCHLORIC ACID") return "HCl";
    if (k === "CO2" || k === "CARBON DIOXIDE") return "CO2";
    if (k === "O2" || k === "OXYGEN") return "O2";
    if (k === "CHLORIDES" || k === "CHLORIDE" || k === "CL-" || k === "CL" || k === "TOTAL CHLORIDES") return "CHLORIDES";

    return k;
  }

  /**
   * Extract target composition values for corrosion/safety triggers
   */
  function getTargetCompositions(components) {
    const res = {
      H2O: 0,
      H2S: 0,
      NH3: 0,
      HCl: 0,
      CO2: 0,
      O2: 0,
      CHLORIDES: 0
    };
    if (!components) return res;

    for (const [key, val] of Object.entries(components)) {
      if (String(key).toUpperCase().includes("FLOW")) continue;
      const canonical = normalizeComponentKey(key);
      if (canonical && Object.prototype.hasOwnProperty.call(res, canonical)) {
        const num = parseNum(val) || 0;
        res[canonical] += num;
      }
    }
    return res;
  }

  /**
   * Check phase descriptor for gas/vapor vs liquid
   */
  function detectPhase(streamData) {
    const c = (streamData.content || "").toLowerCase();
    const props = streamData.raw?.properties || {};
    const vaporPct = parseNum(props["Wt% Vaporized (%)"] ?? props["Vaporized (%)"] ?? props["Vapor Fraction"]);

    if (vaporPct !== null) {
      if (vaporPct >= 80) return "vapor";
      if (vaporPct <= 20) return "liquid";
      return "mixed";
    }

    const hasVapor = c.includes("gas") || c.includes("vapor") || c.includes("vapour");
    const hasLiquid = c.includes("liq") || c.includes("liquid") || c.includes("water") || c.includes("slurry") || c.includes("oil") || c.includes("feed");

    if (hasVapor && hasLiquid) return "mixed";
    if (hasVapor) return "vapor";
    if (hasLiquid) return "liquid";
    return "unknown";
  }

  /**
   * Core NACE SP0114 Deterministic Classifier
   */
  function classifyTieIn(sA, sB, override) {
    const dataA = extractStreamData(sA);
    const dataB = extractStreamData(sB);

    // 1. Missing Data Check (T, P, Components)
    const missingA = [];
    if (dataA.tempC === null) missingA.push("Operating Temperature (°C)");
    if (dataA.pressKgCm2 === null) missingA.push("Operating Pressure (kg/cm²g)");
    if (!dataA.components || Object.keys(dataA.components).length === 0) missingA.push("Chemical Composition (components{})");

    const missingB = [];
    if (dataB.tempC === null) missingB.push("Operating Temperature (°C)");
    if (dataB.pressKgCm2 === null) missingB.push("Operating Pressure (kg/cm²g)");
    if (!dataB.components || Object.keys(dataB.components).length === 0) missingB.push("Chemical Composition (components{})");

    const hasMissingData = missingA.length > 0 || missingB.length > 0;

    // 2. Component Delta Balance (Relation of B vs A)
    let relationType = "PROCESS MIX POINT"; // default
    let suggestedSubtitle = "";
    let dominantAddedComp = "";
    let isInjectantRelation = false;
    let isSplitRelation = false;
    let isUnrelatedRelation = false;
    const injectantVector = {};

    const compKeysA = dataA.components ? Object.keys(dataA.components).filter(k => !k.toUpperCase().includes("FLOW")) : [];
    const compKeysB = dataB.components ? Object.keys(dataB.components).filter(k => !k.toUpperCase().includes("FLOW")) : [];
    const allCompKeys = Array.from(new Set([...compKeysA, ...compKeysB]));

    let wentToZero = false;
    let newlyAppeared = false;
    let anyDecreasedBeyondTolerance = false;
    let sumPositiveDeltas = 0;

    const totalMassA = dataA.massFlow || (compKeysA.reduce((sum, k) => sum + (parseNum(dataA.components[k]) || 0), 0));
    const totalMassB = dataB.massFlow || (compKeysB.reduce((sum, k) => sum + (parseNum(dataB.components[k]) || 0), 0));
    const massDelta = totalMassB - totalMassA;

    if (allCompKeys.length > 0) {
      allCompKeys.forEach(k => {
        const valA = parseNum(dataA.components?.[k]) || 0;
        const valB = parseNum(dataB.components?.[k]) || 0;
        const delta = valB - valA;

        // Check if went to zero or newly appeared
        if (valA > 0.1 && valB <= 0.0001) wentToZero = true;
        if (valA <= 0.0001 && valB > 0.1) newlyAppeared = true;

        if (delta > 0.001) {
          sumPositiveDeltas += delta;
          injectantVector[k] = delta;
        } else if (delta < -0.001) {
          const decreaseAmt = Math.abs(delta);
          // Tolerance check: 0.5% relative to component flow, or 0.5% relative to total mass flow
          const relCompDecrease = valA > 0 ? (decreaseAmt / valA) : 1;
          const relTotalDecrease = totalMassA > 0 ? (decreaseAmt / totalMassA) : 1;

          if (relCompDecrease > 0.01 && relTotalDecrease > 0.005) {
            anyDecreasedBeyondTolerance = true;
          }
        }
      });

      // Find dominant added component
      let maxDelta = 0;
      for (const [comp, d] of Object.entries(injectantVector)) {
        if (d > maxDelta) {
          maxDelta = d;
          dominantAddedComp = comp;
        }
      }

      // Check condition 1a: No component decreases (tolerance 0.5%) and mass delta ~ sum of positive deltas (+/- 2%)
      const massDeltaMatch = (massDelta > 0 && sumPositiveDeltas > 0) &&
        (Math.abs(massDelta - sumPositiveDeltas) / Math.max(massDelta, sumPositiveDeltas) <= 0.02);

      if (!anyDecreasedBeyondTolerance && massDeltaMatch) {
        isInjectantRelation = true;
        const normDominant = normalizeComponentKey(dominantAddedComp);
        if (normDominant === "H2O") {
          suggestedSubtitle = "WASH WATER INJECTION";
        } else {
          suggestedSubtitle = `${dominantAddedComp} CHEMICAL INJECTION`;
        }
        relationType = "INJECTION POINT";
      } else if (wentToZero && newlyAppeared) {
        // Condition 1b: some components go to zero while others appear
        isUnrelatedRelation = true;
        relationType = "SPLIT-UNRELATED";
        suggestedSubtitle = "UNRELATED / SIBLING BRANCHES (not a mixing relation)";
      }
    }

    // Condition 1c: A and B have same T/P/phase -> POSSIBLE SPLIT / BRANCH
    const phaseA = detectPhase(dataA);
    const phaseB = detectPhase(dataB);
    const sameT = (dataA.tempC !== null && dataB.tempC !== null && Math.abs(dataA.tempC - dataB.tempC) <= 1.0);
    const sameP = (dataA.pressKgCm2 !== null && dataB.pressKgCm2 !== null && Math.abs(dataA.pressKgCm2 - dataB.pressKgCm2) <= 0.2);
    const samePhase = (phaseA !== "unknown" && phaseB !== "unknown" && phaseA === phaseB);

    if (sameT && sameP && samePhase && !isInjectantRelation && !isUnrelatedRelation) {
      isSplitRelation = true;
      relationType = "SPLIT-UNRELATED";
      suggestedSubtitle = "POSSIBLE SPLIT / BRANCH";
    }

    // Apply User Override if active
    let activeClassification = relationType;
    let overrideActive = false;
    if (override && override !== "auto") {
      overrideActive = true;
      if (override === "injectant") {
        activeClassification = "INJECTION POINT";
      } else if (override === "process_mix") {
        activeClassification = "PROCESS MIX POINT";
      } else if (override === "split") {
        activeClassification = "SPLIT-UNRELATED";
        suggestedSubtitle = "MANUAL OVERRIDE: SPLIT / BRANCH";
      } else if (override === "unrelated") {
        activeClassification = "SPLIT-UNRELATED";
        suggestedSubtitle = "MANUAL OVERRIDE: UNRELATED STREAMS";
      }
    }

    // 3. Risk Evaluation & Matched Triggers (SP0114 Clauses)
    const matchedCriteria = [];
    let riskLevel = "LOW"; // "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT DATA"

    const targetA = getTargetCompositions(dataA.components);
    const targetB = getTargetCompositions(dataB.components);

    // Corrosive components check
    const corrosiveList = [];
    if (targetA.H2S > 0 || targetB.H2S > 0) corrosiveList.push("H₂S");
    if (targetA.NH3 > 0 || targetB.NH3 > 0) corrosiveList.push("NH₃");
    if (targetA.HCl > 0 || targetB.HCl > 0) corrosiveList.push("HCl");
    if (targetA.CHLORIDES > 0 || targetB.CHLORIDES > 0) corrosiveList.push("Chlorides");
    if (targetA.CO2 > 0 || targetB.CO2 > 0) corrosiveList.push("CO₂");
    if (targetA.O2 > 0 || targetB.O2 > 0) corrosiveList.push("O₂");
    const hasCorrosive = corrosiveList.length > 0;

    // Thermal Delta |dT|
    let dT = null;
    if (dataA.tempC !== null && dataB.tempC !== null) {
      dT = Math.abs(dataA.tempC - dataB.tempC);
    }

    // Trigger 1: |dT| > 167°C -> HIGH (thermal fatigue, SP0114 7.10.1)
    if (dT !== null && dT > 167) {
      riskLevel = "HIGH";
      matchedCriteria.push({
        clause: "SP0114 7.10.1",
        severity: "HIGH",
        title: `Thermal Fatigue Limit Exceeded (|ΔT| = ${dT.toFixed(1)}°C > 167°C)`,
        desc: `Temperature differential of ${dT.toFixed(1)}°C exceeds the critical 167°C (300°F) threshold defined in NACE SP0114 Section 7.10.1, creating acute cyclical thermal fatigue and potential mix-point pipe wall cracking.`
      });
    }

    // Trigger 2: |dT| >= 50°C and corrosive components present -> MEDIUM (E12.1.1.2)
    if (dT !== null && dT >= 50 && hasCorrosive) {
      if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
      matchedCriteria.push({
        clause: "SP0114 E12.1.1.2",
        severity: "MEDIUM",
        title: `Thermal Differential in Corrosive Environment (|ΔT| = ${dT.toFixed(1)}°C ≥ 50°C)`,
        desc: `Temperature delta of ${dT.toFixed(1)}°C combined with active corrosive species (${corrosiveList.join(", ")}) triggers accelerated local condensation corrosion regimes under NACE SP0114 Appendix E12.1.1.2.`
      });
    }

    // Trigger 3: Dry chloride stream + water-containing stream -> HIGH
    const isDryChlorideA = (targetA.HCl > 0 || targetA.CHLORIDES > 0) && (targetA.H2O <= 0.001);
    const isDryChlorideB = (targetB.HCl > 0 || targetB.CHLORIDES > 0) && (targetB.H2O <= 0.001);
    const hasWaterA = targetA.H2O > 0.001;
    const hasWaterB = targetB.H2O > 0.001;
    const injectantHasWater = (injectantVector["H2O"] || 0) > 0.001 || (injectantVector["WATER"] || 0) > 0.001;

    if ((isDryChlorideA && (hasWaterB || injectantHasWater)) || (isDryChlorideB && hasWaterA)) {
      riskLevel = "HIGH";
      matchedCriteria.push({
        clause: "SP0114 5.3.3 & E12.1.2",
        severity: "HIGH",
        title: "Dry Chloride Stream + Water Contact (Severe Acid Condensation)",
        desc: "Mixing dry chloride-bearing hydrocarbon/gas with an aqueous stream causes instantaneous dissolution of HCl/chlorides into water droplets, yielding severe low-pH dew-point corrosion and localized pitting/cracking."
      });
    }

    // Trigger 4: Phase mismatch -> flag shock condensation / flashing
    if (phaseA !== "unknown" && phaseB !== "unknown" && phaseA !== phaseB && phaseA !== "mixed" && phaseB !== "mixed") {
      if (riskLevel === "LOW") riskLevel = "MEDIUM";
      matchedCriteria.push({
        clause: "SP0114 4.2.4 & 7.8",
        severity: "FLAG",
        title: `Phase Mismatch Shock Condensation / Flashing (${phaseA.toUpperCase()} + ${phaseB.toUpperCase()})`,
        desc: `Stream A (${phaseA}) mixing with Stream B (${phaseB}) induces rapid interfacial phase transition. Flagged for risk of acoustic vibration, vapor pocket collapse shock, and localized hydraulic turbulence.`
      });
    }

    // Trigger 5: Wt% Vaporized Differential -> Severe Flashing / Condensation Shock
    if (dataA.wtPctVaporized !== null && dataB.wtPctVaporized !== null) {
      const dVap = Math.abs(dataA.wtPctVaporized - dataB.wtPctVaporized);
      if (dVap >= 10) {
        if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
        matchedCriteria.push({
          clause: "SP0114 7.10.2",
          severity: "HIGH",
          title: `Two-Phase Flashing / Shock Condensation Hazard (|ΔVap| = ${dVap.toFixed(1)}%)`,
          desc: `Significant phase fraction differential (Stream ${dataA.streamNo}: ${dataA.wtPctVaporized}% vs Stream ${dataB.streamNo}: ${dataB.wtPctVaporized}% vaporized) introduces high susceptibility to localized flashing, condensation shock water hammer, and interfacial thermal striping.`
        });
      }
    }

    // Trigger 6: Surface Tension & Droplet Breakup Quill Verification
    const hasSurfaceTension = dataA.surfaceTension !== null || dataB.surfaceTension !== null;
    if (hasSurfaceTension && activeClassification === "INJECTION POINT") {
      const stVal = dataA.surfaceTension !== null ? dataA.surfaceTension : dataB.surfaceTension;
      matchedCriteria.push({
        clause: "SP0114 Section 5.2 / 7.10",
        severity: "INFO",
        title: `Quill Dispersion & Droplet Atomization Baseline (σ = ${stVal} dyne/cm)`,
        desc: `Surface tension evaluated at ${stVal} dyne/cm. Satisfactory droplet breakup and center-pipe dispersal without wall impingement requires verification of Weber number ($We = \\frac{\\rho v^2 d}{\\sigma} > 12$) upon pipe geometry specification.`
      });
    }

    // Tie-in Classification Baseline Criteria
    if (activeClassification === "INJECTION POINT") {
      if (riskLevel === "LOW") riskLevel = "MEDIUM"; // Under API 570 / NACE SP0114, injection points have elevated baseline risk
      matchedCriteria.unshift({
        clause: "SP0114 Section 3.2 / 5.2",
        severity: "INFO",
        title: `Injection Point Classification: ${suggestedSubtitle || "Chemical/Water Dosing"}`,
        desc: `Mass and composition balances confirm Stream B is formed by injecting an additive vector (+${fmt(sumPositiveDeltas, 0)} kg/hr, dominant: ${dominantAddedComp || "H2O"}) into Stream A.`
      });
    } else if (activeClassification === "PROCESS MIX POINT") {
      matchedCriteria.unshift({
        clause: "SP0114 Section 3.1 / 7.1",
        severity: "INFO",
        title: "Process Mix Point Classification: Intersection of Two Process Streams",
        desc: "Streams represent independent operating process flows intersecting at a piping tie-in, subject to turbulent mixing and thermal equilibrium blending."
      });
    } else if (activeClassification === "SPLIT-UNRELATED") {
      matchedCriteria.unshift({
        clause: "SP0114 Section 3.3",
        severity: "INFO",
        title: `Non-Mixing Relation: ${suggestedSubtitle || "Split or Parallel Stream"}`,
        desc: isSplitRelation
          ? "Streams exhibit identical thermal, pressure, and fluid phase states, characteristic of a flow division / piping branch rather than a mixing tie-in."
          : "Disjoint chemical components indicate unrelated sibling process branches rather than a physical mixing confluence."
      });
    }

    // Final Insufficient Data override for official badge
    let finalBadge = activeClassification;
    let finalRisk = riskLevel;
    if (hasMissingData) {
      finalBadge = "INSUFFICIENT DATA";
      finalRisk = "INSUFFICIENT DATA";
    }

    return {
      dataA,
      dataB,
      missingA,
      missingB,
      hasMissingData,
      activeClassification,
      finalBadge,
      finalRisk,
      suggestedSubtitle,
      isInjectantRelation,
      dominantAddedComp,
      sumPositiveDeltas,
      massDelta,
      dT,
      hasCorrosive,
      corrosiveList,
      phaseA,
      phaseB,
      matchedCriteria,
      overrideActive,
      currentOverride: override || "auto"
    };
  }

  /**
   * Render NACE SP0114 Classification UI Card
   */
  function render(sA, sB, targetContainerId) {
    if (!sA || !sB) {
      if (targetContainerId) {
        const el = document.getElementById(targetContainerId);
        if (el) el.innerHTML = "";
      }
      const existing = document.getElementById("naceClassificationBox");
      if (existing) existing.style.display = "none";
      return;
    }

    let box = null;
    if (targetContainerId) {
      box = document.getElementById(targetContainerId);
    }
    if (!box) {
      // Ensure #naceClassificationBox exists directly after #streamInsightBox
      box = document.getElementById("naceClassificationBox");
      if (!box) {
        const insightBox = document.getElementById("streamInsightBox");
        if (insightBox && insightBox.parentNode) {
          box = document.createElement("div");
          box.id = "naceClassificationBox";
          box.className = "stream-insight-box";
          insightBox.parentNode.insertBefore(box, insightBox.nextSibling);
        } else {
          console.warn("[NACE] #streamInsightBox container not found in DOM");
          return;
        }
      }
    }

    box.style.display = "block";

    // Stream pair identifier for override persistence
    const pairKey = `${sA.streamNo || "A"}->${sB.streamNo || "B"}`;
    const activeOverride = userOverrides[pairKey] || "auto";

    // Run deterministic classification logic
    const res = classifyTieIn(sA, sB, activeOverride);

    // Resolve Badge CSS classes (reusing stream-comparator badges)
    let badgeClass = "badge-new";
    let badgeIcon = "✦";
    if (res.finalBadge === "INJECTION POINT") {
      badgeClass = "badge-new";
      badgeIcon = "💉";
    } else if (res.finalBadge === "PROCESS MIX POINT") {
      badgeClass = "badge-decreased";
      badgeIcon = "🔀";
    } else if (res.finalBadge === "SPLIT-UNRELATED") {
      badgeClass = "badge-equal";
      badgeIcon = "🌿";
    } else if (res.finalBadge === "INSUFFICIENT DATA") {
      badgeClass = "badge-removed";
      badgeIcon = "⚠️";
    }

    // Resolve Risk Pill CSS classes
    let riskPillClass = "badge-equal";
    let riskPillText = "⚪ UNKNOWN";
    if (res.finalRisk === "HIGH") {
      riskPillClass = "badge-decreased";
      riskPillText = "🔴 HIGH RISK";
    } else if (res.finalRisk === "MEDIUM") {
      riskPillClass = "badge-removed";
      riskPillText = "🟡 MEDIUM RISK";
    } else if (res.finalRisk === "LOW") {
      riskPillClass = "badge-increased";
      riskPillText = "🟢 LOW RISK";
    } else if (res.finalRisk === "INSUFFICIENT DATA") {
      riskPillClass = "badge-removed";
      riskPillText = "⚠️ INSUFFICIENT DATA";
    }

    const selectId = targetContainerId ? "naceOverrideSelect_" + targetContainerId : "naceOverrideSelect";

    // Render HTML content inside target box
    box.innerHTML = `
      <div class="stream-insight-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 19px;">🛡️</span>
          <div>
            <div style="font-size: 14.5px; font-weight: 800; letter-spacing: 0.2px;">NACE SP0114 Tie-in Classification</div>
            <div style="font-size: 12px; opacity: 0.85; font-weight: normal;">
              Stream ${res.dataA.streamNo} (${res.dataA.streamName}) &rarr; Stream ${res.dataB.streamNo} (${res.dataB.streamName})
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span class="badge-status ${badgeClass}" style="font-size: 12px; padding: 4px 10px;">
            ${badgeIcon} ${res.finalBadge}
          </span>
          <span class="badge-status ${riskPillClass}" style="font-size: 12px; padding: 4px 10px;">
            ${riskPillText}
          </span>
        </div>
      </div>

      <!-- Suggested Classification & Manual Override Control -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-size: 12.5px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 700; color: #334155;">Suggested Relation:</span>
          <span class="badge-status badge-equal" style="font-weight: 600;">
            ${res.suggestedSubtitle || res.activeClassification}
          </span>
          ${res.overrideActive ? '<span class="badge-status badge-removed" style="font-size: 11px;">Manual Override Active</span>' : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <label for="${selectId}" style="font-weight: 600; color: #475569;">Override Classification:</label>
          <select id="${selectId}" class="nace-override-dropdown" style="padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; background: #ffffff; color: #1e293b; font-weight: 500; cursor: pointer;">
            <option value="auto" ${activeOverride === "auto" ? "selected" : ""}>Auto-Detected (Suggested: ${res.suggestedSubtitle || res.activeClassification})</option>
            <option value="injectant" ${activeOverride === "injectant" ? "selected" : ""}>Injectant (Force Injection Point)</option>
            <option value="process_mix" ${activeOverride === "process_mix" ? "selected" : ""}>Process Stream (Force Process Mix Point)</option>
            <option value="split" ${activeOverride === "split" ? "selected" : ""}>Split (Force Split / Branch)</option>
            <option value="unrelated" ${activeOverride === "unrelated" ? "selected" : ""}>Unrelated (Force Unrelated Sibling)</option>
          </select>
        </div>
      </div>

      <!-- Missing Data Warning Banner (Mandatory under NACE SP0114) -->
      ${res.hasMissingData ? `
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px; color: #92400e;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; margin-bottom: 6px;">
            <span>⚠️</span> INSUFFICIENT DATA FOR DEFINITIVE CLASSIFICATION & INTEGRITY SCREENING
          </div>
          <div style="font-size: 12.5px; line-height: 1.5; margin-bottom: 6px;">
            NACE SP0114 standards strictly prohibit assuming unmeasured process parameters. The following mandatory physical/chemical fields are missing:
          </div>
          <ul style="margin: 0 0 6px 20px; padding: 0; font-size: 12px; line-height: 1.6;">
            ${res.missingA.length > 0 ? `<li><strong>Stream ${res.dataA.streamNo} (${res.dataA.streamName}):</strong> Missing ${res.missingA.join(", ")}</li>` : ""}
            ${res.missingB.length > 0 ? `<li><strong>Stream ${res.dataB.streamNo} (${res.dataB.streamName}):</strong> Missing ${res.missingB.join(", ")}</li>` : ""}
          </ul>
          <div style="font-size: 11.5px; opacity: 0.9; font-style: italic;">
            Recommendation: Upload or merge physical operating parameters (Temperature, Pressure) and chemical component mass flow rates to unlock conclusive thermal fatigue and corrosion damage mechanism modeling.
          </div>
        </div>
      ` : ""}

      <!-- Physical & Thermodynamic Mixing Properties Comparison Table -->
      <div style="margin-bottom: 14px; background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden;">
        <div style="padding: 7px 12px; background: #f8fafc; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 12.5px; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
          <span>🧪 Key Physical & Thermodynamic Mixing Properties</span>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">NACE SP0114 / API 570 Tie-in Parameters</span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead>
              <tr style="background: #f1f5f9; color: #475569; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 6px 12px; font-weight: 600;">Parameter</th>
                <th style="padding: 6px 12px; font-weight: 600;">Stream ${res.dataA.streamNo}</th>
                <th style="padding: 6px 12px; font-weight: 600;">Stream ${res.dataB.streamNo}</th>
                <th style="padding: 6px 12px; font-weight: 600;">Variance (Δ B - A)</th>
                <th style="padding: 6px 12px; font-weight: 600;">Tie-in Consideration</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Temperature (°C)</td>
                <td style="padding: 6px 12px;">${res.dataA.tempC !== null ? res.dataA.tempC + " °C" : '<span style="color:#94a3b8;">Missing</span>'}</td>
                <td style="padding: 6px 12px;">${res.dataB.tempC !== null ? res.dataB.tempC + " °C" : '<span style="color:#94a3b8;">Missing</span>'}</td>
                <td style="padding: 6px 12px; font-weight: 600; color: ${res.dT !== null && res.dT >= 50 ? '#b91c1c' : '#334155'};">
                  ${res.dT !== null ? `|ΔT| = ${res.dT.toFixed(1)} °C` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">
                  ${res.dT !== null && res.dT > 167 ? '<span class="badge-status badge-decreased" style="font-size:10.5px;">Fatigue Limit Exceeded</span>' : res.dT !== null && res.dT >= 50 ? '<span class="badge-status badge-removed" style="font-size:10.5px;">Thermal Stratification</span>' : '<span class="badge-status badge-equal" style="font-size:10.5px;">Thermal Equilibrium</span>'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Pressure (kg/cm²g)</td>
                <td style="padding: 6px 12px;">${res.dataA.pressKgCm2 !== null ? res.dataA.pressKgCm2 + " kg/cm²g" : '<span style="color:#94a3b8;">Missing</span>'}</td>
                <td style="padding: 6px 12px;">${res.dataB.pressKgCm2 !== null ? res.dataB.pressKgCm2 + " kg/cm²g" : '<span style="color:#94a3b8;">Missing</span>'}</td>
                <td style="padding: 6px 12px; font-weight: 600;">
                  ${res.dataA.pressKgCm2 !== null && res.dataB.pressKgCm2 !== null ? `${(res.dataB.pressKgCm2 - res.dataA.pressKgCm2).toFixed(2)} kg/cm²` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Hydraulic head / backflow barrier</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Liquid Viscosity (cP)</td>
                <td style="padding: 6px 12px;">${res.dataA.viscosity !== null ? res.dataA.viscosity + " cP" : '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.viscosity !== null ? res.dataB.viscosity + " cP" : '-'}</td>
                <td style="padding: 6px 12px;">
                  ${res.dataA.viscosity !== null && res.dataB.viscosity !== null ? `${(res.dataB.viscosity - res.dataA.viscosity).toFixed(3)} cP` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Governs boundary layer Re & shearing</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Liquid Density (kg/m³)</td>
                <td style="padding: 6px 12px;">${res.dataA.liquidDensity !== null ? res.dataA.liquidDensity + " kg/m³" : '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.liquidDensity !== null ? res.dataB.liquidDensity + " kg/m³" : '-'}</td>
                <td style="padding: 6px 12px;">
                  ${res.dataA.liquidDensity !== null && res.dataB.liquidDensity !== null ? `${(res.dataB.liquidDensity - res.dataA.liquidDensity).toFixed(1)} kg/m³` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Gravitational phase separation risk</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Molecular Weight (MW)</td>
                <td style="padding: 6px 12px;">${res.dataA.mw !== null ? res.dataA.mw.toFixed(2) : '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.mw !== null ? res.dataB.mw.toFixed(2) : '-'}</td>
                <td style="padding: 6px 12px;">
                  ${res.dataA.mw !== null && res.dataB.mw !== null ? `${(res.dataB.mw - res.dataA.mw).toFixed(2)}` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Vapor density & momentum ratio ($M_R$)</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Wt% Vaporized (%)</td>
                <td style="padding: 6px 12px;">${res.dataA.wtPctVaporized !== null ? res.dataA.wtPctVaporized + "%" : '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.wtPctVaporized !== null ? res.dataB.wtPctVaporized + "%" : '-'}</td>
                <td style="padding: 6px 12px; font-weight: 600; color: ${res.dataA.wtPctVaporized !== null && res.dataB.wtPctVaporized !== null && Math.abs(res.dataB.wtPctVaporized - res.dataA.wtPctVaporized) >= 10 ? '#b91c1c' : '#334155'};">
                  ${res.dataA.wtPctVaporized !== null && res.dataB.wtPctVaporized !== null ? `${(res.dataB.wtPctVaporized - res.dataA.wtPctVaporized).toFixed(1)}%` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Flashing vs vapor collapse hammer</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Surface Tension (dyne/cm)</td>
                <td style="padding: 6px 12px;">${res.dataA.surfaceTension !== null ? res.dataA.surfaceTension + " dyne/cm" : '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.surfaceTension !== null ? res.dataB.surfaceTension + " dyne/cm" : '-'}</td>
                <td style="padding: 6px 12px;">
                  ${res.dataA.surfaceTension !== null && res.dataB.surfaceTension !== null ? `${(res.dataB.surfaceTension - res.dataA.surfaceTension).toFixed(1)} dyne/cm` : '-'}
                </td>
                <td style="padding: 6px 12px; color: #475569;">Droplet Weber number ($We$) atomization</td>
              </tr>
              <tr>
                <td style="padding: 6px 12px; font-weight: 600; color: #1e293b;">Liquid Vap Press (kg/cm²)</td>
                <td style="padding: 6px 12px;">${res.dataA.liquidVapPress || '-'}</td>
                <td style="padding: 6px 12px;">${res.dataB.liquidVapPress || '-'}</td>
                <td style="padding: 6px 12px;">-</td>
                <td style="padding: 6px 12px; color: #475569;">Cavitation / localized degassing check</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Matched Criteria with NACE SP0114 Clause References -->
      <div style="margin-bottom: 14px;">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> Matched NACE SP0114 Criteria & Safety Triggers
        </div>
        <div style="display: grid; gap: 8px;">
          ${res.matchedCriteria.map(c => `
            <div style="background: rgba(255,255,255,0.7); border: 1px solid rgba(0,0,0,0.07); border-radius: 6px; padding: 9px 12px; font-size: 12.5px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; gap: 8px;">
                <strong style="color: #0f172a;">${c.title}</strong>
                <span class="badge-status ${c.severity === 'HIGH' ? 'badge-decreased' : c.severity === 'MEDIUM' ? 'badge-removed' : 'badge-equal'}" style="font-size: 11px;">
                  Clause ${c.clause}
                </span>
              </div>
              <div style="color: #475569; font-size: 12px; line-height: 1.5;">${c.desc}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Recommended Engineering Actions -->
      <div>
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span>🛠️</span> Mandatory & Recommended Engineering Actions
        </div>
        <ul class="stream-insight-list" style="margin: 0; padding-left: 20px; font-size: 12.5px; line-height: 1.6;">
          <li>
            <strong>Inspection Circuit Extent (NACE SP0114 Section 3.15.2):</strong>
            Establish dedicated inspection circuit encompassing <strong>12 inches (300 mm) upstream</strong> of the tie-in connection and extending downstream to either the <strong>second change in flow direction</strong> or a minimum of <strong>25 to 30 pipe diameters</strong>.
          </li>
          <li>
            <strong>Turbulent Flow Regime ($Re > 4000$):</strong>
            Verification of turbulent mixing ($Re > 4000$) to prevent thermal stratification: <em style="color: #b45309; font-weight: 600;">(needs pipe ID)</em> to calculate fluid velocity and exact Reynolds number.
          </li>
          ${res.isInjectantRelation && res.dominantAddedComp.toUpperCase() === "H2O" ? `
            <li>
              <strong>25% Liquid Water Criterion (NACE SP0114 Section 7.6.2):</strong>
              For hydroprocessing wash water injection systems, verify continuous presence of free wash water downstream of REAC injection: <em style="color: #b45309; font-weight: 600;">(needs flash calc, verify)</em> to confirm at least 25 wt% of injected water remains liquid at downstream operating conditions.
            </li>
            <li>
              <strong>Injection Quill Specification (NACE SP0114 Section 5.2):</strong>
              Equip tie-in with an injection quill extending into the center one-third of the process pipe diameter with a 45° beveled tip facing downstream to prevent corrosive fluid impingement against the pipe wall.
            </li>
          ` : ""}
          ${res.dT !== null && res.dT >= 50 ? `
            <li>
              <strong>Thermal Fatigue & Stratification NDT (NACE SP0114 Section 7.10):</strong>
              Install top/bottom skin thermocouples and implement periodic shear-wave ultrasonic testing (UT) or pulsed eddy current (PEC) around the mix tee circumference to monitor for thermal fatigue thermal shock cracking.
            </li>
          ` : ""}
          <li>
            <strong>Baseline Wall Thickness Monitoring:</strong>
            Establish baseline Ultrasonic Thickness (UT) C-scan grid at 12, 3, 6, and 9 o'clock orientations immediately downstream of the tie-in weld seam.
          </li>
        </ul>
      </div>
    `;

    // Attach listener to dropdown override without page refresh
    const selectEl = box.querySelector("#" + selectId);
    if (selectEl) {
      selectEl.addEventListener("change", function (e) {
        userOverrides[pairKey] = e.target.value;
        render(sA, sB, targetContainerId);
        if (targetContainerId === "naceDedicatedContainer") {
          render(sA, sB);
        } else {
          render(sA, sB, "naceDedicatedContainer");
        }
      });
    }
  }

  // Expose on window object per specification
  window.NaceClassifier = {
    render: render,
    classifyTieIn: classifyTieIn,
    clearOverride: function (streamNoA, streamNoB) {
      if (streamNoA && streamNoB) {
        delete userOverrides[`${streamNoA}->${streamNoB}`];
      } else {
        for (const k of Object.keys(userOverrides)) delete userOverrides[k];
      }
    }
  };

})();
