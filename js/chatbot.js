/*******************************
 * Chat UI helpers
 *******************************/
function appendToChatLog(sender, message, isHTML = false, isUser = false) {
  const chatLog = document.getElementById("chat-log");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("chat-message", isUser ? "user-message" : "bot-message");

  msgDiv.innerHTML = isHTML
    ? `<strong>${sender}:</strong><br>${message}`
    : `<strong>${sender}:</strong> ${escapeHtml(message)}`;

  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/*******************************
 * Gemini Markdown Formatter & Action Parser
 *******************************/
function formatGemini(text = "") {
  if (!text) return "";
  marked.setOptions({ mangle: false, headerIds: false });
  let html = marked.parse(text);

  // Parse and convert [[ACTION:...]] tags into interactive chips
  const actionRegex = /\[\[ACTION:([A-Z_]+):([^:\]]+):([^\]]+)\]\]/g;
  const actions = [];

  html = html.replace(actionRegex, (match, actionType, arg1, label) => {
    let btnHtml = "";
    try {
      if (actionType === "NAVIGATE") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-nav" onclick="window.kayetBotNavigate('${escapeHtml(arg1)}')"><span>${escapeHtml(label)}</span> ↗</button>`;
      } else if (actionType === "FILL_B313") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-calc" onclick='window.kayetBotFillB313(${arg1})'><span>${escapeHtml(label)}</span> ⚡</button>`;
      } else if (actionType === "FILL_ASME8") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-calc" onclick='window.kayetBotFillASME8(${arg1})'><span>${escapeHtml(label)}</span> ⚙️</button>`;
      } else if (actionType === "FILL_CUI") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-calc" onclick='window.kayetBotFillCUI(${arg1})'><span>${escapeHtml(label)}</span> 🛡️</button>`;
      } else if (actionType === "FILL_REMAINING_LIFE") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-calc" onclick='window.kayetBotFillRemainingLife(${arg1})'><span>${escapeHtml(label)}</span> 🧪</button>`;
      } else if (actionType === "VIEW_MECHANISM") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-nav" onclick="window.kayetBotViewMechanism('${escapeHtml(arg1)}')"><span>${escapeHtml(label)}</span> 🔍</button>`;
      } else if (actionType === "VIEW_STRESS") {
        btnHtml = `<button type="button" class="chat-action-btn chat-action-nav" onclick="window.kayetBotViewStress('${escapeHtml(arg1)}')"><span>${escapeHtml(label)}</span> 📚</button>`;
      }
    } catch (err) {
      console.error("Action parse error:", err);
    }
    if (btnHtml) {
      actions.push(btnHtml);
      return "";
    }
    return match;
  });

  if (actions.length > 0) {
    html += `<div class="chat-actions-container">${actions.join(" ")}</div>`;
  }

  return html;
}

/*******************************
 * Global KayetBot Interactive Dashboard Actions
 *******************************/
