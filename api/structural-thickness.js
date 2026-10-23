import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "./firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "../data/structural_thickness_data.json");
const PIPE_DIMENSIONS_FILE = path.resolve(__dirname, "../data/secure/pipe_dimensions.json");

if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

/**
 * 🏭 Standard Manufacturing Under-Tolerance Master Chart
 * Reference: ASTM, API Spec 5L, ASME B31.3, IS 3589, IS 1239
 */
export const MANUFACTURER_TOLERANCE_CHART = {
  "A106": {
    id: "A106",
    spec: "ASTM A106 / A106M",
    title: "Seamless Carbon Steel Pipe for High-Temp Service",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Minimum wall thickness at any point shall not be more than 12.5% under nominal."
  },
  "A53": {
    id: "A53",
    spec: "ASTM A53 / A53M",
    title: "Pipe, Steel, Black and Hot-Dipped, Zinc-Coated, Welded & Seamless",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Minimum wall thickness at any point shall not be more than 12.5% under nominal."
  },
  "A335": {
    id: "A335",
    spec: "ASTM A335 / A335M (Cr-Mo)",
    title: "Seamless Ferritic Alloy-Steel Pipe for High-Temp Service",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Minimum wall thickness at any point shall not be more than 12.5% under nominal."
  },
  "A312": {
    id: "A312",
    spec: "ASTM A312 / A312M (Austenitic SS)",
    title: "Seamless, Welded Austenitic Stainless Steel Pipes (304/316)",
    materialGroup: "stainless_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Minimum wall thickness at any point shall not be more than 12.5% under nominal."
  },
  "A358": {
    id: "A358",
    spec: "ASTM A358 / A358M (EFW SS)",
    title: "Electric-Fusion-Welded Austenitic Chromium-Nickel SS Pipe",
    materialGroup: "stainless_steel",
    type: "mm",
    value: 0.3,
    toleranceDisplay: "-0.30 mm (-0.01 in)",
    description: "Minimum wall thickness shall not be more than 0.01 in (0.3 mm) under nominal."
  },
  "A409": {
    id: "A409",
    spec: "ASTM A409 / A409M (Large Dia SS)",
    title: "Welded Large Diameter Austenitic Steel Pipe",
    materialGroup: "stainless_steel",
    type: "mm",
    value: 0.46,
    toleranceDisplay: "-0.46 mm (-0.018 in)",
    description: "Minimum wall thickness shall not be more than 0.018 in (0.46 mm) under nominal."
  },
  "A790": {
    id: "A790",
    spec: "ASTM A790 / A790M (Duplex)",
    title: "Seamless & Welded Ferritic/Austenitic (Duplex) SS Pipe",
    materialGroup: "stainless_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Minimum wall thickness at any point shall not be more than 12.5% under nominal."
  },
  "B167_B444": {
    id: "B167_B444",
    spec: "ASTM B167 / B444 / B622 (Nickel Alloys)",
    title: "Nickel-Chromium-Iron & Nickel-Molybdenum Seamless Pipe/Tube",
    materialGroup: "nickel_alloy",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Standard tolerance for cold-worked and hot-finished nickel alloy piping."
  },
  "API_5L_SEAMLESS": {
    id: "API_5L_SEAMLESS",
    spec: "API Spec 5L (Seamless)",
    title: "API Specification for Line Pipe - Seamless",
    materialGroup: "carbon_steel",
    type: "api_5l_seamless",
    value: 0.125,
    toleranceDisplay: "-12.5% (or -0.5mm if t ≤ 4.0mm, -10% if t ≥ 25mm)",
    description: "t ≤ 4.0 mm: -0.5 mm; 4.0 mm < t < 25.0 mm: -12.5% of t; t ≥ 25.0 mm: -10.0% of t."
  },
  "API_5L_WELDED": {
    id: "API_5L_WELDED",
    spec: "API Spec 5L (Welded)",
    title: "API Specification for Line Pipe - Welded (ERW / SAW)",
    materialGroup: "carbon_steel",
    type: "api_5l_welded",
    value: 0.10,
    toleranceDisplay: "-10.0% (or -0.5mm if t ≤ 5.0mm, -1.5mm if t ≥ 15mm)",
    description: "t ≤ 5.0 mm: -0.5 mm; 5.0 mm < t < 15.0 mm: -10.0% of t; t ≥ 15.0 mm: -1.5 mm."
  },
  "A530": {
    id: "A530",
    spec: "ASTM A530 / A530M",
    title: "General Requirements for Specialized Carbon and Alloy Steel Pipe",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Standard general requirements specification for carbon and alloy steel pipe."
  },
  "A671_A672_A691": {
    id: "A671_A672_A691",
    spec: "ASTM A671 / A672 / A691 (EFW)",
    title: "Electric-Fusion-Welded Steel Pipe (Atmospheric/High-Pressure/High-Temp)",
    materialGroup: "carbon_steel",
    type: "mm",
    value: 0.3,
    toleranceDisplay: "-0.30 mm (-0.01 in)",
    description: "Minimum wall thickness at any point shall not be more than 0.01 in (0.3 mm) under nominal."
  },
  "IS_3589_SEAMLESS": {
    id: "IS_3589_SEAMLESS",
    spec: "IS 3589 (Seamless & SAW)",
    title: "Steel Pipes for Water and Sewage (168.3 to 2540 mm Outside Diameter)",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Indian Standard IS 3589 Seamless and SAW pipe under-tolerance."
  },
  "IS_3589_ERW": {
    id: "IS_3589_ERW",
    spec: "IS 3589 (ERW)",
    title: "Steel Pipes for Water and Sewage - Electric Resistance Welded",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.10,
    toleranceDisplay: "-10.0%",
    description: "Indian Standard IS 3589 ERW pipe under-tolerance."
  },
  "IS_1239_WELDED_LIGHT": {
    id: "IS_1239_WELDED_LIGHT",
    spec: "IS 1239 (Welded - Light)",
    title: "Steel Tubes, Tubulars & Other Fittings - Light Series",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.08,
    toleranceDisplay: "-8.0%",
    description: "Indian Standard IS 1239 Welded Light class tubes."
  },
  "IS_1239_WELDED_MED": {
    id: "IS_1239_WELDED_MED",
    spec: "IS 1239 (Welded - Medium / Heavy)",
    title: "Steel Tubes, Tubulars & Other Fittings - Medium & Heavy Series",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.10,
    toleranceDisplay: "-10.0%",
    description: "Indian Standard IS 1239 Welded Medium and Heavy class tubes."
  },
  "IS_1239_SEAMLESS": {
    id: "IS_1239_SEAMLESS",
    spec: "IS 1239 (Seamless)",
    title: "Steel Tubes, Tubulars & Other Fittings - Seamless Series",
    materialGroup: "carbon_steel",
    type: "%",
    value: 0.125,
    toleranceDisplay: "-12.5%",
    description: "Indian Standard IS 1239 Seamless tubes."
  }
};

