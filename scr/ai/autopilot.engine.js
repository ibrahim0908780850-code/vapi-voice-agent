import { getSupabase } from "../config/supabase.js";

import {
  sendMetaMessage,
  sendEmailMessage,
  sendWhatsAppMessage
} from "../handlers/channel.sender.js";

/**
 * 🤖 MULTI-CHANNEL AUTOPILOT ENGINE
 */
export async function runAutopilot({
  tenant_id,
  lead_id,
  channel,
  recommendations = [],
  aiResponse,
  intelligence = null,
  user_id,
  email,
  phone
}) {
  const supabase = getSupabase(tenant_id);

  try {

    // =========================
    // 1. GET LEAD
    // =========================
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!lead) return { action: "no_lead" };

    // =========================
    // 2. SCORE
    // =========================
    const score = intelligence?.score || calculateLeadScore(lead, recommendations);
    const stage = intelligence?.stage || getStage(score);

    console.log(`🧠 AUTOPILOT → ${stage} (${score})`);

    // =========================
    // 3. NOT HOT → EXIT
    // =========================
    if (score < 80) {
      return {
        action: "none",
        stage,
        score
      };
    }

    // =========================
    // 4. HOT LEAD ACTIONS (CRM)
    // =========================
    const actions = [];

    await supabase.from("crm_activities").insert({
      tenant_id,
      lead_id,
      type: "hot_lead_detected",
      description: `🔥 Hot lead detected (${score})`,
      status: "pending"
    });

    actions.push("crm_logged");

    await supabase
      .from("leads")
      .update({
        status: "hot",
        score,
        updated_at: new Date().toISOString()
      })
      .eq("id", lead_id);

    actions.push("lead_updated");

    // =========================
    // 5. MULTI-CHANNEL ACTIONS
    // =========================

    // 🟢 WHATSAPP
    if (phone) {
      await sendWhatsAppMessage({
        phone,
        message: `🔥 لدينا عروض مناسبة لك:\n\n${aiResponse}`
      });

      actions.push("whatsapp_sent");
    }

    // 🟦 MESSENGER / INSTAGRAM
    if (user_id && (channel === "messenger" || channel === "instagram")) {
      await sendMetaMessage({
        user_id,
        message: `🏠 ${aiResponse}`
      });

      actions.push("meta_sent");
    }

    // 📧 EMAIL
    if (email) {
      await sendEmailMessage({
        email,
        subject: "🔥 عروض عقارية مناسبة لك",
        message: aiResponse
      });

      actions.push("email_sent");
    }

    // =========================
    // 6. RESULT
    // =========================
    return {
      action: "autopilot_triggered",
      stage,
      score,
      actions
    };

  } catch (error) {
    console.error("🔥 Autopilot Error:", error.message);

    return {
      action: "error",
      message: error.message
    };
  }
}

/**
 * 🧠 SCORE ENGINE
 */
function calculateLeadScore(lead, recommendations = []) {
  let score = 10;

  if (lead.status === "interested") score += 25;
  if (lead.budget) score += 15;
  if (lead.city) score += 10;
  if (lead.message_count > 3) score += 15;
  if (lead.call_duration > 60) score += 20;

  const top = Math.max(0, ...recommendations.map(r => r.score || 0));
  if (top > 70) score += 20;

  return Math.min(score, 100);
}

/**
 * 🧠 STAGE DETECTION
 */
function getStage(score) {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}