import express from "express";
import { supabaseAdmin } from "../config/supabase-admin.js";

const router = express.Router();


router.post("/create-company", async (req, res) => {

  try {

    const {
      request_id,
      auth_user_id,
      full_name,
      email,
      phone,
      company_name
    } = req.body;



    if (
      !request_id ||
      !auth_user_id ||
      !company_name
    ) {

      return res.status(400).json({
        error:"missing_required_fields"
      });

    }



    // 1 - إنشاء الشركة

    const {
      data: tenant,
      error: tenantError

    } = await supabaseAdmin

      .from("tenants")

      .insert({

        name: company_name

      })

      .select("id")

      .single();



    if (tenantError)
      throw tenantError;




    // 2 - إنشاء مالك الشركة

    const {
      error:userError

    } = await supabaseAdmin

      .from("users")

      .insert({

        auth_user_id,

        tenant_id:tenant.id,

        full_name,

        email,

        phone,

        role:"owner",

        is_platform_owner:false

      });



    if(userError)
      throw userError;




    // 3 - إعدادات الشركة


    const {
      error:settingsError

    } = await supabaseAdmin

      .from("company_settings")

      .insert({

        tenant_id:tenant.id,

        company_name,

        industry_type:"real_estate"

      });



    if(settingsError)
      throw settingsError;




    // 4 - إنشاء AI Agent


    const {
      error:agentError

    } = await supabaseAdmin

      .from("ai_agents")

      .insert({

        tenant_id:tenant.id,

        name:"Salih AI Agent",

        status:"active",

        model:"gemini"

      });



    if(agentError)
      throw agentError;




    // 5 - تحديث الطلب


    const {
      error:requestError

    } = await supabaseAdmin

      .from("company_requests")

      .update({

        status:"approved"

      })

      .eq(
        "id",
        request_id
      );



    if(requestError)
      throw requestError;




    res.json({

      success:true,

      tenant_id:tenant.id

    });



  }


  catch(error){


    console.error(
      "CREATE COMPANY ERROR:",
      error
    );


    res.status(500).json({

      error:error.message

    });


  }


});


export default router;