/**
 * Verified API 581 Annex D / API 574 Minimum Structural Thickness Tables (mm)
 * - Table D.2b: Carbon Steel at 400 °F (205 °C)
 * - Table D.2d: Carbon Steel at 750 °F (400 °C)
 * - Table D.3b: Austenitic Stainless Steel at 400 °F (205 °C)
 * - Table D.3d: Austenitic Stainless Steel at 750 °F (400 °C)
 * - Table D.4b: Nickel & High Alloys at 400 °F (205 °C)
 * - Table D.4d: Nickel & High Alloys at 750 °F (400 °C)
 */
export const STRUCTURAL_THICKNESS_DATABASE = {
  "D.2b": {
    id: "D.2b",
    tableName: "Table D.2b",
    title: "Carbon Steel Minimum Structural Thickness (mm) at 400 °F (205 °C)",
    material: "carbon_steel",
    materialName: "Carbon Steel & Low Alloy",
    temperatureF: "400 °F",
    temperatureC: "205 °C",
    tempCategory: "400F_205C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.40, "2500": 2.03 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.52, "2500": 2.29 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.40, "900": 1.40, "1500": 1.78, "2500": 2.67 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 1.78, "900": 1.78, "1500": 2.29, "2500": 3.68 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.40, "600": 2.03, "900": 2.03, "1500": 2.92, "2500": 4.57 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 1.65, "300": 2.41, "600": 3.43, "900": 3.43, "1500": 4.95, "2500": 7.49 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 1.52, "300": 2.41, "600": 3.94, "900": 3.94, "1500": 5.72, "2500": 8.89 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.27, "300": 2.54, "600": 4.45, "900": 4.83, "1500": 7.49, "2500": 12.07 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.52, "300": 2.92, "600": 5.46, "900": 6.10, "1500": 9.53, "2500": 15.37 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 2.03, "300": 3.30, "600": 6.22, "900": 7.37, "1500": 11.56, "2500": 18.92 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 2.29, "300": 3.68, "600": 6.86, "900": 8.51, "1500": 13.46, "2500": 21.97 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 2.29, "300": 3.94, "600": 7.62, "900": 9.27, "1500": 14.86, "2500": 22.48 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.54, "300": 4.45, "600": 8.38, "900": 10.41, "1500": 16.64, "2500": 25.53 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.79, "300": 4.70, "600": 9.02, "900": 11.56, "1500": 18.54, "2500": 28.58 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 3.05, "300": 5.33, "600": 9.78, "900": 12.70, "1500": 20.45, "2500": 31.62 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 3.56, "300": 6.22, "600": 11.43, "900": 15.11, "1500": 24.38, "2500": 37.72 } }
    ]
  },
  "D.2d": {
    id: "D.2d",
    tableName: "Table D.2d",
    title: "Carbon Steel Minimum Structural Thickness (mm) at 750 °F (400 °C)",
    material: "carbon_steel",
    materialName: "Carbon Steel & Low Alloy",
    temperatureF: "750 °F",
    temperatureC: "400 °C",
    tempCategory: "750F_400C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.40, "1500": 1.78, "2500": 2.54 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.40, "900": 1.40, "1500": 1.91, "2500": 2.79 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.91, "900": 1.91, "1500": 2.16, "2500": 3.30 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 2.29, "900": 2.29, "1500": 2.79, "2500": 4.45 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.78, "600": 2.54, "900": 2.54, "1500": 3.43, "2500": 5.46 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 2.29, "300": 3.30, "600": 4.57, "900": 4.57, "1500": 6.22, "2500": 9.27 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 2.03, "300": 3.18, "600": 5.08, "900": 5.08, "1500": 6.86, "2500": 10.67 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.52, "300": 3.18, "600": 5.72, "900": 5.84, "1500": 8.89, "2500": 14.35 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.65, "300": 3.68, "600": 6.86, "900": 7.37, "1500": 11.30, "2500": 18.03 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 2.16, "300": 4.06, "600": 7.75, "900": 8.76, "1500": 13.59, "2500": 22.23 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 2.29, "300": 4.45, "600": 8.38, "900": 10.03, "1500": 15.75, "2500": 25.65 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 2.54, "300": 4.83, "600": 9.27, "900": 10.92, "1500": 17.27, "2500": 25.78 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.79, "300": 5.33, "600": 10.16, "900": 12.19, "1500": 19.43, "2500": 29.21 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.79, "300": 5.72, "600": 10.92, "900": 13.46, "1500": 21.59, "2500": 32.64 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 3.30, "300": 6.35, "600": 11.68, "900": 14.86, "1500": 23.75, "2500": 36.07 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 3.56, "300": 7.37, "600": 13.59, "900": 17.53, "1500": 28.19, "2500": 42.93 } }
    ]
  },
  "D.3b": {
    id: "D.3b",
    tableName: "Table D.3b",
    title: "Austenitic Stainless Steel Minimum Structural Thickness (mm) at 400 °F (205 °C)",
    material: "stainless_steel",
    materialName: "Austenitic Stainless Steel (SS 304, 316, Duplex)",
    temperatureF: "400 °F",
    temperatureC: "205 °C",
    tempCategory: "400F_205C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.65 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.91 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.52, "2500": 2.16 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 1.52, "900": 1.52, "1500": 1.91, "2500": 3.05 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.27, "600": 1.78, "900": 1.78, "1500": 2.41, "2500": 3.81 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 1.52, "300": 2.03, "600": 2.92, "900": 2.92, "1500": 4.19, "2500": 6.22 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 1.40, "300": 2.03, "600": 3.30, "900": 3.30, "1500": 4.70, "2500": 7.37 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.27, "300": 2.16, "600": 3.81, "900": 4.06, "1500": 6.22, "2500": 10.03 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.40, "300": 2.41, "600": 4.57, "900": 5.08, "1500": 7.87, "2500": 12.70 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 1.78, "300": 2.79, "600": 5.21, "900": 6.10, "1500": 9.53, "2500": 15.62 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 2.03, "300": 3.05, "600": 5.72, "900": 7.11, "1500": 11.18, "2500": 18.16 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 2.03, "300": 3.30, "600": 6.35, "900": 7.75, "1500": 12.32, "2500": 18.67 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.29, "300": 3.68, "600": 6.99, "900": 8.64, "1500": 13.84, "2500": 21.08 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.41, "300": 3.94, "600": 7.62, "900": 9.65, "1500": 15.37, "2500": 23.62 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 2.67, "300": 4.45, "600": 8.26, "900": 10.54, "1500": 16.89, "2500": 26.16 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 3.05, "300": 5.21, "600": 9.53, "900": 12.57, "1500": 20.19, "2500": 31.24 } }
    ]
  },
  "D.3d": {
    id: "D.3d",
    tableName: "Table D.3d",
    title: "Austenitic Stainless Steel Minimum Structural Thickness (mm) at 750 °F (400 °C)",
    material: "stainless_steel",
    materialName: "Austenitic Stainless Steel (SS 304, 316, Duplex)",
    temperatureF: "750 °F",
    temperatureC: "400 °C",
    tempCategory: "750F_400C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.40, "2500": 2.03 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.52, "2500": 2.29 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.52, "900": 1.52, "1500": 1.78, "2500": 2.67 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 1.78, "900": 1.78, "1500": 2.29, "2500": 3.56 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.52, "600": 2.03, "900": 2.03, "1500": 2.79, "2500": 4.32 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 1.91, "300": 2.67, "600": 3.68, "900": 3.68, "1500": 4.95, "2500": 7.37 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 1.65, "300": 2.54, "600": 4.06, "900": 4.06, "1500": 5.46, "2500": 8.51 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.27, "300": 2.54, "600": 4.57, "900": 4.70, "1500": 7.11, "2500": 11.43 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.40, "300": 2.92, "600": 5.46, "900": 5.84, "1500": 9.02, "2500": 14.48 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 1.78, "300": 3.30, "600": 6.22, "900": 6.99, "1500": 10.92, "2500": 17.78 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 1.91, "300": 3.56, "600": 6.73, "900": 8.00, "1500": 12.70, "2500": 20.57 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 2.16, "300": 3.94, "600": 7.37, "900": 8.76, "1500": 13.84, "2500": 20.70 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.29, "300": 4.32, "600": 8.13, "900": 9.78, "1500": 15.62, "2500": 23.37 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.29, "300": 4.57, "600": 8.76, "900": 10.80, "1500": 17.27, "2500": 26.16 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 2.67, "300": 5.08, "600": 9.40, "900": 11.94, "1500": 19.05, "2500": 28.83 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 2.92, "300": 5.84, "600": 10.92, "900": 14.10, "1500": 22.61, "2500": 34.29 } }
    ]
  },
  "D.4b": {
    id: "D.4b",
    tableName: "Table D.4b",
    title: "Nickel & High Alloys Minimum Structural Thickness (mm) at 400 °F (205 °C)",
    material: "nickel_alloy",
    materialName: "Nickel & High Alloys (Monel, Inconel, Hastelloy)",
    temperatureF: "400 °F",
    temperatureC: "205 °C",
    tempCategory: "400F_205C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.40 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.65 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.91 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.65, "2500": 2.67 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.27, "600": 1.52, "900": 1.52, "1500": 2.03, "2500": 3.30 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 1.40, "300": 1.78, "600": 2.54, "900": 2.54, "1500": 3.56, "2500": 5.33 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 1.27, "300": 1.78, "600": 2.92, "900": 2.92, "1500": 4.06, "2500": 6.35 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.27, "300": 1.91, "600": 3.30, "900": 3.56, "1500": 5.33, "2500": 8.64 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.27, "300": 2.16, "600": 3.94, "900": 4.45, "1500": 6.73, "2500": 10.92 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 1.52, "300": 2.41, "600": 4.45, "900": 5.33, "1500": 8.26, "2500": 13.46 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 1.78, "300": 2.67, "600": 4.95, "900": 6.10, "1500": 9.65, "2500": 15.62 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 1.78, "300": 2.92, "600": 5.46, "900": 6.73, "1500": 10.67, "2500": 16.00 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.03, "300": 3.18, "600": 6.10, "900": 7.49, "1500": 11.94, "2500": 18.16 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.16, "300": 3.43, "600": 6.60, "900": 8.38, "1500": 13.34, "2500": 20.32 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 2.29, "300": 3.81, "600": 7.11, "900": 9.14, "1500": 14.61, "2500": 22.48 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 2.67, "300": 4.45, "600": 8.26, "900": 10.92, "1500": 17.53, "2500": 26.92 } }
    ]
  },
  "D.4d": {
    id: "D.4d",
    tableName: "Table D.4d",
    title: "Nickel & High Alloys Minimum Structural Thickness (mm) at 750 °F (400 °C)",
    material: "nickel_alloy",
    materialName: "Nickel & High Alloys (Monel, Inconel, Hastelloy)",
    temperatureF: "750 °F",
    temperatureC: "400 °C",
    tempCategory: "750F_400C",
    standard: "API 581 Annex D / API 574",
    unit: "mm",
    flangeClasses: ["150", "300", "600", "900", "1500", "2500"],
    rows: [
      { nps: "0.5", npsDisplay: "0.5 (1/2\")", od_mm: 21.3, od_in: 0.840, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.27, "2500": 1.78 } },
      { nps: "0.75", npsDisplay: "0.75 (3/4\")", od_mm: 26.7, od_in: 1.050, values: { "150": 1.27, "300": 1.27, "600": 1.27, "900": 1.27, "1500": 1.40, "2500": 1.91 } },
      { nps: "1", npsDisplay: "1 (1\")", od_mm: 33.4, od_in: 1.315, values: { "150": 1.27, "300": 1.27, "600": 1.40, "900": 1.40, "1500": 1.52, "2500": 2.29 } },
      { nps: "1.5", npsDisplay: "1.5 (1-1/2\")", od_mm: 48.3, od_in: 1.900, values: { "150": 1.27, "300": 1.27, "600": 1.52, "900": 1.52, "1500": 1.91, "2500": 3.05 } },
      { nps: "2", npsDisplay: "2 (2\")", od_mm: 60.3, od_in: 2.375, values: { "150": 1.27, "300": 1.40, "600": 1.78, "900": 1.78, "1500": 2.41, "2500": 3.68 } },
      { nps: "3", npsDisplay: "3 (3\")", od_mm: 88.9, od_in: 3.500, values: { "150": 1.65, "300": 2.29, "600": 3.18, "900": 3.18, "1500": 4.32, "2500": 6.35 } },
      { nps: "4", npsDisplay: "4 (4\")", od_mm: 114.3, od_in: 4.500, values: { "150": 1.52, "300": 2.16, "600": 3.56, "900": 3.56, "1500": 4.70, "2500": 7.37 } },
      { nps: "6", npsDisplay: "6 (6\")", od_mm: 168.3, od_in: 6.625, values: { "150": 1.27, "300": 2.16, "600": 3.94, "900": 4.06, "1500": 6.10, "2500": 9.78 } },
      { nps: "8", npsDisplay: "8 (8\")", od_mm: 219.1, od_in: 8.625, values: { "150": 1.27, "300": 2.54, "600": 4.70, "900": 5.08, "1500": 7.75, "2500": 12.45 } },
      { nps: "10", npsDisplay: "10 (10\")", od_mm: 273.0, od_in: 10.750, values: { "150": 1.52, "300": 2.79, "600": 5.33, "900": 6.10, "1500": 9.40, "2500": 15.24 } },
      { nps: "12", npsDisplay: "12 (12\")", od_mm: 323.8, od_in: 12.750, values: { "150": 1.65, "300": 3.05, "600": 5.84, "900": 6.99, "1500": 10.92, "2500": 17.65 } },
      { nps: "14", npsDisplay: "14 (14\")", od_mm: 355.6, od_in: 14.000, values: { "150": 1.78, "300": 3.30, "600": 6.35, "900": 7.62, "1500": 11.94, "2500": 17.78 } },
      { nps: "16", npsDisplay: "16 (16\")", od_mm: 406.4, od_in: 16.000, values: { "150": 2.03, "300": 3.68, "600": 6.99, "900": 8.51, "1500": 13.46, "2500": 20.07 } },
      { nps: "18", npsDisplay: "18 (18\")", od_mm: 457.0, od_in: 18.000, values: { "150": 2.03, "300": 3.94, "600": 7.49, "900": 9.40, "1500": 14.86, "2500": 22.48 } },
      { nps: "20", npsDisplay: "20 (20\")", od_mm: 508.0, od_in: 20.000, values: { "150": 2.29, "300": 4.32, "600": 8.13, "900": 10.29, "1500": 16.38, "2500": 24.77 } },
      { nps: "24", npsDisplay: "24 (24\")", od_mm: 610.0, od_in: 24.000, values: { "150": 2.54, "300": 5.08, "600": 9.40, "900": 12.19, "1500": 19.43, "2500": 29.46 } }
    ]
  }
};

