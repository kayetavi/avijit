/**
 * Consolidated Dashboard Pre-loader, Security, RBAC & Delegator Engine
 * Pre-initializes critical guards before page paints:
 * 0. Zero-Flash Early Theme Pre-Filter
 * 1. Clean URL Guard
 * 2. Safe JSON Serialization Guard
 * 3. Safe Alert & Error Interceptor Guard
 * 4. DevTools & Inspection Protection Guard
 * 5. Admin Panel Stubs & Navigation Delegators
 * 6. Zero-Flash Early RBAC Pre-Filter
 * 7. Session Auth Redirection Guard
 * 8. Early Mobile Drawer Delegator Stubs
 */

// ── 0. Zero-Flash Theme Initializer ──
(function () {
  try {
    var theme = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("theme") : null);
    if (theme === "dark") {
      document.documentElement.classList.add("dark-mode");
      document.documentElement.classList.remove("light-mode");
    } else if (theme === "light") {
      document.documentElement.classList.add("light-mode");
      document.documentElement.classList.remove("dark-mode");
    }
  } catch (e) {}
})();

// ── 1. Clean URL Guard ──
(function () {
  if (typeof window === "undefined" || window.__cleanUrlHandled) return;
  window.__cleanUrlHandled = true;
  try {
    if (window.history && typeof window.history.replaceState === "function") {
      var loc = window.location;
      var currentSearch = loc.search || "";
      var currentHash = loc.hash || "";
      if (!currentHash || currentHash === "#" || currentHash === "#0") {
        currentHash = "#0;rte=home";
      }
      if (loc.pathname && (loc.pathname.endsWith("/dashboard.html") || loc.pathname === "/dashboard.html")) {
        var cleanPath = loc.pathname.replace(/\/dashboard\.html$/, "") || "/";
        var newUrl = cleanPath + currentSearch + currentHash;
        window.history.replaceState(window.history.state || null, document.title, newUrl);
      } else if (!loc.hash || loc.hash === "#" || loc.hash === "#0") {
        var cleanPath = loc.pathname || "/";
        var newUrl = cleanPath + currentSearch + currentHash;
        window.history.replaceState(window.history.state || null, document.title, newUrl);
      }
    }
  } catch (err) {
    console.warn("[CleanURL] replaceState notice:", err);
  }
})();

// ── 2. Safe JSON Serialization Guard ──
(function () {
  if (typeof window === "undefined" || window.__safeJsonStringifyInstalled) return;
  window.__safeJsonStringifyInstalled = true;
  var originalStringify = JSON.stringify;
  function createSafeReplacer(customReplacer) {
    var seen = new WeakSet();
    return function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      if (typeof customReplacer === "function") return customReplacer.call(this, key, value);
      return value;
    };
  }
  JSON.stringify = function (value, replacer, space) {
    try {
      return originalStringify(value, replacer, space);
    } catch (err) {
      if (err && (err.name === "TypeError" || /circular|cyclic/i.test(String(err.message || err)))) {
        try {
          return originalStringify(value, createSafeReplacer(replacer), space);
        } catch (fallbackErr) {
          return '"[Circular]"';
        }
      }
      throw err;
    }
  };
})();

// ── 3. Global Error, Cross-Origin Resilience & Safe Alert Guard ──
(function () {
  if (typeof window === "undefined") return;
  window.addEventListener("error", function (event) {
    if (!event) return;
    if (event.message === "Script error." || (event.error && event.error.name === "AbortError")) {
      console.warn("[GlobalGuard] Handled cross-origin notification safely:", event.message);
      if (typeof event.preventDefault === "function") event.preventDefault();
      return true;
    }
  }, true);

  window.addEventListener("unhandledrejection", function (event) {
    if (!event) return;
    var reason = event.reason;
    if (reason && (reason.name === "AbortError" || String(reason).includes("Script error"))) {
      if (typeof event.preventDefault === "function") event.preventDefault();
    }
  });

  var origAlert = window.alert;
  window.alert = function (msg) {
    try {
      if (typeof Swal !== "undefined" && Swal.fire) {
        Swal.fire({
          text: String(msg || ""),
          icon: /error|failed|❌|⚠️/i.test(String(msg)) ? "warning" : "info",
          confirmButtonColor: "#2563eb",
          timer: 4500,
          timerProgressBar: true
        });
        return;
      }
      if (typeof origAlert === "function") {
        origAlert.call(window, msg);
      }
    } catch (e) {
      console.warn("[SafeAlert] alert notice:", msg);
    }
  };
})();

// ── 4. DevTools & Asset Protection Guard ──
(function () {
  if (typeof window === "undefined") return;
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  }, false);

  document.addEventListener("keydown", function (e) {
    if (
      e.keyCode === 123 ||
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
      (e.ctrlKey && e.keyCode === 85)
    ) {
      e.preventDefault();
      return false;
    }
  }, false);

  if (window.location && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
    var noop = function () {};
    ['log', 'debug', 'info'].forEach(function (method) {
      try {
        console[method] = noop;
      } catch (e) {}
    });
  }
})();

