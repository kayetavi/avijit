import { validateSession, updateHeartbeat, deleteSession } from "./sessionStore.js";

export default async function handler(req, res) {
  // Allow GET or POST
  const method = req.method;
  const payload = method === "GET" ? req.query : req.body || {};
  const action = (payload.action || "validate").toLowerCase();

  // Extract session ID from multiple channels: body/query, headers, cookie, authorization
  const cookieHeader = req.headers?.cookie || "";
  let cookieSessionId = "";
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)(?:sessionId|x-session-id|session_id)=([^;]+)/);
    if (match) cookieSessionId = decodeURIComponent(match[1]).trim();
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  let bearerToken = "";
  if (authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  }

  const sessionId = payload.sessionId ||
    req.headers?.["x-session-id"] ||
    req.headers?.["x-session-token"] ||
    cookieSessionId ||
    (bearerToken && !bearerToken.includes(".") ? bearerToken : "") ||
    "";

  const uid = payload.uid || req.headers?.["x-user-uid"] || "";
  const email = payload.email || req.query?.email || "";

  if (action === "validate" || action === "check") {
    if (!sessionId && !uid && !email) {
      return res.status(400).json({ valid: false, reason: "missing_identifiers", error: "Missing session identifiers." });
    }
    const result = await validateSession(sessionId, uid, email);
    return res.status(200).json(result);
  }

  if (action === "heartbeat") {
    const result = await updateHeartbeat(sessionId, uid);
    return res.status(200).json(result);
  }

  if (action === "logout") {
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const sameSite = isSecure ? "SameSite=None; Secure" : "SameSite=Lax";
    res.setHeader("Set-Cookie", [
      `sessionId=; Path=/; ${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `x-session-id=; Path=/; ${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `loggedInUser=; Path=/; ${sameSite}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    ]);
    const result = await deleteSession(sessionId, uid);
    return res.status(200).json(result);
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}
