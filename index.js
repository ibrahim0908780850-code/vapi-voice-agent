import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

console.log("🔥 SALIH AI STARTING...");
console.log("🚀 PRODUCTION MODE ACTIVE");

// =========================
// ENV
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// =========================
// SESSIONS (PRODUCTION SAFE)
// =========================
const sessions = new Map();

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
  const safeId = String(id || "default");

  if (!sessions.has(safeId)) {
    sessions.set(safeId, {
      step: 0,
      saved: false,
      lastActive: Date.now(),
      data: {},
    });
  }

  const session = sessions.get(safeId);
  session.lastActive = Date.now();

  return session;
}

// =========================
// VERIFY WEBHOOK
// =========================
function verify(req) {
  if (!WEBHOOK_SECRET) return true;
  return req.headers["x-webhook-secret"] === WEBHOOK_SECRET;
}

// =========================
// CLEAN TEXT
// =========================
function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

// =========================
// INTENT DETECTION
// =========================
function detectIntent(msg = "") {
  const m = String(msg).toLowerCase();

  return {
    isPrice: /سعر|كم|بكم/.test(m),
    isHot: /مهتم|أريد|ابغى|اشتري|احجز|زيارة|عايز|جاهز/.test(m),
  };
}

// =========================
// GEMINI
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

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "ممكن توضح أكثر؟";

    return cleanText(text);
  } catch (err) {
    console.error("❌ GEMINI ERROR:", err);
    return "حدث خطأ مؤقت";
  }
}

// =========================
// PROMPT
// =========================
function buildPrompt(message, stage, intent) {
  return `
أنت "صالح" وكيل عقاري في السودان.

هدفك: إغلاق صفقة أو حجز زيارة بسرعة.

القواعد:
- سطرين فقط
- سؤال واحد فقط
- لا تخرج عن الدور

المرحلة: ${stage}
النية: ${JSON.stringify(intent)}

رسالة العميل:
${message}
`;
}

// =========================
// 🔥 VAPI WEBHOOK (PRODUCTION SAFE)
// =========================
app.post("/vapi-webhook", async (req, res) => {
  try {
    if (!verify(req)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // =========================
    // SAFE CALL ID EXTRACTION
    // =========================
    const callId =
      req.body?.call?.id ||
      req.body?.call_id ||
      req.body?.id ||
      req.body?.conversationId ||
      "default";

    const session = getSession(callId);

    // =========================
    // TOOL CALL DETECTION (REAL VAPI SUPPORT)
    // =========================
    const toolData =
      req.body?.toolArguments ||
      req.body?.arguments ||
      req.body?.data ||
      req.body?.toolCalls?.[0]?.function?.arguments ||
      req.body?.functionCall?.arguments ||
      req.body?.tool_call?.arguments;

    if (toolData && typeof toolData === "object") {
      session.data = { ...session.data, ...toolData };

      if (supabase && !session.saved) {
        session.saved = true;

        const { error } = await supabase.from("leads").insert({
          ...session.data,
          stage: toolData.stage || "hot",
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("❌ SUPABASE ERROR:", error.message);
        } else {
          console.log("✅ LEAD SAVED SUCCESSFULLY");
        }
      }

      return res.json({ success: true });
    }

    // =========================
    // MESSAGE EXTRACTION
    // =========================
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
    // FLOW ENGINE
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
    // FINAL STEP
    // =========================
    if (session.step === 6) {
      session.data.budget = message;
      session.step = 7;

      const prompt = buildPrompt(message, "hot", intent);
      const aiText = await callGemini(prompt);

      if (supabase && !session.saved) {
        session.saved = true;

        const { error } = await supabase.from("leads").insert({
          ...session.data,
          stage: "hot",
          created_at: new Date().toISOString(),
        });

        if (error) {
          console.error("❌ SUPABASE ERROR:", error.message);
        }
      }

      sessions.delete(callId);

      return res.json({ reply: aiText });
    }

    return res.json({ reply: "كيف أقدر أساعدك؟" });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.json({ reply: "حدث خطأ مؤقت" });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING ON PORT", PORT);
});