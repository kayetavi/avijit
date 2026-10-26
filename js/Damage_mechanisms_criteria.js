// ================================================================
// API 571 DAMAGE MECHANISM SCREENING CALCULATOR & MATRIX UI ENGINE
// Fully Namespaced (a571_ / a571-) Frontend Presentation Layer
// Integrated with Backend Screening Matrix API (/api/damage-criteria)
// ================================================================

// Global presets & cloud units container synchronized with backend
if (typeof window !== "undefined") {
    window.a571_UNITS = window.a571_UNITS || [];
    window.a571_ALL_UNIT_STREAMS = window.a571_ALL_UNIT_STREAMS || [];
    window.a571_CURRENT_STREAMS = window.a571_CURRENT_STREAMS || [];
    window.a571_STREAM_PRESETS = window.a571_STREAM_PRESETS || {};
    window.a571_EROSION_TABLE = window.a571_EROSION_TABLE || {};
    window.a571_lastScreenedData = null;
    window.a571_lastScreenedResults = null;

    window.a571_copyTableData = function(btn, text) {
        const textToCopy = text || window.a571_lastTable3TextData || "";
        if (!textToCopy) {
            alert("No table data available to copy.");
            return;
        }
        const showSuccess = () => {
            if (!btn) return;
            const oldHtml = btn.innerHTML;
            btn.innerHTML = "✅ Copied!";
            btn.style.background = "#dcfce7";
            btn.style.color = "#166534";
            btn.style.borderColor = "#86efac";
            setTimeout(() => {
                btn.innerHTML = oldHtml;
                btn.style.background = "#f8fafc";
                btn.style.color = "#334155";
                btn.style.borderColor = "#cbd5e1";
            }, 2000);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showSuccess();
            }).catch(() => {
                a571_fallbackCopy(textToCopy, showSuccess);
            });
        } else {
            a571_fallbackCopy(textToCopy, showSuccess);
        }
    };

    function a571_fallbackCopy(text, onSuccess) {
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "-9999px";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textarea);
            if (successful) {
                if (onSuccess) onSuccess();
                else alert("✅ Table data copied to clipboard!");
            } else {
                prompt("Copy table data manually (Ctrl+C, Enter):", text);
            }
        } catch(err) {
            prompt("Copy table data manually (Ctrl+C, Enter):", text);
        }
    }
}

/**
 * Robust helper to auto-detect Operating Case from stream records
 */
function a571_detectStreamCase(s) {
    if (!s) return "";
    if (s.caseName && String(s.caseName).trim()) {
        return String(s.caseName).trim();
    }
    const raw = `${s.streamNo || ''} ${s.name || ''} ${s.content || ''} ${s.description || ''}`;
    
    // Check bracket tags like [SOR], [EOR], [Case 1], [Case 2], [Run 1]
    const bracketMatch = raw.match(/\[\s*([^\]]+?)\s*\]/);
    if (bracketMatch && bracketMatch[1]) {
        const tag = bracketMatch[1].trim();
        if (/^(sor|eor|case\s*[-_]?\s*\d+|case\s*[-_]?\s*[a-z]|run\s*[-_]?\s*\d+|turndown|design|normal|guarantee)/i.test(tag)) {
            if (/^sor\b/i.test(tag)) return "SOR";
            if (/^eor\b/i.test(tag)) return "EOR";
            const cm = tag.match(/^case\s*[-_]?\s*(\d+|[a-z])/i);
            if (cm) return `Case ${cm[1].toUpperCase()}`;
            return tag;
        }
    }
    
    // Check parenthesis tags like (SOR), (EOR), (Case 1), (Case 2)
    const parenMatch = raw.match(/\(\s*([^\)]+?)\s*\)/);
    if (parenMatch && parenMatch[1]) {
        const tag = parenMatch[1].trim();
        if (/^(sor|eor|case\s*[-_]?\s*\d+|case\s*[-_]?\s*[a-z]|run\s*[-_]?\s*\d+|turndown|design|normal)/i.test(tag)) {
            if (/^sor\b/i.test(tag)) return "SOR";
            if (/^eor\b/i.test(tag)) return "EOR";
            const cm = tag.match(/^case\s*[-_]?\s*(\d+|[a-z])/i);
            if (cm) return `Case ${cm[1].toUpperCase()}`;
            return tag;
        }
    }

    if (/\b(sor|start\s*of\s*run)\b/i.test(raw)) return "SOR";
    if (/\b(eor|end\s*of\s*run)\b/i.test(raw)) return "EOR";
    const caseMatch = raw.match(/\bcase\s*[-_]?\s*(\d+|[a-z])\b/i);
    if (caseMatch) return `Case ${caseMatch[1].toUpperCase()}`;
    const runMatch = raw.match(/\brun\s*[-_]?\s*(\d+)\b/i);
    if (runMatch) return `Run ${runMatch[1]}`;
    if (/\bturndown\b/i.test(raw)) return "Turndown";
    if (/\bdesign\b/i.test(raw) && !/\bdesign\s*(press|temp)/i.test(raw)) return "Design";
    
    return "";
}

/**
 * Populate stream dropdown with option elements
 */
function a571_populateStreamSelectorOptions(streams, defaultSelectStreamId = "") {
    const streamSelector = document.getElementById("a571-streamPresetSelector");
    if (!streamSelector) return;

    if (!streams || streams.length === 0) {
        streamSelector.innerHTML = '<option value="">-- No streams found in selected Case --</option>';
        streamSelector.disabled = true;
        return;
    }

    const countLabel = streams.length === 1 ? "1 stream available" : `${streams.length} available`;
    streamSelector.innerHTML = `<option value="">-- Select Process Stream (${countLabel}) --</option>`;

    streams.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id || s.streamNo;
        const phaseHint = s.phase ? `${s.phase}, ` : "";
        const tempVal = s.temp !== undefined ? s.temp : (s.tempC !== undefined ? s.tempC : "");
        const tempHint = (tempVal !== null && tempVal !== "") ? `${tempVal}°C` : "";
        const flowHint = (s.massFlow != null && !isNaN(s.massFlow) && Number(s.massFlow) > 0) ? `, ${(Number(s.massFlow) / 1000).toFixed(1)} t/h` : "";
        const details = (phaseHint || tempHint || flowHint) ? ` (${phaseHint}${tempHint}${flowHint})` : "";
        const caseTag = s.detectedCase ? `[${s.detectedCase}] ` : "";
        opt.textContent = `${caseTag}${s.name || `Stream ${s.streamNo || s.id}`}${details}`;
        streamSelector.appendChild(opt);
    });

    if (defaultSelectStreamId && streams.some(s => (s.id === defaultSelectStreamId || s.streamNo === defaultSelectStreamId))) {
        streamSelector.value = defaultSelectStreamId;
    }

    streamSelector.disabled = false;
}

/**
 * Handle Case Selection Change: Filters streams for the active unit by Operating Case
 */
function a571_onCaseSelectionChange(caseVal) {
    const alertBox = document.getElementById("a571-autoloadAlert");
    if (alertBox) alertBox.style.display = "none";

    const allStreams = window.a571_ALL_UNIT_STREAMS || [];
    if (allStreams.length === 0) return;

    let filtered = allStreams;
    if (caseVal && caseVal !== "all") {
        filtered = allStreams.filter(s => String(s.detectedCase || "").toUpperCase() === String(caseVal).toUpperCase());
    }

    window.a571_CURRENT_STREAMS = filtered;
    a571_populateStreamSelectorOptions(filtered);
    if (window.a571_screeningMode === "envelope" && typeof a571_populateEnvelopeStreamCheckboxes === "function") {
        a571_populateEnvelopeStreamCheckboxes(filtered);
    }
}

/**
 * Dynamically fetch available Units from Cloud / Database API
 */
async function a571_fetchUnits() {
    const unitSelector = document.getElementById("a571-unitSelector");
    const caseSelector = document.getElementById("a571-caseSelector");
    const caseWrap = document.getElementById("a571-caseWrap");
    const streamSelector = document.getElementById("a571-streamPresetSelector");
    if (!unitSelector) return;

    unitSelector.innerHTML = '<option value="">Loading Units...</option>';
    unitSelector.disabled = true;

    if (caseWrap) caseWrap.style.display = "none";
    if (caseSelector) {
        caseSelector.innerHTML = '<option value="all">-- All Cases --</option>';
    }

    if (streamSelector) {
        streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
        streamSelector.disabled = true;
    }

    try {
        const res = await fetch("/api/damage-criteria?action=units");
        let data = null;
        try { data = await res.json(); } catch (_) {}
        if (!res.ok || (data && data.success === false)) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP Error ${res.status}`;
            throw new Error(msg);
        }

        if (data.success && Array.isArray(data.units) && data.units.length > 0) {
            window.a571_UNITS = data.units;
            unitSelector.innerHTML = '<option value="">-- Select Unit --</option>';
            data.units.forEach((u) => {
                const opt = document.createElement("option");
                opt.value = u.id;
                const countBadge = u.streamCount !== undefined ? ` (${u.streamCount} streams)` : "";
                opt.textContent = `${u.name || u.id}${countBadge}`;
                unitSelector.appendChild(opt);
            });
        } else {
            unitSelector.innerHTML = '<option value="">-- No Units Found in Cloud --</option>';
        }
    } catch (err) {
        console.warn("[API 571] Failed to fetch units from cloud database:", err);
        unitSelector.innerHTML = '<option value="">⚠️ Error loading units (Click to retry)</option>';
        const alertBox = document.getElementById("a571-autoloadAlert");
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                    <span class="a571-alert-icon" style="color:#dc2626;">⚠️</span>
                    <div>
                        <strong>Database Unavailable:</strong> Could not load Units from cloud. 
                        <button type="button" onclick="a571_fetchUnits()" style="margin-left:8px; padding:2px 8px; font-size:12px; font-weight:700; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;">Retry</button>
                    </div>
                </div>
            `;
        }
    } finally {
        unitSelector.disabled = false;
    }
}

/**
 * Handle Unit Selection Change: Auto-detects Operating Cases for this Unit, loads dependent Streams & Clears Stale Data
 */
