import { getSupabase } from "../config/supabase.js";

/**
 * 🤖 AI Autopilot Engine
 * يتصرف تلقائيًا عند ارتفاع جودة العميل (Hot Lead)
 */

export async function runAutopilot({
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

    if (!lead) return;

    // 2. تحديد حالة العميل
    const score = calculateLeadScore(lead, recommendations);

    // 3. إذا ليس Hot → لا شيء
    if (score < 80) {
      return {
        action: "none",
        reason: "lead_not_hot"
      };
    }

    // 🔥 HOT LEAD → تنفيذ تلقائي

    const actions = [];

    // 4. إنشاء موعد تلقائي إذا ممكن
    if (!lead.appointment_scheduled) {
      const appointment = await supabase.from("appointments").insert({
        tenant_id,
        lead_id,
        title: "Auto-scheduled viewing by AI",
        status: "pending",
        created_by: "autopilot"
      });

      actions.push("appointment_created");
    }

    // 5. إنشاء مهمة للموظف
    await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id,
      type: "autopilot_task",
      description: "Hot lead detected - follow up immediately",
      status: "pending"
    });

    actions.push("task_created");

    // 6. تحديث حالة العميل
    await supabase
      .from("leads")
      .update({
        status: "hot",
        updated_at: new Date().toISOString()
      })
      .eq("id", lead_id);

    actions.push("lead_marked_hot");

    return {
      action: "autopilot_triggered",
      score,
      actions
    };
  } catch (error) {
    console.error("Autopilot Error:", error.message);

    return {
      action: "error",
      message: error.message
    };
  }
}

/**
 * 🧠 حساب حرارة العميل
 */
function calculateLeadScore(lead, recommendations = []) {
  let score = 0;

  // اهتمام واضح
  if (lead.status === "interested") score += 30;

  // وجود ميزانية
  if (lead.budget) score += 20;

  // تفاعل عالي
  if (lead.message_count > 5) score += 20;

  // مكالمات
  if (lead.call_duration > 120) score += 20;

  // توصيات قوية
  if (recommendations.length > 0) {
    const topScore = Math.max(...recommendations.map(r => r.score || 0));
    if (topScore > 70) score += 20;
  }

  return score;
}