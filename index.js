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

// =========================
// QUEUE PUSH (SAFE)
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
// TOOL PARSER (IMPROVED DEBUG)
// =========================
function parseTool(req) {
  try {
    const raw =
      req.body?.message?.toolCalls?.[0]?.function?.arguments ||
      req.body?.message?.toolCalls?.[0]?.arguments ||
      req.body?.toolArguments ||
      req.body?.arguments;

    if (!raw) return null;

    return typeof raw === "string" ? JSON.parse(raw) : raw;

  } catch (err) {
    console.log("❌ Tool parse error:", err.message);
    return null;
  }
}

// =========================
// DEDUP CACHE (ANTI SPAM)
// =========================
const seen = new Map();

// =========================
// SCORE
// =========================
function scoreLead(data) {
  let score = 5;

  if (data.phone) score += 30;
  if (data.full_name) score += 20;
  if (data.city) score += 10;
  if (data.intent) score += 15;
  if (data.stage === "warm") score += 15;
  if (data.stage === "hot") score += 25;

  return Math.min(score, 100);
}

// =========================
// PROCESS JOB
// =========================
async function processJob(job) {
  if (!supabase) return;

  const tool = job.tool;
  if (!tool) return;

  // 🔥 DEDUP (10 sec)
  const key = tool.phone + tool.fullName;
  if (seen.has(key)) return;
  seen.set(key, Date.now());

  setTimeout(() => seen.delete(key), 10000);

  const payload = {
    full_name: tool.fullName || tool.name || "",
    phone: tool.phone || tool.phoneNumber || "",
    city: tool.city || "",
    district: tool.district || "",
    budget: tool.budget || "",
    property_type: tool.propertyType || "",
    intent: tool.intent || "",
    stage: tool.stage || "new",
    source: "vapi",
  };

  payload.lead_score = scoreLead(payload);

  try {
    const { data, error } = await supabase
      .from("leads")
      .upsert(payload, { onConflict: "phone" })
      .select("id")
      .single();

    if (error) throw error;

    if (data?.id) {
      await supabase.from("calls").insert({
        lead_id: data.id,
        phone: payload.phone,
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
// WORKER (RESILIENT LOOP)
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
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
      }

      await processJob(job);

    } catch (err) {
      console.log("🔥 Worker crash recovered:", err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

// =========================
// WEBHOOK (FAST)
// =========================
app.post("/webhook", (req, res) => {
  try {
    const tool = parseTool(req);

    const job = {
      id: crypto.randomUUID(),
      tool,
      body: req.body,
      ts: Date.now(),
    };

    if (tool) pushJob(job);

    return res.json({
      success: true,
      queued: !!tool,
    });

  } catch {
    return res.status(200).json({ success: false });
  }
});

// =========================
// HEALTH
// =========================
app.get("/", (req, res) => {
  res.send("SALIH AI SERVER RUNNING 🚀");
});

// =========================
// START
// =========================
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
  startWorker();
});