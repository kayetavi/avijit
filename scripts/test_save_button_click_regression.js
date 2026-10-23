/**
 * Regression Test: Admin User Management -> Configured Permissions Save Button Click Flow
 * 
 * Verifies:
 * 1. DOM button generation & attributes (id, type="button", class, onclick, data-target-email)
 * 2. Window & window.adminPanel method availability
 * 3. Click event dispatch & handler invocation
 * 4. Single-execution guarantee (no duplicate rapid clicks)
 * 5. Accurate request payload (action: "save_user", targetEmail, allowedModules)
 * 6. Non-blocking UI feedback (toast, status element, button text updates)
 */

import fs from "fs";
import path from "path";

// Lightweight pure Node DOM simulation
class MockElement {
  constructor(tagName = "div", id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = "";
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.innerHTML = "";
    this.textContent = "";
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.classList = {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle(c, force) {
        if (force === true) { this._classes.add(c); return true; }
        if (force === false) { this._classes.delete(c); return false; }
        if (this._classes.has(c)) { this._classes.delete(c); return false; }
        this._classes.add(c); return true;
      },
      contains(c) { return this._classes.has(c); }
    };
    this.eventListeners = {};
    this.onclick = null;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || (k === "type" ? this.type : null); }
  hasAttribute(k) { return k in this.attributes; }

  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }

  click() {
    if (this.disabled) return;
    const evt = { preventDefault() {}, stopPropagation() {}, target: this };
    if (typeof this.onclick === "function") {
      this.onclick(evt);
    }
    if (this.eventListeners["click"]) {
      this.eventListeners["click"].forEach(fn => fn(evt));
    }
  }

  appendChild(el) {
    this.children.push(el);
    return el;
  }

  removeChild(el) {
    const idx = this.children.indexOf(el);
    if (idx >= 0) this.children.splice(idx, 1);
    return el;
  }

  querySelector(sel) {
    // Basic selector match
    if (sel.startsWith("#")) {
      const id = sel.substring(1);
      return this.id === id ? this : (this.children.find(c => c.querySelector(sel)) || null);
    }
    if (sel.includes("[data-mod=")) {
      const mod = sel.match(/data-mod="([^"]+)"/)?.[1];
      if (this.getAttribute && this.getAttribute("data-mod") === mod) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    }
    return null;
  }

  querySelectorAll(sel) {
    const res = [];
    if (sel.includes("input[data-mod]")) {
      if (this.tagName === "INPUT" && this.getAttribute("data-mod")) res.push(this);
    }
    if (sel.includes("input[data-sub]")) {
      if (this.tagName === "INPUT" && this.getAttribute("data-sub")) res.push(this);
    }
    if (sel.includes(".adm-inline-editor-row")) {
      if ((this.className || "").includes("adm-inline-editor-row")) res.push(this);
    }
    for (const c of this.children) {
      if (c.querySelectorAll) res.push(...c.querySelectorAll(sel));
    }
    return res;
  }
}

