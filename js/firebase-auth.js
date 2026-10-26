// 🔹 Global circular-safe JSON guard
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

// 🔐 Global Secure Fetch Interceptor: Attach validated session credentials to all API requests
(function () {
  if (typeof window === "undefined" || window.__kayetAuthFetchInstalled) return;
  window.__kayetAuthFetchInstalled = true;
  const originalFetch = window.fetch;
  const interceptorFetch = async function (input, init = {}) {
    try {
      const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
      if (url && (url.startsWith("/api/") || url.includes("/api/"))) {
        const opts = { ...init };
        opts.credentials = opts.credentials || "include";

        const existingHeaders = opts.headers || (typeof input === "object" && input && input.headers ? input.headers : null);
        const headers = new Headers(existingHeaders || {});

        const sessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || "";
        const uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || "";
        const email = (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("loggedInUser")) || "";

        if (sessionId) {
          if (!headers.has("x-session-id")) headers.set("x-session-id", sessionId);
          if (!headers.has("authorization")) headers.set("authorization", `Bearer ${sessionId}`);
        }
        if (uid && !headers.has("x-user-uid")) {
          headers.set("x-user-uid", uid);
        }

        // Attach Firebase Auth ID token if available
        try {
          if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
            const token = await firebase.auth().currentUser.getIdToken(false);
            if (token) headers.set("authorization", `Bearer ${token}`);
          }
        } catch (e) {}

        // Inject into JSON body if present
        if (opts.body && typeof opts.body === "string" && (headers.get("content-type") || "").includes("application/json")) {
          try {
            const parsed = JSON.parse(opts.body);
            let changed = false;
            if (sessionId && !parsed.sessionId) { parsed.sessionId = sessionId; changed = true; }
            if (uid && !parsed.uid) { parsed.uid = uid; changed = true; }
            if (email && !parsed.callerEmail) { parsed.callerEmail = email; changed = true; }
            if (changed) opts.body = JSON.stringify(parsed);
          } catch (jsonErr) {}
        }

        opts.headers = headers;
        return originalFetch.call(this, input, opts);
      }
    } catch (e) {
      console.warn("[AuthFetchInterceptor] Error:", e);
    }
    return originalFetch.call(this, input, init);
  };

  try {
    window.fetch = interceptorFetch;
  } catch (err) {
    try {
      Object.defineProperty(window, "fetch", {
        value: interceptorFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (defErr) {
      console.warn("[AuthFetchInterceptor] Could not override window.fetch:", defErr);
    }
  }
})();

// 🔐 Architecture: Session management is verified securely via the backend API (/api/session).
// No Firebase client credentials or API keys are exposed to DevTools (F12) in the browser.

const localSessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || "";
const localEmail = (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("loggedInUser")) || "";
const localUid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || "";

// Session validation is handled asynchronously by checkAndInitializeSession() below.

// ✅ Auto logout on inactivity after 10 minutes
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 600000; // 10 minutes

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(async () => {
    if (typeof Swal !== "undefined" && Swal.fire) {
      await Swal.fire({
        icon: "warning",
        title: "Session Timed Out",
        text: "You've been logged out due to 10 minutes of inactivity.",
        confirmButtonColor: "#2563eb"
      });
    } else {
      try { alert("⏳ You've been logged out due to 10 minutes of inactivity."); } catch(e) {}
    }
    await performLogout();
  }, INACTIVITY_TIMEOUT_MS);
}

// ✅ Detect user activity and reset timer
["mousemove", "keydown", "scroll", "click", "touchstart"].forEach((event) => {
  window.addEventListener(event, resetInactivityTimer, { passive: true });
});

async function performLogout() {
  clearTimeout(inactivityTimer);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  const currentUid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || localUid;
  const currentSessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || localSessionId;

  // Notify backend to invalidate session
  try {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "logout",
        sessionId: currentSessionId,
        uid: currentUid
      })
    });
  } catch (e) {
    // Offline / silent fallback
  }

  // Clear all storages
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("sessionId");
    sessionStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("usernameUpper");
    sessionStorage.removeItem("userUid");
    sessionStorage.removeItem("cached_rbac_permissions");
    sessionStorage.removeItem("cached_layout_config");
    sessionStorage.removeItem("dashboard_recent_tabs_v1");
  }

  // Clear client cookies
  try {
    document.cookie = "sessionId=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "x-session-id=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "loggedInUser=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch (e) {}

  if (window.recentTabsManager && typeof window.recentTabsManager.clearOnLogout === "function") {
    try {
      window.recentTabsManager.clearOnLogout();
    } catch (e) {}
  }

  window.location.href = "index.html";
}