async function a571_onUnitSelectionChange(unitId) {
    const streamSelector = document.getElementById("a571-streamPresetSelector");
    const caseSelector = document.getElementById("a571-caseSelector");
    const caseWrap = document.getElementById("a571-caseWrap");
    const alertBox = document.getElementById("a571-autoloadAlert");

    // 1. Prevent stale data: Clear previous form inputs and results immediately
    a571_clearFormInputsOnly();
    if (alertBox) alertBox.style.display = "none";

    if (!streamSelector) return;

    if (!unitId) {
        streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
        streamSelector.disabled = true;
        if (caseWrap) caseWrap.style.display = "none";
        if (caseSelector) {
            caseSelector.innerHTML = '<option value="all">-- All Cases --</option>';
        }
        window.a571_ALL_UNIT_STREAMS = [];
        window.a571_CURRENT_STREAMS = [];
        return;
    }

    // 2. Set UI loading state for Streams
    streamSelector.innerHTML = '<option value="">Loading Streams...</option>';
    streamSelector.disabled = true;
    if (caseWrap) caseWrap.style.display = "none";

    try {
        const res = await fetch(`/api/damage-criteria?action=streams&unit=${encodeURIComponent(unitId)}`);
        let data = null;
        try { data = await res.json(); } catch (_) {}
        if (!res.ok || (data && data.success === false)) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP Error ${res.status}`;
            throw new Error(msg);
        }

        if (data.success && Array.isArray(data.streams) && data.streams.length > 0) {
            // Tag each stream with detected case
            data.streams.forEach(s => {
                s.detectedCase = a571_detectStreamCase(s);
            });

            window.a571_ALL_UNIT_STREAMS = data.streams;
            window.a571_CURRENT_STREAMS = data.streams;

            // Auto-detect distinct Operating Cases (e.g. SOR, EOR, Case 1, Case 2)
            const caseCounts = new Map();
            data.streams.forEach(s => {
                const c = (s.detectedCase || "").trim();
                if (c) {
                    caseCounts.set(c, (caseCounts.get(c) || 0) + 1);
                }
            });

            const distinctCases = Array.from(caseCounts.keys());

            // If unit has multiple operating cases, show and populate Case Dropdown
            if (distinctCases.length >= 2) {
                if (caseSelector && caseWrap) {
                    caseWrap.style.display = "block";
                    caseSelector.innerHTML = "";

                    // All Cases option
                    const allOpt = document.createElement("option");
                    allOpt.value = "all";
                    allOpt.textContent = `🌐 All Cases (${data.streams.length} Streams)`;
                    caseSelector.appendChild(allOpt);

                    // Individual Cases
                    distinctCases.forEach(cName => {
                        const cnt = caseCounts.get(cName);
                        let icon = '⚡';
                        const upper = cName.toUpperCase();
                        if (upper.includes('SOR') || upper.includes('START')) icon = '🟢';
                        else if (upper.includes('EOR') || upper.includes('END')) icon = '🔴';
                        else if (upper.includes('CASE 1') || upper.includes('RUN 1')) icon = '🔷';
                        else if (upper.includes('CASE 2') || upper.includes('RUN 2')) icon = '🔶';
                        else if (upper.includes('CASE 3') || upper.includes('RUN 3')) icon = '🟣';
                        else if (upper.includes('TURNDOWN')) icon = '📉';
                        else if (upper.includes('DESIGN')) icon = '📐';

                        const opt = document.createElement("option");
                        opt.value = cName;
                        opt.textContent = `${icon} ${cName} (${cnt} stream${cnt > 1 ? 's' : ''})`;
                        caseSelector.appendChild(opt);
                    });

                    caseSelector.value = "all";
                    caseSelector.disabled = false;
                }
            } else {
                // Single operating state or no case variation
                if (caseWrap) caseWrap.style.display = "none";
                if (caseSelector) {
                    caseSelector.innerHTML = '<option value="all">-- All Cases --</option>';
                }
            }

            // Populate stream selector with all streams (or filtered if a case was previously active)
            a571_populateStreamSelectorOptions(data.streams);
            if (window.a571_screeningMode === "envelope" && typeof a571_populateEnvelopeStreamCheckboxes === "function") {
                a571_populateEnvelopeStreamCheckboxes(data.streams);
            }
        } else {
            window.a571_ALL_UNIT_STREAMS = [];
            window.a571_CURRENT_STREAMS = [];
            if (caseWrap) caseWrap.style.display = "none";
            streamSelector.innerHTML = `<option value="">-- No process streams found for Unit ${a571_escapeHTML(unitId)} --</option>`;
            streamSelector.disabled = false;
        }
    } catch (err) {
        console.warn(`[API 571] Failed to fetch streams for unit ${unitId}:`, err);
        streamSelector.innerHTML = '<option value="">⚠️ Failed to load streams (Click to retry)</option>';
        streamSelector.disabled = false;
        if (caseWrap) caseWrap.style.display = "none";
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                    <span class="a571-alert-icon" style="color:#dc2626;">⚠️</span>
                    <div>
                        <strong>Stream Load Error:</strong> Failed to fetch process streams for unit <em>${a571_escapeHTML(unitId)}</em>. 
                        <button type="button" onclick="a571_onUnitSelectionChange('${a571_escapeHTML(unitId)}')" style="margin-left:8px; padding:2px 8px; font-size:12px; font-weight:700; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;">Retry</button>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Handle Stream selection change
 */
function a571_onPresetSelectionChange(streamId) {
    // If user changes stream dropdown, clear previously displayed alert until loaded
    const alertBox = document.getElementById("a571-autoloadAlert");
    if (alertBox && !streamId) alertBox.style.display = "none";
}

/**
 * Fetch Stream Presets and Erosion Reference tables from Backend
 */
async function a571_loadPresetsFromBackend() {
    try {
        const res = await fetch("/api/damage-criteria?action=presets");
        if (res.ok) {
            const data = await res.json();
            if (data.presets) {
                Object.assign(window.a571_STREAM_PRESETS, data.presets);
            }
            if (data.erosionTable) {
                Object.assign(window.a571_EROSION_TABLE, data.erosionTable);
            }
        }
    } catch (err) {
        console.warn("Backend presets fetch notice:", err);
    }
}

// Start loading backend units and presets
a571_loadPresetsFromBackend();

// =================================================================
// INITIALIZATION & EVENT LISTENERS
// =================================================================
function a571_init() {
    const unitSelector = document.getElementById("a571-unitSelector");
    if (unitSelector && (!window.a571_UNITS || window.a571_UNITS.length === 0 || unitSelector.options.length <= 1)) {
        a571_fetchUnits();
    }

    const filterForm = document.getElementById("a571-filterForm");
    if (!filterForm || filterForm._bound) return;
    filterForm._bound = true;

    // Auto-sync NH3 Significant dropdown when NH3 input changes
    const nh3Input = document.getElementById("a571-nh3");
    const nh3SigSelect = document.getElementById("a571-nh3Significant");
    if (nh3Input && nh3SigSelect) {
        nh3Input.addEventListener("input", function() {
            const val = parseFloat(nh3Input.value || 0);
            nh3SigSelect.value = val > 0 ? "Y" : "N";
        });
    }

    // Auto-sync Nelson Curve Metallurgy when carbonSteel, stress, or crContent changes
    const csSelect = document.getElementById("a571-carbonSteel");
    const stressSelect = document.getElementById("a571-stress");
    const crInput = document.getElementById("a571-crContent");
    const nelsonSelect = document.getElementById("a571-nelsonMaterial");

    let nelsonMaterialUserModified = false;
    window.a571_nelsonMaterialUserModified = false;

    if (nelsonSelect) {
        nelsonSelect.addEventListener("change", function() {
            nelsonMaterialUserModified = true;
            window.a571_nelsonMaterialUserModified = true;
        });
    }

    function syncNelsonMetallurgy() {
        if (!nelsonSelect) return;
        // Manual override protection: do not overwrite user's deliberate metallurgy selection
        if (nelsonMaterialUserModified || window.a571_nelsonMaterialUserModified) return;

        const cs = csSelect ? csSelect.value : "Y";
        const stress = stressSelect ? stressSelect.value : "Y";
        const cr = crInput ? parseFloat(crInput.value || 0) : 0;

        if (cs === "Y" && stress === "Y") nelsonSelect.value = "CS_NON_PWHT";
        else if (cs === "Y" && stress === "N") nelsonSelect.value = "CS_PWHT";
        else if (cr >= 2.0) nelsonSelect.value = "225CR_1MO";
        else if (cr >= 1.0) nelsonSelect.value = "125CR_05MO";
    }

    if (csSelect) csSelect.addEventListener("change", syncNelsonMetallurgy);
    if (stressSelect) stressSelect.addEventListener("change", syncNelsonMetallurgy);
    if (crInput) crInput.addEventListener("input", syncNelsonMetallurgy);

    // FORM SUBMIT HANDLER
    filterForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        // Read Form Input Data
        const pVal = a571_numberValue("a571-pressure");
        const data = {
            stream: a571_getValue("a571-streamName") || "Unnamed Stream",
            phase: a571_normalizeText(a571_getValue("a571-phase")),
            temp: a571_numberValue("a571-temperature"),
            pressure: pVal !== null ? pVal : 0,
            h2: a571_numberValue("a571-h2"),
            h2MolFrac: a571_numberValue("a571-h2MolFrac"),
            h2s: a571_numberValue("a571-h2s"),
            nh3: a571_numberValue("a571-nh3"),
            nh3Significant: a571_normalizeYesNo(a571_getValue("a571-nh3Significant")),
            otherContamSignificant: a571_normalizeYesNo(a571_getValue("a571-otherContamSignificant")),
            h2o: a571_numberValue("a571-h2o"),
            co2: a571_numberValue("a571-co2"),
            carbonSteel: a571_normalizeYesNo(a571_getValue("a571-carbonSteel")),
            cr: a571_numberValue("a571-crContent"),
            stress: a571_normalizeYesNo(a571_getValue("a571-stress")),
            nelsonMaterial: a571_getValue("a571-nelsonMaterial") || "",
            hardness: a571_normalizeYesNo(a571_getValue("a571-hardness")),
            oxygen: a571_normalizeYesNo(a571_getValue("a571-oxygen")),
            amineFlow: a571_numberValue("a571-amineFlow"),
            amineType: a571_getValue("a571-amineType"),
            amineService: a571_normalizeText(a571_getValue("a571-amineService")),
            hsas: a571_numberValue("a571-hsas"),
            ph: a571_numberValue("a571-ph"),
            velocityFlow: a571_numberValue("a571-velocityFlow"),
            velocityDensity: a571_numberValue("a571-velocityDensity"),
            pipeDiameter: a571_numberValue("a571-pipeDiameter"),
            manualVelocity: a571_numberValue("a571-velocity"),
            turbulence: a571_normalizeYesNo(a571_getValue("a571-turbulence")),
            solids: a571_normalizeYesNo(a571_getValue("a571-solids")),
            insulated: a571_normalizeYesNo(a571_getValue("a571-insulated")),
            cuiMaterial: a571_normalizeText(a571_getValue("a571-cuiMaterial")),
            eroMaterial: a571_getValue("a571-eroMaterial") || "",
            deltaT: a571_numberValue("a571-deltaT"),
            thermalLocation: a571_getValue("a571-thermalLocation") || ""
        };

        // Show loading state if needed
        const resultContainer = document.getElementById("a571-result");
        if (resultContainer) {
            resultContainer.style.display = "block";
            resultContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #64748b;">
                    <div style="font-size: 24px; margin-bottom: 8px;">⚙️</div>
                    <div style="font-weight: 600;">Evaluating API 571 Damage Screening Matrix against Backend Engine...</div>
                </div>
            `;
        }

        try {
            // Call Backend Screening Engine API
            const res = await fetch("/api/damage-criteria", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data })
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const evaluation = await res.json();

            if (evaluation.success) {
                // Display Calculated Hydraulic & Chemical Parameters
                a571_displayCalculatedParameters(evaluation.calculatedParameters);

                // Display Full Screening Matrix & Audit Table
                a571_displayResults(evaluation.stream, evaluation.results, evaluation.input, evaluation.kpis);
            } else {
                throw new Error(evaluation.error || "Evaluation failed");
            }
        } catch (err) {
            console.error("Screening calculation error:", err);
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="calc-card" style="border-left: 4px solid #ef4444; margin-top: 14px;">
                        <h4 style="color: #dc2626; margin: 0 0 6px 0;">Screening Engine Error</h4>
                        <p style="margin: 0; color: #64748b;">Failed to evaluate stream against backend: ${a571_escapeHTML(err.message)}</p>
                    </div>
                `;
            }
        }
    });
}
window.a571_init = a571_init;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", a571_init);
} else {
    a571_init();
}

// =================================================================
// STREAM PRESET & AUTO-LOAD LOGIC
// =================================================================

async function a571_loadSelectedStream() {
    const unitSelector = document.getElementById("a571-unitSelector");
    const streamSelector = document.getElementById("a571-streamPresetSelector");
    const alertBox = document.getElementById("a571-autoloadAlert");
    const loadBtn = document.getElementById("a571-btnLoadStream");

    const unitId = unitSelector ? unitSelector.value.trim() : "";
    const streamId = streamSelector ? streamSelector.value.trim() : "";

    if (!unitId) {
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
                    <span class="a571-alert-icon" style="color:#d97706;">⚠️</span>
                    <div><strong>Selection Required:</strong> Please select a <strong>Unit</strong> first.</div>
                </div>
            `;
        }
        if (unitSelector) unitSelector.focus();
        return;
    }

    if (!streamId) {
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
                    <span class="a571-alert-icon" style="color:#d97706;">⚠️</span>
                    <div><strong>Selection Required:</strong> Please select a <strong>Process Stream</strong> to load.</div>
                </div>
            `;
        }
        if (streamSelector) streamSelector.focus();
        return;
    }

    // Set UI loading state
    const originalBtnText = loadBtn ? loadBtn.innerHTML : "📥 Load";
    if (loadBtn) {
        loadBtn.innerHTML = "⏳ Loading Stream Data...";
        loadBtn.disabled = true;
    }

    if (alertBox) {
        alertBox.style.display = "block";
        alertBox.innerHTML = `
            <div class="a571-alert-inner" style="background:#eff6ff; border-color:#bfdbfe; color:#1e40af;">
                <span class="a571-alert-icon" style="color:#2563eb;">⏳</span>
                <div><strong>Fetching:</strong> Loading stream data from cloud database...</div>
            </div>
        `;
    }

    try {
        let streamData = null;

        // 1. Fetch from cloud database API
        const res = await fetch(`/api/damage-criteria?action=stream_data&unit=${encodeURIComponent(unitId)}&streamId=${encodeURIComponent(streamId)}`);
        let json = null;
        try { json = await res.json(); } catch (_) {}

        if (!res.ok || (json && json.success === false)) {
            const errMsg = (json && (json.error || json.message)) ? (json.error || json.message) : `HTTP Error ${res.status}`;
            throw new Error(errMsg);
        }

        if (json && json.success && json.stream) {
            streamData = json.stream;
        }

        // 2. Fallback to cached window streams
        if (!streamData && window.a571_CURRENT_STREAMS && Array.isArray(window.a571_CURRENT_STREAMS)) {
            streamData = window.a571_CURRENT_STREAMS.find(s => s.id === streamId || s.streamNo === streamId);
        }

        if (!streamData && window.a571_STREAM_PRESETS && window.a571_STREAM_PRESETS[streamId]) {
            streamData = window.a571_STREAM_PRESETS[streamId];
        }

        if (!streamData) {
            throw new Error(`Process Stream '${streamId}' could not be resolved from cloud data.`);
        }

        // Cross-merge with cached catalog record if available to retain full components/constituents
        const cachedMatch = (window.a571_CURRENT_STREAMS || []).find(s => String(s.id) === String(streamId) || String(s.streamNo) === String(streamId));
        if (cachedMatch) {
            streamData = {
                ...cachedMatch,
                ...streamData,
                components: { ...(cachedMatch.components || {}), ...(streamData.components || {}) },
                constituents: { ...(cachedMatch.constituents || {}), ...(streamData.constituents || {}) },
                properties: { ...(cachedMatch.properties || {}), ...(streamData.properties || {}) }
            };
        }

        await a571_applyStreamDataToForm(streamData, unitId);
    } catch (err) {
        console.error("[API 571] Stream load error:", err);
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                    <span class="a571-alert-icon" style="color:#dc2626;">❌</span>
                    <div><strong>Error Loading Stream:</strong> ${a571_escapeHTML(err.message)}</div>
                </div>
            `;
        }
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalBtnText;
            loadBtn.disabled = false;
        }
    }
}