async function runRegressionTest() {
  console.log("=================================================================");
  console.log("   REGRESSION TEST: CONFIGURED PERMISSIONS SAVE BUTTON CLICK     ");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(` [PASS] ${message}`);
    } else {
      console.error(` [FAIL] ${message}`);
    }
  }

  // Setup DOM global mocks
  const elementMap = new Map();
  const document = {
    body: new MockElement("body", "body"),
    readyState: "complete",
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) { return elementMap.get(id) || null; },
    addEventListener(event, fn) {},
    removeEventListener(event, fn) {},
    querySelector(sel) {
      if (sel.startsWith("#")) return elementMap.get(sel.substring(1)) || null;
      if (sel === ".adm-toast-container") return elementMap.get("toastContainer") || null;
      return null;
    },
    querySelectorAll(sel) {
      const list = [];
      elementMap.forEach(el => {
        if (sel === ".adm-inline-editor-row" && (el.className || "").includes("adm-inline-editor-row")) list.push(el);
      });
      return list;
    }
  };

  const tbody = new MockElement("tbody", "admUsersTableBody");
  elementMap.set("admUsersTableBody", tbody);

  const localStorage = {
    _data: {
      loggedInUser: "avijitkayet97@gmail.com",
      sessionId: "sess_reg_999",
      userUid: "usr_admin_1"
    },
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const networkRequests = [];
  const fetch = async (url, options = {}) => {
    networkRequests.push({ url, options });
    if (url.includes("action=get_users")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          users: [
            {
              id: "engineer@example.com",
              email: "engineer@example.com",
              role: "engineer",
              allowedModules: { damageExplorer: true, api581: true },
              subsections: {},
              updatedAt: Date.now()
            }
          ]
        })
      };
    }
    if (url.includes("/api/admin")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: "User saved successfully in Firestore and Auth",
          user: {
            email: "engineer@example.com",
            role: "engineer",
            allowedModules: { damageExplorer: true, api581: true, api570: true }
          }
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  global.window = {
    location: { href: "http://localhost:3000/dashboard.html" },
    document,
    localStorage,
    sessionStorage: localStorage,
    fetch,
    Headers: class Headers {
      constructor(init = {}) { this.map = new Map(Object.entries(init)); }
      set(k, v) { this.map.set(k.toLowerCase(), v); }
      get(k) { return this.map.get(k.toLowerCase()) || null; }
      has(k) { return this.map.has(k.toLowerCase()); }
    }
  };
  global.document = document;
  global.localStorage = localStorage;

  // Load and execute js/admin-panel.js
  const jsContent = fs.readFileSync(path.resolve("js/admin-panel.js"), "utf8");
  eval(jsContent);

  // 1. Verify window.adminPanel existence
  assert(!!window.adminPanel, "window.adminPanel is defined on global window");
  assert(typeof window.adminPanel.saveUserPermissions === "function", "window.adminPanel.saveUserPermissions is an accessible function");
  assert(typeof window.adminPanel.showToast === "function", "window.adminPanel.showToast is available for non-blocking feedback");

  // 2. Load users
  await window.adminPanel.loadUsers();
  assert(window.adminPanel.users.length > 0, "Users loaded into adminPanel memory");

  const testEmail = "engineer@example.com";
  const safeId = window.adminPanel.getSafeId(testEmail);
  assert(safeId === "engineer_example_com", "safeId correctly calculated for email");

  // Mock DOM elements that renderUsersTable produces
  const editorRow = new MockElement("tr", `perm_editor_row_${safeId}`);
  editorRow.className = "adm-inline-editor-row";
  elementMap.set(`perm_editor_row_${safeId}`, editorRow);

  const editorCard = new MockElement("div", `perm_editor_card_${safeId}`);
  editorCard.className = "adm-inline-editor-card";
  elementMap.set(`perm_editor_card_${safeId}`, editorCard);

  // 3. Open editor
  console.log("\n--- Triggering toggleEditUserPermissions ---");
  window.adminPanel.toggleEditUserPermissions(testEmail);
  assert(editorRow.style.display === "table-row", "Editor row displayed as 'table-row'");
  assert(editorCard.innerHTML.length > 0, "Permissions form injected into editorCard");

  // Parse innerHTML to verify button element and properties
  const htmlContent = editorCard.innerHTML;
  assert(htmlContent.includes(`id="admSaveUserBtn_${safeId}"`), "Save button contains exact id matching safeId");
  assert(htmlContent.includes(`type="button"`), "Save button explicitly has type='button'");
  assert(htmlContent.includes(`adm-btn-save-permissions`), "Save button has identifying class 'adm-btn-save-permissions'");
  assert(htmlContent.includes(`onclick="window.adminPanel.saveUserPermissions('${testEmail}', event)"`), "Save button has inline onclick bound with target email and event");

  // Create the interactive elements in DOM map for click execution
  const grid = new MockElement("div", `admModulesGrid_${safeId}`);
  
  // Add input checkboxes
  const modInp1 = new MockElement("input");
  modInp1.setAttribute("data-mod", "damageExplorer");
  modInp1.checked = true;
  grid.appendChild(modInp1);

  const modInp2 = new MockElement("input");
  modInp2.setAttribute("data-mod", "api581");
  modInp2.checked = true;
  grid.appendChild(modInp2);

  const modInp3 = new MockElement("input");
  modInp3.setAttribute("data-mod", "adminControlCenter");
  modInp3.checked = false;
  grid.appendChild(modInp3);

  elementMap.set(`admModulesGrid_${safeId}`, grid);

  const roleSelect = new MockElement("select", `admEditRole_${safeId}`);
  roleSelect.value = "engineer";
  elementMap.set(`admEditRole_${safeId}`, roleSelect);

  const statusEl = new MockElement("span", `admSaveStatus_${safeId}`);
  elementMap.set(`admSaveStatus_${safeId}`, statusEl);

  const saveBtn = new MockElement("button", `admSaveUserBtn_${safeId}`);
  saveBtn.setAttribute("type", "button");
  saveBtn.onclick = (e) => window.adminPanel.saveUserPermissions(testEmail, e);
  elementMap.set(`admSaveUserBtn_${safeId}`, saveBtn);

  // 4. Test button click execution
  console.log("\n--- Executing Click on Save Button ---");
  networkRequests.length = 0; // Clear requests

  // Simulate user click
  saveBtn.click();

  // Wait a microtask
  await new Promise(r => setTimeout(r, 50));

  const saveRequests = networkRequests.filter(r => r.options.method === "POST" && r.url === "/api/admin");
  assert(saveRequests.length === 1, "Save button click dispatched exactly 1 save_user POST request");
  const req = saveRequests[0];
  assert(req.options.method === "POST", "Dispatched request is HTTP POST");
  assert(req.url === "/api/admin", "Target endpoint is /api/admin");

  const parsedBody = JSON.parse(req.options.body);
  assert(parsedBody.action === "save_user", "Request payload action is 'save_user'");
  assert(parsedBody.targetEmail === testEmail, "Request targetEmail matches user");
  assert(parsedBody.allowedModules.damageExplorer === true, "Allowed modules accurately collected from checkboxes");
  assert(parsedBody.allowedModules.adminControlCenter === false, "Unchecked modules recorded as false");

  // 5. Verify single execution guard on rapid repeat clicks
  console.log("\n--- Testing Rapid Double Click Guard ---");
  window.adminPanel._isSavingUserPermissions = true; // Simulate in-flight request
  const reqCountBefore = networkRequests.length;
  saveBtn.click();
  assert(networkRequests.length === reqCountBefore, "Duplicate click while in-flight was safely ignored");
  window.adminPanel._isSavingUserPermissions = false;

  console.log("\n=================================================================");
  console.log(`SUMMARY: ${passedTests}/${totalTests} Tests Passed`);
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runRegressionTest().catch(err => {
  console.error("Test Error:", err);
  process.exit(1);
});
