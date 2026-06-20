import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// =========================
// 🔥 START LOGS
// =========================
console.log("🔥 SALIH AI STARTING...");
console.log("🚀 SYSTEM ONLINE");

// =========================
// 🔐 ENV VARIABLES
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// =========================
// 🗄️ SUPABASE CLIENT
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// =========================
// 🧠 SALES AI BRAIN
// =========================
function buildPrompt(message, stage) {
  return `
أنت وكيل عقاري اسمه "صالح".

هدفك: إغلاق صفقات عقارية وتحويل العميل لموعد زيارة.

مرحلة العميل: ${stage}

رسالة العميل:
${message}

قواعد:
- رد قصير جدًا
- سؤال واحد فقط
- هدفك دائمًا الإغلاق أو حجز موعد
`;
}

// =========================
// 🤖 GEMINI FUNCTION
// =========================
async function callGemini(prompt) {
  try {
    const response = await fetch(
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

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً كيف أساعدك؟"
    );
  } catch (err) {
    console.error("Gemini Error:", err);
    return "حدث خطأ في الذكاء الاصطناعي";
  }
}

// =========================
// 🏠 HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Salih AI Agent is running 🚀"
  });
});

app.get("/test", (req, res) => {
  res.send("TEST OK 🚀");
});

// =========================
// 📞 VAPI WEBHOOK (FULL SALES ENGINE)
// =========================
app.post("/vapi-webhook", async (req, res) => {
  try {
    console.log("📞 LEAD:", req.body);

    const message =
      req.body?.message ||
      req.body?.transcript ||
      req.body?.input ||
      "";

    const phone = req.body?.phone || "unknown";

    if (!message) {
      return res.json({ reply: "ممكن توضح أكثر؟" });
    }

    // =========================
    // 🧠 INTENT DETECTION
    // =========================
    let stage = "new";
    let intent = "info";

    if (
      message.includes("سعر") ||
      message.includes("كم") ||
      message.includes("بكم")
    ) {
      stage = "interested";
      intent = "pricing";
    }

    if (
      message.includes("مهتم") ||
      message.includes("أريد") ||
      message.includes("أبغى") ||
      message.includes("زيارة")
    ) {
      stage = "hot";
      intent = "buy";
    }

    // =========================
    // 🧠 SALES PROMPT
    // =========================
    const prompt = buildPrompt(message, stage);

    // =========================
    // 🤖 AI RESPONSE
    // =========================
    const aiText = await callGemini(prompt);

    // =========================
    // 💾 SAVE LEAD (CRM)
    // =========================
    if (supabase) {
      await supabase.from("leads").insert({
        phone,
        message,
        ai_response: aiText,
        stage,
        intent,
        status: stage === "hot" ? "closing" : "open"
      });
    }

    return res.json({
      reply: aiText,
      stage,
      intent
    });
  } catch (err) {
    console.error("ERROR:", err);
    return res.json({
      reply: "حدث خطأ، حاول مرة أخرى"
    });
  }
});

// =========================
// 📊 LEADS DASHBOARD API
// =========================
app.get("/leads", async (req, res) => {
  if (!supabase) {
    return res.json({ error: "Supabase not configured" });
  }

  const data = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  res.json(data);
});

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});