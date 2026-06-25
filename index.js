import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env;
const port = PORT || 3000;

// =========================
// SUPABASE
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// DEBUG LOGGER
// =========================
function log(...args) {
  console.log("🔥", ...args);
}

// =========================
// SAFE VAPI PARSER
// =========================
function parseTool(req) {
  try {
    const toolCalls = req.body?.message?.toolCalls;
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return null;

    const call = toolCalls[0];

    let raw =
      call?.function?.arguments ??
      call?.arguments ??
      call?.function?.args ??
      null;

    if (!raw) return {};

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        log("⚠️ JSON parse failed, using raw fallback");
        return {};
      }
    }

    return raw;
  } catch (e) {
    log("PARSE ERROR:", e.message);
    return {};
  }
}

// =========================
// NORMALIZATION (ROBUST)
// =========================
function normalize(t = {}, req = {}) {
  return {
    full_name: (t.fullName || "").trim(),

    phone:
      (t.phoneNumber ||
        t.phone ||
        t.callerNumber ||
        req.body?.message?.customer?.phone ||
        req.body?.customer?.number ||
        "").trim(),

    city: (t.area || "").trim(),
    budget: (t.budget || "").trim(),
    intent: (t.intent || "").trim(),
    property_type: (t.propertyType || "").trim()
  };
}

// =========================
// INTENT DETECTION
// =========================
function isBuyIntent(text = "") {
  const t = text.toLowerCase();
  return (
    t.includes("شراء") ||
    t.includes("buy") ||
    t.includes("ابغى") ||
    t.includes("أبغى") ||
    t.includes("اشتري")
  );
}

// =========================
// SCORING ENGINE
// =========================
function scoreLead(d) {
  let score = 0;

  if (isBuyIntent(d.intent)) score += 45;
  if (d.budget) score += 20;
  if (d.property_type) score += 15;
  if (d.city) score += 10;
  if (d.full_name) score += 10;
  if (d.phone) score += 5;

  return Math.min(score, 100);
}

// =========================
// STAGE ENGINE
// =========================
function decideStage(score) {
  if (score >= 85) return "hot";
  if (score >= 60) return "warm";
  if (score >= 30) return "new";
  return "lost";
}

// =========================
// WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

  try {
    log("WEBHOOK HIT");
    log(JSON.stringify(req.body, null, 2));

    if (!supabase) {
      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              success: false,
              error: "supabase_not_configured"
            })
          }
        ]
      });
    }

    const tool = parseTool(req);
    const data = normalize(tool, req);

    // =========================
    // NO DATA LOSS POLICY
    // =========================
    if (!data.phone) {
      log("⚠️ Missing phone → saving partial lead");

      data.phone = "unknown_" + Date.now();
    }

    const score = scoreLead(data);
    const stage = decideStage(score);

    // =========================
    // UPSERT LEAD
    // =========================
    const { data: lead, error } = await supabase
      .from("leads")
      .upsert(
        {
          full_name: data.full_name,
          phone: data.phone,
          city: data.city,
          budget: data.budget,
          intent: data.intent,
          property_type: data.property_type,
          lead_score: score,
          stage,
          source: "vapi",
          updated_at: new Date().toISOString()
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (error) {
      log("DB ERROR:", error.message);

      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              success: false,
              error: "db_error"
            })
          }
        ]
      });
    }

    // =========================
    // CALL LOG (SAFE)
    // =========================
    try {
      await supabase.from("calls").insert({
        lead_id: lead.id,
        phone: data.phone,
        transcript: "",
        ai_response: "",
        duration: 0,
        call_status: "completed",
        source: "vapi",
        created_at: new Date().toISOString()
      });
    } catch (e) {
      log("CALL LOG ERROR:", e.message);
    }

    // =========================
    // RESPONSE TO VAPI
    // =========================
    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            lead_id: lead.id,
            stage,
            score
          })
        }
      ]
    });

  } catch (e) {
    log("SERVER ERROR:", e.message);

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: false,
            error: "internal_error"
          })
        }
      ]
    });
  }
});

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("🚀 SALIH AI ULTIMATE RUNNING");
});

// =========================
// START SERVER
// =========================
app.listen(port, () => {
  console.log(`🚀 SALIH AI running on port ${port}`);
});