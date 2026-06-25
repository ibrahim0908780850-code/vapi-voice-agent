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
  PORT
} = process.env;

const port = PORT || 3000;

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

try {
  if (REDIS_URL) {
    redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    redis.on("error", (e) => {
      console.log("⚠️ Redis error:", e.message);
    });
  }
} catch {
  console.log("⚠️ Redis disabled");
}

// =========================
// MEMORY FALLBACK
// =========================
const memoryQueue = [];
const seen = new Map();

// =========================
// NORMALIZER
// =========================
function normalizeTool(t = {}) {
  return {
    full_name: t.fullName || "",
    phone: t.phoneNumber || "",
    city: t.area || "",
    budget: t.budget || "",
    intent: t.intent || "",
    property_type: t.propertyType || "",
    notes: t.notes || "",
    lead_status: t.leadStatus || "",
  };
}

// =========================
// SCORE
// =========================
function scoreLead(d) {
  let score = 10;

  if (d.phone) score += 40;
  if (d.full_name) score += 20;
  if (d.intent) score += 10;
  if (d.city) score += 10;
  if (d.property_type) score += 10;

  return Math.min(score, 100);
}

// =========================
// STAGE
// =========================
function decideLead(score) {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

// =========================
// QUEUE SAFE PUSH
// =========================
function pushJob(job) {
  const payload = JSON.stringify(job);

  if (redis) {
    redis
      .lpush("vapi_jobs", payload)
      .catch(() => memoryQueue.push(job));
  } else {
    memoryQueue.push(job);
  }
}

// =========================
// ROBUST PARSER
// =========================
function parseTool(req) {
  try {
    const body = req.body || {};

    const raw =
      body?.message?.toolCalls?.[0]?.function?.arguments ||
      body?.message?.toolCalls?.[0]?.arguments ||
      body?.toolArguments ||
      body?.arguments;

    if (!raw) return null;

    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

// =========================
// WORKER
// =========================
async function processJob(job) {
  if (!supabase || !job?.tool) return;

  const tool = normalizeTool(job.tool);

  if (!tool.phone || tool.phone.length < 6) return;

  if (seen.has(tool.phone)) return;
  seen.set(tool.phone, true);
  setTimeout(() => seen.delete(tool.phone), 15000);

  const score = scoreLead(tool);
  const stage = decideLead(score);

  try {
    const { data, error } = await supabase
      .from("leads")
      .upsert(
        {
          full_name: tool.full_name,
          phone: tool.phone,
          city: tool.city,
          budget: tool.budget,
          intent: tool.intent,
          property_type: tool.property_type,
          notes: tool.notes,
          lead_status: stage,
          score
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (error) throw error;

    if (data?.id) {
      await supabase.from("calls").insert({
        lead_id: data.id,
        phone: tool.phone,
        transcript: "",
        call_status: "completed",
        source: "vapi"
      });
    }
  } catch (err) {
    console.log("DB Error:", err.message);
  }
}

// =========================
// WORKER LOOP SAFE
// =========================
async function startWorker() {
  console.log("⚙️ Worker started...");

  while (true) {
    try {
      let job;

      if (redis) {
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
    } catch (e) {
      console.log("Worker error:", e.message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

// =========================
// WEBHOOK
// =========================
app.post("/webhook", (req, res) => {
  try {
    const tool = parseTool(req);

    if (tool) {
      pushJob({
        id: crypto.randomUUID(),
        tool,
        body: req.body,
        ts: Date.now()
      });
    }

    const norm = normalizeTool(tool || {});
    const score = scoreLead(norm);
    const stage = decideLead(score);

    return res.json({
      success: true,
      stage,
      score,
      message:
        stage === "hot"
          ? "عميل جاهز للحجز"
          : stage === "warm"
          ? "عميل مهتم"
          : "نحتاج معلومات أكثر"
    });
  } catch {
    return res.json({
      success: false,
      message: "fallback"
    });
  }
});

// =========================
// HEALTH
// =========================
app.get("/", (req, res) => {
  res.send("SALIH AI RUNNING 🚀");
});

// =========================
// START
// =========================
app.listen(port, () => {
  console.log("🚀 Running on port", port);
  startWorker();
});