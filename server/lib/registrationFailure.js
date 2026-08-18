export function registrationFailure(error) {
  const code = String(error?.code || "registration_failed");
  const details = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();

  if (code === "23505" || /duplicate|already exists|already registered|unique constraint/.test(details)) {
    return {
      status: 409,
      error: "account_already_exists",
      message: "يوجد حساب أو طلب شركة مسجل بهذا البريد الإلكتروني. سجّل الدخول للمتابعة."
    };
  }

  if (code === "42501" || /permission denied|row-level security|not authorized/.test(details)) {
    return {
      status: 503,
      error: "registration_configuration_error",
      message: "تعذر حفظ طلب الشركة بسبب إعدادات الصلاحيات. تواصل مع إدارة المنصة."
    };
  }

  if (/column|schema|relation|does not exist/.test(details)) {
    return {
      status: 503,
      error: "registration_schema_error",
      message: "تعذر تجهيز نموذج طلب الشركة. تواصل مع إدارة المنصة لتحديث إعدادات البيانات."
    };
  }

  return {
    status: 500,
    error: code,
    message: "تعذر إنشاء حساب الشركة حالياً. يرجى المحاولة مرة أخرى."
  };
}
