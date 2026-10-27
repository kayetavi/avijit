// ⚙️ TOP-RIGHT SETTINGS MENU TOGGLE & SHELL UI STATE
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

// Close settings dropdown on outside click or Escape key
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

// ✅ USERNAME & WELCOME
const rawUsername = (window.APP_SESSION && window.APP_SESSION.email) ? window.APP_SESSION.email.split("@")[0].toUpperCase() : ((typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("usernameUpper") || sessionStorage.getItem("loggedInUser")) : "") || "");
const username = rawUsername ? (rawUsername.includes("@") ? rawUsername.split("@")[0].toUpperCase() : rawUsername.toUpperCase()) : "";
const welcomeDiv = document.getElementById("welcome");
const scrollText = document.getElementById("scrollText");

if (welcomeDiv) {
  if (username) {
    welcomeDiv.innerHTML = `Welcome <span class="username-style">${username}</span>`;
  } else {
    welcomeDiv.innerHTML = "";
  }
}


// 🚪 LOGOUT FUNCTION
function logout() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("cached_rbac_permissions");
    sessionStorage.removeItem("dashboard_recent_tabs_v1");
    sessionStorage.removeItem("sessionId");
    sessionStorage.removeItem("userUid");
  }
  window.APP_SESSION = null;

  if (window.recentTabsManager && typeof window.recentTabsManager.clearOnLogout === "function") {
    try {
      window.recentTabsManager.clearOnLogout();
    } catch (e) {}
  }

  if (typeof window.performLogout === "function") {
    window.performLogout();
  } else {
    window.location.href = "index.html";
  }
}
window.logout = logout;

// 🌙 DARK MODE HANDLER
const root = document.documentElement;

function applyTheme(theme) {
  const isDark = theme === "dark";
  if (isDark) {
    root.classList.remove("light-mode");
    root.classList.add("dark-mode");
    if (document.body) {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
    }
  } else {
    root.classList.remove("dark-mode");
    root.classList.add("light-mode");
    if (document.body) {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
    }
  }
  const admBtn = document.getElementById("admThemeToggleBtn");
  if (admBtn) {
    admBtn.innerHTML = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    admBtn.title = isDark ? "Switch Admin Panel & Dashboard to Light Mode" : "Switch Admin Panel & Dashboard to Dark Mode";
  }
}
window.applyTheme = applyTheme;

let currentMode = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("theme") : null);
if (!currentMode) {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem("theme", "light");
  currentMode = "light";
}

applyTheme(currentMode);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    applyTheme((typeof sessionStorage !== "undefined" ? sessionStorage.getItem("theme") : null) || "dark");
  });
} else {
  applyTheme(currentMode);
}

function toggleDarkMode() {
  const isCurrentlyLight = root.classList.contains("light-mode");
  const newTheme = isCurrentlyLight ? "dark" : "light";
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem("theme", newTheme);
  applyTheme(newTheme);

  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: newTheme } }));
  if (typeof updateChartTheme === "function") {
    try {
      updateChartTheme(newTheme);
    } catch (e) {}
  }
}
window.toggleDarkMode = toggleDarkMode;

// 📱 Mobile Navigation Drawer Controls
let _dashboardSidebarLock = false;
let _dashboardLastSidebarToggle = 0;

function getMainSidebar() {
  return document.getElementById("mainSidebar") || document.querySelector(".sidebar");
}

function openMobileSidebar(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  _dashboardLastSidebarToggle = Date.now();
  const sidebar = getMainSidebar();
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) {
    sidebar.classList.add("mobile-open");
    sidebar.style.setProperty("transform", "translate3d(0, 0, 0)", "important");
    sidebar.style.setProperty("-webkit-transform", "translate3d(0, 0, 0)", "important");
    sidebar.style.setProperty("visibility", "visible", "important");
    sidebar.style.setProperty("opacity", "1", "important");
    sidebar.style.setProperty("pointer-events", "auto", "important");
  }
  if (backdrop) {
    backdrop.classList.add("visible");
    backdrop.style.setProperty("display", "block", "important");
    backdrop.style.setProperty("opacity", "1", "important");
    backdrop.style.setProperty("pointer-events", "auto", "important");
  }
  document.body.classList.add("sidebar-open");
}
window.openMobileSidebar = openMobileSidebar;

