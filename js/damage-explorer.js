// 🔍 API 571 Damage Mechanism Explorer Logic

const categoryList = document.getElementById("categoryList");
const mechanismDetailsContainer = document.getElementById("mechanismDetailsContainer");
const selectedTitle = document.getElementById("selectedMechanismTitle");
const searchBox = document.getElementById("searchBox");

window.clearAllBlinkIntervals = function() {
  if (typeof window.clearMainBlinkIntervals === "function") window.clearMainBlinkIntervals();
  if (typeof window.clearCduvduBlinkIntervals === "function") window.clearCduvduBlinkIntervals();
  if (typeof window.clearMspBlinkIntervals === "function") window.clearMspBlinkIntervals();
  if (typeof window.clearH2uBlinkIntervals === "function") window.clearH2uBlinkIntervals();
};

function hideAllMainPanels() {
  window.hideAllMainPanels = hideAllMainPanels;
  document.body.classList.remove("admin-mode-active");
  document.body.classList.remove("adm-windowed-mode");
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  if (mechanismDetailsContainer) {
    mechanismDetailsContainer.innerHTML = "";
    mechanismDetailsContainer.style.display = "none";
  }
  if (selectedTitle) selectedTitle.style.display = "none";

  if (typeof hideWelcomePanel === "function") {
    hideWelcomePanel();
  } else {
    const welcome = document.getElementById("welcomePanel");
    if (welcome) {
      welcome.classList.add("is-hidden");
      welcome.style.removeProperty("display");
      welcome.style.setProperty("display", "none", "important");
    }
  }

  if (window.InjectionMixingViz && typeof window.InjectionMixingViz.pause === "function") {
    window.InjectionMixingViz.pause();
  }
  if (window.PeriodicTable && typeof window.PeriodicTable.pauseBohrAnimation === "function") {
    window.PeriodicTable.pauseBohrAnimation();
  }

  if (typeof window.clearAllBlinkIntervals === "function") {
    window.clearAllBlinkIntervals();
  }
}
window.hideAllMainPanels = hideAllMainPanels;

function setActiveLink(link) {
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  if (link) link.classList.add("active-link");
}

function toPlainText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return (tmp.textContent || tmp.innerText || "").toLowerCase();
}
window.toPlainText = toPlainText;

function formatMechanismContent(content) {
  if (!content) return "";
  if (typeof content !== "string") return String(content);

  if (/<(ul|ol|li|p|div|table|h[1-6]|blockquote)/i.test(content)) {
    return content;
  }

  const rawLines = content.split(/\r?\n/);
  let html = "";
  let inUl = false;
  let inOl = false;

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (!line) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
      continue;
    }

    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const bulletMatch = line.match(/^([•\-\*\+])\s+(.+)$/);
    const numberMatch = line.match(/^(\d+)[\.\)\-]\s+(.+)$/);

    if (bulletMatch) {
      if (inOl) { html += "</ol>"; inOl = false; }
      if (!inUl) { html += '<ul class="mechanism-list adm-bullet-list">'; inUl = true; }
      html += `<li>${bulletMatch[2]}</li>`;
    } else if (numberMatch) {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (!inOl) { html += '<ol class="mechanism-list adm-numbered-list">'; inOl = true; }
      html += `<li>${numberMatch[2]}</li>`;
    } else {
      if (inUl) { html += "</ul>"; inUl = false; }
      if (inOl) { html += "</ol>"; inOl = false; }
      html += `<p class="adm-formatted-p">${line}</p>`;
    }
  }

  if (inUl) html += "</ul>";
  if (inOl) html += "</ol>";

  return html || content;
}
window.formatMechanismContent = formatMechanismContent;

function showTab(id) {
  document.querySelectorAll(".mechanism-info").forEach(div => {
    div.classList.remove("visible");
    div.style.setProperty("display", "none", "important");
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.add("visible");
    target.style.setProperty("display", "block", "important");
  }

  document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`.tab-button[onclick="showTab('${id}')"]`);
  if (activeBtn) activeBtn.classList.add("active");
}
window.showTab = showTab;

