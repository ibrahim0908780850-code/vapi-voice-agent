import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import Redis from "ioredis";

const app = express();
app.use(express.json({ limit: "2mb" }));

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REDIS_URL,
  PORT = 3000,
} = process.env;

// =========================
// SUPABASE
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// REDIS
// =========================
const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      reconnectOnError: () => true,
    })
  : null;

// =========================
// MEMORY QUEUE
// =========================
const memoryQueue = [];
const seen = new Map();

// =========================
// QUEUE
// =========================
function pushJob(job) {
  try {
    const payload = JSON.stringify(job);

    if (redis && redis.status === "ready") {
      redis.lpush("vapi_jobs", payload);
    } else {
      memoryQueue.push(job);
    }
  } catch (e) {
    console.log("queue error:", e.message);
  }
}

// =========================
// TOOL PARSER (VAPI SAFE)
// =========================
function parseTool(req) {
  try {
    const raw =
      req.body?.message?.toolCalls?.[0]?.function?.arguments ||
      req.body?.message?.toolCalls?.[0]?.arguments ||
      req.body?.toolArguments ||
      req.body?.arguments;

    if (!raw) return null;

    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (!parsed || typeof parsed !== "object") return null;

    return parsed;
  } catch {
    return null;
  }
}

// =========================
// NORMALIZER
// =========================
function normalizeTool(t = {}) {
  return {
    full_name: t.fullName || t.full_name || t.name || "",
    phone: t.phone || t.phoneNumber || "",
    city: t.city || "",
    district: t.district || "",
    budget: t.budget || "",
    property_type: t.propertyType || "",
    intent: t.intent || "",
    stage: t.stage || "new",
  };
}

// =========================
// SCORE ENGINE
// =========================
function scoreLead(d) {
  let score = 10;

  if (d.phone && d.phone.length > 5) score += 35;
  if (d.full_name) score += 20;
  if (d.city) score += 10;
  if (d.intent) score += 15;
  if (d.budget) score += 10;

  if (d.stage === "warm") score += 10;
  if (d.stage === "hot") score += 20;

  return Math.min(score, 100);
}

// =========================
// DECISION ENGINE
// =========================
function decideLead(score) {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

// =========================
// PROCESS JOB (WORKER)
// =========================
async function processJob(job) {
  if (!supabase || !job?.tool) return;

  const tool = normalizeTool(job.tool);

  // safe dedup
  if (!tool.phone || tool.phone.length < 5) return;

  if (seen.has(tool.phone)) return;
  seen.set(tool.phone, Date.now());
  setTimeout(() => seen.delete(tool.phone), 15000);

  const score = scoreLead(tool);
  const stage = decideLead(score);

  tool.lead_score = score;
  tool.stage = stage;

  try {
    const { data, error } = await supabase
      .from("leads")
      .upsert(tool, { onConflict: "phone" })
      .select("id")
      .single();

    if (error) throw error;

    if (data?.id) {
      await supabase.from("calls").insert({
        lead_id: data.id,
        phone: tool.phone,
        transcript: job.body?.message?.text || null,
        call_status: "completed",
        source: "vapi",
      });
    }
  } catch (err) {
    console.log("❌ Worker Error:", err.message);
  }
}

// =========================
// WORKER LOOP
// =========================
async function startWorker() {
  console.log("⚙️ Worker started...");

  while (true) {
    try {
      let job;

      if (redis && redis.status === "ready") {
        const res = await redis.brpop("vapi_jobs", 5);
        if (!res) continue;
        job = JSON.parse(res[1]);
      } else {
        job = memoryQueue.shift();
        if (!job) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }

      await processJob(job);
    } catch (err) {
      console.log("🔥 Worker recovered:", err.message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// =========================
// WEBHOOK (🔥 FIXED VAPI RESPONSE)
// =========================
app.post("/webhook", (req, res) => {
  try {
    const tool = parseTool(req);
    const norm = normalizeTool(tool || {});
    const score = scoreLead(norm);
    const stage = decideLead(score);

    const job = {
      id: crypto.randomUUID(),
      tool,
      body: req.body,
      ts: Date.now(),
    };

    if (tool) pushJob(job);

    // 🔥 IMPORTANT FIX: VAPI COMPATIBLE RESPONSE
    return res.json({
      result: JSON.stringify({
        success: true,
        stage,
        score,
        next_action:
          stage === "hot"
            ? "book_visit"
            : stage === "warm"
            ? "qualify_lead"
            : "ask_more_info",
        message:
          stage === "hot"
            ? "عميل جاهز للحجز الآن"
            : stage === "warm"
            ? "عميل مهتم ويحتاج تأهيل"
            : "نحتاج معلومات أكثر"
      }),
    });
  } catch (e) {
    return res.status(200).json({
      result: JSON.stringify({
        success: false,
        message: "fallback response",
      }),
    });
  }
});

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("SALIH AI FULL SYSTEM RUNNING 🚀");
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log("🚀 SALIH AI RUNNING ON PORT", PORT);
  startWorker();
});