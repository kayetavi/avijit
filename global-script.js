// Global fallback for hideAllMainPanels
window.hideAllMainPanels = window.hideAllMainPanels || function() {};

/* ===========================
   Global circular-safe JSON serialization guard
   Prevents "Converting circular structure to JSON" across preview iframes, extensions, and libraries
   =========================== */
(function () {
  if (typeof window === "undefined" || window.__safeJsonStringifyInstalled) return;
  window.__safeJsonStringifyInstalled = true;
  const originalStringify = JSON.stringify;
  function createSafeReplacer(customReplacer) {
    const seen = new WeakSet();
    return function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      if (typeof customReplacer === "function") return customReplacer.call(this, key, value);
      return value;
    };
  }
  JSON.stringify = function (value, replacer, space) {
    try {
      return originalStringify(value, replacer, space);
    } catch (err) {
      if (err && (err.name === "TypeError" || /circular|cyclic/i.test(String(err.message || err)))) {
        try {
          return originalStringify(value, createSafeReplacer(replacer), space);
        } catch (fallbackErr) {
          return '"[Circular]"';
        }
      }
      throw err;
    }
  };
})();

/* ===========================
   Global JS enforcement for black I-beam (smaller, standard size)
   - Applies ONLY to text-editable elements (no body/document-wide I-beam)
   - Uses 16×16 SVG with hotspot 8 8 and 'auto' fallback so blank areas show arrow
   =========================== */
