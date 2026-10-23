let counts_AIC = { vh: 0, h: 0, m: 0, l: 0 };

// ✅ Equivalence Factor Table
const equivalenceFactors_AIC = {
  vh: { vh: 1, h: 0.333, m: 0.111, l: 0.037 },
  h: { vh: 3, h: 1, m: 0.333, l: 0.111 },
  m: { vh: 9, h: 3, m: 1, l: 0.333 },
  l: { vh: 27, h: 9, m: 3, l: 1 }
};

// ✅ Inspection Method Options based on Equipment + Type + Category
const methods_AIC = {
  piping: {
    internal: {
      intrusive: [
        { name: "100% CML UT Scanning (Internal)", level: "vh" },
        { name: "50% CML UT (Tees, Elbows)", level: "h" }
      ],
      "non-intrusive": [
        { name: "Spot UT (25% Circuits)", level: "m" },
        { name: "External Visual Only", level: "l" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  vessel: {
    internal: {
      intrusive: [
        { name: "VH_100% Internal Visual", level: "vh" },
        { name: "H_50% Internal Visual", level: "h" },
        { name: "M_25% to 70% Internal Visual", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_4 UT/head, 8 UT/course, 1 UT on 50% nozzles", level: "h" },
        { name: "M_2 UT/head, 4 UT/course, 1 UT on 50% nozzles", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  exchanger: {
    internal: {
      intrusive: [
        { name: "VH_100% Internal Visual", level: "vh" },
        { name: "H_50% Internal Visual", level: "h" },
        { name: "M_25% to 70% Internal Visual", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_4 UT/head, 8 UT/course, 1 UT on 50% nozzles", level: "h" },
        { name: "M_2 UT/head, 4 UT/course, 1 UT on 50% nozzles", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  airfin: {
    internal: {
      intrusive: [
        { name: "VH_100% header plug removal + EC/RFEC/IRIS", level: "vh" },
        { name: "H_70% header plug removal + EC/RFEC/IRIS", level: "h" },
        { name: "M_50% header plug removal + EC/RFEC/IRIS", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_8 UT/header box", level: "h" },
        { name: "M_4 UT/header box", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "VH_Full CUI UT Mapping", level: "vh" },
        { name: "H_CUI Spot UT", level: "h" }
      ],
      "non-cui": [
        { name: "M_Visual + Spot UT", level: "m" },
        { name: "L_Visual Only", level: "l" }
      ]
    }
  }
};

// ✅ Update Category Dropdown
function toggleCategoryDropdown_AIC() {
  const inspectionType = document.getElementById("inspectionType_AIC").value;
  const categoryDropdown = document.getElementById("inspectionCategory_AIC");

  categoryDropdown.innerHTML = "<option value=''>-- Select --</option>";

  if (inspectionType === "internal") {
    categoryDropdown.innerHTML += "<option value='intrusive'>Intrusive Inspection</option>";
    categoryDropdown.innerHTML += "<option value='non-intrusive'>Non-Intrusive Inspection</option>";
  } else if (inspectionType === "external") {
    categoryDropdown.innerHTML += "<option value='cui'>CUI</option>";
    categoryDropdown.innerHTML += "<option value='non-cui'>Non-CUI</option>";
  }

  // Refresh method dropdown to match updated category
  toggleMethodDropdown_AIC();
}

// ✅ Update Method Dropdown
function toggleMethodDropdown_AIC() {
  const eqType = document.getElementById("equipmentType_AIC").value;
  const insType = document.getElementById("inspectionType_AIC").value;
  const insCategory = document.getElementById("inspectionCategory_AIC").value;
  const dropdown = document.getElementById("inspectionMethod_AIC");
  dropdown.innerHTML = "<option value=''>-- Select Method --</option>";

  if (methods_AIC[eqType] && methods_AIC[eqType][insType] && methods_AIC[eqType][insType][insCategory]) {
    methods_AIC[eqType][insType][insCategory].forEach(m => {
      dropdown.innerHTML += `<option value="${m.level}">${m.name}</option>`;
    });
  }
}

// ✅ Add Inspection Row and Update Counts
function addInspection_AIC() {
  const year = document.getElementById("inspectionYear_AIC").value;
  const eqType = document.getElementById("equipmentType_AIC").value;
  const insType = document.getElementById("inspectionType_AIC").value;
  const insCategory = document.getElementById("inspectionCategory_AIC").value;
  const methodSelect = document.getElementById("inspectionMethod_AIC");
  const methodName = methodSelect.selectedOptions[0]?.text;
  const level = methodSelect.value;

  if (!year || !eqType || !insType || !insCategory || !level) {
    alert("Please fill all fields!");
    return;
  }

  // const vhFactors = { vh: 1, h: 0.333, m: 0.111, l: 0.037 };  ❌ remove
counts_AIC[level]++;


  const tableBody = document.querySelector("#inspectionTable_AIC tbody");
  const existingRows = tableBody.querySelectorAll("tr").length;

  // ✅ First row — force Equivalent = 1.000
 let baseAIC = "-";
if (counts_AIC.vh > 0) baseAIC = "vh";
else if (counts_AIC.h > 0) baseAIC = "h";
else if (counts_AIC.m > 0) baseAIC = "m";
else if (counts_AIC.l > 0) baseAIC = "l";

const factors = equivalenceFactors_AIC[baseAIC];
let vhEq = (existingRows === 0) ? 1 : factors[level];


  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${year}</td>
    <td>${eqType.toUpperCase()}</td>
    <td>${insType}</td>
    <td>${insCategory}</td>
    <td>${methodName}</td>
    <td>${level.toUpperCase()}</td>
    <td class="equivalent-cell">${vhEq.toFixed(3)}</td>
    <td><button class="delete-row-btn">Delete</button></td>
  `;
  tableBody.appendChild(row);

  row.querySelector(".delete-row-btn").addEventListener("click", function () {
    counts_AIC[level] = Math.max(0, counts_AIC[level] - 1);
    row.remove();
    recalculateTableEquivalents();
    calculateInspection_AIC();
  });

  // ✅ If now we have more than 1 row, reset all Equivalents to actual factors
  if (tableBody.querySelectorAll("tr").length > 1) {
    recalculateTableEquivalents();
  }

  calculateInspection_AIC();
}

// 🔄 Function to reset all Equivalent values in table
function recalculateTableEquivalents() {
  // Base AIC level decide karo
  let baseAIC = "-";
  if (counts_AIC.vh > 0) baseAIC = "vh";
  else if (counts_AIC.h > 0) baseAIC = "h";
  else if (counts_AIC.m > 0) baseAIC = "m";
  else if (counts_AIC.l > 0) baseAIC = "l";

  if (baseAIC === "-") return; // koi data nahi hai

  // Base ke hisab se correct factors lo
  const factors = equivalenceFactors_AIC[baseAIC];

  // Table me har row ka Equivalent update karo
  document.querySelectorAll("#inspectionTable_AIC tbody tr").forEach(row => {
    const level = row.children[5].textContent.toLowerCase();
    row.querySelector(".equivalent-cell").textContent = factors[level].toFixed(3);
  });
}




// ✅ Calculate Equivalent Inspections & AIC
function calculateInspection_AIC() {
  let baseAIC = "-";
  if (counts_AIC.vh > 0) baseAIC = "vh";
  else if (counts_AIC.h > 0) baseAIC = "h";
  else if (counts_AIC.m > 0) baseAIC = "m";
  else if (counts_AIC.l > 0) baseAIC = "l";

  if (baseAIC === "-") {
    document.getElementById("totalEquivalent_AIC").innerText = "-";
    document.getElementById("aggregateInspections_AIC").innerText = "-";
    document.getElementById("aicValue_AIC").innerText = "-";
    document.querySelectorAll(".triangle .section").forEach(el => el.classList.remove("active"));
    return;
  }

  const ef = equivalenceFactors_AIC[baseAIC];
  const totalEquivalent =
    (ef.vh * counts_AIC.vh) +
    (ef.h * counts_AIC.h) +
    (ef.m * counts_AIC.m) +
    (ef.l * counts_AIC.l);

  const ANI = Math.floor(totalEquivalent);

  document.querySelectorAll(".triangle .section").forEach(el => el.classList.remove("active"));
  document.getElementById("tri-" + baseAIC + "_AIC").classList.add("active");

  document.getElementById("totalEquivalent_AIC").innerText = totalEquivalent.toFixed(3) + " (" + baseAIC.toUpperCase() + " Base)";
  document.getElementById("aggregateInspections_AIC").innerText = ANI;
  document.getElementById("aicValue_AIC").innerText = baseAIC.toUpperCase();
}

// ✅ Reset Data
function resetData_AIC() {
  counts_AIC = { vh: 0, h: 0, m: 0, l: 0 };
  document.querySelector("#inspectionTable_AIC tbody").innerHTML = "";
  document.querySelectorAll(".triangle .section").forEach(el => el.classList.remove("active"));
  document.getElementById("totalEquivalent_AIC").innerText = "-";
  document.getElementById("aggregateInspections_AIC").innerText = "-";
  document.getElementById("aicValue_AIC").innerText = "-";
  document.getElementById("inspectionYear_AIC").value = "";
  document.getElementById("equipmentType_AIC").value = "";
  document.getElementById("inspectionType_AIC").value = "";
  document.getElementById("inspectionCategory_AIC").value = "";
  document.getElementById("inspectionMethod_AIC").innerHTML = "<option value=''>-- Select Equipment First --</option>";
}
