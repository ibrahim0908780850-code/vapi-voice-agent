import { getSupabase } from "../config/supabase.js";
import axios from "axios";

export async function generateAIResponse(tenant_id, message) {
  const supabase = getSupabase(tenant_id);

  // 📌 1. جلب بيانات الشركة
  const { data: knowledge } = await supabase
    .from("ai_knowledge_base")
    .select("*")
    .eq("tenant_id", tenant_id);

  const context = knowledge
    ?.map(k => k.content)
    .join("\n")
    .slice(0, 12000);

  // 📌 2. إرسال إلى Gemini
  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    {
      contents: [
        {
          parts: [
            {
              text: `
أنت مساعد ذكي لشركة عقارية.

📌 بيانات الشركة:
${context}

📌 سؤال العميل:
${message}

⚠️ قواعد:
- لا تخترع بيانات
- استخدم فقط معلومات الشركة
- ركز على البيع
- كن مختصرًا ومقنعًا
              `
            }
          ]
        }
      ]
    },
    {
      params: {
        key: process.env.GEMINI_API_KEY
      }
    }
  );

  return response.data;
}