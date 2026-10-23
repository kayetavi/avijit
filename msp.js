// ==========================================================================
// MSP.JS - MEDIUM PRESSURE SEPARATOR (MSP) ENGINE
// ==========================================================================

let selectedMSPDMCode = "3";
let mspBlinkIntervals = [];

function initMSP() {
  const modal = document.getElementById("mspModal");
  if (!modal) return;

  const svgContainer = document.getElementById("msp-svgContainer");
  if (!svgContainer) return;

  if (!svgContainer.querySelector("svg")) {
    fetch("MSP-Model.svg")
      .then(res => res.text())
      .then(data => {
        svgContainer.innerHTML = data;
        setupMSPSVGLogic(modal, svgContainer);
      })
      .catch(err => {
        console.error("Failed to load MSP SVG:", err);
      });
  } else {
    setupMSPSVGLogic(modal, svgContainer);
  }
}

function setupMSPSVGLogic(modal, svgContainer) {
  const svgRoot = svgContainer.querySelector("svg");
  if (!svgRoot) return;

  const dmListItems = modal.querySelectorAll("#msp-dm-list li");
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
    if (item.__mspBound) return;
    item.__mspBound = true;

    item.addEventListener("click", () => {
      const dmCode = item.getAttribute("data-dm").trim();
      selectMSPDamageMechanism(dmCode, item);
    });
  });

  // Bind click logic to SVG diagram text & tspan nodes
  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    if (txt.__mspTxtBound) return;
    txt.__mspTxtBound = true;
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
        selectMSPDamageMechanism(matchedDmCode, matchedItem);
        if (typeof window.openAPI571Details === "function") {
          window.openAPI571Details(matchedDmCode, "msp");
        }
      });
    }
  });

  // Select default if none selected
  if (!selectedMSPDMCode) selectedMSPDMCode = "3";
  const defaultItem = modal.querySelector(`#msp-dm-list li[data-dm="${selectedMSPDMCode}"]`) || dmListItems[0];
  if (defaultItem) {
    selectMSPDamageMechanism(defaultItem.getAttribute("data-dm").trim(), defaultItem, false);
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

function selectMSPDamageMechanism(dmCode, itemEl, triggerBlink = true) {
  selectedMSPDMCode = dmCode;
  const modal = document.getElementById("mspModal");
  if (!modal) return;

  const dmListItems = modal.querySelectorAll("#msp-dm-list li");
  dmListItems.forEach(li => li.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const itemName = itemEl ? (itemEl.querySelector(".dm-item-name")?.textContent || dmCode) : dmCode;

  // Update Top Toolbar Badge
  const activeBadge = document.getElementById("mspActiveBadge");
  if (activeBadge) activeBadge.textContent = `🎯 Active DM: ${dmCode} - ${itemName}`;

  // Clear previous blinking
  mspBlinkIntervals.forEach(interval => clearInterval(interval));
  mspBlinkIntervals = [];

  const svgRoot = modal.querySelector("#msp-svgContainer svg");
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
        txt.style.fill = visible ? "#0d9488" : "#2dd4bf";
        txt.style.stroke = visible ? "#2dd4bf" : "#0d9488";
        txt.style.strokeWidth = "3px";
        txt.style.filter = `drop-shadow(0 0 6px ${visible ? "#2dd4bf" : "#0d9488"}) drop-shadow(0 0 12px ${visible ? "#0d9488" : "#2dd4bf"})`;
        visible = !visible;
      }, 500);
      mspBlinkIntervals.push(interval);
    }
  });
}

window.clearMspBlinkIntervals = function() {
  mspBlinkIntervals.forEach(i => clearInterval(i));
  mspBlinkIntervals = [];
  const svgRoot = document.querySelector("#msp-svgContainer svg");
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
function openMSPProcessFlowModal() {
  const modal = document.getElementById("mspModal");
  if (modal) modal.style.display = "block";
  initMSP();
}

function openMSPModal() {
  openMSPProcessFlowModal();
}

// Close Modal
function closeMSPModal() {
  const modal = document.getElementById("mspModal");
  if (modal) modal.style.display = "none";
  window.clearMspBlinkIntervals();
  if (document.fullscreenElement === modal && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

// Open Details Modal for MSP
function openMSPDetailsModal(overrideCode) {
  const targetCode = overrideCode || selectedMSPDMCode || "3";
  window.renderAPI571DetailsModal(targetCode, "msp-detailsModal", "msp-detailsContent", "mspDetailsModalTitle");
}

// Close Details Modal for MSP
function closeMSPDetailsModal() {
  const modal = document.getElementById("msp-detailsModal");
  if (modal) modal.style.display = "none";
}

// Global exposure
if (typeof window !== "undefined") {
  window.initMSP = initMSP;
  window.openMSPProcessFlowModal = openMSPProcessFlowModal;
  window.openMSPModal = openMSPModal;
  window.closeMSPModal = closeMSPModal;
  window.openMSPDetailsModal = openMSPDetailsModal;
  window.closeMSPDetailsModal = closeMSPDetailsModal;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const detailsModal = document.getElementById("msp-detailsModal");
      if (detailsModal && detailsModal.style.display === "flex") {
        closeMSPDetailsModal();
        return;
      }
      const mspModal = document.getElementById("mspModal");
      if (mspModal && mspModal.style.display === "block") {
        closeMSPModal();
      }
    }
  });
}
