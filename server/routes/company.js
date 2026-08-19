import express from "express";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../scr/config/supabase-admin.js";
import { registrationFailure } from "../lib/registrationFailure.js";
import { createCompanyRequest, registerCompanyAccount } from "../lib/companyRegistration.js";

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
    const result = await registerCompanyAccount(supabaseAdmin, payload);
    if (result.kind === "existing") {
      return res.status(409).json({
        error: "account_already_exists",
        message: "يوجد حساب مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
      });
    }

    if (result.kind === "auth_error") {
      const alreadyExists = /already|registered|exists/i.test(result.error?.message || "");
      return res.status(alreadyExists ? 409 : 400).json({
        error: alreadyExists ? "account_already_exists" : "account_creation_failed",
        message: alreadyExists
          ? "يوجد حساب مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
          : result.error?.message || "تعذر إنشاء حساب المصادقة"
      });
    }

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب وإرسال طلب تفعيل الشركة للمراجعة",
      request_id: result.request.id,
      status: result.request.status
    });
  } catch (error) {
    console.error("COMPANY REGISTRATION ERROR:", error);
    const failure = registrationFailure(error);
    return res.status(failure.status).json({
      error: failure.error,
      message: failure.message
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

    const request = await createCompanyRequest(supabaseAdmin, { authUserId, payload });
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
