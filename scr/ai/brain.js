import axios from "axios";
import { getPropertyRecommendations } from "../../ai/recommendation.engine.js";
import { runAutopilot } from "./autopilot.engine.js";

import {
  sendMetaMessage,
  sendEmailMessage,
  sendWhatsAppMessage
} from "../../handlers/channel.sender.js";

// 🧠 NEW: AI MEMORY + INTELLIGENCE
import { getLeadMemory } from "../../ai/lead.memory.js";
import { analyzeLeadIntelligence } from "../../ai/lead.intelligence.js";

/**
 * 🧠 CENTRAL AI BRAIN (PRODUCTION READY)
 */
export async function generateAIResponse({
  tenant_id,
  lead_id,
  message,
  channel,
  user_id,
  email,
  phone,
  tenantContext
}) {
  try {

    // =========================
    // 1. MEMORY + INTELLIGENCE
    // =========================
    const memory = await getLeadMemory(tenant_id, phone);

    const intelligence = await analyzeLeadIntelligence({
      tenant_id,
      phone
    });

    // =========================
    // 2. PROPERTY RECOMMENDATIONS
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
    // 3. SMART PROMPT (NEW)
    // =========================
    const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

🏢 معلومات الشركة:
${tenantContext}

👤 معلومات العميل:
- الحالة: ${intelligence.stage}
- النقاط: ${intelligence.score}
- الملخص: ${intelligence.summary}

📊 ذاكرة العميل:
${memory?.messages?.map(m => m.message).join("\n") || "لا يوجد سجل"}

📩 رسالة العميل:
${message}

🏠 العقارات المتاحة:
${JSON.stringify(formattedRecommendations, null, 2)}

⚠️ قواعد مهمة:
- لا تخترع بيانات
- استخدم العقارات فقط
- اختر أفضل عقار واحد
- إذا لا يوجد مناسب قل: "لا يوجد حالياً خيارات مناسبة"
- كن مختصر ومقنع جداً
- هدفك: إغلاق الصفقة أو حجز موعد

🎯 رد مناسب لقناة: ${channel}
`;

    // =========================
    // 4. GEMINI CALL
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
    // 5. AUTOPILOT (SMART VERSION)
    // =========================
    await runAutopilot({
      tenant_id,
      lead_id,
      channel,
      recommendations,
      aiResponse,
      intelligence: {
        score: intelligence.score,
        stage: intelligence.stage
      }
    });

    // =========================
    // 6. CHANNEL ROUTING (FIXED)
    // =========================
    switch (channel) {

      case "whatsapp":
        await sendWhatsAppMessage({
          tenant_id,
          lead_id,
          message: aiResponse
        });
        break;

      case "messenger":
      case "instagram":
        if (user_id) {
          await sendMetaMessage({
            user_id,
            message: aiResponse
          });
        }
        break;

      case "email":
        if (email) {
          await sendEmailMessage({
            email,
            subject: "رد من وكيل صالح العقاري 🧠",
            message: aiResponse
          });
        }
        break;
    }

    // =========================
    // 7. RETURN
    // =========================
    return {
      response: aiResponse,
      recommendations: formattedRecommendations,
      intelligence
    };

  } catch (error) {
    console.error("🧠 AI Brain Error:", error.message);

    return {
      response: "حدث خطأ مؤقت، حاول مرة أخرى لاحقاً.",
      recommendations: [],
      intelligence: null
    };
  }
}