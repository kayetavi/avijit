    (function () {
      "use strict";

      var _isNavigatingFromHash = false;

      // ── 1. Safe URL Hash Updater (Prevents Recursion & Preserves History) ──
      function setHashWithoutTriggeringRouter(targetHash, useReplace) {
        if (_isNavigatingFromHash) return;
        if (!targetHash) return;
        var currentHash = window.location.hash || "";
        if (currentHash === targetHash) return;

        try {
          if (useReplace && window.history && typeof window.history.replaceState === "function") {
            window.history.replaceState(window.history.state || null, "", targetHash);
          } else if (window.history && typeof window.history.pushState === "function") {
            window.history.pushState(null, "", targetHash);
          } else {
            window.location.hash = targetHash;
          }
        } catch (e) {
          try { window.location.hash = targetHash; } catch (err) {}
        }
      }

      // ── 2. 3-Level Hierarchy & Enterprise APM Mappings ──
      var FUNCTION_TO_HASH = {
        // Tools & Admin Control Center (fam=7652900)
        showAdminPanelTab: "#0;fam=7652900;ent=9490101",

        // Standalone Modules
        showStreamComparatorTab: "#0;fam=7652700;ent=9470001",
        showCCDAITab: "#0;fam=7652200;ent=9420001",
        showbkStressTab: "#0;fam=7652300;ent=9430001",
        showCrackingMechanismTab: "#0;fam=7652400;ent=9440001",
        showRemainingLifeTab: "#0;fam=7652570;ent=9457001",
        showChemicalSuiteTab: "#0;fam=7652800;ent=9480001",
        showUnitConverterTab: "#0;fam=7652600;ent=9460001",
        openDamageExplorerCard: "#0;fam=7652571;ent=9457101",
        goHome: "#0;rte=home",
        showWelcomePanel: "#0;rte=home",

        // Design Thickness Calculator (fam=7652313)
        showASMEB31_3Tab: "#0;fam=7652313;ent=9431301",
        showSimplePipingTab: "#0;fam=7652313;ent=9431302",
        showASMESECTIONVIIIDIV1Tab: "#0;fam=7652313;ent=9431303",
        showpipeThicknessTab: "#0;fam=7652313;ent=9431304",
        showStructuralThicknessTab: "#0;fam=7652313;ent=9431305",

        // API 581 Risk-Based Inspection (fam=7652581)
        showCriteriaTab: "#0;fam=7652581;ent=9458101",
        showCorrosionTab: "#0;fam=7652581;ent=9458102",
        showCorrosionFullTab: "#0;fam=7652581;ent=9458102",
        showFluidSelectorTab: "#0;fam=7652581;ent=9458103",
        showInventoryTab: "#0;fam=7652581;ent=9458104",
        showINSPECTIONCONFIDENCETab: "#0;fam=7652581;ent=9458105",
        showTOXIC_CALCULATIONTab: "#0;fam=7652581;ent=9458106",
        showcof_calculatorTab: "#0;fam=7652581;ent=9458111",
        showQPOF_calculatorTab: "#0;fam=7652581;ent=9458112",
        showCORROSION_CALCULATIONTab: "#0;fam=7652581;ent=9458121"
      };

      var TAB_ID_TO_HASH = {
        // Admin
        adminPanelTab: "#0;fam=7652900;ent=9490101",

        // Standalone Modules
        streamComparatorTab: "#0;fam=7652700;ent=9470001",
        ccdAiTab: "#0;fam=7652200;ent=9420001",
        bkStressTab: "#0;fam=7652300;ent=9430001",
        crackingMechanismTab: "#0;fam=7652400;ent=9440001",
        remainingLifeTab: "#0;fam=7652570;ent=9457001",
        chemicalSuiteTab: "#0;fam=7652800;ent=9480001",
        unitConverterTab: "#0;fam=7652600;ent=9460001",
        welcomePanel: "#0;rte=home",

        // Design Thickness Calculator (fam=7652313)
        ASMEB31_3Tab: "#0;fam=7652313;ent=9431301",
        simplePipingTab: "#0;fam=7652313;ent=9431302",
        ASMESECTIONVIIIDIV1Tab: "#0;fam=7652313;ent=9431303",
        pipeThicknessTab: "#0;fam=7652313;ent=9431304",
        structuralThicknessTab: "#0;fam=7652313;ent=9431305",

        // API 581 Risk-Based Inspection (fam=7652581)
        "a571-criteriaTab": "#0;fam=7652581;ent=9458101",
        corrosionRateTab: "#0;fam=7652581;ent=9458102",
        corrosionFullTab: "#0;fam=7652581;ent=9458102",
        fluidSelectorTab: "#0;fam=7652581;ent=9458103",
        inventoryTab: "#0;fam=7652581;ent=9458104",
        inspectionconfidenceTab: "#0;fam=7652581;ent=9458105",
        TOXIC_CALCULATIONTab: "#0;fam=7652581;ent=9458106",
        cof_calculatorTab: "#0;fam=7652581;ent=9458111",
        QPOF_calculatorTab: "#0;fam=7652581;ent=9458112",
        CORROSION_CALCULATIONTab: "#0;fam=7652581;ent=9458121"
      };

      // Admin View Mapping (Group -> SubTab -> adminPanel View ID)
      var ADMIN_VIEWS = {
        "1": {
          "1": "users-list",
          "2": "roles-config",
          "3": "access-control"
        },
        "2": {
          "1": "app-hub",
          "2": "app-damage",
          "3": "app-stream",
          "4": "app-stress"
        },
        "3": {
          "1": "sys-firestore",
          "2": "sys-diagnostics",
          "3": "sys-projects",
          "4": "sys-sessions",
          "5": "sys-logs"
        },
        "4": {
          "1": "layout-sidebar",
          "2": "layout-order",
          "3": "layout-ticker",
          "4": "layout-welcome",
          "5": "layout-visibility"
        },
        "5": {
          "1": "master-overview",
          "2": "master-backup",
          "3": "master-restore",
          "4": "master-history",
          "5": "master-audit"
        }
      };

      var ADMIN_VIEW_TO_HASH = {
        "users-list": "#0;fam=7652900;ent=9490101",
        "roles-config": "#0;fam=7652900;ent=9490102",
        "permission-matrix": "#0;fam=7652900;ent=9490102",
        "access-control": "#0;fam=7652900;ent=9490103",
        "app-hub": "#0;fam=7652900;ent=9490201",
        "app-damage": "#0;fam=7652900;ent=9490202",
        "app-stream": "#0;fam=7652900;ent=9490203",
        "app-stress": "#0;fam=7652900;ent=9490204",
        "sys-firestore": "#0;fam=7652900;ent=9490301",
        "sys-diagnostics": "#0;fam=7652900;ent=9490302",
        "sys-projects": "#0;fam=7652900;ent=9490303",
        "sys-sessions": "#0;fam=7652900;ent=9490304",
        "sys-logs": "#0;fam=7652900;ent=9490305",
        "layout-sidebar": "#0;fam=7652900;ent=9490401",
        "layout-order": "#0;fam=7652900;ent=9490402",
        "layout-ticker": "#0;fam=7652900;ent=9490403",
        "layout-welcome": "#0;fam=7652900;ent=9490404",
        "layout-visibility": "#0;fam=7652900;ent=9490405",
        "master-overview": "#0;fam=7652900;ent=9490501",
        "master-backup": "#0;fam=7652900;ent=9490502",
        "master-restore": "#0;fam=7652900;ent=9490503",
        "master-history": "#0;fam=7652900;ent=9490504",
        "master-audit": "#0;fam=7652900;ent=9490505"
      };

      // ── 3. Dynamic Module Template Configuration & Manager & Enterprise APM Registry ──
      var APM_REGISTRY = {
        "9458101": { fam: "7652581", ent: "9458101", elementId: "a571-criteriaTab", template: "templates/view-criteria-1051.html", init: function() { if(typeof window.showCriteriaTab==="function") window.showCriteriaTab(); } },
        "9458102": { fam: "7652581", ent: "9458102", elementId: "corrosionFullTab", template: "templates/view-corrosion-1053.html", init: function() { if(typeof window.showCorrosionFullTab==="function") window.showCorrosionFullTab(); } },
        "9458103": { fam: "7652581", ent: "9458103", elementId: "fluidSelectorTab", template: "templates/view-fluids-1054.html", init: function() { if(typeof window.showFluidSelectorTab==="function") window.showFluidSelectorTab(); } },
        "9458104": { fam: "7652581", ent: "9458104", elementId: "inventoryTab", template: "templates/view-inventory-1055.html", init: function() { if(typeof window.showInventoryTab==="function") window.showInventoryTab(); } },
        "9458105": { fam: "7652581", ent: "9458105", elementId: "inspectionconfidenceTab", template: "templates/view-inspection-1056.html", init: function() { if(typeof window.showINSPECTIONCONFIDENCETab==="function") window.showINSPECTIONCONFIDENCETab(); } },
        "9458106": { fam: "7652581", ent: "9458106", elementId: "TOXIC_CALCULATIONTab", template: "templates/view-toxic-1057.html", init: function() { if(typeof window.showTOXIC_CALCULATIONTab==="function") window.showTOXIC_CALCULATIONTab(); } },
        "9458111": { fam: "7652581", ent: "9458111", elementId: "cof_calculatorTab", template: "templates/view-cof-1058.html", init: function() { if(typeof window.showcof_calculatorTab==="function") window.showcof_calculatorTab(); } },
        "9458121": { fam: "7652581", ent: "9458121", elementId: "CORROSION_CALCULATIONTab", template: "templates/view-rbi-1030.html", init: function() { if(typeof window.showCORROSION_CALCULATIONTab==="function") window.showCORROSION_CALCULATIONTab(); } },
        "9431301": { fam: "7652313", ent: "9431301", elementId: "ASMEB31_3Tab", template: "templates/view-asme-1040.html", init: function() { if(typeof window.showASMEB31_3Tab==="function") window.showASMEB31_3Tab(); } },
        "9431302": { fam: "7652313", ent: "9431302", elementId: "simplePipingTab", template: "templates/view-pipe-simple-1041.html", init: function() { if(typeof window.showSimplePipingTab==="function") window.showSimplePipingTab(); } },
        "9431303": { fam: "7652313", ent: "9431303", elementId: "ASMESECTIONVIIIDIV1Tab", template: "templates/view-sec8-1042.html", init: function() { if(typeof window.showASMESECTIONVIIIDIV1Tab==="function") window.showASMESECTIONVIIIDIV1Tab(); } },
        "9431304": { fam: "7652313", ent: "9431304", elementId: "pipeThicknessTab", template: "templates/view-pipe-chart-1043.html", init: function() { if(typeof window.showpipeThicknessTab==="function") window.showpipeThicknessTab(); } },
        "9431305": { fam: "7652313", ent: "9431305", elementId: "structuralThicknessTab", template: "templates/view-pipe-struct-1044.html", init: function() { if(typeof window.showStructuralThicknessTab==="function") window.showStructuralThicknessTab(); } },
        "9470001": { fam: "7652700", ent: "9470001", elementId: "streamComparatorTab", template: "templates/view-stream-1010.html", init: function() { if(typeof window.showStreamComparatorTab==="function") window.showStreamComparatorTab(); } },
        "9430001": { fam: "7652300", ent: "9430001", elementId: "bkStressTab", template: "templates/view-stress-1060.html", init: function() { if(typeof window.showbkStressTab==="function") window.showbkStressTab(); } },
        "9457001": { fam: "7652570", ent: "9457001", elementId: "remainingLifeTab", template: "templates/view-remaininglife-1070.html", init: function() { if(typeof window.showRemainingLifeTab==="function") window.showRemainingLifeTab(); } },
        "9480001": { fam: "7652800", ent: "9480001", elementId: "chemicalSuiteTab", template: "templates/view-chemsuite-1080.html", init: function() { if(typeof window.showChemicalSuiteTab==="function") window.showChemicalSuiteTab(); } },
        "9460001": { fam: "7652600", ent: "9460001", elementId: "unitConverterTab", template: "templates/view-units-1090.html", init: function() { if(typeof window.showUnitConverterTab==="function") window.showUnitConverterTab(); } },
        "9490101": { fam: "7652900", ent: "9490101", elementId: "adminPanelTab", template: "templates/view-admin-1000.html", init: function() { if(typeof window.showAdminPanelTab==="function") window.showAdminPanelTab(); } },
        "9440001": { fam: "7652400", ent: "9440001", elementId: "crackingMechanismTab", template: "templates/view-cracking-1065.html", init: function() { if(typeof window.showCrackingMechanismTab==="function") window.showCrackingMechanismTab(); } },
        "9420001": { fam: "7652200", ent: "9420001", elementId: "ccdAiTab", template: null, init: function() { if(typeof window.showCCDAITab==="function") window.showCCDAITab(); } },
        "9458112": { fam: "7652581", ent: "9458112", elementId: "QPOF_calculatorTab", template: "templates/view-qpof-1059.html", init: function() { if(typeof window.showQPOF_calculatorTab === "function") window.showQPOF_calculatorTab(); } },
        "9457101": { fam: "7652571", ent: "9457101", elementId: null, template: null, init: function() { if(typeof window.openDamageExplorerCard === "function") window.openDamageExplorerCard(); } }
      };
      window.APM_REGISTRY = APM_REGISTRY;

      function navigateByEntity(fam, ent) {
        if (!ent) return;
        var cleanEnt = String(ent).trim();
        var VALID_ENT_KEYS = Object.keys(APM_REGISTRY).concat([
          "581", "313", "700", "800", "600", "300", "400", "570", "200", "571", "900",
          "1000", "1010", "1020", "1030", "1040", "1041", "1042", "1043", "1044",
          "1051", "1052", "1053", "1054", "1055", "1056", "1057", "1058", "1059",
          "1060", "1065", "1070", "1080", "1090", "1571",
          "9440001", "9420001", "7652400", "7652200"
        ]);
        var isKnown = VALID_ENT_KEYS.indexOf(cleanEnt) !== -1 || APM_REGISTRY[cleanEnt] || cleanEnt.indexOf("9490") === 0;
        if (!isKnown) {
          isolatePane(null);
          if (typeof Swal !== "undefined" && typeof Swal.fire === "function") {
            Swal.fire({
              icon: "error",
              title: "Invalid Entity Key",
              text: "The requested module [" + cleanEnt + "] does not exist or has been modified.",
              confirmButtonText: "Return Home"
            }).then(function() {
              if (typeof window.goHome === "function") window.goHome();
              window.history.replaceState(null, "", "#0;rte=home");
            });
          } else {
            console.warn("[ApmRouter] Invalid Entity Key requested: " + cleanEnt);
            if (typeof window.goHome === "function") window.goHome();
            window.history.replaceState(null, "", "#0;rte=home");
          }
          return;
        }

        var reg = APM_REGISTRY[cleanEnt];
        var famKey = fam || (reg ? reg.fam : "7652581");
        var hash = "#0;fam=" + famKey + ";ent=" + cleanEnt;
        setHashWithoutTriggeringRouter(hash);
        if (reg) {
          isolatePane(reg.elementId);
          if (reg.template && typeof TemplateManager !== "undefined" && typeof TemplateManager.load === "function") {
            TemplateManager.load(cleanEnt, function() {
              if (typeof reg.init === "function") reg.init();
            });
          } else {
            if (typeof reg.init === "function") reg.init();
          }
        } else {
          isolatePane(null);
        }
        dispatchApmRoute();
      }
      window.navigateByEntity = navigateByEntity;

      var MODULE_TEMPLATES = {
        "1000": {
          elementId: "adminPanelTab",
          url: "templates/view-admin-1000.html",
          showFn: "showAdminPanelTab",
          lifecycle: function () {
            if (window.adminPanel && typeof window.adminPanel.loadAll === "function" &&
                (typeof window.adminPanel.isAdmin !== "function" || window.adminPanel.isAdmin())) {
              window.adminPanel.loadAll();
            }
          }
        },
        "1010": {
          elementId: "streamComparatorTab",
          url: "templates/view-stream-1010.html",
          showFn: "showStreamComparatorTab",
          lifecycle: function () {
            if (window.StreamComparator && typeof window.StreamComparator.init === "function") {
              window.StreamComparator.init();
            }
          }
        },
        "1030": {
          elementId: "CORROSION_CALCULATIONTab",
          url: "templates/view-rbi-1030.html",
          showFn: "showCORROSION_CALCULATIONTab",
          lifecycle: function () {
            if (window.RBIApp && typeof window.RBIApp.render === "function") {
              window.RBIApp.render();
            }
          }
        },
        "1040": {
          elementId: "ASMEB31_3Tab",
          url: "templates/view-asme-1040.html",
          showFn: "showASMEB31_3Tab",
          lifecycle: function () {
            if (typeof window.initB313 === "function") window.initB313();
            if (typeof window.initB313AutoStressFields === "function") window.initB313AutoStressFields(false);
          }
        },
        "1041": {
          elementId: "simplePipingTab",
          url: "templates/view-pipe-simple-1041.html",
          showFn: "showSimplePipingTab",
          lifecycle: function () {
            if (typeof window.initSimplePiping === "function") window.initSimplePiping();
          }
        },
        "1042": {
          elementId: "ASMESECTIONVIIIDIV1Tab",
          url: "templates/view-sec8-1042.html",
          showFn: "showASMESECTIONVIIIDIV1Tab",
          lifecycle: function () {
            if (typeof window.showASMESECTIONVIIIDIV1Tab === "function") window.showASMESECTIONVIIIDIV1Tab();
          }
        },
        "1043": {
          elementId: "pipeThicknessTab",
          url: "templates/view-pipe-chart-1043.html",
          showFn: "showpipeThicknessTab",
          lifecycle: function () {
            if (typeof window.showpipeThicknessTab === "function") window.showpipeThicknessTab();
          }
        },
        "1044": {
          elementId: "structuralThicknessTab",
          url: "templates/view-pipe-struct-1044.html",
          showFn: "showStructuralThicknessTab",
          lifecycle: function () {
            if (typeof window.initStructuralThickness === "function") window.initStructuralThickness();
          }
        },
        "1051": {
          elementId: "a571-criteriaTab",
          url: "templates/view-criteria-1051.html",
          showFn: "showCriteriaTab",
          lifecycle: function () {
            if (typeof window.a571_init === "function") window.a571_init();
            if (typeof window.showCriteriaTab === "function") window.showCriteriaTab();
          }
        },
        "1053": {
          elementId: "corrosionFullTab",
          url: "templates/view-corrosion-1053.html",
          showFn: "showCorrosionFullTab",
          lifecycle: function () {
            if (typeof window.initCorrosionFullTab === "function") window.initCorrosionFullTab();
            if (typeof window.showCorrosionFullTab === "function") window.showCorrosionFullTab();
          }
        },
        "1054": {
          elementId: "fluidSelectorTab",
          url: "templates/view-fluids-1054.html",
          showFn: "showFluidSelectorTab",
          lifecycle: function () {
            if (typeof window.initFluidSelector === "function") window.initFluidSelector();
            if (typeof window.showFluidSelectorTab === "function") window.showFluidSelectorTab();
          }
        },
        "1055": {
          elementId: "inventoryTab",
          url: "templates/view-inventory-1055.html",
          showFn: "showInventoryTab",
          lifecycle: function () {
            if (typeof window.initInventory === "function") window.initInventory();
            if (typeof window.initBulkUpload === "function") window.initBulkUpload();
            if (typeof window.showInventoryTab === "function") window.showInventoryTab();
          }
        },
        "1056": {
          elementId: "inspectionconfidenceTab",
          url: "templates/view-inspection-1056.html",
          showFn: "showINSPECTIONCONFIDENCETab",
          lifecycle: function () {
            if (typeof window.showINSPECTIONCONFIDENCETab === "function") window.showINSPECTIONCONFIDENCETab();
          }
        },
        "1057": {
          elementId: "TOXIC_CALCULATIONTab",
          url: "templates/view-toxic-1057.html",
          showFn: "showTOXIC_CALCULATIONTab",
          lifecycle: function () {
            if (typeof window.initToxicCalculator === "function") window.initToxicCalculator();
          }
        },
        "1058": {
          elementId: "cof_calculatorTab",
          url: "templates/view-cof-1058.html",
          showFn: "showcof_calculatorTab",
          lifecycle: function () {
            if (typeof window.initCOF === "function") window.initCOF();
            if (typeof window.showcof_calculatorTab === "function") window.showcof_calculatorTab();
          }
        },
        "1059": {
          elementId: "QPOF_calculatorTab",
          url: "templates/view-qpof-1059.html",
          showFn: "showQPOF_calculatorTab",
          lifecycle: function () {
            if (typeof window.showQPOF_calculatorTab === "function") window.showQPOF_calculatorTab();
          }
        },
        "1060": {
          elementId: "bkStressTab",
          url: "templates/view-stress-1060.html",
          showFn: "showbkStressTab",
          lifecycle: function () {
            if (typeof window.initBkStressStandaloneUI === "function") {
              window.initBkStressStandaloneUI();
            } else {
              if (typeof window.bkPopulateYears === "function") window.bkPopulateYears();
              if (typeof window.renderYearManagerList === "function") window.renderYearManagerList();
              if (typeof window.updateActiveDatabaseSummaryBadge === "function") window.updateActiveDatabaseSummaryBadge();
              if (typeof window.refreshStressDataFromCloud === "function") window.refreshStressDataFromCloud();
            }
          }
        },
        "1065": {
          elementId: "crackingMechanismTab",
          url: "templates/view-cracking-1065.html",
          showFn: "showCrackingMechanismTab",
          lifecycle: function () {}
        },
        "1070": {
          elementId: "remainingLifeTab",
          url: "templates/view-remaininglife-1070.html",
          showFn: "showRemainingLifeTab",
          lifecycle: function () {
            if (typeof window.showRemainingLifeTab === "function") window.showRemainingLifeTab();
          }
        },
        "1080": {
          elementId: "chemicalSuiteTab",
          url: "templates/view-chemsuite-1080.html",
          showFn: "showChemicalSuiteTab",
          lifecycle: function () {
            if (window.ChemicalSuite && typeof window.ChemicalSuite.init === "function") {
              window.ChemicalSuite.init();
            }
          }
        },
        "1090": {
          elementId: "unitConverterTab",
          url: "templates/view-units-1090.html",
          showFn: "showUnitConverterTab",
          lifecycle: function () {
            if (window.UnitConverter && typeof window.UnitConverter.init === "function") {
              window.UnitConverter.init();
            } else if (typeof window.showUnitConverterTab === "function") {
              window.showUnitConverterTab();
            }
          }
        }
      };

      var ENT_TO_TEMPLATE_KEY = {
        "1000": "1000", "900": "1000",
        "1010": "1010", "700": "1010",
        "1030": "1030",
        "1040": "1040",
        "1041": "1041",
        "1042": "1042",
        "1043": "1043",
        "1044": "1044",
        "1051": "1051",
        "1053": "1053",
        "1054": "1054",
        "1055": "1055",
        "1056": "1056",
        "1057": "1057",
        "1058": "1058",
        "1059": "1059", "9458112": "1059",
        "1060": "1060", "300": "1060",
        "1065": "1065", "400": "1065", "9440001": "1065",
        "200": "200", "9420001": "200",
        "1070": "1070", "570": "1070",
        "1080": "1080", "800": "1080",
        "1090": "1090", "600": "1090"
      };

      // ── Strict UI Pane Isolation Helper ──
      function isolatePane(targetTabId) {
        // 1. Hide welcome panel & overview cards
        if (typeof window.hideWelcomePanel === "function") {
          window.hideWelcomePanel();
        }
        document.querySelectorAll(".welcome-panel, #welcomePanel, #categoryOverviewContent").forEach(function (p) {
          p.classList.add("is-hidden");
          p.style.setProperty("display", "none", "important");
        });

        // 2. Hide damage mechanism detail panel/modals if open
        if (typeof window.hideMechanismDetails === "function") {
          window.hideMechanismDetails();
        }

        // 3. Strict isolation across all tabs in the DOM
        document.querySelectorAll(".tab-content").forEach(function (tab) {
          if (!targetTabId || tab.id !== targetTabId) {
            tab.style.display = "none";
          }
        });

        // 4. Show the target tab
        if (targetTabId) {
          var targetEl = document.getElementById(targetTabId);
          if (targetEl) {
            targetEl.style.display = "block";
          }
        }
      }
      window.isolatePane = isolatePane;

      var TemplateManager = {
        _inFlight: {},
        isLoaded: function (ent) {
          var canonical = ENT_TO_TEMPLATE_KEY[ent] || ent;
          var def = MODULE_TEMPLATES[canonical] || MODULE_TEMPLATES[ent];
          if (!def) return false;
          return !!document.getElementById(def.elementId);
        },
        loadModalTemplate: function (url, checkId, callback) {
          if (document.getElementById(checkId)) {
            if (typeof callback === "function") callback();
            return;
          }
          var mount = document.getElementById("streamModalsMount") || document.getElementById("rbacModalMount") || document.getElementById("pfdModalsMount") || document.getElementById("dynamicModuleMount") || document.body;
          if (checkId === "streamIngestModal") {
            mount = document.getElementById("streamModalsMount") || mount;
          } else if (checkId === "rbacAdminModal") {
            mount = document.getElementById("rbacModalMount") || mount;
          }
          fetch(url)
            .then(function (res) {
              if (!res.ok) throw new Error("HTTP " + res.status);
              return res.text();
            })
            .then(function (html) {
              var div = document.createElement("div");
              div.innerHTML = html;
              while (div.firstChild) {
                mount.appendChild(div.firstChild);
              }
            })
            .catch(function (err) {
              console.warn("[TemplateManager] Failed to load modal template:", url, err);
            })
            .finally(function () {
              if (typeof callback === "function") callback();
            });
        },
        loadPfdModals: function (callback) {
          this.loadModalTemplate("templates/view-pfd-modals.html", "processFlowModal", callback);
        },
        loadStreamModals: function (callback) {
          this.loadModalTemplate("templates/view-stream-ingest-modals.html", "streamIngestModal", callback);
        },
        loadRbacModal: function (callback) {
          this.loadModalTemplate("templates/view-rbac-admin-modal.html", "rbacAdminModal", callback);
        },
        load: function (ent, callback) {
          var canonicalKey = ENT_TO_TEMPLATE_KEY[ent] || ent;
          var def = MODULE_TEMPLATES[canonicalKey] || MODULE_TEMPLATES[ent];
          if (!def) {
            if (typeof callback === "function") callback();
            return;
          }
          // In-Memory DOM Caching: if already present in DOM, isolate and invoke callback
          if (document.getElementById(def.elementId)) {
            isolatePane(def.elementId);
            if (typeof callback === "function") callback();
            return;
          }
          // Deduplicate in-flight fetch requests for the same entity key
          if (this._inFlight[canonicalKey]) {
            this._inFlight[canonicalKey].then(function () {
              isolatePane(def.elementId);
              if (typeof callback === "function") callback();
            }).catch(function (e) {
              console.error("[TemplateManager] Error loading " + canonicalKey, e);
            });
            return;
          }

          var mount = document.getElementById("dynamicModuleMount");
          if (!mount) {
            mount = document.createElement("div");
            mount.id = "dynamicModuleMount";
            var contentArea = document.querySelector(".content");
            if (contentArea) contentArea.appendChild(mount);
            else document.body.appendChild(mount);
          }

          var self = this;
          var fetchUrl = def.url;
          var fetchOpts = {};
          if (canonicalKey === "1000" || (def.url && def.url.indexOf("view-admin-1000") !== -1)) {
            var sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("sessionId") : "") || "";
            var uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("userUid") : "") || "";
            var email = (window.RBAC && window.RBAC.userEmail) || (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("loggedInUser") : "") || "";
            fetchUrl = "/api/admin?action=get_admin_template&email=" + encodeURIComponent(email) + "&_t=" + Date.now();
            var headers = {};
            if (sessionId) headers["x-session-id"] = sessionId;
            if (uid) headers["x-user-uid"] = uid;
            try {
              if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser._lat) {
                headers["authorization"] = "Bearer " + firebase.auth().currentUser._lat;
              }
            } catch (e) {}
            fetchOpts.headers = headers;
          }

          var fetchPromise = fetch(fetchUrl, fetchOpts)
            .then(function (res) {
              if (!res.ok) throw new Error("HTTP " + res.status + " while loading " + fetchUrl);
              return res.text();
            })
            .then(function (html) {
              var tempDiv = document.createElement("div");
              tempDiv.innerHTML = html;
              while (tempDiv.firstChild) {
                mount.appendChild(tempDiv.firstChild);
              }
              // Immediately isolate pane upon mounting any module template
              isolatePane(def.elementId);

              // Safe Post-Load Lifecycle Trigger
              if (typeof def.lifecycle === "function") {
                try {
                  def.lifecycle();
                } catch (lifeErr) {
                  console.warn("[TemplateManager] Post-load lifecycle warning for " + canonicalKey, lifeErr);
                }
              }
            })
            .catch(function (err) {
              console.error("[TemplateManager] Failed to fetch template:", def.url, err);
            })
            .finally(function () {
              delete self._inFlight[canonicalKey];
              if (typeof callback === "function") callback();
            });

          this._inFlight[canonicalKey] = fetchPromise;
        }
      };
      window.TemplateManager = TemplateManager;

      // ── 4. GE APM 3-Level Hierarchy Hash Parser ──
      function parseApmHash(rawHash) {
        var hash = String(rawHash || window.location.hash || "").replace(/^#/, "").trim();
        if (!hash || hash === "0" || hash === "0;rte=home" || hash === "home" || hash === "0;ent=0") {
          return { isHome: true };
        }

        var result = {
          ent: null,
          g: null,
          s: null,
          m: null,
          tab: null,
          assetId: null,
          componentId: null,
          analysisId: null,
          dm: null,
          rawRoute: null,
          isHome: false
        };

        var tokens = hash.split(";").map(function (t) { return t.trim(); }).filter(Boolean);

        tokens.forEach(function (token) {
          var mMatch = token.match(/^m=([0-9a-zA-Z_-]+)$/i);
          if (mMatch) {
            result.m = mMatch[1].toLowerCase();
            return;
          }

          var kvMatch = token.match(/^([a-zA-Z0-9_-]+)=(.*)$/);
          if (kvMatch) {
            var key = kvMatch[1].toLowerCase();
            var val = decodeURIComponent(kvMatch[2].trim());
            if (key === "ent" || key === "entity") result.ent = val;
            else if (key === "g" || key === "grp" || key === "group") result.g = val;
            else if (key === "s" || key === "sub" || key === "tab") result.s = val;
            else if (key === "ast" || key === "asset") result.assetId = val;
            else if (key === "cmp" || key === "component") result.componentId = val;
            else if (key === "anl" || key === "analysis") result.analysisId = val;
            else if (key === "dm") result.dm = val;
            else if (key === "rte") {
              result.rawRoute = val;
              parseRtePath(val, result);
            }
            return;
          }

          if (token === "0") return;
          if (token.indexOf("/") !== -1) {
            parseRtePath(token, result);
          }
        });

        return result;
      }

      function parseRtePath(path, result) {
        var hierMatch = path.match(/assets\/hierarchy\/([^/]+)/i);
        if (hierMatch) {
          result.ent = decodeURIComponent(hierMatch[1]);
        }

        var rbiFullMatch = path.match(/rbi\/asset\/([^/]+)\/component\/([^/]+)\/analysis\/([^/]+)/i);
        if (rbiFullMatch) {
          result.ent = "581";
          result.g = "2";
          result.s = "1";
          result.assetId = decodeURIComponent(rbiFullMatch[1]);
          result.componentId = decodeURIComponent(rbiFullMatch[2]);
          result.analysisId = decodeURIComponent(rbiFullMatch[3]);
          return;
        }

        var rbiCompMatch = path.match(/rbi\/asset\/([^/]+)\/component\/([^/]+)/i);
        if (rbiCompMatch) {
          result.ent = "581";
          result.g = "2";
          result.s = "1";
          result.assetId = decodeURIComponent(rbiCompMatch[1]);
          result.componentId = decodeURIComponent(rbiCompMatch[2]);
          return;
        }

        var rbiAssetMatch = path.match(/rbi\/asset\/([^/]+)/i);
        if (rbiAssetMatch) {
          result.ent = "581";
          result.g = "2";
          result.s = "1";
          result.assetId = decodeURIComponent(rbiAssetMatch[1]);
          return;
        }

        var p = path.toLowerCase();
        if (p === "home") {
          result.isHome = true;
        } else if (p.indexOf("rbi") === 0) {
          result.ent = "581";
          result.g = "2";
          result.s = "1";
        } else if (p.indexOf("stream") === 0 || p.indexOf("hmb") === 0) {
          result.ent = "700";
          result.s = "1";
        } else if (p.indexOf("ccd") === 0) {
          result.ent = "200";
          result.s = "1";
        } else if (p.indexOf("asme") === 0 || p.indexOf("piping") === 0) {
          result.ent = "313";
          result.g = "1";
          result.s = "1";
        } else if (p.indexOf("damage") === 0 || p.indexOf("api571") === 0) {
          result.ent = "571";
          var dmMatch = path.match(/(?:damage|api571)\/([^/]+)/i);
          if (dmMatch) result.dm = decodeURIComponent(dmMatch[1]);
        }
      }

      // ── 5. Route Dispatcher (3-Level Hierarchy & Inbound Fallbacks -> Strict UI Isolation) ──
      function dispatchApmRoute() {
        if (_isNavigatingFromHash) return;
        _isNavigatingFromHash = true;

        try {
          var route = parseApmHash(window.location.hash);

          // Route: Home
          if (route.isHome) {
            var rawH = String(window.location.hash || "").trim();
            var hasActiveTab = !!document.querySelector(".tab-content[style*='display: block'], #dynamicModuleMount .tab-content[style*='display: block']");
            if (rawH === "#" && hasActiveTab) {
              return;
            }
            isolatePane(null);
            if (typeof window.goHome === "function") {
              window.goHome();
            }
            return;
          }

          var ent = String(route.ent || "");
          var g = String(route.g || "");
          var s = String(route.s || "");
          var mod = String(route.m || "");
          var tab = String(route.tab || "");

          var rawEnt = ent;
          // ── Enterprise APM Entity Key Normalization ──
          if (ent === "9458101") { ent = "581"; s = "1"; }
          else if (ent === "9458102") { ent = "581"; s = "2"; }
          else if (ent === "9458103") { ent = "581"; s = "3"; }
          else if (ent === "9458104") { ent = "581"; s = "4"; }
          else if (ent === "9458105") { ent = "581"; s = "5"; }
          else if (ent === "9458106") { ent = "581"; s = "6"; }
          else if (ent === "9458111") { ent = "581"; g = "1"; s = "1"; }
          else if (ent === "9458112") { ent = "581"; g = "1"; s = "2"; }
          else if (ent === "9458121") { ent = "581"; g = "2"; s = "1"; }
          else if (ent === "9431301") { ent = "313"; g = "1"; s = "1"; }
          else if (ent === "9431302") { ent = "313"; g = "1"; s = "2"; }
          else if (ent === "9431303") { ent = "313"; s = "3"; }
          else if (ent === "9431304") { ent = "313"; s = "4"; }
          else if (ent === "9431305") { ent = "313"; s = "5"; }
          else if (ent === "9470001") { ent = "700"; s = "1"; }
          else if (ent === "9480001") { ent = "800"; s = "1"; }
          else if (ent === "9460001") { ent = "600"; s = "1"; }
          else if (ent === "9430001") { ent = "300"; s = "1"; }
          else if (ent === "9440001") { ent = "400"; s = "1"; }
          else if (ent === "9457001") { ent = "570"; s = "1"; }
          else if (ent === "9420001") { ent = "200"; s = "1"; }
          else if (ent === "9457101") { ent = "571"; }
          else if (rawEnt.indexOf("9490") === 0) {
            ent = "900";
            if (rawEnt.length >= 7) {
              g = rawEnt.charAt(4);
              s = String(parseInt(rawEnt.substring(5), 10) || 1);
            } else {
              g = "1"; s = "1";
            }
          }

          // ── Inbound Fallback Normalization for Previous Numeric Keys & Aliases ──
          if (ent === "1010" || mod === "1" || mod === "stream") { ent = "700"; s = s || "1"; }
          else if (ent === "1020" || mod === "2" || mod === "ccd") { ent = "200"; s = s || "1"; }
          else if (ent === "1030" || mod === "3" || mod === "rbi") { ent = "581"; g = "2"; s = "1"; }
          else if (ent === "1040" || (mod === "4" && !tab) || (mod === "asme" && !tab)) { ent = "313"; g = "1"; s = "1"; }
          else if (ent === "1041" || (mod === "piping" && tab === "simple")) { ent = "313"; g = "1"; s = "2"; }
          else if (ent === "1042" || (mod === "asme" && tab === "sec8div1")) { ent = "313"; s = "3"; }
          else if (ent === "1043" || (mod === "piping" && tab === "chart")) { ent = "313"; s = "4"; }
          else if (ent === "1044" || (mod === "piping" && tab === "structural")) { ent = "313"; s = "5"; }
          else if (ent === "1051" || (mod === "api581" && tab === "criteria")) { ent = "581"; s = "1"; }
          else if (ent === "1052" || ent === "1053" || (mod === "api581" && (tab === "corrosion-calc" || tab === "corrosion-rates")) || (mod === "api581" && !tab)) { ent = "581"; s = "2"; }
          else if (ent === "1054" || (mod === "api581" && tab === "fluids")) { ent = "581"; s = "3"; }
          else if (ent === "1055" || (mod === "api581" && tab === "inventory")) { ent = "581"; s = "4"; }
          else if (ent === "1056" || (mod === "api581" && tab === "inspection-confidence")) { ent = "581"; s = "5"; }
          else if (ent === "1057" || (mod === "api581" && tab === "toxic")) { ent = "581"; s = "6"; }
          else if (ent === "1058" || (mod === "api581" && tab === "cof")) { ent = "581"; g = "1"; s = "1"; }
          else if (ent === "1059" || (mod === "api581" && tab === "qpof")) { ent = "581"; g = "1"; s = "2"; }
          else if (ent === "1060" || mod === "bkstress") { ent = "300"; s = s || "1"; }
          else if (ent === "1065" || mod === "cracking") { ent = "400"; s = s || "1"; }
          else if (ent === "1070" || mod === "api570" || mod === "remaininglife") { ent = "570"; s = s || "1"; }
          else if (ent === "1080" || mod === "chemsuite") { ent = "800"; s = s || "1"; }
          else if (ent === "1090" || mod === "units") { ent = "600"; s = s || "1"; }
          else if (ent === "1000" || mod === "admin") { ent = "900"; g = g || "1"; s = s || "1"; }
          else if (ent === "1571" || mod === "571" || mod === "damage" || mod === "api571") { ent = "571"; }

          // ── A. API 581 Risk-Based Inspection (ent=581) ──
          if (ent === "581") {
            if (g === "1") {
              // Quantitative (Group 1)
              if (s === "2") {
                // Risk Calculator_POF
                isolatePane("QPOF_calculatorTab");
                if (typeof window.showQPOF_calculatorTab === "function") window.showQPOF_calculatorTab();
                return;
              }
              // Risk Calculator_COF (s=1 default)
              isolatePane("cof_calculatorTab");
              TemplateManager.load("1058", function () {
                isolatePane("cof_calculatorTab");
                if (typeof window.showcof_calculatorTab === "function") window.showcof_calculatorTab();
              });
              return;
            }

            if (g === "2") {
              // Semi Quantitative (Group 2): Risk Calculator (RBI)
              isolatePane("CORROSION_CALCULATIONTab");
              TemplateManager.load("1030", function () {
                isolatePane("CORROSION_CALCULATIONTab");
                if (typeof window.showCORROSION_CALCULATIONTab === "function") window.showCORROSION_CALCULATIONTab();
                if (window.RBIApp) {
                  if (route.assetId) window.RBIApp.activeAssetId = route.assetId;
                  if (route.componentId) window.RBIApp.activeComponentId = route.componentId;
                  if (route.analysisId) window.RBIApp.activeAnalysisId = route.analysisId;
                  if (typeof window.RBIApp.render === "function") {
                    window.RBIApp.render();
                  }
                }
              });
              return;
            }

            // Direct Tabs (No group): s=1..6
            if (s === "2") {
              // Corrosion Rate Estimator
              isolatePane("corrosionFullTab");
              TemplateManager.load("1053", function () {
                isolatePane("corrosionFullTab");
                if (typeof window.showCorrosionFullTab === "function") window.showCorrosionFullTab();
                else if (typeof window.showCorrosionTab === "function") window.showCorrosionTab();
              });
              return;
            }
            if (s === "3") {
              // Representative Fluid
              isolatePane("fluidSelectorTab");
              TemplateManager.load("1054", function () {
                isolatePane("fluidSelectorTab");
                if (typeof window.showFluidSelectorTab === "function") window.showFluidSelectorTab();
              });
              return;
            }
            if (s === "4") {
              // Inventory Calculator
              isolatePane("inventoryTab");
              TemplateManager.load("1055", function () {
                isolatePane("inventoryTab");
                if (typeof window.showInventoryTab === "function") window.showInventoryTab();
              });
              return;
            }
            if (s === "5") {
              // Inspection Confidence
              isolatePane("inspectionconfidenceTab");
              TemplateManager.load("1056", function () {
                isolatePane("inspectionconfidenceTab");
                if (typeof window.showINSPECTIONCONFIDENCETab === "function") window.showINSPECTIONCONFIDENCETab();
              });
              return;
            }
            if (s === "6") {
              // Toxic % Calculation
              isolatePane("TOXIC_CALCULATIONTab");
              TemplateManager.load("1057", function () {
                isolatePane("TOXIC_CALCULATIONTab");
                if (typeof window.showTOXIC_CALCULATIONTab === "function") window.showTOXIC_CALCULATIONTab();
              });
              return;
            }

            // Criteria of Finding DM (s=1 default)
            isolatePane("a571-criteriaTab");
            TemplateManager.load("1051", function () {
              isolatePane("a571-criteriaTab");
              if (typeof window.showCriteriaTab === "function") window.showCriteriaTab();
            });
            return;
          }

          // ── B. Design Thickness Calculator (ent=313) ──
          if (ent === "313") {
            if (g === "1") {
              // Process Piping (Group 1)
              if (s === "2") {
                // Simple Formula (PD / 2SE)
                isolatePane("simplePipingTab");
                TemplateManager.load("1041", function () {
                  isolatePane("simplePipingTab");
                  if (typeof window.showSimplePipingTab === "function") window.showSimplePipingTab();
                });
                return;
              }
              // ASME B31.3 Advanced (s=1 default)
              isolatePane("ASMEB31_3Tab");
              TemplateManager.load("1040", function () {
                isolatePane("ASMEB31_3Tab");
                if (typeof window.showASMEB31_3Tab === "function") window.showASMEB31_3Tab();
              });
              return;
            }

            // Direct Tabs: s=3..5 (or s=1..2 if specified without group)
            if (s === "2") {
              isolatePane("simplePipingTab");
              TemplateManager.load("1041", function () {
                isolatePane("simplePipingTab");
                if (typeof window.showSimplePipingTab === "function") window.showSimplePipingTab();
              });
              return;
            }
            if (s === "3") {
              // Pressure Vessel (Section VIII Div 1)
              isolatePane("ASMESECTIONVIIIDIV1Tab");
              TemplateManager.load("1042", function () {
                isolatePane("ASMESECTIONVIIIDIV1Tab");
                if (typeof window.showASMESECTIONVIIIDIV1Tab === "function") window.showASMESECTIONVIIIDIV1Tab();
              });
              return;
            }
            if (s === "4") {
              // Piping Thickness Chart
              isolatePane("pipeThicknessTab");
              TemplateManager.load("1043", function () {
                isolatePane("pipeThicknessTab");
                if (typeof window.showpipeThicknessTab === "function") window.showpipeThicknessTab();
              });
              return;
            }
            if (s === "5") {
              // Structural Thickness Lookup
              isolatePane("structuralThicknessTab");
              TemplateManager.load("1044", function () {
                isolatePane("structuralThicknessTab");
                if (typeof window.showStructuralThicknessTab === "function") window.showStructuralThicknessTab();
              });
              return;
            }

            // Default: ASME B31.3 Advanced
            isolatePane("ASMEB31_3Tab");
            TemplateManager.load("1040", function () {
              isolatePane("ASMEB31_3Tab");
              if (typeof window.showASMEB31_3Tab === "function") window.showASMEB31_3Tab();
            });
            return;
          }

          // ── C. Tools & Admin Control Center (ent=900) ──
          if (ent === "900") {
            isolatePane("adminPanelTab");
            TemplateManager.load("1000", function () {
              isolatePane("adminPanelTab");
              if (typeof window.showAdminPanelTab === "function") window.showAdminPanelTab();

              var gKey = String(g || "1");
              var sKey = String(s || "1");
              var targetView = (ADMIN_VIEWS[gKey] && ADMIN_VIEWS[gKey][sKey]) ? ADMIN_VIEWS[gKey][sKey] : "users-list";

              function triggerAdminNav() {
                if (window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
                  window.adminPanel.navigateTo(targetView);
                }
              }

              if (window.adminPanel && typeof window.adminPanel.navigateTo === "function") {
                triggerAdminNav();
              } else {
                setTimeout(triggerAdminNav, 60);
                setTimeout(triggerAdminNav, 200);
              }
            });
            return;
          }

          // ── D. Standalone & Aliased Modules ──
          // Stream & Material Balance (ent=700)
          if (ent === "700") {
            isolatePane("streamComparatorTab");
            TemplateManager.load("1010", function () {
              isolatePane("streamComparatorTab");
              if (typeof window.showStreamComparatorTab === "function") window.showStreamComparatorTab();
            });
            return;
          }

          // Chemical Suite (ent=800)
          if (ent === "800") {
            isolatePane("chemicalSuiteTab");
            TemplateManager.load("1080", function () {
              isolatePane("chemicalSuiteTab");
              if (typeof window.showChemicalSuiteTab === "function") window.showChemicalSuiteTab("suit");
            });
            return;
          }

          // Unit Converters (ent=600)
          if (ent === "600") {
            isolatePane("unitConverterTab");
            TemplateManager.load("1090", function () {
              isolatePane("unitConverterTab");
              if (typeof window.showUnitConverterTab === "function") window.showUnitConverterTab();
            });
            return;
          }

          // Allowable Stress DB (ent=300)
          if (ent === "300") {
            isolatePane("bkStressTab");
            TemplateManager.load("1060", function () {
              isolatePane("bkStressTab");
              if (typeof window.showbkStressTab === "function") window.showbkStressTab();
            });
            return;
          }

          // Cracking Mechanism (ent=400)
          if (ent === "400") {
            isolatePane("crackingMechanismTab");
            TemplateManager.load("1065", function () {
              isolatePane("crackingMechanismTab");
              if (typeof window.showCrackingMechanismTab === "function") window.showCrackingMechanismTab();
            });
            return;
          }

          // Remaining Life (ent=570)
          if (ent === "570") {
            isolatePane("remainingLifeTab");
            TemplateManager.load("1070", function () {
              isolatePane("remainingLifeTab");
              if (typeof window.showRemainingLifeTab === "function") window.showRemainingLifeTab();
            });
            return;
          }

          // CCD AI Platform (ent=200)
          if (ent === "200") {
            isolatePane("ccdAiTab");
            if (typeof window.showCCDAITab === "function") window.showCCDAITab();
            return;
          }

          // Damage Mechanism Explorer & Specific Mechanisms (ent=571)
          if (ent === "571") {
            waitForDamageData(function () {
              if (route.dm && typeof window.showMechanismDetails === "function") {
                var mech = typeof window.getDamageMechanismByName === "function"
                  ? window.getDamageMechanismByName(route.dm)
                  : (window.data && window.data["Damage Mechanism"] ? window.data["Damage Mechanism"][route.dm] : null);
                if (mech) {
                  window.showMechanismDetails(mech.code || route.dm, mech);
                  return;
                }
              }
              if (typeof window.openDamageExplorerCard === "function") {
                window.openDamageExplorerCard();
              }
            });
            return;
          }
        } catch (err) {
          console.warn("[ApmRouter] Navigation dispatch warning:", err);
        } finally {
          setTimeout(function () {
            _isNavigatingFromHash = false;
          }, 60);
        }
      }

      function waitForDamageData(callback, maxWaitMs) {
        var maxWait = maxWaitMs || 6000;
        var start = Date.now();
        function check() {
          if (window.data && window.data["Damage Mechanism"] && Object.keys(window.data["Damage Mechanism"]).length > 0) {
            callback();
          } else if (Date.now() - start < maxWait) {
            setTimeout(check, 100);
          } else {
            callback();
          }
        }
        check();
      }

      // ── 6. Two-Way URL Syncing (UI -> 3-Level Hierarchy Hash) ──
      function installUrlSyncHooks() {
        // A. Wrap global tab functions with automatic on-demand template loading
        Object.keys(FUNCTION_TO_HASH).forEach(function (fnName) {
          var targetHash = FUNCTION_TO_HASH[fnName];
          if (typeof window[fnName] === "function" && !window[fnName].__apmUrlSyncHooked && !window[fnName].__rbacWrapped) {
            var origFn = window[fnName];
            var mappedEnt = null;
            Object.keys(MODULE_TEMPLATES).forEach(function (k) {
              if (MODULE_TEMPLATES[k].showFn === fnName) mappedEnt = k;
            });

            var wrapped = function () {
              var selfArgs = arguments;
              var selfCtx = this;

              function runOriginalAndSync() {
                var ret = origFn.apply(selfCtx, selfArgs);
                if (fnName === "showCORROSION_CALCULATIONTab" && window.RBIApp && window.RBIApp.activeAssetId) {
                  var dynHash = "#0;ent=581;g=2;s=1;ast=" + encodeURIComponent(window.RBIApp.activeAssetId);
                  if (window.RBIApp.activeComponentId) dynHash += ";cmp=" + encodeURIComponent(window.RBIApp.activeComponentId);
                  if (window.RBIApp.activeAnalysisId) dynHash += ";anl=" + encodeURIComponent(window.RBIApp.activeAnalysisId);
                  setHashWithoutTriggeringRouter(dynHash);
                } else {
                  setHashWithoutTriggeringRouter(targetHash);
                }
                return ret;
              }

              if (mappedEnt && !TemplateManager.isLoaded(mappedEnt)) {
                TemplateManager.load(mappedEnt, function () {
                  runOriginalAndSync();
                });
                return;
              }

              return runOriginalAndSync();
            };

            wrapped.__apmUrlSyncHooked = true;
            wrapped.__origFn = origFn;
            window[fnName] = wrapped;
          }
        });

        // B. Wrap showMechanismDetails for specific damage mechanism deep-link
        if (typeof window.showMechanismDetails === "function" && !window.showMechanismDetails.__apmUrlSyncHooked) {
          var origMechFn = window.showMechanismDetails;
          var wrappedMech = function (code, data) {
            var ret = origMechFn.apply(this, arguments);
            var dmCode = code || (data && (data.code || data.name)) || "";
            if (dmCode) {
              setHashWithoutTriggeringRouter("#0;ent=571;dm=" + encodeURIComponent(dmCode));
            }
            return ret;
          };
          wrappedMech.__apmUrlSyncHooked = true;
          wrappedMech.__recentTabsHooked = origMechFn.__recentTabsHooked;
          wrappedMech.__originalFn = origMechFn.__originalFn || origMechFn;
          window.showMechanismDetails = wrappedMech;
        }

        // C. Hook RecentTabsManager.switchToTab
        if (window.recentTabsManager && typeof window.recentTabsManager.switchToTab === "function" && !window.recentTabsManager.switchToTab.__apmUrlSyncHooked) {
          var origSwitch = window.recentTabsManager.switchToTab;
          window.recentTabsManager.switchToTab = function (tabId) {
            var mappedEnt = null;
            Object.keys(MODULE_TEMPLATES).forEach(function (k) {
              if (MODULE_TEMPLATES[k].elementId === tabId) mappedEnt = k;
            });

            if (mappedEnt && !TemplateManager.isLoaded(mappedEnt)) {
              TemplateManager.load(mappedEnt, function () {
                origSwitch.call(window.recentTabsManager, tabId);
                if (TAB_ID_TO_HASH[tabId]) {
                  setHashWithoutTriggeringRouter(TAB_ID_TO_HASH[tabId]);
                }
              });
              return;
            }

            var ret = origSwitch.apply(this, arguments);
            if (TAB_ID_TO_HASH[tabId]) {
              setHashWithoutTriggeringRouter(TAB_ID_TO_HASH[tabId]);
            } else if (tabId && tabId.indexOf("dm_") === 0) {
              var dmVal = tabId.replace(/^dm_(mech_)?/, "");
              setHashWithoutTriggeringRouter("#0;ent=571;dm=" + encodeURIComponent(dmVal));
            }
            return ret;
          };
          window.recentTabsManager.switchToTab.__apmUrlSyncHooked = true;
        }

        // D. Hook window.adminPanel.navigateTo for granular subsection synchronization
        if (window.adminPanel && typeof window.adminPanel.navigateTo === "function" && !window.adminPanel.navigateTo.__apmUrlSyncHooked) {
          var origAdminNav = window.adminPanel.navigateTo;
          window.adminPanel.navigateTo = function (viewId) {
            var ret = origAdminNav.apply(this, arguments);
            var mappedHash = ADMIN_VIEW_TO_HASH[viewId];
            if (mappedHash) {
              setHashWithoutTriggeringRouter(mappedHash);
            }
            return ret;
          };
          window.adminPanel.navigateTo.__apmUrlSyncHooked = true;
        }
      }

      // ── 7. Global Helper: window.navigateToApmRecord ──
      window.navigateToApmRecord = function (options) {
        options = options || {};
        var parts = ["0"];

        var entKey = options.ent;
        var gKey = options.g;
        var sKey = options.s;

        if (!entKey && options.m !== undefined) {
          var mNum = String(options.m);
          if (mNum === "1") { entKey = "700"; sKey = "1"; }
          else if (mNum === "2") { entKey = "200"; sKey = "1"; }
          else if (mNum === "3") { entKey = "581"; gKey = "2"; sKey = "1"; }
          else if (mNum === "4") { entKey = "313"; gKey = "1"; sKey = "1"; }
          else if (mNum === "571") { entKey = "571"; }
          else entKey = mNum;
        }

        if (entKey) {
          parts.push("ent=" + encodeURIComponent(entKey));
        }
        if (gKey) {
          parts.push("g=" + encodeURIComponent(gKey));
        }
        if (sKey) {
          parts.push("s=" + encodeURIComponent(sKey));
        }

        if (options.ast || options.cmp || options.anl) {
          if (options.ast) parts.push("ast=" + encodeURIComponent(options.ast));
          if (options.cmp) parts.push("cmp=" + encodeURIComponent(options.cmp));
          if (options.anl) parts.push("anl=" + encodeURIComponent(options.anl));
        }

        if (options.dm) {
          parts.push("dm=" + encodeURIComponent(options.dm));
        }

        var newHash = "#" + parts.join(";");
        if (window.location.hash !== newHash) {
          window.location.hash = newHash;
        } else {
          dispatchApmRoute();
        }
      };

      // ── 8. DOM Click Delegator for data-ent and data-fam & API 571 Damage Mechanisms ──
      document.addEventListener("click", function (e) {
        var entTarget = e.target && e.target.closest ? e.target.closest("[data-ent]") : null;
        if (entTarget) {
          var entKey = entTarget.getAttribute("data-ent");
          var famKey = entTarget.getAttribute("data-fam") || "7652581";
          if (entKey) {
            if (e && typeof e.preventDefault === "function") e.preventDefault();
            navigateByEntity(famKey, entKey);
            return;
          }
        }

        var mechLink = e.target && e.target.closest ? e.target.closest("#categoryList li.category-toggle li a") : null;
        if (mechLink && !mechLink.closest("[id^='rbac_cat_']")) {
          var mechName = (mechLink.textContent || "").trim();
          if (mechName) {
            setHashWithoutTriggeringRouter("#0;ent=571;dm=" + encodeURIComponent(mechName));
          }
        }
      }, true);

      // ── 9. Lifecycle Listeners ──
      window.addEventListener("hashchange", dispatchApmRoute);
      window.addEventListener("popstate", dispatchApmRoute);

      function initRouter() {
        if (TemplateManager && typeof TemplateManager.loadPfdModals === "function") {
          TemplateManager.loadPfdModals();
        }
        installUrlSyncHooks();
        var retries = 0;
        var intervalId = setInterval(function () {
          installUrlSyncHooks();
          retries++;
          if (retries > 6) clearInterval(intervalId);
        }, 800);

        var curH = String(window.location.hash || "").trim();
        if (!curH || curH === "#" || curH === "#0") {
          setHashWithoutTriggeringRouter("#0;rte=home", true);
        } else if (curH !== "#0;rte=home") {
          setTimeout(dispatchApmRoute, 120);
        }
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initRouter);
      } else {
        initRouter();
      }
    })();