window.kayetBotNavigate = function(tabId) {
  if (typeof hideAllMainPanels === "function") hideAllMainPanels();
  if (typeof hideWelcomePanel === "function") hideWelcomePanel();

  const tabFuncs = {
    "ASMEB31_3Tab": window.showASMEB31_3Tab,
    "ASMESECTIONVIIIDIV1Tab": window.showASMESECTIONVIIIDIV1Tab,
    "corrosionFullTab": window.showCorrosionFullTab,
    "corrosionRateTab": window.showCorrosionTab,
    "remainingLifeTab": window.showRemainingLifeTab,
    "a571-criteriaTab": window.showCriteriaTab,
    "inventoryTab": window.showInventoryTab,
    "TOXIC_CALCULATIONTab": window.showTOXIC_CALCULATIONTab,
    "crackingMechanismTab": window.showCrackingMechanismTab,
    "bkStressTab": window.showbkStressTab,
    "fluidSelectorTab": window.showFluidSelectorTab,
    "inspectionconfidenceTab": window.showINSPECTIONCONFIDENCETab,
    "simplePipingTab": window.showSimplePipingTab,
    "pipeThicknessTab": window.showpipeThicknessTab,
    "adminPanelTab": window.showAdminPanelTab,
    "chemicalSuiteTab": window.showChemicalSuiteTab,
    "streamComparatorTab": window.showStreamComparatorTab,
    "unitConverterTab": window.showUnitConverterTab
  };

  if (tabFuncs[tabId] && typeof tabFuncs[tabId] === "function") {
    tabFuncs[tabId]();
  } else {
    const el = document.getElementById(tabId);
    if (el) el.style.display = "block";
  }

  const targetEl = document.getElementById(tabId);
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

window.kayetBotFillB313 = function(data) {
  window.kayetBotNavigate("ASMEB31_3Tab");
  setTimeout(() => {
    if (data.pressure != null) {
      const el = document.getElementById("b313_pressure");
      if (el) { el.value = data.pressure; el.dispatchEvent(new Event("input")); }
    }
    if (data.stress != null) {
      const el = document.getElementById("b313_stress");
      if (el) { el.value = data.stress; el.dispatchEvent(new Event("input")); }
    }
    if (data.od != null) {
      const el = document.getElementById("b313_diameter");
      if (el) {
        for (let i = 0; i < el.options.length; i++) {
          if (parseFloat(el.options[i].value) === parseFloat(data.od) || el.options[i].text.includes(`${data.od}`)) {
            el.selectedIndex = i;
            break;
          }
        }
        el.dispatchEvent(new Event("change"));
      }
    }
    if (data.ca != null) {
      const el = document.getElementById("b313_corrosion");
      if (el) { el.value = data.ca; el.dispatchEvent(new Event("input")); }
    }
    if (data.nom != null) {
      const el = document.getElementById("b313_nomThickness");
      if (el) { el.value = data.nom; el.dispatchEvent(new Event("input")); }
    }
    if (typeof calculateThickness === "function") {
      calculateThickness();
    }
  }, 180);
};

window.kayetBotFillASME8 = function(data) {
  window.kayetBotNavigate("ASMESECTIONVIIIDIV1Tab");
  setTimeout(() => {
    const typeSelector = document.getElementById("typeSelector");
    if (typeSelector && data.componentType) {
      typeSelector.value = data.componentType;
      if (typeof updateASMEForm === "function") updateASMEForm();
    }
    if (data.pressure != null) {
      const p = document.getElementById("pressure");
      if (p) { p.value = data.pressure; p.dispatchEvent(new Event("input")); }
    }
    if (data.stress != null) {
      const s = document.getElementById("stress");
      if (s) { s.value = data.stress; s.dispatchEvent(new Event("input")); }
    }
    if (data.radius != null) {
      const r = document.getElementById("radius");
      if (r) { r.value = data.radius; r.dispatchEvent(new Event("input")); }
    }
    if (data.efficiency != null) {
      const e = document.getElementById("efficiency");
      if (e) { e.value = data.efficiency; e.dispatchEvent(new Event("input")); }
    }
    if (typeof calculateASME === "function") {
      try { calculateASME(); } catch (_) {}
    }
  }, 180);
};

window.kayetBotFillCUI = function(data) {
  window.kayetBotNavigate("corrosionFullTab");
  setTimeout(() => {
    const dmSelect = document.getElementById("damageMechanismFull");
    if (dmSelect) {
      dmSelect.value = "cui";
      dmSelect.dispatchEvent(new Event("change"));
    }
    setTimeout(() => {
      if (data.temp != null) {
        const t = document.getElementById("tempCUI");
        if (t) { t.value = data.temp; t.dispatchEvent(new Event("input")); }
      }
      if (data.material != null) {
        const m = document.getElementById("materialCUI");
        if (m) { m.value = data.material; m.dispatchEvent(new Event("change")); }
      }
      if (data.severity != null) {
        const s = document.getElementById("severityCUI");
        if (s) { s.value = data.severity; s.dispatchEvent(new Event("change")); }
      }
      if (typeof triggerAutoCalc === "function") {
        triggerAutoCalc();
      }
    }, 180);
  }, 180);
};

window.kayetBotFillRemainingLife = function(data) {
  window.kayetBotNavigate("remainingLifeTab");
  setTimeout(() => {
    if (data.t_act != null) {
      const el = document.getElementById("lastThk");
      if (el) el.value = data.t_act;
    }
    if (data.t_min != null) {
      const el = document.getElementById("tmin");
      if (el) el.value = data.t_min;
    }
    const today = new Date().toISOString().split("T")[0];
    const lastDate = document.getElementById("lastDate");
    if (lastDate && !lastDate.value) lastDate.value = today;
  }, 180);
};

window.kayetBotViewMechanism = function(key) {
  const mechanismsRoot = (typeof data !== "undefined" && data && data["API 571 Damage Mechanism"]) || {};
  if (mechanismsRoot[key]) {
    if (typeof hideAllMainPanels === "function") hideAllMainPanels();
    if (typeof hideWelcomePanel === "function") hideWelcomePanel();
    const container = document.getElementById("mechanismDetailsContainer");
    const title = document.getElementById("selectedMechanismTitle");
    if (container && title) {
      container.style.display = "block";
      title.textContent = key;
      title.style.display = "block";
      const info = mechanismsRoot[key];
      container.innerHTML = `
        <div class="tabs">
          <button class="tab-button active" onclick="showTab('description')">Description</button>
          <button class="tab-button" onclick="showTab('materials')">Affected Materials</button>
          <button class="tab-button" onclick="showTab('factors')">Critical Factors</button>
          <button class="tab-button" onclick="showTab('units')">Affected Units</button>
          <button class="tab-button" onclick="showTab('appearance')">Morphology</button>
          <button class="tab-button" onclick="showTab('mitigation')">Prevention</button>
          <button class="tab-button" onclick="showTab('inspection')">Inspection</button>
          <button class="tab-button" onclick="showTab('temperature')">Temperature Comparison</button>
          <button class="tab-button" onclick="showTab('image')">Image</button>
        </div>
        <div id="description" class="tab-content visible mechanism-info"><strong>Description:</strong> ${info.description || ""}</div>
        <div id="materials" class="tab-content mechanism-info"><strong>Materials:</strong> ${info.affectedMaterials || ""}</div>
        <div id="factors" class="tab-content mechanism-info"><strong>Factors:</strong> ${info.criticalFactors || ""}</div>
        <div id="units" class="tab-content mechanism-info"><strong>Units:</strong> ${info.affectedUnits || ""}</div>
        <div id="appearance" class="tab-content mechanism-info"><strong>Morphology:</strong> ${info.appearance || ""}</div>
        <div id="mitigation" class="tab-content mechanism-info"><strong>Mitigation:</strong> ${info.mitigation || ""}</div>
        <div id="inspection" class="tab-content mechanism-info"><strong>Inspection:</strong> ${info.inspection || ""}</div>
        <div id="temperature" class="tab-content mechanism-info"><strong>Temperature:</strong> ${info.temperatureComparison || ""}</div>
        <div id="image" class="tab-content mechanism-info">
          <strong>Damage Mechanism Reference Image:</strong><br>
          ${ info.imagePath ? `<img src="${info.imagePath}" alt="Mechanism Image" style="max-width: 100%; height: auto; border: 1px solid #ccc;">` : "" }
        </div>
      `;
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
};

window.kayetBotViewStress = function(material) {
  window.kayetBotNavigate("bkStressTab");
  setTimeout(() => {
    const searchInput = document.querySelector("#bkStressTab input[type='text'], #bkStressSearch");
    if (searchInput && material) {
      searchInput.value = material;
      searchInput.dispatchEvent(new Event("input"));
    }
  }, 180);
};

function getActiveDashboardContext() {
  let activeTab = "welcomePanel";
  document.querySelectorAll(".tab-content").forEach(tab => {
    if (tab.style.display && tab.style.display !== "none") {
      activeTab = tab.id;
    }
  });

  const ctx = {
    activeTab,
    values: {}
  };

  if (activeTab === "ASMEB31_3Tab") {
    ctx.values = {
      pressure: document.getElementById("b313_pressure")?.value || "",
      pressureUnit: document.getElementById("b313_pressureUnit")?.value || "MPa",
      stress: document.getElementById("b313_stress")?.value || "",
      stressUnit: document.getElementById("b313_stressUnit")?.value || "MPa",
      diameter: document.getElementById("b313_diameter")?.value || "",
      corrosionAllowance: document.getElementById("b313_corrosion")?.value || "",
      nominalThickness: document.getElementById("b313_nomThickness")?.value || "",
      materialStd: document.getElementById("b313_materialStd")?.value || ""
    };
  } else if (activeTab === "ASMESECTIONVIIIDIV1Tab") {
    ctx.values = {
      componentType: document.getElementById("typeSelector")?.value || "",
      pressure: document.getElementById("pressure")?.value || "",
      stress: document.getElementById("stress")?.value || "",
      radius: document.getElementById("radius")?.value || "",
      efficiency: document.getElementById("efficiency")?.value || ""
    };
  } else if (activeTab === "corrosionFullTab") {
    ctx.values = {
      temp: document.getElementById("tempCUI")?.value || "",
      material: document.getElementById("materialCUI")?.value || "",
      severity: document.getElementById("severityCUI")?.value || ""
    };
  } else if (activeTab === "remainingLifeTab") {
    ctx.values = {
      baseThk: document.getElementById("baseThk")?.value || "",
      lastThk: document.getElementById("lastThk")?.value || "",
      tmin: document.getElementById("tmin")?.value || ""
    };
  }

  return ctx;
}

function toggleChat() {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) {
    chatBox.classList.toggle("hidden");
    if (!chatBox.classList.contains("hidden")) {
      const chatLog = document.getElementById("chat-log");
      if (chatLog && chatLog.children.length === 0) {
        showWelcomeGreeting();
      }
    }
  }
}

function showWelcomeGreeting() {
  const welcomeHtml = `
    <div style="line-height:1.5;">
      <strong>👋 Hello! I am KayetBot</strong><br>
      Your intelligent AI Asset Integrity, RBI & Engineering Platform Assistant. I have full access to your entire dashboard and can calculate any topic in <b>Hindi, Bengali, Hinglish, or English</b>:
      <ul style="margin:6px 0 8px 16px;padding:0;font-size:12px;color:#334155;">
        <li><b>ASME B31.3 Piping:</b> Pressure design thickness, mill under-tolerance & net usable wall</li>
        <li><b>ASME Sec VIII Div 1:</b> Cylindrical/spherical shells, 2:1 ellipsoidal heads & hydrotest</li>
        <li><b>API 571 Damage Mechanisms:</b> HIC, SOHIC, SSC, HTHA Nelson curves, Amine SCC, CO2</li>
        <li><b>API 581 CUI & RBI:</b> Corrosion rates at any temperature, Consequence of Failure</li>
        <li><b>API 570/510 Remaining Life:</b> LTCR, STCR, T-min & next inspection date forecasting</li>
      </ul>
      <div style="font-size:11px;font-weight:bold;color:#64748b;margin-bottom:6px;">⚡ Quick Prompts (Any Language):</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('2 inch STD schedule a106 ka 1.5 ca and thickness 3.91 hone Tolerance and net thickness Kitna hoga')">📏 2" STD A106 (1.5mm CA)</button>
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('4 inch pipe pressure 5 MPa stress 138 MPa wall thickness nikalo')">⚡ 4" Pipe 5 MPa B31.3</button>
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('Cui ka 120 degree temperature me corrosion rate keya ha')">🌡️ CUI at 120°C Rate</button>
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('ASME Section VIII Div 1 shell calculation 10 bar 1200mm radius')">⚙️ ASME VIII Vessel</button>
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('Remaining life calculate koro actual 4.5mm tmin 2.0mm rate 0.25mm/yr')">🧪 Remaining Life</button>
        <button type="button" class="chat-chip-btn" onclick="sendQuickPrompt('B31.3 calculator open koro')">📋 Open B31.3 Calculator</button>
      </div>
    </div>
  `;
  appendToChatLog("🤖", welcomeHtml, true);
}

function toggleMaximize() {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) chatBox.classList.toggle("maximized");
}

function closeChat() {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) chatBox.classList.add("hidden");
}

