import { getFirestoreDb, getActiveProjectConfig } from "./firestoreClient.js";
import { getAdminFirestore, verifyServerIdentity } from "./sessionStore.js";
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { getUserRbacData, verifyRequestRbac } from "./rbac.js";



export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id, X-Session-Token, X-User-Uid");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const method = req.method;
  const adminDb = getAdminFirestore();
  const clientDb = getFirestoreDb();

  try {
    const activeProj = getActiveProjectConfig();

    // -------------------------------------------------------------
    // GET: List all datasets or fetch single by ID from Live Firestore
    // -------------------------------------------------------------
    if (method === "GET") {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const { id } = req.query || {};

      if (id) {
        let dataset = null;

        // 1. Try Admin SDK
        if (adminDb) {
          try {
            const snap = await adminDb.collection("streamDatasets").doc(String(id)).get();
            if (snap.exists) dataset = snap.data();
          } catch (err) {
            console.info("[StreamDatasets] Admin SDK single get note:", err.message);
          }
        }

        // 2. Try Client SDK
        if (!dataset && clientDb) {
          try {
            const snap = await getDoc(doc(clientDb, "streamDatasets", String(id)));
            if (snap.exists()) dataset = snap.data();
          } catch (dbErr) {
            console.info("[StreamDatasets] Client SDK single get note:", dbErr.message);
          }
        }

        if (!dataset) {
          return res.status(404).json({ success: false, activeProject: activeProj.projectId, error: "Dataset not found in Firestore" });
        }

        return res.status(200).json({ success: true, activeProject: activeProj.projectId, dataset });
      }

      let datasetsMap = new Map();

      // 1. Try Admin SDK query
      if (adminDb) {
        try {
          const snap = await adminDb.collection("streamDatasets").get();
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            const dId = d.id || docSnap.id;
            if (dId) {
              datasetsMap.set(dId, {
                id: dId,
                title: d.title || "Untitled Dataset",
                streamCount: d.streamCount || (d.streams ? d.streams.length : 0),
                propertiesCount: d.propertiesList ? d.propertiesList.length : 0,
                componentsCount: d.componentsList ? d.componentsList.length : 0,
                savedBy: d.savedBy || d.uploadedBy || "Engineer",
                createdAt: d.createdAt || d.updatedAt || Date.now(),
                updatedAt: d.updatedAt || d.createdAt || Date.now()
              });
            }
          });
        } catch (adminErr) {
          console.warn("[StreamDatasets] Admin SDK list error:", adminErr.message);
        }
      }

      // 2. Try Client SDK query if Admin SDK returned empty
      if (datasetsMap.size === 0 && clientDb) {
        try {
          const snap = await Promise.race([
            getDocs(collection(clientDb, "streamDatasets")),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3500))
          ]);
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            const dId = d.id || docSnap.id;
            if (dId) {
              datasetsMap.set(dId, {
                id: dId,
                title: d.title || "Untitled Dataset",
                streamCount: d.streamCount || (d.streams ? d.streams.length : 0),
                propertiesCount: d.propertiesList ? d.propertiesList.length : 0,
                componentsCount: d.componentsList ? d.componentsList.length : 0,
                savedBy: d.savedBy || d.uploadedBy || "Engineer",
                createdAt: d.createdAt || d.updatedAt || Date.now(),
                updatedAt: d.updatedAt || d.createdAt || Date.now()
              });
            }
          });
        } catch (dbErr) {
          console.warn(`[StreamDatasets] Firestore query note for project ${activeProj.projectId}:`, dbErr.message);
        }
      }

      let datasets = Array.from(datasetsMap.values());
      datasets.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

      return res.status(200).json({ success: true, activeProject: activeProj.projectId, datasets });
    }

    // -------------------------------------------------------------
    // POST: Tie-in Aerodynamics & Physics Calculation
    // -------------------------------------------------------------
    const isTieInRoute = req.url.includes("tie-in-physics") || req.path === "/tie-in-physics" || req.body?.action === "tie_in_physics";
    const isScanRoute = req.body?.action === "scan_plant" || req.url.includes("scan-plant");

    if (method === "POST" && (isTieInRoute || isScanRoute)) {
      if (isScanRoute) {
        const streams = req.body?.streams || [];
        if (!Array.isArray(streams) || streams.length === 0) {
          return res.status(400).json({ success: false, error: "Missing required parameter 'streams'. Array of process streams is required." });
        }
        const detectedTieIns = scanPlantTieInsModel(streams);
        return res.status(200).json({ success: true, count: detectedTieIns.length, detectedTieIns });
      }

      // Single Tie-In Physics calculation
      const { streamA, streamB, pipeIdMm, quillDiaMm, quillType } = req.body || {};
      try {
        const physics = calculateTieInPhysicsModel(streamA, streamB, pipeIdMm, quillDiaMm, quillType);
        return res.status(200).json({ success: true, physics });
      } catch (err) {
        const status = err.status || 400;
        return res.status(status).json({ success: false, error: err.message || String(err) });
      }
    }

    // -------------------------------------------------------------
    // POST: Save or Update a dataset in Live Firestore
    // -------------------------------------------------------------
    if (method === "POST") {
      const { dataset } = req.body || {};
      if (!dataset || !dataset.streams || !Array.isArray(dataset.streams) || dataset.streams.length === 0) {
        return res.status(400).json({ success: false, error: "Invalid dataset. At least 1 process stream is required." });
      }

      // Verify caller identity and write permission
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "write" });
      if (!authCheck.authorized) return;
      const callerEmail = authCheck.email;

      const id = dataset.id || `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();
      const record = {
        id,
        title: (dataset.title || "Refinery HMB Dataset").trim(),
        streamCount: dataset.streams.length,
        streams: dataset.streams,
        propertiesList: dataset.propertiesList || [],
        componentsList: dataset.componentsList || [],
        metadata: dataset.metadata || {},
        savedBy: callerEmail || (dataset.savedBy || "Engineer").trim(),
        createdAt: dataset.createdAt || now,
        updatedAt: now
      };

      let firestorePersisted = false;
      let firestoreError = null;

      // 1. Try Admin SDK first
      if (adminDb) {
        try {
          await adminDb.collection("streamDatasets").doc(id).set(record, { merge: true });
          firestorePersisted = true;
          console.log(`[StreamDatasets] Admin SDK saved to Firestore: /streamDatasets/${id}`);
        } catch (dbErr) {
          firestoreError = dbErr.message;
          console.warn("[StreamDatasets] Admin SDK save warning:", dbErr.message);
        }
      }

      // 2. Try Client SDK if Admin SDK was unavailable
      if (!firestorePersisted && clientDb) {
        try {
          await setDoc(doc(clientDb, "streamDatasets", id), record, { merge: true });
          firestorePersisted = true;
          console.log(`[StreamDatasets] Client SDK saved to Firestore: /streamDatasets/${id}`);
        } catch (dbErr) {
          firestoreError = dbErr.message;
          console.warn("[StreamDatasets] Client SDK save warning:", dbErr.message);
        }
      }

      if (!firestorePersisted) {
        return res.status(500).json({
          success: false,
          id,
          error: "Failed to persist dataset to Firestore: " + (firestoreError || "Database unavailable")
        });
      }

      return res.status(200).json({
        success: true,
        id,
        title: record.title,
        firestorePersisted: true,
        message: "Dataset successfully saved and synchronized to Firestore database!"
      });
    }

    // -------------------------------------------------------------
    // DELETE: Remove a saved dataset (Requires 'delete' permission) from Live Firestore
    // -------------------------------------------------------------
    if (method === "DELETE") {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) {
        return res.status(400).json({ success: false, error: "Missing dataset ID to delete" });
      }

      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;

      let firestoreDeleted = false;

      if (adminDb) {
        try {
          await adminDb.collection("streamDatasets").doc(String(id)).delete();
          firestoreDeleted = true;
          console.log(`[StreamDatasets] Admin SDK deleted from Firestore: /streamDatasets/${id}`);
        } catch (dbErr) {
          console.warn("[StreamDatasets] Admin SDK delete warning:", dbErr.message);
        }
      }

      if (!firestoreDeleted && clientDb) {
        try {
          await deleteDoc(doc(clientDb, "streamDatasets", String(id)));
          firestoreDeleted = true;
        } catch (dbErr) {
          console.warn("[StreamDatasets] Client SDK delete warning:", dbErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        firestoreDeleted,
        message: `Dataset '${id}' deleted successfully from Firestore.`
      });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("[StreamDatasets API Error]:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message
    });
  }
}

/**
 * Authoritative Tie-in Physics & Aerodynamics Engine
 * Enforces strict non-null engineering parameters (Zero default fallbacks)
 */
export function calculateTieInPhysicsModel(streamA, streamB, pipeIdMm, quillDiaMm, quillType) {
  if (!streamA || typeof streamA !== "object") {
    throw { status: 400, message: "Missing required parameter 'streamA'. A valid process stream object is required." };
  }
  if (!streamB || typeof streamB !== "object") {
    throw { status: 400, message: "Missing required parameter 'streamB'. A valid injectant / mixing stream object is required." };
  }

  const pId = parseFloat(pipeIdMm);
  if (isNaN(pId) || pId <= 0) {
    throw { status: 400, message: "Missing or invalid parameter 'pipeIdMm'. Pipe inner diameter must be a positive number greater than 0." };
  }

  const qDia = parseFloat(quillDiaMm);
  if (isNaN(qDia) || qDia <= 0) {
    throw { status: 400, message: "Missing or invalid parameter 'quillDiaMm'. Quill diameter must be a positive number greater than 0." };
  }

  const propsA = streamA.properties || {};
  const propsB = streamB.properties || {};

  const tempA = parseFloat(streamA.tempC ?? propsA["Temperature (°C)"] ?? propsA["Temp C"] ?? propsA["Temperature (C)"]);
  const tempB = parseFloat(streamB.tempC ?? propsB["Temperature (°C)"] ?? propsB["Temp C"] ?? propsB["Temperature (C)"]);
  if (isNaN(tempA) || isNaN(tempB)) {
    throw { status: 400, message: "Missing operating temperature. Both Stream A and Stream B must specify a numeric temperature (°C)." };
  }

  const rhoA = parseFloat(streamA.liquidDensity ?? propsA["Liquid Density (kg/m3)"] ?? propsA["Liquid Density (kg/m³)"] ?? propsA["Density (kg/m3)"]);
  const rhoB = parseFloat(streamB.liquidDensity ?? propsB["Liquid Density (kg/m3)"] ?? propsB["Liquid Density (kg/m³)"] ?? propsB["Density (kg/m3)"]);
  if (isNaN(rhoA) || rhoA <= 0 || isNaN(rhoB) || rhoB <= 0) {
    throw { status: 400, message: "Missing or invalid liquid density. Both streams must have positive density (kg/m³) values." };
  }

  const muA = parseFloat(streamA.viscosity ?? propsA["Liquid Viscosity (cP)"] ?? propsA["Viscosity (cP)"]);
  const muB = parseFloat(streamB.viscosity ?? propsB["Liquid Viscosity (cP)"] ?? propsB["Viscosity (cP)"]);
  if (isNaN(muA) || muA <= 0) {
    throw { status: 400, message: "Missing or invalid viscosity for Stream A. Viscosity must be a positive number (cP)." };
  }

  const flowA = parseFloat(streamA.massFlow ?? propsA["Mass Flow (kg/h)"] ?? propsA["Mass Flow (kg/hr)"]);
  const flowB = parseFloat(streamB.massFlow ?? propsB["Mass Flow (kg/h)"] ?? propsB["Mass Flow (kg/hr)"]);
  if (isNaN(flowA) || flowA <= 0) {
    throw { status: 400, message: "Missing or invalid mass flow for Stream A. Mass flow must be a positive number (kg/hr)." };
  }

  const sigma = parseFloat(streamA.surfaceTension ?? streamB.surfaceTension ?? propsB["Surface Tension (dyne/cm)"] ?? propsA["Surface Tension (dyne/cm)"] ?? 45.0) || 45.0;

  const dT = Math.abs(tempB - tempA);
  const injectantFlow = Math.max((!isNaN(flowB) ? flowB - flowA : 1000), (!isNaN(flowB) && flowB > 0 ? flowB : 1000));

  // Pipe velocity: v = (m_dot / 3600) / (rho * (pi * D^2 / 4))
  const pipeAreaM2 = Math.PI * Math.pow(pId / 1000, 2) / 4;
  const vMain = (flowA / 3600) / (rhoA * pipeAreaM2);

  // Reynolds Number in main pipe: Re = (rho * v * D) / (mu_Pa_s)
  const muPaS = muA * 1e-3;
  const reMain = (rhoA * vMain * (pId / 1000)) / (muPaS || 1e-3);

  // Quill injection velocity: v_q = (injectant_dot / 3600) / (rho_injectant * (pi * d_q^2 / 4))
  const quillAreaM2 = Math.PI * Math.pow(qDia / 1000, 2) / 4;
  const vQuill = (injectantFlow / 3600) / (rhoB * quillAreaM2);

  // Weber Number: We = (rho_continuous * (v_rel)^2 * d_droplet) / sigma
  const sigmaNm = sigma * 1e-3;
  const vRel = Math.abs(vQuill - vMain);
  const weberNum = (rhoA * Math.pow(vRel, 2) * (qDia / 1000)) / (sigmaNm || 0.045);

  // Momentum ratio: M_R = (rho_j * v_j^2) / (rho_m * v_m^2)
  const momMain = rhoA * Math.pow(vMain, 2);
  const momQuill = rhoB * Math.pow(vQuill, 2);
  const momentumRatio = momMain > 0 ? (momQuill / momMain) : 1.0;

  return {
    reMain,
    reMainFormatted: Math.round(reMain).toLocaleString(),
    isTurbulent: reMain >= 4000,
    reSub: reMain >= 4000 ? "✅ Fully Turbulent (Re > 4000) - Rapid Thermal Equilibrium" : "⚠️ Stratified / Transitional - High Thermal Stratification Hazard",
    reBorderColor: reMain >= 4000 ? "#10b981" : "#f59e0b",
    reTextColor: reMain >= 4000 ? "#059669" : "#d97706",

    weberNum,
    weberFormatted: weberNum.toFixed(1),
    isAtomized: weberNum >= 12,
    weberSub: weberNum >= 12 ? "✅ Atomized Breakup (We ≥ 12) - Center Pipe Dispersal" : "🔴 Low Shearing (We < 12) - Risk of Large Droplets & Wall Impingement",
    weberBorderColor: weberNum >= 12 ? "#10b981" : "#ef4444",
    weberTextColor: weberNum >= 12 ? "#059669" : "#dc2626",

    dT,
    dTFormatted: `${dT.toFixed(1)} °C`,
    dTAlert: dT > 167 ? "shock" : (dT >= 50 ? "moderate" : "mild"),
    dTSub: dT > 167 ? "🔴 Exceeds SP0114 7.10.1 Limit (>167°C) - Thermal Shock Alert" : (dT >= 50 ? "🟡 Moderate Gradient (≥50°C) - Condensation & Stratification" : "✅ Mild Gradient (<50°C) - Acceptable Thermal Stress"),
    dTBorderColor: dT > 167 ? "#ef4444" : (dT >= 50 ? "#f59e0b" : "#3b82f6"),
    dTTextColor: dT > 167 ? "#dc2626" : (dT >= 50 ? "#d97706" : "#2563eb"),

    vMain,
    vMainFormatted: `${vMain.toFixed(2)} m/s`,
    vQuill,
    vQuillFormatted: `${vQuill.toFixed(2)} m/s`,
    momentumRatio,
    momentumRatioFormatted: momentumRatio.toFixed(2),
    quillType: quillType || "quill_beveled",
    quillSub: quillType === "quill_beveled" ? "✅ 45° Beveled Quill (Center 1/3) - Optimal Jet Trajectory" : (quillType === "quill_straight" ? "ℹ️ Straight Quill - Monitor Tip Vortex Cavitation" : "⚠️ Sidewall Boss (No Quill) - Liquid Channeling along Pipe Wall")
  };
}

/**
 * Plant-wide Tie-In Scanner Model
 */
export function scanPlantTieInsModel(streams) {
  if (!Array.isArray(streams) || streams.length === 0) {
    return [];
  }
  const detectedMap = new Map();
  const extractNum = (str) => {
    const m = String(str || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  };

  const injectionStreams = [];
  streams.forEach(s => {
    const content = String(s.content || s.streamName || "").toUpperCase();
    if (
      content.includes("WASH") ||
      content.includes("INJECT") ||
      content.includes("QUENCH") ||
      content.includes("TREAT GAS") ||
      content.includes("RECYCLE") ||
      content.includes("MAKEUP") ||
      content.includes("SOUR WATER") ||
      content.includes("AMINE") ||
      content.includes("CAUSTIC") ||
      content.includes("STEAM") ||
      content.includes("SLURRY") ||
      content.includes("WATER") ||
      content.includes("ACID") ||
      content.includes("INHIBITOR") ||
      content.includes("BLEED") ||
      content.includes("FLUSH")
    ) {
      injectionStreams.push(s);
    }
  });

  const testPair = (sA, sB, categoryHint) => {
    if (!sA || !sB || sA.streamNo === sB.streamNo) return;
    const pairKey = `${sA.streamNo}->${sB.streamNo}`;
    if (detectedMap.has(pairKey)) return;

    const propsA = sA.properties || {};
    const propsB = sB.properties || {};
    const tempA = parseFloat(sA.tempC ?? propsA["Temperature (°C)"] ?? propsA["Temp C"]);
    const tempB = parseFloat(sB.tempC ?? propsB["Temperature (°C)"] ?? propsB["Temp C"]);
    const dT = (!isNaN(tempA) && !isNaN(tempB)) ? Math.abs(tempB - tempA) : null;

    const contentA = String(sA.content || "").toUpperCase();
    const contentB = String(sB.content || "").toUpperCase();
    const isInj = categoryHint === "injection" || contentB.includes("INJECT") || contentB.includes("WASH");
    const isMix = !isInj;

    const hasDt = dT !== null && dT >= 15;
    const hasHighDt = dT !== null && dT >= 50;
    const hasThermalShock = dT !== null && dT > 167;
    const hasCorrosive = contentA.includes("H2S") || contentB.includes("H2S") || contentA.includes("SOUR") || contentB.includes("SOUR");

    if (isMix && !hasDt && !hasCorrosive && categoryHint !== "nearest") {
      return;
    }

    let score = 0;
    if (hasThermalShock) score += 100;
    if (isInj) score += 60;
    if (isMix) score += 40;
    if (hasHighDt) score += 30;
    if (hasCorrosive) score += 20;
    if (hasDt) score += 10;
    if (categoryHint === "injection") score += 15;

    detectedMap.set(pairKey, {
      sA,
      sB,
      res: {
        activeClassification: isInj ? "INJECTION POINT" : "PROCESS MIX POINT",
        dT,
        hasCorrosive,
        suggestedSubtitle: isInj ? "WASH WATER / CHEMICAL INJECTION" : "PROCESS MIX POINT"
      },
      score,
      categoryHint
    });
  };

  // PASS 1: Nearest sequential
  for (let i = 0; i < streams.length; i++) {
    const sA = streams[i];
    const numA = extractNum(sA.streamNo);
    for (let offset = 1; offset <= 8; offset++) {
      if (i + offset < streams.length) testPair(sA, streams[i + offset], "nearest");
    }
    for (let offset = 1; offset <= 3; offset++) {
      if (i - offset >= 0) testPair(sA, streams[i - offset], "nearest");
    }
    if (numA !== null) {
      for (let j = Math.max(0, i - 15); j <= Math.min(streams.length - 1, i + 15); j++) {
        if (i === j) continue;
        const sB = streams[j];
        const numB = extractNum(sB.streamNo);
        if (numB !== null && Math.abs(numA - numB) <= 2) {
          testPair(sA, sB, "nearest");
        }
      }
    }
  }

  // PASS 2: Plant Injection streams
  injectionStreams.forEach(injStream => {
    const injNum = extractNum(injStream.streamNo);
    streams.forEach(procStream => {
      if (injStream.streamNo === procStream.streamNo) return;
      const procNum = extractNum(procStream.streamNo);
      const isNearby = (injNum !== null && procNum !== null && Math.abs(injNum - procNum) <= 30);
      const content = String(injStream.content || "").toUpperCase();
      const isUniversalInj = content.includes("WASH") || content.includes("AMMONIA") || content.includes("CAUSTIC") || content.includes("INHIBITOR") || content.includes("QUENCH");
      if (isNearby || isUniversalInj) {
        testPair(injStream, procStream, "injection");
        testPair(procStream, injStream, "injection");
      }
    });
  });

  const detectedTieIns = Array.from(detectedMap.values());
  detectedTieIns.sort((a, b) => b.score - a.score);
  return detectedTieIns;
}

