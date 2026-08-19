export async function upsertCompanyOwnerProfile(client, authUserId, email, tenantId) {
  if (!tenantId) throw new Error("A pending tenant is required before creating the company owner profile");

  const { error } = await client.from("users").upsert({
    auth_user_id: authUserId,
    email,
    role: "owner",
    tenant_id: tenantId
  }, { onConflict: "auth_user_id" });

  if (error) throw error;
}
