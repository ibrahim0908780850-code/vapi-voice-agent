import express from "express";
import { getSupabase } from "../lib/supabase.js";
import { generateAIResponse } from "../ai/brain.js";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.message?.text || "";
    const phone = req.body?.from || "unknown";

    // 🔥 تحديد الشركة (Tenant)
    const tenant_id = req.body?.assistantId || "default_tenant";

    const supabase = getSupabase(tenant_id);

    // 🧾 حفظ رسالة العميل
    await supabase.from("messages").insert({
      tenant_id,
      phone,
      message,
      source: "whatsapp"
    });

    // 🧠 تشغيل الذكاء الاصطناعي
    const aiReply = await generateAIResponse(tenant_id, message);

    // 💬 حفظ رد AI
    await supabase.from("messages").insert({
      tenant_id,
      phone,
      ai_response: aiReply,
      source: "ai"
    });

    return res.json({
      success: true,
      reply: aiReply
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "whatsapp_webhook_error" });
  }
});

export default router;