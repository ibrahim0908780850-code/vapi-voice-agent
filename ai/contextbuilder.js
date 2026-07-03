export async function buildTenantContext(supabase, tenant_id, message) {
  const { data: company } = await supabase
    .from("company_settings")
    .select("*")
    .eq("tenant_id", tenant_id)
    .single();

  const { data: kb } = await supabase
    .from("ai_knowledge_base")
    .select("content")
    .eq("tenant_id", tenant_id);

  return `
🏢 الشركة:
${company?.company_name || "غير معروف"}

📚 المعرفة:
${kb?.map(k => k.content).join("\n").slice(0, 8000) || ""}

💬 الرسالة:
${message}
`;
}