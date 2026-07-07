import { getSupabase } from "../config/supabase.js";


/**
 * 🧠 SALIH Tenant Resolver
 *
 * يحول أي قناة إلى tenant_id
 *
 * Supported:
 * Vapi
 * WhatsApp
 * Messenger
 * Instagram
 * Email
 */


export async function resolveTenant(req){


  const supabase = getSupabase();





  // =========================
  // VAPI VOICE
  // =========================

  const assistantId =
    req.body?.message?.assistantId ||
    req.headers["x-assistant-id"];



  if(assistantId){


    const tenant =
      await findTenant(
        supabase,
        "vapi",
        "assistant_id",
        assistantId
      );


    if(tenant){

      console.log(
        "✅ VAPI Tenant:",
        tenant
      );

      return tenant;

    }


  }





  // =========================
  // WHATSAPP
  // =========================

  const phoneNumberId =
    req.body
    ?.entry?.[0]
    ?.changes?.[0]
    ?.value
    ?.metadata
    ?.phone_number_id;



  if(phoneNumberId){


    const tenant =
      await findTenant(
        supabase,
        "whatsapp",
        "phone_number_id",
        phoneNumberId
      );


    if(tenant){

      console.log(
        "✅ WhatsApp Tenant:",
        tenant
      );

      return tenant;

    }


  }





  // =========================
  // META
  // Messenger + Instagram
  // =========================


  const object =
    req.body?.object;


  const metaId =
    req.body
    ?.entry?.[0]
    ?.id;



  if(metaId){



    // Messenger

    if(object === "page"){


      const tenant =
        await findTenant(
          supabase,
          "messenger",
          "page_id",
          metaId
        );


      if(tenant){

        console.log(
          "✅ Messenger Tenant:",
          tenant
        );

        return tenant;

      }


    }




    // Instagram

    if(object === "instagram"){


      const tenant =
        await findTenant(
          supabase,
          "instagram",
          "instagram_id",
          metaId
        );


      if(tenant){

        console.log(
          "✅ Instagram Tenant:",
          tenant
        );

        return tenant;

      }


    }


  }





  // =========================
  // EMAIL
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


    if(tenant){

      console.log(
        "✅ Email Tenant:",
        tenant
      );

      return tenant;

    }


  }





  // =========================
  // DEVELOPMENT FALLBACK
  // =========================


  const headerTenant =
    req.headers["x-tenant-id"];



  if(headerTenant){

    console.log(
      "⚠️ DEV Tenant:",
      headerTenant
    );


    return headerTenant;

  }





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
      .eq(
        "status",
        "active"
      )
      .maybeSingle();





  if(error){


    console.error(
      "❌ Tenant Resolver Error:",
      error.message
    );


    return null;

  }





  if(!data)
    return null;





  return data.tenant_id;


}