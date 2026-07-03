import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// =========================
// ROUTES
// =========================
import whatsappRoutes from "./routes/whatsapp.js";
import aiGatewayRoutes from "./routes/ai-gateway.js";

const app = express();

// ⚠️ مهم: Twilio يحتاج urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "2mb" }));

// =========================
// ROUTE MOUNTING
// =========================

// VAPI routes (كما هي)
app.use("/whatsapp", whatsappRoutes);
app.use("/ai-gateway", aiGatewayRoutes);

// =========================
// ENV
// =========================
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT } = process.env;
const port = PORT || 3000;

// =========================
// SUPABASE INIT
// =========================
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

// =========================
// HEALTH CHECK
// =========================
app.get("/", (req, res) => {
  res.send("SALIH CRM RUNNING 🚀");
});

// =========================
// VAPI WEBHOOK (كما هو عندك)
// =========================
app.post("/webhook", async (req, res) => {
  try {
    const toolCallId =
      req.body?.message?.toolCalls?.[0]?.id || crypto.randomUUID();

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

    const calls = req.body?.message?.toolCalls;
    const raw =
      calls?.[0]?.function?.arguments ||
      calls?.[0]?.arguments ||
      calls?.[0]?.function?.args;

    const tool =
      typeof raw === "string" ? JSON.parse(raw) : raw || {};

    const data = {
      full_name: (tool.fullName || "").trim(),
      phone: (tool.phone || "").trim(),
      city: (tool.city || "").trim(),
      budget: (tool.budget || "").trim(),
      intent: (tool.intent || "").trim(),
      property_type: (tool.propertyType || "").trim()
    };

    const { data: leads, error } = await supabase
      .from("leads")
      .upsert(
        {
          ...data,
          updated_at: new Date().toISOString()
        },
        { onConflict: "phone" }
      )
      .select();

    if (error) {
      return res.json({
        results: [
          {
            toolCallId,
            result: JSON.stringify({ error: error.message })
          }
        ]
      });
    }

    return res.json({
      results: [
        {
          toolCallId,
          result: JSON.stringify({
            success: true,
            lead_id: leads?.[0]?.id
          })
        }
      ]
    });
  } catch (e) {
    return res.json({
      results: [
        {
          toolCallId: crypto.randomUUID(),
          result: JSON.stringify({ error: "server_error" })
        }
      ]
    });
  }
});

// =========================
// 🟢 TWILIO WHATSAPP WEBHOOK (NEW)
// =========================
app.post("/whatsapp-webhook", async (req, res) => {
  try {
    const message = req.body.Body;
    const from = req.body.From;

    console.log("📩 WhatsApp:", message);
    console.log("📞 From:", from);

    // حفظ lead في CRM
    if (supabase) {
      await supabase.from("leads").upsert(
        {
          phone: from,
          intent: message,
          updated_at: new Date().toISOString()
        },
        { onConflict: "phone" }
      );
    }

    // رد واتساب (Twilio format XML)
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>تم استلام رسالتك يا عميل صالح 🚀</Message>
      </Response>
    `);
  } catch (e) {
    console.log("WhatsApp Error:", e);

    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>حدث خطأ، حاول لاحقًا</Message>
      </Response>
    `);
  }
});

// =========================
// CRM API
// =========================
app.get("/api/leads", async (req, res) => {
  const { data } = await supabase.from("leads").select("*");
  res.json(data || []);
});

// =========================
// START SERVER
// =========================
app.listen(port, () => {
  console.log("🚀 SALIH CRM running on", port);
});