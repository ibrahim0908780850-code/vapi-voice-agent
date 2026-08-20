import { resolveLoginNextStep } from "./loginNextStep.js";

import { lookupCompanyAccess } from "./loginCompanyLookup.js";
import { normalizePlatformOwner } from "./platformOwner.js";

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

  const accountUser = normalizePlatformOwner(user);
  const { tenantId, tenantStatus, requestStatus } = await lookupCompanyAccess(client, accountUser, authUser.id);
  const resolvedUser = tenantId ? { ...accountUser, tenant_id: tenantId } : accountUser;

  const { nextStep, message, companyStatus } = resolveLoginNextStep({ user: resolvedUser, tenantStatus, requestStatus });
  const token = signToken({ id: resolvedUser.id, auth_user_id: resolvedUser.auth_user_id, email: resolvedUser.email, tenant_id: resolvedUser.tenant_id, role: resolvedUser.role, is_platform_owner: resolvedUser.is_platform_owner, company_status: companyStatus });
  return { status: 200, body: { success: true, token, next_step: nextStep, message, user: { id: resolvedUser.id, email: resolvedUser.email, tenant_id: resolvedUser.tenant_id, role: resolvedUser.role, is_platform_owner: resolvedUser.is_platform_owner, company_status: companyStatus } } };
}
