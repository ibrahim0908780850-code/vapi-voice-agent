import express from "express";
import crypto from "crypto";

import { getSupabase } from "../config/supabase.js";
import { generateAIResponse } from "../ai/brain.js";

import { getLeadMemory } from "../../ai/memory.js";
import { buildAIContext } from "../../ai/build _context.js";
import { analyzeDeal } from "../../ai/deal intelligence.js";

import { resolveTenant } from "../utils/resolveTenant.js";


const router = express.Router();



router.post("/", async (req, res) => {


  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id ||
    crypto.randomUUID();



  try {


    // =========================
    // TENANT RESOLUTION
    // =========================

    const tenant_id =
      await resolveTenant(req);



    const supabase =
      getSupabase(tenant_id);





    // =========================
    // CHANNEL
    // =========================

    const channel =
      req.headers["x-channel"] ||

      (
        req.body?.message?.assistantId
          ? "voice"

          :

        req.body?.entry?.[0]
          ?.changes?.[0]
          ?.value
          ?.metadata

          ? "whatsapp"

          :

        req.body?.entry?.[0]?.id

          ? "messenger"

          :

        "unknown"
      );






    // =========================
    // USER DATA
    // =========================


    const phone =
      req.body?.message?.customer?.phone ||

      req.body?.entry?.[0]
      ?.changes?.[0]
      ?.value
      ?.contacts?.[0]
      ?.wa_id ||

      "unknown";




    const userMessage =

      req.body?.message?.text ||

      req.body?.entry?.[0]
      ?.changes?.[0]
      ?.value
      ?.messages?.[0]
      ?.text
      ?.body ||

      "";







    // =========================
    // CREATE / UPDATE LEAD
    // =========================


    const { data: lead, error: leadError } =

      await supabase
      .from("leads")
      .upsert(

        {

          tenant_id,

          phone,

          source: channel

        },

        {

          onConflict:
          "phone,tenant_id"

        }

      )
      .select()
      .single();



    if (leadError)
      throw leadError;







    // =========================
    // MEMORY
    // =========================


    const memory =

      await getLeadMemory(
        tenant_id,
        phone
      );







    // =========================
    // COMPANY
    // =========================


    const { data: company } =

      await supabase
      .from("company_settings")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      )
      .single();








    // =========================
    // AI AGENT
    // =========================


    const { data: agent } =

      await supabase
      .from("ai_agents")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      )
      .eq(
        "status",
        "active"
      )
      .single();








    // =========================
    // KNOWLEDGE BASE
    // =========================


    const { data: knowledge } =

      await supabase
      .from("ai_knowledge_base")
      .select("*")
      .eq(
        "tenant_id",
        tenant_id
      );








    // =========================
    // BUILD CONTEXT
    // =========================


    const tenantContext =

      buildAIContext({

        memory,

        company,

        agent,

        knowledge

      });








    // =========================
    // AI BRAIN
    // =========================


    const aiResult =

      await generateAIResponse({

        tenant_id,

        lead_id:
        lead.id,

        message:
        userMessage,

        phone,

        channel,

        tenantContext

      });




    const aiReply =

      aiResult.response ||
      aiResult;








    // =========================
    // SAVE MESSAGE
    // =========================


    await supabase
    .from("messages")
    .insert({

      tenant_id,

      lead_id:
      lead.id,

      phone,

      message:
      userMessage,

      ai_response:
      aiReply,

      source:
      channel

    });









    // =========================
    // UPDATE LEAD
    // =========================


    await supabase
    .from("leads")
    .update({

      last_activity:
      new Date().toISOString(),

      stage:
      "warm"

    })
    .eq(
      "id",
      lead.id
    );









    // =========================
    // CRM ACTIVITY
    // =========================


    await supabase
    .from("crm_activities")
    .insert({

      tenant_id,

      lead_id:
      lead.id,

      action:
      "ai_message",

      note:
      userMessage

    });









    // =========================
    // HISTORY
    // =========================


    const { data: messages } =

      await supabase
      .from("messages")
      .select("*")
      .eq(
        "lead_id",
        lead.id
      );



    const { data: calls } =

      await supabase
      .from("calls")
      .select("*")
      .eq(
        "lead_id",
        lead.id
      );



    const { data: appointments } =

      await supabase
      .from("appointments")
      .select("*")
      .eq(
        "lead_id",
        lead.id
      );



    const { data: activities } =

      await supabase
      .from("crm_activities")
      .select("*")
      .eq(
        "lead_id",
        lead.id
      );









    // =========================
    // DEAL INTELLIGENCE
    // =========================


    const dealResult =

      await analyzeDeal({

        lead,

        messages:
        messages || [],

        calls:
        calls || [],

        appointments:
        appointments || [],

        activities:
        activities || []

      });









    // =========================
    // DEAL CREATE UPDATE
    // =========================


    if(dealResult.score >= 70){


      const { data: existingDeal } =

        await supabase
        .from("deals")
        .select("*")
        .eq(
          "lead_id",
          lead.id
        )
        .single();




      if(!existingDeal){


        await supabase
        .from("deals")
        .insert({

          tenant_id,

          lead_id:
          lead.id,

          title:
          `Deal - ${phone}`,

          stage:
          "qualified",

          probability:
          dealResult.score,

          value:
          dealResult.expectedValue,

          status:
          "open"

        });



      }

      else{


        await supabase
        .from("deals")
        .update({

          probability:
          dealResult.score,

          value:
          dealResult.expectedValue,

          stage:
          dealResult.stage

        })
        .eq(
          "id",
          existingDeal.id
        );


      }


    }









    // =========================
    // RESPONSE
    // =========================


    return res.json({

      results:[

        {

          toolCallId,

          result:
          JSON.stringify({

            success:true,

            reply:
            aiReply,

            lead_id:
            lead.id,

            tenant_id,

            channel,

            deal_score:
            dealResult.score,

            deal_stage:
            dealResult.stage

          })

        }

      ]

    });






  }

  catch(err){


    console.error(
      "AI Gateway Error:",
      err
    );



    return res.json({

      results:[

        {

          toolCallId,

          result:
          JSON.stringify({

            error:
            "gateway_error"

          })

        }

      ]

    });


  }


});



export default router;