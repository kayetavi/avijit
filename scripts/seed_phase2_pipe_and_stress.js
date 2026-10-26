import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAdminFirestore } from "../api/firebaseAdmin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Authoritative ASME B36.10M (Welded and Seamless Wrought Steel Pipe) &
 * ASME B36.19M (Stainless Steel Pipe) Dimensional Dataset
 * All Outside Diameters (OD) and Schedule Wall Thicknesses in millimeters (mm).
 */
export const ASME_PIPE_DIMENSIONS = {
  standard: "ASME B36.10M / ASME B36.19M",
  unit: "mm",
  npsList: [
    "1/8", "1/4", "3/8", "1/2", "3/4", "1", "1 1/4", "1 1/2",
    "2", "2 1/2", "3", "3 1/2", "4", "5", "6", "8",
    "10", "12", "14", "16", "18", "20", "22", "24",
    "26", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48"
  ],
  decimalMap: {
    "1/8": "0.125",
    "1/4": "0.25",
    "3/8": "0.375",
    "1/2": "0.5",
    "3/4": "0.75",
    "1": "1.0",
    "1 1/4": "1.25",
    "1 1/2": "1.5",
    "2": "2.0",
    "2 1/2": "2.5",
    "3": "3.0",
    "3 1/2": "3.5",
    "4": "4.0",
    "5": "5.0",
    "6": "6.0",
    "8": "8.0",
    "10": "10.0",
    "12": "12.0",
    "14": "14.0",
    "16": "16.0",
    "18": "18.0",
    "20": "20.0",
    "22": "22.0",
    "24": "24.0",
    "26": "26.0",
    "28": "28.0",
    "30": "30.0",
    "32": "32.0",
    "34": "34.0",
    "36": "36.0",
    "38": "38.0",
    "40": "40.0",
    "42": "42.0",
    "44": "44.0",
    "46": "46.0",
    "48": "48.0"
  },
  pipeOD: {
    "1/8": 10.3,
    "0.125": 10.3,
    "1/4": 13.7,
    "0.25": 13.7,
    "3/8": 17.1,
    "0.375": 17.1,
    "1/2": 21.3,
    "0.5": 21.3,
    "3/4": 26.7,
    "0.75": 26.7,
    "1": 33.4,
    "1 1/4": 42.2,
    "1.25": 42.2,
    "1 1/2": 48.3,
    "1.5": 48.3,
    "2": 60.3,
    "2 1/2": 73.0,
    "2.5": 73.0,
    "3": 88.9,
    "3 1/2": 101.6,
    "3.5": 101.6,
    "4": 114.3,
    "5": 141.3,
    "6": 168.3,
    "8": 219.1,
    "10": 273.0,
    "12": 323.9,
    "14": 355.6,
    "16": 406.4,
    "18": 457.0,
    "20": 508.0,
    "22": 559.0,
    "24": 610.0,
    "26": 660.4,
    "28": 711.2,
    "30": 762.0,
    "32": 812.8,
    "34": 863.6,
    "36": 914.4,
    "38": 965.2,
    "40": 1016.0,
    "42": 1066.8,
    "44": 1117.6,
    "46": 1168.4,
    "48": 1219.2
  },
  pipeDataMaster: {
    "1/8": {
      "SCH 10S": 1.24, "SCH 10": 1.24, "SCH 40S": 1.73, "SCH STD": 1.73, "SCH 40": 1.73, "SCH 80S": 2.41, "SCH XS": 2.41, "SCH 80": 2.41
    },
    "1/4": {
      "SCH 10S": 1.65, "SCH 10": 1.65, "SCH 40S": 2.24, "SCH STD": 2.24, "SCH 40": 2.24, "SCH 80S": 3.02, "SCH XS": 3.02, "SCH 80": 3.02
    },
    "3/8": {
      "SCH 10S": 1.65, "SCH 10": 1.65, "SCH 40S": 2.31, "SCH STD": 2.31, "SCH 40": 2.31, "SCH 80S": 3.20, "SCH XS": 3.20, "SCH 80": 3.20
    },
    "1/2": {
      "SCH 5S": 1.65, "SCH 10S": 2.11, "SCH 10": 2.11, "SCH 40S": 2.77, "SCH STD": 2.77, "SCH 40": 2.77, "SCH 80S": 3.73, "SCH XS": 3.73, "SCH 80": 3.73, "SCH 160": 4.78, "SCH XXS": 7.47
    },
    "3/4": {
      "SCH 5S": 1.65, "SCH 10S": 2.11, "SCH 10": 2.11, "SCH 40S": 2.87, "SCH STD": 2.87, "SCH 40": 2.87, "SCH 80S": 3.91, "SCH XS": 3.91, "SCH 80": 3.91, "SCH 160": 5.56, "SCH XXS": 7.82
    },
    "1": {
      "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.38, "SCH STD": 3.38, "SCH 40": 3.38, "SCH 80S": 4.55, "SCH XS": 4.55, "SCH 80": 4.55, "SCH 160": 6.35, "SCH XXS": 9.09
    },
    "1 1/4": {
      "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.56, "SCH STD": 3.56, "SCH 40": 3.56, "SCH 80S": 4.85, "SCH XS": 4.85, "SCH 80": 4.85, "SCH 160": 6.35, "SCH XXS": 9.70
    },
    "1 1/2": {
      "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.68, "SCH STD": 3.68, "SCH 40": 3.68, "SCH 80S": 5.08, "SCH XS": 5.08, "SCH 80": 5.08, "SCH 160": 7.14, "SCH XXS": 10.16
    },
    "2": {
      "SCH 5S": 1.65, "SCH 10S": 2.77, "SCH 10": 2.77, "SCH 40S": 3.91, "SCH STD": 3.91, "SCH 40": 3.91, "SCH 80S": 5.54, "SCH XS": 5.54, "SCH 80": 5.54, "SCH 160": 8.74, "SCH XXS": 11.07
    },
    "2 1/2": {
      "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.16, "SCH STD": 5.16, "SCH 40": 5.16, "SCH 80S": 7.01, "SCH XS": 7.01, "SCH 80": 7.01, "SCH 160": 9.53, "SCH XXS": 14.02
    },
    "3": {
      "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.49, "SCH STD": 5.49, "SCH 40": 5.49, "SCH 80S": 7.62, "SCH XS": 7.62, "SCH 80": 7.62, "SCH 160": 11.13, "SCH XXS": 15.24
    },
    "3 1/2": {
      "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 5.74, "SCH STD": 5.74, "SCH 40": 5.74, "SCH 80S": 8.08, "SCH XS": 8.08, "SCH 80": 8.08, "SCH XXS": 16.15
    },
    "4": {
      "SCH 5S": 2.11, "SCH 10S": 3.05, "SCH 10": 3.05, "SCH 40S": 6.02, "SCH STD": 6.02, "SCH 40": 6.02, "SCH 80S": 8.56, "SCH XS": 8.56, "SCH 80": 8.56, "SCH 120": 11.13, "SCH 160": 13.49, "SCH XXS": 17.12
    },
    "5": {
      "SCH 5S": 2.77, "SCH 10S": 3.40, "SCH 10": 3.40, "SCH 40S": 6.55, "SCH STD": 6.55, "SCH 40": 6.55, "SCH 80S": 9.53, "SCH XS": 9.53, "SCH 80": 9.53, "SCH 120": 12.70, "SCH 160": 15.88, "SCH XXS": 19.05
    },
    "6": {
      "SCH 5S": 2.77, "SCH 10S": 3.40, "SCH 10": 3.40, "SCH 40S": 7.11, "SCH STD": 7.11, "SCH 40": 7.11, "SCH 80S": 10.97, "SCH XS": 10.97, "SCH 80": 10.97, "SCH 120": 14.27, "SCH 160": 18.26, "SCH XXS": 21.95
    },
    "8": {
      "SCH 5S": 2.77, "SCH 10S": 3.76, "SCH 10": 3.76, "SCH 20": 6.35, "SCH 30": 7.04, "SCH 40S": 8.18, "SCH STD": 8.18, "SCH 40": 8.18, "SCH 60": 10.31, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 12.70, "SCH 100": 15.09, "SCH 120": 18.26, "SCH 140": 20.62, "SCH 160": 23.01, "SCH XXS": 22.23
    },
    "10": {
      "SCH 5S": 3.40, "SCH 10S": 4.19, "SCH 10": 4.19, "SCH 20": 6.35, "SCH 30": 7.80, "SCH 40S": 9.27, "SCH STD": 9.27, "SCH 40": 9.27, "SCH 60": 12.70, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 15.09, "SCH 100": 18.26, "SCH 120": 21.44, "SCH 140": 25.40, "SCH 160": 28.58, "SCH XXS": 25.40
    },
    "12": {
      "SCH 5S": 3.96, "SCH 10S": 4.57, "SCH 10": 4.57, "SCH 20": 6.35, "SCH 30": 8.38, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 10.31, "SCH 60": 14.27, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 17.48, "SCH 100": 21.44, "SCH 120": 25.40, "SCH 140": 28.58, "SCH 160": 33.32, "SCH XXS": 25.40
    },
    "14": {
      "SCH 5S": 3.96, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 9.53, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 11.13, "SCH 60": 15.09, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 19.05, "SCH 100": 23.83, "SCH 120": 27.79, "SCH 140": 31.75, "SCH 160": 35.71
    },
    "16": {
      "SCH 5S": 4.19, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 9.53, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 12.70, "SCH 60": 16.66, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 21.44, "SCH 100": 26.19, "SCH 120": 30.96, "SCH 140": 36.53, "SCH 160": 40.49
    },
    "18": {
      "SCH 5S": 4.19, "SCH 10S": 4.78, "SCH 10": 6.35, "SCH 20": 7.92, "SCH 30": 11.13, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 14.27, "SCH 60": 19.05, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 23.83, "SCH 100": 29.36, "SCH 120": 34.93, "SCH 140": 39.67, "SCH 160": 45.24
    },
    "20": {
      "SCH 5S": 4.78, "SCH 10S": 5.54, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 12.70, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 15.09, "SCH 60": 20.62, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 26.19, "SCH 100": 32.54, "SCH 120": 38.10, "SCH 140": 44.45, "SCH 160": 50.01
    },
    "22": {
      "SCH 5S": 4.78, "SCH 10S": 5.54, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 12.70, "SCH STD": 9.53, "SCH 60": 22.23, "SCH XS": 12.70, "SCH 80": 28.58, "SCH 100": 34.93, "SCH 120": 41.28, "SCH 140": 47.63, "SCH 160": 53.98
    },
    "24": {
      "SCH 5S": 5.54, "SCH 10S": 6.35, "SCH 10": 6.35, "SCH 20": 9.53, "SCH 30": 14.27, "SCH 40S": 9.53, "SCH STD": 9.53, "SCH 40": 17.48, "SCH 60": 24.61, "SCH 80S": 12.70, "SCH XS": 12.70, "SCH 80": 30.96, "SCH 100": 38.89, "SCH 120": 46.02, "SCH 140": 52.37, "SCH 160": 59.54
    },
    "26": {
      "SCH 10": 7.92, "SCH 20": 12.70, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "28": {
      "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "30": {
      "SCH 5S": 6.35, "SCH 10S": 7.92, "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "32": {
      "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 17.48, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "34": {
      "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 17.48, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "36": {
      "SCH 10": 7.92, "SCH 20": 12.70, "SCH 30": 15.88, "SCH 40": 19.05, "SCH STD": 9.53, "SCH XS": 12.70
    },
    "38": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70
    },
    "40": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88
    },
    "42": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88
    },
    "44": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70
    },
    "46": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70
    },
    "48": {
      "SCH STD": 9.53, "SCH XS": 12.70, "SCH 20": 12.70, "SCH 30": 15.88
    }
  }
};

