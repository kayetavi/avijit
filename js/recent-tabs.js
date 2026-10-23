/**
 * 🕒 Recent Tabs & Quick Switcher Engine (Option A - Top Header Sub-Bar)
 * Supports Parent Tabs, Child Tabs (e.g. ASME B31.3, Simple PD/2SE, Sec VIII Div 1),
 * Individual Damage Mechanisms, and Admin/Tools modules.
 * Max Tab Limit: 10 Tabs (Warns and prompts user when limit exceeded)
 */

(function () {
  const MAX_TABS_LIMIT = 10;
  const STORAGE_KEY = "dashboard_recent_tabs_v1";

  // Comprehensive Catalog of Parent and Child Tabs
  const TAB_CATALOG = {
    // 🛡️ API 571 & Screening
    "a571-criteriaTab": { id: "a571-criteriaTab", title: "Screening Matrix", icon: "🛡️", showFn: "showCriteriaTab" },
    
    // 🧪 API 581 & Corrosion
    "corrosionFullTab": { id: "corrosionFullTab", title: "Corrosion Rates", icon: "🧪", showFn: "showCorrosionFullTab" },
    "corrosionRateTab": { id: "corrosionRateTab", title: "Corrosion Calc", icon: "📊", showFn: "showCorrosionTab" },
    "fluidSelectorTab": { id: "fluidSelectorTab", title: "Representative Fluids", icon: "🧪", showFn: "showFluidSelectorTab" },
    "inventoryTab": { id: "inventoryTab", title: "Inventory Calculator", icon: "📦", showFn: "showInventoryTab" },
    "inspectionconfidenceTab": { id: "inspectionconfidenceTab", title: "Inspection Confidence", icon: "🔍", showFn: "showINSPECTIONCONFIDENCETab" },
    "TOXIC_CALCULATIONTab": { id: "TOXIC_CALCULATIONTab", title: "Toxic % Calculation", icon: "☠️", showFn: "showTOXIC_CALCULATIONTab" },
    "CORROSION_CALCULATIONTab": { id: "CORROSION_CALCULATIONTab", title: "Risk Calculator", icon: "🧮", showFn: "showCORROSION_CALCULATIONTab" },
    "cof_calculatorTab": { id: "cof_calculatorTab", title: "Risk Calculator (COF)", icon: "💥", showFn: "showcof_calculatorTab" },
    "QPOF_calculatorTab": { id: "QPOF_calculatorTab", title: "Risk Calculator (POF)", icon: "📉", showFn: "showQPOF_calculatorTab" },

    // ⏱️ Thickness & Remaining Life
    "remainingLifeTab": { id: "remainingLifeTab", title: "API 570 Remaining Life", icon: "⏱️", showFn: "showRemainingLifeTab" },

    // 📏 Design Thickness Calculator Child Tabs
    "ASMEB31_3Tab": { id: "ASMEB31_3Tab", title: "ASME B31.3 (Advanced)", icon: "📏", showFn: "showASMEB31_3Tab" },
    "simplePipingTab": { id: "simplePipingTab", title: "Simple Formula (PD/2SE)", icon: "📐", showFn: "showSimplePipingTab" },
    "ASMESECTIONVIIIDIV1Tab": { id: "ASMESECTIONVIIIDIV1Tab", title: "Pressure Vessel (Sec VIII)", icon: "🛢️", showFn: "showASMESECTIONVIIIDIV1Tab" },
    "pipeThicknessTab": { id: "pipeThicknessTab", title: "Piping Thickness Chart", icon: "📊", showFn: "showpipeThicknessTab" },
    "structuralThicknessTab": { id: "structuralThicknessTab", title: "API Structural Min-T", icon: "🛡️", showFn: "showStructuralThicknessTab" },

    // ⚡ Stress & Cracking
    "bkStressTab": { id: "bkStressTab", title: "Allowable Stress DB", icon: "🧮", showFn: "showbkStressTab" },
    "crackingMechanismTab": { id: "crackingMechanismTab", title: "Cracking Analysis", icon: "⚡", showFn: "showCrackingMechanismTab" },
    
    // 🔄 Streams, Chemistry & Units
    "streamComparatorTab": { id: "streamComparatorTab", title: "Stream Comparator", icon: "🔄", showFn: "showStreamComparatorTab" },
    "chemicalSuiteTab": { id: "chemicalSuiteTab", title: "Chemical & HAZMAT", icon: "⚗️", showFn: "showChemicalSuiteTab" },
    "unitConverterTab": { id: "unitConverterTab", title: "Plant Unit Converters", icon: "📐", showFn: "showUnitConverterTab" },
    
    // 🗺️ Diagram & Live Systems
    "PROCESSFLOWDIAGRAMSTab": { id: "PROCESSFLOWDIAGRAMSTab", title: "PFD Diagrams", icon: "🗺️", showFn: "showPROCESSFLOWDIAGRAMSTab" },
    "rptuTab": { id: "rptuTab", title: "RPTU Dashboard", icon: "📈", showFn: "showRPTUDashboard" },
    "ccdAiTab": { id: "ccdAiTab", title: "CCD AI Platform", icon: "🤖", showFn: "showCCDAITab" },
    
    // ⚙️ Admin Control Panel
    "adminPanelTab": { id: "adminPanelTab", title: "Admin Control Center", icon: "⚙️", showFn: "showAdminPanelTab" }
  };

  class RecentTabsManager {
    constructor() {
      // Pure in-memory session-only state. Never load old tabs from persistent storage.
      this.tabs = [];
      this.currentActiveTabId = null;
      this.initialized = false;
      this.hookInterval = null;
      this.purgePersistentStorage();
    }

    purgePersistentStorage() {
      try {
                sessionStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    }

    loadFromStorage() {
      // Session-only: Never restore tabs from persistent storage, IndexedDB, Firestore or persistent storage.
      this.purgePersistentStorage();
      return [];
    }

    clearOnLogout() {
      this.tabs = [];
      this.currentActiveTabId = null;
      this.purgePersistentStorage();
      this.render();
    }

    saveToStorage() {
      // Session-only: Do NOT save tabs to persistent storage, IndexedDB, Firestore or persistent storage.
      // Tabs exist strictly in JavaScript memory during the active session.
      this.purgePersistentStorage();
    }

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.purgePersistentStorage();
      this.render();
      this.hookGlobalTabFunctions();
      this.setupDOMClickListeners();
      this.setupTabObserver();

      // Ensure cleanup on page unload / session end
      window.addEventListener("pagehide", () => this.purgePersistentStorage());
      window.addEventListener("beforeunload", () => this.purgePersistentStorage());

      // Periodic re-check to catch dynamically registered functions
      let retries = 0;
      this.hookInterval = setInterval(() => {
        this.hookGlobalTabFunctions();
        retries++;
        if (retries > 10) clearInterval(this.hookInterval);
      }, 1000);
    }

    // Hook tab functions to automatically record when parent or child tabs open
    hookGlobalTabFunctions() {
      const self = this;

      Object.entries(TAB_CATALOG).forEach(([tabId, meta]) => {
        const fnName = meta.showFn;
        if (typeof window[fnName] === "function" && !window[fnName].__recentTabsHooked) {
          const originalFn = window[fnName];
          const wrapped = function (...args) {
            const canOpen = self.recordTabOpen(tabId, meta.title, meta.icon);
            if (canOpen) {
              return originalFn.apply(this, args);
            }
          };
          wrapped.__recentTabsHooked = true;
          wrapped.__originalFn = originalFn;
          window[fnName] = wrapped;
        }
      });

      // Hook openTool for admin sub-tools
      if (typeof window.openTool === "function" && !window.openTool.__recentTabsHooked) {
        const origOpenTool = window.openTool;
        const wrappedTool = function (viewId, ...args) {
          const toolTitles = {
            "app-damage": { title: "API 571 Damage Catalog", icon: "🛡️" },
            "app-stream": { title: "Process Stream Ingestion & Sheet Manager", icon: "📊" },
            "app-stress": { title: "Allowable Stress Loader", icon: "🧮" },
            "app-hub": { title: "Applications Overview", icon: "📱" },
            "users-list": { title: "User Management", icon: "👥" },
            "roles-config": { title: "Configure Permissions", icon: "🛡️" },
            "sys-diagnostics": { title: "Systems & Diagnostics", icon: "⚙️" },
            "layout-sidebar": { title: "Layout Builder", icon: "🖥️" },
            "master-backup": { title: "Master Data & Backup", icon: "💾" }
          };
          const tInfo = toolTitles[viewId] || { title: `Tool: ${viewId}`, icon: "🛠️" };
          const canOpen = self.recordTabOpen(`tool_${viewId}`, tInfo.title, tInfo.icon, () => origOpenTool.call(this, viewId, ...args));
          if (canOpen) {
            return origOpenTool.apply(this, [viewId, ...args]);
          }
        };
        wrappedTool.__recentTabsHooked = true;
        window.openTool = wrappedTool;
      }

      // Hook damage mechanism detail view
      if (typeof window.showMechanismDetails === "function" && !window.showMechanismDetails.__recentTabsHooked) {
        const origShowMech = window.showMechanismDetails;
        const wrappedMech = function (code, data, ...args) {
          const title = (data && (data.title || data.name)) ? `${code} - ${data.title || data.name}` : `DM ${code}`;
          const canOpen = self.recordTabOpen(`dm_${code}`, title, "🛠️", () => origShowMech.call(this, code, data, ...args));
          if (canOpen) {
            return origShowMech.apply(this, [code, data, ...args]);
          }
        };
        wrappedMech.__recentTabsHooked = true;
        window.showMechanismDetails = wrappedMech;
      }
    }

    /**
     * Intercept clicks on sidebar category links and welcome panel cards
     */
    setupDOMClickListeners() {
      const self = this;

      document.addEventListener("click", (e) => {
        // 1. Sidebar child links
        const link = e.target.closest("#categoryList a");
        if (link) {
          const text = (link.textContent || "").trim();
          const onclickAttr = link.getAttribute("onclick") || "";

          // Check if link targets a known child tab function
          Object.entries(TAB_CATALOG).forEach(([tabId, meta]) => {
            if (onclickAttr.includes(meta.showFn) || text.includes(meta.title)) {
              self.recordTabOpen(tabId, meta.title, meta.icon);
            }
          });

          // Check if it's an API 571 Damage Mechanism link
          const parentMechLi = link.closest(".category-toggle li");
          if (parentMechLi && !link.closest("[id^='rbac_cat_']")) {
            const mechName = link.textContent.trim();
            if (mechName) {
              self.recordTabOpen(`dm_mech_${encodeURIComponent(mechName)}`, mechName, "🔬", () => {
                link.click();
              });
            }
          }
        }
      }, true);
    }

    /**
     * DOM Mutation observer to detect when tabs are made visible
     */
    setupTabObserver() {
      const self = this;
      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          if (mut.type === "attributes" && mut.attributeName === "style") {
            const target = mut.target;
            if (target.classList && target.classList.contains("tab-content") && target.style.display === "block") {
              const tabId = target.id;
              if (TAB_CATALOG[tabId]) {
                const meta = TAB_CATALOG[tabId];
                self.recordTabOpen(tabId, meta.title, meta.icon);
              }
            }
          }
        }
      });

      document.querySelectorAll(".tab-content").forEach(el => {
        observer.observe(el, { attributes: true, attributeFilter: ["style", "class"] });
      });
    }

    /**
     * Records a tab open request.
     * Returns true if allowed, false if limit blocked.
     * Preserves stable chronological order without reshuffling on click.
     */
    recordTabOpen(tabId, title, icon, customAction = null) {
      if (!tabId) return true;

      const meta = TAB_CATALOG[tabId] || {};
      const tabTitle = title || meta.title || tabId;
      const tabIcon = icon || meta.icon || "📄";

      // Check if already in list -> Keep exact position, just mark active
      const existingIdx = this.tabs.findIndex(t => t.id === tabId);

      if (existingIdx !== -1) {
        this.currentActiveTabId = tabId;
        this.render();
        return true;
      }

      // Check if max limit reached
      if (this.tabs.length >= MAX_TABS_LIMIT) {
        this.showLimitWarning(tabId, tabTitle, tabIcon, customAction);
        return false;
      }

      // Append new tab at the end for clean, stable order
      this.tabs.push({
        id: tabId,
        title: tabTitle,
        icon: tabIcon
      });

      this.currentActiveTabId = tabId;
      this.saveToStorage();
      this.render();
      return true;
    }

    /**
     * Shows standard warning popup when 10 tabs limit is reached
     */
    showLimitWarning(pendingTabId, pendingTitle, pendingIcon, customAction) {
      const self = this;
      const warningHtml = `
        <div style="text-align: left; font-size: 13.5px; color: #334155; line-height: 1.5;">
          <p style="margin: 0 0 10px 0;">
            Aapka <strong>Recent Tabs bar 10/10 sheets</strong> se full ho chuka hai.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; color: #991b1b; font-size: 12.5px;">
            ⚠️ <em>"${pendingIcon} ${pendingTitle}"</em> open karne ke liye kripya purana tab close karein ya automatically oldest tab close karein.
          </div>
          <div style="font-size: 12px; color: #64748b;">
            💡 Tip: Aap kisi bhi tab ke <strong>&times;</strong> button par click karke use close kar sakte hain.
          </div>
        </div>
      `;

      if (typeof Swal !== "undefined" && Swal.fire) {
        Swal.fire({
          title: "⚠️ Tab Limit Reached (10/10)",
          html: warningHtml,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "#64748b",
          confirmButtonText: "🔄 Auto-Close Oldest & Open",
          cancelButtonText: "Cancel",
          showDenyButton: true,
          denyButtonColor: "#ef4444",
          denyButtonText: "🧹 Clear All Tabs"
        }).then(result => {
          if (result.isConfirmed) {
            // Remove the oldest tab (first item) and append pending
            self.tabs.shift();
            self.tabs.push({
              id: pendingTabId,
              title: pendingTitle,
              icon: pendingIcon
            });
            self.currentActiveTabId = pendingTabId;
            self.saveToStorage();
            self.render();
            self.executeTabOpen(pendingTabId, customAction);
          } else if (result.isDenied) {
            self.clearAllTabs();
            self.recordTabOpen(pendingTabId, pendingTitle, pendingIcon);
            self.executeTabOpen(pendingTabId, customAction);
          }
        });
      } else {
        const confirmAuto = window.confirm(
          `⚠️ Recent Tab Limit (10/10) Reached!\n\nKya aap oldest tab close karke "${pendingTitle}" open karna chahte hain?`
        );
        if (confirmAuto) {
          self.tabs.shift();
          self.tabs.push({
            id: pendingTabId,
            title: pendingTitle,
            icon: pendingIcon
          });
          self.currentActiveTabId = pendingTabId;
          self.saveToStorage();
          self.render();
          self.executeTabOpen(pendingTabId, customAction);
        }
      }
    }

    /**
     * Executes opening of a specific tab ID
     */
    executeTabOpen(tabId, customAction = null) {
      if (typeof window.hideWelcomePanel === "function") {
        window.hideWelcomePanel();
      }
      document.querySelectorAll(".welcome-panel, #welcomePanel").forEach(p => {
        p.classList.add("is-hidden");
        p.style.setProperty("display", "none", "important");
      });

      if (typeof customAction === "function") {
        customAction();
        return;
      }

      // Hide damage mechanism details when opening any standard calculator/tool tab
      if (!tabId.startsWith("dm_")) {
        if (typeof window.hideMechanismDetails === "function") {
          window.hideMechanismDetails();
        } else {
          const m = document.getElementById("mechanismDetailsContainer");
          if (m) {
            m.innerHTML = "";
            m.style.setProperty("display", "none", "important");
          }
          const st = document.getElementById("selectedMechanismTitle");
          if (st) st.style.setProperty("display", "none", "important");
        }
      }

      const meta = TAB_CATALOG[tabId];
      if (meta && typeof window[meta.showFn] === "function") {
        const targetFn = window[meta.showFn].__originalFn || window[meta.showFn];
        targetFn();
      } else if (tabId.startsWith("tool_")) {
        const viewId = tabId.replace("tool_", "");
        if (typeof window.openTool === "function") {
          const fn = window.openTool.__originalFn || window.openTool;
          fn(viewId);
        }
      } else if (tabId.startsWith("dm_mech_")) {
        const mechName = decodeURIComponent(tabId.replace("dm_mech_", ""));
        document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
        if (typeof window.hideWelcomePanel === "function") window.hideWelcomePanel();
        const links = Array.from(document.querySelectorAll("#categoryList a"));
        const targetLink = links.find(l => (l.textContent || "").trim() === mechName);
        if (targetLink) {
          targetLink.click();
        } else {
          const dmObj = (typeof window.resolveAPI571DamageMechanism === "function") ? window.resolveAPI571DamageMechanism(mechName) : null;
          const container = document.getElementById("mechanismDetailsContainer");
          const title = document.getElementById("selectedMechanismTitle");
          if (container && dmObj) {
            container.style.display = "block";
            if (title) {
              title.textContent = dmObj.name || mechName;
              title.style.display = "block";
            }
            if (typeof window.showTab === "function") window.showTab("description");
          }
        }
      } else if (tabId.startsWith("dm_")) {
        const code = tabId.replace("dm_", "");
        if (typeof window.showMechanismDetails === "function" && typeof window.mechanismsData !== "undefined") {
          window.showMechanismDetails(code, window.mechanismsData[code]);
        }
      } else {
        const el = document.getElementById(tabId);
        if (el) {
          document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
          el.style.display = "block";
          if (typeof window.hideWelcomePanel === "function") window.hideWelcomePanel();
        }
      }
    }

    /**
     * User clicks on a tab chip to switch to it
     * Stable Order: Does NOT reorder or reshuffle the chips!
     */
    switchToTab(tabId) {
      this.currentActiveTabId = tabId;
      this.render();
      this.executeTabOpen(tabId);
    }

    /**
     * Close / Remove a single tab from the recent bar
     */
    closeTab(event, tabId) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }

      this.tabs = this.tabs.filter(t => t.id !== tabId);
      this.saveToStorage();

      if (this.currentActiveTabId === tabId) {
        if (this.tabs.length > 0) {
          this.switchToTab(this.tabs[0].id);
        } else {
          this.currentActiveTabId = null;
          if (typeof window.goHome === "function") window.goHome();
        }
      } else {
        this.render();
      }
    }

    /**
     * Clear all tabs
     */
    clearAllTabs() {
      this.tabs = [];
      this.currentActiveTabId = null;
      this.saveToStorage();
      this.render();
      if (typeof window.goHome === "function") window.goHome();
    }

    /**
     * Render the horizontal recent tabs chips bar
     */
    render() {
      const bar = document.getElementById("recentTabsBar");
      const container = document.getElementById("recentTabsScrollTrack");
      const badge = document.getElementById("recentTabsCountBadge");
      const layoutContainer = document.querySelector(".container");

      if (!container || !badge) return;

      const count = this.tabs.length;
      badge.textContent = `${count}/${MAX_TABS_LIMIT}`;

      if (count >= MAX_TABS_LIMIT) {
        badge.classList.add("limit-reached");
        badge.title = "Maximum 10 tabs limit reached! Close tabs to add new ones.";
      } else {
        badge.classList.remove("limit-reached");
        badge.title = `Active open sheets: ${count} of ${MAX_TABS_LIMIT}`;
      }

      if (count === 0) {
        if (bar) bar.style.display = "none";
        if (layoutContainer) {
          layoutContainer.style.removeProperty("height");
        }
        container.innerHTML = `<span class="recent-tabs-empty">No sheets open. Open any module from below or sidebar to pin here.</span>`;
        return;
      }

      if (bar) bar.style.display = "flex";
      if (layoutContainer) {
        layoutContainer.style.removeProperty("height");
      }

      container.innerHTML = this.tabs.map(tab => {
        const isActive = this.currentActiveTabId === tab.id;
        return `
          <div class="recent-tab-chip ${isActive ? 'active' : ''}" 
               onclick="window.recentTabsManager.switchToTab('${tab.id}')"
               title="Open ${tab.title}">
            <span class="recent-chip-icon">${tab.icon || '📄'}</span>
            <span class="recent-chip-title">${tab.title}</span>
            <button type="button" 
                    class="recent-chip-close" 
                    onclick="window.recentTabsManager.closeTab(event, '${tab.id}')" 
                    title="Close ${tab.title}">
              &times;
            </button>
          </div>
        `;
      }).join("");
    }
  }

  if (!window.recentTabsManager) {
    window.recentTabsManager = new RecentTabsManager();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.recentTabsManager.init());
  } else {
    window.recentTabsManager.init();
  }
})();