// ── 5. Admin Panel Mobile Nav & Fullscreen Pre-load Stubs ──
(function () {
  if (typeof window === "undefined") return;
  window.toggleAdminMobileNav = function () {
    if (window.adminPanel && typeof window.adminPanel.toggleMobileNav === "function" && window.adminPanel.toggleMobileNav !== window.toggleAdminMobileNav) {
      return window.adminPanel.toggleMobileNav();
    }
    var sidebar = document.getElementById("admSidebar");
    if (sidebar) sidebar.classList.toggle("mobile-open");
  };

  window.toggleAdminFullscreen = function () {
    if (window.adminPanel && typeof window.adminPanel.toggleFullscreen === "function" && window.adminPanel.toggleFullscreen !== window.toggleAdminFullscreen) {
      return window.adminPanel.toggleFullscreen();
    }
    var isWindowed = document.body.classList.toggle("adm-windowed-mode");
    var btn = document.getElementById("admFullscreenToggleBtn");
    if (btn) btn.innerHTML = isWindowed ? "⛶ Fullscreen" : "🗗 Windowed";
  };

  window.returnToDashboard = function () {
    if (window.adminPanel && typeof window.adminPanel.returnToDashboard === "function" && window.adminPanel.returnToDashboard !== window.returnToDashboard) {
      return window.adminPanel.returnToDashboard();
    }
    document.body.classList.remove("admin-mode-active", "adm-windowed-mode");
    var adminTab = document.getElementById("adminPanelTab");
    if (adminTab) adminTab.style.display = "none";
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof showWelcomePanel === "function") {
      showWelcomePanel();
    } else {
      var welcome = document.getElementById("welcomePanel");
      if (welcome) {
        welcome.classList.remove("is-hidden");
        welcome.style.setProperty("display", "flex", "important");
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.adminPanel = window.adminPanel || {};
  window.adminPanel.toggleMobileNav = window.adminPanel.toggleMobileNav || window.toggleAdminMobileNav;
  window.adminPanel.toggleFullscreen = window.adminPanel.toggleFullscreen || window.toggleAdminFullscreen;
  window.adminPanel.returnToDashboard = window.adminPanel.returnToDashboard || window.returnToDashboard;
  window.adminPanel.loadAll = window.adminPanel.loadAll || function () {
    console.log("Admin Panel initializing...");
  };
})();

// ── 6. Zero-Flash RBAC Early Pre-Filter ──
(function () {
  try {
    var email = ((window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "").toLowerCase().trim();
    var cachedRaw = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_rbac_permissions") : null);

    var isSuper = false;
    var isAdminUser = false;
    if (cachedRaw) {
      try {
        var r = JSON.parse(cachedRaw);
        if (!r.email || r.email.toLowerCase().trim() === email) {
          if (r.isSuperAdmin) isSuper = true;
          if (r.isSuperAdmin || r.role === "admin") {
            isAdminUser = true;
          }
        }
      } catch(e) {}
    }

    var hasToolsPermission = false;
    if (cachedRaw) {
      try {
        var rParsed = JSON.parse(cachedRaw);
        if (rParsed && (!rParsed.email || rParsed.email.toLowerCase().trim() === email)) {
          if (rParsed.allowedModules && rParsed.allowedModules.adminControlCenter) {
            hasToolsPermission = true;
          }
          if (rParsed.subsections && rParsed.subsections.adminControlCenter) {
            for (var sk in rParsed.subsections.adminControlCenter) {
              if (rParsed.subsections.adminControlCenter[sk] === true) {
                hasToolsPermission = true;
                break;
              }
            }
          }
        }
      } catch(e) {}
    }

    if (!isAdminUser) {
      var stylePre = document.createElement("style");
      stylePre.id = "rbacEarlyAdminPreHide";
      stylePre.textContent = '#adminRbacBtn, #adminSidebarItem, #rbac_cat_adminControlCenter' + (hasToolsPermission ? '' : ', #rbac_cat_tools, [data-rbac-module="adminControlCenter"]') + ' { display: none !important; }\n';
      document.head.appendChild(stylePre);
    }

    if (!email || !cachedRaw) return;
    var rbac = JSON.parse(cachedRaw);
    if (rbac.email && rbac.email.toLowerCase().trim() !== email) return;

    var preHide = document.getElementById("rbacEarlyAdminPreHide");
    if (preHide) preHide.remove();

    var allowed = rbac.allowedModules || {};
    var css = "";
    var isAdminUser = rbac.isSuperAdmin || rbac.role === "admin" || isSuper;

    if (!isAdminUser) {
      css += '#adminRbacBtn, #adminSidebarItem, #rbac_cat_adminControlCenter, .stress-admin-action { display: none !important; }\n';
      if (!hasToolsPermission) {
        css += '#rbac_cat_tools, [data-rbac-module="adminControlCenter"] { display: none !important; }\n';
      }
    }

    var layoutCfg = null;
    try {
      var rawLayout = (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("cached_layout_config") : null);
      if (rawLayout) layoutCfg = JSON.parse(rawLayout);
    } catch (e) {}

    var isLayoutHidden = function(modId) {
      if (!layoutCfg || !Array.isArray(layoutCfg.sidebarModules)) return false;
      var found = layoutCfg.sidebarModules.find(function(m) { return m.id === modId; });
      return found ? found.visible === false : false;
    };

    var allKnown = [
      "damageExplorer", "api571Criteria", "crackingMechanism", "corrosionRate",
      "corrosionCalc", "remainingLife", "cofCalculator", "toxicCalc",
      "inventoryCalc", "fluidSelector", "chemicalSuite", "streamComparator",
      "unitConverter", "asmeB31_3", "simplePiping", "asmeSectionVIII",
      "pipeThickness", "bkStress", "inspectionConfidence", "processFlow"
    ];
    allKnown.forEach(function (modId) {
      if ((!isAdminUser && allowed[modId] !== true) || isLayoutHidden(modId)) {
        css += '[data-rbac-module="' + modId + '"] { display: none !important; }\n';
      }
    });

    var catMap = {
      remainingLife: "#rbac_cat_api570",
      crackingMechanism: "#rbac_cat_cracking",
      bkStress: "#rbac_cat_bkStress",
      processFlow: "#rbac_cat_processFlow",
      chemicalSuite: "#rbac_cat_chemicalSuite",
      streamComparator: "#rbac_cat_streamComparator",
      unitConverter: "#rbac_cat_unitConverter"
    };
    for (var m in catMap) {
      if ((!isAdminUser && allowed[m] !== true) || isLayoutHidden(m)) {
        css += catMap[m] + ' { display: none !important; }\n';
      }
    }

    if ((!isAdminUser && allowed.ccdAI !== true) || isLayoutHidden("ccdAI")) css += '#rbac_cat_ccdAI { display: none !important; }\n';

    if ((!isAdminUser && !allowed.asmeB31_3 && !allowed.simplePiping && !allowed.asmeSectionVIII && !allowed.pipeThickness) || isLayoutHidden("thicknessCalc")) {
      css += '#rbac_cat_designThickness, #rbac_cat_thicknessCalc { display: none !important; }\n';
    }

    if ((!isAdminUser && !allowed.api571Criteria && !allowed.corrosionRate && !allowed.fluidSelector && !allowed.inventoryCalc && !allowed.inspectionConfidence && !allowed.toxicCalc && !allowed.cofCalculator && !allowed.corrosionCalc) || isLayoutHidden("api581")) {
      css += '#rbac_cat_api581 { display: none !important; }\n';
    }

    if ((!isAdminUser && allowed.damageExplorer !== true && allowed.damageMechanisms !== true) || isLayoutHidden("damageExplorer")) {
      css += '#categoryList li.category-toggle:not([id^="rbac_cat_"]), #categoryList li[data-rbac-module="damageExplorer"], [data-rbac-module="damageExplorer"] { display: none !important; }\n';
    }

    if (css) {
      var style = document.createElement("style");
      style.id = "rbacEarlyPreFilterStyle";
      style.textContent = css;
      document.head.appendChild(style);
    }
    document.documentElement.classList.add("rbac-ready");
  } catch (err) {
    console.warn("RBAC early prefilter notice:", err);
  }
})();

// ── 7. Session Auth Redirection Guard ──
(function () {
  try {
    var user = (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? (sessionStorage.getItem("loggedInUser") || sessionStorage.getItem("sessionId") || sessionStorage.getItem("userUid")) : null);
    if (!user && !window.location.href.includes("index.html") && !window.location.pathname.endsWith("index.html")) {
      var currentHash = window.location.hash || "";
      if (currentHash && currentHash !== "#" && currentHash !== "#0" && !currentHash.includes("rte=home")) {
        try {
          sessionStorage.setItem("post_login_redirect_hash", currentHash);
        } catch (e) {}
      }
      if (window.location.pathname !== "/" && !window.location.search.includes("dev=true")) {
        window.location.href = "index.html";
        return;
      }
    }
  } catch (navErr) {
    console.warn("[AuthRedirect] Nav notice:", navErr);
  }
})();

// ── 8. Early Mobile Drawer Delegator Stubs ──
(function () {
  if (typeof window === "undefined") return;
  window.getMainSidebar = window.getMainSidebar || function() {
    return document.getElementById("mainSidebar") || document.querySelector(".sidebar");
  };
  window.toggleMobileSidebar = window.toggleMobileSidebar || function(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    var s = window.getMainSidebar();
    var b = document.getElementById("sidebarBackdrop");
    if (s) s.classList.toggle("mobile-open");
    if (b) b.classList.toggle("visible");
    document.body.classList.toggle("sidebar-open");
  };
  window.openMobileSidebar = window.openMobileSidebar || function(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    var s = window.getMainSidebar();
    var b = document.getElementById("sidebarBackdrop");
    if (s) s.classList.add("mobile-open");
    if (b) b.classList.add("visible");
    document.body.classList.add("sidebar-open");
  };
  window.closeMobileSidebar = window.closeMobileSidebar || function(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    var s = window.getMainSidebar();
    var b = document.getElementById("sidebarBackdrop");
    if (s) s.classList.remove("mobile-open");
    if (b) b.classList.remove("visible");
    document.body.classList.remove("sidebar-open");
  };
})();
