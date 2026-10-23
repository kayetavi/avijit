// ============================================================================
// 🛡️ EXECUTIVE ADMIN CONTROL PANEL - KayetDMS
// Full In-App Firestore & RBAC Management (No Firebase Console required)
// ============================================================================

(function () {
  // Server-authoritative admin control panel logic
  function getSuperAdminEmail() {
    return (window.APP_SESSION && window.APP_SESSION.email) || (window.RBAC && window.RBAC.userEmail) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";
  }

  // 🔐 Secure Session Interceptor: Attach validated session ID header (x-session-id) and payload identifiers to all administrative API requests
  if (typeof window !== "undefined" && !window.__adminFetchInterceptorInstalled) {
    window.__adminFetchInterceptorInstalled = true;
    const originalFetch = window.fetch;
    const interceptorFetch = function (input, init = {}) {
      try {
        const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        if (url && (url.includes("/api/admin") || url.includes("/api/rbac") || url.includes("/api/session") || url.includes("/api/stream-datasets"))) {
          const opts = { ...init };
          const existingHeaders = opts.headers || (typeof input === "object" && input && input.headers ? input.headers : null);
          const headers = new Headers(existingHeaders || {});

          const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
          const uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userUid") : "") || "";

          if (sessionId && !headers.has("x-session-id")) {
            headers.set("x-session-id", sessionId);
          }
          if (uid && !headers.has("x-user-uid")) {
            headers.set("x-user-uid", uid);
          }

          // If Firebase Auth currentUser is present, attach Bearer token
          try {
            if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser && !headers.has("authorization")) {
              const u = firebase.auth().currentUser;
              if (u._lat) {
                headers.set("authorization", `Bearer ${u._lat}`);
              }
            }
          } catch (e) {}

          // Also inject sessionId and uid into JSON body for guaranteed transmission across proxies/CORS
          if (opts.body && typeof opts.body === "string" && (headers.get("content-type") || "").includes("application/json")) {
            try {
              const parsed = JSON.parse(opts.body);
              let changed = false;
              if (sessionId && !parsed.sessionId) {
                parsed.sessionId = sessionId;
                changed = true;
              }
              if (uid && !parsed.uid) {
                parsed.uid = uid;
                changed = true;
              }
              if (changed) {
                opts.body = JSON.stringify(parsed);
              }
            } catch (jsonErr) {}
          }

          opts.headers = headers;
          return originalFetch.call(this, input, opts);
        }
      } catch (e) {
        console.warn("[AdminPanel] Session header interceptor error:", e);
      }
      return originalFetch.call(this, input, init);
    };

    try {
      window.fetch = interceptorFetch;
    } catch (err) {
      try {
        Object.defineProperty(window, "fetch", {
          value: interceptorFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (defErr) {
        console.warn("[AdminPanel] Could not override window.fetch:", defErr);
      }
    }
  }

  // Available modules are loaded dynamically from Backend API (/api/rbac) or default hierarchy
  const getInitialAvailableModules = () => {
    if (window.RBAC && Array.isArray(window.RBAC.availableModules) && window.RBAC.availableModules.length > 0) {
      return window.RBAC.availableModules;
    }
    return [];
  };

  window.adminPanel = Object.assign(window.adminPanel || {}, {
    activeSubTab: "users", // "users" | "damageMechanisms" | "sessions" | "firestore" | "backup"
    users: [],
    availableModules: getInitialAvailableModules(),
    sessions: [],
    overview: {},
    selectedCollection: "userRoles",
    collectionDocs: [],
    editingUserEmail: null,
    searchQuery: "",
    // 🔬 Damage Mechanism Catalog State
    damageMechanisms: [],
    dmSearchQuery: "",
    dmFilterType: "all",
    dmCategoryFilter: "all",
    dmSortBy: "code_asc",
    dmCurrentPage: 1,
    dmPageSize: 9,
    dmViewMode: "grid",
    stagedModalImageData: null,
    stagedQuickImageData: null,
    activeQuickImageMechName: null,

    getCallerEmail() {
      let stored = ((window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "").toLowerCase().trim();
      if (stored === "null" || stored === "undefined" || stored === "[object object]") stored = "";
      if (stored) return stored;

      if (window.RBAC && window.RBAC.userEmail) {
        let rEmail = String(window.RBAC.userEmail).toLowerCase().trim();
        if (rEmail && rEmail !== "null" && rEmail !== "undefined") return rEmail;
      }

      let altEmail = ((window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "").toLowerCase().trim();
      if (altEmail && altEmail !== "null" && altEmail !== "undefined") return altEmail;

      try {
        if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) {
          return firebase.auth().currentUser.email.toLowerCase().trim();
        }
      } catch (e) {}

      try {
        const cachedRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_rbac_permissions") : null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && (cached.email || cached.userEmail)) {
            return (cached.email || cached.userEmail).toLowerCase().trim();
          }
        }
      } catch (e) {}

      return getSuperAdminEmail();
    },

    getAuthHeaders(customHeaders = {}) {
      const headers = { ...customHeaders };
      const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
      const uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userUid") : "") || "";
      if (sessionId && !headers["x-session-id"]) {
        headers["x-session-id"] = sessionId;
      }
      if (uid && !headers["x-user-uid"]) {
        headers["x-user-uid"] = uid;
      }
      return headers;
    },

    async adminFetch(url, options = {}) {
      const opts = { ...options };
      opts.credentials = opts.credentials || "include";
      opts.headers = this.getAuthHeaders(opts.headers || {});

      // If Firebase Auth currentUser is present, attach fresh Bearer token
      if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
        try {
          const token = await firebase.auth().currentUser.getIdToken(false);
          if (token && !opts.headers["Authorization"] && !opts.headers["authorization"]) {
            opts.headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (tokErr) {
          try {
            const fresh = await firebase.auth().currentUser.getIdToken(true);
            if (fresh && !opts.headers["Authorization"] && !opts.headers["authorization"]) {
              opts.headers["Authorization"] = `Bearer ${fresh}`;
            }
          } catch (e) {}
        }
      }

      let sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
      let uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userUid") : "") || "";
      const callerEmail = this.getCallerEmail();

      // If sessionId is missing, attempt active recovery from /api/session
      if (!sessionId && callerEmail) {
        try {
          const recRes = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ action: "validate", email: callerEmail })
          });
          const recData = await recRes.json().catch(() => ({}));
          if (recData && recData.valid && recData.session && recData.session.sessionId) {
            sessionId = recData.session.sessionId;
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("sessionId", sessionId);
            sessionStorage.setItem("sessionId", sessionId);
            if (recData.session.uid) {
              uid = recData.session.uid;
              if (typeof sessionStorage !== "undefined") sessionStorage.setItem("userUid", uid);
              sessionStorage.setItem("userUid", uid);
            }
          }
        } catch (e) {}
      }

      if (sessionId) {
        if (!opts.headers["x-session-id"]) opts.headers["x-session-id"] = sessionId;
        if (!opts.headers["Authorization"] && !opts.headers["authorization"]) {
          opts.headers["Authorization"] = `Bearer ${sessionId}`;
        }
      }
      if (uid && !opts.headers["x-user-uid"]) {
        opts.headers["x-user-uid"] = uid;
      }

      // Ensure JSON body carries sessionId, uid, and callerEmail
      if (opts.body && typeof opts.body === "string" && (opts.headers["Content-Type"]?.includes("application/json") || opts.headers["content-type"]?.includes("application/json"))) {
        try {
          const parsed = JSON.parse(opts.body);
          let changed = false;
          if (sessionId && !parsed.sessionId) {
            parsed.sessionId = sessionId;
            changed = true;
          }
          if (uid && !parsed.uid) {
            parsed.uid = uid;
            changed = true;
          }
          if (callerEmail && !parsed.callerEmail) {
            parsed.callerEmail = callerEmail;
            changed = true;
          }
          if (changed) {
            opts.body = JSON.stringify(parsed);
          }
        } catch (e) {}
      }

      const res = await fetch(url, opts);
      return res;
    },

    async safeFetch(url, options = {}, retries = 2, delayMs = 500) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          const res = await this.adminFetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            return await res.json();
          }
          if (res.status === 403 || res.status === 401) {
            const errData = await res.json().catch(() => ({}));
            return { success: false, error: errData.error || "Access Denied" };
          }
        } catch (err) {
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
            continue;
          }
          console.warn(`[AdminPanel] safeFetch notice for ${url}:`, err?.message || err);
        }
      }
      return null;
    },

    isAdmin() {
      if (window.RBAC && window.RBAC.initialized) {
        return window.RBAC.role === "admin" || !!window.RBAC.isSuperAdmin;
      }
      try {
        const cachedRaw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_rbac_permissions") : null;
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached) {
            return cached.role === "admin" || !!cached.isSuperAdmin;
          }
        }
      } catch (e) {}
      return false;
    },

    getSafeId(str) {
      return String(str || "").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    },

    showToast(message, type = "info") {
      try {
        let container = document.querySelector(".adm-toast-container");
        if (!container) {
          container = document.createElement("div");
          container.className = "adm-toast-container";
          document.body.appendChild(container);
        }
        const toast = document.createElement("div");
        toast.className = `adm-toast ${type}`;
        const icon = type === "success" ? "✅" : (type === "error" ? "❌" : (type === "warning" ? "⚠️" : "ℹ️"));
        toast.innerHTML = `<span>${icon}</span><span style="font-size: 13px; font-weight: 500;">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transition = "opacity 0.3s ease";
          setTimeout(() => { try { toast.remove(); } catch (e) {} }, 300);
        }, 4000);
      } catch (e) {
        console.log(`[AdminPanel Toast ${type}]`, message);
      }
    },

    currentView: "users-list",

    async init() {
      if (this._hasInitialized) return;
      this._hasInitialized = true;
      const isAdm = this.isAdmin();
      document.body.classList.toggle("is-admin", isAdm);

      // Instant load from in-memory or session layout config so custom labels, icons, and order apply immediately with 0ms delay
      try {
        const cachedLayout = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null;
        if (cachedLayout) {
          const parsed = JSON.parse(cachedLayout);
          if (parsed && parsed.sidebarModules) {
            this.layoutConfig = parsed;
            window.layoutConfig = parsed;
            this.applyLayoutConfigToDashboard(parsed);
          }
        }
      } catch (e) {}

      // Load and apply published layout configuration to dashboard from server
      this.loadAndApplyPublishedLayoutConfig();

      const adminBtn = document.getElementById("adminRbacBtn");
      const adminSidebarItem = document.getElementById("adminSidebarItem");
      const footerContainer = document.getElementById("sidebarBottomFooter");

      // Consolidate all admin controls exclusively into Tools category hierarchy
      if (footerContainer) {
        footerContainer.innerHTML = "";
        footerContainer.style.display = "none";
      }
      if (adminSidebarItem) adminSidebarItem.remove();

      if (!isAdm) {
        if (adminBtn) adminBtn.style.display = "none";
        return;
      }

      // Enable Admin navigation entry points
      if (adminBtn) {
        adminBtn.style.display = "block";
        adminBtn.textContent = "🛡️ Admin Control Panel";
        adminBtn.onclick = () => {
          if (typeof hideAllMainPanels === "function") hideAllMainPanels();
          if (typeof hideWelcomePanel === "function") hideWelcomePanel();
          window.showAdminPanelTab();
        };
      }

      // Consolidate admin navigation in Tools: clean up any legacy footer button
      this.injectSidebarLink();
    },

    injectSidebarLink() {
      // Consolidate admin navigation exclusively in Tools (#rbac_cat_tools).
      // Remove duplicate bottom fixed footer button to keep sidebar drawer clean.
      const footerContainer = document.getElementById("sidebarBottomFooter");
      if (footerContainer) {
        footerContainer.innerHTML = "";
        footerContainer.style.display = "none";
      }
      const existing = document.getElementById("adminSidebarItem");
      if (existing) existing.remove();
    },

    async loadAll() {
      await Promise.allSettled([
        this.loadOverview(),
        this.loadUsers(),
        this.loadDamageMechanisms(),
        this.loadSessions()
      ]);
    },

    async loadOverview() {
      const callerEmail = this.getCallerEmail();
      const data = await this.safeFetch(`/api/admin?action=get_overview&callerEmail=${encodeURIComponent(callerEmail)}`);
      if (data && data.success && data.stats) {
        this.overview = data.stats;
        this._adminOverview = data.stats;
      } else {
        // Fallback to local cached stats or default stats
        try {
          const cached = this._adminOverview ? JSON.stringify(this._adminOverview) : null;
          if (cached) this.overview = JSON.parse(cached);
        } catch (e) {}
        if (!this.overview || !this.overview.totalUsers) {
          this.overview = {
            totalUsers: (this.users && this.users.length) || 5,
            roleBreakdown: { admin: 1, lead_engineer: 1, inspector: 0, viewer: 1, custom: 2 },
            activeSessionsCount: 1,
            totalSessionsCount: 1,
            availableModulesCount: 19,
            collections: ["userRoles", "userSessions"],
            firestoreConnected: true
          };
        }
      }
      this.renderOverviewCards();
    },

    renderOverviewCards() {
      const stats = this.overview;
      const totalUsersEl = document.getElementById("admStatTotalUsers");
      const activeSessionsEl = document.getElementById("admStatActiveSessions");
      const totalSessionsEl = document.getElementById("admStatTotalSessions");
      const firestoreStatusEl = document.getElementById("admStatFirestoreStatus");

      if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || "0";
      if (activeSessionsEl) activeSessionsEl.textContent = stats.activeSessionsCount || "0";
      if (totalSessionsEl) totalSessionsEl.textContent = stats.totalSessionsCount || "0";
      if (firestoreStatusEl) {
        firestoreStatusEl.innerHTML = stats.firestoreConnected
          ? '<span style="color: #22c55e;">● Connected</span>'
          : '<span style="color: #f59e0b;">● Offline Mode</span>';
      }

      // Badges across Admin sidebar & hub
      const bUsers = document.getElementById("admBadgeUsersCount");
      if (bUsers) bUsers.textContent = stats.totalUsers || "0";

      const bSessions = document.getElementById("admBadgeSessionsCount");
      if (bSessions) bSessions.textContent = stats.activeSessionsCount || "0";

      const bDms = document.getElementById("admBadgeDmsCount");
      if (bDms) bDms.textContent = this.damageMechanisms?.length || "68";

      const hubDm = document.getElementById("admHubDmCountBadge");
      if (hubDm) hubDm.textContent = `${this.damageMechanisms?.length || 68} Mechanisms`;

      const masterDm = document.getElementById("admMasterDmCountBadge");
      if (masterDm) masterDm.textContent = `${this.damageMechanisms?.length || 68} Records`;

      // Role breakdown chips
      const breakdownEl = document.getElementById("admRoleBreakdown");
      if (breakdownEl && stats.roleBreakdown) {
        const rb = stats.roleBreakdown;
        breakdownEl.innerHTML = `
          <span class="adm-pill role-admin">👑 Admin: ${rb.admin || 0}</span>
          <span class="adm-pill role-lead_engineer">⚙️ Engineer: ${rb.lead_engineer || 0}</span>
          <span class="adm-pill role-inspector">🔍 Inspector: ${rb.inspector || 0}</span>
          <span class="adm-pill role-viewer">👁️ Viewer: ${rb.viewer || 0}</span>
          <span class="adm-pill role-custom">🛠️ Custom: ${rb.custom || 0}</span>
        `;
      }
    },

    navigateTo(viewId) {
      if (!this.isAdmin() && window.RBAC && typeof window.RBAC.hasSectionAccess === "function") {
        const adminModule = (this.availableModules || []).find(m => m.id === "adminControlCenter") ||
                            (window.RBAC?.authorizedNavigation || []).find(m => m.id === "adminControlCenter");
        const toolViews = adminModule && Array.isArray(adminModule.subsections)
          ? adminModule.subsections.map(sub => ({ view: sub.tool || sub.id, sub: sub.id }))
          : [];

        let reqSub = null;
        const matchingSub = adminModule?.subsections?.find(s => s.tool === viewId || s.id === viewId || s.id.toLowerCase() === viewId.replace(/-/g, "").toLowerCase());
        if (matchingSub) {
          reqSub = matchingSub.id;
        } else {
          if (viewId === "users-list") reqSub = "userManagement";
          else if (viewId === "roles-config" || viewId === "permission-matrix") reqSub = "rbacPermissions";
          else if (viewId === "access-control") reqSub = "accessControl";
          else if (viewId === "app-hub") reqSub = "appOverview";
          else if (viewId === "app-cracking" || viewId === "app-damage") reqSub = "appCracking";
          else if (viewId === "app-stream") reqSub = "appStream";
          else if (viewId === "app-stress") reqSub = "appStress";
          else reqSub = viewId;
        }

        const hasSubAccess = reqSub && (
          window.RBAC.hasSectionAccess("adminControlCenter", reqSub) ||
          window.RBAC.hasSectionAccess("adminControlCenter", viewId) ||
          (reqSub === "appStream" && (
            window.RBAC.hasSectionAccess("adminControlCenter", "appStream") ||
            window.RBAC.hasSectionAccess("adminControlCenter", "app-stream") ||
            (window.RBAC.subsections?.adminControlCenter?.appStream === true) ||
            (window.RBAC.subsections?.adminControlCenter?.["app-stream"] === true)
          )) ||
          (reqSub === "appCracking" && (window.RBAC.hasSectionAccess("adminControlCenter", "appCracking") || window.RBAC.hasSectionAccess("adminControlCenter", "app-cracking") || window.RBAC.hasSectionAccess("adminControlCenter", "appDamage"))) ||
          (reqSub === "appStress" && (window.RBAC.hasSectionAccess("adminControlCenter", "appStress") || window.RBAC.hasSectionAccess("adminControlCenter", "app-stress")))
        );

        if (!viewId || !hasSubAccess) {
          const firstAllowed = toolViews.find(tv => 
            window.RBAC.hasSectionAccess("adminControlCenter", tv.sub) ||
            window.RBAC.hasSectionAccess("adminControlCenter", tv.view)
          );
          if (firstAllowed && firstAllowed.view !== viewId) {
            viewId = firstAllowed.view;
            reqSub = firstAllowed.sub;
          } else if (reqSub && !hasSubAccess) {
            if (typeof Swal !== "undefined") {
              Swal.fire({
                icon: "error",
                title: "Access Denied",
                text: `You do not have permission to access the "${viewId}" section.`,
                confirmButtonColor: "#2563eb"
              });
            } else {
              alert(`Access Denied: You do not have permission to access the "${viewId}" section.`);
            }
            return;
          }
        }
      }

      if (!viewId) viewId = "users-list";

      this.currentView = viewId;

      const adminMod = (this.availableModules || []).find(m => m.id === "adminControlCenter") ||
                       (window.RBAC?.authorizedNavigation || []).find(m => m.id === "adminControlCenter");
      const activeSub = adminMod?.subsections?.find(s => s.tool === viewId || s.id === viewId || s.id.toLowerCase() === viewId.replace(/-/g, "").toLowerCase());
      const sectionGroup = activeSub?.group || "⚙️ Governance";
      const sectionName = activeSub?.name || viewId;

      document.querySelectorAll(".adm-nav-item").forEach(item => {
        item.classList.toggle("active", item.getAttribute("data-view") === viewId);
      });

      document.querySelectorAll(".adm-subview-panel").forEach(panel => {
        panel.classList.toggle("active", panel.id === `admView_${viewId}`);
      });

      const breadcrumbsEl = document.getElementById("admBreadcrumbs");
      if (breadcrumbsEl) {
        if (!this.isAdmin()) {
          breadcrumbsEl.innerHTML = `
            <span class="adm-breadcrumb-item">🛠️ Tools</span>
            <span class="adm-breadcrumb-sep">&gt;</span>
            <span class="adm-breadcrumb-item active">${sectionName}</span>
          `;
        } else {
          breadcrumbsEl.innerHTML = `
            <span class="adm-breadcrumb-item">⚙️ Admin Control Center</span>
            <span class="adm-breadcrumb-sep">&gt;</span>
            <span class="adm-breadcrumb-item">${sectionGroup}</span>
            <span class="adm-breadcrumb-sep">&gt;</span>
            <span class="adm-breadcrumb-item active">${sectionName}</span>
          `;
        }
      }

      // 4. Auto-collapse mobile drawer
      const sidebar = document.getElementById("admSidebar");
      if (sidebar) sidebar.classList.remove("mobile-open");

      // 5. Trigger view-specific data loading
      if (viewId === "users-list") this.loadUsers();
      else if (viewId === "roles-config") this.renderRolesConfigCards();
      else if (viewId === "permission-matrix") this.loadPermissionMatrix();
      else if (viewId === "access-control") this.renderAccessControlTable();
      else if (viewId === "app-hub") this.updateAppHubBadges();
      else if (viewId === "app-cracking") { if (typeof window.showCrackingMechanismTab === "function") window.showCrackingMechanismTab(); }
      else if (viewId === "app-damage") { if (typeof window.showCrackingMechanismTab === "function") window.showCrackingMechanismTab(); else this.loadDamageMechanisms(); }
      else if (viewId === "app-stream") this.loadStreamDatasetsAdmin();
      else if (viewId === "app-stress") this.loadStressManagerAdmin();
      else if (viewId === "sys-firestore") this.loadFirestoreCollection(this.selectedCollection);
      else if (viewId === "sys-diagnostics") this.runCloudDiagnostics();
      else if (viewId === "sys-projects") this.loadProjectsList();
      else if (viewId === "sys-sessions") this.loadSessions();
      else if (viewId === "sys-logs") this.loadSystemLogs();
      else if (viewId.startsWith("layout-")) {
        if (!this.layoutConfig) {
          this.loadLayoutConfig();
        } else {
          this.renderLayoutBuilderControls();
        }
      }
      else if (viewId === "master-overview") this.renderMasterOverview();
      else if (viewId === "master-backup") this.renderMasterBackup();
      else if (viewId === "master-restore") this.renderMasterRestore();
      else if (viewId === "master-history") this.loadBackupHistory();
      else if (viewId === "master-audit") this.loadAuditTrail();
    },

    toggleNavGroup(groupId) {
      const group = document.getElementById(groupId);
      if (group) group.classList.toggle("collapsed");
    },

    toggleMobileNav() {
      const sidebar = document.getElementById("admSidebar");
      if (sidebar) sidebar.classList.toggle("mobile-open");
    },

    returnToDashboard() {
      document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");
      document.body.classList.remove("adm-windowed-mode");
      const adminTab = document.getElementById("adminPanelTab");
      if (adminTab) {
        adminTab.classList.remove("non-admin-tool-mode");
        adminTab.style.display = "none";
      }
      document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
      if (typeof hideAllMainPanels === "function") hideAllMainPanels();
      if (typeof window.showWelcomePanel === "function") {
        window.showWelcomePanel();
      } else {
        const welcome = document.getElementById("welcomePanel");
        if (welcome) {
          welcome.classList.remove("is-hidden");
          welcome.style.removeProperty("display");
          welcome.style.display = "flex";
        }
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },

    toggleFullscreen() {
      const isWindowed = document.body.classList.toggle("adm-windowed-mode");
      const btn = document.getElementById("admFullscreenToggleBtn");
      if (isWindowed) {
        if (btn) btn.innerHTML = "⛶ Fullscreen";
        this.showToast("Switched to Standard / Windowed Layout", "info");
      } else {
        if (btn) btn.innerHTML = "🗗 Windowed";
        this.showToast("Switched to 100% Full-Screen Desktop Console", "success");
      }
    },

    showToast(message, type = "info") {
      const container = document.getElementById("admToastContainer");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = `adm-toast ${type}`;
      toast.innerHTML = `
        <span>${message}</span>
        <button type="button" style="background:none; border:none; color:#ffffff; cursor:pointer; font-size:14px; opacity:0.8;" onclick="this.parentElement.remove()">✕</button>
      `;
      container.appendChild(toast);
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 4000);
    },

    confirmAction(title, message, onConfirm) {
      const modal = document.getElementById("admUniversalConfirmModal");
      if (!modal) {
        if (confirm(`${title}\n\n${message}`)) {
          if (typeof onConfirm === "function") onConfirm();
        }
        return;
      }
      const titleEl = document.getElementById("admConfirmTitle");
      const msgEl = document.getElementById("admConfirmMessage");
      const execBtn = document.getElementById("admConfirmExecuteBtn");
      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (execBtn) {
        execBtn.onclick = () => {
          modal.style.display = "none";
          if (typeof onConfirm === "function") onConfirm();
        };
      }
      modal.style.display = "flex";
    },

    closeConfirmModal() {
      const modal = document.getElementById("admUniversalConfirmModal");
      if (modal) modal.style.display = "none";
    },

    switchSubTab(tabName) {
      const map = {
        users: "users-list",
        damageMechanisms: "app-damage",
        sessions: "sys-sessions",
        firestore: "sys-firestore",
        backup: "master-backup"
      };
      this.navigateTo(map[tabName] || tabName);
    },

    // -------------------------------------------------------------
    // 👥 USERS MANAGEMENT
    // -------------------------------------------------------------
    async loadUsers() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admUsersTableBody");
      if (tbody && (!this.users || this.users.length === 0)) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">Loading user profiles...</td></tr>`;
      }

      const data = await this.safeFetch(`/api/admin?action=get_users&callerEmail=${encodeURIComponent(callerEmail)}`);
      if (data && data.success && data.users) {
        this.users = data.users || [];
        this.availableModules = data.availableModules || [];
        /* in-memory only: this.users */
        this.renderUsersTable();
      } else {
        // Fallback to local cached users or default seed users
        let fallbackUsers = [];
        try {
          const cached = (this.users && this.users.length) ? JSON.stringify(this.users) : null;
          if (cached) fallbackUsers = JSON.parse(cached);
        } catch (e) {}

        if (!fallbackUsers || fallbackUsers.length === 0) {
          const currentEmail = getSuperAdminEmail();
          fallbackUsers = [
            {
              id: currentEmail || "user_admin",
              email: currentEmail || "admin@system.internal",
              role: "admin",
              isSuperAdmin: true,
              hasAuthAccount: true,
              updatedAt: Date.now()
            }
          ];
        }
        this.users = fallbackUsers;
        this.renderUsersTable();
      }
    },

    getUserAllowedModulesCount(user) {
      if (!user) return 0;
      const isSuper = !!user.isSuperAdmin || user.role === "admin";
      const totalMods = (this.availableModules && this.availableModules.length > 0) ? this.availableModules.length : 13;
      if (isSuper) return totalMods;

      let count = 0;
      const mods = user.allowedModules || {};
      const subs = user.subsections || {};
      const role = user.role || "lead_engineer";

      const moduleList = (this.availableModules && this.availableModules.length > 0) ? this.availableModules : getInitialAvailableModules();

      moduleList.forEach(mod => {
        let isAllowed = false;
        if (typeof mods[mod.id] === "boolean") {
          isAllowed = mods[mod.id];
        } else if (mod.id === "api570" && typeof mods.remainingLife === "boolean") {
          isAllowed = mods.remainingLife;
        } else if (this.roleMatrixState && this.roleMatrixState[role] && typeof this.roleMatrixState[role][mod.id] === "boolean") {
          isAllowed = this.roleMatrixState[role][mod.id];
        } else if (role === "admin" || role === "lead_engineer" || role === "engineer") {
          isAllowed = mod.id !== "adminControlCenter";
        } else if (role === "inspector") {
          const inspMods = ["damageExplorer", "api581", "api570", "thicknessCalc", "crackingMechanism", "bkStress", "chemicalSuite", "unitConverter", "processFlow"];
          isAllowed = inspMods.includes(mod.id);
        } else if (role === "viewer") {
          const viewMods = ["damageExplorer", "api581", "api570", "processFlow", "unitConverter"];
          isAllowed = viewMods.includes(mod.id);
        }

        // Check if any subsection under this module is active
        if (!isAllowed && subs[mod.id] && typeof subs[mod.id] === "object") {
          if (Object.values(subs[mod.id]).some(Boolean)) {
            isAllowed = true;
          }
        }
        if (isAllowed) count++;
      });

      return Math.min(count, totalMods);
    },

    renderUsersTable() {
      const tbody = document.getElementById("admUsersTableBody");
      if (!tbody) return;

      const q = this.searchQuery.toLowerCase().trim();
      const filtered = this.users.filter(u => {
        if (!q) return true;
        return (u.email && u.email.toLowerCase().includes(q)) || (u.role && u.role.toLowerCase().includes(q));
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">No users found matching query "${this.searchQuery}".</td></tr>`;
        return;
      }

      const roleLabels = {
        admin: "👑 Admin",
        lead_engineer: "⚙️ Lead Engineer",
        inspector: "🔍 Inspector",
        viewer: "👁️ Viewer",
        custom: "🛠️ Custom Role"
      };

      let html = "";
      filtered.forEach((user, idx) => {
        const isSuper = !!user.isSuperAdmin || user.role === "admin";
        const totalMods = (this.availableModules && this.availableModules.length > 0) ? this.availableModules.length : 13;
        const activeModsCount = this.getUserAllowedModulesCount(user);

        const dateStr = user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() + " " + new Date(user.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Initial";

        const authStatusBadge = user.hasAuthAccount
          ? `<span style="font-size: 10px; color: #4ade80; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); padding: 1px 6px; border-radius: 4px; font-weight: 500;">🟢 Auth Ready</span>`
          : `<span style="font-size: 10px; color: #f59e0b; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); padding: 1px 6px; border-radius: 4px; font-weight: 500;">⚠️ Needs Password</span>`;

        html += `
          <tr class="adm-user-row" id="user_row_${idx}">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="adm-user-avatar">${(user.email || "U").charAt(0).toUpperCase()}</div>
                <div>
                  <div class="adm-user-email-text" style="font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${user.email}
                    ${isSuper ? '<span class="adm-badge-super">SUPER ADMIN</span>' : ''}
                    ${authStatusBadge}
                  </div>
                  <div style="font-size: 11px; color: #94a3b8;">Updated: ${dateStr}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="user-role-badge role-${user.role || 'lead_engineer'}">
                ${roleLabels[user.role] || user.role}
              </span>
            </td>
            <td>
              <span class="adm-mod-count-text" style="font-size: 13px; font-weight: 500;">
                ${activeModsCount} / ${totalMods} modules
              </span>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button class="adm-btn adm-btn-sm adm-btn-primary" onclick="window.adminPanel.toggleEditUserPermissions('${user.email}')" title="Configure granular access">
                  ✏️ Edit Access
                </button>
                <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.openPasswordModal('${user.email}')" title="Set/Reset Password & Generate Reset Link">
                  🔑 Password
                </button>
                ${!isSuper ? `
                  <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.promptDeleteUser('${user.email}')" title="Revoke & Delete User">
                    🗑️
                  </button>
                ` : `
                  <span style="font-size: 11px; color: #64748b; padding: 4px;">Protected</span>
                `}
              </div>
            </td>
          </tr>
          <tr id="perm_editor_row_${this.getSafeId(user.email)}" class="adm-inline-editor-row" style="display: none;">
            <td colspan="5" style="padding: 0;">
              <div class="adm-inline-editor-card" id="perm_editor_card_${this.getSafeId(user.email)}">
                <!-- Granular editor injected dynamically -->
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    toggleEditUserPermissions(email) {
      const user = this.users.find(u => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (!user) return;

      const safeId = this.getSafeId(email);
      const editorRow = document.getElementById(`perm_editor_row_${safeId}`);
      if (!editorRow) return;

      if (editorRow.style.display === "table-row") {
        editorRow.style.display = "none";
        this.editingUserEmail = null;
        this._isSavingUserPermissions = false;
        return;
      }

      // Hide all other inline editors
      document.querySelectorAll(".adm-inline-editor-row").forEach(r => r.style.display = "none");
      editorRow.style.display = "table-row";
      this.editingUserEmail = email;
      this._isSavingUserPermissions = false;

      const card = document.getElementById(`perm_editor_card_${safeId}`);
      if (card) {
        card.innerHTML = this.renderGranularPermissionsForm(user);
        const saveBtn = document.getElementById(`admSaveUserBtn_${safeId}`);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.onclick = (e) => {
            console.log("[AdminPanel] Click handler fired for Save Configured Permissions button");
            window.adminPanel.saveUserPermissions(user.email, e);
          };
        }
      }
    },

    renderGranularPermissionsForm(user) {
      const email = user.email;
      const safeId = this.getSafeId(email);
      const currentRole = user.role || "lead_engineer";
      const currentMods = user.allowedModules || {};
      const currentSubs = user.subsections || {};

      let html = `
        <div class="adm-inline-editor-card-content" id="perm_editor_inner_${safeId}" style="padding: 16px; border-radius: 8px; margin: 8px 12px 16px 12px; max-height: 85vh; overflow-y: auto; -webkit-overflow-scrolling: touch;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 class="adm-editor-title" style="margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>🛡️ Configure Permissions for:</span>
                <span style="color: #2563eb; font-family: monospace;">${email}</span>
                <span id="admModCounter_${safeId}" class="adm-pill" style="font-size: 11px; background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3); padding: 2px 8px; border-radius: 9999px;">
                  Active Modules: calculating...
                </span>
              </h4>
              <p class="adm-card-subtitle" style="margin: 4px 0 0 0; font-size: 12px;">
                Select a standard role preset or choose "Custom Role" to toggle individual modules and sub-sections.
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label class="adm-card-subtitle" style="font-size: 13px; font-weight: 600;">Role Preset:</label>
              <select id="admEditRole_${safeId}" class="adm-select" onchange="window.adminPanel.onInlineRoleChanged('${email}', this.value)">
                <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>👑 Admin (Full Access)</option>
                <option value="lead_engineer" ${currentRole === 'lead_engineer' ? 'selected' : ''}>⚙️ Lead Engineer</option>
                <option value="inspector" ${currentRole === 'inspector' ? 'selected' : ''}>🔍 Inspector</option>
                <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>👁️ Viewer</option>
                <option value="custom" ${currentRole === 'custom' ? 'selected' : ''}>🛠️ Custom Role (Granular)</option>
              </select>
              <div id="admCustomActions_${safeId}" style="display: flex; gap: 6px;">
                <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.selectAllModules('${email}', true)">
                  ✅ Select All
                </button>
                <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.selectAllModules('${email}', false)">
                  ❌ Deselect All
                </button>
              </div>
            </div>
          </div>

          <div id="admModulesGrid_${safeId}" class="rbac-modules-grid" style="margin-top: 10px; max-height: 55vh; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-right: 6px;">
            ${this.buildModuleCheckboxes(user, currentRole, currentMods, currentSubs)}
          </div>

          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #334155; flex-wrap: wrap;">
            <span id="admSaveStatus_${safeId}" style="display: none; font-size: 13px; font-weight: 500; margin-right: auto;"></span>
            <button type="button" class="adm-btn adm-btn-secondary" onclick="window.adminPanel.toggleEditUserPermissions('${email}')">
              Cancel
            </button>
            <button id="admSaveUserBtn_${safeId}" type="button" class="adm-btn adm-btn-primary adm-btn-save-permissions" onclick="window.adminPanel.saveUserPermissions('${email}', event)" data-target-email="${email}">
              💾 Save Configured Permissions
            </button>
          </div>
        </div>
      `;
      setTimeout(() => {
        this.updateModuleCounter(email);
        const stressParent = document.getElementById(`admSub_${safeId}_adminControlCenter_appStress`);
        if (stressParent) {
          const stressSubsList = ["stress_tab_year_mgr", "stress_tab_bulk_loader", "stress_action_add", "stress_action_export", "stress_action_delete"];
          const gridEl = document.getElementById(`admModulesGrid_${safeId}`);
          if (gridEl) {
            const childInps = stressSubsList.map(id => gridEl.querySelector(`input[data-sub="${id}"]`)).filter(Boolean);
            const checkedCount = childInps.filter(inp => inp.checked).length;
            if (checkedCount > 0 && checkedCount < childInps.length) {
              stressParent.checked = true;
              stressParent.indeterminate = true;
            } else if (checkedCount === 0) {
              stressParent.checked = false;
              stressParent.indeterminate = false;
            } else {
              stressParent.checked = true;
              stressParent.indeterminate = false;
            }
          }
        }
      }, 50);
      return html;
    },

    buildModuleCheckboxes(user, role, currentMods, currentSubs) {
      const email = user.email;
      const safeId = this.getSafeId(email);
      const isPresetAdmin = role === "admin";
      const disabledAttr = isPresetAdmin ? "disabled" : "";

      let html = "";
      this.availableModules.forEach(mod => {
        let modChecked = false;
        if (currentMods && typeof currentMods[mod.id] === "boolean") {
          modChecked = currentMods[mod.id];
        } else if (role === "admin" || role === "lead_engineer" || role === "engineer") {
          modChecked = mod.id !== "adminControlCenter";
        } else if (role === "inspector") {
          const inspMods = ["damageExplorer", "api581", "api570", "thicknessCalc", "crackingMechanism", "bkStress", "chemicalSuite", "unitConverter", "processFlow"];
          modChecked = inspMods.includes(mod.id);
        } else if (role === "viewer") {
          const viewMods = ["damageExplorer", "api581", "api570", "processFlow", "unitConverter"];
          modChecked = viewMods.includes(mod.id);
        } else {
          modChecked = false;
        }

        const subCount = mod.subsections ? mod.subsections.length : 0;
        const subCountBadge = subCount > 0 ? `${subCount} Sub-tabs` : "Direct Tab";

        html += `
          <div class="rbac-module-card" id="mod_card_${safeId}_${mod.id}" style="${!modChecked ? 'opacity: 0.65;' : 'opacity: 1;'} border-radius: 8px; padding: 12px; margin-bottom: 12px; transition: opacity 0.2s ease; width: 100%; box-sizing: border-box; overflow: hidden;">
            <div class="rbac-module-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; margin-bottom: 10px;">
              <label class="rbac-checkbox-label" style="cursor: pointer; display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 14px; color: #0f172a; margin: 0;">
                <input type="checkbox" id="admMod_${safeId}_${mod.id}" data-mod="${mod.id}" ${modChecked ? "checked" : ""} ${disabledAttr} onchange="window.adminPanel.onModuleParentCheckChanged('${email}', '${mod.id}', this.checked)" style="width: 17px; height: 17px; cursor: pointer;">
                <span>${mod.icon || "📂"} ${mod.name}</span>
              </label>
              <span class="rbac-category-tag" style="font-size: 11px; background: rgba(59, 130, 246, 0.1); color: #2563eb; padding: 3px 8px; border-radius: 12px; font-weight: 600; border: 1px solid rgba(59, 130, 246, 0.2);">
                ${subCountBadge}
              </span>
            </div>
        `;

        if (mod.subsections && mod.subsections.length > 0) {
          if (mod.id === "adminControlCenter") {
            const groups = {};
            mod.subsections.forEach(sub => {
              const grp = sub.group || "OTHER";
              if (!groups[grp]) groups[grp] = [];
              groups[grp].push(sub);
            });

            html += `<div class="rbac-subsections-grouped" style="display: flex; flex-direction: column; gap: 10px; padding: 10px 12px; border-radius: 6px;">`;
            Object.keys(groups).forEach(grpName => {
              const subList = groups[grpName];
              html += `
                <div class="rbac-sub-group" style="border-radius: 6px; padding: 8px 10px;">
                  <div class="rbac-sub-group-header" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; padding: 3px 6px; border-radius: 4px; border-left: 3px solid #3b82f6;">
                    📂 ${grpName}
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;">
              `;
              subList.forEach(sub => {
                let subChecked = true;
                if (currentSubs && currentSubs[mod.id] && typeof currentSubs[mod.id][sub.id] === "boolean") {
                  subChecked = currentSubs[mod.id][sub.id];
                } else if (currentSubs && currentSubs[mod.id] && typeof currentSubs[mod.id][sub.id.toLowerCase()] === "boolean") {
                  subChecked = currentSubs[mod.id][sub.id.toLowerCase()];
                } else if (role === "inspector" && mod.id === "remainingLife" && sub.id === "bulkUpload") {
                  subChecked = false;
                } else {
                  subChecked = modChecked;
                }

                if (sub.id === "appStress") {
                  const stressSubs = [
                    { id: "stress_tab_year_mgr", name: "⚙️ Year & DB Manager Tab" },
                    { id: "stress_tab_bulk_loader", name: "📤 Bulk Stress DataLoader Tab" },
                    { id: "stress_action_add", name: "➕ Add Code Edition Year" },
                    { id: "stress_action_export", name: "📊 Export to Excel (.xlsx)" },
                    { id: "stress_action_delete", name: "🗑️ Delete Year & Data Records" }
                  ];

                  const hasAnyStressSubSaved = stressSubs.some(s => currentSubs[mod.id] && currentSubs[mod.id][s.id] !== undefined);
                  let parentChecked = subChecked;
                  let parentIndeterminate = false;

                  if (hasAnyStressSubSaved) {
                    const checkedCount = stressSubs.filter(s => currentSubs[mod.id] && currentSubs[mod.id][s.id] === true).length;
                    if (checkedCount === stressSubs.length) {
                      parentChecked = true;
                      parentIndeterminate = false;
                    } else if (checkedCount === 0) {
                      parentChecked = false;
                      parentIndeterminate = false;
                    } else {
                      parentChecked = true;
                      parentIndeterminate = true;
                    }
                  }

                  html += `
                    <div style="grid-column: 1 / -1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #ffffff; margin-top: 4px;">
                      <label class="rbac-sub-label" style="cursor: pointer; display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                        <input type="checkbox" id="admSub_${safeId}_${mod.id}_appStress" data-parent="${mod.id}" data-sub="appStress" ${parentChecked ? "checked" : ""} ${disabledAttr} onchange="window.adminPanel.onSubCheckChanged('${email}', '${mod.id}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
                        <span>🧮 Allowable Stress Manager (Parent)</span>
                      </label>
                      <div style="padding-left: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px; border-left: 2px solid #3b82f6; margin-left: 8px;">
                  `;

                  stressSubs.forEach(stSub => {
                    let stChecked = true;
                    if (currentSubs && currentSubs[mod.id] && typeof currentSubs[mod.id][stSub.id] === "boolean") {
                      stChecked = currentSubs[mod.id][stSub.id];
                    } else if (hasAnyStressSubSaved) {
                      stChecked = false;
                    } else {
                      stChecked = subChecked;
                    }
                    html += `
                      <label class="rbac-sub-label" style="cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11.5px; margin: 0; padding: 3px 6px; border-radius: 4px;">
                        <input type="checkbox" id="admSub_${safeId}_${mod.id}_${stSub.id}" data-parent="${mod.id}" data-sub="${stSub.id}" ${stChecked ? "checked" : ""} ${disabledAttr} onchange="window.adminPanel.onSubCheckChanged('${email}', '${mod.id}', this.checked)" style="width: 14px; height: 14px; cursor: pointer;">
                        <span style="font-weight: 500;">${stSub.name}</span>
                      </label>
                    `;
                  });

                  html += `</div></div>`;
                } else {
                  html += `
                    <label class="rbac-sub-label" style="cursor: pointer; display: flex; align-items: center; gap: 7px; font-size: 12px; margin: 0; padding: 4px 6px; border-radius: 4px;">
                      <input type="checkbox" id="admSub_${safeId}_${mod.id}_${sub.id}" data-parent="${mod.id}" data-sub="${sub.id}" ${subChecked ? "checked" : ""} ${disabledAttr} onchange="window.adminPanel.onSubCheckChanged('${email}', '${mod.id}', this.checked)" style="width: 15px; height: 15px; cursor: pointer;">
                      <span style="font-weight: 500;">${sub.name}</span>
                    </label>
                  `;
                }
              });
              html += `</div></div>`;
            });
            html += `</div>`;
          } else {
            html += `<div class="rbac-subsections-list" style="display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 6px; width: 100%; box-sizing: border-box; overflow: hidden;">`;
            mod.subsections.forEach(sub => {
              let subChecked = true;
              if (currentSubs && currentSubs[mod.id] && typeof currentSubs[mod.id][sub.id] === "boolean") {
                subChecked = currentSubs[mod.id][sub.id];
              } else if (role === "inspector" && mod.id === "remainingLife" && sub.id === "bulkUpload") {
                subChecked = false;
              } else if (role === "viewer") {
                if (mod.id === "api581") {
                  subChecked = ["api571Criteria", "fluidSelector", "inspectionConfidence"].includes(sub.id);
                } else {
                  subChecked = modChecked;
                }
              } else {
                subChecked = modChecked;
              }

              html += `
                <label class="rbac-sub-label" style="cursor: pointer; display: flex; align-items: flex-start; gap: 7px; font-size: 12px; margin: 0; padding: 6px 8px; border-radius: 5px; width: 100%; box-sizing: border-box; word-break: break-word; overflow: hidden;">
                  <input type="checkbox" id="admSub_${safeId}_${mod.id}_${sub.id}" data-parent="${mod.id}" data-sub="${sub.id}" ${subChecked ? "checked" : ""} ${disabledAttr} onchange="window.adminPanel.onSubCheckChanged('${email}', '${mod.id}', this.checked)" style="width: 15px; height: 15px; flex-shrink: 0; margin-top: 2px; cursor: pointer;">
                  <span style="font-weight: 500; word-break: break-word; overflow-wrap: anywhere; line-height: 1.35; flex: 1; min-width: 0;">${sub.name}</span>
                </label>
              `;
            });
            html += `</div>`;
          }
        }

        html += `</div>`;
      });
      return html;
    },

    onInlineRoleChanged(email, newRole) {
      const user = this.users.find(u => u.email === email);
      if (!user) return;
      const safeId = this.getSafeId(email);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);

      if (grid) {
        let activeMods = {};
        let activeSubs = {};

        if (newRole === "admin" || newRole === "lead_engineer" || newRole === "engineer") {
          this.availableModules.forEach(m => {
            const isAdm = newRole === "admin";
            activeMods[m.id] = isAdm ? true : (m.id !== "adminControlCenter");
            if (m.subsections) {
              activeSubs[m.id] = {};
              m.subsections.forEach(s => activeSubs[m.id][s.id] = isAdm ? true : (m.id !== "adminControlCenter"));
            }
          });
        } else if (newRole === "inspector") {
          const inspMods = ["damageExplorer", "api581", "api570", "thicknessCalc", "crackingMechanism", "bkStress", "chemicalSuite", "unitConverter", "processFlow"];
          this.availableModules.forEach(m => {
            const isInsp = inspMods.includes(m.id);
            activeMods[m.id] = isInsp;
            if (m.subsections) {
              activeSubs[m.id] = {};
              m.subsections.forEach(s => {
                activeSubs[m.id][s.id] = isInsp;
              });
            }
          });
        } else if (newRole === "viewer") {
          const viewMods = ["damageExplorer", "api581", "api570", "processFlow", "unitConverter"];
          this.availableModules.forEach(m => {
            const isView = viewMods.includes(m.id);
            activeMods[m.id] = isView;
            if (m.subsections) {
              activeSubs[m.id] = {};
              m.subsections.forEach(s => {
                if (m.id === "api581") {
                  activeSubs[m.id][s.id] = ["api571Criteria", "fluidSelector", "inspectionConfidence"].includes(s.id);
                } else {
                  activeSubs[m.id][s.id] = isView;
                }
              });
            }
          });
        } else {
          // Custom: preserve existing user allowedModules or default to current
          activeMods = user.allowedModules || {};
          activeSubs = user.subsections || {};
        }

        grid.innerHTML = this.buildModuleCheckboxes(user, newRole, activeMods, activeSubs);
        this.updateModuleCounter(email);
      }
    },

    onModuleParentCheckChanged(email, modId, isChecked) {
      const safeId = this.getSafeId(email);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);
      if (!grid) return;

      // Automatically switch Role Preset dropdown to "custom" on manual modification
      const roleSel = document.getElementById(`admEditRole_${safeId}`);
      if (roleSel && roleSel.value !== "custom") {
        roleSel.value = "custom";
      }

      // Toggle all child subsections
      const subInps = grid.querySelectorAll(`input[data-parent="${modId}"]`);
      subInps.forEach(inp => {
        inp.checked = isChecked;
      });

      const card = document.getElementById(`mod_card_${safeId}_${modId}`);
      if (card) {
        card.style.opacity = isChecked ? "1" : "0.65";
      }

      this.updateModuleCounter(email);
    },

    onSubCheckChanged(email, parentModId, isChecked) {
      const safeId = this.getSafeId(email);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);
      if (!grid) return;

      // Automatically switch Role Preset dropdown to "custom" on manual modification
      const roleSel = document.getElementById(`admEditRole_${safeId}`);
      if (roleSel && roleSel.value !== "custom") {
        roleSel.value = "custom";
      }

      // Check if Allowable Stress Parent was toggled
      const stressParentInp = document.getElementById(`admSub_${safeId}_adminControlCenter_appStress`);
      if (stressParentInp && event && event.target === stressParentInp) {
        const stressSubsList = ["stress_tab_year_mgr", "stress_tab_bulk_loader", "stress_action_add", "stress_action_export", "stress_action_delete"];
        stressSubsList.forEach(subId => {
          const childInp = document.getElementById(`admSub_${safeId}_adminControlCenter_${subId}`);
          if (childInp) childInp.checked = isChecked;
        });
        stressParentInp.indeterminate = false;
      } else if (stressParentInp) {
        const stressSubsList = ["stress_tab_year_mgr", "stress_tab_bulk_loader", "stress_action_add", "stress_action_export", "stress_action_delete"];
        const childInps = stressSubsList.map(id => document.getElementById(`admSub_${safeId}_adminControlCenter_${id}`)).filter(Boolean);
        const checkedCount = childInps.filter(inp => inp.checked).length;
        if (checkedCount === 0) {
          stressParentInp.checked = false;
          stressParentInp.indeterminate = false;
        } else if (checkedCount === childInps.length) {
          stressParentInp.checked = true;
          stressParentInp.indeterminate = false;
        } else {
          stressParentInp.checked = true;
          stressParentInp.indeterminate = true;
        }
      }

      // If a sub is checked, auto-check parent module
      if (isChecked) {
        const parentInp = grid.querySelector(`input[data-mod="${parentModId}"]`);
        if (parentInp && !parentInp.checked) {
          parentInp.checked = true;
          const card = document.getElementById(`mod_card_${safeId}_${parentModId}`);
          if (card) card.style.opacity = "1";
        }
      } else {
        // If ALL subs are unchecked, uncheck parent module
        const allSubs = grid.querySelectorAll(`input[data-parent="${parentModId}"]`);
        const anyChecked = Array.from(allSubs).some(inp => inp.checked);
        if (!anyChecked) {
          const parentInp = grid.querySelector(`input[data-mod="${parentModId}"]`);
          if (parentInp && parentInp.checked) {
            parentInp.checked = false;
            const card = document.getElementById(`mod_card_${safeId}_${parentModId}`);
            if (card) card.style.opacity = "0.65";
          }
        }
      }

      this.updateModuleCounter(email);
    },

    selectAllModules(email, shouldSelect) {
      const safeId = this.getSafeId(email);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);
      if (!grid) return;

      const roleSel = document.getElementById(`admEditRole_${safeId}`);
      if (roleSel && roleSel.value !== "custom") {
        roleSel.value = "custom";
      }

      const allInputs = grid.querySelectorAll("input[type='checkbox']");
      allInputs.forEach(inp => {
        inp.checked = shouldSelect;
      });

      this.availableModules.forEach(mod => {
        const card = document.getElementById(`mod_card_${safeId}_${mod.id}`);
        if (card) {
          card.style.opacity = shouldSelect ? "1" : "0.65";
        }
      });

      this.updateModuleCounter(email);
    },

    updateModuleCounter(email) {
      const safeId = this.getSafeId(email);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);
      const counter = document.getElementById(`admModCounter_${safeId}`);
      if (!grid || !counter) return;

      const modInputs = grid.querySelectorAll("input[data-mod]");
      let activeCount = 0;
      modInputs.forEach(inp => {
        if (inp.checked) activeCount++;
      });
      const totalCount = modInputs.length || (this.availableModules && this.availableModules.length > 0 ? this.availableModules.length : 13);
      counter.textContent = `Active Modules: ${activeCount} / ${totalCount}`;
    },

    async saveUserPermissions(email, event) {
      let evt = event;
      let targetEmail = (typeof email === "string" && email.trim()) ? email.trim() : "";

      if (!targetEmail && email && typeof email === "object") {
        evt = email;
      }

      if (evt) {
        try {
          if (typeof evt.preventDefault === "function") evt.preventDefault();
          if (typeof evt.stopPropagation === "function") evt.stopPropagation();
        } catch (e) {}
      }

      // If targetEmail wasn't passed as a string, attempt extraction from event target or active state
      if (!targetEmail && evt && evt.target) {
        const btnEl = evt.target.closest ? evt.target.closest("[data-target-email]") : null;
        targetEmail = (btnEl && btnEl.getAttribute("data-target-email")) || evt.target.getAttribute?.("data-target-email") || "";
      }

      if (!targetEmail && this.editingUserEmail) {
        targetEmail = this.editingUserEmail;
      }

      if (!targetEmail) {
        const openEditor = document.querySelector(".adm-inline-editor-row[style*='table-row'] [data-target-email]");
        if (openEditor) {
          targetEmail = openEditor.getAttribute("data-target-email") || "";
        }
      }

      console.log("[AdminPanel] saveUserPermissions invoked for target user:", targetEmail ? "resolved" : "missing");

      if (this._isSavingUserPermissions) {
        console.warn("[AdminPanel] saveUserPermissions already in flight, ignoring duplicate click");
        return;
      }

      if (!targetEmail) {
        console.error("[AdminPanel] Target user email is missing or empty for permissions save");
        this.showToast("Target user email is missing. Please re-open the permissions editor.", "error");
        return;
      }

      this._isSavingUserPermissions = true;
      const safeId = this.getSafeId(targetEmail);
      console.log("[AdminPanel] Resolved safeId:", safeId);

      const callerEmail = this.getCallerEmail();
      const roleSelect = document.getElementById(`admEditRole_${safeId}`);
      const role = roleSelect ? roleSelect.value : "custom";
      const saveBtn = document.getElementById(`admSaveUserBtn_${safeId}`) || (evt && evt.target && evt.target.closest ? evt.target.closest(".adm-btn-save-permissions") : null);
      const grid = document.getElementById(`admModulesGrid_${safeId}`);
      const statusEl = document.getElementById(`admSaveStatus_${safeId}`);

      if (!grid) {
        this._isSavingUserPermissions = false;
        console.error("[AdminPanel] Unable to find permission editor table grid for safeId:", safeId);
        this.showToast(`Unable to find permission editor table for ${targetEmail}`, "error");
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Saving Permissions...";
      }
      if (statusEl) {
        statusEl.style.display = "inline";
        statusEl.style.color = "#3b82f6";
        statusEl.textContent = "⏳ Persisting permissions to database...";
      }

      // Ensure session is available; if missing, attempt active session recovery
      let currentSessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
      if (!currentSessionId && callerEmail) {
        try {
          const recRes = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "validate", email: callerEmail })
          });
          const recData = await recRes.json().catch(() => ({}));
          if (recData && recData.valid && recData.session && recData.session.sessionId) {
            currentSessionId = recData.session.sessionId;
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("sessionId", currentSessionId);
            if (recData.session.uid && typeof sessionStorage !== "undefined") sessionStorage.setItem("userUid", recData.session.uid);
          }
        } catch (recErr) {}
      }

      try {
        const allowedModules = {};
        const subsections = {};

        // 1. First record exact state of parent module checkboxes
        const modInputs = grid.querySelectorAll("input[data-mod]");
        modInputs.forEach(inp => {
          const modId = inp.getAttribute("data-mod");
          if (modId) {
            allowedModules[modId] = !!inp.checked;
            if (!subsections[modId]) subsections[modId] = {};
          }
        });

        // 2. Record subsections, strictly respecting parent module state
        const subInputs = grid.querySelectorAll("input[data-sub]");
        subInputs.forEach(inp => {
          const p = inp.getAttribute("data-parent");
          const s = inp.getAttribute("data-sub");
          if (p && s) {
            if (!subsections[p]) subsections[p] = {};
            if (allowedModules[p] === false) {
              subsections[p][s] = false;
            } else {
              subsections[p][s] = !!inp.checked;
            }
          }
        });

        const activeModuleCount = Object.values(allowedModules).filter(Boolean).length;
        console.log("[AdminPanel] saveUserPermissions gathered active modules:", activeModuleCount);

        console.log("[AdminPanel] Dispatching POST /api/admin action=save_user");
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_user",
            callerEmail,
            targetEmail,
            role,
            allowedModules,
            subsections
          })
        });

        console.log("[AdminPanel] Server response status:", res.status);
        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          const errMsg = data.error || "Authentication required. Please provide a valid Firebase ID token or active server session.";
          if (statusEl) {
            statusEl.style.display = "inline";
            statusEl.style.color = "#dc2626";
            statusEl.textContent = `❌ ${errMsg}`;
          }
          this.showToast(errMsg, "error");
          if (typeof Swal !== "undefined") {
            Swal.fire({
              icon: "error",
              title: "Authentication Required",
              text: "Your session has expired. Please log in again to save user permissions.",
              confirmButtonText: "Sign In",
              confirmButtonColor: "#2563eb"
            }).then(() => {
              window.location.href = "index.html";
            });
          }
          throw new Error(errMsg);
        }

        if (!res.ok) throw new Error(data.error || "Failed to save user permissions");

        // Immediately update local user in cache
        const localUser = this.users.find(u => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
        if (localUser) {
          localUser.role = data.user?.role || role;
          localUser.allowedModules = data.user?.allowedModules || allowedModules;
          localUser.subsections = data.user?.subsections || subsections;
          localUser.updatedAt = data.user?.updatedAt || Date.now();
        }
        /* in-memory only: this.users */

        const activeCount = this.getUserAllowedModulesCount(localUser || { email, role, allowedModules, subsections });
        const totalCount = (this.availableModules && this.availableModules.length > 0) ? this.availableModules.length : 13;
        const roleLabel = (role || "").toUpperCase();
        const msg = `User role ${roleLabel} & permissions saved successfully! (${activeCount} / ${totalCount} modules active for ${email})`;

        if (statusEl) {
          statusEl.style.display = "inline";
          statusEl.style.color = "#16a34a";
          statusEl.textContent = `✅ Permissions saved successfully (${activeCount} / ${totalCount} modules active)`;
        }

        this.showToast(msg, "success");

        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "success",
            title: "Permissions Saved!",
            text: msg,
            timer: 2000,
            showConfirmButton: false
          });
        }

        // Close editor & refresh users immediately in UI table
        setTimeout(() => {
          this.toggleEditUserPermissions(targetEmail);
          this.renderUsersTable();
        }, 500);

        await this.loadUsers();
        await this.loadOverview();

        // Broadcast permission change event across all open browser tabs & sessions
        if (window.RBAC && typeof window.RBAC.broadcastUpdate === "function") {
          window.RBAC.broadcastUpdate(targetEmail);
        }

        // If updated self, refresh RBAC
        if (targetEmail.toLowerCase() === callerEmail.toLowerCase()) {
          try {
            if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_rbac_permissions", JSON.stringify({
              email: callerEmail,
              role: data.user?.role || role,
              isSuperAdmin: (data.user?.role === "admin") || !!data.user?.isSuperAdmin,
              allowedModules: data.user?.allowedModules || allowedModules,
              subsections: data.user?.subsections || subsections,
              availableModules: this.availableModules,
              syncedAt: Date.now()
            }));
          } catch (e) {}
          if (window.RBAC && typeof window.RBAC.init === "function") {
            await window.RBAC.init();
          }
        }
      } catch (err) {
        console.error("[AdminPanel] Error saving permissions:", err);
        if (statusEl) {
          statusEl.style.display = "inline";
          statusEl.style.color = "#dc2626";
          statusEl.textContent = `❌ Save failed: ${err.message}`;
        }
        this.showToast(`Error saving permissions: ${err.message}`, "error");
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Save Failed",
            text: err.message,
            confirmButtonColor: "#2563eb"
          });
        }
      } finally {
        this._isSavingUserPermissions = false;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Save Configured Permissions";
        }
      }
    },

    openAddUserModal() {
      const modal = document.getElementById("admAddUserModal");
      if (modal) modal.style.display = "flex";
      const input = document.getElementById("admNewUserEmail");
      if (input) {
        input.value = "";
        input.focus();
      }
      this.generateRandomPasswordForNewUser();
    },

    generateRandomPasswordForNewUser() {
      const pass = "Kayet@" + Math.floor(1000 + Math.random() * 9000);
      const input = document.getElementById("admNewUserPassword");
      if (input) input.value = pass;
    },

    generateRandomPasswordForReset() {
      const pass = "Kayet@" + Math.floor(1000 + Math.random() * 9000);
      const input = document.getElementById("admNewResetPassword");
      if (input) input.value = pass;
    },

    closeAddUserModal() {
      const modal = document.getElementById("admAddUserModal");
      if (modal) modal.style.display = "none";
    },

    async submitNewUser() {
      const callerEmail = this.getCallerEmail();
      const emailInput = document.getElementById("admNewUserEmail");
      const roleSelect = document.getElementById("admNewUserRole");
      const passInput = document.getElementById("admNewUserPassword");
      const targetEmail = (emailInput?.value || "").toLowerCase().trim();
      const role = roleSelect?.value || "lead_engineer";
      const password = (passInput?.value || "").trim();

      if (!targetEmail || !targetEmail.includes("@")) {
        this.showToast("Please enter a valid email address.", "warning");
        return;
      }

      const submitBtn = document.getElementById("admAddUserSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Provisioning in Firebase...";
      }

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_user",
            callerEmail,
            targetEmail,
            role,
            password
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add user");

        this.closeAddUserModal();

        this.showToast(`User ${targetEmail} provisioned successfully!`, "success");

        // Open credential handover modal
        this.openCredentialsModal({
          email: targetEmail,
          password: data.password || password,
          role: role,
          resetLink: data.resetLink
        });

        await this.loadUsers();
        await this.loadOverview();
      } catch (err) {
        this.showToast(`Error adding user: ${err.message}`, "error");
        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "error",
            title: "Failed to Add User",
            text: err.message,
            confirmButtonColor: "#2563eb"
          });
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Create & Provision User";
        }
      }
    },

    openPasswordModal(email) {
      this.selectedPasswordUser = email;
      const modal = document.getElementById("admPasswordModal");
      const emailElem = document.getElementById("admPasswordUserEmail");
      const passInput = document.getElementById("admNewResetPassword");
      const statusBox = document.getElementById("admPasswordStatusBox");

      if (emailElem) emailElem.textContent = email;
      if (passInput) passInput.value = "Kayet@" + Math.floor(1000 + Math.random() * 9000);
      if (statusBox) statusBox.style.display = "none";
      if (modal) modal.style.display = "flex";
    },

    closePasswordModal() {
      const modal = document.getElementById("admPasswordModal");
      if (modal) modal.style.display = "none";
      this.selectedPasswordUser = null;
    },

    async submitSetPassword() {
      const email = this.selectedPasswordUser;
      if (!email) return;

      const passInput = document.getElementById("admNewResetPassword");
      const password = (passInput?.value || "").trim();
      if (!password || password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      const btn = document.getElementById("admSetPasswordBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Setting...";
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_password",
            callerEmail,
            targetEmail: email,
            password
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to set password");

        const statusBox = document.getElementById("admPasswordStatusBox");
        const statusText = document.getElementById("admPasswordStatusText");
        const copyInput = document.getElementById("admPasswordResultCopyVal");

        if (statusBox && statusText && copyInput) {
          statusBox.style.display = "block";
          statusText.innerHTML = `✅ Password updated in Firebase Auth!`;
          copyInput.value = `Email: ${email} | Password: ${password}`;
        }

        await this.loadUsers();
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "💾 Set New Password";
        }
      }
    },

    async submitGetResetLink() {
      const email = this.selectedPasswordUser;
      if (!email) return;

      const btn = document.getElementById("admGenResetLinkBtn");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Generating...";
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_reset_link",
            callerEmail,
            targetEmail: email
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate reset link");

        const statusBox = document.getElementById("admPasswordStatusBox");
        const statusText = document.getElementById("admPasswordStatusText");
        const copyInput = document.getElementById("admPasswordResultCopyVal");

        if (statusBox && statusText && copyInput) {
          statusBox.style.display = "block";
          if (data.temporaryPassword) {
            statusText.innerHTML = `🔑 Temporary Password (Firebase Link Quota Exceeded):`;
            copyInput.value = data.temporaryPassword;
            if (typeof Swal !== "undefined") {
              Swal.fire({
                icon: "info",
                title: "Temporary Password Generated",
                text: "Firebase limit exceeded for reset links. A secure temporary password was generated and set for this user.",
                confirmButtonColor: "#2563eb"
              });
            }
          } else {
            statusText.innerHTML = `🔗 Firebase Password Reset Link:`;
            copyInput.value = data.resetLink || "";
          }
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "🔗 Get Reset Link";
        }
      }
    },

    copyPasswordResultVal() {
      const input = document.getElementById("admPasswordResultCopyVal");
      if (!input || !input.value) return;
      navigator.clipboard.writeText(input.value).then(() => {
        alert("Copied to clipboard!");
      }).catch(() => {
        input.select();
        document.execCommand("copy");
        alert("Copied to clipboard!");
      });
    },

    openCredentialsModal(data) {
      const modal = document.getElementById("admCredentialsResultModal");
      const urlElem = document.getElementById("credCardUrl");
      const emailElem = document.getElementById("credCardEmail");
      const passElem = document.getElementById("credCardPassword");
      const roleElem = document.getElementById("credCardRole");
      const linkSection = document.getElementById("credCardResetLinkSection");
      const linkInput = document.getElementById("credCardResetLink");

      const origin = window.location.origin;
      const loginUrl = `${origin}/index.html`;

      if (urlElem) urlElem.textContent = loginUrl;
      if (emailElem) emailElem.textContent = data.email || "";
      if (passElem) passElem.textContent = data.password || "(Not changed)";
      if (roleElem) roleElem.textContent = (data.role || "lead_engineer").toUpperCase();

      if (data.resetLink && linkSection && linkInput) {
        linkSection.style.display = "block";
        linkInput.value = data.resetLink;
      } else if (linkSection) {
        linkSection.style.display = "none";
      }

      this.currentCredsData = {
        loginUrl,
        email: data.email,
        password: data.password,
        role: data.role,
        resetLink: data.resetLink
      };

      if (modal) modal.style.display = "flex";
    },

    closeCredentialsModal() {
      const modal = document.getElementById("admCredentialsResultModal");
      if (modal) modal.style.display = "none";
      this.currentCredsData = null;
    },

    copyCredResetLink() {
      const input = document.getElementById("credCardResetLink");
      if (!input || !input.value) return;
      navigator.clipboard.writeText(input.value).then(() => {
        alert("Reset link copied to clipboard!");
      }).catch(() => {
        input.select();
        document.execCommand("copy");
        alert("Reset link copied to clipboard!");
      });
    },

    copyAllCredentials() {
      if (!this.currentCredsData) return;
      const d = this.currentCredsData;
      const text = `🔐 Engineering Dashboard Login Credentials\n\n` +
        `🌐 Login Portal: ${d.loginUrl}\n` +
        `👤 Username / Email: ${d.email}\n` +
        `🔑 Initial Password: ${d.password || '(Contact Admin)'}\n` +
        `⚙️ Assigned Role: ${(d.role || 'lead_engineer').toUpperCase()}\n` +
        (d.resetLink ? `\n🔗 Direct Password Setup Link:\n${d.resetLink}\n` : '') +
        `\nPlease sign in at ${d.loginUrl} and change your password after logging in.`;

      navigator.clipboard.writeText(text).then(() => {
        alert("All credentials copied to clipboard! You can now send them to the user via WhatsApp or Email.");
      }).catch(() => {
        alert("Credentials copied:\n\n" + text);
      });
    },

    promptDeleteUser(email) {
      if (!email) return;
      const target = email.toLowerCase().trim();
      const targetUser = (this.users || []).find(u => (u.email || "").toLowerCase().trim() === target);
      if (targetUser && (targetUser.isSuperAdmin || (targetUser.role === "admin" && targetUser.isProtected))) {
        this.showToast(`Super Administrator account (${target}) is protected and cannot be deleted.`, "warning");
        return;
      }

      this.confirmAction(
        "🗑️ Delete User Account",
        `Are you sure you want to permanently delete user "${target}"?\n\nThis will remove their permissions from Firebase Firestore and revoke their dashboard access.`,
        async () => {
          const callerEmail = this.getCallerEmail();
          let currentSessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
          if (!currentSessionId && callerEmail) {
            try {
              const recRes = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "validate", email: callerEmail })
              });
              const recData = await recRes.json().catch(() => ({}));
              if (recData && recData.valid && recData.session && recData.session.sessionId) {
                currentSessionId = recData.session.sessionId;
                if (typeof sessionStorage !== "undefined") sessionStorage.setItem("sessionId", currentSessionId);
                if (recData.session.uid && typeof sessionStorage !== "undefined") sessionStorage.setItem("userUid", recData.session.uid);
              }
            } catch (recErr) {}
          }

          try {
            const res = await this.adminFetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "delete_user",
                callerEmail,
                targetEmail: target
              })
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 401) {
              const errMsg = data.error || "Authentication required. Please provide a valid Firebase ID token or active server session.";
              this.showToast(errMsg, "error");
              if (typeof Swal !== "undefined") {
                Swal.fire({
                  icon: "error",
                  title: "Authentication Required",
                  text: "Your session has expired. Please log in again to delete users.",
                  confirmButtonText: "Sign In",
                  confirmButtonColor: "#2563eb"
                }).then(() => {
                  window.location.href = "index.html";
                });
              }
              throw new Error(errMsg);
            }

            if (!res.ok) throw new Error(data.error || "Failed to delete user");

            this.showToast(data.message || `User ${target} deleted successfully.`, "success");

            // Optimistically update local user list immediately
            this.users = (this.users || []).filter(u => u.email && u.email.toLowerCase().trim() !== target);
            /* in-memory only: this.users */
            this.renderUsersTable();

            // Refresh from server and overview stats
            await this.loadUsers();
            await this.loadOverview();
          } catch (err) {
            console.error("Delete user error:", err);
            this.showToast(`Failed to delete user: ${err.message}`, "error");
          }
        }
      );
    },

    // -------------------------------------------------------------
    // 🟢 SESSIONS MANAGEMENT & FORCE LOGOUT
    // -------------------------------------------------------------
    async loadSessions() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admSessionsTableBody");
      if (tbody && (!this.sessions || this.sessions.length === 0)) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">Loading active sessions...</td></tr>`;
      }

      const data = await this.safeFetch(`/api/admin?action=get_sessions&callerEmail=${encodeURIComponent(callerEmail)}`);
      if (data && data.success && data.sessions) {
        this.sessions = data.sessions || [];
        this.renderSessionsTable();
      } else {
        // Fallback active session for current user
        this.sessions = [
          {
            id: "sess_local_" + Date.now().toString(36),
            sessionId: "active_session",
            uid: "current_user",
            email: callerEmail || "system_admin",
            deviceId: "Web Browser (Current Session)",
            timestamp: Date.now(),
            diffMinutes: 0,
            status: "Active"
          }
        ];
        this.renderSessionsTable();
      }
    },

    renderSessionsTable() {
      const tbody = document.getElementById("admSessionsTableBody");
      if (!tbody) return;

      if (this.sessions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94a3b8;">No active sessions found in Firestore.</td></tr>`;
        return;
      }

      let html = "";
      this.sessions.forEach(sess => {
        let statusBadge = `<span class="adm-status-badge adm-status-active">🟢 Active</span>`;
        if (sess.status === "Idle") statusBadge = `<span class="adm-status-badge adm-status-idle">🟡 Idle</span>`;
        if (sess.status === "Expired") statusBadge = `<span class="adm-status-badge adm-status-expired">⚪ Expired</span>`;

        const timeAgo = sess.diffMinutes < 1 ? "Just now" : `${sess.diffMinutes}m ago`;
        const timeFormatted = sess.timestamp ? new Date(sess.timestamp).toLocaleTimeString() : "-";

        html += `
          <tr>
            <td>
              <div class="adm-cell-title" style="font-weight: 600;">${sess.email}</div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">ID: ${sess.id}</div>
            </td>
            <td>
              <div class="adm-cell-muted" style="font-size: 12px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sess.deviceId}">
                ${sess.deviceId}
              </div>
            </td>
            <td>
              <div class="adm-cell-title" style="font-size: 13px;">${timeAgo}</div>
              <div style="font-size: 11px; color: #94a3b8;">${timeFormatted}</div>
            </td>
            <td>
              ${statusBadge}
            </td>
            <td>
              <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.terminateSession('${sess.id}', '${sess.sessionId}', '${sess.email}')" title="Force user logout remotely">
                🔴 Force Logout
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    async terminateSession(docId, sessionId, email) {
      const confirmed = confirm(`Terminate session for ${email}?\n\nThis will instantly revoke their session in Firestore and log them out.`);
      if (!confirmed) return;

      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "terminate_session",
            callerEmail,
            docId,
            sessionId
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to terminate session");

        if (typeof Swal !== "undefined") {
          Swal.fire({
            icon: "success",
            title: "Session Terminated",
            text: `Session for ${email} has been terminated.`,
            timer: 1500,
            showConfirmButton: false
          });
        }
        await this.loadSessions();
        await this.loadOverview();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    },

    async clearStaleSessions() {
      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "clear_stale_sessions",
            callerEmail
          })
        });
        const data = await res.json();
        alert(data.message || "Stale sessions cleared.");
        await this.loadSessions();
        await this.loadOverview();
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    },

    // ------------------------------------------------------------------------
    // 🗄️ FIRESTORE DATABASE & COLLECTIONS EXPLORER
    // ------------------------------------------------------------------------
    async loadFirestoreCollection(colName) {
      this.selectedCollection = colName || "userRoles";
      const selectEl = document.getElementById("admFirestoreColSelect");
      if (selectEl && selectEl.value !== this.selectedCollection) {
        selectEl.value = this.selectedCollection;
      }
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admFirestoreTableBody");
      const titleEl = document.getElementById("admSelectedColTitle");

      if (titleEl) titleEl.textContent = `Collection: '${this.selectedCollection}'`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #94a3b8;">Querying documents in Firestore collection '${this.selectedCollection}'...</td></tr>`;

      try {
        const res = await this.adminFetch(`/api/admin?action=get_collection_docs&callerEmail=${encodeURIComponent(callerEmail)}&collectionName=${encodeURIComponent(this.selectedCollection)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load collection documents");

        this.collectionDocs = data.documents || [];
        if (titleEl) {
          titleEl.textContent = `Collection: '${this.selectedCollection}' (${this.collectionDocs.length} Document${this.collectionDocs.length === 1 ? '' : 's'})`;
        }
        this.renderFirestoreDocsTable();
      } catch (err) {
        console.error("loadFirestoreCollection error:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444; padding: 20px;">Error: ${err.message}</td></tr>`;
      }
    },

    renderFirestoreDocsTable() {
      const tbody = document.getElementById("admFirestoreTableBody");
      if (!tbody) return;

      if (this.collectionDocs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 30px; color: #94a3b8;">No documents found in collection '${this.selectedCollection}'.</td></tr>`;
        return;
      }

      let html = "";
      this.collectionDocs.forEach((doc, idx) => {
        const preview = JSON.stringify(doc.data);
        const shortPreview = preview.length > 90 ? preview.substring(0, 90) + "..." : preview;

        html += `
          <tr>
            <td style="font-weight: 600; color: #60a5fa; font-family: monospace; font-size: 13px;">
              ${doc.id}
            </td>
            <td>
              <code class="adm-json-preview">${this.escapeHtml(shortPreview)}</code>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.openDocJsonEditor('${doc.id}', ${idx})">
                  ✏️ View / Edit
                </button>
                <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.promptDeleteDoc('${doc.id}')" title="Delete document from Firestore">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    openNewDocModal() {
      const modal = document.getElementById("admDocEditModal");
      if (!modal) return;
      document.getElementById("admDocModalTitle").textContent = `➕ Add Document to '${this.selectedCollection}'`;
      document.getElementById("admDocModalId").value = "";
      document.getElementById("admDocModalId").readOnly = false;
      document.getElementById("admDocModalJson").value = JSON.stringify({ exampleField: "value", timestamp: Date.now() }, null, 2);
      modal.style.display = "flex";
    },

    openDocJsonEditor(docId, idx) {
      const doc = this.collectionDocs[idx];
      if (!doc) return;

      const modal = document.getElementById("admDocEditModal");
      if (!modal) return;

      document.getElementById("admDocModalTitle").textContent = `✏️ Edit Document: '${docId}'`;
      document.getElementById("admDocModalId").value = docId;
      document.getElementById("admDocModalId").readOnly = true;
      document.getElementById("admDocModalJson").value = JSON.stringify(doc.data, null, 2);
      modal.style.display = "flex";
    },

    closeDocJsonEditor() {
      const modal = document.getElementById("admDocEditModal");
      if (modal) modal.style.display = "none";
    },

    async submitSaveDoc() {
      const callerEmail = this.getCallerEmail();
      const docId = (document.getElementById("admDocModalId")?.value || "").trim();
      const rawJson = document.getElementById("admDocModalJson")?.value || "";

      if (!docId) {
        alert("Document ID is required");
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(rawJson);
      } catch (e) {
        alert(`Invalid JSON format: ${e.message}`);
        return;
      }

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_firestore_doc",
            callerEmail,
            collectionName: this.selectedCollection,
            docId,
            data: parsedData
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save document");

        this.closeDocJsonEditor();
        alert(`Document '${docId}' saved to Firestore successfully!`);
        await this.loadFirestoreCollection(this.selectedCollection);
      } catch (err) {
        alert(`Error saving document: ${err.message}`);
      }
    },

    async promptDeleteDoc(docId) {
      const confirmed = confirm(`Permanently delete document '${docId}' from Firestore collection '${this.selectedCollection}'?`);
      if (!confirmed) return;

      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_firestore_doc",
            callerEmail,
            collectionName: this.selectedCollection,
            docId
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete document");

        await this.loadFirestoreCollection(this.selectedCollection);
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    },

    // ------------------------------------------------------------------------
    // 📥 DATABASE BACKUP & EXPORT
    // ------------------------------------------------------------------------
    async downloadFullBackup() {
      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch(`/api/admin?action=export_backup&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (!data.success || !data.backup) throw new Error(data.error || "Backup failed");

        const jsonStr = JSON.stringify(data.backup, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateTag = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `KayetDMS_Firestore_Backup_${dateTag}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Backup download failed: ${err.message}`);
      }
    },

    // ========================================================================
    // 🔬 DAMAGE MECHANISM MANAGER METHODS
    // ========================================================================
    async loadDamageMechanisms() {
      const container = document.getElementById("admDamageMechsListContainer");
      if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #94a3b8;">⏳ Loading Damage Mechanisms catalog...</div>`;
      }

      const callerEmail = this.getCallerEmail();
      let rawCatalog = null;

      const data = await this.safeFetch(`/api/admin?action=get_damage_mechanisms&callerEmail=${encodeURIComponent(callerEmail)}`);
      if (data && data.success && data.mechanisms) {
        rawCatalog = data.mechanisms;
      }

      // Fallback to window.damageMechanisms or window.data if API was unavailable
      if (!rawCatalog || Object.keys(rawCatalog).length === 0) {
        if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
          rawCatalog = window.damageMechanisms;
        } else if (window.data && window.data["Damage Mechanism"]) {
          rawCatalog = window.data["Damage Mechanism"];
        }
      }

      // Merge local cache if exists
      try {
        const localCached = null; /* Loaded strictly live from Cloud Firestore */
        if (localCached) {
          const parsed = JSON.parse(localCached);
          if (parsed && typeof parsed === "object") {
            if (!rawCatalog) rawCatalog = {};
            Object.assign(rawCatalog, parsed);
          }
        }
      } catch (e) {}

      this.damageMechanisms = this.normalizeMechanismsList(rawCatalog || {});
      this.renderDamageMechanisms();
    },

    normalizeMechanismsList(rawMap) {
      const list = [];
      const seenNames = new Set();

      // Collect numeric code mapping if available from window.damageMechanisms
      const codeMap = {};
      if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
        for (const [k, v] of Object.entries(window.damageMechanisms)) {
          if (/^[0-9]+$/.test(k) && v && v.name) {
            codeMap[v.name.toLowerCase().trim()] = k;
          }
        }
      }

      // Collect category mapping from window.data if available
      const categoryMap = {};
      if (typeof window.data !== "undefined" && window.data) {
        for (const [catName, mechs] of Object.entries(window.data)) {
          if (mechs && typeof mechs === "object") {
            for (const mechName of Object.keys(mechs)) {
              categoryMap[mechName.toLowerCase().trim()] = catName;
            }
          }
        }
      }

      for (const [key, val] of Object.entries(rawMap)) {
        if (!val || typeof val !== "object") continue;
        const name = (val.name || key || "").trim();
        if (!name) continue;

        // Skip numeric keys that are duplicate pointers if we already have the named item
        if (/^[0-9]+$/.test(key) && seenNames.has(name.toLowerCase())) {
          continue;
        }

        const normKey = name.toLowerCase();
        if (seenNames.has(normKey)) {
          // If we see this name again and current item has more data or custom status, merge it
          const existingIdx = list.findIndex(item => item.name.toLowerCase() === normKey);
          if (existingIdx !== -1) {
            list[existingIdx] = { ...list[existingIdx], ...val };
          }
          continue;
        }
        seenNames.add(normKey);

        const code = val.code || codeMap[normKey] || (/^[0-9]+$/.test(key) ? key : "");
        const id = val.id || code || name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const category = val.category || categoryMap[normKey] || "API 571 Damage Mechanism";

        list.push({
          id,
          code: String(code || "").trim(),
          name,
          category,
          description: val.description || "",
          affectedMaterials: val.affectedMaterials || "",
          criticalFactors: val.criticalFactors || "",
          affectedUnits: val.affectedUnits || "",
          appearance: val.appearance || "",
          mitigation: val.mitigation || "",
          inspection: val.inspection || "",
          temperatureComparison: val.temperatureComparison || "",
          imagePath: val.imagePath || "",
          isCustom: !!val.isCustom,
          updatedAt: val.updatedAt || null
        });
      }

      // Default sort: numeric codes ascending
      list.sort((a, b) => {
        const numA = parseInt(a.code, 10);
        const numB = parseInt(b.code, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.name.localeCompare(b.name);
      });

      return list;
    },

    getFilteredAndSortedDms() {
      const q = (this.dmSearchQuery || "").toLowerCase().trim();
      const filter = this.dmFilterType || "all";
      const catFilter = this.dmCategoryFilter || "all";
      const sortBy = this.dmSortBy || "code_asc";

      let filtered = this.damageMechanisms.filter(mech => {
        // Query search
        if (q) {
          const hay = [
            mech.name,
            mech.code,
            mech.category || "",
            mech.description,
            mech.affectedMaterials,
            mech.affectedUnits,
            mech.criticalFactors
          ].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }

        // Filter type
        if (filter === "custom" && !mech.isCustom) return false;
        if (filter === "standard" && mech.isCustom) return false;
        if (filter === "with_image" && !mech.imagePath) return false;
        if (filter === "without_image" && !!mech.imagePath) return false;

        // Category filter
        if (catFilter !== "all" && mech.category !== catFilter) {
          return false;
        }

        return true;
      });

      // Sorting
      filtered.sort((a, b) => {
        if (sortBy === "code_asc") {
          const numA = parseInt(a.code, 10);
          const numB = parseInt(b.code, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          if (!isNaN(numA)) return -1;
          if (!isNaN(numB)) return 1;
          return a.name.localeCompare(b.name);
        } else if (sortBy === "code_desc") {
          const numA = parseInt(a.code, 10);
          const numB = parseInt(b.code, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          if (!isNaN(numA)) return 1;
          if (!isNaN(numB)) return -1;
          return b.name.localeCompare(a.name);
        } else if (sortBy === "name_asc") {
          return a.name.localeCompare(b.name);
        } else if (sortBy === "name_desc") {
          return b.name.localeCompare(a.name);
        } else if (sortBy === "custom_first") {
          if (a.isCustom && !b.isCustom) return -1;
          if (!a.isCustom && b.isCustom) return 1;
          return a.name.localeCompare(b.name);
        } else if (sortBy === "image_first") {
          if (a.imagePath && !b.imagePath) return -1;
          if (!a.imagePath && b.imagePath) return 1;
          return a.name.localeCompare(b.name);
        }
        return 0;
      });

      return filtered;
    },

    renderDamageMechanisms() {
      const container = document.getElementById("admDamageMechsListContainer");
      if (!container) return;

      const filtered = this.getFilteredAndSortedDms();

      // Update Metric Counters
      const totalEl = document.getElementById("admDmCountTotal");
      const customEl = document.getElementById("admDmCountCustom");
      const withImgEl = document.getElementById("admDmCountWithImage");
      const catCountEl = document.getElementById("admDmCountCategories");

      const uniqueCats = new Set(this.damageMechanisms.map(m => m.category).filter(Boolean));

      if (totalEl) totalEl.textContent = this.damageMechanisms.length;
      if (customEl) customEl.textContent = this.damageMechanisms.filter(m => m.isCustom).length;
      if (withImgEl) withImgEl.textContent = this.damageMechanisms.filter(m => !!m.imagePath).length;
      if (catCountEl) catCountEl.textContent = uniqueCats.size;

      // Populate Category Dropdown filter if present and not yet filled
      const catSelect = document.getElementById("admDmCategorySelect");
      if (catSelect && catSelect.options.length <= 1) {
        uniqueCats.forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat;
          opt.textContent = cat;
          catSelect.appendChild(opt);
        });
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 20px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 14px;">
            <div style="font-size: 38px; margin-bottom: 8px;">🔍</div>
            <h4 style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a; font-weight: 700;">No Damage Mechanisms Found</h4>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">No mechanisms match your current search, category, or filter criteria.</p>
            <button class="adm-btn adm-btn-secondary" onclick="window.adminPanel.resetDmFilters()">
              🔄 Reset All Filters
            </button>
          </div>
        `;
        return;
      }

      // Calculate Pagination
      const pageSize = this.dmPageSize >= 900 ? filtered.length : this.dmPageSize;
      const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
      if (this.dmCurrentPage > totalPages) this.dmCurrentPage = totalPages;
      if (this.dmCurrentPage < 1) this.dmCurrentPage = 1;

      const startIndex = (this.dmCurrentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, filtered.length);
      const paginatedItems = filtered.slice(startIndex, endIndex);

      let contentHtml = "";
      if (this.dmViewMode === "table") {
        contentHtml = this.renderDmTable(paginatedItems);
      } else {
        contentHtml = this.renderDmGrid(paginatedItems);
      }

      const paginationHtml = this.renderPagination(filtered.length);

      container.innerHTML = `
        <div class="adm-dm-catalog-wrapper">
          <div class="adm-catalog-header-bar">
            <div class="adm-catalog-status">
              Showing <strong>${startIndex + 1}–${endIndex}</strong> of <strong>${filtered.length}</strong> mechanisms
              ${this.dmSearchQuery ? `<span class="adm-query-tag">Search: "${this.escapeHtml(this.dmSearchQuery)}"</span>` : ''}
              ${this.dmCategoryFilter !== 'all' ? `<span class="adm-query-tag">Category: ${this.escapeHtml(this.dmCategoryFilter)}</span>` : ''}
            </div>
            ${filtered.length > pageSize ? `<div class="adm-page-quick-indicator">Page ${this.dmCurrentPage} of ${totalPages}</div>` : ''}
          </div>

          ${contentHtml}

          ${paginationHtml}
        </div>
      `;
    },

    renderPagination(totalFiltered) {
      if (this.dmPageSize >= 900 && totalFiltered <= 9) return "";

      const pageSize = this.dmPageSize >= 900 ? totalFiltered : this.dmPageSize;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
      const curPage = Math.min(Math.max(1, this.dmCurrentPage), totalPages);
      const startItem = totalFiltered === 0 ? 0 : (curPage - 1) * pageSize + 1;
      const endItem = Math.min(curPage * pageSize, totalFiltered);

      if (totalPages <= 1 && this.dmPageSize >= 900) {
        return `
          <div class="adm-pagination-bar">
            <span class="adm-page-info">Showing all <strong>${totalFiltered}</strong> mechanisms</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 12px; color: #64748b;">Per page:</span>
              <select class="adm-select adm-select-sm" onchange="window.adminPanel.setDmPageSize(this.value)">
                <option value="9" ${this.dmPageSize === 9 ? 'selected' : ''}>9 / page</option>
                <option value="18" ${this.dmPageSize === 18 ? 'selected' : ''}>18 / page</option>
                <option value="36" ${this.dmPageSize === 36 ? 'selected' : ''}>36 / page</option>
                <option value="999" ${this.dmPageSize >= 900 ? 'selected' : ''}>All</option>
              </select>
            </div>
          </div>
        `;
      }

      // Build page numbers window
      let pageButtons = "";
      const maxButtons = 5;
      let startP = Math.max(1, curPage - 2);
      let endP = Math.min(totalPages, startP + maxButtons - 1);
      if (endP - startP < maxButtons - 1) {
        startP = Math.max(1, endP - maxButtons + 1);
      }

      for (let p = startP; p <= endP; p++) {
        pageButtons += `
          <button type="button" class="adm-page-btn ${p === curPage ? 'active' : ''}" onclick="window.adminPanel.setDmPage(${p})">
            ${p}
          </button>
        `;
      }

      return `
        <div class="adm-pagination-bar">
          <div class="adm-page-info">
            Showing <strong>${startItem}–${endItem}</strong> of <strong>${totalFiltered}</strong> mechanisms
            <span style="margin-left: 6px; color: #94a3b8; font-size: 12px;">(Page ${curPage} of ${totalPages})</span>
          </div>

          <div class="adm-page-controls">
            <button type="button" class="adm-page-btn" ${curPage === 1 ? 'disabled' : ''} onclick="window.adminPanel.setDmPage(1)" title="First page">
              ⏮
            </button>
            <button type="button" class="adm-page-btn" ${curPage === 1 ? 'disabled' : ''} onclick="window.adminPanel.setDmPage(${curPage - 1})" title="Previous page">
              ◀ Prev
            </button>
            
            ${pageButtons}

            <button type="button" class="adm-page-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="window.adminPanel.setDmPage(${curPage + 1})" title="Next page">
              Next ▶
            </button>
            <button type="button" class="adm-page-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="window.adminPanel.setDmPage(${totalPages})" title="Last page">
              ⏭
            </button>

            <div style="display: flex; align-items: center; gap: 6px; margin-left: 10px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">Per page:</span>
              <select class="adm-select adm-select-sm" onchange="window.adminPanel.setDmPageSize(this.value)" style="padding: 4px 6px; font-size: 12px; height: 32px; border-radius: 6px;">
                <option value="9" ${this.dmPageSize === 9 ? 'selected' : ''}>9</option>
                <option value="18" ${this.dmPageSize === 18 ? 'selected' : ''}>18</option>
                <option value="36" ${this.dmPageSize === 36 ? 'selected' : ''}>36</option>
                <option value="999" ${this.dmPageSize >= 900 ? 'selected' : ''}>All</option>
              </select>
            </div>
          </div>
        </div>
      `;
    },

    setDmPage(p) {
      this.dmCurrentPage = parseInt(p, 10) || 1;
      this.renderDamageMechanisms();
      const container = document.getElementById("admDamageMechsListContainer");
      if (container) {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },

    setDmPageSize(s) {
      this.dmPageSize = parseInt(s, 10) || 9;
      this.dmCurrentPage = 1;
      this.renderDamageMechanisms();
    },

    onDmCategoryChange(val) {
      this.dmCategoryFilter = val || "all";
      this.dmCurrentPage = 1;
      this.renderDamageMechanisms();
    },

    onDmSortChange(val) {
      this.dmSortBy = val || "code_asc";
      this.renderDamageMechanisms();
    },

    resetDmFilters() {
      this.dmSearchQuery = "";
      this.dmFilterType = "all";
      this.dmCategoryFilter = "all";
      this.dmSortBy = "code_asc";
      this.dmCurrentPage = 1;
      const searchInput = document.getElementById("admDmSearchInput");
      const filterSelect = document.getElementById("admDmFilterSelect");
      const catSelect = document.getElementById("admDmCategorySelect");
      const sortSelect = document.getElementById("admDmSortSelect");
      if (searchInput) searchInput.value = "";
      if (filterSelect) filterSelect.value = "all";
      if (catSelect) catSelect.value = "all";
      if (sortSelect) sortSelect.value = "code_asc";
      this.renderDamageMechanisms();
    },

    stripHtmlTags(str) {
      if (!str) return "";
      const div = document.createElement("div");
      div.innerHTML = str;
      return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
    },

    renderDmGrid(items) {
      let cardsHtml = "";
      items.forEach(mech => {
        const safeName = this.escapeHtml(mech.name);
        const codeText = mech.code ? `#${mech.code}` : "API 571";
        const catText = mech.category || "API 571";
        const descSnippet = this.stripHtmlTags(mech.description).slice(0, 110) || "No description provided.";
        const unitsSnippet = this.stripHtmlTags(mech.affectedUnits).slice(0, 60) || "General refinery equipment";
        const matSnippet = this.stripHtmlTags(mech.affectedMaterials).slice(0, 60) || "Carbon steel / Alloys";

        const thumbHtml = mech.imagePath
          ? `
            <div class="adm-dm-thumb-wrapper" onclick="window.adminPanel.openImageUploadModal('${this.escapeHtml(mech.name)}')" title="Click to view or replace diagram">
              <img src="${mech.imagePath}" alt="${safeName}" class="adm-dm-thumb-img" onerror="this.onerror=null; this.src='image/api571_dashboard.png';" />
              <div class="adm-dm-thumb-overlay">
                <span>📷 Replace Diagram</span>
              </div>
            </div>
          `
          : `
            <div class="adm-dm-thumb-wrapper" onclick="window.adminPanel.openImageUploadModal('${this.escapeHtml(mech.name)}')" title="Click to upload diagram image">
              <div class="adm-dm-thumb-placeholder">
                <span style="font-size: 26px;">🖼️</span>
                <span>+ Upload Diagram Image</span>
              </div>
            </div>
          `;

        const badgeHtml = mech.isCustom
          ? `<span class="adm-dm-status-custom">⭐ Custom Edition</span>`
          : `<span class="adm-dm-status-std">Standard API 571</span>`;

        cardsHtml += `
          <div class="adm-dm-card">
            <div>
              <div class="adm-dm-header">
                <div class="adm-dm-title-box">
                  <div class="adm-dm-badge-row">
                    <span class="adm-dm-code-badge">${codeText}</span>
                    <span class="adm-dm-cat-badge" title="${this.escapeHtml(catText)}">${this.escapeHtml(catText)}</span>
                  </div>
                  <h4 class="adm-dm-name" title="${safeName}">${safeName}</h4>
                </div>
                <div>${badgeHtml}</div>
              </div>

              ${thumbHtml}

              <div class="adm-dm-meta-list">
                <div class="adm-dm-meta-item">
                  <span class="adm-dm-meta-label">📖 Scope:</span>
                  <span class="adm-dm-meta-val" title="${this.escapeHtml(descSnippet)}">${this.escapeHtml(descSnippet)}...</span>
                </div>
                <div class="adm-dm-meta-item">
                  <span class="adm-dm-meta-label">🏭 Units:</span>
                  <span class="adm-dm-meta-val" title="${this.escapeHtml(unitsSnippet)}">${this.escapeHtml(unitsSnippet)}</span>
                </div>
                <div class="adm-dm-meta-item">
                  <span class="adm-dm-meta-label">🧱 Materials:</span>
                  <span class="adm-dm-meta-val" title="${this.escapeHtml(matSnippet)}">${this.escapeHtml(matSnippet)}</span>
                </div>
              </div>
            </div>

            <div class="adm-dm-card-footer">
              <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <button type="button" class="adm-btn adm-btn-sm adm-btn-primary" onclick="window.adminPanel.openDamageMechModal('${this.escapeHtml(mech.name)}')" title="Edit complete data fields & text">
                  ✏️ Edit Data
                </button>
                <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.openImageUploadModal('${this.escapeHtml(mech.name)}')" title="Upload or replace diagram">
                  🖼️ Diagram
                </button>
                <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.previewDamageMech('${this.escapeHtml(mech.name)}')" title="Preview in live details view">
                  👁️ Details
                </button>
              </div>
              <div>
                ${mech.isCustom ? `
                  <button type="button" class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.promptDeleteDamageMech('${this.escapeHtml(mech.name)}')" title="Delete custom mechanism">
                    🗑️
                  </button>
                ` : `
                  <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">🔒 API</span>
                `}
              </div>
            </div>
          </div>
        `;
      });

      return `<div class="adm-dm-grid">${cardsHtml}</div>`;
    },

    renderDmTable(items) {
      let rowsHtml = "";
      items.forEach(mech => {
        const safeName = this.escapeHtml(mech.name);
        const codeText = mech.code ? `#${mech.code}` : "—";
        const catText = mech.category || "API 571";
        const thumbImg = mech.imagePath
          ? `<img src="${mech.imagePath}" style="width: 44px; height: 32px; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="window.adminPanel.openImageUploadModal('${safeName}')" title="Click to replace image" onerror="this.src='image/api571_dashboard.png'" />`
          : `<span style="font-size: 11px; color: #94a3b8; cursor: pointer;" onclick="window.adminPanel.openImageUploadModal('${safeName}')">+ Image</span>`;

        const badge = mech.isCustom
          ? `<span class="adm-dm-status-custom">Custom</span>`
          : `<span class="adm-dm-status-std">Standard</span>`;

        rowsHtml += `
          <tr>
            <td style="font-weight: 700; color: #2563eb; width: 65px;">${codeText}</td>
            <td style="width: 50px; text-align: center;">${thumbImg}</td>
            <td style="font-weight: 600; color: #0f172a;">
              <div>${safeName}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 400;">${this.escapeHtml(catText)}</div>
            </td>
            <td style="font-size: 12px; color: #475569; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${this.escapeHtml(this.stripHtmlTags(mech.affectedUnits))}
            </td>
            <td style="font-size: 12px; color: #475569; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${this.escapeHtml(this.stripHtmlTags(mech.affectedMaterials))}
            </td>
            <td style="width: 85px;">${badge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="adm-btn adm-btn-sm adm-btn-primary" onclick="window.adminPanel.openDamageMechModal('${safeName}')" title="Edit Data">
                ✏️ Edit
              </button>
              <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.openImageUploadModal('${safeName}')" title="Change Diagram">
                🖼️
              </button>
              <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.previewDamageMech('${safeName}')" title="Details">
                👁️
              </button>
              ${mech.isCustom ? `
                <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.promptDeleteDamageMech('${safeName}')" title="Delete">
                  🗑️
                </button>
              ` : ''}
            </td>
          </tr>
        `;
      });

      return `
        <div class="adm-table-wrapper" style="margin-top: 12px;">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Diagram</th>
                <th>Mechanism Name & Category</th>
                <th>Affected Units</th>
                <th>Affected Materials</th>
                <th>Edition</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    },

    onDmSearchInput(val) {
      this.dmSearchQuery = val;
      this.dmCurrentPage = 1;
      this.renderDamageMechanisms();
    },

    onDmFilterChange(val) {
      this.dmFilterType = val;
      this.dmCurrentPage = 1;
      this.renderDamageMechanisms();
    },

    setDmViewMode(mode) {
      this.dmViewMode = mode;
      const gridBtn = document.getElementById("admDmViewGridBtn");
      const tableBtn = document.getElementById("admDmViewTableBtn");
      if (gridBtn && tableBtn) {
        gridBtn.className = mode === "grid" ? "adm-btn adm-btn-sm adm-btn-primary" : "adm-btn adm-btn-sm adm-btn-secondary";
        tableBtn.className = mode === "table" ? "adm-btn adm-btn-sm adm-btn-primary" : "adm-btn adm-btn-sm adm-btn-secondary";
      }
      this.renderDamageMechanisms();
    },

    // ------------------------------------------------------------------------
    // 📝 RICH TEXTAREA LIST & FORMATTING HELPERS (Bullet Points & Numbers)
    // ------------------------------------------------------------------------
    insertBullet(textareaId) {
      const el = document.getElementById(textareaId);
      if (!el) return;
      el.focus();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;

      if (start !== end) {
        // Multi-line selection: prefix each selected line with "• "
        const selectedText = val.substring(start, end);
        const transformed = selectedText
          .split("\n")
          .map(line => {
            const clean = line.replace(/^[•\-\*]\s*/, "");
            return "• " + clean;
          })
          .join("\n");
        el.value = val.substring(0, start) + transformed + val.substring(end);
        el.selectionStart = start;
        el.selectionEnd = start + transformed.length;
      } else {
        // Single cursor position
        const textBefore = val.substring(0, start);
        const textAfter = val.substring(end);
        const isStartOfLine = start === 0 || textBefore.endsWith("\n");
        const insertText = isStartOfLine ? "• " : "\n• ";
        el.value = textBefore + insertText + textAfter;
        el.selectionStart = el.selectionEnd = start + insertText.length;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    insertNumberedList(textareaId) {
      const el = document.getElementById(textareaId);
      if (!el) return;
      el.focus();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;

      if (start !== end) {
        // Multi-line selection: number each line sequentially
        const selectedText = val.substring(start, end);
        let num = 1;
        const transformed = selectedText
          .split("\n")
          .map(line => {
            const clean = line.replace(/^(\d+)[\.\)]\s*/, "");
            return (num++) + ". " + clean;
          })
          .join("\n");
        el.value = val.substring(0, start) + transformed + val.substring(end);
        el.selectionStart = start;
        el.selectionEnd = start + transformed.length;
      } else {
        const textBefore = val.substring(0, start);
        const textAfter = val.substring(end);
        const isStartOfLine = start === 0 || textBefore.endsWith("\n");
        const insertText = isStartOfLine ? "1. " : "\n1. ";
        el.value = textBefore + insertText + textAfter;
        el.selectionStart = el.selectionEnd = start + insertText.length;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    insertBold(textareaId) {
      const el = document.getElementById(textareaId);
      if (!el) return;
      el.focus();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;

      if (start !== end) {
        const selected = val.substring(start, end);
        el.value = val.substring(0, start) + `**${selected}**` + val.substring(end);
        el.selectionStart = start;
        el.selectionEnd = end + 4;
      } else {
        const insert = "**bold text**";
        el.value = val.substring(0, start) + insert + val.substring(end);
        el.selectionStart = start + 2;
        el.selectionEnd = start + 11;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },

    bindRichTextareaKeyEvents() {
      document.querySelectorAll(".adm-rich-textarea").forEach(textarea => {
        if (textarea._boundKeyEvents) return;
        textarea._boundKeyEvents = true;

        textarea.addEventListener("keydown", function(e) {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
            const cursor = this.selectionStart;
            const textBefore = this.value.substring(0, cursor);
            const textAfter = this.value.substring(this.selectionEnd);
            const currentLine = textBefore.split("\n").pop() || "";

            // Check if current line is a bullet point: • or - or *
            const bulletMatch = currentLine.match(/^([•\-\*])\s*(.*)$/);
            // Check if current line is numbered: 1. or 1)
            const numMatch = currentLine.match(/^(\d+)[\.\)]\s*(.*)$/);

            if (bulletMatch) {
              e.preventDefault();
              const content = bulletMatch[2];
              if (!content.trim()) {
                // Empty bullet line -> exit bullet mode
                const lineStart = cursor - currentLine.length;
                this.value = this.value.substring(0, lineStart) + textAfter;
                this.selectionStart = this.selectionEnd = lineStart;
              } else {
                // Auto continue bullet
                const insert = "\n• ";
                this.value = textBefore + insert + textAfter;
                this.selectionStart = this.selectionEnd = cursor + insert.length;
              }
              this.dispatchEvent(new Event("input", { bubbles: true }));
            } else if (numMatch) {
              e.preventDefault();
              const num = parseInt(numMatch[1], 10);
              const content = numMatch[2];
              if (!content.trim()) {
                // Empty number line -> exit number mode
                const lineStart = cursor - currentLine.length;
                this.value = this.value.substring(0, lineStart) + textAfter;
                this.selectionStart = this.selectionEnd = lineStart;
              } else {
                // Auto continue next number
                const nextMarker = `\n${num + 1}. `;
                this.value = textBefore + nextMarker + textAfter;
                this.selectionStart = this.selectionEnd = cursor + nextMarker.length;
              }
              this.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }
        });
      });
    },

    calculateNextCode() {
      let max = 0;
      this.damageMechanisms.forEach(m => {
        const n = parseInt(m.code, 10);
        if (!isNaN(n) && n > max) max = n;
      });
      return max > 0 ? String(max + 1) : "68";
    },

    // ------------------------------------------------------------------------
    // ➕ / ✏️ FULL DAMAGE MECHANISM MODAL
    // ------------------------------------------------------------------------
    openDamageMechModal(nameToEdit) {
      const modal = document.getElementById("admDamageMechModal");
      if (!modal) return;

      this.stagedModalImageData = null;

      if (nameToEdit) {
        // Editing existing mechanism
        const mech = this.damageMechanisms.find(m => m.name.toLowerCase() === nameToEdit.toLowerCase()) || { name: nameToEdit };
        document.getElementById("admDmModalTitle").textContent = `✏️ Edit Damage Mechanism: ${mech.name}`;
        document.getElementById("admDmId").value = mech.id || mech.code || mech.name;
        document.getElementById("admDmCode").value = mech.code || "";
        document.getElementById("admDmName").value = mech.name || "";
        document.getElementById("admDmDescription").value = mech.description || "";
        document.getElementById("admDmAffectedMaterials").value = mech.affectedMaterials || "";
        document.getElementById("admDmCriticalFactors").value = mech.criticalFactors || "";
        document.getElementById("admDmAffectedUnits").value = mech.affectedUnits || "";
        document.getElementById("admDmAppearance").value = mech.appearance || "";
        document.getElementById("admDmMitigation").value = mech.mitigation || "";
        document.getElementById("admDmInspection").value = mech.inspection || "";
        document.getElementById("admDmTempComparison").value = mech.temperatureComparison || "";
        document.getElementById("admDmImagePath").value = mech.imagePath || "";

        if (mech.imagePath) {
          const previewRow = document.getElementById("admDmModalImagePreviewRow");
          const previewImg = document.getElementById("admDmModalPreviewImg");
          const previewInfo = document.getElementById("admDmModalPreviewInfo");
          const previewMeta = document.getElementById("admDmModalPreviewMeta");
          if (previewRow && previewImg) {
            previewImg.src = mech.imagePath;
            previewInfo.textContent = mech.imagePath;
            previewMeta.textContent = "Current Linked Image";
            previewRow.style.display = "flex";
          }
        } else {
          const previewRow = document.getElementById("admDmModalImagePreviewRow");
          if (previewRow) previewRow.style.display = "none";
        }
      } else {
        // Creating NEW mechanism
        const nextCode = this.calculateNextCode();
        document.getElementById("admDmModalTitle").textContent = "➕ Add New Damage Mechanism";
        document.getElementById("admDmId").value = "";
        document.getElementById("admDmCode").value = nextCode;
        document.getElementById("admDmName").value = "";
        document.getElementById("admDmDescription").value = "";
        document.getElementById("admDmAffectedMaterials").value = "";
        document.getElementById("admDmCriticalFactors").value = "";
        document.getElementById("admDmAffectedUnits").value = "";
        document.getElementById("admDmAppearance").value = "";
        document.getElementById("admDmMitigation").value = "";
        document.getElementById("admDmInspection").value = "";
        document.getElementById("admDmTempComparison").value = "";
        document.getElementById("admDmImagePath").value = "";

        const previewRow = document.getElementById("admDmModalImagePreviewRow");
        if (previewRow) previewRow.style.display = "none";
      }

      modal.style.display = "flex";
      this.bindDropzoneEvents("admDmDropzone", "admDmModalFileInput", files => this.onModalImageFileSelected(files));
      this.bindRichTextareaKeyEvents();
    },

    closeDamageMechModal() {
      const modal = document.getElementById("admDamageMechModal");
      if (modal) modal.style.display = "none";
      this.stagedModalImageData = null;
    },

    bindDropzoneEvents(dropzoneId, inputId, callback) {
      const dropzone = document.getElementById(dropzoneId);
      if (!dropzone || dropzone._bound) return;
      dropzone._bound = true;

      ["dragenter", "dragover"].forEach(evt => {
        dropzone.addEventListener(evt, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("dragover");
        });
      });

      ["dragleave", "drop"].forEach(evt => {
        dropzone.addEventListener(evt, e => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("dragover");
        });
      });

      dropzone.addEventListener("drop", e => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          callback(dt.files);
        }
      });
    },

    onModalImageFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, SVG, WebP)");
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        this.stagedModalImageData = {
          dataUrl,
          fileName: file.name,
          sizeKb: Math.round(file.size / 1024)
        };

        const previewRow = document.getElementById("admDmModalImagePreviewRow");
        const previewImg = document.getElementById("admDmModalPreviewImg");
        const previewInfo = document.getElementById("admDmModalPreviewInfo");
        const previewMeta = document.getElementById("admDmModalPreviewMeta");

        if (previewRow && previewImg) {
          previewImg.src = dataUrl;
          previewInfo.textContent = `🟢 Staged: ${file.name}`;
          previewMeta.textContent = `${Math.round(file.size / 1024)} KB • Ready to save`;
          previewRow.style.display = "flex";
        }

        // Also suggest image path
        const pathInput = document.getElementById("admDmImagePath");
        if (pathInput) pathInput.value = `image/uploads/${file.name}`;
      };
      reader.readAsDataURL(file);
    },

    removeModalImage() {
      this.stagedModalImageData = null;
      const previewRow = document.getElementById("admDmModalImagePreviewRow");
      if (previewRow) previewRow.style.display = "none";
      const pathInput = document.getElementById("admDmImagePath");
      if (pathInput) pathInput.value = "";
    },

    onModalImagePathInput(val) {
      const previewRow = document.getElementById("admDmModalImagePreviewRow");
      const previewImg = document.getElementById("admDmModalPreviewImg");
      const previewInfo = document.getElementById("admDmModalPreviewInfo");
      const previewMeta = document.getElementById("admDmModalPreviewMeta");

      if (val && val.trim().length > 0) {
        if (previewRow && previewImg) {
          previewImg.src = val.trim();
          previewInfo.textContent = val.trim();
          previewMeta.textContent = "URL / Path reference";
          previewRow.style.display = "flex";
        }
      } else {
        if (previewRow) previewRow.style.display = "none";
      }
    },

    async saveDamageMechFromModal() {
      const name = (document.getElementById("admDmName")?.value || "").trim();
      if (!name) {
        alert("Please enter a Damage Mechanism Name.");
        document.getElementById("admDmName")?.focus();
        return;
      }

      const id = (document.getElementById("admDmId")?.value || name).trim();
      const code = (document.getElementById("admDmCode")?.value || "").trim();
      const description = document.getElementById("admDmDescription")?.value || "";
      const affectedMaterials = document.getElementById("admDmAffectedMaterials")?.value || "";
      const criticalFactors = document.getElementById("admDmCriticalFactors")?.value || "";
      const affectedUnits = document.getElementById("admDmAffectedUnits")?.value || "";
      const appearance = document.getElementById("admDmAppearance")?.value || "";
      const mitigation = document.getElementById("admDmMitigation")?.value || "";
      const inspection = document.getElementById("admDmInspection")?.value || "";
      const temperatureComparison = document.getElementById("admDmTempComparison")?.value || "";
      let imagePath = (document.getElementById("admDmImagePath")?.value || "").trim();

      const saveBtn = document.getElementById("admSaveDmSubmitBtn");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Saving to Cloud Firestore...";
      }

      const callerEmail = this.getCallerEmail();

      // If an image file was staged via dropzone/file input, upload it first or send inline
      let imageData = null;
      if (this.stagedModalImageData && this.stagedModalImageData.dataUrl) {
        imageData = this.stagedModalImageData.dataUrl;
      }

      try {
        const payload = {
          action: "save_damage_mechanism",
          callerEmail,
          id,
          code,
          name,
          description,
          affectedMaterials,
          criticalFactors,
          affectedUnits,
          appearance,
          mitigation,
          inspection,
          temperatureComparison,
          imagePath,
          imageData
        };

        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save damage mechanism");

        const savedRecord = data.mechanism || payload;

        // Immediately update global client stores so all views update without page reload
        if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
          window.damageMechanisms[name] = savedRecord;
          if (code) window.damageMechanisms[code] = savedRecord;
        }

        if (typeof window.data !== "undefined" && window.data && window.data["Damage Mechanism"]) {
          window.data["Damage Mechanism"][name] = savedRecord;
        }

        // Persist in Firestore via backend
        try {
          let customCache = {};
          const stored = null;
          if (stored) customCache = JSON.parse(stored) || {};
          customCache[name] = savedRecord;
          /* Persisted strictly to Firestore via /api/admin */
        } catch (e) {}

        this.closeDamageMechModal();
        alert(`✅ Damage Mechanism "${name}" successfully saved and updated across all modules!`);
        await this.loadDamageMechanisms();
      } catch (err) {
        alert(`Error saving mechanism: ${err.message}`);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "💾 Save Mechanism to Firestore";
        }
      }
    },

    previewFromModal() {
      const name = (document.getElementById("admDmName")?.value || "").trim() || "Preview Mechanism";
      const code = (document.getElementById("admDmCode")?.value || "").trim();
      const tempMech = {
        name,
        code,
        description: document.getElementById("admDmDescription")?.value || "",
        affectedMaterials: document.getElementById("admDmAffectedMaterials")?.value || "",
        criticalFactors: document.getElementById("admDmCriticalFactors")?.value || "",
        affectedUnits: document.getElementById("admDmAffectedUnits")?.value || "",
        appearance: document.getElementById("admDmAppearance")?.value || "",
        mitigation: document.getElementById("admDmMitigation")?.value || "",
        inspection: document.getElementById("admDmInspection")?.value || "",
        temperatureComparison: document.getElementById("admDmTempComparison")?.value || "",
        imagePath: this.stagedModalImageData ? this.stagedModalImageData.dataUrl : (document.getElementById("admDmImagePath")?.value || "")
      };

      if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
        window.damageMechanisms[name] = tempMech;
      }

      this.previewDamageMech(name);
    },

    // ------------------------------------------------------------------------
    // 🖼️ QUICK IMAGE UPLOAD & REPLACE MODAL
    // ------------------------------------------------------------------------
    openImageUploadModal(mechName) {
      const mech = this.damageMechanisms.find(m => m.name.toLowerCase() === mechName.toLowerCase()) || { name: mechName };
      this.activeQuickImageMechName = mech.name;
      this.stagedQuickImageData = null;

      const modal = document.getElementById("admDamageMechImageModal");
      if (!modal) return;

      document.getElementById("admImgModalMechTitle").textContent = mech.name;
      const currentBox = document.getElementById("admImgModalCurrentBox");
      if (currentBox) {
        if (mech.imagePath) {
          currentBox.innerHTML = `
            <img src="${mech.imagePath}" alt="${this.escapeHtml(mech.name)}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.onerror=null; this.src='image/api571_dashboard.png';" />
          `;
        } else {
          currentBox.innerHTML = `<span style="color: #94a3b8; font-size: 12px;">No current image assigned</span>`;
        }
      }

      const stagedRow = document.getElementById("admImgModalStagedRow");
      if (stagedRow) stagedRow.style.display = "none";

      const pathInput = document.getElementById("admImgModalPathInput");
      if (pathInput) pathInput.value = mech.imagePath || "";

      modal.style.display = "flex";
      this.bindDropzoneEvents("admImgModalDropzone", "admQuickFileInput", files => this.onQuickImageFileSelected(files));
    },

    closeImageUploadModal() {
      const modal = document.getElementById("admDamageMechImageModal");
      if (modal) modal.style.display = "none";
      this.activeQuickImageMechName = null;
      this.stagedQuickImageData = null;
    },

    onQuickImageFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, SVG, WebP)");
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target.result;
        this.stagedQuickImageData = {
          dataUrl,
          fileName: file.name,
          sizeKb: Math.round(file.size / 1024)
        };

        const stagedRow = document.getElementById("admImgModalStagedRow");
        const stagedImg = document.getElementById("admImgModalStagedImg");
        const stagedName = document.getElementById("admImgModalStagedName");
        const stagedSize = document.getElementById("admImgModalStagedSize");

        if (stagedRow && stagedImg) {
          stagedImg.src = dataUrl;
          stagedName.textContent = file.name;
          stagedSize.textContent = `${Math.round(file.size / 1024)} KB • Ready to replace current image`;
          stagedRow.style.display = "flex";
        }

        const pathInput = document.getElementById("admImgModalPathInput");
        if (pathInput) pathInput.value = `image/uploads/${file.name}`;
      };
      reader.readAsDataURL(file);
    },

    async submitQuickImageUpload() {
      const mechName = this.activeQuickImageMechName;
      if (!mechName) return;

      const submitBtn = document.getElementById("admSubmitQuickImgBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Uploading & Updating Image...";
      }

      const callerEmail = this.getCallerEmail();
      const mech = this.damageMechanisms.find(m => m.name.toLowerCase() === mechName.toLowerCase()) || { name: mechName };

      let targetImagePath = (document.getElementById("admImgModalPathInput")?.value || "").trim();

      try {
        // If file was staged, upload it to server
        if (this.stagedQuickImageData && this.stagedQuickImageData.dataUrl) {
          const uploadRes = await this.adminFetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "upload_damage_mechanism_image",
              callerEmail,
              name: mechName,
              fileName: this.stagedQuickImageData.fileName,
              fileData: this.stagedQuickImageData.dataUrl
            })
          });

          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadData.error || "Image file upload failed");
          targetImagePath = uploadData.imagePath || this.stagedQuickImageData.dataUrl;
        }

        if (!targetImagePath) {
          alert("Please select an image file or enter an image path/URL.");
          return;
        }

        // Save updated imagePath to the damage mechanism in Firestore
        const saveRes = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_damage_mechanism",
            callerEmail,
            ...mech,
            imagePath: targetImagePath
          })
        });

        const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.error || "Failed to update mechanism image");

        // Immediately update global stores
        mech.imagePath = targetImagePath;
        if (typeof window.damageMechanisms !== "undefined" && window.damageMechanisms) {
          if (window.damageMechanisms[mechName]) window.damageMechanisms[mechName].imagePath = targetImagePath;
          if (mech.code && window.damageMechanisms[mech.code]) window.damageMechanisms[mech.code].imagePath = targetImagePath;
        }
        if (typeof window.data !== "undefined" && window.data && window.data["Damage Mechanism"] && window.data["Damage Mechanism"][mechName]) {
          window.data["Damage Mechanism"][mechName].imagePath = targetImagePath;
        }

        // Update Firestore via backend
        try {
          let customCache = {};
          const stored = null;
          if (stored) customCache = JSON.parse(stored) || {};
          customCache[mechName] = { ...(customCache[mechName] || mech), imagePath: targetImagePath };
          /* Persisted strictly to Firestore via /api/admin */
        } catch (e) {}

        this.closeImageUploadModal();
        alert(`✅ Reference image for "${mechName}" successfully updated!`);
        this.renderDamageMechanisms();
      } catch (err) {
        alert(`Failed to upload/replace image: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "💾 Apply & Save Image";
        }
      }
    },

    // ------------------------------------------------------------------------
    // 🗑️ DELETE / RESET MECHANISM
    // ------------------------------------------------------------------------
    async promptDeleteDamageMech(mechName) {
      const confirmed = confirm(`Are you sure you want to remove or reset "${mechName}"?\n\nThis will remove custom edits from Firestore and revert to standard specifications.`);
      if (!confirmed) return;

      const callerEmail = this.getCallerEmail();
      const mech = this.damageMechanisms.find(m => m.name.toLowerCase() === mechName.toLowerCase());

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_damage_mechanism",
            callerEmail,
            name: mechName,
            id: mech?.id || mech?.code || mechName
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to delete mechanism");

        // Remove from Firestore via backend
        try {
          const stored = null;
          if (stored) {
            const customCache = JSON.parse(stored);
            if (customCache && customCache[mechName]) {
              delete customCache[mechName];
              /* Persisted strictly to Firestore via /api/admin */
            }
          }
        } catch (e) {}

        alert(`Mechanism "${mechName}" updated.`);
        await this.loadDamageMechanisms();
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      }
    },

    // ------------------------------------------------------------------------
    // 👁️ LIVE PREVIEW
    // ------------------------------------------------------------------------
    previewDamageMech(mechName) {
      if (typeof window.renderAPI571DetailsModal === "function") {
        window.renderAPI571DetailsModal(mechName, "detailsModal", "detailsContent", "detailsModalTitle");
        const modal = document.getElementById("detailsModal");
        if (modal) {
          modal.style.display = "block";
          modal.style.zIndex = "100080";
        }
      } else {
        alert(`Preview for "${mechName}": Details modal renderer is initializing.`);
      }
    },

    // ------------------------------------------------------------------------
    // 📥 BULK IMPORT & 📤 EXPORT
    // ------------------------------------------------------------------------
    exportDamageMechsJson() {
      try {
        const exportObj = {
          exportedAt: new Date().toISOString(),
          totalMechanisms: this.damageMechanisms.length,
          mechanisms: {}
        };

        this.damageMechanisms.forEach(m => {
          exportObj.mechanisms[m.name] = {
            id: m.id,
            code: m.code,
            name: m.name,
            description: m.description,
            affectedMaterials: m.affectedMaterials,
            criticalFactors: m.criticalFactors,
            affectedUnits: m.affectedUnits,
            appearance: m.appearance,
            mitigation: m.mitigation,
            inspection: m.inspection,
            temperatureComparison: m.temperatureComparison,
            imagePath: m.imagePath,
            isCustom: m.isCustom
          };
        });

        const jsonStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateTag = new Date().toISOString().split("T")[0];
        a.href = url;
        a.download = `Kayet_Damage_Mechanisms_Catalog_${dateTag}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        alert(`Export failed: ${err.message}`);
      }
    },

    openBulkImportModal() {
      const modal = document.getElementById("admDamageMechImportModal");
      if (modal) modal.style.display = "flex";
    },

    closeBulkImportModal() {
      const modal = document.getElementById("admDamageMechImportModal");
      if (modal) modal.style.display = "none";
    },

    fillSampleImportJson() {
      const sample = {
        "mechanisms": {
          "Hydrogen Induced Cracking (HIC)": {
            "code": "68",
            "name": "Hydrogen Induced Cracking (HIC)",
            "description": "Stepwise internal cracking of carbon steel caused by hydrogen absorption in wet H2S environments.",
            "affectedMaterials": "Carbon steel and low-alloy steels (especially with manganese sulfide inclusions).",
            "criticalFactors": "H2S partial pressure, pH, water phase, susceptible steel microstructure.",
            "affectedUnits": "Crude unit overhead, sour water strippers, amine regenerator overhead, amine absorbers.",
            "appearance": "Stepwise or parallel blisters, laminar cracks, internal fissures.",
            "mitigation": "HIC-resistant steels, low sulfur content, calcium treatment, PWHT.",
            "inspection": "Ultrasonic Testing (A/B/C-scan), PAUT, Wet Fluorescent MT.",
            "temperatureComparison": "Active from ambient up to 300°F (150°C).",
            "imagePath": "image/api571_dashboard.png"
          }
        }
      };
      const textarea = document.getElementById("admBulkJsonTextarea");
      if (textarea) textarea.value = JSON.stringify(sample, null, 2);
    },

    onBulkJsonFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = e => {
        const textarea = document.getElementById("admBulkJsonTextarea");
        if (textarea) textarea.value = e.target.result;
      };
      reader.readAsText(file);
    },

    async submitBulkImport() {
      const textarea = document.getElementById("admBulkJsonTextarea");
      const rawText = (textarea?.value || "").trim();
      if (!rawText) {
        alert("Please paste or upload JSON containing mechanisms data.");
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        alert(`Invalid JSON format: ${e.message}`);
        return;
      }

      const mechanisms = parsed.mechanisms || parsed["Damage Mechanism"] || parsed;
      const submitBtn = document.getElementById("admBulkImportSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Importing to Firestore...";
      }

      const callerEmail = this.getCallerEmail();

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_import_damage_mechanisms",
            callerEmail,
            mechanisms
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Bulk import failed");

        this.closeBulkImportModal();
        alert(`🎉 ${data.message || "Mechanisms imported successfully!"}`);
        await this.loadDamageMechanisms();
      } catch (err) {
        alert(`Bulk import error: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "📥 Import Mechanisms to Firestore";
        }
      }
    },

    // ========================================================================
    // 🛡️ ROLES & PERMISSIONS VIEW METHODS
    // ========================================================================
    renderRolesConfigCards() {
      const container = document.getElementById("admRolesCardsContainer");
      if (!container) return;

      const dynamicRoleKeys = (this.overview && this.overview.roles) ||
        (this.roleMatrixState ? Object.keys(this.roleMatrixState) : null) ||
        (this.overview && this.overview.roleBreakdown ? Object.keys(this.overview.roleBreakdown) : ["admin", "lead_engineer", "inspector", "viewer", "custom"]);

      const uniqueRoleIds = Array.from(new Set([...dynamicRoleKeys, "custom"]));

      const counts = {};
      uniqueRoleIds.forEach(id => { counts[id] = 0; });
      this.users.forEach(u => {
        const r = u.role || "viewer";
        if (counts[r] !== undefined) counts[r]++;
        else counts.custom = (counts.custom || 0) + 1;
      });

      const totalModulesCount = (this.availableModules && this.availableModules.length) || 13;
      const serverRoleMeta = (this.overview && (this.overview.roleMetadata || this.overview.rolesMetadata)) || {};

      let html = "";
      uniqueRoleIds.forEach(roleId => {
        const meta = serverRoleMeta[roleId] || {
          name: `🛡️ ${roleId.charAt(0).toUpperCase() + roleId.slice(1).replace(/_/g, " ")}`,
          desc: `Custom defined role with server-governed access permissions.`,
          color: roleId === "admin" ? "#2563eb" : (roleId === "lead_engineer" ? "#059669" : (roleId === "inspector" ? "#d97706" : (roleId === "viewer" ? "#64748b" : "#7c3aed")))
        };
        const assignedModsCount = roleId === "admin"
          ? totalModulesCount
          : (this.roleMatrixState && this.roleMatrixState[roleId]
              ? Object.values(this.roleMatrixState[roleId]).filter(Boolean).length
              : (roleId === "custom" ? "Configurable per User" : "Server Managed"));
        const scopeLabel = typeof assignedModsCount === "number" ? `${assignedModsCount} of ${totalModulesCount} Modules` : assignedModsCount;

        html += `
          <div class="adm-app-card" style="border-top: 3px solid ${meta.color};">
            <div>
              <div class="adm-app-card-header">
                <div class="adm-app-card-titles">
                  <h3 style="color:${meta.color};">${meta.name}</h3>
                  <p>${meta.desc}</p>
                </div>
              </div>
              <ul class="adm-app-card-features">
                <li>Scope: <strong>${scopeLabel}</strong></li>
                <li>Active Users: <strong>${counts[roleId] || 0} assigned</strong></li>
                <li>Enforcement: <strong>Real-time Cloud Rules & UI Guards</strong></li>
              </ul>
            </div>
            <div class="adm-app-card-actions">
              <span class="adm-pill" style="background: rgba(37,99,235,0.08); color: ${meta.color}; font-weight:700;">Role Key: ${roleId}</span>
              <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" style="background: ${meta.color}; border-color: ${meta.color}; color: #ffffff; font-weight: 600; padding: 6px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); cursor: pointer; transition: all 0.2s ease;" onclick="window.adminPanel.navigateTo('permission-matrix')" title="View and configure ${meta.name} permissions matrix">
                View Matrix ➔
              </button>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    },

    // ========================================================================
    // 🛡️ ROLES & PERMISSIONS MATRIX METHODS
    // ========================================================================
    roleMatrixState: null,
    matrixSearchQuery: "",

    async loadPermissionMatrix() {
      const tbody = document.getElementById("admRoleMatrixTbody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: #94a3b8;">Loading permissions matrix from server...</td></tr>`;
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await fetch(`/api/admin?action=get_role_matrix&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.matrix) {
          this.roleMatrixState = data.matrix;
          if (data.availableModules && data.availableModules.length > 0) {
            this.availableModules = data.availableModules;
          }
        }
      } catch (err) {
        console.warn("loadPermissionMatrix fetch note:", err);
      }

      if (!this.roleMatrixState) {
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: #f59e0b;">⚠️ Unable to load live permission matrix from server. Please check connection and retry.</td></tr>`;
        }
        return;
      }

      this.renderRoleMatrixTable();
    },

    renderRoleMatrixTable() {
      const tbody = document.getElementById("admRoleMatrixTbody");
      if (!tbody) return;

      const moduleList = (this.availableModules && this.availableModules.length > 0) ? this.availableModules : getInitialAvailableModules();
      const q = (this.matrixSearchQuery || "").toLowerCase().trim();

      const filtered = moduleList.filter(m => {
        if (!q) return true;
        return (m.name && m.name.toLowerCase().includes(q)) ||
               (m.category && m.category.toLowerCase().includes(q)) ||
               (m.id && m.id.toLowerCase().includes(q));
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: #94a3b8;">No modules matching "${this.escapeHtml(this.matrixSearchQuery)}".</td></tr>`;
        return;
      }

      const matrix = this.roleMatrixState || {};
      const leadEng = matrix.lead_engineer || matrix.engineer || {};
      const insp = matrix.inspector || {};
      const view = matrix.viewer || {};

      let html = "";
      filtered.forEach((mod, idx) => {
        const isOdd = idx % 2 === 1;
        const rowBg = isOdd ? "#fcfdfd" : "#ffffff";

        const isLeadChecked = leadEng[mod.id] !== false;
        const isInspChecked = insp[mod.id] === true;
        const isViewChecked = view[mod.id] === true;

        html += `
          <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; transition: background 0.15s ease;" onmouseover="this.style.background='#f1f5f9';" onmouseout="this.style.background='${rowBg}';">
            <td style="padding: 12px 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px; width: 28px; text-align: center;">${mod.icon || '📦'}</span>
                <div>
                  <div style="font-weight: 700; color: #0f172a; font-size: 13.5px;">${this.escapeHtml(mod.name)}</div>
                  <div style="font-size: 11px; color: #64748b; font-family: monospace;">Module ID: ${mod.id} • ${this.escapeHtml(mod.category || 'Engineering Suite')}</div>
                </div>
              </div>
            </td>
            <!-- Admin (Full Root Access) -->
            <td style="text-align: center; padding: 12px 8px; background: rgba(37,99,235,0.02);">
              <label style="display: inline-flex; align-items: center; justify-content: center; cursor: not-allowed; width: 100%; height: 100%;">
                <input type="checkbox" checked disabled title="Administrators have root access to all modules" style="width: 18px; height: 18px; accent-color: #2563eb; cursor: not-allowed;" />
              </label>
            </td>
            <!-- Lead Engineer -->
            <td style="text-align: center; padding: 12px 8px; background: rgba(5,150,105,0.02);">
              <label style="display: inline-flex; align-items: center; justify-content: center; cursor: pointer; width: 100%; height: 100%;">
                <input type="checkbox" ${isLeadChecked ? 'checked' : ''} onchange="window.adminPanel.toggleMatrixCell('lead_engineer', '${mod.id}', this.checked)" style="width: 18px; height: 18px; accent-color: #059669; cursor: pointer;" title="Toggle ${this.escapeHtml(mod.name)} for Lead Engineer" />
              </label>
            </td>
            <!-- Plant Inspector -->
            <td style="text-align: center; padding: 12px 8px; background: rgba(217,119,6,0.02);">
              <label style="display: inline-flex; align-items: center; justify-content: center; cursor: pointer; width: 100%; height: 100%;">
                <input type="checkbox" ${isInspChecked ? 'checked' : ''} onchange="window.adminPanel.toggleMatrixCell('inspector', '${mod.id}', this.checked)" style="width: 18px; height: 18px; accent-color: #d97706; cursor: pointer;" title="Toggle ${this.escapeHtml(mod.name)} for Inspector" />
              </label>
            </td>
            <!-- General Viewer -->
            <td style="text-align: center; padding: 12px 8px; background: rgba(100,116,139,0.02);">
              <label style="display: inline-flex; align-items: center; justify-content: center; cursor: pointer; width: 100%; height: 100%;">
                <input type="checkbox" ${isViewChecked ? 'checked' : ''} onchange="window.adminPanel.toggleMatrixCell('viewer', '${mod.id}', this.checked)" style="width: 18px; height: 18px; accent-color: #475569; cursor: pointer;" title="Toggle ${this.escapeHtml(mod.name)} for Viewer" />
              </label>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    toggleMatrixCell(role, moduleId, checked) {
      if (!this.roleMatrixState) this.roleMatrixState = {};
      if (!this.roleMatrixState[role]) this.roleMatrixState[role] = {};
      this.roleMatrixState[role][moduleId] = checked;
    },

    filterRoleMatrix(query) {
      this.matrixSearchQuery = query || "";
      this.renderRoleMatrixTable();
    },

    async saveRoleMatrix() {
      const saveBtn = document.getElementById("btnSaveRoleMatrix");
      const origText = saveBtn ? saveBtn.innerHTML : "";
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = "⏳ Saving Matrix...";
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await fetch(`/api/admin?action=save_role_matrix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_role_matrix",
            callerEmail,
            matrix: this.roleMatrixState
          })
        });

        const data = await res.json();
        if (data.success) {
          this.showToast(data.message || "Roles & permissions matrix successfully saved.", "success");
          // Refresh user list so Viewer, Inspector, etc. counts reflect updated matrix immediately
          await this.loadUsers();
          this.renderRolesConfigCards();
        } else {
          this.showToast(data.error || "Failed to save permissions matrix.", "error");
        }
      } catch (err) {
        this.showToast(`Error saving matrix: ${err.message}`, "error");
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText;
        }
      }
    },

    async resetRoleMatrix() {
      if (!confirm("Are you sure you want to reset the Roles & Permissions matrix to system defaults?")) return;

      try {
        const callerEmail = this.getCallerEmail();
        const res = await fetch(`/api/admin?action=reset_role_matrix`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset_role_matrix", callerEmail })
        });
        const data = await res.json();
        if (data.success && data.matrix) {
          this.roleMatrixState = data.matrix;
          this.renderRoleMatrixTable();
          await this.loadUsers();
          this.showToast("Role matrix reset to standard engineering defaults.", "success");
        }
      } catch (err) {
        this.showToast(`Reset error: ${err.message}`, "error");
      }
    },

    // ========================================================================
    // 🔒 ACCESS CONTROL VIEW METHODS
    // ========================================================================
    renderAccessControlTable() {
      const tbody = document.getElementById("admAccessControlTbody");
      if (!tbody) return;

      if (!this.users || this.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #94a3b8;">No users registered yet.</td></tr>`;
        return;
      }

      let html = "";
      this.users.forEach(u => {
        const email = u.email;
        const isRoot = !!u.isSuperAdmin || (u.role === "admin" && u.isProtected);
        const isDisabled = !!u.disabled;

        const statusBadge = isDisabled
          ? `<span class="adm-status-badge adm-status-expired">🔴 Suspended / Disabled</span>`
          : `<span class="adm-status-badge adm-status-active">🟢 Active & Authorized</span>`;

        const actionBtn = isRoot
          ? `<span style="font-size: 11px; color: #94a3b8; font-weight: 600;">Root Protected</span>`
          : `<button class="adm-btn adm-btn-sm ${isDisabled ? 'adm-btn-primary' : 'adm-btn-secondary'}" onclick="window.adminPanel.toggleUserLockout('${email}', ${!isDisabled})">
              ${isDisabled ? '🔓 Activate Account' : '🔒 Suspend Account'}
            </button>`;

        html += `
          <tr>
            <td>
              <div class="adm-cell-title" style="font-weight: 600;">${email}</div>
              <div class="adm-cell-muted" style="font-size: 11px;">UID: ${u.uid || "firestore-doc"}</div>
            </td>
            <td>
              <span class="adm-pill role-${u.role || 'viewer'}">${u.role || 'viewer'}</span>
            </td>
            <td>${statusBadge}</td>
            <td>${actionBtn}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },

    async toggleUserLockout(email, shouldDisable) {
      const callerEmail = this.getCallerEmail();
      const actionName = shouldDisable ? "Suspend" : "Activate";

      this.confirmAction(
        `${actionName} Account`,
        `Are you sure you want to ${actionName.toLowerCase()} account access for ${email}?`,
        async () => {
          try {
            const res = await this.adminFetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_user",
                callerEmail,
                user: { email, disabled: shouldDisable }
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Operation failed");

            this.showToast(`User ${email} ${shouldDisable ? 'suspended' : 'activated'} successfully.`, "success");
            await this.loadUsers();
            this.renderAccessControlTable();
          } catch (err) {
            this.showToast(`Failed: ${err.message}`, "error");
          }
        }
      );
    },

    // ========================================================================
    // ▦ PERMISSION MATRIX VIEW METHODS
    // ========================================================================
    matrixPermissions: null,

    renderPermissionMatrix() {
      const tbody = document.getElementById("admPermissionMatrixTbody");
      if (!tbody) return;

      const moduleList = (this.availableModules && this.availableModules.length > 0)
        ? this.availableModules
        : ((window.RBAC && Array.isArray(window.RBAC.availableModules)) ? window.RBAC.availableModules : []);

      if (moduleList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: #94a3b8;">No modules currently configured.</td></tr>`;
        return;
      }

      if (!this.matrixPermissions) {
        this.matrixPermissions = {
          lead_engineer: [],
          inspector: [],
          viewer: []
        };
        const rState = this.roleMatrixState;
        moduleList.forEach(m => {
          if (rState && rState.lead_engineer && rState.lead_engineer[m.id]) this.matrixPermissions.lead_engineer.push(m.id);
          else if (!rState && m.id !== "adminControlCenter") this.matrixPermissions.lead_engineer.push(m.id);

          if (rState && rState.inspector && rState.inspector[m.id]) this.matrixPermissions.inspector.push(m.id);
          if (rState && rState.viewer && rState.viewer[m.id]) this.matrixPermissions.viewer.push(m.id);
        });
      }

      let html = "";
      moduleList.forEach(mod => {
        const modId = mod.id;
        const modName = mod.icon ? `${mod.icon} ${mod.name}` : (mod.name || modId);
        const isEng = this.matrixPermissions.lead_engineer && this.matrixPermissions.lead_engineer.includes(modId);
        const isInsp = this.matrixPermissions.inspector && this.matrixPermissions.inspector.includes(modId);
        const isView = this.matrixPermissions.viewer && this.matrixPermissions.viewer.includes(modId);

        html += `
          <tr>
            <td>
              <span>${modName}</span>
            </td>
            <td>
              <input type="checkbox" checked disabled class="adm-matrix-checkbox" title="Administrators have full root access to all modules" />
            </td>
            <td>
              <input type="checkbox" ${isEng ? 'checked' : ''} onchange="window.adminPanel.togglePermissionMatrixCell('${modId}', 'lead_engineer')" class="adm-matrix-checkbox" />
            </td>
            <td>
              <input type="checkbox" ${isInsp ? 'checked' : ''} onchange="window.adminPanel.togglePermissionMatrixCell('${modId}', 'inspector')" class="adm-matrix-checkbox" />
            </td>
            <td>
              <input type="checkbox" ${isView ? 'checked' : ''} onchange="window.adminPanel.togglePermissionMatrixCell('${modId}', 'viewer')" class="adm-matrix-checkbox" />
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    },

    togglePermissionMatrixCell(moduleId, role) {
      if (!this.matrixPermissions || !this.matrixPermissions[role]) return;
      const list = this.matrixPermissions[role];
      const idx = list.indexOf(moduleId);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(moduleId);
      }
    },

    async savePermissionMatrix() {
      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_firestore_doc",
            callerEmail,
            collectionName: "systemMeta",
            docId: "rolePermissionMatrix",
            data: {
              roles: this.matrixPermissions,
              updatedAt: Date.now(),
              updatedBy: callerEmail
            }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save matrix");

        this.showToast("Permission Matrix successfully updated in Firestore!", "success");
      } catch (err) {
        this.showToast(`Failed to save matrix: ${err.message}`, "error");
      }
    },

    // ========================================================================
    // 🎛️ APPLICATION MANAGER HUB BADGES
    // ========================================================================
    updateAppHubBadges() {
      const bDms = document.getElementById("admHubDmCountBadge");
      if (bDms) bDms.textContent = `${this.damageMechanisms?.length || 68} Mechanisms`;

      const bStreams = document.getElementById("admHubStreamCountBadge");
      if (bStreams) bStreams.textContent = "Live Datasets";

      const bStress = document.getElementById("admHubStressCountBadge");
      if (bStress) bStress.textContent = "Master Curves";
    },

    // ========================================================================
    // 📊 STREAM DATA MANAGER VIEW METHODS
    // ========================================================================
    streamDatasets: [],

    async loadStreamDatasetsAdmin() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admStreamDatasetsTbody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">Loading Stream Datasets from Cloud Firestore...</td></tr>`;
      }

      try {
        const res = await fetch(`/api/admin?action=get_stream_datasets&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.datasets) {
          this.streamDatasets = data.datasets;
          this.renderStreamDatasetsTable();

          const badge = document.getElementById("admBadgeStreamsCount");
          if (badge) badge.textContent = data.datasets.length || "0";
        }
      } catch (err) {
        console.warn("loadStreamDatasetsAdmin error:", err);
      }
    },

    renderStreamDatasetsTable() {
      const tbody = document.getElementById("admStreamDatasetsTbody");
      if (!tbody) return;

      if (!this.streamDatasets || this.streamDatasets.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 28px; color: #94a3b8;">
              No custom stream datasets saved yet. Use the Ingestion sandbox above or the default plant stream library.
            </td>
          </tr>
        `;
        return;
      }

      let html = "";
      this.streamDatasets.forEach(d => {
        const streamCount = d.streams ? Object.keys(d.streams).length : (d.streamCount || 0);
        const dateStr = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : (d.createdAt || "Recent");

        html += `
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${this.escapeHtml(d.title || d.name || "Untitled Dataset")}</div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">ID: ${d.id}</div>
            </td>
            <td>
              <span class="adm-pill" style="background: rgba(37,99,235,0.08); color: #2563eb; font-weight:700;">${streamCount} Streams</span>
            </td>
            <td>${dateStr}</td>
            <td>
              <span class="adm-status-badge adm-status-active">☁️ Synced</span>
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.loadDatasetIntoComparator('${d.id}')" title="Load into User-Facing Comparator">
                  📂 Load
                </button>
                <button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.deleteStreamDatasetAdmin('${d.id}', '${this.escapeHtml(d.title || d.id).replace(/'/g, "\\'")}')" title="Delete dataset permanently">
                  🗑️ Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },

    loadDatasetIntoComparator(id) {
      if (window.StreamComparator && typeof window.StreamComparator.loadDatasetById === "function") {
        window.StreamComparator.loadDatasetById(id);
        this.showToast(`Dataset loaded into Process Stream Comparator.`, "success");
      }
    },

    openStreamUploadModal() {
      const fileInput = document.getElementById("admStreamFileInput");
      if (fileInput) fileInput.click();
    },

    downloadStreamTemplate() {
      if (window.StreamComparator && typeof window.StreamComparator.downloadExcelTemplate === "function") {
        window.StreamComparator.downloadExcelTemplate();
      } else {
        window.location.href = "/api/admin?action=get_overview";
      }
    },

    async onStreamFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      this.showToast(`Ingesting stream & component sheet: ${file.name}...`, "info");

      try {
        let parsedDataset = null;
        if (window.StreamComparator && typeof window.StreamComparator.handleFileUpload === "function") {
          parsedDataset = await window.StreamComparator.handleFileUpload(file);
        } else if (typeof XLSX !== "undefined") {
          parsedDataset = await this.parseStreamFileDirectly(file);
        }

        if (parsedDataset && parsedDataset.streams && parsedDataset.streams.length > 0) {
          if (!parsedDataset.title || parsedDataset.title.includes("Untitled")) {
            parsedDataset.title = file.name.replace(/\.[^/.]+$/, "");
          }
          this.activeStreamDataset = parsedDataset;
          const streamCount = parsedDataset.streams.length;
          const componentSet = new Set();
          parsedDataset.streams.forEach(s => {
            if (s.components) {
              Object.keys(s.components).forEach(c => componentSet.add(c));
            }
          });
          const compCount = componentSet.size;

          const titleEl = document.getElementById("admActiveStreamDatasetTitle");
          if (titleEl) {
            titleEl.innerHTML = `<strong>${this.escapeHtml(parsedDataset.title)}</strong> &nbsp;<span style="font-size: 13px; font-weight: 500; color: #16a34a;">(${streamCount} Streams, ${compCount} Components extracted)</span>`;
          }

          // Show live stream table preview immediately
          this.renderActiveStreamPreview(parsedDataset);

          // Enable rename dataset button upon upload
          const renameBtn = document.getElementById("admRenameStreamBtn");
          if (renameBtn) renameBtn.disabled = false;

          this.showToast(`✅ Ingested ${streamCount} streams & ${compCount} components from '${file.name}'! Review preview below and click "Save to Firestore" to save.`, "success");
        } else {
          throw new Error("No process stream rows or columns found in sheet.");
        }
      } catch (err) {
        console.error("Stream ingestion error:", err);
        this.showToast(`Stream sheet ingestion error: ${err.message}`, "error");
      }
    },

    renderActiveStreamPreview(dataset) {
      const container = document.getElementById("admStreamLivePreviewContainer");
      const countTag = document.getElementById("admLiveStreamCountTag");
      const tbody = document.getElementById("admStreamLivePreviewTbody");
      if (!container || !tbody) return;

      if (!dataset || !dataset.streams || dataset.streams.length === 0) {
        container.style.display = "none";
        return;
      }

      container.style.display = "block";
      if (countTag) countTag.textContent = `${dataset.streams.length} Streams (RPTU Certified HMB)`;

      let html = "";
      dataset.streams.forEach((s, idx) => {
        const compsCount = s.components ? Object.keys(s.components).length : 0;
        const propsCount = s.properties ? Object.keys(s.properties).length : 0;
        const temp = s.tempC ?? s.properties?.["Temperature (°C)"] ?? s.properties?.["Temperature"] ?? "—";
        const press = s.pressKgCm2 ?? s.properties?.["Pressure (kg/cm2 (g))"] ?? s.properties?.["Pressure (kg/cm²g)"] ?? "—";
        const molar = s.molarFlow ?? s.properties?.["Flow Molar (kg-mol/hr)"] ?? "—";

        const hasMass = s.massFlow !== null && s.massFlow !== undefined && !isNaN(s.massFlow);
        const isValid = hasMass && (compsCount > 0 || propsCount > 0 || temp !== "—");
        const statusBadge = isValid 
          ? `<span class="adm-status-badge adm-status-active" title="Valid HMB Stream">🟢 Valid HMB</span>` 
          : `<span class="adm-status-badge adm-status-warning" title="Incomplete parameters">⚠️ Incomplete</span>`;

        html += `
          <tr>
            <td style="font-weight: 700; color: #2563eb; font-family: monospace;">#${idx + 1} &nbsp; Stream ${this.escapeHtml(s.streamNo || '—')}</td>
            <td style="font-weight: 600; color: #0f172a;">${this.escapeHtml(s.streamName || s.content || "Process HMB Stream")}</td>
            <td><span class="adm-pill" style="background: #e2e8f0; color: #334155;">${this.escapeHtml(s.content || s.properties?.["Content / Phase"] || "Fluid Phase")}</span></td>
            <td><strong>${this.formatNum(s.massFlow)}</strong> kg/hr</td>
            <td>${molar !== "—" ? this.formatNum(molar) + " kg-mol/h" : "—"}</td>
            <td>${temp} °C</td>
            <td>${press} kg/cm²</td>
            <td>${compsCount > 0 ? compsCount + " Comps" : (propsCount > 0 ? propsCount + " Props" : "—")}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },

    formatNum(num) {
      if (num === null || num === undefined || isNaN(num)) return "0";
      return Number(num).toLocaleString();
    },

    async promptRenameActiveStream() {
      const dataset = this.activeStreamDataset || (window.StreamComparator && window.StreamComparator.getCurrentDataset ? window.StreamComparator.getCurrentDataset() : null);
      if (!dataset) {
        this.showToast("No active stream dataset loaded to rename.", "warning");
        return;
      }

      const currentTitle = dataset.title || "Refinery HMB Case Study";
      const newTitle = prompt("Enter new title / name for this process stream dataset:", currentTitle);
      if (!newTitle || !newTitle.trim()) return;

      dataset.title = newTitle.trim();
      this.activeStreamDataset = dataset;

      const titleEl = document.getElementById("admActiveStreamDatasetTitle");
      if (titleEl) {
        titleEl.innerHTML = `<strong>${this.escapeHtml(dataset.title)}</strong> &nbsp;<span style="font-size: 13px; font-weight: 500; color: #16a34a;">(${dataset.streams.length} Streams)</span>`;
      }

      // Sync updated title to Firestore immediately
      await this.commitActiveStreamToFirestore(true);
      this.showToast(`Dataset successfully renamed to "${dataset.title}"!`, "success");
    },

    async parseStreamFileDirectly(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            let aggregatedDataset = null;

            for (let i = 0; i < workbook.SheetNames.length; i++) {
              const sheetName = workbook.SheetNames[i];
              const worksheet = workbook.Sheets[sheetName];
              const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
              if (rawJson && rawJson.length >= 2) {
                try {
                  if (window.StreamComparator && typeof window.StreamComparator.extractStreamsFromTableRows === "function") {
                    const ds = window.StreamComparator.extractStreamsFromTableRows(rawJson, `${file.name} - ${sheetName}`);
                    if (ds && ds.streams && ds.streams.length > 0) {
                      aggregatedDataset = ds;
                      break;
                    }
                  }
                } catch (err) {}
              }
            }
            if (aggregatedDataset) {
              resolve(aggregatedDataset);
            } else {
              reject(new Error("Could not detect stream tables in Excel sheets."));
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsArrayBuffer(file);
      });
    },

    async commitActiveStreamToFirestore(promptRename = false, showToastNote = true) {
      const dataset = this.activeStreamDataset || (window.StreamComparator && window.StreamComparator.getCurrentDataset ? window.StreamComparator.getCurrentDataset() : null);
      if (!dataset || !dataset.streams || dataset.streams.length === 0) {
        this.showToast("No active stream dataset loaded to save. Please ingest an Excel file first.", "warning");
        return;
      }

      const callerEmail = this.getCallerEmail();
      const defaultTitle = dataset.title || "Refinery HMB Stream Balance";

      let titleToSave = defaultTitle;
      if (promptRename && typeof Swal !== "undefined" && Swal.fire) {
        const { value: formValues, isConfirmed } = await Swal.fire({
          title: "💾 Save Dataset to Firestore",
          html: `
            <div style="text-align: left; font-size: 13.5px; color: #475569; margin-bottom: 8px;">
              Enter a descriptive title for this process stream dataset:
            </div>
            <input id="swalAdminDatasetTitle" class="swal2-input" placeholder="e.g. Refinery CDU Stream Balance" value="${this.escapeHtml(defaultTitle)}" style="font-size: 14px; width: 85%;">
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: "Save to Cloud",
          confirmButtonColor: "#16a34a",
          cancelButtonText: "Cancel",
          preConfirm: () => {
            const el = document.getElementById("swalAdminDatasetTitle");
            const val = el ? el.value.trim() : "";
            if (!val) {
              Swal.showValidationMessage("Please provide a dataset name");
              return false;
            }
            return val;
          }
        });

        if (!isConfirmed || !formValues) return;
        titleToSave = formValues;
      }

      dataset.title = titleToSave;
      this.activeStreamDataset = dataset;

      const titleEl = document.getElementById("admActiveStreamDatasetTitle");
      if (titleEl) {
        titleEl.innerHTML = `<strong>${this.escapeHtml(dataset.title)}</strong> &nbsp;<span style="font-size: 13px; font-weight: 500; color: #16a34a;">(${dataset.streams.length} Streams)</span>`;
      }

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_stream_dataset",
            callerEmail,
            dataset: {
              ...dataset,
              title: titleToSave
            }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save to Firestore failed");

        // Enable rename button once saved to cloud
        const renameBtn = document.getElementById("admRenameStreamBtn");
        if (renameBtn) renameBtn.disabled = false;

        if (showToastNote) {
          this.showToast(`☁️ Dataset '${titleToSave}' successfully committed to Firestore!`, "success");
        }
        await this.loadStreamDatasetsAdmin();
      } catch (err) {
        console.error("Commit stream error:", err);
        this.showToast(`Failed to save dataset: ${err.message}`, "error");
      }
    },

    exportStreamDatasetExcel() {
      if (window.StreamComparator && typeof window.StreamComparator.exportFullDatasetToExcel === "function") {
        window.StreamComparator.exportFullDatasetToExcel();
      } else {
        this.showToast("Exporting stream data...", "info");
      }
    },

    loadDatasetIntoComparator(id) {
      if (!id) return;
      if (window.StreamComparator && typeof window.StreamComparator.loadDatasetById === "function") {
        window.StreamComparator.loadDatasetById(id);
        this.showToast(`Dataset loaded into Process Stream Comparator!`, "success");
        if (typeof showStreamComparatorTab === "function") {
          showStreamComparatorTab();
        }
      } else {
        this.showToast(`Dataset '${id}' selected. Navigate to Stream Comparator tab to compare.`, "info");
      }
    },

    async deleteStreamDatasetAdmin(datasetId, datasetTitle = "") {
      const targetName = datasetTitle || datasetId;
      if (typeof Swal !== "undefined" && Swal.fire) {
        const { value: confirmText, isConfirmed } = await Swal.fire({
          title: "🗑️ Delete Master Stream Dataset",
          html: `
            <div style="text-align: left; font-size: 13.5px; color: #475569; margin-bottom: 8px;">
              To permanently delete dataset <strong>"${this.escapeHtml(targetName)}"</strong> from Firestore, please type <code>${this.escapeHtml(datasetId)}</code> below to confirm:
            </div>
            <input id="swalDeleteConfirmInput" class="swal2-input" placeholder="Type dataset ID to confirm" style="font-size: 14px; width: 85%;">
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: "Permanently Delete",
          confirmButtonColor: "#dc2626",
          cancelButtonText: "Cancel",
          preConfirm: () => {
            const val = document.getElementById("swalDeleteConfirmInput")?.value.trim();
            if (val !== datasetId) {
              Swal.showValidationMessage(`Confirmation ID does not match ("${datasetId}")`);
              return false;
            }
            return val;
          }
        });

        if (!isConfirmed || !confirmText) return;
      } else {
        const typed = prompt(`Type dataset ID "${datasetId}" to confirm deletion:`);
        if (typed !== datasetId) {
          this.showToast("Deletion cancelled: confirmation ID did not match.", "warning");
          return;
        }
      }

      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_stream_dataset",
            callerEmail,
            id: datasetId
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");

        this.showToast(`Dataset '${datasetId}' deleted successfully.`, "success");
        await this.loadStreamDatasetsAdmin();
      } catch (err) {
        this.showToast(`Error: ${err.message}`, "error");
      }
    },

    // ========================================================================
    // 🧮 ALLOWABLE STRESS MANAGER VIEW METHODS
    // ========================================================================
    stressManagerYears: [],
    stagedStressRecords: [],

    switchStressAdminSubtab(tab) {
      const btnYear = document.getElementById("admStressSubtabBtn_year");
      const btnBulk = document.getElementById("admStressSubtabBtn_bulk");
      const paneYear = document.getElementById("admStressPane_year");
      const paneBulk = document.getElementById("admStressPane_bulk");

      if (tab === "bulk") {
        if (btnYear) btnYear.classList.remove("active");
        if (btnBulk) btnBulk.classList.add("active");
        if (paneYear) paneYear.style.display = "none";
        if (paneBulk) paneBulk.style.display = "block";
        if (typeof window.initStressDataLoaderEvents === "function") {
          window.initStressDataLoaderEvents();
        }
      } else {
        if (btnYear) btnYear.classList.add("active");
        if (btnBulk) btnBulk.classList.remove("active");
        if (paneYear) paneYear.style.display = "block";
        if (paneBulk) paneBulk.style.display = "none";
        if (typeof window.renderYearManagerList === "function") {
          window.renderYearManagerList();
        } else {
          this.loadStressManagerAdmin();
        }
      }
      this.enforceAllowableStressPermissions();
    },

    enforceAllowableStressPermissions() {
      const isAdm = this.isAdmin();
      const hasTabYear = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_tab_year_mgr"));
      const hasTabBulk = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_tab_bulk_loader"));
      const hasActAdd = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_add"));
      const hasActExport = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_export"));
      const hasActDelete = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_delete"));

      const btnYear = document.getElementById("admStressSubtabBtn_year");
      const btnBulk = document.getElementById("admStressSubtabBtn_bulk");
      if (btnYear) btnYear.style.display = hasTabYear ? "inline-flex" : "none";
      if (btnBulk) btnBulk.style.display = hasTabBulk ? "inline-flex" : "none";

      if (!hasTabYear && hasTabBulk) {
        const paneYear = document.getElementById("admStressPane_year");
        const paneBulk = document.getElementById("admStressPane_bulk");
        if (btnYear) btnYear.classList.remove("active");
        if (btnBulk) btnBulk.classList.add("active");
        if (paneYear) paneYear.style.display = "none";
        if (paneBulk) paneBulk.style.display = "block";
      } else if (hasTabYear && !hasTabBulk) {
        const paneYear = document.getElementById("admStressPane_year");
        const paneBulk = document.getElementById("admStressPane_bulk");
        if (btnYear) btnYear.classList.add("active");
        if (btnBulk) btnBulk.classList.remove("active");
        if (paneYear) paneYear.style.display = "block";
        if (paneBulk) paneBulk.style.display = "none";
      }

      const addBtn = document.getElementById("admStressAddYearBtn");
      const expAllBtn = document.getElementById("admStressExportAllBtn");
      const expCurrBtn = document.getElementById("admStressExportCurrentBtn");

      if (addBtn) {
        if (hasActAdd) {
          addBtn.removeAttribute("disabled");
          addBtn.style.opacity = "1";
          addBtn.style.cursor = "pointer";
          addBtn.style.pointerEvents = "auto";
          addBtn.title = "Add Code Edition Year";
        } else {
          addBtn.setAttribute("disabled", "true");
          addBtn.style.opacity = "0.45";
          addBtn.style.cursor = "not-allowed";
          addBtn.style.pointerEvents = "none";
          addBtn.title = "Add permission restricted by Administrator";
        }
      }

      if (expAllBtn) {
        if (hasActExport) {
          expAllBtn.removeAttribute("disabled");
          expAllBtn.style.opacity = "1";
          expAllBtn.style.cursor = "pointer";
          expAllBtn.style.pointerEvents = "auto";
          expAllBtn.title = "Export active database to Excel";
        } else {
          expAllBtn.setAttribute("disabled", "true");
          expAllBtn.style.opacity = "0.45";
          expAllBtn.style.cursor = "not-allowed";
          expAllBtn.style.pointerEvents = "none";
          expAllBtn.title = "Export restricted by Administrator";
        }
      }

      if (expCurrBtn) {
        if (hasActExport) {
          expCurrBtn.removeAttribute("disabled");
          expCurrBtn.style.opacity = "1";
          expCurrBtn.style.cursor = "pointer";
          expCurrBtn.style.pointerEvents = "auto";
          expCurrBtn.title = "Export active database to Excel";
        } else {
          expCurrBtn.setAttribute("disabled", "true");
          expCurrBtn.style.opacity = "0.45";
          expCurrBtn.style.cursor = "not-allowed";
          expCurrBtn.style.pointerEvents = "none";
          expCurrBtn.title = "Export restricted by Administrator";
        }
      }

      // Also enforce individual buttons in Year cards list
      const yearCardsContainer = document.getElementById("stressYearCardsList");
      if (yearCardsContainer) {
        yearCardsContainer.querySelectorAll("button").forEach(b => {
          const text = (b.textContent || "").toLowerCase();
          if (text.includes("export")) {
            if (hasActExport) {
              b.removeAttribute("disabled");
              b.style.opacity = "1";
              b.style.cursor = "pointer";
              b.style.pointerEvents = "auto";
              b.style.filter = "none";
            } else {
              b.setAttribute("disabled", "true");
              b.style.opacity = "0.45";
              b.style.cursor = "not-allowed";
              b.style.pointerEvents = "none";
              b.style.filter = "grayscale(1)";
              b.title = "Export permission restricted by Administrator";
            }
          }
          if (text.includes("delete")) {
            if (hasActDelete) {
              b.removeAttribute("disabled");
              b.style.opacity = "1";
              b.style.cursor = "pointer";
              b.style.pointerEvents = "auto";
              b.style.filter = "none";
            } else {
              b.setAttribute("disabled", "true");
              b.style.opacity = "0.45";
              b.style.cursor = "not-allowed";
              b.style.pointerEvents = "none";
              b.style.filter = "grayscale(1)";
              b.title = "Delete permission restricted by Administrator";
            }
          }
        });
      }
    },

    async loadStressManagerAdmin() {
      if (typeof window.renderYearManagerList === "function") {
        window.renderYearManagerList();
      }
      if (typeof window.updateAdminRoleIndicator === "function") {
        window.updateAdminRoleIndicator();
      }
      if (typeof window.initStressDataLoaderEvents === "function") {
        window.initStressDataLoaderEvents();
      }
      if (typeof window.refreshStressDataFromCloud === "function") {
        window.refreshStressDataFromCloud();
      }

      // Enforce granular action & tab permissions
      this.enforceAllowableStressPermissions();
    },

    renderStressYearsList() {
      if (typeof window.renderYearManagerList === "function") {
        window.renderYearManagerList();
        return;
      }
      const listEl = document.getElementById("stressYearCardsList") || document.getElementById("admStressYearCardsList");
      if (!listEl) return;

      const isAdm = this.isAdmin();
      const hasActDelete = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_delete"));

      if (!this.stressManagerYears || this.stressManagerYears.length === 0) {
        const db = window.bkGetStressDatabase ? window.bkGetStressDatabase() : window.bkStressData;
        const years = db ? Object.keys(db) : ["2022"];
        this.stressManagerYears = years.map(y => ({
          year: y,
          materialsCount: db && db[y] ? Object.keys(db[y]).length : 12,
          gradesCount: 48,
          sampleMaterials: ["A106", "A312 TP304", "A335 P11"]
        }));
      }

      let html = "";
      this.stressManagerYears.forEach(y => {
        html += `
          <div class="adm-app-card" style="padding: 16px 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 20px;">📘</span>
                  <span style="font-size: 16px; font-weight: 800; color: #0f172a;">ASME B31.3 Edition Year ${y.year}</span>
                  <span class="adm-status-badge adm-status-active">Active Edition</span>
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                  Includes <strong>${y.materialsCount}</strong> unique materials • <strong>${y.gradesCount}</strong> temperature curve records.
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.switchStressAdminSubtab('bulk')">
                  📥 Add Records
                </button>
                ${
                  hasActDelete
                    ? `<button class="adm-btn adm-btn-sm adm-btn-danger" onclick="window.adminPanel.deleteStressYearAdmin('${y.year}')">
                         🗑️ Delete Edition
                       </button>`
                    : `<button class="adm-btn adm-btn-sm adm-btn-danger" disabled style="opacity: 0.45; cursor: not-allowed; filter: grayscale(1); pointer-events: none;" title="Delete restricted by Admin">
                         🗑️ Delete Edition
                       </button>`
                }
              </div>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;
    },

    promptAddNewStressYear() {
      const isAdm = this.isAdmin();
      const hasActAdd = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_add"));
      if (!hasActAdd) {
        alert("⚠️ Permission Denied: You do not have permission to add code edition years.");
        return;
      }
      const year = prompt("Enter 4-digit code edition year to add (e.g. 2024):");
      if (!year || !/^\d{4}$/.test(year.trim())) {
        if (year) alert("Please specify a valid 4-digit edition year.");
        return;
      }

      const callerEmail = this.getCallerEmail();
      this.adminFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_stress_year",
          callerEmail,
          year: year.trim()
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.showToast(`Code Edition ${year} created successfully!`, "success");
          if (typeof window.refreshStressDataFromCloud === "function") {
            window.refreshStressDataFromCloud();
          }
          if (typeof window.renderYearManagerList === "function") {
            window.renderYearManagerList();
          }
          this.loadStressManagerAdmin();
        } else {
          this.showToast(`Failed: ${data.error}`, "error");
        }
      })
      .catch(e => this.showToast(`Error: ${e.message}`, "error"));
    },

    deleteStressYearAdmin(year) {
      const isAdm = this.isAdmin();
      const hasActDelete = isAdm || (window.RBAC && window.RBAC.hasSectionAccess("adminControlCenter", "stress_action_delete"));
      if (!hasActDelete) {
        alert("⚠️ Permission Denied: You do not have permission to delete code edition years.");
        return;
      }
      const callerEmail = this.getCallerEmail();
      this.confirmAction(
        `Delete Code Edition ${year}`,
        `Permanently delete ASME Code Edition Year ${year} and ALL associated material stress curves?`,
        async () => {
          try {
            const res = await this.adminFetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "delete_stress_year",
                callerEmail,
                year
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");

            this.showToast(`Code edition ${year} deleted successfully.`, "success");
            await this.loadStressManagerAdmin();
          } catch (err) {
            this.showToast(`Error: ${err.message}`, "error");
          }
        }
      );
    },

    downloadStressTemplate(format = "xlsx") {
      if (typeof window.downloadStressTemplate === "function") {
        window.downloadStressTemplate(format);
      } else {
        const dummy = [
          { Year: "2022", Material: "A106", Grade: "B", Thickness: ">10mm", Temp: 100, AllowableStress: 137.9 }
        ];
        const ws = XLSX.utils.json_to_sheet(dummy);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "StressData");
        XLSX.writeFile(wb, `Stress_Data_Template.${format}`);
      }
    },

    async onStressBulkFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);

          if (!json || json.length === 0) throw new Error("Empty sheet or invalid table layout");

          this.stagedStressRecords = json;
          const outEl = document.getElementById("admStressValidationOutput");
          const commitBox = document.getElementById("admStressCommitBox");

          if (outEl) {
            outEl.style.display = "block";
            outEl.innerHTML = `
              <div class="adm-code-banner">
                ✅ File <strong>${file.name}</strong> successfully parsed.<br>
                Found <strong>${json.length}</strong> stress curve entries ready for validation and cloud ingestion.
              </div>
            `;
          }
          if (commitBox) commitBox.style.display = "flex";
          this.showToast(`Parsed ${json.length} stress records. Ready to commit.`, "success");
        } catch (err) {
          alert(`Failed to parse file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    },

    async commitStressRecordsToFirestore() {
      if (!this.stagedStressRecords || this.stagedStressRecords.length === 0) {
        alert("No staged stress records to commit");
        return;
      }

      const callerEmail = this.getCallerEmail();
      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk_import_stress_records",
            callerEmail,
            records: this.stagedStressRecords
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Import failed");

        this.showToast(`🎉 ${data.message || "Stress records committed to Firestore!"}`, "success");
        document.getElementById("admStressCommitBox").style.display = "none";
        this.switchStressAdminSubtab("year");
      } catch (err) {
        this.showToast(`Error: ${err.message}`, "error");
      }
    },

    // ========================================================================
    // ⚙️ BACKUP & CLOUD DIAGNOSTICS VIEW METHODS
    // ========================================================================
    async runCloudDiagnostics() {
      const connEl = document.getElementById("admDiagConnStatus");
      const latEl = document.getElementById("admDiagLatency");
      const callerEmail = this.getCallerEmail();

      if (latEl) latEl.textContent = "Pinging server...";
      const start = performance.now();

      try {
        const res = await fetch(`/api/health?t=${Date.now()}`);
        const elapsed = Math.round(performance.now() - start);

        if (res.ok) {
          if (connEl) connEl.innerHTML = `🟢 ONLINE & RESPONSIVE`;
          if (latEl) latEl.textContent = `${elapsed} ms (Optimal)`;
          this.showToast(`Diagnostic check completed: ${elapsed} ms round-trip latency.`, "success");
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch (err) {
        if (connEl) connEl.innerHTML = `🟡 OFFLINE / FALLBACK`;
        if (latEl) latEl.textContent = "Error: " + err.message;
        this.showToast(`Diagnostics failed: ${err.message}`, "error");
      }
    },

    // ========================================================================
    // 📋 SYSTEM LOGS VIEW METHODS
    // ========================================================================
    systemLogs: [],

    async loadSystemLogs() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admSystemLogsTbody");
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">Loading audit records...</td></tr>`;

      try {
        const res = await fetch(`/api/admin?action=get_system_logs&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.logs) {
          this.systemLogs = data.logs;
          this.renderSystemLogsTable(this.systemLogs);
        }
      } catch (err) {
        console.warn("loadSystemLogs error:", err);
      }
    },

    renderSystemLogsTable(logs) {
      const tbody = document.getElementById("admSystemLogsTbody");
      if (!tbody) return;

      if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">No audit logs recorded yet.</td></tr>`;
        return;
      }

      let html = "";
      logs.forEach(l => {
        const dateStr = l.isoDate ? new Date(l.isoDate).toLocaleString() : new Date(l.timestamp || Date.now()).toLocaleString();
        html += `
          <tr>
            <td style="font-size: 11.5px; font-family: monospace;">${dateStr}</td>
            <td style="font-weight: 600;">${this.escapeHtml(l.user || "system")}</td>
            <td><span class="adm-log-badge-action">${this.escapeHtml(l.action || "ACTION")}</span></td>
            <td><span class="adm-log-badge-module">${this.escapeHtml(l.module || "General")}</span></td>
            <td style="font-size: 12px; color: #475569;">${this.escapeHtml(l.recordAffected || "—")}</td>
            <td><span class="${l.status === 'SUCCESS' ? 'adm-log-success' : 'adm-log-fail'}">${l.status || 'SUCCESS'}</span></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },

    onLogSearchInput(val) {
      if (!val) {
        this.renderSystemLogsTable(this.systemLogs);
        return;
      }
      const q = val.toLowerCase().trim();
      const filtered = this.systemLogs.filter(l =>
        (l.user || "").toLowerCase().includes(q) ||
        (l.action || "").toLowerCase().includes(q) ||
        (l.module || "").toLowerCase().includes(q) ||
        (l.recordAffected || "").toLowerCase().includes(q)
      );
      this.renderSystemLogsTable(filtered);
    },

    // ========================================================================
    // 🖥️ LAYOUT & NAVIGATION BUILDER VIEW METHODS
    // ========================================================================
    layoutConfig: null,

    async loadLayoutConfig() {
      const callerEmail = this.getCallerEmail();
      try {
        const res = await fetch(`/api/admin?action=get_layout_config&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.config) {
          this.layoutConfig = data.config;
          window.layoutConfig = data.config;
          try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_layout_config", JSON.stringify(data.config)); } catch (e) {}
          this.renderLayoutBuilderControls();
        }
      } catch (err) {
        console.warn("loadLayoutConfig error:", err);
      }
    },

    async loadAndApplyPublishedLayoutConfig() {
      try {
        const callerEmail = this.getCallerEmail();
        const res = await fetch(`/api/admin?action=get_layout_config&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.config) {
          this.layoutConfig = data.config;
          window.layoutConfig = data.config;
          try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_layout_config", JSON.stringify(data.config)); } catch (e) {}
          this.applyLayoutConfigToDashboard(data.config);
        }
      } catch (err) {
        console.warn("loadAndApplyPublishedLayoutConfig error:", err);
      }
    },

    switchLayoutBuilderSubtab(tab) {
      if (!tab) tab = "sidebar";
      const validTabs = ["sidebar", "order", "visibility", "ticker", "welcome"];
      if (!validTabs.includes(tab)) tab = "sidebar";

      validTabs.forEach(t => {
        const btn = document.getElementById(`admLayoutTabBtn_${t}`);
        const pane = document.getElementById(`admLayoutPane_${t}`);
        if (btn) btn.classList.toggle("active", t === tab);
        if (pane) pane.style.display = t === tab ? "block" : "none";
      });

      // Synchronize Left Sidebar Navigation active link
      const navMap = {
        sidebar: "layout-sidebar",
        order: "layout-order",
        visibility: "layout-visibility",
        ticker: "layout-ticker",
        welcome: "layout-welcome"
      };
      const activeNavKey = navMap[tab] || "layout-sidebar";
      document.querySelectorAll(".adm-nav-item").forEach(item => {
        item.classList.toggle("active", item.getAttribute("data-view") === activeNavKey);
      });

      // Synchronize Breadcrumb text
      const subTitles = {
        sidebar: "Sidebar Configuration",
        order: "Sidebar Order",
        visibility: "Navigation Visibility",
        ticker: "Ticker Text",
        welcome: "Welcome Cards"
      };
      const breadcrumbsEl = document.getElementById("admBreadcrumbs");
      if (breadcrumbsEl) {
        breadcrumbsEl.innerHTML = `
          <span class="adm-breadcrumb-item">⚙️ Admin Control Center</span>
          <span class="adm-breadcrumb-sep">&gt;</span>
          <span class="adm-breadcrumb-item">🖥️ Layout & Navigation Builder</span>
          <span class="adm-breadcrumb-sep">&gt;</span>
          <span class="adm-breadcrumb-item active">${subTitles[tab] || "Sidebar Configuration"}</span>
        `;
      }

      if (this.layoutConfig) {
        this.renderLayoutBuilderControls();
      } else {
        this.loadLayoutConfig();
      }
    },

    renderLayoutConfigUI() {
      return this.renderLayoutBuilderControls();
    },

    renderLayoutBuilderControls() {
      if (!this.layoutConfig) return;

      const modules = this.layoutConfig.sidebarModules || [];

      // ── 1. Sidebar Configuration Pane (Icons & Labels) ─────────────────
      const listEl = document.getElementById("admLayoutSidebarItemsList");
      if (listEl) {
        let html = "";
        modules.forEach((m, idx) => {
          html += `
            <div class="adm-builder-item-row" style="align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <input type="text" value="${m.icon || '📌'}" title="Module Icon Emoji" style="width: 38px; text-align: center; padding: 6px 2px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 6px;" oninput="window.adminPanel.onSidebarItemIconChange(${idx}, this.value)" />
                <div style="flex: 1;">
                  <input type="text" value="${this.escapeHtml(m.label || m.id)}" style="width: 100%; box-sizing: border-box; padding: 6px 10px; font-size: 13px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 6px;" oninput="window.adminPanel.onSidebarItemLabelChange(${idx}, this.value)" />
                  <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    ID: <code>${m.id}</code> • Group: <span style="color: #2563eb; font-weight:600;">${m.group || 'General'}</span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        listEl.innerHTML = html;
      }

      // ── 2. Sidebar Order Pane (Reordering & Move Controls) ───────────────
      const orderListEl = document.getElementById("admLayoutOrderItemsList");
      if (orderListEl) {
        let html = "";
        modules.forEach((m, idx) => {
          html += `
            <div class="adm-builder-item-row" style="align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span class="adm-pill" style="font-family: monospace; font-weight: 800; min-width: 26px; text-align: center; background: #e2e8f0; color: #0f172a;">#${idx + 1}</span>
                <span style="font-size: 18px;">${m.icon || '📌'}</span>
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${this.escapeHtml(m.label || m.id)}</div>
                  <div style="font-size: 11px; color: #64748b;">${m.group || 'Module'}</div>
                </div>
              </div>
              <div class="adm-builder-reorder-btns">
                <button type="button" class="adm-builder-reorder-btn" onclick="window.adminPanel.moveSidebarItemToTop(${idx})" title="Move to Top" style="width: auto; padding: 0 6px; font-size: 10px; font-weight: 700;">TOP</button>
                <button type="button" class="adm-builder-reorder-btn" onclick="window.adminPanel.moveSidebarItem(${idx}, -1)" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
                <button type="button" class="adm-builder-reorder-btn" onclick="window.adminPanel.moveSidebarItem(${idx}, 1)" title="Move Down" ${idx === modules.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
              </div>
            </div>
          `;
        });
        orderListEl.innerHTML = html;
      }

      // ── 3. Navigation Visibility Pane (Module Toggles & Role Tags) ──────
      const visListEl = document.getElementById("admLayoutVisibilityItemsList");
      if (visListEl) {
        let html = "";
        modules.forEach((m, idx) => {
          const isVis = m.visible !== false;
          html += `
            <div class="adm-builder-item-row" style="align-items: center; justify-content: space-between; gap: 12px; background: ${isVis ? '#ffffff' : '#f8fafc'}; opacity: ${isVis ? '1' : '0.75'};">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="font-size: 18px;">${m.icon || '📌'}</span>
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${this.escapeHtml(m.label || m.id)}</div>
                  <div style="display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap;">
                    ${(m.roles || ['admin']).map(r => `<span class="adm-pill role-${r}" style="font-size: 10px; padding: 1px 6px;">${r}</span>`).join('')}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="adm-status-badge ${isVis ? 'adm-status-active' : 'adm-status-inactive'}">
                  ${isVis ? '🟢 Visible' : '⚪ Hidden'}
                </span>
                <button type="button" class="adm-btn adm-btn-sm ${isVis ? 'adm-btn-secondary' : 'adm-btn-primary'}" onclick="window.adminPanel.toggleSidebarItemVisibility(${idx})" style="min-width: 75px;">
                  ${isVis ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          `;
        });
        visListEl.innerHTML = html;
      }

      // ── 4. Ticker Text Pane ─────────────────────────────────────────────
      const tickerInput = document.getElementById("admLayoutTickerInput");
      if (tickerInput) tickerInput.value = this.layoutConfig.tickerText || "";
      const tickerEnabled = document.getElementById("admLayoutTickerEnabled");
      if (tickerEnabled) tickerEnabled.checked = this.layoutConfig.tickerEnabled !== false;
      const tickerUrgency = document.getElementById("admLayoutTickerUrgency");
      if (tickerUrgency && this.layoutConfig.tickerUrgency) tickerUrgency.value = this.layoutConfig.tickerUrgency;

      const liveSim = document.getElementById("admLayoutTickerLiveSim");
      if (liveSim) {
        const uName = this.getFormattedUserPrefix();
        liveSim.textContent = this.formatTickerTextWithUser(this.layoutConfig.tickerText, uName);
      }

      // ── 5. Welcome Cards Pane ───────────────────────────────────────────
      const welcomeList = document.getElementById("admLayoutWelcomeCardsList");
      if (welcomeList && this.layoutConfig.welcomeCards) {
        const totalCards = this.layoutConfig.welcomeCards.length;
        const activeCards = this.layoutConfig.welcomeCards.filter(c => c.enabled !== false).length;
        let html = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; background: #f1f5f9; padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; font-size: 13px; color: #1e293b;">Total Welcome Cards: <strong>${totalCards}</strong></span>
              <span style="font-size: 11px; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 999px; font-weight: 700;">🟢 Active: ${activeCards}</span>
              <span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 999px; font-weight: 700;">⚪ Inactive: ${totalCards - activeCards}</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.setAllWelcomeCardsEnabled(true)" title="Enable all welcome cards">
                ✅ Enable All
              </button>
              <button type="button" class="adm-btn adm-btn-sm adm-btn-secondary" onclick="window.adminPanel.setAllWelcomeCardsEnabled(false)" title="Disable all welcome cards">
                ⚪ Disable All
              </button>
              <button type="button" class="adm-btn adm-btn-sm adm-btn-primary" onclick="window.adminPanel.saveLayoutConfiguration()" style="font-weight: 700;">
                💾 Save &amp; Apply Welcome Cards
              </button>
            </div>
          </div>
        `;
        this.layoutConfig.welcomeCards.forEach((c, idx) => {
          const isEn = c.enabled !== false;
          const isModVis = typeof window.isModuleLayoutVisible === "function" 
            ? window.isModuleLayoutVisible(c.targetTab, this.layoutConfig) 
            : true;
          html += `
            <div class="adm-builder-item-row" data-card-idx="${idx}" style="flex-direction: column; align-items: stretch; gap: 8px; margin-bottom: 12px; background: ${isEn && isModVis ? '#ffffff' : '#f8fafc'}; border: 1px solid ${isEn ? '#cbd5e1' : '#e2e8f0'}; border-radius: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 20px;">${c.icon || '🎴'}</span>
                  <span style="font-weight: 700; font-size: 13.5px; color: #0f172a;">${this.escapeHtml(c.title)}</span>
                  <span style="font-size: 11px; color: #64748b; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">Module: ${c.targetTab || c.id}</span>
                  ${isEn ? '<span style="font-size: 11px; color: #16a34a; font-weight: 700;">🟢 Active</span>' : '<span style="font-size: 11px; color: #94a3b8; font-weight: 700;">⚪ Inactive</span>'}
                  ${!isModVis ? '<span class="adm-status-badge adm-status-inactive" style="font-size: 10px; padding: 2px 6px;">⚪ Module Hidden in Navigation Visibility</span>' : ''}
                </div>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; cursor: pointer; background: ${isEn ? '#eff6ff' : '#f1f5f9'}; padding: 4px 10px; border-radius: 6px; border: 1px solid ${isEn ? '#bfdbfe' : '#e2e8f0'};">
                  <input type="checkbox" class="adm-card-toggle-inp" ${isEn ? 'checked' : ''} onchange="window.adminPanel.toggleWelcomeCardEnabled(${idx})" />
                  Card Enabled
                </label>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px;">
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">Card Title</label>
                  <input type="text" class="adm-card-title-inp" value="${this.escapeHtml(c.title)}" placeholder="Card Title" style="width: 100%; box-sizing: border-box; padding: 6px 10px; font-size: 12.5px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 4px;" oninput="window.adminPanel.onWelcomeCardTitleChange(${idx}, this.value)" />
                </div>
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">Card Description / Subtitle</label>
                  <input type="text" class="adm-card-sub-inp" value="${this.escapeHtml(c.subtitle || '')}" placeholder="Card Description/Subtitle" style="width: 100%; box-sizing: border-box; padding: 6px 10px; font-size: 12.5px; border: 1px solid #cbd5e1; border-radius: 4px;" oninput="window.adminPanel.onWelcomeCardSubtitleChange(${idx}, this.value)" />
                </div>
              </div>
            </div>
          `;
        });
        html += `
          <div style="margin-top: 14px; text-align: right;">
            <button type="button" class="adm-btn adm-btn-primary" onclick="window.adminPanel.saveLayoutConfiguration()" style="font-weight: 700; padding: 8px 18px;">
              💾 Save &amp; Apply Welcome Cards
            </button>
          </div>
        `;
        welcomeList.innerHTML = html;
      }

      // ── 6. Live Layout Preview Box ─────────────────────────────────────
      this.renderLayoutPreview();
    },

    syncWelcomeCardInputsFromDOM() {
      const welcomeList = document.getElementById("admLayoutWelcomeCardsList");
      if (welcomeList && this.layoutConfig?.welcomeCards) {
        const rows = welcomeList.querySelectorAll(".adm-builder-item-row[data-card-idx]");
        rows.forEach((row) => {
          const idx = parseInt(row.getAttribute("data-card-idx"), 10);
          if (!isNaN(idx) && this.layoutConfig.welcomeCards[idx]) {
            const titleInp = row.querySelector("input.adm-card-title-inp");
            const subInp = row.querySelector("input.adm-card-sub-inp");
            const checkInp = row.querySelector("input.adm-card-toggle-inp");
            if (titleInp) this.layoutConfig.welcomeCards[idx].title = titleInp.value.trim();
            if (subInp) this.layoutConfig.welcomeCards[idx].subtitle = subInp.value.trim();
            if (checkInp) this.layoutConfig.welcomeCards[idx].enabled = checkInp.checked;
          }
        });
      }
    },

    moveSidebarItem(idx, dir) {
      if (!this.layoutConfig || !this.layoutConfig.sidebarModules) return;
      const list = this.layoutConfig.sidebarModules;
      const target = idx + dir;
      if (target < 0 || target >= list.length) return;
      const temp = list[idx];
      list[idx] = list[target];
      list[target] = temp;
      this.renderLayoutBuilderControls();
      // Instantly preview reordering on live dashboard
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      this.showToast(`↕️ Moved "${temp.label || temp.id}" to position #${target + 1}. Remember to click "Save & Publish Layout" to persist.`, "info");
    },

    moveSidebarItemToTop(idx) {
      if (!this.layoutConfig || !this.layoutConfig.sidebarModules || idx <= 0) return;
      const list = this.layoutConfig.sidebarModules;
      const [item] = list.splice(idx, 1);
      list.unshift(item);
      this.renderLayoutBuilderControls();
      // Instantly preview reordering on live dashboard
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      this.showToast(`🔝 Moved "${item.label || item.id}" to #1 (Top). Remember to click "Save & Publish Layout" to persist.`, "info");
    },

    toggleSidebarItemVisibility(idx) {
      if (!this.layoutConfig?.sidebarModules?.[idx]) return;
      const mod = this.layoutConfig.sidebarModules[idx];
      mod.visible = !mod.visible;
      window.layoutConfig = this.layoutConfig;
      this.renderLayoutBuilderControls();
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      this.showToast(mod.visible ? `🟢 "${mod.label || mod.id}" is now Visible. Click "Save Visibility" to persist.` : `⚪ "${mod.label || mod.id}" is now Hidden. Click "Save Visibility" to persist.`, "info");
    },

    setAllModulesVisibility(visible) {
      if (!this.layoutConfig || !this.layoutConfig.sidebarModules) return;
      this.layoutConfig.sidebarModules.forEach(m => m.visible = visible);
      window.layoutConfig = this.layoutConfig;
      this.renderLayoutBuilderControls();
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      this.showToast(visible ? "All modules marked Visible. Click Save to persist." : "All modules marked Hidden. Click Save to persist.", "info");
    },

    toggleWelcomeCardEnabled(idx) {
      if (!this.layoutConfig?.welcomeCards?.[idx]) return;
      this.syncWelcomeCardInputsFromDOM();
      this.layoutConfig.welcomeCards[idx].enabled = !this.layoutConfig.welcomeCards[idx].enabled;
      this.renderLayoutBuilderControls();
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      const c = this.layoutConfig.welcomeCards[idx];
      this.showToast(c.enabled ? `🟢 Card "${c.title}" is now Enabled. Click "Save Welcome Cards" to persist.` : `⚪ Card "${c.title}" is now Hidden. Click "Save Welcome Cards" to persist.`, "info");
    },

    setAllWelcomeCardsEnabled(enabled) {
      if (!this.layoutConfig?.welcomeCards) return;
      this.syncWelcomeCardInputsFromDOM();
      this.layoutConfig.welcomeCards.forEach(c => c.enabled = enabled);
      this.renderLayoutBuilderControls();
      this.applyLayoutConfigToDashboard(this.layoutConfig);
      this.showToast(enabled ? "All welcome cards marked Enabled. Click Save to persist." : "All welcome cards marked Disabled. Click Save to persist.", "info");
    },

    onWelcomeCardTitleChange(idx, val) {
      if (!this.layoutConfig?.welcomeCards?.[idx]) return;
      this.layoutConfig.welcomeCards[idx].title = val;
      this.applyLayoutConfigToDashboard(this.layoutConfig);
    },

    onWelcomeCardSubtitleChange(idx, val) {
      if (!this.layoutConfig?.welcomeCards?.[idx]) return;
      this.layoutConfig.welcomeCards[idx].subtitle = val;
      this.applyLayoutConfigToDashboard(this.layoutConfig);
    },

    onSidebarItemLabelChange(idx, val) {
      if (!this.layoutConfig?.sidebarModules?.[idx]) return;
      this.layoutConfig.sidebarModules[idx].label = val;
      this.renderLayoutPreview();
    },

    onSidebarItemIconChange(idx, val) {
      if (!this.layoutConfig?.sidebarModules?.[idx]) return;
      this.layoutConfig.sidebarModules[idx].icon = val;
      this.renderLayoutPreview();
    },

    getFormattedUserPrefix() {
      let raw = "";
      if (window.RBAC && window.RBAC.userEmail) {
        raw = window.RBAC.userEmail;
      } else if (typeof sessionStorage !== "undefined") {
        raw = (window.APP_SESSION && window.APP_SESSION.email) ? window.APP_SESSION.email.split("@")[0].toUpperCase() : (sessionStorage.getItem("usernameUpper") || sessionStorage.getItem("loggedInUser") || "");
      }
      if (!raw && typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
        raw = firebase.auth().currentUser.email || "";
      }
      if (!raw) raw = this.getCallerEmail() || "";
      if (!raw) return "";
      const namePart = raw.includes("@") ? raw.split("@")[0] : raw;
      return namePart.trim().toUpperCase();
    },

    formatTickerTextWithUser(text, usernameUpper) {
      if (!text) text = "Welcome to API 571 Damage Mechanism Dashboard & Industrial Digital Tools";
      const uName = (usernameUpper || this.getFormattedUserPrefix() || "").trim().toUpperCase();
      if (uName && /\{user(?:name)?\}/i.test(text)) {
        return text.replace(/\{user(?:name)?\}/gi, uName);
      }
      return text;
    },

    onTickerInputChange(val) {
      if (!this.layoutConfig) return;
      this.layoutConfig.tickerText = val;
      const uName = this.getFormattedUserPrefix();
      const formatted = this.formatTickerTextWithUser(val, uName);
      const sim = document.getElementById("admLayoutTickerLiveSim");
      if (sim) sim.textContent = formatted || "Top Announcement Preview...";
      const prevBar = document.getElementById("admPreviewTickerBar");
      if (prevBar) prevBar.textContent = formatted || "Top Announcement Preview...";
      const scrollText = document.getElementById("scrollText");
      if (scrollText) scrollText.textContent = formatted;
    },

    onTickerToggleChange(checked) {
      if (!this.layoutConfig) return;
      this.layoutConfig.tickerEnabled = checked;
      const prevBar = document.getElementById("admPreviewTickerBar");
      if (prevBar) {
        prevBar.style.opacity = checked ? "1" : "0.35";
        prevBar.style.textDecoration = checked ? "none" : "line-through";
      }
    },

    onTickerUrgencyChange(val) {
      if (!this.layoutConfig) return;
      this.layoutConfig.tickerUrgency = val;
      const prevBar = document.getElementById("admPreviewTickerBar");
      if (prevBar) {
        if (val === "critical") prevBar.style.color = "#ef4444";
        else if (val === "urgent") prevBar.style.color = "#f59e0b";
        else prevBar.style.color = "#38bdf8";
      }
    },

    renderLayoutPreview() {
      // 1. Ticker Bar Preview
      const prevTicker = document.getElementById("admPreviewTickerBar");
      if (prevTicker && this.layoutConfig) {
        const uName = this.getFormattedUserPrefix();
        prevTicker.textContent = this.formatTickerTextWithUser(this.layoutConfig.tickerText, uName);
        prevTicker.style.opacity = this.layoutConfig.tickerEnabled !== false ? "1" : "0.35";
        prevTicker.style.textDecoration = this.layoutConfig.tickerEnabled !== false ? "none" : "line-through";
      }

      // 2. Sidebar Mock Preview
      const previewEl = document.getElementById("admLayoutSidebarPreview");
      if (!previewEl || !this.layoutConfig?.sidebarModules) return;

      let html = "";
      this.layoutConfig.sidebarModules.forEach(m => {
        if (m.visible === false) return;
        html += `
          <div class="adm-preview-item">
            <span>${m.icon || '📌'}</span>
            <span style="font-weight: 500;">${this.escapeHtml(m.label || m.id)}</span>
          </div>
        `;
      });
      previewEl.innerHTML = html;
    },

    async saveLayoutConfiguration() {
      if (!this.layoutConfig) return;
      const callerEmail = this.getCallerEmail();

      // Read current input values from Sidebar Items List if open to ensure typed text is captured
      const listEl = document.getElementById("admLayoutSidebarItemsList");
      if (listEl && this.layoutConfig?.sidebarModules) {
        const rows = listEl.querySelectorAll(".adm-builder-item-row");
        rows.forEach((row, idx) => {
          if (this.layoutConfig.sidebarModules[idx]) {
            const iconInp = row.querySelector("input[title='Module Icon Emoji']");
            const labelInp = row.querySelector("input[type='text']:not([title='Module Icon Emoji'])");
            if (iconInp && iconInp.value) this.layoutConfig.sidebarModules[idx].icon = iconInp.value.trim();
            if (labelInp && labelInp.value) this.layoutConfig.sidebarModules[idx].label = labelInp.value.trim();
          }
        });
      }

      // Read welcome cards input values from DOM
      this.syncWelcomeCardInputsFromDOM();

      // Read ticker values from inputs
      const tickerInput = document.getElementById("admLayoutTickerInput");
      if (tickerInput) this.layoutConfig.tickerText = tickerInput.value;
      const tickerEnabled = document.getElementById("admLayoutTickerEnabled");
      if (tickerEnabled) this.layoutConfig.tickerEnabled = tickerEnabled.checked;
      const tickerUrgency = document.getElementById("admLayoutTickerUrgency");
      if (tickerUrgency) this.layoutConfig.tickerUrgency = tickerUrgency.value;

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_layout_config",
            callerEmail,
            config: this.layoutConfig
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Save failed");

        if (data.config) {
          this.layoutConfig = data.config;
          window.layoutConfig = data.config;
          try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_layout_config", JSON.stringify(data.config)); } catch (e) {}
        }

        // Immediately propagate published layout to live dashboard & physical categoryList
        this.applyLayoutConfigToDashboard(this.layoutConfig);
        this.renderLayoutBuilderControls();

        this.showToast("🎉 Layout configuration and welcome cards successfully saved & published to live dashboard!", "success");
      } catch (err) {
        this.showToast(`Failed to publish layout: ${err.message}`, "error");
      }
    },

    applyLayoutConfigToDashboard(config) {
      if (!config || window.__isApplyingSidebarLayout) return;
      window.layoutConfig = config;
      try { if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cached_layout_config", JSON.stringify(config)); } catch (e) {}

      // 1. Ticker text & container visibility & color styling
      const scrollText = document.getElementById("scrollText");
      const scrollContainer = document.querySelector(".scroll-container");
      const tickerRaw = (config && config.tickerText && config.tickerText.trim()) 
        ? config.tickerText 
        : "Welcome to API 571 Damage Mechanism Dashboard & Industrial Digital Tools";

      if (scrollText) {
        const uName = this.getFormattedUserPrefix();
        scrollText.textContent = this.formatTickerTextWithUser(tickerRaw, uName);
        if (config && config.tickerUrgency === "critical") {
          scrollText.style.color = "#ef4444";
          scrollText.style.fontWeight = "bold";
        } else if (config && config.tickerUrgency === "urgent") {
          scrollText.style.color = "#f59e0b";
          scrollText.style.fontWeight = "bold";
        } else {
          scrollText.style.color = "";
          scrollText.style.fontWeight = "";
        }
      }
      if (scrollContainer) {
        scrollContainer.style.display = config.tickerEnabled !== false ? "block" : "none";
      }

      const isUserAdmin = this.isAdmin();

      // Ensure Tools category is injected if needed
      if (typeof window.injectToolsCategory === "function" && !document.getElementById("rbac_cat_tools")) {
        window.injectToolsCategory();
      }

      // 2. Sidebar modules visibility & Physical DOM Reordering of #categoryList
      if (config.sidebarModules && Array.isArray(config.sidebarModules)) {
        // A. Toggle visibility with strict RBAC enforcement via generic data-rbac-module attributes
        config.sidebarModules.forEach(m => {
          const modId = m.id;
          const selector = `#categoryList li[data-rbac-module="${modId}"], #categoryList [data-rbac-module="${modId}"], #rbac_cat_${modId}${modId === 'adminControlCenter' ? ', #rbac_cat_tools' : ''}${modId === 'damageExplorer' ? ', #categoryList li.category-toggle:not([id^="rbac_cat_"])' : ''}${modId === 'thicknessCalc' ? ', #rbac_cat_designThickness' : ''}`;
          const elements = document.querySelectorAll(selector);
          const rbacAllowed = isUserAdmin || (window.RBAC && typeof window.RBAC.hasModuleAccess === "function" ? window.RBAC.hasModuleAccess(modId) : true);
          const shouldShow = m.visible !== false && rbacAllowed;

          elements.forEach(targetEl => {
            if (!shouldShow) {
              targetEl.style.setProperty("display", "none", "important");
              targetEl.setAttribute("data-rbac-hidden", "true");
            } else {
              targetEl.style.removeProperty("display");
              targetEl.removeAttribute("data-rbac-hidden");
            }
          });

          // Special sub-item filtering for Tools category
          if (m.id === "adminControlCenter") {
            const toolsEl = document.getElementById("rbac_cat_tools");
            if (toolsEl) {
              if (!shouldShow) {
                toolsEl.style.setProperty("display", "none", "important");
                toolsEl.setAttribute("data-rbac-hidden", "true");
              } else {
                const subLis = toolsEl.querySelectorAll("li[data-rbac-sub]");
                let anySubAllowed = isUserAdmin;
                subLis.forEach(sLi => {
                  const subId = sLi.getAttribute("data-rbac-sub");
                  const hasSub = isUserAdmin || (window.RBAC && typeof window.RBAC.hasSectionAccess === "function" ? window.RBAC.hasSectionAccess("adminControlCenter", subId) : false);
                  if (hasSub) {
                    sLi.style.removeProperty("display");
                    sLi.removeAttribute("data-rbac-hidden");
                    anySubAllowed = true;
                  } else {
                    sLi.style.setProperty("display", "none", "important");
                    sLi.setAttribute("data-rbac-hidden", "true");
                  }
                });

                if (anySubAllowed) {
                  toolsEl.style.removeProperty("display");
                  toolsEl.removeAttribute("data-rbac-hidden");
                } else {
                  toolsEl.style.setProperty("display", "none", "important");
                  toolsEl.setAttribute("data-rbac-hidden", "true");
                }
              }
            }
          }
        });

        // B. Physical DOM Reordering of #categoryList direct children & Label/Icon application
        const categoryList = document.getElementById("categoryList");
        if (categoryList && categoryList.children.length > 0) {
          const directLis = Array.from(categoryList.children);
          const targetOrderedLis = [];

          config.sidebarModules.forEach(m => {
            let matchedLi = null;

            if (m.id === "damageExplorer" || m.id === "damageMechanisms") {
              const dmgLis = directLis.filter(li => (li.classList.contains("category-toggle") && !li.id) || li.getAttribute("data-rbac-module") === "damageExplorer");
              const isAllowedDmg = isUserAdmin || (window.RBAC && typeof window.RBAC.hasModuleAccess === "function" ? window.RBAC.hasModuleAccess("damageExplorer") : true);
              const shouldShowDmg = m.visible !== false && isAllowedDmg;
              dmgLis.forEach(dLi => {
                if (!shouldShowDmg) {
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
              matchedLi = directLis.find(li => li.id === `rbac_cat_${m.id}` || li.id === `rbac_cat_${m.id === 'cracking' ? 'crackingMechanism' : m.id}` || (m.id === "adminControlCenter" && li.id === "rbac_cat_tools"));
              if (!matchedLi) matchedLi = directLis.find(li => li.getAttribute("data-rbac-module") === m.id || li.getAttribute("data-rbac-module") === (m.id === "cracking" ? "crackingMechanism" : (m.id === "crackingMechanism" ? "cracking" : m.id)));
              if (!matchedLi) {
                if (m.id === "thicknessCalc" || m.id === "designThickness" || m.id === "b313") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_thicknessCalc" || li.id === "rbac_cat_designThickness" || li.getAttribute("data-rbac-module") === "thicknessCalc");
                } else if (m.id === "cracking" || m.id === "crackingMechanism") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_cracking" || li.id === "rbac_cat_crackingMechanism" || li.getAttribute("data-rbac-module") === "crackingMechanism" || li.getAttribute("data-rbac-module") === "cracking");
                } else if (m.id === "bkStress") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_bkStress" || li.getAttribute("data-rbac-module") === "bkStress");
                } else if (m.id === "streamComparator") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_streamComparator" || li.getAttribute("data-rbac-module") === "streamComparator");
                } else if (m.id === "chemicalSuite") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_chemicalSuite" || li.getAttribute("data-rbac-module") === "chemicalSuite");
                } else if (m.id === "unitConverter") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_unitConverter" || li.getAttribute("data-rbac-module") === "unitConverter");
                } else if (m.id === "processFlow") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_processFlow" || li.getAttribute("data-rbac-module") === "processFlow");
                } else if (m.id === "rptu") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_rptu" || li.getAttribute("data-rbac-module") === "rptu");
                } else if (m.id === "ccdAI") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_ccdAI" || li.getAttribute("data-rbac-module") === "ccdAI");
                } else if (m.id === "api570" || m.id === "remainingLife") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_api570" || li.getAttribute("data-rbac-module") === "api570");
                } else if (m.id === "api581") {
                  matchedLi = directLis.find(li => li.id === "rbac_cat_api581" || li.getAttribute("data-rbac-module") === "api581");
                }
              }

              if (matchedLi && !targetOrderedLis.includes(matchedLi)) {
                targetOrderedLis.push(matchedLi);
              }
            }

            // Apply custom label and icon cleanly in-place
            if (matchedLi && m.label) {
              const catHeader = matchedLi.querySelector(".category");
              if (catHeader) {
                const titleSpan = catHeader.querySelector(".category-title");
                const iconPrefix = m.icon ? (m.icon + " ") : "";
                let labelText = (m.label || "").trim();
                if (m.icon && labelText.startsWith(m.icon)) {
                  labelText = labelText.substring(m.icon.length).trim();
                }
                const displayTitle = (iconPrefix + labelText).trim();

                let arrowSpan = catHeader.querySelector(".arrow");
                let currentArrow = (arrowSpan && arrowSpan.textContent.trim()) ? arrowSpan.textContent.trim() : "▸";

                if (titleSpan) {
                  if (titleSpan.textContent !== displayTitle) {
                    titleSpan.textContent = displayTitle;
                  }
                  if (!arrowSpan) {
                    const newArrow = document.createElement("span");
                    newArrow.className = "arrow";
                    newArrow.textContent = currentArrow;
                    catHeader.insertBefore(newArrow, catHeader.firstChild);
                  }
                } else {
                  catHeader.innerHTML = `<span class="arrow">${currentArrow}</span><span class="category-title">${displayTitle}</span>`;
                }
              }
            }
          });

          // Check if current DOM order already matches target order
          const currentChildren = Array.from(categoryList.children);
          let orderDiffers = false;
          if (currentChildren.length !== targetOrderedLis.length) {
            orderDiffers = true;
          } else {
            for (let i = 0; i < targetOrderedLis.length; i++) {
              if (currentChildren[i] !== targetOrderedLis[i]) {
                orderDiffers = true;
                break;
              }
            }
          }

          // ONLY perform DOM mutation if order is genuinely different
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

          if (typeof window.ensureAllSidebarArrows === "function") {
            window.ensureAllSidebarArrows();
          }
        }
      }

      // 3. Welcome Cards & Quick Access with Visibility as single source of truth + RBAC enforcement
      const welcomeCards = document.querySelectorAll("#welcomePanel .dash-card[data-rbac-module], #welcomePanel .info-card[data-rbac-module]");
      let visibleWelcomeCardCount = 0;
      welcomeCards.forEach(cardEl => {
        const modId = cardEl.getAttribute("data-rbac-module");
        let shouldShow = typeof window.isWelcomeCardVisible === "function"
          ? window.isWelcomeCardVisible(modId, config, isUserAdmin ? "admin" : "engineer", (m) => window.RBAC?.hasModuleAccess(m))
          : (typeof window.isModuleLayoutVisible === "function" ? window.isModuleLayoutVisible(modId, config) : true);

        if (typeof window.isModuleLayoutVisible === "function" && !window.isModuleLayoutVisible(modId, config)) {
          shouldShow = false;
        }

        if (shouldShow) {
          cardEl.style.removeProperty("display");
          cardEl.removeAttribute("data-rbac-hidden");
          visibleWelcomeCardCount++;
        } else {
          cardEl.style.setProperty("display", "none", "important");
          cardEl.setAttribute("data-rbac-hidden", "true");
        }

        const welcomeCardCfg = config.welcomeCards && Array.isArray(config.welcomeCards)
          ? config.welcomeCards.find(c => c.targetTab === modId || c.id === modId || c.id === `card_${modId}` || (modId === "cracking" && c.targetTab === "crackingMechanism") || (modId === "crackingMechanism" && c.targetTab === "cracking"))
          : null;

        if (welcomeCardCfg) {
          if (welcomeCardCfg.title) {
            const h = cardEl.querySelector("h3, h4, .dash-card-title");
            if (h) h.textContent = welcomeCardCfg.title;
          }
          if (welcomeCardCfg.subtitle !== undefined) {
            const p = cardEl.querySelector("p, .dash-card-desc");
            if (p) p.textContent = welcomeCardCfg.subtitle;
          }
        }
      });

      if (typeof window.updateDashboardCardCounts === "function") {
        window.updateDashboardCardCounts();
      }

      // 4. Re-apply fine-grained RBAC sidebar visibility to guarantee leaf & sub-tree consistency
      if (window.RBAC && typeof window.RBAC.applySidebarVisibility === "function") {
        window.RBAC.applySidebarVisibility();
      }
    },

    resetLayoutDefaults() {
      this.confirmAction(
        "Reset Layout to Defaults",
        "Restore all menu labels, ordering, ticker text, and welcome cards to system factory defaults?",
        async () => {
          try {
            const callerEmail = this.getCallerEmail();
            const res = await this.adminFetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_layout_config",
                callerEmail,
                config: null // will trigger default config creation
              })
            });
            const data = await res.json();
            if (data.success && data.config) {
              this.layoutConfig = data.config;
              this.renderLayoutBuilderControls();
              this.applyLayoutConfigToDashboard(this.layoutConfig);
              this.showToast("Layout restored to system defaults.", "info");
            }
          } catch (e) {
            this.showToast(`Reset failed: ${e.message}`, "error");
          }
        }
      );
    },

    // ========================================================================
    // 💾 MASTER DATA, BACKUP & RESTORE METHODS
    // ========================================================================
    stagedRestoreData: null,

    renderMasterOverview() {
      this.updateAppHubBadges();
      const dmEl = document.getElementById("admMasterDmCountBadge");
      if (dmEl) dmEl.textContent = `${this.damageMechanisms?.length || 68} Records`;
    },

    renderMasterBackup() {
      // Nothing special required, initial view
    },

    renderMasterRestore() {
      this.stagedRestoreData = null;
      const preview = document.getElementById("admRestorePreviewContainer");
      if (preview) preview.style.display = "none";
    },

    downloadSelectiveBackup() {
      const cDms = document.getElementById("admBackupCheck_dms")?.checked !== false;
      const cStreams = document.getElementById("admBackupCheck_streams")?.checked !== false;
      const cStress = document.getElementById("admBackupCheck_stress")?.checked !== false;
      const cUsers = document.getElementById("admBackupCheck_users")?.checked !== false;

      const callerEmail = this.getCallerEmail();
      this.adminFetch(`/api/admin?action=export_backup&callerEmail=${encodeURIComponent(callerEmail)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.success || !data.backup) throw new Error("Failed to export backup");
          const selective = {};
          if (cDms) selective.customDamageMechanisms = data.backup.customDamageMechanisms;
          if (cStreams) selective.streamDatasets = data.backup.streamDatasets;
          if (cStress) selective.stressData = data.backup.stressData;
          if (cUsers) {
            selective.userRoles = data.backup.userRoles;
            selective.userSessions = data.backup.userSessions;
          }

          const blob = new Blob([JSON.stringify(selective, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const dateTag = new Date().toISOString().split("T")[0];
          a.href = url;
          a.download = `KayetDMS_Selective_Backup_${dateTag}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          this.showToast("Selective JSON backup downloaded.", "success");
        })
        .catch(e => this.showToast(`Backup error: ${e.message}`, "error"));
    },

    onRestoreFileSelected(files) {
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          this.stagedRestoreData = json;

          const dmsCount = json.customDamageMechanisms ? Object.keys(json.customDamageMechanisms).length : 0;
          const streamCount = json.streamDatasets ? (Array.isArray(json.streamDatasets) ? json.streamDatasets.length : Object.keys(json.streamDatasets).length) : 0;
          const stressYears = json.stressData ? Object.keys(json.stressData).length : 0;
          const usersCount = json.userRoles ? (Array.isArray(json.userRoles) ? json.userRoles.length : Object.keys(json.userRoles).length) : 0;

          const detailsEl = document.getElementById("admRestoreSummaryDetails");
          if (detailsEl) {
            detailsEl.innerHTML = `
              <strong>File:</strong> ${file.name}<br>
              <strong>Detected Payload:</strong><br>
              • API 571 Damage Mechanisms: <strong>${dmsCount}</strong> records<br>
              • Process Stream Datasets: <strong>${streamCount}</strong> datasets<br>
              • Allowable Stress Database: <strong>${stressYears}</strong> code editions<br>
              • User Profiles & Roles: <strong>${usersCount}</strong> user records
            `;
          }

          const preview = document.getElementById("admRestorePreviewContainer");
          if (preview) preview.style.display = "block";
          this.showToast("Backup file validated successfully.", "info");
        } catch (err) {
          alert(`Invalid backup JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    },

    confirmAndExecuteRestore() {
      if (!this.stagedRestoreData) return;
      const callerEmail = this.getCallerEmail();

      this.confirmAction(
        "Execute Master Database Restore",
        "Restoring backup data will update master Firestore collections. Existing matching records will be updated. Proceed?",
        async () => {
          try {
            const res = await this.adminFetch("/api/admin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "restore_backup",
                callerEmail,
                backup: this.stagedRestoreData
              })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Restore failed");

            this.showToast(`🎉 ${data.message || "Database restored successfully!"}`, "success");
            await this.loadAll();
            this.navigateTo("master-overview");
          } catch (err) {
            this.showToast(`Restore failed: ${err.message}`, "error");
          }
        }
      );
    },

    backupHistory: [],

    async loadBackupHistory() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admBackupHistoryTbody");
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">Loading backup history...</td></tr>`;

      try {
        const res = await fetch(`/api/admin?action=get_backup_history&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (data.success && data.history) {
          this.backupHistory = data.history;
          this.renderBackupHistoryTable();
        }
      } catch (err) {
        console.warn("loadBackupHistory error:", err);
      }
    },

    renderBackupHistoryTable() {
      const tbody = document.getElementById("admBackupHistoryTbody");
      if (!tbody) return;

      if (!this.backupHistory || this.backupHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;">No backup history records logged yet.</td></tr>`;
        return;
      }

      let html = "";
      this.backupHistory.forEach(b => {
        html += `
          <tr>
            <td>${b.timestamp || "Recent"}</td>
            <td><span class="adm-pill" style="font-weight:700;">${b.version || "v1.0"}</span></td>
            <td>${this.escapeHtml(b.user || "admin")}</td>
            <td>${this.escapeHtml(b.collections || "All Collections")}</td>
            <td>${b.size || "1.2 MB"}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },

    loadAuditTrail() {
      const callerEmail = this.getCallerEmail();
      const tbody = document.getElementById("admAuditTrailTbody");
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">Loading master audit trail...</td></tr>`;

      fetch(`/api/admin?action=get_audit_logs&callerEmail=${encodeURIComponent(callerEmail)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.logs) {
            let html = "";
            data.logs.forEach(l => {
              const dateStr = l.isoDate ? new Date(l.isoDate).toLocaleString() : new Date(l.timestamp || Date.now()).toLocaleString();
              html += `
                <tr>
                  <td style="font-size: 11.5px; font-family: monospace;">${dateStr}</td>
                  <td style="font-weight: 600;">${this.escapeHtml(l.user || "system")}</td>
                  <td><span class="adm-log-badge-action">${this.escapeHtml(l.action)}</span></td>
                  <td><span class="adm-log-badge-module">${this.escapeHtml(l.module || "Master Data")}</span></td>
                  <td style="font-size: 12px; color: #475569;">${this.escapeHtml(l.recordAffected || "—")}</td>
                  <td><span class="${l.status === 'SUCCESS' ? 'adm-log-success' : 'adm-log-fail'}">${l.status || 'SUCCESS'}</span></td>
                </tr>
              `;
            });
            tbody.innerHTML = html;
          }
        })
        .catch(e => console.warn("loadAuditTrail error:", e));
    },

    // -------------------------------------------------------------
    // 🔄 PROJECT & WORKSPACE SWITCHER
    // -------------------------------------------------------------
    async loadProjectsList() {
      try {
        const callerEmail = this.getCallerEmail();
        const res = await fetch(`/api/admin?action=get_projects&callerEmail=${encodeURIComponent(callerEmail)}`);
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load projects list.");
        }
        this.projectsData = data;
        this.renderProjectsView(data);
      } catch (err) {
        console.error("loadProjectsList error:", err);
        this.showToast(`Error loading projects: ${err.message}`, "error");
      }
    },

    renderProjectsView(data) {
      const activeProj = data.activeProject || {};
      const allProjects = data.availableProjects || [];
      const activeWs = data.activeWorkspace || {};
      const allWorkspaces = data.availableWorkspaces || [];

      // Update Nav Badges
      const navBadge = document.getElementById("admActiveProjectNavBadge");
      if (navBadge) {
        navBadge.textContent = activeProj.id || activeProj.projectId || "loginapp-feb72";
      }

      // Update Hero Banner
      const heroName = document.getElementById("admHeroProjectName");
      if (heroName) heroName.textContent = activeProj.name || activeProj.projectId;

      const heroDesc = document.getElementById("admHeroProjectDesc");
      if (heroDesc) heroDesc.textContent = activeProj.description || "Active Firebase Database Configuration";

      const heroTag = document.getElementById("admHeroProjectTag");
      if (heroTag) heroTag.textContent = activeProj.tag || (activeProj.isDefault ? "Primary / Production" : "Active Profile");

      const heroId = document.getElementById("admHeroProjectId");
      if (heroId) heroId.textContent = activeProj.projectId;

      const heroDb = document.getElementById("admHeroDbId");
      if (heroDb) heroDb.textContent = activeProj.firestoreDatabaseId || "(default)";

      const heroAuth = document.getElementById("admHeroAuthDomain");
      if (heroAuth) heroAuth.textContent = activeProj.authDomain || "—";

      // Render Projects Grid
      const grid = document.getElementById("admProjectsGrid");
      if (grid) {
        grid.innerHTML = allProjects.map(proj => {
          const isActive = proj.projectId === activeProj.projectId;
          const isCustom = !proj.isDefault && proj.id !== "loginapp-feb72";
          return `
            <div class="adm-card" style="border: 2px solid ${isActive ? '#16a34a' : '#e2e8f0'}; background: ${isActive ? '#f0fdf4' : '#ffffff'}; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 6px rgba(0,0,0,0.04); transition: transform 0.2s, box-shadow 0.2s;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                  <span class="adm-pill" style="font-size: 11px; font-weight: 700; background: ${isActive ? '#dcfce7' : '#f1f5f9'}; color: ${isActive ? '#15803d' : '#475569'}; border: 1px solid ${isActive ? '#86efac' : '#cbd5e1'};">
                    ${isActive ? '🟢 CURRENTLY ACTIVE' : (proj.tag || 'Available Project')}
                  </span>
                  ${isCustom ? `
                    <button type="button" class="adm-btn adm-btn-danger adm-btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="window.adminPanel.deleteCustomProject('${proj.id}')" title="Delete custom profile">🗑️</button>
                  ` : ''}
                </div>
                <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${proj.name || proj.projectId}</h4>
                <p style="margin: 0 0 12px 0; font-size: 12.5px; color: #64748b; line-height: 1.4;">${proj.description || ''}</p>
                <div style="background: ${isActive ? '#e2f8e9' : '#f8fafc'}; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}; margin-bottom: 14px;">
                  <div><span style="color:#64748b;">Project ID:</span> <strong>${proj.projectId}</strong></div>
                  <div><span style="color:#64748b;">Database ID:</span> <span style="word-break: break-all;">${proj.firestoreDatabaseId || '(default)'}</span></div>
                  <div><span style="color:#64748b;">Auth Domain:</span> ${proj.authDomain || '—'}</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${isActive ? `
                  <button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" style="flex: 1;" onclick="window.adminPanel.testProjectConnection('${proj.projectId}')">
                    ⚡ Test Health
                  </button>
                  <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" style="flex: 1; background: #16a34a; border-color: #16a34a; cursor: default;" disabled>
                    ✅ Active Project
                  </button>
                ` : `
                  <button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" style="flex: 1;" onclick="window.adminPanel.testProjectConnection('${proj.projectId}')">
                    ⚡ Test Connection
                  </button>
                  <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" style="flex: 1.2;" onclick="window.adminPanel.switchFirebaseProject('${proj.projectId}')">
                    🔄 Switch to This Project
                  </button>
                `}
              </div>
              <div id="admTestResult_${proj.projectId.replace(/[^a-zA-Z0-9]/g, '_')}" style="display:none; margin-top: 10px; font-size: 12px; padding: 6px 10px; border-radius: 4px;"></div>
            </div>
          `;
        }).join('');
      }

      // Render Plant Workspaces Grid
      const wsPill = document.getElementById("admActiveWorkspacePill");
      if (wsPill) {
        wsPill.textContent = `Active: ${activeWs.name || 'Crude Distillation Unit (CDU / VDU)'}`;
      }

      const wsGrid = document.getElementById("admWorkspacesGrid");
      if (wsGrid) {
        wsGrid.innerHTML = allWorkspaces.map(ws => {
          const isWsActive = ws.id === activeWs.id;
          return `
            <div class="adm-card" style="border: 2px solid ${isWsActive ? '#2563eb' : '#e2e8f0'}; background: ${isWsActive ? '#eff6ff' : '#ffffff'}; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="adm-pill" style="font-size: 10.5px; background: ${isWsActive ? '#dbeafe' : '#f1f5f9'}; color: ${isWsActive ? '#1e40af' : '#475569'}; font-weight: 700;">
                    ${isWsActive ? '⭐ ACTIVE UNIT' : ws.unitType}
                  </span>
                  <span style="font-size: 11px; color: #64748b;">${ws.streamCount || 0} Streams</span>
                </div>
                <h5 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">${ws.name}</h5>
                <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #64748b;">Default Fluid: <strong>${ws.defaultFluid}</strong></p>
              </div>
              <div>
                ${isWsActive ? `
                  <button type="button" class="adm-btn adm-btn-secondary adm-btn-sm" style="width: 100%; color: #2563eb; font-weight: 700;" disabled>
                    ✓ Selected Workspace
                  </button>
                ` : `
                  <button type="button" class="adm-btn adm-btn-primary adm-btn-sm" style="width: 100%;" onclick="window.adminPanel.switchPlantWorkspace('${ws.id}')">
                    Activate Workspace
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    },

    async switchFirebaseProject(projectId) {
      const callerEmail = this.getCallerEmail();
      const confirmResult = await Swal.fire({
        title: "Switch Active Firebase Project?",
        html: `Switching to <strong>${projectId}</strong> will immediately rebind the server, database lookups, and engineering datasets to this project.<br><br>Do you want to proceed?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, Switch Project"
      });

      if (!confirmResult.isConfirmed) return;

      try {
        Swal.fire({
          title: "Switching Project...",
          text: "Rebinding Firestore connection and refreshing catalogs...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "switch_project",
            projectId,
            callerEmail
          })
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to switch project.");
        }

        Swal.fire({
          icon: "success",
          title: "Project Switched!",
          text: data.message || `Active project is now ${projectId}.`,
          confirmButtonColor: "#16a34a"
        });

        this.showToast(`Switched active project to ${projectId}`, "success");
        await this.loadProjectsList();

        // Refresh frontend damage mechanisms, categories, and database catalogs
        if (typeof window.loadDamageMechanismsData === "function") {
          try { await window.loadDamageMechanismsData(); } catch (e) {}
        }
        if (typeof this.loadDamageMechanisms === "function") this.loadDamageMechanisms();
        if (typeof this.loadStressManagerAdmin === "function") this.loadStressManagerAdmin();
        if (typeof this.loadStreamDatasetsAdmin === "function") this.loadStreamDatasetsAdmin();
      } catch (err) {
        console.error("switchFirebaseProject error:", err);
        Swal.fire({
          icon: "error",
          title: "Switch Failed",
          text: err.message,
          confirmButtonColor: "#2563eb"
        });
      }
    },

    async syncDataToActiveProject() {
      const activeProj = this.projectsData?.activeProject || { projectId: "loginapp-feb72" };
      const confirmResult = await Swal.fire({
        title: `Sync Datasets to ${activeProj.name || activeProj.projectId}?`,
        html: `This will push all <strong>68 API 571 Damage Mechanisms</strong> and <strong>14 Code Editions of Allowable Stress Data</strong> directly into this project's Firestore database.<br><br>Proceed?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, Sync Now"
      });

      if (!confirmResult.isConfirmed) return;

      try {
        Swal.fire({
          title: "Synchronizing Data...",
          text: `Uploading master catalogs to ${activeProj.projectId}...`,
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync_data_to_project",
            callerEmail
          })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to sync data.");

        Swal.fire({
          icon: "success",
          title: "Data Synchronized!",
          text: data.message,
          confirmButtonColor: "#16a34a"
        });

        this.showToast(data.message, "success");
        if (typeof window.loadDamageMechanismsData === "function") await window.loadDamageMechanismsData();
        if (typeof this.loadDamageMechanisms === "function") this.loadDamageMechanisms();
        if (typeof this.loadProjectsList === "function") this.loadProjectsList();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Sync Error",
          text: err.message,
          confirmButtonColor: "#2563eb"
        });
      }
    },

    async testProjectConnection(projectId) {
      const safeId = projectId.replace(/[^a-zA-Z0-9]/g, '_');
      const resultBox = document.getElementById(`admTestResult_${safeId}`);
      if (resultBox) {
        resultBox.style.display = "block";
        resultBox.style.background = "#eff6ff";
        resultBox.style.color = "#1d4ed8";
        resultBox.style.border = "1px solid #bfdbfe";
        resultBox.innerHTML = `<span>⏳ Testing connection to ${projectId}...</span>`;
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test_project_connection",
            projectId,
            callerEmail
          })
        });
        const data = await res.json();

        if (resultBox) {
          if (data.success) {
            resultBox.style.background = "#f0fdf4";
            resultBox.style.color = "#15803d";
            resultBox.style.border = "1px solid #86efac";
            resultBox.innerHTML = `<strong>✅ Connected:</strong> Latency ${data.latencyMs}ms • Health OK`;
          } else {
            resultBox.style.background = "#fef2f2";
            resultBox.style.color = "#b91c1c";
            resultBox.style.border = "1px solid #fca5a5";
            resultBox.innerHTML = `<strong>❌ Connection Error:</strong> ${data.error || 'Failed to ping project.'}`;
          }
        }
      } catch (err) {
        if (resultBox) {
          resultBox.style.background = "#fef2f2";
          resultBox.style.color = "#b91c1c";
          resultBox.style.border = "1px solid #fca5a5";
          resultBox.innerHTML = `<strong>❌ Network Error:</strong> ${err.message}`;
        }
      }
    },

    async testActiveProjectPing() {
      const activeProj = this.projectsData?.activeProject || { projectId: "loginapp-feb72" };
      const latencyEl = document.getElementById("admHeroLatency");
      if (latencyEl) latencyEl.innerHTML = `<span style="color:#f59e0b;">⏳ Testing ping...</span>`;

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test_project_connection",
            projectId: activeProj.projectId,
            callerEmail
          })
        });
        const data = await res.json();
        if (data.success) {
          if (latencyEl) latencyEl.innerHTML = `● Active (${data.latencyMs} ms) • Healthy`;
          this.showToast(`Ping successful: ${data.latencyMs}ms latency`, "success");
        } else {
          if (latencyEl) latencyEl.innerHTML = `❌ Error: ${data.error || 'Failed'}`;
          this.showToast(`Ping failed: ${data.error}`, "error");
        }
      } catch (err) {
        if (latencyEl) latencyEl.innerHTML = `❌ Ping Error`;
        this.showToast(`Ping error: ${err.message}`, "error");
      }
    },

    async switchPlantWorkspace(workspaceId) {
      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "switch_workspace",
            workspaceId,
            callerEmail
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to switch workspace.");

        this.showToast(`Activated plant workspace: ${data.activeWorkspace?.name}`, "success");
        await this.loadProjectsList();
      } catch (err) {
        this.showToast(`Workspace switch error: ${err.message}`, "error");
      }
    },

    openAddProjectModal() {
      const modal = document.getElementById("admCustomProjectModal");
      if (modal) modal.style.display = "flex";
      const statusBox = document.getElementById("admCpTestStatus");
      if (statusBox) statusBox.style.display = "none";
    },

    closeAddProjectModal() {
      const modal = document.getElementById("admCustomProjectModal");
      if (modal) modal.style.display = "none";
      const form = document.getElementById("admCustomProjectForm");
      if (form) form.reset();
    },

    async testModalProjectConnection() {
      const statusBox = document.getElementById("admCpTestStatus");
      const projectId = (document.getElementById("admCpProjectId")?.value || "").trim();
      const apiKey = (document.getElementById("admCpApiKey")?.value || "").trim();
      const authDomain = (document.getElementById("admCpAuthDomain")?.value || "").trim() || `${projectId}.firebaseapp.com`;
      const firestoreDatabaseId = (document.getElementById("admCpDbId")?.value || "").trim() || "(default)";

      if (!projectId || !apiKey) {
        this.showToast("Please enter Project ID and API Key first.", "warning");
        return;
      }

      if (statusBox) {
        statusBox.style.display = "block";
        statusBox.style.background = "#eff6ff";
        statusBox.style.color = "#1d4ed8";
        statusBox.innerHTML = `⏳ Testing connection to ${projectId}...`;
      }

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "test_project_connection",
            projectConfig: { projectId, apiKey, authDomain, firestoreDatabaseId },
            callerEmail
          })
        });
        const data = await res.json();
        if (statusBox) {
          if (data.success) {
            statusBox.style.background = "#f0fdf4";
            statusBox.style.color = "#15803d";
            statusBox.innerHTML = `✅ Connection verified! (${data.latencyMs}ms)`;
          } else {
            statusBox.style.background = "#fef2f2";
            statusBox.style.color = "#b91c1c";
            statusBox.innerHTML = `❌ Connection failed: ${data.error || 'Check credentials'}`;
          }
        }
      } catch (err) {
        if (statusBox) {
          statusBox.style.background = "#fef2f2";
          statusBox.style.color = "#b91c1c";
          statusBox.innerHTML = `❌ Network error: ${err.message}`;
        }
      }
    },

    async submitCustomProject(event) {
      if (event) event.preventDefault();
      const callerEmail = this.getCallerEmail();
      const name = (document.getElementById("admCpName")?.value || "").trim();
      const projectId = (document.getElementById("admCpProjectId")?.value || "").trim();
      const apiKey = (document.getElementById("admCpApiKey")?.value || "").trim();
      const authDomain = (document.getElementById("admCpAuthDomain")?.value || "").trim();
      const firestoreDatabaseId = (document.getElementById("admCpDbId")?.value || "").trim();
      const description = (document.getElementById("admCpDesc")?.value || "").trim();

      if (!projectId || !apiKey) {
        this.showToast("Project ID and API Key are required.", "warning");
        return;
      }

      try {
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_custom_project",
            name,
            projectId,
            apiKey,
            authDomain,
            firestoreDatabaseId,
            description,
            callerEmail
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to save project.");

        this.showToast(data.message || "Custom project saved!", "success");
        this.closeAddProjectModal();
        await this.loadProjectsList();
      } catch (err) {
        this.showToast(`Error: ${err.message}`, "error");
      }
    },

    async deleteCustomProject(projectId) {
      const confirmResult = await Swal.fire({
        title: "Delete Custom Project Profile?",
        text: `Are you sure you want to remove project '${projectId}' from registered profiles?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        confirmButtonText: "Yes, Delete"
      });
      if (!confirmResult.isConfirmed) return;

      try {
        const callerEmail = this.getCallerEmail();
        const res = await this.adminFetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete_custom_project",
            projectId,
            callerEmail
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to delete project.");

        this.showToast(`Project profile deleted.`, "info");
        await this.loadProjectsList();
      } catch (err) {
        this.showToast(`Delete failed: ${err.message}`, "error");
      }
    },

    escapeHtml(str) {
      return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  });

  // Dedicated launcher for the Admin Panel Tab (Strictly guarded by RBAC & Tool Permissions)
  window.showAdminPanelTab = function (targetView) {
    if (!document.getElementById("adminPanelTab")) {
      if (typeof window.TemplateManager !== "undefined" && typeof window.TemplateManager.load === "function") {
        window.TemplateManager.load("1000", function () {
          window.showAdminPanelTab(targetView);
        });
        return;
      }
    }

    const isAdm = (window.adminPanel && typeof window.adminPanel.isAdmin === "function")
      ? window.adminPanel.isAdmin()
      : (window.RBAC && (window.RBAC.role === "admin" || window.RBAC.isSuperAdmin));

    const hasToolAccess = isAdm || (window.RBAC && (
      window.RBAC.hasModuleAccess("adminControlCenter") ||
      (targetView === "app-stream" && (
        window.RBAC.hasSectionAccess("adminControlCenter", "appStream") ||
        window.RBAC.hasSectionAccess("adminControlCenter", "app-stream") ||
        (window.RBAC.subsections?.adminControlCenter?.appStream === true)
      )) ||
      (typeof window.RBAC.hasSectionAccess === "function" && targetView && window.RBAC.hasSectionAccess("adminControlCenter", targetView))
    ));

    if (!isAdm && !hasToolAccess) {
      if (window.RBAC && typeof window.RBAC.showAccessDenied === "function") {
        window.RBAC.showAccessDenied("Admin Control Center");
      } else if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "warning",
          title: "Access Restricted",
          text: "Administrator privileges or Tools access required.",
          confirmButtonColor: "#2563eb"
        });
      } else {
        alert("Access Restricted: Administrator privileges or Tools access required.");
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 🛠️ NON-ADMIN USER ROUTING: Open tool dashboard directly
    // Do NOT open complete Admin Control Center first.
    // Do NOT show Admin Control Center left sidebar.
    // Do NOT show Tools parent/sub-tab navigation again inside.
    // Do NOT show Admin Control Center active/highlighted tab.
    // ─────────────────────────────────────────────────────────────
    if (!isAdm) {
      // Non-Admin direct tool routing: open assigned tool directly without complete Admin Control Center framing
      if (typeof hideAllMainPanels === "function") hideAllMainPanels();
      if (typeof hideWelcomePanel === "function") hideWelcomePanel();
      document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");

      document.body.classList.remove("admin-mode-active");
      document.body.classList.add("non-admin-tool-mode", "tool-direct-view");

      const panel = document.getElementById("adminPanelTab");
      if (panel) {
        panel.classList.add("non-admin-tool-mode");
        panel.style.display = "block";

        const admSidebar = document.getElementById("admSidebar");
        if (admSidebar) {
          admSidebar.style.setProperty("display", "none", "important");
        }
        const mobileToggle = document.querySelector(".adm-mobile-nav-toggle");
        if (mobileToggle) mobileToggle.style.setProperty("display", "none", "important");
        const fsBtn = document.getElementById("admFullscreenToggleBtn");
        if (fsBtn) fsBtn.style.setProperty("display", "none", "important");

        // Highlight matching tool sub-tab in main sidebar, keep Admin Control Center unhighlighted
        const subMap = {
          "app-damage": "appDamage",
          "app-stream": "appStream",
          "app-stress": "appStress",
          "app-hub": "appOverview",
          "users-list": "userManagement",
          "roles-config": "rbacPermissions",
          "permission-matrix": "rbacPermissions",
          "access-control": "rbacPermissions",
          "sys-diagnostics": "sysDiagnostics",
          "layout-sidebar": "layoutBuilder",
          "master-backup": "masterData"
        };
        const subKey = subMap[targetView] || targetView;
        document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
        const toolLink = document.querySelector(`#rbac_cat_tools li[data-rbac-sub="${subKey}"] a`);
        if (toolLink) toolLink.classList.add("active-link");

        if (targetView && window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
          window.adminPanel.navigateTo(targetView);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 👑 ADMIN USER ROUTING: Keep existing admin behavior unchanged
    // ─────────────────────────────────────────────────────────────
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();

    document.body.classList.remove("non-admin-tool-mode", "tool-direct-view");
    document.body.classList.add("admin-mode-active");
    document.body.classList.remove("adm-windowed-mode");

    const admSidebar = document.getElementById("admSidebar");
    if (admSidebar) admSidebar.style.removeProperty("display");
    const mobileToggle = document.querySelector(".adm-mobile-nav-toggle");
    if (mobileToggle) mobileToggle.style.removeProperty("display");
    const fsBtn = document.getElementById("admFullscreenToggleBtn");
    if (fsBtn) {
      fsBtn.style.removeProperty("display");
      fsBtn.innerHTML = "🗗 Windowed";
    }

    const panel = document.getElementById("adminPanelTab");
    if (panel) {
      panel.classList.remove("non-admin-tool-mode");
      panel.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Highlight matching tool sub-tab in main sidebar Tools category
      const subMap = {
        "users-list": "userManagement",
        "roles-config": "rbacPermissions",
        "permission-matrix": "rbacPermissions",
        "access-control": "accessControl",
        "app-hub": "appOverview",
        "app-damage": "appDamage",
        "app-stream": "appStream",
        "app-stress": "appStress",
        "sys-firestore": "firestoreExplorer",
        "sys-diagnostics": "sysDiagnostics",
        "sys-projects": "projectSwitcher",
        "sys-sessions": "activeSessions",
        "sys-logs": "systemLogs",
        "layout-sidebar": "layoutBuilder",
        "sidebar-order": "sidebarOrder",
        "layout-order": "sidebarOrder",
        "ticker-text": "tickerText",
        "layout-ticker": "tickerText",
        "welcome-cards": "welcomeCards",
        "layout-welcome": "welcomeCards",
        "nav-visibility": "navVisibility",
        "layout-visibility": "navVisibility",
        "master-overview": "masterData",
        "master-backup": "jsonBackup",
        "master-restore": "jsonRestore",
        "master-history": "backupHistory",
        "master-audit": "auditTrail"
      };
      const subKey = subMap[targetView] || targetView;
      document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
      const toolLink = document.querySelector(`#rbac_cat_tools li[data-rbac-sub="${subKey}"] a`);
      if (toolLink) toolLink.classList.add("active-link");

      try {
        const currentEmail = (window.adminPanel && typeof window.adminPanel.getCallerEmail === "function")
          ? window.adminPanel.getCallerEmail()
          : ((window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "");
        const currentRole = (window.RBAC && window.RBAC.role) || "admin";
        const isSuper = isAdm || (window.RBAC && !!window.RBAC.isSuperAdmin);
        const roleLabels = {
          admin: "👑 Administrator",
          lead_engineer: "⚙️ Lead Engineer",
          inspector: "🔍 Inspector",
          viewer: "👁️ Viewer",
          custom: "🛠️ Custom Role"
        };
        const roleText = isSuper ? "👑 Super Administrator" : (roleLabels[currentRole] || "⚙️ " + currentRole);
        const emailEl = document.getElementById("admSidebarUserEmail");
        const roleEl = document.getElementById("admSidebarUserRole");
        const avatarEl = document.getElementById("admSidebarUserAvatar");
        if (emailEl) emailEl.textContent = currentEmail;
        if (roleEl) roleEl.textContent = roleText;
        if (avatarEl) avatarEl.textContent = (currentEmail.charAt(0) || "A").toUpperCase();
        const rootEmailEl = document.getElementById("admRootEmailDisplay");
        if (rootEmailEl) rootEmailEl.textContent = currentEmail;
      } catch (e) {}

      // Ensure all admin groups are visible for admin
      ["admNavGroup_users", "admNavGroup_app", "admNavGroup_systems", "admNavGroup_layout", "admNavGroup_master"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "block";
      });

      document.querySelectorAll("[data-view]").forEach(el => {
        el.style.display = "";
      });

      if (targetView && typeof window.adminPanel.navigateTo === "function") {
        window.adminPanel.navigateTo(targetView);
      } else if (typeof window.adminPanel.navigateTo === "function") {
        window.adminPanel.navigateTo("users-list");
      }

      if (window.adminPanel && typeof window.adminPanel.loadAll === "function") {
        window.adminPanel.loadAll();
      }
    }
  };

  // Global ESC key listener to exit full-screen admin console cleanly
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("admin-mode-active")) {
      const openModals = document.querySelectorAll(".modal[style*='display: block'], .modal[style*='display: flex']");
      if (openModals.length > 0) return;
      if (window.adminPanel && typeof window.adminPanel.returnToDashboard === "function") {
        window.adminPanel.returnToDashboard();
      }
    }
  });

  // Ensure global availability without self-recursion
  window.toggleAdminMobileNav = function () {
    if (window.adminPanel && typeof window.adminPanel.toggleMobileNav === "function" && window.adminPanel.toggleMobileNav !== window.toggleAdminMobileNav) {
      return window.adminPanel.toggleMobileNav();
    }
    const sidebar = document.getElementById("admSidebar");
    if (sidebar) sidebar.classList.toggle("mobile-open");
  };
  window.toggleAdminFullscreen = function () {
    if (window.adminPanel && typeof window.adminPanel.toggleFullscreen === "function" && window.adminPanel.toggleFullscreen !== window.toggleAdminFullscreen) {
      return window.adminPanel.toggleFullscreen();
    }
    const isWindowed = document.body.classList.toggle("adm-windowed-mode");
    const btn = document.getElementById("admFullscreenToggleBtn");
    if (btn) btn.innerHTML = isWindowed ? "⛶ Fullscreen" : "🗗 Windowed";
  };
  window.returnToDashboard = function () {
    if (window.adminPanel && typeof window.adminPanel.returnToDashboard === "function" && window.adminPanel.returnToDashboard !== window.returnToDashboard) {
      return window.adminPanel.returnToDashboard();
    }
    document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");
    document.body.classList.remove("adm-windowed-mode");
    const adminTab = document.getElementById("adminPanelTab");
    if (adminTab) {
      adminTab.classList.remove("non-admin-tool-mode");
      adminTab.style.display = "none";
    }
    document.querySelectorAll("#categoryList a").forEach(a => a.classList.remove("active-link"));
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof window.showWelcomePanel === "function") {
      window.showWelcomePanel();
    } else {
      const welcome = document.getElementById("welcomePanel");
      if (welcome) {
        welcome.classList.remove("is-hidden");
        welcome.style.removeProperty("display");
        welcome.style.display = "flex";
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Guarantee essential methods on window.adminPanel
  if (typeof window.adminPanel.toggleMobileNav !== "function") {
    window.adminPanel.toggleMobileNav = window.toggleAdminMobileNav;
  }
  if (typeof window.adminPanel.toggleFullscreen !== "function") {
    window.adminPanel.toggleFullscreen = window.toggleAdminFullscreen;
  }
  if (typeof window.adminPanel.returnToDashboard !== "function") {
    window.adminPanel.returnToDashboard = window.returnToDashboard;
  }
  if (typeof window.adminPanel.saveUserPermissions === "function") {
    window.adminPanel.saveUserPermissions = window.adminPanel.saveUserPermissions.bind(window.adminPanel);
  }

  window.enforceAllowableStressPermissions = function() {
    if (window.adminPanel && typeof window.adminPanel.enforceAllowableStressPermissions === "function") {
      return window.adminPanel.enforceAllowableStressPermissions();
    }
  };

  // Initialize on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.adminPanel.init();
      window.enforceAllowableStressPermissions();
    });
  } else {
    window.adminPanel.init();
    window.enforceAllowableStressPermissions();
  }
})();
