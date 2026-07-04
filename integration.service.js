import axios from "axios";
import { getSupabase } from "../config/supabase.js";

/**
 * 🔥 MAIN ENTRY
 * أي event يدخل هنا يتم توزيعه
 */
export async function routeEvent(tenant_id, eventType, payload) {
  try {
    const supabase = getSupabase();

    // 1. جلب التكاملات الخاصة بالشركة
    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("active", true);

    if (error) throw error;

    if (!integrations || integrations.length === 0) {
      console.log("⚠️ No integrations found");
      return;
    }

    // 2. إرسال لكل تكامل
    for (const integration of integrations) {
      await handleIntegration(integration, eventType, payload);
    }

  } catch (err) {
    console.error("❌ Integration Engine Error:", err.message);
  }
}