// Also populate decimal aliases into pipeDataMaster so both "1/2" and "0.5" work directly
for (const [frac, dec] of Object.entries(ASME_PIPE_DIMENSIONS.decimalMap)) {
  if (ASME_PIPE_DIMENSIONS.pipeDataMaster[frac]) {
    ASME_PIPE_DIMENSIONS.pipeDataMaster[dec] = ASME_PIPE_DIMENSIONS.pipeDataMaster[frac];
    const clean = dec.replace(/\.0$/, "");
    if (clean && !ASME_PIPE_DIMENSIONS.pipeDataMaster[clean]) {
      ASME_PIPE_DIMENSIONS.pipeDataMaster[clean] = ASME_PIPE_DIMENSIONS.pipeDataMaster[frac];
    }
  }
}

/**
 * ASME B31.3 & ASME VIII Engineering Tables (Y-Factor, W-Factor, Joint Efficiencies E, Mill Tolerances)
 */
export const ASME_B313_CATALOG = {
  standard: "ASME B31.3 Process Piping & ASME Section VIII Div. 1",
  updatedAt: Date.now(),
  unitConversions: {
    pressureToMPa: { MPa: 1.0, bar: 0.1, kgcm2: 0.0980665, psi: 0.00689476 },
    stressToMPa: { MPa: 1.0, ksi: 6.89476, kgcm2: 0.0980665, psi: 0.00689476 }
  },
  yTable: {
    ferritic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, note: "General Service" },
      { temp: "510°C (950°F)", y: 0.5 },
      { temp: "≥ 538°C (1000°F)", y: 0.7 }
    ],
    austenitic: [
      { temp: "≤ 482°C (900°F)", y: 0.4, note: "General Service" },
      { temp: "510°C (950°F)", y: 0.4 },
      { temp: "538°C (1000°F)", y: 0.4 },
      { temp: "566°C (1050°F)", y: 0.4 },
      { temp: "593°C (1100°F)", y: 0.5 },
      { temp: "≥ 621°C (1150°F)", y: 0.7 }
    ],
    nickel: [
      { temp: "≤ 593°C (1100°F)", y: 0.4, note: "All Standard Temps" },
      { temp: "621°C (1150°F)", y: 0.5 },
      { temp: "≥ 649°C (1200°F)", y: 0.7 }
    ],
    grayiron: [
      { temp: "All Allowed Temperatures", y: 0.0, note: "Cast / Brittle" }
    ],
    other: [
      { temp: "All Allowed Temperatures", y: 0.4, note: "Standard Ductile" }
    ]
  },
  wTable: [
    { maxTempC: 427, w: "1.0", numericW: 1.0, label: "≤ 427°C — W = 1.00" },
    { maxTempC: 454, w: "0.95", numericW: 0.95, label: "454°C — W = 0.95" },
    { maxTempC: 482, w: "0.91", numericW: 0.91, label: "482°C — W = 0.91" },
    { maxTempC: 510, w: "0.88", numericW: 0.88, label: "510°C — W = 0.88" },
    { maxTempC: 538, w: "0.85", numericW: 0.85, label: "538°C — W = 0.85" },
    { maxTempC: 566, w: "0.82", numericW: 0.82, label: "566°C — W = 0.82" },
    { maxTempC: 593, w: "0.78", numericW: 0.78, label: "593°C — W = 0.78" },
    { maxTempC: 621, w: "0.75", numericW: 0.75, label: "621°C — W = 0.75" },
    { maxTempC: 649, w: "0.72", numericW: 0.72, label: "649°C — W = 0.72" },
    { maxTempC: 9999, w: "0.70", numericW: 0.70, label: "≥ 677°C — W = 0.70" }
  ],
  jointEfficiencyTable: [
    { code: "ASME B31.3 Table A-1B / Sec VIII UW-12", type: "Seamless Pipe / 100% Radiography (RT)", value: 1.0, label: "Seamless / 100% RT (1.00)" },
    { code: "ASME B31.3 Table A-1B", type: "Double Butt Welded Pipe (EFW)", value: 0.95, label: "Double Butt Welded (0.95)" },
    { code: "ASME B31.3 Table A-1B", type: "Double Butt Welded with Spot RT", value: 0.90, label: "Spot RT (0.90)" },
    { code: "ASME B31.3 Table A-1B / Sec VIII UW-12", type: "Electric Resistance Welded (ERW) / Spot RT", value: 0.85, label: "ERW Not RT (0.85)" },
    { code: "ASME B31.3 Table A-1B", type: "Single Butt Welded Seam", value: 0.80, label: "Single Butt Seam (0.80)" },
    { code: "ASME Sec VIII Div. 1 UW-12", type: "Double-Welded Butt Joint (No RT)", value: 0.70, label: "Double-Welded No RT (0.70)" },
    { code: "ASME B31.3 Table A-1B", type: "Furnace Butt Welded (Continuous Weld)", value: 0.60, label: "Furnace Butt Welded (0.60)" }
  ],
  millToleranceMap: {
    "A53": { type: "%", value: 12.5 },
    "A106": { type: "%", value: 12.5 },
    "A134": { type: "%", value: 12.5 },
    "A135/A135M": { type: "%", value: 12.5 },
    "A312/A312M": { type: "%", value: 12.5 },
    "A335/A335M": { type: "%", value: 12.5 },
    "A358/A358M": { type: "mm", value: 0.3 },
    "A409/A409M": { type: "mm", value: 0.46 },
    "A451/A451M": { type: "mm", value: 0.3 },
    "A524": { type: "%", value: 12.5 },
    "A530/A530M": { type: "%", value: 12.5 },
    "A587": { type: "%", value: 12.5 },
    "A600/A600M": { type: "%", value: 12.5 },
    "A671/A671M": { type: "mm", value: 0.3 },
    "A672/A672M": { type: "mm", value: 0.3 },
    "A691/A691M": { type: "mm", value: 0.3 },
    "A731/A731M": { type: "%", value: 12.5 },
    "A790/A790M": { type: "%", value: 12.5 },
    "IS-3589 (SAW & Seamless Pipe)": { type: "%", value: 12.5 },
    "IS-3589 (ERW Pipe)": { type: "%", value: 10 },
    "IS-1239 (Welded: Light Tubes)": { type: "%", value: 8 },
    "IS-1239 (Welded: Medium/Heavy)": { type: "%", value: 10 },
    "IS-1239 (Seamless)": { type: "%", value: 12.5 }
  },
  standardWallThicknessByOD: {
    "10.3": 1.73,
    "13.7": 2.24,
    "17.1": 2.31,
    "21.3": 2.77,
    "26.7": 2.87,
    "33.4": 3.38,
    "42.2": 3.56,
    "48.3": 3.68,
    "60.3": 3.91,
    "73.0": 5.16,
    "88.9": 5.49,
    "101.6": 5.74,
    "114.3": 6.02,
    "141.3": 6.55,
    "168.3": 7.11,
    "219.1": 8.18,
    "273.0": 9.27,
    "323.9": 9.53,
    "355.6": 9.53,
    "406.4": 9.53,
    "457.0": 9.53,
    "508.0": 9.53,
    "559.0": 9.53,
    "610.0": 9.53,
    "660.4": 9.53,
    "711.2": 9.53,
    "762.0": 9.53,
    "812.8": 9.53,
    "863.6": 9.53,
    "914.4": 9.53,
    "965.2": 9.53,
    "1016.0": 9.53,
    "1066.8": 9.53,
    "1117.6": 9.53,
    "1168.4": 9.53,
    "1219.2": 9.53
  },
  simpleStructuralThresholds: {
    low: [
      { maxNps: 1, t_struct: 1.8, t_alert: 2.0 },
      { maxNps: 2, t_struct: 1.8, t_alert: 2.5 },
      { maxNps: 3, t_struct: 2.0, t_alert: 2.8 },
      { maxNps: 4, t_struct: 2.3, t_alert: 3.1 },
      { maxNps: 18, t_struct: 2.8, t_alert: 3.3 },
      { maxNps: 24, t_struct: 3.1, t_alert: 3.6 },
      { maxNps: 999, t_struct: 3.5, t_alert: 4.0 }
    ],
    high: [
      { maxNps: 1, t_struct: 2.0, t_alert: 2.3 },
      { maxNps: 2, t_struct: 2.0, t_alert: 2.8 },
      { maxNps: 3, t_struct: 2.3, t_alert: 3.1 },
      { maxNps: 4, t_struct: 2.8, t_alert: 3.5 },
      { maxNps: 18, t_struct: 3.1, t_alert: 3.8 },
      { maxNps: 24, t_struct: 3.5, t_alert: 4.2 },
      { maxNps: 999, t_struct: 4.0, t_alert: 4.5 }
    ]
  }
};

