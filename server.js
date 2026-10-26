import express from "express";
import path from "path";
import fs from "fs"; 
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load local .env variables into process.env if present
try {
  const envPath = path.resolve(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env file:", e.message);
}
import calculateInventoryHandler from "./api/calculateInventory.js";
import chatbotHandler from "./api/chatbot.js";
import formulasHandler from "./api/formulas.js";
import geminiHandler from "./api/gemini.js";
import geminiStreamHandler from "./api/gemini-stream.js";
import getAnalysesHandler from "./api/get-analyses.js";
import loginHandler from "./api/login.js";
import sessionHandler from "./api/session.js";
import rbacHandler from "./api/rbac.js";
import adminHandler from "./api/admin.js";
import sendEmailHandler from "./api/send-email.js";
import viiidivHandler from "./api/viiidiv.js";
import b313Handler from "./api/b313.js";
import simpleHandler from "./api/simple.js";
import toxicHandler from "./api/toxic.js";
import representativeFluidsHandler from "./api/representative-fluids.js";
import corrosionRateHandler from "./api/corrosion-rate.js";
import databaseHandler from "./api/database.js";
import damageMechanismsHandler from "./api/damage-mechanisms.js";
import remainingHandler from "./api/remaining.js";
import pipeDimensionsHandler from "./api/pipe-dimensions.js";
import damageCriteriaHandler from "./api/damage-criteria.js";
import forgotPasswordHandler from "./api/forgot-password.js";
import parseStreamDocumentHandler from "./api/parse-stream-document.js";
import streamDatasetsHandler from "./api/stream-datasets.js";
import documentsHandler from "./api/documents.js";
import structuralThicknessHandler from "./api/structural-thickness.js";
import riskCalculatorHandler from "./api/risk-calculator.js";
import chemicalSuiteHandler from "./api/chemical-suite.js";
import stressDataHandler from "./api/stress-data.js";
import { validateApiRequest, rateLimiter } from "./api/utils/validation.js";

const app = express();
const PORT = 3000;

// Security Headers Middleware (Production Hardened)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'");
  next();
});

// Rate limiters for sensitive endpoints
const authRateLimiter = rateLimiter({ windowMs: 60000, max: 20 });
const sessionRateLimiter = rateLimiter({ windowMs: 60000, max: 60 });
const contactRateLimiter = rateLimiter({ windowMs: 60000, max: 10 });
const aiRateLimiter = rateLimiter({ windowMs: 60000, max: 30 });

// Enable CORS for all incoming requests (crucial for iframe preview, cross-origin, and fetch clients)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, X-Session-Id, X-Session-Token, X-User-Uid");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Range");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "KayetDMS" });
});

