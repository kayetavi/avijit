/* API 581 Level 2 COF core math – extended for ignition, toxic, non-flammable, financial
 * Implements API 581 Equations (3.3–3.7) for release rate
 */

const R_u = 8.314462618; // J/mol-K
const BAR_TO_PA = 1e5;

function initCOF() {
  const calcBtn = document.getElementById("cof_calcBtn");
  if (calcBtn && !calcBtn._bound) {
    calcBtn._bound = true;
    calcBtn.addEventListener("click", runCOF);
  }
  const resetBtn = document.getElementById("cof_resetBtn");
  if (resetBtn && !resetBtn._bound) {
    resetBtn._bound = true;
    resetBtn.addEventListener("click", () => location.reload());
  }

  const releaseSizeEl = document.getElementById("cof_release_size");
  const dnInput = document.getElementById("cof_dn_mm");
  if (releaseSizeEl && !releaseSizeEl._bound) {
    releaseSizeEl._bound = true;
    releaseSizeEl.addEventListener("change", function () {
      if (dnInput) dnInput.disabled = this.value !== "user";
    });
  }

  // Stored phase listener (fixed)
  const storedPhaseEl = document.getElementById("cof_stored_phase");
  if (storedPhaseEl && !storedPhaseEl._bound) {
    storedPhaseEl._bound = true;
    storedPhaseEl.addEventListener("change", function () {
      if (typeof updateFluidDropdown === "function") {
        updateFluidDropdown(this.value ? this.value.toLowerCase() : "");
      }
    });
  }

  // Initialize fluid dropdown with available options immediately
  const initialPhase = storedPhaseEl && storedPhaseEl.value ? storedPhaseEl.value.toLowerCase() : "";
  if (typeof updateFluidDropdown === "function") {
    updateFluidDropdown(initialPhase);
  }
}
window.initCOF = initCOF;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCOF);
} else {
  initCOF();
}


async function hydrateCOFLevel2Metadata() {
  try {
    const res = await fetch("/api/risk-calculator?action=cof_level2_metadata");
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        if (data.fluidProperties) Object.assign(fluidProperties, data.fluidProperties);
        if (data.fluidLabels) Object.assign(fluidLabels, data.fluidLabels);
        if (data.releaseAdjustment) Object.assign(releaseAdjustmentTable, data.releaseAdjustment);
        if (Array.isArray(data.liquidFluids) && data.liquidFluids.length > 0) {
          liquidFluids.splice(0, liquidFluids.length, ...data.liquidFluids);
        }
        if (Array.isArray(data.gasFluids) && data.gasFluids.length > 0) {
          gasFluids.splice(0, gasFluids.length, ...data.gasFluids);
        }
        const storedPhaseEl = document.getElementById("cof_stored_phase");
        const initialPhase = storedPhaseEl && storedPhaseEl.value ? storedPhaseEl.value.toLowerCase() : "";
        if (typeof updateFluidDropdown === "function") {
          updateFluidDropdown(initialPhase);
        }
      }
    }
  } catch (err) {
    console.warn("Level 2 COF metadata hydration notice:", err);
  }
}
hydrateCOFLevel2Metadata();

/* --- Main COF Run Function (Backend Calculation Engine) --- */
async function runCOF() {
  const inps = readInputsCOF();
  const outEl = document.getElementById("cof_output");
  if (outEl) outEl.textContent = "⏳ Calculating API 581 Level 2 COF on backend engine...";

  try {
    const res = await fetch("/api/risk-calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "calculate_cof_level2",
        inputs: inps
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.results) {
        const releaseEl = document.getElementById("cof_release_type");
        if (releaseEl) releaseEl.value = data.results.isInstant ? "instantaneous" : "continuous";
        if (outEl) {
          outEl.textContent = data.results.formattedText || formatOutputCOF(data.results);
        }
        return;
      }
    }
  } catch (err) {
    console.warn("Backend Level 2 COF fallback:", err);
  }

  const out = computeCOF(inps);
  if (outEl) outEl.textContent = formatOutputCOF(out);
}

