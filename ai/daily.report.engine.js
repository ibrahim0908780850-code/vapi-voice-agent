import { getSupabase } from "../config/supabase.js";
import axios from "axios";

/**
 * 📊 Daily AI Report Engine
 * يولّد تقرير يومي ذكي لكل شركة (tenant)
 */

export async function generateDailyReport(tenant_id) {
  const supabase = getSupabase();

  try {
    // 1. جلب البيانات الأساسية
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", tenant_id);

    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .eq("tenant_id", tenant_id);

    const { data: activities } = await supabase
      .from("crm_activities")
      .select("*")
      .eq("tenant_id", tenant_id);

    // 2. تحليل البيانات

    const totalLeads = leads?.length || 0;
    const hotLeads = leads?.filter(l => l.status === "hot").length || 0;
    const warmLeads = leads?.filter(l => l.status === "warm").length || 0;

    const openDeals = deals?.filter(d => d.status === "open").length || 0;
    const wonDeals = deals?.filter(d => d.status === "won").length || 0;

    // أكثر مدينة نشاط
    const cityMap = {};
    leads?.forEach(l => {
      if (l.city) {
        cityMap[l.city] = (cityMap[l.city] || 0) + 1;
      }
    });

    const topCity =
      Object.entries(cityMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "غير معروف";

    // 3. بناء التقرير للـ AI
    const reportContext = `
📊 تقرير يومي لشركة العقارات:

- إجمالي العملاء: ${totalLeads}
- العملاء الساخنين: ${hotLeads}
- العملاء الدافئين: ${warmLeads}

- الصفقات المفتوحة: ${openDeals}
- الصفقات الناجحة: ${wonDeals}

- أكثر مدينة نشاطًا: ${topCity}

- عدد الأنشطة: ${activities?.length || 0}

⚠️ المطلوب:
اعطني تحليل مختصر + توصيات عملية لزيادة المبيعات.
    `;

    // 4. إرسال إلى Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: reportContext
              }
            ]
          }
        ]
      }
    );

    const aiReport =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "لا يوجد تقرير حالياً";

    // 5. حفظ التقرير في قاعدة البيانات
    await supabase.from("daily_reports").insert({
      tenant_id,
      report: aiReport,
      created_at: new Date().toISOString()
    });

    return {
      summary: aiReport,
      stats: {
        totalLeads,
        hotLeads,
        warmLeads,
        openDeals,
        wonDeals,
        topCity
      }
    };
  } catch (error) {
    console.error("Daily Report Error:", error.message);

    return {
      summary: "خطأ في توليد التقرير",
      stats: {}
    };
  }
}