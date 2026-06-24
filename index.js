import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import Redis from "ioredis";

const app = express();
app.use(express.json({ limit: "1mb" }));

// =========================
// ENV
// =========================
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REDIS_URL,
} = process.env;

// =========================
// SUPABASE
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// REDIS SAFE
// =========================
let redis = null;
let redisAlive = false;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  redis.on("error", () => (redisAlive = false));
  redis.on("connect", () => (redisAlive = true));
}

// =========================
// MEMORY FALLBACK
// =========================
const memory = new Map();

// =========================
// CONFIG
// =========================
const SESSION_TTL = 60 * 30;

// =========================
// UTILS
// =========================
const clean = (v = "") =>
  String(v)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

const normalizePhone = (p = "") =>
  String(p).replace(/\s+/g, "").trim().slice(0, 30);

const requestId = (req) =>
  req.headers["x-request-id"] || crypto.randomUUID();

// =========================
// SAFE JSON PARSE
// =========================
function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// =========================
// TOOL PARSER (VAPI SAFE)
// =========================
function parseTool(req) {
  try {
    const t =
      req.body?.message?.toolCalls?.[0]?.function?.arguments ||
      req.body?.message?.toolCalls?.[0]?.arguments ||
      req.body?.toolArguments ||
      req.body?.arguments;

    if (!t) return null;

    if (typeof t === "string") return safeJSONParse(t);
    if (typeof t === "object") return t;

    return null;
  } catch {
    return null;
  }
}

// =========================
// SESSION
// =========================
async function getSession(id) {
  try {
    if (redis && redisAlive) {
      const v = await redis.get(`s:${id}`);
      if (v) return safeJSONParse(v);
    }
  } catch {}

  return memory.get(id) || null;
}

async function saveSession(id, session) {
  try {
    session.updatedAt = Date.now();
    memory.set(id, session);

    if (redis && redisAlive) {
      await redis.set(
        `s:${id}`,
        JSON.stringify(session),
        "EX",
        SESSION_TTL
      );
    }
  } catch {}
}

// =========================
// STAGE NORMALIZER
// =========================
function normalizeStage(s = "") {
  const v = String(s).toLowerCase();

  if (v.includes("hot") || v.includes("urgent")) return "hot";
  if (v.includes("warm") || v.includes("interested")) return "warm";
  if (v.includes("appointment") || v.includes("visit")) return "appointment";
  if (v.includes("lost")) return "lost";

  return "new";
}

// =========================
// WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  const rid = requestId(req);

  try {
    const sessionId =
      req.body?.call?.phoneNumber ||
      req.body?.callId ||
      req.body?.conversationId ||
      `anon_${rid}`;

    let session = await getSession(sessionId);

    if (!session) {
      session = {
        data: {},
        step: 1,
        saved: false,
        lastSavedAt: 0,
      };
    }

    const tool = parseTool(req);

    // =========================
    // TOOL FLOW
    // =========================
    if (tool) {
      session.data = { ...session.data, ...tool };

      const payload = {
        full_name: clean(session.data.fullName) || null,

        phone: normalizePhone(
          session.data.phone ||
          session.data.phoneNumber ||
          tool.phone ||
          ""
        ) || null,

        city: clean(session.data.city) || null,
        district: clean(session.data.district) || null,
        budget: clean(session.data.budget) || null,
        property_type: clean(session.data.propertyType) || null,

        intent: clean(tool.intent || session.data.intent) || null,

        stage: normalizeStage(
          tool.stage || tool.leadStatus || session.data.stage || "new"
        ),

        source: "vapi",
      };

      // SCORE
      let score = 5;
      if (payload.phone) score += 25;
      if (payload.full_name) score += 15;
      if (payload.intent) score += 20;

      payload.lead_score = Math.min(score, 100);

      const valid = payload.phone || payload.full_name;
      const duplicate = Date.now() - session.lastSavedAt < 15000;

      if (supabase && valid && !duplicate) {
        session.lastSavedAt = Date.now();

        try {
          const { data, error } = await supabase
            .from("leads")
            .upsert(payload, { onConflict: "phone" })
            .select("id")
            .single();

          if (error) throw error;

          const leadId = data?.id;

          if (leadId) {
            await supabase.from("calls").insert({
              lead_id: leadId,
              phone: payload.phone,
              transcript: session.data.transcript || null,
              ai_response: session.data.ai_response || null,
              duration: session.data.duration || null,
              call_status: "completed",
              source: "vapi",
            });
          }

          session.saved = true;
        } catch (e) {
          console.log("SUPABASE ERROR:", e.message);
        }
      }

      await saveSession(sessionId, session);
      return res.json({ ok: true, rid });
    }

    // =========================
    // NORMAL FLOW
    // =========================
    const msg = clean(req.body?.message?.text);

    if (!msg) {
      return res.json({ reply: "كيف يمكنني مساعدتك؟", rid });
    }

    if (session.step === 1) {
      session.data.fullName = msg;
      session.step = 2;
    } else if (session.step === 2) {
      session.data.propertyType = msg;
      session.step = 3;
    } else {
      session.step = 1;
      session.data = {};
    }

    await saveSession(sessionId, session);

    return res.json({
      reply:
        session.step === 2
          ? "هل تبحث عن شراء أم إيجار؟"
          : session.step === 3
          ? "تم تسجيل طلبك 👍"
          : "كيف أساعدك؟",
      rid,
    });

  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      rid,
    });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 AI Voice Agent running on", PORT);
});