function closeMobileSidebar(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  _dashboardLastSidebarToggle = Date.now();
  const sidebar = getMainSidebar();
  const backdrop = document.getElementById("sidebarBackdrop");
  if (sidebar) {
    sidebar.classList.remove("mobile-open");
    sidebar.style.removeProperty("transform");
    sidebar.style.removeProperty("-webkit-transform");
    sidebar.style.removeProperty("visibility");
    sidebar.style.removeProperty("opacity");
    sidebar.style.removeProperty("pointer-events");
  }
  if (backdrop) {
    backdrop.classList.remove("visible");
    backdrop.style.removeProperty("display");
    backdrop.style.setProperty("opacity", "0", "important");
    backdrop.style.setProperty("pointer-events", "none", "important");
  }
  document.body.classList.remove("sidebar-open");
}
window.closeMobileSidebar = closeMobileSidebar;

function toggleMobileSidebar(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  const now = Date.now();
  if (now - _dashboardLastSidebarToggle < 300 || _dashboardSidebarLock) {
    return;
  }
  _dashboardLastSidebarToggle = now;
  _dashboardSidebarLock = true;
  setTimeout(() => { _dashboardSidebarLock = false; }, 320);

  const sidebar = getMainSidebar();
  if (!sidebar) return;
  if (sidebar.classList.contains("mobile-open")) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}
window.toggleMobileSidebar = toggleMobileSidebar;

window.goHome = function() {
  document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");
  document.body.classList.remove("adm-windowed-mode");
  const adminTab = document.getElementById("adminPanelTab");
  if (adminTab) adminTab.style.display = "none";

  if (typeof hideAllMainPanels === "function") hideAllMainPanels();

  if (typeof showWelcomePanel === "function") {
    showWelcomePanel();
  } else {
    const welcome = document.getElementById("welcomePanel");
    if (welcome) {
      welcome.classList.remove("is-hidden");
      welcome.style.removeProperty("display");
      welcome.style.display = "flex";
    }
  }

  document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
  if (window.recentTabsManager) {
    window.recentTabsManager.currentActiveTabId = null;
    window.recentTabsManager.render();
  }
  if (window.RBAC && typeof window.RBAC.applySidebarVisibility === "function") {
    window.RBAC.applySidebarVisibility();
  }
  if (typeof window.closeMobileSidebar === "function") {
    window.closeMobileSidebar();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

function setupMobileSidebarEventListeners() {
  const toggleBtn = document.getElementById("mobileMenuToggleBtn");
  const headerToggleBtn = document.getElementById("headerHamburgerBtn");
  const fabBtn = document.getElementById("mobileFeaturesFab");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const backdrop = document.getElementById("sidebarBackdrop");

  if (toggleBtn) toggleBtn.onclick = (e) => toggleMobileSidebar(e);
  if (headerToggleBtn) headerToggleBtn.onclick = (e) => toggleMobileSidebar(e);
  if (fabBtn) fabBtn.onclick = (e) => toggleMobileSidebar(e);
  if (closeBtn) closeBtn.onclick = (e) => closeMobileSidebar(e);
  if (backdrop) backdrop.onclick = (e) => closeMobileSidebar(e);

  const sidebar = document.getElementById("mainSidebar") || document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.addEventListener("click", (e) => {
      if (
        e.target.closest("#searchBox") ||
        e.target.closest(".category-inline-filter") ||
        e.target.closest(".category-filter-icon") ||
        e.target.closest(".tool-arrow") ||
        e.target.closest(".arrow") ||
        e.target.closest(".sidebar-header") ||
        e.target.closest(".sidebar-bottom-footer") ||
        e.target.closest("[onclick*='toggleToolSubGroup']") ||
        e.target.closest("[onclick*='toggleCategory']")
      ) {
        return;
      }

      const catOrSub = e.target.closest(".category, .subcategory");
      if (catOrSub) {
        const parentLi = catOrSub.closest("li");
        const hasSubList = parentLi && parentLi.querySelector("ul.mechanisms, ul.subcategory-list, ul");
        if (hasSubList || catOrSub.hasAttribute("data-accordion-trigger")) {
          return;
        }
      }

      const targetLink = e.target.closest("a");
      if (targetLink) {
        const href = targetLink.getAttribute("href");
        if (href === "#" || href === "" || (href && href.startsWith("#"))) {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
        }

        if (typeof window.hideWelcomePanel === "function") {
          window.hideWelcomePanel();
        } else {
          const wp = document.getElementById("welcomePanel");
          if (wp) {
            wp.classList.add("is-hidden");
            wp.style.setProperty("display", "none", "important");
          }
        }
        document.querySelectorAll(".welcome-panel, #welcomePanel").forEach(p => {
          p.classList.add("is-hidden");
          p.style.setProperty("display", "none", "important");
        });

        setTimeout(() => {
          if (typeof window.closeMobileSidebar === "function") {
            window.closeMobileSidebar();
          }
        }, 120);
      }
    });
  }
}
window.setupMobileSidebarEventListeners = setupMobileSidebarEventListeners;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMobileSidebarEventListeners);
} else {
  setupMobileSidebarEventListeners();
}

