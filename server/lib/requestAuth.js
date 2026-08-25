import jwt from "jsonwebtoken";

export function getBearerToken(authorization) {
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function authenticateRequest(req, res, next) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: "AUTH_TOKEN_REQUIRED" });

  try {
    const identity = jwt.verify(token, process.env.JWT_SECRET);
    if (!identity?.id || !identity?.auth_user_id) {
      return res.status(401).json({ error: "INVALID_TOKEN" });
    }
    req.auth = identity;
    return next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

export function requireTenantIdentity(req, res, next) {
  const tenantId = typeof req.auth?.tenant_id === "string" ? req.auth.tenant_id.trim() : "";
  if (!tenantId) return res.status(403).json({ error: "TENANT_ACCESS_REQUIRED" });
  req.tenantId = tenantId;
  return next();
}

export function rejectTenantMismatch(req, res, next) {
  const requestedTenantId = typeof req.body?.tenant_id === "string" ? req.body.tenant_id.trim() : "";
  if (requestedTenantId && requestedTenantId !== req.tenantId) {
    return res.status(403).json({ error: "TENANT_ACCESS_DENIED" });
  }
  return next();
}
