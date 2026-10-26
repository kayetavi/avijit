import fs from "fs";
import path from "path";
import { getAdminFirestore } from "./firebaseAdmin.js";
import { getFirestoreDb } from "./firestoreClient.js";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { verifyRequestRbac } from "./rbac.js";

const SECURE_DIR = path.join(process.cwd(), "data", "secure");
const WORKSPACE_FILE = path.join(SECURE_DIR, "rbi_workspace.json");
const ASSESSMENTS_FILE = path.join(SECURE_DIR, "rbi_assessments.json");

function loadJsonFile(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {
    console.warn("[Risk Calc API] Failed to read file:", filePath, e.message);
  }
  return fallback;
}

function saveJsonFile(filePath, data) {
  try {
    if (!fs.existsSync(SECURE_DIR)) {
      fs.mkdirSync(SECURE_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.warn("[Risk Calc API] Failed to write file:", filePath, e.message);
    return false;
  }
}

function sanitizeDocId(id) {
  if (!id) return `ID-${Date.now()}`;
  return String(id).replace(/[\/\\]/g, "_").trim();
}

function cleanFirestoreObject(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreObject);
  }
  const cleaned = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) {
      cleaned[k] = null;
    } else if (v && typeof v === "object" && !(v instanceof Date)) {
      cleaned[k] = cleanFirestoreObject(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

// ============================================================================
// 1. BACKEND CALCULATION ENGINE (API 580 / 581, Meridium POF & GE Digital COF)
// ============================================================================

export const ART_TABLE = {
  0.02: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.04: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.06: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.08: { 0: 1, 1: { l: 1, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.10: { 0: 2, 1: { l: 2, m: 1, h: 1, vh: 1 }, 2: { l: 1, m: 1, h: 1, vh: 1 }, 3: { l: 1, m: 1, h: 1, vh: 1 }, 4: { l: 1, m: 1, h: 1, vh: 1 }, 5: { l: 1, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.12: { 0: 6, 1: { l: 5, m: 3, h: 2, vh: 1 }, 2: { l: 4, m: 2, h: 1, vh: 1 }, 3: { l: 3, m: 1, h: 1, vh: 1 }, 4: { l: 2, m: 1, h: 1, vh: 1 }, 5: { l: 2, m: 1, h: 1, vh: 1 }, 6: { l: 1, m: 1, h: 1, vh: 1 } },
  0.14: { 0: 20, 1: { l: 17, m: 10, h: 6, vh: 1 }, 2: { l: 13, m: 6, h: 1, vh: 1 }, 3: { l: 10, m: 3, h: 1, vh: 1 }, 4: { l: 7, m: 2, h: 1, vh: 1 }, 5: { l: 5, m: 1, h: 1, vh: 1 }, 6: { l: 4, m: 1, h: 1, vh: 1 } },
  0.16: { 0: 90, 1: { l: 70, m: 50, h: 20, vh: 3 }, 2: { l: 50, m: 20, h: 4, vh: 1 }, 3: { l: 40, m: 10, h: 1, vh: 1 }, 4: { l: 30, m: 5, h: 1, vh: 1 }, 5: { l: 20, m: 2, h: 1, vh: 1 }, 6: { l: 14, m: 1, h: 1, vh: 1 } },
  0.18: { 0: 250, 1: { l: 200, m: 130, h: 70, vh: 7 }, 2: { l: 170, m: 70, h: 10, vh: 1 }, 3: { l: 130, m: 35, h: 3, vh: 1 }, 4: { l: 100, m: 15, h: 1, vh: 1 }, 5: { l: 70, m: 7, h: 1, vh: 1 }, 6: { l: 50, m: 3, h: 1, vh: 1 } },
  0.20: { 0: 400, 1: { l: 300, m: 210, h: 110, vh: 15 }, 2: { l: 290, m: 120, h: 20, vh: 1 }, 3: { l: 260, m: 60, h: 5, vh: 1 }, 4: { l: 180, m: 20, h: 2, vh: 1 }, 5: { l: 120, m: 10, h: 1, vh: 1 }, 6: { l: 100, m: 6, h: 1, vh: 1 } },
  0.25: { 0: 520, 1: { l: 450, m: 290, h: 150, vh: 20 }, 2: { l: 350, m: 170, h: 30, vh: 2 }, 3: { l: 240, m: 80, h: 6, vh: 1 }, 4: { l: 200, m: 30, h: 20, vh: 1 }, 5: { l: 150, m: 15, h: 2, vh: 1 }, 6: { l: 120, m: 7, h: 1, vh: 1 } },
  0.30: { 0: 650, 1: { l: 550, m: 400, h: 200, vh: 30 }, 2: { l: 400, m: 200, h: 40, vh: 4 }, 3: { l: 320, m: 110, h: 9, vh: 2 }, 4: { l: 240, m: 50, h: 4, vh: 2 }, 5: { l: 180, m: 25, h: 3, vh: 2 }, 6: { l: 150, m: 10, h: 2, vh: 2 } },
  0.35: { 0: 750, 1: { l: 650, m: 550, h: 300, vh: 80 }, 2: { l: 600, m: 300, h: 80, vh: 10 }, 3: { l: 540, m: 150, h: 20, vh: 5 }, 4: { l: 440, m: 90, h: 10, vh: 4 }, 5: { l: 350, m: 70, h: 6, vh: 4 }, 6: { l: 280, m: 40, h: 5, vh: 4 } },
  0.40: { 0: 900, 1: { l: 800, m: 700, h: 400, vh: 130 }, 2: { l: 700, m: 400, h: 120, vh: 30 }, 3: { l: 600, m: 200, h: 50, vh: 10 }, 4: { l: 500, m: 140, h: 20, vh: 8 }, 5: { l: 400, m: 110, h: 10, vh: 8 }, 6: { l: 350, m: 90, h: 9, vh: 8 } },
  0.45: { 0: 1000, 1: { l: 900, m: 810, h: 500, vh: 200 }, 2: { l: 800, m: 500, h: 160, vh: 40 }, 3: { l: 700, m: 270, h: 60, vh: 20 }, 4: { l: 600, m: 200, h: 30, vh: 15 }, 5: { l: 500, m: 160, h: 20, vh: 15 }, 6: { l: 400, m: 130, h: 20, vh: 15 } },
  0.50: { 0: 1200, 1: { l: 1100, m: 970, h: 600, vh: 270 }, 2: { l: 1000, m: 600, h: 200, vh: 60 }, 3: { l: 900, m: 360, h: 80, vh: 40 }, 4: { l: 800, m: 270, h: 50, vh: 40 }, 5: { l: 700, m: 210, h: 40, vh: 40 }, 6: { l: 600, m: 180, h: 40, vh: 40 } },
  0.55: { 0: 1350, 1: { l: 1200, m: 1130, h: 700, vh: 350 }, 2: { l: 1100, m: 750, h: 300, vh: 100 }, 3: { l: 1000, m: 500, h: 130, vh: 90 }, 4: { l: 900, m: 350, h: 100, vh: 90 }, 5: { l: 800, m: 260, h: 90, vh: 90 }, 6: { l: 700, m: 240, h: 90, vh: 90 } },
  0.60: { 0: 1500, 1: { l: 1400, m: 1250, h: 850, vh: 500 }, 2: { l: 1300, m: 900, h: 400, vh: 230 }, 3: { l: 1200, m: 620, h: 250, vh: 240 }, 4: { l: 1000, m: 450, h: 220, vh: 210 }, 5: { l: 900, m: 360, h: 210, vh: 210 }, 6: { l: 800, m: 300, h: 210, vh: 210 } },
  0.65: { 0: 1900, 1: { l: 1700, m: 1400, h: 1000, vh: 700 }, 2: { l: 1600, m: 1105, h: 670, vh: 530 }, 3: { l: 1300, m: 880, h: 550, vh: 500 }, 4: { l: 1200, m: 700, h: 530, vh: 500 }, 5: { l: 1100, m: 640, h: 500, vh: 500 }, 6: { l: 1000, m: 600, h: 500, vh: 500 } },
  0.75: { 0: 2300, 1: { l: 2100, m: 1700, h: 1200, vh: 1000 }, 2: { l: 2000, m: 1400, h: 1000, vh: 1000 }, 3: { l: 1800, m: 1100, h: 1000, vh: 1000 }, 4: { l: 1500, m: 1000, h: 1000, vh: 1000 }, 5: { l: 1300, m: 1000, h: 1000, vh: 1000 }, 6: { l: 1000, m: 1000, h: 1000, vh: 1000 } }
};

export const STRUCTURAL_MIN_THICKNESS = {
  "Piping (NPS 1/2)": 1.5,
  "Piping (NPS 3/4)": 1.7,
  "Piping (NPS 1)": 1.8,
  "Piping (NPS 1.5)": 1.8,
  "Piping (NPS 2)": 1.8,
  "Piping (NPS 3)": 2.0,
  "Piping (NPS 4)": 2.3,
  "Piping (NPS 6)": 2.8,
  "Piping (NPS 8)": 3.2,
  "Piping (NPS 10)": 3.6,
  "Piping (NPS 12)": 4.0,
  "Piping <= 1.5\"": 1.575,
  "Piping 2\" - 8\"": 2.388,
  "Piping >= 8\"": 3.175,
  "Piping": 3.175,
  "Piping Circuit": 3.175,
  "Process Piping": 3.175,
  "Pressure Vessel": 3.175,
  "Heat Exchanger Tube": 0.889,
  "Heat Exchanger Shell/Channel": 3.175,
  "Heat Exchanger Shell": 3.175,
  "Exchanger": 3.175,
  "Boiler": 3.175,
  "Column": 3.175,
  "Filter": 3.175,
  "Reactor": 3.175,
  "Storage Tank": 4.76,
  "Tank Bottom": 2.5,
  "Tank Shell": 2.5
};

export const EQUIPMENT_LEAK_AREAS = {
  "Piping <= 1.5\"": { hole_in: 0.44, area_in2: 0.15, area_cm2: 0.9677 },
  "Piping 2\" - 8\"": { hole_in: 0.75, area_in2: 0.442, area_cm2: 2.8516 },
  "Piping >= 8\"": { hole_in: 1.37, area_in2: 1.48, area_cm2: 9.5484 },
  "Piping (NPS 1/2)": { hole_in: 0.44, area_in2: 0.15, area_cm2: 0.9677 },
  "Piping (NPS 3/4)": { hole_in: 0.44, area_in2: 0.15, area_cm2: 0.9677 },
  "Piping (NPS 1)": { hole_in: 0.44, area_in2: 0.15, area_cm2: 0.9677 },
  "Piping (NPS 1.5)": { hole_in: 0.44, area_in2: 0.15, area_cm2: 0.9677 },
  "Piping (NPS 2)": { hole_in: 0.75, area_in2: 0.442, area_cm2: 2.8516 },
  "Piping (NPS 3)": { hole_in: 0.75, area_in2: 0.442, area_cm2: 2.8516 },
  "Piping (NPS 4)": { hole_in: 0.75, area_in2: 0.442, area_cm2: 2.8516 },
  "Piping (NPS 6)": { hole_in: 0.75, area_in2: 0.442, area_cm2: 2.8516 },
  "Piping (NPS 8)": { hole_in: 1.37, area_in2: 1.48, area_cm2: 9.5484 },
  "Piping (NPS 10)": { hole_in: 1.37, area_in2: 1.48, area_cm2: 9.5484 },
  "Piping (NPS 12)": { hole_in: 1.37, area_in2: 1.48, area_cm2: 9.5484 },
  "Pressure Vessel": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Process Piping": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Piping": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Piping Circuit": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Filter": { hole_in: 1.0, area_in2: 3.14, area_cm2: 20.258 },
  "Column": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Heat Exchanger Shell/Channel": { hole_in: 1.0, area_in2: 5.94, area_cm2: 38.3225 },
  "Heat Exchanger Shell": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Heat Exchanger Tube": { hole_in: 0.25, area_in2: 0.1, area_cm2: 0.6452 },
  "Exchanger": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Boiler": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Reactor": { hole_in: 1.0, area_in2: 19.64, area_cm2: 126.7094 },
  "Storage Tank": { hole_in: 1.0, area_in2: 314.2, area_cm2: 2027.093 },
  "Tank Shell": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 },
  "Tank Bottom": { hole_in: 1.0, area_in2: 8.3, area_cm2: 53.5483 }
};

export const FLUIDS_DATABASE = [
  { id: "H2", name: "Hydrogen (H2)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["h2", "hydrogen"], mw: 2, density_lb_ft3: 10.0, density_kg_m3: 160.18, k: 1.41, boilingPointF: -423, boilingPointC: -252.8, buoyancy: "B", pff: 0.8, hcf: 119950, p_igf: 1.0, isDense: false },
  { id: "C1", name: "Methane (C1)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c1", "methane", "fuel gas"], mw: 16, density_lb_ft3: 18.7, density_kg_m3: 299.55, k: 1.3, boilingPointF: -259, boilingPointC: -161.7, buoyancy: "B", pff: 5.6, hcf: 50029, p_igf: 0.5, isDense: false },
  { id: "C2", name: "Ethane (C2)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c2", "ethane"], mw: 29, density_lb_ft3: 22.5, density_kg_m3: 360.42, k: 1.22, boilingPointF: -141, boilingPointC: -96.1, buoyancy: "B", pff: 5.4, hcf: 47300, p_igf: 0.5, isDense: false },
  { id: "C3", name: "Propane (C3)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c3", "propane"], mw: 43, density_lb_ft3: 32.1, density_kg_m3: 514.19, k: 1.14, boilingPointF: -49, boilingPointC: -45.0, buoyancy: "D", pff: 5.6, hcf: 46000, p_igf: 0.5, isDense: true },
  { id: "C4", name: "Butane (C4)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c4", "butane", "isobutane"], mw: 57, density_lb_ft3: 37.0, density_kg_m3: 592.68, k: 1.1, boilingPointF: 26, boilingPointC: -3.3, buoyancy: "D", pff: 5.8, hcf: 45500, flashPointC: -60.0, autoignitionC: 287.8, p_igf: 0.25, isDense: true },
  { id: "C3-C4", name: "C3-C4 (LPG Blend)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["lpg", "c3-c4"], mw: 50, density_lb_ft3: 34.5, density_kg_m3: 553.4, k: 1.12, boilingPointF: -11.2, boilingPointC: -24.0, buoyancy: "D", pff: 5.7, hcf: 45750, flashPointC: -75.0, autoignitionC: 300.0, p_igf: 0.35, isDense: true },
  { id: "C5", name: "Pentane (C5)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c5", "pentane"], mw: 71, density_lb_ft3: 40.0, density_kg_m3: 640.74, k: 1.1, boilingPointF: 92, boilingPointC: 33.3, buoyancy: "D", pff: 6.0, hcf: 44600, flashPointC: -40.0, autoignitionC: 260.0, p_igf: 0.25, isDense: true },
  { id: "C6", name: "Hexane (C6)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c6", "hexane"], mw: 85, density_lb_ft3: 41.8, density_kg_m3: 669.57, k: 1.1, boilingPointF: 151, boilingPointC: 66.1, buoyancy: "D", pff: 6.0, hcf: 44400, flashPointC: -21.7, autoignitionC: 225.0, p_igf: 0.25, isDense: true },
  { id: "C7", name: "Heptane (C7)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c7", "heptane"], mw: 100, density_lb_ft3: 42.9, density_kg_m3: 687.19, k: 1.1, boilingPointF: 209, boilingPointC: 98.3, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: -3.9, autoignitionC: 203.9, p_igf: 0.25, isDense: true },
  { id: "C8", name: "Octane (C8)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c8", "octane"], mw: 114, density_lb_ft3: 44.1, density_kg_m3: 706.42, k: 1.1, boilingPointF: 258, boilingPointC: 125.6, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: 13.3, autoignitionC: 220.0, p_igf: 0.25, isDense: true },
  { id: "C5-C8", name: "C5-C8 (Gasoline / Light Naphtha)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["gasoline", "naphtha", "c5-c8"], mw: 100, density_lb_ft3: 42.9, density_kg_m3: 687.19, k: 1.1, boilingPointF: 209, boilingPointC: 98.3, buoyancy: "D", pff: 6.0, hcf: 44200, flashPointC: -4.0, autoignitionC: 220.0, p_igf: 0.25, isDense: true },
  { id: "C9-C12", name: "C9-C12 (Kerosene / Jet Fuel)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c9-c12", "kerosene", "jet fuel"], mw: 156, density_lb_ft3: 46.3, density_kg_m3: 741.66, k: 1.1, boilingPointF: 384, boilingPointC: 195.6, buoyancy: "D", pff: 6.0, hcf: 44800, flashPointC: 65.0, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C13-16", name: "C13-C16 (Diesel / Light Gasoil)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c13-c16", "c13-16", "diesel", "gasoil"], mw: 200, density_lb_ft3: 47.0, density_kg_m3: 752.87, k: 1.1, boilingPointF: 500, boilingPointC: 260.0, buoyancy: "D", pff: 6.0, hcf: 45900, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C17-25", name: "C17-C25 (Heavy Gasoil / AGO / VGO)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c17-c25", "c17-25", "heavy gasoil", "vgo"], mw: 300, density_lb_ft3: 48.0, density_kg_m3: 768.89, k: 1.1, boilingPointF: 700, boilingPointC: 371.1, buoyancy: "D", pff: 6.0, hcf: 41800, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "C25+", name: "C25+ (Resid / Heavy Fuel Oil / Bitumen)", category: "Flammable", group: "Hydrocarbons & Fuels", aliases: ["c25+", "resid", "residue", "bitumen", "fuel oil"], mw: 400, density_lb_ft3: 56.23, density_kg_m3: 900.7, k: 1.1, boilingPointF: 800, boilingPointC: 426.7, buoyancy: "D", pff: 6.0, hcf: 40600, flashPointC: 93.3, autoignitionC: 204.4, p_igf: 0.1, isDense: true },
  { id: "MEOH", name: "Methanol (MEOH)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["meoh", "methanol"], mw: 32, density_lb_ft3: 49.6, density_kg_m3: 794.52, k: 1.2, boilingPointF: 148, boilingPointC: 64.4, buoyancy: "D", pff: 5.0, hcf: 19900, flashPointC: 11.1, autoignitionC: 240.0, toxicEndpoint_mg_L: 0.3, p_igf: 0.1, isDense: false },
  { id: "ETOH", name: "Ethanol (ETOH)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["etoh", "ethanol"], mw: 46, density_lb_ft3: 49.2, density_kg_m3: 788.11, k: 1.13, boilingPointF: 173, boilingPointC: 78.3, buoyancy: "D", pff: 5.0, hcf: 26800, flashPointC: 13.0, autoignitionC: 362.8, toxicEndpoint_mg_L: 0.38, p_igf: 0.1, isDense: false },
  { id: "Amine", name: "Amine (MEA / DEA / MDEA)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["amine", "mea", "mdea"], mw: 200, density_lb_ft3: 66.35, density_kg_m3: 1062.83, k: 1.1, boilingPointF: 353, boilingPointC: 178.3, buoyancy: "D", pff: 5.0, hcf: 5000, toxicEndpoint_mg_L: 0.5, p_igf: 0.1, isDense: true },
  { id: "Glycol", name: "Ethylene Glycol (MEG / TEG)", category: "Flammable", group: "Petrochemicals & Aromatics", aliases: ["glycol", "meg"], mw: 62, density_lb_ft3: 69.5, density_kg_m3: 1113.2, k: 1.1, boilingPointF: 387, boilingPointC: 197.3, buoyancy: "D", pff: 5.0, hcf: 16700, p_igf: 0.1, isDense: true },
  { id: "H2S", name: "Hydrogen Sulfide (H2S)", category: "Toxic", group: "Toxic Chemicals", aliases: ["h2s", "sour gas"], mw: 34, density_lb_ft3: 6.64, density_kg_m3: 106.36, k: 1.32, boilingPointF: -76, boilingPointC: -60.0, buoyancy: "D", pff: 1.5, hcf: 15200, autoignitionC: 270.0, toxicEndpoint_mg_L: 0.042, p_igf: 0.05, isDense: true },
  { id: "Chlorine", name: "Chlorine (Cl2)", category: "Toxic", group: "Toxic Chemicals", aliases: ["chlorine", "cl2"], mw: 71, density_lb_ft3: 88.0, density_kg_m3: 1409.63, k: 1.32, boilingPointF: -30, boilingPointC: -34.4, buoyancy: "D", pff: 0.0, hcf: 0, toxicEndpoint_mg_L: 0.0087, p_igf: 0.0, isDense: true },
  { id: "NH3", name: "Ammonia (NH3)", category: "Toxic", group: "Toxic Chemicals", aliases: ["nh3", "ammonia"], mw: 17, density_lb_ft3: 5.15, density_kg_m3: 82.49, k: 1.31, boilingPointF: -28, boilingPointC: -33.3, buoyancy: "B", pff: 1.2, hcf: 18600, autoignitionC: 648.9, toxicEndpoint_mg_L: 0.14, p_igf: 0.05, isDense: false },
  { id: "CO", name: "Carbon Monoxide (CO)", category: "Toxic", group: "Toxic Chemicals", aliases: ["co", "carbon monoxide"], mw: 28, density_lb_ft3: 50.79, density_kg_m3: 813.58, k: 1.4, boilingPointF: -312, boilingPointC: -191.1, buoyancy: "B", pff: 0.8, hcf: 10100, autoignitionC: 608.9, toxicEndpoint_mg_L: 0.033, p_igf: 0.05, isDense: false },
  { id: "H2O", name: "Water (H2O)", category: "Inert", group: "Inerts & Utilities", aliases: ["water", "h2o"], mw: 18, density_lb_ft3: 62.4, density_kg_m3: 999.55, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, buoyancy: "B", pff: 0.0, hcf: 0, p_igf: 0.0, isDense: false },
  { id: "Steam", name: "Steam", category: "Reactive", group: "Inerts & Utilities", aliases: ["steam"], mw: 18, density_lb_ft3: 62.4, density_kg_m3: 999.55, k: 1.1, boilingPointF: 212, boilingPointC: 100.0, buoyancy: "B", pff: 1.0, hcf: 0, p_igf: 0.0, isDense: false },
  { id: "AIR", name: "Air / Nitrogen (N2)", category: "Inert", group: "Inerts & Utilities", aliases: ["air", "nitrogen", "n2"], mw: 29, density_lb_ft3: 15.0, density_kg_m3: 240.28, k: 1.4, boilingPointF: -200, boilingPointC: -128.9, buoyancy: "B", pff: 0.0, hcf: 0, p_igf: 0.0, isDense: false }
];

function getFluid(query) {
  if (!query || typeof query !== "string" || !query.trim()) return null;
  const q = query.toLowerCase().trim();
  const exact = FLUIDS_DATABASE.find(item => item.id.toLowerCase() === q || item.name.toLowerCase() === q);
  if (exact) return exact;
  const alias = FLUIDS_DATABASE.find(item => item.aliases?.some(a => a.toLowerCase() === q));
  if (alias) return alias;
  const partial = FLUIDS_DATABASE.find(item => item.name.toLowerCase().includes(q) || q.includes(item.id.toLowerCase()));
  if (partial) return partial;
  if (q.includes("c25") || q.includes("resid")) return FLUIDS_DATABASE.find(f => f.id === "C25+");
  if (q.includes("c4") || q.includes("butane")) return FLUIDS_DATABASE.find(f => f.id === "C4");
  if (q.includes("c3") || q.includes("propane")) return FLUIDS_DATABASE.find(f => f.id === "C3");
  if (q.includes("diesel")) return FLUIDS_DATABASE.find(f => f.id === "C13-16");
  if (q.includes("gasoline") || q.includes("naphtha")) return FLUIDS_DATABASE.find(f => f.id === "C5-C8");
  return null;
}

export const PRIORITY_NUMBER_MATRIX = {
  1: { A: 1, B: 2, C: 4, D: 7, E: 11 },
  2: { A: 3, B: 6, C: 8, D: 13, E: 16 },
  3: { A: 5, B: 9, C: 14, D: 17, E: 20 },
  4: { A: 10, B: 15, C: 18, D: 21, E: 23 },
  5: { A: 12, B: 19, C: 22, D: 24, E: 25 }
};

export const RISK_LEVEL_MATRIX = {
  1: { A: "High", B: "High", C: "High", D: "Medium-High", E: "Medium-High" },
  2: { A: "High", B: "Medium-High", C: "Medium-High", D: "Medium", E: "Medium" },
  3: { A: "High", B: "Medium-High", C: "Medium", D: "Medium", E: "Low" },
  4: { A: "Medium-High", B: "Medium", C: "Medium", D: "Medium", E: "Low" },
  5: { A: "Medium-High", B: "Medium", C: "Low", D: "Low", E: "Low" }
};

export function getARTDamageFactor(fwl, inspections = 0, conf = "Medium") {
  const keys = Object.keys(ART_TABLE).map(parseFloat).sort((a, b) => a - b);
  const cappedFWL = Math.max(0.02, Math.min(fwl || 0, 0.75));
  const closestKey = keys.find((k) => k >= cappedFWL) ?? keys[keys.length - 1];
  const row = ART_TABLE[closestKey] || ART_TABLE[0.02];
  const inspCount = Math.max(0, Math.min(parseInt(inspections) || 0, 6));
  if (inspCount === 0) return row[0];
  const rawConf = String(conf || "Medium").toLowerCase();
  const confKey = rawConf.includes("very high") || rawConf === "vh" ? "vh" : rawConf.startsWith("h") ? "h" : rawConf.startsWith("m") ? "m" : "l";
  return row[inspCount]?.[confKey] ?? 1;
}

export function damageFactorToProbability(df) {
  if (df >= 1000) return 1;
  if (df >= 100) return 2;
  if (df >= 10) return 3;
  if (df >= 1) return 4;
  return 5;
}

export function getBasicExternalCR_mmyr(tempF) {
  const pts = [
    { t: 0, cr: 0 },
    { t: 100, cr: 0.0254 },
    { t: 150, cr: 0.127 },
    { t: 200, cr: 0.254 },
    { t: 300, cr: 0.356 }
  ];
  if (tempF <= pts[0].t) return pts[0].cr;
  if (tempF >= pts[pts.length - 1].t) return pts[pts.length - 1].cr;
  for (let i = 0; i < pts.length - 1; i++) {
    if (tempF >= pts[i].t && tempF <= pts[i + 1].t) {
      const frac = (tempF - pts[i].t) / (pts[i + 1].t - pts[i].t);
      return pts[i].cr + frac * (pts[i + 1].cr - pts[i].cr);
    }
  }
  return pts[pts.length - 1].cr;
}

export function calculateInternalThinning(inputs = {}) {
  const eqType = inputs.equipmentType || "Pressure Vessel";
  const tInit_mm = parseFloat(inputs.tInit_mm) || 14.0;
  const diameter_mm = Math.max(1, parseFloat(inputs.diameter_mm) || 1000);
  const designPressure_bar = Math.max(0, parseFloat(inputs.designPressure_bar) || 0);
  const allowableStress_MPa = Math.max(1, parseFloat(inputs.allowableStress_MPa) || 137.9);
  const corrosionRate_mm_yr = parseFloat(inputs.corrosionRate_mm_yr ?? inputs.estimatedCorrosionRate_mm_yr) || 0.025;
  const numberOfInspections = parseInt(inputs.numberOfInspections) || 0;
  const inspectionConfidence = inputs.inspectionConfidence || "Medium";

  let yearsInService = parseFloat(inputs.yearsInService) || 0;
  if (inputs.dateInService) {
    const dStart = new Date(inputs.dateInService);
    const startYear = dStart.getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(startYear) && currentYear >= startYear) {
      yearsInService = currentYear - startYear;
    }
  }

  const structuralMin_mm = STRUCTURAL_MIN_THICKNESS[eqType] ?? 3.175;
  const P_MPa = designPressure_bar * 0.1;
  const S_MPa = allowableStress_MPa;
  const D_mm = diameter_mm;

  let pressureMin_mm = 0;
  if (eqType.startsWith("Piping")) {
    const denom = 2 * (S_MPa + 0.4 * P_MPa);
    pressureMin_mm = denom > 0 ? (P_MPa * D_mm) / denom : 0;
  } else {
    const denom = 2 * (S_MPa - 0.6 * P_MPa);
    pressureMin_mm = denom > 0 ? (P_MPa * D_mm) / denom : 0;
  }

  const tReq_mm = inputs.specifiedTmin_mm > 0 ? inputs.specifiedTmin_mm : Math.max(structuralMin_mm, pressureMin_mm);
  const estimatedWallLoss_mm = Number((corrosionRate_mm_yr * yearsInService).toFixed(3));
  const estimatedRemainingWall_mm = Math.max(0, Number((tInit_mm - estimatedWallLoss_mm).toFixed(3)));
  const fractionalWallLoss_art = tInit_mm > 0 ? Number((estimatedWallLoss_mm / tInit_mm).toFixed(3)) : 0;
  const wallRatio = tReq_mm > 0 ? Number((estimatedRemainingWall_mm / tReq_mm).toFixed(2)) : 1.0;

  const halfLifeRemainingAllowance = estimatedRemainingWall_mm - tReq_mm;
  const estimatedHalfLife_years = corrosionRate_mm_yr > 0 && halfLifeRemainingAllowance > 0
    ? Number((halfLifeRemainingAllowance / (2 * corrosionRate_mm_yr)).toFixed(2))
    : 0;

  const damageFactor = getARTDamageFactor(fractionalWallLoss_art, numberOfInspections, inspectionConfidence);
  const baseProbability = damageFactorToProbability(damageFactor);

  let finalProbability = baseProbability;
  let creditApplied = false;
  const cr_mpy = (corrosionRate_mm_yr / 25.4) * 1000;
  if (wallRatio > 1.5 && cr_mpy < 5.0 && baseProbability > 1) {
    finalProbability = Math.min(5, baseProbability + 1);
    creditApplied = true;
  }

  const failureFrequency_per_year = 3.06e-5 * Math.max(1, damageFactor);

  return {
    structuralMin_mm,
    pressureMin_mm,
    tReq_mm,
    estimatedWallLoss_mm,
    estimatedRemainingWall_mm,
    fractionalWallLoss_art,
    wallRatio,
    estimatedHalfLife_years,
    damageFactor,
    baseProbability,
    finalProbability,
    creditApplied,
    yearsInService_val: yearsInService,
    adjustedICDF: damageFactor,
    failureFrequency_per_year
  };
}

export function calculateExternalCUI(inputs = {}, tInit_mm = 14.0, tReq_mm = 10.8, yearsInService = 20) {
  const operatingTemp_C = parseFloat(inputs.operatingTemp_C) || 40;
  const isInsulated = !!inputs.isInsulated;
  const materialIsCarbonSteel = inputs.materialIsCarbonSteel !== false;
  const T_F = (operatingTemp_C * 9 / 5) + 32;

  let baseCR_mmyr = 0;
  if (isInsulated && materialIsCarbonSteel) {
    baseCR_mmyr = getBasicExternalCR_mmyr(T_F);
  }

  const humidityFactor = inputs.humidityLevel === "High" ? 1.0 : inputs.humidityLevel === "Medium" ? 0.5 : 0.25;
  const basicCR_mm_yr = baseCR_mmyr * humidityFactor;

  let insTypeFactor = 1.0;
  if (inputs.insulationType === "Asbestos") insTypeFactor = 1.5;
  else if (inputs.insulationType?.includes("Calcium Silicate (Not Cl Free)")) insTypeFactor = 1.0;
  else if (inputs.insulationType?.includes("Calcium Silicate")) insTypeFactor = 0.75;
  else if (inputs.insulationType?.includes("Mineral Wool") || inputs.insulationType?.includes("Fiberglass")) insTypeFactor = 0.75;
  else if (inputs.insulationType?.includes("Foam")) insTypeFactor = 0.5;

  let insCondFactor = 1.0;
  if (inputs.insulationCondition === "Poor") insCondFactor = 1.5;
  else if (inputs.insulationCondition === "Good") insCondFactor = 0.5;

  const coolingTowerFactor = inputs.nearCoolingTower ? 2.0 : 1.0;

  let coatingLife_years = 1;
  const cType = inputs.coatingType || "Average";
  if (cType.startsWith("None")) coatingLife_years = 1;
  else if (cType.startsWith("Average") || cType.startsWith("Ave")) coatingLife_years = 5;
  else if (cType.startsWith("Best")) coatingLife_years = 10;

  let yearsVal = parseFloat(inputs.yearsInService) || yearsInService;
  if (inputs.dateInService) {
    const dStart = new Date(inputs.dateInService);
    const sYear = dStart.getFullYear();
    if (!isNaN(sYear)) yearsVal = Math.max(0, new Date().getFullYear() - sYear);
  }

  const externalAge_years = Math.max(0, Number((yearsVal - coatingLife_years).toFixed(2)));
  const basicCR = inputs.estimatedRate || inputs.estimatedCorrosionRate_mm_yr || 0.076;
  const predictedCR_mm_yr = Number((basicCR * humidityFactor * insTypeFactor * insCondFactor * coolingTowerFactor).toFixed(4));

  const tInitEff = inputs.nominalThickness_mm || tInit_mm;
  const wallLoss_mm = Number((predictedCR_mm_yr * externalAge_years).toFixed(4));
  const fractionalWallLoss = tInitEff > 0 ? Number((wallLoss_mm / tInitEff).toFixed(3)) : 0;
  const remainingWall_mm = Math.max(0, Number((tInitEff - wallLoss_mm).toFixed(4)));
  const governingTmin_mm = inputs.specifiedTmin_mm > 0 ? inputs.specifiedTmin_mm : tReq_mm;
  const wallRatio = governingTmin_mm > 0 ? Number((remainingWall_mm / governingTmin_mm).toFixed(2)) : 1.0;

  const halfLifeRemainingAllowance = remainingWall_mm - governingTmin_mm;
  const estimatedHalfLife_years = predictedCR_mm_yr > 0 && halfLifeRemainingAllowance > 0
    ? Number((halfLifeRemainingAllowance / (2 * predictedCR_mm_yr)).toFixed(2))
    : 0;

  const damageFactor = inputs.susceptibleToCUI === false ? 1 : getARTDamageFactor(fractionalWallLoss, inputs.numberOfInspections || 0, inputs.inspectionConfidence || "Medium");
  const baseProbability = damageFactorToProbability(damageFactor);

  let finalProbability = baseProbability;
  let creditApplied = false;
  const cr_mpy_ext = (predictedCR_mm_yr / 25.4) * 1000;
  if (wallRatio > 1.5 && cr_mpy_ext < 5.0 && baseProbability > 1) {
    finalProbability = Math.min(5, baseProbability + 1);
    creditApplied = true;
  }

  const failureFrequency_per_year = 3.06e-5 * Math.max(1, damageFactor);

  return {
    basicCR_mm_yr,
    predictedCR_mm_yr,
    coatingLife_years,
    externalAge_years,
    wallLoss_mm,
    fractionalWallLoss,
    wallRatio,
    damageFactor,
    baseProbability,
    finalProbability,
    creditApplied,
    yearsInService_val: yearsVal,
    areaHumidityFactor: humidityFactor,
    insulationConditionFactor: insCondFactor,
    insulationTypeFactor: insTypeFactor,
    coatingFactor: coatingLife_years,
    corrosionFactor: coolingTowerFactor,
    estimatedHalfLife_years,
    failureFrequency_per_year
  };
}

export function calculateConsequenceOfFailure(inputs = {}) {
  const fluid = getFluid(inputs.fluidId || inputs.processFluid);
  if (!fluid || typeof fluid.mw !== "number" || typeof fluid.k !== "number" || typeof fluid.density_lb_ft3 !== "number") {
    throw new Error("Valid fluid ID and properties (molecular weight, specific heat ratio, density) are required (no default fallbacks permitted).");
  }

  if (inputs.operatingPressure_bar === undefined || inputs.operatingPressure_bar === null || isNaN(parseFloat(inputs.operatingPressure_bar))) {
    throw new Error("operatingPressure_bar is required (no default fallbacks permitted).");
  }
  if (inputs.operatingTemp_C === undefined || inputs.operatingTemp_C === null || isNaN(parseFloat(inputs.operatingTemp_C))) {
    throw new Error("operatingTemp_C is required (no default fallbacks permitted).");
  }
  if (inputs.inventory_kg === undefined || inputs.inventory_kg === null || isNaN(parseFloat(inputs.inventory_kg)) || parseFloat(inputs.inventory_kg) <= 0) {
    throw new Error("Valid positive inventory_kg is required (no default fallbacks permitted).");
  }
  if (!inputs.equipmentType || !EQUIPMENT_LEAK_AREAS[inputs.equipmentType]) {
    throw new Error(`Valid equipmentType is required from supported types: ${Object.keys(EQUIPMENT_LEAK_AREAS).join(", ")}`);
  }
  if (inputs.detectionTime_min === undefined || inputs.detectionTime_min === null || isNaN(parseFloat(inputs.detectionTime_min))) {
    throw new Error("detectionTime_min is required (no default fallbacks permitted).");
  }
  if (inputs.isolationTime_min === undefined || inputs.isolationTime_min === null || isNaN(parseFloat(inputs.isolationTime_min))) {
    throw new Error("isolationTime_min is required (no default fallbacks permitted).");
  }

  const operatingPressure_bar = Math.max(0, parseFloat(inputs.operatingPressure_bar));
  const operatingTemp_C = parseFloat(inputs.operatingTemp_C);
  const inventory_kg = parseFloat(inputs.inventory_kg);
  const equipmentType = inputs.equipmentType;
  const detectionTime_min = parseFloat(inputs.detectionTime_min);
  const isolationTime_min = parseFloat(inputs.isolationTime_min);

  let initialPhase = inputs.initialFluidPhase || (operatingTemp_C >= fluid.boilingPointC ? "Gas" : "Liquid");
  const isAtmosphericGas = fluid.boilingPointC <= 26.7;
  const ambientPhase = isAtmosphericGas ? "Gas" : "Liquid";
  let finalPhase = inputs.finalFluidPhase || (initialPhase === "Liquid" && ambientPhase === "Gas" && fluid.boilingPointC <= 26.7 ? "Gas" : ambientPhase === "Liquid" ? "Liquid" : "Gas");

  const leakArea_cm2 = EQUIPMENT_LEAK_AREAS[equipmentType]?.area_cm2 ?? 53.5483;
  const leakArea_in2 = leakArea_cm2 / 6.4516;

  const P_atm_psia = 14.7;
  const P_oper_psig = operatingPressure_bar * 14.5038;
  const P_abs_psia = P_oper_psig + P_atm_psia;
  const T_R = (operatingTemp_C + 273.15) * 1.8;
  const molecularWeight = fluid.mw;
  const k = fluid.k;
  const density_lb_ft3 = fluid.density_lb_ft3;

  let dischargeRate_lb_min = 0;
  let flowRegime = "Liquid";

  if (initialPhase === "Liquid") {
    const Cd_liquid = 0.6;
    if (P_oper_psig > 0 && density_lb_ft3 > 0 && leakArea_in2 > 0) {
      dischargeRate_lb_min = 60 * Cd_liquid * leakArea_in2 * Math.sqrt(2 * density_lb_ft3 * P_oper_psig * (32.2 / 144));
    }
  } else {
    const Cd_gas = 0.9;
    const P_trans_psia = P_atm_psia * Math.pow((k + 1) / 2, k / (k - 1));
    if (P_abs_psia > P_trans_psia) {
      flowRegime = "Sonic Gas (Choked)";
      const factor = Math.sqrt((k * molecularWeight * (32.2 / 144)) / (10.73 * T_R)) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
      dischargeRate_lb_min = 60 * Cd_gas * leakArea_in2 * P_abs_psia * factor;
    } else {
      flowRegime = "Subsonic Gas";
      const pRatio = P_atm_psia / P_abs_psia;
      const factor = Math.sqrt(((molecularWeight * (32.2 / 144)) / (10.73 * T_R)) * (2 * k / (k - 1)) * Math.pow(pRatio, 2 / k) * Math.max(0, 1 - Math.pow(pRatio, (k - 1) / k)));
      dischargeRate_lb_min = 60 * Cd_gas * leakArea_in2 * P_abs_psia * factor;
    }
  }

  dischargeRate_lb_min = Math.max(0, dischargeRate_lb_min);
  const dischargeRate_kg_min = dischargeRate_lb_min * 0.45359237;
  const dischargeRate_g_min = dischargeRate_kg_min * 1000;

  const detIsolTime_min = Math.max(0.01, detectionTime_min + isolationTime_min);
  const inventory_lb = inventory_kg * 2.20462262;
  const deinventoryTime_min = dischargeRate_lb_min > 0 ? inventory_lb / dischargeRate_lb_min : detIsolTime_min;
  const releaseDuration_min = Math.min(detIsolTime_min, deinventoryTime_min);
  const leakQuantity_lb = Math.min(inventory_lb, dischargeRate_lb_min * releaseDuration_min);
  const leakQuantity_kg = leakQuantity_lb * 0.45359237;

  const T_oper_F = operatingTemp_C * 1.8 + 32;
  const T_flash_F = fluid.flashPointC !== undefined ? fluid.flashPointC * 1.8 + 32 : (fluid.boilingPointF ?? -100);
  const T_auto_F = fluid.autoignitionC !== undefined ? fluid.autoignitionC * 1.8 + 32 : 1000;
  const P_IGF = fluid.p_igf ?? (finalPhase === "Gas" ? 0.5 : 0.1);

  let probabilityOfIgnition = P_IGF;
  if (inputs.probabilityOfIgnitionOverride !== undefined && inputs.probabilityOfIgnitionOverride >= 0) {
    probabilityOfIgnition = inputs.probabilityOfIgnitionOverride;
  } else if (T_oper_F <= T_flash_F) {
    probabilityOfIgnition = P_IGF;
  } else if (T_oper_F >= T_auto_F) {
    probabilityOfIgnition = 1.0;
  } else {
    const deltaT = T_auto_F - T_flash_F;
    const tempRatio = deltaT > 0 ? (T_oper_F - T_flash_F) / deltaT : 0.5;
    probabilityOfIgnition = P_IGF + tempRatio * (1 - P_IGF);
  }
  probabilityOfIgnition = Math.min(1.0, Math.max(0.01, +probabilityOfIgnition.toFixed(3)));

  let poolArea_ft2 = 0;
  let poolArea_m2 = 0;
  if (density_lb_ft3 > 0 && leakQuantity_lb > 0) {
    poolArea_ft2 = leakQuantity_lb / (0.0325 * density_lb_ft3);
    poolArea_m2 = poolArea_ft2 / 10.7639104;
  }

  let flammableDistance_ft = 0;
  let flammableDistance_m = 0;
  let flammableAffectedArea_ft2 = 0;
  let flammableAffectedArea_m2 = 0;

  if (fluid.category === "Flammable" && leakQuantity_lb > 0) {
    const PFF = fluid.pff || 6.0;
    const HCf = fluid.hcf || 45500;
    const HCTNT = 4680;

    if (finalPhase === "Liquid") {
      flammableDistance_ft = PFF * Math.sqrt(poolArea_ft2);
      flammableDistance_m = flammableDistance_ft / 3.28084;
    } else {
      const Wf_kg = leakQuantity_lb / 2.2;
      const tntEquivalent_kg = 0.1 * Wf_kg * (HCf / HCTNT);
      flammableDistance_m = tntEquivalent_kg > 0 ? 17 * Math.pow(tntEquivalent_kg, 1 / 3) : 0;
      flammableDistance_ft = flammableDistance_m * 3.2736;
    }
    flammableAffectedArea_ft2 = probabilityOfIgnition * Math.PI * Math.pow(flammableDistance_ft, 2);
    flammableAffectedArea_m2 = flammableAffectedArea_ft2 / 10.7639104;
  }

  let flammableCategory = "E";
  if (flammableAffectedArea_ft2 > 5000000) flammableCategory = "A";
  else if (flammableAffectedArea_ft2 >= 500000) flammableCategory = "B";
  else if (flammableAffectedArea_ft2 >= 50000) flammableCategory = "C";
  else if (flammableAffectedArea_ft2 >= 5000) flammableCategory = "D";

  let toxicCategory = "N/A";
  let toxicMixedReleaseRate_g_min = 0;
  if (inputs.toxicMixture || fluid.category === "Toxic" || inputs.percentToxic > 0) {
    const toxicFraction = (parseFloat(inputs.percentToxic) || 100) / 100;
    toxicMixedReleaseRate_g_min = dischargeRate_g_min * toxicFraction;
    toxicCategory = "B";
  }

  const lostProdCat = inputs.lostProductionCategory || "B";
  const productionLossCategory = lostProdCat;
  const environmentalCategory = "E";

  const catRank = { A: 1, B: 2, C: 3, D: 4, E: 5 };
  let governingCategory = "E";
  let governingConsequenceType = "Flammable Event";

  const driver = inputs.consequenceDriver || "Automatic";
  if (driver === "Production Loss") {
    governingCategory = productionLossCategory;
    governingConsequenceType = "Production Loss";
  } else if (driver === "Flammable") {
    governingCategory = flammableCategory;
    governingConsequenceType = "Flammable Event";
  } else {
    let bestRank = 6;
    if (flammableCategory && catRank[flammableCategory] < bestRank) {
      bestRank = catRank[flammableCategory];
      governingCategory = flammableCategory;
      governingConsequenceType = "Flammable Event";
    }
    if (toxicCategory && toxicCategory !== "N/A" && catRank[toxicCategory] < bestRank) {
      bestRank = catRank[toxicCategory];
      governingCategory = toxicCategory;
      governingConsequenceType = "Toxic Dispersion";
    }
    if (catRank[productionLossCategory] < bestRank) {
      bestRank = catRank[productionLossCategory];
      governingCategory = productionLossCategory;
      governingConsequenceType = "Production Loss";
    }
  }

  return {
    initialPhase,
    finalPhase,
    leakArea_cm2,
    leakArea_in2,
    flowRegime,
    dischargeRate_kg_min,
    dischargeRate_g_min,
    dischargeRate_lb_min,
    deinventoryTime_min,
    releaseDuration_min,
    leakQuantity_kg,
    leakQuantity_lb,
    probabilityOfIgnition,
    flammableDistance_m,
    flammableDistance_ft,
    flammableAffectedArea_m2,
    flammableAffectedArea_ft2,
    flammableCategory,
    poolArea_m2,
    poolArea_ft2,
    toxicMixedReleaseRate_g_min,
    toxicCategory,
    environmentalCategory,
    productionLossCategory,
    governingCategory,
    governingConsequenceType
  };
}

export function calculateOverallRBI(internalInputs, externalInputs, consequenceInputs) {
  const internalPoF = calculateInternalThinning(internalInputs);
  const externalPoF = calculateExternalCUI(externalInputs, internalInputs?.tInit_mm, internalPoF?.tReq_mm, internalInputs?.yearsInService);

  const combinedPoF = Math.min(internalPoF.finalProbability, externalPoF.finalProbability);
  const governingPoFMechanism = internalPoF.finalProbability <= externalPoF.finalProbability ? "Internal Thinning" : "External CUI";

  const consequence = calculateConsequenceOfFailure(consequenceInputs);
  const combinedCoF = consequence.governingCategory;

  const riskLevel = RISK_LEVEL_MATRIX[combinedPoF]?.[combinedCoF] || "Medium";
  const priorityNumber = PRIORITY_NUMBER_MATRIX[combinedPoF]?.[combinedCoF] || 15;

  return {
    internalPoF,
    externalPoF,
    combinedPoF,
    governingPoFMechanism,
    consequence,
    combinedCoF,
    riskLevel,
    priorityNumber
  };
}

// ============================================================================
// 1B. API 581 LEVEL 2 QUANTITATIVE COF ENGINE
// ============================================================================

const R_u = 8.314462618; // J/mol-K
const BAR_TO_PA = 1e5;

export const COF_FLUID_PROPERTIES = {
  "User Fill": { mw: null, density: null, nbp: null, ait: null },
  "C1–C2": { mw: 23, density: 250.512, nbp: -125, ait: 558 },
  "C3–C4": { mw: 51, density: 538.379, nbp: -21, ait: 368 },
  "C5": { mw: 72, density: 625.199, nbp: 36, ait: 284 },
  "C6–C8": { mw: 100, density: 684.018, nbp: 99, ait: 223 },
  "C9–C12": { mw: 149, density: 734.012, nbp: 184, ait: 206 },
  "C13–C16": { mw: 205, density: 764.527, nbp: 261, ait: 202 },
  "C17–C25": { mw: 280, density: 775.019, nbp: 344, ait: 193 },
  "C25+": { mw: 422, density: 900.626, nbp: 500, ait: 184 },
  "Pyrophoric": { mw: 149, density: 734.012, nbp: 184, ait: 202 },
  "Aromatic": { mw: 104, density: 683.986, nbp: 145, ait: 490 },
  "Styrene": { mw: 104, density: 683.988, nbp: 145, ait: 490 },
  "Water": { mw: 18, density: 997.947, nbp: 100, ait: null },
  "Steam": { mw: 18, density: 997.947, nbp: 100, ait: null },
  "AcidLP": { mw: 18, density: 997.947, nbp: 100, ait: null },
  "AcidMP": { mw: 18, density: 997.947, nbp: 100, ait: null },
  "AcidHP": { mw: 18, density: 997.947, nbp: 100, ait: null },
  "Methanol": { mw: 32, density: 800.920, nbp: 65, ait: 484 },
  "Ammonia": { mw: 17.03, density: 0.769, nbp: -33.34, ait: 651 },
  "H2": { mw: 2, density: 71.010, nbp: -253, ait: 500 },
  "H2S": { mw: 34, density: 963.029, nbp: -60, ait: 260 },
  "HF": { mw: 20, density: 967.031, nbp: 20, ait: 770 },
  "HCl": { mw: 36, density: 1185.362, nbp: -85, ait: null },
  "CO": { mw: 28, density: 800.920, nbp: -191, ait: 609 },
  "DEE": { mw: 74, density: 720.828, nbp: 35, ait: 160 },
  "HNO3": { mw: 63, density: 1521.749, nbp: 121, ait: null },
  "AlCl3": { mw: 133.5, density: 2434.788, nbp: 180, ait: 558 },
  "NO2": { mw: 90, density: 929.088, nbp: 135, ait: null },
  "Phosgene": { mw: 98, density: 1377.583, nbp: 83, ait: null },
  "TDI": { mw: 174, density: 1217.399, nbp: 251, ait: 620 }
};

export const COF_FLUID_LABELS = {
  "C1–C2": "C₁–C₂",
  "C3–C4": "C₃–C₄",
  "C5": "C₅",
  "C6–C8": "C₆–C₈",
  "C9–C12": "C₉–C₁₂",
  "C13–C16": "C₁₃–C₁₆",
  "C17–C25": "C₁₇–C₂₅",
  "C25+": "C₂₅+",
  "H2": "H₂",
  "H2S": "H₂S",
  "HF": "HF",
  "HCl": "HCl",
  "CO": "CO",
  "NO2": "NO₂",
  "AlCl3": "AlCl₃"
};

export const COF_LIQUID_FLUIDS = [
  "User Fill", "C5", "C6–C8", "C9–C12", "C13–C16", "C17–C25", "C25+",
  "Pyrophoric", "Aromatic", "Styrene", "Water", "AcidLP", "AcidMP", "AcidHP",
  "Methanol", "HNO3", "AlCl3", "TDI"
];

export const COF_GAS_FLUIDS = [
  "User Fill", "C1–C2", "C3–C4", "Steam", "Ammonia", "H2", "H2S", "HF",
  "HCl", "CO", "DEE", "NO2", "Phosgene"
];

function clamp01(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function powOrZero(a, b, x) {
  const na = Number(a), nb = Number(b), nx = Number(x);
  return (Number.isFinite(na) && Number.isFinite(nb) && Number.isFinite(nx) && na > 0 && nx > 0)
    ? na * Math.pow(nx, nb)
    : 0;
}

function fmtCOF(n, d = 3) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString(undefined, { maximumFractionDigits: d }) : "-";
}

function liquidReleaseRate(A, Cd, Kv, rho, Ps, Patm) {
  const dP = Math.max(Ps - Patm, 0);
  if (!(A > 0 && Cd > 0 && rho > 0 && dP > 0)) return 0;
  return Cd * (Kv || 1) * rho * A * Math.sqrt((2 * dP) / rho);
}

function gasReleaseRate(A, Cd, Ps, Patm, Ts, k, MW) {
  if (!(A > 0 && Cd > 0 && Ps > Patm && Ts > 0 && k > 1 && MW > 0)) {
    return { massRate: 0, choked: false };
  }
  const R_spec = R_u / (MW / 1000);
  const Ptrans = Patm * Math.pow(2 / (k + 1), k / (k - 1));
  if (Ps > Ptrans) {
    const term = Math.sqrt(k / (R_spec * Ts)) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
    return { massRate: Cd * A * Ps * term, choked: true };
  } else {
    const pr = Patm / Ps;
    const bracket = Math.pow(pr, 2 / k) - Math.pow(pr, (k + 1) / k);
    if (bracket <= 0) return { massRate: 0, choked: false };
    const term = Math.sqrt(((2 * k) / (R_spec * Ts * (k - 1))) * bracket);
    return { massRate: Cd * A * Ps * term, choked: false };
  }
}

function getLeakDurationLimit(det, iso, dn_mm) {
  const d = Number(dn_mm) || 0;
  if (det === "A" && iso === "A") { if (d <= 6.4) return 1200; if (d <= 25) return 600; if (d <= 102) return 300; return 3600; }
  if (det === "A" && iso === "B") { if (d <= 6.4) return 1800; if (d <= 25) return 1200; if (d <= 102) return 600; return 3600; }
  if (det === "A" && iso === "C") { if (d <= 6.4) return 2400; if (d <= 25) return 1800; if (d <= 102) return 900; return 3600; }
  if (det === "B" && iso === "B") { if (d <= 6.4) return 2700; if (d <= 25) return 2100; if (d <= 102) return 1200; return 3600; }
  if (det === "B" && iso === "C") { if (d <= 6.4) return 3000; if (d <= 25) return 2400; if (d <= 102) return 1800; return 3600; }
  if (det === "C") { if (d <= 6.4) return 3600; if (d <= 25) return 2700; if (d <= 102) return 2400; return 3600; }
  return 3600;
}

export function formatOutputCOF(o) {
  const releaseTypeStr = o.isInstant ? "Instantaneous" : "Continuous";
  return [
    `Model: ${o.modelUsed}`,
    `Release Type: ${releaseTypeStr}`,
    `dn = ${fmtCOF(o.dn_m, 6)} m, An = ${fmtCOF(o.An, 6)} m²`,
    `Ps = ${fmtCOF(o.Ps / 1e5, 3)} bar, Patm = ${fmtCOF(o.Patm / 1e5, 3)} bar`,
    `Ts = ${fmtCOF(o.Ts_K, 1)} K, Tamb = ${fmtCOF(o.Tamb_K, 1)} K`,
    ``,
    `Release rate Wn = ${fmtCOF(o.Wn, 4)} kg/s`,
    `Duration = ${fmtCOF(o.duration_s, 2)} s`,
    `Released mass = ${fmtCOF(o.releasedMass, 2)} kg`,
    ``,
    `Areas: Flash=${fmtCOF(o.areas.flash, 2)} m², Jet=${fmtCOF(o.areas.jet, 2)} m², Pool=${fmtCOF(o.areas.pool, 2)} m², VCE=${fmtCOF(o.areas.vce, 2)} m²`,
    `Flammable combined (prob-weighted) = ${fmtCOF(o.finalFlammableArea, 2)} m²`,
    `Toxic area = ${fmtCOF(o.finalToxicArea, 2)} m²`,
    `Non-flammable area = ${fmtCOF(o.finalNonFlammableArea, 2)} m²`,
    `Total consequence area = ${fmtCOF(o.totalConsequenceArea, 2)} m²`,
    ``,
    `Ignition probabilities: Early=${fmtCOF(o.p_early, 2)}, Late=${fmtCOF(o.p_late, 2)}, Safe=${fmtCOF(o.p_safe, 2)}`,
    ``,
    `Financial consequence:`,
    `  Equipment = $${fmtCOF(o.finEquip, 0)}`,
    `  Injury/Fatality = $${fmtCOF(o.finInjury, 0)}`,
    `  Production = $${fmtCOF(o.finProd, 0)}`,
    `  TOTAL = $${fmtCOF(o.finLoss, 0)}`
  ].join("\n");
}

export function calculateLevel2COF(rawInputs = {}) {
  const num = (v) => {
    if (v === null || v === undefined || v === "") return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const D_mm = num(rawInputs.D_mm);
  const release_size = String(rawInputs.release_size || "").toLowerCase();
  let dn_mm = num(rawInputs.dn_mm);

  if (release_size && release_size !== "user") {
    switch (release_size) {
      case "small": dn_mm = 6.4; break;
      case "medium": dn_mm = Number.isFinite(D_mm) ? Math.min(D_mm, 25) : 25; break;
      case "large": dn_mm = Number.isFinite(D_mm) ? Math.min(D_mm, 102) : 102; break;
      case "rupture": dn_mm = Number.isFinite(D_mm) ? Math.min(D_mm, 406) : 406; break;
    }
  }

  const Ps_bar = Number.isFinite(num(rawInputs.Ps_bar))
    ? num(rawInputs.Ps_bar)
    : (Number.isFinite(num(rawInputs.ps_bar)) ? num(rawInputs.ps_bar) * 0.980665 : NaN);

  const i = {
    Ps_bar,
    Ts_C: num(rawInputs.Ts_C ?? rawInputs.ts_c),
    Patm_bar: num(rawInputs.Patm_bar ?? rawInputs.patm_bar),
    Tamb_C: num(rawInputs.Tamb_C ?? rawInputs.tamb_c),
    stored_phase: String(rawInputs.stored_phase || "liquid").toLowerCase(),
    NBP_C: num(rawInputs.NBP_C ?? rawInputs.nbp_c),
    rho_l: num(rawInputs.rho_l),
    MW: num(rawInputs.MW ?? rawInputs.mw),
    k: num(rawInputs.k ?? rawInputs.k_ratio),
    AIT_C: num(rawInputs.AIT_C ?? rawInputs.ait_c),
    dn_mm,
    D_mm,
    Cd: num(rawInputs.Cd ?? rawInputs.cd) || 0.64,
    Kv: num(rawInputs.Kv ?? rawInputs.kv) || 1.0,
    invGroupMass: num(rawInputs.invGroupMass ?? rawInputs.inv_group_mass),
    isoTime_s: num(rawInputs.isoTime_s ?? rawInputs.iso_time_s) || 600,
    detect_eff: clamp01(num(rawInputs.detect_eff) || 1.0),
    release_type: String(rawInputs.release_type || "auto"),
    flashFrac: clamp01(num(rawInputs.flashFrac ?? rawInputs.flash_frac) || 0),
    detect_label: String(rawInputs.detect_label || "C"),
    iso_label: String(rawInputs.iso_label || "C"),
    a_flash: num(rawInputs.a_flash), b_flash: num(rawInputs.b_flash),
    a_jet: num(rawInputs.a_jet), b_jet: num(rawInputs.b_jet),
    a_pool: num(rawInputs.a_pool), b_pool: num(rawInputs.b_pool),
    a_vce: num(rawInputs.a_vce), b_vce: num(rawInputs.b_vce),
    c_flash: num(rawInputs.c_flash), d_flash: num(rawInputs.d_flash),
    c_jet: num(rawInputs.c_jet), d_jet: num(rawInputs.d_jet),
    c_pool: num(rawInputs.c_pool), d_pool: num(rawInputs.d_pool),
    c_vce: num(rawInputs.c_vce), d_vce: num(rawInputs.d_vce),
    flash_area_fraction: clamp01(num(rawInputs.flash_area_fraction)) || 0.25,
    ign_k1: num(rawInputs.ign_k1),
    ign_k2: num(rawInputs.ign_k2),
    ign_k3: num(rawInputs.ign_k3),
    late_min: num(rawInputs.late_min),
    late_max: num(rawInputs.late_max),
    tox_a: num(rawInputs.tox_a), tox_b: num(rawInputs.tox_b),
    tox_c: num(rawInputs.tox_c), tox_d: num(rawInputs.tox_d),
    non_a: num(rawInputs.non_a ?? rawInputs.ntox_a),
    non_b: num(rawInputs.non_b ?? rawInputs.ntox_b),
    non_c: num(rawInputs.non_c ?? rawInputs.ntox_c),
    non_d: num(rawInputs.non_d ?? rawInputs.ntox_d),
    cost_equipment: num(rawInputs.cost_equipment),
    cost_injury: num(rawInputs.cost_injury),
    cost_production: num(rawInputs.cost_production)
  };

  const dn_m = (Number.isFinite(i.D_mm) && i.D_mm > 0 && i.dn_mm > i.D_mm) ? i.D_mm / 1000 : (i.dn_mm || 0) / 1000;
  const An = 0.785 * Math.pow(dn_m, 2);

  const Ps = (Number.isFinite(i.Ps_bar) ? i.Ps_bar : 0) * BAR_TO_PA;
  const Patm = (Number.isFinite(i.Patm_bar) ? i.Patm_bar : 1.013) * BAR_TO_PA;
  const Ts_K = Number.isFinite(i.Ts_C) ? i.Ts_C + 273.15 : 298.15;
  const Tamb_K = Number.isFinite(i.Tamb_C) ? i.Tamb_C + 273.15 : 294.15;

  let MW_input = i.MW || 28;
  if (MW_input < 0.1) MW_input *= 1000;

  let Wn = 0, model = "No release";
  if (i.stored_phase === "liquid" || i.stored_phase === "two_phase") {
    const baseRate = liquidReleaseRate(An, i.Cd, i.Kv, i.rho_l, Ps, Patm);
    if (i.stored_phase === "two_phase" || (i.Ts_C > i.NBP_C)) {
      Wn = baseRate;
      model = "Two-phase (flashing split)";
    } else {
      Wn = baseRate;
      model = "Liquid";
    }
  } else {
    const gas = gasReleaseRate(An, i.Cd, Ps, Patm, Ts_K, i.k || 1.4, MW_input);
    Wn = gas.massRate;
    model = gas.choked ? "Gas (sonic)" : "Gas (subsonic)";
  }

  const releaseAdjustment = { "A_A": 0.25, "A_B": 0.20, "A_C": 0.10, "B_B": 0.15, "C_C": 0.00 };
  const det = i.detect_label || "C";
  const iso = i.iso_label || "C";
  const fact_di = releaseAdjustment[`${det}_${iso}`] ?? 0;
  const Wn_adj = Wn * (1 - fact_di);

  const leakLimit = getLeakDurationLimit(det, iso, i.dn_mm);
  const maxDurInv = (i.invGroupMass > 0 && Wn_adj > 0) ? i.invGroupMass / Wn_adj : Infinity;
  const duration_s = Math.max(0, Math.min(leakLimit, maxDurInv));
  const releasedMass = Wn_adj * duration_s;

  const dn_inch = (i.dn_mm || 0) / 25.4;
  const mass_lb = releasedMass * 2.205;
  const Wn_lb_s = Wn_adj * 2.205;

  let isInstant = false;
  if (dn_inch >= 0.25 && (mass_lb > 10000 || Wn_lb_s > 55.6 || duration_s < 180)) {
    isInstant = true;
  }

  const areas = {};
  if (isInstant) {
    areas.flash = powOrZero(i.c_flash, i.d_flash, releasedMass);
    areas.jet = powOrZero(i.c_jet, i.d_jet, releasedMass);
    areas.pool = powOrZero(i.c_pool, i.d_pool, releasedMass);
    areas.vce = powOrZero(i.c_vce, i.d_vce, releasedMass);
  } else {
    areas.flash = powOrZero(i.a_flash, i.b_flash, Wn_adj);
    areas.jet = powOrZero(i.a_jet, i.b_jet, Wn_adj);
    areas.pool = powOrZero(i.a_pool, i.b_pool, Wn_adj);
    areas.vce = powOrZero(i.a_vce, i.b_vce, Wn_adj);
  }

  const pIgn = (i.ign_k1 || 0) * Math.pow(Math.max(0, Wn_adj), Number.isFinite(i.ign_k2) ? i.ign_k2 : 1);
  const aitEffect = (Number.isFinite(i.AIT_C) && i.AIT_C > 0) ? Math.exp(-i.AIT_C / (i.ign_k3 || 50)) : 1;
  const p_total = clamp01(pIgn * aitEffect);
  const lMin = Number.isFinite(i.late_min) ? i.late_min : 0.25;
  const lMax = Number.isFinite(i.late_max) ? i.late_max : 0.75;
  const p_late = clamp01(lMin + (lMax - lMin) * 0.5);
  const p_early = clamp01(p_total - p_late);
  const p_safe = clamp01(1 - p_total);

  const pf = p_early, pj = p_late * 0.33, pp = p_late * 0.33, pv = p_late * 0.34;
  const flashAdj = i.flash_area_fraction || 0.25;
  const flamCombined = (pf * (areas.flash || 0) * flashAdj) + (pj * (areas.jet || 0)) + (pp * (areas.pool || 0)) + (pv * (areas.vce || 0));

  const toxArea = isInstant ? powOrZero(i.tox_c, i.tox_d, releasedMass) : powOrZero(i.tox_a, i.tox_b, Wn_adj);
  const nonFlamArea = isInstant ? powOrZero(i.non_c, i.non_d, releasedMass) : powOrZero(i.non_a, i.non_b, Wn_adj);
  const totalConsequenceArea = flamCombined + toxArea + nonFlamArea;

  const finEquip = flamCombined * (i.cost_equipment || 0);
  const finInjury = totalConsequenceArea * (i.cost_injury || 0);
  const finProd = totalConsequenceArea * (i.cost_production || 0);
  const finLoss = finEquip + finInjury + finProd;

  const result = {
    modelUsed: model,
    dn_m, An, Ps, Patm, Ts_K, Tamb_K,
    Wn: Wn_adj,
    duration_s,
    releasedMass,
    flam_rate_liq: Wn_adj * (1 - (i.flashFrac || 0)),
    flam_rate_vap: Wn_adj * (i.flashFrac || 0),
    isInstant,
    areas,
    flamCombined,
    p_early, p_late, p_safe,
    finalFlammableArea: flamCombined,
    finalToxicArea: toxArea,
    finalNonFlammableArea: nonFlamArea,
    totalConsequenceArea,
    finEquip, finInjury, finProd, finLoss
  };

  result.formattedText = formatOutputCOF(result);
  return result;
}

// ============================================================================
// 1C. API 581 INSPECTION CONFIDENCE (AIC & ANI) ENGINE
// ============================================================================

export const EQUIVALENCE_FACTORS_AIC = {
  vh: { vh: 1, h: 0.333, m: 0.111, l: 0.037 },
  h: { vh: 3, h: 1, m: 0.333, l: 0.111 },
  m: { vh: 9, h: 3, m: 1, l: 0.333 },
  l: { vh: 27, h: 9, m: 3, l: 1 }
};

export const METHODS_AIC = {
  piping: {
    internal: {
      intrusive: [
        { name: "100% CML UT Scanning (Internal)", level: "vh" },
        { name: "50% CML UT (Tees, Elbows)", level: "h" }
      ],
      "non-intrusive": [
        { name: "Spot UT (25% Circuits)", level: "m" },
        { name: "External Visual Only", level: "l" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  vessel: {
    internal: {
      intrusive: [
        { name: "VH_100% Internal Visual", level: "vh" },
        { name: "H_50% Internal Visual", level: "h" },
        { name: "M_25% to 70% Internal Visual", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_4 UT/head, 8 UT/course, 1 UT on 50% nozzles", level: "h" },
        { name: "M_2 UT/head, 4 UT/course, 1 UT on 50% nozzles", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  exchanger: {
    internal: {
      intrusive: [
        { name: "VH_100% Internal Visual", level: "vh" },
        { name: "H_50% Internal Visual", level: "h" },
        { name: "M_25% to 70% Internal Visual", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_4 UT/head, 8 UT/course, 1 UT on 50% nozzles", level: "h" },
        { name: "M_2 UT/head, 4 UT/course, 1 UT on 50% nozzles", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "H_Profile RT ≤10″; else strip & visual ≥50%", level: "h" },
        { name: "M_Profile RT ≤10″; else strip & visual ≥25%", level: "m" },
        { name: "L_Profile RT ≤10″; else strip & visual ≥10%", level: "l" }
      ],
      "non-cui": [
        { name: "VH_100% External Visual", level: "vh" }
      ]
    }
  },
  airfin: {
    internal: {
      intrusive: [
        { name: "VH_100% header plug removal + EC/RFEC/IRIS", level: "vh" },
        { name: "H_70% header plug removal + EC/RFEC/IRIS", level: "h" },
        { name: "M_50% header plug removal + EC/RFEC/IRIS", level: "m" }
      ],
      "non-intrusive": [
        { name: "H_8 UT/header box", level: "h" },
        { name: "M_4 UT/header box", level: "m" }
      ]
    },
    external: {
      cui: [
        { name: "VH_Full CUI UT Mapping", level: "vh" },
        { name: "H_CUI Spot UT", level: "h" }
      ],
      "non-cui": [
        { name: "M_Visual + Spot UT", level: "m" },
        { name: "L_Visual Only", level: "l" }
      ]
    }
  }
};

export function calculateInspectionAIC(countsInput = {}) {
  const counts = {
    vh: Math.max(0, parseInt(countsInput.vh) || 0),
    h: Math.max(0, parseInt(countsInput.h) || 0),
    m: Math.max(0, parseInt(countsInput.m) || 0),
    l: Math.max(0, parseInt(countsInput.l) || 0)
  };

  let baseAIC = "-";
  if (counts.vh > 0) baseAIC = "vh";
  else if (counts.h > 0) baseAIC = "h";
  else if (counts.m > 0) baseAIC = "m";
  else if (counts.l > 0) baseAIC = "l";

  if (baseAIC === "-") {
    return {
      baseAIC: "-",
      totalEquivalent: 0,
      ANI: 0,
      factors: null,
      counts
    };
  }

  const ef = EQUIVALENCE_FACTORS_AIC[baseAIC];
  const totalEquivalent =
    (ef.vh * counts.vh) +
    (ef.h * counts.h) +
    (ef.m * counts.m) +
    (ef.l * counts.l);

  const ANI = Math.floor(totalEquivalent);

  return {
    baseAIC,
    totalEquivalent: Number(totalEquivalent.toFixed(3)),
    ANI,
    factors: ef,
    counts
  };
}

function enrichWorkspaceWithCalculations(ws) {
  if (!ws || typeof ws !== "object") return ws;
  const compsByAsset = ws.componentsByAsset || {};
  for (const comps of Object.values(compsByAsset)) {
    if (!Array.isArray(comps)) continue;
    for (const comp of comps) {
      if (!Array.isArray(comp.analyses)) continue;
      for (const an of comp.analyses) {
        if (!an.results || !an.results.internalPoF) {
          try {
            an.results = calculateOverallRBI(
              an.internalInputs || {},
              an.externalInputs || {},
              an.consequenceInputs || {}
            );
          } catch (_) {}
        }
      }
    }
  }
  return ws;
}

// ============================================================================
// 2. MAIN REQUEST HANDLER & CLOUD FIRESTORE HIERARCHICAL PERSISTENCE
// ============================================================================

export default async function handler(req, res) {
  const method = req.method;
  const action = req.body?.action || req.query?.action || (method === "GET" ? "get_workspace" : "save_workspace");

  try {
    // ----------------------------------------------------
    // 0. BACKEND POF, COF, AIC & RBI CALCULATION ENGINE ENDPOINTS
    // ----------------------------------------------------
    if (action === "art_table" || action === "get_art_table" || action === "metadata") {
      return res.status(200).json({
        success: true,
        artTable: ART_TABLE,
        structuralMinThickness: STRUCTURAL_MIN_THICKNESS,
        leakAreas: EQUIPMENT_LEAK_AREAS,
        fluidsDatabase: FLUIDS_DATABASE,
        priorityMatrix: PRIORITY_NUMBER_MATRIX,
        riskMatrix: RISK_LEVEL_MATRIX
      });
    }

    if (action === "cof_level2_metadata") {
      return res.status(200).json({
        success: true,
        fluidProperties: COF_FLUID_PROPERTIES,
        fluidLabels: COF_FLUID_LABELS,
        liquidFluids: COF_LIQUID_FLUIDS,
        gasFluids: COF_GAS_FLUIDS
      });
    }

    if (action === "calculate_cof_level2") {
      const payload = req.body?.inputs || req.body?.data || req.body || {};
      const results = calculateLevel2COF(payload);
      return res.status(200).json({
        success: true,
        calculatedBy: "backend_level2_cof_engine",
        results
      });
    }

    if (action === "aic_metadata") {
      return res.status(200).json({
        success: true,
        equivalenceFactors: EQUIVALENCE_FACTORS_AIC,
        methods: METHODS_AIC
      });
    }

    if (action === "calculate_aic") {
      const counts = req.body?.counts || req.body || {};
      const results = calculateInspectionAIC(counts);
      return res.status(200).json({
        success: true,
        calculatedBy: "backend_aic_engine",
        ...results
      });
    }

    if (action === "pof" || action === "calculate_pof" || req.path.endsWith("/pof")) {
      try {
        const payload = req.body?.data || req.body?.inputs || req.body || {};
        const internalInputs = payload.internalInputs || {};
        const externalInputs = payload.externalInputs || {};

        const internalPoF = calculateInternalThinning(internalInputs);
        const externalPoF = calculateExternalCUI(externalInputs, internalInputs?.tInit_mm, internalPoF?.tReq_mm, internalInputs?.yearsInService);

        const combinedPoF = Math.min(internalPoF.finalProbability, externalPoF.finalProbability);
        const governingPoFMechanism = internalPoF.finalProbability <= externalPoF.finalProbability ? "Internal Thinning" : "External CUI";

        return res.status(200).json({
          success: true,
          calculatedBy: "backend_pof_engine",
          timestamp: new Date().toISOString(),
          internalPoF,
          externalPoF,
          combinedPoF,
          governingPoFMechanism
        });
      } catch (pofErr) {
        return res.status(400).json({ success: false, error: pofErr.message });
      }
    }

    if (action === "calculate" || action === "calculate_analysis") {
      try {
        const payload = req.body?.data || req.body?.inputs || req.body || {};
        const internalInputs = payload.internalInputs || {};
        const externalInputs = payload.externalInputs || {};
        const consequenceInputs = payload.consequenceInputs || {};

        const rbiResults = calculateOverallRBI(internalInputs, externalInputs, consequenceInputs);

        return res.status(200).json({
          success: true,
          calculatedBy: "backend_engine",
          timestamp: new Date().toISOString(),
          results: rbiResults
        });
      } catch (valErr) {
        return res.status(400).json({ success: false, error: valErr.message });
      }
    }

    // ----------------------------------------------------
    // 1. GET WORKSPACE (Hierarchy: FLOC -> Assets -> Components -> Analyses)
    // ----------------------------------------------------
    if (action === "get_workspace") {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        try {
          const snap = await adminDb.collection("semi_quantitative_rbi_workspace").doc("current_workspace").get();
          if (snap.exists) {
            return res.status(200).json({
              success: true,
              source: "firestore",
              workspace: enrichWorkspaceWithCalculations(snap.data())
            });
          }
        } catch (fErr) {
          console.warn("[Risk Calc API] Admin Firestore read failed:", fErr.message);
        }
      }
      const clientDb = getFirestoreDb();
      if (clientDb) {
        try {
          const snap = await getDoc(doc(clientDb, "semi_quantitative_rbi_workspace", "current_workspace"));
          if (snap.exists()) {
            return res.status(200).json({
              success: true,
              source: "firestore",
              workspace: enrichWorkspaceWithCalculations(snap.data())
            });
          }
        } catch (cErr) {
          console.warn("[Risk Calc API] Client Firestore read failed:", cErr.message);
        }
      }
      const localWs = loadJsonFile(WORKSPACE_FILE, null);
      if (localWs) {
        return res.status(200).json({
          success: true,
          source: "local_cache",
          workspace: enrichWorkspaceWithCalculations(localWs)
        });
      }
      return res.status(200).json({
        success: true,
        source: "default",
        workspace: { functionalLocations: [], assets: [], componentsByAsset: {}, lastUpdated: new Date().toISOString() }
      });
    }

    // ----------------------------------------------------
    // 2. SAVE WORKSPACE & CLOUD HIERARCHICAL SYNC
    // Hierarchy: Functional Location > Assets > Components > Analyses
    // ----------------------------------------------------
    if (action === "save_workspace" || action === "sync_cloud") {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "write" });
      if (!authCheck.authorized) return;

      const incoming = req.body?.workspace || req.body?.data || req.body || {};
      const rawAssets = Array.isArray(incoming.assets) ? incoming.assets : [];
      const rawComponentsByAsset = incoming.componentsByAsset || {};

      // 1. Server-side validation & Recalculate each analysis to ensure math backend integrity
      const processedAssets = rawAssets.map(asset => ({ ...asset }));
      const processedComponentsByAsset = {};

      Object.entries(rawComponentsByAsset).forEach(([assetId, comps]) => {
        if (!Array.isArray(comps)) return;
        processedComponentsByAsset[assetId] = comps.map(comp => {
          const updatedComp = { ...comp };
          if (Array.isArray(updatedComp.analyses)) {
            updatedComp.analyses = updatedComp.analyses.map(an => {
              const updatedAn = { ...an };
              // Calculate on backend for maximum accuracy
              const rbi = calculateOverallRBI(
                updatedAn.internalInputs || {},
                updatedAn.externalInputs || {},
                updatedAn.consequenceInputs || {}
              );
              updatedAn.results = rbi;
              updatedAn.isCalculated = true;
              updatedAn.dateCriticalityCalculated = updatedAn.dateCriticalityCalculated || new Date().toLocaleString();
              updatedAn.mechanisms = [
                {
                  id: "internal",
                  name: "Criticality Calculator Internal Corrosion",
                  damageFactor: rbi.internalPoF.damageFactor,
                  probabilityOfFailure: rbi.internalPoF.finalProbability,
                  consequenceOfFailure: rbi.combinedCoF,
                  inspectionPriority: rbi.priorityNumber
                },
                {
                  id: "external",
                  name: "Criticality Calculator External Corrosion",
                  damageFactor: rbi.externalPoF.damageFactor,
                  probabilityOfFailure: rbi.externalPoF.finalProbability,
                  consequenceOfFailure: rbi.combinedCoF,
                  inspectionPriority: rbi.priorityNumber
                }
              ];
              return updatedAn;
            });
          }
          return updatedComp;
        });
      });

      // 2. Group into Functional Locations
      const flocMap = {};
      processedAssets.forEach(asset => {
        const flocId = asset.functionalLocation ? sanitizeDocId(asset.functionalLocation) : "FLOC-GENERAL";
        if (!flocMap[flocId]) {
          flocMap[flocId] = {
            id: flocId,
            flocCode: asset.functionalLocation || "FLOC-GENERAL",
            name: `${asset.facilityName || 'Refinery Complex'} - ${asset.unitService || 'Process Unit'}`,
            unit: asset.unitService || "General Service",
            facility: asset.facilityName || "Plant Complex",
            assets: [],
            totalAssets: 0,
            updatedAt: new Date().toISOString()
          };
        }
        flocMap[flocId].assets.push(asset.id);
        flocMap[flocId].totalAssets += 1;
      });

      const functionalLocationsList = Object.values(flocMap);

      const wsPayload = {
        functionalLocations: functionalLocationsList,
        assets: processedAssets,
        componentsByAsset: processedComponentsByAsset,
        lastUpdated: new Date().toISOString()
      };

      // 3. Hierarchical Cloud Firestore Persistence
      // Functional Location > Assets > Components > Analyses
      let firestoreSaved = false;
      let hierarchyCounts = { flocs: 0, assets: 0, components: 0, analyses: 0 };

      try {
        const adminDb = getAdminFirestore();
        if (adminDb) {
          // A. Save the main aggregated workspace document
          const wsRef = adminDb.collection("semi_quantitative_rbi_workspace").doc("current_workspace");
          const writePromises = [
            wsRef.set(cleanFirestoreObject(wsPayload), { merge: true })
          ];

          // B. Prepare Hierarchical sub-documents in Cloud Firestore concurrently
          for (const floc of functionalLocationsList) {
            const flocDocId = sanitizeDocId(floc.id);
            const flocRef = adminDb.collection("rbi_functional_locations").doc(flocDocId);
            writePromises.push(flocRef.set(cleanFirestoreObject({
              id: floc.id,
              flocCode: floc.flocCode || floc.id,
              name: floc.name || "Process Unit",
              unit: floc.unit || "General Service",
              facility: floc.facility || "Plant Complex",
              totalAssets: floc.totalAssets || 0,
              updatedAt: floc.updatedAt || new Date().toISOString()
            }), { merge: true }));
            hierarchyCounts.flocs++;

            // Assets under this Functional Location
            const flocAssets = processedAssets.filter(a => sanitizeDocId(a.functionalLocation) === flocDocId || (!a.functionalLocation && flocDocId === "FLOC-GENERAL"));
            for (const asset of flocAssets) {
              const assetDocId = sanitizeDocId(asset.id);
              const assetRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId);
              writePromises.push(assetRef.set(cleanFirestoreObject({
                id: asset.id,
                tag: asset.tag || asset.id,
                name: asset.name || "Equipment",
                functionalLocation: asset.functionalLocation || flocDocId,
                equipmentCategory: asset.equipmentCategory || "Pressure Vessel",
                unitService: asset.unitService || "Process Service",
                designPressure_kgcm2: asset.designPressure_kgcm2 ?? 0,
                designTemp_C: asset.designTemp_C ?? 0,
                operatingPressure_kgcm2: asset.operatingPressure_kgcm2 ?? 0,
                operatingTemp_C: asset.operatingTemp_C ?? 0,
                materialOfConstruction: asset.materialOfConstruction || "Carbon Steel",
                processFluid: asset.processFluid || "C4 (Butane)",
                updatedAt: new Date().toISOString()
              }), { merge: true }));
              hierarchyCounts.assets++;

              // Components under this Asset (e.g. Shell, Channel, etc.)
              const comps = processedComponentsByAsset[asset.id] || [];
              for (const comp of comps) {
                const compDocId = sanitizeDocId(comp.id);
                const compRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId).collection("components").doc(compDocId);
                writePromises.push(compRef.set(cleanFirestoreObject({
                  id: comp.id,
                  fullName: comp.fullName || comp.id,
                  equipmentType: comp.equipmentType || "Pressure Vessel",
                  materialSpec: comp.materialSpec || "SA516 Gr. 70",
                  technicalData: comp.technicalData || {},
                  updatedAt: new Date().toISOString()
                }), { merge: true }));
                hierarchyCounts.components++;

                // Analyses under this Component
                const analyses = comp.analyses || [];
                for (const an of analyses) {
                  const anDocId = sanitizeDocId(an.id);
                  const anRef = adminDb.collection("rbi_functional_locations").doc(flocDocId).collection("assets").doc(assetDocId).collection("components").doc(compDocId).collection("analyses").doc(anDocId);
                  writePromises.push(anRef.set(cleanFirestoreObject({
                    id: an.id,
                    name: an.name || an.id,
                    scenarioId: an.scenarioId || an.id,
                    scenarioReferenceDate: an.scenarioReferenceDate || "",
                    isCalculated: !!an.isCalculated,
                    dateCriticalityCalculated: an.dateCriticalityCalculated || "",
                    internalInputs: an.internalInputs || {},
                    externalInputs: an.externalInputs || {},
                    consequenceInputs: an.consequenceInputs || {},
                    results: an.results || {},
                    mechanisms: an.mechanisms || [],
                    headerData: an.headerData || {},
                    updatedAt: new Date().toISOString()
                  }), { merge: true }));
                  hierarchyCounts.analyses++;
                }
              }
            }
          }

          await Promise.all(writePromises);
          firestoreSaved = true;
        } else {
          const clientDb = getFirestoreDb();
          if (clientDb) {
            try {
              await setDoc(doc(clientDb, "semi_quantitative_rbi_workspace", "current_workspace"), cleanFirestoreObject(wsPayload), { merge: true });
              firestoreSaved = true;
            } catch (cErr) {
              console.warn("[Risk Calc API] Client Firestore save fallback failed:", cErr.message);
            }
          }
          for (const floc of functionalLocationsList) {
            hierarchyCounts.flocs++;
            const flocDocId = sanitizeDocId(floc.id);
            const flocAssets = processedAssets.filter(a => sanitizeDocId(a.functionalLocation) === flocDocId || (!a.functionalLocation && flocDocId === "FLOC-GENERAL"));
            for (const asset of flocAssets) {
              hierarchyCounts.assets++;
              const comps = processedComponentsByAsset[asset.id] || [];
              for (const comp of comps) {
                hierarchyCounts.components++;
                const analyses = comp.analyses || [];
                hierarchyCounts.analyses += analyses.length;
              }
            }
          }
        }
      } catch (fErr) {
        console.warn("[Risk Calc API] Firestore hierarchical sync warning:", fErr.message);
      }

      saveJsonFile(WORKSPACE_FILE, cleanFirestoreObject(wsPayload));

      return res.status(200).json({
        success: true,
        message: `Hierarchy synced: ${hierarchyCounts.flocs} FLOCs > ${hierarchyCounts.assets} Assets > ${hierarchyCounts.components} Components > ${hierarchyCounts.analyses} Analyses.`,
        firestoreSaved,
        hierarchyCounts,
        workspace: wsPayload
      });
    }

    // ----------------------------------------------------
    // 3. LEGACY SINGLE ASSESSMENT COMPATIBILITY
    // ----------------------------------------------------
    if (action === "get_assessments") {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        try {
          const snap = await adminDb.collection("semi_quantitative_risk_assessments").limit(100).get();
          const assessments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          return res.status(200).json({
            success: true,
            total: assessments.length,
            assessments
          });
        } catch (e) {
          console.warn("[Risk Calc API] Admin get_assessments failed:", e.message);
        }
      }
      const clientDb = getFirestoreDb();
      if (clientDb) {
        try {
          const snap = await getDocs(collection(clientDb, "semi_quantitative_risk_assessments"));
          const assessments = [];
          snap.forEach(d => assessments.push({ id: d.id, ...d.data() }));
          return res.status(200).json({
            success: true,
            total: assessments.length,
            assessments
          });
        } catch (cErr) {
          console.warn("[Risk Calc API] Client get_assessments failed:", cErr.message);
        }
      }
      const localAssessments = loadJsonFile(ASSESSMENTS_FILE, []);
      return res.status(200).json({
        success: true,
        total: localAssessments.length,
        assessments: localAssessments
      });
    }

    return res.status(400).json({ success: false, error: `Invalid action: ${action}` });
  } catch (err) {
    console.error("[Risk Calc API] Server Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error in Risk Calculator API",
      message: err.message || String(err)
    });
  }
}
