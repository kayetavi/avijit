// 🔬 API 581 Corrosion Rate Estimator & Calculation Logic

let dmSelectFull = document.getElementById("dmSelectFull");
let formContainerFull = document.getElementById("formContainerFull");
let calculateBtnFull = document.getElementById("calculateBtnFull");
let corrosionResultFull = document.getElementById("corrosionResultFull");

function syncCorrosionElements() {
  dmSelectFull = document.getElementById("dmSelectFull");
  formContainerFull = document.getElementById("formContainerFull");
  calculateBtnFull = document.getElementById("calculateBtnFull");
  corrosionResultFull = document.getElementById("corrosionResultFull");
}
window.syncCorrosionElements = syncCorrosionElements;

let currentDM = "";

function triggerAutoCalc() {
  syncCorrosionElements();
  if (calculateBtnFull) {
    calculateBtnFull.click();
  } else if (typeof handleCorrosionCalculate === "function") {
    handleCorrosionCalculate();
  }
}

function updateCUIFormLimits() {
  triggerAutoCalc();
}
window.updateCUIFormLimits = updateCUIFormLimits;

function loadCriteria() {
  syncCorrosionElements();
  const dmSelector = document.getElementById("dmSelector");
  if (!dmSelector) return;
  const val = dmSelector.value;
  if (dmSelectFull && val) {
    dmSelectFull.value = val;
    dmSelectFull.dispatchEvent(new Event("change"));
  }
}
window.loadCriteria = loadCriteria;

function calculateCorrosion() {
  syncCorrosionElements();
  if (calculateBtnFull) {
    calculateBtnFull.click();
  } else if (typeof handleCorrosionCalculate === "function") {
    handleCorrosionCalculate();
  }
}
window.calculateCorrosion = calculateCorrosion;

