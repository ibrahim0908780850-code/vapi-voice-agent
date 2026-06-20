import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// =========================
// 🔥 BOOT
// =========================
console.log("🔥 SALIH AI STARTING...");
console.log("🚀 SYSTEM ONLINE");

// =========================
// 🔐 ENV
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// =========================
// 🧠 CLEAN TEXT
// =========================
function cleanText(text) {
  return (text || "")
    .toString()
    .replace(/\s+/g, " ")
    .trim();
}

// =========================
// 🧠 SALES BRAIN (CLOSER MODE)
// =========================
function buildPrompt(message, stage, intent) {
  return `
أنت "صالح" أفضل وكيل عقاري في السودان.

هدفك: إغلاق صفقة أو حجز موعد زيارة.

القواعد:
- رد قصير جداً (سطرين فقط)
- سؤال واحد فقط
- إذا العميل جاهز → اقترح موعد اليوم أو غداً
- لا تعطي معلومات كثيرة

المرحلة: ${stage}
النية: ${intent}

رسالة العميل:
${message}
`;
}

// =========================
// 🤖 GEMINI
// =========================
async function callGemini(prompt) {
  try {
    const response = await globalThis.fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return text ? cleanText(text) : "ممكن توضح طلبك أكثر؟";

  } catch (err) {
    console.error("Gemini Error:", err);
    return "حدث خطأ مؤقت، حاول مرة أخرى";
  }
}

// =========================
// 🏠 HEALTH
// =========================
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Salih AI is running 🚀" });
});

app.get("/test", (req, res) => {
  res.send("TEST OK 🚀");
});

// =========================
// 📞 VAPI WEBHOOK (FINAL SALES ENGINE)
// =========================
app.post("/vapi-webhook", async (req, res) => {
  res.setTimeout(8000);

  try {
    console.log("📞 VAPI:", JSON.stringify(req.body));

    const message = cleanText(
      req.body?.message ||
      req.body?.transcript ||
      req.body?.input ||
      req.body?.speech ||
      req.body?.text ||
      ""
    );

    const phone = req.body?.phone || "unknown";

    if (!message) {
      return res.json({ reply: "ممكن توضح أكثر؟" });
    }

    const msg = message.toLowerCase();

    // =========================
    // 🧠 INTENT ENGINE
    // =========================
    const isPrice = /سعر|كم|بكم/.test(msg);
    const isHot = /مهتم|أريد|ابغى|اشتري|احجز|زيارة|عايز/.test(msg);

    let stage = "new";
    let intent = "info";

    if (isPrice) {
      stage = "interested";
      intent = "pricing";
    }

    if (isHot) {
      stage = "hot";
      intent = "buy";
    }

    // =========================
    // 🤖 AI RESPONSE
    // =========================
    const prompt = buildPrompt(message, stage, intent);
    const aiText = await callGemini(prompt);

    // =========================
    // 💾 SAVE LEAD
    // =========================
    if (supabase) {
      const { error } = await supabase.from("leads").insert({
        phone,
        message,
        ai_response: aiText,
        stage,
        intent,
        status: stage === "hot" ? "closing" : "open",
        created_at: new Date().toISOString()
      });

      if (error) {
        console.log("❌ Supabase Error:", error.message);
      }
    }

    return res.json({
      reply: aiText,
      stage,
      intent
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);

    return res.json({
      reply: "حدث خطأ، حاول مرة أخرى"
    });
  }
});

// =========================
// 📊 CRM
// =========================
app.get("/leads", async (req, res) => {
  if (!supabase) {
    return res.json({ error: "Supabase not configured" });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.json({ error: error.message });

  res.json(data);
});

// =========================
// 🚀 START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});