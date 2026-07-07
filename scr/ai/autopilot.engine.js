// scr/ai/autopilot.engine.js

import { getSupabase } from "../config/supabase.js";

import {
  sendMetaMessage,
  sendEmailMessage,
  sendWhatsAppMessage
} from "../handlers/channel.sender.js";


/**
 * 🤖 MULTI-CHANNEL AUTOPILOT ENGINE
 */
export async function runAutopilot({

  tenant_id,
  lead_id,
  channel,

  recommendations = [],

  aiResponse,

  intelligence = null,

  user_id,

  email,

  phone

}) {


  const supabase = getSupabase(tenant_id);


  try {


    // =========================
    // 1. GET LEAD
    // =========================

    const { data: lead, error:leadError } =
      await supabase

      .from("leads")

      .select("*")

      .eq("id", lead_id)

      .eq("tenant_id", tenant_id)

      .single();



    if (leadError || !lead) {

      return {
        action:"no_lead"
      };

    }




    // =========================
    // 2. SCORE ENGINE
    // =========================

    const score =
      intelligence?.score ||
      calculateLeadScore(
        lead,
        recommendations
      );



    const stage =
      intelligence?.stage ||
      getStage(score);



    console.log(
      `🧠 AUTOPILOT → ${stage} (${score})`
    );





    // =========================
    // 3. NOT HOT EXIT
    // =========================


    if(score < 80){

      return {

        action:"none",

        stage,

        score

      };

    }





    // =========================
    // 4. UPDATE CRM
    // =========================


    await supabase

    .from("crm_activities")

    .insert({

      tenant_id,

      lead_id,

      action:
      "hot_lead_detected",

      note:
      `🔥 Hot lead detected (${score})`,

      entity_type:"lead",

      entity_id:lead_id

    });





    await supabase

    .from("leads")

    .update({

      stage:"hot",

      lead_score:score,

      updated_at:
      new Date().toISOString()

    })

    .eq("id",lead_id)

    .eq("tenant_id",tenant_id);





    const actions=[];

    actions.push(
      "crm_updated"
    );





    // =========================
    // 5. SEND CHANNELS
    // =========================



    // 🟢 WHATSAPP

    if(phone){


      const result =
      await sendWhatsAppMessage({

        tenant_id,

        phone,

        message:
        `🔥 لدينا عروض مناسبة لك:\n\n${aiResponse}`

      });



      if(result.success){

        actions.push(
          "whatsapp_sent"
        );


      }


    }





    // 🟦 MESSENGER / INSTAGRAM

    if(

      user_id &&

      (
        channel==="messenger" ||

        channel==="instagram"

      )

    ){


      const result =
      await sendMetaMessage({

        tenant_id,

        user_id,

        message:
        `🏠 ${aiResponse}`

      });



      if(result.success){

        actions.push(
          "meta_sent"
        );

      }

    }







    // 📧 EMAIL


    if(email){


      const result =
      await sendEmailMessage({

        tenant_id,

        email,

        subject:
        "🔥 عروض عقارية مناسبة لك",

        message:
        aiResponse

      });



      if(result.success){

        actions.push(
          "email_sent"
        );

      }


    }






    // =========================
    // 6. SAVE MESSAGE
    // =========================


    await supabase

    .from("messages")

    .insert({

      tenant_id,

      lead_id,

      phone:

      phone || lead.phone,


      message:

      "AI Autopilot Response",


      ai_response:

      aiResponse,


      source:

      channel || "autopilot"

    });







    // =========================
    // RESULT
    // =========================


    return {


      action:
      "autopilot_triggered",


      stage,


      score,


      actions


    };



  }

  catch(error){


    console.error(

      "🔥 Autopilot Error:",

      error.message

    );


    return {

      action:"error",

      message:error.message

    };


  }

}





/**
 * 🧠 LEAD SCORE
 */

function calculateLeadScore(
  lead,
  recommendations=[]
){


  let score=10;



  if(
    lead.intent === "buy" ||
    lead.intent === "purchase"
  ){

    score +=25;

  }



  if(lead.budget){

    score +=15;

  }



  if(lead.city){

    score +=10;

  }



  if(
    lead.stage==="warm"
  ){

    score +=15;

  }



  const top = Math.max(

    0,

    ...recommendations.map(
      r=>r.score || 0
    )

  );



  if(top > 70){

    score +=20;

  }



  return Math.min(
    score,
    100
  );

}





/**
 * 🧠 STAGE DETECTION
 */

function getStage(score){


  if(score>=80)

    return "hot";



  if(score>=50)

    return "warm";



  return "new";


}