export async function upsertCompanyOwnerProfile(client, authUserId, email) {
  const { error } = await client.from("users").upsert({
    auth_user_id: authUserId,
    email,
    role: "owner",
    tenant_id: null
  }, { onConflict: "auth_user_id" });

  if (error) throw error;
}
