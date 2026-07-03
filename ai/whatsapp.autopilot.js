import axios from "axios";
import { getSupabase } from "../config/supabase.js";

/**
 * 📲 WhatsApp Autopilot Sender
 * يرسل العقارات تلقائيًا للعميل عند وجود توصيات قوية
 */

export async function sendWhatsAppAutopilot({
  tenant_id,
  lead_id,
  recommendations,
  aiResponse
}) {
  const supabase = getSupabase();

  try {
    // 1. جلب بيانات العميل
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!lead || !lead.phone) {
      return { status: "no_phone" };
    }

    // 2. اختيار أفضل 2 عقار فقط (لا نزعج العميل)
    const topProperties = recommendations
      .slice(0, 2)
      .map((r, index) => {
        return `
🏠 خيار ${index + 1}
العقار: ${r.title}
السعر: ${r.price}
المدينة: ${r.city}
الغرف: ${r.bedrooms}
        `;
      })
      .join("\n");

    // 3. بناء رسالة واتساب احترافية
    const message = `
مرحباً ${lead.name || "عميلنا العزيز"} 👋

بناءً على طلبك، وجدت لك أفضل العقارات المناسبة:

${topProperties}

💬 ملاحظة من المستشار الذكي:
${aiResponse?.slice(0, 200) || ""}

إذا أحببت أي خيار، أستطيع حجز موعد لك مباشرة 📅
    `;

    // 4. إرسال عبر WhatsApp API (Vapi / Provider / Twilio / Meta API)
    await axios.post(process.env.WHATSAPP_API_URL, {
      to: lead.phone,
      message: message
    });

    // 5. تسجيل الإرسال في CRM
    await supabase.from("messages").insert({
      tenant_id,
      lead_id,
      direction: "outbound",
      channel: "whatsapp",
      content: message,
      status: "sent"
    });

    // 6. تحديث حالة العميل
    await supabase
      .from("leads")
      .update({
        last_contact_method: "whatsapp",
        updated_at: new Date().toISOString()
      })
      .eq("id", lead_id);

    return {
      status: "sent",
      properties_sent: topProperties.length
    };
  } catch (error) {
    console.error("WhatsApp Autopilot Error:", error.message);

    return {
      status: "error",
      message: error.message
    };
  }
}