function syncDMSelector() {
  syncCorrosionElements();
  const dmSelector = document.getElementById("dmSelector");
  if (dmSelector && dmSelectFull && dmSelector.options && dmSelector.options.length <= 1) {
    dmSelector.innerHTML = dmSelectFull.innerHTML;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", syncDMSelector);
} else {
  syncDMSelector();
}

function findClosestValue(dataArray, temp) {
  return dataArray.reduce((prev, curr) =>
    Math.abs(curr.temp - temp) < Math.abs(prev.temp - temp) ? curr : prev
  );
}

function handleDMSelectChange() {
  syncCorrosionElements();
  if (!dmSelectFull || !formContainerFull) return;
  if (corrosionResultFull) corrosionResultFull.textContent = "";
  formContainerFull.innerHTML = "";
  currentDM = dmSelectFull.value;
  if (calculateBtnFull) calculateBtnFull.style.display = currentDM ? "inline-block" : "none";

  if (currentDM === "cui") {
    formContainerFull.innerHTML = `
      <label>Material: 
        <select id="materialCUI" onchange="updateCUIFormLimits()">
        <option value="">-- Select Material --</option>
        <option value="cs">Carbon Steel / LAS / LTCS / SS 400 Series</option>
        <option value="ss300">SS 300 Series</option>
        <option value="duplex">Duplex</option>
      </select>
    </label>
    <label>Temperature (°C): <input type="number" id="tempCUI" /></label>
    <label>Is Insulated? 
      <select id="insulatedCUI"><option>Yes</option><option>No</option></select>
    </label>
    <label>Is Exposed to Moisture? 
      <select id="exposedCUI"><option>Yes</option><option>No</option></select>
    </label>
    <label>Severity: 
      <select id="severityCUI">
        <option>Severe</option>
        <option>Moderate</option>
        <option>Mild</option>
        <option>Dry</option>
      </select>
    </label>
    `;

    setTimeout(() => {
      document.getElementById("materialCUI")?.addEventListener("change", triggerAutoCalc);
      document.getElementById("tempCUI")?.addEventListener("input", triggerAutoCalc);
      document.getElementById("insulatedCUI")?.addEventListener("change", triggerAutoCalc);
      document.getElementById("exposedCUI")?.addEventListener("change", triggerAutoCalc);
      document.getElementById("severityCUI")?.addEventListener("change", triggerAutoCalc);
    }, 100);
  }
  else if (currentDM === "co2") {
    formContainerFull.innerHTML = `
      <label>Material:
        <select id="materialCO2">
          <option value="">-- Select --</option>
          <option value="Carbon Steel"><13% Cr / Carbon Steel</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <div id="step1CO2"></div>
    `;

    document.getElementById("materialCO2")?.addEventListener("change", (e) => {
      const val = e.target.value;
      const step1 = document.getElementById("step1CO2");
      step1.innerHTML = "";

      if (val === "Other") {
        step1.innerHTML = `<p>❌ No CO₂ corrosion for selected material.</p>`;
        return;
      }

      step1.innerHTML = `
        <label>Are liquid hydrocarbons present?
          <select id="liquidHC">
            <option value="">-- Select --</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
        <div id="step2CO2"></div>
      `;

      document.getElementById("liquidHC")?.addEventListener("change", (e2) => {
        const val2 = e2.target.value;
        const step2 = document.getElementById("step2CO2");
        step2.innerHTML = "";

        if (val2 === "Yes") {
          step2.innerHTML = `
            <label>Water Content < 20%?
              <select id="waterContent">
                <option value="">-- Select --</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <div id="step3CO2"></div>
          `;

          document.getElementById("waterContent")?.addEventListener("change", (e3) => {
            const val3 = e3.target.value;
            const step3 = document.getElementById("step3CO2");
            step3.innerHTML = "";

            if (val3 === "Yes") {
              step3.innerHTML = `
                <label>Fluid velocity > 1 m/s?
                  <select id="velocityHigh">
                    <option value="">-- Select --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </label>
                <div id="step4CO2"></div>
              `;

              document.getElementById("velocityHigh")?.addEventListener("change", (e4) => {
                const val4 = e4.target.value;
                const step4 = document.getElementById("step4CO2");
                step4.innerHTML = "";

                if (val4 === "Yes") {
                  step4.innerHTML = `<p>✅ No CO₂ corrosion expected due to high velocity and low water.</p>`;
                } else {
                  showDewPointStep(step4);
                }
              });
            } else {
              showDewPointStep(step3);
            }
          });
        } else {
          step2.innerHTML = `<p>⚠️ No hydrocarbons present — proceeding with dew point calculation.</p>`;
          showDewPointStep(step2);
        }
      });
    });
  }
  else if (currentDM === "sulfidation") {
    formContainerFull.innerHTML = `
      <label>Material:
        <select id="materialSulf" onchange="updateSulfidationDropdowns()">
          <option value="">-- Choose --</option>
          <option value="CS">Carbon Steel</option>
          <option value="SS">Austenitic SS without Mo</option>
        </select>
      </label>
      <label>Temperature (°C): <input type="number" id="tempSulf" /></label>
      <label>Sulfur Content (%):
        <select id="sulfurSulf"></select>
      </label>
      <label>TAN:
        <select id="tanSulf"></select>
      </label>
      <label>Velocity (m/s): <input type="number" id="velocitySulf" /></label>
      <button onclick="calculateSulfidation()">Calculate</button>
      <div id="corrosionResultFull"></div>
    `;
    updateSulfidationDropdowns();
  }
  else if (currentDM === "Alkaline Sour Water Corrosion") {
    formContainerFull.innerHTML = `
      <label>NH₄HS Concentration (wt%):
        <select id="nh4hs">
          <option value="">-- Choose --</option>
          <option value="2">2</option>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="15">15</option>
        </select>
      </label>
      <label>Velocity (m/s):
        <select id="velocity">
          <option value="">-- Choose --</option>
          <option value="3.05">3.05</option>
          <option value="4.57">4.57</option>
          <option value="6.10">6.10</option>
          <option value="7.62">7.62</option>
          <option value="9.14">9.14</option>
        </select>
      </label>
      <label>Is H₂S Partial Pressure Known? 
        <select id="pressureKnown">
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </label>
      <div id="pressureInputContainer"></div>
    `;

    document.getElementById("pressureKnown")?.addEventListener("change", (e) => {
      const container = document.getElementById("pressureInputContainer");
      container.innerHTML = e.target.value === "Yes"
        ? `<label>H₂S Partial Pressure (kg/cm²): <input type="number" id="h2sPressure" /></label>`
        : "";
    });
  }
  else if (currentDM === "Acid Sour Water Corrosion") {
    formContainerFull.innerHTML = `
      <label>Is H₂O Present?
        <select id="h2oPresentASW">
          <option value="">-- Select --</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <div id="acidSourSteps"></div>
    `;

    document.getElementById("h2oPresentASW")?.addEventListener("change", () => {
      const h2o = document.getElementById("h2oPresentASW").value;
      const acidSourSteps = document.getElementById("acidSourSteps");
      acidSourSteps.innerHTML = "";

      if (h2o === "no") {
        acidSourSteps.innerHTML = `<p>✅ Estimated Corrosion Rate: 0 mm/y (No H₂O Present)</p>`;
        return;
      }

      acidSourSteps.innerHTML = `
        <label>pH (for routing decision):
          <select id="phStep">
            <option value="">-- Select --</option>
            <option value="4.75">4.75</option>
            <option value="5.25">5.25</option>
            <option value="5.75">5.75</option>
            <option value="6.25">6.25</option>
            <option value="6.75">6.75</option>
            <option value="7.25">> 7</option>
            <option value="4.25">< 4.5</option>
          </select>
        </label>
        <div id="acidSourRouting"></div>
      `;

      document.getElementById("phStep")?.addEventListener("change", () => {
        const ph = parseFloat(document.getElementById("phStep").value);
        const acidSourRouting = document.getElementById("acidSourRouting");
        acidSourRouting.innerHTML = "";

        if (ph > 7) {
          acidSourRouting.innerHTML = `<p>📌 Routing: Proceed to Section 2.B.8.7</p>`;
          return;
        }
        if (ph < 4.5) {
          acidSourRouting.innerHTML = `<p>📌 Routing: pH too low for this method.</p>`;
          return;
        }

        acidSourRouting.innerHTML = `
          <label>Are Chlorides Present?
            <select id="chloridesPresentASW">
              <option value="">-- Select --</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <div id="acidSourNextStep"></div>
        `;

        document.getElementById("chloridesPresentASW")?.addEventListener("change", () => {
          const chlorides = document.getElementById("chloridesPresentASW").value;
          const nextStep = document.getElementById("acidSourNextStep");
          nextStep.innerHTML = "";

          if (chlorides === "yes") {
            nextStep.innerHTML = `<p>📌 Routing: Proceed to Section 2.B.2.1</p>`;
            return;
          }

          nextStep.innerHTML = `
            <label>Material of Construction:
              <select id="materialASW">
                <option value="">-- Select --</option>
                <option value="carbon">Carbon Steel</option>
                <option value="lowalloy">Low Alloy</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div id="baseRateSectionASW"></div>
          `;

          document.getElementById("materialASW")?.addEventListener("change", () => {
            const mat = document.getElementById("materialASW").value;
            const baseSection = document.getElementById("baseRateSectionASW");
            baseSection.innerHTML = "";

            if (mat === "other") {
              baseSection.innerHTML = `<p>✅ Estimated Corrosion Rate: 0.05 mm/y (Default)</p>`;
              return;
            }

            if (mat === "carbon" || mat === "lowalloy") {
              baseSection.innerHTML = `
                <label>Temperature (°C):
                  <select id="tempASW">
                    <option value="">-- Select --</option>
                    <option value="38">38</option>
                    <option value="52">52</option>
                    <option value="79">79</option>
                    <option value="93">93</option>
                  </select>
                </label>
                <label>pH (from Table 2.B.10.2M):
                  <select id="phFinalASW"><option value="">-- Select Temperature First --</option></select>
                </label>
                <label>Oxygen (ppb): <input type="number" id="oxygenASW" /></label>
                <label>Velocity (m/s): <input type="number" id="velocityASW" step="0.1" /></label>
                <div id="acidSourWaterOutput"></div>
              `;

              const phDropdown = document.getElementById("phFinalASW");
              const tempDropdown = document.getElementById("tempASW");

              tempDropdown?.addEventListener("change", () => {
                const temp = tempDropdown.value;
                if (phDropdown) {
                  phDropdown.innerHTML = `<option value="">-- Select --</option>`;
                  if (temp) {
                    ["4.75", "5.25", "5.75", "6.25", "6.75"].forEach(ph => {
                      phDropdown.innerHTML += `<option value="${ph}">${ph}</option>`;
                    });
                  }
                }
              });
            }
          });
        });
      });
    });
  }
  else if (currentDM === "oxidation") {
    formContainerFull.innerHTML = `
      <label>Material:
        <select id="materialOxidation">
          <option value="">-- Choose --</option>
          <option value="CS">CS</option>
          <option value="1.25Cr">1¼Cr</option>
          <option value="2.25Cr">2¼Cr</option>
          <option value="5Cr">5Cr</option>
          <option value="7Cr">7Cr</option>
          <option value="9Cr">9Cr</option>
          <option value="12Cr">12Cr</option>
          <option value="304 SS">304 SS</option>
          <option value="309 SS">309 SS</option>
          <option value="310 SS/HK">310 SS/HK</option>
          <option value="800 H/HP">800 H/HP</option>
        </select>
      </label>
      <label>Maximum Metal Temperature (°C): 
        <input type="number" id="tempOxidation" />
      </label>
    `;
  }
  else if (currentDM === "HCl Corrosion") {
    formContainerFull.innerHTML = `
      <label>Material:
        <select id="materialHCl">
          <option disabled selected>-- Select --</option>
          <option value="Carbon Steel">Carbon Steel</option>
          <option value="300 Series SS">300 Series SS</option>
          <option value="Alloy 20">Alloy 20</option>
          <option value="Alloy 825">Alloy 825</option>
          <option value="Alloy 625">Alloy 625</option>
          <option value="Alloy C-276">Alloy C-276</option>
          <option value="Alloy B-2">Alloy B-2</option>
          <option value="Alloy 400">Alloy 400</option>
        </select>
      </label>
      <div id="hclDynamicFields"></div>
    `;

    document.getElementById("materialHCl")?.addEventListener("change", (e) => {
      const selected = e.target.value;
      const dynamic = document.getElementById("hclDynamicFields");
      dynamic.innerHTML = "";

      if (selected === "Carbon Steel" || selected === "300 Series SS") {
        dynamic.innerHTML += `
          <label>Do you know the pH?
            <select id="knowPhHCl">
              <option disabled selected>-- Select --</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <div id="phOrClField"></div>
          <div id="tempFieldHCl"></div>
        `;

        document.getElementById("knowPhHCl")?.addEventListener("change", (e2) => {
          const choice = e2.target.value;
          const container = document.getElementById("phOrClField");
          const tempField = document.getElementById("tempFieldHCl");
          container.innerHTML = "";
          tempField.innerHTML = "";

          if (choice === "yes") {
            container.innerHTML = `<label>pH: <input type="number" step="0.1" id="phHCl" /></label>`;
          } else {
            container.innerHTML = `<label>Cl⁻ Concentration (wppm): <input type="number" id="clwppmHCl" /></label>`;
          }
          tempField.innerHTML = `<label>Temperature (°C): <input type="number" id="tempHCl" /></label>`;
        });
      } else {
        dynamic.innerHTML += `
          <label>Cl⁻ Concentration (wt%): <select id="clHCl">
            <option value="0.5">0.50</option>
            <option value="0.75">0.75</option>
            <option value="1.0">1.00</option>
          </select></label>
          <label>Temperature (°C): <input type="number" id="tempHCl" /></label>
        `;

        if (["Alloy B-2", "Alloy 400"].includes(selected)) {
          dynamic.innerHTML += `
            <label>Oxidizing Conditions:
              <select id="oxidHCl">
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>
          `;
        }
      }
    });
  }
  else if (currentDM === "H2SO4 Corrosion") {
    formContainerFull.innerHTML = `
      <label>Material:
        <select id="materialH2SO4">
          <option value="304 SS">304 SS</option>
        </select>
      </label>
      <label>Temperature (°C):
        <select id="tempH2SO4"></select>
      </label>
      <label>Acid Concentration (wt%):
        <select id="concH2SO4"></select>
      </label>
      <label>Velocity (m/s):
        <select id="velH2SO4"></select>
      </label>
    `;

    setupH2SO4Dropdowns("304 SS");

    document.getElementById("materialH2SO4")?.addEventListener("change", (e) => {
      setupH2SO4Dropdowns(e.target.value);
    });
  }
}
window.handleDMSelectChange = handleDMSelectChange;

if (dmSelectFull) {
  dmSelectFull.addEventListener("change", handleDMSelectChange);
}

function setupH2SO4Dropdowns(material = "304 SS") {
  const tempSelect = document.getElementById("tempH2SO4");
  const concSelect = document.getElementById("concH2SO4");
  const velSelect = document.getElementById("velH2SO4");

  if (!tempSelect || !concSelect || !velSelect) return;

  tempSelect.innerHTML = "";
  concSelect.innerHTML = "";
  velSelect.innerHTML = "";

  if (material === "304 SS") {
    const temperatures = [30, 40, 60];
    const concentrations = [2, 3.5, 8, 15, 30, 50, 65, 75, 82, 87, 92.5, 98];
    const velocities = ["0.61", "1.83", "2.13"];

    temperatures.forEach(t => {
      tempSelect.innerHTML += `<option value="${t}">${t} °C</option>`;
    });
    concentrations.forEach(c => {
      concSelect.innerHTML += `<option value="${c}">${c} wt%</option>`;
    });
    velocities.forEach(v => {
      velSelect.innerHTML += `<option value="${v}">${v} m/s</option>`;
    });
  }
}

function updateSulfidationDropdowns() {
  const matEl = document.getElementById("materialSulf");
  const sulfurSelect = document.getElementById("sulfurSulf");
  const tanSelect = document.getElementById("tanSulf");

  if (!sulfurSelect || !tanSelect) return;

  const material = matEl ? matEl.value : "";
  sulfurSelect.innerHTML = "";
  tanSelect.innerHTML = "";

  if (!material) {
    sulfurSelect.innerHTML = "<option value=''>-- Select Material First --</option>";
    tanSelect.innerHTML = "<option value=''>-- Select Material First --</option>";
    return;
  }

  const csSulfurOptions = [0.2, 0.4, 0.6, 1.5, 2.5, 3.0];
  const csTanOptions = [0.3, 0.65, 1.5, 3.0, 4.0];

  const ssSulfurOptions = [0.2, 0.4, 0.8];
  const ssTanOptions = [1.0, 1.5, 3.0, 4.0];

  let sulfurOptions = [];
  let tanOptions = [];

  if (material === "CS") {
    sulfurOptions = csSulfurOptions;
    tanOptions = csTanOptions;
  } else if (material === "SS") {
    sulfurOptions = ssSulfurOptions;
    tanOptions = ssTanOptions;
  }

  sulfurSelect.innerHTML = "<option value=''>-- Select Sulfur % --</option>";
  tanSelect.innerHTML = "<option value=''>-- Select TAN --</option>";

  sulfurOptions.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    sulfurSelect.appendChild(opt);
  });

  tanOptions.forEach(value => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    tanSelect.appendChild(opt);
  });
}
window.updateSulfidationDropdowns = updateSulfidationDropdowns;

