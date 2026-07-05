import { generateAIResponse } from "../ai/brain.js";

/**
 * 🚀 UNIFIED EVENT HANDLER
 * كل القنوات تدخل هنا
 */
export async function handleEvent(event) {
  try {
    const {
      tenant_id,
      channel,
      payload
    } = event;

    // =========================
    // 1. تجهيز الرسالة حسب القناة
    // =========================
    const message =
      payload.message ||
      payload.text ||
      payload.body ||
      payload.content;

    const lead_id = payload.lead_id || null;

    // =========================
    // 2. استدعاء الـ AI Brain
    // =========================
    const aiResult = await generateAIResponse({
      tenant_id,
      lead_id,
      message,
      channel,
      user_id: payload.user_id,
      email: payload.from,
      tenantContext: payload.tenantContext || ""
    });

    // =========================
    // 3. ROUTING RESPONSE حسب القناة
    // =========================

    // 🟢 WhatsApp
    if (channel === "whatsapp") {
      console.log("📲 WhatsApp Reply:", aiResult.response);
      // هنا لاحقاً sendWhatsApp()
    }

    // 🟦 Messenger
    if (channel === "messenger") {
      console.log("💬 Messenger Reply:", aiResult.response);
      // sendMetaMessage()
    }

    // 📸 Instagram
    if (channel === "instagram") {
      console.log("📸 Instagram Reply:", aiResult.response);
      // sendMetaMessage()
    }

    // 📧 Email
    if (channel === "email") {
      console.log("📧 Email Reply:", aiResult.response);
      // sendEmailReply()
    }

    // 🎧 VAPI
    if (channel === "vapi") {
      console.log("🎧 VAPI Reply:", aiResult.response);
    }

    return aiResult;

  } catch (err) {
    console.error("❌ Integration Handler Error:", err.message);
    return null;
  }
}