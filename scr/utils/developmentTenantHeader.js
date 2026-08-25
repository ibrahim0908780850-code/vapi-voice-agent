export function resolveDevelopmentTenantHeader(req) {
  const headerTenant = req.headers["x-tenant-id"];
  const isExplicitlyEnabled = process.env.NODE_ENV === "development" && process.env.ALLOW_UNSAFE_TENANT_HEADER === "true";
  return isExplicitlyEnabled && typeof headerTenant === "string" && headerTenant.trim() ? headerTenant.trim() : null;
}
