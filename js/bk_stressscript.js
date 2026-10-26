// =========================================================================
// ALLOWABLE STRESS DATA SERVICE & INTERPOLATION ENGINE (ASME / API 581)
// =========================================================================

window._stressInterpolationCache = window._stressInterpolationCache || {};
window._stressMetadataCache = window._stressMetadataCache || { years: [], hierarchy: {} };

// Reusable Database Accessor (Prioritizes full live Firestore tree in window.bkStressData)
function bkGetStressDatabase() {
    if (typeof window !== 'undefined' && window.bkStressData && Object.keys(window.bkStressData).length > 0) {
        return window.bkStressData;
    }
    if (typeof window !== 'undefined' && window._stressMetadataCache && window._stressMetadataCache.years.length > 0) {
        return window._stressMetadataCache.hierarchy;
    }
    return null;
}

// Reusable Year Extractor
function bkGetAvailableYears() {
    if (typeof window !== 'undefined' && window.bkStressData && Object.keys(window.bkStressData).length > 0) {
        return Object.keys(window.bkStressData);
    }
    if (window._stressMetadataCache && window._stressMetadataCache.years.length > 0) {
        return window._stressMetadataCache.years;
    }
    const db = bkGetStressDatabase();
    return db ? Object.keys(db) : [];
}

// Reusable Material Extractor for a Given Year (with fuzzy matching)
function bkGetMaterialsForYear(year) {
    const db = bkGetStressDatabase();
    if (!db) return [];
    const actualYear = Object.keys(db).find(y => String(y).trim() === String(year).trim()) || Object.keys(db)[0];
    if (!actualYear || !db[actualYear]) return [];
    return Object.keys(db[actualYear]);
}

// Reusable Grade Extractor for a Given Year and Material (with fuzzy matching)
function bkGetGradesForMaterial(year, material) {
    const db = bkGetStressDatabase();
    if (!db || !year || !material) return [];
    const actualYear = Object.keys(db).find(y => String(y).trim() === String(year).trim()) || Object.keys(db)[0];
    if (!actualYear || !db[actualYear]) return [];
    const yearData = db[actualYear];
    const matClean = String(material).trim().toLowerCase();
    const actualMat = Object.keys(yearData).find(m => m.trim().toLowerCase() === matClean || m.trim().toLowerCase().includes(matClean) || matClean.includes(m.trim().toLowerCase())) || Object.keys(yearData)[0];
    if (!actualMat || !yearData[actualMat]) return [];
    return Object.keys(yearData[actualMat]);
}

// Reusable Thickness Checker for a Given Year, Material, and Grade (with fuzzy matching)
function bkGetThicknessForGrade(year, material, grade) {
    const db = bkGetStressDatabase();
    if (!db || !year || !material || !grade) {
        return { hasThickness: false, thicknessList: [] };
    }
    const actualYear = Object.keys(db).find(y => String(y).trim() === String(year).trim()) || Object.keys(db)[0];
    if (!actualYear || !db[actualYear]) return { hasThickness: false, thicknessList: [] };
    const yearData = db[actualYear];
    const matClean = String(material).trim().toLowerCase();
    const actualMat = Object.keys(yearData).find(m => m.trim().toLowerCase() === matClean || m.trim().toLowerCase().includes(matClean) || matClean.includes(m.trim().toLowerCase())) || Object.keys(yearData)[0];
    if (!actualMat || !yearData[actualMat]) return { hasThickness: false, thicknessList: [] };
    const matData = yearData[actualMat];
    const gradeClean = String(grade).trim().toLowerCase();
    const actualGrade = Object.keys(matData).find(g => g.trim().toLowerCase() === gradeClean || g.trim().toLowerCase().includes(gradeClean) || gradeClean.includes(g.trim().toLowerCase())) || Object.keys(matData)[0];
    if (!actualGrade || !matData[actualGrade]) return { hasThickness: false, thicknessList: [] };
    const gradeData = matData[actualGrade];
    const thicknessList = Object.keys(gradeData).filter(k => k.includes('mm'));
    return {
        hasThickness: thicknessList.length > 0,
        thicknessList: thicknessList
    };
}

