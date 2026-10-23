/**
 * ASME B31.3 Table A-1 & API Code Allowable Stress Database Client Loader
 * Connected directly to Cloud Firestore Database via /api/stress-data
 * ZERO HARDCODED STRESS DATA - Sourced 100% dynamically from Firebase Cloud Firestore.
 */

// Initialize global live container
window.bkStressData = window.bkStressData || {};

// Self-invoking initial fetch from live Cloud Database
(async function initLiveCloudStressData() {
    if (typeof window === 'undefined') return;
    try {
        const res = await fetch('/api/stress-data?_t=' + Date.now(), {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                window.bkStressData = data;
                if (typeof window.bkPopulateYears === 'function') {
                    window.bkPopulateYears();
                }
                if (typeof window.initB313AutoStressFields === 'function') {
                    window.initB313AutoStressFields(true);
                }
                if (typeof window.initSimpleAutoStressFields === 'function') {
                    window.initSimpleAutoStressFields(true);
                }
                if (typeof window.updateActiveDatabaseSummaryBadge === 'function') {
                    window.updateActiveDatabaseSummaryBadge();
                }
                if (typeof window.renderYearManagerList === 'function') {
                    window.renderYearManagerList();
                }
                if (typeof window.renderTemperaturePointsTable === 'function') {
                    window.renderTemperaturePointsTable();
                }
            }
        }
    } catch (err) {
        console.warn("[Cloud Stress DB] Live initial fetch notice:", err.message);
    }
})();
