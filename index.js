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
// SAFE VAPI PARSER (ROBUST)
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

    if (!raw) return null;

    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        console.log("⚠️ JSON parse fallback used");
        return {};
      }
    }

    return raw;
  } catch (e) {
    console.log("❌ PARSE ERROR:", e.message);
    return null;
  }
}

// =========================
// NORMALIZATION
// =========================
function normalize(t = {}) {
  return {
    full_name: (t.fullName || "").trim(),
    phone: (t.phoneNumber || "").trim(),
    city: (t.area || "").trim(),
    budget: (t.budget || "").trim(),
    intent: (t.intent || "").trim(),
    property_type: (t.propertyType || "").trim()
  };
}

// =========================
// SMART INTENT DETECTION
// =========================
function isBuyIntent(text = "") {
  const t = text.toLowerCase();

  return (
    t.includes("شراء") ||
    t.includes("buy") ||
    t.includes("ابغى") ||
    t.includes("أبغى") ||
    t.includes("أشتري") ||
    t.includes("اشتري")
  );
}

// =========================
// SCORING ENGINE (SMARTER)
// =========================
function scoreLead(d) {
  let score = 0;

  if (!d.phone || d.phone.length < 8) return 0;

  if (isBuyIntent(d.intent)) score += 45;
  if (d.budget) score += 20;
  if (d.property_type) score += 15;
  if (d.city) score += 10;
  if (d.full_name) score += 10;

  // bonus for complete lead
  if (d.full_name && d.phone && d.city && d.intent) score += 5;

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
// MAIN WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

  try {
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
    const data = normalize(tool || {});

    if (!data.phone) {
      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              success: false,
              error: "missing_phone"
            })
          }
        ]
      });
    }

    const score = scoreLead(data);
    const stage = decideStage(score);

    // =========================
    // UPSERT LEAD (NO DUPLICATES)
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
      console.log("❌ DB ERROR:", error.message);

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
    // SAFE CALL LOG (NO CRASH)
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
      console.log("⚠️ CALL LOG ERROR:", e.message);
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
    console.log("🔥 SERVER ERROR:", e.message);

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