/* --- Read Inputs --- */
function readInputsCOF() {
  const get = id => {
    const e = document.getElementById("cof_" + id);
    return e ? parseFloat(e.value) : NaN;
  };
  const getStr = id => {
    const e = document.getElementById("cof_" + id);
    return e ? e.value : "";
  };

  const D_mm = get("D_mm");
  const release_size = getStr("release_size").toLowerCase();
  let dn_mm;

  if (release_size === "user") dn_mm = get("dn_mm");
  else {
    switch (release_size) {
      case "small": dn_mm = 6.4; break;
      case "medium": dn_mm = Math.min(D_mm, 25); break;
      case "large": dn_mm = Math.min(D_mm, 102); break;
      case "rupture": dn_mm = Math.min(D_mm, 406); break;
      default: dn_mm = get("dn_mm");
    }
  }

  return {
    Ps_bar: get("ps_bar") * 0.980665,
    Ts_C: get("ts_c"),
    Patm_bar: get("patm_bar"),
    Tamb_C: get("tamb_c"),
    stored_phase: getStr("stored_phase"),
    NBP_C: get("nbp_c"),

    rho_l: get("rho_l"),
    MW: get("mw"),
    k: get("k_ratio"),
    AIT_C: get("ait_c"),

    dn_mm, D_mm,
    Cd: get("cd") || 0.64,
    Kv: get("kv") || 1.0,
    invGroupMass: get("inv_group_mass"),
    isoTime_s: get("iso_time_s") || 600,
    detect_eff: clamp01(get("detect_eff") || 1.0),
    release_type: getStr("release_type") || "auto",
    flashFrac: clamp01(get("flash_frac") || 0),

    detect_label: getStr("detect_label"),
    iso_label: getStr("iso_label"),

    a_flash: get("a_flash"), b_flash: get("b_flash"),
    a_jet: get("a_jet"), b_jet: get("b_jet"),
    a_pool: get("a_pool"), b_pool: get("b_pool"),
    a_vce: get("a_vce"), b_vce: get("b_vce"),
    c_flash: get("c_flash"), d_flash: get("d_flash"),
    c_jet: get("c_jet"), d_jet: get("d_jet"),
    c_pool: get("c_pool"), d_pool: get("d_pool"),
    c_vce: get("c_vce"), d_vce: get("d_vce"),

    flash_area_fraction: clamp01(get("flash_area_fraction")) || 0.25,

    ign_k1: get("ign_k1"),
    ign_k2: get("ign_k2"),
    ign_k3: get("ign_k3"),
    late_min: get("late_min"),
    late_max: get("late_max"),

    tox_a: get("tox_a"), tox_b: get("tox_b"), tox_c: get("tox_c"), tox_d: get("tox_d"),
    non_a: Number.isFinite(get("non_a")) ? get("non_a") : get("ntox_a"),
    non_b: Number.isFinite(get("non_b")) ? get("non_b") : get("ntox_b"),
    non_c: Number.isFinite(get("non_c")) ? get("non_c") : get("ntox_c"),
    non_d: Number.isFinite(get("non_d")) ? get("non_d") : get("ntox_d"),

    cost_equipment: get("cost_equipment"),
    cost_injury: get("cost_injury"),
    cost_production: get("cost_production")
  };
}

