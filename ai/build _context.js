export function buildAIContext(memory) {
  if (!memory) return "لا توجد بيانات سابقة";

  const { lead, messages, activities } = memory;

  const lastMessages = messages
    .map(m => `- ${m.message || m.ai_response}`)
    .join("\n");

  const notes = activities
    .map(a => `- ${a.action}: ${a.note}`)
    .join("\n");

  return `
📌 بيانات العميل:
- الاسم: ${lead?.full_name || "غير معروف"}
- الهاتف: ${lead?.phone}
- المدينة: ${lead?.city || "غير محدد"}
- الميزانية: ${lead?.budget || "غير محدد"}
- الاهتمام: ${lead?.intent || "غير محدد"}

📌 آخر محادثات:
${lastMessages}

📌 النشاطات:
${notes}
`;
}