// Safe async route wrapper to prevent uncaught promise drops and socket resets
const safeAsync = (fn) => (req, res, next) => {
  if (!validateApiRequest(req)) {
    return res.status(400).json({
      success: false,
      error: "Bad Request: Invalid or malformed request payload/parameters."
    });
  }
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[API Guard] Error handling ${req.method} ${req.path}:`, err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: "An internal server error occurred while processing the request."
      });
    }
  });
};

// API Routes
app.all(["/api/documents", "/api/documents/:id"], safeAsync((req, res) => documentsHandler(req, res)));
app.all(["/api/stream-datasets", "/api/stream-datasets/tie-in-physics"], safeAsync((req, res) => streamDatasetsHandler(req, res)));
app.all("/api/parse-stream-document", aiRateLimiter, safeAsync((req, res) => parseStreamDocumentHandler(req, res)));
app.all("/api/calculateInventory", safeAsync((req, res) => calculateInventoryHandler(req, res)));
app.all("/api/chatbot", aiRateLimiter, safeAsync((req, res) => chatbotHandler(req, res)));
app.all("/api/formulas", safeAsync((req, res) => formulasHandler(req, res)));
app.all("/api/gemini", aiRateLimiter, safeAsync((req, res) => geminiHandler(req, res)));
app.all("/api/gemini-stream", aiRateLimiter, safeAsync((req, res) => geminiStreamHandler(req, res)));
app.all("/api/get-analyses", safeAsync((req, res) => getAnalysesHandler(req, res)));
app.all("/api/login", authRateLimiter, safeAsync((req, res) => loginHandler(req, res)));
app.all("/api/forgot-password", authRateLimiter, safeAsync((req, res) => forgotPasswordHandler(req, res)));
app.all("/api/session", sessionRateLimiter, safeAsync((req, res) => sessionHandler(req, res)));
app.all("/api/rbac", safeAsync((req, res) => rbacHandler(req, res)));
app.all("/api/admin", safeAsync((req, res) => adminHandler(req, res)));
app.all("/api/send-email", contactRateLimiter, safeAsync((req, res) => sendEmailHandler(req, res)));
app.all("/api/viiidiv", safeAsync((req, res) => viiidivHandler(req, res)));
app.all("/api/b313", safeAsync((req, res) => b313Handler(req, res)));
app.all("/api/b313/calculate", safeAsync((req, res) => b313Handler(req, res)));
app.all("/api/b313/metadata", safeAsync((req, res) => b313Handler(req, res)));
app.all("/api/b313/mill-tolerance", safeAsync((req, res) => b313Handler(req, res)));
app.all("/api/simple", safeAsync((req, res) => simpleHandler(req, res)));
app.all("/api/toxic", safeAsync((req, res) => toxicHandler(req, res)));
app.all("/api/representative-fluids", safeAsync((req, res) => representativeFluidsHandler(req, res)));
app.all("/api/corrosion-rate", safeAsync((req, res) => corrosionRateHandler(req, res)));
app.all("/api/database", safeAsync((req, res) => databaseHandler(req, res)));
app.all("/api/damage-mechanisms", safeAsync((req, res) => damageMechanismsHandler(req, res)));
app.all("/api/remaining", safeAsync((req, res) => remainingHandler(req, res)));
app.all("/api/pipe-dimensions", safeAsync((req, res) => pipeDimensionsHandler(req, res)));
app.all("/api/damage-criteria", safeAsync((req, res) => damageCriteriaHandler(req, res)));
app.all("/api/structural-thickness", safeAsync((req, res) => structuralThicknessHandler(req, res)));
app.all(["/api/risk-calculator", "/api/risk-calculator/pof", "/api/risk-calculator/art-table"], safeAsync((req, res) => riskCalculatorHandler(req, res)));
app.all(["/api/chemical-suite", "/api/chemical-suite/chemicals"], safeAsync((req, res) => chemicalSuiteHandler(req, res)));
app.all(["/api/stress-data", "/api/stress-data/interpolate", "/api/stress-data/template", "/api/stress-data/metadata"], safeAsync((req, res) => stressDataHandler(req, res)));

// Signup endpoint (Locked down: RBAC Admin provisioning required)
app.post("/signup", authRateLimiter, (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Public self-registration is disabled. User accounts and roles are provisioned by Administrators via the RBAC Control Center."
  });
});

// 🛡️ Security Guard: Block direct browser/F12 inspection and download of raw source scripts, database files, and maps
app.use((req, res, next) => {
  const reqPath = (req.path || "").toLowerCase();

  // 1. Block all source maps (.map files) to prevent reverse-engineering
  if (reqPath.endsWith(".map") || reqPath.includes(".map")) {
    return res.status(403).json({
      error: "Access Denied: Source maps are disabled in production."
    });
  }

  // 2. Block direct HTTP access to all individual client scripts in /js/
  if (reqPath.startsWith("/js/") || reqPath.includes("/js/")) {
    return res.status(403).json({
      error: "Access Denied: Protected Resource. Direct access to individual client modules is prohibited. Use compiled production bundle."
    });
  }

  // 3. Block raw unbundled JavaScript files anywhere outside of /assets/
  if (reqPath.endsWith(".js") && !reqPath.startsWith("/assets/")) {
    return res.status(403).json({
      error: "Access Denied: Protected Resource. Unbundled source code access is prohibited."
    });
  }

  // 4. Block administrative template direct static file download (must load via authenticated /api/admin)
  if (reqPath.includes("view-admin-1000.html") || reqPath.includes("admin-panel")) {
    return res.status(403).json({
      error: "Access Denied: Administrative interface requires authenticated session."
    });
  }

  // 5. Block backend data, secrets, environment files and build configs
  if (
    reqPath.startsWith("/secrets/") ||
    reqPath.startsWith("/data/secure/") ||
    reqPath.startsWith("/.git") ||
    reqPath.startsWith("/.env") ||
    reqPath === "/package.json" ||
    reqPath === "/package-lock.json" ||
    reqPath === "/bun.lock" ||
    reqPath.startsWith("/node_modules")
  ) {
    return res.status(403).json({
      error: "Access Denied: Protected Resource. Configuration and internal files are strictly confidential."
    });
  }

  next();
});

// Serve image directory with cache headers
app.use('/image', express.static(path.join(__dirname, 'image'), { maxAge: '7d', immutable: true }));

// Serve organized static directories (public, /assets, /templates, /views) + root fallbacks
// Note: '/js' static directory is intentionally NOT served to prevent source exposure in DevTools
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'public', 'views')));
app.use(express.static(path.join(__dirname, 'public', 'views')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'assets', 'models')));
app.use(express.static(path.join(__dirname, 'assets', 'css')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));

// Serve static files from project root (HTML views only)
app.use(express.static(__dirname));

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`KayetDMS server running at http://0.0.0.0:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server listen error:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forcefully terminating process after timeout.");
    process.exit(1);
  }, 5000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
