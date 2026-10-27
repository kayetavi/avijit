/**
 * ⚛️ KayetDMS Periodic Table of Elements & 3D Bohr Atom Visualizer
 * Fully responsive IUPAC 118-element interactive database with 3D Bohr model.
 */
(function () {
  "use strict";

  // Categories & 118 Elements Database (Hydrated from Cloud Firestore via /api/database?type=periodic-table)
  let CATEGORIES = {};
  let ELEMENTS = [];
  const BY_NUM = {};
  const BY_SYM = {};
  let _ptableDataPromise = null;

  function ensurePeriodicTableLoaded() {
    if (ELEMENTS.length > 0) return Promise.resolve({ categories: CATEGORIES, elements: ELEMENTS });
    if (_ptableDataPromise) return _ptableDataPromise;
    _ptableDataPromise = fetch("/api/database?type=periodic-table")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.categories && Array.isArray(data.elements)) {
          CATEGORIES = data.categories;
          ELEMENTS = data.elements;
          ELEMENTS.forEach(el => {
            BY_NUM[el.number] = el;
            if (el.symbol) BY_SYM[el.symbol.toLowerCase()] = el;
          });
        }
        return { categories: CATEGORIES, elements: ELEMENTS };
      })
      .catch(err => {
        console.warn("[PeriodicTable] Failed to hydrate periodic table:", err);
        return { categories: CATEGORIES, elements: ELEMENTS };
      })
      .finally(() => {
        _ptableDataPromise = null;
      });
    return _ptableDataPromise;
  }

  // =========================================================================
  // 3D BOHR ATOM MODEL CANVAS RENDERER
  // =========================================================================
  class BohrModel3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.element = null;
      this.animId = null;
      this.rotX = 0.55; // Tilted angle for 3D perspective
      this.rotY = 0.0;
      this.speed = 1.0;
      this.isPaused = false;
      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.time = 0;

      this.initEvents();
    }

    initEvents() {
      const c = this.canvas;
      c.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });
      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });
      window.addEventListener("mousemove", (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.rotY += dx * 0.01;
        this.rotX += dy * 0.01;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      // Touch events for mobile
      c.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.lastMouseX = e.touches[0].clientX;
          this.lastMouseY = e.touches[0].clientY;
        }
      }, { passive: true });
      window.addEventListener("touchend", () => {
        this.isDragging = false;
      });
      window.addEventListener("touchmove", (e) => {
        if (!this.isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.rotY += dx * 0.012;
        this.rotX += dy * 0.012;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }, { passive: true });
    }

    setElement(el) {
      this.element = el;
      // Only start if canvas is actually visible in DOM
      if (this.canvas && this.canvas.offsetParent !== null && this.canvas.clientWidth > 0) {
        if (!this.animId) {
          this.start();
        } else {
          this.draw();
        }
      }
    }

    updateDimensions() {
      if (!this.canvas) return false;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
      return true;
    }

    start() {
      if (this.animId) return;
      // Do not start if hidden or detached
      if (!this.canvas || this.canvas.offsetParent === null || this.canvas.clientWidth === 0) {
        return;
      }
      this.updateDimensions();
      const render = () => {
        // Sleep if canvas was hidden or navigated away
        if (!this.canvas || this.canvas.offsetParent === null || this.canvas.clientWidth === 0) {
          this.animId = null;
          return;
        }
        if (!this.isPaused) {
          this.time += 0.02 * this.speed;
          this.rotY += 0.005 * this.speed;
          this.draw();
        }
        this.animId = requestAnimationFrame(render);
      };
      this.animId = requestAnimationFrame(render);
    }

    pause() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      if (!this.isPaused && !this.animId) {
        this.start();
      }
      return this.isPaused;
    }

    resetView() {
      this.rotX = 0.55;
      this.rotY = 0.0;
      this.speed = 1.0;
      this.isPaused = false;
      this.updateDimensions();
      this.draw();
      if (!this.animId) {
        this.start();
      }
    }

    draw() {
      const ctx = this.ctx;
      const c = this.canvas;
      if (!c || c.width === 0 || c.height === 0) {
        if (!this.updateDimensions()) return;
      }
      const w = c.width;
      const h = c.height;

      ctx.clearRect(0, 0, w, h);

      if (!this.element) return;

      const cx = w / 2;
      const cy = h / 2;
      const shells = this.element.shells || [1];
      const maxShells = shells.length;
      const maxRadius = Math.min(w, h) * 0.44;
      const shellGap = maxShells > 1 ? (maxRadius - 20) / (maxShells) : maxRadius * 0.5;

      // Project 3D point (x, y, z) with rotation around X and Y axes
      const project = (x, y, z) => {
        // Rotate around Y
        const cosY = Math.cos(this.rotY);
        const sinY = Math.sin(this.rotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(this.rotX);
        const sinX = Math.sin(this.rotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 400;
        const scale = fov / (fov + z2);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          scale: scale
        };
      };

      // 1. Draw Concentric 3D Orbital Rings (tilted in space)
      ctx.lineWidth = 1 * (window.devicePixelRatio || 1);
      shells.forEach((electronCount, shellIdx) => {
        const r = 24 + (shellIdx + 1) * shellGap;
        ctx.beginPath();
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const px = r * Math.cos(theta);
          const pz = r * Math.sin(theta);
          const pt = project(px, 0, pz);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = "rgba(74, 222, 128, 0.28)"; // Translucent green orbit ring
        ctx.stroke();
      });

      // 2. Draw Nucleus Cluster at Center (Protons: Red/Orange, Neutrons: Blue)
      const numNucleons = Math.min(this.element.number + Math.round(this.element.mass - this.element.number), 42);
      const nucleusRadius = Math.max(12, Math.min(22, 9 + Math.sqrt(this.element.number) * 1.3));

      // Deterministic nucleon positions
      const nucleons = [];
      for (let i = 0; i < numNucleons; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / numNucleons);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const rad = nucleusRadius * (0.35 + 0.65 * ((i % 5) / 5));
        const nx = rad * Math.sin(phi) * Math.cos(theta);
        const ny = rad * Math.sin(phi) * Math.sin(theta);
        const nz = rad * Math.cos(phi);
        const isProton = (i % 2 === 0);
        nucleons.push({ x: nx, y: ny, z: nz, isProton });
      }

      // Collect all 3D drawable objects (nucleons + electrons) to sort by Z (depth sorting)
      const drawables = [];

      nucleons.forEach(n => {
        const pt = project(n.x, n.y, n.z);
        drawables.push({
          type: "nucleon",
          x: pt.x,
          y: pt.y,
          z: pt.z,
          scale: pt.scale,
          isProton: n.isProton
        });
      });

      // 3. Draw Orbiting Electrons along each shell
      shells.forEach((electronCount, shellIdx) => {
        const r = 24 + (shellIdx + 1) * shellGap;
        // Angular speed proportional to 1 / (shellIdx + 1)^1.2
        const orbitalSpeed = (this.time * (1.6 / Math.pow(shellIdx + 1, 1.1))) * (shellIdx % 2 === 0 ? 1 : -1);

        for (let e = 0; e < electronCount; e++) {
          const theta = orbitalSpeed + (e / electronCount) * Math.PI * 2;
          const ex = r * Math.cos(theta);
          const ez = r * Math.sin(theta);
          const pt = project(ex, 0, ez);
          drawables.push({
            type: "electron",
            x: pt.x,
            y: pt.y,
            z: pt.z,
            scale: pt.scale,
            shell: shellIdx
          });
        }
      });

      // Sort by Z from back to front (painter's algorithm)
      drawables.sort((a, b) => a.z - b.z);

      // Render drawables
      drawables.forEach(d => {
        if (d.type === "nucleon") {
          const radius = Math.max(3, 4.5 * d.scale);
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);

          const grad = ctx.createRadialGradient(
            d.x - radius * 0.35, d.y - radius * 0.35, radius * 0.1,
            d.x, d.y, radius
          );
          if (d.isProton) {
            grad.addColorStop(0, "#fca5a5");
            grad.addColorStop(0.5, "#ef4444");
            grad.addColorStop(1, "#991b1b");
          } else {
            grad.addColorStop(0, "#93c5fd");
            grad.addColorStop(0.5, "#3b82f6");
            grad.addColorStop(1, "#1d4ed8");
          }
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (d.type === "electron") {
          const radius = Math.max(2.5, 3.8 * d.scale);

          // Glow halo
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(74, 222, 128, 0.25)";
          ctx.fill();

          // Electron dot
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#4ade80"; // Bright neon green
          ctx.shadowColor = "#4ade80";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    destroy() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }
  }

  // =========================================================================
  // PERIODIC TABLE APPLICATION CONTROLLER
  // =========================================================================
  const PeriodicTable = {
    selectedElement: null,
    activeFilter: "all",
    searchQuery: "",
    temperatureK: 298.15, // 25°C STP
    bohrVisualizer: null,
    isInitialized: false,

    init() {
      if (this.isInitialized) return;

      const container = document.getElementById("ptableMainContainer");
      if (!container) return;

      ensurePeriodicTableLoaded().then(() => {
        if (this.isInitialized || ELEMENTS.length === 0) return;
        this.selectedElement = BY_NUM[112] || BY_NUM[1] || ELEMENTS[0];
        this.renderTableGrid();
        this.renderLegend();
        this.initBohrModel();
        this.bindEvents();
        if (this.selectedElement) {
          this.selectElement(this.selectedElement.number);
        }
        this.isInitialized = true;
      });
    },

    initBohrModel() {
      const canvas = document.getElementById("ptableBohrCanvas");
      if (canvas) {
        this.bohrVisualizer = new BohrModel3D(canvas);
        if (this.selectedElement) {
          this.bohrVisualizer.setElement(this.selectedElement);
        }
      }
    },

    bindEvents() {
      // Search input
      const searchInp = document.getElementById("ptableSearchInput");
      if (searchInp) {
        searchInp.addEventListener("input", (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.applyFilters();
        });
      }

      // Fullscreen button
      const fsBtn = document.getElementById("ptableBtnFullscreen");
      if (fsBtn) {
        fsBtn.addEventListener("click", () => this.toggleFullscreen());
      }

      // Temperature slider
      const tempSlider = document.getElementById("ptableTempSlider");
      if (tempSlider) {
        tempSlider.addEventListener("input", (e) => {
          this.temperatureK = parseFloat(e.target.value);
          const degC = Math.round(this.temperatureK - 273.15);
          const badge = document.getElementById("ptableTempDisplay");
          if (badge) badge.textContent = `${this.temperatureK} K (${degC} °C)`;
          this.updatePhases();
        });
      }
    },

    toggleFullscreen() {
      const container = document.getElementById("ptableMainContainer");
      const btn = document.getElementById("ptableBtnFullscreen");
      if (!container) return;

      const isFs = container.classList.toggle("is-fullscreen");
      if (btn) {
        btn.innerHTML = isFs
          ? `<span>↙</span> Exit full screen`
          : `<span>↗</span> Open in full screen`;
      }

      // If opening in fullscreen, prevent background scroll
      document.body.style.overflow = isFs ? "hidden" : "";
    },

    // Render the 18-column periodic table grid
    renderTableGrid() {
      const grid = document.getElementById("ptableGrid");
      if (!grid) return;

      // Group elements by grid position: [row (1-9)][col (1-18)]
      const gridCells = [];

      // Main body: Period 1 to 7
      ELEMENTS.forEach(el => {
        let row = el.period;
        let col = el.group;

        // Lanthanides row 8 (Ce 58 to Lu 71)
        if (el.number >= 58 && el.number <= 71) {
          row = 8;
          col = (el.number - 58) + 4; // place in columns 4 to 17
        }
        // Actinides row 9 (Th 90 to Lr 103)
        else if (el.number >= 90 && el.number <= 103) {
          row = 9;
          col = (el.number - 90) + 4; // place in columns 4 to 17
        }

        gridCells.push({ element: el, row, col, isPlaceholder: false });
      });

      // Lanthanide placeholder at Period 6, Group 3 (57 La or 57-71)
      gridCells.push({
        placeholderText: "57-71<br>La-Lu",
        row: 6,
        col: 3,
        isPlaceholder: true,
        category: "lanthanide"
      });

      // Actinide placeholder at Period 7, Group 3 (89 Ac or 89-103)
      gridCells.push({
        placeholderText: "89-103<br>Ac-Lr",
        row: 7,
        col: 3,
        isPlaceholder: true,
        category: "actinide"
      });

      let html = "";
      gridCells.forEach(item => {
        if (item.isPlaceholder) {
          html += `
            <div class="ptable-cell ptable-cell-placeholder cat-${item.category}" 
                 style="grid-row: ${item.row}; grid-column: ${item.col};"
                 onclick="window.PeriodicTable.filterCategory('${item.category}')"
                 title="Click to highlight ${item.category}">
              ${item.placeholderText}
            </div>
          `;
        } else {
          const el = item.element;
          const catClass = `cat-${el.category}`;
          html += `
            <div class="ptable-cell ${catClass}" 
                 id="ptCell_${el.number}"
                 data-num="${el.number}"
                 data-category="${el.category}"
                 style="grid-row: ${item.row}; grid-column: ${item.col};"
                 onclick="window.PeriodicTable.selectElement(${el.number})"
                 title="${el.name} (${el.symbol}) - Atomic No: ${el.number}, Mass: ${el.mass}">
              <div class="ptable-cell-top">
                <span class="ptable-cell-num">${el.number}</span>
                <span class="ptable-cell-mass">${Math.round(el.mass)}</span>
              </div>
              <div class="ptable-cell-symbol">${el.symbol}</div>
              <div class="ptable-cell-name">${el.name}</div>
            </div>
          `;
        }
      });

      grid.innerHTML = html;
    },

    // Render Bottom Legend with interactive radio buttons
    renderLegend() {
      const container = document.getElementById("ptableLegend");
      if (!container) return;

      let html = `
        <div class="ptable-legend-item is-active" data-cat="all" onclick="window.PeriodicTable.filterCategory('all')">
          <div class="ptable-radio-dot"></div>
          <span style="font-weight: 700;">All elements</span>
        </div>
      `;

      Object.keys(CATEGORIES).forEach(catKey => {
        const cat = CATEGORIES[catKey];
        html += `
          <div class="ptable-legend-item" data-cat="${catKey}" onclick="window.PeriodicTable.filterCategory('${catKey}')">
            <div class="ptable-radio-dot"></div>
            <div class="ptable-legend-swatch cat-${catKey}"></div>
            <span>${cat.name}</span>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    // Filter by Category
    filterCategory(categoryKey) {
      this.activeFilter = categoryKey;

      // Update legend active pill
      document.querySelectorAll(".ptable-legend-item").forEach(item => {
        item.classList.toggle("is-active", item.getAttribute("data-cat") === categoryKey);
      });

      this.applyFilters();
    },

    applyFilters() {
      const query = this.searchQuery;
      const cat = this.activeFilter;

      ELEMENTS.forEach(el => {
        const cell = document.getElementById(`ptCell_${el.number}`);
        if (!cell) return;

        let matchCat = (cat === "all" || el.category === cat);
        let matchQuery = true;

        if (query) {
          const matchNum = String(el.number) === query;
          const matchSym = el.symbol.toLowerCase() === query;
          const matchName = el.name.toLowerCase().includes(query);
          const matchGroup = el.category.toLowerCase().includes(query);
          matchQuery = matchNum || matchSym || matchName || matchGroup;
        }

        const isVisible = matchCat && matchQuery;
        cell.classList.toggle("is-dimmed", !isVisible);
      });
    },

    updatePhases() {
      const t = this.temperatureK;
      ELEMENTS.forEach(el => {
        const cell = document.getElementById(`ptCell_${el.number}`);
        if (!cell) return;

        let phase = "Solid";
        if (el.mpK !== null && t < el.mpK) {
          phase = "Solid";
        } else if (el.bpK !== null && t > el.bpK) {
          phase = "Gas";
        } else if (el.mpK !== null && el.bpK !== null && t >= el.mpK && t <= el.bpK) {
          phase = "Liquid";
        }
        // Subtly indicate phase state if desired
      });
    },

    // Select Element and display in Inspector
    selectElement(atomicNumber) {
      const el = BY_NUM[atomicNumber];
      if (!el) return;

      this.selectedElement = el;

      // Highlight active cell
      document.querySelectorAll(".ptable-cell").forEach(c => c.classList.remove("is-selected"));
      const activeCell = document.getElementById(`ptCell_${el.number}`);
      if (activeCell) activeCell.classList.add("is-selected");

      // Update Bohr Atom 3D visualizer
      if (this.bohrVisualizer) {
        this.bohrVisualizer.setElement(el);
      }

      // Update Inspector UI
      this.renderInspector(el);
    },

    renderInspector(el) {
      const badge = document.getElementById("ptableBadge");
      const title = document.getElementById("ptableInspectorTitle");
      const cat = document.getElementById("ptableInspectorCategory");
      const summary = document.getElementById("ptableSummary");
      const props = document.getElementById("ptablePropsList");
      const industrial = document.getElementById("ptableIndustrialUse");

      if (badge) {
        badge.className = `ptable-inspector-badge cat-${el.category}`;
        badge.innerHTML = `
          <div class="ptable-badge-top">
            <span>${el.number}</span>
            <span>${Math.round(el.mass)}</span>
          </div>
          <div class="ptable-badge-symbol">${el.symbol}</div>
          <div class="ptable-badge-name">${el.name}</div>
        `;
      }

      if (title) title.textContent = el.name;
      if (cat) cat.textContent = CATEGORIES[el.category]?.name || "Unknown";

      if (summary) {
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name)}`;
        summary.innerHTML = `
          ${el.summary}
          <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a>
        `;
      }

      if (props) {
        const densityStr = el.density ? `${el.density} g/cm³` : "Unknown";
        const mpStr = el.mpK ? `${el.mpK} K (${Math.round(el.mpK - 273.15)} °C)` : "Unknown";
        const bpStr = el.bpK ? `${el.bpK} K (${Math.round(el.bpK - 273.15)} °C)` : "Unknown";
        const shellsStr = el.shells ? el.shells.join(", ") : "--";

        props.innerHTML = `
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Atomic mass</span>
            <span class="ptable-prop-val">${el.mass} u</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electron configuration</span>
            <span class="ptable-prop-val"><code>${el.config}</code></span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electrons per shell</span>
            <span class="ptable-prop-val">${shellsStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electronegativity (Pauling)</span>
            <span class="ptable-prop-val">${el.eneg ?? "Unknown"}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Phase at STP (25°C)</span>
            <span class="ptable-prop-val">${el.phase}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Melting point</span>
            <span class="ptable-prop-val">${mpStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Boiling point</span>
            <span class="ptable-prop-val">${bpStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Density</span>
            <span class="ptable-prop-val">${densityStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Discovery date</span>
            <span class="ptable-prop-val">${el.discDate}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Discovered by</span>
            <span class="ptable-prop-val">${el.discBy}</span>
          </div>
        `;
      }

      if (industrial) {
        industrial.innerHTML = `
          <strong>🏭 Refinery, Piping & Material Integrity:</strong>
          ${el.industrial || "Important elemental component in industrial metallurgy, corrosion mechanisms, and chemical process thermodynamics."}
        `;
      }
    },

    toggleBohrAnimation() {
      if (this.bohrVisualizer) {
        const isPaused = this.bohrVisualizer.togglePause();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = isPaused ? "▶ Play" : "⏸ Pause";
      }
    },

    pauseBohrAnimation() {
      if (this.bohrVisualizer) {
        this.bohrVisualizer.pause();
      }
    },

    resumeBohrAnimation() {
      if (this.bohrVisualizer && this.selectedElement) {
        this.bohrVisualizer.updateDimensions();
        this.bohrVisualizer.start();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = "⏸ Pause";
      }
    },

    resetBohrView() {
      if (this.bohrVisualizer) {
        this.bohrVisualizer.resetView();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = "⏸ Pause";
      }
    }
  };

  window.PeriodicTable = PeriodicTable;

  // Auto-init if DOM ready and tab active
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // Lazy init when subtab opens
    });
  }
})();
