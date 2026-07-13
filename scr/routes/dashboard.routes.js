// scr/routes/dashboard.routes.js

import express from "express";
import { getSupabase } from "../config/supabase.js";

const router = express.Router();


// =====================================
// GET DASHBOARD DATA
// =====================================

router.get("/", async (req, res) => {

  try {


    // tenant_id يأتي من middleware بعد تسجيل الدخول
    const tenant_id = req.user?.tenant_id;


    if (!tenant_id) {

      return res.status(400).json({
        error: "Missing tenant_id"
      });

    }



    const supabase = getSupabase();



    // =========================
    // COUNTS
    // =========================


    const { count: leads } = await supabase
      .from("leads")
      .select("*", {
        count:"exact",
        head:true
      })
      .eq(
        "tenant_id",
        tenant_id
      );




    const { count: calls } = await supabase
      .from("calls")
      .select("*", {
        count:"exact",
        head:true
      })
      .eq(
        "tenant_id",
        tenant_id
      );





    const { count: messages } = await supabase
      .from("messages")
      .select("*", {
        count:"exact",
        head:true
      })
      .eq(
        "tenant_id",
        tenant_id
      );





    // =========================
    // AI AGENTS
    // =========================


    const { data: agents, error:agentsError } =
      await supabase
      .from("ai_agents")
      .select(
        `
        id,
        name,
        status,
        voice_enabled,
        whatsapp_enabled
        `
      )
      .eq(
        "tenant_id",
        tenant_id
      );



    if(agentsError){
      throw agentsError;
    }



    // =========================
    // RECENT ACTIVITY
    // =========================


    const { data: activities } =
      await supabase
      .from("activities")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      )
      .limit(10);



    // =========================
    // RESPONSE
    // =========================


    res.json({

      stats:{

        leads: leads || 0,

        calls: calls || 0,

        messages: messages || 0,

        conversion:0

      },


      agents: agents || [],


      activities: activities || []

    });



  } catch(error){


    console.error(
      "Dashboard error:",
      error
    );


    res.status(500).json({

      error:"Dashboard failed"

    });


  }

});


export default router;