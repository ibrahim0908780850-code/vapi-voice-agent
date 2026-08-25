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