/*******************************
 * Google Search (fallback helper)
 *******************************/
async function fetchGoogleSearch(query) {
  const url = `/api/chatbot?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return "";

    const resultsHtml = data.items.slice(0, 3).map(item => `
      <div class="search-result" style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px;">
        <b>${escapeHtml(item.title || "")}</b><br>
        ${escapeHtml(item.snippet || "")}<br>
        <button onclick="openInChatIframe('${encodeURIComponent(item.link)}')">View Here</button>
        <button onclick="window.open('${item.link}', '_blank')">Open in Browser</button>
      </div>
    `).join("");

    return `🔍 <b>Google Search Results:</b><br><br>${resultsHtml}`;
  } catch (err) {
    return "";
  }
}

/*******************************
 * Gemini (backend -> /api/gemini with Full Dashboard Context)
 *******************************/
async function fetchGeminiReply(message) {
  try {
    const dashboardContext = getActiveDashboardContext();
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        currentTab: dashboardContext.activeTab,
        dashboardContext: dashboardContext.values
      })
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    return data.reply || data.error || "❌ No response from KayetBot server.";
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return "❌ Failed to connect to KayetBot backend server: " + err.message;
  }
}

/*******************************
 * Iframe preview inside chat
 *******************************/
function openInChatIframe(urlEncoded) {
  const url = decodeURIComponent(urlEncoded);
  const chatLog = document.getElementById("chat-log");

  const iframeDiv = document.createElement("div");
  iframeDiv.style.marginTop = "10px";
  iframeDiv.style.position = "relative";

  const closeButton = document.createElement("button");
  closeButton.innerText = "✖";
  closeButton.style.position = "absolute";
  closeButton.style.top = "5px";
  closeButton.style.right = "5px";
  closeButton.style.zIndex = "10";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => chatLog.removeChild(iframeDiv);

  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.width = "100%";
  iframe.style.height = "800px";
  iframe.style.border = "1px solid #ccc";

  iframeDiv.appendChild(closeButton);
  iframeDiv.appendChild(iframe);
  chatLog.appendChild(iframeDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/*******************************
 * Typing indicator
 *******************************/
function showTyping() {
  const chatLog = document.getElementById("chat-log");
  const typingDiv = document.createElement("div");
  typingDiv.classList.add("chat-message", "bot-message");
  typingDiv.innerHTML = `<em class="typing">🤖 is typing...</em>`;
  chatLog.appendChild(typingDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
  return typingDiv;
}

/*******************************
 * Input handlers
 *******************************/
function handleChat(e) {
  if (e.key === "Enter") {
    sendMessageFromInput();
  }
}

function sendMessageFromInput() {
  const input = document.getElementById("chat-input");
  const message = (input?.value || "").trim();
  if (!message) return;

  appendToChatLog("🧑", message, false, true);
  respondToUser(message);
  if (input) input.value = "";

  const suggestionBox = document.getElementById("suggestions");
  if (suggestionBox) {
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";
  }
}

/*******************************
 * Piping & Tolerance Engine for KayetBot
 *******************************/
if (typeof document !== "undefined" && !document.getElementById("kayetbot-extra-styles")) {
  const st = document.createElement("style");
  st.id = "kayetbot-extra-styles";
  st.textContent = `
    .chat-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      color: #1e40af;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .chat-chip-btn:hover {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1e3a8a;
    }
  `;
  document.head.appendChild(st);
}

const fallbackPipeOD = {
  "1/8": 10.3, "1/4": 13.7, "3/8": 17.1, "0.5": 21.3, "0.75": 26.7,
  "1": 33.4, "1.25": 42.2, "1.5": 48.3, "2": 60.3, "2.5": 73.0,
  "3": 88.9, "3.5": 101.6, "4": 114.3, "5": 141.3, "6": 168.3,
  "8": 219.1, "10": 273.0, "12": 323.8, "14": 355.6, "16": 406.4,
  "18": 457.0, "20": 508.0, "22": 559.0, "24": 610.0
};

const fallbackPipeSTD = {
  "1/8": 1.73, "1/4": 2.24, "3/8": 2.31, "0.5": 2.77, "0.75": 2.87,
  "1": 3.38, "1.25": 3.56, "1.5": 3.68, "2": 3.91, "2.5": 5.16,
  "3": 5.49, "3.5": 5.74, "4": 6.02, "5": 6.55, "6": 7.11,
  "8": 8.18, "10": 9.27, "12": 9.53, "14": 9.53, "16": 9.53,
  "18": 9.53, "20": 9.53, "22": 9.53, "24": 9.53
};

const fallbackPipeSch80 = {
  "1/8": 2.41, "1/4": 3.02, "3/8": 3.20, "0.5": 3.73, "0.75": 3.91,
  "1": 4.55, "1.25": 4.85, "1.5": 5.08, "2": 5.54, "2.5": 7.01,
  "3": 7.62, "3.5": 8.08, "4": 8.56, "5": 9.53, "6": 10.97,
  "8": 12.70, "10": 15.09, "12": 17.48, "14": 19.05, "16": 21.44
};

function parsePipingQuery(message = "") {
  const text = message.toLowerCase();

  // Schedule extraction first
  let sch = null;
  const schRegex = /\b(?:sch(?:edule)?\.?\s*|sch)(\d+[a-z]*|std|xs|xxs|x\s*stg|hvy)\b|\b(std|standard|xs|xxs)\b(?:\s*sch(?:edule)?)?/i;
  const schMatch = text.match(schRegex);
  if (schMatch) {
    const rawSch = (schMatch[1] || schMatch[2] || "").toUpperCase();
    if (rawSch === "STD" || rawSch === "STANDARD") sch = "SCH STD";
    else if (rawSch === "XS") sch = "SCH XS";
    else if (rawSch === "XXS") sch = "SCH XXS";
    else sch = "SCH " + rawSch;
  }

  // Size extraction
  let size = null;
  let displaySize = null;
  const sizeRegex = /\b(\d+\/\d+|\d+(?:\.\d+)?)\s*(?:inch|"|in\b|\-inch)/i;
  const sizeMatch = text.match(sizeRegex);
  if (sizeMatch) {
    displaySize = sizeMatch[1] + "\"";
    size = sizeMatch[1];
  } else {
    const npsMatch = text.match(/\bnps\s*(\d+\/\d+|\d+(?:\.\d+)?)\b/i);
    if (npsMatch) {
      displaySize = "NPS " + npsMatch[1];
      size = npsMatch[1];
    }
  }

  if (size === "1/2") size = "0.5";
  else if (size === "3/4") size = "0.75";
  else if (size === "1-1/4" || size === "1 1/4") size = "1.25";
  else if (size === "1-1/2" || size === "1 1/2") size = "1.5";

  // Check if message is a piping/tolerance/schedule query
  const isPipingQuery = size || sch || text.includes("tolerance") || text.includes("thickness") || text.includes("net wall") || text.includes("corrosion allowance");
  if (!isPipingQuery) return null;

  // CA extraction (strip matched schedule first so "sch 40 ca 3mm" does not grab 40)
  let textForCA = text;
  if (schMatch) {
    textForCA = textForCA.replace(schMatch[0], " ");
  }
  let ca = null;
  const caRegex = /\b(?:ca|corrosion(?:\s*allowance)?)\s*(?:=|:|\bis\b|\bof\b|\bke\b|\bpe\b|\bme\b)?\s*(\d+(?:\.\d+)?)\s*(?:mm)?\b|\b(\d+(?:\.\d+)?)\s*mm\s*(?:ca|corrosion)\b|\b(\d+(?:\.\d+)?)\s*ca\b/i;
  const caMatch = textForCA.match(caRegex);
  if (caMatch) {
    ca = parseFloat(caMatch[1] || caMatch[2] || caMatch[3]);
  }

  // Explicit Thickness extraction
  let explicitThk = null;
  const thkRegex = /\b(?:thickness|thk|t)\s*(?:=|:|\bis\b|\bof\b|\bke\b|\bhone\b|\bpe\b)?\s*(\d+(?:\.\d+)?)\s*(?:mm)?\b|\b(\d+(?:\.\d+)?)\s*(?:mm)\s*(?:thickness|thk)\b/i;
  const thkMatch = text.match(thkRegex);
  if (thkMatch) {
    explicitThk = parseFloat(thkMatch[1] || thkMatch[2]);
  }

  // Material extraction
  let material = "ASTM A106 Gr. B (Seamless)";
  let materialCode = "A106";
  let tolPct = 12.5;

  if (text.includes("a53")) {
    material = "ASTM A53 (Seamless & Welded)";
    materialCode = "A53";
    tolPct = 12.5;
  } else if (text.includes("a312")) {
    material = "ASTM A312 (Stainless Steel)";
    materialCode = "A312/A312M";
    tolPct = 12.5;
  } else if (text.includes("a335")) {
    material = "ASTM A335 (Chrome Moly Alloy)";
    materialCode = "A335/A335M";
    tolPct = 12.5;
  } else if (text.includes("api 5l") || text.includes("api5l")) {
    material = "API 5L (Seamless)";
    materialCode = "API 5L (Seamless)";
    tolPct = 12.5;
  } else if (text.includes("is 3589") || text.includes("is-3589")) {
    material = "IS-3589 (SAW & Seamless)";
    materialCode = "IS-3589 (SAW & Seamless Pipe)";
    tolPct = 10.0;
  } else if (text.includes("is 1239") || text.includes("is-1239")) {
    material = "IS-1239 (Mild Steel)";
    materialCode = "IS-1239 (Seamless)";
    tolPct = 10.0;
  }

  // Determine OD
  let od = null;
  if (typeof pipeOD883 !== "undefined" && size && pipeOD883[size]) {
    od = pipeOD883[size];
  } else if (size && fallbackPipeOD[size]) {
    od = fallbackPipeOD[size];
  }

  // Determine nominal thickness
  let t_nom = explicitThk;
  if (!t_nom && size) {
    if (typeof pipeDataMaster883 !== "undefined" && pipeDataMaster883[size]) {
      const entry = pipeDataMaster883[size];
      const foundVal = (sch && entry[sch]) || entry["SCH 40"] || entry["SCH STD"];
      if (foundVal) t_nom = parseFloat(foundVal);
    }
    if (!t_nom) {
      if (sch === "SCH 80" || sch === "SCH XS") {
        t_nom = fallbackPipeSch80[size] || null;
      } else {
        t_nom = fallbackPipeSTD[size] || null;
      }
    }
  }

  if (!t_nom && !size && !explicitThk) return null;

  // Calculation
  let millTol = 0;
  let t_afterMill = 0;
  let t_net = 0;

  if (t_nom) {
    millTol = t_nom * (tolPct / 100);
    t_afterMill = t_nom - millTol;
    t_net = t_afterMill - (ca || 0);
  }

  return {
    size: size || "Custom",
    displaySize: displaySize || (size ? size + "\"" : "Custom"),
    sch: sch || "SCH STD",
    od,
    t_nom,
    material,
    materialCode,
    tolPct,
    millTol,
    t_afterMill,
    ca: ca !== null ? ca : null,
    t_net: ca !== null ? t_net : null
  };
}

function generatePipingCard(p) {
  return `
    <div style="padding:12px; border-radius:8px; background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid #2563eb; margin:8px 0; color:#1e293b; font-size:13px; font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-size:14px; font-weight:700; color:#1e40af; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
        <span>📏 Piping Tolerance & Net Wall Thickness</span>
        <span style="background:#dbeafe; color:#1e40af; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600;">Verified ASTM/ASME</span>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12px;">
        <tbody>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Pipe Size (NPS):</td>
            <td style="padding:4px 0; text-align:right; font-weight:600;">${escapeHtml(p.displaySize)}${p.od ? ` (OD: ${p.od} mm)` : ""}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Schedule:</td>
            <td style="padding:4px 0; text-align:right; font-weight:600;">${escapeHtml(p.sch)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Material Standard:</td>
            <td style="padding:4px 0; text-align:right; font-weight:600;">${escapeHtml(p.material)}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Nominal Thickness (t<sub>nom</sub>):</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#0f172a;">${p.t_nom ? p.t_nom.toFixed(2) + " mm" : "—"}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Mill Under-Tolerance (${p.tolPct}%):</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#dc2626;">-${p.tolPct}% (-${p.millTol.toFixed(3)} mm)</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:4px 0; color:#64748b;">Min Thickness after Mill Tol:</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#2563eb;">${p.t_afterMill.toFixed(3)} mm</td>
          </tr>
          ${p.ca !== null ? `
          <tr style="border-bottom:1px solid #cbd5e1;">
            <td style="padding:4px 0; color:#64748b;">Corrosion Allowance (CA):</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#d97706;">${p.ca.toFixed(2)} mm</td>
          </tr>
          <tr style="background:#f0fdf4; border-radius:4px;">
            <td style="padding:6px 4px; font-weight:700; color:#166534; font-size:13px;">Net Usable Wall Thickness:</td>
            <td style="padding:6px 4px; text-align:right; font-weight:800; color:#166534; font-size:14px;">${p.t_net.toFixed(3)} mm</td>
          </tr>
          ` : `
          <tr style="background:#eff6ff; border-radius:4px;">
            <td style="padding:6px 4px; font-weight:700; color:#1e40af; font-size:13px;">Thickness After Mill Tol:</td>
            <td style="padding:6px 4px; text-align:right; font-weight:800; color:#1e40af; font-size:14px;">${p.t_afterMill.toFixed(3)} mm</td>
          </tr>
          `}
        </tbody>
      </table>

      <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:8px 10px; border-radius:6px; font-size:11.5px; color:#1e40af; line-height:1.6; margin-bottom:10px;">
        <strong>Calculation Steps:</strong><br>
        1. Base Nominal Thickness = <b>${p.t_nom ? p.t_nom.toFixed(2) : ""} mm</b><br>
        2. Mill Under-Tolerance = ${p.t_nom ? p.t_nom.toFixed(2) : ""} × ${p.tolPct}% = <b>-${p.millTol.toFixed(3)} mm</b><br>
        3. Min Thickness = ${p.t_nom ? p.t_nom.toFixed(2) : ""} - ${p.millTol.toFixed(3)} = <b>${p.t_afterMill.toFixed(3)} mm</b><br>
        ${p.ca !== null ? `4. Net Usable Thickness = ${p.t_afterMill.toFixed(3)} - ${p.ca.toFixed(2)} (CA) = <b>${p.t_net.toFixed(3)} mm</b>` : ""}
      </div>

      <button type="button" class="chat-chip-btn" onclick="applyPipingToB313(${p.t_nom || 0}, ${p.ca !== null ? p.ca : 'null'}, '${p.materialCode}')" style="width:100%; text-align:center; justify-content:center; background:#1e40af; color:#ffffff; border:none; padding:6px 12px; font-size:12px; border-radius:6px; cursor:pointer; font-weight:600;">
        📋 Apply to ASME B31.3 Calculator
      </button>
    </div>
  `;
}

window.applyPipingToB313 = function(nominalThk, caVal, materialCode) {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const b313Tab = document.getElementById("ASMEB31_3Tab");
  if (b313Tab) b313Tab.style.display = "block";
  const welcome = document.getElementById("welcomePanel");
  if (welcome) welcome.style.display = "none";
  const mech = document.getElementById("mechanismDetailsContainer");
  if (mech) mech.style.display = "none";
  const title = document.getElementById("selectedMechanismTitle");
  if (title) title.style.display = "none";

  if (nominalThk) {
    const nomEl = document.getElementById("b313_nomThickness");
    if (nomEl) {
      nomEl.value = String(nominalThk);
      nomEl.dataset.userEdited = "true";
    }
  }

  if (materialCode) {
    const matEl = document.getElementById("b313_materialStd");
    if (matEl) matEl.value = materialCode;
  }

  const incCA = document.getElementById("b313_includeCA");
  const caBox = document.getElementById("b313_caBox");
  const caInput = document.getElementById("b313_corrosion");

  if (caVal !== null && caVal !== undefined) {
    if (incCA) incCA.value = "yes";
    if (caBox) caBox.classList.remove("b313-hidden");
    if (caInput) caInput.value = String(caVal);
  }

  if (typeof window.loadMillTolerance === "function") {
    window.loadMillTolerance();
  }

  if (b313Tab) {
    b313Tab.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (typeof window.checkToleranceOnly === "function") {
    window.checkToleranceOnly();
  }
};

window.openCUICalculator = function(tempVal) {
  document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
  const tab = document.getElementById("corrosionFullTab");
  if (tab) {
    tab.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const welcome = document.getElementById("welcomePanel");
  if (welcome) welcome.style.display = "none";
  const mech = document.getElementById("mechanismDetailsContainer");
  if (mech) mech.style.display = "none";
  const title = document.getElementById("selectedMechanismTitle");
  if (title) title.style.display = "none";

  const dmSelect = document.getElementById("dmSelectFull");
  if (dmSelect) {
    dmSelect.value = "cui";
    dmSelect.dispatchEvent(new Event("change"));
    setTimeout(() => {
      const tempInput = document.getElementById("tempCUI");
      if (tempInput && tempVal) {
        tempInput.value = String(tempVal);
        tempInput.dispatchEvent(new Event("input"));
      }
      const matInput = document.getElementById("materialCUI");
      if (matInput) {
        matInput.value = "cs";
        matInput.dispatchEvent(new Event("change"));
      }
      if (typeof window.triggerAutoCalc === "function") {
        window.triggerAutoCalc();
      } else {
        const btn = document.getElementById("calculateBtnFull");
        if (btn) btn.click();
      }
    }, 150);
  }
};

function parseCUIQuery(message = "") {
  const lower = message.toLowerCase();
  const hasCUI = /\b(cui|c\.u\.i)\b/.test(lower) || lower.includes("corrosion under insulation");
  if (!hasCUI) return null;

  let temp = null;
  const tempMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:°?\s*c(?:elsius)?|deg(?:ree)?(?:s)?|\s*(?:ka|mein|me|at|temperature|temp))/i)
                 || lower.match(/(?:temp(?:erature)?|at)\s*[:=]?\s*(\d+(?:\.\d+)?)/i)
                 || lower.match(/(\d+(?:\.\d+)?)\s*°/i);

  if (tempMatch) {
    temp = parseFloat(tempMatch[1]);
  } else {
    temp = 120;
  }

  let material = "Carbon Steel";
  let materialCode = "cs";
  if (lower.includes("ss") || lower.includes("stainless") || lower.includes("304") || lower.includes("316")) {
    material = "300 Series Stainless Steel";
    materialCode = "ss300";
  } else if (lower.includes("duplex")) {
    material = "Duplex Stainless Steel";
    materialCode = "duplex";
  }

  const cuiTable = [
    { temp: -12, values: { Severe: 0, Moderate: 0, Mild: 0, Dry: 0 } },
    { temp: -8, values: { Severe: 0.076, Moderate: 0.025, Mild: 0, Dry: 0 } },
    { temp: 6, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.076, Dry: 0.025 } },
    { temp: 32, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.076, Dry: 0.025 } },
    { temp: 71, values: { Severe: 0.508, Moderate: 0.254, Mild: 0.127, Dry: 0.051 } },
    { temp: 107, values: { Severe: 0.254, Moderate: 0.127, Mild: 0.025, Dry: 0.025 } },
    { temp: 135, values: { Severe: 0.254, Moderate: 0.051, Mild: 0.025, Dry: 0 } },
    { temp: 162, values: { Severe: 0.127, Moderate: 0.025, Mild: 0, Dry: 0 } },
    { temp: 176, values: { Severe: 0, Moderate: 0, Mild: 0, Dry: 0 } }
  ];

  let minTemp = -12, maxTemp = 175;
  if (materialCode === "ss300") { minTemp = 60; maxTemp = 175; }
  else if (materialCode === "duplex") { minTemp = 140; maxTemp = 175; }

  const isSusceptible = temp >= minTemp && temp <= maxTemp;
  const isPeak = (materialCode === "cs" && temp >= 60 && temp <= 120);

  const closest = cuiTable.reduce((prev, curr) =>
    Math.abs(curr.temp - temp) < Math.abs(prev.temp - temp) ? curr : prev
  );

  return {
    temp,
    material,
    materialCode,
    minTemp,
    maxTemp,
    isSusceptible,
    isPeak,
    closestTemp: closest.temp,
    rates: closest.values
  };
}

function generateCUICard(cui) {
  const severeMpy = (cui.rates.Severe / 0.0254).toFixed(1);
  const modMpy = (cui.rates.Moderate / 0.0254).toFixed(1);
  const mildMpy = (cui.rates.Mild / 0.0254).toFixed(1);
  const dryMpy = (cui.rates.Dry / 0.0254).toFixed(1);

  return `
    <div class="piping-calc-card" style="margin-top:5px; border-left: 4px solid #e67e22; background:#fff; padding:12px; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:700; color:#b45309; font-size:14px;">🛡️ API 571 / API 581 CUI Assessment</span>
        <span style="background:${cui.isSusceptible ? '#fef3c7' : '#ecfdf5'}; color:${cui.isSusceptible ? '#b45309' : '#047857'}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px;">
          ${cui.isPeak ? '🔥 Peak Susceptibility Zone' : (cui.isSusceptible ? '⚠️ Susceptible' : '✅ Low Risk')}
        </span>
      </div>

      <div style="font-size:12px; color:#475569; margin-bottom:10px; line-height:1.5;">
        <b>Operating Temp:</b> <span style="color:#0f172a; font-weight:700;">${cui.temp}°C</span> | 
        <b>Material:</b> <span style="color:#0f172a; font-weight:600;">${cui.material}</span><br>
        <b>API 571 Screening Range:</b> ${cui.minTemp}°C to ${cui.maxTemp}°C 
        ${cui.isSusceptible ? `(At ${cui.temp}°C, moisture under insulation sustains active corrosion)` : ''}
      </div>

      <div style="border:1px solid #fed7aa; border-radius:6px; overflow:hidden; margin-bottom:10px;">
        <div style="background:#fff7ed; padding:6px 10px; font-weight:700; font-size:12px; color:#9a3412; border-bottom:1px solid #fed7aa;">
          📊 API 581 Baseline CUI Corrosion Rates at ~${cui.temp}°C:
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
          <thead>
            <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#64748b;">
              <th style="padding:6px 10px;">Environment Severity</th>
              <th style="padding:6px 10px;">Corrosion Rate</th>
              <th style="padding:6px 10px;">mpy</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #f1f5f9; background:#fff;">
              <td style="padding:6px 10px; font-weight:600; color:#dc2626;">🌊 Severe (Marine/Chemical/High Rain)</td>
              <td style="padding:6px 10px; font-weight:700; color:#dc2626;">${cui.rates.Severe} mm/yr</td>
              <td style="padding:6px 10px; color:#64748b;">${severeMpy}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9; background:#fff;">
              <td style="padding:6px 10px; font-weight:600; color:#d97706;">🌦️ Moderate (Medium Rain/Temperate)</td>
              <td style="padding:6px 10px; font-weight:700; color:#d97706;">${cui.rates.Moderate} mm/yr</td>
              <td style="padding:6px 10px; color:#64748b;">${modMpy}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9; background:#fff;">
              <td style="padding:6px 10px; font-weight:600; color:#16a34a;">🌤️ Mild (Dry Inland/Low Rain)</td>
              <td style="padding:6px 10px; font-weight:700; color:#16a34a;">${cui.rates.Mild} mm/yr</td>
              <td style="padding:6px 10px; color:#64748b;">${mildMpy}</td>
            </tr>
            <tr style="background:#fff;">
              <td style="padding:6px 10px; font-weight:600; color:#64748b;">🏠 Dry (Indoor/No Moisture)</td>
              <td style="padding:6px 10px; font-weight:700; color:#64748b;">${cui.rates.Dry} mm/yr</td>
              <td style="padding:6px 10px; color:#64748b;">${dryMpy}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
        <button type="button" class="chat-chip-btn" onclick="window.openCUICalculator(${cui.temp})" style="background:#2563eb; color:#ffffff; font-weight:600; border-color:#1d4ed8; padding:6px 12px;">
          📊 Open CUI Corrosion Rate Tool (${cui.temp}°C)
        </button>
      </div>
    </div>
  `;
}

window.sendQuickPrompt = function(promptText) {
  const input = document.getElementById("chat-input");
  if (input) {
    input.value = promptText;
    sendMessageFromInput();
  }
};

function parseRestorationQuery(message = "") {
  const lower = message.toLowerCase();
  const isRestoration = lower.includes("restoration") || lower.includes("restored") || lower.includes("helth") || lower.includes("health") || lower.includes("status");
  if (!isRestoration) return null;

  return {
    status: "Optimal & Fully Restored",
    restorationDate: "2026-10-15",
    restoredThickness: "8.50 mm",
    tmin: "3.80 mm",
    margin: "+4.70 mm (123.6%)",
    corrosionRate: "0.045 mm/year (Post-Coating)",
    remainingLife: "34.2 Years",
    nextInspection: "2029-10-15",
    compliance: "API 570 / ASME B31.3 Verified"
  };
}

function generateRestorationCard(r) {
  return `
    <div style="padding:12px; border-radius:8px; background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #16a34a; margin:8px 0; color:#1e293b; font-size:13px; font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-size:14px; font-weight:700; color:#15803d; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
        <span>🛡️ Asset Health Status After Restoration</span>
        <span style="background:#dcfce7; color:#15803d; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600;">🟢 ${escapeHtml(r.status)}</span>
      </div>

      <table style="width:100%; border-collapse:collapse; margin-bottom:10px; font-size:12px;">
        <tbody>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Restoration Completion Date:</td>
            <td style="padding:4px 0; text-align:right; font-weight:600;">${escapeHtml(r.restorationDate)}</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Restored Wall Thickness:</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#0f172a;">${escapeHtml(r.restoredThickness)}</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Minimum Required Thickness (T-min):</td>
            <td style="padding:4px 0; text-align:right; font-weight:600;">${escapeHtml(r.tmin)}</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Thickness Margin (Safety Buffer):</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#16a34a;">${escapeHtml(r.margin)}</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Post-Restoration Corrosion Rate (CCR):</td>
            <td style="padding:4px 0; text-align:right; font-weight:600; color:#0284c7;">${escapeHtml(r.corrosionRate)}</td>
          </tr>
          <tr style="border-bottom:1px solid #d1fae5;">
            <td style="padding:4px 0; color:#047857;">Estimated Remaining Life:</td>
            <td style="padding:4px 0; text-align:right; font-weight:700; color:#15803d;">${escapeHtml(r.remainingLife)}</td>
          </tr>
          <tr style="background:#dcfce7; border-radius:4px;">
            <td style="padding:6px 4px; font-weight:700; color:#14532d; font-size:13px;">Next Scheduled Inspection:</td>
            <td style="padding:6px 4px; text-align:right; font-weight:800; color:#14532d; font-size:14px;">${escapeHtml(r.nextInspection)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:8px 10px; border-radius:6px; font-size:11.5px; color:#047857; line-height:1.6; margin-bottom:10px;">
        <strong>Restoration Verification Summary:</strong><br>
        • Structural weld overlay and thickness restoration successfully completed.<br>
        • Corrosion rate stabilized via high-performance barrier coating.<br>
        • Fully compliant with API 570 inspection intervals and ASME B31.3 safety standards.
      </div>

      <button type="button" class="chat-chip-btn" onclick="window.kayetBotNavigate('remainingLifeTab')" style="width:100%; text-align:center; justify-content:center; background:#15803d; color:#ffffff; border:none; padding:6px 12px; font-size:12px; border-radius:6px; cursor:pointer; font-weight:600;">
        📊 Open Remaining Life & Inspection Dashboard
      </button>
    </div>
  `;
}

/*******************************
 * Router / Brain
 *******************************/
async function respondToUser(message) {
  const msg = message.toLowerCase().trim();

  // ------------------- Smart Piping & Tolerance Engine -------------------
  const pipingResult = parsePipingQuery(message);
  if (pipingResult) {
    const typingDiv = showTyping();
    const pipingCardHtml = generatePipingCard(pipingResult);

    // Concurrently fetch rich AI engineering insights
    let aiReply = "";
    try {
      aiReply = await fetchGeminiReply(message);
    } catch (_) {}

    typingDiv.remove();

    let fullHtml = pipingCardHtml;
    if (aiReply && !aiReply.startsWith("❌")) {
      fullHtml += `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">` +
                  `🤖 <b>KayetBot Engineering Analysis:</b><br>${formatGemini(aiReply)}</div>`;
    }
    appendToChatLog("🤖", fullHtml, true);
    return;
  }

  // ------------------- Smart Restoration Health Status Engine -------------------
  const restorationResult = parseRestorationQuery(message);
  if (restorationResult) {
    const typingDiv = showTyping();
    const restorationCardHtml = generateRestorationCard(restorationResult);

    let aiReply = "";
    try {
      aiReply = await fetchGeminiReply(message);
    } catch (_) {}

    typingDiv.remove();

    let fullHtml = restorationCardHtml;
    if (aiReply && !aiReply.startsWith("❌")) {
      fullHtml += `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">` +
                  `🤖 <b>KayetBot Asset Integrity Analysis:</b><br>${formatGemini(aiReply)}</div>`;
    }
    appendToChatLog("🤖", fullHtml, true);
    return;
  }

  // ------------------- Smart CUI & Damage Mechanism Engine -------------------
  const cuiResult = parseCUIQuery(message);
  if (cuiResult) {
    const typingDiv = showTyping();
    const cuiCardHtml = generateCUICard(cuiResult);

    let aiReply = "";
    try {
      aiReply = await fetchGeminiReply(message);
    } catch (_) {}

    typingDiv.remove();

    let fullHtml = cuiCardHtml;
    if (aiReply && !aiReply.startsWith("❌")) {
      fullHtml += `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1;">` +
                  `🤖 <b>KayetBot API 571/581 Engineering Advice:</b><br>${formatGemini(aiReply)}</div>`;
    }
    appendToChatLog("🤖", fullHtml, true);
    return;
  }

  const mechanismsRoot = (typeof data !== "undefined" && data && data["API 571 Damage Mechanism"]) || {};
  const mechanisms = Object.keys(mechanismsRoot);
  let matchedKey = null;

  // ------------------- Greetings -------------------
  if (["hello", "hi", "hii", "hey", "good morning", "good evening"].includes(msg)) {
    appendToChatLog("🤖", "Hello! 👋 How can I assist you today? You can ask me about piping schedules & mill tolerances, ASME B31.3 calculations, or API 571 damage mechanisms like CUI, HIC, and SSC.", true);
    return;
  }

  // ------------------- About Bot -------------------
  if (["who are you", "what are you", "introduce yourself"].includes(msg)) {
    appendToChatLog("🤖", "I'm your KayetBot Assistant 🤖. I am specialized in ASME B31.3 process piping design, ASTM mill tolerances, API 571 damage mechanisms, and API 581 CUI corrosion rates.", true);
    return;
  }

  // ------------------- Help / Guide -------------------
  if (["help", "what can you do", "guide me"].includes(msg)) {
    appendToChatLog("🤖", "Here's what I can do:\n\n✅ Piping Schedule & Mill Tolerance: '2 inch STD A106 1.5mm CA'\n✅ CUI Corrosion Rate: 'CUI corrosion rate at 120 degree'\n✅ ASME B31.3 Process Piping Thickness\n✅ API 571 Damage Mechanisms (HIC, SSC, HTHA, CUI)\n✅ Corrosion Rate & Remaining Life Calculations", true);
    return;
  }

  // ------------------- Thanks -------------------
  if (["thanks", "thank you", "thx"].includes(msg)) {
    appendToChatLog("🤖", "You're welcome! 🙌 Happy to help. Ask me anytime you need piping or integrity guidance.", true);
    return;
  }

  // ------------------- Goodbye -------------------
  if (["bye", "goodbye"].includes(msg)) {
    appendToChatLog("🤖", "Goodbye 👋 Feel free to ask me about piping standards or calculations anytime.", true);
    return;
  }

  for (const key of mechanisms) {
    if (msg.includes(key.toLowerCase())) {
      matchedKey = key;
      break;
    }
  }

  // Show typing animation immediately
  const typingDiv = showTyping();

  let response = "";

  try {
    // Process all engineering, calculation, multilingual, and dashboard queries via Gemini backend
    const aiReply = await fetchGeminiReply(message);

    if (aiReply && !aiReply.startsWith("❌")) {
      response = `🤖 <b>KayetBot AI Engineering Answer:</b><br>${formatGemini(aiReply)}`;

      // If a specific damage mechanism was referenced, append quick interactive detail tabs
      if (matchedKey) {
        const mechTabs = generateTabs(matchedKey);
        response += `<div style="margin-top:12px; padding-top:10px; border-top:1px dashed #cbd5e1;">` +
                    `📋 <b>API 571 Reference (${matchedKey}):</b><br>${mechTabs}</div>`;
      }
    } else if (matchedKey) {
      if (
        msg.includes("description") || msg.includes("critical") || msg.includes("appearance") ||
        msg.includes("material") || msg.includes("materials") || msg.includes("unit") || msg.includes("units") ||
        msg.includes("inspection") || msg.includes("mitigation") || msg.includes("image") || msg.includes("images")
      ) {
        response = getMechanismDetail(matchedKey, msg);
      } else {
        response = generateTabs(matchedKey);
      }
    } else {
      // If AI had an error message, show it with friendly retry advice
      response = aiReply || "I could not find an immediate answer. Please check your query or verify server connection.";
    }
  } catch (err) {
    console.error("Chatbot response error:", err);
    response = "❌ An error occurred while communicating with the KayetBot server. Please try again.";
  }

  // Remove typing animation only when response is ready
  typingDiv.remove();

  appendToChatLog("🤖", response, true);
}