function calculateSulfidation() {
  syncCorrosionElements();
  if (calculateBtnFull) {
    calculateBtnFull.click();
  } else if (typeof handleCorrosionCalculate === "function") {
    handleCorrosionCalculate();
  }
}
window.calculateSulfidation = calculateSulfidation;

async function handleCorrosionCalculate() {
  syncCorrosionElements();
  if (!corrosionResultFull) return;
  corrosionResultFull.innerHTML = `<span style="color:#64748b;">⏳ Computing corrosion rate on server...</span>`;

  try {
    let payload = { mechanism: currentDM };

    if (currentDM === "cui") {
      const material = document.getElementById("materialCUI")?.value;
      const temp = parseFloat(document.getElementById("tempCUI")?.value);
      const insulated = document.getElementById("insulatedCUI")?.value;
      const exposed = document.getElementById("exposedCUI")?.value;
      const severity = document.getElementById("severityCUI")?.value;

      if (!material || isNaN(temp) || !insulated || !exposed || !severity) {
        corrosionResultFull.textContent = "❌ Please fill all fields correctly.";
        return;
      }
      payload = { mechanism: "cui", material, temp, insulated, exposed, severity };
    }
    else if (currentDM === "Acid Sour Water Corrosion") {
      const temp = document.getElementById("tempASW")?.value;
      const ph = document.getElementById("phFinalASW")?.value;
      const oxygen = parseFloat(document.getElementById("oxygenASW")?.value);
      const velocity = parseFloat(document.getElementById("velocityASW")?.value);

      if (!temp || !ph || isNaN(oxygen) || isNaN(velocity)) {
        corrosionResultFull.innerHTML = "❌ Please fill all required fields correctly for Acid Sour Water.";
        return;
      }
      payload = { mechanism: "Acid Sour Water Corrosion", tempASW: temp, phFinalASW: ph, oxygenASW: oxygen, velocityASW: velocity };
    }
    else if (currentDM === "sulfidation") {
      const temp = parseFloat(document.getElementById("tempSulf")?.value);
      const sulfur = parseFloat(document.getElementById("sulfurSulf")?.value);
      const tan = parseFloat(document.getElementById("tanSulf")?.value);
      const material = document.getElementById("materialSulf")?.value || "CS";

      if (isNaN(temp) || isNaN(sulfur) || isNaN(tan)) {
        corrosionResultFull.textContent = "❌ Please fill all fields correctly.";
        return;
      }
      payload = { mechanism: "sulfidation", tempSulf: temp, sulfurSulf: sulfur, tanSulf: tan, materialSulf: material };
    }
    else if (currentDM === "oxidation") {
      const material = document.getElementById("materialOxidation")?.value;
      const temp = parseFloat(document.getElementById("tempOxidation")?.value);

      if (!material || isNaN(temp)) {
        corrosionResultFull.textContent = "❌ Please select material and enter valid temperature.";
        return;
      }
      payload = { mechanism: "oxidation", materialOxidation: material, tempOxidation: temp };
    }
    else if (currentDM === "HCl Corrosion") {
      const material = document.getElementById("materialHCl")?.value;
      const temp = parseFloat(document.getElementById("tempHCl")?.value);

      if (!material || isNaN(temp)) {
        corrosionResultFull.textContent = "❌ Please enter material and temperature.";
        return;
      }

      payload = { mechanism: "HCl Corrosion", materialHCl: material, tempHCl: temp };

      if (["Carbon Steel", "300 Series SS"].includes(material)) {
        const knowsPh = document.getElementById("knowPhHCl")?.value;
        if (!knowsPh) {
          corrosionResultFull.textContent = "❌ Please select whether you know the pH.";
          return;
        }
        if (knowsPh === "yes") {
          const ph = parseFloat(document.getElementById("phHCl")?.value);
          if (isNaN(ph)) {
            corrosionResultFull.textContent = "❌ Please enter valid pH value.";
            return;
          }
          payload.phHCl = ph;
        } else {
          const clppm = parseFloat(document.getElementById("clwppmHCl")?.value);
          if (isNaN(clppm)) {
            corrosionResultFull.textContent = "❌ Please enter valid Cl⁻ concentration in ppm.";
            return;
          }
          payload.clwppmHCl = clppm;
        }
      } else {
        const cl = parseFloat(document.getElementById("clHCl")?.value);
        if (isNaN(cl)) {
          corrosionResultFull.textContent = "❌ Please enter valid Cl⁻ concentration.";
          return;
        }
        payload.clHCl = cl;

        if (["Alloy B-2", "Alloy 400"].includes(material)) {
          const oxid = document.getElementById("oxidHCl")?.value;
          if (!oxid) {
            corrosionResultFull.textContent = "❌ Please select oxidizing condition.";
            return;
          }
          payload.oxidHCl = oxid;
        }
      }
    }
    else if (currentDM === "H2SO4 Corrosion") {
      const material = document.getElementById("materialH2SO4")?.value;
      const temp = parseInt(document.getElementById("tempH2SO4")?.value, 10);
      const conc = parseFloat(document.getElementById("concH2SO4")?.value);
      const velocityRange = document.getElementById("velH2SO4")?.value;

      if (!material || isNaN(temp) || isNaN(conc) || !velocityRange) {
        corrosionResultFull.textContent = "❌ Please fill all H₂SO₄ corrosion fields.";
        return;
      }
      payload = { mechanism: "H2SO4 Corrosion", materialH2SO4: material, tempH2SO4: temp, concH2SO4: conc, velH2SO4: velocityRange };
    }
    else if (currentDM === "Alkaline Sour Water Corrosion") {
      const nh4hs = parseFloat(document.getElementById("nh4hs")?.value);
      const velocity = parseFloat(document.getElementById("velocity")?.value);
      const pressureKnown = document.getElementById("pressureKnown")?.value;
      const h2sPressureInput = document.getElementById("h2sPressure");

      if (isNaN(nh4hs) || isNaN(velocity)) {
        corrosionResultFull.textContent = "❌ Please fill NH₄HS and Velocity correctly.";
        return;
      }

      payload = { mechanism: "Alkaline Sour Water Corrosion", nh4hs, velocity, pressureKnown };

      if (pressureKnown === "Yes") {
        const h2sPressure = parseFloat(h2sPressureInput?.value);
        if (isNaN(h2sPressure)) {
          corrosionResultFull.textContent = "❌ Please enter valid H₂S pressure.";
          return;
        }
        payload.h2sPressure = h2sPressure;
      }
    } else {
      corrosionResultFull.textContent = "❌ Please select a valid damage mechanism.";
      return;
    }

    const response = await fetch("/api/corrosion-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      corrosionResultFull.innerHTML = `❌ ${data.message || "Calculation failed."}`;
      return;
    }

    if (data.rate !== null && data.rate !== undefined) {
      corrosionResultFull.innerHTML = `✅ ${data.message}`;
      if (data.chartData && typeof drawChart === "function") {
        drawChart(data.chartData.rates, data.chartData.labels);
      }
    } else {
      corrosionResultFull.innerHTML = `⚠️ ${data.message}`;
    }
  } catch (err) {
    console.error("Corrosion calculation error:", err);
    if (corrosionResultFull) {
      corrosionResultFull.textContent = "⚠️ Error: " + (err.message || String(err));
    }
  }
}
window.handleCorrosionCalculate = handleCorrosionCalculate;

