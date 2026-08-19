import { resolveLoginNextStep } from "./loginNextStep.js";

export async function authenticateLogin(client, credentials, signToken) {
  const email = String(credentials?.email || "").trim().toLowerCase();
  const password = String(credentials?.password || "");
  if (!email || !password) return { status: 400, body: { error: "email_and_password_required", message: "أدخل البريد الإلكتروني وكلمة المرور" } };

  const { data: profileByEmail, error: profileLookupError } = await client
    .from("users").select("id, auth_user_id").eq("email", email).maybeSingle();
  if (profileLookupError) throw profileLookupError;
  if (!profileByEmail) return { status: 404, body: { error: "account_not_found", message: "الحساب غير موجود. أنشئ حساب شركتك أولاً." } };

  const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !authData.user) return { status: 401, body: { error: "invalid_credentials", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" } };

  const authUser = authData.user;
  const { data: user, error: userError } = await client
    .from("users").select("*").eq("auth_user_id", authUser.id).maybeSingle();
  if (userError) throw userError;
  if (!user) return { status: 404, body: { error: "account_not_found", message: "الحساب غير مكتمل. تواصل مع إدارة المنصة." } };

  let tenantStatus = null;
  let requestStatus = null;
  const isPlatformOwner = user.is_platform_owner === true || user.role === "platform_owner";
  if (!isPlatformOwner && user.tenant_id) {
    const { data: tenant, error } = await client.from("tenants").select("status").eq("id", user.tenant_id).maybeSingle();
    if (error) throw error;
    tenantStatus = tenant?.status ?? null;
  } else if (!isPlatformOwner) {
    const { data: request, error } = await client.from("company_requests").select("status").eq("auth_user_id", authUser.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    requestStatus = request?.status ?? null;
  }

  const { nextStep, message, companyStatus } = resolveLoginNextStep({ user, tenantStatus, requestStatus });
  const token = signToken({ id: user.id, auth_user_id: user.auth_user_id, email: user.email, tenant_id: user.tenant_id, role: user.role, is_platform_owner: user.is_platform_owner, company_status: companyStatus });
  return { status: 200, body: { success: true, token, next_step: nextStep, message, user: { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role, is_platform_owner: user.is_platform_owner, company_status: companyStatus } } };
}
