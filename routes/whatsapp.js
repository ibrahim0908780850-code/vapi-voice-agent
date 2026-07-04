import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fetch from "node-fetch";

const router = express.Router();

// =========================
// SUPABASE
// =========================
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// =========================
// LEAD SCORING
// =========================
function isHotLead(message = "") {
  const t = message.toLowerCase();
  return (
    t.includes("شراء") ||
    t.includes("ابغى") ||
    t.includes("buy") ||
    t.includes("price") ||
    t.includes("سعر")
  );
}

function calculateScore(message = "") {
  let score = 10;

  if (isHotLead(message)) score += 50;
  if (message.length > 20) score += 10;
  if (message.includes("?")) score += 10;

  return Math.min(score, 100);
}

// =========================
// GEMINI AI
// =========================
async function generateAIReply({ message, tenantContext }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
أنت وكيل عقارات ذكي يعمل داخل شركة.

معلومات الشركة:
${tenantContext}

قواعد:
- رد مختصر جدًا
- اسأل سؤال واحد فقط
- هدفك إغلاق الصفقة
- لا تخترع معلومات

رسالة العميل:
${message}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "مرحباً 👋 كيف يمكنني مساعدتك؟"
  );
}

// =========================
// WHATSAPP WEBHOOK
// =========================
router.post("/", async (req, res) => {
  const supabase = getSupabase();

  try {
    const phone =
      req.body?.from || req.body?.message?.customer?.phone || "";

    const message = req.body?.message?.text || "";

    if (!phone) {
      return res.json({ success: false, error: "no_phone" });
    }

    // =========================
    // 1. GET OR CREATE LEAD
    // =========================
    const { data: lead } = await supabase
      .from("leads")
      .upsert(
        {
          phone,
          source: "whatsapp",
          lead_score: calculateScore(message)
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    // =========================
    // 2. SAVE MESSAGE
    // =========================
    await supabase.from("messages").insert({
      lead_id: lead?.id,
      phone,
      message,
      source: "whatsapp"
    });

    // =========================
    // 3. GET TENANT CONTEXT
    // =========================
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .eq("tenant_id", lead?.tenant_id)
      .single();

    const tenantContext = `
اسم الشركة: ${company?.company_name || "شركة عقارات"}
نوع النشاط: ${company?.industry_type || "عقارات"}
لغة الرد: ${company?.default_language || "ar"}
`;

    // =========================
    // 4. AI RESPONSE
    // =========================
    const aiReply = await generateAIReply({
      message,
      tenantContext
    });

    // =========================
    // 5. SAVE AI RESPONSE
    // =========================
    await supabase.from("messages").insert({
      lead_id: lead?.id,
      phone,
      message: null,
      ai_response: aiReply,
      source: "ai"
    });

    // =========================
    // 6. DEAL CREATION (🔥 مهم)
    // =========================
    const score = lead?.lead_score || 0;

    let dealCreated = false;

    if (score >= 75) {
      await supabase.from("deals").insert({
        tenant_id: lead?.tenant_id,
        lead_id: lead?.id,
        title: `صفقة WhatsApp - ${phone}`,
        stage: "new",
        status: "open",
        probability: score
      });

      dealCreated = true;
    }

    // =========================
    // 7. FOLLOW UP SYSTEM
    // =========================
    if (score >= 30 && score < 75) {
      await supabase.from("sync_queue").insert({
        tenant_id: lead?.tenant_id,
        payload: {
          type: "whatsapp_followup",
          lead_id: lead?.id,
          phone,
          message: "👋 هل لازلت مهتم بالعقارات؟ لدينا عروض جديدة اليوم"
        },
        status: "pending"
      });
    }

    // =========================
    // 8. LOG ACTIVITY
    // =========================
    await supabase.from("crm_activities").insert({
      lead_id: lead?.id,
      action: "whatsapp_message",
      note: message
    });

    // =========================
    // 9. RESPONSE
    // =========================
    return res.json({
      success: true,
      reply: aiReply,
      lead_id: lead?.id,
      dealCreated,
      score
    });

  } catch (err) {
    console.error("WHATSAPP ERROR:", err);

    return res.json({
      success: false,
      error: "server_error"
    });
  }
});

export default router;