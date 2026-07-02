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
// GEMINI CALL
// =========================
async function generateAIReply({ message, tenantContext }) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `
أنت موظف مبيعات عقارات ذكي داخل شركة.

معلومات الشركة:
${tenantContext}

قواعد:
- رد بشكل قصير وواضح
- اسأل أسئلة لجمع بيانات العميل
- لا تخترع معلومات
- هدفك تحويل العميل إلى عميل جاهز للشراء

رسالة العميل:
${message}
  `;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
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

  const phone = req.body?.from || req.body?.message?.customer?.phone;
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
      { phone, source: "whatsapp" },
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
  // 4. AI RESPONSE (GEMINI)
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
  // 6. RETURN RESPONSE TO WHATSAPP PROVIDER
  // =========================
  return res.json({
    success: true,
    reply: aiReply
  });
});

export default router;