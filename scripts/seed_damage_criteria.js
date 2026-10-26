/**
 * API 571 Damage Criteria & Lookup Reference Catalog Seeder
 * Populates Firestore collection 'damageCriteria' with:
 * - Table 3-27-1: Erosion / Erosion-Corrosion velocity rates
 * - Cracking Mechanism decision rules (Wet H2S, Cl-SCC, Caustic, Amine, PTA)
 * - Screening threshold limits and metallurgical boundaries
 */

import { getAdminFirestore } from "../api/firebaseAdmin.js";
import { getActiveProjectConfig } from "../api/firestoreClient.js";

export const API571_TABLE_3_27_1 = {
  "Carbon steel": { fps1: 1.0, fps4: 4.0, fps27: 27.0 },
  "Cast iron": { fps1: 1.0, fps4: 3.5, fps27: 25.0 },
  "Silicon bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Admiralty brass": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Hydraulic bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "G bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Al bronze": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Aluminum brass": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "90-10 Cu-Ni": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "70-30 Cu-Ni (0.05 %Fe)": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "70-30 Cu-Ni (0.5 % Fe)": { fps1: 0.5, fps4: 2.0, fps27: 15.0 },
  "Alloy 400": { fps1: 0.1, fps4: 1.0, fps27: 5.0 },
  "316 SS": { fps1: 0.1, fps4: 1.0, fps27: 5.0 },
  "Alloy C-276": { fps1: 0.1, fps4: 0.5, fps27: 2.0 },
  "Titanium": { fps1: 0.05, fps4: 0.2, fps27: 1.0 }
};

export const CRACKING_MECHANISM_RULES = [
  {
    priority: 1,
    mechanism: "Wet H2S (Blistering, SOHIC, HIC, SSC)",
    category: "Environmental Cracking",
    code: "2",
    rules: [
      {
        potential: "H",
        conditions: { minH2S: 50, freeH2O: "yes", pwht: "no", custom: "hcn > 20 || ph < 5.5" }
      },
      {
        potential: "M",
        conditions: { minH2S: 50, freeH2O: "yes", pwht: "yes", custom: "hcn > 20 || ph < 5.5" }
      },
      {
        potential: "L",
        conditions: { minH2S: 20, maxH2S: 50, freeH2O: "yes", pwht: "yes" }
      }
    ]
  },
  {
    priority: 2,
    mechanism: "Chloride Stress Corrosion Cracking (Cl SCC)",
    category: "Environmental Cracking",
    code: "15",
    rules: [
      {
        potential: "H",
        conditions: { minChloride: 50, minTempF: 140, minOxygen: 10 }
      },
      {
        potential: "M",
        conditions: { minChloride: 25, maxChloride: 50, maxOxygen: 10, minTempF: 140 }
      },
      {
        potential: "L",
        conditions: { minChloride: 5, maxChloride: 25, maxOxygen: 0.1, minPh: 9, minTempF: 120 }
      }
    ]
  },
  {
    priority: 3,
    mechanism: "Caustic Cracking",
    category: "Environmental Cracking",
    code: "24",
    rules: [
      {
        potential: "H",
        conditions: { materials: ["carbon steel", "300 series ss"], minTempF: 200, pwht: "no" }
      },
      {
        potential: "M",
        conditions: { materials: ["carbon steel"], maxTempF: 200, maxCaustic: 30, pwht: "yes" }
      },
      {
        potential: "L",
        conditions: { custom: "(temp < 110 && caustic <= 50) || (temp < 150 && caustic > 0)" }
      }
    ]
  },
  {
    priority: 4,
    mechanism: "Amine Cracking (ASCC)",
    category: "Environmental Cracking",
    code: "43",
    rules: [
      {
        potential: "H",
        conditions: {
          materials: ["carbon steel"],
          pwht: "no",
          custom: "amineType === 'mea' || ((amineType === 'dea' || amineType === 'mdea') && temp > 140)"
        }
      },
      {
        potential: "M",
        conditions: {
          materials: ["carbon steel"],
          pwht: "no",
          minTempF: 125,
          maxTempF: 150
        }
      },
      {
        potential: "L",
        conditions: {
          materials: ["carbon steel"],
          pwht: "yes"
        }
      }
    ]
  },
  {
    priority: 5,
    mechanism: "Polythionic Acid SCC (PTA)",
    category: "Environmental Cracking",
    code: "5",
    rules: [
      {
        potential: "H",
        conditions: { scale: "yes", minTempF: 800, stability: "upset" }
      },
      {
        potential: "M",
        conditions: { scale: "yes", stability: "upset" }
      },
      {
        potential: "L",
        conditions: { scale: "yes", stability: "stable" }
      }
    ]
  }
];

export const SCREENING_LIMITS = {
  sulfidation: { minTempC: 230, minTempF: 450, h2Free: true },
  h2h2s: { minTempC: 230, minTempF: 450, requiresH2: true, requiresH2S: true },
  htha: { minTempC: 204, minTempF: 400, minPpH2Psia: 50 },
  nh4hs: { precipitationMinTempC: 50, precipitationMaxTempC: 65, severeWtThreshold: 2.0 },
  cui: {
    cs: { minTempC: -12, maxTempC: 175 },
    ss300: { minTempC: 60, maxTempC: 175 },
    duplex: { minTempC: 140, maxTempC: 175 }
  },
  nh4cl: { minTempC: 110, maxTempC: 185 },
  dewpointHCl: { maxTempC: 135, criticalPh: 4.5 }
};

export async function seedDamageCriteria(targetDb = null) {
  const db = targetDb || getAdminFirestore();
  if (!db) {
    throw new Error("Unable to obtain Firestore database reference.");
  }
  const activeProj = getActiveProjectConfig();
  console.log(`[SeedCriteria] Seeding damageCriteria collection for project ${activeProj.projectId}...`);

  // 1. Seed Table 3-27-1
  await db.collection("damageCriteria").doc("api571_table_3_27_1").set({
    id: "api571_table_3_27_1",
    title: "API 571 Table 3-27-1 Erosion and Erosion-Corrosion Rates (mpy)",
    category: "Erosion Rates",
    data: API571_TABLE_3_27_1,
    source: "API RP 571 3rd Edition Section 3.27",
    updatedAt: Date.now(),
    updatedBy: "system_migration"
  }, { merge: true });

  // 2. Seed Cracking Mechanism Decision Rules
  await db.collection("damageCriteria").doc("cracking_mechanism_rules").set({
    id: "cracking_mechanism_rules",
    title: "API 571 Cracking Mechanism Finder Decision Rules",
    category: "Environmental Cracking Rules",
    rules: CRACKING_MECHANISM_RULES,
    source: "API RP 571 Environmental Assisted Cracking",
    updatedAt: Date.now(),
    updatedBy: "system_migration"
  }, { merge: true });

  // 3. Seed Screening Limits
  await db.collection("damageCriteria").doc("screening_limits").set({
    id: "screening_limits",
    title: "API 571 Screening Envelope Limits and Metallurgical Thresholds",
    category: "Screening Thresholds",
    limits: SCREENING_LIMITS,
    source: "API RP 571 / API RP 941",
    updatedAt: Date.now(),
    updatedBy: "system_migration"
  }, { merge: true });

  console.log("[SeedCriteria] Successfully seeded damageCriteria documents into Firestore!");
  return { success: true };
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith("seed_damage_criteria.js")) {
  seedDamageCriteria().then(() => {
    console.log("Seeding complete.");
    process.exit(0);
  }).catch(err => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
}
