
  // ⚙️ Top-Right Settings Menu Toggle Handler (Global & Resilient)
  function toggleSettingsMenu(e) {
    if (e) {
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      if (typeof e.preventDefault === "function") e.preventDefault();
    }
    if (e && e.target && e.target.closest) {
      const remContainer = e.target.closest("#remainingLifeTab") || e.target.closest(".remaining-settings-container") || e.target.closest("#settingsMenu");
      if (remContainer) {
        if (typeof window.toggleRemainingSettingsMenu === "function") {
          window.toggleRemainingSettingsMenu(e);
          return;
        }
        const remMenu = document.getElementById("settingsMenu");
        if (remMenu) {
          const isVis = remMenu.style.display === "block";
          remMenu.style.display = isVis ? "none" : "block";
          return;
        }
      }
    }
    const dropdown = document.getElementById("dropdownContent");
    if (!dropdown) return;
    dropdown.classList.toggle("show");
  }
  window.toggleSettingsMenu = toggleSettingsMenu;

  function initSettingsBtn() {
    const settingsBtn = document.getElementById("settingsBtn");
    const dropdown = document.getElementById("dropdownContent");
    if (settingsBtn && dropdown) {
      settingsBtn.onclick = function(e) {
        toggleSettingsMenu(e);
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettingsBtn);
  } else {
    initSettingsBtn();
  }

  // Close dropdown on outside click or Escape key
  window.addEventListener("click", (e) => {
    const dropdown = document.getElementById("dropdownContent");
    const btn = document.getElementById("settingsBtn");
    if (!dropdown || !dropdown.classList.contains("show")) return;
    if (e.target && !dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
      dropdown.classList.remove("show");
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e && e.key === "Escape") {
      const dropdown = document.getElementById("dropdownContent");
      if (dropdown) dropdown.classList.remove("show");
    }
  });  
  
  // ✅ Hide welcome panel  
  function hideWelcomePanel() {  
    const panel = document.getElementById("welcomePanel");  
    if (panel) {  
      panel.classList.add("is-hidden");
      panel.style.removeProperty("display");
      panel.style.setProperty("display", "none", "important");  
      if (panel.classList.contains("is-fullscreen")) {
        panel.classList.remove("is-fullscreen");
        document.body.style.overflow = "";
      }
    }  
    document.querySelectorAll(".welcome-panel, #welcomePanel").forEach(p => {
      p.classList.add("is-hidden");
      p.style.setProperty("display", "none", "important");
    });
  }  
  window.hideWelcomePanel = hideWelcomePanel;

  function showWelcomePanel() {
    const panel = document.getElementById("welcomePanel");
    if (panel) {
      panel.classList.remove("is-hidden");
      panel.style.removeProperty("display");
      panel.style.setProperty("display", "flex", "important");
    }
    const title = document.getElementById("selectedMechanismTitle");
    if (title) title.style.display = "none";
    const mechDetails = document.getElementById("mechanismDetailsContainer");
    if (mechDetails) {
      mechDetails.innerHTML = "";
      mechDetails.style.display = "none";
    }
  }
  window.showWelcomePanel = showWelcomePanel;  


function openHelp() {
  window.open("help.html", "_blank"); // ye help.html nayi tab me kholega
}
    
    
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

function showRPTUDashboard() {
  window.open("RPTU_Dashboard.html", "_blank");
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
window.showRPTUDashboard = showRPTUDashboard;
  
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
      const leafLink = e.target.closest('a[data-mod-id], a[data-sub-id], .sidebar-tab-link, a.sidebar-nav-link, li[data-rbac-module] a, #categoryList a');
      const trigger = e.target.closest('.toggle-arrow, .arrow, .category, .subcategory, [data-accordion-trigger], .category-title');

      // A. Actionable Leaf Tab Navigation
      if (leafLink) {
        const parentLi = leafLink.closest('li');
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
            window.activateSidebarModule(modId, subId);
          }

          if (typeof window.closeMobileSidebar === 'function') {
            window.closeMobileSidebar();
          }
          return;
        }
      }

      // B. Accordion Header / Category Click
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();

        const parentLi = trigger.closest('li');
        if (!parentLi) return;

        const subList = parentLi.querySelector('ul.mechanisms, ul.subcategory-list, ul');
        const modId = parentLi.getAttribute('data-rbac-module');

        if (subList) {
          const isHidden = window.getComputedStyle(subList).display === 'none';
          subList.style.display = isHidden ? 'block' : 'none';

          const arrow = parentLi.querySelector('.arrow, .toggle-arrow');
          if (arrow) {
            arrow.textContent = isHidden ? '▾' : '▸';
          }

          // Expand accordion and load primary module in background WITHOUT auto-closing the drawer
          if (modId && typeof window.activateSidebarModule === 'function') {
            window.activateSidebarModule(modId, modId, false);
          }
        } else if (modId && typeof window.activateSidebarModule === 'function') {
          window.activateSidebarModule(modId, modId, true);
        }
      }
    };
  }
  window.initSidebarNavigationClicks = initSidebarNavigationClicks;



  function renderServerDrivenSidebar(authorizedNavigation) {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    initSidebarNavigationClicks();

    const rbacNav = window.RBAC?.authorizedNavigation;
    const layoutNav = window.layoutConfig?.sidebarModules;
    const navModules = (authorizedNavigation && Array.isArray(authorizedNavigation) && authorizedNavigation.length > 0)
      ? authorizedNavigation
      : (Array.isArray(rbacNav) && rbacNav.length > 0 ? rbacNav : (Array.isArray(layoutNav) && layoutNav.length > 0 ? layoutNav : []));

    if (!Array.isArray(navModules) || navModules.length === 0) return;

    // Preserve open states of Level 1 and Level 2 accordions before re-rendering
    const openStates = new Set();
    categoryList.querySelectorAll("li[id^='rbac_cat_'], li.subcategory-item").forEach(li => {
      const mainUl = li.querySelector("ul.mechanisms, ul");
      if (mainUl && mainUl.style.display === "block") {
        const stateKey = li.id || li.getAttribute("data-rbac-subcategory") || li.getAttribute("data-group-id");
        if (stateKey) openStates.add(stateKey);
      }
    });

    categoryList.innerHTML = "";

    navModules.forEach(mod => {
      if (!mod || !mod.id) return;

      const li = document.createElement("li");
      li.id = `rbac_cat_${mod.id}`;
      li.setAttribute("data-rbac-module", mod.id);

      const iconStr = mod.icon ? `${mod.icon} ` : "";
      const isModOpen = openStates.has(li.id);
      const arrowChar = isModOpen ? "▾" : "▸";
      const displayStyle = isModOpen ? "block" : "none";

      const subs = Array.isArray(mod.subsections) ? mod.subsections : [];

      if (subs.length === 0) {
        // Level 1 single action item without sub-accordions
        li.innerHTML = `
          <span class="category">
            <a href="javascript:void(0)" data-mod-id="${mod.id}" data-sub-id="${mod.id}" class="sidebar-nav-link" style="color: inherit; text-decoration: none; display: flex; align-items: center; width: 100%;">
              <span class="category-title">${iconStr}${mod.name}</span>
            </a>
          </span>
        `;
      } else {
        // Level 1 Accordion Header - Make title a clickable link that activates module and toggles category
        const firstSubId = subs[0]?.id || mod.id;
        let innerHTML = `
          <span class="category" data-accordion-trigger="true">
            <span class="arrow toggle-arrow">${arrowChar}</span>
            <span class="category-title">${iconStr}${mod.name}</span>
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
              <a href="javascript:void(0)" data-mod-id="${mod.id}" data-sub-id="${sub.id}"${tabAttr} class="sidebar-nav-link">${subIcon}${sub.name}</a>
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
                <a href="javascript:void(0)" data-mod-id="${mod.id}" data-sub-id="${child.id}"${tabAttr} class="sidebar-nav-link">${childIcon}${child.name}</a>
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
              <span class="subcategory" data-accordion-trigger="true">
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

      categoryList.appendChild(li);
    });

    ensureAllSidebarArrows();

    if (window.data && window.data["Damage Mechanism"] && typeof window.loadCategories === "function") {
      window.loadCategories(window.data);
    }
  }
  window.renderServerDrivenSidebar = renderServerDrivenSidebar;

function showCCDAITab() {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  hideAllMainPanels();

  // Ensure fullscreen admin console mode is deactivated so tool renders in main dashboard
  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

  const tab = document.getElementById("ccdAiTab");
  if (tab) {
    tab.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Highlight CCD AI Platform in main sidebar
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_ccdAI li[data-rbac-sub="ccdAiPlatform"] a');
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
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  hideAllMainPanels();

  // Ensure fullscreen admin console mode is deactivated so tool renders in main dashboard
  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

  const tab = document.getElementById("streamComparatorTab");
  if (tab) {
    tab.style.display = "block";
    tab.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Highlight standalone Stream Comparator in main sidebar
  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  const link = document.querySelector('#rbac_cat_streamComparator li[data-rbac-sub="streamComparatorMain"] a');
  if (link) link.classList.add("active-link");
}
window.showStreamComparatorTab = showStreamComparatorTab;

function showUnitConverterTab() {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const mechTitle = document.getElementById("selectedMechanismTitle");
  if (mechTitle) mechTitle.style.display = "none";
  hideWelcomePanel();
  hideAllMainPanels();

  const tab = document.getElementById("unitConverterTab");
  if (tab) {
    tab.style.display = "block";
    tab.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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

  // Directly open assigned tool dashboard
  if (typeof window.showAdminPanelTab === "function") {
    window.showAdminPanelTab(viewId);
  } else if (window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
    window.adminPanel.navigateTo(viewId);
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
window.injectRPTUDashboardCategory = function() { renderServerDrivenSidebar(); };
window.injectCCDAIPlatformCategory = function() { renderServerDrivenSidebar(); };
window.injectChemicalSuiteCategory = function() { renderServerDrivenSidebar(); };
window.injectStreamComparatorCategory = function() { renderServerDrivenSidebar(); };
window.injectUnitConverterCategory = function() { renderServerDrivenSidebar(); };
window.injectToolsCategory = function() { renderServerDrivenSidebar(); };

// Central helper ensuring every expandable sidebar category and subcategory displays the ▸ / ▾ arrow indicator
function ensureAllSidebarArrows() {
  const sidebarItems = document.querySelectorAll("#categoryList .category, #categoryList .subcategory");
  sidebarItems.forEach(el => {
    let ul = el.nextElementSibling;
    while (ul && ul.tagName !== "UL") {
      ul = ul.nextElementSibling;
    }
    if (!ul) {
      const parentLi = el.closest("li");
      if (parentLi) ul = parentLi.querySelector("ul.mechanisms, ul");
    }
    if (ul) {
      let arrow = el.querySelector(".arrow, .tool-arrow");
      const isExpanded = (ul.style.display === "block");
      if (!arrow) {
        arrow = document.createElement("span");
        arrow.className = "arrow";
        el.insertBefore(arrow, el.firstChild);
      }
      arrow.textContent = isExpanded ? "▾" : "▸";
    }
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
      rptuDashboard: "showRPTUDashboard",
      rptu: "showRPTUDashboard",
      ccdAiPlatform: "showCCDAITab",
      ccdAI: "showCCDAITab"
    };

    // Deep search schema for launcher function or tool ID
    const navMods = window.RBAC?.authorizedNavigation || window.layoutConfig?.sidebarModules || [];
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

  // Pre-fetch damage mechanisms from secure backend API (idempotent / window scoped)
  window._damageMechanismsPromise = window._damageMechanismsPromise || (async () => {
    if (typeof window !== "undefined" && window.data && window.data["Damage Mechanism"] && Object.keys(window.data["Damage Mechanism"]).length > 0) {
      return window.data;
    }
    try {
      const res = await fetch("/api/damage-mechanisms");
      if (res.ok) {
        const json = await res.json();
        const mechs = json["Damage Mechanism"] || json.mechanisms || json;
        if (typeof window !== "undefined") {
          window.data = window.data || {};
          window.data["Damage Mechanism"] = mechs;
          window.damageMechanisms = Object.assign(window.damageMechanisms || {}, mechs);
          for (const [k, v] of Object.entries(mechs)) {
            if (v && v.code) window.damageMechanisms[String(v.code)] = v;
          }
        }
        return { "Damage Mechanism": mechs };
      }
    } catch (err) {
      console.warn("Could not load damage mechanisms from secure backend API:", err);
    }
    return window.data || { "Damage Mechanism": {} };
  })();

  window.addEventListener("DOMContentLoaded", async () => {  
    // 3. Apply published layout configuration from server
    if (window.adminPanel && typeof window.adminPanel.loadAndApplyPublishedLayoutConfig === "function") {
      window.adminPanel.loadAndApplyPublishedLayoutConfig();
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
  });


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
  
