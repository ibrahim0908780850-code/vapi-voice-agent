import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// =========================
// ENV
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// =========================
// MEMORY (SESSION CACHE)
// =========================
const sessions = new Map();
setInterval(() => sessions.clear(), 30 * 60 * 1000);

// =========================
// UTILS
// =========================
const clean = (t = "") =>
  t.toString().replace(/\s+/g, " ").trim();

function verify(req) {
  if (!WEBHOOK_SECRET) return true;
  return req.headers["x-webhook-secret"] === WEBHOOK_SECRET;
}

function extractPhone(text = "") {
  const m = text.match(/(\+?\d[\d\s]{7,15})/);
  return m ? m[0].replace(/\s/g, "") : null;
}

function detectIntent(msg = "") {
  msg = msg.toLowerCase();
  return {
    price: /سعر|كم|بكم/.test(msg),
    hot: /أبغى|اريد|عايز|مهتم|شراء|حجز|جاهز/.test(msg),
  };
}

// =========================
// SESSION
// =========================
function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      step: 0,
      saved: false,
      status: "new",
      data: {
        name: "",
        phone: "",
        type: "",
        goal: "",
        location: "",
        budget: "",
        time: "",
      },
    });
  }
  return sessions.get(id);
}

// =========================
// LOAD SESSION (SAFE)
// =========================
async function loadSession(callId) {
  if (!supabase) return getSession(callId);

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("call_id", callId)
    .maybeSingle();

  if (error || !data) return getSession(callId);

  return {
    step: data.step || 0,
    saved: false,
    status: data.status || "new",
    data: typeof data.data === "string"
      ? JSON.parse(data.data || "{}")
      : data.data || {},
  };
}

// =========================
// SAVE SESSION
// =========================
async function saveSession(callId, session) {
  if (!supabase) return;

  await supabase.from("sessions").upsert({
    call_id: callId,
    step: session.step,
    status: session.status,
    data: session.data,
    updated_at: new Date().toISOString(),
  });
}

// =========================
// LEAD CLASSIFICATION
// =========================
function classify(d) {
  let score = 0;

  if (d.name) score += 10;
  if (d.phone) score += 20;
  if (d.type) score += 15;
  if (d.location) score += 15;
  if (d.budget) score += 20;
  if (d.time) score += 20;

  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// =========================
// ENGINE (SALES FLOW)
// =========================
function engine(session, msg) {
  if (!msg) return "ممكن توضح أكثر؟";

  const phone = extractPhone(msg);
  const intent = detectIntent(msg);

  if (phone) session.data.phone = phone;

  if (intent.price) {
    return "الأسعار تختلف حسب التفاصيل، ممكن أعرف ميزانيتك تقريباً؟";
  }

  switch (session.step) {
    case 0:
      session.step = 1;
      return "مرحباً، معك صالح. ممكن اسمك الكامل؟";

    case 1:
      session.data.name = msg;
      session.step = 2;
      return "تمام، رقم الهاتف للتواصل؟";

    case 2:
      if (!session.data.phone && !phone)
        return "ممكن رقم الهاتف لو سمحت؟";
      session.step = 3;
      return "تبحث عن شقة ولا منزل؟";

    case 3:
      session.data.type = msg;
      session.step = 4;
      return "شراء ولا إيجار؟";

    case 4:
      session.data.goal = msg;
      session.step = 5;
      return "في أي منطقة؟";

    case 5:
      session.data.location = msg;
      session.step = 6;
      return "ما الميزانية؟";

    case 6:
      session.data.budget = msg;
      session.step = 7;
      return "متى الزيارة؟ اليوم أو غداً؟";

    case 7:
      session.data.time = msg;
      session.step = 8;

      session.status = classify(session.data);

      return "تمام 👍 تم تسجيل طلبك، سيتم التواصل معك قريباً.";

    default:
      return "تمام، كيف أقدر أساعدك أكثر؟";
  }
}

// =========================
// WEBHOOK
// =========================
app.post("/vapi-webhook", async (req, res) => {
  try {
    if (!verify(req)) {
      return res.status(401).json({ reply: "unauthorized" });
    }

    const msg = clean(
      req.body?.message ||
      req.body?.transcript ||
      req.body?.text ||
      ""
    );

    const callId = req.body?.call_id || "default";

    const session = await loadSession(callId);

    const reply = engine(session, msg);

    await saveSession(callId, session);

    // FINAL SAVE (NO DUPLICATES)
    if (session.step >= 8 && supabase && !session.saved) {
      session.saved = true;

      session.status = classify(session.data);

      await supabase.from("leads").insert({
        ...session.data,
        status: session.status,
        created_at: new Date().toISOString(),
      });

      sessions.delete(callId);
    }

    return res.json({ reply });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.json({ reply: "حدث خطأ مؤقت" });
  }
});

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("SALIH AI PRODUCTION V8 🚀");
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 RUNNING ON", PORT);
});