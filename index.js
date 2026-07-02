import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// =========================
// ROUTES
// =========================
import whatsappRoutes from "./routes/whatsapp.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// 👇 WhatsApp Route Mount
app.use("/whatsapp", whatsappRoutes);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env;
const port = PORT || 3000;

// =========================
// DEBUG SAFE
// =========================
const DEBUG = process.env.DEBUG === "true";
const log = (...args) => DEBUG && console.log("🔥", ...args);

// =========================
// SUPABASE SAFE INIT
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// TOOL PARSER SAFE
// =========================
function parseTool(req) {
  try {
    const calls = req.body?.message?.toolCalls;
    if (!Array.isArray(calls) || calls.length === 0) return {};

    const raw =
      calls[0]?.function?.arguments ||
      calls[0]?.arguments ||
      calls[0]?.function?.args;

    return typeof raw === "string" ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

// =========================
// NORMALIZE
// =========================
function normalize(t = {}, req = {}) {
  return {
    full_name: (t.fullName || "").trim(),
    phone:
      (t.phoneNumber ||
        t.phone ||
        req.body?.message?.customer?.phone ||
        "").trim(),

    city: (t.area || t.city || "").trim(),
    budget: (t.budget || "").trim(),
    intent: (t.intent || "").trim(),
    property_type: (t.propertyType || "").trim()
  };
}

// =========================
// SCORE + STAGE
// =========================
function isBuyIntent(text = "") {
  const t = text.toLowerCase();
  return (
    t.includes("شراء") ||
    t.includes("buy") ||
    t.includes("ابغى") ||
    t.includes("اشتري")
  );
}

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

function stage(score) {
  if (score >= 85) return "hot";
  if (score >= 60) return "warm";
  if (score >= 30) return "new";
  return "lost";
}

// =========================
// WEBHOOK (VAPI → CRM)
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
            result: JSON.stringify({ error: "no_db" })
          }
        ]
      });
    }

    const tool = parseTool(req);
    const data = normalize(tool, req);

    if (!data.phone) {
      data.phone = `unknown_${crypto.randomUUID()}`;
    }

    const score = scoreLead(data);
    const leadStage = stage(score);

    const { data: leads, error } = await supabase
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
          stage: leadStage,
          status: leadStage,
          updated_at: new Date().toISOString()
        },
        { onConflict: "phone" }
      )
      .select();

    if (error || !leads?.length) {
      log("DB ERROR:", error?.message);

      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({ error: "db_error" })
          }
        ]
      });
    }

    const lead = leads[0];

    await supabase.from("crm_activities").insert({
      lead_id: lead.id,
      action: "lead_created",
      note: `Score ${score}`
    });

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            lead_id: lead.id,
            stage: leadStage,
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
          result: JSON.stringify({ error: "internal_error" })
        }
      ]
    });
  }
});

// =========================
// CRM API SAFE
// =========================

app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json(data || []);
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/leads/status", async (req, res) => {
  try {
    const { id, status } = req.body;

    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/leads/note", async (req, res) => {
  try {
    const { lead_id, note } = req.body;

    await supabase.from("crm_activities").insert({
      lead_id,
      action: "note",
      note
    });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "server_error" });
  }
});

// =========================
// CRM DASHBOARD (SAFE UI)
// =========================
app.get("/crm", async (req, res) => {
  try {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    const rows = (data || [])
      .map(
        (l) => `
        <tr>
          <td>${l.full_name || ""}</td>
          <td>${l.phone}</td>
          <td>${l.city || ""}</td>
          <td>${l.stage}</td>
          <td>${l.lead_score}</td>
        </tr>
      `
      )
      .join("");

    res.send(`
      <html>
        <head>
          <title>SALIH CRM</title>
        </head>
        <body style="font-family:Arial;padding:20px">
          <h1>🚀 SALIH AI CRM</h1>

          <table border="1" cellpadding="8">
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Stage</th>
              <th>Score</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `);
  } catch {
    res.status(500).send("CRM ERROR");
  }
});

// =========================
// HEALTH
// =========================
app.get("/", (req, res) => {
  res.send("SALIH CRM RUNNING 🚀");
});

// =========================
// START
// =========================
app.listen(port, () => {
  console.log("🚀 SALIH CRM running on", port);
});