function hideWelcomePanel() {
  const panel = document.getElementById("welcomePanel");
  if (panel) {
    panel.classList.add("is-hidden");
    panel.style.removeProperty("display");
    panel.style.setProperty("display", "none", "important");
    if (panel.classList.contains("is-fullscreen")) {
      panel.classList.remove("is-fullscreen");
      document.body.style.overflow = "";
      const expandIcon = panel.querySelector(".fs-icon-expand");
      const compressIcon = panel.querySelector(".fs-icon-compress");
      const btnText = panel.querySelector(".fs-btn-text");
      if (expandIcon) expandIcon.style.display = "inline-block";
      if (compressIcon) compressIcon.style.display = "none";
      if (btnText) btnText.textContent = "Full Screen";
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

function toggleWelcomeFullscreen() {
  const panel = document.getElementById("welcomePanel");
  if (!panel) return;
  const isFs = panel.classList.toggle("is-fullscreen");
  const expandIcon = panel.querySelector(".fs-icon-expand");
  const compressIcon = panel.querySelector(".fs-icon-compress");
  const btnText = panel.querySelector(".fs-btn-text");

  if (isFs) {
    if (expandIcon) expandIcon.style.display = "none";
    if (compressIcon) compressIcon.style.display = "inline-block";
    if (btnText) btnText.textContent = "Exit Full Screen";
    document.body.style.overflow = "hidden";
  } else {
    if (expandIcon) expandIcon.style.display = "inline-block";
    if (compressIcon) compressIcon.style.display = "none";
    if (btnText) btnText.textContent = "Full Screen";
    document.body.style.overflow = "";
  }
}
window.toggleWelcomeFullscreen = toggleWelcomeFullscreen;

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    const panel = document.getElementById("welcomePanel");
    if (panel && panel.classList.contains("is-fullscreen")) {
      toggleWelcomeFullscreen();
    }
  }
});

function updateDashboardCardCounts() {
  const cards = document.querySelectorAll("#dashCardsGrid .dash-card");
  let totalAllowed = 0;
  cards.forEach(card => {
    const isRbacHidden = card.getAttribute("data-rbac-hidden") === "true";
    if (!isRbacHidden) totalAllowed++;
  });
  const countBadge = document.getElementById("dashCardsTotalCount");
  if (countBadge) countBadge.textContent = totalAllowed;

  const emptyState = document.getElementById("dashCardsEmptyState");
  if (emptyState) {
    emptyState.style.display = totalAllowed === 0 ? "block" : "none";
  }
}
window.updateDashboardCardCounts = updateDashboardCardCounts;

function filterDashboardCards(query) {
  const q = String(query || "").toLowerCase().trim();
  const clearBtn = document.getElementById("dashSearchClearBtn");
  if (clearBtn) clearBtn.style.display = q ? "block" : "none";

  const cards = document.querySelectorAll("#dashCardsGrid .dash-card");
  let matchCount = 0;
  cards.forEach(card => {
    if (card.getAttribute("data-rbac-hidden") === "true") {
      card.style.setProperty("display", "none", "important");
      return;
    }
    const text = (card.textContent || "").toLowerCase();
    const matches = !q || text.includes(q);
    card.style.display = matches ? "flex" : "none";
    if (matches) matchCount++;
  });
}
window.filterDashboardCards = filterDashboardCards;

function clearDashboardSearch() {
  const input = document.getElementById("dashCardSearchInput");
  if (input) {
    input.value = "";
    filterDashboardCards("");
    input.focus();
  }
}
window.clearDashboardSearch = clearDashboardSearch;

function filterDashboardCategory(cat, btn) {
  document.querySelectorAll(".dash-cat-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");

  const cards = document.querySelectorAll("#dashCardsGrid .dash-card");
  cards.forEach(card => {
    if (card.getAttribute("data-rbac-hidden") === "true") {
      card.style.setProperty("display", "none", "important");
      return;
    }
    if (cat === "all") {
      card.style.display = "flex";
    } else {
      const cardCat = card.getAttribute("data-category");
      card.style.display = (cardCat === cat) ? "flex" : "none";
    }
  });

  const searchInput = document.getElementById("dashCardSearchInput");
  if (searchInput && searchInput.value) {
    filterDashboardCards(searchInput.value);
  }
}
window.filterDashboardCategory = filterDashboardCategory;

