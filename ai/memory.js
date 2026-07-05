import { getSupabase } from "../scr/config/supabase.js";

/**
 * 🧠 AI LEAD MEMORY ENGINE
 * يجمع: Lead + Messages + Activities بشكل موحد للذكاء
 */
export async function getLeadMemory(tenant_id, phone) {
  try {
    const supabase = getSupabase(tenant_id);

    if (!phone) return null;

    // =========================
    // 1. GET LEAD
    // =========================
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (leadError) {
      console.error("Lead Memory Error:", leadError.message);
      return null;
    }

    if (!lead) return null;

    // =========================
    // 2. GET MESSAGES (multi-channel future)
    // =========================
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    if (msgError) {
      console.error("Messages Error:", msgError.message);
    }

    // =========================
    // 3. GET CRM ACTIVITIES
    // =========================
    const { data: activities, error: actError } = await supabase
      .from("crm_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (actError) {
      console.error("Activities Error:", actError.message);
    }

    // =========================
    // 4. NORMALIZED MEMORY OUTPUT (IMPORTANT)
    // =========================
    return {
      lead: {
        id: lead.id,
        name: lead.full_name,
        phone: lead.phone,
        city: lead.city,
        budget: lead.budget,
        intent: lead.intent,
        property_type: lead.property_type,
        created_at: lead.created_at
      },

      messages: (messages || []).map((m) => ({
        id: m.id,
        role: m.role || "user",
        message: m.message,
        channel: m.channel,
        created_at: m.created_at
      })),

      activities: (activities || []).map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        created_at: a.created_at
      }))
    };

  } catch (error) {
    console.error("🧠 Lead Memory Fatal Error:", error.message);
    return null;
  }
}