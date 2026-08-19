export function resolveLoginNextStep({ user, tenantStatus = null, requestStatus = null }) {
  if (user.is_platform_owner === true || user.role === "platform_owner") {
    return { nextStep: "platform", message: "مرحباً بك في لوحة إدارة المنصة", companyStatus: "active" };
  }

  if (user.tenant_id) {
    if (tenantStatus === "active") {
      return { nextStep: "dashboard", message: "تم تسجيل الدخول إلى لوحة الشركة", companyStatus: "active" };
    }
    return { nextStep: "pending", message: "الشركة قيد التفعيل", companyStatus: "pending" };
  }

  if (requestStatus === "pending" || requestStatus === "approved") {
    return {
      nextStep: "pending",
      message: requestStatus === "approved" ? "تمت الموافقة ويجري تجهيز الشركة" : "طلب الشركة قيد المراجعة",
      companyStatus: "pending"
    };
  }

  if (requestStatus === "rejected") {
    return { nextStep: "create_company", message: "يمكنك مراجعة البيانات وإرسال طلب شركة جديد", companyStatus: "rejected" };
  }

  return { nextStep: "create_company", message: "لديك حساب، لكن لا توجد شركة مرتبطة به", companyStatus: "none" };
}
