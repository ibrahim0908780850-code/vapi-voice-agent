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
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

// =========================
// REDIS
// =========================
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
  lazyConnect: true,
});

let redisAlive = false;
redis.on("connect", () => (redisAlive = true));
redis.on("error", () => (redisAlive = false));

// =========================
// CONFIG
// =========================
const SESSION_TTL = 60 * 30;
const LOCK_TTL = 5;

// =========================
// MEMORY FALLBACK
// =========================
const memory = new Map();

// =========================
// UTIL
// =========================
const cleanText = (t = "") =>
  String(t)
    .replace(/\s+/g, " ")
    .replace(/[●•\-\._]/g, "")
    .trim();

const requestId = (req) =>
  req.headers["x-request-id"] || crypto.randomUUID();

// =========================
// SAFE JSON PARSE (🔥 FINAL FIX)
// =========================
function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// =========================
// SESSION ENGINE
// =========================
async function getSession(id) {
  try {
    if (redisAlive) {
      const v = await redis.get(`s:${id}`);
      if (v) {
        const parsed = safeJSONParse(v);
        if (parsed) return parsed;
      }
    }
  } catch {}

  return memory.get(id) || null;
}

async function saveSession(id, session) {
  try {
    session.updatedAt = Date.now();

    memory.set(id, session);

    if (redisAlive) {
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
// TOOL PARSER (ROBUST FINAL)
// =========================
function parseTool(req) {
  try {
    const msgType = req.body?.message?.type;

    let tool = null;

    if (typeof msgType === "string" && msgType.includes("tool")) {
      const call = req.body?.message?.toolCalls?.[0];
      tool = call?.arguments || call?.function?.arguments || null;
    }

    tool =
      tool ||
      req.body?.toolArguments ||
      req.body?.arguments ||
      req.body?.data ||
      req.body?.tool_calls?.[0]?.arguments ||
      null;

    if (typeof tool === "string") tool = safeJSONParse(tool);
    if (Array.isArray(tool)) tool = tool[0];

    return tool && typeof tool === "object" ? tool : null;
  } catch {
    return null;
  }
}

// =========================
// WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  const rid = requestId(req);

  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "invalid_body", rid });
    }

    // =========================
    // SESSION ID
    // =========================
    const sessionId =
      req.body?.call?.phoneNumber ||
      req.body?.callId ||
      req.body?.conversationId ||
      req.headers["x-vapi-call-id"] ||
      `anon_${rid}`;

    // =========================
    // LOCK (FAIL SAFE)
    // =========================
    let locked = false;

    if (redisAlive) {
      locked = await redis.set(
        `lock:${sessionId}`,
        "1",
        "NX",
        "EX",
        LOCK_TTL
      );
    }

    if (!locked && redisAlive) {
      return res.json({ ok: true, rid });
    }

    // =========================
    // LOAD SESSION (SAFE)
    // =========================
    let session = await getSession(sessionId);

    if (!session || typeof session !== "object") {
      session = {
        step: 1,
        data: {},
        saved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSavedAt: 0,
      };
    }

    session.data ||= {};

    // =========================
    // TOOL FLOW
    // =========================
    const tool = parseTool(req);

    if (tool) {
      session.data = { ...session.data, ...tool };
      session.updatedAt = Date.now();

      const payload = {
        full_name:
          (session.data.fullName || "").toString().slice(0, 120) || null,
        phone_number:
          (session.data.phoneNumber || "").toString().slice(0, 30) || null,
        property_type:
          (session.data.propertyType || "").toString().slice(0, 60) || null,
        lead_status: tool.leadStatus || "hot",
        created_at: new Date().toISOString(),
      };

      const valid = payload.full_name || payload.phone_number;

      const duplicate =
        Date.now() - (session.lastSavedAt || 0) < 15000;

      if (supabase && valid && !session.saved && !duplicate) {
        session.saved = true;
        session.lastSavedAt = Date.now();

        try {
          await supabase.from("leads").upsert(payload, {
            onConflict: "phone_number",
          });
        } catch {}
      }

      await saveSession(sessionId, session);
      return res.json({ ok: true, rid });
    }

    // =========================
    // NORMAL FLOW
    // =========================
    const msg = cleanText(req.body?.message?.text || req.body?.message);

    if (!msg) {
      return res.json({
        reply: "كيف يمكنني مساعدتك في العقار؟",
        rid,
      });
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

    const reply =
      session.step === 2
        ? "تمام 👍 هل تبحث عن شراء أم إيجار؟"
        : session.step === 3
        ? "تمام 👍 سيتم التواصل معك قريباً"
        : "كيف يمكنني مساعدتك في العقار؟";

    return res.json({ reply, rid });
  } catch (e) {
    return res.status(500).json({
      error: "internal_error",
      rid,
    });
  }
});

// =========================
// START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 SALIH AI v10.1 (ULTIMATE) running on ${PORT}`);
});