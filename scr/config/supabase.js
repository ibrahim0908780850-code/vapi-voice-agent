import { createClient } from "@supabase/supabase-js";


const supabaseUrl =
process.env.SUPABASE_URL ||
process.env.NEXT_PUBLIC_SUPABASE_URL;


const supabaseKey =
process.env.SUPABASE_ANON_KEY ||
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;



if(!supabaseUrl){

throw new Error(
"❌ Missing SUPABASE_URL environment variable"
);

}


if(!supabaseKey){

throw new Error(
"❌ Missing SUPABASE_ANON_KEY environment variable"
);

}



const client =
createClient(
supabaseUrl,
supabaseKey
);



/**
 * Multi Tenant Supabase Client
 * tenant_id يستخدم للفلترة فقط
 */

export function getSupabase(tenant_id=null){


if(!tenant_id){

console.warn(
"⚠️ Supabase called without tenant_id"
);

}


return client;


}



export default client;