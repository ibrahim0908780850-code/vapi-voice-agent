import { isPlatformOwner } from "./platformOwner.js";

function isMissingColumn(error) {
  const details = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return error?.code === "PGRST204" || /column.*(does not exist|could not find)|schema cache/.test(details);
}

async function readLatestRequest(client, authUserId, columns) {
  return client
    .from("company_requests")
    .select(columns)
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function lookupCompanyAccess(client, user, authUserId) {
  if (isPlatformOwner(user)) return { tenantId: null, tenantStatus: null, requestStatus: null };

  // A linked tenant is the primary source of truth. Its state decides whether
  // the user reaches the company dashboard or the pending-activation page.
  if (user.tenant_id) {
    const { data: tenant, error } = await client
      .from("tenants")
      .select("status")
      .eq("id", user.tenant_id)
      .maybeSingle();
    if (error) throw error;
    return { tenantId: user.tenant_id, tenantStatus: tenant?.status ?? "pending", requestStatus: null };
  }

  // Only accounts without a linked company fall back to their latest request.
  let { data: request, error } = await readLatestRequest(client, authUserId, "status, tenant_id");
  if (error && isMissingColumn(error)) {
    ({ data: request, error } = await readLatestRequest(client, authUserId, "status"));
  }
  if (error) throw error;

  if (request?.tenant_id) {
    const { data: tenant, error: tenantError } = await client
      .from("tenants")
      .select("status")
      .eq("id", request.tenant_id)
      .maybeSingle();
    if (tenantError) throw tenantError;

    // Some accounts were approved before tenant_id was persisted on users.
    // Repair that historic link during login so future logins use the profile.
    const { error: linkError } = await client
      .from("users")
      .update({ tenant_id: request.tenant_id })
      .eq("auth_user_id", authUserId);
    if (linkError) throw linkError;

    return { tenantId: request.tenant_id, tenantStatus: tenant?.status ?? "pending", requestStatus: request.status ?? null };
  }

  return { tenantId: null, tenantStatus: null, requestStatus: request?.status ?? null };
}
