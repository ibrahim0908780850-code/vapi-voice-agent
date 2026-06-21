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
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

// =========================
// 📦 SUPABASE
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// =========================
// 🧠 MEMORY
// =========================
const sessions = new Map();
setInterval(() => sessions.clear(), 1000 * 60 * 30);

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      step: 0,
      saved: false,
      data: {},
    });
  }
  return sessions.get(id);
}

// =========================
// 🔐 VERIFY
// =========================
function verify(req) {
  if (!WEBHOOK_SECRET) return true;
  return req.headers["x-webhook-secret"] === WEBHOOK_SECRET;
}

// =========================
// 🧼 CLEAN
// =========================
function cleanText(text = "") {
  return String(text || "").replace(/\s+/g, " ").trim();
}

// =========================
// 🧠 INTENT
// =========================
function detectIntent(msg = "") {
  const m = String(msg || "").toLowerCase();

  return {
    isPrice: /سعر|كم|بكم/.test(m),
    isHot: /مهتم|أريد|ابغى|اشتري|احجز|زيارة|عايز|جاهز/.test(m),
  };
}

// =========================
// 🤖 GEMINI
// =========================
async function callGemini(prompt) {
  try {
    if (!GEMINI_KEY) return "ممكن توضح أكثر؟";

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await res.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return text ? cleanText(text) : "ممكن توضح أكثر؟";
  } catch (err) {
    console.error("Gemini Error:", err);
    return "حدث خطأ مؤقت";
  }
}

// =========================
// 🧠 PROMPT
// =========================
function buildPrompt(message, stage, intent) {
  return `
أنت "صالح" وكيل عقاري في السودان.

هدفك: إغلاق صفقة أو حجز زيارة.

القواعد:
- سطرين فقط
- سؤال واحد فقط
- طبيعي جداً

المرحلة: ${stage}
النية: ${JSON.stringify(intent)}

رسالة العميل:
${message}
`;
}

// =========================
// 📞 WEBHOOK
// =========================
app.post("/vapi-webhook", async (req, res) => {
  try {
    if (!verify(req)) {
      return res.status(401).json({ reply: "unauthorized" });
    }

    const callId = req.body?.call_id || "default";
    const session = getSession(callId);

    const message = cleanText(
      req.body?.message ||
      req.body?.transcript ||
      req.body?.input ||
      req.body?.speech ||
      req.body?.text ||
      ""
    );

    if (!message) {
      return res.json({ reply: "ممكن توضح أكثر؟" });
    }

    const intent = detectIntent(message);

    let stage = "new";

    // =========================
    // FLOW (SAFE STATE MACHINE)
    // =========================
    if (session.step === 0) {
      session.step = 1;
      return res.json({ reply: "مرحباً 👋 معك صالح، ممكن اسمك؟" });
    }

    if (session.step === 1) {
      session.data.name = message;
      session.step = 2;
      return res.json({ reply: "تمام، رقم الهاتف؟" });
    }

    if (session.step === 2) {
      session.data.phone = message;
      session.step = 3;
      return res.json({ reply: "شقة ولا منزل؟" });
    }

    if (session.step === 3) {
      session.data.type = message;
      session.step = 4;
      return res.json({ reply: "شراء ولا إيجار؟" });
    }

    if (session.step === 4) {
      session.data.goal = message;
      session.step = 5;
      return res.json({ reply: "ما المنطقة؟" });
    }

    if (session.step === 5) {
      session.data.location = message;
      session.step = 6;
      return res.json({ reply: "ما ميزانيتك؟" });
    }

    if (session.step === 6) {
      session.data.budget = message;
      session.step = 7;

      stage = "hot";

      const prompt = buildPrompt(message, stage, intent);
      const aiText = await callGemini(prompt);

      // =========================
      // 💾 SAVE LEAD (SAFE ONCE)
      // =========================
      if (supabase && !session.saved) {
        session.saved = true;

        try {
          await supabase.from("leads").insert({
            ...session.data,
            stage,
            created_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error("DB ERROR:", dbErr.message);
        }

        sessions.delete(callId);
      }

      return res.json({ reply: aiText });
    }

    return res.json({ reply: "كيف أقدر أساعدك؟" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.json({ reply: "حدث خطأ مؤقت" });
  }
});

// =========================
// 🚀 START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING ON PORT", PORT);
});