// DamageMechanism.js - API 571 Damage Mechanism Catalog & Unified Resolver
// Pure Dumb UI View: Delegated to Backend API Engine (/api/damage-mechanisms)

const damageMechanisms = (typeof window !== "undefined" && window.damageMechanisms) ? window.damageMechanisms : {};

if (typeof window !== "undefined") {
  window.damageMechanisms = damageMechanisms;

  // Asynchronous Backend Resolver (Delegates search and synonym resolution to server endpoint)
  window.fetchDamageMechanismFromBackend = async function(nameOrCode) {
    if (!nameOrCode) return null;
    const catalog = window.damageMechanisms || damageMechanisms;
    const cleanKey = String(nameOrCode).trim();

    if (catalog[cleanKey]) return catalog[cleanKey];

    try {
      const res = await fetch(`/api/damage-mechanisms?search=${encodeURIComponent(cleanKey)}`);
      if (res.ok) {
        const json = await res.json();
        const m = json.mechanism || (json.mechanisms && Object.values(json.mechanisms)[0]);
        if (m) {
          catalog[m.name] = m;
          if (m.code) catalog[String(m.code)] = m;
          if (m.id) catalog[String(m.id)] = m;
          if (window.data && window.data["Damage Mechanism"]) {
            window.data["Damage Mechanism"][m.name] = m;
          }
          return m;
        }
      }
    } catch (e) {
      console.warn("Backend fetch failed for damage mechanism:", e);
    }
    return null;
  };

  // Synchronous Resolver (Checks in-memory cache, delegates cache-misses to server)
  window.getDamageMechanismByName = function(name) {
    if (!name) return null;
    const catalog = window.damageMechanisms || damageMechanisms;

    // 1. Direct name match
    if (catalog[name]) return catalog[name];

    // 2. Direct code match
    if (catalog[String(name)]) return catalog[String(name)];

    // Check window.data if available
    if (window.data && window.data["Damage Mechanism"]) {
      const dMechs = window.data["Damage Mechanism"];
      if (dMechs[name]) return dMechs[name];
      if (dMechs[String(name)]) return dMechs[String(name)];
    }

    // Trigger async backend resolution for subsequent accesses
    window.fetchDamageMechanismFromBackend(name);
    return null;
  };

  // Synchronize Custom & Modified Damage Mechanisms from Live Firestore API
  window.loadCustomDamageMechanisms = async function() {
    try {
      const res = await fetch("/api/damage-mechanisms");
      if (res.ok) {
        const json = await res.json();
        const mechs = json.mechanisms || json["Damage Mechanism"];
        if (mechs && typeof mechs === "object") {
          for (const [key, val] of Object.entries(mechs)) {
            if (val && typeof val === "object") {
              const name = val.name || key;
              damageMechanisms[name] = val;
              if (val.code) damageMechanisms[String(val.code)] = val;
              if (val.id) damageMechanisms[String(val.id)] = val;
              if (typeof window.data !== "undefined" && window.data && window.data["Damage Mechanism"]) {
                window.data["Damage Mechanism"][name] = val;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Could not fetch damage mechanisms from live Firestore API:", e);
    }
  };

  window.loadCustomDamageMechanisms();
}
