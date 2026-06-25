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
// 🆕 PARSER V2 - يلتقط البيانات من أي مكان يرسله Vapi
// =========================
function parseTool(req) {
  try {
    // 1. المحاولة الأولى: toolCalls (الطريقة القديمة)
    const toolCalls = req.body?.message?.toolCalls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const call = toolCalls[0];
      let raw = call?.function?.arguments ?? call?.arguments ?? null;
      
      if (raw) {
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            log("✅ Data extracted from toolCalls (string)");
            return parsed;
          } catch {
            log("⚠️ Failed to parse toolCalls string");
          }
        } else {
          log("✅ Data extracted from toolCalls (object)");
          return raw;
        }
      }
    }

    // 2. المحاولة الثانية: Vapi يرسل مباشرة في message
    const msg = req.body?.message;
    if (msg && typeof msg === "object") {
      if (msg.fullName || msg.phoneNumber || msg.intent) {
        log("✅ Data found directly in message");
        return {
          fullName: msg.fullName,
          phoneNumber: msg.phoneNumber,
          area: msg.area,
          budget: msg.budget,
          intent: msg.intent,
          propertyType: msg.propertyType
        };
      }
    }

    // 3. المحاولة الثالثة: مباشرة في جسم الطلب
    const body = req.body;
    if (body && typeof body === "object") {
      if (body.fullName || body.phoneNumber || body.intent) {
        log("✅ Data found directly in body root");
        return {
          fullName: body.fullName,
          phoneNumber: body.phoneNumber,
          area: body.area,
          budget: body.budget,
          intent: body.intent,
          propertyType: body.propertyType
        };
      }
    }

    log("⚠️ No data found in any expected location");
    log("📦 Full body:", JSON.stringify(req.body, null, 2));
    return {};
    
  } catch (e) {
    log("❌ PARSE ERROR:", e.message);
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
    log("🚀 WEBHOOK HIT");
    log("📦 FULL BODY:", JSON.stringify(req.body, null, 2));

    if (!supabase) {
      log("❌ Supabase not configured");
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
    log("🔧 Parsed tool data:", JSON.stringify(tool, null, 2));
    
    const data = normalize(tool, req);
    log("📋 Normalized data:", JSON.stringify(data, null, 2));

    // =========================
    // NO DATA LOSS POLICY
    // =========================
    if (!data.phone) {
      log("⚠️ Missing phone → saving partial lead with generated ID");
      data.phone = "unknown_" + Date.now();
    }

    const score = scoreLead(data);
    const stage = decideStage(score);
    
    log("🎯 Score:", score, "| Stage:", stage);

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
      log("❌ DB ERROR:", error.message);
      log("❌ Full error:", JSON.stringify(error, null, 2));

      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({
              success: false,
              error: "db_error",
              details: error.message
            })
          }
        ]
      });
    }

    log("✅ Lead saved:", lead.id);

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
      log("✅ Call log created");
    } catch (e) {
      log("⚠️ CALL LOG ERROR:", e.message);
    }

    // =========================
    // RESPONSE TO VAPI
    // =========================
    log("✅ Sending success response to Vapi");
    
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
    log("💥 SERVER ERROR:", e.message);
    log("💥 Stack:", e.stack);

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
  res.send("🚀 SALIH AI ULTIMATE V2 RUNNING");
});

// =========================
// START SERVER
// =========================
app.listen(port, () => {
  console.log(`🚀 SALIH AI V2 running on port ${port}`);
  console.log(`📍 Supabase: ${SUPABASE_URL ? 'Configured ✅' : '❌ Missing'}`);
  console.log(`🔑 Service Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'Present ✅' : '❌ Missing'}`);
});