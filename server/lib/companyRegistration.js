import { upsertCompanyOwnerProfile } from "./companyProfile.js";

export async function createCompanyRequest(client, { authUserId, payload }) {
  const requiredRequestValues = {
    auth_user_id: authUserId,
    full_name: payload.fullName || payload.email,
    email: payload.email,
    company_name: payload.companyName,
    company_type: payload.companyType,
    status: "pending"
  };
  const optionalRequestValues = {};

  if (payload.phone) optionalRequestValues.phone = payload.phone;
  if (payload.website) optionalRequestValues.website = payload.website;
  if (payload.description) optionalRequestValues.description = payload.description;
  if (payload.documentUrl) optionalRequestValues.document_url = payload.documentUrl;

  const insertRequest = async (values) => client
    .from("company_requests")
    .insert(values)
    .select()
    .single();

  let { data, error } = await insertRequest({ ...requiredRequestValues, ...optionalRequestValues });

  // Older Supabase deployments can lack optional profile columns such as phone
  // or document_url. Retry with the core request contract so the activation
  // request reaches the platform dashboard instead of being discarded.
  const errorDetails = `${error?.code || ""} ${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  const missingOptionalColumn = error?.code === "PGRST204" || /column.*(does not exist|could not find)|schema cache/.test(errorDetails);
  if (error && Object.keys(optionalRequestValues).length > 0 && missingOptionalColumn) {
    ({ data, error } = await insertRequest(requiredRequestValues));
  }

  if (error) throw error;
  return data;
}

export async function createPendingCompanyTenant(client, payload) {
  const { data, error } = await client
    .from("tenants")
    .insert({
      name: payload.companyName,
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
  let pendingTenant = null;
  try {
    pendingTenant = await createPendingCompanyTenant(client, payload);
    await upsertCompanyOwnerProfile(client, authUserId, payload.email, pendingTenant.id);
    const request = await createCompanyRequest(client, { authUserId, payload });
    return { kind: "success", request };
  } catch (error) {
    if (pendingTenant?.id) {
      await client.from("tenants").delete().eq("id", pendingTenant.id).catch(() => undefined);
    }
    await client.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw error;
  }
}
