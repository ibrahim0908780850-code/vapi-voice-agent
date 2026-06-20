import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// 🔥 Health check
app.get("/", (req, res) => {
  res.send("Salih AI Agent is running 🚀");
});

// 🔥 Supabase client (آمن)
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// 📞 Webhook (Vapi)
app.post("/vapi-webhook", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // 🧠 Gemini request (native fetch في Node 22)
    const response = await fetch(
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
                    'أنت وكيل عقاري محترف اسمه "صالح". مهمتك إقناع العميل وجمع الاسم ورقم الهاتف. كن مختصر ومقنع. النص: ' +
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

    // 💾 حفظ في Supabase
    await supabase.from("leads").insert({
      phone,
      message,
      ai_response: aiText
    });

    // 📤 رد
    res.json({ reply: aiText });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Salih AI running on port", PORT);
});