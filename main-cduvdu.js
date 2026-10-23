// ==========================================================================
// MAIN-CDUVDU.JS - CRUDE & VACUUM DISTILLATION (CDU / VDU) ENGINE
// ==========================================================================

let selectedCDUVDUDMCode = "1";
let cduvduBlinkIntervals = [];

function initCDUVDU() {
  const modal = document.getElementById("cduVduModal");
  if (!modal) return;

  const svgContainer = document.getElementById("cduvdu-svgContainer");
  if (!svgContainer) return;

  if (!svgContainer.querySelector("svg")) {
    fetch("CDU-VDU-Model.svg")
      .then(res => res.text())
      .then(data => {
        svgContainer.innerHTML = data;
        setupCDUVDUSVGLogic(modal, svgContainer);
      })
      .catch(err => {
        console.error("Failed to load CDU/VDU SVG:", err);
      });
  } else {
    setupCDUVDUSVGLogic(modal, svgContainer);
  }
}

function setupCDUVDUSVGLogic(modal, svgContainer) {
  const svgRoot = svgContainer.querySelector("svg");
  if (!svgRoot) return;

  const dmListItems = modal.querySelectorAll("#cduvdu-dm-list li");
  const viewBox = svgRoot.viewBox.baseVal;

  if (!svgRoot.getAttribute("viewBox")) {
    const vb = svgRoot.getBBox();
    svgRoot.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
  }

  if (!svgRoot.__initialViewBox) {
    svgRoot.__initialViewBox = {
      x: viewBox.x,
      y: viewBox.y,
      width: viewBox.width,
      height: viewBox.height
    };
  }

  // Bind click logic
  dmListItems.forEach(item => {
    if (item.__cduvduBound) return;
    item.__cduvduBound = true;

    item.addEventListener("click", () => {
      const dmCode = item.getAttribute("data-dm").trim();
      selectCDUVDUDamageMechanism(dmCode, item);
    });
  });

  // Bind click logic to SVG diagram text & tspan nodes
  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    if (txt.__cduvduTxtBound) return;
    txt.__cduvduTxtBound = true;
    const txtContent = (txt.textContent || "").replace(/\s+/g, '').trim();
    if (!txtContent) return;

    let matchedItem = null;
    let matchedDmCode = null;
    dmListItems.forEach(item => {
      const dmCode = (item.getAttribute("data-dm") || "").trim();
      if (txtContent === dmCode || txtContent === `DM${dmCode}` || txtContent === `DM-${dmCode}` || txtContent.includes(`(${dmCode})`)) {
        matchedItem = item;
        matchedDmCode = dmCode;
      }
    });

    if (matchedDmCode) {
      txt.style.cursor = "pointer";
      txt.addEventListener("click", (e) => {
        e.stopPropagation();
        selectCDUVDUDamageMechanism(matchedDmCode, matchedItem);
        if (typeof window.openAPI571Details === "function") {
          window.openAPI571Details(matchedDmCode, "cduvdu");
        }
      });
    }
  });

  // Select default if none selected
  if (!selectedCDUVDUDMCode) selectedCDUVDUDMCode = "1";
  const defaultItem = modal.querySelector(`#cduvdu-dm-list li[data-dm="${selectedCDUVDUDMCode}"]`) || dmListItems[0];
  if (defaultItem) {
    selectCDUVDUDamageMechanism(defaultItem.getAttribute("data-dm").trim(), defaultItem, false);
  }

  // Setup Pan & Zoom handlers
  if (!svgRoot.__panZoomBound) {
    svgRoot.__panZoomBound = true;
    let isPanning = false, startX, startY;

    svgRoot.addEventListener("mousedown", (e) => {
      isPanning = true;
      startX = e.clientX;
      startY = e.clientY;
      svgRoot.style.cursor = "grabbing";
    });

    window.addEventListener("mouseup", () => {
      isPanning = false;
      svgRoot.style.cursor = "grab";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      const dx = (e.clientX - startX) * (viewBox.width / svgRoot.clientWidth);
      const dy = (e.clientY - startY) * (viewBox.height / svgRoot.clientHeight);
      viewBox.x -= dx;
      viewBox.y -= dy;
      startX = e.clientX;
      startY = e.clientY;
    });

    svgRoot.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const scale = e.deltaY < 0 ? 1 / zoomFactor : zoomFactor;
      const newWidth = viewBox.width * scale;
      const newHeight = viewBox.height * scale;
      if (newWidth > 25000 || newWidth < 20) return;
      viewBox.x += (viewBox.width - newWidth) / 2;
      viewBox.y += (viewBox.height - newHeight) / 2;
      viewBox.width = newWidth;
      viewBox.height = newHeight;
    });
  }
}

