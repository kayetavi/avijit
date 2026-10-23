/**
 * API 571 Damage Mechanism Frontend Data Adapter
 * Communicates with backend API (/api/damage-mechanisms) to dynamically load the damage mechanism catalog.
 * Frontend retains only UI state and render controls.
 */

const data = {
  "Damage Mechanism": {}
};

if (typeof window !== "undefined") {
  window.data = data;

  // Asynchronously loads all damage mechanisms from backend (live Firestore)
  window.loadDamageMechanismsData = async function(callback, forceLive = false) {
    if (typeof window.refreshDamageMechanisms === "function") {
      const res = await window.refreshDamageMechanisms(forceLive);
      if (typeof callback === "function") callback(window.data);
      return window.data;
    }
    try {
      const url = forceLive ? "/api/damage-mechanisms?refresh=1" : "/api/damage-mechanisms";
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const result = await response.json();
      
      const mechs = result["Damage Mechanism"] || result.mechanisms || {};
      window.data["Damage Mechanism"] = mechs;

      // Populate window.damageMechanisms for backward compatibility
      if (typeof window.damageMechanisms === "undefined" || !window.damageMechanisms) {
        window.damageMechanisms = {};
      }
      Object.assign(window.damageMechanisms, mechs);

      // Also map numeric codes
      for (const [name, val] of Object.entries(mechs)) {
        if (val && typeof val === "object") {
          if (val.code) {
            window.damageMechanisms[String(val.code)] = val;
          }
        }
      }

      // If loadCategories exists and category list is ready, render it
      if (typeof window.loadCategories === "function" && document.getElementById("categoryList")) {
        window.loadCategories(window.data);
      }

      // Sync custom local additions
      if (typeof window.loadCustomDamageMechanisms === "function") {
        window.loadCustomDamageMechanisms();
      }

      if (typeof callback === "function") {
        callback(window.data);
      }
      return window.data;
    } catch (err) {
      console.warn("Failed to load damage mechanisms from backend API:", err);
      return window.data;
    }
  };

  // Trigger early load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.loadDamageMechanismsData();
    });
  } else {
    window.loadDamageMechanismsData();
  }
}
