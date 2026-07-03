import { getPropertyRecommendations } from "./recommendation.engine.js";
import { runAutopilot } from "./autopilot.engine.js";

/**
 * 📞 Vapi Voice Intelligence
 * يتم استدعاؤه أثناء المكالمة في كل رسالة من العميل
 */

export async function handleVapiMessage({
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

    const top = recommendations.slice(0, 2);

    // 2. تحليل سريع لحالة العميل
    const intent = detectIntent(message);

    // 3. بناء رد صوتي ذكي (قصير جدًا)
    const voiceResponse = buildVoiceResponse({
      message,
      tenantContext,
      top,
      intent
    });

    // 4. تشغيل Autopilot داخل المكالمة
    await runAutopilot({
      tenant_id,
      lead_id,
      recommendations,
      aiResponse: voiceResponse
    });

    return {
      response: voiceResponse,
      recommendations: top
    };
  } catch (error) {
    console.error("Vapi Voice Error:", error.message);

    return {
      response: "أعتذر، حدث خطأ تقني بسيط.",
      recommendations: []
    };
  }
}

/**
 * 🧠 فهم نية العميل بسرعة
 */
function detectIntent(message) {
  const msg = message.toLowerCase();

  if (msg.includes("سعر") || msg.includes("price")) return "price";
  if (msg.includes("شقة") || msg.includes("apartment")) return "property";
  if (msg.includes("موعد") || msg.includes("visit")) return "appointment";
  if (msg.includes("أرخص") || msg.includes("cheap")) return "budget";

  return "general";
}

/**
 * 💬 توليد رد صوتي قصير جدًا
 */
function buildVoiceResponse({ message, tenantContext, top, intent }) {
  const propertyText =
    top.length > 0
      ? `عندي لك خيار ممتاز في ${top[0].property.city} بسعر ${top[0].property.price}`
      : "أبحث لك عن أفضل الخيارات حالياً";

  switch (intent) {
    case "price":
      return `السعر يعتمد على الموقع والمواصفات، ${propertyText}`;

    case "property":
      return `نعم، ${propertyText}، هل تفضل حجز موعد لمشاهدته؟`;

    case "budget":
      return `تمام، حسب ميزانيتك، ${propertyText}`;

    case "appointment":
      return `ممتاز، أستطيع حجز موعد لك خلال أقرب وقت.`;

    default:
      return `فهمت طلبك، ${propertyText}`;
  }
}