import axios from "axios";
import { getPropertyRecommendations } from "./recommendation.engine.js";

export async function generateAIResponse({
  tenant_id,
  lead_id,
  message,
  tenantContext
}) {
  try {
    // 1. جلب توصيات العقارات
    const recommendations = await getPropertyRecommendations(
      tenant_id,
      lead_id
    );

    // 2. تجهيز بيانات مختصرة للذكاء
    const formattedRecommendations = recommendations.map((r) => ({
      title: r.property.title,
      price: r.property.price,
      city: r.property.city,
      type: r.property.type,
      bedrooms: r.property.bedrooms,
      score: r.score
    }));

    // 3. بناء البرومبت الذكي
    const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

📌 سياق الشركة والعميل:
${tenantContext}

📌 رسالة العميل:
${message}

🏠 العقارات المتاحة والمناسبة:
${JSON.stringify(formattedRecommendations, null, 2)}

⚠️ قواعد مهمة:
- لا تخترع أي معلومات غير موجودة
- استخدم العقارات المعروضة فقط
- اختر أفضل عقار واحد إذا كان مناسب
- إذا لم يوجد مناسب قل: "لا يوجد حالياً خيارات مناسبة"
- كن مختصر جدًا ومقنع
- هدفك الأساسي إغلاق الصفقة أو حجز موعد
- استخدم أسلوب بيع احترافي طبيعي

🎯 المطلوب:
رد كموظف مبيعات يرد على العميل مباشرة.
    `;

    // 4. إرسال إلى Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      }
    );

    // 5. استخراج الرد
    const aiResponse =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً 👋 كيف أساعدك؟";

    return {
      response: aiResponse,
      recommendations: formattedRecommendations
    };
  } catch (error) {
    console.error("AI Brain Error:", error.message);

    return {
      response: "حدث خطأ مؤقت، حاول مرة أخرى لاحقاً.",
      recommendations: []
    };
  }
}