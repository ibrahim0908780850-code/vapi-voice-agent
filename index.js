import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// 🔥 Health check
app.get("/", (req, res) => {
  res.send("Salih AI Agent is running 🚀");
});

// 🔥 Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 📞 Webhook (Vapi)
app.post("/vapi-webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // 🧠 Gemini AI request
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "أنت وكيل عقاري احترافي اسمه صالح. هدفك إقناع العميل وجمع الاسم ورقم الهاتف. كن مختصر وذكي. النص: " +
                    message
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiRes.json();

    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً، كيف أساعدك اليوم؟";

    // 💾 Save to Supabase
    await supabase.from("leads").insert({
      phone,
      message,
      ai_response: aiText
    });

    // 📤 Response to Vapi
    res.json({ reply: aiText });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Salih AI running on port", PORT);
});