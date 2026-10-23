// ==========================================================================
// MAIN.JS - HYDROPROCESSING UNIT (HCU) & SHARED CORROSION DIAGRAM ENGINE
// ==========================================================================

let selectedDMCode = "1";
let hcuBlinkIntervals = [];

// ── 1. Shared Diagram Fullscreen & Pan/Zoom Controls ──
if (typeof window !== "undefined") {
  // Toggle Fullscreen on any Diagram Modal
  window.toggleDiagramFullscreen = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const btn = modal.querySelector(".diagram-btn-fs");

    if (!document.fullscreenElement) {
      if (modal.requestFullscreen) {
        modal.requestFullscreen().catch(() => {});
      } else if (modal.webkitRequestFullscreen) {
        modal.webkitRequestFullscreen();
      } else if (modal.msRequestFullscreen) {
        modal.msRequestFullscreen();
      }
      if (btn) btn.innerHTML = "🗗 Exit Fullscreen";
      modal.classList.add("is-fullscreen");
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      if (btn) btn.innerHTML = "⛶ Fullscreen";
      modal.classList.remove("is-fullscreen");
    }
  };

  // Fullscreen change listener to sync button labels
  document.addEventListener("fullscreenchange", () => {
    ["processFlowModal", "cduVduModal", "mspModal", "h2uModal"].forEach(id => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const btn = modal.querySelector(".diagram-btn-fs");
      if (document.fullscreenElement === modal) {
        if (btn) btn.innerHTML = "🗗 Exit Fullscreen";
        modal.classList.add("is-fullscreen");
      } else {
        if (btn) btn.innerHTML = "⛶ Fullscreen";
        modal.classList.remove("is-fullscreen");
      }
    });
  });

  // Toggle Sidebar collapse
  window.toggleDiagramSidebar = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.toggle("sidebar-collapsed");
    const btn = modal.querySelector(".diagram-sidebar-toggle-btn");
    if (btn) {
      const isCollapsed = modal.classList.contains("sidebar-collapsed");
      btn.innerHTML = isCollapsed ? "↔ Show Sidebar" : "↔ Hide Sidebar";
    }
  };

  // Zoom In / Zoom Out for any Diagram
  window.zoomDiagram = function(modalId, factor) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const svg = modal.querySelector(".drawing svg");
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    const vb = svg.viewBox.baseVal;
    const oldW = vb.width;
    const oldH = vb.height;
    const newW = oldW * (1 / factor);
    const newH = oldH * (1 / factor);
    if (newW > 25000 || newW < 20) return;
    vb.x += (oldW - newW) / 2;
    vb.y += (oldH - newH) / 2;
    vb.width = newW;
    vb.height = newH;
  };

  // Reset Zoom / Fit to Screen
  window.resetDiagramZoom = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const svg = modal.querySelector(".drawing svg");
    if (!svg || !svg.viewBox || !svg.viewBox.baseVal) return;
    const initial = svg.__initialViewBox;
    if (initial) {
      const vb = svg.viewBox.baseVal;
      vb.x = initial.x;
      vb.y = initial.y;
      vb.width = initial.width;
      vb.height = initial.height;
    }
  };

  // Filter Mechanisms list in Sidebar
  window.filterDiagramMechanisms = function(input, listId) {
    const query = (input.value || "").toLowerCase().trim();
    const list = document.getElementById(listId);
    if (!list) return;
    list.querySelectorAll("li").forEach(li => {
      const text = (li.textContent || "").toLowerCase();
      const dm = (li.getAttribute("data-dm") || "").toLowerCase();
      const match = text.includes(query) || dm === query;
      li.style.display = match ? "flex" : "none";
    });
  };

  // Helper for normalizing DM strings
  function normalizeDMString(str) {
    if (!str) return "";
    return String(str)
      .replace(/^(\d+)[\s\-\.–—:]*/, "")
      .toLowerCase()
      .replace(/[/\\_–—\-]/g, " ")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\b(and|or|the|of|in|for|s)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Unified Damage Mechanism Resolver
  window.resolveAPI571DamageMechanism = function(codeOrName) {
    if (!codeOrName) return null;
    const raw = String(codeOrName).trim();
    if (!raw) return null;

    const catalog = (window.data && window.data["Damage Mechanism"]) 
      ? window.data["Damage Mechanism"] 
      : {};

    const codeMatch = raw.match(/^(\d+)/) || raw.match(/(\d+)/);
    const targetCode = codeMatch ? String(parseInt(codeMatch[1], 10)) : null;
    const normTarget = normalizeDMString(raw);

    // 1. Direct match in window.data["Damage Mechanism"]
    if (catalog[raw]) {
      return { name: raw, ...catalog[raw] };
    }

    // 2. Loop through catalog
    for (const [key, v] of Object.entries(catalog)) {
      if (!v || typeof v !== "object") continue;
      const vCode = v.code ? String(v.code).trim() : (v.id ? String(v.id).trim() : null);
      const normKey = normalizeDMString(key);
      const normVName = normalizeDMString(v.name || "");

      // Check numeric code match
      if (targetCode && vCode === targetCode) {
        return { name: v.name || key, ...v };
      }

      // Check normalized name match
      if (normTarget && normTarget.length > 2) {
        if (normKey === normTarget || normKey.includes(normTarget) || normTarget.includes(normKey) ||
            normVName === normTarget || normVName.includes(normTarget) || normTarget.includes(normVName)) {
          return { name: v.name || key, ...v };
        }
      }
    }

    // 3. Fallback to window.damageMechanisms
    if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
      if (window.damageMechanisms[raw] && typeof window.damageMechanisms[raw] === "object") {
        const item = window.damageMechanisms[raw];
        return { name: item.name || raw, ...item };
      }

      for (const [key, v] of Object.entries(window.damageMechanisms)) {
        if (!v || typeof v !== "object") continue;
        const vCode = v.code ? String(v.code).trim() : (v.id ? String(v.id).trim() : null);
        const normKey = normalizeDMString(key);
        const normVName = normalizeDMString(v.name || "");

        if (targetCode && (vCode === targetCode || key === targetCode)) {
          return { name: v.name || key, ...v };
        }

        if (normTarget && normTarget.length > 2) {
          if (normKey === normTarget || normKey.includes(normTarget) || normTarget.includes(normKey) ||
              normVName === normTarget || normVName.includes(normTarget) || normTarget.includes(normVName)) {
            return { name: v.name || key, ...v };
          }
        }
      }
    }

    return null;
  };

  // ── 2. Unified API 571 Damage Mechanism Details Modal Renderer ──
  window.renderAPI571DetailsModal = async function(dmCodeOrName, modalId, contentId, titleId) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    const titleEl = titleId ? document.getElementById(titleId) : null;
    if (!modal || !content) return;

    // Display details modal immediately so UI is always responsive
    modal.style.display = "flex";

    // Ensure API 571 catalog data is loaded if missing
    if ((!window.data || !window.data["Damage Mechanism"] || Object.keys(window.data["Damage Mechanism"]).length === 0) && typeof window.loadDamageMechanismsData === "function") {
      try {
        await new Promise(resolve => window.loadDamageMechanismsData(resolve));
      } catch (e) {
        console.warn("Async load damage mechanisms data:", e);
      }
    }

    // Resolve mechanism data via unified resolver
    let dmData = window.resolveAPI571DamageMechanism(dmCodeOrName);

    // Fallback object ensuring details modal always has structured content
    if (!dmData) {
      dmData = {
        name: String(dmCodeOrName),
        description: "API 571 Damage Mechanism technical details for mechanism item '" + dmCodeOrName + "'.",
        affectedMaterials: "Carbon Steel, Low Alloy Steels (Cr-Mo, P91), Austenitic Stainless Steels, and Nickel-base alloys.",
        criticalFactors: "Operating temperature, process fluid velocity, concentration, partial pressures, and metallurgical heat treatment.",
        affectedUnits: "Process piping headers, heat exchangers, reactors, separators, and furnace tubes.",
        appearance: "Morphology, microstructural damage, wall thinning, pitting, or cracking.",
        mitigation: "Material upgrade, process operating window (OW) controls, chemical inhibition.",
        inspection: "Ultrasonic Testing (UT), Radiographic Testing (RT), Magnetic Particle Testing (MT), and Visual Inspection (VT)."
      };
    }

    const dmName = dmData.name || String(dmCodeOrName);
    if (titleEl) {
      titleEl.textContent = dmName;
    }

    // Save active name for "Open in API 571 Explorer"
    modal.setAttribute("data-current-dm", dmName);

    // Standard API 571 Tabs definition
    const tabDefs = [
      { id: "desc", label: "📖 Description & Scope", field: "description" },
      { id: "materials", label: "🧱 Affected Materials", field: "affectedMaterials" },
      { id: "factors", label: "⚠️ Critical Factors", field: "criticalFactors" },
      { id: "units", label: "🏭 Affected Units", field: "affectedUnits" },
      { id: "morphology", label: "🔬 Appearance & Morphology", field: "appearance" },
      { id: "mitigation", label: "🛡️ Prevention & Mitigation", field: "mitigation" },
      { id: "inspection", label: "🔎 Inspection Methods", field: "inspection" },
      { id: "temperature", label: "🌡️ Temp Limits & Comparison", field: "temperatureComparison" },
      { id: "image", label: "🖼️ Reference Diagram", field: "imagePath" }
    ];

    // Filter available tabs with actual data
    const availableTabs = tabDefs.filter(t => {
      if (t.id === "image") return !!dmData.imagePath;
      return !!dmData[t.field] && String(dmData[t.field]).trim().length > 0;
    });

    if (availableTabs.length === 0) {
      availableTabs.push({ id: "desc", label: "📖 Description", field: "description" });
    }

    const activeTabId = availableTabs[0].id;

    // Build Tab Buttons
    const tabsNavHtml = availableTabs.map(t => `
      <button type="button" class="diagram-details-tab-btn ${t.id === activeTabId ? 'active' : ''}" data-tab="${t.id}">
        ${t.label}
      </button>
    `).join("");

    // Build Tab Panes
    const panesHtml = availableTabs.map(t => {
      let innerContent = "";
      if (t.id === "image") {
        innerContent = `
          <div class="diagram-details-image-box">
            <img src="${dmData.imagePath}" alt="${dmName} reference diagram" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
            <p style="margin-top: 10px; font-size: 13px; color: #64748b; font-weight: 600;">API 571 Reference Figure / Damage Morphology</p>
          </div>
        `;
      } else {
        const rawVal = dmData[t.field];
        if (!rawVal || String(rawVal).trim().length === 0) {
          innerContent = "<em>No data recorded for this section.</em>";
        } else if (typeof window.formatMechanismContent === "function") {
          innerContent = window.formatMechanismContent(rawVal);
        } else {
          innerContent = rawVal;
        }
      }
      return `
        <div class="diagram-details-pane ${t.id === activeTabId ? 'active' : ''}" id="pane_${modalId}_${t.id}">
          <div class="diagram-details-pane-content">
            ${innerContent}
          </div>
        </div>
      `;
    }).join("");

    content.innerHTML = `
      <div class="diagram-details-tabs-bar">
        ${tabsNavHtml}
      </div>
      <div class="diagram-details-panes-container">
        ${panesHtml}
      </div>
    `;

    // Bind tab clicks
    content.querySelectorAll(".diagram-details-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tabId = btn.getAttribute("data-tab");
        content.querySelectorAll(".diagram-details-tab-btn").forEach(b => b.classList.remove("active"));
        content.querySelectorAll(".diagram-details-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const targetPane = document.getElementById(`pane_${modalId}_${tabId}`);
        if (targetPane) targetPane.classList.add("active");
      });
    });

    // Ensure display state
    modal.style.display = "flex";
  };

  // Direct open API 571 details modal for any unit
  window.openAPI571Details = function(codeOrName, unitType) {
    let targetUnit = unitType;
    if (!targetUnit) {
      if (document.getElementById("mspModal")?.style.display === "block") targetUnit = "msp";
      else if (document.getElementById("cduVduModal")?.style.display === "block") targetUnit = "cduvdu";
      else if (document.getElementById("h2uModal")?.style.display === "block") targetUnit = "h2u";
      else targetUnit = "hcu";
    }

    let searchTarget = codeOrName;

    // If a numeric index or short string like "5" or "3" was passed, inspect sidebar for full name
    if (/^\d+$/.test(String(codeOrName).trim())) {
      let listId = "dm-list";
      if (targetUnit === "cduvdu") listId = "cduvdu-dm-list";
      else if (targetUnit === "msp") listId = "msp-dm-list";
      else if (targetUnit === "h2u") listId = "h2u-dm-list";

      const listEl = document.getElementById(listId);
      if (listEl) {
        const itemEl = listEl.querySelector(`li[data-dm="${String(codeOrName).trim()}"]`);
        if (itemEl) {
          const nameSpan = itemEl.querySelector(".dm-item-name");
          if (nameSpan && nameSpan.textContent.trim()) {
            searchTarget = nameSpan.textContent.trim();
          }
        }
      }
    }

    if (targetUnit === "cduvdu") {
      window.openCDUVDUDetailsModal(searchTarget);
    } else if (targetUnit === "msp") {
      window.openMSPDetailsModal(searchTarget);
    } else if (targetUnit === "h2u") {
      window.openH2UDetailsModal(searchTarget);
    } else {
      window.openDetailsModal(searchTarget);
    }
  };

  // Standalone Global API 571 Damage Mechanism Detail Renderer for Main Dashboard Explorer
  window.showMechanismDetails = function(mechName, infoObj) {
    const mechanismDetailsContainer = document.getElementById("mechanismDetailsContainer");
    const selectedTitle = document.getElementById("selectedMechanismTitle");
    if (!mechanismDetailsContainer) return;

    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    mechanismDetailsContainer.style.display = "block";
    if (selectedTitle) {
      selectedTitle.textContent = mechName;
      selectedTitle.style.display = "block";
    }

    let dataObj = infoObj;
    if (!dataObj || (!dataObj.description && !dataObj.affectedMaterials)) {
      if (typeof window.resolveAPI571DamageMechanism === "function") {
        dataObj = window.resolveAPI571DamageMechanism(mechName);
      }
      if (!dataObj && window.damageMechanisms && window.damageMechanisms[mechName]) {
        dataObj = window.damageMechanisms[mechName];
      }
    }

    if (!dataObj) {
      dataObj = {
        name: mechName,
        description: "API 571 Damage Mechanism technical details for " + mechName + ".",
        affectedMaterials: "Carbon Steel, Low Alloy Steels, Stainless Steels, and Nickel-base alloys.",
        criticalFactors: "Operating temperature, process fluid velocity, concentration, and metallurgical heat treatment.",
        affectedUnits: "Process piping, heat exchangers, reactors, separators, and pressure vessels.",
        appearance: "Visual appearance and metallurgical morphology.",
        mitigation: "Material upgrade, process operating window (OW) controls, chemical treatment.",
        inspection: "Ultrasonic Testing (UT), Radiographic Testing (RT), Magnetic Particle Testing (MT), and Visual Inspection (VT)."
      };
    }

    const fmt = window.formatMechanismContent || (x => x);

    const desc = fmt(dataObj.description || "No description provided for this damage mechanism.");
    const mats = fmt(dataObj.affectedMaterials || dataObj.materials || "No materials specified.");
    const factors = fmt(dataObj.criticalFactors || dataObj.factors || "No critical factors specified.");
    const units = fmt(dataObj.affectedUnits || dataObj.units || "No affected units specified.");
    const app = fmt(dataObj.appearance || dataObj.morphology || "No appearance information specified.");
    const mit = fmt(dataObj.mitigation || dataObj.prevention || "No prevention/mitigation information specified.");
    const insp = fmt(dataObj.inspection || "No inspection guidelines specified.");
    const temp = fmt(dataObj.temperatureComparison || dataObj.temperature || "No temperature comparison specified.");
    const img = dataObj.imagePath || dataObj.image || "";

    mechanismDetailsContainer.innerHTML = `
      <div class="tabs">
        <button class="tab-button active" onclick="showTab('description')">Description</button>
        <button class="tab-button" onclick="showTab('materials')">Affected Materials</button>
        <button class="tab-button" onclick="showTab('factors')">Critical Factors</button>
        <button class="tab-button" onclick="showTab('units')">Affected Units</button>
        <button class="tab-button" onclick="showTab('appearance')">Morphology</button>
        <button class="tab-button" onclick="showTab('mitigation')">Prevention</button>
        <button class="tab-button" onclick="showTab('inspection')">Inspection</button>
        <button class="tab-button" onclick="showTab('temperature')">Temperature Comparison</button>
        <button class="tab-button" onclick="showTab('image')">Image</button>
      </div>

      <div id="description" class="tab-content visible mechanism-info" style="display: block !important;"><strong>Description:</strong><div class="mech-info-body">${desc}</div></div>
      <div id="materials" class="tab-content mechanism-info" style="display: none;"><strong>Materials:</strong><div class="mech-info-body">${mats}</div></div>
      <div id="factors" class="tab-content mechanism-info" style="display: none;"><strong>Factors:</strong><div class="mech-info-body">${factors}</div></div>
      <div id="units" class="tab-content mechanism-info" style="display: none;"><strong>Units:</strong><div class="mech-info-body">${units}</div></div>
      <div id="appearance" class="tab-content mechanism-info" style="display: none;"><strong>Morphology:</strong><div class="mech-info-body">${app}</div></div>
      <div id="mitigation" class="tab-content mechanism-info" style="display: none;"><strong>Mitigation:</strong><div class="mech-info-body">${mit}</div></div>
      <div id="inspection" class="tab-content mechanism-info" style="display: none;"><strong>Inspection:</strong><div class="mech-info-body">${insp}</div></div>
      <div id="temperature" class="tab-content mechanism-info" style="display: none;"><strong>Temperature:</strong><div class="mech-info-body">${temp}</div></div>
      <div id="image" class="tab-content mechanism-info" style="display: none;">
        <strong>Damage Mechanism Reference Image:</strong><br>
        ${ img ? `<img src="${img}" alt="Mechanism Image" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 6px; margin-top: 8px;">` : "<p style='color: #888; font-style: italic; margin-top: 8px;'>No reference image available for this damage mechanism.</p>" }
      </div>
    `;

    if (typeof window.showTab === "function") {
      window.showTab("description");
    }
  };

  // Jump from Details Modal to the main dashboard API 571 Explorer
  window.openInFullAPI571ExplorerFromModal = function(detailsModalId) {
    const detailsModal = document.getElementById(detailsModalId);
    let dmName = detailsModal ? detailsModal.getAttribute("data-current-dm") : null;
    if (!dmName && detailsModal) {
      const titleEl = detailsModal.querySelector(".diagram-details-title") || detailsModal.querySelector("h2");
      if (titleEl) dmName = titleEl.textContent.trim();
    }

    // Close all diagram modals & details modals
    if (typeof closeDetailsModal === "function") closeDetailsModal();
    if (typeof closeCDUVDUDetailsModal === "function") closeCDUVDUDetailsModal();
    if (typeof closeMSPDetailsModal === "function") closeMSPDetailsModal();
    if (typeof closeH2UDetailsModal === "function") closeH2UDetailsModal();

    if (typeof closeProcessFlowModal === "function") closeProcessFlowModal();
    if (typeof closeCDUVDUModal === "function") closeCDUVDUModal();
    if (typeof closeMSPModal === "function") closeMSPModal();
    if (typeof closeH2UModal === "function") closeH2UModal();

    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    if (!dmName) return;

    // Resolve full mechanism data
    const dmObj = (typeof window.resolveAPI571DamageMechanism === "function") 
      ? window.resolveAPI571DamageMechanism(dmName) 
      : null;

    const targetName = dmObj ? (dmObj.name || dmName) : dmName;

    // Direct open API 571 Explorer mechanism details
    if (typeof window.showMechanismDetails === "function") {
      window.showMechanismDetails(targetName, dmObj);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };
}

// ── 3. HCU Process Flow Logic ──
function initProcessFlow() {
  const modal = document.getElementById("processFlowModal");
  if (!modal) return;

  const svgContainer = document.getElementById("svgContainer");
  if (!svgContainer) return;

  // Load SVG if not loaded
  if (!svgContainer.querySelector("svg")) {
    fetch("HCU-Model-Final.svg")
      .then(res => res.text())
      .then(data => {
        svgContainer.innerHTML = data;
        setupHCUSVGLogic(modal, svgContainer);
      })
      .catch(err => {
        console.error("Failed to load HCU SVG:", err);
      });
  } else {
    setupHCUSVGLogic(modal, svgContainer);
  }
}

function setupHCUSVGLogic(modal, svgContainer) {
  const svgRoot = svgContainer.querySelector("svg");
  if (!svgRoot) return;

  const dmListItems = modal.querySelectorAll("#dm-list li");
  const viewBox = svgRoot.viewBox.baseVal;

  // Set viewBox if not defined
  if (!svgRoot.getAttribute("viewBox")) {
    const vb = svgRoot.getBBox();
    svgRoot.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  // Preserve initial viewBox for Reset Zoom
  if (!svgRoot.__initialViewBox) {
    svgRoot.__initialViewBox = {
      x: viewBox.x,
      y: viewBox.y,
      width: viewBox.width,
      height: viewBox.height
    };
  }

  // Bind click logic to each DM in sidebar
  dmListItems.forEach(item => {
    if (item.__hcuBound) return;
    item.__hcuBound = true;

    item.addEventListener("click", () => {
      const dmCode = item.getAttribute("data-dm").trim();
      selectHCUDamageMechanism(dmCode, item);
    });
  });

  // Bind click logic to SVG diagram text & tspan nodes
  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    if (txt.__hcuTxtBound) return;
    txt.__hcuTxtBound = true;
    const txtContent = (txt.textContent || "").replace(/\s+/g, '').trim();
    if (!txtContent) return;

    let matchedItem = null;
    let matchedDmCode = null;
    dmListItems.forEach(item => {
      const dmCode = (item.getAttribute("data-dm") || "").trim();
      if (txtContent === dmCode || txtContent === `DM${dmCode}` || txtContent === `DM-${dmCode}` || txtContent.includes(`(${dmCode})`)) {
        matchedItem = item;
        matchedDmCode = dmCode;
      }
    });

    if (matchedDmCode) {
      txt.style.cursor = "pointer";
      txt.addEventListener("click", (e) => {
        e.stopPropagation();
        selectHCUDamageMechanism(matchedDmCode, matchedItem);
        if (typeof window.openAPI571Details === "function") {
          window.openAPI571Details(matchedDmCode, "hcu");
        }
      });
    }
  });

  // Select default if none selected
  if (!selectedDMCode) selectedDMCode = "1";
  const defaultItem = modal.querySelector(`#dm-list li[data-dm="${selectedDMCode}"]`) || dmListItems[0];
  if (defaultItem) {
    selectHCUDamageMechanism(defaultItem.getAttribute("data-dm").trim(), defaultItem, false);
  }

  // Setup Pan & Zoom handlers
  if (!svgRoot.__panZoomBound) {
    svgRoot.__panZoomBound = true;
    let isPanning = false, startX, startY;

    svgRoot.addEventListener("mousedown", (e) => {
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      svgRoot.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", () => {
      isPanning = false;
      svgRoot.style.cursor = "grab";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      const dx = (e.clientX - startX) * (viewBox.width / svgRoot.clientWidth);
      const dy = (e.clientY - startY) * (viewBox.height / svgRoot.clientHeight);
      viewBox.x -= dx;
      viewBox.y -= dy;
      startX = e.clientX;
      startY = e.clientY;
    });

    svgRoot.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const scale = e.deltaY < 0 ? 1 / zoomFactor : zoomFactor;
      const newWidth = viewBox.width * scale;
      const newHeight = viewBox.height * scale;
      if (newWidth > 25000 || newWidth < 20) return;
      viewBox.x += (viewBox.width - newWidth) / 2;
      viewBox.y += (viewBox.height - newHeight) / 2;
      viewBox.width = newWidth;
      viewBox.height = newHeight;
    });
  }
}

