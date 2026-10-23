// =========================================================================
// ALLOWABLE STRESS DATA SERVICE & INTERPOLATION ENGINE (ASME / API 581)
// =========================================================================

window._stressInterpolationCache = window._stressInterpolationCache || {};
window._stressMetadataCache = window._stressMetadataCache || { years: [], hierarchy: {} };

// Reusable Database Accessor
function bkGetStressDatabase() {
    if (typeof window !== 'undefined' && window._stressMetadataCache && window._stressMetadataCache.years.length > 0) {
        return window._stressMetadataCache.hierarchy;
    }
    if (typeof window !== 'undefined' && window.bkStressData && Object.keys(window.bkStressData).length > 0) {
        return window.bkStressData;
    }
    return null;
}

// Reusable Year Extractor
function bkGetAvailableYears() {
    if (window._stressMetadataCache && window._stressMetadataCache.years.length > 0) {
        return window._stressMetadataCache.years;
    }
    const db = bkGetStressDatabase();
    return db ? Object.keys(db) : [];
}

// Reusable Material Extractor for a Given Year
function bkGetMaterialsForYear(year) {
    if (window._stressMetadataCache && window._stressMetadataCache.hierarchy[year]) {
        return Object.keys(window._stressMetadataCache.hierarchy[year]);
    }
    const db = bkGetStressDatabase();
    if (!db || !year || !db[year]) return [];
    return Object.keys(db[year]);
}

// Reusable Grade Extractor for a Given Year and Material
function bkGetGradesForMaterial(year, material) {
    if (window._stressMetadataCache && window._stressMetadataCache.hierarchy[year]?.[material]) {
        return Object.keys(window._stressMetadataCache.hierarchy[year][material]);
    }
    const db = bkGetStressDatabase();
    if (!db || !year || !material || !db[year] || !db[year][material]) return [];
    return Object.keys(db[year][material]);
}

// Reusable Thickness Checker for a Given Year, Material, and Grade
function bkGetThicknessForGrade(year, material, grade) {
    if (window._stressMetadataCache && window._stressMetadataCache.hierarchy[year]?.[material]?.[grade]) {
        const info = window._stressMetadataCache.hierarchy[year][material][grade];
        return {
            hasThickness: !!info.hasThickness,
            thicknessList: info.thicknessList || []
        };
    }
    const db = bkGetStressDatabase();
    if (!db || !year || !material || !grade || !db[year]?.[material]?.[grade]) {
        return { hasThickness: false, thicknessList: [] };
    }
    const gradeData = db[year][material][grade];
    const thicknessList = Object.keys(gradeData).filter(k => k.includes('mm'));
    return {
        hasThickness: thicknessList.length > 0,
        thicknessList: thicknessList
    };
}

// Reusable Temperature Range Extractor
function bkGetTemperatureRange(year, material, grade, thickness) {
    return { minTemp: -29, maxTemp: 815 };
}

// Core Interpolation Function (Delegates to Server API with Client Cache)
async function bkGetClosestTemperatureDataAsync(year, material, grade, temp, thickness) {
    const key = `${year}_${material}_${grade}_${thickness || ''}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        return window._stressInterpolationCache[key];
    }

    try {
        const res = await fetch("/api/stress-data/interpolate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, material, grade, thickness, temperatureC: temp })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
                const result = {
                    stress: data.stress,
                    yield: data.yield,
                    tensile: data.tensile,
                    minTemp: data.minTemp,
                    maxTemp: data.maxTemp
                };
                window._stressInterpolationCache[key] = result;
                return result;
            }
        }
    } catch (e) {
        console.warn("Server stress interpolation error:", e);
    }
    return null;
}

function bkGetClosestTemperatureData(year, material, grade, temp, thickness) {
    const key = `${year}_${material}_${grade}_${thickness || ''}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        return window._stressInterpolationCache[key];
    }
    // Asynchronous trigger to populate cache
    bkGetClosestTemperatureDataAsync(year, material, grade, temp, thickness).then(res => {
        if (res && typeof window.calculateB313AutoFields === 'function') {
            window.calculateB313AutoFields();
        }
        if (res && typeof window.calculateSimpleAutoFields === 'function') {
            window.calculateSimpleAutoFields();
        }
    });
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

    const key = `${year}_${material}_${grade}_${thickness || ''}_${temp}`;
    if (window._stressInterpolationCache[key]) {
        const cached = window._stressInterpolationCache[key];
        return {
            success: true,
            stress: cached.stress,
            yield: cached.yield,
            tensile: cached.tensile,
            minTemp: cached.minTemp,
            maxTemp: cached.maxTemp
        };
    }

    // Trigger async fetch to server
    bkGetClosestTemperatureDataAsync(year, material, grade, temp, thickness);

    return {
        success: false,
        pending: true,
        errorType: 'fetching',
        message: 'Fetching allowable stress from server...'
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

    if (tempInput && !tempInput.dataset.bkBound) {
        tempInput.dataset.bkBound = 'true';
        tempInput.addEventListener('input', () => {
            const temp = parseFloat(tempInput.value);
            const year = ySel ? ySel.value : '';
            const material = mSel ? mSel.value : '';
            const grade = gSel ? gSel.value : '';
            const thickness = (thSel && !thSel.disabled) ? thSel.value : null;

            const data = bkGetClosestTemperatureData(year, material, grade, temp, thickness);

            if (!data) {
                if (outDiv) outDiv.style.display = 'none';
                if (warn) warn.style.display = 'block';
                tempInput.classList.add('shake', 'error');
                setTimeout(() => tempInput.classList.remove('shake', 'error'), 500);
            } else {
                if (warn) warn.style.display = 'none';
                if (stressVal) stressVal.textContent = data.stress;
                if (yieldVal) yieldVal.textContent = data.yield !== undefined ? data.yield : 'N/A';
                if (tensileVal) tensileVal.textContent = data.tensile !== undefined ? data.tensile : 'N/A';

                if (stressVal) {
                    const isDark = document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode');
                    if (isDark) {
                        stressVal.style.color = data.stress < 100 ? '#4ade80' : data.stress < 200 ? '#fbbf24' : '#f87171';
                    } else {
                        stressVal.style.color = data.stress < 100 ? '#16a34a' : data.stress < 200 ? '#d97706' : '#dc2626';
                    }
                    stressVal.style.fontWeight = '700';
                }
                if (outDiv) outDiv.style.display = 'block';
            }
        });
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

// Pre-fetch and synchronize stress data from secure backend API / Firebase Cloud Database
async function fetchStressDataFromApi() {
    try {
        const res = await fetch('/api/stress-data/metadata?_t=' + Date.now());
        if (res.ok) {
            const json = await res.json();
            if (json && json.years) {
                window._stressMetadataCache = {
                    years: json.years,
                    hierarchy: json.hierarchy || {}
                };
                return window._stressMetadataCache;
            }
        }
    } catch (err) {
        console.warn("Could not load fresh stress metadata from API:", err);
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