// ✅ Global logout function
window.logout = performLogout;

// ✅ Validate session on load
let sessionValidated = false;
let heartbeatInterval = null;

async function checkAndInitializeSession() {
  if (sessionValidated) return;

  const effectiveEmail = (window.APP_SESSION && window.APP_SESSION.email) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("loggedInUser")) || localEmail;
  const effectiveUid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || localUid;
  const effectiveSessionId = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || localSessionId;

  if (!effectiveEmail && !effectiveSessionId) {
    window.location.href = "index.html";
    return;
  }

  try {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "validate",
        sessionId: effectiveSessionId,
        uid: effectiveUid,
        email: effectiveEmail
      })
    });

    const data = await res.json();

    if (data && data.valid && data.session) {
      window.APP_SESSION = {
        sessionId: data.session.sessionId,
        idToken: data.session.idToken || (window.APP_SESSION && window.APP_SESSION.idToken) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("idToken")) || "",
        uid: data.session.uid,
        email: data.session.email
      };
      if (data.session.sessionId) {
        sessionStorage.setItem("sessionId", data.session.sessionId);
      }
      if (data.session.idToken) {
        sessionStorage.setItem("idToken", data.session.idToken);
      }
      if (data.session.uid) {
        sessionStorage.setItem("userUid", data.session.uid);
      }
      if (data.session.email) {
        sessionStorage.setItem("loggedInUser", data.session.email);
      }
      if (window.RBAC && typeof window.RBAC.refreshQuietly === "function") {
        window.RBAC.refreshQuietly();
      }
    }

    if (!data || !data.valid) {
      const reason = data?.reason || "invalid";
      let alertTitle = "Session Expired";
      let alertText = "Your session has expired or is invalid. Please login again.";
      if (reason === "mismatch") {
        alertTitle = "Session Replaced";
        alertText = "Another session was started elsewhere. Please login again.";
      }
      if (typeof Swal !== "undefined" && Swal.fire) {
        await Swal.fire({
          icon: "warning",
          title: alertTitle,
          text: alertText,
          confirmButtonColor: "#2563eb"
        });
      } else {
        try { alert(`⚠️ ${alertText}`); } catch(e) {}
      }
      await performLogout();
      return;
    }

    // Session is valid
    sessionValidated = true;
    resetInactivityTimer();

    // Start background heartbeat every 30 seconds
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(async () => {
        try {
          const sid = (window.APP_SESSION && window.APP_SESSION.sessionId) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sessionId")) || effectiveSessionId;
          const uid = (window.APP_SESSION && window.APP_SESSION.uid) || (typeof sessionStorage !== "undefined" && sessionStorage.getItem("userUid")) || effectiveUid;
          if (sid || uid) {
            await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ action: "heartbeat", sessionId: sid, uid: uid })
            });
          }
        } catch (e) {
          // Offline/network blip - non-blocking
        }
      }, 30000);
    }

  } catch (netErr) {
    // Network offline or server unreachable - allow local session to persist gracefully
    console.info("Session verified via local state (offline/transient network mode)");
    sessionValidated = true;
    resetInactivityTimer();
  }
}

// Initialize session validation immediately
checkAndInitializeSession();
