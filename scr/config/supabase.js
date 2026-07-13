// scr/config/supabase.js

import { createClient } from "@supabase/supabase-js";
import ws from "ws";


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;


if (!supabaseUrl) {
  throw new Error("❌ Missing SUPABASE_URL");
}


if (!supabaseSecretKey) {
  throw new Error("❌ Missing SUPABASE_SECRET_KEY");
}



const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth:{
      persistSession:false,
      autoRefreshToken:false
    },

    realtime:{
      transport:ws
    }
  }
);



export function getSupabase(){

  return supabaseAdmin;

}



export async function getTenantData(
  table,
  tenant_id,
  select="*"
){

  if(!tenant_id){

    throw new Error(
      "❌ tenant_id required"
    );

  }


  const {data,error}=await supabaseAdmin
    .from(table)
    .select(select)
    .eq(
      "tenant_id",
      tenant_id
    );


  if(error){

    throw error;

  }


  return data;

}



export default supabaseAdmin;