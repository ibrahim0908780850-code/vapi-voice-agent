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
  const { tenantStatus, requestStatus } = await lookupCompanyAccess(client, accountUser, authUser.id);

  const { nextStep, message, companyStatus } = resolveLoginNextStep({ user: accountUser, tenantStatus, requestStatus });
  const token = signToken({ id: accountUser.id, auth_user_id: accountUser.auth_user_id, email: accountUser.email, tenant_id: accountUser.tenant_id, role: accountUser.role, is_platform_owner: accountUser.is_platform_owner, company_status: companyStatus });
  return { status: 200, body: { success: true, token, next_step: nextStep, message, user: { id: accountUser.id, email: accountUser.email, tenant_id: accountUser.tenant_id, role: accountUser.role, is_platform_owner: accountUser.is_platform_owner, company_status: companyStatus } } };
}