async function a571_applyStreamDataToForm(p, unitId) {
    if (!p) return;
    window.a571_nelsonMaterialUserModified = false;

    const autoFilledIds = [];

    const applyField = (id, val) => {
        if (val !== null && val !== undefined && val !== "") {
            a571_setFieldValue(id, val);
            autoFilledIds.push(id);
        } else {
            a571_setFieldValue(id, "");
        }
    };

    // Set Form Fields without invented defaults
    applyField("a571-streamName", p.name || p.streamName || (p.streamNo ? `Stream ${p.streamNo}` : (p.id ? `Stream ${p.id}` : "")));
    applyField("a571-phase", p.phase || "");
    applyField("a571-temperature", (p.temp !== undefined && p.temp !== null && p.temp !== "") ? p.temp : (p.tempC ?? ""));
    applyField("a571-pressure", (p.pressure !== undefined && p.pressure !== null && p.pressure !== "") ? p.pressure : (p.pressKgCm2 ?? ""));
    applyField("a571-h2", (p.h2 !== undefined && p.h2 !== null && p.h2 !== "") ? p.h2 : "");
    const h2MolVal = (p.h2MolFrac !== undefined && p.h2MolFrac !== null && p.h2MolFrac !== "") ? p.h2MolFrac : ((p.h2_mol !== undefined && p.h2_mol !== null && p.h2_mol !== "") ? p.h2_mol : (p.h2Mol ?? ""));
    applyField("a571-h2MolFrac", h2MolVal);
    applyField("a571-h2s", (p.h2s !== undefined && p.h2s !== null && p.h2s !== "") ? p.h2s : "");
    applyField("a571-nh3", (p.nh3 !== undefined && p.nh3 !== null && p.nh3 !== "") ? p.nh3 : "");
    applyField("a571-nh3Significant", (p.nh3Significant !== undefined && p.nh3Significant !== null && p.nh3Significant !== "") ? p.nh3Significant : "");
    applyField("a571-otherContamSignificant", (p.otherContamSignificant !== undefined && p.otherContamSignificant !== null && p.otherContamSignificant !== "") ? p.otherContamSignificant : "");
    applyField("a571-h2o", (p.h2o !== undefined && p.h2o !== null && p.h2o !== "") ? p.h2o : "");
    applyField("a571-co2", (p.co2 !== undefined && p.co2 !== null && p.co2 !== "") ? p.co2 : "");

    applyField("a571-carbonSteel", p.carbonSteel || "");
    applyField("a571-crContent", (p.crContent !== undefined && p.crContent !== null && p.crContent !== "") ? p.crContent : "");
    applyField("a571-stress", p.stress || "");
    applyField("a571-nelsonMaterial", p.nelsonMaterial || "");
    applyField("a571-hardness", p.hardness || "");
    applyField("a571-oxygen", p.oxygen || "");

    applyField("a571-amineFlow", (p.amineFlow !== undefined && p.amineFlow !== null && p.amineFlow !== "") ? p.amineFlow : "");
    applyField("a571-amineType", p.amineType || "");
    applyField("a571-amineService", p.amineService || "");
    applyField("a571-hsas", (p.hsas !== undefined && p.hsas !== null && p.hsas !== "") ? p.hsas : "");
    applyField("a571-ph", (p.ph !== undefined && p.ph !== null && p.ph !== "") ? p.ph : "");

    const flowVal = (p.massFlow !== undefined && p.massFlow !== null && p.massFlow !== "") ? p.massFlow : (p.velocityFlow ?? "");
    applyField("a571-velocityFlow", flowVal);
    const densVal = (p.density !== undefined && p.density !== null && p.density !== "") ? p.density : (p.velocityDensity ?? "");
    applyField("a571-velocityDensity", densVal);
    applyField("a571-pipeDiameter", (p.pipeDiameter !== undefined && p.pipeDiameter !== null && p.pipeDiameter !== "") ? p.pipeDiameter : "");
    applyField("a571-velocity", (p.manualVelocity !== undefined && p.manualVelocity !== null && p.manualVelocity !== "") ? p.manualVelocity : (p.velocity ?? ""));
    applyField("a571-turbulence", p.turbulence || "");
    applyField("a571-solids", p.solids || "");
    applyField("a571-eroMaterial", p.eroMaterial || "");
    applyField("a571-insulated", p.insulated || "");
    applyField("a571-cuiMaterial", p.cuiMaterial || "");
    applyField("a571-deltaT", (p.deltaT !== undefined && p.deltaT !== null && p.deltaT !== "") ? p.deltaT : "");
    applyField("a571-thermalLocation", p.thermalLocation || "");

    // Apply Red boundaries to non-automated fields & Green boundaries to stream synced fields
    a571_markAutomationCards(autoFilledIds);

    // Display Alert Banner & cache state
    const alertBox = document.getElementById("a571-autoloadAlert");
    const unitBadge = unitId ? ` [${a571_escapeHTML(unitId)}]` : "";
    const isEnv = (p.streamNo === "ENVELOPE" || window.a571_screeningMode === "envelope");

    const maxTempStr = (p.temp !== undefined && p.temp !== null && p.temp !== "") ? `${p.temp}°C` : "-";
    const maxPressStr = (p.pressure !== undefined && p.pressure !== null && p.pressure !== "") ? `${p.pressure} kg/cm²` : "-";
    const maxFlowStr = (p.massFlow !== undefined && p.massFlow !== null && p.massFlow !== "") ? `${Number(p.massFlow).toLocaleString()} kg/h` : "-";
    const maxH2SStr = (p.h2s !== undefined && p.h2s !== null && p.h2s !== "") ? `${Number(p.h2s).toLocaleString()} kg/h` : "-";

    const flowStr = (p.massFlow != null && p.massFlow !== "") ? `${Number(p.massFlow).toLocaleString()} kg/h` : ((p.velocityFlow != null && p.velocityFlow !== "") ? `${Number(p.velocityFlow).toLocaleString()} kg/h` : "-");
    const tempStr = (p.temp != null && p.temp !== "") ? `${p.temp}°C` : ((p.tempC != null && p.tempC !== "") ? `${p.tempC}°C` : "-");
    const phaseStr = p.phase ? `Phase: ${p.phase}` : "";
    const h2sStr = (p.h2s != null && p.h2s !== "") ? `H₂S: ${Number(p.h2s).toLocaleString()} kg/h` : "";
    const h2Str = (p.h2 != null && p.h2 !== "") ? `H₂: ${Number(p.h2).toLocaleString()} kg/h` : "";
    const summaryParts = [flowStr, tempStr, phaseStr, h2sStr, h2Str].filter(Boolean).join(" | ");

    const alertHTML = isEnv ? `
        <div class="a571-alert-inner" style="background:#f3e8ff; border-color:#d8b4fe; color:#6b21a8;">
            <span class="a571-alert-icon" style="color:#7c3aed;">⚡</span>
            <div>
                <strong>Multi-Stream Envelope Mode Active:</strong> Populated worst-case parameters.
                <div style="font-size:11.5px; margin-top:2px;">
                    Max Temp: ${maxTempStr} | Max Press: ${maxPressStr} | Max Flow: ${maxFlowStr} | Max H₂S: ${maxH2SStr}
                </div>
            </div>
            <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; font-size:16px;">&times;</button>
        </div>
    ` : `
        <div class="a571-alert-inner">
            <span class="a571-alert-icon">✓</span>
            <div>
                <strong>Stream Loaded${unitBadge}:</strong> <em>${a571_escapeHTML(p.name || p.streamName || p.streamNo || p.id)}</em> 
                <span style="opacity: 0.85;">(${summaryParts})</span>
                <div style="font-size:11.5px; margin-top:4px; opacity:0.95;">
                    <span style="color:#10b981; font-weight:700;">🟢 Green Cards:</span> Auto-populated from stream sheet &bull; 
                    <span style="color:#ef4444; font-weight:700;">🔴 Red Border Cards:</span> Default / Non-stream inputs (e.g. Metallurgy, Insulation, Pipe ID) — verify or update as needed.
                </div>
            </div>
            <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; font-size:16px;">&times;</button>
        </div>
    `;

    if (isEnv) {
        window.a571_lastEnvelopeData = { envelopeObj: p, unitId };
        window.a571_lastEnvelopeAlertHTML = alertHTML;
    } else {
        window.a571_lastSingleStreamData = { p, unitId };
        window.a571_lastSingleStreamAlertHTML = alertHTML;
    }

    if (alertBox) {
        alertBox.style.display = "block";
        alertBox.innerHTML = alertHTML;
    }

    // Display Stream Operating Parameters & Critical Constituents Summary Card
    a571_displayStreamSummaryCard(p, { unitId, isEnvelope: (p.streamNo === "ENVELOPE") });

    // Trigger auto screening evaluation
    const filterForm = document.getElementById("a571-filterForm");
    if (filterForm) {
        filterForm.dispatchEvent(new Event("submit"));
    }
}

function a571_markAutomationCards(autoFilledIds = []) {
    const form = document.getElementById("a571-filterForm");
    if (!form) return;

    const autoSet = new Set(autoFilledIds);
    const inputs = form.querySelectorAll("input, select");

    inputs.forEach(input => {
        const id = input.id;
        if (!id || input.type === "submit" || input.type === "button") return;

        const label = input.closest("label");
        if (!label) return;

        const oldPill = label.querySelector(".a571-status-pill");
        if (oldPill) oldPill.remove();

        const isAuto = autoSet.has(id);
        const pill = document.createElement("span");
        pill.className = "a571-status-pill";

        if (isAuto) {
            label.classList.remove("a571-manual-review-field", "a571-user-edited-field");
            label.classList.add("a571-auto-filled-field");
            pill.classList.add("pill-auto");
            pill.innerHTML = `⚡ Stream Synced`;
        } else {
            label.classList.remove("a571-auto-filled-field", "a571-user-edited-field");
            label.classList.add("a571-manual-review-field");
            pill.classList.add("pill-manual");
            pill.innerHTML = `⚠️ Default / Review`;
        }

        label.insertBefore(pill, label.firstChild);

        if (!input._a571Bound) {
            input._a571Bound = true;
            const onUserChange = () => {
                label.classList.remove("a571-manual-review-field", "a571-auto-filled-field");
                label.classList.add("a571-user-edited-field");
                const currentPill = label.querySelector(".a571-status-pill");
                if (currentPill) {
                    currentPill.className = "a571-status-pill pill-edited";
                    currentPill.innerHTML = `✏️ User Modified`;
                }
            };
            input.addEventListener("input", onUserChange);
            input.addEventListener("change", onUserChange);
        }
    });
}

async function a571_loadStreamData(streamObjOrKey) {
    if (!streamObjOrKey) return;
    if (typeof streamObjOrKey === "object") {
        const converted = a571_convertStreamToPreset(streamObjOrKey);
        return a571_applyStreamDataToForm(converted, "");
    }
    if (typeof streamObjOrKey === "string") {
        const unitSelector = document.getElementById("a571-unitSelector");
        const unitId = unitSelector ? unitSelector.value.trim() : "";

        // 1. Check in currently loaded unit streams
        let s = window.a571_CURRENT_STREAMS?.find(x => x.id === streamObjOrKey || x.streamNo === streamObjOrKey);

        // 2. Check in global presets
        if (!s && window.a571_STREAM_PRESETS?.[streamObjOrKey]) {
            s = window.a571_STREAM_PRESETS[streamObjOrKey];
        }

        // 3. Fetch from backend if not in cache
        if (!s) {
            try {
                const res = await fetch(`/api/damage-criteria?action=stream_data&unit=${encodeURIComponent(unitId)}&streamId=${encodeURIComponent(streamObjOrKey)}`);
                let json = null;
                try { json = await res.json(); } catch (_) {}
                if (!res.ok || (json && json.success === false)) {
                    const errMsg = (json && (json.error || json.message)) ? (json.error || json.message) : `HTTP Error ${res.status}`;
                    throw new Error(errMsg);
                }
                if (json && json.success && json.stream) s = json.stream;
            } catch (e) {
                console.warn("[API 571] a571_loadStreamData fetch warning:", e);
                const alertBox = document.getElementById("a571-autoloadAlert");
                if (alertBox) {
                    alertBox.style.display = "block";
                    alertBox.innerHTML = `
                        <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                            <span class="a571-alert-icon" style="color:#dc2626;">❌</span>
                            <div><strong>Error Loading Stream:</strong> ${a571_escapeHTML(e.message || "Stream data not found in Firestore")}</div>
                        </div>
                    `;
                }
            }
        }

        if (s) {
            return a571_applyStreamDataToForm(s, unitId);
        }
    }
}

function a571_populateAvailableStreams() {
    if (typeof a571_fetchUnits === "function") {
        a571_fetchUnits();
    }
}

