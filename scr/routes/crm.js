import express from "express";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();


router.post("/note", async (req, res) => {


  try {


    const {
      tenant_id,
      lead_id,
      note,
      user_id
    } = req.body;



    if(!tenant_id || !lead_id || !note){

      return res.status(400).json({

        error:"Missing required fields"

      });

    }




    const supabase =
      getSupabase(tenant_id);





    const { error } =

      await supabase

      .from("crm_activities")

      .insert({

        tenant_id,

        lead_id,

        action:"note",

        note,

        user_id,

        entity_type:"lead",

        entity_id:lead_id

      });





    if(error)

      return res.status(500).json({

        error:error.message

      });





    return res.json({

      success:true

    });



  }

  catch(err){


    console.error(
      "CRM Note Error:",
      err.message
    );


    return res.status(500).json({

      error:"server_error"

    });


  }


});


export default router;