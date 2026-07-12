// scr/config/supabase.js

import { createClient } from "@supabase/supabase-js";
import ws from "ws";


// =========================
// ENV VARIABLES
// =========================

const supabaseUrl =
  process.env.SUPABASE_URL;


const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;



// =========================
// VALIDATION
// =========================

if (!supabaseUrl) {

  throw new Error(
    "❌ Missing SUPABASE_URL environment variable"
  );

}


if (!supabaseSecretKey) {

  throw new Error(
    "❌ Missing SUPABASE_SECRET_KEY environment variable"
  );

}



// =========================
// SUPABASE ADMIN CLIENT
// =========================

const client = createClient(

  supabaseUrl,

  supabaseSecretKey,

  {

    auth: {

      persistSession:false,

      autoRefreshToken:false

    },


    realtime: {

      transport: ws

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