function selectHCUDamageMechanism(dmCode, itemEl, triggerBlink = true) {
  selectedDMCode = dmCode;
  const modal = document.getElementById("processFlowModal");
  if (!modal) return;

  const dmListItems = modal.querySelectorAll("#dm-list li");
  dmListItems.forEach(li => li.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const itemName = itemEl ? (itemEl.querySelector(".dm-item-name")?.textContent || dmCode) : dmCode;

  // Update Top Toolbar Badge
  const activeBadge = document.getElementById("hcuActiveBadge");
  if (activeBadge) activeBadge.textContent = `🎯 Active DM: ${dmCode} - ${itemName}`;

  // Clear previous blinking
  hcuBlinkIntervals.forEach(interval => clearInterval(interval));
  hcuBlinkIntervals = [];

  const svgRoot = modal.querySelector("#svgContainer svg");
  if (!svgRoot) return;

  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    txt.style.fill = "";
    txt.style.stroke = "";
    txt.style.strokeWidth = "";
    txt.style.filter = "";
  });

  if (!triggerBlink) return;

  // Pulse & Highlight on SVG
  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    const cleanText = txt.textContent.replace(/\s+/g, '').trim();
    if (cleanText === dmCode) {
      let visible = true;
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        if (ticks > 16) {
          clearInterval(interval);
          txt.style.fill = "";
          txt.style.stroke = "";
          txt.style.strokeWidth = "";
          txt.style.filter = "";
          return;
        }
        txt.style.fill = visible ? "#ef4444" : "#00ffff";
        txt.style.stroke = visible ? "#00ffff" : "#ef4444";
        txt.style.strokeWidth = "3px";
        txt.style.filter = `drop-shadow(0 0 6px ${visible ? "#00ffff" : "#ef4444"}) drop-shadow(0 0 12px ${visible ? "#ef4444" : "#00ffff"})`;
        visible = !visible;
      }, 500);
      hcuBlinkIntervals.push(interval);
    }
  });
}

