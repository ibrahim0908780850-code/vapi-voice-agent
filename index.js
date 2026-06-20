import express from "express";
import { createClient } from "@supabase/supabase-js";
import https from "https";

const app = express();
app.use(express.json());

console.log("🔥 SALIH AI STARTING...");
console.log("🔥 FILE LOADED");

// 🧠 ENV SAFETY
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// 🔥 Supabase
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

// 🧠 Root
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Salih AI Agent is running 🚀"
  });
});

// 🧪 Test
app.get("/test", (req, res) => {
  res.send("TEST OK 🚀");
});

// 📞 Gemini request بدون fetch (آمن 100%)
function callGemini(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `أنت وكيل عقاري اسمه "صالح". كن مختصر ومقنع. النص: ${message}`
            }
          ]
        }
      ]
    });

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => (body += chunk));

      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// 📞 Webhook
app.post("/vapi-webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!GEMINI_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const data = await callGemini(message);

    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً، كيف أساعدك؟";

    if (supabase) {
      await supabase.from("leads").insert({
        phone,
        message,
        ai_response: aiText
      });
    }

    return res.json({ reply: aiText });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 🚀 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});