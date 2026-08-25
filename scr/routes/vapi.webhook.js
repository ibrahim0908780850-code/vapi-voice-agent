import express from "express";
import axios from "axios";
import crypto from "crypto";

import { getSupabase } from "../config/supabase.js";
import { claimWebhookEvent } from "../../server/lib/requestControls.js";
import { requireConfiguredWebhookSecret, verifyBearerWebhookSecret } from "../../server/lib/webhookSecurity.js";

const router = express.Router();


// =========================
// VAPI VOICE WEBHOOK
// =========================

router.post("/", async (req, res) => {


  const toolCallId =
    req.body?.message?.toolCalls?.[0]?.id ||
    crypto.randomUUID();



  try {

    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    if (!requireConfiguredWebhookSecret(webhookSecret)) return res.status(503).json({ error: "WEBHOOK_NOT_CONFIGURED" });
    if (!verifyBearerWebhookSecret(req.get("authorization"), req.get("x-vapi-secret"), webhookSecret)) {
      return res.status(401).json({ error: "INVALID_WEBHOOK_SIGNATURE" });
    }

    const claimed = await claimWebhookEvent({
      provider: "vapi",
      eventId: toolCallId || req.body?.message?.call?.id,
      rawBody: req.rawBody?.toString("utf8")
    });
    if (!claimed) {
      return res.json({ results: [{ toolCallId, result: JSON.stringify({ success: true, duplicate: true }) }] });
    }


    // =========================
    // VAPI DATA
    // =========================


    const assistantId =
      req.body?.message?.assistantId;



    const customer =
      req.body?.message?.customer || {};



    const phone =
      customer.phone || "unknown";



    const userMessage =
      req.body?.message?.text || "";



    // الرقم الذي استقبل المكالمة

    const calledNumber =

      req.body?.message?.phoneNumber ||
      req.body?.message?.call?.phoneNumber ||
      null;




    if(!assistantId){

      throw new Error(
        "Missing assistantId"
      );

    }



    // =========================
    // FIND TENANT CHANNEL
    // =========================


    const publicSupabase =
      getSupabase();



    const { data: channel, error } =

      await publicSupabase

      .from("tenant_channels")

      .select("*")

      .eq(
        "channel",
        "voice"
      )

      .eq(
        "external_id",
        assistantId
      )

      .maybeSingle();





    if(error){

      throw error;

    }



    if(!channel){


      throw new Error(
        "Voice channel not registered"
      );


    }



    const tenant_id =
      channel.tenant_id;



    // =========================
    // TENANT SUPABASE CLIENT
    // =========================


    const supabase =

      getSupabase(
        tenant_id
      );




    // =========================
    // SEND TO AI GATEWAY
    // =========================


    const response =

      await axios.post(


        `${process.env.BASE_URL}/ai_gateway`,


        {


          channel:"voice",


          tenant_id,


          message:{


            assistantId,


            customer:{


              phone


            },


            text:userMessage,


            toolCalls:

            req.body?.message?.toolCalls || []


          }


        },


        {


          headers:{


            "x-channel":"voice"


          }


        }


      );






    // =========================
    // SAVE CALL LOG
    // =========================


    await supabase

    .from("calls")

    .insert({

      tenant_id,

      phone,

      channel:"voice",

      status:"completed"

    });






    // =========================
    // VAPI RESPONSE
    // =========================


    return res.json({


      results:[


        {


          toolCallId,


          result:

          JSON.stringify({


            success:true,


            reply:

            response.data?.response ||

            response.data?.result ||

            "",


            tenant_id


          })


        }


      ]


    });





  }

  catch(error){


    console.error(

      "VAPI WEBHOOK ERROR:",

      error.message

    );



    return res.json({


      results:[


        {


          toolCallId,


          result:

          JSON.stringify({


            error:"vapi_error",


            message:error.message


          })


        }


      ]


    });



  }


});


export default router;
