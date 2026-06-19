import express from "express";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.post("/vapi-webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    // 🧠 Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `أنت وكيل عقاري ذكي. اقنع العميل وأغلق البيع. النص: ${message}`
            }]
          }]
        })
      }
    );

    const data = await geminiRes.json();
    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "مرحباً كيف أساعدك؟";

    // 💾 حفظ في Supabase
    await supabase.from("leads").insert({
      phone,
      message,
      ai_response: aiText
    });

    res.json({ reply: aiText });

  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running");
});
