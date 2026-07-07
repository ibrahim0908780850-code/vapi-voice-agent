export function buildAIContext({
  memory,
  company,
  agent,
  knowledge
}) {

  const lead = memory?.lead || {};
  const messages = memory?.messages || [];
  const activities = memory?.activities || [];

  const lastMessages = messages
    .map(m => `- ${m.message || m.ai_response}`)
    .join("\n");

  const notes = activities
    .map(a => `- ${a.action}: ${a.note}`)
    .join("\n");


  const knowledgeText = (knowledge || [])
    .map(k => `
📌 ${k.title}
${k.content}
`)
    .join("\n");


  return `

# 🏢 معلومات الشركة

الاسم:
${company?.company_name || "غير معروف"}

النشاط:
${company?.industry_type || "غير محدد"}

الوصف:
${company?.company_description || ""}

الهاتف:
${company?.phone || ""}

واتساب:
${company?.whatsapp_number || ""}

الموقع:
${company?.city || ""} ${company?.country || ""}

ساعات العمل:
${company?.business_hours || ""}


# 🤖 شخصية الوكيل

الاسم:
${agent?.name || "SALIH AI"}

الحالة:
${agent?.status || "active"}

القواعد:
${agent?.system_prompt || ""}


# 🧠 معرفة الشركة

${knowledgeText}


# 👤 بيانات العميل

الاسم:
${lead.full_name || "غير معروف"}

الهاتف:
${lead.phone || "غير معروف"}

المدينة:
${lead.city || "غير محدد"}

الميزانية:
${lead.budget || "غير محدد"}

الاهتمام:
${lead.intent || "غير محدد"}


# 💬 آخر المحادثات

${lastMessages || "لا توجد محادثات"}


# 📝 النشاطات السابقة

${notes || "لا توجد نشاطات"}


`;
}