function initCorrosionFullTab() {
  syncCorrosionElements();
  if (dmSelectFull && !dmSelectFull._bound) {
    dmSelectFull._bound = true;
    dmSelectFull.addEventListener("change", handleDMSelectChange);
  }
  if (calculateBtnFull && !calculateBtnFull._bound) {
    calculateBtnFull._bound = true;
    calculateBtnFull.addEventListener("click", handleCorrosionCalculate);
  }
  syncDMSelector();
}
window.initCorrosionFullTab = initCorrosionFullTab;

if (calculateBtnFull) {
  calculateBtnFull.addEventListener("click", handleCorrosionCalculate);
}

document.addEventListener("click", (e) => {
  if (e.target && (e.target.id === "calculateBtnFull" || e.target.closest("#calculateBtnFull"))) {
    handleCorrosionCalculate();
  }
});

function showDewPointStep(container) {
  container.innerHTML = `
    <div class="section">
      <label>Total Pressure (bar): <input type="number" id="totalPressure" /></label>
      <button onclick="calculateDewPointCO2()">Calculate Dew Point (Eq 2.B.25)</button>
      <div id="dewPointResultCO2"></div>
      <div id="tempCheckCO2"></div>
    </div>
  `;
}
window.showDewPointStep = showDewPointStep;

