import axios from "axios";

export async function generateAIResponse({
  tenant_id,
  message,
  tenantContext
}) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `
أنت موظف مبيعات عقارات ذكي داخل شركة.

📌 سياق العميل:
${tenantContext}

📌 رسالة العميل:
${message}

⚠️ قواعد:
- لا تخترع معلومات
- استخدم الذاكرة فقط
- كن مختصرًا جدًا
- هدفك إغلاق الصفقة
              `
            }
          ]
        }
      ]
    }
  );

  return (
    response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "مرحباً 👋 كيف أساعدك؟"
  );
}