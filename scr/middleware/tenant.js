export function extractTenant(req, res, next) {
  const tenant_id =
    req.headers["x-tenant-id"] ||
    req.body?.tenant_id ||
    req.query?.tenant_id;

  if (!tenant_id) {
    return res.status(400).json({
      error: "TENANT_ID_REQUIRED"
    });
  }

  req.tenant_id = tenant_id;
  next();
}