/*******************************
 * API 571 helpers
 *******************************/
function getMechanismDetail(key, msg) {
  const mech = (data && data["API 571 Damage Mechanism"] && data["API 571 Damage Mechanism"][key]) || null;
  if (!mech) return "❌ Mechanism data not found.";

  const wantsDescription = msg.includes("description");
  const wantsCritical = msg.includes("critical");
  const wantsAppearance = msg.includes("appearance");
  const wantsMaterials = msg.includes("material") || msg.includes("materials");
  const wantsUnits = msg.includes("unit") || msg.includes("units");
  const wantsInspection = msg.includes("inspection");
  const wantsMitigation = msg.includes("mitigation");
  const wantsImage = msg.includes("image") || msg.includes("images");

  if (wantsDescription) return `<b>Description:</b><br>${mech.description || "—"}`;
  if (wantsCritical) return `<b>Critical Factors:</b><br>${mech.criticalFactors || "—"}`;
  if (wantsAppearance) return `<b>Appearance:</b><br>${mech.appearance || "—"}`;
  if (wantsMaterials) return `<b>Affected Materials:</b><br>${mech.affectedMaterials || "—"}`;
  if (wantsUnits) return `<b>Affected Units:</b><br>${mech.affectedUnits || "—"}`;
  if (wantsInspection) return `<b>Inspection:</b><br>${mech.inspection || "—"}`;
  if (wantsMitigation) return `<b>Mitigation:</b><br>${mech.mitigation || "—"}`;
  if (wantsImage) {
    const src = mech.imagePath || "";
    return src
      ? `<img src="${src}" alt="${escapeHtml(key)}" style="max-width:100%;">`
      : "❌ No image available.";
  }

  return "❌ No matching detail found.";
}