/* --- Compute COF --- */
function computeCOF(i) {
  const dn_m = (i.D_mm && i.dn_mm > i.D_mm) ? i.D_mm/1000 : (i.dn_mm || 0)/1000;
  const An = 0.785 * Math.pow(dn_m, 2);

  const Ps = (isFinite(i.Ps_bar) ? i.Ps_bar : 0) * BAR_TO_PA;
  const Patm = (isFinite(i.Patm_bar) ? i.Patm_bar : 1.013) * BAR_TO_PA;
  const Ts_K = (isFinite(i.Ts_C) ? i.Ts_C + 273.15 : 298.15);
  const Tamb_K = (isFinite(i.Tamb_C) ? i.Tamb_C + 273.15 : 294.15);

  let MW_input = i.MW || 28;
  if (MW_input < 0.1) MW_input *= 1000;

  // --- Release rate calculation ---
  let Wn = 0, model = "No release";
  if (i.stored_phase === "liquid" || i.stored_phase === "two_phase") {
    const baseRate = liquidReleaseRate(An, i.Cd, i.Kv, i.rho_l, Ps, Patm);
    if (i.stored_phase === "two_phase" || (i.Ts_C > i.NBP_C)) {
      const f = clamp01(i.flashFrac || 0);
      Wn = baseRate;
      model = "Two-phase (flashing split)";
    } else {
      Wn = baseRate;
      model = "Liquid";
    }
  } else {
    const gas = gasReleaseRate(An, i.Cd, Ps, Patm, Ts_K, i.k || 1.4, MW_input);
    Wn = gas.massRate;
    model = gas.choked ? "Gas (sonic)" : "Gas (subsonic)";
  }

  // --- Table 4.6 adjustment (hydrated from backend) ---
  const det = i.detect_label || "C";
  const iso = i.iso_label || "C";
  const fact_di = releaseAdjustmentTable[`${det}_${iso}`] ?? 0;
  const Wn_adj = Wn * (1 - fact_di);

  // --- Leak duration ---
  const leakLimit = getLeakDurationLimit(det, iso, i.dn_mm);
  const maxDurInv = (i.invGroupMass>0 && Wn_adj>0) ? i.invGroupMass / Wn_adj : Infinity;
  const duration_s = Math.max(0, Math.min(leakLimit, maxDurInv));
  const releasedMass = Wn_adj * duration_s;

  // --- Automatic Release Type Determination ---
  const dn_inch = (i.dn_mm||0)/25.4;
  const mass_lb = releasedMass*2.205;
  const Wn_lb_s = Wn_adj*2.205;

  let isInstant = false;
  if(dn_inch >= 0.25 && (mass_lb > 10000 || Wn_lb_s > 55.6 || duration_s < 180)) {
    isInstant = true;
  }

  // Optional: update hidden field if exists
  const releaseEl = document.getElementById("cof_release_type");
  if(releaseEl) releaseEl.value = isInstant ? "instantaneous" : "continuous";

  // --- Outcome Areas using API 581 coefficients ---
  const areas = {};
  if(isInstant){
    areas.flash = powOrZero(i.c_flash, i.d_flash, releasedMass);
    areas.jet   = powOrZero(i.c_jet, i.d_jet, releasedMass);
    areas.pool  = powOrZero(i.c_pool, i.d_pool, releasedMass);
    areas.vce   = powOrZero(i.c_vce, i.d_vce, releasedMass);
  } else {
    areas.flash = powOrZero(i.a_flash, i.b_flash, Wn_adj);
    areas.jet   = powOrZero(i.a_jet, i.b_jet, Wn_adj);
    areas.pool  = powOrZero(i.a_pool, i.b_pool, Wn_adj);
    areas.vce   = powOrZero(i.a_vce, i.b_vce, Wn_adj);
  }

  // --- Ignition probabilities ---
  const pIgn = (i.ign_k1||0) * Math.pow(Math.max(0, Wn_adj), (isFinite(i.ign_k2)? i.ign_k2:1));
  const aitEffect = (isFinite(i.AIT_C)&&i.AIT_C>0) ? Math.exp(-i.AIT_C/(i.ign_k3||50)) : 1;
  const p_total = clamp01(pIgn * aitEffect);
  const p_late = clamp01((isFinite(i.late_min)?i.late_min:0.25)+((isFinite(i.late_max)?i.late_max:0.75)-(isFinite(i.late_min)?i.late_min:0.25))*0.5);
  const p_early = clamp01(p_total - p_late);
  const p_safe = clamp01(1 - p_total);

  const pf = p_early, pj = p_late*0.33, pp = p_late*0.33, pv = p_late*0.34;
  const flashAdj = i.flash_area_fraction || 0.25;
  const flamCombined = (pf*(areas.flash||0)*flashAdj) + (pj*(areas.jet||0)) + (pp*(areas.pool||0)) + (pv*(areas.vce||0));

  // --- Toxic & Non-flammable areas ---
  const toxArea = isInstant ? powOrZero(i.tox_c,i.tox_d,releasedMass) : powOrZero(i.tox_a,i.tox_b,Wn_adj);
  const nonFlamArea = isInstant ? powOrZero(i.non_c,i.non_d,releasedMass) : powOrZero(i.non_a,i.non_b,Wn_adj);
  const totalConsequenceArea = flamCombined + toxArea + nonFlamArea;

  // --- Financial consequences ---
  const finEquip = flamCombined*(i.cost_equipment||0);
  const finInjury = totalConsequenceArea*(i.cost_injury||0);
  const finProd = totalConsequenceArea*(i.cost_production||0);
  const finLoss = finEquip + finInjury + finProd;

  return {
    modelUsed:model,
    dn_m, An, Ps, Patm, Ts_K, Tamb_K,
    Wn:Wn_adj,
    duration_s,
    releasedMass,
    flam_rate_liq: Wn_adj*(1-(i.flashFrac||0)),
    flam_rate_vap: Wn_adj*(i.flashFrac||0),
    isInstant,
    areas,
    flamCombined,
    p_early, p_late, p_safe,
    finalFlammableArea: flamCombined,
    finalToxicArea: toxArea,
    finalNonFlammableArea: nonFlamArea,
    totalConsequenceArea,
    finEquip, finInjury, finProd, finLoss
  };
}

