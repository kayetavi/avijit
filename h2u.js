// ==========================================================================
// H2U.JS - HYDROGEN GENERATION UNIT (H2U) ENGINE
// ==========================================================================

let selectedH2UDMCode = "3";
let h2uBlinkIntervals = [];

function initH2U() {
  const modal = document.getElementById("h2uModal");
  if (!modal) return;

  const svgContainer = document.getElementById("h2u-svgContainer");
  if (!svgContainer) return;

  if (!svgContainer.querySelector("svg")) {
    fetch("H2U-Model.svg")
      .then(res => res.text())
      .then(data => {
        svgContainer.innerHTML = data;
        setupH2USVGLogic(modal, svgContainer);
      })
      .catch(err => {
        console.error("Failed to load H2U SVG:", err);
      });
  } else {
    setupH2USVGLogic(modal, svgContainer);
  }
}

function setupH2USVGLogic(modal, svgContainer) {
  const svgRoot = svgContainer.querySelector("svg");
  if (!svgRoot) return;

  const dmListItems = modal.querySelectorAll("#h2u-dm-list li");
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
    if (item.__h2uBound) return;
    item.__h2uBound = true;

    item.addEventListener("click", () => {
      const dmCode = item.getAttribute("data-dm").trim();
      selectH2UDamageMechanism(dmCode, item);
    });
  });

  // Bind click logic to SVG diagram text & tspan nodes
  svgRoot.querySelectorAll("text, tspan").forEach(txt => {
    if (txt.__h2uTxtBound) return;
    txt.__h2uTxtBound = true;
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
        selectH2UDamageMechanism(matchedDmCode, matchedItem);
        if (typeof window.openAPI571Details === "function") {
          window.openAPI571Details(matchedDmCode, "h2u");
        }
      });
    }
  });

  // Select default if none selected
  if (!selectedH2UDMCode) selectedH2UDMCode = "3";
  const defaultItem = modal.querySelector(`#h2u-dm-list li[data-dm="${selectedH2UDMCode}"]`) || dmListItems[0];
  if (defaultItem) {
    selectH2UDamageMechanism(defaultItem.getAttribute("data-dm").trim(), defaultItem, false);
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

function selectH2UDamageMechanism(dmCode, itemEl, triggerBlink = true) {
  selectedH2UDMCode = dmCode;
  const modal = document.getElementById("h2uModal");
  if (!modal) return;

  const dmListItems = modal.querySelectorAll("#h2u-dm-list li");
  dmListItems.forEach(li => li.classList.remove("active"));
  if (itemEl) itemEl.classList.add("active");

  const itemName = itemEl ? (itemEl.querySelector(".dm-item-name")?.textContent || dmCode) : dmCode;

  // Update Top Toolbar Badge
  const activeBadge = document.getElementById("h2uActiveBadge");
  if (activeBadge) activeBadge.textContent = `🎯 Active DM: ${dmCode} - ${itemName}`;

  // Clear previous blinking
  h2uBlinkIntervals.forEach(interval => clearInterval(interval));
  h2uBlinkIntervals = [];

  const svgRoot = modal.querySelector("#h2u-svgContainer svg");
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
        txt.style.fill = visible ? "#7c3aed" : "#00ffff";
        txt.style.stroke = visible ? "#00ffff" : "#7c3aed";
        txt.style.strokeWidth = "3px";
        txt.style.filter = `drop-shadow(0 0 6px ${visible ? "#00ffff" : "#7c3aed"}) drop-shadow(0 0 12px ${visible ? "#7c3aed" : "#00ffff"})`;
        visible = !visible;
      }, 500);
      h2uBlinkIntervals.push(interval);
    }
  });
}

window.clearH2uBlinkIntervals = function() {
  h2uBlinkIntervals.forEach(i => clearInterval(i));
  h2uBlinkIntervals = [];
  const svgRoot = document.querySelector("#h2u-svgContainer svg");
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
function openH2UProcessFlowModal() {
  const modal = document.getElementById("h2uModal");
  if (modal) modal.style.display = "block";
  initH2U();
}

function openH2UModal() {
  openH2UProcessFlowModal();
}

// Close Modal
function closeH2UModal() {
  const modal = document.getElementById("h2uModal");
  if (modal) modal.style.display = "none";
  window.clearH2uBlinkIntervals();
  if (document.fullscreenElement === modal && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

// Open Details Modal for H2U
function openH2UDetailsModal(overrideCode) {
  const targetCode = overrideCode || selectedH2UDMCode || "3";
  window.renderAPI571DetailsModal(targetCode, "h2u-detailsModal", "h2u-detailsContent", "h2uDetailsModalTitle");
}

// Close Details Modal for H2U
function closeH2UDetailsModal() {
  const modal = document.getElementById("h2u-detailsModal");
  if (modal) modal.style.display = "none";
}

// Global exposure
if (typeof window !== "undefined") {
  window.initH2U = initH2U;
  window.openH2UProcessFlowModal = openH2UProcessFlowModal;
  window.openH2UModal = openH2UModal;
  window.closeH2UModal = closeH2UModal;
  window.openH2UDetailsModal = openH2UDetailsModal;
  window.closeH2UDetailsModal = closeH2UDetailsModal;

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const detailsModal = document.getElementById("h2u-detailsModal");
      if (detailsModal && detailsModal.style.display === "flex") {
        closeH2UDetailsModal();
        return;
      }
      const h2uModal = document.getElementById("h2uModal");
      if (h2uModal && h2uModal.style.display === "block") {
        closeH2UModal();
      }
    }
  });
}
