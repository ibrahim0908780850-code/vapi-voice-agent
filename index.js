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
// 🧠 MEMORY SAFE SESSIONS
// =========================
const sessions = new Map();

// تنظيف تلقائي للذاكرة (كل ساعة بدون نشاط)
setInterval(() => {
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (!session?.lastActive) continue;

    if (now - session.lastActive > 1000 * 60 * 60) {
      sessions.delete(id);
    }
  }
}, 1000 * 60 * 10);

function getSession(id) {
  const safeId = id || "default";

  if (!sessions.has(safeId)) {
    sessions.set(safeId, {
      step: 0,
      saved: false,
      data: {},
      lastActive: Date.now(),
    });
  }

  const session = sessions.get(safeId);
  session.lastActive = Date.now();

  return session;
}

// =========================
// 🔐 WEBHOOK SECURITY
// =========================
function verify(req) {
  if (!WEBHOOK_SECRET) return true;
  return req.headers["x-webhook-secret"] === WEBHOOK_SECRET;
}

// =========================
// 🧼 CLEAN TEXT
// =========================
function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

// =========================
// 🧠 INTENT DETECTION
// =========================
function detectIntent(msg = "") {
  const m = String(msg).toLowerCase();

  return {
    isPrice: /سعر|كم|بكم/.test(m),
    isHot: /مهتم|أريد|ابغى|اشتري|احجز|زيارة|عايز|جاهز/.test(m),
  };
}

// =========================
// 🤖 GEMINI CALL
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

    return cleanText(text || "ممكن توضح أكثر؟");
  } catch (err) {
    console.error("Gemini Error:", err);
    return "حدث خطأ مؤقت، حاول مرة أخرى";
  }
}

// =========================
// 🧠 PROMPT ENGINE
// =========================
function buildPrompt(message, stage, intent) {
  return `
أنت "صالح" وكيل عقاري في السودان.

هدفك: إغلاق صفقة أو حجز زيارة بسرعة.

القواعد:
- سطرين فقط
- سؤال واحد فقط
- أسلوب بشري طبيعي جداً

المرحلة: ${stage}
النية: ${JSON.stringify(intent)}

رسالة العميل:
${message}
`;
}

// =========================
// 📞 WEBHOOK (VAPI)
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

    // =========================
    // FLOW ENGINE (SALES FUNNEL)
    // =========================
    if (session.step === 0) {
      session.step = 1;
      return res.json({ reply: "مرحباً 👋 معك صالح، ممكن اسمك؟" });
    }

    if (session.step === 1) {
      session.data.name = message;
      session.step = 2;
      return res.json({ reply: "رقم الهاتف للتواصل؟" });
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
      return res.json({ reply: "ما المنطقة التي تريدها؟" });
    }

    if (session.step === 5) {
      session.data.location = message;
      session.step = 6;
      return res.json({ reply: "ما ميزانيتك تقريباً؟" });
    }

    // =========================
    // FINAL STEP → AI + SAVE
    // =========================
    if (session.step === 6) {
      session.data.budget = message;
      session.step = 7;

      const prompt = buildPrompt(message, "hot", intent);
      const aiText = await callGemini(prompt);

      // 💾 SAVE LEAD ONCE
      if (supabase && !session.saved) {
        session.saved = true;

        try {
          await supabase.from("leads").insert({
            ...session.data,
            stage: "hot",
            created_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error("DB ERROR:", dbErr.message);
        }
      }

      sessions.delete(callId);

      return res.json({ reply: aiText });
    }

    return res.json({ reply: "كيف أقدر أساعدك؟" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.json({ reply: "حدث خطأ مؤقت" });
  }
});

// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING ON PORT", PORT);
});