function loadPipeDimensions() {
  try {
    if (fs.existsSync(PIPE_DIMENSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(PIPE_DIMENSIONS_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error reading pipe dimensions dataset:", err);
  }
  return { pipeOD: {}, pipeDataMaster: {} };
}

export function calculateUnderTolerance(materialSpecKey, t_nom) {
  const numNom = parseFloat(t_nom) || 0;
  if (numNom <= 0) return { millTolVal: 0, t_afterMill: 0, percent: 12.5, display: "12.5%" };

  const item = MANUFACTURER_TOLERANCE_CHART[materialSpecKey] || MANUFACTURER_TOLERANCE_CHART["A106"];
  let millTolVal = 0;

  if (item.type === "%") {
    millTolVal = Number((numNom * item.value).toFixed(3));
  } else if (item.type === "mm") {
    millTolVal = Number(item.value.toFixed(3));
  } else if (item.type === "api_5l_seamless") {
    if (numNom <= 4.0) millTolVal = 0.5;
    else if (numNom < 25.0) millTolVal = Number((0.125 * numNom).toFixed(3));
    else millTolVal = Number((0.10 * numNom).toFixed(3));
  } else if (item.type === "api_5l_welded") {
    if (numNom <= 5.0) millTolVal = 0.5;
    else if (numNom < 15.0) millTolVal = Number((0.10 * numNom).toFixed(3));
    else millTolVal = 1.5;
  } else {
    millTolVal = Number((numNom * 0.125).toFixed(3));
  }

  const t_afterMill = Number(Math.max(0, numNom - millTolVal).toFixed(3));
  const effectivePct = numNom > 0 ? Number(((millTolVal / numNom) * 100).toFixed(1)) : 12.5;

  return {
    specKey: item.id,
    specName: item.spec,
    millTolVal_mm: millTolVal,
    millTolVal_in: Number((millTolVal / 25.4).toFixed(4)),
    t_afterMill_mm: t_afterMill,
    t_afterMill_in: Number((t_afterMill / 25.4).toFixed(4)),
    effectivePct,
    displayTol: item.toleranceDisplay || `${effectivePct}%`
  };
}

export default async function handler(req, res) {
  const method = req.method;
  const action = req.query.action || (req.body && req.body.action) || "get_all_tables";

  try {
    if (method === "GET") {
      if (action === "tables" || action === "get_all_tables" || action === "get_tables") {
        const pipeDim = loadPipeDimensions();
        let tables = STRUCTURAL_THICKNESS_DATABASE;
        let firestoreSource = false;

        try {
          const adminDb = getAdminFirestore();
          if (adminDb) {
            const snap = await adminDb.collection("structural_min_t_tables").get();
            if (!snap.empty) {
              const loaded = {};
              snap.forEach(doc => {
                loaded[doc.id] = doc.data();
              });
              if (Object.keys(loaded).length >= 1) {
                tables = loaded;
                firestoreSource = true;
              }
            } else {
              // Auto-seed Firestore collection structural_min_t_tables
              const batch = adminDb.batch();
              for (const [tId, tData] of Object.entries(STRUCTURAL_THICKNESS_DATABASE)) {
                const docRef = adminDb.collection("structural_min_t_tables").doc(tId);
                batch.set(docRef, tData);
              }
              await batch.commit();
              firestoreSource = true;
            }
          }
        } catch (dbErr) {
          console.warn("Firestore structural_min_t_tables notice:", dbErr.message);
        }

        return res.status(200).json({
          success: true,
          standard: "API 581 Annex D / API 574 / ASME B36.10M",
          firestoreSource,
          tables,
          tolerances: MANUFACTURER_TOLERANCE_CHART,
          pipeDimensions: pipeDim
        });
      }

      if (action === "get_tolerance_chart") {
        return res.status(200).json({
          success: true,
          tolerances: MANUFACTURER_TOLERANCE_CHART
        });
      }

      const tableId = req.query.table || "D.2b";
      const nps = req.query.nps || "2";
      const sch = req.query.sch || "SCH 40";
      const flangeClass = req.query.flangeClass || "150";
      const matSpec = req.query.matSpec || "A106";
      const ca = parseFloat(req.query.ca || "0") || 0;

      const result = performAdvancedLookup(tableId, nps, sch, flangeClass, matSpec, ca);
      return res.status(200).json({ success: true, result });
    }

    if (method === "POST") {
      if (action === "lookup") {
        const {
          table = "D.2b",
          nps = "2",
          sch = "SCH 40",
          flangeClass = "150",
          matSpec = "A106",
          millTolerance = 12.5,
          customCorrosionAllowance = 0
        } = req.body || {};

        const result = performAdvancedLookup(table, nps, sch, flangeClass, matSpec, parseFloat(customCorrosionAllowance));
        return res.status(200).json({ success: true, result });
      }

      if (action === "save_assessment") {
        const { assessment, userEmail } = req.body || {};
        try {
          const adminDb = getAdminFirestore();
          if (adminDb) {
            await adminDb.collection("structural_thickness_assessments").add({
              ...assessment,
              userEmail: userEmail || "engineer@loginapp-feb72.firebaseapp.com",
              createdAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn("Firestore save note:", e.message);
        }

        return res.status(200).json({
          success: true,
          message: "Structural thickness assessment saved to Cloud database",
          id: `STA-${Date.now()}`
        });
      }

      return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Structural Thickness API Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
}

function performAdvancedLookup(tableId, nps, sch, flangeClass, matSpec = "A106", corrosionAllowance = 0) {
  const table = STRUCTURAL_THICKNESS_DATABASE[tableId] || STRUCTURAL_THICKNESS_DATABASE["D.2b"];
  const cleanNps = nps.toString().replace(/\"/g, "").replace(/\s*\(.*\)/, "").trim();

  let row = table.rows.find(r => r.nps === cleanNps);
  if (!row) {
    const npsMap = { "1/2": "0.5", "3/4": "0.75", "1-1/2": "1.5" };
    const mapped = npsMap[cleanNps];
    if (mapped) row = table.rows.find(r => r.nps === mapped);
  }
  if (!row) row = table.rows[4] || table.rows[0];

  const cleanClass = flangeClass.toString().replace(/class|#/gi, "").trim();
  const t_min_struct_mm = row.values[cleanClass] !== undefined ? row.values[cleanClass] : (row.values["150"] || 1.27);
  const t_min_struct_in = Number((t_min_struct_mm / 25.4).toFixed(4));

  // Pipe Dimensions & Schedule lookup
  const pipeDim = loadPipeDimensions();
  const schedules = pipeDim.pipeDataMaster?.[row.nps] || {};
  const nominalWT_mm = schedules[sch] ? parseFloat(schedules[sch]) : null;

  // Tolerance computation
  const tolCalc = calculateUnderTolerance(matSpec, nominalWT_mm || 0);

  const ca_mm = Number(corrosionAllowance || 0);
  const t_total_req_mm = Number((t_min_struct_mm + ca_mm).toFixed(2));
  const t_total_req_in = Number((t_total_req_mm / 25.4).toFixed(4));

  const tolDec = (tolCalc.effectivePct || 12.5) / 100;
  const t_nom_req_mm = tolDec < 1 ? Number((t_min_struct_mm / (1 - tolDec)).toFixed(2)) : t_min_struct_mm;
  const t_nom_req_in = Number((t_nom_req_mm / 25.4).toFixed(4));
  const usableNetWT_mm = Number((tolCalc.t_afterMill_mm - ca_mm).toFixed(3));

  let isAdequate = null;
  let safetyMargin_mm = null;
  let safetyMarginPct = null;

  if (nominalWT_mm && !isNaN(nominalWT_mm)) {
    isAdequate = usableNetWT_mm >= t_min_struct_mm;
    safetyMargin_mm = Number((usableNetWT_mm - t_min_struct_mm).toFixed(2));
    safetyMarginPct = t_min_struct_mm > 0 ? Number(((safetyMargin_mm / t_min_struct_mm) * 100).toFixed(1)) : 0;
  }

  // Schedule comparison list calculated authoritatively on the backend
  const scheduleComparison = [];
  for (const [schName, thickVal] of Object.entries(schedules)) {
    const tNom = parseFloat(thickVal);
    const itemTolDec = (tolCalc.effectivePct || 12.5) / 100;
    const tMill = Number((tNom * (1 - itemTolDec)).toFixed(2));
    const margin = Number((tMill - t_min_struct_mm).toFixed(2));
    const ok = tMill >= t_min_struct_mm;
    const isCurrent = schName === sch;
    scheduleComparison.push({
      schName,
      tNom,
      tMill,
      margin,
      ok,
      isCurrent
    });
  }

  return {
    tableId: table.id,
    tableName: table.tableName,
    tableTitle: table.title,
    material: table.material,
    materialName: table.materialName,
    temperatureF: table.temperatureF,
    temperatureC: table.temperatureC,
    standard: table.standard,
    nps: row.nps,
    npsDisplay: row.npsDisplay,
    od_mm: row.od_mm,
    od_in: row.od_in,
    flangeClass: `Class ${cleanClass}`,
    structuralMinThickness_mm: t_min_struct_mm,
    structuralMinThickness_in: t_min_struct_in,
    selectedSchedule: sch,
    availableSchedules: schedules,
    nominalWallThickness_mm: nominalWT_mm,
    nominalWallThickness_in: nominalWT_mm ? Number((nominalWT_mm / 25.4).toFixed(4)) : null,
    toleranceCalc: tolCalc,
    corrosionAllowance_mm: ca_mm,
    t_nom_req_mm,
    t_nom_req_in,
    usableNetWT_mm,
    totalRequiredThickness_mm: t_total_req_mm,
    totalRequiredThickness_in: t_total_req_in,
    isAdequate,
    safetyMargin_mm,
    safetyMarginPct,
    scheduleComparison,
    allFlangeClasses: table.flangeClasses,
    tableRowValues: row.values
  };
}
