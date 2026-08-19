import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { resolveLoginNextStep } from "../../server/lib/loginNextStep.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      error: "email_and_password_required",
      message: "أدخل البريد الإلكتروني وكلمة المرور"
    });
  }

  try {
    const supabase = getSupabase();

    // يفرّق النظام بين الحساب غير المسجل وكلمة المرور غير الصحيحة كما يتطلب تدفق المنتج.
    const { data: profileByEmail, error: profileLookupError } = await supabase
      .from("users")
      .select("id, auth_user_id")
      .eq("email", email)
      .maybeSingle();

    if (profileLookupError) throw profileLookupError;
    if (!profileByEmail) {
      return res.status(404).json({
        error: "account_not_found",
        message: "الحساب غير موجود. أنشئ حساب شركتك أولاً."
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "invalid_credentials",
        message: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
      });
    }

    const authUser = authData.user;
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({
        error: "account_not_found",
        message: "الحساب غير مكتمل. تواصل مع إدارة المنصة."
      });
    }

    let tenantStatus = null;
    let requestStatus = null;

    if (!(user.is_platform_owner === true || user.role === "platform_owner") && user.tenant_id) {
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("status")
        .eq("id", user.tenant_id)
        .maybeSingle();

      if (tenantError) throw tenantError;
      tenantStatus = tenant?.status ?? null;
    } else if (!(user.is_platform_owner === true || user.role === "platform_owner")) {
      const { data: request, error: requestError } = await supabase
        .from("company_requests")
        .select("status")
        .eq("auth_user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError) throw requestError;
      requestStatus = request?.status ?? null;
    }

    const { nextStep, message, companyStatus } = resolveLoginNextStep({ user, tenantStatus, requestStatus });

    const token = jwt.sign(
      {
        id: user.id,
        auth_user_id: user.auth_user_id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role,
        is_platform_owner: user.is_platform_owner,
        company_status: companyStatus
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      next_step: nextStep,
      message,
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role,
        is_platform_owner: user.is_platform_owner,
        company_status: companyStatus
      }
    });
  } catch (error) {
    console.error("AUTH LOGIN ERROR:", error);
    return res.status(500).json({
      error: "server_error",
      message: "تعذر تسجيل الدخول حالياً"
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "missing_token" });
    }

    const token = authorization.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ success: true });
});

export default router;