// Helper to resolve target temperature map from live Firestore tree with fuzzy matching
function bkResolveGradeTempNode(year, material, grade, thickness) {
    if (typeof window === 'undefined' || !window.bkStressData) return null;
    const db = window.bkStressData;
    const actualYear = Object.keys(db).find(y => String(y).trim() === String(year).trim()) || Object.keys(db)[0];
    if (!actualYear || !db[actualYear]) return null;
    const yearData = db[actualYear];

    const matClean = String(material || '').trim().toLowerCase();
    const actualMat = Object.keys(yearData).find(m => m.trim().toLowerCase() === matClean || m.trim().toLowerCase().includes(matClean) || matClean.includes(m.trim().toLowerCase())) || Object.keys(yearData)[0];
    if (!actualMat || !yearData[actualMat]) return null;
    const matData = yearData[actualMat];

    const gradeClean = String(grade || '').trim().toLowerCase();
    const actualGrade = Object.keys(matData).find(g => g.trim().toLowerCase() === gradeClean || g.trim().toLowerCase().includes(gradeClean) || gradeClean.includes(g.trim().toLowerCase())) || Object.keys(matData)[0];
    if (!actualGrade || !matData[actualGrade]) return null;
    const gradeData = matData[actualGrade];

    const cleanTh = (!thickness || thickness === '__NOT_REQUIRED__') ? '' : String(thickness).trim();
    const thicknessKeys = Object.keys(gradeData).filter(k => k.includes('mm'));

    let targetNode = gradeData;
    if (thicknessKeys.length > 0) {
        if (cleanTh && gradeData[cleanTh]) {
            targetNode = gradeData[cleanTh];
        } else if (cleanTh) {
            const matchTh = thicknessKeys.find(tk => tk.toLowerCase().includes(cleanTh.toLowerCase()) || cleanTh.toLowerCase().includes(tk.toLowerCase()));
            targetNode = matchTh ? gradeData[matchTh] : gradeData[thicknessKeys[0]];
        } else {
            targetNode = gradeData[thicknessKeys[0]];
        }
    }
    if (!targetNode || typeof targetNode !== 'object') return null;
    return targetNode;
}

// Synchronous interpolation against live Firestore data in window.bkStressData
function bkInterpolateFromLiveTree(year, material, grade, temp, thickness) {
    const targetNode = bkResolveGradeTempNode(year, material, grade, thickness);
    if (!targetNode) return null;

    const temps = Object.keys(targetNode)
        .map(t => parseFloat(t))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    if (temps.length === 0) return null;

    const minTemp = temps[0];
    const maxTemp = temps[temps.length - 1];
    const tempNum = parseFloat(temp);

    if (tempNum < minTemp || tempNum > maxTemp) {
        return {
            success: false,
            errorType: 'temp_out_of_range',
            minTemp,
            maxTemp,
            message: `Temperature ${tempNum}°C is outside the available dataset range (${minTemp}°C to ${maxTemp}°C).`
        };
    }

    const extractEntry = (raw) => {
        if (raw && typeof raw === 'object') {
            return {
                stress: raw['Allowable Stress'] !== undefined ? Number(raw['Allowable Stress']) : Number(raw.stress || 0),
                yield: Number(raw.yield || 0),
                tensile: Number(raw.tensile || 0)
            };
        }
        return { stress: Number(raw || 0), yield: 0, tensile: 0 };
    };

    if (temps.includes(tempNum)) {
        const exactRaw = targetNode[tempNum] !== undefined ? targetNode[tempNum] : targetNode[String(tempNum)];
        const exact = extractEntry(exactRaw);
        return {
            success: true,
            interpolated: false,
            stress: Number(exact.stress.toFixed(2)),
            yield: Number(exact.yield.toFixed(2)),
            tensile: Number(exact.tensile.toFixed(2)),
            minTemp,
            maxTemp
        };
    }

    let lower, upper;
    for (let i = 0; i < temps.length - 1; i++) {
        if (temps[i] <= tempNum && tempNum <= temps[i + 1]) {
            lower = temps[i];
            upper = temps[i + 1];
            break;
        }
    }

    if (lower === undefined || upper === undefined) return null;

    const low = extractEntry(targetNode[lower] !== undefined ? targetNode[lower] : targetNode[String(lower)]);
    const high = extractEntry(targetNode[upper] !== undefined ? targetNode[upper] : targetNode[String(upper)]);
    const ratio = (tempNum - lower) / (upper - lower);

    return {
        success: true,
        interpolated: true,
        stress: Number((low.stress + (high.stress - low.stress) * ratio).toFixed(2)),
        yield: Number((low.yield + (high.yield - low.yield) * ratio).toFixed(2)),
        tensile: Number((low.tensile + (high.tensile - low.tensile) * ratio).toFixed(2)),
        minTemp,
        maxTemp
    };
}

