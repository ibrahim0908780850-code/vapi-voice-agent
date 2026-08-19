export async function activateCompanyTenant(client, request) {
  const { data: owner, error: ownerError } = await client
    .from("users")
    .select("tenant_id")
    .eq("auth_user_id", request.auth_user_id)
    .maybeSingle();

  if (ownerError) throw ownerError;

  const tenantValues = {
    name: request.company_name,
    website: request.website || null,
    status: "active"
  };

  if (owner?.tenant_id) {
    const { data, error } = await client
      .from("tenants")
      .update(tenantValues)
      .eq("id", owner.tenant_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await client
    .from("tenants")
    .insert(tenantValues)
    .select()
    .single();

  if (error) throw error;
  return data;
}