function a571_syncFromComparator() {
    let target = null;
    if (window.StreamComparator && typeof window.StreamComparator.getActiveStreams === "function") {
        const active = window.StreamComparator.getActiveStreams();
        target = active.streamA || active.streamB;
    }

    if (!target && window.StreamComparator && typeof window.StreamComparator.getAvailableStreams === "function") {
        const all = window.StreamComparator.getAvailableStreams();
        if (all && all.length > 0) target = all[0];
    }

    if (!target) {
        const streamSelect = document.getElementById("a571-streamPresetSelector") || document.getElementById("a571-stream-select");
        if (streamSelect && streamSelect.value) {
            target = streamSelect.value;
        } else if (streamSelect && streamSelect.options && streamSelect.options.length > 1) {
            target = streamSelect.options[1].value;
        }
    }

    if (target) {
        a571_loadStreamData(target);
    } else {
        const alertBox = document.getElementById("a571-autoloadAlert");
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
                    <span class="a571-alert-icon" style="color:#d97706;">ℹ️</span>
                    <div><strong>No Stream Selected:</strong> Please select a Unit and Stream from the live Firestore dropdown or load a process dataset.</div>
                </div>
            `;
        }
    }
}

function a571_convertStreamToPreset(st) {
    if (!st) return null;
    const p = st.properties || {};
    const c = st.components || {};

    const getNum = (...keys) => {
        for (const k of keys) {
            if (st[k] !== undefined && st[k] !== null && st[k] !== "") {
                const v = parseFloat(st[k]);
                if (Number.isFinite(v)) return v;
            }
            if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
                const v = parseFloat(p[k]);
                if (Number.isFinite(v)) return v;
            }
            if (c[k] !== undefined && c[k] !== null && c[k] !== "") {
                const v = parseFloat(c[k]);
                if (Number.isFinite(v)) return v;
            }
        }
        return null;
    };

    const getStr = (...keys) => {
        for (const k of keys) {
            if (st[k] !== undefined && st[k] !== null && st[k] !== "") {
                if (typeof st[k] === "boolean") return st[k] ? "Y" : "N";
                return String(st[k]).trim();
            }
            if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
                if (typeof p[k] === "boolean") return p[k] ? "Y" : "N";
                return String(p[k]).trim();
            }
            if (c[k] !== undefined && c[k] !== null && c[k] !== "") {
                if (typeof c[k] === "boolean") return c[k] ? "Y" : "N";
                return String(c[k]).trim();
            }
        }
        return "";
    };

    const temp = getNum("temp", "tempC", "Temperature (°C)", "Temperature");
    const press = getNum("pressure", "pressKgCm2", "Pressure (kg/cm2 (g))", "Pressure (kg/cm²g)", "Pressure (barg)", "Pressure");
    const flow = getNum("massFlow", "Flow Mass (kg/hr)", "Mass Flow (kg/hr)", "Flow Mass", "Mass Flow");
    const dens = getNum("density", "liquidDensity", "vaporDensity", "Liquid Density (kg/m3)", "Vapor Density (kg/m3)", "Density (kg/m3)", "Density");
    const pipeD = getNum("pipeDiameter", "Pipe Diameter (mm)", "Pipe Diameter");

    const phase = getStr("phase", "Phase");

    const h2 = getNum("h2", "H2", "Hydrogen");
    const h2MolFrac = getNum("h2MolFrac", "H2_MOL", "H2_VOL", "H2 (mol%)", "H2 (vol%)", "h2_mol");
    const h2s = getNum("h2s", "H2S", "Hydrogen Sulfide");
    const nh3 = getNum("nh3", "NH3", "Ammonia");
    const h2o = getNum("h2o", "H2O", "Water", "Steam");
    const co2 = getNum("co2", "CO2", "Carbon Dioxide");
    const amineFlow = getNum("amineFlow", "MDEA", "DEA", "MEA", "Amine", "Amine Flow");

    const csVal = getStr("carbonSteel", "Carbon Steel");
    const crVal = getNum("crContent", "Cr Content (%)", "Cr Content", "Cr");
    const stressVal = getStr("stress", "Stress");
    const nelsonMat = getStr("nelsonMaterial", "Nelson Material");
    const hardness = getStr("hardness", "Hardness");
    const oxygen = getStr("oxygen", "Oxygen");
    const amineType = getStr("amineType", "Amine Type");
    const amineService = getStr("amineService", "Amine Service");
    const hsas = getNum("hsas", "HSAS");
    const ph = getNum("ph", "pH", "PH");
    const turbulence = getStr("turbulence", "Turbulence");
    const solids = getStr("solids", "Solids");
    const insulated = getStr("insulated", "Insulated");
    const cuiMaterial = getStr("cuiMaterial", "CUI Material");
    const nh3Significant = getStr("nh3Significant", "NH3 Significant");
    const otherContamSignificant = getStr("otherContamSignificant", "Other Contaminants Significant");
    const deltaT = getNum("deltaT", "Delta T");
    const thermalLocation = getStr("thermalLocation", "Thermal Location");
    const eroMaterial = getStr("eroMaterial", "Erosion Material");

    const streamNo = st.streamNo || (st.id ? String(st.id) : "Custom");
    const content = st.content || st.streamName || "";
    const name = st.name || (content ? `Stream ${streamNo} - ${content}` : `Stream ${streamNo}`);

    return {
        id: st.id || streamNo,
        streamNo,
        name,
        streamName: name,
        phase,
        temp,
        pressure: press,
        h2,
        h2MolFrac,
        h2s,
        nh3,
        h2o,
        co2,
        massFlow: flow,
        density: dens,
        pipeDiameter: pipeD,
        carbonSteel: csVal,
        crContent: crVal,
        stress: stressVal,
        nelsonMaterial: nelsonMat,
        hardness,
        oxygen,
        amineFlow,
        amineType,
        amineService,
        hsas,
        ph,
        turbulence,
        solids,
        insulated,
        cuiMaterial,
        nh3Significant,
        otherContamSignificant,
        deltaT,
        thermalLocation,
        eroMaterial,
        description: st.description || content || "Custom Process Stream",
        components: st.components || {},
        constituents: st.constituents || {},
        properties: p
    };
}

function a571_clearAutomationCards() {
    const form = document.getElementById("a571-filterForm");
    if (!form) return;

    // Remove all status pills
    form.querySelectorAll(".a571-status-pill").forEach(pill => pill.remove());

    // Remove all boundary highlight classes
    form.querySelectorAll("label").forEach(label => {
        label.classList.remove("a571-manual-review-field", "a571-auto-filled-field", "a571-user-edited-field");
    });
}

function a571_clearFormInputsOnly() {
    window.a571_nelsonMaterialUserModified = false;
    const form = document.getElementById("a571-filterForm");
    if (form) {
        form.reset();
    }

    // Reset explicit fields
    a571_setInputValue("a571-streamName", "");
    a571_setSelectValue("a571-phase", "");
    a571_setInputValue("a571-temperature", "");
    a571_setInputValue("a571-pressure", "");
    a571_setInputValue("a571-h2", "");
    a571_setInputValue("a571-h2MolFrac", "");
    a571_setInputValue("a571-h2s", "");
    a571_setInputValue("a571-nh3", "");
    a571_setSelectValue("a571-nh3Significant", "");
    a571_setSelectValue("a571-otherContamSignificant", "");
    a571_setInputValue("a571-h2o", "");
    a571_setInputValue("a571-co2", "");

    a571_setSelectValue("a571-carbonSteel", "");
    a571_setInputValue("a571-crContent", "");
    a571_setSelectValue("a571-stress", "");
    a571_setSelectValue("a571-nelsonMaterial", "");
    a571_setSelectValue("a571-hardness", "");
    a571_setSelectValue("a571-oxygen", "");

    a571_setInputValue("a571-amineFlow", "");
    a571_setSelectValue("a571-amineType", "");
    a571_setSelectValue("a571-amineService", "");
    a571_setInputValue("a571-hsas", "");
    a571_setInputValue("a571-ph", "");

    a571_setInputValue("a571-velocityFlow", "");
    a571_setInputValue("a571-velocityDensity", "");
    a571_setInputValue("a571-pipeDiameter", "");
    a571_setInputValue("a571-velocity", "");
    a571_setSelectValue("a571-turbulence", "");
    a571_setSelectValue("a571-solids", "");
    a571_setSelectValue("a571-eroMaterial", "");

    a571_setSelectValue("a571-insulated", "");
    a571_setSelectValue("a571-cuiMaterial", "");
    a571_setInputValue("a571-deltaT", "");
    a571_setSelectValue("a571-thermalLocation", "");

    // Clear all automation boundaries and status pills
    a571_clearAutomationCards();

    // Clear results and calculated parameters using real container a571-result
    const resultContainer = document.getElementById("a571-result");
    if (resultContainer) {
        resultContainer.innerHTML = "";
        resultContainer.style.display = "none";
    }
    const calc = document.getElementById("a571-calculatedParameters");
    if (calc) { calc.innerHTML = ""; calc.style.display = "none"; }
    const alertBox = document.getElementById("a571-autoloadAlert");
    if (alertBox) alertBox.style.display = "none";
}

function a571_resetForm(clearDropdowns) {
    a571_clearFormInputsOnly();

    window.a571_lastSingleStreamData = null;
    window.a571_lastEnvelopeData = null;
    window.a571_lastSingleStreamAlertHTML = null;
    window.a571_lastEnvelopeAlertHTML = null;

    if (clearDropdowns) {
        const unitSelector = document.getElementById("a571-unitSelector");
        if (unitSelector) unitSelector.value = "";

        const caseWrap = document.getElementById("a571-caseWrap");
        if (caseWrap) caseWrap.style.display = "none";

        const caseSelector = document.getElementById("a571-caseSelector");
        if (caseSelector) {
            caseSelector.innerHTML = '<option value="all">-- All Cases --</option>';
        }

        const streamSelector = document.getElementById("a571-streamPresetSelector");
        if (streamSelector) {
            streamSelector.innerHTML = '<option value="">-- Select Process Stream --</option>';
            streamSelector.disabled = true;
        }

        window.a571_ALL_UNIT_STREAMS = [];
        window.a571_CURRENT_STREAMS = [];
    }

    const alertBox = document.getElementById("a571-autoloadAlert");
    if (alertBox) alertBox.style.display = "none";

    const summaryCard = document.getElementById("a571-streamSummaryCard");
    if (summaryCard) summaryCard.style.display = "none";

    const resultContainer = document.getElementById("a571-result");
    if (resultContainer) {
        resultContainer.innerHTML = "";
        resultContainer.style.display = "none";
    }
}

function a571_setFieldValue(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    if (val === null || val === undefined || val === "") {
        el.value = "";
    } else {
        el.value = val;
        el.classList.add("a571-highlight-pulse");
        setTimeout(() => el.classList.remove("a571-highlight-pulse"), 800);
    }
}

function a571_setInputValue(id, val) {
    return a571_setFieldValue(id, val);
}

function a571_setSelectValue(id, val) {
    return a571_setFieldValue(id, val);
}

// =================================================================
// 1-CLICK BRIDGE TO API 581 CORROSION RATE TAB
// =================================================================
function a571_bridgeToCorrosionTab(corrosionTabKey, streamData) {
    if (!corrosionTabKey) return;

    if (typeof window.showCorrosionFullTab === "function") {
        window.showCorrosionFullTab();
    } else {
        document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
        const cTab = document.getElementById("corrosionFullTab");
        if (cTab) cTab.style.display = "block";
    }

    setTimeout(() => {
        const dmSelect = document.getElementById("dmSelectFull");
        if (dmSelect) {
            dmSelect.value = corrosionTabKey;
            dmSelect.dispatchEvent(new Event("change"));

            setTimeout(() => {
                const tempEl = document.querySelector("#formContainerFull input[type='number'], #formContainerFull select[id^='temp']");
                if (tempEl && streamData && streamData.temp != null && !isNaN(streamData.temp)) {
                    tempEl.value = Math.round(Number(streamData.temp));
                    tempEl.dispatchEvent(new Event("input"));
                    tempEl.dispatchEvent(new Event("change"));
                }

                const calcBtn = document.getElementById("calculateBtnFull");
                if (calcBtn) {
                    calcBtn.click();
                }
            }, 150);
        }
    }, 150);
}

/**
 * Helper to extract numeric constituent value from stream object, components, constituents, or properties
 */
function a571_extractStreamConstituent(data, names = []) {
    if (!data) return 0;
    const cleanKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetKeys = names.map(cleanKey);

    // 1. Direct properties
    for (const n of names) {
        if (data[n] !== undefined && data[n] !== null && data[n] !== "") {
            const num = parseFloat(data[n]);
            if (!isNaN(num)) return num;
        }
    }

    // 2. Sub-dictionaries: constituents, components, properties
    const containers = [data.constituents, data.components, data.properties];
    for (const c of containers) {
        if (!c || typeof c !== "object") continue;
        for (const n of names) {
            if (c[n] !== undefined && c[n] !== null && c[n] !== "") {
                const num = parseFloat(c[n]);
                if (!isNaN(num)) return num;
            }
        }
        for (const [k, v] of Object.entries(c)) {
            if (targetKeys.includes(cleanKey(k))) {
                const num = parseFloat(v);
                if (!isNaN(num)) return num;
            }
        }
    }

    // 3. Fallback check on matched stream in CURRENT_STREAMS
    const sId = String(data.id || data.streamNo || "");
    if (sId && window.a571_CURRENT_STREAMS && Array.isArray(window.a571_CURRENT_STREAMS)) {
        const found = window.a571_CURRENT_STREAMS.find(s => String(s.id) === sId || String(s.streamNo) === sId);
        if (found && found !== data) {
            for (const n of names) {
                if (found[n] !== undefined && found[n] !== null && found[n] !== "") {
                    const num = parseFloat(found[n]);
                    if (!isNaN(num)) return num;
                }
            }
            const foundContainers = [found.constituents, found.components, found.properties];
            for (const fc of foundContainers) {
                if (!fc || typeof fc !== "object") continue;
                for (const n of names) {
                    if (fc[n] !== undefined && fc[n] !== null && fc[n] !== "") {
                        const num = parseFloat(fc[n]);
                        if (!isNaN(num)) return num;
                    }
                }
                for (const [k, v] of Object.entries(fc)) {
                    if (targetKeys.includes(cleanKey(k))) {
                        const num = parseFloat(v);
                        if (!isNaN(num)) return num;
                    }
                }
            }
        }
    }

    return 0;
}

// =================================================================
// DISPLAY STREAM OPERATING PARAMETERS & CRITICAL CONSTITUENTS SUMMARY CARD
// =================================================================
function a571_displayStreamSummaryCard(data, options = {}) {
    const cardEl = document.getElementById("a571-streamSummaryCard");
    if (!cardEl) return;

    cardEl.style.display = "block";

    const streamName = a571_getValue("a571-streamName") || (data ? (data.name || data.streamName || "Stream") : "Stream");
    const phase = a571_getValue("a571-phase") || (data ? data.phase : "Mixed");
    const hasNum = (v) => v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
    const tempRaw = a571_getValue("a571-temperature");
    const temp = hasNum(tempRaw) ? Number(tempRaw) : (data && hasNum(data.temp) ? Number(data.temp) : (data && hasNum(data.tempC) ? Number(data.tempC) : null));
    const pressRaw = a571_getValue("a571-pressure");
    const pressure = hasNum(pressRaw) ? Number(pressRaw) : (data && hasNum(data.pressure) ? Number(data.pressure) : (data && hasNum(data.pressKgCm2) ? Number(data.pressKgCm2) : null));
    
    let tempRangeStr = temp !== null ? `${temp.toFixed(1)}°C` : "-";
    if (options.isEnvelope && hasNum(options.minTemp) && hasNum(options.maxTemp)) {
        tempRangeStr = `${Number(options.minTemp).toFixed(1)}°C to ${Number(options.maxTemp).toFixed(1)}°C`;
    }

    // Dynamic constituent extraction from database record or form fields
    const getConstituentVal = (names, inputId) => {
        const fromData = a571_extractStreamConstituent(data, names);
        if (fromData > 0) return fromData;
        if (inputId) {
            const fromInput = a571_numberValue(inputId);
            if (fromInput > 0) return fromInput;
        }
        return fromData;
    };

    const h2s = getConstituentVal(["h2s", "H2S", "Hydrogen Sulfide", "HydrogenSulfide", "hydrogen_sulfide"], "a571-h2s");
    const co2 = getConstituentVal(["co2", "CO2", "Carbon Dioxide", "CarbonDioxide", "carbon_dioxide"], "a571-co2");
    const nh3 = getConstituentVal(["nh3", "NH3", "Ammonia", "ammonia"], "a571-nh3");
    const h2 = getConstituentVal(["h2", "H2", "Hydrogen", "hydrogen"], "a571-h2");
    const h2MolFrac = getConstituentVal(["h2MolFrac", "h2_mol", "h2Mol", "H2_MOL", "H2_VOL", "H2 (mol%)", "H2 (vol%)", "Hydrogen Mol%"], "a571-h2MolFrac");
    const h2o = getConstituentVal(["h2o", "H2O", "Water", "water", "Steam", "steam"], "a571-h2o");
    const chloride = getConstituentVal(["chloride", "chlorides", "Chloride", "Chlorides", "HCl", "hcl", "Total Chloride"], "a571-chloride");
    const sulfur = getConstituentVal(["sulfur", "Sulfur", "totalSulfur", "TotalSulfur", "Total Sulfur", "total_sulfur"], "a571-sulfur");
    const co = getConstituentVal(["co", "CO", "Carbon Monoxide", "CarbonMonoxide"], "a571-co");
    const caustic = getConstituentVal(["caustic", "Caustic", "NaOH", "naoh", "Sodium Hydroxide"], "a571-caustic");
    const methane = getConstituentVal(["methane", "Methane", "ch4", "CH4"], "a571-methane");
    const nitrogen = getConstituentVal(["nitrogen", "Nitrogen", "n2", "N2"], "a571-nitrogen");
    const amine = getConstituentVal(["amine", "Amine", "mdea", "MDEA", "amineFlow", "DEA", "MEA"], "a571-amineFlow");

    const processFluid = data && (data.fluid || data.fluidClass) ? (data.fluid || data.fluidClass) : (h2 > 0 || h2MolFrac > 10 ? "Hydrocarbon / Hydrogen-rich" : "Process Hydrocarbon Stream");
    const streamNos = options.isEnvelope && options.streamCount ? `Streams: ${options.streamIds || options.streamCount}` : (streamName.includes("Stream") ? streamName : `Stream ${streamName}`);
    const referencePFD = data && (data.pfd || data.caseTag) ? (data.pfd || data.caseTag) : (options.unitId ? `Unit ${options.unitId} / PFD-REF-01` : "Refinery PFD Tag - Design Case");

    const fmtVal = (val, unit = "kg/h") => {
        if (val === undefined || val === null || val === "" || Number(val) === 0) return "NIL";
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return `${num.toLocaleString(undefined, {maximumFractionDigits: 2})} ${unit}`;
    };

    const fmtConc = (val, unit = "wt ppm") => {
        if (val === undefined || val === null || val === "" || Number(val) === 0) return "NIL";
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return `${num.toLocaleString(undefined, {maximumFractionDigits: 2})} ${unit}`;
    };

    const fmtPct = (val) => {
        if (val === undefined || val === null || val === "" || Number(val) === 0) return "NIL";
        const num = Number(val);
        if (isNaN(num)) return String(val);
        return `${num.toLocaleString(undefined, {maximumFractionDigits: 2})} mol%`;
    };

    // Fully dynamic component & constituent extraction with strict chemical constituent filtering & deduplication
    let rawCompsMap = new Map();
    const excludeKeys = new Set([
        "temperature", "temp", "pressure", "phase", "massflow", "flowmass", "density", "liquiddensity", 
        "pipediameter", "carbonsteel", "crcontent", "stress", "hardness", "oxygen", "aminetype", "amineservice", 
        "hsas", "ph", "turbulence", "solids", "insulated", "cuimaterial", "nh3significant", "othercontamsignificant", 
        "deltat", "thermallocation", "eromaterial", "id", "name", "streamno", "streamcount", "fluid", "fluidclass", 
        "pfd", "casetag", "unitid", "createdat", "updatedat", "flow", "massflow", "volflow", "viscosity", 
        "molecularweight", "mw", "compressibility", "heatcapacity", "conductivity", "vaporpressure",
        "velocity", "reynolds", "status", "notes", "description", "type", "unit", "source", "category",
        "basestreamno", "flowmolar", "molarflow", "vapordensity", "liquidviscosity", "vaporviscosity",
        "surfacetension", "surfacetensiondynecm", "content", "contentphase", "wtvaporized", "wtvaporizedpercent", "vaporized"
    ]);

    const standardizeConstituentLabel = (rawName) => {
        const clean = String(rawName).trim();
        const l = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (l === "h2s" || l === "hydrogensulfide") return "H₂S (Hydrogen Sulfide)";
        if (l === "nh3" || l === "ammonia") return "NH₃ (Ammonia)";
        if (l === "h2" || l === "hydrogen") return "H₂ (Hydrogen)";
        if (l === "co2" || l === "carbondioxide") return "CO₂ (Carbon Dioxide)";
        if (l === "h2o" || l === "water" || l === "steam") return "H₂O (Water)";
        if (l === "hcl" || l === "chloride" || l === "chlorides") return "HCl / Chloride";
        if (l === "totalsulfur" || l === "sulfur") return "Total Sulfur";
        if (l === "co" || l === "carbonmonoxide") return "CO (Carbon Monoxide)";
        if (l === "naoh" || l === "caustic" || l === "sodiumhydroxide") return "Caustic (NaOH)";
        if (l === "ch4" || l === "methane") return "Methane (CH₄)";
        if (l === "n2" || l === "nitrogen") return "Nitrogen (N₂)";
        if (l === "amine" || l === "mdea" || l === "dea" || l === "mea") return "Amine";
        if (l === "hf" || l === "hydrofluoric" || l === "fluoride") return "HF (Hydrofluoric Acid)";
        if (l === "cyanide" || l === "cyanides") return "Cyanides";
        if (l === "phenol" || l === "phenols") return "Phenols";
        if (l === "naphthenic" || l === "naphthenicacid") return "Naphthenic Acid";
        if (l === "mercaptan" || l === "mercaptans") return "Mercaptans";
        return clean;
    };

    const addComp = (k, v, isExplicit = false) => {
        if (!k) return;
        const cleanName = String(k).trim();
        const cleanLower = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (excludeKeys.has(cleanLower)) return;

        // Immediate rejection for any operating parameters or physical stream properties
        const isNonChemProperty = 
            cleanLower.includes("temperature") || cleanLower.includes("temp") ||
            cleanLower.includes("pressure") || cleanLower.includes("press") ||
            cleanLower.includes("density") || cleanLower.includes("viscosity") ||
            cleanLower.includes("flow") || cleanLower.includes("stream") ||
            cleanLower.includes("base") || cleanLower.includes("phase") ||
            cleanLower.includes("diameter") || cleanLower.includes("velocity") ||
            cleanLower.includes("weight") || cleanLower.includes("mw") ||
            cleanLower.includes("capacity") || cleanLower.includes("conductivity") ||
            cleanLower.includes("material") || cleanLower.includes("status") ||
            cleanLower.includes("casetag") || cleanLower.includes("unitid") || cleanLower.includes("pfd") ||
            cleanLower.includes("surfacetension") || cleanLower.includes("tension") || cleanLower.includes("dyne") ||
            cleanLower.includes("content") || cleanLower.includes("vaporized") || cleanLower.includes("vapourised") ||
            cleanLower.includes("vapor") || cleanLower.includes("vapour") ||
            (cleanLower.includes("id") && !cleanLower.includes("acid") && !cleanLower.includes("sulfide") && !cleanLower.includes("chloride"));

        if (isNonChemProperty) return;

        const num = parseFloat(v);
        if (isNaN(num) || num <= 0) return;

        if (!isExplicit) {
            const isChemicalKey = 
                cleanLower.includes("h2s") || cleanLower.includes("sulfide") || cleanLower.includes("sulfur") ||
                cleanLower.includes("nh3") || cleanLower.includes("ammonia") ||
                cleanLower.includes("h2") || cleanLower.includes("hydrogen") ||
                cleanLower.includes("co2") || cleanLower.includes("carbondioxide") ||
                cleanLower.includes("h2o") || cleanLower.includes("water") || cleanLower.includes("steam") ||
                cleanLower.includes("chloride") || cleanLower.includes("hcl") ||
                cleanLower === "co" || cleanLower.includes("carbonmonoxide") ||
                cleanLower.includes("naoh") || cleanLower.includes("caustic") ||
                cleanLower.includes("methane") || cleanLower.includes("ch4") ||
                cleanLower.includes("nitrogen") || cleanLower === "n2" ||
                cleanLower.includes("amine") || cleanLower.includes("mdea") || cleanLower.includes("dea") || cleanLower.includes("mea") ||
                cleanLower.includes("hf") || cleanLower.includes("fluoride") ||
                cleanLower.includes("phenol") || cleanLower.includes("cyanide") ||
                cleanLower.includes("naphthenic") || cleanLower.includes("mercaptan") ||
                cleanLower.includes("contam") || cleanLower.includes("trace") || cleanLower.includes("constituent") || cleanLower.includes("comp");
            if (!isChemicalKey) return;
        }

        const label = standardizeConstituentLabel(cleanName);
        const mapKey = label.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (rawCompsMap.has(mapKey)) {
            const existing = rawCompsMap.get(mapKey);
            existing.val = Math.max(existing.val, num);
            if (label.length >= existing.label.length) {
                existing.label = label;
            }
        } else {
            rawCompsMap.set(mapKey, { label: label, val: num });
        }
    };

    if (data) {
        if (data.components && typeof data.components === "object") {
            for (const [k, v] of Object.entries(data.components)) addComp(k, v, true);
        }
        if (data.constituents && typeof data.constituents === "object") {
            for (const [k, v] of Object.entries(data.constituents)) addComp(k, v, true);
        }
        if (data.properties && typeof data.properties === "object") {
            for (const [k, v] of Object.entries(data.properties)) addComp(k, v, false);
        }
        for (const [k, v] of Object.entries(data)) {
            if (k !== "components" && k !== "constituents" && k !== "properties") {
                addComp(k, v, false);
            }
        }
        if (h2s > 0) addComp("H2S", h2s, true);
        if (co2 > 0) addComp("CO2", co2, true);
        if (nh3 > 0) addComp("NH3", nh3, true);
        if (h2 > 0 || h2MolFrac > 0) addComp("H2", h2 > 0 ? h2 : h2MolFrac, true);
        if (h2o > 0) addComp("H2O", h2o, true);
        if (chloride > 0) addComp("Chloride", chloride, true);
        if (sulfur > 0) addComp("Sulfur", sulfur, true);
        if (co > 0) addComp("CO", co, true);
        if (caustic > 0) addComp("Caustic", caustic, true);
        if (methane > 0) addComp("Methane", methane, true);
        if (nitrogen > 0) addComp("Nitrogen", nitrogen, true);
        if (amine > 0) addComp("Amine", amine, true);
    }

    if (options.isEnvelope && window.a571_CURRENT_STREAMS && Array.isArray(window.a571_CURRENT_STREAMS)) {
        const streamIdsArr = Array.isArray(options.streamIds) 
            ? options.streamIds.map(s => String(s).trim()) 
            : (options.streamIds ? String(options.streamIds).split(",").map(s => s.trim()) : []);
        const matchedStreams = window.a571_CURRENT_STREAMS.filter(s => streamIdsArr.length === 0 || streamIdsArr.includes(String(s.streamNo || s.id)));
        if (matchedStreams.length > 0) {
            for (const s of matchedStreams) {
                if (s.components && typeof s.components === "object") {
                    for (const [ck, cv] of Object.entries(s.components)) addComp(ck, cv, true);
                }
                if (s.constituents && typeof s.constituents === "object") {
                    for (const [ck, cv] of Object.entries(s.constituents)) addComp(ck, cv, true);
                }
                if (s.properties && typeof s.properties === "object") {
                    for (const [ck, cv] of Object.entries(s.properties)) addComp(ck, cv, false);
                }
                for (const [ck, cv] of Object.entries(s)) {
                    if (ck !== "components" && ck !== "constituents" && ck !== "properties") {
                        addComp(ck, cv, false);
                    }
                }
                const sh2s = parseFloat(s.h2s || s.H2S || 0);
                const sco2 = parseFloat(s.co2 || s.CO2 || 0);
                const snh3 = parseFloat(s.nh3 || s.NH3 || 0);
                const sh2 = parseFloat(s.h2 || s.H2 || s.h2MolFrac || 0);
                const sh2o = parseFloat(s.h2o || s.H2O || 0);
                const schloride = parseFloat(s.chloride || s.Chlorides || s.HCl || 0);
                const ssulfur = parseFloat(s.sulfur || s.Sulfur || 0);
                if (sh2s > 0) addComp("H2S", sh2s, true);
                if (sco2 > 0) addComp("CO2", sco2, true);
                if (snh3 > 0) addComp("NH3", snh3, true);
                if (sh2 > 0) addComp("H2", sh2, true);
                if (sh2o > 0) addComp("H2O", sh2o, true);
                if (schloride > 0) addComp("Chloride", schloride, true);
                if (ssulfur > 0) addComp("Sulfur", ssulfur, true);
            }
        }
    }

    let dynamicConstituents = [];
    for (const item of rawCompsMap.values()) {
        const cleanName = item.label;
        const num = item.val;

        let unit = "kg/h";
        let color = "#0f172a";
        const upper = cleanName.toUpperCase();
        if (upper.includes("H2S") || upper.includes("SULFIDE") || upper.includes("SULFUR")) {
            color = "#dc2626";
            if (upper.includes("PPM")) unit = "ppmw";
            else if (upper.includes("MOL")) unit = "mol%";
            else unit = "kg/h";
        } else if (upper.includes("NH3") || upper.includes("AMMONIA")) {
            color = "#2563eb";
            if (upper.includes("PPM")) unit = "ppmw";
            else if (upper.includes("MOL")) unit = "mol%";
            else unit = "kg/h";
        } else if (upper.includes("H2") || upper.includes("HYDROGEN")) {
            color = "#2563eb";
            if (upper.includes("PPM")) unit = "ppmw";
            else if (upper.includes("MOL") || upper.includes("FRAC")) unit = "mol%";
            else unit = "kg/h";
        } else if (upper.includes("CO2") || upper.includes("CARBON")) {
            color = "#d97706";
            if (upper.includes("PPM")) unit = "ppmw";
            else if (upper.includes("MOL") || upper.includes("FRAC")) unit = "mol%";
            else unit = "kg/h";
        } else if (upper.includes("CHLORIDE") || upper.includes("HCL")) {
            color = "#b45309";
            if (upper.includes("PPM")) unit = "ppmw";
            else unit = "kg/h";
        } else if (upper.includes("AMINE") || upper.includes("MDEA")) {
            color = "#7c3aed";
            if (upper.includes("PPM")) unit = "wt ppm";
            else unit = "kg/h";
        } else if (upper.includes("MOL") || upper.includes("VOL")) {
            unit = "mol%";
        } else if (upper.includes("PPM")) {
            unit = "ppmw";
        } else {
            unit = "kg/h";
        }

        dynamicConstituents.push({
            label: cleanName,
            val: num,
            display: `${num.toLocaleString(undefined, {maximumFractionDigits: 2})} ${unit}`,
            color: color
        });
    }

    dynamicConstituents.sort((a, b) => b.val - a.val);

    const activeConstituents = dynamicConstituents;

    let table3HTML = "";
    if (activeConstituents.length === 0) {
        table3HTML = `<div style="color: #64748b; font-style: italic; text-align: center; padding: 12px; background: #f8fafc; border-radius: 6px;">No critical process constituents or trace contaminants reported (> 0) for this stream.</div>`;
    } else {
        const mid = Math.ceil(activeConstituents.length / 2);
        const col1 = activeConstituents.slice(0, mid);
        const col2 = activeConstituents.slice(mid);

        const renderCol = (items) => `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1.5px solid #cbd5e1; font-size: 11.5px; color: #475569; background: #f1f5f9;">
                        <th style="text-align: left; padding: 6px 8px; font-weight: 700;">Constituent</th>
                        <th style="text-align: right; padding: 6px 8px; font-weight: 700;">Flow Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="color: #334155; padding: 6px 8px; font-weight: 600;">${item.label}</td>
                            <td style="font-weight: 700; text-align: right; padding: 6px 8px; color: ${item.color};">${item.display}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        table3HTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; font-size: 12.5px;">
                <div>${renderCol(col1)}</div>
                ${col2.length > 0 ? `<div>${renderCol(col2)}</div>` : ''}
            </div>
        `;
    }

    const table3TextData = "Constituent\tFlow Rate\n" + activeConstituents.map(c => `${c.label}\t${c.display}`).join('\n');
    window.a571_lastTable3TextData = table3TextData;

    cardEl.innerHTML = `
        <div class="calc-card" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                    📋 Stream Operating Envelope & Critical Constituents Summary
                </h4>
                <span class="a571-status-pill" style="background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 11.5px; padding: 3px 10px; border-radius: 6px;">
                    ${options.isEnvelope ? `⚡ ENVELOPE MODE (${options.streamCount || 'Multi'} Streams)` : `🔍 SINGLE STREAM`}
                </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
                <!-- Table 1: Operating Parameters -->
                <div style="background: #fff; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">1. Operating Parameters</div>
                    <table style="width: 100%; font-size: 12.5px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #f8fafc;"><td style="color: #64748b; padding: 4px 0; width: 55%;">Operating Temperature:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${tempRangeStr}</td></tr>
                        <tr style="border-bottom: 1px solid #f8fafc;"><td style="color: #64748b; padding: 4px 0;">Operating Pressure:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${pressure !== null ? `${pressure.toFixed(1)} kg/cm² g` : "-"}</td></tr>
                                                <tr><td style="color: #64748b; padding: 4px 0;">Stream Phase:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${phase ? `${a571_escapeHTML(phase)} Phase` : "-"}</td></tr>
                    </table>
                </div>

                <!-- Table 2: Stream Reference -->
                <div style="background: #fff; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">2. Stream Reference & PFD Tag</div>
                    <table style="width: 100%; font-size: 12.5px; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #f8fafc;"><td style="color: #64748b; padding: 4px 0; width: 45%;">Stream Identification:</td><td style="font-weight: 600; color: #2563eb; text-align: right;">${a571_escapeHTML(streamNos)}</td></tr>
                        <tr style="border-bottom: 1px solid #f8fafc;"><td style="color: #64748b; padding: 4px 0;">Reference PFD / Case:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${a571_escapeHTML(referencePFD)}</td></tr>
                        <tr style="border-bottom: 1px solid #f8fafc;"><td style="color: #64748b; padding: 4px 0;">Screening Basis:</td><td style="font-weight: 600; color: #16a34a; text-align: right;">API RP 571 3rd Ed.</td></tr>
                        <tr><td style="color: #64748b; padding: 4px 0;">Evaluation Date:</td><td style="font-weight: 600; color: #0f172a; text-align: right;">${new Date().toLocaleDateString()}</td></tr>
                    </table>
                </div>
            </div>

            <!-- Table 3: Critical Process Constituents -->
            <div style="background: #fff; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    <div style="font-weight: 700; font-size: 13px; color: #334155;">3. Critical Process Constituents & Trace Contaminants Summary</div>
                    <button type="button" onclick="a571_copyTableData(this)" style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 10px; font-size: 11.5px; font-weight: 600; cursor: pointer; color: #334155; display: inline-flex; align-items: center; gap: 4px; transition: all 0.2s ease;" title="Copy constituent data to clipboard">📋 Copy Table Data</button>
                </div>
                ${table3HTML}
            </div>
        </div>
    `;
}

// =================================================================
// DISPLAY CALCULATED PARAMETERS
// =================================================================
function a571_displayCalculatedParameters(values) {
    const calc = document.getElementById("a571-calculatedParameters");
    if (!calc || !values) return;

    calc.style.display = "block";

    const hasVal = (v) => v !== null && v !== undefined && v !== "" && !isNaN(v);

    const h2sPpmwStr = hasVal(values.h2sPPMW) && values.h2sPPMW > 0 ? `${Number(values.h2sPPMW).toFixed(1)} ppmw` : "-";
    const h2ChargingStr = hasVal(values.h2sPPMW) ? (values.h2sPPMW >= 1 ? "✓ ACTIVE (≥1 ppmw)" : "✕ INACTIVE (<1 ppmw)") : "-";
    const nh4hsKgStr = hasVal(values.nh4hsKgHr) && values.nh4hsKgHr > 0 ? `${Number(values.nh4hsKgHr).toFixed(1)} kg/h` : "-";
    const nh4hsWtStr = hasVal(values.nh4hsWt) && values.nh4hsWt > 0 ? `${Number(values.nh4hsWt).toFixed(2)} wt% ${values.nh4hsWt > 2 ? "(>2% Critical)" : ""}` : "-";
    const nh4hsTempStatus = a571_escapeHTML(values.nh4hsTemperatureStatus || "-");
    const pressStr = hasVal(values.pressure) ? `${values.pressure} kg/cm² g` : "-";
    const phStr = hasVal(values.ph) && values.ph > 0 ? Number(values.ph).toFixed(2) : "-";

    const velStr = (hasVal(values.velocityMS) && values.velocityMS > 0 && values.velocitySource !== "NOT AVAILABLE")
        ? `${Number(values.velocityMS).toFixed(2)} m/s (${hasVal(values.velocityFPS) ? Number(values.velocityFPS).toFixed(1) : (Number(values.velocityMS) * 3.28084).toFixed(1)} fps)`
        : "-";

    const flowDensityStr = (hasVal(values.velocityFlow) && hasVal(values.velocityDensity) && values.velocityFlow > 0 && values.velocityDensity > 0)
        ? `${Number(values.velocityFlow).toLocaleString()} kg/h @ ${values.velocityDensity} kg/m³`
        : (hasVal(values.velocityFlow) && values.velocityFlow > 0 ? `${Number(values.velocityFlow).toLocaleString()} kg/h` : "-");

    const pipeDiamStr = hasVal(values.pipeDiameter) && values.pipeDiameter > 0 ? `${values.pipeDiameter} mm` : "-";
    const cuiWindowStr = (hasVal(values.cuiLower) && hasVal(values.cuiUpper)) ? `${values.cuiLower} to ${values.cuiUpper}°C` : "-";
    const deltaTStr = hasVal(values.deltaT) && values.deltaT > 0 ? `${values.deltaT}°C ${values.deltaT >= 28 ? "(≥28°C Fatigue Risk)" : ""}` : "-";
    const ppH2Str = hasVal(values.ppH2Psia) && values.ppH2Psia > 0 ? `${values.ppH2Psia} psia (${hasVal(values.ppH2KgCm2a) ? values.ppH2KgCm2a : (values.ppH2Psia * 0.070307).toFixed(2)} kg/cm²a)` : "-";
    const nelsonLimitStr = (hasVal(values.hthaTLimitF) && values.hthaTLimitF < 9000)
        ? `${values.hthaTLimitF}°F${hasVal(values.hthaMarginF) ? ` (Margin: ${values.hthaMarginF}°F)` : ""}`
        : (hasVal(values.hthaTLimitF) && values.hthaTLimitF >= 9000 ? "Immune (Austenitic SS / Low ppH₂)" : "-");

    calc.innerHTML = `
        <div class="calc-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: var(--accent, #3b82f6);">
                    ⚙️ Calculated Hydraulic & Chemical Screening Parameters
                </h4>
                <span class="a571-status-pill">${a571_escapeHTML(values.velocitySource || "-")}</span>
            </div>

            <div class="calc-grid">
                <div><strong>H₂S in Water (ppmw)</strong><span>${h2sPpmwStr}</span></div>
                <div><strong>H₂ Charging Screening</strong><span>${h2ChargingStr}</span></div>
                <div><strong>NH4HS Synthesized</strong><span>${nh4hsKgStr}</span></div>
                <div><strong>NH4HS Aqueous Wt%</strong><span>${nh4hsWtStr}</span></div>
                <div><strong>NH4HS Temperature Status</strong><span>${nh4hsTempStatus}</span></div>
                <div><strong>Operating Pressure</strong><span>${pressStr}</span></div>
                <div><strong>Sour Water pH</strong><span>${phStr}</span></div>
                <div><strong>Calculated Velocity</strong><span>${velStr}</span></div>
                <div><strong>Mass Flow & Density</strong><span>${flowDensityStr}</span></div>
                <div><strong>Pipe Inside Diameter</strong><span>${pipeDiamStr}</span></div>
                <div><strong>CUI Temperature Window</strong><span>${cuiWindowStr}</span></div>
                <div><strong>Thermal Gradient (|ΔT|)</strong><span>${deltaTStr}</span></div>
                <div><strong>H₂ Partial Pressure (ppH₂)</strong><span>${ppH2Str}</span></div>
                <div><strong>API 941 Nelson Limit Temp</strong><span>${nelsonLimitStr}</span></div>
            </div>
        </div>
    `;
}

// =================================================================
// COMBINED INSPECTION TECHNIQUES WORKPACK
// =================================================================
function a571_buildInspectionSummaryHTML(results) {
    const applicable = (results || []).filter(r => r.applicable && r.inspection);
    if (applicable.length === 0) {
        return `
            <div class="calc-card" style="margin-top: 14px;">
                <h4>Combined Inspection Techniques (API 570 / 581 Workpack)</h4>
                <p>No active damage mechanisms flagged for this operating stream — standard baseline inspection applies.</p>
            </div>
        `;
    }

    const groups = {};
    const order = [];

    applicable.forEach(function (r) {
        const codeMatch = r.mechanism.match(/\(([\d.]+)\)\s*$/);
        const code = codeMatch ? codeMatch[1] : r.mechanism;

        if (!groups[code]) {
            groups[code] = { code, mechanism: r.mechanism, entries: [] };
            order.push(code);
        }
        groups[code].entries.push(r);
    });

    let rowsHTML = "";
    order.forEach(function (code) {
        const group = groups[code];
        const seen = new Set();
        const techList = [];

        group.entries.forEach(e => {
            e.inspection.split(";").map(s => s.trim()).filter(Boolean).forEach(t => {
                if (!seen.has(t)) {
                    seen.add(t);
                    techList.push(t);
                }
            });
        });

        rowsHTML += `
            <tr>
                <td style="font-weight: 700;">${a571_escapeHTML(group.mechanism)}</td>
                <td><span class="a571-category-tag">${a571_escapeHTML(group.entries[0].category || "Integrity")}</span></td>
                <td>${a571_escapeHTML(techList.join("; "))}</td>
            </tr>
        `;
    });

    return `
        <div class="calc-card" style="margin-top: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">
                    📋 API 570 / API 581 Inspection Circuit Workpack Recommendations
                </h4>
                <span style="font-size: 12px; color: #64748b;">${applicable.length} Applicable Mechanism Inspections</span>
            </div>
            <div class="result-table-wrapper">
                <table class="damage-table">
                    <thead>
                        <tr>
                            <th style="width: 28%;">Damage Mechanism (API 571)</th>
                            <th style="width: 20%;">Integrity Family</th>
                            <th style="width: 52%;">Mandatory & Recommended NDT Inspection Techniques</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function a571_toggleInspectionSummary() {
    const panel = document.getElementById("a571-inspectionSummaryPanel");
    if (!panel) return;
    panel.style.display = (panel.style.display === "none" || panel.style.display === "") ? "block" : "none";
}

// =================================================================
// MATRIX CATEGORY FILTERING
// =================================================================
function a571_filterMatrixCategory(category) {
    document.querySelectorAll(".a571-filter-chip").forEach(c => c.classList.remove("active"));
    const activeChip = document.getElementById(`a571-chip-${category}`);
    if (activeChip) activeChip.classList.add("active");

    const cards = document.querySelectorAll(".a571-matrix-card");
    cards.forEach(card => {
        const cardCat = card.getAttribute("data-cat");
        const isApp = card.getAttribute("data-applicable") === "true";

        if (category === "all") {
            card.style.display = "flex";
        } else if (category === "applicable") {
            card.style.display = isApp ? "flex" : "none";
        } else if (cardCat === category) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

// =================================================================
// DISPLAY SCREENING MATRIX RESULTS
// =================================================================
function a571_displayResults(stream, results, rawData, kpis) {
    const output = document.getElementById("a571-result");
    if (!output || !results) return;

    output.style.display = "block";
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const applicableList = results.filter(r => r.applicable);
    const applicableCount = kpis ? kpis.applicable : applicableList.length;
    const conditionalCount = kpis ? kpis.conditional : results.filter(r => !r.applicable && r.status.includes("SCREEN FURTHER")).length;
    const notApplicableCount = kpis ? kpis.notApplicable : (results.length - applicableCount - conditionalCount);
    const dominantThreat = kpis ? kpis.dominantThreat : (applicableList[0]?.mechanism || "None Flagged");

    // Build Matrix Cards HTML
    let matrixCardsHTML = "";
    results.forEach((r) => {
        const cardCat = (r.category || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const statusBadgeClass = r.applicable ? "a571-badge-danger" : (r.status.includes("SCREEN FURTHER") ? "a571-badge-warning" : "a571-badge-neutral");
        const statusIcon = r.applicable ? "🔴" : (r.status.includes("SCREEN FURTHER") ? "🟡" : "🟢");

        let bridgeBtnHTML = "";
        if (r.applicable && r.corrosionTabKey) {
            bridgeBtnHTML = `
                <button type="button" class="a571-bridge-btn" onclick="a571_bridgeToCorrosionTab('${r.corrosionTabKey}', window.a571_lastScreenedData)" title="Directly compute corrosion rate in API 581 tab">
                    ⚡ Compute Corrosion Rate (API 581) &rarr;
                </button>
            `;
        }

        matrixCardsHTML += `
            <div class="a571-matrix-card ${r.applicable ? 'applicable-border' : ''}" data-cat="${cardCat}" data-applicable="${r.applicable}">
                <div class="a571-card-top">
                    <span class="a571-card-cat">${a571_escapeHTML(r.category || "Integrity")}</span>
                    <span class="a571-card-badge ${statusBadgeClass}">${statusIcon} ${r.applicable ? 'APPLICABLE' : a571_escapeHTML(r.status)}</span>
                </div>
                <div class="a571-card-title">${a571_escapeHTML(r.mechanism)}</div>
                <div class="a571-card-basis">
                    <strong>Process Trigger:</strong> ${a571_escapeHTML(r.basis)}
                </div>
                ${r.applicable && r.inspection ? `
                <div class="a571-card-inspection">
                    <strong>NDT Inspection:</strong> ${a571_escapeHTML(r.inspection)}
                </div>
                ` : ''}
                ${bridgeBtnHTML}
            </div>
        `;
    });

    // Build Audit Table HTML
    let tableRowsHTML = "";
    results.forEach(result => {
        tableRowsHTML += `
            <tr class="${result.applicable ? "applicable-row" : "not-applicable-row"}">
                <td><strong>${a571_escapeHTML(result.mechanism)}</strong></td>
                <td><span class="a571-category-tag">${a571_escapeHTML(result.category || "General")}</span></td>
                <td>
                    <span class="status-badge ${result.applicable ? "status-applicable" : "status-not"}">
                        ${result.applicable ? "✓ APPLICABLE" : "✕ " + a571_escapeHTML(result.status)}
                    </span>
                </td>
                <td>${a571_escapeHTML(result.basis)}</td>
                <td>${a571_escapeHTML(result.justification)}</td>
                <td>
                    ${result.applicable ? `<div class="inspection-box"><strong>Inspection:</strong><br>${a571_escapeHTML(result.inspection)}</div>` : `<span class="inspection-empty">—</span>`}
                </td>
            </tr>
        `;
    });

    const inspectionSummaryHTML = a571_buildInspectionSummaryHTML(results);

    // Cache globally for bridge operations and export
    window.a571_lastScreenedData = rawData;
    window.a571_lastScreenedResults = results;

    let fullHTML = `
        <div class="a571-result-container">
            <!-- Header Bar -->
            <div class="a571-matrix-header">
                <div>
                    <h3 style="margin: 0; font-size: 20px; font-weight: 700; color: var(--text, #1e293b);">
                        🛡️ API 571 Damage Mechanism Screening Matrix
                    </h3>
                    <p style="margin: 4px 0 0 0; font-size: 13.5px; color: var(--text-light, #64748b);">
                        Active Stream: <strong>${a571_escapeHTML(stream)}</strong> (Screened against 17 API 571 Mechanisms)
                    </p>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="a571-export-btn" onclick="a571_exportMatrixPDF()" title="Export PDF Screening Report">
                        📄 Export PDF Report
                    </button>
                    <button type="button" class="a571-export-btn" onclick="a571_exportMatrixExcel()" title="Export Excel / CSV Matrix">
                        📊 Export Excel Matrix
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="a571-kpi-row">
                <div class="a571-kpi-box">
                    <span class="a571-kpi-title">TOTAL MECHANISMS</span>
                    <span class="a571-kpi-val" style="color: #2563eb;">${results.length}</span>
                    <span class="a571-kpi-sub">API 571 Standard Rules</span>
                </div>
                <div class="a571-kpi-box" style="cursor: pointer;" onclick="a571_filterMatrixCategory('applicable')" title="Filter to show applicable only">
                    <span class="a571-kpi-title">ACTIVE / APPLICABLE</span>
                    <span class="a571-kpi-val" style="color: #dc2626;">${applicableCount}</span>
                    <span class="a571-kpi-sub">Immediate Inspection Threats</span>
                </div>
                <div class="a571-kpi-box">
                    <span class="a571-kpi-title">CONDITIONAL / CHECK</span>
                    <span class="a571-kpi-val" style="color: #d97706;">${conditionalCount}</span>
                    <span class="a571-kpi-sub">Secondary Verification</span>
                </div>
                <div class="a571-kpi-box">
                    <span class="a571-kpi-title">SAFE / NOT APPLICABLE</span>
                    <span class="a571-kpi-val" style="color: #16a34a;">${notApplicableCount}</span>
                    <span class="a571-kpi-sub">Outside Damage Boundaries</span>
                </div>
                <div class="a571-kpi-box" style="flex: 1.3;">
                    <span class="a571-kpi-title">PRIMARY ACTIVE THREAT</span>
                    <span class="a571-kpi-val" style="font-size: 15px; color: #4f46e5; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                        ${a571_escapeHTML(dominantThreat)}
                    </span>
                    <span class="a571-kpi-sub">Governing Mechanism for Inspection Circuit</span>
                </div>
            </div>

            <!-- Matrix Category Filter Pills -->
            <div class="a571-filter-bar">
                <span style="font-size: 12.5px; font-weight: 700; color: var(--text, #334155); margin-right: 4px;">Filter Matrix:</span>
                <button type="button" class="a571-filter-chip active" id="a571-chip-all" onclick="a571_filterMatrixCategory('all')">
                    All Mechanisms (${results.length})
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-applicable" onclick="a571_filterMatrixCategory('applicable')">
                    🔴 Applicable Only (${applicableCount})
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-high-temperature-degradation" onclick="a571_filterMatrixCategory('high-temperature-degradation')">
                    🔥 High Temp & Nelson (4)
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-environmental-cracking" onclick="a571_filterMatrixCategory('environmental-cracking')">
                    💥 Environmental Cracking (4)
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-aqueous---acid-thinning" onclick="a571_filterMatrixCategory('aqueous---acid-thinning')">
                    🧪 Acid & Sour Thinning (5)
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-flow--velocity---erosion" onclick="a571_filterMatrixCategory('flow--velocity---erosion')">
                    🌪️ Flow & Velocity (2)
                </button>
                <button type="button" class="a571-filter-chip" id="a571-chip-external---cui" onclick="a571_filterMatrixCategory('external---cui')">
                    🌧️ External & CUI (1)
                </button>
            </div>

            <!-- Visual Matrix Cards Grid -->
            <div class="a571-matrix-grid" id="a571MatrixGrid">
                ${matrixCardsHTML}
            </div>

            <!-- Combined Inspection Summary Panel -->
            <div id="a571-inspectionSummaryPanel">
                ${inspectionSummaryHTML}
            </div>

            <!-- Detailed Engineering Audit Table -->
            <div class="calc-card" style="margin-top: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">
                        📑 Full Damage Mechanism Engineering Audit & Screening Justifications
                    </h4>
                </div>
                <div class="result-table-wrapper">
                    <table class="damage-table">
                        <thead>
                            <tr>
                                <th style="width: 18%;">Damage Mechanism</th>
                                <th style="width: 13%;">Integrity Family</th>
                                <th style="width: 12%;">Status</th>
                                <th style="width: 20%;">Process Basis / Next Check</th>
                                <th style="width: 20%;">Detailed Justification</th>
                                <th style="width: 17%;">Inspection Techniques</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    output.innerHTML = fullHTML;
}

// =================================================================
// EXPORT HANDLERS (PDF & EXCEL)
// =================================================================
function a571_exportMatrixPDF() {
    const el = document.getElementById("a571-result");
    if (!el || el.style.display === "none") {
        alert("Please run screening first before exporting.");
        return;
    }

    if (typeof html2pdf !== "undefined") {
        const streamName = a571_getValue("a571-streamName") || "Stream";
        const opt = {
            margin: [8, 8, 8, 8],
            filename: `API-571-Damage-Screening-${streamName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 1.8, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        html2pdf().from(el).set(opt).save();
    } else {
        window.print();
    }
}

function a571_exportMatrixExcel() {
    if (!window.a571_lastScreenedResults) {
        alert("Please run screening first before exporting.");
        return;
    }

    const results = window.a571_lastScreenedResults;
    const streamName = a571_getValue("a571-streamName") || "Stream";

    let csv = "Damage Mechanism,Family,Applicable,Status,Process Basis,Justification,Inspection Techniques\n";
    results.forEach(r => {
        const row = [
            `"${(r.mechanism || '').replace(/"/g, '""')}"`,
            `"${(r.category || '').replace(/"/g, '""')}"`,
            `"${r.applicable ? 'YES' : 'NO'}"`,
            `"${(r.status || '').replace(/"/g, '""')}"`,
            `"${(r.basis || '').replace(/"/g, '""')}"`,
            `"${(r.justification || '').replace(/"/g, '""')}"`,
            `"${(r.inspection || '').replace(/"/g, '""')}"`
        ];
        csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `API-571-Screening-${streamName.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    link.click();
}

// =================================================================
// HELPERS
// =================================================================
function a571_getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
}

function a571_numberValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : 0;
}

function a571_normalizeText(val) {
    return String(val || "").trim().toUpperCase();
}

function a571_normalizeYesNo(val) {
    const n = String(val || "").trim().toUpperCase();
    return (n === "Y" || n === "YES" || n === "TRUE" || n === "1") ? "Y" : "N";
}

function a571_escapeHTML(val) {
    return String(val || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global Exports
window.a571_fetchUnits = a571_fetchUnits;
window.a571_onUnitSelectionChange = a571_onUnitSelectionChange;
window.a571_onCaseSelectionChange = a571_onCaseSelectionChange;
window.a571_loadStreamData = a571_loadStreamData;
window.a571_loadSelectedStream = a571_loadSelectedStream;
window.a571_syncFromComparator = a571_syncFromComparator;
window.a571_onPresetSelectionChange = a571_onPresetSelectionChange;
window.a571_resetForm = a571_resetForm;
window.a571_filterMatrixCategory = a571_filterMatrixCategory;
window.a571_bridgeToCorrosionTab = a571_bridgeToCorrosionTab;
window.a571_toggleInspectionSummary = a571_toggleInspectionSummary;
window.a571_exportMatrixPDF = a571_exportMatrixPDF;
window.a571_exportMatrixExcel = a571_exportMatrixExcel;
window.a571_populateAvailableStreams = a571_populateAvailableStreams;
window.a571_displayCalculatedParameters = a571_displayCalculatedParameters;
window.a571_displayResults = a571_displayResults;

// =================================================================
// MULTI-STREAM ENVELOPE (WORST-CASE) SCREENING MODE
// =================================================================
if (typeof window !== "undefined") {
    window.a571_screeningMode = window.a571_screeningMode || "single";
}

function a571_setScreeningMode(mode) {
    window.a571_screeningMode = mode;
    const singleBtn = document.getElementById("a571-modeSingleBtn");
    const envelopeBtn = document.getElementById("a571-modeEnvelopeBtn");
    const singleWrap = document.getElementById("a571-singleStreamWrap");
    const envelopeWrap = document.getElementById("a571-envelopeStreamWrap");
    const loadStreamBtn = document.getElementById("a571-btnLoadStream");
    const loadEnvelopeBtn = document.getElementById("a571-btnLoadEnvelope");
    const helpText = document.getElementById("a571-modeHelpText");
    const alertBox = document.getElementById("a571-autoloadAlert");
    const summaryCard = document.getElementById("a571-streamSummaryCard");

    if (mode === "envelope") {
        if (singleBtn) { singleBtn.style.background = "transparent"; singleBtn.style.color = "#475569"; }
        if (envelopeBtn) { envelopeBtn.style.background = "#7c3aed"; envelopeBtn.style.color = "#fff"; }
        if (singleWrap) singleWrap.style.display = "none";
        if (envelopeWrap) envelopeWrap.style.display = "block";
        if (loadStreamBtn) loadStreamBtn.style.display = "none";
        if (loadEnvelopeBtn) loadEnvelopeBtn.style.display = "inline-flex";
        if (helpText) helpText.textContent = "Multi-Stream Worst-Case Envelope: Computes maximum parameters across selected streams.";
        
        a571_populateEnvelopeStreamCheckboxes(window.a571_CURRENT_STREAMS && window.a571_CURRENT_STREAMS.length > 0 ? window.a571_CURRENT_STREAMS : (window.a571_ALL_UNIT_STREAMS || []));

        if (window.a571_lastEnvelopeData && window.a571_lastEnvelopeData.envelopeObj) {
            a571_applyStreamDataToForm(window.a571_lastEnvelopeData.envelopeObj, window.a571_lastEnvelopeData.unitId);
            if (alertBox && window.a571_lastEnvelopeAlertHTML) {
                alertBox.style.display = "block";
                alertBox.innerHTML = window.a571_lastEnvelopeAlertHTML;
            }
        } else {
            a571_clearFormInputsOnly();
            if (alertBox) alertBox.style.display = "none";
            if (summaryCard) summaryCard.style.display = "none";
        }
    } else {
        if (singleBtn) { singleBtn.style.background = "#2563eb"; singleBtn.style.color = "#fff"; }
        if (envelopeBtn) { envelopeBtn.style.background = "transparent"; envelopeBtn.style.color = "#475569"; }
        if (singleWrap) singleWrap.style.display = "block";
        if (envelopeWrap) envelopeWrap.style.display = "none";
        if (loadStreamBtn) loadStreamBtn.style.display = "inline-flex";
        if (loadEnvelopeBtn) loadEnvelopeBtn.style.display = "none";
        if (helpText) helpText.textContent = "Standard single-stream evaluation mode.";

        if (window.a571_lastSingleStreamData && window.a571_lastSingleStreamData.p) {
            a571_applyStreamDataToForm(window.a571_lastSingleStreamData.p, window.a571_lastSingleStreamData.unitId);
            if (alertBox && window.a571_lastSingleStreamAlertHTML) {
                alertBox.style.display = "block";
                alertBox.innerHTML = window.a571_lastSingleStreamAlertHTML;
            }
        } else {
            a571_clearFormInputsOnly();
            if (alertBox) alertBox.style.display = "none";
            if (summaryCard) summaryCard.style.display = "none";
        }
    }
}

function a571_populateEnvelopeStreamCheckboxes(streams) {
    const container = document.getElementById("a571-envelopeStreamContainer");
    const countEl = document.getElementById("a571-envelopeSelectedCount");
    if (!container) return;

    if (!streams || streams.length === 0) {
        container.innerHTML = '<div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 10px;">-- No streams available in selected Unit/Case --</div>';
        if (countEl) countEl.textContent = "0 selected";
        return;
    }

    let html = "";
    streams.forEach((s, idx) => {
        const id = s.id || s.streamNo || `stream_${idx}`;
        const name = s.name || (s.streamName ? `Stream ${s.streamNo} - ${s.streamName}` : `Stream ${s.streamNo || s.id}`);
        const temp = s.temp !== undefined ? s.temp : (s.tempC !== undefined ? s.tempC : (s.properties?.['Temperature (°C)'] ?? s.properties?.['Temperature (C)'] ?? "-"));
        const press = s.pressure !== undefined ? s.pressure : (s.pressKgCm2 !== undefined ? s.pressKgCm2 : (s.properties?.['Pressure (kg/cm2 (g))'] ?? s.properties?.['Pressure (kg/cm2_g)'] ?? "-"));
        const flow = s.massFlow || s.flowMass || (s.properties?.['Flow Mass (kg/hr)'] ?? 0);
        const caseTag = s.detectedCase ? `[${s.detectedCase}] ` : "";
        html += `
            <label style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; margin-bottom: 3px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-weight: 500; min-height: unset;">
                <input type="checkbox" class="a571-env-checkbox" value="${a571_escapeHTML(id)}" onchange="a571_updateEnvelopeCount()" style="width: 16px; height: 16px; accent-color: #7c3aed;">
                <span style="font-weight: 700; color: #1e293b;">${caseTag}${a571_escapeHTML(name)}</span>
                <span style="margin-left: auto; color: #64748b; font-size: 11.5px;">${temp}°C | ${press} kg/cm² | ${Number(flow).toLocaleString()} kg/h</span>
            </label>
        `;
    });

    container.innerHTML = html;
    a571_updateEnvelopeCount();
}

function a571_updateEnvelopeCount() {
    const checkboxes = document.querySelectorAll(".a571-env-checkbox:checked");
    const countEl = document.getElementById("a571-envelopeSelectedCount");
    if (countEl) {
        countEl.textContent = `${checkboxes.length} selected`;
    }
}

function a571_envelopeSelectAll(select) {
    document.querySelectorAll(".a571-env-checkbox").forEach(cb => {
        cb.checked = select;
    });
    a571_updateEnvelopeCount();
}

async function a571_loadEnvelopeStreams() {
    const checkedCheckboxes = document.querySelectorAll(".a571-env-checkbox:checked");
    const alertBox = document.getElementById("a571-autoloadAlert");
    const loadBtn = document.getElementById("a571-btnLoadEnvelope");

    if (checkedCheckboxes.length === 0) {
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fef3c7; border-color:#fde68a; color:#92400e;">
                    <span class="a571-alert-icon" style="color:#d97706;">⚠️</span>
                    <div><strong>Selection Required:</strong> Please select at least one process stream for Multi-Stream Envelope screening.</div>
                </div>
            `;
        }
        return;
    }

    const selectedIds = Array.from(checkedCheckboxes).map(cb => cb.value);
    const allStreams = window.a571_CURRENT_STREAMS || window.a571_ALL_UNIT_STREAMS || [];
    const selectedStreams = allStreams.filter(s => selectedIds.includes(String(s.id || s.streamNo)));

    if (selectedStreams.length === 0) {
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                    <span class="a571-alert-icon" style="color:#dc2626;">❌</span>
                    <div><strong>Envelope Error:</strong> Could not resolve selected streams data.</div>
                </div>
            `;
        }
        return;
    }

    const originalBtnText = loadBtn ? loadBtn.innerHTML : "⚡ Load Enveloped";
    if (loadBtn) {
        loadBtn.innerHTML = "⏳ Computing Envelope...";
        loadBtn.disabled = true;
    }

    try {
        const temps = selectedStreams.map(s => Number(s.temp !== undefined ? s.temp : (s.tempC !== undefined ? s.tempC : (s.properties?.['Temperature (°C)'] ?? s.properties?.['Temperature (C)'] ?? 0))));
        const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;
        const minTemp = temps.length > 0 ? Math.min(...temps) : 0;
        const pressures = selectedStreams.map(s => Number(s.pressure !== undefined ? s.pressure : (s.pressKgCm2 !== undefined ? s.pressKgCm2 : (s.properties?.['Pressure (kg/cm2 (g))'] ?? s.properties?.['Pressure (kg/cm2_g)'] ?? 0))));
        const maxPress = pressures.length > 0 ? Math.max(...pressures) : 0;

        // Fully dynamic component and constituent extraction across all selected streams for worst-case envelope
        const envCompsMap = new Map();
        const excludeKeys = new Set(["temperature", "temp", "pressure", "phase", "massflow", "flowmass", "density", "liquiddensity", "pipediameter", "carbonsteel", "crcontent", "stress", "hardness", "oxygen", "aminetype", "amineservice", "hsas", "ph", "turbulence", "solids", "insulated", "cuimaterial", "nh3significant", "othercontamsignificant", "deltat", "thermallocation", "eromaterial", "id", "streamno", "name", "streamname", "casename", "detectedcase", "pfd", "fluid", "fluidclass", "surfacetension", "surfacetensiondynecm", "content", "contentphase"]);

        for (const s of selectedStreams) {
            const sources = [s.components, s.constituents, s.properties, s];
            for (const src of sources) {
                if (src && typeof src === "object") {
                    for (const [k, v] of Object.entries(src)) {
                        if (!k) continue;
                        const cleanName = String(k).trim();
                        const cleanLower = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
                        if (excludeKeys.has(cleanLower)) continue;
                        if (cleanLower.includes("surfacetension") || cleanLower.includes("tension") || cleanLower.includes("dyne") || cleanLower.includes("content") || cleanLower.includes("vaporized") || cleanLower.includes("vapor")) continue;
                        const num = parseFloat(v);
                        if (isNaN(num) || num <= 0) continue;
                        if (envCompsMap.has(cleanLower)) {
                            const existing = envCompsMap.get(cleanLower);
                            existing.val = Math.max(existing.val, num);
                            if (cleanName === cleanName.toUpperCase() || cleanName.length >= existing.label.length) {
                                existing.label = cleanName;
                            }
                        } else {
                            envCompsMap.set(cleanLower, { label: cleanName, val: num });
                        }
                    }
                }
            }
        }

        const envelopeConstituents = {};
        for (const item of envCompsMap.values()) {
            envelopeConstituents[item.label] = item.val;
        }

        const maxH2 = envelopeConstituents['H2'] || envelopeConstituents['Hydrogen'] || 0;
        const maxH2Mol = envelopeConstituents['h2MolFrac'] || 0;
        const maxH2S = envelopeConstituents['H2S'] || 0;
        const maxNH3 = envelopeConstituents['NH3'] || 0;
        const maxH2O = envelopeConstituents['H2O'] || envelopeConstituents['Water'] || 0;
        const maxAmine = envelopeConstituents['Amine'] || envelopeConstituents['MDEA'] || 0;
        const maxFlow = Math.max(...selectedStreams.map(s => Number(s.massFlow !== undefined ? s.massFlow : (s.flowMass || s.properties?.['Flow Mass (kg/hr)'] || 0))));
        const maxDensity = Math.max(...selectedStreams.map(s => Number(s.density !== undefined ? s.density : (s.liquidDensity || s.properties?.['Liquid Density (kg/m3)'] || 0))));

        const streamNosList = selectedStreams.map(s => s.streamNo || s.id || '').filter(Boolean);
        const envelopeName = `Worst-Case Envelope (${streamNosList.join(', ')})`;
        const envelopePhase = selectedStreams.find(s => s.phase)?.phase || 'Mixed';
        const worstStream = selectedStreams.reduce((prev, curr) => (Number(curr.temp || curr.tempC || 0) > Number(prev.temp || prev.tempC || 0) ? curr : prev), selectedStreams[0]) || {};
        const maxCO2 = envelopeConstituents['CO2'] || envelopeConstituents['Carbon Dioxide'] || 0;
        const maxChloride = envelopeConstituents['Chloride'] || envelopeConstituents['Cl'] || 0;
        const maxSulfur = envelopeConstituents['Sulfur'] || envelopeConstituents['S'] || 0;
        const maxCO = envelopeConstituents['CO'] || envelopeConstituents['Carbon Monoxide'] || 0;
        const maxCaustic = envelopeConstituents['Caustic'] || envelopeConstituents['NaOH'] || 0;
        const maxMethane = envelopeConstituents['Methane'] || envelopeConstituents['CH4'] || 0;
        const maxNitrogen = envelopeConstituents['Nitrogen'] || envelopeConstituents['N2'] || 0;

        const envelopeObj = {
            streamNo: "ENVELOPE",
            name: envelopeName,
            streamName: envelopeName,
            phase: envelopePhase,
            temp: maxTemp,
            minTemp: minTemp,
            maxTemp: maxTemp,
            pressure: maxPress,
            h2: maxH2,
            h2MolFrac: maxH2Mol,
            h2s: maxH2S,
            nh3: maxNH3,
            nh3Significant: maxNH3 > 0 ? "Y" : (worstStream.nh3Significant || a571_getValue("a571-nh3Significant") || "N"),
            otherContamSignificant: worstStream.otherContamSignificant || a571_getValue("a571-otherContamSignificant") || "N",
            h2o: maxH2O,
            co2: maxCO2,
            chloride: maxChloride,
            sulfur: maxSulfur,
            co: maxCO,
            caustic: maxCaustic,
            methane: maxMethane,
            nitrogen: maxNitrogen,
            massFlow: maxFlow,
            density: maxDensity,
            pipeDiameter: worstStream.pipeDiameter || a571_numberValue("a571-pipeDiameter") || 0,
            carbonSteel: worstStream.carbonSteel || a571_getValue("a571-carbonSteel") || "Y",
            crContent: worstStream.crContent !== undefined ? worstStream.crContent : (a571_numberValue("a571-crContent") || 0),
            stress: worstStream.stress || a571_getValue("a571-stress") || "N",
            nelsonMaterial: worstStream.nelsonMaterial || a571_getValue("a571-nelsonMaterial") || "",
            hardness: worstStream.hardness || a571_getValue("a571-hardness") || "N",
            oxygen: worstStream.oxygen || a571_getValue("a571-oxygen") || "N",
            amineFlow: maxAmine > 0 ? maxAmine : (worstStream.amineFlow || a571_numberValue("a571-amineFlow") || 0),
            amineType: worstStream.amineType || a571_getValue("a571-amineType") || "None",
            amineService: worstStream.amineService || a571_getValue("a571-amineService") || "Lean",
            hsas: worstStream.hsas || a571_numberValue("a571-hsas") || 0,
            ph: worstStream.ph || a571_numberValue("a571-ph") || 0,
            turbulence: worstStream.turbulence || a571_getValue("a571-turbulence") || "N",
            solids: worstStream.solids || a571_getValue("a571-solids") || "N",
            insulated: worstStream.insulated || a571_getValue("a571-insulated") || "N",
            cuiMaterial: worstStream.cuiMaterial || a571_getValue("a571-cuiMaterial") || "CS",
            deltaT: worstStream.deltaT || a571_numberValue("a571-deltaT") || 0,
            thermalLocation: worstStream.thermalLocation || a571_getValue("a571-thermalLocation") || "",
            eroMaterial: worstStream.eroMaterial || a571_getValue("a571-eroMaterial") || "",
            constituents: envelopeConstituents,
            components: envelopeConstituents
        };

        const unitSelector = document.getElementById("a571-unitSelector");
        const unitId = unitSelector ? unitSelector.value.trim() : "";

        await a571_applyStreamDataToForm(envelopeObj, unitId);

        // Explicitly refresh Summary Card with multi-stream options
        a571_displayStreamSummaryCard(envelopeObj, {
            unitId,
            isEnvelope: true,
            streamCount: selectedStreams.length,
            streamIds: streamNosList,
            minTemp,
            maxTemp
        });

        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#f3e8ff; border-color:#d8b4fe; color:#6b21a8;">
                    <span class="a571-alert-icon" style="color:#7c3aed;">⚡</span>
                    <div>
                        <strong>Multi-Stream Envelope Mode Active:</strong> Populated worst-case parameters across <strong>${selectedStreams.length}</strong> process streams.
                        <div style="font-size:11.5px; margin-top:2px;">
                            Temp Range: ${minTemp}°C - ${maxTemp}°C | Max Press: ${maxPress} kg/cm² | Max Flow: ${Number(maxFlow).toLocaleString()} kg/h | Max H₂S: ${Number(maxH2S).toLocaleString()} kg/h | Max NH₃: ${Number(maxNH3).toLocaleString()} kg/h
                        </div>
                    </div>
                    <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="margin-left:auto; background:none; border:none; color:inherit; cursor:pointer; font-size:16px;">&times;</button>
                </div>
            `;
        }
    } catch (err) {
        console.error("[API 571] Envelope load error:", err);
        if (alertBox) {
            alertBox.style.display = "block";
            alertBox.innerHTML = `
                <div class="a571-alert-inner" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
                    <span class="a571-alert-icon" style="color:#dc2626;">❌</span>
                    <div><strong>Envelope Generation Error:</strong> ${a571_escapeHTML(err.message)}</div>
                </div>
            `;
        }
    } finally {
        if (loadBtn) {
            loadBtn.innerHTML = originalBtnText;
            loadBtn.disabled = false;
        }
    }
}

window.a571_setScreeningMode = a571_setScreeningMode;
window.a571_envelopeSelectAll = a571_envelopeSelectAll;
window.a571_loadEnvelopeStreams = a571_loadEnvelopeStreams;
window.a571_updateEnvelopeCount = a571_updateEnvelopeCount;
window.a571_displayStreamSummaryCard = a571_displayStreamSummaryCard;