function selectCDUVDUDamageMechanism(dmCode, itemEl, triggerBlink = true) {
  selectedCDUVDUDMCode = dmCode;
  const modal = document.getElementById("cduVduModal");
  if (!modal) return;

  const dmListItems = modal.querySelectorAll("#cduvdu-dm-list li");
  dmListItems.forEach(li => li.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const itemName = itemEl ? (itemEl.querySelector(".dm-item-name")?.textContent || dmCode) : dmCode;

  // Update Top Toolbar Badge
  const activeBadge = document.getElementById("cduvduActiveBadge");
  if (activeBadge) activeBadge.textContent = `🎯 Active DM: ${dmCode} - ${itemName}`;

  // Clear previous blinking
  cduvduBlinkIntervals.forEach(interval => clearInterval(interval));
  cduvduBlinkIntervals = [];

  const svgRoot = modal.querySelector("#cduvdu-svgContainer svg");
  if (!svgRoot) return;

  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    txt.style.fill = "";
    txt.style.stroke = "";
    txt.style.strokeWidth = "";
    txt.style.filter = "";
  });

  if (!triggerBlink) return;

  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    const cleanText = txt.textContent.replace(/\s+/g, '').trim();
    if (cleanText === dmCode) {
      let visible = true;
      let ticks = 0;
      const interval = setInterval(() => {
        ticks++;
        if (ticks > 16) {
          clearInterval(interval);
          txt.style.fill = "";
          txt.style.stroke = "";
          txt.style.strokeWidth = "";
          txt.style.filter = "";
          return;
        }
        txt.style.fill = visible ? "#2563eb" : "#00ffff";
        txt.style.stroke = visible ? "#00ffff" : "#2563eb";
        txt.style.strokeWidth = "3px";
        txt.style.filter = `drop-shadow(0 0 6px ${visible ? "#00ffff" : "#2563eb"}) drop-shadow(0 0 12px ${visible ? "#2563eb" : "#00ffff"})`;
        visible = !visible;
      }, 500);
      cduvduBlinkIntervals.push(interval);
    }
  });
}

window.clearCduvduBlinkIntervals = function() {
  cduvduBlinkIntervals.forEach(i => clearInterval(i));
  cduvduBlinkIntervals = [];
  const svgRoot = document.querySelector("#cduvdu-svgContainer svg");
  if (svgRoot) {
    svgRoot.querySelectorAll("text, tspan").forEach(txt => {
      txt.style.fill = "";
      txt.style.stroke = "";
      txt.style.strokeWidth = "";
      txt.style.filter = "";
    });
  }
};

// Open Modal
function openCDUVDUProcessFlowModal() {
  const modal = document.getElementById("cduVduModal");
  if (modal) modal.style.display = "block";
  initCDUVDU();
}

function openCDUVDUModal() {
  openCDUVDUProcessFlowModal();
}

// Close Modal
function closeCDUVDUModal() {
  const modal = document.getElementById("cduVduModal");
  if (modal) modal.style.display = "none";
  window.clearCduvduBlinkIntervals();
  if (document.fullscreenElement === modal && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

// Open Details Modal for CDU/VDU
function openCDUVDUDetailsModal(overrideCode) {
  const targetCode = overrideCode || selectedCDUVDUDMCode || "1";
  window.renderAPI571DetailsModal(targetCode, "cduvdu-detailsModal", "cduvdu-detailsContent", "cduvduDetailsModalTitle");
}

// Close Details Modal for CDU/VDU
function closeCDUVDUDetailsModal() {
  const modal = document.getElementById("cduvdu-detailsModal");
  if (modal) modal.style.display = "none";
}

// Global exposure
if (typeof window !== "undefined") {
  window.initCDUVDU = initCDUVDU;
  window.openCDUVDUProcessFlowModal = openCDUVDUProcessFlowModal;
  window.openCDUVDUModal = openCDUVDUModal;
  window.closeCDUVDUModal = closeCDUVDUModal;
  window.openCDUVDUDetailsModal = openCDUVDUDetailsModal;
  window.closeCDUVDUDetailsModal = closeCDUVDUDetailsModal;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const detailsModal = document.getElementById("cduvdu-detailsModal");
      if (detailsModal && detailsModal.style.display === "flex") {
        closeCDUVDUDetailsModal();
        return;
      }
      const cduModal = document.getElementById("cduVduModal");
      if (cduModal && cduModal.style.display === "block") {
        closeCDUVDUModal();
      }
    }
  });
}
