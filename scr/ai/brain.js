import axios from "axios";
import { buildTenantContext } from "./contextBuilder.js";
import { getSupabase } from "../config/supabase.js";

export async function generateAIResponse(tenant_id, message) {
  const supabase = getSupabase(tenant_id);

  const context = await buildTenantContext(
    supabase,
    tenant_id,
    message
  );

  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    {
      contents: [
        {
          parts: [
            {
              text: `
أنت وكيل عقاري ذكي.

${context}

⚠️ قواعد:
- لا تخترع معلومات
- ركز على البيع
- اسأل سؤال واحد فقط
- كن مختصر جدًا
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

  return (
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "مرحباً 👋 كيف أساعدك؟"
  );
}