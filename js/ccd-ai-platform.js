/**
 * 🤖 CCD AI PLATFORM (Corrosion Control Document Management System)
 * Native controller, iframe manager & Corrosion Loop knowledge engine.
 */

(function () {
  "use strict";

  const CCD_EXTERNAL_URL = "/ccd-platform/index.html";

  // Refinery Corrosion Loops Knowledge Base (Hydrated from Cloud Firestore via Backend API)
  let CCD_LOOPS = [];
  let selectedLoopId = "CL-101";
  let _ccdLoopsPromise = null;

  function ensureCCDLoopsLoaded() {
    if (CCD_LOOPS.length > 0) return Promise.resolve(CCD_LOOPS);
    if (_ccdLoopsPromise) return _ccdLoopsPromise;
    _ccdLoopsPromise = fetch("/api/database?type=ccd-loops")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.loops)) {
          CCD_LOOPS = data.loops;
        }
        return CCD_LOOPS;
      })
      .catch(function (err) {
        console.warn("[CCD Platform] Failed to hydrate CCD loops:", err);
        return CCD_LOOPS;
      })
      .finally(function () {
        _ccdLoopsPromise = null;
      });
    return _ccdLoopsPromise;
  }

  /**
   * Main function to show CCD AI Platform tab in the dashboard
   */
  window.showCCDAITab = function () {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(function (tab) {
      tab.style.display = "none";
    });

    const mechTitle = document.getElementById("selectedMechanismTitle");
    if (mechTitle) mechTitle.style.display = "none";

    if (typeof window.hideWelcomePanel === "function") window.hideWelcomePanel();
    if (typeof window.hideAllMainPanels === "function") window.hideAllMainPanels();

    // Reset layout modes
    document.body.classList.remove("admin-mode-active", "non-admin-tool-mode", "tool-direct-view");

    const tab = document.getElementById("ccdAiTab");
    if (tab) {
      tab.style.display = "block";
      // Keep page scrolled to top so header and navbar remain intact
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Highlight sidebar link
    document.querySelectorAll("#categoryList a").forEach(function (a) {
      a.classList.remove("active-link");
    });
    const sidebarLink = document.querySelector('#rbac_cat_ccdAI li[data-rbac-sub="ccdAiPlatform"] a');
    if (sidebarLink) sidebarLink.classList.add("active-link");

    // Track in Recent Tabs if available
    if (window.recentTabs && typeof window.recentTabs.addTab === "function") {
      window.recentTabs.addTab("ccdAiTab");
    }

    // Initialize native workspace if needed
    renderSelectedLoop();
  };

  /**
   * Alias for backward compatibility with RBAC and menu links
   */
  window.openCCDAIPlatform = function () {
    window.showCCDAITab();
  };

  /**
   * Exit CCD and return to main dashboard
   */
  window.exitCCDPlatform = function () {
    const wrapper = document.querySelector(".ccd-direct-wrapper");
    if (wrapper) wrapper.classList.remove("ccd-fullscreen-active");
    const container = document.getElementById("ccdFrameContainer");
    if (container) container.classList.remove("ccd-fullscreen-active");
    const tab = document.getElementById("ccdAiTab");
    if (tab) tab.classList.remove("ccd-fullscreen-active");
    const btn = document.getElementById("ccdFullscreenBtn");
    if (btn) btn.innerHTML = "⛶ Fullscreen";

    if (typeof window.hideAllMainPanels === "function") window.hideAllMainPanels();
    if (typeof window.showWelcomePanel === "function") window.showWelcomePanel();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Reload embedded Cloud Run iframe
   */
  window.reloadCCDFrame = function () {
    const frame = document.getElementById("ccdPlatformFrame");
    if (frame) {
      frame.src = CCD_EXTERNAL_URL + "?t=" + Date.now();
    }
  };

  /**
   * Toggle Fullscreen View for the embedded platform
   */
  window.toggleCCDFullscreen = function () {
    const wrapper = document.querySelector(".ccd-direct-wrapper");
    const container = document.getElementById("ccdFrameContainer");
    const tab = document.getElementById("ccdAiTab");
    if (!wrapper) return;

    const isFull = wrapper.classList.toggle("ccd-fullscreen-active");
    if (container) container.classList.toggle("ccd-fullscreen-active", isFull);
    if (tab) tab.classList.toggle("ccd-fullscreen-active", isFull);

    const btn = document.getElementById("ccdFullscreenBtn");
    if (btn) {
      btn.innerHTML = isFull ? "⛶ Exit Fullscreen" : "⛶ Fullscreen";
      btn.title = isFull ? "Exit Fullscreen (Esc)" : "Full Screen View";
    }
  };

  // Keyboard shortcut: Escape to exit fullscreen
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const wrapper = document.querySelector(".ccd-direct-wrapper");
      if (wrapper && wrapper.classList.contains("ccd-fullscreen-active")) {
        window.toggleCCDFullscreen();
      }
    }
  });

  /**
   * Switch between Live Platform View and Native Loop Workspace
   */
  window.switchCCDView = function (mode) {
    const liveView = document.getElementById("ccdLiveViewSection");
    const loopView = document.getElementById("ccdLoopViewSection");
    const btnLive = document.getElementById("ccdBtnViewLive");
    const btnLoops = document.getElementById("ccdBtnViewLoops");

    if (mode === "live") {
      if (liveView) liveView.style.display = "block";
      if (loopView) loopView.style.display = "none";
      if (btnLive) btnLive.classList.add("active");
      if (btnLoops) btnLoops.classList.remove("active");
    } else {
      if (liveView) liveView.style.display = "none";
      if (loopView) loopView.style.display = "grid";
      if (btnLive) btnLive.classList.remove("active");
      if (btnLoops) btnLoops.classList.add("active");
      renderSelectedLoop();
    }
  };

  /**
   * Select a Corrosion Loop from list
   */
  window.selectCCDLoop = function (loopId) {
    selectedLoopId = loopId;
    renderSelectedLoop();
  };

  /**
   * Render Selected Loop details in the native view
   */
  function renderSelectedLoop() {
    if (CCD_LOOPS.length === 0) {
      ensureCCDLoopsLoaded().then(function () {
        if (CCD_LOOPS.length > 0) renderSelectedLoop();
      });
      return;
    }
    const loop = CCD_LOOPS.find(function (l) { return l.id === selectedLoopId; }) || CCD_LOOPS[0];
    if (!loop) return;

    // Highlight selected item in list
    document.querySelectorAll(".ccd-loop-item").forEach(function (el) {
      if (el.getAttribute("data-loop-id") === loop.id) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    const titleEl = document.getElementById("ccdLoopTitle");
    const unitEl = document.getElementById("ccdLoopUnit");
    const mocEl = document.getElementById("ccdLoopMoc");
    const tempEl = document.getElementById("ccdLoopTemp");
    const pressEl = document.getElementById("ccdLoopPress");
    const fluidEl = document.getElementById("ccdLoopFluid");
    const ndtEl = document.getElementById("ccdLoopNdt");
    const mitEl = document.getElementById("ccdLoopMit");
    const tableBody = document.getElementById("ccdMechTableBody");
    const iowContainer = document.getElementById("ccdIowContainer");

    if (titleEl) titleEl.innerText = "[" + loop.id + "] " + loop.name;
    if (unitEl) unitEl.innerText = loop.unit;
    if (mocEl) mocEl.innerText = loop.moc;
    if (tempEl) tempEl.innerText = loop.operatingTemp;
    if (pressEl) pressEl.innerText = loop.operatingPressure;
    if (fluidEl) fluidEl.innerText = loop.processFluid;
    if (ndtEl) ndtEl.innerText = loop.ndt;
    if (mitEl) mitEl.innerText = loop.mitigation;

    // Render Damage Mechanisms
    if (tableBody) {
      tableBody.innerHTML = loop.mechanisms.map(function (m) {
        const riskClass = m.risk === "high" ? "ccd-risk-high" : (m.risk === "med" ? "ccd-risk-med" : "ccd-risk-low");
        const riskLabel = m.risk.toUpperCase();
        return (
          "<tr>" +
            "<td style='font-weight:700; color:#0284c7; white-space:nowrap;'>" + m.code + "</td>" +
            "<td style='font-weight:600;'>" + m.name + "</td>" +
            "<td><span class='ccd-risk-badge " + riskClass + "'>" + riskLabel + "</span></td>" +
            "<td style='color:#64748b; font-size:11px;'>" + m.details + "</td>" +
          "</tr>"
        );
      }).join("");
    }

    // Render IOWs
    if (iowContainer) {
      iowContainer.innerHTML = loop.iow.map(function (iow) {
        const barClass = iow.pct > 80 ? "alert" : (iow.pct > 65 ? "warn" : "");
        return (
          "<div class='ccd-iow-card'>" +
            "<div class='ccd-iow-title'>" +
              "<span>" + iow.parameter + "</span>" +
              "<span style='color:#0284c7; font-weight:700;'>" + iow.current + "</span>" +
            "</div>" +
            "<div class='ccd-iow-range'>Target: <strong>" + iow.target + "</strong></div>" +
            "<div class='ccd-iow-range'>Allowable: " + iow.min + " – " + iow.max + "</div>" +
            "<div class='ccd-iow-meter'>" +
              "<div class='ccd-iow-bar " + barClass + "' style='width: " + iow.pct + "%'></div>" +
            "</div>" +
          "</div>"
        );
      }).join("");
    }
  }

  /**
   * Export / Copy formatted CCD Summary Report
   */
  window.exportCCDReport = function () {
    ensureCCDLoopsLoaded().then(function () {
      const loop = CCD_LOOPS.find(function (l) { return l.id === selectedLoopId; }) || CCD_LOOPS[0];
      if (!loop) return;
      const reportText = [
        "===========================================================",
        "  CORROSION CONTROL DOCUMENT (CCD) SUMMARY REPORT",
        "  KayetDMS Integrity & Damage Mechanism Platform",
        "===========================================================",
        "Loop Identifier   : " + loop.id,
        "Loop Description  : " + loop.name,
        "Refinery Unit     : " + loop.unit,
        "Metallurgy (MOC)  : " + loop.moc,
        "Operating Temp    : " + loop.operatingTemp,
        "Operating Press   : " + loop.operatingPressure,
        "Process Chemistry : " + loop.processFluid,
        "",
        "--- IDENTIFIED API 571 DAMAGE MECHANISMS ---",
        loop.mechanisms.map(function (m, idx) {
          return (idx + 1) + ". [" + m.code + "] " + m.name + " (Susceptibility: " + m.risk.toUpperCase() + ")\n   Details: " + m.details;
        }).join("\n"),
        "",
        "--- INTEGRITY OPERATING WINDOWS (IOW) ---",
        loop.iow.map(function (i) {
          return "- " + i.parameter + ": Current=" + i.current + " | Target=" + i.target + " (Range: " + i.min + " to " + i.max + ")";
        }).join("\n"),
        "",
        "--- NDT INSPECTION & MONITORING ---",
        loop.ndt,
        "",
        "--- CHEMICAL MITIGATION & BARRIERS ---",
        loop.mitigation,
        "===========================================================",
        "Generated: " + new Date().toISOString()
      ].join("\n");

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(reportText).then(function () {
          alert("✅ CCD Summary Report for [" + loop.id + "] copied to clipboard!");
        }).catch(function () {
          prompt("Copy CCD Summary Report below:", reportText);
        });
      } else {
        prompt("Copy CCD Summary Report below:", reportText);
      }
    });
  };

  // Setup frame load listener
  document.addEventListener("DOMContentLoaded", function () {
    const frame = document.getElementById("ccdPlatformFrame");
    if (frame) {
      frame.addEventListener("load", function () {
        const loader = document.getElementById("ccdFrameLoader");
        if (loader) loader.style.display = "none";
      });
    }
  });

})();
