// ============================================================================
// 🛡️ ROLE-BASED ACCESS CONTROL (RBAC) CLIENT CONTROLLER - KayetDMS
// Backed by Firebase Firestore via /api/rbac
// ============================================================================

(function () {
  // Install global fetch auth interceptor immediately so early /api/rbac and /api/admin requests include server token & session headers
  if (typeof window !== "undefined" && typeof window.fetch === "function" && !window.__fetchAuthIntercepted) {
    const originalFetch = window.fetch.bind(window);
    window.__fetchAuthIntercepted = true;
    window.fetch = async function (input, init = {}) {
      try {
        const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const isApiCall = urlStr.startsWith("/api/") || urlStr.includes("/api/");
        if (isApiCall) {
          const headers = new Headers(init.headers || (typeof input !== "string" && input?.headers ? input.headers : {}));
          const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) ||
                            (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || "";
          const uid = (window.APP_SESSION && window.APP_SESSION.uid) ||
                      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || "";
          const idToken = (window.APP_SESSION && window.APP_SESSION.idToken) ||
                          (typeof sessionStorage !== "undefined" && sessionStorage.getItem("idToken")) || "";

          if (sessionId && !headers.has("x-session-id")) {
            headers.set("x-session-id", sessionId);
          }
          if (uid && !headers.has("x-user-uid")) {
            headers.set("x-user-uid", uid);
          }
          if (!headers.has("Authorization")) {
            if (idToken) {
              headers.set("Authorization", `Bearer ${idToken}`);
            } else if (sessionId) {
              headers.set("Authorization", `Bearer ${sessionId}`);
            }
          }
          init = {
            ...init,
            headers,
            credentials: init.credentials || "include"
          };
        }
      } catch (e) {}
      return originalFetch(input, init);
    };
  }

  window.RBAC = {
    userEmail: "",
    role: "engineer",
    isSuperAdmin: false,
    allowedModules: {},
    subsections: {},
    availableModules: [],
    authorizedNavigation: [],
    initialized: false,
    lastSyncTime: 0,
    syncChannel: null,
    _syncListenersInstalled: false,

    getAuthHeaders() {
      const headers = {};
      try {
        const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) ||
                          (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || "";
        const uid = (window.APP_SESSION && window.APP_SESSION.uid) ||
                    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || "";
        const idToken = (window.APP_SESSION && window.APP_SESSION.idToken) ||
                        (typeof sessionStorage !== "undefined" && sessionStorage.getItem("idToken")) || "";
        if (sessionId) headers["x-session-id"] = sessionId;
        if (uid) headers["x-user-uid"] = uid;
        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
        } else if (sessionId) {
          headers["Authorization"] = `Bearer ${sessionId}`;
        }
      } catch (e) {}
      return headers;
    },

    getUserEmail() {
      try {
        if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) {
          return firebase.auth().currentUser.email.toLowerCase().trim();
        }
      } catch (e) {}
      try {
        if (window.APP_SESSION && window.APP_SESSION.email) {
          return String(window.APP_SESSION.email).toLowerCase().trim();
        }
      } catch (e) {}
      if (window.currentLoggedInEmail) {
        return String(window.currentLoggedInEmail).toLowerCase().trim();
      }
      try {
        if (typeof sessionStorage !== "undefined") {
          const sEmail = sessionStorage.getItem("loggedInUser");
          if (sEmail) return String(sEmail).toLowerCase().trim();
        }
      } catch (e) {}
      try {
        if (typeof localStorage !== "undefined") {
          const lEmail = localStorage.getItem("loggedInUser");
          if (lEmail) return String(lEmail).toLowerCase().trim();
        }
      } catch (e) {}
      return "";
    },

    getLayoutConfig() {
      if (typeof window.getActiveLayoutConfig === "function") {
        return window.getActiveLayoutConfig() || {};
      }
      if (window.layoutConfig) return window.layoutConfig;
      if (window.adminPanel && window.adminPanel.layoutConfig) return window.adminPanel.layoutConfig;
      try {
        const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
        if (cached) return JSON.parse(cached) || {};
      } catch (e) {}
      return {};
    },

    broadcastUpdate(targetEmail) {
      try {
        const payload = {
          type: "RBAC_UPDATED",
          targetEmail: (targetEmail || "").toLowerCase().trim(),
          timestamp: Date.now()
        };
        if (this.syncChannel) {
          this.syncChannel.postMessage(payload);
        }
      } catch (e) {}
    },

    broadcastLayoutUpdate(config) {
      try {
        const payload = {
          type: "LAYOUT_UPDATED",
          config: config || window.layoutConfig || null,
          timestamp: Date.now()
        };
        if (this.syncChannel) {
          this.syncChannel.postMessage(payload);
        }
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("layout_sync_event", JSON.stringify({ timestamp: Date.now() }));
        }
      } catch (e) {}
    },

    setupSyncListeners() {
      if (this._syncListenersInstalled) return;
      this._syncListenersInstalled = true;

      // 1. BroadcastChannel for instant intra-browser tab synchronization
      if (typeof BroadcastChannel !== "undefined") {
        try {
          this.syncChannel = new BroadcastChannel("kayet_rbac_sync");
          this.syncChannel.onmessage = (event) => {
            const data = event.data;
            if (data && data.type === "RBAC_UPDATED") {
              const myEmail = (this.userEmail || this.getUserEmail()).toLowerCase().trim();
              if (!data.targetEmail || data.targetEmail === myEmail || this.isSuperAdmin || this.role === "admin") {
                this.refreshQuietly();
              }
            } else if (data && data.type === "LAYOUT_UPDATED") {
              if (data.config) {
                window.layoutConfig = data.config;
                if (window.adminPanel) window.adminPanel.layoutConfig = data.config;
                if (typeof window.applyPublishedSidebarLayout === "function") {
                  window.applyPublishedSidebarLayout(data.config);
                }
              } else {
                this.refreshQuietly();
              }
            }
          };
        } catch (e) {}
      }

      // 2. Cross-window storage event listener fallback
      window.addEventListener("storage", (e) => {
        if (e.key === "rbac_sync_event" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            const myEmail = (this.userEmail || this.getUserEmail()).toLowerCase().trim();
            if (!data.targetEmail || data.targetEmail === myEmail || this.isSuperAdmin || this.role === "admin") {
              this.refreshQuietly();
            }
          } catch (err) {}
        } else if (e.key === "layout_sync_event" && e.newValue) {
          fetch("/api/admin?action=get_layout_config")
            .then(r => r.ok ? r.json() : null)
            .then(resData => {
              if (resData && resData.config) {
                window.layoutConfig = resData.config;
                if (window.adminPanel) window.adminPanel.layoutConfig = resData.config;
                if (typeof window.applyPublishedSidebarLayout === "function") {
                  window.applyPublishedSidebarLayout(resData.config);
                }
              }
            })
            .catch(() => {});
        }
      });

      // 3. Auto-sync when switching back to tab
      const handleVisibilityOrFocus = () => {
        if (document.visibilityState === "visible") {
          const now = Date.now();
          if (!this.lastSyncTime || (now - this.lastSyncTime > 25000)) {
            this.refreshQuietly();
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
      window.addEventListener("focus", handleVisibilityOrFocus);

      // 4. Background heartbeat sync (every 60s while browser tab is active)
      setInterval(() => {
        if (document.visibilityState === "visible") {
          this.refreshQuietly();
        }
      }, 60000);
    },

    async refreshQuietly() {
      const email = this.getUserEmail();
      if (!email) return;
      this.userEmail = email;

      try {
        const [res, layoutRes] = await Promise.all([
          fetch(`/api/rbac?action=get_my_permissions&email=${encodeURIComponent(email)}&_t=${Date.now()}`, {
            headers: this.getAuthHeaders(),
            credentials: "include"
          }),
          fetch(`/api/admin?action=get_layout_config&_t=${Date.now()}`).catch(() => null)
        ]);

        let layoutChanged = false;
        if (layoutRes && layoutRes.ok) {
          try {
            const layoutData = await layoutRes.json();
            if (layoutData && layoutData.config) {
              if (JSON.stringify(window.layoutConfig) !== JSON.stringify(layoutData.config)) {
                layoutChanged = true;
              }
              window.layoutConfig = layoutData.config;
              if (window.adminPanel) window.adminPanel.layoutConfig = layoutData.config;
              try {
                if (typeof sessionStorage !== "undefined") {
                  sessionStorage.setItem("cached_layout_config", JSON.stringify(layoutData.config));
                }
              } catch (e) {}
            }
          } catch (e) {}
        }

        if (!res.ok) return;
        const data = await res.json();
        this.lastSyncTime = Date.now();

        const newRole = data.role || "engineer";
        const newIsSuper = !!data.isSuperAdmin || newRole === "admin" || (Array.isArray(data.roles) && data.roles.includes("admin"));
        const newAllowed = data.allowedModules || {};
        const newSubs = data.subsections || {};
        const newAvailable = data.availableModules || [];
        const newAuthNav = Array.isArray(data.authorizedNavigation) ? data.authorizedNavigation : (this.authorizedNavigation || []);

        const roleChanged = this.role !== newRole || this.isSuperAdmin !== newIsSuper;
        const allowedChanged = JSON.stringify(this.allowedModules) !== JSON.stringify(newAllowed);
        const subsChanged = JSON.stringify(this.subsections) !== JSON.stringify(newSubs);
        const navChanged = JSON.stringify(this.authorizedNavigation) !== JSON.stringify(newAuthNav);

        this.role = newRole;
        this.isSuperAdmin = newIsSuper;
        this.allowedModules = newAllowed;
        this.subsections = newSubs;
        this.availableModules = newAvailable;
        this.authorizedNavigation = newAuthNav;
        this.initialized = true;

        try {
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_rbac_permissions", JSON.stringify({
            email,
            role: this.role,
            isSuperAdmin: this.isSuperAdmin,
            allowedModules: this.allowedModules,
            subsections: this.subsections,
            availableModules: this.availableModules,
            authorizedNavigation: this.authorizedNavigation,
            syncedAt: this.lastSyncTime
          }));
        } catch (e) {}

        if (roleChanged || allowedChanged || subsChanged || navChanged || layoutChanged) {
          if (typeof window.injectAllCategories === "function") {
            window.injectAllCategories();
          }
          if (typeof window.applyPublishedSidebarLayout === "function") {
            window.applyPublishedSidebarLayout(window.layoutConfig);
          }
          this.renderRoleBadge();
          this.updatePrefilterCss();
          this.applyPermissionGuards();
          this.updateAdminMenuVisibility();
          this.applySidebarVisibility();
        }
      } catch (err) {}
    },

    async init() {
      if (this._hasInitialized) {
        this.applySidebarVisibility();
        return;
      }
      this._hasInitialized = true;

      const email = this.getUserEmail();
      this.userEmail = email;

      // Setup real-time listeners on initial boot
      this.setupSyncListeners();

      try {
        const res = await fetch(`/api/rbac?action=get_my_permissions&email=${encodeURIComponent(email)}&_t=${Date.now()}`, {
          headers: this.getAuthHeaders(),
          credentials: "include"
        });
        if (!res.ok) throw new Error("Failed to fetch live RBAC permissions from server.");
        const data = await res.json();
        this.lastSyncTime = Date.now();

        this.role = data.role || "engineer";
        this.isSuperAdmin = !!data.isSuperAdmin || this.role === "admin" || (Array.isArray(data.roles) && data.roles.includes("admin"));
        this.allowedModules = data.allowedModules || {};
        this.subsections = data.subsections || {};
        this.availableModules = data.availableModules || [];
        this.authorizedNavigation = Array.isArray(data.authorizedNavigation) ? data.authorizedNavigation : [];
        this.initialized = true;

        try {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("cached_rbac_permissions", JSON.stringify({
              email: email || data.email || "",
              role: this.role,
              isSuperAdmin: this.isSuperAdmin,
              allowedModules: this.allowedModules,
              subsections: this.subsections,
              availableModules: this.availableModules,
              authorizedNavigation: this.authorizedNavigation,
              syncedAt: this.lastSyncTime
            }));
          }
        } catch (e) {}

        // Fetch layout config into in-memory window.layoutConfig
        try {
          const layoutRes = await fetch(`/api/admin?action=get_layout_config`);
          if (layoutRes.ok) {
            const layoutData = await layoutRes.json();
            if (layoutData && layoutData.config) {
              window.layoutConfig = layoutData.config;
              try {
                if (typeof sessionStorage !== "undefined") {
                  sessionStorage.setItem("cached_layout_config", JSON.stringify(layoutData.config));
                }
              } catch (e) {}
            }
          }
        } catch (lErr) {}

        if (typeof window.injectAllCategories === "function") {
          window.injectAllCategories();
        }
        if (typeof window.applyPublishedSidebarLayout === "function" && window.layoutConfig) {
          window.applyPublishedSidebarLayout(window.layoutConfig);
        }

        this.renderRoleBadge();
        this.updatePrefilterCss();
        this.applyPermissionGuards();
        this.updateAdminMenuVisibility();
        this.applySidebarVisibility();
        if (document.body) document.body.classList.add("rbac-ready");
      } catch (err) {
        console.warn("RBAC initialization fallback triggered:", err);
        this.initialized = true;
        if (typeof window.injectAllCategories === "function") {
          window.injectAllCategories();
        }
        if (typeof window.applyPublishedSidebarLayout === "function" && window.layoutConfig) {
          window.applyPublishedSidebarLayout(window.layoutConfig);
        }
        this.renderRoleBadge();
        this.updatePrefilterCss();
        this.applyPermissionGuards();
        this.updateAdminMenuVisibility();
        this.applySidebarVisibility();
        if (document.body) document.body.classList.add("rbac-ready");
      }
    },

    updatePrefilterCss() {
      const earlyPreHide = document.getElementById("rbacEarlyAdminPreHide");
      if (earlyPreHide) earlyPreHide.remove();

      const isAdmin = this.isSuperAdmin || this.role === "admin";
      let styleEl = document.getElementById("rbacEarlyPreFilterStyle");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "rbacEarlyPreFilterStyle";
        document.head.appendChild(styleEl);
      }

      const layoutCfg = (window.RBAC && typeof window.RBAC.getLayoutConfig === "function") ? window.RBAC.getLayoutConfig() : {};
      const isLayoutHidden = (targetMod) => (window.isModuleLayoutVisible ? !window.isModuleLayoutVisible(targetMod, layoutCfg) : false);

      let css = "";
      if (!isAdmin) {
        // Disallow admin bottom buttons and admin actions for non-admins
        css += "#adminRbacBtn, #adminSidebarItem, #rbac_cat_adminControlCenter, .stress-admin-action { display: none !important; }\n";
      }

      if ((!isAdmin && !this.hasModuleAccess("adminControlCenter")) || isLayoutHidden("adminControlCenter")) {
        css += "#rbac_cat_tools, [data-rbac-module=\"adminControlCenter\"] { display: none !important; }\n";
      }

      const allModules = (Array.isArray(this.authorizedNavigation) && this.authorizedNavigation.length > 0)
        ? this.authorizedNavigation.map(m => m.id)
        : (Array.isArray(this.availableModules) && this.availableModules.length > 0 ? this.availableModules.map(m => m.id) : []);

      allModules.forEach(m => {
        if ((!isAdmin && !this.hasModuleAccess(m)) || isLayoutHidden(m)) {
          css += `[data-rbac-module="${m}"], #rbac_cat_${m} { display: none !important; }\n`;
          if (m === "adminControlCenter") css += `#rbac_cat_tools { display: none !important; }\n`;
          if (m === "thicknessCalc") css += `#rbac_cat_designThickness { display: none !important; }\n`;
          if (m === "crackingMechanism") css += `#rbac_cat_cracking { display: none !important; }\n`;
          if (m === "damageExplorer") css += `#categoryList li.category-toggle:not([id^='rbac_cat_']) { display: none !important; }\n`;
        }
      });

      styleEl.textContent = css;
    },

    hasModuleAccess(moduleId) {
      if (!moduleId) return false;
      if (
        moduleId === "damage" ||
        moduleId === "damageMechanisms" ||
        moduleId === "damageMechanism" ||
        moduleId === "damageCatalog" ||
        moduleId === "api571" ||
        moduleId === "api571DamageMechanisms" ||
        moduleId === "card_damageExplorer" ||
        moduleId === "card_dmg"
      ) {
        moduleId = "damageExplorer";
      }
      if (moduleId === "cracking") moduleId = "crackingMechanism";
      if (moduleId === "b313" || moduleId === "designThickness") moduleId = "thicknessCalc";
      if (moduleId === "tools") moduleId = "adminControlCenter";
      if (moduleId === "remainingLife") moduleId = "api570";

      if (
        this.isSuperAdmin ||
        this.role === "admin"
      ) {
        return true;
      }

      const mods = this.allowedModules || {};
      const subs = this.subsections || {};

      // Check Tools (adminControlCenter) - active if module or ANY child sub-tab is granted
      if (moduleId === "adminControlCenter") {
        if (mods.adminControlCenter === true) return true;
        if (subs.adminControlCenter && typeof subs.adminControlCenter === "object") {
          for (const k in subs.adminControlCenter) {
            if (subs.adminControlCenter[k] === true) return true;
          }
        }
      }

      // Explicit denial in allowedModules (except adminControlCenter which is governed by its subtabs)
      if (mods[moduleId] === false && moduleId !== "adminControlCenter") return false;
      if (moduleId === "damageExplorer" && (mods.damageMechanisms === false || mods.damage === false || mods.api571 === false)) return false;
      if (mods[moduleId] === true) return true;
      if (moduleId === "damageExplorer" && (mods.damageMechanisms === true || mods.damage === true || mods.api571 === true)) return true;

      if (moduleId === "api570" && typeof mods.remainingLife === "boolean") return mods.remainingLife;
      if (moduleId === "remainingLife" && typeof mods.api570 === "boolean") return mods.api570;

      // Check if ANY subsection under this module is true
      const subObj = subs[moduleId] || (moduleId === "api570" ? subs.remainingLife : (moduleId === "remainingLife" ? subs.api570 : null));
      if (subObj && typeof subObj === "object") {
        for (const k in subObj) {
          if (subObj[k] === true) return true;
        }
      }

      // Fallback check authorizedNavigation if not yet initialized
      if (!this.initialized) {
        if (Array.isArray(this.authorizedNavigation) && this.authorizedNavigation.length > 0) {
          return this.authorizedNavigation.some(m => m.id === moduleId || (moduleId === "damageExplorer" && m.id === "damageMechanisms"));
        }
        return true;
      }

      return false;
    },

    hasSectionAccess(moduleId, sectionId) {
      if (!moduleId) return false;
      if (
        moduleId === "damage" ||
        moduleId === "damageMechanisms" ||
        moduleId === "damageMechanism" ||
        moduleId === "damageCatalog" ||
        moduleId === "api571" ||
        moduleId === "api571DamageMechanisms"
      ) {
        moduleId = "damageExplorer";
      }
      if (
        this.isSuperAdmin ||
        this.role === "admin"
      ) {
        return true;
      }

      if (moduleId === "cracking") moduleId = "crackingMechanism";
      if (moduleId === "b313" || moduleId === "designThickness") moduleId = "thicknessCalc";
      if (moduleId === "tools") moduleId = "adminControlCenter";
      if (moduleId === "remainingLife") moduleId = "api570";

      const subs = this.subsections || {};

      // 1. Direct subsection check
      const modSubs = subs[moduleId] || (moduleId === "api570" ? subs.remainingLife : (moduleId === "remainingLife" ? subs.api570 : null));
      if (modSubs && sectionId) {
        if (typeof modSubs[sectionId] === "boolean") return modSubs[sectionId];
        // Handle alias sub keys (e.g. app-stream <-> appStream)
        if (sectionId === "app-stream" && typeof modSubs.appStream === "boolean") return modSubs.appStream;
        if (sectionId === "appStream" && typeof modSubs["app-stream"] === "boolean") return modSubs["app-stream"];
        if (sectionId === "app-damage" && typeof modSubs.appDamage === "boolean") return modSubs.appDamage;
        if (sectionId === "appDamage" && typeof modSubs["app-damage"] === "boolean") return modSubs["app-damage"];
        if (sectionId === "app-stress" && typeof modSubs.appStress === "boolean") return modSubs.appStress;
        if (sectionId === "appStress" && typeof modSubs["app-stress"] === "boolean") return modSubs["app-stress"];
        if (sectionId === "app-hub" && typeof modSubs.appOverview === "boolean") return modSubs.appOverview;
        if (sectionId === "appOverview" && typeof modSubs["app-hub"] === "boolean") return modSubs["app-hub"];

        // Backward compatibility mapping for grouped Tools subsections
        if (moduleId === "adminControlCenter") {
          if (sectionId && (sectionId.startsWith("stress_") || sectionId.startsWith("action_"))) {
            if (typeof modSubs[sectionId] === "boolean") return modSubs[sectionId];
            return false;
          }
          if (["userManagement", "rbacPermissions", "accessControl"].includes(sectionId)) {
            if (modSubs.userManagement === true || modSubs.user_management_and_roles === true) return true;
          }
          if (["firestoreExplorer", "sysDiagnostics", "projectSwitcher", "activeSessions", "systemLogs"].includes(sectionId)) {
            if (modSubs.sysDiagnostics === true || modSubs.systems_diagnostics === true) return true;
          }
          if (["layoutBuilder", "sidebarOrder", "tickerText", "welcomeCards", "navVisibility"].includes(sectionId)) {
            if (modSubs.layoutBuilder === true || modSubs.layout_navigation_builder === true) return true;
          }
          if (["masterData", "jsonBackup", "jsonRestore", "backupHistory", "auditTrail"].includes(sectionId)) {
            if (modSubs.masterData === true || modSubs.master_data_backup_logs === true) return true;
          }
        }
      }

      // If entire module is explicitly denied, deny all sections (except adminControlCenter)
      if (this.allowedModules && (this.allowedModules[moduleId] === false || (moduleId === "damageExplorer" && this.allowedModules.damageMechanisms === false))) {
        if (moduleId !== "adminControlCenter") return false;
      }

      // 2. Fallback to cached if not initialized
      if (!this.initialized) {
        try {
          const cachedRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_rbac_permissions") : null;
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached && (cached.role === "admin" || cached.isSuperAdmin)) return true;
            if (cached && cached.subsections && cached.subsections[moduleId]) {
              if (typeof cached.subsections[moduleId][sectionId] === "boolean") return cached.subsections[moduleId][sectionId];
              if (sectionId === "app-stream" && typeof cached.subsections[moduleId].appStream === "boolean") return cached.subsections[moduleId].appStream;
              if (sectionId === "appStream" && typeof cached.subsections[moduleId]["app-stream"] === "boolean") return cached.subsections[moduleId]["app-stream"];
            }
            if (cached && cached.allowedModules && cached.allowedModules[moduleId] === false && moduleId !== "adminControlCenter") return false;
          }
        } catch (e) {}
      }

      // 3. Default to module permission (except for granular stress action/tab permissions)
      if (moduleId === "adminControlCenter" && sectionId && (sectionId.startsWith("stress_") || sectionId.startsWith("action_"))) {
        return false;
      }
      return this.hasModuleAccess(moduleId);
    },

    renderRoleBadge() {
      const roleBadge = document.getElementById("userRoleBadge");
      const dropdownPill = document.getElementById("dropdownRolePill");

      const roleLabels = {
        admin: "👑 Admin",
        lead_engineer: "⚙️ Lead Engineer",
        engineer: "⚙️ Lead Engineer",
        inspector: "🔍 Inspector",
        viewer: "👁️ Viewer",
        custom: "🛡️ Custom Role"
      };

      const label = roleLabels[this.role] || `🛡️ ${this.role}`;

      if (roleBadge) {
        roleBadge.textContent = label;
        roleBadge.className = `user-role-badge role-${this.role}`;
        roleBadge.style.display = "inline-flex";
        roleBadge.title = `Signed in as ${this.userEmail} (${label})`;
      }

      if (dropdownPill) {
        dropdownPill.textContent = label;
      }
    },

    updateAdminMenuVisibility() {
      const adminBtn = document.getElementById("adminRbacBtn");
      const isAdmin = this.isSuperAdmin || this.role === "admin";
      document.body.classList.toggle("is-admin", isAdmin);

      if (isAdmin || this.hasModuleAccess("adminControlCenter")) {
        window.loadAdminPanelOnDemand().then(() => {
          if (window.adminPanel && typeof window.adminPanel.init === "function") {
            window.adminPanel.init();
          }
        }).catch(err => console.warn("[RBAC] Admin panel load note:", err));
      }

      if (adminBtn) {
        adminBtn.style.display = isAdmin ? "block" : "none";
        adminBtn.textContent = "🛡️ Admin Control Panel";
        adminBtn.onclick = async () => {
          if (!isAdmin) {
            this.showAccessDenied("Admin Control Panel");
            return;
          }
          await window.loadAdminPanelOnDemand();
          if (typeof hideAllMainPanels === "function") hideAllMainPanels();
          if (typeof hideWelcomePanel === "function") hideWelcomePanel();
          if (typeof window.showAdminPanelTab === "function") {
            window.showAdminPanelTab();
          } else if (window.TemplateManager) {
            window.TemplateManager.load("1000", function () {
              if (typeof window.showAdminPanelTab === "function") window.showAdminPanelTab();
            });
          }
        };
      }

      const adminSidebarItem = document.getElementById("adminSidebarItem");
      if (adminSidebarItem) {
        adminSidebarItem.style.display = isAdmin ? "" : "none";
        if (!isAdmin) adminSidebarItem.remove();
      }

      const adminControlCenterEl = document.getElementById("rbac_cat_adminControlCenter");
      if (adminControlCenterEl) {
        if (isAdmin) {
          adminControlCenterEl.style.setProperty("display", "block", "important");
        } else {
          adminControlCenterEl.style.setProperty("display", "none", "important");
        }
      }

      const footerContainer = document.getElementById("sidebarBottomFooter");
      if (footerContainer) {
        footerContainer.innerHTML = "";
        footerContainer.style.display = "none";
      }

      if (window.adminPanel && typeof window.adminPanel.init === "function") {
        window.adminPanel.init();
      }
    },

    showAccessDenied(moduleName = "this module") {
      const adminContact = (window.SYSTEM_CONFIG && window.SYSTEM_CONFIG.adminContactEmail) || (window.RBAC && window.RBAC.adminContactEmail) || "your System Administrator";
      const msg = `Your current role (<strong>${this.role.toUpperCase()}</strong>) does not have permission to access <strong>${moduleName}</strong>.<br><br>Please contact <code>${adminContact}</code> to request access.`;
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Access Restricted",
          html: msg,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "Understood"
        });
      } else {
        alert(`Access Restricted: Your current role (${this.role}) does not have permission to access ${moduleName}. Please contact admin.`);
      }
    },

    applyPermissionGuards() {
      const self = this;

      // Wrap tab functions with permission checks
      const moduleFunctionMap = [
        { func: "showCriteriaTab", modId: "api581", subId: "api571Criteria", name: "API 571 Damage Mechanism Screening" },
        { func: "showCorrosionFullTab", modId: "api581", subId: "corrosionRate", name: "API 581 Corrosion Rate Estimator" },
        { func: "showCorrosionTab", modId: "api581", subId: "corrosionRate", name: "API 581 Corrosion Rate" },
        { func: "showFluidSelectorTab", modId: "api581", subId: "fluidSelector", name: "Representative Fluids" },
        { func: "showInventoryTab", modId: "api581", subId: "inventoryCalc", name: "Inventory Calculator" },
        { func: "showINSPECTIONCONFIDENCETab", modId: "api581", subId: "inspectionConfidence", name: "Inspection Confidence" },
        { func: "showTOXIC_CALCULATIONTab", modId: "api581", subId: "toxicCalc", name: "Toxic % Calculation" },
        { func: "showcof_calculatorTab", modId: "api581", subId: "cofCalculator", name: "Quantitative: Risk Calculator_COF" },
        { func: "showQPOF_calculatorTab", modId: "api581", subId: "qpofCalculator", name: "Quantitative: Risk Calculator_POF" },
        { func: "showCORROSION_CALCULATIONTab", modId: "api581", subId: "corrosionCalc", name: "Semi Quantitative: Risk Calculator" },
        { func: "showRemainingLifeTab", modId: "api570", subId: "statisticalAnalysis", name: "Thickness Data Evaluation - Statistical Analysis" },
        { func: "showASMEB31_3Tab", modId: "thicknessCalc", subId: "asmeB31_3", name: "ASME B31.3 Process Piping" },
        { func: "showSimplePipingTab", modId: "thicknessCalc", subId: "simplePiping", name: "Simple Piping Formula (PD / 2SE)" },
        { func: "showASMESECTIONVIIIDIV1Tab", modId: "thicknessCalc", subId: "asmeSectionVIII", name: "Pressure Vessel (ASME Sec VIII)" },
        { func: "showpipeThicknessTab", modId: "thicknessCalc", subId: "pipeThickness", name: "Piping Thickness Chart" },
        { func: "showStructuralThicknessTab", modId: "thicknessCalc", subId: "structuralThickness", name: "Structural Thickness Lookup (API 574 / 581)" },
        { func: "showCrackingMechanismTab", modId: "crackingMechanism", subId: "crackingFinder", name: "Cracking Mechanism Finder" },
        { func: "showbkStressTab", modId: "bkStress", subId: "stressLookup", name: "Allowable Stress & Material Data" },
        { func: "showPROCESSFLOWDIAGRAMSTab", modId: "processFlow", subId: "atmospheric", name: "Corrosion Diagrams - HYDROPROCESSING" },
        { func: "showCDUVDUTab", modId: "processFlow", subId: "cduVdu", name: "Corrosion Diagrams - CDU / VDU" },
        { func: "showMSPTab", modId: "processFlow", subId: "msp", name: "Corrosion Diagrams - MSP" },
        { func: "showH2UTab", modId: "processFlow", subId: "h2u", name: "Corrosion Diagrams - H2U" },
        { func: "showRPTUDashboard", modId: "rptu", subId: "rptuDashboard", name: "RPTU Dashboard" },
        { func: "openCCDAIPlatform", modId: "ccdAI", subId: "ccdAiPlatform", name: "CCD AI Platform" },
        { func: "showCCDAITab", modId: "ccdAI", subId: "ccdAiPlatform", name: "CCD AI Platform" },
        { func: "showChemicalSuiteTab", modId: "chemicalSuite", subId: "chemicalSafetySuite", name: "Chemistry & Chemical Suite" },
        { func: "showStreamComparatorTab", modId: "streamComparator", subId: "streamComparatorMain", name: "Stream Comparator (HMB)" },
        { func: "showUnitConverterTab", modId: "unitConverter", subId: "unitConverterMain", name: "Plant & Integrity Unit Converters" }
      ];

      moduleFunctionMap.forEach(({ func, modId, subId, name }) => {
        if (typeof window[func] === "function" && !window[func].__rbacWrapped) {
          const original = window[func];
          const wrapped = function (...args) {
            let allowed = self.hasSectionAccess(modId, subId);

            // Server-Driven Navigation (SDUI) guard check
            if (Array.isArray(self.authorizedNavigation) && self.authorizedNavigation.length > 0 && !self.isSuperAdmin && self.role !== "admin") {
              const navMod = self.authorizedNavigation.find(
                (m) => m.id === modId ||
                       (modId === "crackingMechanism" && (m.id === "cracking" || m.id === "crackingMechanism")) ||
                       (modId === "cracking" && (m.id === "cracking" || m.id === "crackingMechanism")) ||
                       (modId === "thicknessCalc" && (m.id === "designThickness" || m.id === "thicknessCalc")) ||
                       (modId === "api570" && (m.id === "remainingLife" || m.id === "api570")) ||
                       (modId === "adminControlCenter" && (m.id === "tools" || m.id === "adminControlCenter"))
              );
              if (!navMod) {
                if (!self.hasModuleAccess(modId)) {
                  allowed = false;
                }
              } else if (subId && Array.isArray(navMod.subsections) && navMod.subsections.length > 0) {
                const isSubInNavMod = (subsList, targetId) => {
                  if (!Array.isArray(subsList)) return false;
                  return subsList.some(s => {
                    if (s.id === targetId || s.tool === targetId) return true;
                    if (Array.isArray(s.children)) {
                      return s.children.some(c => c.id === targetId || c.tool === targetId);
                    }
                    return false;
                  });
                };
                const hasSub = isSubInNavMod(navMod.subsections, subId) || self.hasSectionAccess(modId, subId);
                if (!hasSub) allowed = false;
              }
            }

            if (!allowed) {
              self.showAccessDenied(name);
              return;
            }
            return original.apply(this, args);
          };
          wrapped.__rbacWrapped = true;
          wrapped.__apmUrlSyncHooked = true;
          window[func] = wrapped;
        }
      });

      // Update UI elements visually (lock badges)
      this.updateVisualLocks();
    },

    updateVisualLocks() {
      if (this.isSuperAdmin || this.role === "admin") return;

      // Remaining Life sub-sections
      const bulkUploadContainer = document.getElementById("bulkUploadArea") || document.querySelector(".bulk-upload-wrapper");
      if (bulkUploadContainer) {
        const canBulk = this.hasSectionAccess("remainingLife", "bulkUpload");
        if (!canBulk) {
          bulkUploadContainer.classList.add("rbac-section-locked");
          bulkUploadContainer.setAttribute("title", "Locked: Your role does not permit bulk Excel upload.");
          const uploadBtn = bulkUploadContainer.querySelector("input[type=file], button, #fileUpload");
          if (uploadBtn) uploadBtn.disabled = true;
        }
      }

      // Process Flow Diagram Subsections
      const pfdSubsections = [
        { section: "cduVdu", funcName: "showCDUVDUTab" },
        { section: "msp", funcName: "showMSPTab" },
        { section: "h2u", funcName: "showH2UTab" },
        { section: "atmospheric", funcName: "showPROCESSFLOWDIAGRAMSTab" }
      ];

      pfdSubsections.forEach(({ section, funcName }) => {
        if (!this.hasSectionAccess("processFlow", section)) {
          const original = window[funcName];
          if (typeof original === "function" && !original.__rbacSubWrapped) {
            window[funcName] = () => {
              this.showAccessDenied(`Process Flow Sub-unit (${section.toUpperCase()})`);
            };
            window[funcName].__rbacSubWrapped = true;
          }
        }
      });

      // Enforce granular actions in Allowable Stress Manager
      if (typeof window.enforceAllowableStressPermissions === "function") {
        window.enforceAllowableStressPermissions();
      }
    },

    isSidebarTabVisible(modId) {
      const isAdmin = this.isSuperAdmin || this.role === "admin";

      if (!modId) return false;
      let targetMod = modId;
      if (
        modId === "damage" ||
        modId === "damageMechanisms" ||
        modId === "damageMechanism" ||
        modId === "damageCatalog" ||
        modId === "api571" ||
        modId === "api571DamageMechanisms" ||
        modId === "card_damageExplorer" ||
        modId === "card_dmg"
      ) {
        targetMod = "damageExplorer";
      }

      // If user has no RBAC access to this module, it is NEVER visible
      if (!isAdmin && !this.hasModuleAccess(targetMod)) return false;

      // If hidden in Layout Builder, it is NOT visible in sidebar
      if (typeof window.isModuleLayoutVisible === "function") {
        if (!window.isModuleLayoutVisible(targetMod)) return false;
      }

      if (targetMod === "adminControlCenter") {
        const el = document.getElementById("rbac_cat_tools");
        if (el) {
          const isHidden = el.style.display === "none" || el.getAttribute("data-rbac-hidden") === "true";
          if (isHidden) return false;
        }
        return isAdmin || this.hasModuleAccess("adminControlCenter");
      }
      if (targetMod === "damageExplorer") {
        const items = document.querySelectorAll("#categoryList li.category-toggle:not([id^='rbac_cat_'])");
        if (items.length === 0) return this.hasModuleAccess("damageExplorer");
        return Array.from(items).some(it => it.style.display !== "none" && it.getAttribute("data-rbac-hidden") !== "true");
      }

      // Generic attribute selector matching directly on DOM
      const elements = document.querySelectorAll(
        `#categoryList [data-rbac-module="${targetMod}"], #categoryList [data-rbac-sub="${targetMod}"], #rbac_cat_${targetMod}${targetMod === "adminControlCenter" || targetMod === "tools" ? ", #rbac_cat_tools" : ""}${targetMod === "damageExplorer" ? ", #categoryList li.category-toggle:not([id^='rbac_cat_'])" : ""}`
      );

      if (elements && elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          const isHidden = el.style.display === "none" || el.getAttribute("data-rbac-hidden") === "true";
          if (!isHidden) return true;
        }
        return false;
      }

      return isAdmin || this.hasModuleAccess(targetMod);
    },

    applySidebarVisibility() {
      if (!this.initialized || window.__isApplyingSidebarVisibility) return;
      window.__isApplyingSidebarVisibility = true;

      try {
        const isAdmin = this.isSuperAdmin || this.role === "admin";

        // Ensure Tools category is present
        if (typeof window.injectToolsCategory === "function" && !document.getElementById("rbac_cat_tools")) {
          window.injectToolsCategory();
        }

        // Install MutationObserver on #categoryList if not already installed
        if (typeof window.__categoryListObserverInstalled === "undefined") {
          window.__categoryListObserverInstalled = true;
          const target = document.getElementById("categoryList");
          if (target) {
            let _observerDebounceTimer = null;
            const obs = new MutationObserver(() => {
              if (window.__isApplyingSidebarLayout || window.__isApplyingSidebarVisibility) return;
              clearTimeout(_observerDebounceTimer);
              _observerDebounceTimer = setTimeout(() => {
                if (!window.__isApplyingSidebarLayout && !window.__isApplyingSidebarVisibility && window.RBAC && typeof window.RBAC.applySidebarVisibility === "function") {
                  window.RBAC.applySidebarVisibility();
                }
              }, 60);
            });
            obs.observe(target, { childList: true });
          }
        }

        // Check if layout configuration has marked modules hidden via Layout & Navigation Builder
        let layoutCfg = window.layoutConfig || (window.adminPanel && window.adminPanel.layoutConfig);
        if (!layoutCfg) {
          try {
            const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
            if (cached) layoutCfg = JSON.parse(cached);
          } catch (e) {}
        }
        
        // Global helper: determines module visibility using Layout & Navigation Builder settings as single source of truth
        window.isModuleLayoutVisible = function(modId, config) {
          let cfg = config || window.layoutConfig || (window.adminPanel && window.adminPanel.layoutConfig);
          if (!cfg) {
            try {
              const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
              if (cached) cfg = JSON.parse(cached);
            } catch (e) {}
          }
          if (!cfg || !Array.isArray(cfg.sidebarModules)) return true;
          const list = cfg.sidebarModules;

          const normFn = typeof window.normalizeSidebarModuleId === "function"
            ? window.normalizeSidebarModuleId
            : (id => id);
          const canonModId = normFn(modId);

          // 1. Canonical or direct match (first occurrence wins)
          const direct = list.find(m => m && (normFn(m.id) === canonModId || m.id === modId));
          if (direct) return direct.visible !== false;

          // 2. Child-to-Parent / Hierarchy mappings
          const PARENT_MAP = {
            corrosionRate: "api581",
            api571Criteria: "api581",
            fluidSelector: "api581",
            inventoryCalc: "api581",
            inspectionConfidence: "api581",
            toxicCalc: "api581",
            cofCalculator: "api581",
            qpofCalculator: "api581",
            corrosionCalc: "api581",
            damageMechanisms: "damageExplorer",
            remainingLife: "api570",
            designThickness: "thicknessCalc",
            b313: "thicknessCalc",
            asmeB31_3: "thicknessCalc",
            simplePiping: "thicknessCalc",
            asmeSectionVIII: "thicknessCalc",
            pipeThickness: "thicknessCalc",
            structuralThickness: "thicknessCalc",
            crackingMechanism: "crackingMechanism",
            cracking: "crackingMechanism",
            tools: "adminControlCenter",
            appDamage: "adminControlCenter",
            appStream: "adminControlCenter",
            appStress: "adminControlCenter",
            appOverview: "adminControlCenter",
            userManagement: "adminControlCenter",
            rbacPermissions: "adminControlCenter",
            sysDiagnostics: "adminControlCenter",
            layoutBuilder: "adminControlCenter",
            masterData: "adminControlCenter"
          };

          const parentId = PARENT_MAP[modId] || PARENT_MAP[canonModId];
          if (parentId) {
            const canonParent = normFn(parentId);
            const parentMod = list.find(m => m && (normFn(m.id) === canonParent || m.id === parentId));
            if (parentMod) return parentMod.visible !== false;
          }

          return true;
        };

        // Global helper: determines whether a Home Dashboard welcome card should be visible
        window.isWelcomeCardVisible = function(modId, config, userRole, hasAccessFn) {
          const isUserAdmin = userRole === "admin" || (window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin"));
          let cfg = config || window.layoutConfig || (window.adminPanel && window.adminPanel.layoutConfig);
          if (!cfg) {
            try {
              const cached = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
              if (cached) cfg = JSON.parse(cached);
            } catch (e) {}
          }
          if (!modId) return false;

          let normModId = modId;
          if (
            modId === "damage" ||
            modId === "damageMechanisms" ||
            modId === "damageMechanism" ||
            modId === "damageCatalog" ||
            modId === "api571" ||
            modId === "api571DamageMechanisms" ||
            modId === "card_damageExplorer" ||
            modId === "card_dmg"
          ) {
            normModId = "damageExplorer";
          } else if (modId === "cracking") {
            normModId = "crackingMechanism";
          } else if (modId === "b313" || modId === "designThickness") {
            normModId = "thicknessCalc";
          } else if (modId === "tools") {
            normModId = "adminControlCenter";
          } else if (modId === "remainingLife") {
            normModId = "api570";
          }

          if (typeof window.isModuleLayoutVisible === "function") {
            if (!window.isModuleLayoutVisible(normModId, cfg)) {
              return false;
            }
          }

          if (cfg && Array.isArray(cfg.welcomeCards)) {
            const cardCfg = cfg.welcomeCards.find(c => c.targetTab === normModId || c.targetTab === modId || c.id === modId || c.id === normModId || c.id === `card_${normModId}` || (normModId === "crackingMechanism" && (c.targetTab === "cracking" || c.targetTab === "crackingMechanism")));
            if (cardCfg && cardCfg.enabled === false) return false;
          }

          if (normModId === "adminControlCenter") {
            const hasTools = window.RBAC ? window.RBAC.hasModuleAccess("adminControlCenter") : false;
            return isUserAdmin || hasTools;
          }

          const rbacAllowed = isUserAdmin || (typeof hasAccessFn === "function" ? hasAccessFn(normModId) : (window.RBAC ? window.RBAC.hasModuleAccess(normModId) : true));
          if (!rbacAllowed) return false;

          if (window.RBAC && typeof window.RBAC.isSidebarTabVisible === "function") {
            if (!window.RBAC.isSidebarTabVisible(normModId)) return false;
          }

          return true;
        };
        window.isSidebarTabVisible = (modId) => (window.RBAC && typeof window.RBAC.isSidebarTabVisible === "function" ? window.RBAC.isSidebarTabVisible(modId) : true);

        const isLayoutHidden = (targetMod) => !window.isModuleLayoutVisible(targetMod, layoutCfg);

        // 1. Filter API 571 Damage Mechanism Explorer items (class "category-toggle")
        const canDamageExplorer = (isAdmin || this.hasModuleAccess("damageExplorer")) && !isLayoutHidden("damageExplorer");
        const api571Items = document.querySelectorAll("#categoryList li.category-toggle");
        api571Items.forEach((item) => {
          if (item.id && item.id.startsWith("rbac_cat_")) return;
          if (canDamageExplorer) {
            item.removeAttribute("data-rbac-hidden");
            item.style.removeProperty("display");
          } else {
            item.setAttribute("data-rbac-hidden", "true");
            item.style.setProperty("display", "none", "important");
          }
        });

        // 2. Filter all leaf items with data-rbac-module
        const moduleItems = document.querySelectorAll("#categoryList li[data-rbac-module]");
        moduleItems.forEach((item) => {
          if (item.id && item.id.startsWith("rbac_cat_")) return;

          const modId = item.getAttribute("data-rbac-module");
          const subId = item.getAttribute("data-rbac-sub");
          let hasAccess = (isAdmin || this.hasModuleAccess(modId)) && !isLayoutHidden(modId);
          if (hasAccess && subId) {
            hasAccess = this.hasSectionAccess(modId, subId);
          }

          if (hasAccess) {
            item.removeAttribute("data-rbac-hidden");
            item.style.removeProperty("display");
          } else {
            item.setAttribute("data-rbac-hidden", "true");
            item.style.setProperty("display", "none", "important");
          }
        });

        // 3. Filter subcategories (like Quantitative, Semi Quantitative, Process Piping)
        const subcategories = document.querySelectorAll("#categoryList li[data-rbac-subcategory]");
        subcategories.forEach((subcat) => {
          const childLis = subcat.querySelectorAll("ul.mechanisms > li");
          let hasVisibleChild = false;
          childLis.forEach((cli) => {
            if (cli.getAttribute("data-rbac-hidden") !== "true") {
              hasVisibleChild = true;
            }
          });

          if (isAdmin || (hasVisibleChild && childLis.length > 0)) {
            subcat.removeAttribute("data-rbac-hidden");
            subcat.style.removeProperty("display");
          } else {
            subcat.setAttribute("data-rbac-hidden", "true");
            subcat.style.setProperty("display", "none", "important");
          }
        });

        // 4. Filter top-level injected category containers
        const categoriesToCheck = [
          { id: "rbac_cat_api581", mod: "api581" },
          { id: "rbac_cat_api570", mod: "api570" },
          { id: "rbac_cat_thicknessCalc", mod: "thicknessCalc" },
          { id: "rbac_cat_designThickness", mod: "thicknessCalc" },
          { id: "rbac_cat_cracking", mod: "crackingMechanism" },
          { id: "rbac_cat_bkStress", mod: "bkStress" },
          { id: "rbac_cat_processFlow", mod: "processFlow" },
          { id: "rbac_cat_chemicalSuite", mod: "chemicalSuite" },
          { id: "rbac_cat_streamComparator", mod: "streamComparator" },
          { id: "rbac_cat_unitConverter", mod: "unitConverter" },
          { id: "rbac_cat_rptu", mod: "rptu" },
          { id: "rbac_cat_ccdAI", mod: "ccdAI" },
          { id: "rbac_cat_tools", mod: "adminControlCenter" }
        ];

        categoriesToCheck.forEach(({ id, mod }) => {
          const catEl = document.getElementById(id);
          if (!catEl) return;

          let showCat = false;
          if (isLayoutHidden(mod)) {
            showCat = false;
          } else if (id === "rbac_cat_tools") {
            if (isAdmin) {
              showCat = true;
            } else if (!this.hasModuleAccess("adminControlCenter")) {
              showCat = false;
            } else {
              const subLis = catEl.querySelectorAll("li[data-rbac-sub]");
              let anySubAllowed = false;
              subLis.forEach((sLi) => {
                const subId = sLi.getAttribute("data-rbac-sub");
                const hasSub = this.hasSectionAccess("adminControlCenter", subId);
                if (hasSub) {
                  sLi.removeAttribute("data-rbac-hidden");
                  sLi.style.removeProperty("display");
                  anySubAllowed = true;
                } else {
                  sLi.setAttribute("data-rbac-hidden", "true");
                  sLi.style.setProperty("display", "none", "important");
                }
              });
              showCat = anySubAllowed;
            }
          } else if (isAdmin) {
            showCat = true;
          } else if (mod && !this.hasModuleAccess(mod)) {
            showCat = false;
          } else {
            const childLeaves = catEl.querySelectorAll("li[data-rbac-module]");
            if (childLeaves.length > 0) {
              showCat = Array.from(childLeaves).some((li) => li.getAttribute("data-rbac-hidden") !== "true");
            } else {
              showCat = mod ? this.hasModuleAccess(mod) : true;
            }
          }

          if (showCat) {
            catEl.removeAttribute("data-rbac-hidden");
            catEl.style.removeProperty("display");
          } else {
            catEl.setAttribute("data-rbac-hidden", "true");
            catEl.style.setProperty("display", "none", "important");
          }
        });

        // 5. Admin item in sidebar & bottom footer
        const adminLi = document.getElementById("adminSidebarItem");
        if (adminLi) {
          if (isAdmin) {
            adminLi.removeAttribute("data-rbac-hidden");
            adminLi.style.removeProperty("display");
          } else {
            adminLi.setAttribute("data-rbac-hidden", "true");
            adminLi.style.setProperty("display", "none", "important");
          }
        }

        const adminControlCenterEl = document.getElementById("rbac_cat_adminControlCenter");
        if (adminControlCenterEl && !isAdmin) {
          adminControlCenterEl.style.setProperty("display", "none", "important");
        }
        const bottomFooter = document.getElementById("sidebarBottomFooter");
        if (bottomFooter) {
          bottomFooter.innerHTML = "";
          bottomFooter.style.display = "none";
        }

        // 6. Welcome Panel info cards & Quick Access (Strictly matched to visible sidebar modules)
        const welcomeCards = document.querySelectorAll("#welcomePanel .dash-card[data-rbac-module], #welcomePanel .info-card[data-rbac-module]");
        let visibleWelcomeCardCount = 0;
        welcomeCards.forEach((card) => {
          const modId = card.getAttribute("data-rbac-module");
          let shouldShow = typeof window.isWelcomeCardVisible === "function"
            ? window.isWelcomeCardVisible(modId, layoutCfg, this.role, (m) => this.hasModuleAccess(m))
            : (this.isSidebarTabVisible(modId) && (isAdmin || this.hasModuleAccess(modId)));

          // Double check layout visibility directly
          if (typeof window.isModuleLayoutVisible === "function" && !window.isModuleLayoutVisible(modId, layoutCfg)) {
            shouldShow = false;
          }

          if (shouldShow) {
            card.style.removeProperty("display");
            card.removeAttribute("data-rbac-hidden");
            visibleWelcomeCardCount++;
          } else {
            card.style.setProperty("display", "none", "important");
            card.setAttribute("data-rbac-hidden", "true");
          }

          // Apply custom welcome card title and subtitle from layout configuration
          if (layoutCfg && Array.isArray(layoutCfg.welcomeCards)) {
            const cardCfg = layoutCfg.welcomeCards.find(c => c.targetTab === modId || c.id === modId || c.id === `card_${modId}` || (modId === "cracking" && c.targetTab === "crackingMechanism") || (modId === "crackingMechanism" && c.targetTab === "cracking"));
            if (cardCfg) {
              if (cardCfg.title) {
                const h = card.querySelector("h3, h4, .dash-card-title");
                if (h) h.textContent = cardCfg.title;
              }
              if (cardCfg.subtitle !== undefined) {
                const p = card.querySelector("p, .dash-card-desc");
                if (p) p.textContent = cardCfg.subtitle;
              }
            }
          }
        });

        const adminCard = document.querySelector('#welcomePanel .dash-card[data-rbac-module="adminControlCenter"]');
        if (adminCard) {
          const titleEl = adminCard.querySelector('.dash-card-title');
          const descEl = adminCard.querySelector('.dash-card-desc');
          if (!isAdmin && this.hasModuleAccess("adminControlCenter")) {
            if (titleEl) titleEl.textContent = "🛠️ Tools & Utilities";
            if (descEl) descEl.textContent = "Access assigned engineering tools, catalog manager & data loaders.";
          } else if (isAdmin) {
            if (titleEl) titleEl.textContent = "Admin Control Center";
            if (descEl) descEl.textContent = "User management, RBAC role permissions, custom damage catalog, layout builder & system backups.";
          }
        }

        if (typeof window.updateDashboardCardCounts === "function") {
          window.updateDashboardCardCounts();
        }

        // Show friendly fallback badge in welcome panel if all cards are hidden
        const welcomeGrid = document.querySelector("#welcomePanel .dash-cards-grid, #welcomePanel .info-grid");
        let fallbackNotice = document.getElementById("rbacWelcomeFallbackNotice");
        if (welcomeGrid) {
          if (visibleWelcomeCardCount === 0) {
            if (!fallbackNotice) {
              fallbackNotice = document.createElement("div");
              fallbackNotice.id = "rbacWelcomeFallbackNotice";
              fallbackNotice.style.cssText = "grid-column: 1 / -1; padding: 28px 20px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; text-align: center; margin: 15px 0;";
              welcomeGrid.appendChild(fallbackNotice);
            }
            if (isAdmin) {
              fallbackNotice.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 8px;">🔒</div>
                <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 17px; font-weight: 700;">All Dashboard Cards Hidden</h4>
                <p style="margin: 0; color: #64748b; font-size: 13.5px; max-width: 600px; margin: 0 auto;">All modules are currently set to hidden in the Layout &amp; Navigation settings. You can re-enable modules anytime in <strong>⚙️ Admin Control Center → 🖥️ Layout &amp; Navigation Builder → Navigation Visibility</strong>.</p>
              `;
            } else {
              fallbackNotice.innerHTML = `
                <div style="font-size: 36px; margin-bottom: 8px;">🛡️</div>
                <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 17px; font-weight: 700;">Assigned Role Modules Active</h4>
                <p style="margin: 0; color: #64748b; font-size: 13.5px; max-width: 600px; margin: 0 auto;">You have access to your assigned modules in the left sidebar navigation. Please click on any accessible module to start.</p>
              `;
            }
            fallbackNotice.style.display = "block";
          } else if (fallbackNotice) {
            fallbackNotice.style.display = "none";
          }
        }
      } finally {
        window.__isApplyingSidebarVisibility = false;
      }
    }
  };

  // Auto initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.RBAC.init());
  } else {
    window.RBAC.init();
  }
})();

// ============================================================================
// 👑 ADMIN RBAC MANAGEMENT MODAL LOGIC
// ============================================================================

window.openRbacAdminModal = async function () {
  const modal = document.getElementById("rbacAdminModal");
  if (!modal) {
    if (window.TemplateManager && typeof window.TemplateManager.loadRbacModal === "function") {
      window.TemplateManager.loadRbacModal(async function() {
        await window.openRbacAdminModal();
      });
    }
    return;
  }
  modal.style.display = "flex";
  await window.loadRbacUsersList();
};

window.closeRbacAdminModal = function () {
  const modal = document.getElementById("rbacAdminModal");
  if (modal) modal.style.display = "none";
};

window.loadRbacUsersList = async function () {
  const userSelect = document.getElementById("rbacUserSelect");
  const callerEmail = (window.APP_SESSION && window.APP_SESSION.email) || (window.RBAC && window.RBAC.userEmail) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";

  try {
    const res = await fetch(`/api/rbac?action=list_users&callerEmail=${encodeURIComponent(callerEmail)}`);
    const data = await res.json();
    if (data.users && userSelect) {
      window.__rbacUsersData = data.users;
      window.__rbacAvailableModules = data.availableModules || [];

      userSelect.innerHTML = data.users
        .map(u => `<option value="${u.email}">${u.email} [${u.role ? u.role.toUpperCase() : "STANDARD"}]</option>`)
        .join("");

      // Select first or current
      const currentSelected = userSelect.value || data.users[0]?.email;
      if (currentSelected) {
        window.onRbacUserSelected(currentSelected);
      }
    }
  } catch (e) {
    console.error("Error loading users list:", e);
  }
};

window.onRbacUserSelected = function (email) {
  const users = window.__rbacUsersData || [];
  const user = users.find(u => u.email === email);
  if (!user) return;

  const roleSelect = document.getElementById("rbacRoleSelect");
  const targetEmailInput = document.getElementById("rbacTargetEmail");
  if (roleSelect) roleSelect.value = user.role || "engineer";
  if (targetEmailInput) targetEmailInput.value = user.email;

  window.renderRbacModulesTree(user.role, user.allowedModules || {}, user.subsections || {});
};

window.onRbacRoleChanged = function (newRole) {
  const targetEmail = (document.getElementById("rbacTargetEmail")?.value || "").toLowerCase().trim();
  const users = window.__rbacUsersData || [];
  const existing = users.find(u => u.email === targetEmail);

  window.renderRbacModulesTree(newRole, existing?.allowedModules || {}, existing?.subsections || {});
};

window.renderRbacModulesTree = function (role, currentMods = {}, currentSubs = {}) {
  const container = document.getElementById("rbacModulesContainer");
  if (!container) return;

  const modules = window.__rbacAvailableModules || window.RBAC.availableModules || [];
  const isPresetAdmin = role === "admin";
  const isPresetEngineer = role === "lead_engineer";

  let html = `<div class="rbac-modules-grid">`;

  modules.forEach(mod => {
    let modChecked = true;
    if (role === "custom") {
      modChecked = !!currentMods[mod.id];
    } else if (role === "inspector") {
      modChecked = ["damageExplorer", "api571Criteria", "crackingMechanism", "remainingLife", "inspectionConfidence", "fluidSelector", "processFlow", "corrosionRate", "pipeThickness"].includes(mod.id);
    } else if (role === "viewer") {
      modChecked = ["damageExplorer", "fluidSelector", "inspectionConfidence", "processFlow"].includes(mod.id);
    }

    const disabledAttr = (isPresetAdmin || isPresetEngineer) ? "disabled" : "";

    html += `
      <div class="rbac-module-card">
        <div class="rbac-module-header">
          <label class="rbac-checkbox-label">
            <input type="checkbox" id="mod_${mod.id}" data-mod="${mod.id}" ${modChecked ? "checked" : ""} ${disabledAttr} onchange="window.onModuleCheckboxChange('${mod.id}')">
            <span class="rbac-module-name">${mod.name}</span>
          </label>
          <span class="rbac-category-tag">${mod.category || "General"}</span>
        </div>
    `;

    if (mod.subsections && mod.subsections.length > 0) {
      html += `<div class="rbac-subsections-list" id="sub_container_${mod.id}" style="${modChecked ? '' : 'opacity: 0.5; pointer-events: none;'}">`;
      mod.subsections.forEach(sub => {
        let subChecked = true;
        if (role === "custom") {
          subChecked = currentSubs[mod.id] && typeof currentSubs[mod.id][sub.id] === "boolean" ? currentSubs[mod.id][sub.id] : modChecked;
        } else if (role === "inspector" && mod.id === "remainingLife" && sub.id === "bulkUpload") {
          subChecked = false;
        } else if (role === "viewer") {
          subChecked = false;
        }

        html += `
          <label class="rbac-sub-label">
            <input type="checkbox" id="sub_${mod.id}_${sub.id}" data-parent="${mod.id}" data-sub="${sub.id}" ${subChecked ? "checked" : ""} ${disabledAttr}>
            <span>${sub.name}</span>
          </label>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
};

window.onModuleCheckboxChange = function (modId) {
  const modCheckbox = document.getElementById(`mod_${modId}`);
  const subContainer = document.getElementById(`sub_container_${modId}`);
  if (subContainer && modCheckbox) {
    if (modCheckbox.checked) {
      subContainer.style.opacity = "1";
      subContainer.style.pointerEvents = "auto";
    } else {
      subContainer.style.opacity = "0.5";
      subContainer.style.pointerEvents = "none";
    }
  }
};

window.saveRbacPermissionsToFirebase = async function () {
  const callerEmail = (window.APP_SESSION && window.APP_SESSION.email) || (window.RBAC && window.RBAC.userEmail) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";
  const targetEmail = (document.getElementById("rbacTargetEmail")?.value || "").toLowerCase().trim();
  const role = document.getElementById("rbacRoleSelect")?.value || "engineer";
  const saveBtn = document.getElementById("rbacSaveBtn");

  if (!targetEmail) {
    alert("Please enter a valid user email");
    return;
  }

  // Collect modules and subsections
  const allowedModules = {};
  const subsections = {};

  const modCheckboxes = document.querySelectorAll("#rbacModulesContainer input[data-mod]");
  modCheckboxes.forEach(cb => {
    const modId = cb.getAttribute("data-mod");
    allowedModules[modId] = cb.checked;
  });

  const subCheckboxes = document.querySelectorAll("#rbacModulesContainer input[data-sub]");
  subCheckboxes.forEach(cb => {
    const parentId = cb.getAttribute("data-parent");
    const subId = cb.getAttribute("data-sub");
    if (!subsections[parentId]) subsections[parentId] = {};
    subsections[parentId][subId] = cb.checked;
  });

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving to Firebase...";
  }

  try {
    const res = await fetch("/api/rbac", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_user_role",
        callerEmail,
        targetEmail,
        role,
        allowedModules,
        subsections
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save permissions");

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Permissions Saved!",
        text: `Permissions for ${targetEmail} have been updated successfully in Firebase.`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      alert(`Permissions for ${targetEmail} saved successfully!`);
    }

    // Broadcast update across all sessions & tabs
    if (window.RBAC && typeof window.RBAC.broadcastUpdate === "function") {
      window.RBAC.broadcastUpdate(targetEmail);
    }

    // Refresh current user if target is self
    if (targetEmail === callerEmail.toLowerCase().trim()) {
      await window.RBAC.init();
    }

    await window.loadRbacUsersList();
  } catch (err) {
    console.error("Save RBAC error:", err);
    alert(`Error saving permissions: ${err.message}`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "💾 Save Permissions to Firebase";
    }
  }
};

window.loadAdminPanelOnDemand = async function () {
  if (window.adminPanel && window.adminPanel._hasInitialized && typeof window.adminPanel.init === "function") {
    return true;
  }
  if (window._loadingAdminPanelPromise) {
    return window._loadingAdminPanelPromise;
  }

  window._loadingAdminPanelPromise = (async () => {
    try {
      const isAdmin = window.RBAC && (window.RBAC.isSuperAdmin || window.RBAC.role === "admin");
      const hasToolsAccess = window.RBAC && typeof window.RBAC.hasModuleAccess === "function" && window.RBAC.hasModuleAccess("adminControlCenter");
      if (!isAdmin && !hasToolsAccess) {
        console.warn("[RBAC] User is not authorized to load admin panel bundle.");
        return false;
      }

      const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
      const uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userUid") : "") || "";
      const email = (window.RBAC && window.RBAC.userEmail) || (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";

      const headers = {};
      if (sessionId) headers["x-session-id"] = sessionId;
      if (uid) headers["x-user-uid"] = uid;

      try {
        if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser._lat) {
          headers["authorization"] = `Bearer ${firebase.auth().currentUser._lat}`;
        }
      } catch (e) {}

      const res = await fetch(`/api/admin?action=get_admin_bundle&email=${encodeURIComponent(email)}&_t=${Date.now()}`, {
        method: "GET",
        headers
      });

      if (!res.ok) {
        console.warn("[RBAC] Failed to fetch guarded admin bundle:", res.status);
        return false;
      }

      const scriptContent = await res.text();
      const scriptEl = document.createElement("script");
      scriptEl.type = "text/javascript";
      scriptEl.text = scriptContent;
      document.head.appendChild(scriptEl);

      if (window.adminPanel && !window.adminPanel._hasInitialized && typeof window.adminPanel.init === "function") {
        window.adminPanel.init();
      }
      return true;
    } catch (err) {
      console.error("[RBAC] Error dynamically loading admin panel bundle:", err);
      return false;
    } finally {
      window._loadingAdminPanelPromise = null;
    }
  })();

  return window._loadingAdminPanelPromise;
};
