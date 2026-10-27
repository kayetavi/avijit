
  // ⚙️ Settings Menu & Welcome Panel Delegators (Canonical implementation in dashboard-shell.js)
  function toggleSettingsMenu(e) {
    if (typeof window.toggleSettingsMenu === "function" && window.toggleSettingsMenu !== toggleSettingsMenu) {
      return window.toggleSettingsMenu(e);
    }
    const dropdown = document.getElementById("dropdownContent");
    if (dropdown) dropdown.classList.toggle("show");
  }
  window.toggleSettingsMenu = window.toggleSettingsMenu || toggleSettingsMenu;

  function hideWelcomePanel() {
    if (typeof window.hideWelcomePanel === "function" && window.hideWelcomePanel !== hideWelcomePanel) {
      return window.hideWelcomePanel();
    }
    const panel = document.getElementById("welcomePanel");
    if (panel) {
      panel.classList.add("is-hidden");
      panel.style.setProperty("display", "none", "important");
    }
  }
  window.hideWelcomePanel = window.hideWelcomePanel || hideWelcomePanel;

  function showWelcomePanel() {
    if (typeof window.showWelcomePanel === "function" && window.showWelcomePanel !== showWelcomePanel) {
      return window.showWelcomePanel();
    }
    const panel = document.getElementById("welcomePanel");
    if (panel) {
      panel.classList.remove("is-hidden");
      panel.style.setProperty("display", "flex", "important");
    }
  }
  window.showWelcomePanel = window.showWelcomePanel || showWelcomePanel;  


function openHelp() {
  try {
    const helpWin = window.open("help.html", "_blank");
    if (!helpWin || helpWin.closed || typeof helpWin.closed === "undefined") {
      window.location.href = "help.html";
    }
  } catch (e) {
    window.location.href = "help.html";
  }
}
window.openHelp = openHelp;
    
    
  function toggleCategory(element) {  
    if (!element) return;
    let ul = element.nextElementSibling;  
    while (ul && ul.tagName !== "UL") {
      ul = ul.nextElementSibling;
    }
    if (!ul) {
      const parentLi = element.closest("li");
      if (parentLi) ul = parentLi.querySelector("ul.mechanisms, ul");
    }
    if (!ul) return;

    const isExpanded = (ul.style.display === "block");  
    ul.style.display = isExpanded ? "none" : "block";  
    
    // Toggle arrow indicator inside category or subcategory element
    let arrow = element.querySelector(".arrow, .tool-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "arrow";
      element.insertBefore(arrow, element.firstChild);
    }
    arrow.textContent = isExpanded ? "▸" : "▾";
    // Collapsing or expanding category in sidebar MUST NEVER close the sidebar drawer
    // or reset the main panel view!
  }  
  window.toggleCategory = toggleCategory;
  
// 🧼 Central helper to hide damage mechanism container when navigating to any module
function hideMechanismDetails() {
  const m = document.getElementById("mechanismDetailsContainer");
  if (m) {
    m.innerHTML = "";
    m.style.setProperty("display", "none", "important");
  }
  const st = document.getElementById("selectedMechanismTitle");
  if (st) {
    st.style.setProperty("display", "none", "important");
  }
}
window.hideMechanismDetails = hideMechanismDetails;

function showCriteriaTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("a571-criteriaTab");
  if (el) {
    el.style.display = "block";  
    if (typeof window.a571_init === "function") window.a571_init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1051", function () {
      const loaded = document.getElementById("a571-criteriaTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      if (typeof window.a571_init === "function") window.a571_init();
    });
  }
}  

function showCorrosionTab() {  
  showCorrosionFullTab();
}  

function showCorrosionFullTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("corrosionFullTab");
  const init = () => {
    if (typeof window.initCorrosionFullTab === "function") window.initCorrosionFullTab();
    if (typeof corrosionChart !== "undefined" && corrosionChart.data) corrosionChart.update();
  };
  if (el) {
    el.style.display = "block";  
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1053", function () {
      const loaded = document.getElementById("corrosionFullTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
}  

// ✅ NEW FUNCTION: Show Representative Fluid Tab  
function showFluidSelectorTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("fluidSelectorTab");
  if (el) {
    el.style.display = "block";  
    if (typeof window.initFluidSelector === "function") window.initFluidSelector();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1054", function () {
      const loaded = document.getElementById("fluidSelectorTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      if (typeof window.initFluidSelector === "function") window.initFluidSelector();
    });
  }
}  

function showInventoryTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("inventoryTab");
  const init = () => {
    if (typeof window.initInventory === "function") window.initInventory();
    if (typeof window.initBulkUpload === "function") window.initBulkUpload();
  };
  if (el) {
    el.style.display = "block";  
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1055", function () {
      const loaded = document.getElementById("inventoryTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
}  

function showRemainingLifeTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("remainingLifeTab");
  if (el) {
    el.style.display = "block";  
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1070", function () {
      const loaded = document.getElementById("remainingLifeTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
    });
  }
}  
function showINSPECTIONCONFIDENCETab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const el = document.getElementById("inspectionconfidenceTab");
  if (el) {
    el.style.display = "block";  
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1056", function () {
      const loaded = document.getElementById("inspectionconfidenceTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
    });
  }
}  
function showASMEB31_3Tab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("ASMEB31_3Tab");
  const init = () => {
    if (typeof window.initB313 === "function") window.initB313();
    if (typeof window.initB313AutoStressFields === "function") window.initB313AutoStressFields(false);
  };
  if (tab) {
    tab.style.display = "block";  
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1040", function () {
      const loaded = document.getElementById("ASMEB31_3Tab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
}  
window.showASMEB31_3Tab = showASMEB31_3Tab;  

function showSimplePipingTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("simplePipingTab");
  const init = () => {
    if (typeof window.initSimplePiping === "function") window.initSimplePiping();
    if (typeof window.initSimpleAutoStressFields === "function") window.initSimpleAutoStressFields(false);
  };
  if (tab) {
    tab.style.display = "block";  
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1041", function () {
      const loaded = document.getElementById("simplePipingTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
}
window.showSimplePipingTab = showSimplePipingTab;

function showASMESECTIONVIIIDIV1Tab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("ASMESECTIONVIIIDIV1Tab");
  if (tab) {
    tab.style.display = "block";  
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1042", function () {
      const loaded = document.getElementById("ASMESECTIONVIIIDIV1Tab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
    });
  }
}
function showpipeThicknessTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("pipeThicknessTab");
  if (tab) {
    tab.style.display = "block";
    if (typeof window.initPipeData883 === "function") {
      window.initPipeData883();
    }
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1043", function () {
      const loadedTab = document.getElementById("pipeThicknessTab");
      if (loadedTab) loadedTab.style.display = "block";
      hideWelcomePanel();
      if (typeof window.initPipeData883 === "function") {
        window.initPipeData883();
      }
    });
  }
}
window.showpipeThicknessTab = showpipeThicknessTab;

function showStructuralThicknessTab() {
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  hideWelcomePanel();
  const tab = document.getElementById("structuralThicknessTab");
  if (tab) {
    tab.style.display = "block";
    if (typeof window.initStructuralThickness === "function") {
      window.initStructuralThickness(true);
    }
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1044", function () {
      const loadedTab = document.getElementById("structuralThicknessTab");
      if (loadedTab) loadedTab.style.display = "block";
      hideWelcomePanel();
      if (typeof window.initStructuralThickness === "function") {
        window.initStructuralThickness(true);
      }
    });
  }
}
window.showStructuralThicknessTab = showStructuralThicknessTab;

function showTOXIC_CALCULATIONTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("TOXIC_CALCULATIONTab");
  if (tab) {
    tab.style.display = "block";  
    if (typeof window.initToxicCalculator === "function") window.initToxicCalculator();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1057", function () {
      const loaded = document.getElementById("TOXIC_CALCULATIONTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      if (typeof window.initToxicCalculator === "function") window.initToxicCalculator();
    });
  }
}  

function showCORROSION_CALCULATIONTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("CORROSION_CALCULATIONTab");
  const init = () => {
    if (window.RBIApp && typeof window.RBIApp.render === "function") {
      window.RBIApp.render();
    }
  };
  if (tab) {
    tab.style.display = "block";  
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1030", function () {
      const loaded = document.getElementById("CORROSION_CALCULATIONTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
} 
function showcof_calculatorTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  const tab = document.getElementById("cof_calculatorTab");
  if (tab) {
    tab.style.display = "block";  
    if (typeof window.initCOF === "function") window.initCOF();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1058", function () {
      const loaded = document.getElementById("cof_calculatorTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      if (typeof window.initCOF === "function") window.initCOF();
    });
  }
}  
function showQPOF_calculatorTab() {  
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  hideWelcomePanel();  
  let tab = document.getElementById("QPOF_calculatorTab");
  if (!tab) {
    const mount = document.getElementById("dynamicModuleMount") || document.querySelector(".content") || document.body;
    tab = document.createElement("div");
    tab.id = "QPOF_calculatorTab";
    tab.className = "tab-content";
    tab.innerHTML = `<div class="card" style="padding: 24px;"><h2>📉 Quantitative Probability of Failure (POF)</h2><p style="color: #64748b; margin-top: 8px;">API 581 Quantitative POF calculations are integrated with the RBI Analysis Engine.</p><button type="button" class="btn btn-primary" style="margin-top: 14px; padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer;" onclick="showCORROSION_CALCULATIONTab()">Open RBI Analysis</button></div>`;
    mount.appendChild(tab);
  }
  tab.style.display = "block";  
}  

