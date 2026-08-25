export async function websiteBelongsToTenant(client, websiteId, tenantId) {
  if (!websiteId) return true;
  const { data, error } = await client
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function resourceBelongsToTenant(client, table, resourceId, tenantId) {
  if (!resourceId) return false;
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function resolvePublishedWebsiteTenant(client, requestedTenantId, websiteId) {
  if (!requestedTenantId) return null;
  let query = client.from("websites").select("id, tenant_id").eq("tenant_id", requestedTenantId).eq("status", "published");
  if (websiteId) query = query.eq("id", websiteId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}
