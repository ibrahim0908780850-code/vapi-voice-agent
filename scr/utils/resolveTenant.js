import { getSupabase } from "../config/supabase.js";


/**
 * 🧠 SALIH Tenant Resolver
 * يحول أي قناة إلى tenant_id
 *
 * القنوات المدعومة:
 * - Vapi Voice
 * - WhatsApp
 * - Messenger
 * - Instagram
 * - Email
 */


export async function resolveTenant(req) {

  const supabase = getSupabase();


  // =========================
  // 1. VAPI VOICE
  // =========================

  const assistantId =
    req.body?.message?.assistantId;


  if (assistantId) {

    const tenant =
      await findTenant(
        supabase,
        "vapi",
        "assistant_id",
        assistantId
      );


    if (tenant)
      return tenant;

  }



  // =========================
  // 2. WHATSAPP
  // =========================

  const whatsappNumberId =
    req.body?.entry?.[0]
      ?.changes?.[0]
      ?.value
      ?.metadata
      ?.phone_number_id;


  if (whatsappNumberId) {


    const tenant =
      await findTenant(
        supabase,
        "whatsapp",
        "phone_number_id",
        whatsappNumberId
      );


    if (tenant)
      return tenant;

  }



  // =========================
  // 3. FACEBOOK + MESSENGER
  // =========================

  const pageId =
    req.body?.entry?.[0]?.id;


  if (pageId) {


    const tenant =
      await findTenant(
        supabase,
        "messenger",
        "page_id",
        pageId
      );


    if (tenant)
      return tenant;

  }



  // =========================
  // 4. INSTAGRAM
  // =========================

  const instagramId =
    req.body?.entry?.[0]?.id;


  if (instagramId) {


    const tenant =
      await findTenant(
        supabase,
        "instagram",
        "instagram_id",
        instagramId
      );


    if (tenant)
      return tenant;

  }



  // =========================
  // 5. EMAIL
  // =========================

  const email =
    req.body?.to ||
    req.body?.recipient;


  if(email){


    const tenant =
      await findTenant(
        supabase,
        "email",
        "email",
        email
      );


    if(tenant)
      return tenant;

  }



  // =========================
  // 6. DEVELOPMENT FALLBACK
  // =========================

  const headerTenant =
    req.headers["x-tenant-id"];


  if(headerTenant)
    return headerTenant;



  throw new Error(
    "Tenant could not be resolved"
  );

}





/**
 * البحث عن الشركة حسب التكامل
 */

async function findTenant(
  supabase,
  provider,
  column,
  value
){


  const { data, error } =
    await supabase
      .from("tenant_integrations")
      .select("tenant_id")
      .eq(
        "provider",
        provider
      )
      .eq(
        column,
        value
      )
      .single();



  if(error || !data)
    return null;



  return data.tenant_id;

}