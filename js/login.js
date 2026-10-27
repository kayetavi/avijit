// 🛡️ Lightweight Sandbox Guard & Global Error Shield
(function () {
  if (typeof window === "undefined" || window.__loginGuardInstalled) return;
  window.__loginGuardInstalled = true;

  window.addEventListener("error", function (e) {
    if (!e) return;
    if (e.message === "Script error." || (e.error && e.error.name === "AbortError")) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      return true;
    }
  }, true);

  window.addEventListener("unhandledrejection", function (e) {
    if (e && e.reason && (e.reason.name === "AbortError" || String(e.reason).includes("Script error"))) {
      if (typeof e.preventDefault === "function") e.preventDefault();
    }
  });

  var origAlert = window.alert;
  window.alert = function (msg) {
    try {
      if (typeof origAlert === "function") origAlert.call(window, msg);
    } catch (_) {
      console.warn("[SafeAlert] Alert suppressed in sandbox iframe:", msg);
    }
  };
})();

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

// 🔐 Architecture: All authentication and Firebase API keys are securely encapsulated
// inside the backend server (/api/login & /api/forgot-password). No keys or SDK credentials exposed in the browser!

// 🔹 SVGs for Show / Hide Password
const EYE_OPEN_SVG = `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const EYE_OFF_SVG = `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

// 🔹 Setup Show / Hide Password Toggle
function initPasswordToggle() {
  const toggleBtn = document.getElementById("togglePasswordBtn");
  const passwordInput = document.getElementById("password");
  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener("click", function () {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    toggleBtn.innerHTML = isPassword ? EYE_OFF_SVG : EYE_OPEN_SVG;
    toggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    toggleBtn.setAttribute("title", isPassword ? "Hide password" : "Show password");
  });
}

// 🔹 Setup Forgot Password Recovery Modal
function initForgotPassword() {
  const forgotLink = document.getElementById("forgotPasswordLink");
  const modal = document.getElementById("forgotPasswordModal");
  const closeBtn = document.getElementById("closeForgotModalBtn");
  const cancelBtn = document.getElementById("cancelForgotBtn");
  const backdrop = document.getElementById("forgotModalBackdrop");
  const form = document.getElementById("forgotPasswordForm");
  const usernameInput = document.getElementById("username");
  const recoveryEmailInput = document.getElementById("recoveryEmail");
  const recoveryStatus = document.getElementById("recoveryStatus");
  const recoveryBtn = document.getElementById("sendRecoveryBtn");

  if (!modal) return;

  function openModal() {
    if (recoveryStatus) {
      recoveryStatus.className = "recovery-status";
      recoveryStatus.textContent = "";
    }
    // Auto fill if user already typed an email into username input
    if (usernameInput && recoveryEmailInput) {
      const val = usernameInput.value.trim();
      if (val.includes("@")) {
        recoveryEmailInput.value = val;
      }
    }
    modal.classList.remove("hidden");
    setTimeout(() => {
      if (recoveryEmailInput) recoveryEmailInput.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  if (forgotLink) forgotLink.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!recoveryEmailInput || !recoveryStatus || !recoveryBtn) return;

      const email = recoveryEmailInput.value.trim();
      if (!email || !email.includes("@")) {
        recoveryStatus.className = "recovery-status active error";
        recoveryStatus.textContent = "Please enter a valid email address.";
        return;
      }

      recoveryBtn.disabled = true;
      recoveryBtn.classList.add("loading");
      recoveryStatus.className = "recovery-status";
      recoveryStatus.textContent = "";

      try {
        const resetRes = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const resetData = await resetRes.json().catch(() => ({}));
        
        recoveryStatus.className = "recovery-status active success";
        recoveryStatus.textContent = `✅ ${
          resetData.message || `Password reset instructions have been sent to ${email}. Please check your inbox and spam folder.`
        }`;
      } catch (err) {
        console.error("Recovery request error:", err?.message || String(err));
        recoveryStatus.className = "recovery-status active error";
        recoveryStatus.textContent = "❌ Unable to process reset request. Please check your connection and try again.";
      } finally {
        recoveryBtn.disabled = false;
        recoveryBtn.classList.remove("loading");
      }
    });
  }
}

