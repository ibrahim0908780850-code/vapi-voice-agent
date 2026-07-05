import axios from "axios";
import { getLeadMemory } from "./lead.memory.js";

/**
 * 🧠 AI LEAD INTELLIGENCE ENGINE
 * يحلل العميل ويعطي:
 * - summary
 * - score
 * - stage (hot/cold/warm)
 */
export async function analyzeLeadIntelligence({
  tenant_id,
  phone
}) {
  try {

    // =========================
    // 1. GET MEMORY
    // =========================
    const memory = await getLeadMemory(tenant_id, phone);

    if (!memory) {
      return {
        score: 0,
        stage: "new",
        summary: "عميل جديد"
      };
    }

    // =========================
    // 2. BUILD PROMPT
    // =========================
    const prompt = `
أنت نظام تحليل عملاء داخل CRM عقاري.

حلل بيانات العميل التالية:

📌 بيانات العميل:
${JSON.stringify(memory.lead, null, 2)}

📌 آخر الرسائل:
${memory.messages.map(m => m.message).join("\n")}

📌 النشاطات:
${JSON.stringify(memory.activities, null, 2)}

🎯 المطلوب:
أعد JSON فقط بدون شرح:

{
  "score": رقم من 0 إلى 100,
  "stage": "hot | warm | cold | new",
  "summary": "وصف قصير للعميل"
}

⚠️ مهم:
- لا تكتب أي نص خارج JSON
- كن دقيق جداً في التقييم
`;

    // =========================
    // 3. GEMINI CALL
    // =========================
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          { parts: [{ text: prompt }] }
        ]
      }
    );

    const text =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      result = {
        score: 50,
        stage: "warm",
        summary: "تحليل غير دقيق"
      };
    }

    return result;

  } catch (error) {
    console.error("Lead Intelligence Error:", error.message);

    return {
      score: 0,
      stage: "error",
      summary: "فشل التحليل"
    };
  }
}