(function () {
  const CURSOR_DATA = 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxNicgaGVpZ2h0PScxNicgdmlld0JveD0nMCAwIDE2IDE2Jz48cmVjdCB4PSc3JyB5PSczJyB3aWR0aD0nMicgaGVpZ2h0PScxMCcgZmlsbD0nYmxhY2snLz48cmVjdCB4PSc1JyB5PSczJyB3aWR0aD0nNicgaGVpZ2h0PScxJyBmaWxsPSdibGFjaycvPjxyZWN0IHg9JzUnIHk9JzEzJyB3aWR0aD0nNicgaGVpZ2h0PScxJyBmaWxsPSdibGFjaycvPjwvc3ZnPg==") 8 8, text';

  // same selectors array as you had
  const TARGET_SELECTORS = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="password"]',
    'input[type="email"]',
    'input[type="tel"]',
    'input[type="url"]',
    'input:not([type])',        // catch plain input
    'textarea',
    '[contenteditable="true"]',
    '.custom-text',
    '#chat-input'
  ].join(',');

  // Create a style element to apply rules (more reliable than setting inline cursor on many nodes)
  function injectStyle() {
    if (document.getElementById('__black-ibeam-style')) return;

    const css = `
      /* injected by black-ibeam script */
      ${TARGET_SELECTORS} {
        cursor: ${CURSOR_DATA} !important;       /* custom I-beam cursor, fallback to text */
        caret-color: black !important;           /* ensure caret is visible */
      }
      /* sometimes contenteditable children take focus — ensure caret too */
      ${TARGET_SELECTORS} * {
        caret-color: black !important;
      }
    `;

    const style = document.createElement('style');
    style.id = '__black-ibeam-style';
    style.innerHTML = css;
    (document.head || document.documentElement).appendChild(style);
  }

  // Apply per-element inline fallback for environments where stylesheet may be blocked
  function applyInlineFallback(el) {
    if (!el || el.__blackIbeamApplied) return;
    try {
      // If developer explicitly set inline cursor and we want to respect it, skip overriding cursor
      const inlineStyle = el.getAttribute && el.getAttribute('style') || '';
      const hasInlineCursor = /cursor\s*:/i.test(inlineStyle);

      // Only set inline cursor if none exists (we don't override dev's explicit inline cursor)
      if (!hasInlineCursor) {
        try { el.style.cursor = CURSOR_DATA; } catch (err) { /* ignore */ }
      }
      // Always try to set caret color inline (helps where stylesheet is lower precedence)
      try { el.style.caretColor = 'black'; } catch (err) { /* ignore */ }

      el.__blackIbeamApplied = true;
    } catch (e) {
      // silent
    }
  }

  // Walk and apply inline fallback to currently present matching elements
  function enforceInlineOnExisting() {
    try {
      document.querySelectorAll(TARGET_SELECTORS).forEach(applyInlineFallback);
    } catch (e) { /* ignore */ }
  }

  // Efficient debounce helper for observer
  let obsTimeout = null;
  function scheduleEnforce() {
    if (obsTimeout) return;
    obsTimeout = setTimeout(() => {
      obsTimeout = null;
      enforceInlineOnExisting();
    }, 80);
  }

  // Setup observer to catch dynamically added inputs/contenteditables
  function setupObserver() {
    try {
      const observer = new MutationObserver((mutations) => {
        // If added nodes appear, schedule enforcement
        let added = false;
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) { added = true; break; }
        }
        if (added) scheduleEnforce();
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) {
      // ignore if MutationObserver not available
    }
  }

  // Focus/hover handlers to quickly ensure caret & cursor on elements that appear or get focus
  function setupInteractionHandlers() {
    // When an element gets focus, ensure inline fallback applied (useful for shadow DOM focus too)
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      try {
        if (t && t.matches && t.matches(TARGET_SELECTORS)) applyInlineFallback(t);
      } catch (err) { /* ignore: matches may throw on some nodes */ }
    }, true);

    // On mouseover, ensure element has fallback (helps for elements inserted then hovered)
    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      try {
        if (t && t.matches && t.matches(TARGET_SELECTORS)) applyInlineFallback(t);
      } catch (err) { /* ignore */ }
    }, true);
  }

  // initialize
  function init() {
    injectStyle();            // primary approach: stylesheet
    enforceInlineOnExisting(); // secondary: inline fallback for immediate nodes
    setupObserver();
    setupInteractionHandlers();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();

/* ===========================
   Global Mobile Navigation Drawer Handlers
   Ensures toggleMobileSidebar, openMobileSidebar, closeMobileSidebar
   are permanently defined in global scope across all environments
   =========================== */
(function () {
  let _gsLastToggle = 0;

  function getMainSidebar() {
    return document.getElementById("mainSidebar") || document.querySelector(".sidebar");
  }

  function toggleMobileSidebar(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    const now = Date.now();
    if (now - _gsLastToggle < 300) return;
    _gsLastToggle = now;

    const sidebar = getMainSidebar();
    if (!sidebar) return;
    if (sidebar.classList.contains("mobile-open")) {
      closeMobileSidebar(e);
    } else {
      openMobileSidebar(e);
    }
  }

  function openMobileSidebar(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    _gsLastToggle = Date.now();
    const sidebar = getMainSidebar();
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) {
      sidebar.classList.add("mobile-open");
      sidebar.style.setProperty("transform", "translate3d(0, 0, 0)", "important");
      sidebar.style.setProperty("-webkit-transform", "translate3d(0, 0, 0)", "important");
      sidebar.style.setProperty("visibility", "visible", "important");
      sidebar.style.setProperty("opacity", "1", "important");
      sidebar.style.setProperty("pointer-events", "auto", "important");
    }
    if (backdrop) {
      backdrop.classList.add("visible");
      backdrop.style.setProperty("display", "block", "important");
      backdrop.style.setProperty("opacity", "1", "important");
      backdrop.style.setProperty("pointer-events", "auto", "important");
    }
    document.body.classList.add("sidebar-open");
  }

  function closeMobileSidebar(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    _gsLastToggle = Date.now();
    const sidebar = getMainSidebar();
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) {
      sidebar.classList.remove("mobile-open");
      sidebar.style.removeProperty("transform");
      sidebar.style.removeProperty("-webkit-transform");
      sidebar.style.removeProperty("visibility");
      sidebar.style.removeProperty("opacity");
      sidebar.style.removeProperty("pointer-events");
    }
    if (backdrop) {
      backdrop.classList.remove("visible");
      backdrop.style.removeProperty("display");
      backdrop.style.setProperty("opacity", "0", "important");
      backdrop.style.setProperty("pointer-events", "none", "important");
    }
    document.body.classList.remove("sidebar-open");
  }

  if (typeof window !== "undefined") {
    if (!window.toggleMobileSidebar) window.toggleMobileSidebar = toggleMobileSidebar;
    if (!window.openMobileSidebar) window.openMobileSidebar = openMobileSidebar;
    if (!window.closeMobileSidebar) window.closeMobileSidebar = closeMobileSidebar;
  }
})();

