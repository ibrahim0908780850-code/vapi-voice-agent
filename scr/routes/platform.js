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


    // 1 إنشاء الشركة
    const { data: tenant, error: tenantError } =
      await supabaseAdmin
        .from("tenants")
        .insert({
          name: company_name
        })
        .select()
        .single();


    if (tenantError)
      throw tenantError;



    // 2 إنشاء مالك الشركة
    const { error: userError } =
      await supabaseAdmin
        .from("users")
        .insert({
          auth_user_id,
          tenant_id: tenant.id,
          full_name,
          email,
          phone,
          role: "owner",
          is_platform_owner: false
        });


    if (userError)
      throw userError;



    // 3 إعدادات الشركة
    await supabaseAdmin
      .from("company_settings")
      .insert({
        tenant_id: tenant.id,
        company_name
      });



    // 4 AI Agent
    await supabaseAdmin
      .from("ai_agents")
      .insert({
        tenant_id: tenant.id,
        name: "Salih AI Agent"
      });



    // 5 تحديث الطلب
    await supabaseAdmin
      .from("company_requests")
      .update({
        status: "approved"
      })
      .eq("id", request_id);



    res.json({
      success:true,
      tenant_id:tenant.id
    });


  } catch(error){

    console.error(error);

    res.status(500).json({
      error:error.message
    });

  }

});


export default router;