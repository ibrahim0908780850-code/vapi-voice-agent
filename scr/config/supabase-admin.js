import { createClient } from "@supabase/supabase-js";
import ws from "ws";


const supabaseUrl =
  process.env.SUPABASE_URL;


const secretKey =
  process.env.SUPABASE_SECRET_KEY;



if (!supabaseUrl || !secretKey) {

  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY"
  );

}



export const supabaseAdmin = createClient(

  supabaseUrl,

  secretKey,

  {

    auth: {

      autoRefreshToken: false,

      persistSession: false

    },


    realtime: {

      transport: ws

    }

  }

);