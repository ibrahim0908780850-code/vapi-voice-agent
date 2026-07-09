import { getSupabase } from "../config/supabase.js";



/**
 * 🧠 SALIH Tenant Resolver
 *
 * Resolve any channel → tenant_id
 *
 * Source:
 * tenant_channels
 *
 * Supports:
 * voice
 * whatsapp
 * messenger
 * instagram
 * email
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

      await findChannelTenant(

        supabase,

        "voice",

        "assistant_id",

        assistantId

      );



    if(tenant){


      console.log(
        "✅ Voice Tenant:",
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

      await findChannelTenant(

        supabase,

        "whatsapp",

        "external_id",

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
  // MESSENGER
  // =========================


  const metaId =

    req.body
    ?.entry?.[0]
    ?.id;




  if(metaId){


    const tenant =

      await findChannelTenant(

        supabase,

        "messenger",

        "external_id",

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





  // =========================
  // INSTAGRAM
  // =========================


  if(metaId){


    const tenant =

      await findChannelTenant(

        supabase,

        "instagram",

        "external_id",

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







  // =========================
  // EMAIL
  // =========================


  const email =

    req.body?.to ||

    req.body?.recipient;





  if(email){


    const tenant =

      await findChannelTenant(

        supabase,

        "email",

        "external_id",

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
  // DEVELOPMENT ONLY
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
    "❌ Tenant could not be resolved"
  );


}







/**
 * Find tenant from tenant_channels
 */


async function findChannelTenant(

  supabase,

  channel,

  column,

  value

){



  const {data,error}=

    await supabase

    .from("tenant_channels")

    .select("tenant_id")

    .eq(

      "channel",

      channel

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

      "Tenant Resolver Error:",

      error.message

    );


    return null;


  }






  return data?.tenant_id || null;


}