async function calculateDewPointCO2() {
  const P = parseFloat(document.getElementById("totalPressure")?.value);
  if (isNaN(P)) {
    alert("Please enter a valid total pressure.");
    return;
  }
  try {
    const res = await fetch("/api/corrosion-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanism: "co2", action: "dew_point", totalPressure: P })
    });
    const data = await res.json();
    if (data.success) {
      const dew = data.dewPoint;
      document.getElementById("dewPointResultCO2").innerHTML = `<p>Dew Point Temp = <b>${dew.toFixed(2)} °C</b></p>`;
      document.getElementById("tempCheckCO2").innerHTML = `
        <label>Current Temperature (°C): <input type="number" id="tempCO2" /></label>
        <button onclick="checkTempAgainstDew(${dew.toFixed(4)})">Proceed</button>
        <div id="corrosionRateCO2"></div>
      `;
    } else {
      alert(data.message || "Failed to calculate dew point");
    }
  } catch (e) {
    alert("Error calculating dew point: " + e.message);
  }
}
window.calculateDewPointCO2 = calculateDewPointCO2;

function checkTempAgainstDew(dew) {
  const temp = parseFloat(document.getElementById("tempCO2")?.value);
  const container = document.getElementById("corrosionRateCO2");
  container.innerHTML = "";
  if (isNaN(temp)) {
    alert("Please enter current temperature.");
    return;
  }

  if (temp > dew) {
    container.innerHTML = `<p>⚠️ No CO₂ corrosion — Temp (${temp}°C) > Dew Point (${dew.toFixed(2)}°C).</p>`;
    return;
  }

  container.innerHTML = `
    <label>Temperature (°C): <input type="number" id="tempCO2" /></label>
    <label>pH: <input type="number" step="0.1" id="phCO2" /></label>
    <label>CO₂ Partial Pressure (bar): <input type="number" step="0.01" id="pco2CO2" /></label>
    <label>Shear Stress (Pa): <input type="number" id="shearCO2" /></label>
    <button onclick="calculateBaseCO2Rate(${dew.toFixed(4)})">Calculate Base Corrosion Rate (Eq 2.B.26)</button>
    <div id="baseCO2Result"></div>
  `;
}
window.checkTempAgainstDew = checkTempAgainstDew;

