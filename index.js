import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env;

const port = PORT || 3000;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// PARSE VAPI TOOL
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
// NORMALIZE
// =========================
function normalize(t = {}) {
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
// STAGE (MAP TO YOUR DB)
// =========================
function decideStage(score) {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "new"; // مهم: مطابق للـ CHECK في جدولك
}

// =========================
// WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  try {
    const tool = parseTool(req);
    const data = normalize(tool || {});

    if (!supabase) {
      return res.json({ success: false, msg: "no supabase" });
    }

    const score = scoreLead(data);
    const stage = decideStage(score);

    // 🔥 IMPORTANT: ONLY EXISTING COLUMNS
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

          stage: stage,
          lead_score: score
        },
        { onConflict: "phone" }
      )
      .select()
      .single();

    if (error) {
      console.log("DB ERROR:", error.message);
      return res.json({ success: false, error: error.message });
    }

    if (lead?.id) {
      await supabase.from("calls").insert({
        lead_id: lead.id,
        phone: data.phone,
        transcript: "",
        call_status: "completed",
        source: "vapi"
      });
    }

    return res.json({
      results: [
        {
          toolCallId:
            req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID(),
          result: JSON.stringify({
            success: true,
            stage,
            score
          })
        }
      ]
    });
  } catch (e) {
    return res.json({
      results: [
        {
          toolCallId: "error",
          result: JSON.stringify({ success: false })
        }
      ]
    });
  }
});

app.get("/", (req, res) => {
  res.send("SALIH AI CLEAN RUNNING 🚀");
});

app.listen(port, () => {
  console.log("🚀 Running on port", port);
});