function showCrackingMechanismTab() {
  hideMechanismDetails();
  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");
  if (typeof window.hideAllMainPanels === "function") {
    window.hideAllMainPanels();
  }
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  const tab = document.getElementById("crackingMechanismTab");
  if (tab) {
    tab.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1065", function () {
      const loaded = document.getElementById("crackingMechanismTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_crackingMechanism a') || document.querySelector('a[data-mod-id="crackingMechanism"]');
  if (link) link.classList.add("active-link");
}

function showbkStressTab() {
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  hideWelcomePanel();
  const tab = document.getElementById("bkStressTab");
  const init = () => {
    if (typeof window.initBkStressStandaloneUI === "function") {
      window.initBkStressStandaloneUI();
    } else {
      if (typeof window.bkPopulateYears === "function") window.bkPopulateYears();
      if (typeof window.renderYearManagerList === "function") window.renderYearManagerList();
      if (typeof window.updateActiveDatabaseSummaryBadge === "function") window.updateActiveDatabaseSummaryBadge();
    }
    if (typeof window.renderTemperaturePointsTable === "function") {
      window.renderTemperaturePointsTable();
    }
  };
  if (tab) {
    tab.style.display = "block";
    init();
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1060", function () {
      const loaded = document.getElementById("bkStressTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }
}


function showDamageMechanismTab() {
  if (typeof hideAllMainPanels === "function") hideAllMainPanels();
  if (typeof hideWelcomePanel === "function") hideWelcomePanel();

  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('a[data-mod-id="damageExplorer"]');
  if (link) link.classList.add("active-link");

  const catLi = document.querySelector('#categoryList li[data-rbac-module="damageExplorer"], #categoryList li.category-toggle');
  if (catLi) {
    const ul = catLi.querySelector("ul.mechanisms, ul");
    if (ul) {
      ul.style.display = "block";
      const arrow = catLi.querySelector(".arrow");
      if (arrow) arrow.textContent = "▾";
    }
  }

  const mechs = (window.data && window.data["Damage Mechanism"]) || window.damageMechanisms || {};
  const keys = Object.keys(mechs);
  if (keys.length > 0) {
    if (typeof window.showMechanismDetails === "function") {
      window.showMechanismDetails(keys[0], mechs[keys[0]]);
    }
  } else if (window._damageMechanismsPromise) {
    window._damageMechanismsPromise.then(data => {
      const loaded = (data && data["Damage Mechanism"]) || {};
      const kList = Object.keys(loaded);
      if (kList.length > 0 && typeof window.showMechanismDetails === "function") {
        window.showMechanismDetails(kList[0], loaded[kList[0]]);
      }
    });
  }
}
window.showDamageMechanismTab = showDamageMechanismTab;

// 🌐 Explicitly expose all tab navigation functions globally on window
window.showCriteriaTab = showCriteriaTab;
window.showCorrosionTab = showCorrosionTab;
window.showCorrosionFullTab = showCorrosionFullTab;
window.showFluidSelectorTab = showFluidSelectorTab;
window.showInventoryTab = showInventoryTab;
window.showRemainingLifeTab = showRemainingLifeTab;
window.showINSPECTIONCONFIDENCETab = showINSPECTIONCONFIDENCETab;
window.showASMEB31_3Tab = showASMEB31_3Tab;
window.showSimplePipingTab = showSimplePipingTab;
window.showASMESECTIONVIIIDIV1Tab = showASMESECTIONVIIIDIV1Tab;
window.showpipeThicknessTab = showpipeThicknessTab;
window.showTOXIC_CALCULATIONTab = showTOXIC_CALCULATIONTab;
window.showCORROSION_CALCULATIONTab = showCORROSION_CALCULATIONTab;
window.showcof_calculatorTab = showcof_calculatorTab;
window.showQPOF_calculatorTab = showQPOF_calculatorTab;
window.showCrackingMechanismTab = showCrackingMechanismTab;
window.showbkStressTab = showbkStressTab;
  
  function clearMechanismDetails() {  
    document.getElementById("mechanismDetailsContainer").innerHTML = "";  
    document.getElementById("selectedMechanismTitle").textContent = "Select a Damage Mechanism";  
    document.getElementById("selectedMechanismTitle").style.display = "block";  
  }  
  
    
  
  // 1. DEBUG CONSOLE LOGGING (TRACE CLICKS)
  if (!window._debugClickCaptureBound) {
    window._debugClickCaptureBound = true;
    window.addEventListener('click', function(e) {
      if (e.target.closest('#categoryList') || e.target.closest('.features-drawer-content') || e.target.closest('#mainSidebar')) {
        console.log('[DEBUG CLICK]', {
          target: e.target,
          tag: e.target.tagName,
          classes: e.target.className,
          parent: e.target.parentElement
        });
      }
    }, true); // Use capture phase to bypass any stopPropagation
  }

  // 2. ROBUST TOGGLE CATEGORY
  window.toggleCategory = function(el) {
    if (!el) return;
    const parentLi = el.closest('li');
    if (!parentLi) return;
    const subList = parentLi.querySelector('ul.mechanisms, ul.subcategory-list, ul');
    if (subList) {
      const isHidden = window.getComputedStyle(subList).display === 'none';
      subList.style.display = isHidden ? 'block' : 'none';
      const arrow = parentLi.querySelector('.arrow, .toggle-arrow');
      if (arrow) arrow.textContent = isHidden ? '▾' : '▸';
    }
  };

  // 3. CONTAINER DELEGATION ON #categoryList
  function initSidebarNavigationClicks() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    categoryList.onclick = function(e) {
      if (!e || !e.target || typeof e.target.closest !== "function") return;

      // Ignore clicks on the inline filter box or filter toggle button inside API 571 Damage Mechanisms
      if (e.target.closest(".category-filter-icon") || e.target.closest(".category-inline-filter")) {
        return;
      }

      const leafLink = e.target.closest('a[data-mod-id], a[data-sub-id], .sidebar-tab-link, a.sidebar-nav-link, li[data-rbac-module] a, #categoryList a');
      const trigger = e.target.closest('.toggle-arrow, .arrow, .category, .subcategory, [data-accordion-trigger], .category-title');

      // A. Actionable Leaf Tab Navigation (or single-action category link)
      if (leafLink) {
        const parentLi = leafLink.closest('li');
        const subList = parentLi ? parentLi.querySelector(':scope > ul.mechanisms, :scope > ul.subcategory-list, :scope > ul') : null;

        // If the link is inside an accordion header that actually has child items, treat it as an accordion toggle
        if (leafLink.closest('.category, .subcategory') && subList && subList.children.length > 0) {
          // Fall through to B (Accordion Header / Category Click)
        } else {
          const modId = leafLink.getAttribute('data-mod-id') || parentLi?.getAttribute('data-rbac-module') || leafLink.closest('[data-rbac-module]')?.getAttribute('data-rbac-module') || '';
          const subId = leafLink.getAttribute('data-sub-id') || parentLi?.getAttribute('data-rbac-sub') || modId;

          // If this is a damage mechanism item link
          if (!modId && !subId) {
            if (parentLi) {
              const mechName = (leafLink.textContent || '').trim();
              if (mechName && typeof window.showMechanismDetails === 'function') {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('#categoryList a').forEach(a => a.classList.remove('active-link'));
                leafLink.classList.add('active-link');
                window.showMechanismDetails(mechName, null);
                if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
                return;
              }
            }
          }

          if (modId || subId) {
            e.preventDefault();
            e.stopPropagation();

            document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
            leafLink.classList.add("active-link");

            if (typeof window.activateSidebarModule === 'function') {
              window.activateSidebarModule(modId, subId, true);
            }

            if (typeof window.closeMobileSidebar === 'function') {
              window.closeMobileSidebar();
            }
            return;
          }
        }
      }

      // B. Accordion Header / Category Click
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();

        const parentLi = trigger.closest('li');
        if (!parentLi) return;

        const subList = parentLi.querySelector(':scope > ul.mechanisms, :scope > ul.subcategory-list, :scope > ul') || parentLi.querySelector('ul.mechanisms, ul.subcategory-list, ul');
        const modId = trigger.getAttribute('data-mod-id') || parentLi.getAttribute('data-rbac-module') || '';
        const subId = trigger.getAttribute('data-sub-id') || parentLi.getAttribute('data-rbac-sub') || modId;

        if (subList && subList.children.length > 0) {
          const isHidden = window.getComputedStyle(subList).display === 'none' || subList.style.display === 'none';
          subList.style.display = isHidden ? 'block' : 'none';

          const headerEl = trigger.closest('.category, .subcategory') || parentLi;
          const arrow = headerEl.querySelector('.arrow, .toggle-arrow');
          if (arrow) {
            arrow.textContent = isHidden ? '▾' : '▸';
          }
        } else if (modId && typeof window.activateSidebarModule === 'function') {
          const innerLink = parentLi.querySelector('a');
          if (innerLink) {
            document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
            innerLink.classList.add("active-link");
          }
          window.activateSidebarModule(modId, subId || modId, true);
          if (typeof window.closeMobileSidebar === 'function') {
            window.closeMobileSidebar();
          }
        }
      }
    };
  }
  window.initSidebarNavigationClicks = initSidebarNavigationClicks;

  function normalizeCanonicalSidebarLabel(canonId, rawLabel, fallbackLabel) {
    let label = String(rawLabel || fallbackLabel || canonId).trim();
    if (canonId === "api570" && (label === "Remaining Life Calculator" || label === "⏱️ Remaining Life Calculator")) {
      return "API 570 Remaining Life";
    }
    if (canonId === "crackingMechanism" && (label === "Cracking Mechanism Analysis" || label === "⚡ Cracking Mechanism Analysis")) {
      return "Cracking Mechanism Finder";
    }
    if (canonId === "adminControlCenter" && (label === "Tools" || label === "🛠️ Tools")) {
      return "Admin & Engineering Tools";
    }
    return label;
  }

  const DEFAULT_SIDEBAR_MODULES = [
    {
      id: "damageExplorer",
      name: "API 571 Damage Mechanisms",
      icon: "🛡️",
      category: "API 571 Damage Mechanisms",
      tabId: "damageExplorerTab",
      launcherFunc: "showDamageMechanismTab",
      subsections: [
        { id: "damageCatalog", name: "Damage Mechanism Catalog", category: "API 571 Damage Mechanisms", icon: "📖", tabId: "damageExplorerTab", launcherFunc: "showDamageMechanismTab" }
      ]
    },
    {
      id: "api581",
      name: "API 581 Risk-Based Inspection",
      icon: "📊",
      category: "Risk-Based Inspection",
      tabId: "a571-criteriaTab",
      launcherFunc: "showCriteriaTab",
      subsections: [
        { id: "api571Criteria", name: "API 571 Damage Mechanism Screening", icon: "🔎", launcherFunc: "showCriteriaTab", tabId: "a571-criteriaTab" },
        { id: "corrosionRate", name: "Corrosion Rate Estimator", icon: "📉", launcherFunc: "showCorrosionFullTab", tabId: "corrosionFullTab" },
        { id: "fluidSelector", name: "Representative Fluid Selector", icon: "💧", launcherFunc: "showFluidSelectorTab", tabId: "fluidSelectorTab" },
        { id: "inventoryCalc", name: "Equipment Inventory Calculator", icon: "🛢️", launcherFunc: "showInventoryTab", tabId: "inventoryTab" },
        { id: "inspectionConfidence", name: "Inspection Confidence & Effectiveness", icon: "🎯", launcherFunc: "showINSPECTIONCONFIDENCETab", tabId: "inspectionconfidenceTab" },
        { id: "toxicCalc", name: "Toxic Fluid Consequence (% Calculation)", icon: "☠️", launcherFunc: "showTOXIC_CALCULATIONTab", tabId: "TOXIC_CALCULATIONTab" },
        {
          id: "quantitativeGroup",
          name: "Quantitative",
          icon: "📐",
          isGroup: true,
          children: [
            { id: "cofCalculator", name: "Risk Calculator_COF", icon: "💥", launcherFunc: "showcof_calculatorTab", tabId: "cof_calculatorTab" },
            { id: "qpofCalculator", name: "Risk Calculator_POF", icon: "📈", launcherFunc: "showQPOF_calculatorTab", tabId: "QPOF_calculatorTab" }
          ]
        },
        {
          id: "semiQuantitativeGroup",
          name: "Semi Quantitative",
          icon: "⚖️",
          isGroup: true,
          children: [
            { id: "corrosionCalc", name: "Risk Calculator", icon: "🧮", launcherFunc: "showCORROSION_CALCULATIONTab", tabId: "CORROSION_CALCULATIONTab" }
          ]
        }
      ]
    },
    {
      id: "api570",
      name: "API 570 Remaining Life",
      icon: "⏱️",
      category: "Integrity & Piping",
      tabId: "remainingLifeTab",
      launcherFunc: "showRemainingLifeTab",
      subsections: [
        { id: "remainingLifeCalc", name: "API 570 Remaining Life", category: "Integrity & Piping", icon: "⏱️", tabId: "remainingLifeTab", launcherFunc: "showRemainingLifeTab" }
      ]
    },
    {
      id: "thicknessCalc",
      name: "Design Thickness (ASME)",
      icon: "📐",
      category: "Mechanical Design",
      tabId: "ASMEB31_3Tab",
      launcherFunc: "showASMEB31_3Tab",
      subsections: [
        {
          id: "processPipingGroup",
          name: "Process Piping",
          icon: "🔧",
          isGroup: true,
          children: [
            { id: "asmeB31_3", name: "ASME B31.3 Advanced", icon: "⚙️", launcherFunc: "showASMEB31_3Tab", tabId: "ASMEB31_3Tab" },
            { id: "simplePiping", name: "Simple Formula (PD / 2SE)", icon: "📏", launcherFunc: "showSimplePipingTab", tabId: "simplePipingTab" }
          ]
        },
        { id: "asmeSectionVIII", name: "Pressure Vessel (ASME Sec VIII Div 1)", icon: "🛢️", launcherFunc: "showASMESECTIONVIIIDIV1Tab", tabId: "ASMESECTIONVIIIDIV1Tab" },
        { id: "pipeThickness", name: "Piping Schedule & Thickness Chart", icon: "📋", launcherFunc: "showpipeThicknessTab", tabId: "pipeThicknessTab" },
        { id: "structuralThickness", name: "Structural Minimum Thickness (API 574)", icon: "🏗️", launcherFunc: "showStructuralThicknessTab", tabId: "structuralThicknessTab" }
      ]
    },
    {
      id: "crackingMechanism",
      name: "Cracking Mechanism Finder",
      icon: "⚡",
      category: "Damage Screening",
      tabId: "crackingMechanismTab",
      launcherFunc: "showCrackingMechanismTab",
      subsections: [
        { id: "crackingFinder", name: "Cracking Mechanism Finder", category: "Damage Screening", icon: "⚡", tabId: "crackingMechanismTab", launcherFunc: "showCrackingMechanismTab" }
      ]
    },
    {
      id: "bkStress",
      name: "Allowable Stress & Material Data",
      icon: "🧮",
      category: "Materials",
      tabId: "bkStressTab",
      launcherFunc: "showbkStressTab",
      subsections: [
        { id: "stressLookup", name: "Allowable Stress & Material Data", category: "Materials", icon: "🧮", tabId: "bkStressTab", launcherFunc: "showbkStressTab" }
      ]
    },
    {
      id: "streamComparator",
      name: "Stream Comparator (HMB)",
      icon: "🔄",
      category: "Process Engineering",
      tabId: "streamComparatorTab",
      launcherFunc: "showStreamComparatorTab",
      subsections: [
        { id: "streamComparatorMain", name: "Stream Comparator (HMB)", category: "Process Engineering", icon: "🔄", tabId: "streamComparatorTab", launcherFunc: "showStreamComparatorTab" }
      ]
    },
    {
      id: "chemicalSuite",
      name: "Chemistry & Chemical Suite",
      icon: "⚗️",
      category: "Process Engineering",
      tabId: "chemicalSuiteTab",
      launcherFunc: "showChemicalSuiteTab",
      subsections: [
        { id: "chemicalSafetySuite", name: "Chemistry & Chemical Suite", category: "Process Engineering", icon: "⚗️", tabId: "chemicalSuiteTab", launcherFunc: "showChemicalSuiteTab" }
      ]
    },
    {
      id: "unitConverter",
      name: "Plant & Integrity Unit Converters",
      icon: "📐",
      category: "Utilities",
      tabId: "unitConverterTab",
      launcherFunc: "showUnitConverterTab",
      subsections: [
        { id: "unitConverterMain", name: "Plant & Integrity Unit Converters", category: "Utilities", icon: "📐", tabId: "unitConverterTab", launcherFunc: "showUnitConverterTab" }
      ]
    },
    {
      id: "processFlow",
      name: "Process Flow Diagrams (PFD)",
      icon: "🗺️",
      category: "Diagrams",
      tabId: "processFlowModal",
      launcherFunc: "showPROCESSFLOWDIAGRAMSTab",
      subsections: [
        { id: "cduVdu", name: "CDU / VDU Distillation Unit", icon: "🛢️", launcherFunc: "showCDUVDUTab" },
        { id: "atmospheric", name: "Hydroprocessing Unit (HCU)", icon: "🔥", launcherFunc: "showPROCESSFLOWDIAGRAMSTab" },
        { id: "msp", name: "Motor Spirit Production (MSP)", icon: "⛽", launcherFunc: "showMSPTab" },
        { id: "h2u", name: "Hydrogen Generation Unit (H2U)", icon: "💨", launcherFunc: "showH2UTab" }
      ]
    },
    {
      id: "ccdAI",
      name: "CCD AI Platform",
      icon: "🤖",
      category: "Integrity Management",
      tabId: "ccdAiTab",
      launcherFunc: "showCCDAITab",
      subsections: [
        { id: "ccdAiPlatform", name: "CCD AI Platform", category: "Integrity Management", icon: "🤖", tabId: "ccdAiTab", launcherFunc: "showCCDAITab" }
      ]
    },
    {
      id: "adminControlCenter",
      name: "Admin & Engineering Tools",
      icon: "🛠️",
      category: "Governance & Tools",
      tabId: "adminPanelTab",
      launcherFunc: "openTool",
      subsections: [
        { id: "userManagement", name: "User Management", category: "Tools", icon: "👤", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "users-list", group: "USERS & PERMISSIONS" },
        { id: "rbacPermissions", name: "Roles & Permissions", category: "Tools", icon: "🛡️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "roles-config", group: "USERS & PERMISSIONS" },
        { id: "accessControl", name: "Access Control", category: "Tools", icon: "🔒", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "access-control", group: "USERS & PERMISSIONS" },
        { id: "appOverview", name: "Applications Overview", category: "Tools", icon: "🎛️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-hub", group: "APPLICATION MANAGER" },
        { id: "appStream", name: "Stream Data Manager", category: "Tools", icon: "📊", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-stream", group: "APPLICATION MANAGER" },
        { id: "appStress", name: "Allowable Stress Manager", category: "Tools", icon: "🧮", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "app-stress", group: "APPLICATION MANAGER" },
        { id: "firestoreExplorer", name: "Firestore Collections Explorer", category: "Tools", icon: "🗄️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-firestore", group: "SYSTEMS" },
        { id: "sysDiagnostics", name: "Backup & Cloud Diagnostics", category: "Tools", icon: "⚙️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-diagnostics", group: "SYSTEMS" },
        { id: "projectSwitcher", name: "Project Switcher", category: "Tools", icon: "🔄", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-projects", group: "SYSTEMS" },
        { id: "activeSessions", name: "Active Sessions", category: "Tools", icon: "👤", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-sessions", group: "SYSTEMS" },
        { id: "systemLogs", name: "System Logs", category: "Tools", icon: "📋", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sys-logs", group: "SYSTEMS" },
        { id: "layoutBuilder", name: "Sidebar Configuration", category: "Tools", icon: "📑", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "layout-sidebar", group: "LAYOUT & NAVIGATION BUILDER" },
        { id: "sidebarOrder", name: "Sidebar Order", category: "Tools", icon: "↕️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "sidebar-order", group: "LAYOUT & NAVIGATION BUILDER" },
        { id: "tickerText", name: "Ticker Text", category: "Tools", icon: "📢", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "ticker-text", group: "LAYOUT & NAVIGATION BUILDER" },
        { id: "welcomeCards", name: "Welcome Cards", category: "Tools", icon: "🎴", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "welcome-cards", group: "LAYOUT & NAVIGATION BUILDER" },
        { id: "navVisibility", name: "Navigation Visibility", category: "Tools", icon: "👁️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "nav-visibility", group: "LAYOUT & NAVIGATION BUILDER" },
        { id: "masterData", name: "Master Data Management", category: "Tools", icon: "🗃️", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-overview", group: "MASTER DATA, BACKUP & LOGS" },
        { id: "jsonBackup", name: "1-Click JSON Backup", category: "Tools", icon: "⚡", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-backup", group: "MASTER DATA, BACKUP & LOGS" },
        { id: "jsonRestore", name: "JSON Restore", category: "Tools", icon: "🔄", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-restore", group: "MASTER DATA, BACKUP & LOGS" },
        { id: "backupHistory", name: "Backup History", category: "Tools", icon: "📜", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-history", group: "MASTER DATA, BACKUP & LOGS" },
        { id: "auditTrail", name: "Audit Trail", category: "Tools", icon: "🔍", tabId: "adminPanelTab", launcherFunc: "openTool", tool: "master-audit", group: "MASTER DATA, BACKUP & LOGS" }
      ]
    }
  ];

  function normalizeSidebarModuleId(rawId) {
    if (!rawId) return "";
    const id = String(rawId).trim();
    if (id === "cracking" || id === "crackingMechanism") return "crackingMechanism";
    if (
      id === "damage" ||
      id === "damageMechanisms" ||
      id === "damageMechanism" ||
      id === "damageCatalog" ||
      id === "api571" ||
      id === "api571DamageMechanisms" ||
      id === "damageExplorer"
    ) {
      return "damageExplorer";
    }
    if (id === "remainingLife" || id === "api570") return "api570";
    if (id === "designThickness" || id === "b313" || id === "thicknessCalc") return "thicknessCalc";
    if (id === "tools" || id === "adminControlCenter") return "adminControlCenter";
    if (id === "stream" || id === "streamData" || id === "streamComparator") return "streamComparator";
    return id;
  }
  window.normalizeSidebarModuleId = normalizeSidebarModuleId;

  function getActiveLayoutConfig(overrideCfg) {
    if (overrideCfg && typeof overrideCfg === "object") return overrideCfg;
    if (window.layoutConfig && typeof window.layoutConfig === "object") return window.layoutConfig;
    if (window.adminPanel && window.adminPanel.layoutConfig && typeof window.adminPanel.layoutConfig === "object") {
      return window.adminPanel.layoutConfig;
    }
    try {
      const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          window.layoutConfig = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }
  window.getActiveLayoutConfig = getActiveLayoutConfig;

  function renderServerDrivenSidebar(authorizedNavigation) {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList || window.__sidebarRenderInProgress) return;

    window.__sidebarRenderInProgress = true;
    window.__isApplyingSidebarLayout = true;

    try {
      initSidebarNavigationClicks();

      const rbacNav = window.RBAC?.authorizedNavigation;
      const rbacAvail = window.RBAC?.availableModules;
      const layoutCfg = getActiveLayoutConfig();
      const layoutNav = layoutCfg?.sidebarModules;

      const rawNavModules = (authorizedNavigation && Array.isArray(authorizedNavigation) && authorizedNavigation.length > 0)
        ? authorizedNavigation
        : (Array.isArray(rbacNav) && rbacNav.length > 0
            ? rbacNav
            : (Array.isArray(rbacAvail) && rbacAvail.length > 0
                ? rbacAvail
                : (Array.isArray(layoutNav) && layoutNav.length > 0 ? layoutNav : DEFAULT_SIDEBAR_MODULES)));

      if (!Array.isArray(rawNavModules) || rawNavModules.length === 0) return;

      // Build canonical layout lookup map (preserving first occurrence order)
      const layoutMap = new Map();
      if (Array.isArray(layoutNav)) {
        layoutNav.forEach((lm, idx) => {
          if (!lm || !lm.id) return;
          const canonId = normalizeSidebarModuleId(lm.id);
          if (canonId && !layoutMap.has(canonId)) {
            layoutMap.set(canonId, {
              ...lm,
              id: canonId,
              orderIndex: idx
            });
          }
        });
      }

      // Deduplicate and merge navModules with DEFAULT_SIDEBAR_MODULES subsections and layoutMap overrides
      const seenNavIds = new Set();
      const mergedModules = [];
      rawNavModules.forEach((m, origIdx) => {
        if (!m || !m.id) return;
        const canonId = normalizeSidebarModuleId(m.id);
        if (!canonId || seenNavIds.has(canonId)) return;
        seenNavIds.add(canonId);

        const defMod = DEFAULT_SIDEBAR_MODULES.find(d => normalizeSidebarModuleId(d.id) === canonId) || {};
        const lMod = layoutMap.get(canonId) || {};
        const resolvedName = normalizeCanonicalSidebarLabel(canonId, lMod.label || m.name || m.label || defMod.name, defMod.name || canonId);

        mergedModules.push({
          ...defMod,
          ...m,
          id: canonId,
          name: resolvedName,
          label: resolvedName,
          icon: lMod.icon || m.icon || defMod.icon || "",
          visible: lMod.visible !== undefined ? lMod.visible !== false : (m.visible !== false),
          subsections: Array.isArray(m.subsections) && m.subsections.length > 0
            ? m.subsections
            : (Array.isArray(defMod.subsections) ? defMod.subsections : []),
          _sortOrder: lMod.orderIndex !== undefined ? lMod.orderIndex : (1000 + origIdx)
        });
      });

      // Ensure damageExplorer has a slot in mergedModules so its configured position is respected
      if (!seenNavIds.has("damageExplorer")) {
        const lDmg = layoutMap.get("damageExplorer");
        mergedModules.push({
          id: "damageExplorer",
          name: lDmg?.label || "API 571 Damage Mechanisms",
          label: lDmg?.label || "API 571 Damage Mechanisms",
          icon: lDmg?.icon || "🛡️",
          visible: lDmg ? lDmg.visible !== false : true,
          subsections: [
            { id: "damageCatalog", name: "Damage Mechanism Catalog", category: "API 571 Damage Mechanisms", icon: "📖", tabId: "damageExplorerTab", launcherFunc: "showDamageMechanismTab" }
          ],
          _sortOrder: lDmg?.orderIndex !== undefined ? lDmg.orderIndex : -1
        });
        seenNavIds.add("damageExplorer");
      }

      mergedModules.sort((a, b) => a._sortOrder - b._sortOrder);

      // Preserve open states of Level 1 and Level 2 accordions before re-rendering
      const openStates = new Set();
      categoryList.querySelectorAll("li[id^='rbac_cat_'], li.subcategory-item").forEach(li => {
        const mainUl = li.querySelector("ul.mechanisms, ul");
        if (mainUl && mainUl.style.display === "block") {
          const stateKey = li.id || li.getAttribute("data-rbac-subcategory") || li.getAttribute("data-group-id");
          if (stateKey) openStates.add(stateKey);
        }
      });

      // Preserve existing API 571 Damage Mechanism item if present so it isn't lost on re-render
      const existingDamageCat = categoryList.querySelector("li.category-toggle:not([id^='rbac_cat_']), li[data-rbac-module='damageExplorer']:not([id^='rbac_cat_'])");
      const hasPopulatedDamageCat = Boolean(existingDamageCat && existingDamageCat.querySelectorAll("ul.mechanisms > li").length > 0);

      categoryList.innerHTML = "";
      let damageCatAppended = false;

      mergedModules.forEach(mod => {
        if (!mod || !mod.id) return;

        if (mod.id === "damageExplorer") {
          if (existingDamageCat) {
            const catHeader = existingDamageCat.querySelector(".category");
            if (catHeader) {
              let titleSpan = catHeader.querySelector(".category-title");
              if (!titleSpan) {
                const arrow = catHeader.querySelector(".arrow, .toggle-arrow");
                const arrowText = arrow ? arrow.textContent : "▸";
                catHeader.innerHTML = `<span class="arrow toggle-arrow">${arrowText}</span><span class="category-title">🛡️ API 571 Damage Mechanisms</span>`;
              } else {
                titleSpan.textContent = "🛡️ API 571 Damage Mechanisms";
              }
            }
            if (mod.visible === false) {
              existingDamageCat.style.setProperty("display", "none", "important");
              existingDamageCat.setAttribute("data-rbac-hidden", "true");
            } else {
              existingDamageCat.style.removeProperty("display");
              existingDamageCat.removeAttribute("data-rbac-hidden");
            }
            categoryList.appendChild(existingDamageCat);
            damageCatAppended = true;
            return;
          }
          // If existingDamageCat is not yet in DOM, proceed to build it cleanly below
        }

        const li = document.createElement("li");
        li.id = mod.id === "adminControlCenter" ? "rbac_cat_tools" : `rbac_cat_${mod.id}`;
        li.setAttribute("data-rbac-module", mod.id);

        let cleanModTitle = String(mod.label || mod.name || mod.id).trim();
        if (mod.icon && cleanModTitle.startsWith(mod.icon)) {
          cleanModTitle = cleanModTitle.substring(mod.icon.length).trim();
        }
        const iconStr = mod.icon ? `${mod.icon} ` : "";
        const modTitle = cleanModTitle;
        const isModOpen = openStates.has(li.id);
        const arrowChar = isModOpen ? "▾" : "▸";
        const displayStyle = isModOpen ? "block" : "none";

        let subs = Array.isArray(mod.subsections) ? mod.subsections : [];
        if (subs.length === 0) {
          const defMod = DEFAULT_SIDEBAR_MODULES.find(d => normalizeSidebarModuleId(d.id) === mod.id);
          if (defMod && Array.isArray(defMod.subsections) && defMod.subsections.length > 0) {
            subs = defMod.subsections;
          } else {
            subs = [{ id: mod.id, name: modTitle, icon: mod.icon || "", tabId: mod.tabId || "", launcherFunc: mod.launcherFunc || "" }];
          }
        }

        if (false) {
          // Every sidebar category renders as an expandable ▸ / ▾ accordion
        } else {
          // Level 1 Accordion Header
          let innerHTML = `
            <span class="category" data-accordion-trigger="true" data-mod-id="${mod.id}" role="button" tabindex="0">
              <span class="arrow toggle-arrow">${arrowChar}</span>
              <span class="category-title">${iconStr}${modTitle}</span>
            </span>
          `;

          const groupsMap = {};
          const directSubs = [];

          subs.forEach(sub => {
            if (sub.isGroup || (Array.isArray(sub.children) && sub.children.length > 0)) {
              const groupKey = sub.id || sub.name;
              groupsMap[groupKey] = {
                id: groupKey,
                name: sub.name,
                icon: sub.icon,
                children: sub.children || []
              };
            } else if (sub.group || (sub.category && sub.category !== mod.category && sub.category !== mod.name && sub.category !== "General Risk" && sub.category !== "Tools")) {
              const groupKey = sub.group || sub.category;
              if (!groupsMap[groupKey]) {
                groupsMap[groupKey] = {
                  id: groupKey,
                  name: groupKey,
                  icon: sub.icon || "▸",
                  children: []
                };
              }
              groupsMap[groupKey].children.push(sub);
            } else {
              directSubs.push(sub);
            }
          });

          let subItemsHtml = "";

          // Level 2 Direct Leaf Items
          directSubs.forEach(sub => {
            const subIcon = sub.icon ? `${sub.icon} ` : "";
            const tabAttr = sub.tabId ? ` data-tab-id="${sub.tabId}"` : "";
            subItemsHtml += `
              <li data-rbac-module="${mod.id}" data-rbac-sub="${sub.id}">
                <a href="javascript:void(0)" data-mod-id="${mod.id}" data-sub-id="${sub.id}"${tabAttr} class="sidebar-nav-link" style="pointer-events: auto;">${subIcon}${sub.name}</a>
              </li>
            `;
          });

          // Level 2 Sub-Accordions (Groups) with Level 3 Leaf Items
          Object.values(groupsMap).forEach(grp => {
            let grpItemsHtml = "";
            grp.children.forEach(child => {
              const childIcon = child.icon ? `${child.icon} ` : "";
              const toolAttr = child.tool ? ` data-tool-id="${child.tool}"` : "";
              const tabAttr = child.tabId ? ` data-tab-id="${child.tabId}"` : "";
              grpItemsHtml += `
                <li data-rbac-module="${mod.id}" data-rbac-sub="${child.id}"${toolAttr}>
                  <a href="javascript:void(0)" data-mod-id="${mod.id}" data-sub-id="${child.id}"${tabAttr} class="sidebar-nav-link" style="pointer-events: auto;">${childIcon}${child.name}</a>
                </li>
              `;
            });

            const grpStateKey = grp.id || grp.name;
            const isGrpOpen = openStates.has(grpStateKey);
            const grpArrowChar = isGrpOpen ? "▾" : "▸";
            const grpDisplayStyle = isGrpOpen ? "block" : "none";
            const grpIconStr = grp.icon ? `${grp.icon} ` : "";

            subItemsHtml += `
              <li data-rbac-subcategory="${grpStateKey}" data-group-id="${grpStateKey}" class="subcategory-item" style="list-style: none;">
                <span class="subcategory" data-accordion-trigger="true" role="button" tabindex="0">
                  <span class="arrow toggle-arrow">${grpArrowChar}</span>
                  <span class="category-title">${grpIconStr}${grp.name}</span>
                </span>
                <ul class="mechanisms" style="display:${grpDisplayStyle};">
                  ${grpItemsHtml}
                </ul>
              </li>
            `;
          });

          innerHTML += `
            <ul class="mechanisms" style="display:${displayStyle};">
              ${subItemsHtml}
            </ul>
          `;

          li.innerHTML = innerHTML;
        }

        if (mod.visible === false) {
          li.style.setProperty("display", "none", "important");
          li.setAttribute("data-rbac-hidden", "true");
        }

        categoryList.appendChild(li);
      });

      if (existingDamageCat && !damageCatAppended) {
        categoryList.insertBefore(existingDamageCat, categoryList.firstChild);
      }

      ensureAllSidebarArrows();
    } finally {
      window.__isApplyingSidebarLayout = false;
      window.__sidebarRenderInProgress = false;
    }

    const layoutCfgAfter = getActiveLayoutConfig();
    const currentDamageCat = categoryList.querySelector("li.category-toggle:not([id^='rbac_cat_']), li[data-rbac-module='damageExplorer']:not([id^='rbac_cat_'])");
    const damageAlreadyPopulated = Boolean(currentDamageCat && currentDamageCat.querySelectorAll("ul.mechanisms > li").length > 0);

    if (!damageAlreadyPopulated && window.data && window.data["Damage Mechanism"] && typeof window.loadCategories === "function") {
      window.loadCategories(window.data);
    } else if (layoutCfgAfter && typeof window.applyPublishedSidebarLayout === "function") {
      window.applyPublishedSidebarLayout(layoutCfgAfter);
    }
  }
  window.renderServerDrivenSidebar = renderServerDrivenSidebar;

  function applyPublishedSidebarLayout(config) {
    const cfg = getActiveLayoutConfig(config);
    if (!cfg || window.__isApplyingSidebarLayout) return;

    window.layoutConfig = cfg;
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("cached_layout_config", JSON.stringify(cfg));
      }
    } catch (e) {}

    // 1. Ticker bar synchronization
    const scrollText = document.getElementById("scrollText");
    const scrollContainer = document.querySelector(".scroll-container");
    if (scrollText) {
      if (cfg && cfg.tickerText && cfg.tickerText.trim()) {
        let rawUser = (window.RBAC && window.RBAC.userEmail) || (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("usernameUpper") || sessionStorage.getItem("loggedInUser")) : "") || "";
        const uName = (rawUser.includes("@") ? rawUser.split("@")[0] : rawUser).trim().toUpperCase();
        scrollText.textContent = (uName && /\{user(?:name)?\}/i.test(cfg.tickerText))
          ? cfg.tickerText.replace(/\{user(?:name)?\}/gi, uName)
          : cfg.tickerText;
        if (cfg.tickerUrgency === "critical") {
          scrollText.style.color = "#ef4444";
          scrollText.style.fontWeight = "bold";
        } else if (cfg.tickerUrgency === "urgent") {
          scrollText.style.color = "#f59e0b";
          scrollText.style.fontWeight = "bold";
        } else {
          scrollText.style.color = "";
          scrollText.style.fontWeight = "";
        }
      } else {
        scrollText.textContent = "";
      }
    }
    if (scrollContainer) {
      scrollContainer.style.display = (cfg && cfg.tickerEnabled !== false && cfg.tickerText && cfg.tickerText.trim()) ? "block" : "none";
    }

    // 2. Reorder #categoryList and synchronize custom labels, icons, and visibility
    const categoryList = document.getElementById("categoryList");
    if (categoryList && categoryList.children.length > 0 && Array.isArray(cfg.sidebarModules)) {
      const isUserAdmin = Boolean(window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin"));
      const directLis = Array.from(categoryList.children);
      const targetOrderedLis = [];
      const seenCanonIds = new Set();

      cfg.sidebarModules.forEach(rawMod => {
        if (!rawMod || !rawMod.id) return;
        const canonId = normalizeSidebarModuleId(rawMod.id);
        if (!canonId || seenCanonIds.has(canonId)) return;
        seenCanonIds.add(canonId);

        const rbacAllowed = isUserAdmin || (window.RBAC && typeof window.RBAC.hasModuleAccess === "function" ? window.RBAC.hasModuleAccess(canonId) : true);
        const shouldShow = rawMod.visible !== false && rbacAllowed;

        let matchedLi = null;
        if (canonId === "damageExplorer") {
          const dmgLis = directLis.filter(li => (li.classList.contains("category-toggle") && !li.id) || li.getAttribute("data-rbac-module") === "damageExplorer");
          dmgLis.forEach(dLi => {
            if (!shouldShow) {
              dLi.style.setProperty("display", "none", "important");
              dLi.setAttribute("data-rbac-hidden", "true");
            } else {
              dLi.style.removeProperty("display");
              dLi.removeAttribute("data-rbac-hidden");
            }
            if (!targetOrderedLis.includes(dLi)) {
              targetOrderedLis.push(dLi);
            }
          });
          matchedLi = dmgLis[0] || null;
        } else {
          matchedLi = directLis.find(li => {
            const liMod = normalizeSidebarModuleId(li.getAttribute("data-rbac-module") || (li.id ? li.id.replace(/^rbac_cat_/, "") : ""));
            return liMod === canonId;
          });
          if (matchedLi) {
            if (!shouldShow) {
              matchedLi.style.setProperty("display", "none", "important");
              matchedLi.setAttribute("data-rbac-hidden", "true");
            } else {
              matchedLi.style.removeProperty("display");
              matchedLi.removeAttribute("data-rbac-hidden");
            }
            if (!targetOrderedLis.includes(matchedLi)) {
              targetOrderedLis.push(matchedLi);
            }
          }
        }

        if (matchedLi) {
          const catHeader = matchedLi.querySelector(".category");
          if (catHeader) {
            let titleSpan = catHeader.querySelector(".category-title");
            const rawLabelText = rawMod.label || rawMod.name || canonId;
            let labelText = normalizeCanonicalSidebarLabel(canonId, rawLabelText, rawLabelText);
            const iconPrefix = rawMod.icon ? (rawMod.icon + " ") : "";
            if (rawMod.icon && labelText.startsWith(rawMod.icon)) {
              labelText = labelText.substring(rawMod.icon.length).trim();
            }
            const displayTitle = (iconPrefix + labelText).trim();
            if (!titleSpan) {
              const arrow = catHeader.querySelector(".arrow, .toggle-arrow");
              const arrowText = arrow ? arrow.textContent : "▸";
              catHeader.innerHTML = `<span class="arrow toggle-arrow">${arrowText}</span><span class="category-title">${displayTitle}</span>`;
            } else if (titleSpan.textContent !== displayTitle) {
              titleSpan.textContent = displayTitle;
            }
          }
        }
      });

      const currentChildren = Array.from(categoryList.children);
      let orderDiffers = currentChildren.length !== targetOrderedLis.length;
      if (!orderDiffers) {
        for (let i = 0; i < targetOrderedLis.length; i++) {
          if (currentChildren[i] !== targetOrderedLis[i]) {
            orderDiffers = true;
            break;
          }
        }
      }

      if (orderDiffers && targetOrderedLis.length > 0) {
        window.__isApplyingSidebarLayout = true;
        const frag = document.createDocumentFragment();
        targetOrderedLis.forEach(li => frag.appendChild(li));
        directLis.forEach(li => {
          if (!targetOrderedLis.includes(li)) frag.appendChild(li);
        });
        categoryList.appendChild(frag);
        window.__isApplyingSidebarLayout = false;
      }

      ensureAllSidebarArrows();
    }

    if (window.RBAC && window.RBAC.initialized && typeof window.RBAC.applySidebarVisibility === "function") {
      window.RBAC.applySidebarVisibility();
    }
  }
  window.applyPublishedSidebarLayout = applyPublishedSidebarLayout;

function showCCDAITab() {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  if (typeof hideAllMainPanels === "function") hideAllMainPanels();

  // Ensure fullscreen admin console mode is deactivated so tool renders in main dashboard
  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

  const tab = document.getElementById("ccdAiTab");
  if (tab) {
    tab.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Highlight CCD AI Platform in main sidebar
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_ccdAI a') || document.querySelector('a[data-mod-id="ccdAI"]');
  if (link) link.classList.add("active-link");

  if (window.recentTabs && typeof window.recentTabs.addTab === "function") {
    window.recentTabs.addTab("ccdAiTab");
  }
}
window.showCCDAITab = showCCDAITab;

function openCCDAIPlatform() {
  showCCDAITab();
}
window.openCCDAIPlatform = openCCDAIPlatform;

function showStreamComparatorTab() {
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  if (typeof hideAllMainPanels === "function") hideAllMainPanels();

  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

  const tab = document.getElementById("streamComparatorTab");
  const init = () => {
    if (window.StreamComparator && typeof window.StreamComparator.init === "function") {
      window.StreamComparator.init();
    }
  };
  if (tab) {
    tab.style.display = "block";
    init();
    tab.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1010", function () {
      const loaded = document.getElementById("streamComparatorTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }

  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_streamComparator a') || document.querySelector('a[data-mod-id="streamComparator"]');
  if (link) link.classList.add("active-link");
}
window.showStreamComparatorTab = showStreamComparatorTab;

function showUnitConverterTab() {
  hideMechanismDetails();
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  if (typeof hideAllMainPanels === "function") hideAllMainPanels();

  const tab = document.getElementById("unitConverterTab");
  const init = () => {
    if (window.UnitConverter && typeof window.UnitConverter.init === "function") {
      window.UnitConverter.init();
    }
  };
  if (tab) {
    tab.style.display = "block";
    init();
    tab.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
    window.TemplateManager.load("1090", function () {
      const loaded = document.getElementById("unitConverterTab");
      if (loaded) loaded.style.display = "block";
      hideWelcomePanel();
      init();
    });
  }

  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_unitConverter a') || document.querySelector('a[data-mod-id="unitConverter"]');
  if (link) link.classList.add("active-link");
}
window.showUnitConverterTab = showUnitConverterTab;

function injectUnitConverterCategory() { renderServerDrivenSidebar(); }
window.injectUnitConverterCategory = injectUnitConverterCategory;

function injectStreamComparatorCategory() { renderServerDrivenSidebar(); }
window.injectStreamComparatorCategory = injectStreamComparatorCategory;

function injectChemicalSuiteCategory() { renderServerDrivenSidebar(); }
window.injectChemicalSuiteCategory = injectChemicalSuiteCategory;

function injectCCDAIPlatformCategory() { renderServerDrivenSidebar(); }
window.injectCCDAIPlatformCategory = injectCCDAIPlatformCategory;

function injectToolsCategory() { renderServerDrivenSidebar(); }
window.injectToolsCategory = injectToolsCategory;

window.openTool = function (viewId) {
  if (!document.getElementById("adminPanelTab")) {
    if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
      window.TemplateManager.load("1000", function () {
        window.openTool(viewId);
      });
      return;
    }
  }

  const isAdm = (window.adminPanel && typeof window.adminPanel.isAdmin === "function")
    ? window.adminPanel.isAdmin()
    : (window.RBAC && (window.RBAC.role === "admin" || window.RBAC.isSuperAdmin));

  const getSubKey = (vId) => {
    const navMods = window.RBAC?.authorizedNavigation || window.layoutConfig?.sidebarModules || [];
    for (const mod of navMods) {
      if (Array.isArray(mod.subsections)) {
        const found = mod.subsections.find(s => s.id === vId || s.tool === vId || s.id.toLowerCase() === vId.replace(/-/g, "").toLowerCase() || s.tool === vId.replace(/^(sys|app|layout|master)-/, ""));
        if (found) return found.id;
      }
    }
    return vId;
  };

  const subKey = getSubKey(viewId);

  if (isAdm) {
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
    const toolLink = document.querySelector(`#rbac_cat_tools li[data-rbac-sub="${subKey}"] a`);
    if (toolLink) toolLink.classList.add("active-link");

    if (typeof window.showAdminPanelTab === "function") {
      window.showAdminPanelTab(viewId);
    } else if (window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
      window.adminPanel.navigateTo(viewId);
    }
    if (typeof window.closeMobileSidebar === "function") {
      window.closeMobileSidebar();
    }
    return;
  }

  // Non-Admin routing: check access & directly open assigned tool dashboard
  const hasAccess = window.RBAC && typeof window.RBAC.hasSectionAccess === "function"
    ? (
        window.RBAC.hasSectionAccess("adminControlCenter", subKey) ||
        window.RBAC.hasSectionAccess("adminControlCenter", viewId) ||
        (subKey === "appStream" && (
          window.RBAC.hasSectionAccess("adminControlCenter", "appStream") ||
          window.RBAC.hasSectionAccess("adminControlCenter", "app-stream") ||
          (window.RBAC.subsections?.adminControlCenter?.appStream === true)
        ))
      )
    : (window.RBAC && typeof window.RBAC.hasModuleAccess === "function" && window.RBAC.hasModuleAccess("adminControlCenter"));

  if (!hasAccess) {
    if (window.RBAC && typeof window.RBAC.showAccessDenied === "function") {
      window.RBAC.showAccessDenied(viewId);
    } else if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "warning",
        title: "Access Restricted",
        text: "You do not have permission to access this tool.",
        confirmButtonColor: "#2563eb"
      });
    } else {
      alert("Access Restricted: You do not have permission to access this tool.");
    }
    return;
  }

  // Clear other active sidebar links and highlight clicked tool sub-tab under Tools
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const toolLink = document.querySelector(`#rbac_cat_tools li[data-rbac-sub="${subKey}"] a`);
  if (toolLink) toolLink.classList.add("active-link");

  // Directly open assigned tool dashboard (load admin-panel.js on demand if not yet loaded)
  const triggerToolOpen = () => {
    if (typeof window.showAdminPanelTab === "function") {
      window.showAdminPanelTab(viewId);
    } else if (window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
      window.adminPanel.navigateTo(viewId);
    }
  };

  if (typeof window.showAdminPanelTab === "function" || (window.adminPanel && typeof window.adminPanel.navigateTo === "function")) {
    triggerToolOpen();
  } else if (typeof window.loadAdminPanelOnDemand === "function") {
    window.loadAdminPanelOnDemand().then(() => {
      triggerToolOpen();
    });
  }

  if (typeof window.closeMobileSidebar === "function") {
    window.closeMobileSidebar();
  }
};

  
    
function showCDUVDUTab() {  
  // Hide all other tabs  
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  const smt = document.getElementById("selectedMechanismTitle");
  if (smt) smt.style.display = "none";  
  hideWelcomePanel();  
  hideAllMainPanels(); // ✅ Also hide API 571 panels  
  
  function doOpen() {
    // ✅ Close other modals if open  
    const pfm = document.getElementById("processFlowModal");
    if (pfm) pfm.style.display = "none";
    const mm = document.getElementById("mspModal");
    if (mm) mm.style.display = "none";
    const hm = document.getElementById("h2uModal");
    if (hm) hm.style.display = "none";
    
    // ✅ Show CDU/VDU modal  
    const modal = document.getElementById("cduVduModal");
    if (modal) {
      modal.classList.remove("sidebar-collapsed");
      modal.style.display = "block";
      const toggleBtn = modal.querySelector(".diagram-sidebar-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "↔ Hide Sidebar";
    }
    if (typeof initCDUVDU === "function") initCDUVDU(); // ✅ Ensure SVG and logic are loaded  
  }

  if (!document.getElementById("cduVduModal") && window.TemplateManager && typeof window.TemplateManager.loadPfdModals === "function") {
    window.TemplateManager.loadPfdModals(doOpen);
  } else {
    doOpen();
  }
}  
  
function closeCDUVDUModal() {  
  const m = document.getElementById("cduVduModal");
  if (m) m.style.display = "none";  
  if (typeof window.clearCduvduBlinkIntervals === "function") window.clearCduvduBlinkIntervals();
  hideAllMainPanels(); // ✅ Ensure Damage Mechanism panels are hidden after close  
}  
  
function showPROCESSFLOWDIAGRAMSTab() {  
  // Hide all other tabs  
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  const smt = document.getElementById("selectedMechanismTitle");
  if (smt) smt.style.display = "none";  
  hideWelcomePanel();  
  hideAllMainPanels(); // ✅ Hide DM panels to prevent residual view  
  
  function doOpen() {
    // ✅ Close other modals if open  
    const cvm = document.getElementById("cduVduModal");
    if (cvm) cvm.style.display = "none";
    const mm = document.getElementById("mspModal");
    if (mm) mm.style.display = "none";
    const hm = document.getElementById("h2uModal");
    if (hm) hm.style.display = "none";
    
    // ✅ Show Process Flow modal  
    const modal = document.getElementById("processFlowModal");
    if (modal) {
      modal.classList.remove("sidebar-collapsed");
      modal.style.display = "block";
      const toggleBtn = modal.querySelector(".diagram-sidebar-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "↔ Hide Sidebar";
    }
    if (typeof initProcessFlow === "function") initProcessFlow();
  }

  if (!document.getElementById("processFlowModal") && window.TemplateManager && typeof window.TemplateManager.loadPfdModals === "function") {
    window.TemplateManager.loadPfdModals(doOpen);
  } else {
    doOpen();
  }
}  
  
function closeProcessFlowModal() {  
  const m = document.getElementById("processFlowModal");
  if (m) m.style.display = "none";  
  if (typeof window.clearMainBlinkIntervals === "function") window.clearMainBlinkIntervals();
  hideAllMainPanels(); // ✅ Clean up API 571 panels  
}  
  
function showMSPTab() {  
  // Hide all other tabs  
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  const smt = document.getElementById("selectedMechanismTitle");
  if (smt) smt.style.display = "none";  
  hideWelcomePanel();  
  hideAllMainPanels(); // ✅ Hide DM panels  
  
  function doOpen() {
    // ✅ Close other modals if open  
    const cvm = document.getElementById("cduVduModal");
    if (cvm) cvm.style.display = "none";
    const pfm = document.getElementById("processFlowModal");
    if (pfm) pfm.style.display = "none";
    const hm = document.getElementById("h2uModal");
    if (hm) hm.style.display = "none";
    
    // ✅ Show MSP modal  
    const modal = document.getElementById("mspModal");
    if (modal) {
      modal.classList.remove("sidebar-collapsed");
      modal.style.display = "block";
      const toggleBtn = modal.querySelector(".diagram-sidebar-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "↔ Hide Sidebar";
    }
    if (typeof initMSP === "function") initMSP(); // ✅ Ensure SVG and logic are loaded  
  }

  if (!document.getElementById("mspModal") && window.TemplateManager && typeof window.TemplateManager.loadPfdModals === "function") {
    window.TemplateManager.loadPfdModals(doOpen);
  } else {
    doOpen();
  }
}  
  
function closeMSPModal() {  
  const m = document.getElementById("mspModal");
  if (m) m.style.display = "none";  
  if (typeof window.clearMspBlinkIntervals === "function") window.clearMspBlinkIntervals();
  hideAllMainPanels(); // ✅ Ensure Damage Mechanism panels are hidden after close  
}  
  
function showH2UTab() {  
  // Hide all other tabs  
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");  
  const smt = document.getElementById("selectedMechanismTitle");
  if (smt) smt.style.display = "none";  
  hideWelcomePanel();  
  hideAllMainPanels();  
  
  function doOpen() {
    // ✅ Close other modals if open  
    const cvm = document.getElementById("cduVduModal");
    if (cvm) cvm.style.display = "none";
    const pfm = document.getElementById("processFlowModal");
    if (pfm) pfm.style.display = "none";
    const mm = document.getElementById("mspModal");
    if (mm) mm.style.display = "none";
    
    // ✅ Show H2U modal  
    const modal = document.getElementById("h2uModal");
    if (modal) {
      modal.classList.remove("sidebar-collapsed");
      modal.style.display = "block";
      const toggleBtn = modal.querySelector(".diagram-sidebar-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "↔ Hide Sidebar";
    }
    if (typeof initH2U === "function") initH2U();   
  }

  if (!document.getElementById("h2uModal") && window.TemplateManager && typeof window.TemplateManager.loadPfdModals === "function") {
    window.TemplateManager.loadPfdModals(doOpen);
  } else {
    doOpen();
  }
}  
  
function closeH2UModal() {  
  const m = document.getElementById("h2uModal");
  if (m) m.style.display = "none";  
  if (typeof window.clearH2uBlinkIntervals === "function") window.clearH2uBlinkIntervals();
  hideAllMainPanels();   
}  

window.showCDUVDUTab = showCDUVDUTab;
window.showPROCESSFLOWDIAGRAMSTab = showPROCESSFLOWDIAGRAMSTab;
window.showMSPTab = showMSPTab;
window.showH2UTab = showH2UTab;
  
// Stub for backward compatibility
function injectProcessFlowDiagramsCategory() { renderServerDrivenSidebar(); }
window.injectProcessFlowDiagramsCategory = injectProcessFlowDiagramsCategory;
window.injectAPI581Category = function() { renderServerDrivenSidebar(); };
window.injectAPI570Category = function() { renderServerDrivenSidebar(); };
window.injectDesignThicknessCalculatorCategory = function() { renderServerDrivenSidebar(); };
window.injectCrackingMechanismCategory = function() { renderServerDrivenSidebar(); };
window.injectStressMaterialDataCategory = function() { renderServerDrivenSidebar(); };
window.injectCCDAIPlatformCategory = function() { renderServerDrivenSidebar(); };
window.injectChemicalSuiteCategory = function() { renderServerDrivenSidebar(); };
window.injectStreamComparatorCategory = function() { renderServerDrivenSidebar(); };
window.injectUnitConverterCategory = function() { renderServerDrivenSidebar(); };
window.injectToolsCategory = function() { renderServerDrivenSidebar(); };

// Central helper ensuring every expandable sidebar category and subcategory displays the ▸ / ▾ arrow indicator
function ensureAllSidebarArrows() {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;
  const topLis = Array.from(categoryList.children).filter(el => el.tagName === "LI");
  topLis.forEach(li => {
    let catHeader = li.querySelector(".category");
    if (!catHeader) {
      catHeader = document.createElement("span");
      catHeader.className = "category";
      catHeader.setAttribute("data-accordion-trigger", "true");
      catHeader.setAttribute("role", "button");
      catHeader.setAttribute("tabindex", "0");
      const modId = li.getAttribute("data-rbac-module") || (li.id ? li.id.replace(/^rbac_cat_/, "") : "");
      if (modId) catHeader.setAttribute("data-mod-id", modId);
      const nonUl = Array.from(li.childNodes).filter(n => n.nodeName !== "UL");
      nonUl.forEach(n => catHeader.appendChild(n));
      li.insertBefore(catHeader, li.firstChild);
    }
    let arrow = catHeader.querySelector(".arrow, .tool-arrow, .toggle-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "arrow toggle-arrow";
      arrow.textContent = "▸";
      catHeader.insertBefore(arrow, catHeader.firstChild);
    }
    let subUl = li.querySelector(":scope > ul.mechanisms, :scope > ul");
    if (!subUl) {
      subUl = document.createElement("ul");
      subUl.className = "mechanisms";
      subUl.style.display = "none";
      const modId = li.getAttribute("data-rbac-module") || (li.id ? li.id.replace(/^rbac_cat_/, "") : "");
      const titleSpan = catHeader.querySelector(".category-title");
      const titleText = titleSpan ? titleSpan.textContent.trim() : "Open Module";
      const subLi = document.createElement("li");
      subLi.setAttribute("data-rbac-module", modId);
      subLi.setAttribute("data-rbac-sub", modId);
      const subA = document.createElement("a");
      subA.href = "javascript:void(0)";
      subA.className = "sidebar-nav-link";
      subA.setAttribute("data-mod-id", modId);
      subA.setAttribute("data-sub-id", modId);
      subA.style.pointerEvents = "auto";
      subA.textContent = titleText;
      subLi.appendChild(subA);
      subUl.appendChild(subLi);
      li.appendChild(subUl);
    }
    const isExpanded = Boolean(subUl && subUl.style.display === "block");
    arrow.textContent = isExpanded ? "▾" : "▸";
  });
  const subCats = categoryList.querySelectorAll(".subcategory");
  subCats.forEach(el => {
    let arrow = el.querySelector(".arrow, .tool-arrow, .toggle-arrow");
    let ul = el.nextElementSibling;
    while (ul && ul.tagName !== "UL") {
      ul = ul.nextElementSibling;
    }
    const isExpanded = Boolean(ul && ul.style.display === "block");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "arrow toggle-arrow";
      el.insertBefore(arrow, el.firstChild);
    }
    arrow.textContent = isExpanded ? "▾" : "▸";
  });
}
window.ensureAllSidebarArrows = ensureAllSidebarArrows;

window.showSimpleTab = function() { if (typeof window.showSimplePipingTab === "function") return window.showSimplePipingTab(); };
window.showCOFTab = function() { if (typeof window.showcof_calculatorTab === "function") return window.showcof_calculatorTab(); };
window.showQPOFTab = function() { if (typeof window.showQPOF_calculatorTab === "function") return window.showQPOF_calculatorTab(); };
window.showPOFTab = function() { if (typeof window.showQPOF_calculatorTab === "function") return window.showQPOF_calculatorTab(); };

function activateSidebarModule(modId, subId, autoCloseDrawer = true) {
  console.log(`[Sidebar Navigation] Clicked module: "${modId}", subsection/tab: "${subId}"`);
  try {
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    const launchMap = {
      api581: "showCriteriaTab",
      api570: "showRemainingLifeTab",
      remainingLifeCalc: "showRemainingLifeTab",
      thicknessCalc: "showASMEB31_3Tab",
      damageExplorer: "showDamageMechanismTab",
      damageCatalog: "showDamageMechanismTab",
      damageMechanisms: "showDamageMechanismTab",
      damage: "showDamageMechanismTab",
      api571: "showDamageMechanismTab",
      api571Criteria: "showCriteriaTab",
      corrosionRate: "showCorrosionFullTab",
      fluidSelector: "showFluidSelectorTab",
      inventoryCalc: "showInventoryTab",
      inspectionConfidence: "showINSPECTIONCONFIDENCETab",
      toxicCalc: "showTOXIC_CALCULATIONTab",
      cofCalculator: "showcof_calculatorTab",
      cof: "showcof_calculatorTab",
      qpofCalculator: "showQPOF_calculatorTab",
      qpof: "showQPOF_calculatorTab",
      pof: "showQPOF_calculatorTab",
      corrosionCalc: "showCORROSION_CALCULATIONTab",
      statisticalAnalysis: "showRemainingLifeTab",
      asmeB31_3: "showASMEB31_3Tab",
      simplePiping: "showSimplePipingTab",
      simple: "showSimplePipingTab",
      asmeSectionVIII: "showASMESECTIONVIIIDIV1Tab",
      pipeThickness: "showpipeThicknessTab",
      structuralThickness: "showStructuralThicknessTab",
      crackingMechanism: "showCrackingMechanismTab",
      crackingFinder: "showCrackingMechanismTab",
      cracking: "showCrackingMechanismTab",
      appCracking: "showCrackingMechanismTab",
      "app-cracking": "showCrackingMechanismTab",
      bkStress: "showbkStressTab",
      stressLookup: "showbkStressTab",
      streamComparatorMain: "showStreamComparatorTab",
      streamComparator: "showStreamComparatorTab",
      chemicalSafetySuite: "showChemicalSuiteTab",
      chemicalSuite: "showChemicalSuiteTab",
      unitConverterMain: "showUnitConverterTab",
      unitConverter: "showUnitConverterTab",
      processFlow: "showCDUVDUTab",
      atmospheric: "showPROCESSFLOWDIAGRAMSTab",
      cduVdu: "showCDUVDUTab",
      msp: "showMSPTab",
      h2u: "showH2UTab",
      ccdAiPlatform: "showCCDAITab",
      ccdAI: "showCCDAITab"
    };

    // Deep search schema for launcher function or tool ID
    const navMods = window.RBAC?.authorizedNavigation || window.layoutConfig?.sidebarModules || DEFAULT_SIDEBAR_MODULES || [];
    let schemaLauncher = null;
    let schemaTool = null;

    function deepSearchNav(items) {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (item.id === subId || item.id === modId) {
          if (item.launcherFunc) schemaLauncher = item.launcherFunc;
          if (item.tool) schemaTool = item.tool;
        }
        if (Array.isArray(item.subsections)) deepSearchNav(item.subsections);
        if (Array.isArray(item.children)) deepSearchNav(item.children);
      }
    }

    deepSearchNav(navMods);
    if (!schemaLauncher && !schemaTool) {
      deepSearchNav(DEFAULT_SIDEBAR_MODULES);
    }

    const fnName = schemaLauncher || launchMap[subId] || launchMap[modId];

    if (fnName && fnName === "openTool") {
      if (typeof window.openTool === "function") {
        window.openTool(schemaTool || subId);
      }
    } else if (fnName && typeof window[fnName] === "function") {
      const res = window[fnName]();
      if (res && typeof res.catch === "function") {
        res.catch(err => console.error(`[Sidebar Navigation] Unhandled promise rejection in ${fnName}:`, err));
      }
    } else if (modId === "adminControlCenter" || schemaTool) {
      if (typeof window.openTool === "function") {
        window.openTool(schemaTool || subId);
      }
    } else {
      console.warn(`[Sidebar Navigation] No tab launcher function found for modId=${modId}, subId=${subId}`);
    }

    if (autoCloseDrawer !== false && typeof window.closeMobileSidebar === "function") {
      window.closeMobileSidebar();
    }
  } catch (err) {
    console.error(`[Sidebar Navigation] Error activating module ${modId}/${subId}:`, err);
  }
}
window.activateSidebarModule = activateSidebarModule;

function injectAllCategories() {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const rbacNav = window.RBAC?.authorizedNavigation;
  const layoutNav = window.layoutConfig?.sidebarModules;
  const navModules = (Array.isArray(rbacNav) && rbacNav.length > 0)
    ? rbacNav
    : ((Array.isArray(layoutNav) && layoutNav.length > 0) ? layoutNav : []);

  renderServerDrivenSidebar(navModules);
}
window.injectAllCategories = injectAllCategories;

  // Global Live Damage Mechanisms synchronizer from Cloud Firestore
  window.refreshDamageMechanisms = async function (forceLive = true) {
    try {
      const url = forceLive ? "/api/damage-mechanisms?refresh=1" : "/api/damage-mechanisms";
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (res.ok) {
        const json = await res.json();
        const mechs = json["Damage Mechanism"] || json.mechanisms || json;
        if (mechs && typeof mechs === "object") {
          window.data = window.data || {};
          window.data["Damage Mechanism"] = mechs;
          window.damageMechanisms = Object.assign(window.damageMechanisms || {}, mechs);
          for (const [k, v] of Object.entries(mechs)) {
            if (v && v.code) window.damageMechanisms[String(v.code)] = v;
          }
          if (typeof window.loadCategories === "function") {
            window.loadCategories(window.data);
          }
          // Refresh active open damage mechanism view if visible
          const titleEl = document.getElementById("selectedMechanismTitle");
          if (titleEl && titleEl.style.display !== "none") {
            const currentName = (titleEl.textContent || "").trim();
            if (currentName && mechs[currentName] && typeof window.showMechanismDetails === "function") {
              window.showMechanismDetails(currentName, mechs[currentName]);
            }
          }
          return { "Damage Mechanism": mechs };
        }
      }
    } catch (err) {
      console.warn("[refreshDamageMechanisms] Live sync notice:", err);
    }
    return window.data || { "Damage Mechanism": {} };
  };

  // Pre-fetch damage mechanisms from secure backend API (idempotent / window scoped)
  window._damageMechanismsPromise = window._damageMechanismsPromise || (async () => {
    if (typeof window !== "undefined" && window.data && window.data["Damage Mechanism"] && Object.keys(window.data["Damage Mechanism"]).length > 0) {
      return window.data;
    }
    return await window.refreshDamageMechanisms(false);
  })();

  const initSidebarOnBoot = async () => {
    initSidebarNavigationClicks();
    injectAllCategories();

    // 3. Apply published layout configuration from server for all users
    if (window.adminPanel && typeof window.adminPanel.loadAndApplyPublishedLayoutConfig === "function") {
      window.adminPanel.loadAndApplyPublishedLayoutConfig();
    } else {
      fetch("/api/admin?action=get_layout_config")
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.config) {
            window.layoutConfig = data.config;
            if (typeof window.applyPublishedSidebarLayout === "function") {
              window.applyPublishedSidebarLayout(data.config);
            }
          }
        })
        .catch(() => {});
    }

    // 4. Asynchronously load damage mechanisms without disrupting DOM positions
    let mechData = (typeof window.data !== "undefined" && window.data && window.data["Damage Mechanism"] && Object.keys(window.data["Damage Mechanism"]).length > 0)
      ? window.data
      : await window._damageMechanismsPromise;
    if (mechData && typeof loadCategories === "function") {
      loadCategories(mechData);
    }

    // Ensure all arrows are properly set
    ensureAllSidebarArrows();
  };

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initSidebarOnBoot);
  } else {
    initSidebarOnBoot();
  }


// ✅ NEW FUNCTION (IMPORTANT)
function openB313FromSimple() {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");

  // Show B31.3 tab
  const b313Tab = document.getElementById("ASMEB31_3Tab");
  if (b313Tab) b313Tab.style.display = "block";

  // Hide welcome panel & mechanism title
  const welcome = document.getElementById("welcomePanel");
  if (welcome) welcome.style.display = "none";
  const title = document.getElementById("selectedMechanismTitle");
  if (title) title.style.display = "none";

  // Transfer inputs from Simple Calculator if available
  const sP = document.getElementById("simple_pressure");
  const sPUnit = document.getElementById("simple_pressureUnit");
  const sS = document.getElementById("simple_stress");
  const sSUnit = document.getElementById("simple_stressUnit");
  const sD = document.getElementById("simple_diameter");
  const sE = document.getElementById("simple_efficiency");
  const sCA = document.getElementById("simple_corrosion");

  if (sP && sP.value && document.getElementById("b313_pressure")) {
    document.getElementById("b313_pressure").value = sP.value;
  }
  if (sPUnit && sPUnit.value && document.getElementById("b313_pressureUnit")) {
    document.getElementById("b313_pressureUnit").value = sPUnit.value;
  }
  if (sS && sS.value && document.getElementById("b313_stress")) {
    document.getElementById("b313_stress").value = sS.value;
  }
  if (sSUnit && sSUnit.value && document.getElementById("b313_stressUnit")) {
    document.getElementById("b313_stressUnit").value = sSUnit.value;
  }
  if (sD && sD.value && document.getElementById("b313_diameter")) {
    document.getElementById("b313_diameter").value = sD.value;
  }
  if (sE && sE.value && document.getElementById("b313_efficiency")) {
    document.getElementById("b313_efficiency").value = sE.value;
  }
  if (sCA && sCA.value && document.getElementById("b313_corrosion")) {
    document.getElementById("b313_corrosion").value = sCA.value;
  }

  if (typeof window.initB313 === "function") {
    window.initB313();
  }
}
window.openB313FromSimple = openB313FromSimple;
  
