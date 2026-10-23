import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

async function runBrowserClickTest() {
  console.log("=== SIMULATING ADMIN USER MANAGEMENT CONFIGURED PERMISSIONS CLICK FLOW ===");

  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="adminPanelTab">
          <tbody id="admUsersTableBody"></tbody>
        </div>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, {
    url: "http://localhost:3000",
    runScripts: "dangerously",
    resources: "usable"
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = window.localStorage;
  global.sessionStorage = window.sessionStorage;
  global.Headers = window.Headers;
  global.fetch = window.fetch;

  localStorage.setItem("loggedInUser", "avijitkayet97@gmail.com");
  localStorage.setItem("sessionId", "sess_sim_123");
  localStorage.setItem("userUid", "usr_superadmin");

  // Load js/admin-panel.js into window context
  const adminPanelJs = fs.readFileSync(path.resolve("./js/admin-panel.js"), "utf8");
  
  // Track fetch calls
  let fetchCalls = [];
  window.fetch = async (url, opts = {}) => {
    fetchCalls.push({ url, method: opts.method || "GET", body: opts.body });
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
          message: "User saved successfully",
          user: {
            email: "engineer@example.com",
            role: "engineer",
            allowedModules: { damageExplorer: true }
          }
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  window.eval(adminPanelJs);

  console.log("adminPanel available:", !!window.adminPanel);
  console.log("adminPanel.saveUserPermissions is function:", typeof window.adminPanel?.saveUserPermissions === "function");

  // Load users into table
  await window.adminPanel.loadUsers();

  const tbody = document.getElementById("admUsersTableBody");
  console.log("Table rendered with rows count:", tbody.children.length);

  // Toggle edit permissions for engineer@example.com
  const targetEmail = "engineer@example.com";
  console.log("Calling toggleEditUserPermissions for:", targetEmail);
  window.adminPanel.toggleEditUserPermissions(targetEmail);

  const safeId = window.adminPanel.getSafeId(targetEmail);
  console.log("Computed safeId:", safeId);

  // Check the Save button DOM element
  const saveBtn = document.getElementById(`admSaveUserBtn_${safeId}`);
  console.log("Save button element found:", !!saveBtn);
  if (saveBtn) {
    console.log("Save button tag:", saveBtn.tagName);
    console.log("Save button type:", saveBtn.getAttribute("type"));
    console.log("Save button onclick attr:", saveBtn.getAttribute("onclick"));
    console.log("Save button disabled:", saveBtn.disabled);
    console.log("Save button text:", saveBtn.textContent.trim());
  }

  // Click the save button
  console.log("\nSimulating Save button click event...");
  fetchCalls = []; // reset fetch calls before click
  if (saveBtn) {
    try {
      saveBtn.click();
    } catch (err) {
      console.error("Error during saveBtn.click():", err);
    }
  }

  // Wait a tick for async handler
  await new Promise(r => setTimeout(r, 100));

  console.log("Fetch calls after click:", fetchCalls.length);
  fetchCalls.forEach((fc, idx) => {
    console.log(`Call #${idx + 1}: ${fc.method} ${fc.url} - Payload:`, fc.body);
  });
}

runBrowserClickTest().catch(console.error);