window.clearMainBlinkIntervals = function() {
  hcuBlinkIntervals.forEach(i => clearInterval(i));
  hcuBlinkIntervals = [];
  const svgRoot = document.querySelector("#svgContainer svg");
  if (svgRoot) {
    svgRoot.querySelectorAll("text, tspan").forEach(txt => {
      txt.style.fill = "";
      txt.style.stroke = "";
      txt.style.strokeWidth = "";
      txt.style.filter = "";
    });
  }
};

// Open Process Flow Modal
function openProcessFlowModal() {
  const modal = document.getElementById("processFlowModal");
  if (modal) modal.style.display = "block";
  initProcessFlow();
}

// Close Process Flow Modal
function closeProcessFlowModal() {
  const modal = document.getElementById("processFlowModal");
  if (modal) modal.style.display = "none";
  window.clearMainBlinkIntervals();
  if (document.fullscreenElement === modal && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

// Open Details Modal for HCU
function openDetailsModal(overrideCode) {
  const targetCode = overrideCode || selectedDMCode || "1";
  window.renderAPI571DetailsModal(targetCode, "detailsModal", "detailsContent", "detailsModalTitle");
}

// Close Details Modal for HCU
function closeDetailsModal() {
  const modal = document.getElementById("detailsModal");
  if (modal) modal.style.display = "none";
}

// Global exposure
if (typeof window !== "undefined") {
  window.initProcessFlow = initProcessFlow;
  window.openProcessFlowModal = openProcessFlowModal;
  window.closeProcessFlowModal = closeProcessFlowModal;
  window.openDetailsModal = openDetailsModal;
  window.closeDetailsModal = closeDetailsModal;

  // ESC key closes modals smoothly
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const detailsModal = document.getElementById("detailsModal");
      if (detailsModal && detailsModal.style.display === "flex") {
        closeDetailsModal();
        return;
      }
      const processFlowModal = document.getElementById("processFlowModal");
      if (processFlowModal && processFlowModal.style.display === "block") {
        closeProcessFlowModal();
      }
    }
  });

  // Auto-init on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initProcessFlow();
    });
  } else {
    initProcessFlow();
  }
}