// Reusable Temperature Range Extractor
function bkGetTemperatureRange(year, material, grade, thickness) {
    const targetNode = bkResolveGradeTempNode(year, material, grade, thickness);
    if (targetNode) {
        const temps = Object.keys(targetNode)
            .map(t => parseFloat(t))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);
        if (temps.length > 0) {
            return { minTemp: temps[0], maxTemp: temps[temps.length - 1] };
        }
    }
    return { minTemp: -29, maxTemp: 815 };
}

function notifyAllAutoStressEvaluators() {
    if (typeof window.evaluateB313AutoStress === 'function') {
        window.evaluateB313AutoStress(true);
    }
    if (typeof window.evaluateSimpleAutoStress === 'function') {
        window.evaluateSimpleAutoStress(true);
    }
    if (typeof window.evaluateQuickTestQuery === 'function') {
        window.evaluateQuickTestQuery();
    }
    if (typeof window.bkEvaluateStandaloneLookup === 'function') {
        window.bkEvaluateStandaloneLookup();
    }
}

// Core Interpolation Function (Delegates to Server API with Client Cache)
async function bkGetClosestTemperatureDataAsync(year, material, grade, temp, thickness) {
    const cleanTh = (!thickness || thickness === '__NOT_REQUIRED__') ? '' : String(thickness).trim();
    const key = `${year}_${material}_${grade}_${cleanTh}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        return window._stressInterpolationCache[key];
    }

    try {
        const res = await fetch("/api/stress-data/interpolate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, material, grade, thickness: cleanTh, temperatureC: temp })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.success) {
            const result = {
                success: true,
                stress: data.stress,
                yield: data.yield,
                tensile: data.tensile,
                minTemp: data.minTemp,
                maxTemp: data.maxTemp
            };
            window._stressInterpolationCache[key] = result;
            notifyAllAutoStressEvaluators();
            return result;
        } else if (data && !data.success) {
            const errResult = {
                success: false,
                errorType: data.errorType || 'not_found',
                minTemp: data.minTemp,
                maxTemp: data.maxTemp,
                message: data.error || 'Unable to determine Allowable Stress.'
            };
            window._stressInterpolationCache[key] = errResult;
            notifyAllAutoStressEvaluators();
            return errResult;
        }
    } catch (e) {
        console.warn("Server stress interpolation error:", e);
    }
    return null;
}

function bkGetClosestTemperatureData(year, material, grade, temp, thickness) {
    // 1. Direct synchronous calculation from live Firestore tree in window.bkStressData
    const liveRes = bkInterpolateFromLiveTree(year, material, grade, temp, thickness);
    if (liveRes) {
        return liveRes.success ? liveRes : null;
    }

    const cleanTh = (!thickness || thickness === '__NOT_REQUIRED__') ? '' : String(thickness).trim();
    const key = `${year}_${material}_${grade}_${cleanTh}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        const cached = window._stressInterpolationCache[key];
        return cached.success !== false ? cached : null;
    }
    // 2. Asynchronous trigger to populate cache and re-evaluate all active calculators
    bkGetClosestTemperatureDataAsync(year, material, grade, temp, cleanTh);
    return null;
}

