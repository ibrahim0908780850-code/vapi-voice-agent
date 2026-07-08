// scr/config/supabase.js

import { createClient } from "@supabase/supabase-js";


// =========================
// ENV VARIABLES
// =========================

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;


const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;



// =========================
// VALIDATION
// =========================

if (!supabaseUrl) {

  throw new Error(
    "❌ Missing SUPABASE_URL environment variable"
  );

}


if (!supabaseKey) {

  throw new Error(
    "❌ Missing SUPABASE_KEY environment variable"
  );

}



// =========================
// SUPABASE CLIENT
// =========================

const client = createClient(

  supabaseUrl,

  supabaseKey,

  {

    auth: {

      persistSession:false,

      autoRefreshToken:false

    }

  }

);




// =========================
// MULTI TENANT CLIENT
// =========================

export function getSupabase(tenant_id = null){


  if(!tenant_id){


    console.warn(
      "⚠️ Supabase client used without tenant_id"
    );


  }


  return client;


}




// =========================
// TENANT VALIDATOR
// =========================

export function requireTenant(tenant_id){


  if(!tenant_id){


    throw new Error(
      "❌ Missing tenant_id"
    );


  }


  return getSupabase(
    tenant_id
  );


}




export default client;