function exportToPDF() {
  let element = null;
  let filename = "export.pdf";

  // Check mechanism detail viewer first
  const mechDetails = document.getElementById("mechanismDetailsContainer");
  if (mechDetails && mechDetails.style.display !== "none" && mechDetails.children.length > 0) {
    element = mechDetails;
    filename = "damage-mechanism.pdf";
  } else {
    // Map of known active module tabs to filenames
    const tabMap = {
      "inspectionconfidenceTab": "inspection-confidence.pdf",
      "crackingMechanismTab": "cracking-mechanism.pdf",
      "bkStressTab": "bk-stress.pdf",
      "inventoryTab": "inventory.pdf",
      "ASMESECTIONVIIIDIV1Tab": "ASME-VIII-DIV1.pdf",
      "TOXIC_CALCULATIONTab": "toxic-calculation.pdf",
      "ASMEB31_3Tab": "ASME-B31.3.pdf",
      "corrosionFullTab": "corrosion-rate.pdf",
      "chemicalSuiteTab": "chemical-suite.pdf",
      "streamComparatorTab": "stream-comparator.pdf",
      "unitConverterTab": "unit-converter.pdf",
      "fluidSelectorTab": "representative-fluids.pdf",
      "a571-criteriaTab": "api571-screening.pdf",
      "cof_calculatorTab": "cof-calculator.pdf",
      "QPOF_calculatorTab": "qpof-calculator.pdf",
      "CORROSION_CALCULATIONTab": "rbi-calculation.pdf",
      "simplePipingTab": "piping-thickness.pdf",
      "pipeThicknessTab": "pipe-schedule.pdf",
      "structuralThicknessTab": "structural-thickness.pdf",
      "remainingLifeTab": "remaining-life.pdf"
    };

    for (const [id, fName] of Object.entries(tabMap)) {
      const el = document.getElementById(id);
      if (el && el.style.display !== "none" && el.offsetWidth > 0) {
        element = el;
        filename = fName;
        break;
      }
    }

    if (!element) {
      // General fallback to any visible module tab
      const visibleTab = Array.from(document.querySelectorAll(".tab-content")).find(t => t.style.display !== "none" && t.offsetWidth > 0);
      if (visibleTab) {
        element = visibleTab;
        filename = `${visibleTab.id || "export"}.pdf`;
      }
    }
  }

  if (!element) {
    alert("No active module open to export!");
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.style.padding = "20px";
  wrapper.style.border = "4px double #000";
  wrapper.style.borderRadius = "10px";
  wrapper.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
  wrapper.style.backgroundColor = "#fff";
  wrapper.style.width = "100%";
  wrapper.style.boxSizing = "border-box";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.marginBottom = "20px";

  const logo = document.createElement("img");
  logo.src = "image/pdflogo.png";
  logo.style.height = "65px";
  logo.style.objectFit = "contain";

  const companyName = document.createElement("h2");
  companyName.textContent = "Damage Mechanism & Digital Tools";
  companyName.style.fontFamily = "Arial, sans-serif";
  companyName.style.fontSize = "24px";
  companyName.style.margin = "0";

  header.appendChild(logo);
  header.appendChild(companyName);
  wrapper.appendChild(header);
  wrapper.appendChild(element.cloneNode(true));

  html2pdf().from(wrapper).set({
    margin: [10, 10, 10, 10],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', putOnlyUsedFonts: true }
  }).save();
}
window.exportToPDF = exportToPDF;

function exportToExcel() {
  let element = null;
  const mechDetails = document.getElementById("mechanismDetailsContainer");
  if (mechDetails && mechDetails.style.display !== "none" && mechDetails.children.length > 0) {
    element = mechDetails;
  } else {
    element = Array.from(document.querySelectorAll(".tab-content")).find(t => t.style.display !== "none" && t.offsetWidth > 0);
  }

  if (!element) {
    alert("No active module open to export!");
    return;
  }

  const data = element.innerText;
  const blob = new Blob([data], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = element.id ? `${element.id}.xls` : "export.xls";
  link.click();
}
window.exportToExcel = exportToExcel;
