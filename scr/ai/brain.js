import axios from "axios";
import { getPropertyRecommendations } from "../../ai/recommendation.engine.js";
import { runAutopilot } from "./autopilot.engine.js";
import { sendWhatsAppAutopilot } from "../../ai/whatsapp.autopilot.js";

/**
 * 🧠 CENTRAL AI BRAIN (MULTI-CHANNEL)
 * يدعم: WhatsApp / Messenger / Instagram / Email / VAPI
 */
export async function generateAIResponse({
  tenant_id,
  lead_id,
  message,
  channel,          // 🆕 مهم جداً
  user_id,          // 🆕 Messenger / Instagram ID
  email,            // 🆕 Email channel
  tenantContext
}) {
  try {
    // =========================
    // 1. GET PROPERTY RECOMMENDATIONS
    // =========================
    const recommendations = await getPropertyRecommendations(
      tenant_id,
      lead_id
    );

    // =========================
    // 2. FORMAT DATA
    // =========================
    const formattedRecommendations = recommendations.map((r) => ({
      title: r.property.title,
      price: r.property.price,
      city: r.property.city,
      type: r.property.type,
      bedrooms: r.property.bedrooms,
      score: r.score
    }));

    // =========================
    // 3. BUILD AI PROMPT (UNIFIED BRAIN)
    // =========================
    const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

📌 سياق الشركة والعميل:
${tenantContext}

📌 القناة الحالية:
${channel}

📌 رسالة العميل:
${message}

🏠 العقارات المتاحة:
${JSON.stringify(formattedRecommendations, null, 2)}

⚠️ قواعد مهمة:
- لا تخترع أي معلومات
- استخدم العقارات فقط
- اختر أفضل عقار واحد فقط إذا مناسب
- إذا لا يوجد مناسب قل: "لا يوجد حالياً خيارات مناسبة"
- هدفك الأساسي: إغلاق الصفقة أو حجز موعد
- كن مختصر جدًا ومقنع
- الأسلوب: موظف مبيعات محترف طبيعي
- يجب أن يناسب الرد القناة (${channel})

🎯 المطلوب:
رد مباشر مناسب لقناة ${channel}
    `;

    // =========================
    // 4. GEMINI CALL
    // =========================
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }
    );

    const aiResponse =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً 👋 كيف أساعدك؟";

    // =========================
    // 5. AUTOPILOT (ANALYSIS ENGINE)
    // =========================
    await runAutopilot({
      tenant_id,
      lead_id,
      channel,
      recommendations,
      aiResponse
    });

    // =========================
    // 6. CHANNEL ROUTING (MULTI-CHANNEL OUTPUT)
    // =========================

    // 🟢 WhatsApp
    if (channel === "whatsapp") {
      await sendWhatsAppAutopilot({
        tenant_id,
        lead_id,
        recommendations: formattedRecommendations,
        aiResponse
      });
    }

    // 🟡 Messenger / Instagram (جاهز للتوصيل لاحقاً)
    if (channel === "messenger" || channel === "instagram") {
      console.log("📩 Meta Response Ready:", {
        user_id,
        aiResponse
      });
    }

    // 🟣 Email (جاهز لاحقاً)
    if (channel === "email") {
      console.log("📧 Email Response Ready:", {
        email,
        aiResponse
      });
    }

    // =========================
    // 7. RETURN RESULT
    // =========================
    return {
      response: aiResponse,
      recommendations: formattedRecommendations
    };

  } catch (error) {
    console.error("🧠 AI Brain Error:", error.message);

    return {
      response: "حدث خطأ مؤقت، حاول مرة أخرى لاحقاً.",
      recommendations: []
    };
  }
}