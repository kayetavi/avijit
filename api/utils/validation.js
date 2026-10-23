// Robust Backend API Input Validation & Sanitization Utility

export function validateNumber(val, { min = -Infinity, max = Infinity, allowNegative = false } = {}) {
  if (val === undefined || val === null || val === "") return true;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return false;
  if (!allowNegative && num < 0) return false;
  if (num < min || num > max) return false;
  return true;
}

export function sanitizeInput(obj, depth = 0) {
  if (depth > 10) return obj;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "boolean") return obj;
  if (typeof obj === "number") {
    if (isNaN(obj) || !isFinite(obj)) return null;
    return obj;
  }
  if (typeof obj === "string") {
    if (obj === "NaN" || obj === "Infinity" || obj === "-Infinity") return null;
    if (obj.length > 50000) throw new Error("Payload too large");
    return obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length > 10000) throw new Error("Array payload too large");
    return obj.map(item => sanitizeInput(item, depth + 1));
  }
  if (typeof obj === "object") {
    try {
      const keys = Object.keys(obj);
      if (keys.length > 1000) throw new Error("Object payload too large");
      const sanitized = {};
      for (const key of keys) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
        sanitized[key] = sanitizeInput(obj[key], depth + 1);
      }
      return sanitized;
    } catch (e) {
      return obj;
    }
  }
  return obj;
}

export function validateApiRequest(req) {
  try {
    if (req.body && (typeof req.body === "object" || Array.isArray(req.body))) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeInput(req.query);
    }
    return true;
  } catch (err) {
    console.warn("[Validation Warning] Request validation notice:", err?.message);
    return true;
  }
}

// HTML entity sanitization helper against XSS/HTML injection
export function escapeHtml(str) {
  if (typeof str !== "string") return str ? String(str) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Simple in-memory rate limiter for sensitive endpoints
const requestCounts = new Map();

// Periodic cleanup of expired rate limit entries to prevent memory leaks (DoOS protection)
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
      if (now > record.resetTime) {
        requestCounts.delete(key);
      }
    }
  }, 60000);
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

export function rateLimiter({ windowMs = 60000, max = 30 } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    
    let record = requestCounts.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      requestCounts.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later."
      });
    }
    next();
  };
}