/* --- API 581 Equations --- */
function liquidReleaseRate(A,Cd,Kv,rho,Ps,Patm){
  const dP=Math.max(Ps-Patm,0);
  if(!(A>0 && Cd>0 && rho>0 && dP>0)) return 0;
  return Cd*(Kv||1)*rho*A*Math.sqrt(2*dP/rho);
}
function gasReleaseRate(A,Cd,Ps,Patm,Ts,k,MW){
  if(!(A>0 && Cd>0 && Ps>Patm && Ts>0 && k>1 && MW>0)) return {massRate:0,choked:false};
  const R_spec=R_u/(MW/1000);
  const Ptrans=Patm*Math.pow(2/(k+1),k/(k-1));
  if(Ps>Ptrans){
    const term=Math.sqrt(k/(R_spec*Ts))*Math.pow(2/(k+1),(k+1)/(2*(k-1)));
    return {massRate:Cd*A*Ps*term,choked:true};
  } else {
    const pr=Patm/Ps;
    const bracket=Math.pow(pr,2/k)-Math.pow(pr,(k+1)/k);
    if(bracket<=0) return {massRate:0,choked:false};
    const term=Math.sqrt((2*k)/(R_spec*Ts*(k-1))*bracket);
    return {massRate:Cd*A*Ps*term,choked:false};
  }
}

/* --- Helpers --- */
function clamp01(x){return isFinite(x)?Math.max(0,Math.min(1,x)):0;}
function powOrZero(a,b,x){return (isFinite(a)&&isFinite(b)&&isFinite(x)&&a>0&&x>0)?a*Math.pow(x,b):0;}
function fmt(n,d=3){return isFinite(n)?Number(n).toLocaleString(undefined,{maximumFractionDigits:d}):"-";}

/* --- Format Output --- */
function formatOutputCOF(o){
  const releaseTypeStr = o.isInstant ? "Instantaneous" : "Continuous";
  return [
    `Model: ${o.modelUsed}`,
    `Release Type: ${releaseTypeStr}`,
    `dn = ${fmt(o.dn_m,6)} m, An = ${fmt(o.An,6)} m²`,
    `Ps = ${fmt(o.Ps/1e5,3)} bar, Patm = ${fmt(o.Patm/1e5,3)} bar`,
    `Ts = ${fmt(o.Ts_K,1)} K, Tamb = ${fmt(o.Tamb_K,1)} K`,
    ``,
    `Release rate Wn = ${fmt(o.Wn,4)} kg/s`,
    `Duration = ${fmt(o.duration_s,2)} s`,
    `Released mass = ${fmt(o.releasedMass,2)} kg`,
    ``,
    `Areas: Flash=${fmt(o.areas.flash,2)} m², Jet=${fmt(o.areas.jet,2)} m², Pool=${fmt(o.areas.pool,2)} m², VCE=${fmt(o.areas.vce,2)} m²`,
    `Flammable combined (prob-weighted) = ${fmt(o.finalFlammableArea,2)} m²`,
    `Toxic area = ${fmt(o.finalToxicArea,2)} m²`,
    `Non-flammable area = ${fmt(o.finalNonFlammableArea,2)} m²`,
    `Total consequence area = ${fmt(o.totalConsequenceArea,2)} m²`,
    ``,
    `Ignition probabilities: Early=${fmt(o.p_early,2)}, Late=${fmt(o.p_late,2)}, Safe=${fmt(o.p_safe,2)}`,
    ``,
    `Financial consequence:`,
    `  Equipment = $${fmt(o.finEquip,0)}`,
    `  Injury/Fatality = $${fmt(o.finInjury,0)}`,
    `  Production = $${fmt(o.finProd,0)}`,
    `  TOTAL = $${fmt(o.finLoss,0)}`
  ].join("\n");
}


