import { isPlatformOwner } from "./platformOwner.js";

export async function lookupCompanyAccess(client, user, authUserId) {
  if (isPlatformOwner(user)) return { tenantStatus: null, requestStatus: null };

  // A linked tenant is the primary source of truth. Its state decides whether
  // the user reaches the company dashboard or the pending-activation page.
  if (user.tenant_id) {
    const { data: tenant, error } = await client
      .from("tenants")
      .select("status")
      .eq("id", user.tenant_id)
      .maybeSingle();
    if (error) throw error;
    return { tenantStatus: tenant?.status ?? "pending", requestStatus: null };
  }

  // Only accounts without a linked company fall back to their latest request.
  const { data: request, error } = await client
    .from("company_requests")
    .select("status")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  return { tenantStatus: null, requestStatus: request?.status ?? null };
}