function loadCategories(data) {
  const categoryListEl = document.getElementById("categoryList");
  if (!categoryListEl) return;

  const existingDamageCat = categoryListEl.querySelector("li.category-toggle:not([id^='rbac_cat_']), li[data-rbac-module='damageExplorer']");
  const firstInjectedCat = categoryListEl.querySelector("li[id^='rbac_cat_']");
  const wasExpanded = Boolean(existingDamageCat && existingDamageCat.querySelector("ul.mechanisms")?.style.display === "block");

  window.__isApplyingSidebarLayout = true;
  try {
    Object.entries(data).forEach(([category, mechanisms]) => {
      const categoryItem = document.createElement("li");
      categoryItem.classList.add("category-toggle");
      categoryItem.setAttribute("data-rbac-module", "damageExplorer");

      const layoutCfg = (typeof window.getActiveLayoutConfig === "function" ? window.getActiveLayoutConfig() : null) || window.layoutConfig || (window.adminPanel && window.adminPanel.layoutConfig) || null;
      const modConfig = layoutCfg && Array.isArray(layoutCfg.sidebarModules)
        ? layoutCfg.sidebarModules.find(m => m && ((typeof window.normalizeSidebarModuleId === "function" ? window.normalizeSidebarModuleId(m.id) : m.id) === "damageExplorer" || m.id === "damageMechanisms"))
        : null;
      const customIcon = modConfig && modConfig.icon ? String(modConfig.icon).trim() : "🛡️";
      let customLabel = modConfig && modConfig.label ? String(modConfig.label).trim() : "API 571 Damage Mechanisms";
      if (customIcon && customLabel.startsWith(customIcon)) {
        customLabel = customLabel.substring(customIcon.length).trim();
      }
      const displayTitle = (customIcon ? (customIcon + " ") : "") + customLabel;

      const isHidden = (modConfig && modConfig.visible === false) || (layoutCfg && typeof window.isModuleLayoutVisible === "function" && !window.isModuleLayoutVisible("damageExplorer", layoutCfg));
      const hasRbac = !window.RBAC || typeof window.RBAC.hasModuleAccess !== "function" || window.RBAC.isSuperAdmin || window.RBAC.role === "admin" || window.RBAC.hasModuleAccess("damageExplorer");
      if (isHidden || !hasRbac) {
        categoryItem.style.setProperty("display", "none", "important");
        categoryItem.setAttribute("data-rbac-hidden", "true");
      }

      const span = document.createElement("span");
      span.classList.add("category");
      span.innerHTML = `<span class="arrow" style="margin-right: 6px; font-size: 11px; display: inline-block;">${wasExpanded ? "▾" : "▸"}</span><span class="category-title">${displayTitle}</span>`;
      categoryItem.appendChild(span);

      const mechList = document.createElement("ul");
      mechList.classList.add("mechanisms");
      mechList.style.display = wasExpanded ? "block" : "none";

    if (category === "Damage Mechanism") {
      const inlineInput = document.createElement("input");
      inlineInput.type = "text";
      inlineInput.placeholder = "Filter";
      inlineInput.className = "category-inline-filter";
      inlineInput.style.cssText = [
        "margin-left:8px",
        "padding:4px 6px",
        "font-size:12px",
        "width:160px",
        "border-radius:4px",
        "border:1px solid #ccc",
        "vertical-align:middle",
        "box-sizing:border-box",
        "display:none"
      ].join(";");

      const iconBtn = document.createElement("span");
      iconBtn.className = "category-filter-icon";
      iconBtn.setAttribute("role", "button");
      iconBtn.setAttribute("tabindex", "0");
      iconBtn.setAttribute("aria-label", "Toggle filter");
      iconBtn.setAttribute("aria-expanded", "false");
      iconBtn.style.cssText = [
        "margin-left:8px",
        "vertical-align:middle",
        "cursor:pointer",
        "display:inline-flex",
        "align-items:center",
        "justify-content:center",
        "width:20px",
        "height:20px",
        "box-sizing:content-box"
      ].join(";");

      iconBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" fill="currentColor"/>
        </svg>`;

      span.appendChild(iconBtn);
      span.appendChild(inlineInput);

      const regexMap = {
        pitting: /\bpit(?:s|ting)?\b/i,
        "erosion-corrosion": /\berosion[-\s]?corrosion\b/i,
        localized: /\blocali[sz]ed\b/i,
        thinning: /\bthinn?ing\b/i
      };

      inlineInput.addEventListener("input", function () {
        const q = String(this.value || "").trim().toLowerCase();
        const items = Array.from(mechList.querySelectorAll("li"));
        const isSpecial = Object.keys(regexMap).some(k => q === k);
        const re = isSpecial ? regexMap[q] : null;

        let anyVisible = false;
        items.forEach(li => {
          const hay = (li.dataset.search || li.textContent).toLowerCase();
          const match = q === "" ? true : (isSpecial ? re.test(hay) : hay.includes(q));
          li.style.display = match ? "list-item" : "none";
          if (match) anyVisible = true;
        });

        mechList.style.display = q === "" ? "none" : (anyVisible ? "block" : "none");
      });

      inlineInput.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      const toggleInput = (open) => {
        const willOpen = typeof open === "boolean" ? open : (inlineInput.style.display === "none");
        if (willOpen) {
          inlineInput.style.display = "inline-block";
          iconBtn.setAttribute("aria-expanded", "true");
          mechList.style.display = "block";
          setTimeout(() => inlineInput.focus(), 0);
        } else {
          inlineInput.value = "";
          inlineInput.dispatchEvent(new Event('input', { bubbles: true }));
          inlineInput.style.display = "none";
          iconBtn.setAttribute("aria-expanded", "false");
          mechList.style.display = "none";
        }
      };

      iconBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleInput();
      });

      iconBtn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleInput();
        }
      });
    }

    Object.entries(mechanisms).forEach(([mech, info]) => {
      const mechItem = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = mech;

      const searchableBlob = [
        mech,
        toPlainText(info.description),
        toPlainText(info.affectedMaterials),
        toPlainText(info.criticalFactors),
        toPlainText(info.affectedUnits),
        toPlainText(info.appearance),
        toPlainText(info.mitigation),
        toPlainText(info.inspection),
        toPlainText(info.temperatureComparison)
      ].join(" ");
      mechItem.dataset.search = searchableBlob;

      link.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveLink(link);
        showMechanismDetails(mech, info);
        if (typeof window.closeMobileSidebar === "function") {
          window.closeMobileSidebar();
        }
      };

      mechItem.appendChild(link);
      mechList.appendChild(mechItem);
    });

    span.setAttribute("data-accordion-trigger", "true");
    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");
    span.addEventListener("click", function (e) {
      if (e.target && e.target.closest && (e.target.closest(".category-filter-icon") || e.target.closest(".category-inline-filter"))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const isBlock = (mechList.style.display === "block");
      mechList.style.display = isBlock ? "none" : "block";
      const arrow = span.querySelector(".arrow");
      if (arrow) {
        arrow.textContent = isBlock ? "▸" : "▾";
      }
    });

    categoryItem.appendChild(mechList);

      // Atomically replace existing placeholder to prevent shifting or jitter
      if (existingDamageCat && existingDamageCat.parentNode) {
        existingDamageCat.replaceWith(categoryItem);
      } else if (firstInjectedCat) {
        categoryListEl.insertBefore(categoryItem, firstInjectedCat);
      } else {
        categoryListEl.appendChild(categoryItem);
      }
    });
  } finally {
    window.__isApplyingSidebarLayout = false;
  }

  if (typeof window.applyPublishedSidebarLayout === "function") {
    window.applyPublishedSidebarLayout();
  } else if (window.RBAC && typeof window.RBAC.applySidebarVisibility === "function") {
    window.RBAC.applySidebarVisibility();
  }

  if (typeof window.ensureAllSidebarArrows === "function") {
    window.ensureAllSidebarArrows();
  }
}
function showMechanismDetails(mech, info) {
  const mechanismDetailsContainer = document.getElementById("mechanismDetailsContainer");
  const selectedTitle = document.getElementById("selectedMechanismTitle");
  if (!mech) return;

  hideAllMainPanels();
  hideWelcomePanel();

  if (mechanismDetailsContainer) mechanismDetailsContainer.style.display = "block";
  if (selectedTitle) {
    selectedTitle.textContent = mech;
    selectedTitle.style.display = "block";
  }

  let dataObj = info;
  if (!dataObj || !dataObj.description) {
    if (window.damageMechanisms && window.damageMechanisms[mech]) {
      dataObj = window.damageMechanisms[mech];
    } else if (window.data && window.data["Damage Mechanism"] && window.data["Damage Mechanism"][mech]) {
      dataObj = window.data["Damage Mechanism"][mech];
    } else if (typeof window.getDamageMechanismByName === "function") {
      dataObj = window.getDamageMechanismByName(mech) || info;
    }
  }

  if (!dataObj) {
    dataObj = { name: mech, description: "API 571 Damage Mechanism." };
  }

  const fmt = window.formatMechanismContent || formatMechanismContent;

  const desc = fmt(dataObj.description || "No description provided for this damage mechanism.");
  const mats = fmt(dataObj.affectedMaterials || "No materials specified.");
  const factors = fmt(dataObj.criticalFactors || "No critical factors specified.");
  const units = fmt(dataObj.affectedUnits || "No affected units specified.");
  const app = fmt(dataObj.appearance || "No appearance information specified.");
  const mit = fmt(dataObj.mitigation || "No prevention/mitigation information specified.");
  const insp = fmt(dataObj.inspection || "No inspection guidelines specified.");
  const temp = fmt(dataObj.temperatureComparison || "No temperature comparison specified.");
  const normMechKey = String(mech || "").toLowerCase().trim();
  const clientMicrographMap = {
    "cui": "image/cui.png",
    "corrosion under insulation": "image/cui.png",
    "corrosion under insulation (cui)": "image/cui.png",
    "htha": "image/htha.png",
    "high temperature hydrogen attack": "image/htha.png",
    "high-temperature hydrogen attack (htha)": "image/htha.png",
    "sulfidation": "image/sulfidation.png",
    "amine scc": "image/AmineSCC.png",
    "amine stress corrosion cracking": "image/AmineSCC.png",
    "amine stress corrosion cracking (amine scc)": "image/AmineSCC.png",
    "ammonia stress corrosion cracking": "image/AmmoniaSCC.png",
    "atmospheric corrosion": "image/AtmosphericCorrosion.png",
    "boiler water / steam condensate corrosion": "image/BoilerWaterSteamCorrosion.png",
    "boiler water and steam condensate corrosion": "image/BoilerWaterSteamCorrosion.png",
    "brine corrosion": "image/BrineCorrosion.png",
    "co2 corrosion": "image/CO₂_Corrosion.png",
    "co2 corrosion (sweet corrosion)": "image/CO₂_Corrosion.png",
    "sweet corrosion": "image/CO₂_Corrosion.png",
    "carbonate stress corrosion cracking": "image/CarbonateSCC.png",
    "caustic corrosion": "image/CausticCorrosion.png",
    "erosion / erosion-corrosion": "image/Erosion_Erosion_Corrosion.png",
    "erosion corrosion": "image/Erosion_Erosion_Corrosion.png",
    "high-temp h2/h2s corrosion": "image/High_temperature_H₂_H₂S_Corrosion.png",
    "high-temperature h2/h2s corrosion": "image/High_temperature_H₂_H₂S_Corrosion.png",
    "high-temperature h₂/h₂s corrosion": "image/High_temperature_H₂_H₂S_Corrosion.png",
    "hydrogen embrittlement": "image/Hydrogen_Embrittlement.png",
    "hydrogen embrittlement (he)": "image/Hydrogen_Embrittlement.png",
    "nitriding": "image/Nitriding.png",
    "soil corrosion": "image/Soil.png",
    "temper embrittlement": "image/TemperEmbrittlement.png",
    "carburization": "image/carburization.png",
    "flue gas dew point corrosion": "image/combustion.png",
    "combustion": "image/combustion.png",
    "fuel ash corrosion": "image/fuel_ash_corrosion.png",
    "metal dusting": "image/metal_dusting.png",
    "naphthenic acid corrosion": "image/nac.png",
    "naphthenic acid corrosion (nac)": "image/nac.png",
    "nac": "image/nac.png",
    "oxidation": "image/oxidation.png",
    "high-temperature oxidation": "image/oxidation.png",
    "sulfuric acid corrosion": "image/sulfuric-acid-corrosion.png"
  };
  const imagePath = dataObj.imagePath || clientMicrographMap[normMechKey] || (typeof getMechanismMicrograph === "function" ? getMechanismMicrograph(mech, dataObj.code) : "");

  if (mechanismDetailsContainer) {
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
        ${ imagePath ? `<img src="${imagePath}" loading="lazy" decoding="async" alt="${mech} Micrograph" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 6px; margin-top: 8px;" onerror="this.parentElement.innerHTML='<p class=\\'text-muted\\'>No reference micrograph available.</p>';" />` : "<p class='text-muted' style='color: #888; font-style: italic; margin-top: 8px;'>No reference micrograph available.</p>" }
      </div>
    `;
  }
  if (typeof showTab === "function") showTab('description');
  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.showMechanismDetails = showMechanismDetails;

window.loadCategories = loadCategories;

function openDamageExplorerCard() {
  if (window.RBAC && !window.RBAC.isSuperAdmin && window.RBAC.role !== "admin" && !window.RBAC.hasModuleAccess("damageExplorer")) {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "Access Restricted",
        text: "You do not have permission to access API 571 Damage Mechanisms. Please contact your administrator.",
        confirmButtonColor: "#2563eb"
      });
    } else {
      alert("Access Restricted: You do not have permission to access API 571 Damage Mechanisms.");
    }
    return;
  }
  if (typeof openMobileSidebar === "function") {
    openMobileSidebar();
  } else if (typeof window.openMobileSidebar === "function") {
    window.openMobileSidebar();
  }
  const catList = document.getElementById("categoryList");
  if (catList) {
    const firstCat = catList.querySelector(".category");
    if (firstCat) firstCat.click();
  }
}
window.openDamageExplorerCard = openDamageExplorerCard;

function handleDashboardSearch(queryVal) {
  const query = (queryVal || "").toLowerCase().trim();
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const topLevelItems = Array.from(categoryList.children).filter(el => el.tagName === "LI");

  if (!query) {
    // ── CLEAR SEARCH: Restore original tree state ──
    topLevelItems.forEach(topLi => {
      // Respect RBAC / Layout visibility
      if (topLi.getAttribute("data-rbac-hidden") === "true") {
        topLi.style.setProperty("display", "none", "important");
      } else {
        topLi.style.removeProperty("display");
      }

      // Reset all sub-lists & sub-items inside
      const allSubLists = topLi.querySelectorAll("ul");
      allSubLists.forEach(ul => {
        ul.style.display = "none";
      });

      const allDescLis = topLi.querySelectorAll("li");
      allDescLis.forEach(li => {
        if (li.getAttribute("data-rbac-hidden") === "true") {
          li.style.setProperty("display", "none", "important");
        } else {
          li.style.removeProperty("display");
        }
      });

      // Restore tool sub-group headers in Tools
      const toolHeaders = topLi.querySelectorAll("[onclick*='toggleToolSubGroup']");
      toolHeaders.forEach(th => {
        th.style.removeProperty("display");
      });

      // Restore arrow indicators
      const arrows = topLi.querySelectorAll(".arrow, .tool-arrow");
      arrows.forEach(arr => {
        arr.textContent = "▸";
      });
    });
    return;
  }

  // ── ACTIVE SEARCH: Recursive Hierarchical Evaluation ──
  // Helper to test if a leaf element text or search metadata matches query
  const matchesQuery = (el) => {
    if (!el) return false;
    const searchBlob = el.dataset?.search || "";
    if (searchBlob && searchBlob.toLowerCase().includes(query)) return true;
    
    // Direct label text (ignoring child lists if any)
    const directLabel = el.querySelector(".category-title, a, span:not(.arrow):not(.tool-arrow)");
    if (directLabel && directLabel.textContent.toLowerCase().includes(query)) return true;

    return el.textContent.toLowerCase().includes(query);
  };

  topLevelItems.forEach(topLi => {
    // If top item is hidden by RBAC/layout, stay hidden
    if (topLi.getAttribute("data-rbac-hidden") === "true") {
      topLi.style.setProperty("display", "none", "important");
      return;
    }

    const parentHeader = topLi.querySelector(".category");
    const parentTitle = parentHeader ? parentHeader.querySelector(".category-title")?.textContent || parentHeader.textContent : "";
    const parentMatches = parentTitle.toLowerCase().includes(query);

    // Check if Tools category with custom div sub-groups
    const isToolsCategory = topLi.id === "rbac_cat_tools";

    if (isToolsCategory) {
      let anyGroupMatched = false;
      const groupHeaders = topLi.querySelectorAll("[onclick*='toggleToolSubGroup']");

      groupHeaders.forEach(gh => {
        const ghTitle = gh.textContent.toLowerCase();
        const ghMatches = ghTitle.includes(query);
        const subUl = gh.nextElementSibling;
        const subLis = subUl ? Array.from(subUl.querySelectorAll("li")) : [];

        let anySubMatched = false;
        subLis.forEach(sli => {
          if (sli.getAttribute("data-rbac-hidden") === "true") {
            sli.style.setProperty("display", "none", "important");
            return;
          }
          const sText = sli.textContent.toLowerCase();
          const sliMatches = ghMatches || parentMatches || sText.includes(query);
          sli.style.display = sliMatches ? "" : "none";
          if (sliMatches) anySubMatched = true;
        });

        if (ghMatches || anySubMatched || parentMatches) {
          gh.style.display = "";
          if (subUl) subUl.style.display = "block";
          const gArrow = gh.querySelector(".tool-arrow");
          if (gArrow) gArrow.textContent = "▾";
          anyGroupMatched = true;
        } else {
          gh.style.display = "none";
          if (subUl) subUl.style.display = "none";
        }
      });

      const topUl = topLi.querySelector("ul");
      if (parentMatches || anyGroupMatched) {
        topLi.style.removeProperty("display");
        if (topUl) topUl.style.display = "block";
        const arrow = topLi.querySelector(".arrow");
        if (arrow) arrow.textContent = "▾";
      } else {
        topLi.style.display = "none";
        if (topUl) topUl.style.display = "none";
      }
      return;
    }

    // Standard recursive hierarchy: Level 1 (Category) -> Level 2 (Subcategory / Leaf) -> Level 3 (Child / Leaf)
    // Evaluate all subcategories inside this topLi
    const subcategoryLis = Array.from(topLi.querySelectorAll("li[data-rbac-subcategory], li.subcategory-item"));
    let anyChildMatched = false;

    subcategoryLis.forEach(subcatLi => {
      if (subcatLi.getAttribute("data-rbac-hidden") === "true") {
        subcatLi.style.setProperty("display", "none", "important");
        return;
      }

      const subcatHeader = subcatLi.querySelector(".subcategory, .category");
      const subcatTitle = subcatHeader ? subcatHeader.textContent.toLowerCase() : "";
      const subcatMatches = parentMatches || subcatTitle.includes(query);

      const subcatUl = subcatLi.querySelector("ul");
      const grandChildLis = subcatUl ? Array.from(subcatUl.querySelectorAll("li")) : [];

      let anyGrandChildMatched = false;
      grandChildLis.forEach(gLi => {
        if (gLi.getAttribute("data-rbac-hidden") === "true") {
          gLi.style.setProperty("display", "none", "important");
          return;
        }
        const gMatches = subcatMatches || matchesQuery(gLi);
        gLi.style.display = gMatches ? "" : "none";
        if (gMatches) anyGrandChildMatched = true;
      });

      if (subcatMatches || anyGrandChildMatched) {
        subcatLi.style.removeProperty("display");
        if (subcatUl) subcatUl.style.display = "block";
        const subArrow = subcatLi.querySelector(".arrow");
        if (subArrow) subArrow.textContent = "▾";
        anyChildMatched = true;
      } else {
        subcatLi.style.display = "none";
        if (subcatUl) subcatUl.style.display = "none";
      }
    });

    // Also evaluate any direct leaf LIs under topLi that are NOT inside subcategories
    const directUl = topLi.querySelector("ul.mechanisms, ul");
    if (directUl) {
      const directLis = Array.from(directUl.children).filter(child => 
        child.tagName === "LI" && 
        !child.hasAttribute("data-rbac-subcategory") && 
        !child.classList.contains("subcategory-item")
      );

      directLis.forEach(dLi => {
        if (dLi.getAttribute("data-rbac-hidden") === "true") {
          dLi.style.setProperty("display", "none", "important");
          return;
        }
        const dMatches = parentMatches || matchesQuery(dLi);
        dLi.style.display = dMatches ? "" : "none";
        if (dMatches) anyChildMatched = true;
      });
    }

    // If top category itself matched OR any of its children / grand-children matched:
    if (parentMatches || anyChildMatched) {
      topLi.style.removeProperty("display");
      if (directUl) directUl.style.display = "block";
      const arrow = topLi.querySelector(".arrow");
      if (arrow) arrow.textContent = "▾";
    } else {
      topLi.style.display = "none";
      if (directUl) directUl.style.display = "none";
    }
  });
}
window.handleDashboardSearch = handleDashboardSearch;

if (searchBox) {
  searchBox.addEventListener("input", function () {
    handleDashboardSearch(this.value);
  });
}

document.addEventListener("input", function (e) {
  if (e.target && e.target.id === "searchBox") {
    handleDashboardSearch(e.target.value);
  }
});

// 🚀 Bridge from PFD process flow diagram modals directly into full API 571 Damage Mechanism Explorer
function openInFullAPI571ExplorerFromModal(modalId) {
  if (typeof window.closeProcessFlowModal === "function") window.closeProcessFlowModal();
  if (typeof window.closeCDUVDUModal === "function") window.closeCDUVDUModal();
  if (typeof window.closeMSPModal === "function") window.closeMSPModal();
  if (typeof window.closeH2UModal === "function") window.closeH2UModal();
  if (typeof window.closeDetailsModal === "function") window.closeDetailsModal();
  if (typeof window.closeCDUVDUDetailsModal === "function") window.closeCDUVDUDetailsModal();
  if (typeof window.closeMSPDetailsModal === "function") window.closeMSPDetailsModal();
  if (typeof window.closeH2UDetailsModal === "function") window.closeH2UDetailsModal();

  let titleEl = null;
  if (modalId === "cduvdu-detailsModal") titleEl = document.getElementById("cduvdu-detailsModalTitle");
  else if (modalId === "msp-detailsModal") titleEl = document.getElementById("msp-detailsModalTitle");
  else if (modalId === "h2u-detailsModal") titleEl = document.getElementById("h2u-detailsModalTitle");
  else titleEl = document.getElementById("detailsModalTitle");

  const mechName = titleEl ? titleEl.textContent.trim() : "";

  if (typeof window.openDamageExplorerCard === "function") {
    window.openDamageExplorerCard();
  }

  if (mechName && typeof window.showMechanismDetails === "function") {
    const mech = typeof window.getDamageMechanismByName === "function"
      ? window.getDamageMechanismByName(mechName)
      : (window.data && window.data["Damage Mechanism"] ? window.data["Damage Mechanism"][mechName] : null);
    if (mech) {
      setTimeout(() => {
        window.showMechanismDetails(mech.code || mechName, mech);
      }, 60);
    }
  }
}
window.openInFullAPI571ExplorerFromModal = openInFullAPI571ExplorerFromModal;