// High-Level Unified Allowable Stress Lookup with Standardized Validation
function bkLookupAllowableStress(year, material, grade, temp, thickness) {
    if (!year || !material || !grade) {
        return {
            success: false,
            errorType: 'missing_selection',
            message: 'Please select Material, Grade, Thickness and Temperature to determine Allowable Stress.'
        };
    }
    if (isNaN(temp)) {
        return {
            success: false,
            errorType: 'missing_temperature',
            message: 'Please enter Temperature (°C) to determine Allowable Stress.'
        };
    }

    // 1. First compute synchronously from live Firestore data in window.bkStressData
    const liveRes = bkInterpolateFromLiveTree(year, material, grade, temp, thickness);
    if (liveRes) {
        return liveRes;
    }

    // 2. Check interpolation cache
    const cleanTh = (!thickness || thickness === '__NOT_REQUIRED__') ? '' : String(thickness).trim();
    const key = `${year}_${material}_${grade}_${cleanTh}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        return window._stressInterpolationCache[key];
    }

    // 3. Trigger async fetch to server (and re-evaluate calculators once resolved)
    bkGetClosestTemperatureDataAsync(year, material, grade, temp, cleanTh);

    // Also ensure full live Firestore dataset is hydrated if empty
    if ((!window.bkStressData || Object.keys(window.bkStressData).length === 0) && typeof window.refreshStressDataFromCloud === 'function') {
        window.refreshStressDataFromCloud();
    }

    return {
        success: false,
        pending: true,
        errorType: 'fetching',
        message: 'Syncing live Allowable Stress from Cloud Firestore...'
    };
}

// Expose on global window object for universal app-wide reuse
if (typeof window !== 'undefined') {
    window.bkGetStressDatabase = bkGetStressDatabase;
    window.bkGetAvailableYears = bkGetAvailableYears;
    window.bkGetMaterialsForYear = bkGetMaterialsForYear;
    window.bkGetGradesForMaterial = bkGetGradesForMaterial;
    window.bkGetThicknessForGrade = bkGetThicknessForGrade;
    window.bkGetTemperatureRange = bkGetTemperatureRange;
    window.bkGetClosestTemperatureData = bkGetClosestTemperatureData;
    window.bkLookupAllowableStress = bkLookupAllowableStress;
    window.bkPopulateYears = bkPopulateYears;
    window.bkPopulateMaterials = bkPopulateMaterials;
    window.bkPopulateGrades = bkPopulateGrades;
    window.bkPopulateThickness = bkPopulateThickness;
    window.bkEnableTemperature = bkEnableTemperature;
    window.fetchStressDataFromApi = fetchStressDataFromApi;
}

// =========================================================================
// UI CONTROLS & EVENT BINDINGS FOR STANDALONE ALLOWABLE STRESS TAB
// =========================================================================

const bkYearSelect = document.getElementById('bkYearSelect');
const bkMaterialSelect = document.getElementById('bkMaterialSelect');
const bkGradeSelect = document.getElementById('bkGradeSelect');
const bkThicknessSelect = document.getElementById('bkThicknessSelect');
const bkTemperatureInput = document.getElementById('bkTemperatureInput');
const bkOutputDiv = document.getElementById('bkOutputDiv');
const bkStressValue = document.getElementById('bkStressValue');
const bkYieldStrength = document.getElementById('bkYieldStrength');
const bkTensileStrength = document.getElementById('bkTensileStrength');

const bkWarning = document.createElement('div');
bkWarning.className = 'bk-warning';
bkWarning.textContent = '⚠️ Temperature is out of range for selected grade';
bkWarning.style.display = 'none';
if (bkTemperatureInput) {
    bkTemperatureInput.insertAdjacentElement('afterend', bkWarning);
}

// Populate Years for Standalone Tab
function bkPopulateYears(preferredYear, preferredMaterial, preferredGrade) {
    const yearSelect = document.getElementById('bkYearSelect') || bkYearSelect;
    if (!yearSelect) return;
    const years = bkGetAvailableYears();
    const curVal = preferredYear || yearSelect.value;
    yearSelect.innerHTML = '<option value="">-- Select Year --</option>';
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        if (year === curVal) opt.selected = true;
        yearSelect.appendChild(opt);
    });

    if (curVal && years.includes(curVal)) {
        yearSelect.value = curVal;
    }

    const selectedYear = yearSelect.value;
    if (selectedYear) {
        bkPopulateMaterials(selectedYear, preferredMaterial, preferredGrade);
    } else {
        bkPopulateMaterials('');
    }

    if (typeof window.updateQuickYearDeleteButton === 'function') {
        window.updateQuickYearDeleteButton();
    }
    if (typeof window.renderTemperaturePointsTable === 'function') {
        window.renderTemperaturePointsTable();
    }
}

// Populate Materials for Standalone Tab
function bkPopulateMaterials(year, preferredMaterial, preferredGrade) {
    const matSelect = document.getElementById('bkMaterialSelect') || bkMaterialSelect;
    const grSelect = document.getElementById('bkGradeSelect') || bkGradeSelect;
    const thSelect = document.getElementById('bkThicknessSelect') || bkThicknessSelect;
    const tempInput = document.getElementById('bkTemperatureInput') || bkTemperatureInput;
    const outDiv = document.getElementById('bkOutputDiv') || bkOutputDiv;
    const warn = document.querySelector('.bk-warning') || bkWarning;

    if (!matSelect) return;
    matSelect.innerHTML = '<option value="">-- Select Material --</option>';
    if (grSelect) {
        grSelect.innerHTML = '<option value="">-- Select Grade --</option>';
        grSelect.disabled = true;
    }
    if (thSelect) {
        thSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
        thSelect.disabled = true;
    }
    if (tempInput) {
        tempInput.value = '';
        tempInput.disabled = true;
    }
    if (outDiv) outDiv.style.display = 'none';
    if (warn) warn.style.display = 'none';

    if (!year) {
        matSelect.disabled = true;
        return;
    }
    matSelect.disabled = false;

    const materials = bkGetMaterialsForYear(year);
    materials.forEach(material => {
        const opt = document.createElement('option');
        opt.value = material;
        opt.textContent = material;
        if (preferredMaterial && material.toUpperCase() === String(preferredMaterial).toUpperCase()) {
            opt.selected = true;
        }
        matSelect.appendChild(opt);
    });

    // If preferredMaterial or current material is valid, select and trigger grades
    let chosenMat = preferredMaterial;
    if (!chosenMat && matSelect.value) {
        chosenMat = matSelect.value;
    }
    if (!chosenMat && materials.length > 0 && preferredYearExplicit(year)) {
        chosenMat = materials[0];
        matSelect.value = chosenMat;
    }
    if (chosenMat) {
        const found = materials.find(m => m.toUpperCase() === String(chosenMat).toUpperCase());
        if (found) {
            matSelect.value = found;
            bkPopulateGrades(year, found, preferredGrade);
        }
    }
}

function preferredYearExplicit(year) {
    const ySel = document.getElementById('bkYearSelect');
    return ySel && ySel.value === year;
}

// Populate Grades for Standalone Tab
function bkPopulateGrades(year, material, preferredGrade) {
    const grSelect = document.getElementById('bkGradeSelect') || bkGradeSelect;
    const thSelect = document.getElementById('bkThicknessSelect') || bkThicknessSelect;
    const tempInput = document.getElementById('bkTemperatureInput') || bkTemperatureInput;
    const outDiv = document.getElementById('bkOutputDiv') || bkOutputDiv;
    const warn = document.querySelector('.bk-warning') || bkWarning;

    if (!grSelect) return;
    grSelect.innerHTML = '<option value="">-- Select Grade --</option>';
    if (thSelect) {
        thSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
        thSelect.disabled = true;
    }
    if (tempInput) {
        tempInput.value = '';
        tempInput.disabled = true;
    }
    if (outDiv) outDiv.style.display = 'none';
    if (warn) warn.style.display = 'none';

    if (!year || !material) {
        grSelect.disabled = true;
        return;
    }

    grSelect.disabled = false;
    const grades = bkGetGradesForMaterial(year, material);
    grades.forEach(grade => {
        const opt = document.createElement('option');
        opt.value = grade;
        opt.textContent = grade;
        if (preferredGrade && grade.toUpperCase() === String(preferredGrade).toUpperCase()) {
            opt.selected = true;
        }
        grSelect.appendChild(opt);
    });

    // Auto-select grade if preferred or if only one or first grade available
    let chosenGrade = preferredGrade;
    if (!chosenGrade && grSelect.value) {
        chosenGrade = grSelect.value;
    }
    if (!chosenGrade && grades.length > 0) {
        chosenGrade = grades[0];
        grSelect.value = chosenGrade;
    }
    if (chosenGrade) {
        bkPopulateThickness(year, material, chosenGrade);
    }
}

// Helper to select and display material in Single Lookup tab
function bkSelectMaterialAndRender(year, material, grade) {
    const yearSelect = document.getElementById('bkYearSelect') || bkYearSelect;
    if (yearSelect) {
        yearSelect.value = year;
    }
    bkPopulateYears(year, material, grade);
    if (typeof window.renderTemperaturePointsTable === 'function') {
        window.renderTemperaturePointsTable();
    }
}
window.bkSelectMaterialAndRender = bkSelectMaterialAndRender;


// Populate Thickness for Standalone Tab
function bkPopulateThickness(year, material, grade) {
    const thSelect = document.getElementById('bkThicknessSelect') || bkThicknessSelect;
    const tempInput = document.getElementById('bkTemperatureInput') || bkTemperatureInput;
    const outDiv = document.getElementById('bkOutputDiv') || bkOutputDiv;
    const warn = document.querySelector('.bk-warning') || bkWarning;

    if (!thSelect) return;
    thSelect.innerHTML = '<option value="">-- Select Thickness --</option>';
    if (tempInput) {
        tempInput.value = '';
    }
    if (outDiv) outDiv.style.display = 'none';
    if (warn) warn.style.display = 'none';

    if (!year || !material || !grade) {
        thSelect.disabled = true;
        if (tempInput) tempInput.disabled = true;
        return;
    }

    const thInfo = bkGetThicknessForGrade(year, material, grade);

    if (thInfo.hasThickness) {
        thSelect.disabled = false;
        thInfo.thicknessList.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            thSelect.appendChild(opt);
        });
        if (tempInput) tempInput.disabled = true;
    } else {
        thSelect.disabled = true;
        if (tempInput) tempInput.disabled = false;
    }
}

// Enable Temperature Input for Standalone Tab
function bkEnableTemperature() {
    const ySel = document.getElementById('bkYearSelect') || bkYearSelect;
    const mSel = document.getElementById('bkMaterialSelect') || bkMaterialSelect;
    const gSel = document.getElementById('bkGradeSelect') || bkGradeSelect;
    const thSelect = document.getElementById('bkThicknessSelect') || bkThicknessSelect;
    const tempInput = document.getElementById('bkTemperatureInput') || bkTemperatureInput;
    const outDiv = document.getElementById('bkOutputDiv') || bkOutputDiv;
    const warn = document.querySelector('.bk-warning') || bkWarning;

    if (!tempInput) return;
    tempInput.value = '';
    if (outDiv) outDiv.style.display = 'none';
    if (warn) warn.style.display = 'none';

    const year = ySel ? ySel.value : '';
    const material = mSel ? mSel.value : '';
    const grade = gSel ? gSel.value : '';

    if (!year || !material || !grade) return;

    const thInfo = bkGetThicknessForGrade(year, material, grade);
    tempInput.disabled = thInfo.hasThickness && (!thSelect || !thSelect.value);
}

// Wire and Initialize Standalone Tab Controls dynamically
function initBkStressStandaloneUI() {
    const ySel = document.getElementById('bkYearSelect');
    const mSel = document.getElementById('bkMaterialSelect');
    const gSel = document.getElementById('bkGradeSelect');
    const thSel = document.getElementById('bkThicknessSelect');
    const tempInput = document.getElementById('bkTemperatureInput');
    const outDiv = document.getElementById('bkOutputDiv');
    const stressVal = document.getElementById('bkStressValue');
    const yieldVal = document.getElementById('bkYieldStrength');
    const tensileVal = document.getElementById('bkTensileStrength');
    const warn = document.querySelector('.bk-warning') || bkWarning;

    if (ySel && !ySel.dataset.bkBound) {
        ySel.dataset.bkBound = 'true';
        ySel.addEventListener('change', () => {
            bkPopulateMaterials(ySel.value);
            if (typeof window.updateQuickYearDeleteButton === 'function') {
                window.updateQuickYearDeleteButton();
            }
            if (typeof window.renderTemperaturePointsTable === 'function') {
                window.renderTemperaturePointsTable();
            }
        });
    }

    if (mSel && !mSel.dataset.bkBound) {
        mSel.dataset.bkBound = 'true';
        mSel.addEventListener('change', () => {
            const year = ySel ? ySel.value : '';
            bkPopulateGrades(year, mSel.value);
            if (typeof window.renderTemperaturePointsTable === 'function') {
                window.renderTemperaturePointsTable();
            }
        });
    }

    if (gSel && !gSel.dataset.bkBound) {
        gSel.dataset.bkBound = 'true';
        gSel.addEventListener('change', () => {
            const year = ySel ? ySel.value : '';
            const mat = mSel ? mSel.value : '';
            bkPopulateThickness(year, mat, gSel.value);
            if (typeof window.renderTemperaturePointsTable === 'function') {
                window.renderTemperaturePointsTable();
            }
        });
    }

    if (thSel && !thSel.dataset.bkBound) {
        thSel.dataset.bkBound = 'true';
        thSel.addEventListener('change', () => {
            bkEnableTemperature();
            if (typeof window.renderTemperaturePointsTable === 'function') {
                window.renderTemperaturePointsTable();
            }
        });
    }

    function bkEvaluateStandaloneLookup() {
        const curYSel = document.getElementById('bkYearSelect') || ySel;
        const curMSel = document.getElementById('bkMaterialSelect') || mSel;
        const curGSel = document.getElementById('bkGradeSelect') || gSel;
        const curThSel = document.getElementById('bkThicknessSelect') || thSel;
        const curTempInput = document.getElementById('bkTemperatureInput') || tempInput;
        const curOutDiv = document.getElementById('bkOutputDiv') || outDiv;
        const curStressVal = document.getElementById('bkStressValue') || stressVal;
        const curYieldVal = document.getElementById('bkYieldStrength') || yieldVal;
        const curTensileVal = document.getElementById('bkTensileStrength') || tensileVal;
        const curWarn = document.querySelector('.bk-warning') || warn;

        if (!curTempInput || curTempInput.value === '') return;
        const temp = parseFloat(curTempInput.value);
        const year = curYSel ? curYSel.value : '';
        const material = curMSel ? curMSel.value : '';
        const grade = curGSel ? curGSel.value : '';
        const thickness = (curThSel && !curThSel.disabled) ? curThSel.value : null;

        const lookup = bkLookupAllowableStress(year, material, grade, temp, thickness);
        if (lookup && lookup.pending) {
            return;
        }

        const data = lookup && lookup.success ? lookup : bkGetClosestTemperatureData(year, material, grade, temp, thickness);

        if (!data || data.stress === undefined) {
            if (curOutDiv) curOutDiv.style.display = 'none';
            if (curWarn) curWarn.style.display = 'block';
            curTempInput.classList.add('shake', 'error');
            setTimeout(() => curTempInput.classList.remove('shake', 'error'), 500);
        } else {
            if (curWarn) curWarn.style.display = 'none';
            if (curStressVal) curStressVal.textContent = data.stress;
            if (curYieldVal) curYieldVal.textContent = data.yield !== undefined ? data.yield : 'N/A';
            if (curTensileVal) curTensileVal.textContent = data.tensile !== undefined ? data.tensile : 'N/A';

            if (curStressVal) {
                const isDark = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');
                if (isDark) {
                    curStressVal.style.color = data.stress < 100 ? '#4ade80' : data.stress < 200 ? '#fbbf24' : '#f87171';
                } else {
                    curStressVal.style.color = data.stress < 100 ? '#16a34a' : data.stress < 200 ? '#d97706' : '#dc2626';
                }
                curStressVal.style.fontWeight = '700';
            }
            if (curOutDiv) curOutDiv.style.display = 'block';
        }
    }
    window.bkEvaluateStandaloneLookup = bkEvaluateStandaloneLookup;

    if (tempInput && !tempInput.dataset.bkBound) {
        tempInput.dataset.bkBound = 'true';
        tempInput.addEventListener('input', bkEvaluateStandaloneLookup);
    }

    if (typeof bkPopulateYears === 'function') {
        bkPopulateYears();
    }
    if (typeof window.updateActiveDatabaseSummaryBadge === 'function') {
        window.updateActiveDatabaseSummaryBadge();
    }
    if (typeof window.refreshStressDataFromCloud === 'function') {
        window.refreshStressDataFromCloud();
    } else {
        fetchStressDataFromApi().then(() => {
            if (typeof bkPopulateYears === 'function') bkPopulateYears();
            if (typeof window.updateActiveDatabaseSummaryBadge === 'function') window.updateActiveDatabaseSummaryBadge();
        });
    }
}
window.initBkStressStandaloneUI = initBkStressStandaloneUI;

// Initial bind if elements exist
initBkStressStandaloneUI();

// Pre-fetch and synchronize full live stress data from Firebase Cloud Firestore via backend API
async function fetchStressDataFromApi() {
    try {
        const [fullRes, metaRes] = await Promise.all([
            fetch('/api/stress-data?_t=' + Date.now(), {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
            }),
            fetch('/api/stress-data/metadata?_t=' + Date.now(), {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
            })
        ]);

        if (fullRes.ok) {
            const fullJson = await fullRes.json();
            if (fullJson && typeof fullJson === 'object' && Object.keys(fullJson).length > 0) {
                window.bkStressData = fullJson;
                window._stressInterpolationCache = {};
            }
        }

        if (metaRes.ok) {
            const json = await metaRes.json();
            if (json && json.years) {
                window._stressMetadataCache = {
                    years: json.years,
                    hierarchy: json.hierarchy || {}
                };
                return window._stressMetadataCache;
            }
        }
        if (window.bkStressData && Object.keys(window.bkStressData).length > 0) {
            return { years: Object.keys(window.bkStressData), hierarchy: window.bkStressData };
        }
    } catch (err) {
        console.warn("Could not load fresh stress data from API:", err);
    }
    return null;
}

// Init Function
async function initBkStress() {
    // 1. Restore from in-memory cache if present for instantaneous paint
    try {
        const cached = window.bkStressData ? JSON.stringify(window.bkStressData) : null;
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                window.bkStressData = parsed;
                if (typeof bkStressData !== 'undefined') {
                    bkStressData = parsed;
                }
            }
        }
    } catch (e) {}

    // 2. Initial render with available dataset
    if (typeof bkPopulateYears === 'function') {
        bkPopulateYears();
    }
    if (typeof window.initB313AutoStressFields === 'function') {
        window.initB313AutoStressFields();
    }
    if (typeof window.initSimpleAutoStressFields === 'function') {
        window.initSimpleAutoStressFields();
    }
    if (typeof window.renderYearManagerList === 'function') {
        window.renderYearManagerList();
    }
    if (typeof window.updateActiveDatabaseSummaryBadge === 'function') {
        window.updateActiveDatabaseSummaryBadge();
    }

    // 3. Always fetch authoritative cloud data asynchronously
    const freshData = await fetchStressDataFromApi();
    if (freshData) {
        if (typeof bkPopulateYears === 'function') {
            bkPopulateYears();
        }
        if (typeof window.initB313AutoStressFields === 'function') {
            window.initB313AutoStressFields(true);
        }
        if (typeof window.initSimpleAutoStressFields === 'function') {
            window.initSimpleAutoStressFields(true);
        }
        if (typeof window.renderYearManagerList === 'function') {
            window.renderYearManagerList();
        }
        if (typeof window.updateActiveDatabaseSummaryBadge === 'function') {
            window.updateActiveDatabaseSummaryBadge();
        }
        if (typeof window.populateQuickTestYearSelect === 'function') {
            window.populateQuickTestYearSelect();
        }
        if (typeof window.renderTemperaturePointsTable === 'function') {
            window.renderTemperaturePointsTable();
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBkStress);
} else {
    initBkStress();
}

