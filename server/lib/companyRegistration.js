import { upsertCompanyOwnerProfile } from "./companyProfile.js";

export async function createCompanyRequest(client, { authUserId, payload }) {
  const { data, error } = await client
    .from("company_requests")
    .insert({
      auth_user_id: authUserId,
      full_name: payload.fullName || payload.email,
      email: payload.email,
      phone: payload.phone,
      company_name: payload.companyName,
      company_type: payload.companyType,
      website: payload.website,
      description: payload.description,
      document_url: payload.documentUrl,
      status: "pending"
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function registerCompanyAccount(client, payload) {
  const { data: existingUser, error: existingUserError } = await client
    .from("users")
    .select("id")
    .eq("email", payload.email)
    .maybeSingle();

  if (existingUserError) throw existingUserError;
  if (existingUser) return { kind: "existing" };

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName }
  });

  if (authError || !authData.user) return { kind: "auth_error", error: authError };

  const authUserId = authData.user.id;
  try {
    await upsertCompanyOwnerProfile(client, authUserId, payload.email);
    const request = await createCompanyRequest(client, { authUserId, payload });
    return { kind: "success", request };
  } catch (error) {
    await client.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw error;
  }
}