async function seedPhase2() {
  console.log("=== Starting Phase 2 Firestore Migration & Reconciliation ===");
  const db = getAdminFirestore();

  const secureDir = path.resolve(__dirname, "../data/secure");
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }

  // 1. Write local fallback file data/secure/pipe_dimensions.json
  const pipeDimPath = path.join(secureDir, "pipe_dimensions.json");
  fs.writeFileSync(pipeDimPath, JSON.stringify(ASME_PIPE_DIMENSIONS, null, 2), "utf8");
  console.log(`✅ Saved local fallback ${pipeDimPath}`);

  // 2. Seed Firestore collection 'pipeDimensions'
  // Document 1: Master catalog 'asme_b36_10m_19m'
  await db.collection("pipeDimensions").doc("asme_b36_10m_19m").set({
    ...ASME_PIPE_DIMENSIONS,
    updatedAt: Date.now()
  });
  console.log("✅ Uploaded master document: pipeDimensions/asme_b36_10m_19m");

  // Also seed individual NPS documents in 'pipeDimensions' for indexed per-NPS queries
  let npsCount = 0;
  for (const nps of ASME_PIPE_DIMENSIONS.npsList) {
    const dec = ASME_PIPE_DIMENSIONS.decimalMap[nps] || nps;
    const docId = `nps_${String(dec).replace(/\./g, "_")}`;
    const od_mm = Number(ASME_PIPE_DIMENSIONS.pipeOD[nps]);
    const od_in = Number((od_mm / 25.4).toFixed(4));
    const schedules = ASME_PIPE_DIMENSIONS.pipeDataMaster[nps] || {};
    await db.collection("pipeDimensions").doc(docId).set({
      nps,
      npsDecimal: parseFloat(dec),
      od_mm,
      od_in,
      schedules,
      scheduleList: Object.keys(schedules),
      standard: "ASME B36.10M / ASME B36.19M",
      updatedAt: Date.now()
    });
    npsCount++;
  }
  console.log(`✅ Uploaded ${npsCount} individual indexed NPS documents to 'pipeDimensions' collection.`);

  // 3. Seed Firestore collection 'b313Catalog'
  await db.collection("b313Catalog").doc("asme_b313_tables").set(ASME_B313_CATALOG);
  console.log("✅ Uploaded ASME B31.3 & ASME VIII tables to: b313Catalog/asme_b313_tables");

  // 4. Reconcile 'stressData' collection from Firestore and sync local fallback data/secure/bk_stress.json
  const stressSnap = await db.collection("stressData").get();
  const stressTree = {};
  stressSnap.forEach(docSnap => {
    const d = docSnap.data();
    const yr = d.year || docSnap.id;
    if (d.materials && typeof d.materials === "object") {
      stressTree[yr] = d.materials;
    }
  });
  const years = Object.keys(stressTree).sort();
  console.log(`✅ Verified Firestore 'stressData' collection: ${years.length} code editions (${years.join(", ")})`);

  if (years.length > 0) {
    const stressBackupPath = path.join(secureDir, "bk_stress.json");
    fs.writeFileSync(stressBackupPath, JSON.stringify(stressTree, null, 2), "utf8");
    console.log(`✅ Synchronized local fallback ${stressBackupPath} with live Firestore 'stressData' (${years.length} years).`);
  }

  // 5. Update systemMeta/pipeDimensionsMaster
  await db.collection("systemMeta").doc("pipeDimensionsMaster").set({
    standard: "ASME B36.10M / ASME B36.19M",
    totalNpsSizes: ASME_PIPE_DIMENSIONS.npsList.length,
    npsList: ASME_PIPE_DIMENSIONS.npsList,
    updatedAt: Date.now(),
    status: "synced"
  });
  console.log("✅ Updated systemMeta/pipeDimensionsMaster");

  console.log("=== Phase 2 Firestore Migration Completed Successfully! ===");
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  seedPhase2().catch(err => {
    console.error("Seed Phase 2 failed:", err);
    process.exit(1);
  });
}