// 🔹 Inline login function (reCAPTCHA removed)
window.login = async function () {
  const loginBtn = document.getElementById("loginBtn");
  const error = document.getElementById("errorMsg");
  if (!loginBtn || !error) return;

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const deviceId = navigator.userAgent;

  if (!email || !password) {
    error.textContent = "❌ Please enter both email and password.";
    return;
  }

  loginBtn.classList.add("loading");
  error.textContent = "";

  try {
    // 🔐 Backend server authenticates credentials securely via Firebase Admin & Firebase REST
    const primaryUrl = "/api/login";
    const fallbackUrl = (window.location &&
      window.location.origin &&
      window.location.origin !== "null" &&
      !window.location.origin.startsWith("file:"))
      ? `${window.location.origin}/api/login`
      : "/api/login";

    const payload = JSON.stringify({
      email,
      password,
      deviceId: deviceId || "Web Browser"
    });
    const requestHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    let res = null;
    try {
      res = await fetch(primaryUrl, {
        method: "POST",
        headers: requestHeaders,
        credentials: "include",
        body: payload
      });
    } catch (primaryFetchErr) {
      console.warn("Primary fetch failed, attempting fallback URL:", primaryFetchErr?.message || String(primaryFetchErr));
      try {
        await new Promise((r) => setTimeout(r, 300));
        res = await fetch(fallbackUrl, {
          method: "POST",
          headers: requestHeaders,
          credentials: "include",
          body: payload
        });
      } catch (retryErr) {
        error.textContent = "❌ Network connection error. Please check your internet connection.";
        loginBtn.classList.remove("loading");
        return;
      }
    }

    let data = null;
    const rawText = await res.text().catch(() => "");
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("Non-JSON response text from /api/login:", rawText);
      if (res.status === 403 || (rawText && rawText.includes("403"))) {
        data = { error: "Access Denied: Your account is not registered or has been deactivated by the Administrator." };
      } else if (res.status === 401 || (rawText && rawText.includes("401"))) {
        data = { error: "Invalid email or password. Please verify your credentials or click 'Forgot Password?' to reset." };
      } else if (res.status === 429 || (rawText && rawText.includes("429"))) {
        data = { error: "Too many login attempts. Please wait a moment and try again." };
      } else if (res.status >= 500) {
        data = { error: "Server is temporarily busy. Please try again in a moment." };
      } else {
        data = { error: "Invalid login credentials. Please try again." };
      }
    }

    if (!res.ok || !data || !data.sessionId) {
      let displayError = String(data?.error || "Invalid login credentials.");
      // Clean any raw HTML markup
      if (displayError.includes("<") && displayError.includes(">")) {
        displayError = displayError.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
      if (!displayError || displayError.toLowerCase().includes("html") || displayError === "403 Forbidden") {
        displayError = "Access Denied: Invalid email/password or account not authorized.";
      }
      error.textContent = `❌ ${displayError}`;
      loginBtn.classList.remove("loading");
      return;
    }

    // ✅ Initialize global APP_SESSION and store session in sessionStorage (Zero LocalStorage Architecture)
    window.APP_SESSION = {
      sessionId: data.sessionId,
      idToken: data.idToken || "",
      email: data.email,
      uid: data.uid || "",
      rbac: data.rbac || null
    };
    sessionStorage.setItem("sessionId", data.sessionId);
    if (data.idToken) {
      sessionStorage.setItem("idToken", data.idToken);
    }
    sessionStorage.setItem("loggedInUser", data.email);
    const usernameUpper = data.email.split("@")[0].toUpperCase();
    sessionStorage.setItem("usernameUpper", usernameUpper);
    if (data.uid) {
      sessionStorage.setItem("userUid", data.uid);
    }
    if (data.rbac) {
      sessionStorage.setItem("cached_rbac_permissions", JSON.stringify(data.rbac));
    }

    // Purge any legacy recent tabs so new login always starts completely empty
    sessionStorage.removeItem("dashboard_recent_tabs_v1");

    // ✅ Check if a post-login deep-link redirect was saved
    let postLoginHash = "#0;rte=home";
    try {
      const savedHash = sessionStorage.getItem("post_login_redirect_hash");
      if (savedHash && savedHash !== "#" && savedHash !== "#0" && !savedHash.includes("rte=home")) {
        postLoginHash = savedHash;
        sessionStorage.removeItem("post_login_redirect_hash");
      }
    } catch (e) {}

    // ✅ Redirect to dashboard with preserved deep-link hash or home route
    window.location.href = "dashboard.html" + postLoginHash;

  } catch (err) {
    console.error("Login error:", err?.message || String(err));
    const errStr = String(err?.message || err);
    if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
      error.textContent = "❌ Connection failed. Please check your network connection and try again.";
    } else {
      error.textContent = `❌ Login failed: ${err?.message || "Please check credentials and try again."}`;
    }
  } finally {
    loginBtn.classList.remove("loading");
  }
};

// 🔹 Attach listeners dynamically
document.addEventListener("DOMContentLoaded", function () {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    // Add spinner element if not present
    if (!loginBtn.querySelector(".spinner")) {
      const spinner = document.createElement("span");
      spinner.classList.add("spinner");
      loginBtn.appendChild(spinner);
    }

    // Add btn-text span if not present
    if (!loginBtn.querySelector(".btn-text")) {
      const text = document.createElement("span");
      text.classList.add("btn-text");
      text.textContent = loginBtn.textContent || "Login";
      loginBtn.textContent = "";
      loginBtn.appendChild(text);
    }

    loginBtn.addEventListener("click", window.login);
  }

  // Handle enter key press on username or password
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  [usernameInput, passwordInput].forEach((input) => {
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          window.login();
        }
      });
    }
  });

  // Initialize show/hide password and forgot password features
  initPasswordToggle();
  initForgotPassword();
});