/* --- Leak Duration Limits --- */
function getLeakDurationLimit(det, iso, dn_mm){
  const d = dn_mm || 0;
  if(det==="A"&&iso==="A"){if(d<=6.4)return 1200;if(d<=25)return 600;if(d<=102)return 300;return 3600;}
  if(det==="A"&&iso==="B"){if(d<=6.4)return 1800;if(d<=25)return 1200;if(d<=102)return 600;return 3600;}
  if(det==="A"&&iso==="C"){if(d<=6.4)return 2400;if(d<=25)return 1800;if(d<=102)return 900;return 3600;}
  if(det==="B"&&iso==="B"){if(d<=6.4)return 2700;if(d<=25)return 2100;if(d<=102)return 1200;return 3600;}
  if(det==="B"&&iso==="C"){if(d<=6.4)return 3000;if(d<=25)return 2400;if(d<=102)return 1800;return 3600;}
  if(det==="C"){if(d<=6.4)return 3600;if(d<=25)return 2700;if(d<=102)return 2400;return 3600;}
  return 3600;
}

// Hydrated from Cloud Firestore via /api/risk-calculator?action=cof_level2_metadata
const fluidProperties = {};
const fluidLabels = {};
const liquidFluids = [];
const gasFluids = [];
const releaseAdjustmentTable = {};

// --- Repopulate fluid dropdown ---
function updateFluidDropdown(phase) {
  const fluidSelect = document.getElementById("cof_fluid");
  if (!fluidSelect) return;
  const currentVal = fluidSelect.value;
  fluidSelect.innerHTML = "<option value=''>-- Select Fluid --</option>";

  let options = [];
  const p = (phase || "").toLowerCase();
  if (p === "liquid") {
    options = liquidFluids;
  } else if (p === "vapor" || p === "gas") {
    options = gasFluids;
  } else if (p === "two_phase" || p === "supercritical") {
    options = [...new Set([...liquidFluids, ...gasFluids])];
  } else {
    // If no specific phase is selected, display all available representative fluids
    options = [...new Set([...liquidFluids, ...gasFluids])];
  }

  options.forEach(fluid => {
    const opt = document.createElement("option");
    opt.value = fluid;
    opt.innerHTML = fluidLabels?.[fluid] || fluid;
    fluidSelect.appendChild(opt);
  });

  if (currentVal && options.includes(currentVal)) {
    fluidSelect.value = currentVal;
  }

  // update autofill
  autofillFluidProperties();
}

// --- Autofill properties ---
function autofillFluidProperties() {
  const fluid = document.getElementById("cof_fluid").value;
  const props = fluidProperties[fluid];

  const mwEl   = document.getElementById("cof_mw");
  const rhoEl  = document.getElementById("cof_rho_l");
  const nbpEl  = document.getElementById("cof_nbp_c");
  const aitEl  = document.getElementById("cof_ait_c");

  if (fluid === "User Fill") {
    [mwEl, rhoEl, nbpEl, aitEl].forEach(el => {
      el.value = "";
      el.readOnly = false;
    });
  } 
  else if (props) {
    mwEl.value  = props.mw ?? "";
    rhoEl.value = props.density ?? "";
    nbpEl.value = props.nbp ?? "";
    aitEl.value = props.ait ?? "";

    [mwEl, rhoEl, nbpEl, aitEl].forEach(el => el.readOnly = true);
  } 
  else {
    [mwEl, rhoEl, nbpEl, aitEl].forEach(el => {
      el.value = "";
      el.readOnly = true;
    });
  }
}

// --- Listener for stored phase ---
const storedPhaseEl = document.getElementById("cof_stored_phase");
if(storedPhaseEl){
  storedPhaseEl.addEventListener("change", function () {
    updateFluidDropdown(this.value.toLowerCase());
  });
}



