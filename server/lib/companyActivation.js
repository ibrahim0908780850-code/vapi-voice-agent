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
  const coreTenantValues = { name: request.company_name, status: "active" };

  const isMissingColumn = (error) => {
    const details = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    return error?.code === "PGRST204" || /column.*(does not exist|could not find)|schema cache/.test(details);
  };

  if (owner?.tenant_id) {
    const updateTenant = (values) => client
      .from("tenants")
      .update(values)
      .eq("id", owner.tenant_id)
      .select()
      .single();
    let { data, error } = await updateTenant(tenantValues);
    if (error && isMissingColumn(error)) ({ data, error } = await updateTenant(coreTenantValues));

    if (error) throw error;
    return data;
  }

  const insertTenant = (values) => client
    .from("tenants")
    .insert(values)
    .select()
    .single();
  let { data, error } = await insertTenant(tenantValues);
  if (error && isMissingColumn(error)) ({ data, error } = await insertTenant(coreTenantValues));

  if (error) throw error;
  return data;
}
