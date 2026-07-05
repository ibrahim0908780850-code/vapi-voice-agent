import axios from "axios";
import { getPropertyRecommendations } from "../../ai/recommendation.engine.js";
import { runAutopilot } from "./autopilot.engine.js";
import { sendWhatsAppAutopilot } from "../../ai/whatsapp.autopilot.js";

// 🧠 NEW: Unified sender layer
import {
  sendMetaMessage,
  sendEmailMessage
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
    // 3. BUILD PROMPT
    // =========================
    const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

📌 سياق الشركة والعميل:
${tenantContext}

📌 القناة الحالية:
${channel}

📌 رسالة العميل:
${message}

🏠 العقارات:
${JSON.stringify(formattedRecommendations, null, 2)}

⚠️ قواعد:
- لا تخترع أي معلومات
- استخدم العقارات فقط
- اختر أفضل عقار واحد فقط إذا مناسب
- إذا لا يوجد مناسب قل: "لا يوجد حالياً خيارات مناسبة"
- كن مختصر ومقنع
- الأسلوب: موظف مبيعات محترف

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
          { parts: [{ text: prompt }] }
        ]
      }
    );

    const aiResponse =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً 👋 كيف أساعدك؟";

    // =========================
    // 5. AUTOPILOT
    // =========================
    await runAutopilot({
      tenant_id,
      lead_id,
      channel,
      recommendations,
      aiResponse
    });

    // =========================
    // 6. CHANNEL ROUTING (REAL SENDING)
    // =========================

    // 🟢 WhatsApp (existing system)
    if (channel === "whatsapp") {
      await sendWhatsAppAutopilot({
        tenant_id,
        lead_id,
        recommendations: formattedRecommendations,
        aiResponse
      });
    }

    // 🟦 Messenger / Instagram (REAL SEND)
    if (channel === "messenger" || channel === "instagram") {
      if (user_id) {
        await sendMetaMessage({
          user_id,
          message: aiResponse
        });
      }
    }

    // 📧 Email (REAL SEND)
    if (channel === "email") {
      if (email) {
        await sendEmailMessage({
          email,
          message: aiResponse
        });
      }
    }

    // =========================
    // 7. RETURN
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