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

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    redis.on("error", (e) => {
      console.log("⚠️ Redis error:", e.message);
    });
  } catch (e) {
    console.log("⚠️ Redis disabled");
  }
}

// =========================
// MEMORY QUEUE
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
    property_type: t.propertyType || ""
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
// QUEUE
// =========================
function pushJob(job) {
  const payload = JSON.stringify(job);

  if (redis) {
    redis.lpush("vapi_jobs", payload).catch(() => memoryQueue.push(job));
  } else {
    memoryQueue.push(job);
  }
}

// =========================
// PARSER
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

          // ✅ المهم: هذه هي الأعمدة الموجودة فعلاً عندك
          stage: stage,
          lead_score: score,
          summary: ""
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

    const toolCallId =
      req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            stage,
            score
          })
        }
      ]
    });

  } catch {
    return res.json({
      results: [
        {
          toolCallId: "error",
          result: JSON.stringify({
            success: false
          })
        }
      ]
    });
  }
});

// =========================
// START
// =========================
app.listen(port, () => {
  console.log("🚀 SALIH AI RUNNING ON", port);
});