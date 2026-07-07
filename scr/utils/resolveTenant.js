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


const supabase =
  getSupabase();





// =========================
// VAPI
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


if(tenant)
 return tenant;


}






// =========================
// WHATSAPP
// =========================


const phoneNumberId =
 req.body?.entry?.[0]
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


if(tenant)
 return tenant;


}






// =========================
// META
// =========================


const object =
 req.body?.object;



const metaId =
 req.body?.entry?.[0]?.id;



if(metaId){



if(object === "page"){


const tenant =
 await findTenant(
  supabase,
  "messenger",
  "page_id",
  metaId
 );


if(tenant)
 return tenant;


}



if(object === "instagram"){


const tenant =
 await findTenant(
  supabase,
  "instagram",
  "instagram_id",
  metaId
 );


if(tenant)
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
// DEV MODE
// =========================


const headerTenant =
 req.headers["x-tenant-id"];



if(headerTenant)
 return headerTenant;






throw new Error(
"Tenant could not be resolved"
);



}






async function findTenant(
supabase,
provider,
column,
value
){


const {data,error}=

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
.maybeSingle();



if(error || !data)
 return null;



return data.tenant_id;


}