async function calculateBaseCO2Rate(dew) {
  const temp = parseFloat(document.getElementById("tempCO2")?.value);
  const ph = parseFloat(document.getElementById("phCO2")?.value);
  const pco2 = parseFloat(document.getElementById("pco2CO2")?.value);
  const shear = parseFloat(document.getElementById("shearCO2")?.value);

  const container = document.getElementById("baseCO2Result");

  if ([temp, ph, pco2, shear].some(v => isNaN(v))) {
    container.innerHTML = "❌ Please fill all required fields.";
    return;
  }

  try {
    const res = await fetch("/api/corrosion-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanism: "co2", tempCO2: temp, phCO2: ph, pco2CO2: pco2, shearCO2: shear, dewPoint: dew })
    });
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `❌ ${data.message}`;
      return;
    }

    if (data.applicable === false) {
      container.innerHTML = `<p>⚠️ ${data.message}</p>`;
      return;
    }

    const baseRate = data.baseRate;
    container.innerHTML = `
      <p>Base Corrosion Rate = <b>${baseRate.toFixed(3)} mm/year</b></p>
      <label>Is there glycol or inhibitor?
        <select id="hasGlycolOrInhibitor">
          <option value="">-- Select --</option>
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </label>
      <div id="adjustmentCO2Area"></div>
    `;

    document.getElementById("hasGlycolOrInhibitor")?.addEventListener("change", (e) => {
      const value = e.target.value;
      const adjustDiv = document.getElementById("adjustmentCO2Area");
      adjustDiv.innerHTML = "";

      if (value === "No") {
        adjustDiv.innerHTML = `<p>✅ Final Corrosion Rate = <b>${baseRate.toFixed(3)} mm/year</b></p>`;
      } else if (value === "Yes") {
        adjustDiv.innerHTML = `
          <label>Inhibitor Efficiency (%): <input type="number" id="inhibitorEff" value="80" /></label>
          <button onclick="calculateFinalCO2RateFromMitigation(${baseRate})">Calculate Final Rate</button>
          <div id="finalCO2Result"></div>
        `;
      }
    });
  } catch (err) {
    container.innerHTML = "❌ Error: " + err.message;
  }
}
window.calculateBaseCO2Rate = calculateBaseCO2Rate;

function calculateFinalCO2RateFromMitigation(baseRate) {
  const eff = parseFloat(document.getElementById("inhibitorEff")?.value) || 0;
  const finalRate = baseRate * (1 - eff / 100);
  document.getElementById("finalCO2Result").innerHTML = `
    <p>✅ Final Corrosion Rate (with ${eff}% inhibition) = <b>${finalRate.toFixed(3)} mm/year</b></p>
  `;
}
window.calculateFinalCO2RateFromMitigation = calculateFinalCO2RateFromMitigation;
