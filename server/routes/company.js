import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../scr/config/supabase-admin.js";

const router = express.Router();

function authMiddleware(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "missing_token" });
    }

    const token = authorization.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function readCompanyPayload(body = {}) {
  return {
    fullName: String(body.full_name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    password: String(body.password || ""),
    phone: body.phone ? String(body.phone).trim() : null,
    companyName: String(body.company_name || "").trim(),
    companyType: String(body.company_type || "general").trim(),
    website: body.website ? String(body.website).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    documentUrl: body.document_url ? String(body.document_url).trim() : null
  };
}

function validateRegistration(payload) {
  if (!payload.fullName || !payload.email || !payload.password || !payload.companyName) {
    return "يرجى إدخال الاسم والبريد الإلكتروني وكلمة المرور واسم الشركة";
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    return "البريد الإلكتروني غير صالح";
  }

  if (payload.password.length < 8) {
    return "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل";
  }

  return null;
}

async function createCompanyRequest({ authUserId, payload }) {
  const { data, error } = await supabaseAdmin
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

// التسجيل العام: ينشئ حساب المصادقة وملف المستخدم وطلب التفعيل في خطوة واحدة.
router.post("/register", async (req, res) => {
  const payload = readCompanyPayload(req.body);
  const validationError = validateRegistration(payload);

  if (validationError) {
    return res.status(400).json({
      error: "invalid_registration_data",
      message: validationError
    });
  }

  try {
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", payload.email)
      .maybeSingle();

    if (existingUserError) throw existingUserError;
    if (existingUser) {
      return res.status(409).json({
        error: "account_already_exists",
        message: "يوجد حساب مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
      });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { full_name: payload.fullName }
    });

    if (authError || !authData.user) {
      const alreadyExists = /already|registered|exists/i.test(authError?.message || "");
      return res.status(alreadyExists ? 409 : 400).json({
        error: alreadyExists ? "account_already_exists" : "account_creation_failed",
        message: alreadyExists
          ? "يوجد حساب مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
          : authError?.message || "تعذر إنشاء حساب المصادقة"
      });
    }

    const authUserId = authData.user.id;

    try {
      const { error: profileError } = await supabaseAdmin.from("users").insert({
        auth_user_id: authUserId,
        email: payload.email,
        role: "owner",
        tenant_id: null
      });

      if (profileError) throw profileError;

      const request = await createCompanyRequest({ authUserId, payload });
      return res.status(201).json({
        success: true,
        message: "تم إنشاء الحساب وإرسال طلب تفعيل الشركة للمراجعة",
        request_id: request.id,
        status: request.status
      });
    } catch (error) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("COMPANY REGISTRATION ERROR:", error);
    return res.status(500).json({
      error: "registration_failed",
      message: "تعذر إنشاء حساب الشركة حالياً"
    });
  }
});

// يدعم هذا المسار المستخدمين المسجلين سابقاً الذين لم يرسلوا طلب شركة بعد.
router.post("/request", authMiddleware, async (req, res) => {
  const payload = readCompanyPayload({
    ...req.body,
    full_name: req.body.full_name || req.user.email,
    email: req.user.email
  });

  if (!payload.companyName) {
    return res.status(400).json({
      error: "company_name_required",
      message: "أدخل اسم الشركة"
    });
  }

  try {
    const authUserId = req.user.auth_user_id;
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("tenant_id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({
        error: "user_profile_not_found",
        message: "الحساب غير موجود. أنشئ حساب شركتك أولاً."
      });
    }

    if (user.tenant_id) {
      return res.status(400).json({
        error: "already_has_company",
        message: "هذا الحساب مرتبط بشركة مفعّلة بالفعل"
      });
    }

    const { data: pending, error: pendingError } = await supabaseAdmin
      .from("company_requests")
      .select("id")
      .eq("auth_user_id", authUserId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (pending) {
      return res.status(409).json({
        error: "request_already_pending",
        message: "يوجد طلب تفعيل قيد المراجعة بالفعل"
      });
    }

    const request = await createCompanyRequest({ authUserId, payload });
    return res.status(201).json({
      success: true,
      message: "تم إرسال طلب تفعيل الشركة بنجاح",
      request
    });
  } catch (error) {
    console.error("COMPANY REQUEST ERROR:", error);
    return res.status(500).json({
      error: "request_failed",
      message: "تعذر إرسال طلب الشركة حالياً"
    });
  }
});

export default router;
