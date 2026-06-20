import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

console.log("🔥 SALIH AI STARTING...");

// 🏠 Root route (هذا يحل مشكلتك)
app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Salih AI Agent is running 🚀"
  });
});

app.get("/test", (req, res) => {
  res.send("TEST OK 🚀");
});

// 🔥 Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 📞 Webhook
app.post("/vapi-webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'أنت وكيل عقاري اسمه "صالح". كن مختصر ومقنع. النص: ' +
                    message
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً، كيف أساعدك؟";

    await supabase.from("leads").insert({
      phone,
      message,
      ai_response: aiText
    });

    res.json({ reply: aiText });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 FIX IMPORTANT: PORT fallback
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});