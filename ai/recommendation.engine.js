import { getSupabase } from "../scr/config/supabase.js";

/**
 * 🧠 Property Recommendation Engine
 * يستخدم بيانات العميل + العقارات لإرجاع أفضل اقتراحات
 */

export async function getPropertyRecommendations(tenantId, leadId) {
  const supabase = getSupabase();

  // 1. جلب بيانات العميل
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .single();

  if (!lead) return [];

  // 2. جلب العقارات
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "available");

  if (!properties || properties.length === 0) return [];

  // 3. حساب السكور
  const scored = properties.map((property) => {
    let score = 0;

    // city match
    if (lead.city && property.city === lead.city) {
      score += 30;
    }

    // budget match
    if (lead.budget && property.price <= lead.budget) {
      score += 40;
    } else if (lead.budget && property.price <= lead.budget * 1.1) {
      score += 20;
    }

    // property type match
    if (lead.property_type && property.type === lead.property_type) {
      score += 20;
    }

    // bedrooms match
    if (lead.bedrooms && property.bedrooms === lead.bedrooms) {
      score += 10;
    }

    // availability boost
    if (property.is_featured) {
      score += 5;
    }

    return {
      property,
      score,
    };
  });

  // 4. ترتيب النتائج
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return sorted;
}