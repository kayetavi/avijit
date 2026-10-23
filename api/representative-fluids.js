/**
 * API 581 Representative Fluids Backend Engine
 * Handles representative fluid properties, physical characteristics, and material filtering.
 * Backed by Firestore collection 'representativeFluids' with local static fallback.
 */

import { getAdminFirestore } from "./firebaseAdmin.js";

export const REPRESENTATIVE_FLUIDS_DATABASE = [
  ["C₁–C₂", "Methane, ethane, ethylene, LNG, fuel gas", 23, -125, -193, 558, 1036],
  ["C₃–C₄", "Propane, butane, isobutane, LPG", 51, -21, -6.3, 369, 696],
  ["C₅", "Pentane", 72, 36, 97, 284, 544],
  ["C₆–C₈", "Gasoline, naphtha, light straight run, heptane", 100, 99, 210, 223, 433],
  ["C₉–C₁₂", "Diesel, kerosene", 149, 184, 364, 208, 406],
  ["C₁₃–C₁₆", "Jet fuel, kerosene, atmospheric gas oil", 205, 261, 502, 202, 396],
  ["C₁₇–C₂₅", "Gas oil, typical crude", 280, 344, 651, 202, 396],
  ["C₂₅+", "Residuum, heavy crude, lube oil, seal oil", 422, 527, 981, 202, 396],
  ["Water", "Water", 18, 100, 212, "N/A", "N/A"],
  ["Steam", "Steam", 18, 100, 212, "N/A", "N/A"],
  ["Acid", "Acid, caustic", 18, 100, 212, "N/A", "N/A"],
  ["H₂", "Hydrogen only", 2, -253, -423, 400, 752],
  ["H₂S", "Hydrogen sulfide only", 34, -59, -75, 260, 500],
  ["HF", "Hydrogen fluoride", 20, 20, 68, 17760, 32000],
  ["CO", "Carbon monoxide", 28, -191, -312, 609, 1128],
  ["DEE", "Diethyl ether", 74, 35, 95, 160, 320],
  ["HCl", "Hydrogen chloride", 36, -85, -121, "N/A", "N/A"],
  ["Nitric acid", "Nitric acid", 63, 121, 250, "N/A", "N/A"],
  ["NO₂", "Nitrogen dioxide", 90, 135, 275, "N/A", "N/A"],
  ["Phosgene", "Phosgene", 99, 83, 181, "N/A", "N/A"],
  ["TDI", "Toluene diisocyanate", 174, 251, 484, 620, 1148],
  ["Methanol", "Methanol", 32, 65, 149, 464, 867],
  ["PO", "Propylene oxide", 58, 34, 93, 449, 840],
  ["Styrene", "Styrene", "—", "—", "—", "—", "—"],
  ["EEA", "Ethylene glycol monoethyl ether acetate", 132, 156, 313, 379, 715],
  ["EE", "Ethylene glycol monoethyl ether", 90, 135, 275, 235, 455],
  ["EG", "Ethylene glycol", 62, 197, 387, 396, 745],
  ["EO", "Ethylene oxide", 44, 11, 51, 429, 804]
];

async function getRepresentativeFluids() {
  const adminDb = getAdminFirestore();
  if (!adminDb) {
    throw new Error("Live Firestore connection is mandatory. Cloud database is unavailable.");
  }
  const snap = await adminDb.collection("representativeFluids").get();
  if (!snap.empty) {
    const fluids = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && Array.isArray(data.row)) {
        fluids.push(data.row);
      }
    });
    if (fluids.length > 0) {
      return fluids;
    }
  } else {
    // Auto-seed into Firestore if empty
    for (let i = 0; i < REPRESENTATIVE_FLUIDS_DATABASE.length; i++) {
      const row = REPRESENTATIVE_FLUIDS_DATABASE[i];
      const id = `fluid_${i}_${encodeURIComponent(row[0])}`;
      await adminDb.collection("representativeFluids").doc(id).set({
        row,
        code: row[0],
        name: row[1],
        updatedAt: Date.now()
      }, { merge: true });
    }
    return REPRESENTATIVE_FLUIDS_DATABASE;
  }
  return [];
}

export default async function handler(req, res) {
  try {
    const method = req.method;
    const body = req.body || {};
    const query = req.query || {};

    const fluidsDb = await getRepresentativeFluids();

    const action = body.action || query.action || (method === "GET" && !query.selectedMaterials && !body.selectedMaterials ? "materials" : "filter");

    // Return unique sorted material names for dropdown initialization
    if (action === "materials" || action === "get_materials") {
      const materials = [...new Set(fluidsDb.map(f => f[1]))].sort();
      return res.status(200).json({
        success: true,
        materials,
        count: materials.length
      });
    }

    // Return all fluids
    if (action === "all" || query.all === "true") {
      return res.status(200).json({
        success: true,
        fluids: fluidsDb,
        total: fluidsDb.length
      });
    }

    // Filter fluids by selected materials
    let selected = body.selectedMaterials || body.materials || query.selectedMaterials || query.materials || [];
    if (typeof selected === "string") {
      try {
        selected = JSON.parse(selected);
      } catch {
        selected = selected.split(",").map(s => s.trim()).filter(Boolean);
      }
    }

    if (!Array.isArray(selected) || selected.length === 0) {
      return res.status(200).json({
        success: true,
        fluids: [],
        count: 0
      });
    }

    const filtered = fluidsDb.filter(f => selected.includes(f[1]));

    return res.status(200).json({
      success: true,
      fluids: filtered,
      count: filtered.length
    });
  } catch (err) {
    console.error("[Representative Fluids API Error]:", err);
    return res.status(503).json({
      success: false,
      error: "Live connection to Firestore is required: " + (err.message || String(err))
    });
  }
}
