import { getAdminFirestore } from "./firebaseAdmin.js";
import { verifyRequestRbac } from "./rbac.js";

/**
 * Format Date as dd-mm-yyyy
 */
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Robust Multi-Format Inspection Date Parser with Disambiguation & Validation
 */
function parseInspectionDate(value) {
  if (!value) throw new Error("Missing inspection date value.");
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  // Numeric Excel serial number
  if (!isNaN(value) && value !== "") {
    const parsed = new Date((Number(value) - 25569) * 86400 * 1000 + (new Date().getTimezoneOffset() * 60000));
    if (isNaN(parsed.getTime())) throw new Error(`Invalid Excel date serial: ${value}`);
    return parsed;
  }

  if (typeof value === "string") {
    const clean = value.trim();
    // ISO format YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
      const yyyy = parseInt(isoMatch[1], 10);
      const mm = parseInt(isoMatch[2], 10) - 1;
      const dd = parseInt(isoMatch[3], 10);
      const parsed = new Date(yyyy, mm, dd);
      if (isNaN(parsed.getTime()) || parsed.getFullYear() !== yyyy || parsed.getMonth() !== mm || parsed.getDate() !== dd) {
        throw new Error(`Invalid ISO calendar date: ${value}`);
      }
      return parsed;
    }

    // Split by separator [-/.]
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3) {
      let p1 = parseInt(parts[0], 10);
      let p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);
      const yyyy = p3 < 100 ? 2000 + p3 : p3;

      let dd, mm;
      // Disambiguation: if day > 12, strictly treat as DD-MM-YYYY (industrial standard)
      if (p1 > 12) {
        dd = p1;
        mm = p2 - 1;
      } else if (p2 > 12) {
        mm = p1 - 1;
        dd = p2;
      } else {
        // Both <= 12, default industrial standard DD-MM-YYYY
        dd = p1;
        mm = p2 - 1;
      }

      const parsed = new Date(yyyy, mm, dd);
      if (isNaN(parsed.getTime()) || parsed.getFullYear() !== yyyy || parsed.getMonth() !== mm || parsed.getDate() !== dd) {
        throw new Error(`Invalid calendar date: ${value}`);
      }
      return parsed;
    }

    const parsed = new Date(clean);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Unparseable inspection date string: ${value}`);
    }
    return parsed;
  }

  throw new Error(`Invalid inspection date type: ${typeof value}`);
}

function parseDDMMYYYY(value) {
  try {
    return parseInspectionDate(value);
  } catch (e) {
    return null;
  }
}

/**
 * Calculate precise difference in years, months, days
 */
function dateDiff(startDate, endDate) {
  const start = parseDDMMYYYY(startDate);
  const end = parseDDMMYYYY(endDate);

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

function sanitizePositiveNum(val) {
  if (val === null || val === undefined || val === "") return NaN;
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Core API 570 Corrosion & Remaining Life Calculation Engine
 * Supports:
 * 1) Direct Remaining Life Mode: { t_actual, t_required, cr, freq }
 * 2) Historical Thickness-Date Series Mode: { baseDate, baseThk, midDate, midThk, lastDate, lastThk, tmin, freq }
 */
function calculateCorrosionRow(row = {}) {
  const tagNumber = row.tagnumber || row["tag number"] || row.tag || row.tagNumber || "-";
  const daysInYear = 365.25;
  const msInYear = 1000 * 60 * 60 * 24 * daysInYear;

  const freqRaw = parseInt(row.freq, 10);
  const freq = Number.isFinite(freqRaw) && freqRaw > 0 ? freqRaw : 60;

  // Check if Direct Remaining Life Mode (t_actual, t_required, CR) is requested
  const directTActual = sanitizePositiveNum(row.t_actual);
  const directTReq = sanitizePositiveNum(row.t_required ?? row.tmin);
  const directCR = sanitizePositiveNum(row.cr ?? row.corrosionRate);

  if (!isNaN(directTActual) && !isNaN(directTReq) && !isNaN(directCR) && !row.basedate && !row.baseDate) {
    if (directTActual <= 0 || directTReq <= 0) {
      return { error: "Thickness values (t_actual, t_required) must be positive numbers.", tagNumber };
    }
    const ccr = Math.max(0, directCR);
    let remLifeYears = ccr > 0 ? (directTActual - directTReq) / ccr : 999;
    if (remLifeYears < 0 || !Number.isFinite(remLifeYears)) remLifeYears = 0;

    const refDate = parseDDMMYYYY(row.lastdate || row.lastDate) || new Date();
    const projDate = new Date(refDate);
    projDate.setDate(projDate.getDate() + Math.round(remLifeYears * daysInYear));

    const factorDate = new Date(refDate);
    factorDate.setDate(factorDate.getDate() + Math.round(remLifeYears * 0.5 * daysInYear));

    const intervalDate = new Date(refDate);
    intervalDate.setMonth(intervalDate.getMonth() + freq);

    let schedDate = intervalDate;
    if (projDate < schedDate) schedDate = projDate;
    if (factorDate < schedDate) schedDate = factorDate;

    const today = new Date();
    const estDiff = dateDiff(today, projDate);
    const factorDiff = dateDiff(today, factorDate);

    return {
      tagNumber,
      baseDate: "-",
      midDate: "-",
      lastDate: formatDate(refDate),
      baseThk: directTActual.toFixed(2),
      midThk: "-",
      lastThk: directTActual.toFixed(2),
      tmin: directTReq.toFixed(2),
      freq,
      controllingCorrosionRate: ccr.toFixed(4) + " mm/year",
      longTermCorrosionRate: ccr.toFixed(4) + " mm/year",
      shortTermCorrosionRate: ccr.toFixed(4) + " mm/year",
      weightedCorrosionRate: ccr.toFixed(4) + " mm/year",
      scheduledNextInspection: formatDate(schedDate),
      intervalNextInspection: formatDate(intervalDate),
      factorLifeDate: formatDate(factorDate),
      projectedTminDate: formatDate(projDate),
      estimatedLife: `${estDiff.years} Years, ${estDiff.months} Months, ${estDiff.days} Days`,
      factorLifeDuration: `${factorDiff.years} Years, ${factorDiff.months} Months, ${factorDiff.days} Days`,
      rawCalculations: {
        ltcr: ccr,
        stcr: ccr,
        weightedCr: ccr,
        ccr,
        remLifeYears: Number(remLifeYears.toFixed(4)),
        schedDateISO: schedDate.toISOString(),
        projDateISO: projDate.toISOString(),
        factorDateISO: factorDate.toISOString(),
        intervalDateISO: intervalDate.toISOString()
      },
      trendData: [
        { date: formatDate(refDate), thk: directTActual }
      ]
    };
  }

  const baseDate = parseDDMMYYYY(row.basedate || row.baseDate);
  const midDate = (row.middate || row.midDate) ? parseDDMMYYYY(row.middate || row.midDate) : null;
  const lastDate = parseDDMMYYYY(row.lastdate || row.lastDate);

  const baseThk = sanitizePositiveNum(row.basethk != null ? row.basethk : row.baseThk);
  const midThk = sanitizePositiveNum(row.midthk != null ? row.midthk : row.midThk);
  const lastThk = sanitizePositiveNum(row.lastthk != null ? row.lastthk : row.lastThk);
  const tmin = sanitizePositiveNum(row.tmin);

  if (
    isNaN(baseThk) || isNaN(lastThk) || isNaN(tmin) ||
    baseThk <= 0 || lastThk <= 0 || tmin <= 0 ||
    !baseDate || isNaN(baseDate.getTime()) ||
    !lastDate || isNaN(lastDate.getTime()) ||
    baseDate >= lastDate
  ) {
    return {
      error: "Invalid or missing base/last dates or thicknesses",
      tagNumber
    };
  }

  // Corrosion Rate Calculations (with zero-division guard)
  const totalTimeYears = (lastDate - baseDate) / msInYear;
  let ltcr = totalTimeYears > 0 ? (baseThk - lastThk) / totalTimeYears : 0;
  ltcr = ltcr < 0 || !Number.isFinite(ltcr) ? 0 : ltcr;

  let stcr = ltcr;
  if (midDate && !isNaN(midThk) && midThk > 0 && baseDate < midDate && midDate < lastDate) {
    const shortTimeYears = (lastDate - midDate) / msInYear;
    if (shortTimeYears > 0) {
      stcr = (midThk - lastThk) / shortTimeYears;
      stcr = stcr < 0 || !Number.isFinite(stcr) ? 0 : stcr;
    }
  }

  const weightedCr = (0.6 * stcr) + (0.4 * ltcr);
  const modelType = String(row.degradationModel || "controlling").toLowerCase();
  const ccr = modelType === "weighted" ? weightedCr : Math.max(ltcr, stcr);

  let remLifeYears = ccr > 0 ? (lastThk - tmin) / ccr : 999;
  if (remLifeYears < 0 || !Number.isFinite(remLifeYears)) remLifeYears = 0;

  const projDate = new Date(lastDate);
  const projDaysToAdd = Math.round(remLifeYears * daysInYear);
  projDate.setDate(projDate.getDate() + projDaysToAdd);

  const factorDate = new Date(lastDate);
  const factorDaysToAdd = Math.round(remLifeYears * 0.5 * daysInYear);
  factorDate.setDate(factorDate.getDate() + factorDaysToAdd);

  const intervalDate = new Date(lastDate);
  intervalDate.setMonth(intervalDate.getMonth() + freq);

  let schedDate = intervalDate;
  if (projDate < schedDate) schedDate = projDate;
  if (factorDate < schedDate) schedDate = factorDate;

  const today = new Date();
  const estDiff = dateDiff(today, projDate);
  const factorDiff = dateDiff(today, factorDate);

  return {
    tagNumber,
    baseDate: formatDate(baseDate),
    midDate: midDate ? formatDate(midDate) : "-",
    lastDate: formatDate(lastDate),
    baseThk: baseThk.toFixed(2),
    midThk: !isNaN(midThk) ? midThk.toFixed(2) : "-",
    lastThk: lastThk.toFixed(2),
    tmin: tmin.toFixed(2),
    freq,
    controllingCorrosionRate: ccr.toFixed(4) + " mm/year",
    longTermCorrosionRate: ltcr.toFixed(4) + " mm/year",
    shortTermCorrosionRate: stcr.toFixed(4) + " mm/year",
    weightedCorrosionRate: weightedCr.toFixed(4) + " mm/year",
    scheduledNextInspection: formatDate(schedDate),
    intervalNextInspection: formatDate(intervalDate),
    factorLifeDate: formatDate(factorDate),
    projectedTminDate: formatDate(projDate),
    estimatedLife: `${estDiff.years} Years, ${estDiff.months} Months, ${estDiff.days} Days`,
    factorLifeDuration: `${factorDiff.years} Years, ${factorDiff.months} Months, ${factorDiff.days} Days`,
    rawCalculations: {
      ltcr,
      stcr,
      weightedCr,
      ccr,
      remLifeYears,
      schedDateISO: schedDate.toISOString(),
      projDateISO: projDate.toISOString(),
      factorDateISO: factorDate.toISOString(),
      intervalDateISO: intervalDate.toISOString()
    },
    trendData: [
      { date: formatDate(baseDate), thk: baseThk },
      ...(midDate && !isNaN(midThk) ? [{ date: formatDate(midDate), thk: midThk }] : []),
      { date: formatDate(lastDate), thk: lastThk }
    ]
  };
}

/**
 * Load / Save helper for Analyses Database with Firestore persistence
 */
async function getSavedAnalyses() {
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await Promise.race([
        adminDb.collection("analyses").get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout reading analyses")), 4000))
      ]);
      if (snap && !snap.empty) {
        const list = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        return list;
      }
    }
  } catch (fsErr) {
    console.warn("Firestore analyses fetch note in remaining.js:", fsErr?.message || String(fsErr));
  }
  return [];
}

async function writeSavedAnalyses(data) {
  try {
    const adminDb = getAdminFirestore();
    if (adminDb && Array.isArray(data)) {
      for (const item of data) {
        if (!item) continue;
        const tag = (item.tagNumber || `ANALYSIS_${Date.now()}`).replace(/[\/\s#]/g, "_");
        await adminDb.collection("analyses").doc(tag).set(item, { merge: true });
      }
    }
  } catch (fsErr) {
    console.warn("Firestore analyses write note:", fsErr?.message || String(fsErr));
  }
}

async function deleteSavedAnalysis(tagOrIndex) {
  let existing = await getSavedAnalyses();
  let deletedTag = null;

  if (typeof tagOrIndex === "number" && tagOrIndex >= 0 && tagOrIndex < existing.length) {
    const [removed] = existing.splice(tagOrIndex, 1);
    deletedTag = removed?.tagNumber;
  } else if (typeof tagOrIndex === "string" && tagOrIndex) {
    deletedTag = tagOrIndex;
    existing = existing.filter(e => e.tagNumber?.toUpperCase() !== tagOrIndex.toUpperCase());
  }

  // Delete from Firestore
  if (deletedTag && deletedTag !== "-") {
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        const docId = deletedTag.replace(/[\/\s#]/g, "_");
        await adminDb.collection("analyses").doc(docId).delete();
      }
    } catch (fsErr) {
      console.warn("Firestore analysis deletion note:", fsErr?.message || String(fsErr));
    }
  }

  return existing;
}

async function clearAllSavedAnalyses() {
  // Delete all from Firestore
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection("analyses").get();
      for (const docSnap of snap.docs) {
        await adminDb.collection("analyses").doc(docSnap.id).delete();
      }
    }
  } catch (fsErr) {
    console.warn("Firestore clear-all note:", fsErr?.message || String(fsErr));
  }
}

/**
 * Primary Backend API Handler for Remaining Life & Corrosion Estimator
 */
export default async function handler(req, res) {
  const method = req.method;
  const action = req.query.action || req.body?.action || "calculate";

  try {
    // 1. Fetch Template & Schema Config from Live Firestore
    if (action === "template" || action === "config") {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        try {
          const docSnap = await adminDb.collection("systemMeta").doc("remainingLifeConfig").get();
          if (docSnap.exists) {
            return res.status(200).json(docSnap.data());
          }
        } catch (e) {}
      }
      return res.status(200).json({
        template: {
          headers: ["Tag Number", "BaseDate", "BaseThk", "MidDate", "MidThk", "LastDate", "LastThk", "Tmin", "Freq"],
          picklist: [
            ["Column Name", "Tag Number", "BaseDate", "BaseThk", "MidDate", "MidThk", "LastDate", "LastThk", "Tmin", "Freq"],
            ["Description / Format / Example", "Unique equipment tag (e.g., E-101, P-201A)", "Inspection date (format: dd-mm-yyyy)", "Base measured thickness (mm) e.g., 6.5", "Mid inspection date (optional, dd-mm-yyyy)", "Mid thickness (optional, mm)", "Last inspection date (format: dd-mm-yyyy)", "Last measured thickness (mm) e.g., 6.0", "Minimum allowable thickness (mm) e.g., 3.8", "Inspection frequency in months (e.g., 24)"]
          ]
        }
      });
    }

    // 2. Single Form Calculation
    if (action === "calculate" && (method === "POST" || method === "GET")) {
      const payload = method === "POST" ? (req.body?.row || req.body) : req.query;
      const result = calculateCorrosionRow(payload);
      return res.status(200).json(result);
    }

    // 3. Bulk Batch Calculation
    if (action === "calculate-bulk" && method === "POST") {
      const rows = req.body?.rows || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: "No rows provided for bulk calculation" });
      }

      const results = rows.map(r => calculateCorrosionRow(r));
      return res.status(200).json({ success: true, count: results.length, results });
    }

    // 4. Get Saved Analyses from Backend Storage
    if (action === "get-analyses" || (action === "saved" && method === "GET")) {
      const data = await getSavedAnalyses();
      return res.status(200).json(data);
    }

    // 5. Save Analysis Records (Single or Bulk - Requires Authentication + 'write' permission)
    if (action === "save" && method === "POST") {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "write" });
      if (!authCheck.authorized) return;

      const entriesToSave = Array.isArray(req.body?.data) ? req.body.data : [req.body?.data || req.body];
      const overwrite = req.body?.overwrite === true;
      const existing = await getSavedAnalyses();

      const sanitized = entriesToSave.filter(Boolean).map(e => ({
        tagNumber: e.tagNumber || "-",
        ccr: e.ccr || e.controllingCorrosionRate || "-",
        ltcr: e.ltcr || e.longTermCorrosionRate || "-",
        stcr: e.stcr || e.shortTermCorrosionRate || "-",
        tminVal: e.tminVal || e.tmin || "-",
        remLife: e.remLife || e.estimatedLife || "-",
        schedDate: e.schedDate || e.scheduledNextInspection || "-",
        projDate: e.projDate || e.projectedTminDate || "-",
        savedBy: authCheck.email,
        savedAt: e.savedAt || new Date().toLocaleString()
      }));

      let added = 0;
      let updated = 0;

      sanitized.forEach(item => {
        if (item.tagNumber && item.tagNumber !== "-") {
          const idx = existing.findIndex(ex => ex.tagNumber?.toUpperCase() === item.tagNumber.toUpperCase());
          if (idx !== -1) {
            if (overwrite) {
              existing[idx] = item;
              updated++;
            }
          } else {
            existing.push(item);
            added++;
          }
        } else {
          existing.push(item);
          added++;
        }
      });

      await writeSavedAnalyses(existing);
      return res.status(200).json({
        success: true,
        message: "Analyses saved successfully to Firestore",
        total: existing.length,
        added,
        updated
      });
    }

    // 6. Delete Analysis Record (Requires Authentication + 'delete' permission)
    if (action === "delete" && (method === "DELETE" || method === "POST")) {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;

      const index = parseInt(req.body?.index ?? req.query.index, 10);
      const tag = req.body?.tag || req.query.tag;

      if (!isNaN(index) && index >= 0) {
        const remaining = await deleteSavedAnalysis(index);
        return res.status(200).json({ success: true, message: `Record at index ${index} deleted`, total: remaining.length });
      } else if (tag) {
        const remaining = await deleteSavedAnalysis(tag);
        return res.status(200).json({ success: true, message: `Record with tag ${tag} deleted`, total: remaining.length });
      }

      return res.status(400).json({ error: "Invalid index or tag provided for deletion" });
    }

    // 7. Clear All Analyses (Requires Authentication + 'delete' permission)
    if (action === "clear-all" && (method === "DELETE" || method === "POST")) {
      const authCheck = await verifyRequestRbac(req, res, { requiredPermission: "delete" });
      if (!authCheck.authorized) return;

      await clearAllSavedAnalyses();
      return res.status(200).json({ success: true, message: "All analyses cleared from Firestore", total: 0 });
    }

    return res.status(400).json({ error: "Unsupported action or method" });
  } catch (err) {
    console.error("API /api/remaining error:", err);
    return res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}
