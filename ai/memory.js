import { getSupabase } from "../config/supabase.js";

export async function getLeadMemory(tenant_id, phone) {
  const supabase = getSupabase(tenant_id);

  // 📌 1. جلب العميل
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("phone", phone)
    .single();

  if (!lead) return null;

  // 📌 2. جلب آخر الرسائل
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(10);

  // 📌 3. جلب النشاطات
  const { data: activities } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    lead,
    messages: messages || [],
    activities: activities || []
  };
}