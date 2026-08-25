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
