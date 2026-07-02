import express from "express";
import { getSupabase } from "../config/supabase.js";
import crypto from "crypto";
import { generateAIResponse } from "../ai/brain.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

  // 📌 تحديد الشركة (Tenant)
  const tenant_id =
    req.body?.message?.assistantId || "default_tenant";

  const supabase = getSupabase(tenant_id);

  // 📌 بيانات العميل من المكالمة
  const phone = req.body?.message?.customer?.phone || "unknown";
  const userMessage = req.body?.message?.text || "";

  try {
    // =========================
    // 🧠 1. تشغيل AI Brain
    // =========================
    const aiResult = await generateAIResponse(
      tenant_id,
      userMessage
    );

    const aiText =
      aiResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I didn't understand that";

    // =========================
    // 📊 2. حفظ / تحديث Lead
    // =========================
    const { data, error } = await supabase
      .from("leads")
      .upsert(
        {
          tenant_id,
          phone,
          stage: "active",
          status: "active",
          last_message: userMessage,
          ai_reply: aiText
        },
        { onConflict: "phone,tenant_id" }
      )
      .select();

    if (error) {
      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              error: "db_error"
            })
          }
        ]
      });
    }

    const lead = data?.[0];

    // =========================
    // 🧾 3. تسجيل نشاط CRM
    // =========================
    await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id: lead?.id,
      action: "ai_response",
      note: userMessage
    });

    // =========================
    // 📤 4. الرد إلى Vapi
    // =========================
    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            tenant_id,
            lead_id: lead?.id,
            reply: aiText
          })
        }
      ]
    });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err.message);

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            error: "internal_error"
          })
        }
      ]
    });
  }
});

export default router;