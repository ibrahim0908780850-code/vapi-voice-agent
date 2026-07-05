import axios from "axios";
import { getPropertyRecommendations } from "../../ai/recommendation.engine.js";
import { runAutopilot } from "./autopilot.engine.js";

// 🧠 Unified Channel Sender (IMPORTANT)
import {
  sendMetaMessage,
  sendEmailMessage,
  sendWhatsAppMessage
} from "../../handlers/channel.sender.js";

/**
 * 🧠 CENTRAL AI BRAIN (MULTI-CHANNEL PRODUCTION)
 */
export async function generateAIResponse({
  tenant_id,
  lead_id,
  message,
  channel,
  user_id,
  email,
  tenantContext
}) {
  try {

    // =========================
    // 1. RECOMMENDATIONS
    // =========================
    const recommendations = await getPropertyRecommendations(
      tenant_id,
      lead_id
    );

    const formattedRecommendations = recommendations.map((r) => ({
      title: r.property.title,
      price: r.property.price,
      city: r.property.city,
      type: r.property.type,
      bedrooms: r.property.bedrooms,
      score: r.score
    }));

    // =========================
    // 2. PROMPT
    // =========================
    const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

📌 سياق الشركة:
${tenantContext}

📌 القناة:
${channel}

📌 رسالة العميل:
${message}

🏠 العقارات:
${JSON.stringify(formattedRecommendations, null, 2)}

⚠️ قواعد:
- لا تخترع بيانات
- استخدم العقارات فقط
- اختر أفضل عقار واحد فقط
- إذا لا يوجد قل: "لا يوجد حالياً خيارات مناسبة"
- كن مختصر ومقنع

🎯 الرد حسب القناة: ${channel}
`;

    // =========================
    // 3. GEMINI
    // =========================
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      }
    );

    const aiResponse =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً 👋 كيف أساعدك؟";

    // =========================
    // 4. AUTOPILOT
    // =========================
    await runAutopilot({
      tenant_id,
      lead_id,
      channel,
      recommendations,
      aiResponse
    });

    // =========================
    // 5. CHANNEL ROUTING (UNIFIED)
    // =========================

    switch (channel) {

      // 🟢 WhatsApp
      case "whatsapp":
        await sendWhatsAppMessage({
          tenant_id,
          lead_id,
          message: aiResponse
        });
        break;

      // 🟦 Messenger / Instagram
      case "messenger":
      case "instagram":
        if (user_id) {
          await sendMetaMessage({
            user_id,
            message: aiResponse
          });
        }
        break;

      // 📧 Email
      case "email":
        if (email) {
          await sendEmailMessage({
            email,
            subject: "رد من وكيل صالح العقاري",
            message: aiResponse
          });
        }
        break;
    }

    // =========================
    // 6. RETURN
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