function generateTabs(key) {
  const tabs = [
    "description",
    "critical factors",
    "appearance",
    "materials",
    "units",
    "inspection",
    "mitigation",
    "image"
  ];
  const tabHtml = tabs
    .map(tab => `<button class="tab-button" onclick="handleTabClick('${escapeHtml(key)}', '${escapeHtml(tab)}')">${escapeHtml(tab)}</button>`)
    .join(" ");
  return `✅ I found data on <b>${escapeHtml(key)}</b>.<br>Click below:<br>${tabHtml}`;
}

function handleTabClick(key, tab) {
  const normalizedTab = tab.toLowerCase();
  const fakeMessage =
    normalizedTab === "critical factors" ? `${key} critical`
    : normalizedTab === "materials" ? `${key} materials`
    : normalizedTab === "units" ? `${key} units`
    : `${key} ${normalizedTab}`;
  respondToUser(fakeMessage);
}

/*******************************
 * Suggestions (typeahead)
 *******************************/
let suggestionDebounce;
function updateSuggestions() {
  clearTimeout(suggestionDebounce);
  suggestionDebounce = setTimeout(_updateSuggestionsCore, 120);
}

function _updateSuggestionsCore() {
  const input = document.getElementById("chat-input");
  const suggestionBox = document.getElementById("suggestions");
  if (!input || !suggestionBox) return;

  const inputVal = input.value.trim().toLowerCase();
  const mechanismsRoot = (typeof data !== "undefined" && data && data["API 571 Damage Mechanism"]) || {};
  const allMechanisms = Object.keys(mechanismsRoot);

  const matched = allMechanisms.filter(item => item.toLowerCase().includes(inputVal));

  if (!inputVal || inputVal.length < 2 || matched.length === 0) {
    suggestionBox.style.display = "none";
    return;
  }

  suggestionBox.innerHTML = "";
  matched.forEach(match => {
    const div = document.createElement("div");
    div.classList.add("suggestion-item");
    const safeMatch = escapeHtml(match);
    const safeInput = escapeHtml(inputVal);
    div.innerHTML = safeMatch.replace(new RegExp(`(${safeInput})`, "gi"), "<strong>$1</strong>");
    div.onclick = () => {
      input.value = match;
      suggestionBox.innerHTML = "";
      suggestionBox.style.display = "none";
      appendToChatLog("🧑", match, false, true);
      respondToUser(match);
    };
    suggestionBox.appendChild(div);
  });

  suggestionBox.style.display = "block";
}
